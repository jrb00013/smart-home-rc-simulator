#!/usr/bin/env python3
"""
Web Server for Virtual TV Simulator.
Production: set TV_REMOTE_HOST, TV_REMOTE_PORT, TV_REMOTE_SECRET_KEY, TV_REMOTE_CORS_ORIGINS, TV_REMOTE_LOG_LEVEL via env.
"""

from flask import Flask, render_template, send_from_directory, request, Response, jsonify
from flask_socketio import SocketIO, emit
import logging
import threading
import time
import sys
import os
import base64
import io
from pathlib import Path

# App config (env-first)
try:
    from app_config import (
        get_host,
        get_port,
        get_secret_key,
        get_cors_origins,
        get_log_level,
        get_debug,
        get_rate_limit,
        validate_config,
        is_loopback_host,
    )
except ImportError:
    import secrets as _secrets

    def get_host(): return "127.0.0.1"
    def get_port(): return 5000
    def get_secret_key(): return _secrets.token_hex(32)
    def get_cors_origins(): return []
    def get_log_level(): return "INFO"
    def get_debug(): return False
    def get_rate_limit(): return None
    def validate_config(strict=False): return []
    def is_loopback_host(host): return host in ("127.0.0.1", "localhost", "::1")

# Structured logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=getattr(logging, get_log_level(), logging.INFO),
    stream=sys.stdout,
)
log = logging.getLogger("web_server")

# Optional PIL/Pillow for image format conversion
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    log.info("PIL/Pillow not available - JPEG conversion disabled, PNG only")

app = Flask(__name__,
            template_folder='web_templates',
            static_folder='web_static')
app.config['SECRET_KEY'] = get_secret_key()
app.config['DEBUG'] = get_debug()
cors_list = list(get_cors_origins() or [])
# None = same-origin only. Never pass [] here: python-engineio treats [] as "CORS checks disabled".
socketio = SocketIO(app, cors_allowed_origins=cors_list or None, async_mode='threading')

# Service layer: auth, webhooks, MQTT (optional) - must be before first use
try:
    from service_layer import (
        load_service_config,
        check_auth,
        fire_webhook,
        publish_mqtt,
    )
    SERVICE_LAYER_AVAILABLE = True
except ImportError:
    SERVICE_LAYER_AVAILABLE = False
    def check_auth(req, auth=None): return None
    def fire_webhook(event, payload): pass
    def publish_mqtt(event, payload): pass
    def load_service_config(path=None): return {}

# Load service config at startup (auth, webhooks, MQTT)
if SERVICE_LAYER_AVAILABLE:
    load_service_config()

# Optional rate limit: in-memory, per IP (e.g. TV_REMOTE_RATE_LIMIT=100/hour or 10/minute)
_rate_limit_store = {}
_rate_limit_lock = threading.Lock()
_RATE_LIMIT_MAX_TRACKED = 10000


def _rate_limit_exceeded(ip: str) -> bool:
    cfg = get_rate_limit()
    if not cfg or not cfg.strip():
        return False
    try:
        parts = cfg.strip().lower().split("/")
        limit_str = "".join(c for c in (parts[0] or "") if c.isdigit())
        limit = int(limit_str or "0")
        if limit <= 0:
            return False
        window_sec = 3600 if len(parts) > 1 and "hour" in parts[1] else 60
    except Exception:
        return False
    now = time.time()
    with _rate_limit_lock:
        if len(_rate_limit_store) > _RATE_LIMIT_MAX_TRACKED:
            # Drop expired windows so the store cannot grow without bound.
            for k in [k for k, (_, st) in _rate_limit_store.items() if now - st > window_sec]:
                del _rate_limit_store[k]
        count, start = _rate_limit_store.get(ip, (0, now))
        if now - start > window_sec:
            count, start = 0, now
        count += 1
        _rate_limit_store[ip] = (count, start)
        if count > limit:
            return True
    return False


def _api_error(code: int, error: str, message: str = None):
    """Consistent JSON error response for production."""
    body = {"error": error}
    if message:
        body["message"] = message
    return jsonify(body), code


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return _api_error(404, "Not Found", request.path)
    return e


@app.errorhandler(500)
def server_error(e):
    log.exception("Internal server error")
    if request.path.startswith("/api/"):
        return _api_error(500, "Internal Server Error", "An unexpected error occurred.")
    return e


@app.before_request
def api_auth():
    """Require API key for /api/* if service_config.api_key is set; optional rate limit."""
    if not request.path.startswith("/api/"):
        return None
    if _rate_limit_exceeded(request.remote_addr or "unknown"):
        return _api_error(429, "Too Many Requests", "Rate limit exceeded.")
    if SERVICE_LAYER_AVAILABLE:
        err = check_auth(request)
        if err is not None:
            return jsonify(err[0]), err[1]
    return None


@app.after_request
def security_headers(resp):
    """Basic hardening headers (frames are served from client-supplied data)."""
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    return resp


STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web_static')


