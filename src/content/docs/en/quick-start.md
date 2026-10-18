# Quick start

This page takes you from nothing to a plugin running on your phone, then to one that reacts to Telegram. It takes about ten minutes.

## What you need

- An Android phone with **entinyGram** or **Inugram** installed.
- **USB debugging** turned on, and the phone connected to your computer. Check with `adb devices`: your phone must be listed.
- [Bun](https://bun.sh/) or Node.js with pnpm on the computer. The examples use pnpm and show the Bun equivalent where it differs.
- A code editor. The project is TypeScript, so one with TypeScript support makes writing plugins much easier: you get autocomplete for the whole `inu` API.

## 1. Create a project

```bash
pnpm dlx @inugram/cli init my-plugins
cd my-plugins
pnpm install
```

With Bun the first line is `bun x @inugram/cli init my-plugins`. The command creates a folder with a starter plugin and a configuration file:

```text
my-plugins/
  inu.config.ts      what to build and how the plugin is described
  src/
    dog/index.ts     the starter plugin
  package.json
  tsconfig.json
```

## 2. Look at the configuration

`inu.config.ts` lists the plugins in the project and the manifest of each one:

```ts
import { defineConfig } from '@inugram/cli'

export default defineConfig({
  outDir: 'dist',
  plugins: {
    hello: {
      entry: 'src/hello/index.ts',
      manifest: {
        name: 'Hello',
        id: 'com.example.hello',
        author: '@you',
        version: '1.0.0',
        description: 'My first plugin',
        grants: [],
      },
    },
  },
})
```

`name` is the only required field. The rest is explained in [Project and manifest](/entinygram/docs/project). For now, notice that `grants` is empty: this plugin asks for no permissions.

## 3. Write the plugin

Put this in `src/hello/index.ts`:

```ts
let taps = 0

const page = inu.ui.settingsPage({
  title: 'Hello plugin',
  items: () => [
    inu.ui.header('Counter'),
    inu.ui.button({
      id: 'tap',
      text: 'Tap me',
      subtitle: `Tapped ${taps} times`,
      onClick: () => {
        taps++
      },
    }),
    inu.ui.separator('Only used to try things out'),
  ],
})

inu.registerSettings(page)
console.log('hello plugin loaded')
```

Three things happen here.

- `inu.ui.settingsPage` describes a page as a function that returns rows. The app calls that function every time it needs to draw the page. See [UI](/entinygram/docs/ui).
- The button changes `taps`. After a tap, the page is built again by itself, so the new count shows up with no extra code.
- `inu.registerSettings(page)` makes the page the plugin's settings entry: a **Settings** button next to the plugin's name in the plugin list.

## 4. Turn on developer mode

In the app open **Settings → Plugins**, tap the **⋮** menu and switch on **Developer mode**. This lets the command line tool talk to the app over `adb`.

> [!NOTE]
> A plugin pushed in developer mode skips the permission sheet. People who install the built file do see it, so test with a real install before you publish.

## 5. Run it

```bash
pnpm inu dev
```

(In a Bun workspace: `bun inu dev`.) The tool builds the plugin, pushes it to the phone, reloads it, and keeps doing that every time you save a file. Output from `console.log` in your plugin appears in the terminal.

Open **Settings → Plugins** on the phone. Your plugin is in the list with a **Settings** button. Tap it, then tap the counter.

Useful flags:

| Flag | Effect |
| --- | --- |
| `-s <serial>` | choose a device when several are connected |
| `--no-logs` | do not print the plugin's log |

If the tool says the app is not running, open the app first. If it says plugins are disabled or in safe mode, turn them on in the plugin settings.

## 6. React to Telegram

A plugin that only shows a page is not very interesting. Let's log the text of every new message. That needs two grants: one to watch messages, one to read peers.

Add them to the manifest:

```ts
grants: ['onUpdate(new_message)', 'account.read(peers)'],
```

And listen in the plugin:

```ts
inu.onNewMessage((message) => {
  if (message.out) return
  console.log('new message:', message.text.slice(0, 40))
})
```

Save the file. `inu dev` rebuilds and reloads, and every incoming message now prints a short preview in your terminal.

> [!TIP]
> The permission a call needs is written in its typings as a `@needs-grant` tag. If a call throws `not-granted`, the error carries the exact grant to add to your manifest.

## 7. Build the real file

```bash
pnpm inu build
```

This type checks the project and writes `dist/hello.inu.js`. That is the file you give to other people.

## 8. Install a built file

Move `hello.inu.js` to your phone (a chat with yourself works) and either tap the file in the chat, or open **Settings → Plugins → Load from file**. The app shows the permission sheet with your grants, you confirm, and the plugin is installed.

You can also push the built file once, without watching: `inu push hello` builds, pushes, reloads and prints the log for a few seconds.

## The other commands

| Command | What it does |
| --- | --- |
| `inu dev [name]` | build, push and reload on every save |
| `inu push [name]` | build, push and reload once, then print the log |
| `inu build` | type check and build the release file into `dist/` |
| `inu check` | validate manifests, routines and types without building |
| `inu eval <name> <code>` | run code inside a running plugin and print the result |
| `inu list` | list the installed plugins |
| `inu remove` | uninstall a development plugin by its file name |
| `inu verify <file>` | check that a built file's routines match their source |

A quick way to poke at a running plugin:

```bash
inu eval hello 'localStorage.length'
inu eval hello 'await inu.invokeRpc({ _: "help.getConfig" })'
echo 'localStorage.length' | inu eval hello -
```

`eval` runs with the plugin's own grants, storage and globals, and answers with the value of the last expression, awaited.

## Where to go next

- Understand the file you just made: [Project and manifest](/entinygram/docs/project).
- Draw richer screens: [UI](/entinygram/docs/ui).
- Talk to Telegram: [Telegram API](/entinygram/docs/telegram).
- Put your plugin's switches into the app's own settings: [the entinyGram SDK](/entinygram/docs/entiny-sdk).
- Share it: [Publishing a plugin](/entinygram/docs/publishing).

## Source and further reading

- [`sdk/cli/src/commands`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/commands): the source of every command used on this page
- [`sdk/cli/src/templates`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/templates): the starter project `inu init` creates
- [`getting-started.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/getting-started.md) in Inugram: the original guide
- [Worked examples](/entinygram/docs/examples): a minimal plugin and the real ones
