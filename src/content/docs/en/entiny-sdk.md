# The entinyGram SDK

entinyGram builds on Inugram's plugin engine and adds a layer for plugin authors: a way to put a plugin's settings directly into the app's own screens, a Marketplace to find and install plugins, and a dependency system between plugins.

The SDK is made of three parts:

- **The SDK plugin**, `entinygram.sdk`. An ordinary plugin that carries the Marketplace and the settings placement engine. It is the one that actually draws other plugins' rows into the app's screens.
- **The `@entiny/sdk` package.** What a plugin imports to ask for placement: `withEntiny`, the `embed` function and the typed list of places a setting can go.
- **A small bridge in the app**, used by the Marketplace to list and install plugins. Plugin authors rarely touch it.

The SDK adds no features of its own. A plugin that wants to change how the app behaves does it with the engine's own tools: `unsafe.jvm` and `unsafe.xposed`, ideally as [routines](/entinygram/docs/routines). The SDK only gives such a plugin a proper place for its settings.

## Why it exists

A plugin normally has one settings page, reached through the **Settings** button in the plugin list. That is fine for a plugin that is a tool of its own. It is awkward for a plugin that changes how a part of the app works: the user expects a map plugin's switch beside the other map settings, not in a separate page they have to find.

With the SDK, a plugin can:

- add a row that opens its page from a place that makes sense (`screen`),
- draw its switches and sliders into a section of the app's settings, or next to a specific setting (`inline`),
- add its own options to one of the app's pickers, such as the map preview provider (`choice`).

## Requirements and installation

A plugin that uses the SDK needs the SDK plugin installed. The plugin says so in its header with a `@requires` line, and the app enforces it:

- **Installing.** If `entinygram.sdk` is missing, disabled or too old, installation is refused with a message such as "Needs the plugin entinygram.sdk. Install it first".
- **Running.** If a user disables the SDK, every plugin that depends on it is suspended at once. When the SDK is switched back on, they are restored.

You do not write the `@requires` line yourself. `withEntiny` adds it.

## Using `withEntiny`

Wrap the manifest in `withEntiny` in your `inu.config.ts`. The second argument says where the plugin's settings should appear:

```ts
import { defineConfig } from '@inugram/cli'
import { withEntiny } from '@entiny/sdk'

export default defineConfig({
  plugins: {
    'my-plugin': {
      entry: 'src/index.ts',
      manifest: withEntiny({
        id: 'com.example.my-plugin',
        name: 'My Plugin',
        author: '@you',
        version: '1.0.0',
        description: 'Demonstrates settings placement',
        grants: ['unsafe.jvm', 'unsafe.xposed'],
      }, {
        // 1. a row that opens the plugin's whole page as a screen:
        screen: ['root.root-system'],
        // 2. controls drawn into a section or next to an item:
        inline: [
          'behavior.formatting',
          { slot: 'translate-provider.end', rows: ['key'], when: 'translation-provider' },
        ],
        // 3. options added to a picker list:
        choice: [{ slot: 'behavior.map-preview-provider', rows: ['maps'] }],
      }),
    },
  },
})
```

`withEntiny` writes `@entiny-menu`, `@entiny-inline` and `@entiny-choice` directives into the header, plus `@requires entinygram.sdk >=0.1.0-alpha`. The app reads the directives only from plugins that require the SDK.

### The three kinds of placement

They can be combined and repeated.

| Kind | What it does |
| --- | --- |
| `screen` | adds a row with the plugin's name that opens the page you registered with `inu.registerSettings` as a screen of its own |
| `inline` | draws the page's `check`, `button`, `select` and `slider` rows directly into a section or next to an item; headers and dividers are left out |
| `choice` | turns check rows of the page into options inside a radio or modal picker of the app; selecting the plugin's option activates the check, selecting a stock option unchecks it |

`rows` lists the ids of the page rows to show, so one page can serve several places. For `inline`, `when: 'translation-provider'` shows the rows only while one of the plugin's translation providers is the chosen one.

### Slots

A **slot** names a place: `<screen>.<name>`.

- The **screen** is the class name of the settings screen in kebab case, without `Settings` or `Activity`: `behavior`, `category-chats`, `root`.
- The **name** is a string resource of the app without the `Inu` prefix: `formatting`.

Add a suffix to say where in the place the row goes:

| Slot form | Where |
| --- | --- |
| `<screen>.<section>` | the end of that section, before its divider, for example `behavior.formatting` |
| `<screen>.<section>.start` | the very top of that section, right after its header |
| `<screen>.<item>` or `<screen>.<item>.after` | directly after that setting row |
| `<screen>.<item>.before` | directly before that setting row |
| `<screen>.<item>.replace` | in place of that setting row |
| `<screen>.<button>` (in `choice`) | adds an option into the picker opened by that button |
| `<screen>.end` | a section of its own at the bottom of the screen |
| `root.…` | the settings root: `root.root-interface`, `root.root-privacy`, `root.root-system` |

Every screen, section, item and picker is listed in `slots.json` and typed as `EntinySlot` and `ChoiceSlot` in `@entiny/sdk`, so your editor completes them. That list is a snapshot: the SDK finds screens and slots itself while the app runs, by reading the strings of the running app. A slot that is not in the list still works if the section or row exists.

## Placing rows from code: `embed`

