# The engine

This page explains how a plugin is run: what an engine is, which thread your code lives on, what happens when a plugin starts, stops and crashes, which limits apply, and what is different from a browser.

## One engine per plugin

Every plugin runs in its own recent QuickJS engine with its own globals. Plugins share nothing.

Your bundle runs as a **classic script in strict mode**, not as a module. In practice:

- There is no top level `await`. Wrap asynchronous start-up work in an `async` function and call it.
- There is no `import` at runtime. The CLI bundles every import into the single file.
- Modern syntax works, including `using` declarations and `DisposableStack`.

## Threads

All plugin engines share **one dedicated thread**. Your top level code, timers, event callbacks, promise continuations and API answers all run there, one JavaScript turn at a time. It is never the Android UI thread, so a slow plugin does not freeze the app. It does delay every other plugin, so keep each turn short.

APIs that need the UI thread or the network hop there themselves and hand the result back to your thread, which is why most of them return promises.

> [!NOTE]
> Think of it like Python's GIL: the engine can run one thing at a time.

There are exceptions. A Java callback or a method hook can run on whatever thread the app happens to call it from. To run JavaScript there, that thread has to borrow your plugin's engine and wait for it to be free. The pages on [JVM reflection](/entinygram/docs/jvm), [hooks](/entinygram/docs/xposed) and [routines](/entinygram/docs/routines) explain how that works and how to avoid the wait.

## Lifecycle

### Start

Most plugins start when the app opens. Some have to start earlier, for example to process a push notification before any screen exists. If your plugin asks for one of these grants, the app runs it before it shows any UI:

- `interceptRpc`
- `interceptUpdate`
- `interceptSendMessage`
- `onUpdate`
- `unsafe.notificationCenter`

The app waits up to **500 ms** for these plugins to register before it processes updates. That wait counts against every push notification, so do cheap work at the top level and register your interceptors first.

Top level evaluation has 10 seconds. If it throws, the plugin fails to load and is disabled.

### Stop

A plugin stops when the user disables, reloads, updates or removes it, and when the engine is turned off. On stop the engine releases every listener, handler, resource and disposer the plugin registered.

You may need to clean up yourself when you hold things the engine does not know about, for example heavy use of `inu.jvm`. Register a cleanup with `inu.onUnload`:

```ts
inu.onUnload(() => {
  // release resources here
})
```

### Disposers

Every API that registers something returns a **disposer**: call it to undo the registration. Calling it twice is safe. A disposer is also a `Disposable`, so it works with `using` and `DisposableStack`:

```ts
const subscriptions = new DisposableStack()
subscriptions.use(inu.onNewMessage(message => console.log(message.text)))
subscriptions.use(inu.onAppVisibilityChange(mode => console.log(mode)))

inu.registerSettings(inu.ui.settingsPage({
  title: 'Listener',
  items: () => [
    inu.ui.button({ text: 'Stop listening', onClick: () => subscriptions.dispose() }),
  ],
}))
```

### Reloading and data

When a plugin is reloaded (updated, restarted, re-enabled) only the code runs again. Its data stays:

- `localStorage`
- the plugin's private `inu.fs` folder
- files that `inu.jvm` staged, such as a loaded DEX

Uninstalling wipes everything the plugin owned.

## Errors and crashes

A plugin that crashes is disabled by the app. The user sees the error in the plugin list and gets a "plugin crashed" notice. A plugin crashes when:

- its top level code throws,
- a callback the engine calls throws and nothing catches it,
- a promise rejects and nothing handles it,
- a turn runs out of time.

Attach a `.catch` to every promise you do not `await`:

```ts
void inu.account().sendMessage('me', 'hi').catch((error) => {
  console.warn('send failed', error)
})
```

The text goes to the plugin's log, which `inu dev` shows in your terminal.

### `inu.PluginError`

Most `inu.*` APIs throw `inu.PluginError`. It has a `code`. A wrong argument type or value is a plain `TypeError` instead.

