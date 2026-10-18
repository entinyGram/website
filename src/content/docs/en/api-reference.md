# API reference

A map of the plugin API, generated from the typings that ship with the SDK. Use it to find the name of a call, see its signature and the grant it needs. Every entry links back to the typings, where the full documentation of each method lives.

> [!NOTE]
> This page is generated from [`sdk/types`](https://github.com/entinyGram/plugins/tree/main/sdk/types). The typings are the source of truth: if this page and the typings disagree, trust the typings. In your editor they give you autocomplete, parameter hints and the `@needs-grant` note for every call.

How to read an entry: the signature comes first, then what the call does. **Grant** names the permission it needs. *Experimental* means the call may change between releases.

## Top level

Functions and constants on the global `inu` object itself: accounts, events, interceptors, registration of actions and settings, and the error classes.

- `info(): { platform: 'android' | (string & {}); appVersion: string; appBuild: string; apiVersion: number; layer: number; language: string; header: Record<string, string[]> }` Get information about the current environment [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L124)
- `onUnload(callback: () => void | Promise<void>): Disposer` Register a handler that will run when the plugin is unloaded Handlers run in registration order and share one cleanup window. Resources remain available until settlement/timeout. Ordinary callbacks and timers stop first. JVM runnables created during cleanup can run on the UI thread; existing callbacks stay stopped. **Limits: 2 seconds total for async cleanup.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L150)
- `openUrl(url: string): void` Open a web URL, or an internal deeplink (t.me/telegram.org) **Grant:** `openUrl`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L157)
- `onAppVisibilityChange(callback: (mode: 'foreground' | 'resumed' | 'paused' | 'background') => void): Disposer` Subscribe to app visibility changes. Possible events: - `'foreground'` - the app was moved to the foreground - `'background'` - the app was backgrounded (e.g. user switched to another app) - `'paused'` - the main activity was paused by the system (e.g. permission dialogs/file picker/etc) - `'resumed'` - the main activity was resumed **Grant:** `onAppVisibilityChange`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L170)
- `accounts(): Account[]` Get the logged-in accounts, in the order the user sees them in the app [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L277)
- `onAccountsChanged(callback: (accounts: Account[]) => void): Disposer` Register on updates for when the account list updates, including when the user reorders it [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L282)
- `withCurrentAccount(callback: (account: Account) => (() => void) | Disposable | void): Disposer` Runs `callback` for the current account, and again on each account switch. When a function/Disposable is returned, it's called whenever the account changes, or the returned `Disposer` is disposed [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L290)
- `account(id?: number): Account` The account in slot `id` (`Account.id`), or the current account when `id` is omitted. Throws `not-found` when no account is logged in there. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L296)
- `registerSettings(page: ui.UIPage): Disposer` Register a UIPage as a plugin settings page [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1585)
- `invokeRpc<T extends tl.TypeRpcMethod>(params: T): Promise<tl.RpcCallReturn[T['_']] | null>` invoke a raw mtproto rpc method via the currently active account **Grant:** `invokeRpc`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1592)
- `invokeRaw(method: Uint8Array): Promise<Uint8Array | null>` invoke a raw mtproto rpc method via the currently active account, given its TL serialization, and return the TL serialization of the server's response ⚠️ this method is primarily intended for **advanced users**, primarily for cases where you want to call a method that is not yet supported by the current app's layer. beware that can cause the app to crash or otherwise misbehave, due to the server "bumping" the layer. in almost all cases, you should use `invokeRpc` instead. **Grant:** `unsafe.invokeRaw`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1606)
- `interceptRpc<M extends tl.TypeRpcMethod['_']>(method: M, middleware: (context: RpcMiddlewareContext<M>, next: RpcNext<M, tl.RpcCallReturn[M]>) => MaybePromise<tl.RpcCallReturn[M] | null | undefined>, options?: Interce…` Register an RPC interceptor **Grant:** `interceptRpc`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1628)
- `interceptRpc<M extends tl.TypeRpcMethod['_']>(methods: M[], middleware: (context: RpcMiddlewareContext<M>, next: RpcNext<M, SharedRpcReturn<M>>) => MaybePromise<SharedRpcReturn<M> | null | undefined>, options?: Interc…` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1636)
- `onNewMessage(callback: (message: Message, account: Account) => void): Disposer` Register a new message handler Receives every `updateNewMessage` and `updateNewChannelMessage` for every account. Runs before the app applies the update, so chat state may not reflect it yet. Local and scheduled messages are not included. **Grant:** `onUpdate(new_message)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1654)
- `onMessageEdited(callback: (message: Message, account: Account) => void): Disposer` Register a message edit handler **Grant:** `onUpdate(edit_message)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1660)
- `onMessageDeleted(callback: (dialogId: number | null, messageIds: number[], account: Account) => void): Disposer` Register a message deletion handler **Grant:** `onUpdate(delete_message)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1666)
- `onUpdate<U extends tl.TypeUpdate['_']>(types: U | U[], callback: (update: Extract<tl.TypeUpdate, { _: U }>, account: Account) => void): Disposer` Register a handler for raw TL updates **Grant:** `onUpdate`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1687)
- `interceptUpdate<U extends tl.TypeUpdate['_']>(types: U | U[], middleware: (context: UpdateMiddlewareContext<U>) => MaybePromise<'deliver' | 'drop'>): Disposer` Register an app-wide update interceptor **Grant:** `interceptUpdate`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1707)
- `registerGlobalAction(options: ActionOptions<ActionContext>): Disposer` Register a global action handler, shown in the drawer or the hamburger menu on the main page **Limits: 150 ms to render plugin actions, 8 rows per menu per plugin.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1744)
- `registerChatAction(options: ActionOptions<ChatActionContext, ChatActionContext | null>): Disposer` Register a chat action, shown in the chat hamburger menu [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1747)
- `registerMessageAction(options: MessageActionOptions): Disposer` Register a message action, shown in the message context menu [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1750)
- `registerProfileAction(options: ActionOptions<ChatActionContext>): Disposer` Register a profile action, shown in the profile hamburger menu [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1753)
- `registerTranslationProvider(provider: TranslationProvider): Disposer` Register a translation provider, which can be chosen by the user in Translator settings. When the provider is selected, every translation request will be forwarded to the `translate` method of the provider. **Limits: 30 s per request.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1816)
- `interceptSendMessage(middleware: (context: SendMessageContext) => MaybePromise<'send' | 'drop'>): Disposer` Register an interceptor for the user-initiated message sends. This overload registers one in the `compose` stage. **Grant:** `interceptSendMessage`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1999)
- `interceptSendMessage(filter: SendMessageFilter, middleware: (context: SendMessageContext) => MaybePromise<'send' | 'drop'>): Disposer` Register a hook before the message is sent, with a filter. This overload is recommended over the general one because it avoids unnecessary JS jumps for messages that are not matched. Additionally, this overload allows configuring the stage the hook runs on. **Grant:** `interceptSendMessage`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L2014)

## inu.ui

Pages, rows, dialogs, files and screens. See [UI](/entinygram/docs/ui) for how they fit together.

- `openPage(page: UIPage): void` open a page defined by the plugin [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1096)
- `openPage(screen: PageTarget): void` open a stock commonly used page [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1098)
- `openChatHistory(options: { title: InputText; subtitle?: InputText; icon?: UIIcon; account?: number; synthetic?: boolean; avatars?: boolean; load(cursor: string | null, direction: 'older' | 'newer'): MaybePromise<ChatH…` Open a chat screen, with the data supplied by the pluggin. Supports infinite scrolling in both directions Every item in the dataset gets its own ID, so the same server message can appear more than once *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1217)
- `toast(text: string): void` show a toast [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1288)
- `bulletin(options: { text: InputText; subtitle?: InputText; icon: UIIcon | BulletinAvatars; duration?: 'short' | 'long' | number; position?: 'top' | 'bottom'; button?: string }): Promise<'clicked' | 'button' | 'dismiss…` Shows a bulletin (snackbar). Resolves with `'button'` when its button is tapped, `'clicked'` when its body is tapped, or `'dismissed'` when it closes otherwise. You can ignore the promise if you do not need the result. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1295)
- `dialog(options: { title?: InputText; message?: InputText; body?: UIElement; positive?: string; negative?: string; neutral?: string }): Promise<'positive' | 'negative' | 'neutral' | 'dismissed'>` show a dialog returns a promise that resolves to the result of the dialog once it's dismissed, with either the name of the button pressed, or `'dismissed'` if the dialog was dismissed (e.g. by tapping outside of it, or by pressing the back button). [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1320)
- `chooser(options: { title?: string; items: (string | { text: string, subtitle?: string, danger?: boolean })[]; selected?: number; multiple?: false }): Promise<number | null>` show a list of choices; tapping one only changes the selection, and the OK button submits it resolves to the selected index (or a list of indices with `multiple`), or `null` if the chooser was cancelled or dismissed. without `multiple`, OK stays disabled until something is selected [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1342)
- `chooser(options: { title?: string; items: (string | { text: string, subtitle?: string, danger?: boolean })[]; selected?: number[]; multiple: true }): Promise<number[] | null>` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1348)
- `selectPeers(options: { title?: string; account?: number; selected?: number[]; peerType?: ('group' | 'broadcast' | 'user')[]; limit?: number; allowEmpty?: boolean }): Promise<number[] | null>` Select users, groups or channels. Resolves to marked peer IDs, or null on cancellation. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1356)
- `getCurrentScreen(): CurrentScreen | null` Get the currently visible screen *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1389)
- `onScreenChanged(callback: (change: ScreenChange) => void): Disposer` Subscribe to navigation changes *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1408)
- `prompt(options: { title: string; hint?: string; value?: string; selectAll?: boolean }): Promise<string | null>` Prompt a user for some text input [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1411)
- `pickFile(options?: { accept?: string[]; multiple?: false }): Promise<File | null>` open a file picker, returning the File the user chose (or `null` if they chose nothing) [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1419)
- `pickFile(options: { accept?: string[]; multiple: true }): Promise<File[]>` open a file picker, returning the File-s the user chose (or `[]` if they chose nothing) [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1426)
- `saveFile(content: Blob | Uint8Array | { path: string }, options?: { fileName?: string; type?: string }): Promise<boolean>` save a file to the device storage, opening a "save as" dialog **Grant:** `fs to name a file`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1438)
- `header(text: string): UIElement` Header element [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1461)
- `check(options: { id?: string; text: string; subtitle?: string; icon?: UIIcon; checked: boolean; onChange: (checked: boolean, anchor: UIAnchor) => void; onSecondaryClick?: (anchor: UIAnchor) => void }): UIElement` Check (switch) element [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1464)
- `button(options: { id?: string; text: InputText; subtitle?: InputText; icon?: UIIcon; value?: InputText; danger?: boolean; onClick: (anchor: UIAnchor) => void; onSecondaryClick?: (anchor: UIAnchor) => void }): UIElement` Button element [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1482)
- `select(options: { id?: string; text: InputText; icon?: UIIcon; items: (string | { text: string, subtitle?: string })[]; selected: number; dialog?: boolean; onChange: (index: number, anchor: UIAnchor) => void; onSecond…` Select element. A button showing a selector on tap [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1501)
- `slider(options: { id?: string; text?: string; min: number; max: number; step: number; value: number; default?: number; label?: (value: number) => string; onChange: (value: number, anchor: UIAnchor) => void }): UIElement` Slider element **Limits: 501 label steps.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1529)
- `separator(text?: InputText): UIElement` A separator element, with optional text [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1555)
- `settingsPage(options: { title: string; transient?: boolean; items: () => UIElement[]; bottomButton?: { text: string; onClick: (anchor: UIAnchor) => void }; onClose?: () => void }): UIPage` Define a declarative settings page [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1558)
- `openPage(fragment: JavaObject): void` Open a page from a manually created `Fragment` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L9)

