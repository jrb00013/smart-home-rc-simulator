# Virtual TV Simulator (`test_simulator/`)

The Python side of the project: a Flask + Socket.IO web server that hosts the 3D smart-home
simulator, a 2D Pygame desktop simulator, a time-based scheduler, smart-home integrations, and
small rule-based helpers (brand detection, IR protocol classification).

## Quick start

```bash
cd test_simulator
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python web_server.py                                 # http://localhost:5000
```

With Poetry: `poetry install && poetry run web-server`. Desktop simulator: `python main.py`
(or `poetry run desktop-simulator`). Full setup: [docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md).

## What's here

| Path | Purpose |
|------|---------|
| `web_server.py` | Flask + Socket.IO server: REST API, WebSocket events, serves the 3D UI, IPC listener for the C program |
| `web_templates/`, `web_static/js/simulator/` | Three.js front end (module map in [web_static/js/simulator/README.md](web_static/js/simulator/README.md)) |
| `main.py`, `virtual_tv.py` | 2D Pygame desktop simulator |
| `ipc_server.py` | Unix socket / Windows named pipe listener used by both simulators |
| `scheduler.py`, `autonomous_config.json`, `presets_loader.py` | Time rules and presets |
| `service_layer.py`, `service_config.example.json` | API-key auth, webhooks, MQTT |
| `adapters/` | Backends: simulator, Broadlink, Samsung, LG, HDMI-CEC |
| `brand_detection.py` | Keyword table: text → TV brand and `brand_id` |
| `ir_synthetic.py`, `protocol_classifier.py` | Synthetic IR timings and a rule-based NEC/RC5/RC6 classifier |
| `gpu_runtime/` | GPU detection → graphics tier → 3D quality preset |
| `button_codes.py` | Button names, mirrored from `include/remote_buttons.h` |
| `app_config.py` | Environment-variable configuration |
| `openapi.yaml` | OpenAPI 3 spec, served at `/api/openapi.yaml` |
| `VERIFY_SETUP.py` | Checks files and imports before first run |
| `tests/` | pytest suite (see [TESTING.md](TESTING.md)) |

## How the pieces talk

- **Browser ↔ server:** Socket.IO (`button_press` in; `tv_state_update`, `graphics_preset` out)
  plus REST under `/api/*`.
- **C program → server:** HTTP `POST /api/button` (`make SIMULATOR=1 WEB=1`), or IPC over
  `/tmp/phillips_remote_tv.sock` / `\\.\pipe\phillips_remote_tv` (`make SIMULATOR=1`).
- **Scheduler / Home Assistant / Node-RED → server:** REST, optionally MQTT.
- **Server → outside:** webhooks and MQTT `state_change` events.

## Graphics preset

At startup (or first request) the server detects the GPU name and VRAM, classifies a tier
(`ULTRA`, `HIGH`, `MEDIUM`, `LOW`, `SIM_SAFE`) and maps it to a preset (shadows, texture sizes,
fog, particle count, pixel ratio). The preset is injected into the page as
`window.GRAPHICS_PRESET`, re-sent on WebSocket connect, and shown in the status overlay.
`GET /api/graphics-preset?refresh=1` recomputes it; `POST /api/graphics-preset` locks or unlocks
a tier. Without a detectable GPU (or without GPUtil) the tier is `SIM_SAFE`. Details:
[gpu_runtime/UPGRADE.md](gpu_runtime/UPGRADE.md).

## Brand detection and IR classification

Both are deterministic and run locally; there are no models or cloud calls
([audit](../docs/ML_CV_AI_AUDIT.md)).

- `POST /api/detect-brand` with `{"text": "I have a Samsung TV"}` returns
  `{"brand": "Samsung", "brand_id": 1, "confidence": 0.93}` and stores the result in TV state.
- `python ir_synthetic.py` writes `ir_dataset_synthetic.json` (pulse lengths in µs from the same
  NEC/RC5/RC6 constants as `src/ir_protocol.c`); `protocol_classifier.py` identifies the protocol
  from the leading mark/space with 40% tolerance.

## Documentation

- [FEATURES.md](FEATURES.md): 3D scene, animations, keyboard and mouse controls
- [API.md](API.md): REST and WebSocket reference
- [TESTING.md](TESTING.md): pytest suite and manual checklists
- [PRODUCTION.md](PRODUCTION.md): configuration, security, Docker, Gunicorn
- [docs/SERVICE_AND_AUTOMATION.md](docs/SERVICE_AND_AUTOMATION.md): auth, webhooks, MQTT, adapters, scheduler
- [docs/HOME_ASSISTANT_NODE_RED.md](docs/HOME_ASSISTANT_NODE_RED.md): integration examples
- [Documentation index](../docs/README.md)
