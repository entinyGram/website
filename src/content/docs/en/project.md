# Project and manifest

A plugin project is a normal TypeScript project with one extra file, `inu.config.ts`. This page explains that file, every field of the manifest, the header the CLI generates from it, and what the build does.

## The configuration file

```ts
// inu.config.ts
import { defineConfig } from '@inugram/cli'

export default defineConfig({
  outDir: 'dist',
  plugins: {
    dog: {
      entry: 'src/dog/index.ts',
      manifest: {
        name: 'Dog',
        id: 'com.github.you.dog',
        author: '@you',
        version: '1.0.0',
        description: { en: 'Shows a dog', uk: 'Показує собаку' },
        icon: 'inu://mute',
        grants: ['onUpdate(new_message)', 'account.read(peers)'],
      },
    },
  },
})
```

| Option | Meaning |
| --- | --- |
| `outDir` | where built files go, `dist` by default |
| `plugins` | one entry per plugin, keyed by a short name |
| `plugins.<name>.entry` | the source file the bundle starts from |
| `plugins.<name>.manifest` | the description of the plugin, see below |
| `plugins.<name>.outFile` | where the built file goes, `{outDir}/{name}.inu.js` by default |
| `esbuild` | a function that edits the build options, for the whole project or for one plugin |

The configuration file is found by name: `inu.config.ts`, `inu.config.mts`, `inu.config.js` or `inu.config.mjs`. The CLI validates it with the same rules the app applies when a plugin is installed, so a manifest that would be refused fails `inu check` and `inu build` with the app's reason.

The key under `plugins` (`dog` above) is only a handle for the CLI: `inu dev dog` builds and pushes just that plugin. It is not the plugin's id.

One project can hold many plugins, each with its own entry and manifest. Small plugins that do one thing are easier to audit and to maintain than one big plugin with a lot of switches, so splitting is usually the right call.

## The manifest

Only `name` is required. Everything else is optional, but a plugin you share should fill in `id`, `author`, `version` and `description`.

| Field | Meaning |
| --- | --- |
| `name` | the name shown in the plugin list |
| `id` | the unique identifier of the plugin. The app uses it to keep the plugin's state and data across updates, so it is compared as is. It must be a single token: no spaces, no control or invisible characters. A reverse domain name such as `com.github.you.dog` is the usual choice. **Never change it after you publish.** If you leave it out, it is derived from `author` and `name` (`you.dog`), and changing either of them then installs a separate plugin instead of updating the old one |
| `author` | a display name. A value starting with `@` is shown as a Telegram username |
| `version` | the version users see, such as `1.2.0`. See the rules below |
| `description` | one short text, or an object that maps a language code to a text |
| `icon` | an icon for the plugin list, see below |
| `grants` | the list of permissions the plugin asks for, see [Grants](/entinygram/docs/grants) |
| `pluginApi` | the plugin API level the plugin is written for. It defaults to the level of the `@inugram/plugin-types` you have installed. A level higher than the app supports is refused |
| `platform` | `android` by default |
| `extra` | any additional header directives, kept verbatim. The plugin can read them at run time from `inu.info().header` |

### Versions

Use `major.minor.patch`, optionally with a suffix: `1.0.0`, `1.2.0-beta`. When a plugin is updated, the app compares versions: `0.10.0` is newer than `0.9.0`, and `1.0.0` is newer than `1.0.0-beta`. Always raise the version when you publish a change. A published version is never replaced.

### Descriptions in several languages

```ts
description: { en: 'Shows a dog', uk: 'Показує собаку', ru: 'Показывает собаку' },
```

The header gets one `@description` line for the default text and one `@description:xx` line for each other language. The default is the `en` entry, or the first one if there is no `en`. The app shows the text that matches the user's language.

### Icons

The `icon` field takes one of these forms:

| Form | Result |
| --- | --- |
| `inu://name` | one of the built-in icons from `inu.icons.common`, such as `inu://settings` |
| `tg://emoji?id=ID` | a Telegram custom emoji, by its id |
| `tg://addstickers?set=SLUG` | the thumbnail of a sticker set |
| `tg://addstickers?set=SLUG&idx=N` | the sticker at index `N` of a set, counted from zero |
| `tg://addstickers?set=SLUG&id=ID` | one sticker of a set, by its document id |

Any other value draws a placeholder icon. The value must be a single line.

## The header

The CLI turns the manifest into a header at the top of the built file. It is a comment in a userscript style:

