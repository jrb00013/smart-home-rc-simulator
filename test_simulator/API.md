# API Documentation

Complete API reference for the Virtual TV Simulator.

## Overview

The TV Simulator provides both REST API endpoints and WebSocket events for real-time communication.

## REST API

### Base URL

```
http://localhost:5000
```

### Endpoints

#### Get Current TV State

```http
GET /api/state
```

**Response:**
```json
{
  "power": true,
  "volume": 50,
  "channel": 1,
  "mute": false,
  "app": "TV",
  "game_mode": false,
  "input": "HDMI 1"
}
```

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

**Response:**
```json
{
  "success": true,
  "button_code": 16,
  "state": {
    "power": true,
    "volume": 50,
    "channel": 1
  }
}
```

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
  "confidence": 0.85
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

Returns frame data as JSON with base64-encoded image.

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

## WebSocket Events

### Connection

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:5000');
```

### Client → Server Events

#### Button Press

```javascript
socket.emit('button_press', {
  button_code: 16  // Power button
});
```

**Parameters:**
- `button_code` (number): Button code (hexadecimal or decimal)

### Server → Client Events

#### TV State Update

Emitted when the TV state changes.

```javascript
socket.on('tv_state_update', (data) => {
  console.log('TV State:', data);
  // {
  //   power: true,
  //   volume: 50,
  //   channel: 1,
  //   mute: false,
  //   app: "TV",
  //   game_mode: false,
  //   input: "HDMI 1"
  // }
});
```

#### Button Press (Echo)

Emitted when a button is pressed (echo of the button press event).

```javascript
socket.on('button_press', (data) => {
  console.log('Button pressed:', data.button_code);
});
```

## Button Codes

All button codes match `include/remote_buttons.h`:

### Basic Controls
- `0x10` = Power
- `0x11` = Volume Up
- `0x12` = Volume Down
- `0x13` = Mute
- `0x14` = Channel Up
- `0x15` = Channel Down

### Navigation
- `0x20` = Home
- `0x21` = Menu
- `0x22` = Back
- `0x23` = Info

### Streaming Services
- `0x01` = YouTube
- `0x02` = Netflix
- `0x03` = Amazon Prime
- `0x04` = HBO Max

### Input/Source
- `0x25` = Input
- `0x26` = Source

### Number Pad
- `0x30` = 0
- `0x31` = 1
- `0x32` = 2
- ... (up to 9)

See `include/remote_buttons.h` for complete list.

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
- **Latency**: Frame age is typically < 1 second

### Requirements

- **Basic**: Works out of the box with PNG format
- **JPEG Support**: Install Pillow: `pip install Pillow`
- **Server**: Must be running (`poetry run web-server` or `python web_server.py`)
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
- `400`: Bad request
- `500`: Server error
- `501`: Feature not available (e.g., JPEG without Pillow)

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
- Make sure server is running
- Check firewall settings
- Verify port 5000 is accessible

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

