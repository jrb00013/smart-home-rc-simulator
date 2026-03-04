#!/usr/bin/env python3
"""
Web Server for Virtual TV Simulator
Provides a web-based 3D/VR-like interface accessible via browser
"""

from flask import Flask, render_template, send_from_directory, request, Response, jsonify
from flask_socketio import SocketIO, emit
import threading
import time
import sys
import os
import base64
import io

# Optional PIL/Pillow for image format conversion
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("[Web Server] PIL/Pillow not available - JPEG conversion disabled, PNG only")

app = Flask(__name__, 
            template_folder='web_templates',
            static_folder='web_static')
app.config['SECRET_KEY'] = 'phillips_remote_tv_simulator'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory('web_static', filename)

# TV State (shared with simulator logic)
tv_state = {
    'powered_on': False,
    'volume': 50,
    'channel': 1,
    'muted': False,
    'current_app': 'Home',
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

# Frame storage for streaming API
current_frame = {
    'data': None,  # Base64 encoded image data
    'timestamp': 0,
    'format': 'png',
    'width': 512,
    'height': 512
}
frame_lock = threading.Lock()

# Button codes from C: include/remote_buttons.h + get_button_name() (single source of truth)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from button_codes import BUTTON_CODES

def handle_button_press(button_code, from_hardware=False):
    """Handle button press and update TV state
    @param button_code: Button code to handle (int 0x01-0xD2, or int/str from JSON)
    @param from_hardware: True if this came from hardware interrupt, False for UI clicks
    """
    try:
        code = int(button_code) & 0xFF
    except (TypeError, ValueError):
        code = 0
    button_code = code
    button_name = BUTTON_CODES.get(button_code, f"Unknown (0x{button_code:02X})")
    tv_state['last_button'] = button_name
    tv_state['notification'] = f"Button: {button_name}"
    
    if from_hardware:
        print(f"[Web Server] Button pressed (from hardware interrupt): {button_name} (0x{button_code:02X})")
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
        print(f"[Web Server] Button pressed (from UI): {button_name} (0x{button_code:02X})")
    
    # Handle button actions
    if button_code == 0x10:  # Power
        tv_state['powered_on'] = not tv_state['powered_on']
        tv_state['notification'] = f"Power: {'ON' if tv_state['powered_on'] else 'OFF'}"
        print(f"[Web Server] TV Power: {'ON' if tv_state['powered_on'] else 'OFF'}")
        
        # If turning on, ensure we have a valid app/state
        if tv_state['powered_on'] and not tv_state.get('current_app'):
            tv_state['current_app'] = 'Home'
        
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
            
    elif button_code == 0xA0:  # Game Mode
        if tv_state['powered_on']:
            tv_state['game_mode'] = not tv_state['game_mode']
            tv_state['notification'] = f"Game Mode: {'ON' if tv_state['game_mode'] else 'OFF'}"
            
    elif button_code >= 0x50 and button_code <= 0x59:  # Number pad
        if tv_state['powered_on']:
            digit = button_code - 0x50
            if 'channel_input_time' not in tv_state:
                tv_state['channel_input'] = ""
                tv_state['channel_input_time'] = time.time()
            tv_state['channel_input'] += str(digit)
            tv_state['channel_input_time'] = time.time()
            if len(tv_state['channel_input']) >= 3:
                try:
                    new_channel = int(tv_state['channel_input'])
                    if 1 <= new_channel <= 999:
                        tv_state['channel'] = new_channel
                        # Switch from app mode to channel mode when entering channel number
                        # Clear current_app (including 'Home') to show TV channel content
                        tv_state['current_app'] = None
                        tv_state['notification'] = f"Channel: {tv_state['channel']}"
                    else:
                        tv_state['notification'] = f"Invalid channel: {new_channel} (1-999)"
                    tv_state['channel_input'] = ""
                except:
                    tv_state['channel_input'] = ""
    
    # Clear channel input after timeout (in a separate thread)
    if 'channel_input' in tv_state and tv_state['channel_input']:
        if 'channel_input_time' in tv_state:
            if time.time() - tv_state['channel_input_time'] > 2.0:
                tv_state['channel_input'] = ""
                if 'channel_input_time' in tv_state:
                    del tv_state['channel_input_time']
    
    # Broadcast state update to all connected clients
    socketio.emit('tv_state_update', tv_state)
    
    # Clear notification after 2 seconds
    def clear_notification():
        time.sleep(2)
        tv_state['notification'] = None
        socketio.emit('tv_state_update', tv_state)
    
    threading.Thread(target=clear_notification, daemon=True).start()

@app.route('/')
def index():
    """Serve the main 3D TV interface (button codes from C injected for JS)"""
    import json
    return render_template('index.html', button_codes_json=json.dumps(BUTTON_CODES))

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
            except Exception as e:
                print(f"[Web Server] Error converting frame to JPEG: {e}")
                return jsonify({'error': str(e)}), 500
        else:
            # Return PNG (default)
            try:
                img_data = base64.b64decode(current_frame['data'])
                return Response(img_data, mimetype='image/png')
            except Exception as e:
                print(f"[Web Server] Error decoding frame: {e}")
                return jsonify({'error': str(e)}), 500

@app.route('/api/frame/info')
def get_frame_info():
    """Get frame metadata (REST API)"""
    with frame_lock:
        return jsonify({
            'has_frame': current_frame['data'] is not None,
            'timestamp': current_frame['timestamp'],
            'width': current_frame['width'],
            'height': current_frame['height'],
            'format': current_frame['format'],
            'age_seconds': time.time() - current_frame['timestamp'] if current_frame['timestamp'] > 0 else None
        })

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"[Web Server] Client connected: {request.sid}")
    emit('tv_state_update', tv_state)
    emit('connected', {'message': 'Connected to Virtual TV Simulator'})

