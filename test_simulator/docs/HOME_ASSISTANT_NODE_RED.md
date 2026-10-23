# Home Assistant & Node-RED Integration

Use the TV Remote API from Home Assistant or Node-RED for automations and dashboards.

## API summary

- **Base URL:** `http://<server>:5000` (or your deployed URL)
- **Auth (optional):** If an API key is configured (`TV_REMOTE_API_KEY` or `api_key` in `service_config.json`), send `X-API-Key: <key>` or `Authorization: Bearer <key>` on every request.
- **Reachability:** the server binds to `127.0.0.1` by default. For Home Assistant or Node-RED on another machine, start it with `TV_REMOTE_HOST=0.0.0.0` and set an API key.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/state` | Current TV state (power, volume, channel, app, etc.) |
| POST | `/api/button` | Send one button: `{"button_code": 16}` (16 = Power) |
| GET | `/api/presets` | List presets |
| POST | `/api/preset/<name>/trigger` | Run a preset; optional body `{"target": "simulator"}` |
| GET | `/api/backends` | List backends |
| GET | `/api/backends/status` | Backend availability |

**Button codes (examples):** 16=Power, 17=Vol+, 18=Vol-, 19=Mute, 20=Ch+, 21=Ch-, 32=Home, 33=Menu, 34=Back, 2=Netflix, 1=YouTube.

---

## Home Assistant

### RESTful command (button + preset)

In `configuration.yaml`:

```yaml
rest_command:
  tv_remote_button:
    url: "http://192.168.1.10:5000/api/button"
    method: POST
    content_type: "application/json"
    payload: '{"button_code": {{ button_code }}}'
    headers:
      X-API-Key: "your-api-key"   # omit if no api_key in service_config

  tv_remote_preset:
    url: "http://192.168.1.10:5000/api/preset/{{ preset_name }}/trigger"
    method: POST
    content_type: "application/json"
    payload: '{"target": "simulator"}'
    headers:
      X-API-Key: "your-api-key"
```

Then in automations or scripts:

```yaml
# Single button (Power)
service: rest_command.tv_remote_button
data:
  button_code: 16

# Run preset (e.g. "living_room_evening")
service: rest_command.tv_remote_preset
data:
  preset_name: living_room_evening
```

### Template sensor (TV state)

```yaml
sensor:
  - platform: rest
    resource: http://192.168.1.10:5000/api/state
    name: TV Remote State
    scan_interval: 30
    value_template: "{{ value_json.powered_on }}"
    json_attributes:
      - powered_on
      - volume
      - channel
      - current_app
      - input_source
```

### Webhook: notify Home Assistant on state change

In `service_config.json` on the TV Remote server set:

```json
{
  "webhook_url": "http://192.168.1.10:8123/api/webhook/tv_remote",
  "webhook_events": ["state_change"]
}
```

In Home Assistant create an automation with trigger type **Webhook**, webhook ID `tv_remote`. The payload will be `{"event": "state_change", "state": {...}, "button_code": 16}`.

---

## Node-RED

### Send button (HTTP Request)

1. Add **http request** node.
2. Method: **POST**, URL: `http://192.168.1.10:5000/api/button`
3. Headers: `Content-Type: application/json` and optionally `X-API-Key: your-api-key`
4. Body: `{"button_code": 16}` (use a number for Power, Vol+, etc.).

### Run preset (HTTP Request)

1. **http request** node: POST to `http://192.168.1.10:5000/api/preset/living_room_evening/trigger`
2. Body (optional): `{"target": "simulator"}`.

### MQTT: send commands to TV Remote

If you enabled MQTT in `service_config.json` and set `subscribe_commands: true`:

- **Topic:** `tv_remote/command` (or your `topic_prefix` + `/command`)
- **Payload (button):** `{"button_code": 16}`
- **Payload (preset):** `{"preset": "living_room_evening", "target": "simulator"}`

In Node-RED use an **mqtt out** node publishing to `tv_remote/command` with one of the JSON payloads above.

### Receive state changes (MQTT)

The server publishes to `tv_remote/events/state_change` when the TV state changes (simulator). Subscribe with an **mqtt in** node to that topic; payload is JSON `{"state": {...}, "button_code": ...}`.

---

## Button code reference (excerpt)

| Code | Button   | Code | Button   |
|------|----------|------|----------|
| 16   | Power    | 17   | Vol+     |
| 18   | Vol-     | 19   | Mute     |
| 20   | Ch+      | 21   | Ch-      |
| 32   | Home     | 33   | Menu     |
| 34   | Back     | 37   | Input    |
| 1    | YouTube  | 2    | Netflix  |
| 3    | Prime    | 4    | HBO Max  |
| 160  | Game Mode| 130  | Live TV  |

Full list: [docs/BUTTONS.md](../../docs/BUTTONS.md).