@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files (send_from_directory rejects paths escaping STATIC_DIR)."""
    return send_from_directory(STATIC_DIR, filename)

# TV State (shared with simulator logic)
tv_state = {
    'powered_on': False,
    'volume': 50,
    'channel': 1,
    'muted': False,
    'current_app': None,  # None = live TV (channel view); 'Home' = home screen
    'input_source': 'HDMI 1',
    'picture_mode': 'Standard',
    'sound_mode': 'Standard',
    'game_mode': False,
    'brightness': 50,
    'backlight': 50,
    'show_menu': False,
    'show_info': False,
    'show_settings': False,
    'channel_input': '',
    'last_button': None,
    'notification': None,
    'detected_brand': None,
    'detected_brand_id': 0,
}

# Room / smart home state (whole house automation; remote controls every device)
room_state = {
    'scene': 'default',       # 'default' | 'movie' | 'relax' | 'off'
    'lights_main': 100,       # 0-100 ceiling/main
    'lights_lamp_left': 100,
    'lights_lamp_right': 100,
    'smart_plug_1': True,
    'smart_plug_2': True,
    'smart_plug_3': True,
    'smart_speaker': True,
    'ambient_strip': True,
    'kitchen_light': True,
    'fridge_on': True,
    'oven_on': False,
    'bedroom_lamp': True,
    'bathroom_light': True,
    'upstairs_hall': True,
    'entry_light': True,
    'upstairs_bedroom_lamp': True,
    'upstairs_bathroom_light': True,
    'hood_light': True,
}
tv_state['room_state'] = room_state  # so client gets it in tv_state_update

# Frame storage for streaming API (client sends frames when TV screen updates)
current_frame = {
    'data': None,  # Base64 encoded image data
    'timestamp': 0,
    'format': 'png',
    'width': 512,
    'height': 512,
    'frames_processed': 0,  # Total frames received from client (confirms frame pipeline is working)
}
frame_lock = threading.Lock()

# Button codes from C: include/remote_buttons.h + get_button_name() (single source of truth)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from button_codes import BUTTON_CODES

# GPU-based graphics preset (detected at startup, used by 3D simulator)
def _get_graphics_preset():
    try:
        from gpu_runtime import get_graphics_preset
        return get_graphics_preset(resolution_width=1920, resolution_height=1080)
    except Exception as e:
        log.debug("GPU preset fallback (SIM_SAFE): %s", e)
        from gpu_runtime.preset_mapper import GraphicsPresetMapper
        p = GraphicsPresetMapper().map("SIM_SAFE")
        p["_tier"] = "SIM_SAFE"
        p["_gpu_name"] = None
        p["_vram_gb"] = None
        return p

_graphics_preset = None

def get_graphics_preset_cached():
    global _graphics_preset
    if _graphics_preset is None:
        _graphics_preset = _get_graphics_preset()
        log.info("Graphics preset: tier=%s gpu=%s", _graphics_preset.get('_tier'), _graphics_preset.get('_gpu_name'))
    return _graphics_preset

CHANNEL_INPUT_TIMEOUT_SEC = 2.0
NOTIFICATION_CLEAR_SEC = 2.0
_notification_timer = None
_notification_lock = threading.Lock()


def parse_button_code(value):
    """Validate a button code from untrusted input.

    Accepts an int 0-255, or a decimal / 0x-prefixed hex string. Returns the int,
    or None if invalid. Booleans and out-of-range values are rejected instead of
    being silently masked with & 0xFF (which turned e.g. 0x110 into Power).
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        code = value
    elif isinstance(value, str):
        v = value.strip()
        try:
            code = int(v, 16) if v.lower().startswith("0x") else int(v, 10)
        except ValueError:
            return None
    else:
        return None
    return code if 0 <= code <= 0xFF else None


def _schedule_notification_clear():
    """Clear the notification after NOTIFICATION_CLEAR_SEC using a single timer.

    Previously every press spawned a sleeping thread that cleared whatever
    notification was current 2s later, so a newer notification could vanish early
    and rapid presses piled up threads.
    """
    global _notification_timer

    def _clear(expected):
        if tv_state.get('notification') == expected:
            tv_state['notification'] = None
            socketio.emit('tv_state_update', tv_state)

    with _notification_lock:
        if _notification_timer is not None:
            _notification_timer.cancel()
        _notification_timer = threading.Timer(NOTIFICATION_CLEAR_SEC, _clear, args=(tv_state.get('notification'),))
        _notification_timer.daemon = True
        _notification_timer.start()


