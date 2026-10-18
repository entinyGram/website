# Interception

Interceptors let a plugin change the data the app sends or receives. There are three of them:

- `inu.interceptRpc`: sits in front of the app's requests to Telegram. You can rewrite a request, change or replace the answer, or answer without asking the server at all.
- `inu.interceptSendMessage`: sees a message the user sends before it goes out. You can rewrite it or drop it.
- `inu.interceptUpdate`: sees an update from the server before the app applies it. You can change it or hide it.

> [!TIP]
> Do not use interceptors just to listen for events. They slow the app down a little. Use [events](/entinygram/docs/telegram#events) for that.

## Things to keep in mind

- **The app waits for you.** While your middleware runs, the app waits for its answer. Avoid heavy computation, keep middleware short, and register for the narrowest set of methods and types you need.
- **Your own traffic skips interceptors.** Requests from `invokeRpc` and the account write methods skip all interceptors, not only yours.
- **Plugins run in the user's order.** When several plugins intercept the same thing, they run in the order the user arranged the plugins in the app.
- **Views expire.** The request, response or update you are given is a view over the app's live object and is valid only during the call. After that, reading it throws `handle-expired`. Copy the fields you need before you return.
- **Each call has a time budget.** Only time spent in JavaScript counts, not time waiting for the server.

| Interceptor | Budget | When it runs out |
| --- | --- | --- |
| `interceptRpc` | 10 s per request | the app gets the real response if it was already sent, otherwise a timeout error |
| `interceptSendMessage` | 60 s per send | the send fails and nothing is sent |
| `interceptUpdate` | 2 s per batch of updates | updates are delivered as they are |

Besides the object being intercepted, you get a `context.signal` (an `AbortSignal`) that tells you whether continuing is still worthwhile.

## interceptRpc

`interceptRpc` is middleware in the style of Koa, and the same idea as network middleware in mtcute. You get the request and a `next` function that continues the chain.

```ts
inu.interceptRpc('messages.getHistory', async (context, next) => {
  context.request.limit = Math.min(context.request.limit, 20)
  const response = await next()
  if (response !== null && response._ !== 'messages.messagesNotModified') {
    console.log('got', response.messages.length, 'messages')
  }
  return response
})
```

The grant is scoped per method: `interceptRpc(messages.getHistory)`. The API filter still applies to middleware.

### What you can do

- **Rewrite the request.** `context.request` is writable. Change fields, then call `next()`. You can also pass `next` a different request, but it must be the same method.
- **Change the response.** Await `next()`, change the result or build a new one, and return it.
- **Answer without the server.** Return a response without calling `next()`. The request is never sent.
- **Fail the call.** Return or throw an `inu.RpcError`. The app sees a server error.

### What you return

| You return | The app gets |
| --- | --- |
| a TL object | that object as the response |
| an `inu.RpcError` (returned or thrown) | that error |
| `undefined`, after calling `next()` | whatever `next()` resolved with |
| `undefined`, without calling `next()` | an error: returning nothing is a bug, not consent |
| `null` | an empty response; most app code does not expect one, so fail with an `RpcError` instead |
| a thrown error that is not an `RpcError` | an error, and the throw is logged |

`next()` can be called only once; calling it twice throws.

If you return something that is not a valid TL object, the default is to log it and skip your middleware as if you had not been there. Pass `{ strict: true }` to fail the app's call instead. Use strict mode when a bad answer from you would be worse than no answer.

### Several methods at once

Pass an array of methods to share one middleware between them. The return type is then limited to what all of them return. For methods with different response types, register them one by one.

## interceptSendMessage

> [!EXPERIMENTAL]
> `interceptSendMessage`, its message types and `account.createLocalMedia` may change.

It runs when the user sends a message: text, files and albums, stickers, GIFs, locations, contacts and forwards. You get an `OutgoingMessage` with the fields you usually care about, and answer `'send'` or `'drop'`.

```ts
inu.interceptSendMessage({ text: /^\/shrug\b/ }, ({ message }) => {
  const rest = message.text.text.replace(/^\/shrug\s*/, '')
  message.text = { text: `${rest} ¯\\_(ツ)_/¯`.trim(), entities: [] }
  return 'send'
})
```

It does not see edits, polls, games, invoices, stories, quick replies, scheduled messages sent now, secret chats, or messages that plugins send.

### Filter first

Use the filter form when you can. The filter runs inside the app, so messages that do not match never reach JavaScript:

- `text` is a `RegExp`, or `true` or `false` for a send with or without any text. The regex is compiled by Java's regex engine, so syntax Java does not support throws when you register. It runs on the app's send path with no time limit, so keep it cheap: a nested quantifier like `(a+)+` can backtrack for seconds and freeze every send. Registering one logs a warning.
- `peer` is a marked peer id or a peer type (`'user'`, `'group'`, `'broadcast'`), or an array of them: the hook sees only sends to those chats.
- `media` is `true` or `false` for a send with or without media, or one or more media types.
- `forward` picks sends with (`true`) or without (`false`) a forward.
- `stage` picks when the hook runs.

Every field you give must match. For an album, the filter reads its caption. A forward without a comment has no text, so a `text` filter never matches it.

### Stages

By default a hook runs at the **compose** stage: as soon as the user sends, before the app draws the message, processes its files or uploads anything. The app sends nothing until every compose hook has answered, and later sends to the same chat wait behind it, so they still arrive in order. A text message held longer than 100 ms is drawn as sending in the meantime. If the user cancels it while it waits, it is not sent, whatever the stages answer.

`{ stage: 'uploaded' }` runs for messages with media, once they are uploaded, right before the message goes out, after every compose stage. The message is already drawn by then.

### What you can change

`message` is a plain snapshot of the send. Edit it in place or assign to it; your edits apply when you return `'send'`. An edit that cannot be applied fails the send after your middleware returned.

At the compose stage:

| Field | Notes |
| --- | --- |
| `text` | a string or `TextWithEntities`; for media it is the caption |
| `peer` | a marked peer id; the chat must be one the account knows, or the send fails with `not-found` |
| `reply` | a pending reply: message id, the chat when it is another chat, and a quote |
| `forward` | a pending forward: source chat, message ids and mode. `null` sends no forward. Setting `text` or `media` on a forward sent alone adds a comment, which goes first |
| `topicId` | the topic the message goes to |
| `scheduleDate`, `silent` | scheduling and silent send |
| `media` | files on the device are `LocalMedia`: reorder, cut, or add to them with `account.createLocalMedia(file)`. Media already on the server, such as a sticker or a location, is its `InputMedia`, which you can replace with any other or put in an album with local media, up to 10 items. With no media left, the text goes alone |

At the uploaded stage only `text`, `media` and `silent` may change, and `media` holds the uploaded `InputMedia`. A local media item is refused. In a chat that charges per message, the number of items cannot change.

### Verdicts

| Answer | Result |
| --- | --- |
| `'send'` | send the message with your edits |
| `'drop'` | cancel sending |

A throw, a rejection or running out of budget fails the send.

`interceptSendMessage` runs before any `interceptRpc` middleware sees the request the app makes for the message.

## interceptUpdate

`interceptUpdate` sees updates before the app applies them. The update is writable: change it in place and answer `'deliver'`, or answer `'drop'` to hide it from the app.

```ts
inu.interceptUpdate('updateNewMessage', ({ update }) => {
  const message = update.message
  if (message._ === 'message' && message.message.includes('spoiler')) return 'drop'
  return 'deliver'
})
```

The grant is scoped per update constructor: `interceptUpdate(updateNewMessage)`. An unknown constructor throws when you register.

### How updates flow

- Updates reach interceptors one at a time, in the order they arrived. Each passes through every interceptor in plugin order. Once one plugin drops an update, later plugins do not see it.
- The account's whole update stream waits while an interceptor runs. A slow interceptor delays every update behind it.
- Updates from catch-up after a reconnect go through interceptors too.
- Compact updates the server sends for short messages arrive as the full update they stand for, such as `updateNewMessage`.
- `onUpdate`, `onNewMessage` and the other events see an update after interception. They see your changes, and never see dropped updates.
- A dropped update is not fetched again later. Telegram's sequence numbers are still counted, so the app does not notice a gap.

### Failures deliver

Anything other than `'deliver'` or `'drop'`, a throw, a rejection or running out of budget all deliver the update and log the problem.

## Performance

- Register for exact methods and update types. A registration costs nothing for traffic it does not match.
- Use the `interceptSendMessage` filter so most messages never enter JavaScript.
- Read fields by name. Enumerating a view, spreading it or cloning it reads every field.
- Do not await slow work such as network calls in `interceptUpdate`: it holds the whole stream. Deliver first and do the work in an `onUpdate` handler.
- In message interceptors, replace the content in the passed message instead of dropping it and sending a new one yourself.

## Source and further reading

- [`sdk/types/common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts): the interceptors, their contexts and filters
- [`interception.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/interception.md) in Inugram: the original page