## inu.icons

Icons for rows and menus.

- `animation(name: 'success' | 'error' | 'info' | 'loading'): UIIcon` `UIIcon` from a built-in common animation [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1018)
- `customEmoji(id: string, options?: LottieOptions): UIIcon` `UIIcon` from a Telegram custom emoji (`id` is the custom emoji ID as a string) [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1021)
- `sticker(options: StickerOptions): UIIcon` `UIIcon` from a Telegram sticker. `slug` is the slug of a stickerset, and to address a sticker you can use one of: - `index` - zero-based index of a sticker in the set - `emoji` - emoji the sticker represents - `id` - the sticker's id `id` is the most stable way to address a sticker, but none of them are *that* stable because indices might shift, emojis might change, and sticker with the ID might be deleted from the set. for use in interfaces it is highly recommended to use a set you control, or use custom emojis. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1042)
- `avatar(dialogId: number, options?: { account?: number }): UIIcon` `UIIcon` with a peer's profile photo (or initials placeholder) [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1051)
- `common(name: | 'settings' | 'info' | 'search' | 'edit' | 'delete' | 'copy' | 'share' | 'download' | 'link' | 'pin' | 'star' | 'mute' | 'unmute' | 'archive' | 'forward' | 'reply' | 'user' | 'group' | 'channel' | 'bot…` `UIIcon` from a built-in common icon [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1054)
- `svg(source: string): UIIcon` `UIIcon` from a custom SVG. **Limits: 64 KiB of SVG source.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1067)