```js
// ==InuPlugin==
// @name         Dog
// @id           com.github.you.dog
// @author       @you
// @version      1.0.0
// @description  Shows a dog
// @description:uk Показує собаку
// @icon         inu://mute
// @grant        onUpdate(new_message)
// @grant        account.read(peers)
// @plugin-api   1
// @platform     android
// ==/InuPlugin==
```

The app, the Marketplace and the publishing bot all read this block, so what is in it is what users see. A few lines are written by the tool for you:

- `@plugin-api` is `1`. It is bumped only for major breaking changes of the API. Apps support only the latest value, so a plugin written for an older API does not run on a newer app.
- `@platform` is `android`.
- Each `grants` item becomes one `@grant` line.

Plugins that use the [entinyGram SDK](/entinygram/docs/entiny-sdk) also get a `@requires entinygram.sdk >=…` line, plus placement directives. Those come from `withEntiny`, never from hand editing.

## Building

`inu build` type checks the project and bundles each plugin with [esbuild](https://esbuild.github.io/) into one `.inu.js` file in `outDir`. The bundle has no imports: everything you import is inlined.

You can change the esbuild options for every plugin, or for one:

```ts
export default defineConfig({
  plugins: { /* ... */ },
  esbuild: (options, plugin) => {
    options.define = { DEBUG: 'false' }
  },
})
```

Do **not** turn on `minify`. A minified plugin is much harder for users to audit, and the plugin channel does not accept obfuscated code. Plain readable output is the norm.

The build also compiles every [routine](/entinygram/docs/routines) you wrote into bytecode and checks that the manifest, the grants and the types are valid. `inu check` does the validation without writing files.

### Importing other files

Because the CLI bundles, you can use `import` freely in the project: your own modules, packages from npm, type only imports. Files such as small SVGs can be turned into strings at build time if you add a loader through the `esbuild` hook:

```ts
esbuild: options => ({ ...options, loader: { ...options.loader, '.svg': 'text' } }),
```

After that, `import icon from './icon.svg'` gives you the file's text, ready for `inu.icons.svg(icon)`.

## Commands

| Command | What it does |
| --- | --- |
| `inu init <dir>` | create a project with a starter plugin |
| `inu dev [name]` | build, push and reload on every save, with the log in your terminal |
| `inu push [name]` | build, push and reload once, then print the log for a few seconds (`--logs N` changes the time, `0` skips it) |
| `inu build` | type check and build release files |
| `inu check` | validate manifests, routines and types without building |
| `inu eval <name> <code>` | run code inside a running plugin and print the result |
| `inu list` | list the installed plugins |
| `inu remove` | uninstall a development plugin by file name |
| `inu verify <file>` | rebuild every routine of a built file from its recorded source and compare |

Commands that talk to the phone go through `adb` and accept `-s <serial>` to pick a device. The app must be running, with plugins enabled and not in safe mode.

### Why `verify` exists

Routines are compiled to bytecode, which nobody wants to read. `inu verify dist/my-plugin.inu.js` takes the source recorded next to each routine, compiles it again with the same compiler and compares the result with the bytecode in the file. A mismatch means the routine does not do what its source says. This check covers the routine body only: the values it captures come from ordinary JavaScript around it, which you still review like any other code.

## Choosing an id

- Use something unique that you control: `com.github.yourname.pluginname`, `io.yourdomain.plugin`.
- Use lowercase letters, digits, dots, dashes and underscores.
- Keep it for the life of the plugin. If the id changes, the app sees a different plugin: it will not update the old one, and the old one's data stays behind.

For plugins published to the entinyGram channel, the bot enforces the same shape (3 to 64 characters from `a-z`, `0-9`, `.`, `_`, `-`) and reserves the `entinygram.` prefix for the project's own plugins. See [Publishing](/entinygram/docs/publishing).

## Project layout that scales

```text
my-plugins/
  inu.config.ts
  package.json
  tsconfig.json
  src/
    translate-helper/
      index.ts        plugin entry
      settings.ts     the settings page
      i18n.ts         texts for several languages
    shared/
      format.ts       code used by several plugins
```

A simple rule keeps plugins fast to load: do cheap work at the top level, register what you need, and leave heavy work for callbacks. Top level evaluation has a time limit, and for plugins that start early the app waits for your registrations. See [The engine](/entinygram/docs/engine).

## Source and further reading

- [`sdk/cli/src/utils/config.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/config.ts): the `inu.config.ts` schema
- [`sdk/cli/src/utils/manifest.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/manifest.ts): the manifest schema, the header writer and the grant checks
- [`sdk/cli/src/commands`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/commands): what each command does
- [`plugins/2gis/inu.config.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/2gis/inu.config.ts): a small real configuration with `withEntiny`
- [`getting-started.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/getting-started.md) in Inugram
