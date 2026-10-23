# Graphics runtime

GPU detection → tier → graphics preset for the 3D simulator. Overview in
[../README.md](../README.md#graphics-preset).

## Implemented

- **Config persistence** – `graphics_config.json` stores `tier_override`, `use_auto`, and `last_tier` / `last_vram_gb` for hysteresis. Load/save in `config.py`; `GET`/`POST` `/api/graphics-preset` for read and override.
- **Hysteresis** – Tier classifier accepts `previous_tier`; downgrades only when VRAM is at least `HYSTERESIS_GB` below the tier boundary to avoid preset flickering.
- **REST API** – `GET /api/graphics-preset` (with `?refresh=1`) and `POST /api/graphics-preset` with body `{"use_auto": true}` or `{"tier_override": "MEDIUM"}`.

## Next steps

Ideas (DLSS/FSR detection, FPS feedback, a preset daemon, engine integrations, a tier-lock UI)
are listed in [ROADMAP.md](../../ROADMAP.md#graphics-runtime-web-simulator).
