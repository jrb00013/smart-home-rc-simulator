# API Reference

REST and WebSocket API of the web simulator (`web_server.py`). The machine-readable spec is
[`openapi.yaml`](openapi.yaml), also served at `GET /api/openapi.yaml` and as JSON at
`GET /api/openapi` / `GET /api/openapi.json`.

## Basics

- **Base URL:** `http://localhost:5000` (set by `TV_REMOTE_HOST` / `TV_REMOTE_PORT`).
- **Auth:** none by default. If an API key is configured (`TV_REMOTE_API_KEY` or `api_key` in
  `service_config.json`), every `/api/*` request and every Socket.IO connection must present it as
  `X-API-Key: <key>`, `Authorization: Bearer <key>`, `?api_key=<key>`, or (Socket.IO only) the
  connect payload `{"api_key": "<key>"}`. See [docs/SERVICE_AND_AUTOMATION.md](docs/SERVICE_AND_AUTOMATION.md).
- **Button codes:** integers 0–255; JSON bodies may also use a decimal or `"0x10"`-style string.
  Full list: [docs/BUTTONS.md](../docs/BUTTONS.md).

## REST API

### Endpoints

#### Get Current TV State

```http
GET /api/state
```

**Response** (abridged):
```json
{
  "powered_on": false,
  "volume": 50,
  "channel": 1,
  "muted": false,
  "current_app": null,
  "input_source": "HDMI 1",
  "picture_mode": "Standard",
  "sound_mode": "Standard",
  "game_mode": false,
  "brightness": 50,
  "backlight": 50,
  "show_menu": false,
  "show_info": false,
  "show_settings": false,
  "channel_input": "",
  "last_button": null,
  "notification": null,
  "detected_brand": null,
  "detected_brand_id": 0,
  "room_state": { "scene": "default", "lights_main": 100, "smart_plug_1": true, "...": "..." }
}
```

`current_app` is `null` for live TV, `"Home"` for the home screen, or an app name such as `"Netflix"`.

**Example:**
```bash
curl http://localhost:5000/api/state
```

#### Send Button Code

```http
POST /api/button
Content-Type: application/json
```

**Request Body:**
```json
{
  "button_code": 16
}
```

Optional `"from_hardware": true|false` (default `true`) controls whether the server also emits
the `hardware_interrupt` / `button_press_interrupt` WebSocket events.

**Response:**
```json
{"status": "success", "button_code": 16}
```

Invalid bodies or codes return `400` with `{"status": "error", "message": "..."}`.

**Example:**
```bash
curl -X POST http://localhost:5000/api/button \
  -H "Content-Type: application/json" \
  -d '{"button_code": 16}'
```

#### Detect TV Brand (keyword matching)

```http
POST /api/detect-brand
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "I have a Samsung Q80 TV"
}
```
(`query` is also accepted as a key.)

**Response:**
```json
{
  "brand": "Samsung",
  "brand_id": 1,
  "confidence": 0.93
}
```

Detection is keyword-based only: the text is matched against a fixed table (see `brand_detection.BRAND_KEYWORDS`). No external APIs or models. `brand_id` matches C `tv_brand_t` in `include/universal_tv.h` (0=Unknown, 1=Samsung, 2=LG, 3=Sony, 4=Philips, etc.). Simulator updates `tv_state.detected_brand` and `tv_state.detected_brand_id` and broadcasts a state update.

**Example:**
```bash
curl -X POST http://localhost:5000/api/detect-brand \
  -H "Content-Type: application/json" \
  -d '{"text": "LG OLED C2"}'
```

#### Get Current Frame (PNG)

```http
GET /api/frame
```

Returns the current TV screen frame as a PNG image.

**Example:**
```bash
curl http://localhost:5000/api/frame -o frame.png
```

#### Get Current Frame (JSON)

```http
GET /api/frame?format=json
```

Returns frame data as JSON. When a frame is available: base64-encoded image in `frame`, plus `timestamp`, `width`, `height`, `format`. When no frame is available yet: `frame` is `null`, `timestamp` is `0`, `width`/`height` are `0`; the response is always JSON so clients can safely call `response.json()`.

**Response:**
```json
{
  "frame": "iVBORw0KGgoAAAANSUhEUgAA...",
  "timestamp": 1234567890.123,
  "width": 512,
  "height": 512,
  "format": "png"
}
```

**Example:**
```bash
curl http://localhost:5000/api/frame?format=json | jq
```

#### Get Current Frame (JPEG)

```http
GET /api/frame?format=jpeg
```

Returns frame as JPEG (requires Pillow: `pip install Pillow`).

**Example:**
```bash
curl http://localhost:5000/api/frame?format=jpeg -o frame.jpg
```

#### Get Frame Metadata

```http
GET /api/frame/info
```

Returns frame information.

**Response:**
```json
{
  "has_frame": true,
  "timestamp": 1234567890.123,
  "width": 512,
  "height": 512,
  "format": "png",
  "age_seconds": 0.15
}
```

**Example:**
```bash
curl http://localhost:5000/api/frame/info
```

