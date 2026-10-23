# Roadmap

Known rough edges first, then ideas that are **not implemented**. The ideas were collected from
earlier docs so the rest of the documentation describes only what the code does today. Order is
not priority.

## Known gaps in existing features

These are bugs or rough edges in shipped code, listed so readers are not surprised:

- Several buttons (GAME1–3, HDR modes, CAST, RECORD_LIST, …) have no IR code yet.
- Web keyboard shortcuts: `Shift+F1`–`F8` also fire the unshifted `F1`–`F8` action, and the
  `F1`–`F8` check is a string comparison that also matches `F10`–`F12`.
- `openapi.yaml` does not describe `/api/openapi`, `/api/openapi.json` or `/api/openapi.yaml`.

## C remote and IR

- IR learning with an IR receiver (`UNIVERSAL_MODE_LEARNED` exists only as an enum value).
- Larger universal code database (more buttons, more brands); measured TV coverage.
- Hardware-specific IR output (GPIO/PWM) and wiring the assembly timing routines into the build.
- Hardware-timer based delays, DMA carrier generation, interrupt-driven protocol encoding.
- DMA I/O mode (`IO_MODE_DMA` is defined but not available in the default implementation).
- Multi-device profiles and macro recording.
- Thread-safe handler registration and event queues.

## Latency tooling

- Live latency dashboard.
- Histogram output and CSV export.
- Compile-time switch for zero overhead in production.
- Thread-safe measurement.

## Graphics runtime (web simulator)

Detection, tiering, hysteresis, config persistence and the `/api/graphics-preset` API are
implemented (see [test_simulator/gpu_runtime/UPGRADE.md](test_simulator/gpu_runtime/UPGRADE.md)).
Possible next steps:

- Detect DLSS / FSR support and expose it in presets.
- Detect Vulkan vs DX12 for a native launcher.
- Estimate GPU memory bandwidth and use it in tiering.
- Client-side FPS reporting with smoothed frame times feeding back into the preset.
- Hysteresis extensions: downgrade cooldown, N consecutive low-FPS frames before dropping a tier.
- A small background daemon that serves the preset over a local socket/HTTP.
- A "graphics governor" for living-room Linux boxes (resolution, power profile).
- Unreal / Unity shims that read the same tier contract.
- In-simulator UI to lock the graphics tier.

## Research ideas (no plan to build yet)

An earlier planning document (removed in `f880dc6`) floated these. None has code, dependencies or
tests in the repository; see [docs/ML_CV_AI_AUDIT.md](docs/ML_CV_AI_AUDIT.md) for what the
project actually uses.

- Vision-based TV brand detection.
- Neural IR protocol decoding.
- TinyML inference in an ISR.
- Reinforcement learning to order protocol attempts.