def handle_button_press(button_code, from_hardware=False):
    """Handle button press and update TV state
    @param button_code: Button code to handle (int 0x00-0xFF, or decimal/hex str)
    @param from_hardware: True if this came from hardware interrupt, False for UI clicks
    @return: True if handled, False if the code was invalid (state untouched)
    """
    code = parse_button_code(button_code)
    if code is None:
        log.warning("Ignoring invalid button code: %r", button_code)
        return False
    button_code = code
    button_name = BUTTON_CODES.get(button_code, f"Unknown (0x{button_code:02X})")
    tv_state['last_button'] = button_name
    tv_state['notification'] = f"Button: {button_name}"
    
    if from_hardware:
        log.debug("Button pressed (hardware): %s (0x%02X)", button_name, button_code)
        # Only emit interrupt events for actual hardware interrupts
        interrupt_data = {
            'type': 'gpio',
            'button_code': button_code,
            'button_name': button_name,
            'timestamp': time.time()
        }
        socketio.emit('hardware_interrupt', interrupt_data)
        socketio.emit('button_press_interrupt', {
            'button_code': button_code,
            'button_name': button_name,
            'timestamp': time.time()
        })
    else:
        log.debug("Button pressed (UI): %s (0x%02X)", button_name, button_code)
    
    # Room / smart home automation (0xE0-0xE7 scenes + 0xE8-0xF3 device toggles)
    if 0xE0 <= button_code <= 0xE7:
        if button_code == 0xE0:   # Room: Movie
            room_state['scene'] = 'movie'
            room_state['lights_main'] = 15
            room_state['lights_lamp_left'] = 10
            room_state['lights_lamp_right'] = 10
            room_state['ambient_strip'] = True
            tv_state['notification'] = 'Room: Movie scene'
        elif button_code == 0xE1:  # Room: Relax
            room_state['scene'] = 'relax'
            room_state['lights_main'] = 40
            room_state['lights_lamp_left'] = 60
            room_state['lights_lamp_right'] = 50
            room_state['ambient_strip'] = True
            tv_state['notification'] = 'Room: Relax scene'
        elif button_code == 0xE2:  # Room: Off (whole house off)
            room_state['scene'] = 'off'
            room_state['lights_main'] = 0
            room_state['lights_lamp_left'] = 0
            room_state['lights_lamp_right'] = 0
            room_state['ambient_strip'] = False
            room_state['kitchen_light'] = False
            room_state['fridge_on'] = False
            room_state['oven_on'] = False
            room_state['bedroom_lamp'] = False
            room_state['bathroom_light'] = False
            room_state['upstairs_hall'] = False
            room_state['entry_light'] = False
            room_state['upstairs_bedroom_lamp'] = False
            room_state['upstairs_bathroom_light'] = False
            room_state['hood_light'] = False
            room_state['smart_plug_1'] = False
            room_state['smart_plug_2'] = False
            room_state['smart_plug_3'] = False
            room_state['smart_speaker'] = False
            tv_state['notification'] = 'Room: All off'
        elif button_code == 0xE3:  # Lights Dim
            room_state['lights_main'] = max(0, room_state['lights_main'] - 25)
            room_state['lights_lamp_left'] = max(0, room_state['lights_lamp_left'] - 25)
            room_state['lights_lamp_right'] = max(0, room_state['lights_lamp_right'] - 25)
            tv_state['notification'] = 'Room: Lights dimmed'
        elif button_code == 0xE4:  # Lights Full
            room_state['lights_main'] = 100
            room_state['lights_lamp_left'] = 100
            room_state['lights_lamp_right'] = 100
            room_state['scene'] = 'default'
            tv_state['notification'] = 'Room: Lights full'
        elif button_code == 0xE5:  # Smart Plug 1
            room_state['smart_plug_1'] = not room_state['smart_plug_1']
            tv_state['notification'] = f"Plug 1: {'ON' if room_state['smart_plug_1'] else 'OFF'}"
        elif button_code == 0xE6:  # Smart Speaker
            room_state['smart_speaker'] = not room_state['smart_speaker']
            tv_state['notification'] = f"Speaker: {'ON' if room_state['smart_speaker'] else 'OFF'}"
        elif button_code == 0xE7:  # Ambient Strip
            room_state['ambient_strip'] = not room_state['ambient_strip']
            tv_state['notification'] = f"Ambient: {'ON' if room_state['ambient_strip'] else 'OFF'}"
    # Whole-house device toggles (0xE8-0xF3) - each instrument controllable from remote
    elif 0xE8 <= button_code <= 0xF3:
        key, label = {
            0xE8: ('smart_plug_2', 'Plug 2'),
            0xE9: ('smart_plug_3', 'Plug 3'),
            0xEA: ('kitchen_light', 'Kitchen Light'),
            0xEB: ('fridge_on', 'Fridge'),
            0xEC: ('oven_on', 'Oven'),
            0xED: ('bedroom_lamp', 'Bedroom Lamp'),
            0xEE: ('bathroom_light', 'Bathroom Light'),
            0xEF: ('upstairs_hall', 'Upstairs Hall'),
            0xF0: ('entry_light', 'Entry Light'),
            0xF1: ('upstairs_bedroom_lamp', 'Upstairs Bedroom'),
            0xF2: ('upstairs_bathroom_light', 'Upstairs Bathroom'),
            0xF3: ('hood_light', 'Hood Light'),
        }.get(button_code, (None, None))
        if key:
            room_state[key] = not room_state.get(key, True)
            tv_state['notification'] = f"{label}: {'ON' if room_state[key] else 'OFF'}"
    # Handle TV button actions
    elif button_code == 0x10:  # Power
        tv_state['powered_on'] = not tv_state['powered_on']
        tv_state['notification'] = f"Power: {'ON' if tv_state['powered_on'] else 'OFF'}"
        log.info("TV Power: %s", 'ON' if tv_state['powered_on'] else 'OFF')
        
        # When turning on, show interactive live TV (current channel) by default
        if tv_state['powered_on']:
            tv_state['current_app'] = None  # Channel view = live TV
        
    elif button_code == 0x11:  # Volume Up
        if tv_state['powered_on']:
            tv_state['volume'] = min(100, tv_state['volume'] + 1)
            tv_state['notification'] = f"Volume: {tv_state['volume']}%"
            
    elif button_code == 0x12:  # Volume Down
        if tv_state['powered_on']:
            tv_state['volume'] = max(0, tv_state['volume'] - 1)
            tv_state['notification'] = f"Volume: {tv_state['volume']}%"
            
    elif button_code == 0x13:  # Mute
        if tv_state['powered_on']:
            tv_state['muted'] = not tv_state['muted']
            tv_state['notification'] = f"Mute: {'ON' if tv_state['muted'] else 'OFF'}"
            
    elif button_code == 0x14:  # Channel Up
        if tv_state['powered_on']:
            tv_state['channel'] = (tv_state['channel'] % 999) + 1
            # Switch from app mode to channel mode when changing channels
            # Clear current_app (including 'Home') to show TV channel content
            tv_state['current_app'] = None
            tv_state['notification'] = f"Channel: {tv_state['channel']}"
            
    elif button_code == 0x15:  # Channel Down
        if tv_state['powered_on']:
            tv_state['channel'] = ((tv_state['channel'] - 2) % 999) + 1
            # Switch from app mode to channel mode when changing channels
            # Clear current_app (including 'Home') to show TV channel content
            tv_state['current_app'] = None
            tv_state['notification'] = f"Channel: {tv_state['channel']}"
            
    elif button_code == 0x20:  # Home
        if tv_state['powered_on']:
            tv_state['current_app'] = "Home"
            tv_state['show_menu'] = False
            tv_state['show_settings'] = False
            tv_state['show_info'] = False
            
    elif button_code == 0x21:  # Menu
        if tv_state['powered_on']:
            tv_state['show_menu'] = not tv_state['show_menu']
            tv_state['show_settings'] = False
            tv_state['show_info'] = False
            
    elif button_code == 0x22:  # Back
        if tv_state['powered_on']:
            tv_state['show_menu'] = False
            tv_state['show_settings'] = False
            tv_state['show_info'] = False
    
    elif button_code == 0x25 or button_code == 0x26:  # Input / Source
        if tv_state['powered_on']:
            # Cycle through HDMI inputs
            hdmi_inputs = ['HDMI 1', 'HDMI 2', 'HDMI 3', 'HDMI 4', 'TV', 'Component', 'AV']
            current_index = hdmi_inputs.index(tv_state['input_source']) if tv_state['input_source'] in hdmi_inputs else 0
            next_index = (current_index + 1) % len(hdmi_inputs)
            tv_state['input_source'] = hdmi_inputs[next_index]
            tv_state['notification'] = f"Input: {tv_state['input_source']}"
            
    elif button_code == 0x70:  # Info
        if tv_state['powered_on']:
            tv_state['show_info'] = not tv_state['show_info']
            
    elif button_code == 0x72:  # Settings
        if tv_state['powered_on']:
            tv_state['show_settings'] = not tv_state['show_settings']
            tv_state['show_menu'] = False
            
    elif button_code == 0x01:  # YouTube
        if tv_state['powered_on']:
            tv_state['current_app'] = "YouTube"
            tv_state['notification'] = "Opening YouTube..."
            
    elif button_code == 0x02:  # Netflix
        if tv_state['powered_on']:
            tv_state['current_app'] = "Netflix"
            tv_state['notification'] = "Opening Netflix..."
            
    elif button_code == 0x03:  # Amazon Prime
        if tv_state['powered_on']:
            tv_state['current_app'] = "Amazon Prime"
            tv_state['notification'] = "Opening Amazon Prime..."
            
    elif button_code == 0x04:  # HBO Max
        if tv_state['powered_on']:
            tv_state['current_app'] = "HBO Max"
            tv_state['notification'] = "Opening HBO Max..."
            
    elif button_code == 0x82:  # Live TV
        if tv_state['powered_on']:
            tv_state['current_app'] = None  # Switch to broadcast/channel view
            tv_state['notification'] = "Live TV"
            
    elif button_code == 0xA0:  # Game Mode
        if tv_state['powered_on']:
            tv_state['game_mode'] = not tv_state['game_mode']
            tv_state['notification'] = f"Game Mode: {'ON' if tv_state['game_mode'] else 'OFF'}"
            
    elif button_code >= 0x50 and button_code <= 0x59:  # Number pad
        if tv_state['powered_on']:
            digit = button_code - 0x50
            now = time.time()
            # Start a fresh entry if the previous digits are stale. (The old check ran
            # *after* refreshing the timestamp, so stale digits were never discarded:
            # "4", pause, "5","6" tuned to 456.)
            last = tv_state.get('channel_input_time')
            if last is None or now - last > CHANNEL_INPUT_TIMEOUT_SEC:
                tv_state['channel_input'] = ""
            tv_state['channel_input'] += str(digit)
            tv_state['channel_input_time'] = now
            if len(tv_state['channel_input']) >= 3:
                try:
                    new_channel = int(tv_state['channel_input'])
                    if 0 <= new_channel <= 999:  # 0 = Reality Breach (revolutionary)
                        tv_state['channel'] = new_channel
                        # Switch from app mode to channel mode when entering channel number
                        # Clear current_app (including 'Home') to show TV channel content
                        tv_state['current_app'] = None
                        tv_state['notification'] = f"Channel: {tv_state['channel']}"
                    else:
                        tv_state['notification'] = f"Invalid channel: {new_channel} (0-999)"
                    tv_state['channel_input'] = ""
                except ValueError:
                    tv_state['channel_input'] = ""

    # Broadcast state update to all connected clients
    socketio.emit('tv_state_update', tv_state)

    # Service layer: webhook + MQTT on state change
    if SERVICE_LAYER_AVAILABLE:
        state_snapshot = dict(tv_state)
        fire_webhook("state_change", {"state": state_snapshot, "button_code": button_code})
        publish_mqtt("state_change", {"state": state_snapshot, "button_code": button_code})
    
    _schedule_notification_clear()
    return True

