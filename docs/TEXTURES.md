# Procedural textures and the material palette

The 3D simulator ships no image assets. Every surface is painted at load time onto an
offscreen 2D canvas, so the scene works offline and a colour change is a one-line edit
rather than a binary swap.

- `web_static/js/simulator/textures.js` — the generators and the `Tex` registry.
- `web_static/js/simulator/palette.js` — named finishes built from those generators.

Both are loaded before `decor.js`, which is the first consumer.

## Using a texture

```js
// Raw canvas (cached per name + options) — rarely needed directly.
var canvas = Tex.surface('wood.oak', { base: '#b07a45' });

// THREE.CanvasTexture with repeat/wrap/anisotropy applied.
var map = Tex.texture('wood.oak', { repeat: [2, 2] });

// A MeshStandardMaterial wired to the map.
var mat = Tex.material('wood.oak', { repeat: [1, 3] }, { roughness: 0.6, metalness: 0.0 });
```

`Tex.texture()` and `Tex.material()` throw for an unknown name; `Tex.has(name)` lets you
test first. `Tex.list()` returns the sorted set of registered names.

## Options

Generators receive a resolved options object. Common keys:

| Key | Meaning |
|-----|---------|
| `base` | Base colour (CSS string) |
| `seed` | PRNG seed — same seed paints the same texture |
| `repeat` | `[x, y]` applied to the returned texture |
| `width` / `height` | Canvas size in pixels (default 256) |
| `anisotropy` | Sampling anisotropy (default 8) |
| `tint`, `grout`, `palette`, `planks`, `nodes` | Generator-specific knobs |

Because `surface()` keys its cache on the resolved options, requesting the same name with
different options yields distinct canvases; `Tex.clearCache()` drops them all.

## Registering a generator

```js
Tex.define('wood.oak', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 1001);
    ctx.fillStyle = o.base || '#8a5a2b';
    ctx.fillRect(0, 0, w, h);
    // ... draw a tileable pattern ...
});
```

Helpers available to generators:

- `Tex.rng(seed)` — deterministic mulberry32.
- `Tex.speckle(ctx, w, h, opts)` — per-pixel grain.
- `Tex.verticalGradient(ctx, w, h, stops)` — gradient fill.
- `Tex.wrappedLine(ctx, w, x1, y1, x2, y2)` — line drawn at `x` and `x ± w` so patterns tile.

## Named presets

`Tex.variant(name, base, overrides)` registers a preset of an existing generator:

```js
Tex.variant('oak.dark', 'wood.oak', { base: '#6a4a2a' });
```

`palette.js` is a curated list of these variants — woods, stone, tile, brick, paint,
fabric, leather, metal, carpet, wallpaper and ground. Decor refers to palette names, so
re-toning the house is a single edit in `palette.js`.

## Families

| Prefix | Examples |
|--------|----------|
| `wood.*` | oak, walnut, pine, cherry, bamboo, parquet, weathered |
| `stone.*`, `marble.*` | marble, granite, slate, terrazzo, limestone |
| `tile.*` | ceramic, subway, hex, mosaic |
| `brick.*` | red brick, stone |
| `paint.wall` | flat interior paint |
| `fabric.*`, `leather` | linen, upholstery, tweed, leather |
| `metal.*` | brushed, galvanized, chrome, copper, rust |
| `carpet.pile`, `grass.lawn`, `asphalt`, `concrete`, `plaster` | floors and ground |
| `wallpaper.damask` | patterned wall covering |
