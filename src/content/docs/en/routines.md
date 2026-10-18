# Routines

> [!EXPERIMENTAL]
> The routine APIs and the semantics of their source language may change.

A routine is a small function written in a subset of JavaScript that runs **on the Java thread that calls it, without entering the JavaScript engine**. `@inugram/cli` compiles it to bytecode when you build the plugin, and the app runs that bytecode directly against Java objects.

Because the CLI compiles routines, you generally cannot use them without the CLI.

```ts
const isNumeric = inu.jvm.routine((s) => {
  return s !== null && s.matches('[0-9]+')
})
```

Routines need `unsafe.jvm`, and `unsafe.xposed` for hook routines.

## Why routines exist

Two problems, in short: JavaScript is single threaded, and crossing into Java is slow.

Your plugin's JavaScript runs in one engine owned by one thread. Java is multi threaded and can ask your code to run at any moment on any thread. For that to work the calling thread has to borrow your engine, and to do that it has to wait for pending work on the plugin thread to finish (see [The engine](/entinygram/docs/engine#threads)).

Second, every crossing between JavaScript and Java must marshal the data, forward it to ART or back, and unmarshal it. Done many times in a row it becomes a bottleneck.

A routine is compiled to bytecode that the app interprets directly, so it avoids both problems. The price: it is interpreted in ART, so it is slower than plain JavaScript for CPU heavy work. A routine is a trade made so that hooking hot paths is viable at all.

### When to use one

| Situation | Use |
| --- | --- |
| a hook on a hot method (layout, drawing, message binding, list items) | `inu.xposed.routine` |
| a hook that must apply on every call (privacy, security) | `inu.xposed.routine` |
| a hook that needs JavaScript, but only for a few calls | a `filter` routine plus JavaScript phases |
| a `defineClass` method called often or off the plugin thread | an `inu.jvm.routine` body |
| a `Runnable` that must always run | `inu.jvm.routine` |
| a rare callback that needs plugin APIs (storage, network, UI) | plain JavaScript |

## Routine bodies

The body looks like a plain JavaScript function, arrow or regular, with a few quirks. **All** values inside a routine are Java values, not handles, so think of them as ordinary JavaScript values.

### Method routines

```ts
inu.jvm.routine(function (a, b) {
  const foo = this.getFoo()
  return foo + a + b
})
```

- `this` is the receiver, Java's `this`. Using it requires a `function` expression.
- The parameters are the call's arguments.
- `return` returns the result.

### Hook routines

```ts
inu.xposed.routine((ctx) => {
  const foo = ctx.thisObject.getFoo()
  return foo + ctx.args[0] + ctx.args[1]
})
```

The idea is the same, but you have no `this`: you get the hook context, with `thisObject` and `args`. Operations on the context compile to their own instructions.

## How it builds

The CLI finds routine calls **syntactically**: `inu.jvm.routine(` or `inu.xposed.routine(` followed by a function expression or an arrow. It compiles the body and replaces the call in the bundle with the compiled program. So you must write the call exactly like that. These do not compile:

```ts
const r = inu.jvm.routine; r(() => { /* ... */ })        // not a direct call
const fn = () => { /* ... */ }; inu.jvm.routine(fn)       // not a function expression
```

TypeScript syntax is fine, and the CLI fails the build if you use an unsupported construct.

## What you can write

Supported:

- `const` and `let`, with block scoping and shadowing.
- `if`/`else`, and `switch` with fallthrough.
- `while`, `do`/`while`, `for`, `for (const x of y)`, `break`, `continue` and labels.
- `try`/`catch`/`finally` and `throw`.
- `return` (in method routines only).
- Member access and calls on Java values: `a.b`, `a[k]`, `a.m(...)`, `a?.b`, `a?.m()`.
- `new C(...)` on a captured class or constructor.
- Arithmetic `+ - * / %`, unary `-`, and bitwise `& | ^ ~ << >> >>>`.
- Comparison `=== !== < <= > >=`, and `!`, `&&`, `||`, `??`, `?:`, `instanceof`.
- Assignment `=`, compound assignment such as `+=`, and `++`, `--`.
- Template literals, array literals (they become `Object[]`) and `undefined`.
- `inu.jvm.callSuper(cls, self, name, ...args)` and `inu.jvm.getSuper(this).name(...args)`.

Not supported:

- functions of any kind inside a routine: nested functions, arrows, callbacks (`list.forEach(x => …)`), classes;
- bare calls such as `helper(x)`: only members can be called, `obj.helper(x)`;
- `==` and `!=` (use `===`), `typeof`, `in`, `delete`, `void`, `**`, unary `+`;
- object literals, destructuring, spread, regular expression literals, tagged templates;
- `var`, `for…in`, `with`, `arguments`, `super` (use `callSuper` or `getSuper`), `await`, `yield`;
- async and generator functions;
- globals: `console`, `Math`, `JSON`, `inu.ui` and so on.

### Semantics that differ from JavaScript

Values in a routine are Java values, and members are Java members.