@app.route('/')
def index():
    """Serve the main 3D TV interface (button codes + GPU-based graphics preset)"""
    import json
    preset = get_graphics_preset_cached()
    return render_template(
        'index.html',
        button_codes_json=json.dumps(BUTTON_CODES),
        graphics_preset_json=json.dumps(preset),
    )


@app.route('/api/graphics-preset', methods=['GET', 'POST'])
def api_graphics_preset():
    """
    GET: Return current GPU tier and graphics preset. ?refresh=1 recomputes (auto-update).
    POST: Persist graphics config (tier override or revert to auto). Invalidates cache.
    Body: {"use_auto": true} to use auto tier, or {"tier_override": "MEDIUM"} to lock tier.
    """
    global _graphics_preset
    if request.method == 'POST':
        try:
            from gpu_runtime import set_graphics_config
            data = request.get_json(silent=True)
            if not isinstance(data, dict):
                data = {}
            use_auto = data.get('use_auto')
            tier_override = data.get('tier_override')
            set_graphics_config(use_auto=use_auto, tier_override=tier_override)
            _graphics_preset = None
            preset = get_graphics_preset_cached()
            return jsonify({'ok': True, 'preset': preset})
        except Exception as e:
            return jsonify({'ok': False, 'error': str(e)}), 400
    if request.args.get('refresh') == '1':
        _graphics_preset = _get_graphics_preset()
        log.info("Graphics preset refreshed: tier=%s", _graphics_preset.get('_tier'))
    preset = get_graphics_preset_cached()
    return jsonify(preset)

