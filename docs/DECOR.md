# Decorative props

`web_static/js/simulator/decor.js` adds furniture and dressing to the hand-modelled
house without growing `scene.js`. Props are built into one `decor-props` group attached
to `roomGroup`, **before** collision collection and static batching in `initScene()`, so
they collide and merge like native scene meshes.

## Two ways to add a prop

Imperative:

```js
Decor.add('my-prop', function (api) {
    var mat = api.mat('my-prop-wood', 'palette.oak.natural', { roughness: 0.7 });
    api.box(1.2, 0.1, 0.8, mat, 0, 0.9, 0);
    return true; // false skips counting it
});
```

Declarative (`addSpec`), which is what most props use:

```js
Decor.addSpec('my-prop', {
    position: [10, 0, -8],
    rotation: [0, Math.PI / 4, 0],
    parts: [
        { size: [1.2, 0.1, 0.8], texture: 'palette.oak.natural', position: [0, 0.9, 0] },
        { type: 'cyl', size: [0.08, 0.9], texture: 'palette.metal.steel', position: [-0.5, 0.45, 0] }
    ]
});
```

## Part schema

| Key | Meaning |
|-----|---------|
| `type` | `box` (default), `cyl`, `sphere`, `cone` |
| `size` | `[x, y, z]` for box; `[diameter, height]` for cyl/cone |
| `radius`, `radiusTop`, `radiusBottom` | Cylinder/cone/sphere dimensions |
| `segments` | Radial segments |
| `texture` | Texture or palette name (see [TEXTURES.md](TEXTURES.md)) |
| `texOpts` | Options passed to the texture generator |
| `matProps` | `MeshStandardMaterial` overrides (`roughness`, `metalness`, …) |
| `color`, `roughness`, `metalness` | Used when no `texture` is given |
| `position`, `rotation`, `scale` | `[x, y, z]` / Euler radians |

Materials are cached by texture + options, so repeated parts and props share them.
Every mesh casts and receives shadows.

## Lifecycle

| Call | Effect |
|------|--------|
| `Decor.init()` | Build all registered props into `roomGroup`; returns `{ built, registered, failed }` |
| `Decor.reset()` | Remove the group and clear built state |
| `Decor.count()` | Number of registered entries |

A prop that throws is logged and skipped; the rest of the scene still builds.

## Inventory

The registry currently includes side tables, a console, an ottoman, vases, planters,
cushions, a wall clock, framed art, a wool rug, a bookshelf, floor and desk lamps, a
snake plant, a floating shelf, nesting tables, an umbrella stand, a coat rack, a pet
bed, a terrarium, garden stools, a bench and cushion, crates, a barrel planter, a
birdbath, a lantern, mats, book stacks, a wall rack, a shoe bench, a laundry basket, a
magazine rack, bar stools, a wine rack, potted herbs, a garden gnome, a long planter, a
firewood stack, a watering can and a trellis.

Positions are in room coordinates (`ROOM_W`/`ROOM_D` = 44, centred on the origin) with
the floor at `y = 0`.
