# Best practices

Habits that make a plugin fast, safe and pleasant to maintain, and answers to the problems people run into most.

## Keep the plugin small and focused

- **One plugin, one job.** Several small plugins are easier to audit, easier to explain, and lighter on the app than one big plugin with a lot of switches.
- **Split the code, not the idea.** Inside a plugin, put the settings, the texts and the logic in separate files. The CLI bundles them anyway.
- **Say what it does.** The description is the first thing a user reads. One clear sentence beats a clever name.

## Ask for as little as possible

- Use scoped grants: `fetch(api.example.com)`, `account.read(messages)`, `interceptRpc(messages.getHistory)`.
- Prefer a safe API to `unsafe.jvm`. Reach for hooks only when nothing else can do the job.
- Remove a grant in the same update that removes the code that needed it.
- Run `inu check` before every release. It reports unknown grant names and bad scopes.
- If you need a sensitive grant, say why in the description.

## Be a good guest on the shared thread

All plugins share one thread. A slow plugin delays every other plugin.

- Keep every callback short. A turn that runs for more than two seconds disables the plugin.
- Split long work with `await` or a timer so control returns to the engine.
- Do cheap work at the top level, and do heavy work later, in a callback.
- Never do slow work inside an interceptor or a hook. The app waits for it.
- Read only the fields of a live object you need. Spreading or cloning reads all of them.

## Make hooks cheap and resilient

If your plugin uses `unsafe.jvm` and `unsafe.xposed`:

- **Use routines for hot paths and privacy.** A routine runs in Java and never waits for the JavaScript engine. A JavaScript hook on drawing or list code makes the app stutter.
- **Filter in Java.** Combine a routine `filter` with a JavaScript body so JavaScript runs only on the calls you care about.
- **Register each hook on its own and catch errors.** A method that is missing in one app build should switch off one hook, not the plugin.
- **Share state through Java objects.** A captured `AtomicBoolean` lets a settings switch control a routine without crossing into JavaScript.
- **Hook with descriptors.** `'formapMapUrl(IDDIIZII)Ljava/lang/String;'` picks one overload exactly.
- **Expect the app to change.** Class and method names move between Telegram versions. Keep hook code small and isolated so a fix is quick.

## Handle errors properly

- Attach `.catch` to every promise you do not `await`. An unhandled rejection crashes the plugin.
- Check `error instanceof inu.RpcError` where a Telegram call can fail for a normal reason, such as a flood wait.
- Treat `not-granted` as a bug in your manifest, not something to catch.
- Wrap Java calls in `try`/`catch`. A Java exception reaches you as a plain `Error`.

## Clean up after yourself

- Every `inu.*` registration returns a disposer. Use it when the thing is no longer needed.
- Dispose blobs and canvases you are done with. Use `using` where you can.
- Register `inu.onUnload` if you hold things the engine does not know about, such as many Java handles.

## Design the settings page well

- Put what people change often at the top and explanations in footers.
- Give rows stable ids when rows appear and disappear.
- Remember that controls are controlled: store the new value in `onChange`, or the control flips back.
- Use `danger` only for actions that delete or reset something.
- Keep `items()` fast and free of I/O. It runs on every interaction.
- Support more than one language. Read the app's language and pick your strings. Many of the project's plugins keep their texts in a small `i18n` module with English, Ukrainian and Russian.

## Store data sensibly

| Data | Where |
| --- | --- |
| a few settings | `localStorage` (1 MB) |
| caches and files | `inu.fs` (50 MB by default, a scope raises it) |
| temporary big data | a `Blob`, disposed when done |

Remember that `localStorage` and the private folder survive updates, so a new version must read the old format or migrate it.

## Respect the network

- Scope `fetch` to the hosts you use. A bare `fetch` can reach anywhere.
- Set a `timeout`, and handle failure: the network is not reliable.
- Remember that `fetch` ignores the app's proxy. A plugin can reveal the user's real address, so do not call hosts you do not need.
- Do not poll in the background more than you have to. Timers are throttled when the app is not visible.

## Test like a user

- Use `inu dev` for fast iteration, `inu eval` to poke at a running plugin, and `inu push` for one-off checks.
- Test a **real install** of the built file at least once. Developer mode skips the permission sheet, so only a real install shows you what users see.
- Test on more than one device or Android version if you hook the app.
- Test with the plugin turned off and on, and after an update. State should survive, and nothing should crash.
- Test with several accounts if your plugin touches Telegram data.

## Check the environment before you rely on it

`inu.info()` tells you where the plugin is running:

```ts
const info = inu.info()
console.log(info.platform, info.appVersion, info.appBuild, info.apiVersion, info.layer, info.language)
```

It returns the platform, the app version and build, the plugin API level, the Telegram API layer, the app language and the plugin's own parsed header (`info.header`). Use it to choose a code path, to pick strings in the user's language, and to skip features the current build does not have.

## Work with Inugram and entinyGram

- A plugin written for one runs on the other. Do not rely on entinyGram-only things without a fallback.
- Use `withEntiny` for settings placement. It still installs on plain Inugram, where only the placement is skipped.
- If the SDK bridge is missing, your plugin should keep working on its own page.
- Guard anything experimental. APIs marked `@experimental` can change between releases.

## Publishing well

- Raise the version for every change, and write short, honest notes.
- Keep the plugin id stable forever.
- Do not minify or obfuscate. Readable code is a condition for the catalog.
- Tell users what the plugin does and why it needs each sensitive permission.

## Common problems

| Symptom | Likely cause and fix |
| --- | --- |
| `not-granted` | a grant is missing. The error's `grant` field holds the exact token to add |
| The plugin disappears after a moment, "plugin crashed" | an unhandled rejection or a turn over two seconds. Read the log in `inu dev` |
| The page does not update after a change | call `page.invalidate()` when state changes from outside the page |
| A switch flips back after a tap | `onChange` did not store the new value |
| `handle-expired` | you kept a live view, a context or a disposed blob. Copy what you need inside the call |
| A hook does nothing on one phone | that device or Android version may not support hooks, or a method name differs. Hooks throw `unsupported` and should be optional |
| `inu dev` says the app is not running | open the app first, and check that plugins are enabled and not in safe mode |
| `inu dev` cannot find the phone | check `adb devices`, USB debugging, and the `-s` flag when several devices are connected |
| A routine does not compile | read the build message. Most often it is a callback, a bare function call or a captured variable that changes |
| The Marketplace shows nothing for a channel | the posts are not in the expected format, or the channel is empty. See [The Marketplace](/entinygram/docs/marketplace) |
| `fetch` fails with a grant error | add `fetch(host)` for that host, including hosts a redirect leads to |

## Ask for help

Bug reports, questions and ideas go to the community chat, [@entinyGramChat](https://t.me/entinyGramChat). When you ask, include the plugin's log, the grants it uses, your app version and the device. For crashes, add the crash log.

## Source and further reading

- [Worked examples](/entinygram/docs/examples): the patterns above in real code
- [API reference](/entinygram/docs/api-reference): find the call you need
- [`sdk/types`](https://github.com/entinyGram/plugins/tree/main/sdk/types): the typings, with `@needs-grant` and `@experimental` on every call
- [Source map](/entinygram/docs/source-map): where to read more