## inu.utils

Peer helpers and the text formatting parsers (`md`, `html`, `thtml`).

- `const md: TextFormat` mtcute's markdown: - `**bold**` - `__italic__` - `--underline--` - `~~strike~~` - `\|\|spoiler\|\|` - `` `code` `` - ```` ```pre ```` - `[text](url)` - `> quote`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L948)
- `const html: TextFormat` telegram's html subset. Whitespace collapses as it does in real html; `<br>` breaks a line. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L950)
- `const thtml: TextFormat` `html`, but whitespace is kept as written and the template is dedented first, like Bot API [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L952)
- `joinTextWithEntities(parts: InputText[], delim?: InputText): TextWithEntities` Joins text parts and adjusts their entity offsets: ```ts const board = inu.utils.joinTextWithEntities(scores.map(entry => md`**${entry.name}**: ${entry.score}`), '\n') ``` The delimiter is inserted only after nonempty output, so leading empty parts add no delimiter. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L966)
- `toBase64(bytes: Uint8Array): string` convert an array of bytes to base64 [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L969)
- `fromBase64(base64: string): Uint8Array` convert base64 to an array of bytes [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L971)
- `toHex(bytes: Uint8Array): string` convert an array of bytes to hex [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L973)
- `fromHex(hex: string): Uint8Array` convert hex to an array of bytes [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L975)
- `formatDate(unix: number, style?: 'date' | 'time' | 'dateTime' | 'relative'): string` app-localized date text. `unix` must be a safe integer Unix timestamp in seconds. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L978)
- `formatNumber(value: number, options?: { compact?: boolean }): string` app-localized integer text. `compact` uses Telegram's million formatter. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L981)
- `formatFileSize(bytes: number): string` app-localized file size text. `bytes` must be a safe integer. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L984)
- `formatDuration(seconds: number): string` app's clock-style duration text. `seconds` must be a non-negative signed 32-bit integer. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L987)

## inu.clipboard

The system clipboard.

- `write(text: string): void` Write something into the clipboard **Grant:** `clipboard.write`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L181)
- `read(): string` Read the clipboard value **Grant:** `clipboard.read`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L187)

## inu.notifications

Control over the notifications the app posts.

- `suppress(): Disposer` Suppresses all app notifications for all accounts and dismisses existing notifications. Suppression lasts until the returned `Disposer` runs or the plugin unloads. Multiple holds can coexist; notifications resume only when all holds are released. See `Account.suppressNotifications` to suppress one account's notifications. **Grant:** `notifications.suppress`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L1679)

