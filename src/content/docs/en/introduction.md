# Introduction

A plugin is one JavaScript file that adds something to the Telegram app on your phone. It can put a page into the settings, add a button to the chat menu, change how dates look, draw a map preview from another provider, translate text through a service of your choice, or hook into the app itself and change how a screen behaves.

This documentation covers everything a plugin author needs: how plugins run, what the API gives you, how permissions work, how to ship a plugin to other people, and what the entinyGram SDK adds on top of the base plugin system.

## What a plugin is

A plugin is a single `.inu.js` file: ordinary JavaScript with a small comment block at the top that describes it.

```js
// ==InuPlugin==
// @name         Hello
// @id           com.example.hello
// @author       @you
// @version      1.0.0
// @description  Says hello from a settings page
// @plugin-api   1
// @platform     android
// ==/InuPlugin==

inu.ui.toast('Hello from a plugin')
```

You can write that file by hand, but you almost never will. The command line tool `inu` turns a TypeScript project into this file, checks it, and can push it straight to your phone while you work.

## How a plugin runs

- **One engine per plugin.** Every plugin runs inside its own [QuickJS](https://bellard.org/quickjs/) engine with its own globals. Plugins cannot see each other.
- **One shared thread.** All engines run on a single dedicated thread, one JavaScript turn at a time. It is never the Android UI thread, so a slow plugin does not freeze the app. It does delay other plugins, so keep every turn short.
- **A single global called `inu`.** Everything the app gives you hangs off it: `inu.ui` for screens, `inu.account()` for Telegram, `inu.jvm` for Java access and so on. The engine also provides a small web-shaped standard library: `fetch`, timers, `localStorage`, `Blob`, `TextEncoder`.
- **No modules at runtime.** The bundle runs as a classic script. You write modules in your project, and the CLI bundles them into the one file.

[Read how the engine works](/entinygram/docs/engine) for the details, limits and lifecycle.

## What a plugin can do

| Area | Examples |
| --- | --- |
| Interface | Settings pages with switches, sliders, pickers and buttons. Items in the chat, profile, message and global menus. Dialogs, toasts and bulletins. Custom icons. |
| Telegram | Read chats, history and messages. Send, edit, forward, react. Call any API method. Watch updates and new messages. |
| Interception | Rewrite or drop outgoing messages, requests and incoming updates before the app sees them. |
| Network and files | HTTP requests to hosts you declared, a private folder, local storage, the clipboard. |
| Graphics | Draw images, stickers and video on an offscreen canvas. |
| The app itself | Call any Java class and hook any method of the app, with the same freedom as an Xposed module. |

Each of these needs a **grant**, a permission the plugin declares in its header. A plugin gets exactly what it asked for and nothing else.

## Permissions first

Plugins run inside your Telegram app, next to your messages and your account, so the plugin system is built around permissions:

- Every plugin lists its grants in its header. Users see the list before they install the plugin.
- A call your grants do not cover fails with `not-granted`. There is no runtime prompt and no way to ask for more later. A plugin that wants more must ship an update that the user approves again.
- Some grants are marked **unsafe**. They give full access to the app (`unsafe.jvm`, `unsafe.xposed`) or to every file (`unsafe.fs`). The Marketplace marks them with a warning.
- Calls that could take over an account, like logging in or changing the two-step password, are filtered out unless a plugin explicitly lifts the filter.

[Read the grants reference](/entinygram/docs/grants).

## Inugram and entinyGram

The plugin engine, the `inu` API and the `inu` command line tool come from **Inugram**, the project entinyGram is built on. A plugin written for one runs on the other, because the plugin API is the same (`@plugin-api 1`).

entinyGram adds a layer on top:

- **The entinyGram SDK plugin** (`entinygram.sdk`) gives the app a Marketplace with sources, catalogs and permissions, and lets other plugins place their settings directly into the app's own screens.
- **The `@entiny/sdk` package** is what a plugin imports to ask for that placement: `withEntiny`, the `embed` function and the typed list of places a setting can go.
- **A plugin channel and a submission bot**, so anyone can send a plugin for review and have it published.

Everything entinyGram-specific is optional. A plugin that does not use `@entiny/sdk` is a plain Inugram plugin. One that does still installs on plain Inugram, where only the extra placement is skipped. See [the entinyGram SDK](/entinygram/docs/entiny-sdk).

## Stability

> [!WARNING]
> Plugins are experimental as a whole. Treat the system as a developer preview: bugs, crashes and even exploits are possible. Do not rely on a plugin for anything mission critical.

- APIs marked `@experimental` in the typings may change or disappear between releases. Release notes call such changes out. Use them anyway if you need them, but expect to update the plugin.
- `@plugin-api` is bumped only for major breaking changes. New methods and options do not bump it, so check that a method exists before you use a newer one. Apps support only the latest plugin API.
- Telegram itself is not frozen. Java classes and methods can change with an upstream update, and so can the TL schema. A plugin that hooks app internals is the most likely to break.

## How these docs are organized

**Getting started** shows you how to create a project and push a plugin to your phone, and explains the project layout and manifest.

**Core concepts** is the day to day API: the [engine](/entinygram/docs/engine), [grants](/entinygram/docs/grants), [UI](/entinygram/docs/ui), the [Telegram API](/entinygram/docs/telegram), [interception](/entinygram/docs/interception), [network and storage](/entinygram/docs/io) and [canvas](/entinygram/docs/canvas).

**Low level** covers the unsafe tools: [JVM reflection](/entinygram/docs/jvm), [method hooks](/entinygram/docs/xposed) and [routines](/entinygram/docs/routines). Read these only when the safe API cannot do what you want.

**entinyGram SDK** explains [the SDK](/entinygram/docs/entiny-sdk) and [the Marketplace](/entinygram/docs/marketplace).

**Publishing** walks you through [sending a plugin to the catalog](/entinygram/docs/publishing) and ends with [best practices](/entinygram/docs/best-practices).

These pages explain concepts and reasons. For exact signatures, read the typings that ship in the `@inugram/plugin-types` package: every method is documented there, and the permission a method needs is written on it as a `@needs-grant` tag.

## Words you will meet

| Word | Meaning |
| --- | --- |
| Plugin | One `.inu.js` file, identified by its `@id`. |
| Manifest | The description of a plugin: name, id, author, version, grants. In the file it is the header comment. |
| Grant | A permission the plugin declares, such as `fetch(api.example.com)` or `account.read(messages)`. |
| Engine | The QuickJS instance that runs one plugin. |
| Handle | A JavaScript object that stands for a live Java object. |
| TL object | A Telegram API object, such as a message or a user. |
| Routine | A small function compiled to run in Java without entering the JavaScript engine. |
| SDK plugin | `entinygram.sdk`, the plugin that provides the Marketplace and the settings placement. |
| Source | A place the Marketplace reads plugins from: a catalog on GitHub or a Telegram channel. |

## Source and further reading

- [`sdk/types`](https://github.com/entinyGram/plugins/tree/main/sdk/types): the typings, where every call is documented
- [`sdk/docs`](https://github.com/entinyGram/plugins/tree/main/sdk/docs): the original Inugram guides this documentation builds on
- [Inugram upstream](https://github.com/teidesu/inugram/tree/main/sdk): the engine, the CLI and the typings where it all started
- [Worked examples](/entinygram/docs/examples): real plugins, explained
- [API reference](/entinygram/docs/api-reference): a map of every call
- [Source map](/entinygram/docs/source-map): where each piece of code lives
