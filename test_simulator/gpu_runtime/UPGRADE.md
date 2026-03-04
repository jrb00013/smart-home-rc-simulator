# Graphics runtime – upgrade path

Production-level and next-step improvements for the GPU detection and preset system.

## Implemented

- **Config persistence** – `graphics_config.json` stores `tier_override`, `use_auto`, and `last_tier` / `last_vram_gb` for hysteresis. Load/save in `config.py`; `GET`/`POST` `/api/graphics-preset` for read and override.
- **Hysteresis** – Tier classifier accepts `previous_tier`; downgrades only when VRAM is at least `HYSTERESIS_GB` below the tier boundary to avoid preset flickering.
- **REST API** – `GET /api/graphics-preset` (with `?refresh=1`) and `POST /api/graphics-preset` with body `{"use_auto": true}` or `{"tier_override": "MEDIUM"}`.

## Possible next steps

### Native / engine integration

- **Detect DLSS capability** – Query NVIDIA driver/API for DLSS support; expose in capabilities and presets (e.g. enable upscaling only when supported).
- **Detect FSR support** – AMD FSR availability (driver/API or feature flags); map to preset or quality options.
- **Vulkan vs DX12** – For a native launcher or desktop build, detect preferred API and capability set; adjust quality or render path.

### Performance and stability

- **GPU memory bandwidth** – Use vendor APIs or benchmarks to estimate bandwidth; feed into tier or a separate “bandwidth class” for texture/resolution limits.
- **Frame-time variance smoothing** – Client (or launcher) reports FPS/frame times; server or client smooths over a short window before adjusting quality or resolution scale.
- **Hysteresis extensions** – Time-based cooldown (e.g. don’t downgrade again within 60s) or require N consecutive low-FPS frames before dropping a tier.

### Deployment and ops

- **Background daemon** – Run GPU detection + preset logic as a small daemon; expose over a local socket or HTTP so the simulator (or other apps) query preset without running detection in-process.
- **Linux living-room graphics governor** – Same daemon could drive resolution, power profile, or display settings (e.g. for 4K TVs) based on tier or thermal/load.
- **Unreal / Unity integration** – Ship the tier/preset contract (or a small C#/C++ shim) that calls the daemon or reads `graphics_config.json` and maps to engine quality settings.

### Web simulator specifics

- **Client-side FPS reporting** – Optional WebSocket or REST call from the Three.js app with smoothed FPS; server (or a future adaptive endpoint) returns suggested `pixelRatio` or tier for next session.
- **Config persistence** – Already in place; optional UI in the simulator to set “Lock graphics to: Medium” that POSTs `tier_override` and shows current tier.

All of the above are optional; the current system is designed so these can be added incrementally without breaking existing behavior.
