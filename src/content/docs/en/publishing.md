# Publishing a plugin

Anyone can send a plugin to the entinyGram catalog. You send the file to a bot, it is reviewed by hand, and once approved it is published in the **@entinyGramPlugins** channel and appears in the Marketplace of every user.

This page covers the rules, the whole flow, how updates work, what the published post looks like, and what to do before you send.

## The short version

1. Build your plugin and test a real install of the file.
2. Open **@entinyGramBot** and send the `.inu.js` file. Add a short caption if you like.
3. The bot checks the file and passes it to review.
4. You get a message with the decision: published (with a link), rejected (with a reason), or changes requested.

## Rules

We read every plugin before it goes out, and these are the conditions:

- **Open source.** The code must be readable. Publish the source of your plugin, or at least make sure the file you send is the human readable source and not a compiled blob.
- **No obfuscation, no minification.** A plugin that cannot be audited does not go into the catalog. Keep `minify` off.
- **An honest description.** Say what the plugin does, and say why it needs any sensitive permission.
- **Permissions that match the purpose.** A plugin should ask for the narrowest grants that do the job. A wallpaper plugin that wants `account.write` will be questioned.
- **No surprises.** A plugin must not do things it does not say it does, and must not collect or send user data in secret.
- **It is yours, or you have permission.** Do not send someone else's work as your own. If you adapt an existing plugin, say whose it is.

These rules exist because plugins run inside people's Telegram apps. The catalog is only worth something if people can trust it.

## Before you send

Run through this list:

- [ ] The manifest has `id`, `name`, `author`, `version` and a clear `description`. See [Project and manifest](/entinygram/docs/project).
- [ ] The id is lowercase letters, digits, dots, dashes or underscores, 3 to 64 characters, and does not start with `entinygram.` (that prefix is kept for the project's own plugins).
- [ ] The version is higher than any version of this plugin that was already published.
- [ ] The grants are the narrowest that work. Run `inu check`.
- [ ] The file is under 15 MB.
- [ ] You tested a real install of the built file, not only a push from developer mode, so you saw the permission sheet users will see.
- [ ] If the plugin needs the SDK, it uses `withEntiny`, which adds the requirement for you.
- [ ] The build is not minified.

## The flow in detail

### 1. Send the file

Open [@entinyGramBot](https://t.me/entinyGramBot) in Telegram and send the plugin as a file. The file name must end in `.inu.js`. Send `/start` first if you want the instructions in your language.

A caption on the file is kept as the **notes** of this version, a short text about what the plugin does or what changed. Short bullet lines work best:

```text
- adds a switch for formatting
- fixes a crash on old Android versions
```

### 2. Automatic checks

The bot reads the manifest from the file's header and checks it. It rejects a file straight away, with the reason, when:

- there is no manifest block, or no `@id` or `@version`;
- the file is over 15 MB;
- the id is not in the allowed shape, or starts with `entinygram.`;
- the id already belongs to another author;
- the version is not higher than the latest published one;
- you have sent more than five plugins within the last hour.

Otherwise it replies that the plugin was received.

### 3. Review

Every plugin is reviewed by hand. The reviewer sees a card with the name, version, description, notes, grants and size, and can see at a glance whether the plugin asks for unsafe permissions. They can edit the name, version, author, description, notes and link, rewrite the notes, and then publish, reject, or ask you for changes.

### 4. The decision

You get one of three messages:

- **Published**, with a link to the post in the channel.
- **Rejected**, with the reason.
- **Changes requested**, with what to fix. Fix it, raise the version if needed, and send the file again.

## Updating your plugin

Send the new file to the bot the same way. The id must be the same, the version must be higher, and the sender must be the same person who published it first. The first person to publish an id owns it: nobody else can publish a plugin with that id.

Updates are reviewed like new plugins, and the notes you write become the notes of the new version. Users of the Marketplace see the update on the Home tab and in the plugin's version history.

> [!TIP]
> Always raise `@version` for any change, even a small fix. A published version is never replaced, so the same version cannot be sent twice.

## What the post looks like

The bot publishes each version as a file with a caption in the channel:

```text
🧩 Plugin name — 1.2.0
author: @you

- what changed in this version

‼️ does not work without entinyGramSDK (download)

💡 Suggest a plugin
```

- The title line has the name and the version.
- The author line shows your name. For plugins from the community it is the author's name, so everyone is credited.
- The notes come from your caption, or from the description if there is none.
- If your plugin requires the SDK, a line with a link to download it is added.
- A link to the source repository is shown for the project's own plugins.
- A footer invites the next person to suggest a plugin.
- Hidden in the post, an invisible link carries the facts the app reads: the id, the permissions, the size and the requirements. You never see it, and it is how the Marketplace lists the plugin properly. See [The Marketplace](/entinygram/docs/marketplace#for-plugin-authors-how-your-plugin-shows-up).

## After it is published

- The plugin appears in the Marketplace, in the section of the plugins channel. The channel posts are read directly through each user's own Telegram account, so there is no server to wait for.
- You can share the post link. Anyone with the app can install it from the Marketplace.
- Questions, bug reports and ideas are welcome in the community chat, [@entinyGramChat](https://t.me/entinyGramChat).

## Running your own channel

Anyone can run a plugin channel in the same format and let users add it as a source in the Marketplace (**Settings → Sources → Add a channel**). The format is described in [The Marketplace](/entinygram/docs/marketplace#for-plugin-authors-how-your-plugin-shows-up). The Marketplace shows a warning when a user adds a channel that entinyGram does not vet, and asks for confirmation before installing from it, so be especially careful about what you publish.

## Plugins from other sources

Besides plugins that people send, the catalog will also include good public plugins from other places. Such plugins are always published with their author credited, and the same rules apply: open source, readable, honest. If you see a plugin that deserves a place, send it to the bot and say where it is from.

## Tags

Plugins will get tags, such as `#privacy`, `#chat`, `#media`, `#ui` or `#tools`, so people can find what they need and sort the catalog. Tags are chosen for you, and the reviewer can change them. This part is coming soon.

## Where the files live

You do not need to host anything. The channel stores the file and delivers it, the Marketplace reads the channel, and the app imports the file with the usual install sheet, so the user always sees the permissions before the plugin is installed.

## If something goes wrong

| Problem | What to do |
| --- | --- |
| The bot does not answer | Send `/start` to check it is awake, then try the file again |
| "No manifest block" | The file must contain the `// ==InuPlugin==` header. Build with the CLI |
| "Invalid id" | Use lowercase letters, digits, dots, dashes and underscores, 3 to 64 characters |
| "The prefix is reserved" | Do not start the id with `entinygram.` |
| "Belongs to another author" | Pick another id: the one you chose was published by someone else |
| "Version is not newer" | Raise `@version` above the published one |
| "Too many submissions" | Wait an hour and send again |
| It was rejected | Read the reason, fix it, raise the version and send again |

## Source and further reading

- [@entinyGramPlugins](https://t.me/entinyGramPlugins): the channel, with real posts to look at
- [@entinyGramBot](https://t.me/entinyGramBot): where you send plugins
- [The Marketplace](/entinygram/docs/marketplace): the post format and how plugins are listed
- [Worked examples](/entinygram/docs/examples): a minimal plugin to try the flow with
- [`plugins`](https://github.com/entinyGram/plugins/tree/main/plugins): the official plugins, as models of how a plugin should look
