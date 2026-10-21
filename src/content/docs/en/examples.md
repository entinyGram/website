# Worked examples

The best way to learn the plugin API is to read plugins that work. The official entinyGram plugins are open source, and each of them shows a different pattern. This page walks through the ideas that are worth copying, with the real code, and links to the full source.

All of them live in one repository: [github.com/entinyGram/plugins](https://github.com/entinyGram/plugins), under [`plugins/`](https://github.com/entinyGram/plugins/tree/main/plugins).

| Plugin | What it does | Worth reading for |
| --- | --- | --- |
| [Calendar Systems](https://github.com/entinyGram/plugins/tree/main/plugins/features/calendar-systems) | shows dates in the Hijri, Persian, Hebrew and other calendars | routine hooks, shared state, one hook per method |
| [Call Avatar](https://github.com/entinyGram/plugins/tree/main/plugins/features/call-avatar) | full screen caller photo in voice calls | touching native views, tidy cleanup, a plain settings page |
| [Text Animation](https://github.com/entinyGram/plugins/tree/main/plugins/features/text-animation) | typing animation in the message field | a JavaScript draw hook, settings placed with `embed` |
| [2GIS](https://github.com/entinyGram/plugins/tree/main/plugins/features/2gis) | map tiles and previews from 2GIS | a routine that shares state with JavaScript, a manifest with `withEntiny` |
| [Doc Viewer](https://github.com/entinyGram/plugins/tree/main/plugins/features/doc-viewer) | opens PDF, DOCX, XLSX, code and archives inside the app | a big plugin split into modules, parsers, native views |
| [entinyGram SDK](https://github.com/entinyGram/plugins/tree/main/plugins/core/sdk) | the settings placement engine | hooks on the app's own screens, a registry shared between plugins |
| [No Vibration](https://github.com/entinyGram/plugins/tree/main/plugins/features/no-vibration) | turns off haptics and vibration | a short list of hooks behind SDK switches, based on a community plugin |

## A minimal plugin

The smallest plugin that does something visible. It has no permissions:

```ts
let taps = 0

const page = inu.ui.settingsPage({
  title: 'Test Plugin',
  items: () => [
    inu.ui.header('Test'),
    inu.ui.button({
      id: 'tap',
      text: 'Tap me',
      subtitle: `Tapped ${taps} times`,
      onClick: () => { taps++ },
    }),
    inu.ui.separator('Only used to try the plugin submission flow'),
  ],
})

inu.registerSettings(page)
console.log('[TestPlugin] loaded')
```

Use it to try the whole publishing flow once before you send something real.

## Pattern: hook with a routine and share state with a switch

[Calendar Systems](https://github.com/entinyGram/plugins/blob/main/plugins/calendar-systems/src/index.ts) rewrites how the app formats dates. Chat lists format a date for every row, so the hooks are routines: they run in Java on whatever thread formats the date, and never wait for the JavaScript engine.

The user's choice has to reach those routines. A routine cannot see JavaScript variables, but it can see a Java object it captured, so the plugin shares an `AtomicReference`:

```ts
const AtomicReference: any = inu.jvm.cls('java.util.concurrent.atomic.AtomicReference')
const ConcurrentHashMap: any = inu.jvm.cls('java.util.concurrent.ConcurrentHashMap')

// shared with the routines by identity: a capture of a Java object is the object itself, not a copy
const selected: any = new AtomicReference(localStorage.getItem('calendar') ?? '')
// ICU formats are not thread safe, so each thread keeps its own
const formats: any = new ConcurrentHashMap()
```

A hook reads the shared value, and returns early when the feature is off:

```ts
inu.xposed.hookMethod(
  FastDateFormat.getDeclaredMethod('format(J)Ljava/lang/String;'),
  {
    after: inu.xposed.routine((ctx: any) => {
      const calendar = selected.get()
      if (calendar === '') return
      const self = ctx.thisObject
      const pattern = self.getPattern()
      if (pattern.indexOf('M') < 0 && pattern.indexOf('y') < 0) return
      // ...build or reuse an ICU format for this thread, then:
      ctx.setReturnValue(format.format(new JDate(ctx.args[0])))
    }),
  },
)
```

When the user changes the setting, JavaScript calls `selected.set(value)` and every thread sees it at once. Things to copy:

- The hook returns early for anything it does not handle, so the common case costs almost nothing.
- Per thread caches avoid sharing a non-thread-safe object.
- The routine only calls members of Java objects, as the routine rules require.

## Pattern: one hook per method, and a helper that reports failure

The same plugin registers each hook on its own. An app build that lacks one method then keeps everything else working:

```ts
const missing: string[] = []

function hook(label: string, register: () => void): boolean {
  try {
    register()
    return true
  } catch (error) {
    missing.push(label)
    console.warn(`cannot hook ${label}`, error)
    return false
  }
}

const hooked = hook('FastDateFormat.format(long)', () => inu.xposed.hookMethod(/* ... */))
hook('FastDateFormat.format(Date)', () => inu.xposed.hookMethod(/* ... */))
hook('LocaleController.formatYearMonthDay', () => inu.xposed.hookMethod(/* ... */))
```

The list of missing hooks then goes on the settings page, so a user knows what is not working and why. The pattern is worth copying for every plugin that hooks the app.

## Pattern: a clean set of hooks you can undo

[Call Avatar](https://github.com/entinyGram/plugins/blob/main/plugins/call-avatar/src/index.ts) adds a photo layer to the call screen. It keeps every disposer in an array, so it can undo all hooks at once, on failure and on unload:

```ts
const off: (() => void)[] = []
let supported = false

try {
  off.push(inu.xposed.hookMethod(VoIP.getDeclaredMethod('showCallingUserAvatarMini(ZZ)V'), {
    after(ctx) {
      try { sync(ctx.thisObject) } catch (error) {
        console.warn('call-avatar: could not update photo', error)
        detach(true)
      }
    },
  }))
  off.push(inu.xposed.hookMethod(VoIP.getDeclaredMethod('destroy()V'), {
    before(ctx) {
      if (active && active.fragment.call('equals', ctx.thisObject)) detach(false)
    },
  }))
  supported = true
} catch (error) {
  supported = false
  for (const unhook of off.splice(0)) unhook()
  console.warn('call-avatar: this client does not support the required call hooks', error)
}

inu.onUnload(() => {
  for (const unhook of off.splice(0)) unhook()
  onUI(() => detach(true))
})
```

Things to copy:

- If any hook fails, the ones that did install are removed, so the plugin is never left half-applied.
- Every callback has its own `try`/`catch`, so a failure in one cannot take the others down.
- `inu.onUnload` removes the hooks and the views the plugin added, so a reload starts clean.
- Handles are compared with `.call('equals', …)`, never with `===`.
- The settings page says honestly whether the hooks work: `supported ? 'supported' : 'unsupported'`.

## Pattern: a JavaScript draw hook, with the settings in the app's own screen

[Text Animation](https://github.com/entinyGram/plugins/blob/main/plugins/text-animation/src/index.ts) animates typing, so it needs to run on every draw of the message field. It uses a JavaScript hook with its own error handling:

```ts
const onDraw = EditTextBoldCursor.getDeclaredMethod('onDraw(Landroid/graphics/Canvas;)V')

unhook = inu.xposed.hookMethod(onDraw, {
  before(ctx: any) {
    try { handleBeforeDraw(ctx.thisObject) } catch (err) { console.error('before error', err) }
  },
  after(ctx: any) {
    try { handleAfterDraw(ctx.thisObject, ctx.args[0]) } catch (err) { console.error('after error', err) }
  },
})
```

> [!WARNING]
> A JavaScript hook on a drawing method is the expensive way to do this: every frame pays for a thread handoff. It is acceptable here because the work is small and only active while the user types. For anything that runs on every list item, use a routine, as Calendar Systems does.

Its settings are placed in the app's own **Chats** screen with the [SDK](/entinygram/docs/entiny-sdk). The manifest asks for a row that opens the page and a switch at the end of the chat settings:

```ts
// inu.config.ts
manifest: withEntiny({ /* id, name, grants… */ }, {
  screen: ['category-chats'],
  inline: [{ slot: 'category-chats.end', rows: ['enable'] }],
}),
```

and the plugin answers for those rows with `embed`:

```ts
embed({
  id: 'entinygram.text-animation',
  name: 'Text animation',
  placements: {
    screen: ['category-chats'],
    inline: [{ slot: 'category-chats.end', rows: ['enable'] }],
  },
  rows: () => [{ id: 'enable', type: 'check' as const, text: t('title'), checked: cfgBool('enable') }],
  onEvent: (_row, value) => {
    cfgSet('enable', value)
    embedChanged()
  },
  open: () => { inu.ui.openPage(page) },
})
```

One state, two views: the switch in the app's settings and the plugin's own page read the same stored value, and `embedChanged()` keeps them in step.

## Pattern: a dialog from an embedded row

An `embed` callback runs inside the hook the SDK put on the app's settings screen, which is not the plugin thread, and a dialog needs the plugin thread. So the callback hands the work over with a zero delay timer:

```ts
onEvent: (row) => {
  if (row !== 'key') return
  // a dialog needs the plugin thread, which the screen's hook is not on
  setTimeout(async () => {
    const value = await inu.ui.prompt({ title: 'API key', value: current, selectAll: true })
    if (value === null) return
    localStorage.setItem('apiKey', value.trim())
    embedChanged()
  }, 0)
},
```

Any call that opens a dialog, a prompt or a chooser from an `embed` callback should be wrapped this way.

## Pattern: hiding secrets in a settings row

A key field shows a mask instead of the secret, and is edited through a prompt:

```ts
inu.ui.button({
  id: 'key',
  text: 'API key',
  value: apiKey() === '' ? 'not set' : '••••••••',
  onClick: async () => {
    const value = await inu.ui.prompt({ title: 'API key', value: apiKey(), selectAll: true })
    if (value === null) return
    localStorage.setItem('apiKey', value.trim())
    page.invalidate()
  },
})
```

Remember that `localStorage` is private to the plugin but not encrypted. Do not store secrets you cannot afford to lose, and never write them to the log.

## Pattern: a translation provider

A plugin can add a translation service that the app's translator offers next to the built-in ones. A complete provider, with its key kept in `localStorage`:

```ts
inu.registerTranslationProvider({
  id: 'my-translate',
  name: 'My Translate',
  async translate({ texts, to, signal }) {
    const key = localStorage.getItem('apiKey') ?? ''
    if (key === '') throw new Error('Set an API key first')
    const response = await fetch('https://api.example.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ target: to, texts }),
      signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as { translations?: Array<{ text?: string }> }
    const translations = data.translations ?? []
    if (translations.length !== texts.length) throw new Error('Unexpected answer')
    return translations.map(item => item.text ?? '')
  },
})
```

The manifest needs only `fetch(api.example.com)`. Pass `signal` to `fetch` so a cancelled translation stops the request, and check that the answer has as many texts as you sent.

## Pattern: improving someone else's plugin

Plugins are small files, so the quickest way to a good plugin is often to start from one that already does most of the job. **No Vibration** by [@akresik](https://t.me/akresik) is a good model: forty lines that switch off every kind of vibration the app can ask for. entinyGram's own [No Vibration](https://github.com/entinyGram/plugins/tree/main/plugins/features/no-vibration) is based on it, and this is how you take such a plugin further without hiding where it came from.

The original is a list of hooks that skip the call:

```ts
function hook(className: string, method: string, before: (ctx: any) => void): void {
  try {
    inu.xposed.hookAllOverloads(inu.jvm.cls(className), method, { before })
  } catch (e) {
    failed.push(`${className}#${method}: ${(e as Error).message}`)
  }
}

hook('android.view.View', 'performHapticFeedback', (ctx: any) => ctx.setReturnValue(false))
```

It works while the plugin is on, and the only way to get vibration back is to switch the plugin off. Switches in the app's settings, one for each kind of vibration, are a small improvement that fits the SDK well.

### 1. Decide whose plugin it is

- **Your own plugin based on theirs.** Give it your own id and name as author, start at `1.0.0`, put "based on X by @author" in the README, the changelog and a comment at the top of the source, and keep the author's name there. Users of the original are not affected, because it is a different plugin.
- **An update of their plugin.** Keep the author and the id so that people who have it get your version as an update, and raise the version. Do this only with the author's agreement.

Either way, list what you changed in `CHANGELOG.md`. If the author asks for a change, or does not want the plugin reused, respect it.

### 2. Ask for the placement

`withEntiny` adds the SDK requirement and the placement directives to the manifest. Here the switches go to the end of the Device section of Behavior:

```ts
import { defineConfig } from '@inugram/cli'
import { withEntiny } from '@entiny/sdk'

export default defineConfig({
  plugins: {
    'no-vibration': {
      entry: 'src/index.ts',
      manifest: withEntiny(
        {
          id: 'entinygram.no-vibration',
          name: 'No Vibration',
          author: 'entinyGram',
          version: '1.0.0',
          description: 'Turns off haptics, vibration and notification vibration, each on its own switch',
          grants: ['unsafe.jvm', 'unsafe.xposed'],
        },
        { inline: [{ slot: 'behavior.device-section.end', rows: ['haptics', 'vibrator', 'notifications'] }] },
      ),
    },
  },
})
```

### 3. Make the hooks ask the switches

Each hook looks at its switch when it runs, so turning one off takes effect at once, with no reload. The original `hook` calls stay as they were; only the wrapper takes a kind:

```ts
import { embed, embedChanged } from '@entiny/sdk/embed'

type Kind = 'haptics' | 'vibrator' | 'notifications'
const KINDS: Kind[] = ['haptics', 'vibrator', 'notifications']
const blocked = (kind: Kind): boolean => localStorage.getItem(`block.${kind}`) !== 'false'

function hook(kind: Kind, className: string, method: string, action: (ctx: any) => void): void {
  try {
    inu.xposed.hookAllOverloads(inu.jvm.cls(className), method, {
      before: (ctx: any) => { if (blocked(kind)) action(ctx) },
    })
  } catch {}
}

hook('haptics', 'android.view.View', 'performHapticFeedback', (ctx: any) => ctx.setReturnValue(false))

embed({
  id: 'entinygram.no-vibration',
  name: 'No Vibration',
  placements: { inline: [{ slot: 'behavior.device-section.end', rows: KINDS }] },
  rows: () => KINDS.map(kind => ({ id: kind, type: 'check' as const, text: kind, checked: blocked(kind) })),
  onEvent: (row, value) => {
    localStorage.setItem(`block.${row}`, value)
    embedChanged()
  },
})
```

Everything is blocked until the user says otherwise, which is what the original does. The real plugin also has translated texts and a short note under each switch; see its source for the full version.

### 4. Build and test

`inu check` validates the manifest, `inu dev` pushes the plugin to the phone and reloads it as you edit. Test that each switch really turns its kind of vibration on and off, that the choice survives restarting the app, and that the plugin installs from a repository that carries the SDK (the app installs the SDK first). On plain Inugram the plugin still installs, and the switches simply do not appear.

Use this approach for any plugin you improve: change as little as possible, keep what the author wrote visible, and say where the plugin came from.

## Where to go next

- The typings that every one of these examples compile against: [`sdk/types`](https://github.com/entinyGram/plugins/tree/main/sdk/types).
- A map of every call: [API reference](/entinygram/docs/api-reference).
- Where each piece of the SDK lives: [Source map](/entinygram/docs/source-map).
