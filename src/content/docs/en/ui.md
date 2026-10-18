# UI

Plugins build interface in a declarative way. You describe what a page looks like as a function, and the app draws it. This page covers settings pages and their rows, icons, menu actions, dialogs, files, and the more experimental screens.

## Elements and icons are values

Three kinds of values make up an interface:

- `UIElement`: an opaque description of a widget, such as a button or a switch.
- `UIIcon`: an opaque description of an icon, built-in or your own.
- `UIPage`: an actual page you can open.

You make them with the `inu.ui.*` and `inu.icons.*` functions.

## Settings pages

A settings page is a title and an `items` function that returns the rows to show:

```ts
let enabled = false
let mode = 0

const page = inu.ui.settingsPage({
  title: 'Dog',
  items: () => [
    inu.ui.header('General'),
    inu.ui.check({
      id: 'enabled',
      text: 'Show the dog',
      icon: inu.icons.common('check'),
      checked: enabled,
      onChange: (checked) => {
        enabled = checked
      },
    }),
    inu.ui.select({
      id: 'mode',
      text: 'Mode',
      items: ['Small', 'Large'],
      selected: mode,
      onChange: (index) => {
        mode = index
      },
    }),
    inu.ui.separator('Changes apply right away'),
  ],
})

inu.registerSettings(page)
```

`registerSettings(page)` makes the page the plugin's settings entry: a **Settings** button next to the plugin's name in the plugin list. Any other page you build, you open yourself with `inu.ui.openPage`.

Options of `settingsPage`:

| Option | Meaning |
| --- | --- |
| `title` | the page title |
| `items` | a function that returns the rows |
| `transient` | dispose the page when it closes; use it for pages you rebuild on every open |
| `bottomButton` | a call to action fixed to the bottom: `{ text, onClick }` |
| `onClose` | called when the page closes |

### How rendering works

The page is declarative. Think of `items()` as a very small React.

The app calls `items()` to build the page when:

- the page opens,
- the user interacts with it,
- you call `page.invalidate()`.

After the user taps something, the page is built again automatically, so you only need `invalidate()` when state changes from outside the page: after a timer, a network answer or an event.

**Controls do not hold their own state.** A switch shows whatever `checked` the last call to `items()` returned. If `onChange` does not store the new value, the switch flips back on the next build. The one exception is `slider`: building the page on every step would be too expensive, so its `onChange` fires only when the user releases it.

If `items()` throws, the error goes to the plugin's log and the page keeps its last good drawing.

### Row identity

Every row has an `id`, used to recognize it from one build to the next, much like a `key` in React. In simple cases you do not need to set it: it is derived from the row's type, its text and its position. When you have dynamic rows, such as a section that appears only when a switch is on, give them explicit `id`s so the app matches them correctly and does not swap their state.

### Available elements

| Function | Description |
| --- | --- |
| `header(text)` | a section title |
| `button` | a row you can tap, with optional `subtitle`, `icon`, a `value` on the trailing side, and `danger` to draw it red |
| `check` | a `button` with a switch on the trailing side |
| `select` | a button that shows a choice menu, or a dialog, when tapped |
| `slider` | a slider with an optional title, a label function and a reset value |
| `separator(text?)` | a divider with optional footer text |

A `button`, `check` and `select` also take `onSecondaryClick`, which runs on a long tap.

```ts
inu.ui.button({
  id: 'refresh',
  text: 'Refresh',
  subtitle: 'Fetch the latest data',
  icon: inu.icons.common('refresh'),
  value: 'v1.2',
  onClick: () => refresh(),
  onSecondaryClick: () => inu.ui.toast('Long tap'),
})
```

`select` takes `items` as strings, or as objects with a `subtitle`. When any item has a subtitle the choice opens as a dialog; otherwise it is a small menu. Override that with `dialog: true` or `false`.

```ts
inu.ui.slider({
  id: 'size',
  text: 'Text size',
  min: 10,
  max: 24,
  step: 1,
  value: size,
  default: 14,
  label: value => `${value} sp`,
  onChange: (value) => {
    size = value
  },
})
```

### Menus

Every `onClick` gets an anchor. Use it to open a small menu next to the row:

```ts
inu.ui.button({
  id: 'size',
  text: 'Size',
  onClick: (anchor) => {
    anchor.openMenu([
      { text: 'Small', onClick: () => console.log('small') },
      { text: 'Large', onClick: () => console.log('large') },
    ])
  },
})
```

In real code prefer `inu.ui.select` for choices like this.

### Opening pages

`inu.ui.openPage(page)` opens one of your pages. It also takes a stock target:

```ts
inu.ui.openPage({ type: 'chat', dialogId: 777000 })
inu.ui.openPage({ type: 'settings' })
```

- `account` defaults to the active account.
- `chat` and `profile` need the dialog to be known to the app, or they throw `not-found`.
- Secret chats are refused with `forbidden`.
- `topicId` is valid only for `chat`.

### Page lifetime

A page lives until you call `page.dispose()`, until the reference is garbage collected, or until the plugin unloads. While it lives you can open it with `inu.ui.openPage`. For pages you rebuild on every open, pass `transient: true`, which is shorthand for `onClose: () => page.dispose()`. Opening a disposed page throws `handle-expired`.

### A custom view inside a page

`inu.android.nativeView(view)` turns a Java `View` you built into a row. It needs `unsafe.jvm`. Use it for what rows cannot express, and keep it rare: native views do not follow the page's theme and layout rules for you.

## Icons

Many rows take an `icon`. You get one with:

