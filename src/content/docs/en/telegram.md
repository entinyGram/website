# Telegram API

This page covers the Telegram side of the plugin API: accounts, peers, TL objects, reading and writing, formatted text, raw RPC calls, events and translation providers. If you have used [mtcute](https://mtcute.dev), many of these APIs will look familiar.

Hooks that sit in front of the app's own traffic are covered separately in [Interception](/entinygram/docs/interception).

## Accounts

The app can have several logged-in accounts. Everything that reads or acts on Telegram data goes through an `inu.Account` handle.

| Call | What it gives you |
| --- | --- |
| `inu.account()` | the active account |
| `inu.account(id)` | the account in slot `id` |
| `inu.accounts()` | every logged-in account, in order |
| `inu.onAccountsChanged(cb)` | called when accounts are added, removed or reordered |
| `inu.withCurrentAccount(cb)` | runs `cb` for the current account, and again on every switch |

`withCurrentAccount` is the easiest way to keep state per account. Return a cleanup function and it runs when the user switches away:

```ts
inu.withCurrentAccount((account) => {
  console.log('logged in as', account.id)
  return () => {
    console.log('account switched from', account.id)
  }
})
```

`account.id` is a **slot index**, not a user id. Slots are reused when an account logs out. Do not keep an `Account` handle for long: get a fresh one from `inu.account()`, or react to `onAccountsChanged`. Most high level handlers already pass you the account, so you rarely call `inu.account()` at all.

## Peers

Most calls take an `InputPeerLike`. It can be:

- a marked peer id, like in the Bot API or mtcute;
- `'me'` or `'self'`;
- a username, with or without the `@`;
- a TL object that names a peer: `Peer`, `InputPeer`, `InputUser`, `InputChannel`, `User`, `Chat`.

`inu.utils.peers` has helpers for converting between the forms. Two quirks:

- TL objects still carry raw ids: `peer.channel_id` is `123`, not `-1000000000123`.
- The app's Java code (`inu.jvm`, `inu.xposed`) uses a simpler schema where both chats and channels are simply negated. Use `toSimpleDialogId` to convert.

Secret chats are generally invisible to plugins.

## TL objects

Most of the plugin API is made of TL objects, which are plain JavaScript objects with a `_` field naming their type:

```ts
const peer: tl.TypeInputPeer = { _: 'inputPeerUser', user_id: 42, access_hash: '123' }
```

They come in two kinds, **live** and **detached**. On the surface they behave the same.

### Live objects

A live TL object is a proxy backed by a real object in the Java heap. There are two reasons for that. In some cases, such as `interceptUpdate`, JavaScript is allowed to change the object in place. In others it is a performance optimization: serializing a large object for JavaScript is slow, so the engine passes a pointer and reads fields lazily.

You can tell them apart:

```ts
const isJavaBacked = Symbol.for('inu.tl.handle') in value
```

Every field read on a live object is a Java call, so:

- **Enumerating reads everything.** Spreading, `JSON.stringify` and `structuredClone` read every field. On a big object, such as a history page, that is slow. Read only the fields you need.
- **Views can be read-only.** Use `structuredClone()` to get a plain, changeable copy.
- **Some views expire.** Views passed to interceptors are valid only during that call. Copy what you need.

```ts
const me = inu.account().getMe()
if (me !== null) {
  const copy = structuredClone(me)
  copy.first_name = 'someone else'
}
```

### Numbers and 64-bit ids

Java `long` fields do not always fit in a JavaScript number. The bridge decides per field: ids and sizes that Telegram guarantees fit in 53 bits (user, chat and channel ids, file sizes) are `number`. Other `long` fields, such as `access_hash`, are decimal strings. Writing a `long` accepts either form, but a number above `Number.MAX_SAFE_INTEGER` is refused. `bytes` fields are `Uint8Array`, and base64 strings are accepted when writing.

### What plugins never see

To avoid handing sensitive data to plugins, the high level APIs filter some data: login codes in messages from Telegram's service account, `config.autologin_token`, draft text (unless you hold `account.read(draft)`) and `updateServiceNotification`. The grant `unsafe.disableApiFiltering` lifts this, and is strongly discouraged.

## Reading

Account reads need `account.read(...)` grants. The typings show the exact scope for each method.

There are two kinds of reads, synchronous and asynchronous. In most cases the peers you need are already cached, so you can read them directly. Useful methods:

| Method | Gives you |
| --- | --- |
| `getMe()` | the signed-in user |
| `getUser(id)`, `getChat(id)` | the cached user or chat |
| `getMessages(peer, ids)` | messages by id, from the network if needed |
| `getMessagesCached(peer, ids)` | messages already in the cache, never blocks on the network |
| `getHistory(peer, options)` | a range of chat history, preferring the cache; `force: true` asks the server |
| `iterHistory(peer, options)` | an async iterator over history |
| `getDialogs`, `iterDialogs` | the chat list |
| `resolvePeer(peer)` | an `InputPeer`, resolving usernames |
| `downloadMedia(message)` | the message's media as a `File` |
| `downloadMediaToFile(message)` | saves the media and returns its path (experimental) |

### Pagination

Methods like `getDialogs` return a `Paged` array: the items plus a `next` cursor, or `null` on the last page. Pass `next` back as `cursor` for the following page. A cursor is opaque and short lived: it works only with the list that made it, only the 32 newest cursors are kept, and cursors do not survive a plugin reload.

If you just want every item, use the iterators. `limit` caps the total, and `batchSize` sets the page size (100 by default). Nothing runs until the first `next()`:

```ts
for await (const dialog of inu.account().iterDialogs({ limit: 500 })) {
  console.log(dialog.peer)
}
```

### Asking for fields up front

Some methods, such as `getDialogs`, accept a `fields` option. Because reads are live objects, reading every field costs a Java call. Passing a list of fields hands them to JavaScript along with the handle and skips the extra calls.

## Writing

```ts
async function greet(username: string) {
  const account = inu.account()
  const peer = await account.resolvePeer(username)
  await account.sendMessage(peer, md`hello from **a plugin**`)
}
```

Writing needs `account.write(...)` grants. `sendMessage`, `sendMedia` and `sendMultiMedia` resolve with the sent `Message`. `sendMedia`, `sendMultiMedia`, `createLocalMedia` and the `optimistic` option are experimental.

By default a send is **optimistic**: the message appears in the chat at once, as if the user sent it. Set `optimistic: false` to send in the background. An optimistic send does not work with `sendAs`, and some replies cannot be shown this way.

A message your plugin sends does not go through `interceptSendMessage` or `interceptRpc`, in any plugin. This is on purpose, to avoid accidental infinite loops.

## Messages

`inu.Message` wraps a raw TL message with getters for the things you usually want, and handles the many edge cases of Telegram's message format. Prefer the getters over reading `raw` yourself.

| Getter | Meaning |
| --- | --- |
| `id`, `dialogId`, `topicId`, `senderId` | where it is and who sent it |
| `date`, `editDate` | unix time in seconds |
| `out` | whether the message is outgoing |
| `text`, `textWithEntities` | plain and formatted text |
| `media`, `mediaType`, `document` | media of the message |
| `duration` | for playable media |
| `replyToMessageId`, `forwardedFrom` | reply and forward info |
| `groupedId` | the album it belongs to |
| `isService` | whether it is a service message |

You can wrap a raw message yourself with `new inu.Message(raw)`. `account.previewMessage(message)` gives the text the app shows in the chat list, such as "📷 Photo".

## Formatted text

Formatted text is a `TextWithEntities`: a string and TL entities. Offsets are UTF-16 code units, the same as JavaScript string indexes. Anywhere the API takes text, a plain string also works.

`inu.utils` has three parsers, based on mtcute's, exposed as tagged templates:

| Format | Syntax |
| --- | --- |
| `md` | `**bold**`, `__italic__`, `--underline--`, `~~strike~~`, `\|\|spoiler\|\|`, `` `code` ``, fenced code, `[text](url)`, `> quote` |
| `html` | Telegram's HTML subset. Whitespace collapses like real HTML; use `<br>` for line breaks |
| `thtml` | like `html`, but whitespace is kept and the template is dedented first, like the Bot API |

```ts
function formatScore(name: string, score: number) {
  return inu.utils.md`**${name}** scored ${score}`
}
```

The API is the same as mtcute's; see [its parse modes guide](https://mtcute.dev/guide/topics/parse-modes.html) for more.

## Raw RPC

`inu.invokeRpc` (or `account.invokeRpc`) calls any API method. It needs an `invokeRpc` grant scoped to the method:

```ts
const config = await inu.invokeRpc({ _: 'help.getConfig' })
```

with `invokeRpc(help.getConfig)` in the manifest.

- A server error rejects with `inu.RpcError`, which has `code` and `text`.
- Some methods are filtered because they could take over the account, such as `auth.*`. `unsafe.disableApiFiltering` opts out, and is discouraged.
- Your own calls skip every RPC interceptor.

`invokeRaw` sends raw TL bytes and returns raw bytes. It needs `unsafe.invokeRaw` and exists for methods newer than the app's layer. A response from a newer layer can break the connection state, so prefer `invokeRpc` whenever it works.

### Takeout

`account.initTakeoutSession()` opens a data export session, which has higher rate limits for reading history. For new sessions Telegram may ask the user to approve it. Calls go through `session.invokeRpc`, which needs both `takeout` and the `invokeRpc` scope for the method. Call `finish()` when done.

## Events

Some methods subscribe you to things that happen:

| Call | Grant |
| --- | --- |
| `inu.onNewMessage(cb)` | `onUpdate(new_message)` |
| `inu.onMessageEdited(cb)` | `onUpdate(edit_message)` |
| `inu.onMessageDeleted(cb)` | `onUpdate(delete_message)` |
| `inu.onUpdate(types, cb)` | `onUpdate(updateNewMessage, …)`, one scope per constructor |
| `inu.onAppVisibilityChange(cb)` | `onAppVisibilityChange` |

The message events cover every account and hand you the `Account` the event came from. They see new messages from live updates and from catch-up after reconnecting. Local and scheduled messages are not included. This callback sometimes runs before the app has applied the update, so chat state may not reflect it yet.

`onUpdate` takes raw TL update names. The update is a read-only live view.

## Notifications

`inu.notifications.suppress()` (or per account, `account.suppressNotifications()`) holds back the notifications the app posts itself. It is handy for plugins that show their own notifications. It needs the `notifications.suppress` grant.

## Translation providers

A plugin can offer its own translation service to the app's built-in translator:

```ts
inu.registerTranslationProvider({
  id: 'deepl',
  name: 'DeepL',
  format: 'html',
  async translate({ texts, to, signal }) {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `DeepL-Auth-Key ${KEY}` },
      body: JSON.stringify({ text: texts, target_lang: to, tag_handling: 'html' }),
      signal,
    })
    const { translations } = await res.json()
    return translations.map(t => t.text)
  },
})
```

The `format` decides what your provider talks:

- `plain` (the default): plain strings in and out, formatting is dropped.
- `html`: entities are written as Telegram's HTML subset.
- `entities`: raw `TextWithEntities`, which you handle yourself.

`from` holds the detected language of each text, or `null` where the app does not know it. When your provider is picked, all translations the app asks for go through it, so `messages.translateText` is never sent. Calling `invokeRpc({ _: 'messages.translateText', … })` yourself still works as usual.

In entinyGram a registered provider appears in Translator → Provider next to the built-in ones.

## Source and further reading

- [`sdk/types/common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts): `Account`, `Message` and the events
- [`sdk/types/android.tl.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.tl.d.ts): every TL type, method and update
- [Telegram API methods](https://core.telegram.org/methods): what `invokeRpc` can call
- [mtcute](https://mtcute.dev): the model the message and parse APIs follow
- [`telegram.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/telegram.md) in Inugram: the original page