@app.route('/api/state')
def get_state():
    """Get current TV state (REST API)"""
    return jsonify(tv_state)

@app.route('/api/frame')
def get_frame():
    """Get current TV frame as image (REST API for streaming)
    
    Returns:
        - PNG image by default
        - JSON with base64 data if ?format=json
        - JPEG if ?format=jpeg
    """
    with frame_lock:
        format_type = request.args.get('format', 'png').lower()

        if current_frame['data'] is None:
            # No frame: honor format=json so client gets JSON; otherwise return black placeholder
            if format_type == 'json':
                return jsonify({
                    'frame': None,
                    'timestamp': 0,
                    'width': 0,
                    'height': 0,
                    'format': 'png',
                })
            if HAS_PIL:
                img = Image.new('RGB', (512, 512), color='black')
                img_io = io.BytesIO()
                img.save(img_io, format='PNG')
                img_io.seek(0)
                return Response(img_io.getvalue(), mimetype='image/png')
            black_png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            return Response(black_png, mimetype='image/png')
        
        if format_type == 'json':
            # Return JSON with base64 encoded image
            return jsonify({
                'frame': current_frame['data'],
                'timestamp': current_frame['timestamp'],
                'width': current_frame['width'],
                'height': current_frame['height'],
                'format': current_frame['format']
            })
        elif format_type == 'jpeg' or format_type == 'jpg':
            # Decode base64 and convert to JPEG (requires PIL/Pillow)
            if not HAS_PIL:
                return jsonify({'error': 'JPEG format requires PIL/Pillow. Install with: pip install Pillow'}), 501
            try:
                img_data = base64.b64decode(current_frame['data'])
                img = Image.open(io.BytesIO(img_data))
                if img.format != 'JPEG':
                    # Convert to RGB if needed (remove alpha channel)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        rgb_img = Image.new('RGB', img.size, (0, 0, 0))
                        rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = rgb_img
                    img_io = io.BytesIO()
                    img.save(img_io, format='JPEG', quality=85)
                    img_io.seek(0)
                    return Response(img_io.getvalue(), mimetype='image/jpeg')
                # Already JPEG: serve as-is (previously fell through and returned None -> 500)
                return Response(img_data, mimetype='image/jpeg')
            except Exception as e:
                log.warning("Error converting frame to JPEG: %s", e)
                return _api_error(500, 'Frame conversion failed', 'Stored frame is not a valid image.')
        else:
            # Return PNG (default)
            try:
                img_data = base64.b64decode(current_frame['data'], validate=True)
                return Response(img_data, mimetype='image/png')
            except Exception as e:
                log.warning("Error decoding frame: %s", e)
                return _api_error(500, 'Frame decode failed', 'Stored frame is not valid base64.')

@app.route('/api/frame/info')
def get_frame_info():
    """Get frame metadata (REST API). Use frames_processed to verify client is sending frames."""
    with frame_lock:
        return jsonify({
            'has_frame': current_frame['data'] is not None,
            'timestamp': current_frame['timestamp'],
            'width': current_frame['width'],
            'height': current_frame['height'],
            'format': current_frame['format'],
            'frames_processed': current_frame.get('frames_processed', 0),
            'age_seconds': time.time() - current_frame['timestamp'] if current_frame['timestamp'] > 0 else None
        })

@socketio.on('connect')
def handle_connect(auth=None):
    """Handle client connection. When an API key is configured, Socket.IO clients must
    present it too (auth={"api_key": ...}, X-API-Key header, Bearer token or ?api_key=);
    otherwise the WebSocket events would bypass the REST API key check entirely."""
    if SERVICE_LAYER_AVAILABLE and check_auth(request, auth) is not None:
        log.warning("Rejected unauthenticated Socket.IO connection from %s", request.remote_addr)
        return False
    log.debug("Client connected: %s", request.sid)
    emit('tv_state_update', tv_state)
    emit('graphics_preset', get_graphics_preset_cached())
    emit('connected', {'message': 'Connected to Virtual TV Simulator'})

@socketio.on('request_state')
def handle_request_state():
    """Handle state request from client"""
    emit('tv_state_update', tv_state)
    emit('graphics_preset', get_graphics_preset_cached())

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    log.debug("Client disconnected: %s", request.sid)

@socketio.on('button_press')
def handle_button_press_ws(data):
    """Handle button press from web client via WebSocket (UI clicks, not hardware)"""
    if not isinstance(data, dict):
        return
    button_code = data.get('button_code')
    if button_code is not None:
        handle_button_press(button_code, from_hardware=False)

