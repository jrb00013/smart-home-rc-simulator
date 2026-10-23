# 3D TV Simulator – modular bundle

The simulator is split into modules (replacing the former single `tv-simulator.js`). Load order matters.

| File | Responsibility |
|------|----------------|
| `globals.js` | Scene/camera/state globals, `tvShows`, `getTVShow` |
| `socket-state.js` | `initSocket`, `updateTVState`, button code helpers |
| `utils.js` | `Easing` helpers |
| `animations.js` | Power/channel/app/volume/HDMI animation state and starters |
| `ir.js` | IR signal, button highlight, notification |
| `preset.js` | `DEFAULT_GRAPHICS_PRESET`, `presetNum` |
| `scene.js` | `initScene`, `createRoom`, `createTV` |
| `ir-remote.js` | `createRemoteControl`, hand, first-person arm/body, buttons |
| `shows.js` | Stub (show data in globals) |
| `screen.js` | `updateTVScreen`, `captureAndSendFrame`, all `draw*` content |
| `controls.js` | `hexToRgb`, `initControls` (orbit + walk mode) |
| `room-devices.js` | `updateRoomDevicesFromTVState` |
| `static-batch.js` | Merges never-moving meshes that share a material to cut draw calls (`?nobatch=1` disables) |
| `main.js` | `animate`, `addAmbientEffects`, `onWindowResize`, `DOMContentLoaded` |
