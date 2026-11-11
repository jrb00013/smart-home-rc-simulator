# Time of day, weather and ambient effects

`web_static/js/simulator/environment.js` owns a small state machine — a clock in hours,
a weather id and a wind level — and drives the existing scene from it: sky colour, fog,
the sky dome tint, the sun's position/colour/intensity, and the ambient and hemisphere
lights. On top of that, effects (stars, rain, fireflies, …) register themselves and are
ticked from the render loop.

## Wiring

- `scene.js` calls `Env.init()` after static batching and before the render loop starts.
- `main.js` calls `Env.update(dt)` immediately before each `renderer.render(...)`.

`Env.init()` returns `{ effects, started, failed }`. A failing effect is logged and
skipped; it does not take the scene down.

## State

| Field | Meaning |
|-------|---------|
| `time` | Hours, `0..24` (default `9.0`) |
| `timeScale` | Hours advanced per real second (`0` = frozen) |
| `weather` | `clear` \| `rain` \| `snow` \| `storm` \| `fog` |
| `wind` | `0..1` |
| `daylight` | Derived, `0..1`, written by `apply()` |
| `enabled` | Whether `update()` advances and effects tick |

Read a snapshot with `Env.getState()`.

## API

| Call | Effect |
|------|--------|
| `Env.init()` | Find scene lights, start effects, apply, attach the HUD |
| `Env.update(dt)` | Advance the clock, apply, tick effects |
| `Env.setTime(h)` | Set the clock (wraps) and apply |
| `Env.getTime()` | Current hour |
| `Env.setWeather(w)` | Set the weather id and apply |
| `Env.cycleWeather([step])` | Move through the weather order (default `+1`) |
| `Env.setTimeScale(s)` | Hours per real second |
| `Env.setWind(w)` | Clamp wind to `0..1` |
| `Env.preset(name)` | Apply a named day/weather preset |
| `Env.pause()` / `Env.resume()` / `Env.toggle()` | Freeze / resume the environment |
| `Env.attachHud()` | Create the on-screen badge (idempotent) |
| `Env.daylightAt(hour)` | `0..1` daylight curve for an hour |
| `Env.formatClock(hour)` | Zero-padded `HH:MM` |

`setTime`, `setWeather`, `preset`, `pause`, `resume`, `toggle` and `cycleWeather` return
`Env` so calls chain.

## Presets

`Env.PRESETS` holds ready-made combinations, applied with `Env.preset(name)`:

| Preset | Time | Weather | Wind |
|--------|------|---------|------|
| `dawn` | 05:30 | clear | 0.20 |
| `morning` | 08:00 | clear | 0.30 |
| `noon` | 12:00 | clear | 0.25 |
| `golden` | 17:30 | clear | 0.30 |
| `dusk` | 19:30 | clear | 0.25 |
| `night` | 22:00 | clear | 0.15 |
| `rainy` | 14:00 | rain | 0.55 |
| `snowy` | 14:00 | snow | 0.30 |
| `foggy` | 07:00 | fog | 0.10 |
| `stormy` | 15:00 | storm | 0.90 |

## HUD

`Env.init()` calls `Env.attachHud()`, which adds a translucent badge in the bottom-right
showing `HH:MM  weather  wind NN%` (and `(night)` when the sun is down), with buttons to
cycle weather, advance an hour, and pause/resume. The badge updates only when its label
changes.

## Effects

Each effect is registered with `Env.addEffect(name, build)`. `build(api)` receives
`{ THREE, scene, state, refs }` and returns `{ update(dt, state) }`. Built-in effects:

`stars`, `moon`, `clouds`, `rain`, `snow`, `fireflies`, `leaves`, `lightning`,
`interior-lights`.

Register a new one at the bottom of `environment.js`:

```js
Env.addEffect('smoke', function (api) {
    var THREE = api.THREE;
    // ...create objects, add to api.scene...
    return {
        update: function (dt, st) {
            // ...animate, respecting st.weather and st.wind...
        }
    };
});
```

Effects are created on `Env.init()` and on `addEffect()` if the environment is already
initialised, so hot-adding one after load works too.

## Tests

`scripts/test-modules.mjs` loads the module in a headless VM and covers the preset table,
`daylightAt` and `formatClock`:

```bash
cd test_simulator
npm run test:unit
```