@socketio.on('update_volume')
def handle_update_volume(data):
    """Handle volume update from client (including volume stabilizer)"""
    volume = data.get('volume') if isinstance(data, dict) else None
    if isinstance(volume, (int, float)) and not isinstance(volume, bool) and 0 <= volume <= 100:
        volume = int(volume)
        old_volume = tv_state['volume']
        tv_state['volume'] = volume
        log.debug("Volume updated: %s%% -> %s%%", old_volume, volume)
        socketio.emit('tv_state_update', tv_state)
    else:
        log.warning("Invalid volume update received: %s", volume)

MAX_FRAME_B64_LEN = 8 * 1024 * 1024


@socketio.on('frame_update')
def handle_frame_update(data):
    """Handle frame update from client (for streaming API)"""
    if not isinstance(data, dict):
        return
    frame_data = data.get('frame_data')  # Base64 encoded image
    width = data.get('width', 512)
    height = data.get('height', 512)
    format_type = data.get('format', 'png')
    if not isinstance(frame_data, str) or len(frame_data) > MAX_FRAME_B64_LEN:
        return
    if frame_data.startswith('data:') and ',' in frame_data:
        frame_data = frame_data.split(',', 1)[1]  # accept canvas.toDataURL() output
    if not all(isinstance(v, int) and not isinstance(v, bool) and 0 < v <= 8192 for v in (width, height)):
        return
    if format_type not in ('png', 'jpeg'):
        format_type = 'png'

    if frame_data:
        with frame_lock:
            current_frame['data'] = frame_data
            current_frame['timestamp'] = time.time()
            current_frame['width'] = width
            current_frame['height'] = height
            current_frame['format'] = format_type
            current_frame['frames_processed'] = current_frame.get('frames_processed', 0) + 1
            n = current_frame['frames_processed']
        if n % 50 == 1:
            log.debug("Frames processing: %s received (%sx%s)", n, width, height)

@app.route('/api/openapi.yaml')
def api_openapi_yaml():
    """Serve OpenAPI 3.0 spec (YAML)."""
    spec_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'openapi.yaml')
    if os.path.isfile(spec_path):
        with open(spec_path, 'r', encoding='utf-8') as f:
            return Response(f.read(), mimetype='application/x-yaml')
    return jsonify({'openapi': '3.0.3', 'info': {'title': 'TV Remote API'}}), 200

@app.route('/api/openapi')
@app.route('/api/openapi.json')
def api_openapi():
    """Serve OpenAPI 3.0 spec (JSON)."""
    try:
        import yaml
        spec_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'openapi.yaml')
        if os.path.isfile(spec_path):
            with open(spec_path, 'r', encoding='utf-8') as f:
                spec = yaml.safe_load(f)
            return jsonify(spec)
    except ImportError:
        pass
    return jsonify({'openapi': '3.0.3', 'info': {'title': 'TV Remote API', 'version': '1.0.0'}}), 200

@app.route('/api/health')
def api_health():
    """Health check for load balancers and monitoring."""
    return jsonify({
        "status": "ok",
        "service": "tv_remote",
        "version": "1.0.0",
        "simulator": True,
    })

@app.route('/api/backends')
def api_backends():
    """List available backends (simulator, broadlink, samsung, lg, cec)."""
    try:
        from adapters.registry import list_backends
        return jsonify(list_backends())
    except Exception:
        return jsonify(['simulator'])

@app.route('/api/backends/status')
def api_backends_status():
    """List backends with availability status."""
    try:
        from adapters.registry import list_backends, get_adapter
        names = list_backends()
        result = {}
        for n in names:
            try:
                a = get_adapter(n)
                result[n] = {"name": n, "available": a.available()}
            except Exception:
                result[n] = {"name": n, "available": False}
        return jsonify(result)
    except Exception:
        log.exception("Listing backend status failed")
        return _api_error(500, "Internal Server Error", "Could not list backends.")

@app.route('/api/presets')
def api_presets():
    """List presets from autonomous_config.json."""
    try:
        from presets_loader import get_presets, load_autonomous_config
        cfg = load_autonomous_config()
        presets = get_presets()
        return jsonify({
            "presets": presets,
            "default_target": cfg.get("default_target", "simulator"),
        })
    except Exception:
        log.exception("Loading presets failed")
        return _api_error(500, "Internal Server Error", "Could not load presets.")


PRESET_NAME_MAX_LEN = 128


class _LocalSimulator:
    """In-process 'simulator' target: this server *is* the simulator, so presets act on
    tv_state directly instead of POSTing to SIMULATOR_API (default localhost:5000),
    which broke when the server ran on another port or with an API key set."""
    name = "simulator"

    def send_button(self, button_code, delay_ms=0):
        ok = handle_button_press(button_code, from_hardware=False)
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)
        return ok


def _resolve_target(target):
    if target == "simulator":
        return _LocalSimulator()
    from adapters.registry import get_adapter
    return get_adapter(target)


def _run_preset_buttons(preset, adapter):
    """Send a preset's buttons; skips (and counts) entries with invalid codes or delays."""
    sent = 0
    for b in preset.get("buttons", []):
        if not isinstance(b, dict):
            continue
        code = parse_button_code(b.get("button_code"))
        delay = b.get("delay_ms", 0)
        if code is None or isinstance(delay, bool) or not isinstance(delay, (int, float)) or delay < 0:
            log.warning("Skipping invalid preset entry %r in preset %r", b, preset.get("name"))
            continue
        adapter.send_button(code, int(delay))
        sent += 1
    return sent