The directives in the manifest are read by the app. The SDK plugin embeds rows by itself, with no code in the app: it hooks the base class of every settings screen and adds the rows that other plugins ask for. A plugin asks through `embed`:

```ts
import { embed } from '@entiny/sdk/embed'

let on = false

embed({
  id: 'com.example.my-plugin',
  name: 'My plugin',
  placements: {
    screen: ['root.root-system'],
    inline: [{ slot: 'behavior.formatting', rows: ['switch'] }],
  },
  rows: slot => [{ id: 'switch', type: 'check', text: 'Do the thing', checked: on }],
  onEvent: (row, value) => { if (row === 'switch') on = value === 'true' },
  open: () => inu.ui.openPage(page),
})
```

The pieces:

| Field | Meaning |
| --- | --- |
| `id`, `name` | the plugin id and the name shown with its rows |
| `placements` | where rows go, in the same shape as the manifest |
| `rows(slot)` | called every time the screen is built; returns the rows for a slot |
| `onEvent(rowId, value)` | called on a tap: a check passes `'true'` or `'false'`, a select the chosen index, a button an empty string |
| `open()` | opens the plugin's own page, for `screen` rows |
| `choices(slot)`, `onChoice(id, picked)` | options for pickers, see below |

A row is a `check`, a `button` or a `select`. Each can carry `subtitle`, `value` and `danger`; a select also takes `options` and `selected`.

Call `embedChanged()` after you change state that a row shows, so the screen redraws.

### Picker options

To add an option to one of the app's pickers, for example the **Map preview provider** list opened from a settings row, put the picker's slot in `placements.choice` and answer `choices(slot)`:

```ts
embed({
  id: 'com.example.my-maps',
  name: 'My maps',
  placements: { choice: ['behavior.map-preview-provider'] },
  rows: () => [],
  onEvent: () => {},
  choices: () => [{ id: 'maps', title: 'My maps', subtitle: 'Previews from my service', checked: on }],
  onChoice: (id, picked) => { on = picked; embedChanged() },
})
```

The option shows as `My maps (My plugin)`. Picking it calls `onChoice(id, true)` and tells every other plugin option of the same picker `false`. Picking one of the app's own options tells all of them `false`. The row that opens the picker shows the chosen plugin option as its value. A plugin can add up to two options per picker.

### Limits and honesty

To prevent a plugin from spoofing the interface:

- at most **4 rows per plugin per slot** and **2 options per plugin per picker**;
- every inline control and option shows clearly which plugin it comes from;
- callbacks go only to the plugin that registered them.

Everything runs in the SDK plugin, which needs `unsafe.jvm` and `unsafe.xposed`. Without the SDK, or on a device where the hook layer does not start, nothing is embedded and your plugin keeps working on its own page.

## On plain Inugram

Inugram ignores header directives it does not know, and `inu.registerSettings` still works there. A plugin that uses `withEntiny` still installs on plain Inugram, and its page opens from the plugin list. Only the placement is entinyGram only. If your plugin depends on the SDK being there, say so in the description.

## Calling the bridge

The Marketplace talks to the app through a small bridge class, `EntinyMarketBridge`, which exists only in entinyGram. In plain Inugram its class is missing, so the SDK runs in **standalone mode**: it still browses catalogs and embeds settings, but cannot list or install plugins itself and instead hands you a download link. A plugin that wants to use the bridge should do it defensively:

```ts
let bridge: ReturnType<typeof inu.jvm.cls> | null = null
try {
  bridge = inu.jvm.cls('desu.inugram.helpers.entiny.EntinyMarketBridge')
} catch {
  bridge = null
}
```

## A complete small example

A plugin that adds a switch to the app's formatting section and a page of its own:

```ts
// src/index.ts
import { embed, embedChanged } from '@entiny/sdk/embed'

let enabled = localStorage.getItem('enabled') === '1'

const page = inu.ui.settingsPage({
  title: 'My plugin',
  items: () => [
    inu.ui.check({
      id: 'switch',
      text: 'Do the thing',
      checked: enabled,
      onChange: (value) => set(value),
    }),
  ],
})
inu.registerSettings(page)

function set(value: boolean) {
  enabled = value
  localStorage.setItem('enabled', value ? '1' : '0')
  embedChanged()
}

embed({
  id: 'com.example.my-plugin',
  name: 'My plugin',
  placements: { inline: [{ slot: 'behavior.formatting', rows: ['switch'] }] },
  rows: () => [{ id: 'switch', type: 'check', text: 'Do the thing', checked: enabled }],
  onEvent: (row, value) => { if (row === 'switch') set(value === 'true') },
})
```

The same state backs the inline row and the plugin's own page, and `embedChanged()` keeps them in step.

## Source and further reading

- [`sdk/entiny/src/index.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/index.ts): `withEntiny`, the `@requires` rule and the placement types
- [`sdk/entiny/src/embed.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/embed.ts): `embed` and its row types
- [`sdk/entiny/src/slots.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/slots.ts) and [`slots.json`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/slots.json): every place a setting can go
- [`plugins/entiny-sdk/src/embed/engine.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/embed/engine.ts): the engine that draws the rows into the app
- [`plugins/text-animation`](https://github.com/entinyGram/plugins/tree/main/plugins/text-animation): `screen` and `inline` placement in a real plugin
- [`EntinyMarketBridge.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/entiny/EntinyMarketBridge.kt): the bridge on the app side
- [Source map](/entinygram/docs/source-map): everything in one table