1. **Java members, not JavaScript ones.** `java.lang.String` has `s.length()`, not `s.length`. Arrays have some sugar: `.length` and `[i]` work on Java arrays, and `for…of` works over arrays and `Iterable`s.
2. **Numbers.** Arithmetic on two integers is 64 bit and throws on overflow. `/` on integers truncates. Dividing by zero throws. A floating result that is not finite throws. Bitwise operators work on 32 bits when both sides are `int` or narrower, otherwise on 64.
3. **`===` compares values** for numbers, strings and booleans (`1 === 1.0` is true), and **identity** for everything else. Use `.equals()` for Java equality.
4. **`+` concatenates** only when one side is a `String`. A `CharSequence` is not a `String`: call `.toString()` first.
5. **`null` and `undefined` are the same value.** Missing arguments read as `null`.
6. **No coercion.** `<` needs two numbers or two strings.
7. **Truthiness is like JavaScript:** `null`, `false`, `0`, `NaN` and `""` are falsy.
8. **Overloads resolve at run time**, the same way `inu.jvm` calls do. The compiler has no Java type information.
9. **Captures are snapshots** (see below).

## Captures

A routine can use names declared outside it. These are **captures**:

```ts
const LIMIT = 3
const WORDS = ['foo', 'bar']
const countHits = inu.jvm.routine((text) => {
  let hits = 0
  for (let i = 0; i < WORDS.length; i++) {
    if (text.contains(WORDS[i])) hits++
    if (hits >= LIMIT) break
  }
  return `hits: ${hits}`
})
```

- A capture is taken **by value, once**, when the routine is created. Later changes in JavaScript are never seen.
- Supported types: scalars (`null`, boolean, number, bigint, string), `Uint8Array`, a Java handle, or an array of those.
- An array capture becomes one `Object[]` shared by every run on every thread. If your routine writes into it, that is shared mutable state.
- A captured name must be `const`, an import, or a `let` or parameter that is never reassigned.
- A global (anything not declared in the file) cannot be captured.
- Only the bare name is captured. `Foo.BAR` is a live Java static read on the captured `Foo`, done on every run. To capture a plain value, bind it first: `const BAR = Foo.getStaticField('BAR')`.

To share state between a routine and your JavaScript, capture a Java object, for example an `AtomicBoolean`: a captured Java object is the object itself, so both sides see the same value.

```ts
const AtomicBoolean = inu.jvm.cls('java.util.concurrent.atomic.AtomicBoolean')
const enabled = new AtomicBoolean(true)

inu.xposed.hookAllOverloads(SomeClass, 'draw', {
  before: inu.xposed.routine((ctx) => {
    if (!enabled.get()) return
    // ...
  }),
})
// later, from a settings switch:
enabled.set(false)
```

### Typing captures

The typings describe JavaScript handles, so TypeScript does not know about Java members on a captured class. Two common fixes:

```ts
const UNDERLINE: number = inu.jvm.cls('android.graphics.Paint').getStaticField('UNDERLINE_TEXT_FLAG')
const Log: any = inu.jvm.cls('android.util.Log')

const task = inu.jvm.routine(() => {
  Log.d('inu', `flag is ${UNDERLINE}`)
})
```

Reading a constant once outside the routine is also cheaper than a static read on every run.

## Hook routines

In `inu.xposed.routine` the context parameter (whatever you name it) compiles to direct operations:

