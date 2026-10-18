# Grants

A grant is a permission a plugin declares in its manifest. The user sees the list before installing, and the plugin gets exactly that. There is no runtime prompt: a plugin cannot ask for more later. It can only ship an update that asks for more, which the user then has to approve.

Each method in the typings names the grant it needs with a `@needs-grant` tag. Anything without that tag, such as `localStorage`, timers or `inu.account()` itself, needs no grant.

## Syntax

```ts
grants: [
  'onUpdate(new_message, edit_message)',
  'account.read(peers, messages)',
  'fetch(api.example.com)',
  'fs(200mb)',
  'clipboard.write',
]
```

A grant is a name, optionally followed by scopes in parentheses, separated by commas. The same name may appear more than once, and the scopes add up. A grant without scopes covers every scope.

In the header each item becomes one `@grant` line.

## Scope kinds

The catalogue says which kind of scope each grant takes:

| Kind | Grants | A scope is | Matching |
| --- | --- | --- | --- |
| none | `clipboard.*`, `openUrl`, `interceptSendMessage`, `takeout`, `unsafe.*` and others | not applicable | |
| list | `account.read`, `account.write` | one name from a fixed list | exact |
| domain | `fetch` | a host name | the host or any subdomain of it, case insensitive |
| size | `fs` | a quota such as `200mb` (`kb`, `mb`, `gb`) | the default is 50 MB |
| RPC method | `invokeRpc`, `interceptRpc` | a TL method name such as `messages.getHistory` | exact, one scope per method |
| update type | `onUpdate`, `interceptUpdate` | a TL update constructor such as `updateNewMessage` | exact |

`onUpdate` also accepts three friendly names, `new_message`, `edit_message` and `delete_message`, which map to the higher level `inu.onNewMessage`, `inu.onMessageEdited` and `inu.onMessageDeleted`. The two forms are separate: `onUpdate(new_message)` does not allow `inu.onUpdate('updateNewMessage', …)`, and the other way round. A bare `onUpdate` grant allows everything.

## How checks work

- **Checks fail closed.** A call that your grants do not cover throws or rejects with `inu.PluginError` and code `not-granted`. The error's `grant` field holds the exact token to add to your manifest.
- **Namespaces exist without their grant.** Without `fs` or `unsafe.fs`, reading any member of `inu.fs` throws `not-granted`. The same holds for `inu.jvm` without `unsafe.jvm`, and `inu.xposed` without `unsafe.xposed`.
- **`unsafe.xposed` also needs `unsafe.jvm`**, because hooks work in terms of JVM handles.
- **An unknown grant name is ignored.** The app installs the plugin, and the name gives no access. This keeps a plugin written for a newer app installable on an older one. `inu check` warns about it, because a typo silently costs you the API.
- **An unknown or malformed scope is refused.** A known grant with a bad scope, such as `account.read(peer)` or `fetch(foo)`, blocks installation. A typo there would otherwise narrow the grant to nothing. `inu check` reports the same errors the app would.

## The full list

| Grant | Scopes | Level | What it gives |
| --- | --- | --- | --- |
| `fs` | size | neutral | a private directory on disk; a scope such as `fs(200mb)` raises the 50 MB default quota |
| `clipboard.write` | none | neutral | put text on the system clipboard |
| `clipboard.read` | none | caution | read whatever is on the system clipboard |
| `openUrl` | none | neutral | hand a link to the app to open |
| `onAppVisibilityChange` | none | neutral | be told when the app goes to the foreground or background |
| `notifications.suppress` | none | neutral | hold back the notifications the app posts itself while the plugin runs |
| `fetch` | domain | neutral | HTTP requests; each scope is a host, and a bare `fetch` reaches anywhere |
| `account.read` | list | neutral | read the signed-in account: `self`, `peers`, `messages`, `dialogs`, `history`, `draft` |
| `account.write` | list | caution | act as the account: send, edit, delete, forward, react, mark read, type, draft |
| `onUpdate` | update type | neutral | watch updates as they arrive, without changing them |
| `interceptUpdate` | update type | neutral | see updates before the app applies them, and drop them |
| `interceptSendMessage` | none | caution | see outgoing messages before they are sent, and rewrite or drop them |
| `invokeRpc` | RPC method | neutral | call Telegram API methods directly; each scope is a method name |
| `interceptRpc` | RPC method | neutral | sit in front of the app's own API requests; each scope is a method name |
| `takeout` | none | caution | open a data-export session, which the user approves |
| `unsafe.fs` | none | dangerous | read and write any file the app can reach, with no quota |
| `unsafe.invokeRaw` | none | dangerous | send any API request, bypassing the method filter |
| `unsafe.jvm` | none | dangerous | reach the JVM directly, unsandboxed |
| `unsafe.xposed` | none | dangerous | replace methods of the app, changing how any part of it behaves |
| `unsafe.notificationCenter` | none | dangerous | watch and post the app's internal events |
| `unsafe.disableApiFiltering` | none | dangerous | lift the account takeover filter, allowing account-critical API calls |