## inu.fs

The plugin's private folder. See [Network, files and storage](/entinygram/docs/io).

- `read(path: string): Uint8Array` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L21)
- `write(path: string, data: Blob | Uint8Array): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L23)
- `append(path: string, data: Blob | Uint8Array): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L25)
- `mkdir(path: string): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L27)
- `rm(path: string, options?: { recursive?: boolean }): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L29)
- `exists(path: string): boolean` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L31)
- `readdir(path: string): string[]` Returns sorted file and directory names. Use `stat` to distinguish them. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L34)
- `stat(path: string): { isFile: boolean; isDirectory: boolean; size: number; mtime: number; ctime: number }` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L36)
- `copy(src: string, dest: string): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L44)
- `move(src: string, dest: string): void` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L46)
- `usage(): number` Get the storage amount in bytes used by the plugin currently [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L49)
- `quota(): number` Get the storage limit in bytes [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/fs.d.ts#L52)

## inu.canvas

The offscreen 2D canvas. See [Canvas](/entinygram/docs/canvas).

- `create(width: number, height: number): OffscreenCanvas` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L264)
- `decode(source: Blob | Uint8Array): Promise<ImageBitmap>` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L266)
- `load(file: { path: string }): Promise<ImageBitmap>` **Grant:** `fs`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L268)
- `decodeAnimation(source: Blob | Uint8Array | { path: string }, options?: { width?: number; height?: number; fps?: number }): Promise<AnimatedImage>` Opens an animated source (tgs/webm/mp4) for reading. **Grant:** `fs to name a file`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L277)
- `createEncoder(options: { type?: 'video/mp4'; width: number; height: number; fps?: number; bitrate?: number }): Promise<VideoEncoder>` create a video encoder *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L298)
- `loadFont(family: string, source: Blob | Uint8Array | { path: string }): Promise<void>` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L311)
- `listFonts(): Promise<FontEntry[]>` Lists fonts available for `CanvasRenderingContext2D.font`. Device fonts appear only when enabled in the app's font settings. An unlisted name may still resolve to a device font, or may not resolve at all. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts#L318)

## inu.android

Helpers for the Android side: the current screen, bundles, native views.

- `bundle(values: Record<string, boolean | number | bigint | string | Uint8Array | JavaObject>): JavaObject` Create an Android `Bundle` from a JS object. Supported value types: - `number` (`putInt`, `putLong` or `putDouble`) - `bigint` (`putLong`) - `boolean` - `string` - `Uint8Array` - Bundle-compatible Java objects such as `Parcelable`, `IBinder`, and `Serializable` values. **Grant:** `unsafe.jvm`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L25)
- `getPluginsDir(): string` Get a full path to the plugins installation directory **Grant:** `unsafe.fs`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L32)
- `getCacheDir(): string` Get a full path to the app cache directory **Grant:** `unsafe.fs`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L38)
- `getMediaDir(type: 'files' | 'images' | 'videos' | 'audios' | 'documents'): string` Get a full path to the media directory, of the specified type **Grant:** `unsafe.fs`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L44)
- `getCurrentFragment(): JavaObject | null` Get a reference to the currently visible `Fragment` **Grant:** `unsafe.jvm`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L51)
- `getCurrentActivity(): JavaObject | null` Get a reference to the currently visible `Activity` **Grant:** `unsafe.jvm`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L57)
- `resourceIcon(name: string): UIIcon` Get a `UIIcon` from `R.drawable.{name}` **Limits: 128 characters per name.** [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L64)
- `rawAnimation(name: string, options?: icons.LottieOptions): UIIcon` Get a `UIIcon` from a Lottie JSON animation from `R.raw.{name}` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L69)
- `drawableIcon(drawable: JavaObject): UIIcon` Get a `UIIcon` from a manual Java `Drawable` **Grant:** `unsafe.jvm`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L76)
- `nativeView(view: JavaObject): UIElement` Get a `UIElement` from a manual Java `View` **Grant:** `unsafe.jvm`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.d.ts#L83)

## inu.jvm

Java reflection. See [JVM reflection](/entinygram/docs/jvm).

- `routine(body: JvmRoutineBody): JvmRoutineRunnable` Runs Java operations on the calling thread, without ever touching JS. Can be used as a `defineClass` body, a `Runnable`, or an `inu.xposed` hook filter. Function body is compiled by `@inugram/cli`. Supported JS subset: - `const`/`let` declarations - `if` - `while`/`do`/`for`/`for of` with `break`/`continue` - `switch` - `try`/`catch`/`finally` - `throw` - `return` - math operators: - `+` concatenates if either operand is text - `/` does integer division if both args are integers - other math operators work as expected - `===`/`!==` (coerced comparisons are NOT supported) - `inu.jvm.callSuper` and `inu.jvm.getSuper`, the only `inu` members available - expressions on Java values. Unsupported syntax is a build error with a source location. Captured values, including arrays, are **snapshots** taken when the routine is created. Unload cancels running routines, but cannot interrupt a Java call already in progress. **Limits: 1024 instructions, 256 slots, 256 captures, 512 live routines, 1 MB of captures, 250 ms per run.** *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L221)
- `runnable(callback: () => void): JavaObject` Wraps a JS function in a `java.lang.Runnable`, preserving its closure. Runs synchronously on the calling thread; promise continuations run later on the plugin thread. A call from the plugin thread through `inu.jvm` runs the callback nested. Entry from inside another of this plugin's callbacks on the same thread throws IllegalStateException. A stopped plugin, or another app thread holding the engine for over 2 s, skips the callback. Do not wait synchronously for another thread that may call into the same plugin. **Limits: 2 s to acquire the engine.** *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L236)
- `cls(name: string): JavaClass` Get a Java class by its FQN [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L239)
- `fromTl(value: TLObject): JavaObject` Converts a TL value to a `JavaObject` for calling methods or passing to app code. If the object is backed by Java, returns the existing object, otherwise creates a new `TLObject` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L245)
- `toTl(value: JavaObject): TLObject` Returns a writable TL view of a `JavaObject`. Throws a `TypeError` if the handle is not a `TLObject`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L252)
- `loadDex(path: string | Uint8Array): void` Load a DEX file from a path or Uint8Array **Note**: avoid using this API when possible. If you need to load a DEX in your plugin, please talk to us about your use-case [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L260)
- `defineClass(spec: JvmClassSpec): DefinedClass` Defines a public JVM class, by default extending Object with a no-arg `super()` constructor. Types accept primitive or fully qualified class names, `[]` arrays, and JVM descriptors. Omitted params/returns use an unambiguous inherited signature, or `()void`. Fields are public with Java defaults. Static methods receive the JavaClass as `self`. Bodies and initializers accept sync JS functions or `inu.jvm.routine` objects. A JS body may return an array of scalars and handles, which Java receives as an `Object[]`. JS errors become `IllegalStateException`; recursive JS entry is rejected. After unload, void callbacks do nothing and other methods fail. Java calls cannot be interrupted. **Note**: Due to ART limitations, generated classes **cannot** be unloaded. To work around that, by default classes get a randomly generated name, available in `DefinedClass.name` If you pass a specific class name, a full app restart will be required for the changes to take effect **Limits: 128 classes per engine, 256 fields and 256 methods per class (including constructors and covariant bridges), 64 interfaces, 64 parameters, 1 MB for definitions/captures, 64 nested calls sharing a 250 ms admission budget.** *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L283)
- `defineClass(name: string, spec: JvmClassSpec): DefinedClass` *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L285)
- `callSuper(cls: JavaClass, self: JavaObject, method: string, ...args: any[]): any` Calls `method` the way `super.method(...args)` written inside `cls` would: resolved on the superclass of `cls`, and running that implementation even if `self` overrides it. `self` must be an instance of `cls`. Overloads are picked like `JavaObject.call`. Available inside `inu.jvm.routine` and `inu.xposed.routine` bodies as well. Throws a `TypeError` if `cls` has no superclass, or the picked method is abstract. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L300)
- `getSuper(self: JavaObject): any` `super` for a routine used as a `inu.jvm.defineClass` body, which cannot capture the class it is defining: `inu.jvm.getSuper(this).method(...args)` is `inu.jvm.callSuper` on the class the routine is bound to. Only available in `inu.jvm.routine` bodies, and only called through directly. A routine run outside a defineClass body throws there. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts#L314)

## inu.xposed

Method hooks. See [Method hooks](/entinygram/docs/xposed).

- `routine(body: (ctx: RoutineContext) => void): XposedRoutineRunnable` Creates a hook that runs on the hooked thread without a JS callback. Uses the same compiled subset as `inu.jvm.routine`, with a context parameter. Set results through `setReturnValue`; `return` cannot take a value, and `this` is unavailable. Both arrows and function expressions are supported. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L79)
- `hookMethod(method: JavaMethod, hook: MethodHook): Disposer` Hook a Java method with an Xposed-style hook. `before` hooks run in registration order, `after` hooks are run in reverse order. Setting a result in a before hook skips later plugins and the original method. Each plugin receives its own context. Recursive calls during a callback skip that plugin's hooks. Calls made by the original method still run hooks normally. Disposing your hook leaves other plugins' hooks active. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L144)
- `hookAllOverloads(cls: JavaClass, name: string, hook: MethodHook): Disposer` Hook all overloads of a class method by its name *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L151)
- `hookAllConstructors(cls: JavaClass, hook: MethodHook): Disposer` Hook all constructors of a class *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L158)
- `callOriginalMethod(method: JavaMethod | JavaConstructor, thisObject: JavaObject | null, args: any[]): any` Calls the original member, bypassing all plugins' hooks. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L165)
- `allocateInstance(cls: JavaClass): JavaObject` Create an instance of the class without running any constructor, via JNI `AllocObject`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L168)
- `disableProfileSaver(): boolean` Disable Android Profile Saver for the process. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts#L171)

## Objects you get back

The main shapes you handle once you have an account or a message.

### Account

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L309).

- `readonly id: number` opaque slot of the account [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L311)
- `readonly userId: number` id of the user this account represents [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L314)
- `isCurrent(): boolean` whether this is the currently active account [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L317)
- `isPremium(): boolean` whether this account has Telegram Premium active **Grant:** `account.read(self)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L324)
- `suppressNotifications(): Disposer` Suppresses app notifications for this account until the returned `Disposer` runs or the plugin unloads. Suppression remains active while any hold exists. App-wide suppression also applies to this account. **Grant:** `notifications.suppress`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L333)
- `getMe(): tl.TypeUser | null` get the user this account represents **Grant:** `account.read(self)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L340)
- `getUser(peer: InputPeerLike): tl.TypeUser | null` get a user (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L347)
- `getChat(peer: InputPeerLike): tl.TypeChat | null` get a chat (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L353)
- `getPeer(peer: InputPeerLike): tl.TypeUser | tl.TypeChat | null` get a user or a chat (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L359)
- `getDialog(peer: InputPeerLike): tl.TypeDialog | null` get a dialog with a specific peer (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L365)
- `isDialogMuted(peer: InputPeerLike, options?: { topicId?: number }): boolean` Whether the app considers this dialog muted. Combines account defaults, dialog overrides, and topic overrides when a topic is specified. Unknown dialogs are not muted. **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L372)
- `previewMessage(message: Message | tl.TypeMessage, options?: { hideSpoilers?: boolean }): TextWithEntities` The app's message preview: message text, a media label such as "📷 Photo", or a service message in the app's language. Entities describe the preview, not the original message. `hideSpoilers` masks spoilers and removes entities covering masked text. Media labels are unchanged. **Grant:** `account.read(messages)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L383)
- `getTopicCached(peer: InputPeerLike, topicId: number): tl.TypeForumTopic | null` Returns a cached forum topic, or `null` if missing or the peer is not a forum. Never uses the network; use `getTopics` to fetch topics. **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L391)
- `getUsers(peers: InputPeerLike[]): (tl.TypeUser | null)[]` get one or more users (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L398)
- `getChats(peers: InputPeerLike[]): (tl.TypeChat | null)[]` get one or more chats (cached, this method never does a network call, and returns `null` on miss) **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L403)
- `getMessagesCached(peer: InputPeerLike, messageId: number): Message | null` Reads locally stored messages without using the network. Returns `null` for missing messages. May block on a database read; use `getHistory` to read a range instead of looping. **Grant:** `account.read(messages)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L413)
- `getMessagesCached(peer: InputPeerLike, messageIds: number[]): (Message | null)[]` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L414)
- `getMessages(peer: InputPeerLike, messageId: number): Promise<Message | null>` get one or more messages, *always* fetching them from the server **Grant:** `account.read(messages)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L423)
- `getMessages(peer: InputPeerLike, messageIds: number[]): Promise<(Message | null)[]>` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L424)
- `getMessageFile(message: Message | tl.TypeMessage): { path: string, exists: boolean } | null` get an app-owned file representing the attachment of a message **Grant:** `account.read(messages)`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L433)
- `downloadMedia(message: Message | tl.TypeMessage, options?: { onProgress?: ProgressCallback }): Promise<File>` download a message's attachment to a File **Grant:** `account.read(messages)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L440)
- `downloadMediaToFile(message: Message | tl.TypeMessage, options?: { onProgress?: ProgressCallback }): Promise<{ path: string }>` download a message's attachment to a file, and return the path **Grant:** `account.read(messages)`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L452)
- `uploadFile(file: Blob | Uint8Array | { path: string }, options?: { fileName?: string; onProgress?: ProgressCallback }): Promise<tl.TypeInputFile>` `{ path }` names a file the way `fs` does, and needs its grant. **Limits: 256 MB per staged copy, for all write operations.** **Grant:** `account.write(send)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L463)
- `createLocalMedia(file: Blob | Uint8Array | { path: string }, options?: { fileName?: string; asDocument?: boolean }): Promise<LocalMedia>` Stages a file for an outgoing message's `OutgoingMessage.media`, where the app processes and uploads it like a file the user picked. Expires 10 minutes after it was created if no send takes it. `{ path }` names a file the way `fs` does, and needs its grant. Keep it available for upload and retries after the send. **Limits: 256 MB per staged copy, for all write operations.** **Grant:** `account.write(send)`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L482)
- `getUserFull(peer: InputPeerLike): Promise<tl.TypeUserFull | null>` **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L490)
- `getChatFull(peer: InputPeerLike): Promise<tl.TypeChatFull | null>` **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L492)
- `getDialogs(options?: { folderId?: number; limit?: number; fields?: readonly string[]; cursor?: Cursor<'dialogs'> }): Promise<Paged<tl.TypeDialog, 'dialogs'>>` `fields` preloads selected fields for faster reads, as in `getDialogsCached`. **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L499)
- `iterDialogs(options?: { folderId?: number; limit?: number; batchSize?: number; fields?: readonly string[] }): AsyncIterableIterator<tl.TypeDialog>` **Grant:** `account.read(dialogs). `batchSize` defaults to Telegram's page size of 100. `fields` applies to every page.`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L509)
- `getDialogsCached(options?: { archive?: 'exclude' | 'only' | 'keep'; chatFolderId?: number; limit?: number; fields?: readonly string[] }): Promise<tl.TypeDialog[]>` Returns all cached dialogs in chat-list order: pinned first, then by date. Does not use the network or paginate. Resolves on the next turn; unavailable in synchronous contexts such as an `inu.xposed` phase. `archive` selects the main list (`'exclude'`, the default), the archive (`'only'`), or both (`'keep'`). `chatFolderId` selects a folder from `getChatFoldersCached` instead. Specifying both options throws a `TypeError`; folders have their own archive rules. `fields` preloads selected fields for faster reads. Other fields remain readable. **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L529)
- `getChatFoldersCached(): Promise<ChatFolder[]>` Returns cached chat folders in tab order. Asynchronous, like `getDialogsCached`. **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L541)
- `getHistory(peer: InputPeerLike, options?: { limit?: number; offsetId?: number; minId?: number; maxId?: number; topicId?: number; force?: boolean }): Promise<Message[]>` Get chat history in a specific dialog, preferring data from the local cache. **Grant:** `account.read(history)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L549)
- `iterHistory(peer: InputPeerLike, options?: { limit?: number; offsetId?: number; minId?: number; maxId?: number; batchSize?: number; topicId?: number; force?: boolean }): AsyncIterableIterator<Message>` **Grant:** `account.read(history)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L563)
- `getTopics(peer: InputPeerLike, options?: { limit?: number; cursor?: Cursor<'topics'> }): Promise<Paged<tl.TypeForumTopic, 'topics'>>` Get topics in a specific forum **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L583)
- `iterTopics(peer: InputPeerLike, options?: { limit?: number; batchSize?: number }): AsyncIterableIterator<tl.TypeForumTopic>` **Grant:** `account.read(dialogs)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L588)
- `resolvePeer(peer: InputPeerLike): Promise<tl.TypeInputPeer>` Resolve an `InputPeer` from `InputPeerLike` **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L598)
- `resolvePeerCached(peer: InputPeerLike): tl.TypeInputPeer | null` Resolve an `InputPeer` from `InputPeerLike`, without hitting the network, returning `null` on miss **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L604)
- `resolveUser(peer: InputPeerLike): Promise<tl.TypeInputUser>` Resolve an `InputUser` from `InputPeerLike` **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L611)
- `resolveChannel(peer: InputPeerLike): Promise<tl.TypeInputChannel>` Resolve an `InputChannel` from `InputPeerLike` **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L618)
- `resolvePeerMany(peers: InputPeerLike[]): Promise<(tl.TypeInputPeer | null)[]>` **Limits: 8 resolutions in flight.** **Grant:** `account.read(peers)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L625)
- `sendMessage(peer: InputPeerLike, text: InputText, options?: { replyToMessageId?: number; topicId?: number; silent?: boolean; scheduleDate?: number; noWebpage?: boolean; sendAs?: InputPeerLike; clearDraft?: boolean; op…` send a text message **Grant:** `account.write(send)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L634)
- `sendMedia(peer: InputPeerLike, file: Blob | Uint8Array | tl.TypeInputFile | tl.TypeInputMedia | { path: string }, options?: { caption?: InputText; replyToMessageId?: number; topicId?: number; silent?: boolean; schedul…` send a message containing a media **Grant:** `account.write(send)`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L678)
- `sendMultiMedia(peer: InputPeerLike, items: { file: Blob | Uint8Array | tl.TypeInputFile | tl.TypeInputMedia | { path: string }; caption?: InputText; fileName?: string; asDocument?: boolean }[], options?: { replyToMess…` send an album **Grant:** `account.write(send)`. *Experimental.* [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L723)
- `editMessage(peer: InputPeerLike, messageId: number, text: InputText, options?: { noWebpage?: boolean }): Promise<Message>` edit a message **Grant:** `account.write(edit)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L759)
- `deleteMessages(peer: InputPeerLike, messageIds: number[], options?: { revoke?: boolean }): Promise<void>` delete one or more messages **Grant:** `account.write(delete)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L771)
- `forwardMessages(fromPeer: InputPeerLike, messageIds: number[], toPeer: InputPeerLike, options?: { silent?: boolean; scheduleDate?: number; topicId?: number; dropAuthor?: boolean; dropCaption?: boolean }): Promise<Mess…` forward one or more messages **Grant:** `account.write(forward)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L784)
- `setReaction(peer: InputPeerLike, messageId: number, reactions: (string | { customEmojiId: string })[], options?: { big?: boolean }): Promise<void>` send or retract a reaction on a message **Grant:** `account.write(react)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L805)
- `readHistory(peer: InputPeerLike, options?: { maxId?: number; topicId?: number }): Promise<void>` mark messages as read **Grant:** `account.write(read)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L815)
- `sendTyping(peer: InputPeerLike, action?: | 'typing' | 'cancel' | 'recordVideo' | 'uploadVideo' | 'recordVoice' | 'uploadVoice' | 'uploadPhoto' | 'uploadDocument' | 'chooseSticker' | 'chooseContact', options?: { topicI…` send a typing status **Grant:** `account.write(typing)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L829)
- `getDraft(peer: InputPeerLike, options?: { topicId?: number }): TextWithEntities | null` **Grant:** `account.read(draft)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L849)
- `setDraft(peer: InputPeerLike, draft: InputText | null, options?: { topicId?: number; replyToMessageId?: number }): Promise<void>` **Grant:** `account.write(draft)`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L851)
- `invokeRpc<T extends tl.TypeRpcMethod>(params: T): Promise<tl.RpcCallReturn[T['_']] | null>` invoke a raw mtproto rpc method **Grant:** `invokeRpc`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L861)
- `invokeRaw(method: Uint8Array): Promise<Uint8Array | null>` invoke a raw mtproto rpc method, given its TL serialization, and return the TL serialization of the server's response ⚠️ this method is primarily intended for **advanced users**, primarily for cases where you want to call a method that is not yet supported by the current app's layer. beware that can cause the app to crash or otherwise misbehave, due to the server "bumping" the layer. in almost all cases, you should use `invokeRpc` instead. **Grant:** `unsafe.invokeRaw`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L875)
- `initTakeoutSession(options?: { contacts?: boolean; messageUsers?: boolean; messageChats?: boolean; messageMegagroups?: boolean; messageChannels?: boolean; fileMaxSize?: number }): Promise<TakeoutSession>` Opens a takeout session with higher rate limits for history reads. Call `TakeoutSession.finish` when done; Telegram keeps the session until then. **Grant:** `takeout`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L883)