#### Get Graphics Preset (GPU tier)

```http
GET /api/graphics-preset
GET /api/graphics-preset?refresh=1
```

Returns the current GPU-based graphics preset used by the 3D simulator (tier, GPU name, VRAM, and all preset keys: antialias, shadowMapEnabled, shadowMapSize, pixelRatio, texture sizes, fogFar, ambientParticleCount, etc.). Used at runtime by the simulator for renderer, shadows, textures, fog, and particles.

- Without query: returns cached preset (computed at first use).
- With `?refresh=1`: recomputes preset (re-detects GPU and reclassifies tier), then returns it.

**Response (example):**
```json
{
  "_tier": "MEDIUM",
  "_gpu_name": "NVIDIA GeForce GTX 1060",
  "_vram_gb": 6.0,
  "antialias": true,
  "shadowMapEnabled": true,
  "shadowMapType": "PCFShadowMap",
  "shadowMapSize": 1024,
  "pixelRatio": 0.95,
  "fogFar": 32,
  "ambientParticleCount": 40
}
```

**Example:**
```bash
curl http://localhost:5000/api/graphics-preset
curl "http://localhost:5000/api/graphics-preset?refresh=1"
```

#### Set Graphics Config (persist tier override)

```http
POST /api/graphics-preset
Content-Type: application/json
```

Persists graphics config to disk (`graphics_config.json`) and invalidates the cached preset. Use to lock a tier or revert to auto.

**Request body (one or both):**
- `use_auto` (boolean): `true` = use auto tier from GPU; clears any tier override.
- `tier_override` (string): `"ULTRA"` | `"HIGH"` | `"MEDIUM"` | `"LOW"` | `"SIM_SAFE"` to force that tier; sets auto off.

**Response (success):**
```json
{
  "ok": true,
  "preset": { "_tier": "MEDIUM", ... }
}
```

**Examples:**
```bash
# Lock to MEDIUM tier
curl -X POST http://localhost:5000/api/graphics-preset -H "Content-Type: application/json" -d '{"tier_override": "MEDIUM"}'

# Revert to auto (GPU-based tier)
curl -X POST http://localhost:5000/api/graphics-preset -H "Content-Type: application/json" -d '{"use_auto": true}'
```

Config is used by the next `GET /api/graphics-preset` or page load. Hysteresis (to avoid preset flickering at VRAM boundaries) uses the persisted `last_tier` from this config.

## Service & automation API

When running as a **remote-as-a-service** (see [docs/SERVICE_AND_AUTOMATION.md](docs/SERVICE_AND_AUTOMATION.md)), these endpoints are available. Optional auth: if `service_config.json` has `api_key`, send `X-API-Key` or `Authorization: Bearer <key>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check: `{ "status": "ok", "service": "tv_remote", "version": "1.0.0", "simulator": true }` |
| GET | `/api/presets` | List presets and default_target from autonomous_config |
| POST | `/api/preset/<name>/trigger` | Run preset; body/query `target` (default simulator; unknown targets return 400) |
| GET | `/api/backends` | List backend names (simulator, broadlink, samsung, lg, cec) |
| GET | `/api/backends/status` | Backend availability: `{ name: { name, available } }` |
| POST | `/api/backends/broadlink/learn` | Learn IR code; body `{ "host": "IP", "timeout_sec": 10 }` → `{ "ir_hex": "..." }` |

**Examples:**

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/presets
curl -X POST http://localhost:5000/api/preset/living_room_evening/trigger -H "Content-Type: application/json" -d '{"target":"simulator"}'
curl http://localhost:5000/api/backends/status
curl -X POST http://localhost:5000/api/backends/broadlink/learn -H "Content-Type: application/json" -d '{"host":"192.168.1.100","timeout_sec":10}'
```

OpenAPI 3.0 spec: `GET /api/openapi.yaml` or `GET /api/openapi` (JSON).

## WebSocket Events

Socket.IO on the same host and port.

```javascript
const socket = io('http://localhost:5000');
// With an API key configured:
// const socket = io('http://localhost:5000', {auth: {api_key: KEY}});
```

### Client → server

| Event | Payload | Effect |
|-------|---------|--------|
| `button_press` | `{button_code: 16}` | Press a button (treated as a UI press, no interrupt events) |
| `request_state` | none | Server replies with `tv_state_update` and `graphics_preset` |
| `update_volume` | `{volume: 0-100}` | Set the volume directly |
| `frame_update` | `{frame_data: <base64>, width, height, format}` | Store the latest TV frame for the streaming API (the 3D page sends this about every 200 ms) |

### Server → client

| Event | When | Payload |
|-------|------|---------|
| `connected` | On connect | `{message}` |
| `tv_state_update` | On connect and after every state change | Full TV state (same shape as `GET /api/state`) |
| `graphics_preset` | On connect and on `request_state` | Graphics preset; `_tier`, `_gpu_name`, `_vram_gb` describe the GPU |
| `hardware_interrupt` | Button press from REST/C (`from_hardware` true) | `{type: "gpio", button_code, button_name, timestamp}` |
| `button_press_interrupt` | Same as above | `{button_code, button_name, timestamp}` |
| `hmr:file_changed` | Debug mode only, when a file under `web_static/` changes | `{path, timestamp}` |