@app.route('/api/preset/<preset_name>/trigger', methods=['POST'])
def api_preset_trigger(preset_name):
    """Run a preset (button sequence). Optional body: {"target": "simulator"} or query ?target=simulator."""
    if len(preset_name) > PRESET_NAME_MAX_LEN:
        return _api_error(400, "Bad Request", "Preset name too long.")
    data = request.get_json(silent=True)
    if data is None:
        data = {}
    if not isinstance(data, dict):
        return _api_error(400, "Bad Request", "Body must be a JSON object.")
    target = data.get("target") or request.args.get("target") or "simulator"
    if not isinstance(target, str):
        return _api_error(400, "Bad Request", "target must be a string.")
    try:
        from presets_loader import get_preset_by_name
        from adapters.registry import UnknownBackendError
        preset = get_preset_by_name(preset_name)
        if not preset:
            return jsonify({"error": "Preset not found", "preset": preset_name}), 404
        try:
            adapter = _resolve_target(target)
        except UnknownBackendError:
            return _api_error(400, "Bad Request", "Unknown target backend.")
        sent = _run_preset_buttons(preset, adapter)
        return jsonify({
            "ok": True,
            "preset": preset_name,
            "target": target,
            "buttons_sent": sent,
        })
    except Exception:
        log.exception("Preset trigger failed: %s", preset_name)
        return _api_error(500, "Internal Server Error", "Preset trigger failed.")

LEARN_TIMEOUT_MAX_SEC = 60


@app.route('/api/backends/broadlink/learn', methods=['POST'])
def api_broadlink_learn():
    """Put Broadlink device in learning mode and return learned IR hex. Body: {"host": "192.168.1.100", "timeout_sec": 10}."""
    try:
        from adapters.broadlink_adapter import BroadlinkAdapter, BROADLINK_AVAILABLE
        if not BROADLINK_AVAILABLE:
            return jsonify({"error": "Broadlink not installed", "hint": "pip install broadlink"}), 501
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            data = {}
        host = data.get("host") or request.args.get("host")
        try:
            timeout_sec = int(data.get("timeout_sec", 10))
        except (TypeError, ValueError):
            return _api_error(400, "Bad Request", "timeout_sec must be an integer.")
        # Bound how long a request thread can be held in the polling loop.
        if not 1 <= timeout_sec <= LEARN_TIMEOUT_MAX_SEC:
            return _api_error(400, "Bad Request", f"timeout_sec must be 1-{LEARN_TIMEOUT_MAX_SEC}.")
        if not host or not isinstance(host, str):
            return jsonify({"error": "host required"}), 400
        adapter = BroadlinkAdapter(host=host, code_map={})
        dev = adapter._get_device()
        if not dev:
            return jsonify({"error": "Could not discover or auth Broadlink device", "host": host}), 503
        try:
            dev.enter_learning()
        except AttributeError:
            return jsonify({"error": "This Broadlink device does not support learning"}), 501
        import time as _time
        for _ in range(timeout_sec * 2):
            _time.sleep(0.5)
            try:
                learned = dev.check_data()
                if learned:
                    hex_code = learned.hex()
                    return jsonify({"ok": True, "ir_hex": hex_code, "host": host})
            except Exception:
                pass
        return jsonify({"error": "Learning timeout", "timeout_sec": timeout_sec}), 408
    except Exception:
        log.exception("Broadlink learn failed")
        return _api_error(500, "Internal Server Error", "Broadlink learning failed.")

@app.route('/api/button', methods=['POST'])
def api_button_press():
    """Handle button press via REST API (from C code/hardware interrupts)"""
    # silent=True: a missing/non-JSON body must be a 400, not a 415/500.
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return {'status': 'error', 'message': 'Body must be a JSON object with button_code'}, 400
    code = parse_button_code(data.get('button_code'))
    if code is None:
        return {'status': 'error', 'message': 'Invalid button_code (expected integer 0-255)'}, 400
    from_hardware = data.get('from_hardware', True)  # Default to True for API calls
    if not isinstance(from_hardware, bool):
        return {'status': 'error', 'message': 'from_hardware must be a boolean'}, 400
    handle_button_press(code, from_hardware=from_hardware)
    return {'status': 'success', 'button_code': code}


@app.route('/api/detect-brand', methods=['POST'])
def api_detect_brand():
    """
    Brand detection from text: keyword match against known TV brands (see brand_detection.py).
    Body: {"text": "I have a Samsung TV"}. Updates tv_state.detected_brand and
    detected_brand_id; C/simulator can call universal_tv_set_brand(detected_brand_id).
    Returns brand, brand_id, confidence.
    """
    try:
        from brand_detection import detect_brand_from_text
    except ImportError:
        return jsonify({'error': 'brand_detection module not available'}), 501
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = {}
    text = data.get('text') or data.get('query') or ''
    if not isinstance(text, str):
        return _api_error(400, "Bad Request", "text must be a string.")
    text = text[:4096]
    result = detect_brand_from_text(text)
    tv_state['detected_brand'] = result['brand']
    tv_state['detected_brand_id'] = result['brand_id']
    socketio.emit('tv_state_update', tv_state)
    return jsonify(result)