| You write | Meaning |
| --- | --- |
| `ctx.args[i]` | read argument `i` |
| `ctx.args[i] = v` | replace argument `i` (only in `before`) |
| `ctx.args.length` | the argument count |
| `ctx.thisObject`, `ctx.method` | the receiver and the hooked method |
| `ctx.returnValue`, `ctx.throwable` | the outcome (only in `after`) |
| `ctx.setReturnValue(v)`, `ctx.setThrowable(t)` | set the result, with the same rules as [JavaScript hooks](/entinygram/docs/xposed#phases-and-the-context) |

`ctx.extra` does not exist in routines. Use a Java object if you need to pass state between phases.

```ts
const TextView = inu.jvm.cls('android.widget.TextView')
const LABEL = 'Inu'
inu.xposed.hookAllOverloads(TextView, 'getText', {
  after: inu.xposed.routine((ctx) => {
    const text = ctx.returnValue
    if (text !== null && text.toString() === 'Telegram') ctx.setReturnValue(LABEL)
  }),
})
```

## `defineClass` bodies and `super`

A method routine can be a `defineClass` body. `this` is the object (or the class, for a static method). A routine cannot capture the class it is defining, because the class does not exist yet when the routine is built. So call `super` with `getSuper`:

```ts
const RedUnderlineSpan = inu.jvm.defineClass({
  superclass: inu.jvm.cls('android.text.style.UnderlineSpan'),
  methods: {
    updateDrawState: {
      params: ['android.text.TextPaint'],
      body: inu.jvm.routine(function (paint) {
        inu.jvm.getSuper(this).updateDrawState(paint)
        paint.setColor(0xFFFF0000 | 0)
      }),
    },
  },
})
```

`getSuper` needs `this`, so the body is a `function`, not an arrow.

- `inu.jvm.getSuper(this).method(...args)` calls the superclass implementation of the class the routine is bound to. It works only as a direct call like that, only in method routines, and only when the routine runs as a `defineClass` body.
- `inu.jvm.callSuper(SomeClass, obj, 'method', ...args)` works in any routine, with a class you captured.

## Loops, time and limits

Loops are allowed, but a routine runs on an app thread, so it is bounded:

- **250 ms per run.** The clock is checked before each Java operation and periodically in loops.
- An abort cannot be caught by your `try`/`catch`, and `finally` does not run for it.
- A Java call already in progress cannot be interrupted. A routine that calls something slow is stopped only after that call returns.

Size limits: 1024 instructions, 256 slots (`let` variables and temporaries), 256 captures (4096 values once arrays are flattened), 64 `try` regions, 256 call arguments, 1 MB of captures, 512 live routines per plugin. Going over a compile time limit is a build error.

## Failure

| Where the routine runs | If it throws |
| --- | --- |
| a `defineClass` body | the exception reaches the Java caller |
| an xposed `filter` | it is logged, and the hook runs anyway |
| an xposed `before` or `after` | it is logged; the call continues with the changes already made |
| a plain `Runnable` | the exception reaches whoever called `run()` |

A `Runnable` routine given to a `Thread` or `Handler` that throws will crash that thread, like any Java code would. Wrap its body in `try`/`catch` if it can fail. `try`/`catch` in a routine catches any Java `Throwable`, including `Error`s, and `catch` receives the original throwable, not a wrapper.

## Verifying a built plugin

Anyone can check that a built `.inu.js` really contains what its source says:

```bash
inu verify dist/my-plugin.inu.js
```

For each compiled routine, `inu verify` takes the recorded `source`, compiles it again with the same compiler, and compares the result with the bytecode in the file. It also checks that the number of captured values matches. It verifies the routine **body**. It cannot check what the captured values are at run time: those come from the JavaScript around the routine, which you review like normal code.

## Troubleshooting

| Build error | Fix |
| --- | --- |
| `console` is not declared in this file, so it is a global, which a routine cannot capture | routines have no console or other globals. Log from JavaScript, or call `android.util.Log` through a captured class |
| a routine can only call a member, such as `object.method(...)` | inline the helper, or make it a Java method (`defineClass`) |
| a routine cannot hold another function | no callbacks inside. Replace `forEach` and `map` with `for…of` |
| `x` is assigned after it is declared | captures are snapshots. Make it `const`, or pass the value as an argument |
| the hook context is read-only, use `ctx.setReturnValue(...)` | use the setter methods |
| a hook routine cannot return a value, use `ctx.setReturnValue(...)` | hook routines set results through `ctx` |
| `==` is not supported, use `===` | there is no coercion; use `===` |
| object literals and destructuring are not supported | use Java objects and plain variables |

At run time:

- `routine: a routine body is compiled by @inugram/cli` means the call was not found at build time. Write `inu.jvm.routine(function …)` literally, and build with the CLI.
- `routine: execution budget exceeded` means a run took over 250 ms.
- A "does not match" or "does not take these arguments" error comes from overload resolution; see [JVM reflection](/entinygram/docs/jvm#overloads).

## More examples

Counting with a loop over an `Iterable`:

```ts
const countEmpty = inu.jvm.routine((list) => {
  let n = 0
  for (const s of list) {
    if (s.isEmpty()) n++
  }
  return n
})
```

A hook that clamps an argument and fixes up the object afterwards:

```ts
const View = inu.jvm.cls('android.view.View')
inu.xposed.hookAllOverloads(View, 'setAlpha', {
  before: inu.xposed.routine((ctx) => {
    if (ctx.args[0] < 0.5) ctx.args[0] = 0.5
  }),
  after: inu.xposed.routine((ctx) => {
    try {
      ctx.thisObject.invalidate()
    } catch (e) {
      ctx.setThrowable(e)
    }
  }),
})
```

A `Runnable` that runs on any thread:

```ts
const Log: any = inu.jvm.cls('android.util.Log')
const task = inu.jvm.routine(() => {
  Log.d('inu', 'ran on whatever thread called run()')
})
new (inu.jvm.cls('java.lang.Thread'))(task).call('start')
```

## Source and further reading

- [`sdk/cli/src/routines`](https://github.com/entinyGram/plugins/tree/main/sdk/cli/src/routines): the compiler, with captures and the instruction set
- [`sdk/cli/src/commands/verify.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/cli/src/commands/verify.ts): how `inu verify` compares a routine with its source
- [`plugins/calendar-systems/src/index.ts`](https://github.com/entinyGram/plugins/blob/main/plugins/calendar-systems/src/index.ts): routines in a real plugin
- [`routines.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/routines.md) in Inugram: the original page
