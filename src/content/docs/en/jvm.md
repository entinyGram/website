# JVM reflection

`inu.jvm` gives a plugin low level access to the app's Java code through reflection. With it you can read any class, call any method, read and write fields, create objects and implement interfaces, all from JavaScript.

> [!DANGER]
> This API is unsandboxed. It needs the `unsafe.jvm` grant, and a plugin that holds it can do almost anything the app can. Use it only when the safe API cannot do what you need, and expect it to break when Telegram changes its internals.

## Classes, objects and members

```ts
const ArrayList = inu.jvm.cls('java.util.ArrayList')
const list = new ArrayList()
list.call('add', 'hello')
const size: number = list.call('size')

const Integer = inu.jvm.cls('java.lang.Integer')
const max: number = Integer.getStaticField('MAX_VALUE')
const parsed: number = Integer.callStatic('parseInt', '42')
```

- `inu.jvm.cls(name)` takes a fully qualified name as ART sees it. Use [jadx](https://github.com/skylot/jadx) on the APK if you are unsure of a name. Nested classes use `$`: `org.telegram.tgnet.TLRPC$TL_messageEntityBold`.
- `cls` only finds the class. It does not run its static initializers.
- A class handle can be used with `new`. It also has accessors for methods, fields and constructors.
- `obj.call(name, ...args)`, `obj.getField(name)`, `obj.setField(name, value)` work on instances. `cls.callStatic`, `cls.getStaticField` and `cls.setStaticField` work on classes.
- Most of `inu.jvm` is untyped, so take extra care.

## Handles

Every Java object you get back is a **handle**: a JavaScript object backed by a Java object for as long as it is not garbage collected.

- Each call that returns an object gives you a new handle, even for the same Java object. Do not compare handles with `===`. Ask Java: `a.call('equals', b)`, or compare `System.identityHashCode`.
- A handle is released only by garbage collection.
- All handles die when the plugin unloads.
- Handles do not survive a reload. Store data, not handles.

## Values crossing the bridge

Scalars and strings cross as values. Everything else crosses as a handle.

| JavaScript | Java |
| --- | --- |
| `null`, `undefined` | `null` |
| `boolean` | `boolean` or `Boolean` |
| an integral `number` (including `2.0`) | any integer or float type it fits exactly |
| a fractional `number` | `double`, or `float` if in range |
| `bigint` | any integer type it fits (it must fit a `long`) |
| `string` | `String`, or `char` or `Character` if exactly one UTF-16 unit |
| `Uint8Array` | `byte[]` (copied) |
| a handle | the object, if it is an instance of the parameter type |

Going back:

| Java | JavaScript |
| --- | --- |
| `byte`, `short`, `int`, `float`, `double` and their boxes | `number` |
| `long` or `Long` | `number` when within 2^53, otherwise `bigint` |
| `char`, `Character`, `String` | `string` |
| `byte[]` | `Uint8Array` (copied) |
| anything else | a handle |

Things to keep in mind:

- A number is never truncated. Passing `300` where a `byte` is expected does not match that parameter, and `1.5` does not match an `int`.
- Plain objects, arrays, functions and symbols cannot be passed. They throw a `TypeError`. Build a Java collection, or use `inu.android.bundle` for a `Bundle`.
- A string or byte array over 1 MB is refused with `quota-exceeded` in either direction.
- A `long` that is small comes back as a `number`. Check with `typeof x === 'bigint'` only if the value can really be large, or normalize with `BigInt(x)`.

## Overloads

A call picks an overload from the **runtime** values you pass. There is no static type information. The overload is resolved by the number of arguments and their types. If zero or several overloads match, the call throws a `TypeError` and lists a few descriptors.

To pick an exact overload, use the Dalvik descriptor:

```ts
const StringBuilder = inu.jvm.cls('java.lang.StringBuilder')
const sb = new StringBuilder()
sb.call('append(C)Ljava/lang/StringBuilder;', 'a')

const ArrayList = inu.jvm.cls('java.util.ArrayList')
const sized = ArrayList.getDeclaredConstructor('(I)V').newInstance(16)
const add = ArrayList.getDeclaredMethod('add(Ljava/lang/Object;)Z')
add.invoke(sized, 'x')
```

- `getDeclaredMethod(name)` works without a descriptor only when the name is not overloaded.
- `getDeclaredConstructor` always takes a descriptor, such as `(I)V`.
- A pinned member still checks your arguments and throws a `TypeError` if they do not fit.
- Lookups are cached per class, so repeated calls are cheap.

## Errors

Three kinds of errors reach your code:

- Arguments that do not fit, or an ambiguous overload, throw a `TypeError`.
- A refusal from the bridge is an `inu.PluginError` with a `code`: `not-found` (no such class or member), `forbidden` (reaching for the plugin engine's internals), `handle-expired`, or `quota-exceeded`.
- An exception thrown by the Java code is a plain `Error`. Its message starts with the Java exception class, for example `java.lang.NumberFormatException: ...`.

```ts
const Integer = inu.jvm.cls('java.lang.Integer')
try {
  Integer.callStatic('parseInt', 'nope')
} catch (e) {
  if (e instanceof inu.PluginError) console.log('bridge refused:', e.code)
  else console.log('java threw:', (e as Error).message)
}
```

## TL objects

The app's TL objects are often backed by real Java objects (see [Telegram API](/entinygram/docs/telegram#tl-objects)). To turn a JavaScript TL object into a Java handle, use `inu.jvm.fromTl`. It works for live and detached objects, creating a new object for the latter:

```ts
const bold = inu.jvm.fromTl({ _: 'messageEntityBold', offset: 0, length: 4 })
bold.setField('length', 5)
```

The opposite, `inu.jvm.toTl(handle)`, gives you a readable TL object.

## Callbacks into JavaScript

> [!EXPERIMENTAL]
> `inu.jvm.runnable` and JavaScript bodies in `defineClass` have experimental callback contracts, including threading and reentrancy.

Java code often wants a callback: a `Runnable`, a listener, an overridden method. There are two ways to give it one:

- **JavaScript callbacks** (`inu.jvm.runnable`, and JavaScript bodies in `defineClass`) run your function in QuickJS.
- **Routines** (`inu.jvm.routine`) run a compiled program without entering JavaScript. See [Routines](/entinygram/docs/routines).

A JavaScript callback runs on **whatever thread Java calls it on**. To run your code there, that thread has to borrow your plugin's engine, which only one thread can hold at a time. That gives a few rules:

- If another thread holds the engine, the caller waits. The plugin thread holds the engine only while its JavaScript runs, and hands it over during any Java call it makes through `inu.jvm`, so the wait is at most one JavaScript turn (two seconds at worst, usually far less).
- If another app thread holds the engine for over two seconds, the callback is skipped (a runnable) or fails with `IllegalStateException` (a `defineClass` body).
- A Java call that your plugin thread makes can call back into your callbacks on the same thread. They run nested, like a normal function call.
- A callback that re-enters its own plugin from inside another callback on the same thread is refused.
- After the plugin unloads, runnables do nothing, `void` bodies do nothing, and other bodies throw `IllegalStateException`.
- Promise continuations and timers started in a callback run later, on the plugin thread.
- Many APIs work only on the plugin thread and throw inside a callback.

### `inu.jvm.runnable`

Wraps a JavaScript function in a `java.lang.Runnable`:

```ts
const Handler = inu.jvm.cls('android.os.Handler')
const Looper = inu.jvm.cls('android.os.Looper')
const handler = new Handler(Looper.callStatic('getMainLooper'))
handler.call('post', inu.jvm.runnable(() => {
  inu.ui.toast('hello from the main thread')
}))
```

A runnable is skipped only when another app thread sits on your engine for more than two seconds, or the plugin is stopping. For paths that must always run, use a routine.

## Defining classes

> [!EXPERIMENTAL]
> `defineClass`, its specification types, `callSuper` and `getSuper` may change.

`inu.jvm.defineClass` generates a real Java class at run time. Use it to implement an interface, subclass something, or give Java a listener:

```ts
const OnClickListener = inu.jvm.cls('android.view.View$OnClickListener')
const Listener = inu.jvm.defineClass({
  interfaces: [OnClickListener],
  methods: {
    onClick: (self, view) => {
      inu.ui.toast('clicked')
    },
  },
})
const listener = new Listener()
```

A fuller example with a field, a typed override, `super` and a constructor:

```ts
const ArrayList = inu.jvm.cls('java.util.ArrayList')
const Counting = inu.jvm.defineClass({
  superclass: ArrayList,
  fields: { adds: 'int' },
  methods: {
    add: {
      params: ['java.lang.Object'],
      returns: 'boolean',
      body: (self, item) => {
        self.setField('adds', self.getField('adds') + 1)
        return inu.jvm.callSuper(Counting, self, 'add', item)
      },
    },
  },
  constructors: [
    { params: ['int'], super: [{ arg: 0 }] },
  ],
})
new Counting(8).add(1)
```

How it works:

- Types are written like Java (`int`, `float[]`, `java.lang.String`) or as JVM descriptors.
- If you omit `params` or `returns`, the signature is inferred from the inherited method. With none, the method is `()void`. You can pass an array of specs to define overloads, each with explicit `params`.
- A body is a JavaScript function or a routine. JavaScript bodies receive `self` and the arguments, and may return an array of scalars and handles, which Java gets as an `Object[]`.
- The return value is converted to the declared type by the rules above. A thrown JavaScript error becomes an `IllegalStateException` in the Java caller.
- Because of Dalvik limits, `super()` has to be generated at the start of the constructor, so it is a separate fixed list or a function that computes the arguments, run before the constructor body.
- JavaScript bodies follow all the callback rules above. For bodies called often or from other threads, use a routine.

### Class names and unloading

ART cannot unload a class. A defined class lives until the app process dies, even after your plugin unloads (its bodies stop running JavaScript). So by default every class gets a random name, available as `DefinedClass.name`. Each reload defines a fresh class and there is no clash. If you pass an explicit name, the first definition wins until the app restarts, and later reloads see the old class.

Limits: 128 classes per engine, 256 fields and 256 methods per class, 64 interfaces, 64 parameters, 1 MB of definition. Nested calls into bodies are limited to 64 levels, sharing a 250 ms budget.

## Loading DEX

> [!WARNING]
> Avoid this API. DEX files are hard to audit and are usually not needed. If you find yourself needing a custom DEX, ask first.

`inu.jvm.loadDex(pathOrBytes)` loads a DEX file of up to 8 MB. Its classes become reachable through `inu.jvm.cls`.

## Android helpers

- `inu.android.getCurrentActivity()` and `inu.android.getCurrentFragment()` return the visible screen, or `null`.
- `inu.android.bundle(values)` builds a `Bundle` from a JavaScript object.
- `inu.android.nativeView(view)` turns a custom `View` into a settings row.
- `inu.android.drawableIcon(drawable)` turns a `Drawable` into an icon.
- `inu.ui.openPage(fragment)` opens a custom `Fragment` given as a handle.
- `inu.android.getPluginsDir()` and `inu.android.getCacheDir()` return folders the app uses for plugins and cache.

## A worked example

Read the density of the screen and show it:

```ts
const activity = inu.android.getCurrentActivity()
if (activity) {
  const metrics = activity.call('getResources').call('getDisplayMetrics')
  const density: number = metrics.getField('density')
  inu.ui.toast(`density ${density}`)
}
```

## Staying safe

- Wrap risky Java work in `try`/`catch`. A Java exception reaches you as a plain `Error`.
- Keep handles short lived. Do not store them across reloads.
- Prefer reading a constant once to reading it on every call.
- Expect every class and method name to change eventually. Guard hooks and lookups so one missing method does not take down the whole plugin. Many plugins register each hook on its own, so a missing method disables only that hook.

## Source and further reading

- [`sdk/types/android.jvm.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.jvm.d.ts): the `inu.jvm` typings
- [`PluginJvm.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/platform/PluginJvm.kt): the host side of the bridge
- [DrKLO/Telegram](https://github.com/DrKLO/Telegram): the classes you will be reflecting on
- [`jvm.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/jvm.md) in Inugram: the original page