### Message

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L196).

- `readonly raw: tl.TypeMessage` Raw TL object of the message [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L200)
- `isService(): boolean` Whether the message is a service message [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L202)
- `id(): number` Message ID [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L205)
- `groupedId(): string | null` If the message belongs to an album, ID of the album [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L207)
- `dialogId(): number | null` ID of the dialog where the message was sent [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L210)
- `topicId(): number | null` ID of the topic where the message belongs [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L212)
- `senderId(): number | null` ID of the message sender [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L214)
- `date(): number` Date of the message, as a unix date in seconds [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L216)
- `editDate(): number | null` Date when the message was edited, as a unix date in seconds [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L218)
- `out(): boolean` Whether this message is outgoing [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L220)
- `text(): string` Plain text of the message [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L222)
- `textWithEntities(): TextWithEntities` Formatted text of the message [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L224)
- `media(): tl.TypeMessageMedia | null` Media inside the message, if any [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L227)
- `document(): tl.TypeDocument | null` Document inside the message, if any [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L229)
- `mediaType(): MediaType | null` Type of the media in the message, if any [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L232)
- `duration(): number | null` For playable media types, duration of the media [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L235)
- `replyToMessageId(): number | null` If the message is a reply to another message, ID of that message [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L238)
- `forwardedFrom(): tl.TypeMessageFwdHeader | null` If the message is a forward, info about that [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L240)
- `viaBotId(): number | null` If the message was sent via an inline bot, ID of that bot [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L242)
- `isPinned(): boolean` Whether the message is pinned [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L244)
- `views(): number | null` View count of the message, if available [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L246)
- `forwards(): number | null` Forwards count of the message, if available [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L248)
- `reactions(): tl.TypeMessageReactions | null` Reactions on the message, if any [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L250)
- `toJSON(): tl.TypeMessage` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L252)