# IPC integration for C program
def start_ipc_listener():
    """Listen for IPC commands from C program"""
    import queue
    from ipc_server import ipc_listener
    
    command_queue = queue.Queue()
    stop_event = threading.Event()
    
    def process_commands():
        """Process commands from IPC queue"""
        while not stop_event.is_set():
            try:
                if not command_queue.empty():
                    button_code = command_queue.get_nowait()
                    handle_button_press(button_code, from_hardware=True)
            except:
                pass
            time.sleep(0.1)
    
    # Start IPC listener
    ipc_thread = threading.Thread(target=ipc_listener, 
                                   args=(command_queue, stop_event),
                                   daemon=True)
    ipc_thread.start()
    
    # Start command processor
    processor_thread = threading.Thread(target=process_commands, daemon=True)
    processor_thread.start()
    
    return stop_event

_shutdown_stop_event = None

# HMR (Hot Module Replacement) file watcher
_hmr_watcher_thread = None
_hmr_file_times = {}
_hmr_stop_event = None

def _start_hmr_watcher():
    """Start file watcher for HMR - only in debug mode"""
    global _hmr_watcher_thread, _hmr_stop_event
    
    if not get_debug():
        log.debug("HMR disabled (not in debug mode)")
        return
    
    _hmr_stop_event = threading.Event()
    static_dir = Path(STATIC_DIR)
    if not static_dir.exists():
        log.warning("HMR: web_static directory not found")
        return
    
    def watch_files():
        """Poll for file changes and emit HMR events"""
        log.info("HMR: Starting file watcher for %s", static_dir.absolute())
        
        # Initial scan
        js_files = []
        for root, dirs, files in os.walk(static_dir):
            for file in files:
                if file.endswith(('.js', '.html', '.css')):
                    file_path = Path(root) / file
                    rel_path = file_path.relative_to(static_dir)
                    _hmr_file_times[str(rel_path)] = file_path.stat().st_mtime
                    if file.endswith('.js'):
                        js_files.append(str(rel_path))
        
        log.info("HMR: Watching %d files (%d JS files)", len(_hmr_file_times), len(js_files))
        
        while not _hmr_stop_event.is_set():
            try:
                for root, dirs, files in os.walk(static_dir):
                    for file in files:
                        if file.endswith(('.js', '.html', '.css')):
                            file_path = Path(root) / file
                            rel_path = str(file_path.relative_to(static_dir))
                            
                            try:
                                current_mtime = file_path.stat().st_mtime
                                if rel_path in _hmr_file_times:
                                    if current_mtime > _hmr_file_times[rel_path]:
                                        # File changed
                                        log.info("HMR: File changed: %s", rel_path)
                                        _hmr_file_times[rel_path] = current_mtime
                                        
                                        # Emit to all connected clients
                                        socketio.emit('hmr:file_changed', {
                                            'path': rel_path,
                                            'timestamp': current_mtime
                                        })
                                else:
                                    # New file
                                    _hmr_file_times[rel_path] = current_mtime
                            except (OSError, FileNotFoundError):
                                # File might have been deleted or is inaccessible
                                if rel_path in _hmr_file_times:
                                    del _hmr_file_times[rel_path]
                
                # Poll every 500ms in debug mode
                _hmr_stop_event.wait(0.5)
            except Exception as e:
                log.error("HMR watcher error: %s", e, exc_info=True)
                _hmr_stop_event.wait(1.0)
        
        log.info("HMR: File watcher stopped")
    
    _hmr_watcher_thread = threading.Thread(target=watch_files, daemon=True, name="HMR-Watcher")
    _hmr_watcher_thread.start()

def main():
    """Main entry point for Poetry script. Production: use gunicorn + eventlet/gevent (see PRODUCTION.md)."""
    global _shutdown_stop_event
    import signal
    host = get_host()
    port = get_port()
    debug = get_debug()
    if debug and not is_loopback_host(host):
        # The Werkzeug debugger allows arbitrary code execution; never expose it.
        log.error("TV_REMOTE_DEBUG ignored: refusing to run debug mode on non-loopback host %s", host)
        debug = False
    for msg in validate_config(strict=False):
        log.warning("Config: %s", msg)
    log.info("Virtual TV Simulator - Web Server")
    log.info("Binding %s:%s (debug=%s)", host, port, debug)
    log.info("Interface: http://%s:%s", "localhost" if host == "0.0.0.0" else host, port)

    def shutdown(signum=None, frame=None):
        log.info("Shutdown requested (signal=%s)", signum)
        if _shutdown_stop_event:
            _shutdown_stop_event.set()
        sys.exit(0)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    stop_event = None
    try:
        stop_event = start_ipc_listener()
        _shutdown_stop_event = stop_event
        log.info("IPC listener started (C program integration enabled)")
    except Exception as e:
        log.warning("IPC listener failed: %s - web interface will still work", e)

    if SERVICE_LAYER_AVAILABLE:
        try:
            from service_layer import start_mqtt_command_subscriber
            def on_mqtt_button(code):
                handle_button_press(code, from_hardware=False)
            def on_mqtt_preset(name, target):
                from presets_loader import get_preset_by_name
                p = get_preset_by_name(name)
                if not p:
                    return
                _run_preset_buttons(p, _resolve_target(target))
            start_mqtt_command_subscriber(on_mqtt_button, on_mqtt_preset)
        except Exception as e:
            log.warning("MQTT command subscriber skipped: %s", e)

    # Start HMR file watcher (only in debug mode)
    try:
        _start_hmr_watcher()
    except Exception as e:
        log.warning("HMR watcher failed to start: %s", e)

    try:
        socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        log.info("Shutting down server...")
        if stop_event:
            stop_event.set()
        if _hmr_stop_event:
            _hmr_stop_event.set()

if __name__ == '__main__':
    main()