| Code | Meaning |
| --- | --- |
| `not-granted` | the plugin is missing a grant; `error.grant` holds the exact token to add |
| `forbidden` | the resource is protected, for example by the takeover filter |
| `quota-exceeded` | a limit was hit; `usage` and `quota` are set where they apply |
| `handle-expired` | you used a disposed blob, a stale cursor or a dead view of a TL object |
| `unknown-constructor` | an unknown TL constructor |
| `not-found` | what you asked for does not exist |
| `unsupported` | the feature is not available in this app build or situation |
| `timed-out`, `aborted`, `network` | network problems |
| `internal` | a bug in the engine; please report it |

### `inu.RpcError`

When a Telegram API call fails, you get an `inu.RpcError` with the server's `code` and `text`:

```ts
try {
  await inu.invokeRpc({ _: 'help.getConfig' })
} catch (error) {
  if (error instanceof inu.RpcError) {
    console.warn(`server said ${error.code} ${error.text}`)
  } else {
    throw error
  }
}
```

### `DOMException`

APIs shaped like web APIs throw `DOMException`, matching the web. That covers `localStorage`, `fetch` and `inu.canvas`, among others. These are usually not recoverable, so there is little point in catching them.

## Limits

| Limit | Value | What happens |
| --- | --- | --- |
| One turn (a callback, a timer, a promise job) | 2 s of uninterrupted work | the plugin is disabled |
| Top level evaluation | 10 s | the plugin is disabled |
| JavaScript heap | 32 MB | the allocation throws; uncaught, it stops the plugin |
| Native memory (blobs, canvas, buffers) | 64 MB | `quota-exceeded`, and nothing is allocated |
| Items in one array passed to an API | 65536 | `TypeError` |
| Active timers | 512 | `quota-exceeded` |
| Log lines | 200 per 10 s | the rest are dropped, with one warning |

The time limit cannot be recovered from on purpose. It resets each time control returns to the engine, so long work is fine if you split it with `await` or timers. Deep recursion throws a normal, catchable `RangeError`.

Each API lists its own limits in the typings as **Limits:** notes.

## Web-like globals

The engine provides a small, web-shaped standard library. Most of it behaves as you expect. The differences:

| Global | How it differs from a browser |
| --- | --- |
| `setTimeout`, `setInterval` | a 4 ms minimum interval. In the background timers fire at most once a second, and after five minutes at most once a minute |
| `fetch` | needs the `fetch` grant. No `Request`, `FormData` or streaming bodies. Has a `timeout` option. It bypasses the app's proxy. See [Network, files and storage](/entinygram/docs/io) |
| `localStorage` | synchronous, private to the plugin, 1 MB. Has an extra `setItems` for batches |
| `Blob`, `File` | can be backed by a file on disk. Have `dispose()` to free memory early |
| `TextEncoder`, `TextDecoder` | UTF-8 only |
| `crypto` | only `getRandomValues` and `randomUUID` |
| `console` | formats like Node's `util.inspect`; `%s %d %i %f %j %o %O %c` work |

There is no `window`, `document`, `navigator`, `process`, `require` or `Buffer`. Use `globalThis`.

## Habits that keep a plugin healthy

- Keep every turn short. Other plugins wait for you.
- Do not block on slow work inside a callback that the app waits for, such as an interceptor or a hook.
- Attach `.catch` to floating promises, and check for `inu.RpcError` where a call can fail for a normal reason.
- Release what you take: dispose blobs and canvases you are done with, undo registrations you no longer need.
- Log with `console.log`, but stay under the log limit. A loop that logs on every message will get cut off.

## Source and further reading

- [`sdk/types/dom.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/dom.d.ts): the web-like globals and their limits
- [`engine.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/engine.md) in Inugram: the original page
- [Routines](/entinygram/docs/routines) and [Method hooks](/entinygram/docs/xposed): what the thread rules mean for hooks