### TakeoutSession

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L896).

- `readonly id: string` the session's int64 id, as a string [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L898)
- `invokeRpc<T extends tl.TypeRpcMethod>(params: T): Promise<tl.RpcCallReturn[T['_']] | null>` invoke a raw mtproto rpc method, wrapped in `invokeWithTakeout` **Grant:** `takeout, plus `invokeRpc` for the method being called`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L905)
- `finish(success?: boolean): Promise<boolean>` closes the session server-side; `success` defaults to `true`. **Grant:** `takeout`. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L908)

### ChatFolder

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L256).

- `id: number` `0` is the "All chats" tab, which every account has and which cannot be edited. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L258)
- `title: TextWithEntities` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L259)
- `emoticon: string | null` The folder's emoji, or `null` if unset. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L261)
- `colorIndex: number | null` Telegram's folder colour, `0`-`7` into its own palette - not an ARGB value. `null` when the folder has no colour. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L263)
- `unreadCount: number` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L264)
- `dialogCount: number` The number of dialogs `Account.getDialogsCached` currently returns for this folder. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L266)
- `isDefault: boolean` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L267)
- `isChatlist: boolean` A shared folder, added from an invite link. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L269)
- `pinned: number[]` The folder's pinned dialogs, in the order they are pinned. [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L271)