| Function | Description |
| --- | --- |
| `common(name)` | a built-in icon from a fixed list |
| `animation(name)` | a built-in animation: `success`, `error`, `info`, `loading` |
| `customEmoji(id, options?)` | a Telegram custom emoji by its id |
| `sticker(options)` | a sticker from a set, addressed by `slug` and an `index`, `emoji` or `id` |
| `svg(source)` | a custom SVG, up to 64 KiB of source |
| `avatar(dialogId, options?)` | a user's or chat's photo, initials while it loads |

The names `common` accepts:

```text
settings info search edit delete copy share download link pin star mute unmute
archive forward reply user group channel bot lock eye eyeOff refresh plus minus
check close more translate bookmark
```

With `unsafe.jvm` there are a few more: `resourceIcon(name)` for an app drawable, `rawAnimation(name)` for an app Lottie file, and `drawableIcon(drawable)` for any `Drawable`.

## Actions

Actions add your own entries to the app's menus:

| Function | Where it appears |
| --- | --- |
| `registerGlobalAction` | the drawer or the main screen's menu |
| `registerChatAction` | the menu in a chat |
| `registerProfileAction` | the menu in a profile |
| `registerMessageAction` | the menu on a message |

```ts
inu.registerMessageAction({
  id: 'count-words',
  text: 'Count words',
  icon: inu.icons.common('info'),
  // bubble: tapping a message; selection: several messages selected
  placements: ['bubble', 'selection'],
  callback: (ctx) => {
    const words = ctx.messages.reduce((n, m) => n + m.text.split(/\s+/).length, 0)
    inu.ui.toast(`${words} words`)
  },
})
```

Rules worth knowing:

- `text` and `icon` can be plain values or getters. `visible` is always a getter. Prefer static values: they are cheaper, and getters must stay fast and do no I/O.
- The `id` must be stable. It dispatches the click and keeps the user's choices to hide, pin and reorder the row.
- At most **8 rows per menu per plugin**. Registering more throws `quota-exceeded`.
- Users can hide, pin and reorder chat and message actions in the app's menu settings. That screen calls your `text` and `icon` getters with `null` instead of a context, and never calls `visible`. The typings reflect that: those getters take a context or `null`.
- Actions never appear in secret chats.

## Dialogs and messages

| Function | What it does |
| --- | --- |
| `toast(text)` | shows an Android toast |
| `bulletin(options)` | shows a bulletin; resolves with `'button'`, `'clicked'` or `'dismissed'` |
| `dialog(options)` | shows a dialog; resolves with `'positive'`, `'negative'`, `'neutral'` or `'dismissed'` |
| `chooser(options)` | shows a list of choices; resolves with the selected index, a list of indexes with `multiple`, or `null` |
| `prompt(options)` | shows a text input; resolves with the text, or `null` |

```ts
const answer = await inu.ui.dialog({
  title: 'Delete everything?',
  message: 'This cannot be undone.',
  positive: 'Delete',
  negative: 'Cancel',
})
if (answer === 'positive') {
  // ...
}
```

At most three dialogs, prompts, choosers and file pickers can be open at once across all plugins. One more rejects with `quota-exceeded`. Toasts and bulletins do not count.

## Files

- `inu.ui.pickFile()` opens the system file picker. The chosen file is copied into the plugin's private storage and returned as a `File`. Use `{ multiple: true }` for several.
- `inu.ui.saveFile(content)` opens a "save as" dialog and resolves with `true` if the user saved. `content` is a `Blob` or `Uint8Array` of up to 32 MB.

See [Network, files and storage](/entinygram/docs/io) for blobs and paths.

## Chat history

> [!EXPERIMENTAL]
> `openChatHistory` and its types may change.

`inu.ui.openChatHistory(options)` opens a chat history view whose data your plugin supplies:

```ts
const history = inu.ui.openChatHistory({
  title: 'Edit history',
  synthetic: true,
  load: async (cursor, direction) => {
    const page = await store.page(cursor, direction)
    return {
      entries: page.versions.map(v => ({ key: v.key, message: v.message })),
      next: page.next,
    }
  },
})
history.closed.then(() => console.log('left'))
```

- `load` is called whenever the screen needs more data. The first call is usually `(null, 'older')`. When the user taps "jump to bottom" it is `(null, 'newer')`.
- Messages are addressed by a string key, by default `peer:id`.
- Messages can be synthetic: not backed by a real server message.
- `button: { text, onClick }` adds a button at the bottom of the screen.
- `append`, `replace` and `remove` on the handle update the page imperatively.

## The current screen

> [!EXPERIMENTAL]
> `getCurrentScreen` and `onScreenChanged` may change.

`inu.ui.getCurrentScreen()` returns what the user is looking at, and `inu.ui.onScreenChanged(callback)` reports navigation with the whole back stack. Use them to show something only on a particular screen.

## Tips

- Keep `items()` fast and free of I/O. It runs on every interaction. Compute things once, store them in variables, and read them in `items()`.
- Give rows stable ids whenever the set of rows changes.
- Put what users change often at the top of the page, and explanations in `separator` footers.
- Use `danger: true` only for actions that delete or reset something.
- Support the languages you can. Read the app's language and pick your strings; the entinyGram plugins do this with a small `i18n` module.

## Source and further reading

- [`sdk/types/common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts): the `inu.ui` and `inu.icons` namespaces, with every option
- [`PluginUi.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/ui/PluginUi.kt) and [`PluginSettingsActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginSettingsActivity.kt): how a declarative page becomes a native screen
- [`plugins/entiny-sdk/src/index.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/index.ts): a large real set of pages
- [`ui.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/ui.md) in Inugram: the original page