@socketio.on('request_state')
def handle_request_state():
    """Handle state request from client"""
    emit('tv_state_update', tv_state)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"[Web Server] Client disconnected: {request.sid}")

@socketio.on('button_press')
def handle_button_press_ws(data):
    """Handle button press from web client via WebSocket (UI clicks, not hardware)"""
    button_code = data.get('button_code')
    if button_code is not None:
        handle_button_press(button_code, from_hardware=False)

@socketio.on('update_volume')
def handle_update_volume(data):
    """Handle volume update from client (including volume stabilizer)"""
    volume = data.get('volume')
    if volume is not None and 0 <= volume <= 100:
        old_volume = tv_state['volume']
        tv_state['volume'] = volume
        print(f"[Web Server] Volume updated (from stabilizer): {old_volume}% -> {volume}%")
        # Broadcast updated state to all clients
        socketio.emit('tv_state_update', tv_state)
        print(f"[Web Server] Volume state broadcasted to all clients")
    else:
        print(f"[Web Server] Invalid volume update received: {volume}")

@socketio.on('frame_update')
def handle_frame_update(data):
    """Handle frame update from client (for streaming API)"""
    frame_data = data.get('frame_data')  # Base64 encoded image
    width = data.get('width', 512)
    height = data.get('height', 512)
    format_type = data.get('format', 'png')
    
    if frame_data:
        with frame_lock:
            current_frame['data'] = frame_data
            current_frame['timestamp'] = time.time()
            current_frame['width'] = width
            current_frame['height'] = height
            current_frame['format'] = format_type
        # Only log occasionally to avoid spam
        if int(time.time()) % 10 == 0:
            print(f"[Web Server] Frame updated: {width}x{height} ({format_type})")

@app.route('/api/button', methods=['POST'])
def api_button_press():
    """Handle button press via REST API (from C code/hardware interrupts)"""
    data = request.get_json()
    button_code = data.get('button_code')
    from_hardware = data.get('from_hardware', True)  # Default to True for API calls
    if button_code is not None:
        handle_button_press(button_code, from_hardware=from_hardware)
        return {'status': 'success', 'button_code': button_code}
    return {'status': 'error', 'message': 'Invalid button_code'}, 400


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
    data = request.get_json() or {}
    text = data.get('text') or data.get('query') or ''
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

def main():
    """Main entry point for Poetry script"""
    print("=" * 60)
    print("  Virtual TV Simulator - Web Server")
    print("=" * 60)
    print()
    print("Starting web server...")
    print("Access the 3D TV interface at: http://localhost:5000")
    print("Press Ctrl+C to stop")
    print()
    
    # Start IPC listener for C program integration
    try:
        stop_event = start_ipc_listener()
        print("[Web Server] IPC listener started (C program integration enabled)")
    except Exception as e:
        print(f"[Web Server] IPC listener failed: {e}")
        print("[Web Server] Web interface will still work, but C program won't connect")
    
    # Run server
    try:
        socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        if 'stop_event' in locals():
            stop_event.set()

if __name__ == '__main__':
    main()

