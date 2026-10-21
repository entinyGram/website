# Plugin repositories

Users find, install and update plugins from **repositories**. A repository is a Telegram channel where plugin files are posted, and the app reads it directly through the user's own account, with no server in between. It is part of the app, not of a plugin: **Settings → Plugins → Repositories**.

This page explains how it works from the user's side and from the plugin author's side: what a repository is, what the screens show, how installing and updating work, and what a post has to contain to be listed.

## What a repository is

A repository is a public Telegram channel. Each post that carries an `.inu.js` file is one release of one plugin. The app reads the manifest from the header of the file (the first few kilobytes), so nothing else has to be written in the post, and keeps what it read in a cache. Posts that are not plugins are ignored, so a channel can mix plugins with other content.

Posts of the same plugin id are grouped: the newest runnable post is the plugin, and the older ones are its version history.

### The built-in repository

**@entinyGramPlugins** is built in. It is always the first repository, it cannot be removed, and the app adds it again if it is ever missing. You do not have to subscribe to the channel to use it.

### Adding your own

Open **Repositories → Add repository** and enter `@channel` or a `t.me` link. The channel has to be a public channel. A repository you add can be removed with **Remove** on its card.

> [!WARNING]
> Plugins run inside your Telegram app, next to your account. Add only channels you trust, and read the permissions before you install anything.

## The screens

### Repositories

One card per repository, with its avatar, name, `@username` and description, plus **Open channel**. The official repository carries an **Official** mark. At the top, **Updates** lists installed plugins that have a newer post in the repository they were installed from, and a line says when nothing is outdated.

### A repository

Tap a card to see its plugins. Each row shows the plugin's icon, a pill with its version, its name, the author, a short description and, on the right, its state: nothing, **Installed** or **Update**.

In the official repository the plugins are split into two sections, **Plugins by the developer** (the entinyGram plugins) and **Plugins from others**. A **Sort** row at the top orders them by newest first, by name or by author. Any other repository shows a single list.

### A plugin

Tapping a row opens the plugin's page:

- **About the plugin**: the icon, the version, the name and the repository, then the description, the author, the source repository, the plugin id (tap to copy) and the requirements;
- **Installation**: **Install** or **Update**, with the date of the post, or **Installed** when it is up to date;
- **Permissions**: each grant with its level, unsafe ones marked;
- **Version history**: every version with its date. Tap one to install it, or to open it if it is already installed.

## Installing and updating

The app downloads the file through your Telegram account and opens the usual install sheet with the plugin's permissions, so you always see them before anything is installed. A plugin installed from a repository remembers it, and only that repository can update it: an update is a newer post of the same plugin id.

### Requirements

If a plugin needs another plugin, it says so with a `@requires` line. When the missing plugin is the entinyGram SDK and the same repository has it, the app installs the SDK first and then continues with your plugin. Any other missing requirement stops the install with a message that names it.

## For plugin authors: how your plugin shows up

Post the built `.inu.js` file in the channel. That is all the app needs. These lines of the header are read and shown:

| Header line | Shown as |
| --- | --- |
| `@name` | the name of the plugin |
| `@id` | which plugin a post belongs to, for grouping and updates; an id that starts with `entinygram.` puts the plugin in the developer's section |
| `@version` | the version pill, and what decides that a post is newer |
| `@author` | the author line; an author named entinyGram also puts the plugin in the developer's section |
| `@description` and `@description:<lang>` | the description, in the user's language when you provide it |
| `@icon` | the plugin's icon |
| `@grant` | the permissions on the plugin page |
| `@requires` | the requirements |
| `@plugin-api`, `@platform` | whether the plugin can run in this app |

A plugin whose `@plugin-api` or `@platform` does not fit the app is not offered. Keep the id the same for the whole life of the plugin, so users get an update and not a second copy.

If you want the entinyGram channel to carry your plugin, send it through the bot. See [Publishing](/entinygram/docs/publishing).

## Tips for authors

- Write a short, honest description. It is the first thing a user reads.
- Ask for the fewest permissions you can. A plugin with no unsafe grants is much easier to trust.
- Say why you need each sensitive permission in the description.
- Bump `@version` on every post and keep the notes in the caption.
- Keep the plugin id the same for the whole life of the plugin.

## Source and further reading

- [`PluginRepos.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/PluginRepos.kt): reading a channel, caching headers, finding updates
- [`PluginReposActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginReposActivity.kt) and [`PluginRepoActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginRepoActivity.kt): the repository screens
- [`PluginRepoPluginActivity.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/ui/settings/PluginRepoPluginActivity.kt): the plugin page
- [`PluginDefaultRepo.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/PluginDefaultRepo.kt): the built-in repository