### RpcError

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L79).

- `code: number` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L81)
- `text: string` [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L82)

### PluginError

Defined in [`common.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L86).

- `code: | 'not-granted' | 'forbidden' | 'quota-exceeded' | 'handle-expired' | 'unknown-constructor' | 'not-found' | 'unsupported' | 'timed-out' | 'aborted' | 'network' | 'internal' | (string & {})` Error code: - `not-granted`: You are trying to use an API you haven't specified a `@grant` for - `forbidden`: You are trying to access a protected resource - `quota-exceeded`: You are trying to use more resources than the quota allows (fs, timers, native memory, actions, etc.) - `handle-expired`: You are trying to read data from an expired/disposed handle. - `unknown-constructor`: You are trying to use an unknown TL constructor - `not-found`: You are trying to access something that doesn't exist - `unsupported`: You are trying to use an unsupported API - `timed-out`: Your operation has timed out - `aborted`: You operation was aborted - `network`: Some network-related issue happened - `internal`: An internal plugin engine error happened, please report this [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L101)
- `grant?: string` If `code == 'not-granted'`, the grant you're missing [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L116)
- `usage?: number` If `code == `quota-exceeded'`, the current quota usage [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L118)
- `quota?: number` If `code == `quota-exceeded'`, the current quota limit [↗](https://github.com/entinyGram/plugins/blob/main/sdk/types/common.d.ts#L120)
