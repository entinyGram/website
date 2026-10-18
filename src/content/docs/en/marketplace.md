# The Marketplace

The Marketplace is where users find, install and update plugins. It is a page of the entinyGram SDK plugin, so it needs `entinygram.sdk` installed and works inside the app: **Settings → Plugins → Marketplace**.

This page explains how it works from the user's side and from the plugin author's side: what the tabs show, where plugins come from, how installing and permissions work, and what a catalog or a channel has to look like to be listed.

## The three tabs

A bar at the bottom of the screen switches between three sections.

### Home

A quick look at what matters now:

- a summary line: how many plugins are in the catalog, how many you have installed, and how many have updates;
- **Updates**: installed plugins that have a newer version;
- **New in the catalog**: the newest plugins you do not have yet;
- **Recently updated**: plugins that were published or updated lately.

### Plugins

The catalog. It has a search box and a filter (all, installed, updates), then sections:

- **Installed** is one section for everything you have, whichever source it came from, with plugins that have updates first.
- Below it, **every source gets a section of its own** with the plugins you do not have yet.
- A long section shows the first five rows. **Show all** opens the full list on a screen of its own.

A row shows the plugin's name, its author, a short description and its latest version on the right. A warning sign before the version means the plugin asks for unsafe permissions. Tap a row to open the plugin's page.

### Settings

A short menu, with each part on its own screen:

- **Installed plugins**: everything you have, with its version and whether it is off.
- **Sources**: switch sources on and off, and add a channel.
- **Plugin entries**: plugins that add their own sections to the app's settings, with a button that opens each one.
- **About the SDK**: the SDK version, and a link to the plugins channel.

## Sources

A **source** is a place the Marketplace reads plugins from. There are two kinds.

| Source | Comes from | Notes |
| --- | --- | --- |
| entinyGram | a catalog on GitHub | the project's own plugins |
| User repository | a second catalog on GitHub | community plugins shipped as ready bundles |
| a Telegram channel | the channel's posts | read through your own Telegram account |

The project's channel, **@entinyGramPlugins**, is a built-in source. You can switch any source off, and you can add more channels.

### Adding a channel

Open **Settings → Sources → Add a channel** and enter `@channel` or a `t.me` link. The SDK warns that the channel is not vetted by entinyGram, loads it, and adds it only if it finds at least one plugin in the expected format. A channel you added shows up as its own section on the Plugins tab. Long-press an added channel to remove it.

> [!WARNING]
> Plugins run inside your Telegram app, next to your account. Add only channels you trust, and read the permissions before you install anything.

### The same plugin in two sources

If two sources carry the same plugin id, it is listed once, from the source that comes first: the order is entinyGram, user repository, then channels.

## Installing

Tap a plugin, then **Install** (or **Update**). What happens depends on the source:

- **From a GitHub catalog**: the app downloads the file, checks its SHA-256 against the catalog, and opens the usual install sheet with the plugin's permissions.
- **From a channel**: your Telegram account downloads the file from the post. For a channel that entinyGram does not vet, a dialog lists the permissions the plugin asks for, with unsafe ones marked, and asks you to confirm. After that the usual install sheet opens.

Updates work the same way. A plugin's page lists every published version with its notes, so you can also install an older one.

### The plugin page

The page of a plugin has:

- an **About** block: description, author, the source, the plugin id (tap to copy), the requirements, the size;
- **Permissions**, for plugins from a channel: each grant with a short explanation, and unsafe ones marked;
- **Installation**: install or update, and remove;
- **Version history**: every version with its date and notes.

### Requirements

If a plugin needs another plugin, for example the SDK, the page says so and tells you what is missing. The app refuses to install a plugin whose requirements are not met.

## Standalone mode (plain Inugram)

In plain Inugram there is no install bridge, so the SDK cannot install plugins itself. It still browses the catalogs. When you tap install, it copies the download link to the clipboard, shows the file's SHA-256, and tells you to save the file and load it from **Settings → Plugins → Load from file**. Channel plugins cannot be installed this way.

