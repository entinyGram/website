# Method hooks

`inu.xposed` provides Xposed-style method hooking: run your code before and after an app method, change its arguments, and replace its result.

> [!EXPERIMENTAL]
> Hook registration, contexts, filters, routines and `callOriginalMethod` are experimental, including callback timing and composition rules.

> [!DANGER]
> It is the most powerful and the most dangerous API a plugin has. It needs both `unsafe.xposed` and `unsafe.jvm`.

Hooking works in-process on a stock, non-rooted device. Some devices or Android versions may not support it. Then every hook call throws `unsupported`, and your plugin should carry on without it.

## Hooking a method

```ts
const Activity = inu.jvm.cls('android.app.Activity')
const onResume = Activity.getDeclaredMethod('onResume')
const off = inu.xposed.hookMethod(onResume, {
  after(ctx) {
    console.log('resumed', ctx.thisObject?.call('getLocalClassName'))
  },
})
```

- `hookMethod(method, hook)` hooks one specific method or constructor handle.
- `hookAllOverloads(cls, name, hook)` hooks every overload the class declares with that name.
- `hookAllConstructors(cls, hook)` hooks every declared constructor.

All of them return a disposer that removes the hook. Classes that back primitive boxing (`java.lang.Integer` and friends) cannot be hooked, because the hooking system itself uses them.

## Phases and the context

A hook can have a `before` phase, an `after` phase, or both. Each receives a context for the current call:

| Member | Meaning |
| --- | --- |
| `thisObject` | the receiver, `null` for a static method |
| `method` | the hooked method |
| `args` | the arguments, editable in `before` only |
| `returnValue`, `throwable` | the outcome, available in `after` only |
| `setReturnValue(v)` | in `before`: skip the original and return `v`. In `after`: replace the result |
| `setThrowable(t)` | in `before`: skip the original and throw `t`. In `after`: replace the outcome with an error |
| `extra` | any JavaScript values you want to carry from `before` to `after` of the same call |

```ts
const JMath = inu.jvm.cls('java.lang.Math')
inu.xposed.hookMethod(JMath.getDeclaredMethod('floorMod(II)I'), {
  before(ctx) {
    ctx.args[1] = 7
    ctx.extra = Date.now()
  },
  after(ctx) {
    if (ctx.returnValue === 0) ctx.setReturnValue(1)
  },
})
```

Things to know:

- Use `setReturnValue` and `setThrowable`, **not** `ctx.returnValue = x`.
- Changed arguments are converted to the parameter types with the [value rules](/entinygram/docs/jvm#values-crossing-the-bridge).
- A result you set must fit the return type.
- Values in `ctx` are read lazily and only while the call is running. Read what you need inside the phase. Keeping `ctx` and reading it later throws `handle-expired`.
- If your callback throws, the error is logged and the call continues as if the phase did nothing. A hook never crashes app code by accident. `setThrowable` is how you throw on purpose.

## Several hooks, several plugins

Many plugins can hook the same method. The app keeps one real hook and chains them. `before` phases run in registration order, and `after` phases in reverse order.

`inu.xposed.callOriginalMethod(method, thisObject, args)` calls the original, skipping every hook.

## Threads

A hooked method runs on whatever thread called it: the UI thread, a network thread, a background worker. Your JavaScript phases run **on that thread**, synchronously, while the app waits.

To run JavaScript there, the thread has to borrow your plugin's engine, which only one thread can use at a time (see [The engine](/entinygram/docs/engine) and [JVM reflection](/entinygram/docs/jvm#callbacks-into-javascript)). The hooked thread waits for it. Your plugin thread hands the engine over whenever it is inside a Java call made through `inu.jvm` or `callOriginalMethod`, so the wait is at most one JavaScript turn. The 250 ms phase budget starts once the hook has the engine, and Java calls the hook makes count toward it.

A JavaScript phase is skipped when:

- another app thread holds your engine for over two seconds,
- the hooked thread is already inside another of your callbacks, for example a runnable that called a hooked method,
- the call happened inside one of your own hook phases (the recursion rule),
- the plugin is stopping or stopped.

`before` and `after` are entered separately, so `after` can be skipped even though `before` ran.

What this means for you:

- **Prefer a routine hook for security or privacy features.** A JavaScript phase can be skipped in the edge cases above. Routine hooks are always run.
- Keep all synchronous work in your plugin short. A long loop on the plugin thread stalls everything else.
- Every JavaScript phase costs a thread handoff. On a hot method (layout, drawing, message binding, anything called per list item) that adds up fast.

## Routine hooks

A routine is a small function written in a subset of JavaScript, compiled to bytecode and executed entirely in Java. It never enters the JavaScript engine, so it does not wait for it. See [Routines](/entinygram/docs/routines).

```ts
const Window = inu.jvm.cls('android.view.Window')
const FLAG_SECURE = 0x2000
inu.xposed.hookAllOverloads(Window, 'setFlags', {
  before: inu.xposed.routine((ctx) => {
    ctx.args[0] = ctx.args[0] & ~FLAG_SECURE
    ctx.args[1] = ctx.args[1] & ~FLAG_SECURE
  }),
})
```

## Filters: a routine gate and a JavaScript body

Sometimes you really need a JavaScript hook, but only in a few cases. Combine a routine filter with a JavaScript hook:

```ts
const TextView = inu.jvm.cls('android.widget.TextView')

// don't: every setText call enters JavaScript
const bad = inu.xposed.hookAllOverloads(TextView, 'setText', {
  before(ctx) {
    if (ctx.args[0] !== 'secret') return
    ctx.args[0] = '[hidden]'
  },
})

// do: the routine filter decides in Java, JavaScript runs only on a match
const good = inu.xposed.hookAllOverloads(TextView, 'setText', {
  filter: inu.jvm.routine((text) => {
    return text !== null && text.toString().contains('secret')
  }),
  before(ctx) {
    ctx.args[0] = '[hidden]'
  },
})
```

In the filter, `this` is the receiver and its parameters are the call's arguments. If the filter throws, the hook runs anyway.

## Other helpers

- `inu.xposed.allocateInstance(cls)` creates an object without running any constructor.
- `inu.xposed.disableProfileSaver()` turns off the ART profile saver for the process. Use it only if you notice hooks not running on an ART-optimized method. It is rarely needed.

## Practical advice

- **Hook the narrowest thing.** One method, with a filter, is better than all overloads of a popular class.
- **Register each hook on its own and catch errors.** A method that is missing in some app build should disable one hook, not the whole plugin.

  ```ts
  function tryHook(label: string, install: () => void) {
    try {
      install()
    } catch (e) {
      console.warn(`${label} hook unavailable`, e)
    }
  }
  ```

- **Find what to hook** by decompiling the app (jadx) and reading the class that draws or decides the thing you want to change. Hook a method with a descriptor, such as `'formapMapUrl(IDDIIZII)Ljava/lang/String;'`, so the right overload is chosen.
- **Do not hook per frame** unless it is a routine. A JavaScript hook in drawing code will make the app stutter.
- **Test on more than one device.** Hooking support differs between devices and Android versions.

## Source and further reading

- [`sdk/types/android.xposed.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/android.xposed.d.ts): the `inu.xposed` typings
- [`PluginXposed.kt`](https://github.com/entaytion/entinyGram/blob/main/src/fork/helpers/plugins/platform/PluginXposed.kt): the host side of hooking
- [`plugins/calendar-systems`](https://github.com/entinyGram/plugins/tree/main/plugins/calendar-systems), [`plugins/call-avatar`](https://github.com/entinyGram/plugins/tree/main/plugins/call-avatar), [`plugins/text-animation`](https://github.com/entinyGram/plugins/tree/main/plugins/text-animation): real hooks, explained in [Worked examples](/entinygram/docs/examples)
- [`xposed.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/xposed.md) in Inugram: the original page
