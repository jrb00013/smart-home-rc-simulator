# Remote as a Service & Smart Home TV Automation

This document describes the **service layer** (auth, webhooks, MQTT, OpenAPI) and **backend adapters** (simulator, Broadlink, Samsung, LG, CEC) so you can run the TV remote as a service and drive real devices from the same scheduler.

**See also:** [HOME_ASSISTANT_NODE_RED.md](HOME_ASSISTANT_NODE_RED.md) for Home Assistant and Node-RED examples.

## Quick start

1. **Simulator only (default)**  
   Start the web server (`python web_server.py`) and the scheduler (`python scheduler.py`). The scheduler sends button presses to the simulator API.

2. **Add auth and webhooks**  
   Copy `service_config.example.json` to `service_config.json`, set `api_key` and/or `webhook_url`, restart the server.

3. **Control a real device**  
   In `service_config.json` define a backend (e.g. Broadlink host + `code_map`, or Samsung TV IP). In `autonomous_config.json` set `default_target` or per-rule/per-preset `target` to that backend or named device.

---

## Service config (`service_config.json`)

Optional. If the file is missing, no auth, no webhooks, no MQTT; default backend is `simulator`.

| Key | Description |
|-----|-------------|
| `default_backend` | Default target when none specified: `simulator`, `broadlink`, `samsung`, `lg`, `cec`, or a named device key under `backends`. |
| `simulator_api` | Base URL for simulator (e.g. `http://localhost:5000`). Used by simulator adapter and when scheduler target is `simulator`. |
| `api_key` | If set, all `/api/*` requests and Socket.IO connections must present it: `X-API-Key: <key>`, `Authorization: Bearer <key>`, `?api_key=<key>`, or Socket.IO `auth: {api_key}`. Env: `TV_REMOTE_API_KEY`. Named simulator devices inherit it. |
| `webhook_url` | POST URL for state-change events. Body: `{ "event": "state_change", "state": { ... }, "button_code": 16 }`. Env: `TV_REMOTE_WEBHOOK_URL`. |
| `webhook_events` | List of events to send; default `["state_change"]`. |
| `webhook_headers` | Optional dict of extra headers for webhook POST (e.g. `{"X-Custom": "value"}`). |
| `mqtt` | Optional. `enabled`, `broker`, `port`, `topic_prefix`, `username`, `password`, `subscribe_commands`. Events published to `{topic_prefix}/events/state_change`. If `subscribe_commands: true`, server subscribes to `{topic_prefix}/command` and accepts `{"button_code": 16}` or `{"preset": "name", "target": "simulator"}`. |
| `backends` | Named devices. Each key (e.g. `living_room_tv`) can have `backend` (e.g. `broadlink`) plus adapter-specific options (`host`, `code_map`, `port`, etc.). |

Example (simulator + API key + webhook):

```json
{
  "default_backend": "simulator",
  "api_key": "your-secret-key",
  "webhook_url": "https://your-server.com/webhook",
  "backends": {
    "living_room_tv": {
      "backend": "broadlink",
      "host": "192.168.1.100",
      "code_map": { "16": "<hex from learned IR>", "17": "..." }
    }
  }
}
```

---

## Automation config (`autonomous_config.json`)

Time rules and presets, each with an optional **target** so the scheduler can drive the simulator or a real device.

| Key | Description |
|-----|-------------|
| `default_target` | Default backend or named device for all rules (e.g. `simulator`, `living_room_tv`). Overridden by rule or preset `target`. |
| `check_interval_sec` | Optional. How often the scheduler wakes, 1–30 seconds (default 30). Rules match on the minute, so larger values would miss them and are replaced by the default. |
| `presets` | List of presets. Each can have `target` (optional). |
| `time_rules` | List of rules. Each can have `target` (optional). |

**Target resolution:** For each triggered rule we use, in order:  
`rule.target` → `preset.target` (for that preset) → `autonomous_config.default_target` → `service_config.default_backend` → `simulator`.  
An unknown target is an error: the scheduler logs it and continues with the other rules, and `POST /api/preset/<name>/trigger` returns `400`.

Example: turn on living room TV at 19:00, simulator at 22:30:

```json
{
  "default_target": "simulator",
  "presets": [
    { "name": "living_room_evening", "target": "living_room_tv", "buttons": [...] },
    { "name": "netflix_night", "buttons": [...] }
  ],
  "time_rules": [
    { "time": "19:00", "days": ["mon","tue","wed","thu","fri","sat","sun"], "action": "apply_preset", "preset_name": "living_room_evening" },
    { "time": "22:30", "action": "apply_preset", "preset_name": "netflix_night" }
  ]
}
```

---

## Backend adapters

| Backend | Purpose | Config (under `backends.<name>` or env) | Optional dependency |
|---------|---------|----------------------------------------|----------------------|
| **simulator** | Send to local/remote simulator API | `simulator_api` or `SIMULATOR_API` | (built-in) |
| **broadlink** | IR blaster (RM pro, RM mini) | `host` (IP), `code_map`: `{ "16": "<hex>", ... }` | `pip install broadlink` |
| **samsung** | Samsung Smart TV (Tizen WebSocket) | `host`, `port` (8002), `token` | `pip install samsungtvws` |
| **lg** | LG webOS TV | `host`, `port` (3000) | `pip install pylgtv` |
| **cec** | HDMI-CEC (e.g. Raspberry Pi) | `adapter` (e.g. RPI) | system libcec / pycec |

- **Simulator:** Always available. If `api_key` is set in service config, the simulator adapter sends it as `X-API-Key` when calling the API.
- **Broadlink:** You must fill `code_map` with learned IR hex (e.g. from Broadlink app or a learn endpoint). Keys in `code_map` are button codes (e.g. `"16"` = Power).
- **Samsung / LG:** Put the TV’s IP in `host`; ensure TV and host are on the same network and that the TV allows remote control.
- **CEC:** Only available on systems with libcec (e.g. Raspberry Pi with CEC-capable HDMI).

---

## API

- **Health:** `GET /api/health` — returns `{ "status": "ok", "service": "tv_remote", "version": "1.0.0", "simulator": true }`.
- **State:** `GET /api/state` — current TV state.
- **Button:** `POST /api/button` with body `{"button_code": 16}`.
- **Presets:** `GET /api/presets` — list presets and default_target from `autonomous_config.json`.
- **Trigger preset:** `POST /api/preset/<name>/trigger` with optional body `{"target": "simulator"}` or query `?target=simulator`.
- **Backends:** `GET /api/backends` — list backend names; `GET /api/backends/status` — `{ name: { name, available } }`.
- **Broadlink learn:** `POST /api/backends/broadlink/learn` with body `{"host": "192.168.1.100", "timeout_sec": 10}` — puts device in learning mode and returns `{"ok": true, "ir_hex": "..."}`. Use the returned hex in that backend’s `code_map` (key = button code as string).
- **OpenAPI:** `GET /api/openapi` or `GET /api/openapi.json` (JSON), `GET /api/openapi.yaml` (YAML).
- **Auth:** When an API key is configured, send it on every `/api/*` request and Socket.IO connection (see `api_key` above).

---

## Running the scheduler

```bash
python scheduler.py            # or: poetry run python scheduler.py
# Or with env override
AUTONOMOUS_CONFIG=./my_config.json SERVICE_CONFIG=./service_config.json python scheduler.py
```

The scheduler loads `service_config.json` (if present) and `autonomous_config.json`. For each time rule that fires, it resolves the target (rule → preset → default_target → default_backend → simulator), gets the adapter via `adapters.registry.get_adapter(target)`, and sends the preset’s button sequence with that adapter.

---

## Home Assistant / Node-RED

- Use the REST API: `GET /api/state`, `POST /api/button` with body `{"button_code": 16}`. If you set `api_key`, add the header.
- Webhook: Configure `webhook_url` in `service_config.json`; your server receives POSTs on every state change.
- MQTT: Enable `mqtt` in `service_config.json`; events are published to `{topic_prefix}/events/state_change` with payload `{"state": {...}, "button_code": ...}`. With `subscribe_commands: true` the server also accepts commands on `{topic_prefix}/command` (`{"button_code": 16}` or `{"preset": "name", "target": "simulator"}`).

Examples: [HOME_ASSISTANT_NODE_RED.md](HOME_ASSISTANT_NODE_RED.md).
