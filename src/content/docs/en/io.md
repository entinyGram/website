# Network, files and storage

The engine offers web-shaped I/O: `fetch`, `Blob`, `File`, `localStorage` and timers. It also has `inu.fs` for a private folder. They look like their web counterparts, but each one has limits and rules the web does not. This page covers those.

## fetch

To make HTTP requests, use `fetch`, which is close to the standard Fetch API. You need the `fetch` grant, which you can scope to a host (and all its subdomains): `fetch(api.example.com)`.

```ts
const res = await fetch('https://api.example.com/v1/dogs', {
  headers: { accept: 'application/json' },
  timeout: 10_000,
})
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const dogs = await res.json()
```

### What is different

- HTTP authentication is not supported.
- Redirects are checked against your grants hop by hop. A redirect to a host you did not declare fails.
- There are no `credentials` and similar options, since the app stores no credentials.
- **The app's proxy is not used.** A `fetch` goes out directly.
- A non-standard `timeout` option rejects with `timed-out`.
- `fetch` resolves once the headers are in. The body downloads into a temporary file, and every body read waits for it and then reads from a `Blob` over that file. `signal` and `timeout` keep covering the download, so aborting after the headers rejects the body reads.
- The temporary file is deleted when that `Blob` is disposed or collected, and counts against the blob data on disk until then.

> [!WARNING]
> Because `fetch` ignores the app's proxy, a plugin with a broad `fetch` grant can reveal the user's real network address even when the app is set up to hide it. Scope `fetch` to the hosts you really need.

## Blob and File

A `Blob` is immutable content held in memory or in a file. That allows content larger than the JavaScript heap limit. It works like the web `Blob`.

### Disposing

Blobs are garbage collected, but a blob can hold a lot of memory or disk. A non-standard `dispose()`, or a `using` declaration, frees it right away.

```ts
using png = await canvas.convertToBlob({ type: 'image/png' })
// png is freed when the block ends
```

### Blobs backed by the app's files

`account.downloadMedia` returns a `File` backed by the app's cached copy of the media. It costs no quota, but the app owns the file. If the file disappears (cleared cache, deleted message), every read of the `File` rejects with `handle-expired`. If you need the content later, copy it right away:

```ts
async function keepAttachment(account: inu.Account, message: inu.Message) {
  const file = await account.downloadMedia(message)
  inu.fs.write(`media/${message.id}`, file)
}
```

## inu.fs

`inu.fs` needs the `fs` grant and works in a private folder for your plugin. All calls are synchronous.

```ts
inu.fs.mkdir('cache')
inu.fs.write('cache/state.json', new TextEncoder().encode(JSON.stringify({ n: 1 })))
const state = JSON.parse(new TextDecoder().decode(inu.fs.read('cache/state.json')))
```

### Paths

Paths are relative to the private folder. `.`, `..` and doubled slashes are resolved first, and the result must stay inside the folder. Files outside it are reachable only with the `unsafe.fs` grant.

### Quota

The folder holds 50 MB by default. A scope raises it: `fs(200mb)`. `inu.fs.usage()` and `inu.fs.quota()` report the effective numbers.

## localStorage

For small key-value data, use `localStorage`, which works like Web Storage. It is private to the plugin and limited to 1 MB, counted as UTF-8. A non-standard `setItems({...})` stores several items at once.

```ts
localStorage.setItem('theme', 'dark')
const theme = localStorage.getItem('theme') ?? 'light'
```

`localStorage` survives reloads and updates of the plugin, and is wiped when the plugin is uninstalled. Store small settings there, and larger or binary data in `inu.fs`.

## Timers

`setTimeout`, `setInterval`, `queueMicrotask` and their `clear*` functions work as on the web, with these limits:

- at most 512 timeouts and intervals live at once,
- an interval runs at most every 4 ms,
- while the app is in the background, timers are throttled: at most once a second, and after five minutes at most once a minute.

Timers stop when the plugin starts unloading.

## Clipboard

`inu.clipboard.write(text)` and `inu.clipboard.read()` need the `clipboard.write` and `clipboard.read` grants. Reading is a caution-level grant, because the clipboard often holds private data.

## openUrl

`inu.openUrl(url)` needs the `openUrl` grant. It takes an `http`, `https` or `tg:` link:

- `tg:` and `t.me` links open inside the app, as if the user tapped them;
- `telegram.org` links open in the in-app browser;
- anything else goes to the system browser.

A URL with whitespace, control characters, a backslash or a username is refused. When the app has no visible screen, nothing opens, because Android blocks starting activities from the background.

## Picking a place to keep data

| Data | Where | Why |
| --- | --- | --- |
| a few settings and flags | `localStorage` | simplest, survives updates |
| a cache, downloaded files, bigger state | `inu.fs` | no 1 MB limit, binary friendly |
| something big you only need for one task | a `Blob` | held in a file, freed when disposed |
| something another plugin should read | not possible | plugins share nothing |

## Source and further reading

- [`sdk/types/dom.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/dom.d.ts): `fetch`, `Blob`, `localStorage` and timers
- [`sdk/types/fs.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts): `inu.fs`
- [`io.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/io.md) in Inugram: the original page