```javascript
socket.on('tv_state_update', (state) => console.log(state.powered_on, state.current_app));
socket.on('graphics_preset', (p) => console.log('tier', p._tier, 'GPU', p._gpu_name));
```

## Streaming API

### How It Works

1. **Client-Side Capture**: The JavaScript client captures frames from the TV canvas every 200ms (5 FPS)
2. **WebSocket Transmission**: Frames are sent to the server via WebSocket (`frame_update` event)
3. **Server Storage**: The server stores the latest frame in memory
4. **API Access**: REST endpoints serve the stored frame to clients

### Performance Notes

- **Frame Rate**: Frames are captured at ~5 FPS (every 200ms) to avoid overloading the server
- **Memory**: Latest frame only is stored (not a buffer)
- **Format**: Default is PNG (512x512 pixels)
- **No frame yet**: until a browser has sent a frame, `GET /api/frame` returns a black placeholder PNG (512x512 with Pillow, 1x1 without) and `/api/frame/info` reports `"has_frame": false`
- **Latency**: Frame age is typically < 1 second

### Requirements

- **Basic**: Works out of the box with PNG format
- **JPEG Support**: Install Pillow: `pip install Pillow` (included in `requirements-dev.txt`)
- **Server**: Must be running (`python web_server.py` or `poetry run web-server`)
- **Client**: Browser must be connected to capture frames

## Integration Examples

### Python

```python
import requests
import base64
from PIL import Image
import io

# Get frame as PNG
response = requests.get('http://localhost:5000/api/frame')
with open('frame.png', 'wb') as f:
    f.write(response.content)

# Get frame as JSON and decode
response = requests.get('http://localhost:5000/api/frame?format=json')
data = response.json()
img_data = base64.b64decode(data['frame'])
img = Image.open(io.BytesIO(img_data))
img.save('decoded_frame.png')

# Send button press
response = requests.post('http://localhost:5000/api/button', 
                        json={'button_code': 16})
print(response.json())

# Get TV state
response = requests.get('http://localhost:5000/api/state')
print(response.json())
```

### JavaScript/Node.js

```javascript
const axios = require('axios');
const fs = require('fs');

// Get frame as PNG
axios.get('http://localhost:5000/api/frame', {
  responseType: 'arraybuffer'
}).then(response => {
  fs.writeFileSync('frame.png', response.data);
});

// Get frame info
axios.get('http://localhost:5000/api/frame/info')
  .then(response => {
    console.log('Frame info:', response.data);
  });

// Send button press
axios.post('http://localhost:5000/api/button', {
  button_code: 16
}).then(response => {
  console.log('Button pressed:', response.data);
});

// Get TV state
axios.get('http://localhost:5000/api/state')
  .then(response => {
    console.log('TV State:', response.data);
  });
```

### Browser Console

```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000');

// Listen for state updates
socket.on('tv_state_update', (data) => {
  console.log('TV State:', data);
});

// Send button press
socket.emit('button_press', {button_code: 0x10}); // Power

// Or via REST API
fetch('/api/button', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({button_code: 0x10})
});
```

## API Status Codes

- `200`: Success
- `400`: Bad request (malformed JSON, invalid button code, unknown preset target, bad `timeout_sec`)
- `401`: Missing or wrong API key (only when a key is configured)
- `404`: Preset not found
- `408`: Broadlink learning timed out
- `429`: Rate limit exceeded (`TV_REMOTE_RATE_LIMIT`)
- `500`: Server error
- `501`: Feature not available (JPEG without Pillow, Broadlink library not installed)
- `503`: Broadlink device not found

## Troubleshooting

### No frames available
- Ensure the browser is connected to the TV simulator
- Check that the TV is powered on
- Verify WebSocket connection is active

### JPEG format not working
- Install Pillow: `pip install Pillow`
- Check server logs for errors

### Frame is black
- TV might be powered off
- Check TV state: `curl http://localhost:5000/api/state`

### WebSocket connection fails
- Make sure the server is running and the port is reachable
- If an API key is configured, pass it in the Socket.IO `auth` payload
- Cross-origin pages need `TV_REMOTE_CORS_ORIGINS` (default is same-origin only)

## Testing

### Quick Test

```bash
# Get a single frame
curl http://localhost:5000/api/frame -o test.png

# Check frame info
curl http://localhost:5000/api/frame/info

# Get frame as JSON
curl http://localhost:5000/api/frame?format=json

# Continuous capture (5 frames)
for i in {1..5}; do
  curl http://localhost:5000/api/frame -o "frame_$i.png"
  sleep 0.5
done
```

### Test from Browser Console

```javascript
// Send button press via WebSocket
socket.emit('button_press', {button_code: 0x10}); // Power

// Or via REST API
fetch('/api/button', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({button_code: 0x10})
});
```