## For plugin authors: how your plugin shows up

### From a Telegram channel

A channel is read as a catalog. For each post the SDK needs:

1. a **document** that is an `.inu.js` file;
2. a **caption** in this shape:

   ```text
   🧩 Plugin name — 1.2.0
   author: @you

   - what changed in this version
   - another change

   ‼️ does not work without entinyGramSDK (download)
   ```

   The first line is the name and the version, separated by a dash. The line that starts with `author:` gives the author. Everything up to the next marker line is the description and the notes: the first line is used as the short description, and the whole block as the notes of that version. A line that starts with `‼️`, `📦` or `💡` ends the notes.

3. the **plugin facts** (the id, the plugin API, the permissions, the size and the requirements), in an invisible link at the very start of the caption. The link points at the channel with a `?entiny=` query that holds a small piece of JSON, URL encoded:

   ```json
   { "id": "com.example.hello", "api": "1", "g": ["jvm", "fetch"], "r": ["entinygram.sdk >=0.1.0-alpha"], "s": "12.0 KB" }
   ```

   `g` is the list of permissions by their last word (`unsafe.jvm` is written `jvm`), `r` the requirements, `s` the size. The link text is a single zero-width character, so nothing shows in the post.

Older posts carried the same facts in a visible last line instead, such as `meta: com.example.hello · api 1 · jvm, xposed · 12.0 KB · needs entinygram.sdk >=0.1.0-alpha`. The SDK still understands it. Posts that have neither are skipped, so a channel can mix plugins with other posts.

When a caption is too long for one message, the text goes first and the document comes right after it. The SDK pairs them when the document is within the next three messages.

Each post is one version of one plugin. Posts of the same id are merged into one plugin with a version history, newest first.

**You do not have to write this by hand.** If you publish through the project's bot, it builds the post for you. See [Publishing](/entinygram/docs/publishing). The format matters only if you run your own channel and want users to add it as a source.

### From a GitHub catalog

The two built-in GitHub sources read an `index.json` file:

```json
{
  "version": 1,
  "plugins": [
    {
      "id": "com.example.hello",
      "name": "Hello",
      "author": "you",
      "description": "Says hello",
      "icon": "plugins/hello/icon.svg",
      "versions": [
        {
          "version": "1.0.0",
          "date": "2026-10-07",
          "notes": "- first release",
          "file": "plugins/dist/com.example.hello/1.0.0.inu.js",
          "sha256": "cbe1828e…",
          "requires": ["entinygram.sdk >=0.1.0-alpha"],
          "pluginApi": 1
        }
      ]
    }
  ]
}
```

Relative `file` and `icon` paths are resolved against the folder that holds the index. A version is published once: its file never changes, so older versions stay installable, and the app checks the file against `sha256`. Users cannot add their own catalog URLs: custom sources are Telegram channels.

## Tips for authors

- Write a short, honest description. It is the first thing a user reads.
- Ask for the fewest permissions you can. A plugin with no unsafe grants is much easier to trust.
- Say why you need each sensitive permission in the description.
- Put useful notes on every version. They show in the version history and in update lists.
- Keep the plugin id the same for the whole life of the plugin, so users get updates instead of a second copy.

## Source and further reading

- [`plugins/entiny-sdk/src/index.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/index.ts): the three tabs, the plugin page and installing
- [`plugins/entiny-sdk/src/channel.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/channel.ts): reading a channel and the post parser
- [`plugins/entiny-sdk/src/sources.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/sources.ts): the sources
- [`plugins/entiny-sdk/src/navbar.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/entiny-sdk/src/navbar.ts): the bottom bar
- [`scripts/build-plugin-index.ts`](https://github.com/entinyGram/plugins/blob/main/scripts/build-plugin-index.ts): how a catalog `index.json` is made
- [`index.json`](https://github.com/entinyGram/plugins/blob/main/index.json): a real catalog
- [`EntinyMarketBridge.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/entiny/EntinyMarketBridge.kt): the install bridge
