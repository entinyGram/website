# Canvas

`inu.canvas` is an offscreen 2D rasterizer. It follows the web's `OffscreenCanvas` and `CanvasRenderingContext2D` for the most part and draws with Android's own graphics stack. Use it to make images, stickers, avatars or short videos, then save them, send them, or show them as icons. It is the plugin equivalent of PIL in Python.

It needs no grant, except where it reads a file by path.

```ts
using canvas = inu.canvas.create(512, 512)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#2a9d8f'
ctx.fillRect(0, 0, 512, 512)
ctx.font = 'bold 64px sans-serif'
ctx.textAlign = 'center'
ctx.fillStyle = 'white'
ctx.fillText('woof', 256, 280)
using png = await canvas.convertToBlob({ type: 'image/png' })
```

## What is missing

- A canvas is **not displayed on screen**. It only produces a `Blob` or similar output. To show the result, turn it into an image and pass it to an icon, a message or a file.
- There is **no raw pixel access**, because that would be too expensive to run in QuickJS. `getAverageColor` covers the common case of sampling a colour. If you really need raw pixels, please say so and describe your use case.
- Not every member of the web API exists.

## How drawing works

`inu.canvas` is backed by a real Android `Bitmap` and `Canvas`. To keep the number of Java calls down, drawing calls are batched. A batch is flushed when:

- about 1 MB of commands has built up,
- you read something, such as `measureText`, `getAverageColor` or `convertToBlob`,
- another operation needs the canvas as it is now, such as using it as an image source.

### Limits

- A canvas is at most 8192 pixels on a side.
- Every canvas, image, animation frame and encoder buffer is charged four bytes per pixel against the plugin's 64 MB of native memory.
- Setting `width` or `height` clears the pixels, even when the size does not change. Unlike the web, the context keeps its state (styles, transform, font). Call `ctx.reset()` if you want both cleared.

Dispose what you are done with. `dispose()` and `using` free memory right away. Garbage collection works too, but disposing by hand means the memory comes back now.

## Text and fonts

`font` takes a normal CSS font shorthand: style, variant, weight, stretch, size with an optional line height, then a family list. Stretch and line height are accepted and ignored.

A family name is looked up in this order:

1. fonts this plugin loaded with `inu.canvas.loadFont`,
2. the app's font roster: built-in fonts, fonts the user imported, and device fonts when the user turned them on in font settings,
3. the system default.

An unknown family falls back to the regular font. `inu.canvas.listFonts()` lists the available fonts, and `inu.canvas.loadFont(family, source)` loads a font file of your own.

## Animations and videos

> [!EXPERIMENTAL]
> `decodeAnimation`, `createEncoder` and their frame, reader and encoder types may change.

`inu.canvas.decodeAnimation(source)` opens an animated sticker (TGS), a video (WebM, MP4) or a GIF so you can read it frame by frame. A still image opens as an animation with one frame.

```ts
async function drawEveryFrame(file: Blob, canvas: OffscreenCanvas) {
  const ctx = canvas.getContext('2d')
  using animation = await inu.canvas.decodeAnimation(file, { width: 256, height: 256 })
  for await (using frame of animation) {
    ctx.drawImage(frame, 0, 0)
  }
}
```

Pass `fps` to read at that rate instead of the source's: frame `i` is the first source frame at or after `i / fps` seconds, its `timestamp` is that tick, and a frame shown across several ticks comes once per tick. Frames that no tick lands on are decoded but never converted, so reading a 60 fps video at 12 fps costs a fraction of reading every frame.

```ts
using animation = await inu.canvas.decodeAnimation(video, { width: 360, height: 360, fps: 12 })
for await (using frame of animation) {
  ctx.drawImage(frame, 0, 0)
  await encoder.addFrame(canvas)
}
```

To encode a video, use `inu.canvas.createEncoder({ width, height, fps?, bitrate? })`. It produces a silent MP4:

```ts
async function renderClip() {
  using canvas = inu.canvas.create(320, 320)
  const ctx = canvas.getContext('2d')
  using encoder = await inu.canvas.createEncoder({ width: 320, height: 320, fps: 30 })
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `hsl(${i * 6}, 80%, 50%)`
    ctx.fillRect(0, 0, 320, 320)
    await encoder.addFrame(canvas)
  }
  return await encoder.finish()
}
```

## Using the result

- Show it in the interface: make an SVG for `inu.icons.svg`, or draw a PNG and hand it to the place that takes a `Blob`.
- Send it: pass the `Blob` to `account.sendMedia`, which needs an `account.write(send)` grant.
- Save it: `inu.ui.saveFile(blob)` opens a "save as" dialog.

## Tips

- Draw at the size you need. A 4096 by 4096 canvas costs 64 MB, which is the plugin's whole native budget.
- Reuse one canvas instead of creating a new one per frame.
- Long loops: `await` something every so often. A turn that runs for more than two seconds disables the plugin.

## Source and further reading

- [`sdk/types/canvas.d.ts`](https://github.com/entinyGram/plugins/blob/main/sdk/types/canvas.d.ts): every `inu.canvas` call and option
- [`canvas.md`](https://github.com/teidesu/inugram/blob/main/sdk/docs/canvas.md) in Inugram: the original page
