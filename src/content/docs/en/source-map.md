# Source map

Where the code lives, and where to read it when these pages are not enough. The plugin system is open source in three places: the SDK and the plugins in one repository, the app side in the entinyGram client, and the original engine upstream in Inugram.

## The three repositories

| Repository | What is in it |
| --- | --- |
| [entinyGram/plugins](https://github.com/entinyGram/plugins) | the SDK (typings, command line tool, `@entiny/sdk`), the official plugins, the catalog and the build scripts |
| [entaytion/entinyGram](https://github.com/entaytion/entinyGram) | the entinyGram client: the patchset and the Kotlin code that hosts plugins inside the app |
| [teidesu/inugram](https://github.com/teidesu/inugram) | Inugram, the project entinyGram is built on. The plugin engine, the API and the original docs come from here |

## The plugins repository

Everything a plugin author touches is in [`entinyGram/plugins`](https://github.com/entinyGram/plugins).

### `sdk/types`: the typings

[`sdk/types`](https://github.com/entinyGram/plugins/tree/main/sdk/types) is the package `@inugram/plugin-types`. It is the most important thing to read: every call is documented there, with its grant, its limits and whether it is experimental.

| File | Contents |
| --- | --- |
| [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts) | the core of the API: `inu`, accounts, messages, `inu.ui`, `inu.icons`, `inu.utils`, interceptors |
| [`android.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts) | `inu.android`: the current screen, bundles, native views |
| [`android.jvm.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts) | `inu.jvm`: reflection, handles, `defineClass`, routines |
| [`android.xposed.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts) | `inu.xposed`: hooks |
| [`android.notification-center.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.notification-center.d.ts) | the app's internal event bus (`unsafe.notificationCenter`) |
| [`android.tl.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.tl.d.ts) | every Telegram TL type, method and update |
| [`canvas.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts) | `inu.canvas` |
| [`fs.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts) | `inu.fs` |
| [`dom.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/dom.d.ts) | the web-like globals: `fetch`, `Blob`, `localStorage`, timers |
| [`grants.json`](https://github.com/entinyGram/plugins/blob/main/sdk/types/grants.json) | the grant catalogue: every permission, its scopes and its level |
| [`grants.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/grants.d.ts) | the same grants as types |
| [`tl-names.txt`](https://github.com/entinyGram/plugins/blob/main/sdk/types/tl-names.txt) | the names of TL methods and updates a grant scope can use |

### `sdk/cli`: the `inu` command line tool

[`sdk/cli`](https://github.com/entinyGram/plugins/tree/main/sdk/cli) is `@inugram/cli`. Read it to see exactly what a command does.

| Path | Contents |
| --- | --- |
| [`src/commands`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/commands) | one file per command: `build`, `check`, `dev`, `eval`, `init`, `list`, `push`, `remove`, `verify` |
| [`src/utils/config.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/config.ts) | the `inu.config.ts` schema and how it is loaded |
| [`src/utils/manifest.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/manifest.ts) | the manifest schema, how the header is written, and the grant validation |
| [`src/utils/device.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/device.ts) | how the tool talks to the phone over `adb` |
| [`src/routines`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/routines) | the routine compiler: finding calls, captures, bytecode |
| [`src/templates`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/templates) | the starter project `inu init` creates |

### `sdk/docs`: the original guides

[`sdk/docs`](https://github.com/entinyGram/plugins/tree/main/sdk/docs) holds the plugin guides as they come from Inugram: [getting started](https://github.com/entinyGram/plugins/blob/main/sdk/docs/getting-started.md), [engine](https://github.com/entinyGram/plugins/blob/main/sdk/docs/engine.md), [grants](https://github.com/entinyGram/plugins/blob/main/sdk/docs/grants.md), [ui](https://github.com/entinyGram/plugins/blob/main/sdk/docs/ui.md), [telegram](https://github.com/entinyGram/plugins/blob/main/sdk/docs/telegram.md), [interception](https://github.com/entinyGram/plugins/blob/main/sdk/docs/interception.md), [io](https://github.com/entinyGram/plugins/blob/main/sdk/docs/io.md), [canvas](https://github.com/entinyGram/plugins/blob/main/sdk/docs/canvas.md), [jvm](https://github.com/entinyGram/plugins/blob/main/sdk/docs/jvm.md), [xposed](https://github.com/entinyGram/plugins/blob/main/sdk/docs/xposed.md) and [routines](https://github.com/entinyGram/plugins/blob/main/sdk/docs/routines.md). The pages you are reading explain the same ideas, with entinyGram's additions.

### `sdk/entiny`: `@entiny/sdk`

[`sdk/entiny`](https://github.com/entinyGram/plugins/tree/main/sdk/entiny) is the package a plugin imports to use the entinyGram SDK.

| Path | Contents |
| --- | --- |
| [`src/index.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/index.ts) | `withEntiny`, the `@requires` rule, the placement types, `SDK_VERSION` |
| [`src/embed.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/embed.ts) | the `embed` function and its row types, the contract with the SDK plugin |
| [`src/slots.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/src/slots.ts) | the typed list of places a setting can go |
| [`slots.json`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/slots.json) | the same list as data: every screen, section, item and picker |
| [`README.md`](https://github.com/entinyGram/plugins/blob/main/sdk/entiny/README.md) | short notes on placement |

### `plugins`: the official plugins

[`plugins/`](https://github.com/entinyGram/plugins/tree/main/plugins) has one folder per plugin, each with an `inu.config.ts` and a `src`. They are the best examples of real code: see [Worked examples](/entinygram/docs/examples).

The [SDK plugin](https://github.com/entinyGram/plugins/tree/main/plugins/entiny-sdk/src) is in `plugins/entiny-sdk/src`:

| File | Contents |
| --- | --- |
| [`index.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/index.ts) | the Marketplace pages: Home, Plugins, Settings, the plugin page, install |
| [`channel.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/channel.ts) | reading a Telegram channel as a catalog, and the post parser |
| [`sources.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/sources.ts) | the list of sources and what is stored about them |
| [`catalog.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/catalog.ts) | the catalog types, and how a channel file is addressed |
| [`navbar.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/navbar.ts) | the native bottom bar |
| [`embed/engine.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/embed/engine.ts) | the engine that draws other plugins' rows into the app's screens |
| [`icons`](https://github.com/entinyGram/plugins/tree/main/plugins/entiny-sdk/src/icons) | the tab icons, plain SVG files |
| [`i18n.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/i18n.ts) | the texts, in English, Ukrainian and Russian |

### The catalog and the scripts

| Path | Contents |
| --- | --- |
| [`index.json`](https://github.com/entinyGram/plugins/blob/main/index.json) | the catalog the Marketplace reads for official plugins |
| [`plugins/dist`](https://github.com/entinyGram/plugins/tree/main/plugins/dist) | every published version of every official plugin, never changed once published |
| [`user-plugins`](https://github.com/entinyGram/plugins/tree/main/user-plugins) | the second GitHub catalog, for community bundles |
| [`scripts/build-plugin-index.ts`](https://github.com/entinyGram/plugins/blob/main/scripts/build-plugin-index.ts) | builds the plugins, hashes them and refreshes the catalog |
| [`scripts/build-user-index.ts`](https://github.com/entinyGram/plugins/blob/main/scripts/build-user-index.ts) | the same for community bundles |
| [`scripts/pack-release.ts`](https://github.com/entinyGram/plugins/blob/main/scripts/pack-release.ts) | packs named release files |
| [`scripts/generate-slots.ts`](https://github.com/entinyGram/plugins/blob/main/scripts/generate-slots.ts) | regenerates the slot list from the app's strings |

## The client

The plugin host inside the app is Kotlin, in [`src/fork`](https://github.com/entaytion/entinyGram/tree/main/src/fork) of the client repository. Read it when you want to know what happens on the other side of a call.

| Path | Contents |
| --- | --- |
| [`helpers/plugins`](https://github.com/entaytion/entinyGram/tree/main/src/fork/helpers/plugins) | the host: loading, permissions, sessions, the Telegram and JVM bridges, icons and UI |
| [`helpers/plugins/PluginManager.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/PluginManager.kt) | installing, enabling, updating and the dependency checks |
| [`helpers/plugins/PluginImportHelper.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/PluginImportHelper.kt) | the import and permission sheet |
| [`helpers/plugins/ui/PluginUi.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/ui/PluginUi.kt) | how declarative pages become native screens |
| [`helpers/entiny/EntinyMarketBridge.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/entiny/EntinyMarketBridge.kt) | the small bridge the Marketplace uses to list and install plugins |
| [`ui/settings/PluginsActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginsActivity.kt) | the plugin list in the settings |
| [`ui/settings/PluginSettingsActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginSettingsActivity.kt) | the generic host of a plugin's settings page |

The user facing list of what entinyGram adds is [`FEATURES.md`](https://github.com/entaytion/entinyGram/blob/main/FEATURES.md).

## Inugram upstream

The plugin engine, the `inu` API and the command line tool were written in [Inugram](https://github.com/teidesu/inugram). Its [`sdk`](https://github.com/teidesu/inugram/tree/main/sdk) folder holds the same three parts you saw above: [`cli`](https://github.com/teidesu/inugram/tree/main/sdk/cli), [`docs`](https://github.com/teidesu/inugram/tree/main/sdk/docs) and [`types`](https://github.com/teidesu/inugram/tree/main/sdk/types).

> [!NOTE]
> These pages are built on the Inugram plugin documentation, with entinyGram's additions: the SDK, the Marketplace, the channel catalog and publishing. Credit for the engine and the original guides goes to the Inugram authors.

## Finding what to hook

When you hook the app, you need the name of a class and a method. The app is Telegram for Android with a patchset, so almost every class has the stock name:

1. Read the original source: [DrKLO/Telegram](https://github.com/DrKLO/Telegram). The classes you will see most are `AndroidUtilities`, `LocaleController`, `MessagesController`, `ChatActivity`, `DialogCell` and `ChatMessageCell`.
2. For the entinyGram and Inugram classes, such as `desu.inugram.InuConfig`, read the client repository above.
3. To see the exact names and signatures in the build you target, decompile the APK with [jadx](https://github.com/skylot/jadx).
4. Hook a method with its descriptor, such as `formapMapUrl(IDDIIZII)Ljava/lang/String;`, so the right overload is chosen. See [Method hooks](/entinygram/docs/xposed).

## Other references

- [mtcute](https://mtcute.dev): the TL and message API of plugins follows its model, and its [parse modes guide](https://mtcute.dev/guide/topics/parse-modes.html) applies to `md` and `html`.
- [QuickJS](https://bellard.org/quickjs/): the JavaScript engine plugins run in.
- [esbuild](https://esbuild.github.io/): the bundler the CLI uses.
- [Telegram API methods](https://core.telegram.org/methods): what `invokeRpc` can call.
- The plugins channel, [@entinyGramPlugins](https://t.me/entinyGramPlugins), and the community chat, [@entinyGramChat](https://t.me/entinyGramChat).