The **level** is what the install sheet and the Marketplace use to draw attention. Neutral grants are ordinary. Caution grants let the plugin act for you or read private data. Dangerous grants bypass the plugin sandbox completely.

### The `account.read` and `account.write` lists

`account.read` scopes: `self`, `peers`, `messages`, `dialogs`, `history`, `draft`. For example `account.read(peers, messages)` lets a plugin look up users and chats and read messages, but not read the list of dialogs or any drafts.

`account.write` scopes: `send`, `edit`, `delete`, `forward`, `react`, `read` (mark as read), `typing` and `draft`. Grant only the actions you need.

## What the build and the app refuse

`inu check` and `inu build` run the same validation the app runs on install, so you see the refusal before your users do. A manifest is rejected when:

- a grant that takes no scopes has some (`clipboard.write(x)`);
- a list grant has an unknown scope (`account.read(peer)`);
- a `fetch` scope is not a valid host name;
- an `fs` scope is not a size such as `200mb`;
- an RPC method or an update type in a scope does not exist;
- an `invokeRpc` or `interceptRpc` scope names a **takeover method**, such as `auth.*`, unless the manifest also holds `unsafe.disableApiFiltering`;
- an `onUpdate` or `interceptUpdate` scope names an update that is never delivered to plugins;
- a grant is malformed, for example with an unclosed parenthesis;
- the plugin API level is higher than the app supports.

An unknown **grant name** is not an error: it is ignored by the app, and only warned about, so that a plugin written for a newer app still installs on an older one.

## Takeover protection

Some API calls could take over an account, such as signing in with a new session or changing the two-step password. To prevent that, a **takeover filter** blocks those methods and some data from the high level APIs: login codes in messages from Telegram's service account, the autologin token, draft text without `account.read(draft)`, and service notifications.

`unsafe.disableApiFiltering` lifts the filter. It is marked dangerous and exists for plugins whose whole purpose is account management. Most plugins never need it.

## The unsafe grants

Unsafe grants bypass the plugin sandbox, so a plugin that holds one can do almost anything the app can.

| Grant | What it gives |
| --- | --- |
| `unsafe.jvm` | access to `inu.jvm`: Java reflection, so any class and any field of the app |
| `unsafe.xposed` | access to `inu.xposed`: hooks that replace or wrap any method; requires `unsafe.jvm` |
| `unsafe.fs` | unscoped `inu.fs`: any file the app can reach, with no quota |
| `unsafe.invokeRaw` | `inu.invokeRaw`, which sends raw TL bytes and skips the method filter |
| `unsafe.notificationCenter` | the app's internal event bus; requires `unsafe.jvm` |
| `unsafe.disableApiFiltering` | lifts the takeover filter |

Many useful plugins need `unsafe.jvm` and `unsafe.xposed`: they change how the app draws or behaves, and there is no safe API for that. That is fine, but it means users must trust the plugin and its author, which is why the plugin channel requires open source code and the Marketplace marks these grants with a warning.

## Choosing grants

- **Ask for the narrowest scope.** Use `fetch(api.example.com)`, not a bare `fetch`. Use `account.read(messages)`, not a bare `account.read`. Use `interceptRpc(messages.getHistory)`, not every method.
- **Prefer the safe API.** If `account.write(send)` does the job, do not use `unsafe.jvm` to call a Java send method.
- **Do not hold a grant you no longer use.** Remove it in the update that removes the code.
- **Explain it.** Say in the description why the plugin needs a sensitive grant. People install plugins they understand.
- **Run `inu check`.** It tells you about unknown names and bad scopes before the app does.

## What users see

When a user installs your built file, the app shows the grants with their levels and asks for a confirmation. A plugin pushed through developer mode skips that sheet, so always test a real install before you publish.

The Marketplace shows the permissions of plugins that come from a Telegram channel, with unsafe grants marked, and asks for a second confirmation before installing from a channel entinyGram does not vet. See [The Marketplace](/entinygram/docs/marketplace).

## Source and further reading

- [`sdk/types/grants.json`](https://github.com/entinyGram/plugins/blob/main/sdk/types/grants.json): the grant catalogue this page is based on
- [`sdk/types/grants.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/grants.d.ts): the grants as types
- [`sdk/cli/src/utils/manifest.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/utils/manifest.ts): the rules `inu check` applies, written as code
- [`grants.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/grants.md) in Inugram: the original page
