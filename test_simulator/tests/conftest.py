"""
Pytest configuration and fixtures for Virtual TV Simulator tests.

Everything runs in-process: the Flask app is exercised through Flask's test client
and Socket.IO through flask_socketio's test client. No server needs to be running,
nothing listens on a port, and no real devices / MQTT brokers / webhooks are hit.
"""
import copy
import os
import sys

import pytest

SIMULATOR_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SIMULATOR_ROOT)

# Headless: pygame must never try to open a real display or audio device (CI has none).
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

# Hermetic config: ignore any developer service_config.json / env secrets, so auth,
# webhooks, MQTT and rate limiting are off unless a test turns them on explicitly.
os.environ["SERVICE_CONFIG"] = os.path.join(SIMULATOR_ROOT, "tests", "__no_service_config__.json")
for _var in (
    "TV_REMOTE_API_KEY",
    "TV_REMOTE_WEBHOOK_URL",
    "TV_REMOTE_RATE_LIMIT",
    "TV_REMOTE_DEBUG",
    "TV_REMOTE_CORS_ORIGINS",
    "SIMULATOR_API",
    "AUTONOMOUS_CONFIG",
):
    os.environ.pop(_var, None)

API_URL = "/api/button"
STATE_URL = "/api/state"
FRAME_URL = "/api/frame"

# Button codes (must match button_codes.py / include/remote_buttons.h)
BUTTON_CODES = {
    'Power': 0x10,
    'Volume Up': 0x11,
    'Volume Down': 0x12,
    'Mute': 0x13,
    'Channel Up': 0x14,
    'Channel Down': 0x15,
    'Home': 0x20,
    'Menu': 0x21,
    'Back': 0x22,
    'Exit': 0x23,
    'Info': 0x70,
    'Settings': 0x72,
    'YouTube': 0x01,
    'Netflix': 0x02,
    'Amazon Prime': 0x03,
    'HBO Max': 0x04,
    'Game Mode': 0xA0,
    'Input': 0x25,
    'Source': 0x26,
}

STREAMING_SERVICES = {
    'YouTube': 0x01,
    'Netflix': 0x02,
    'Amazon Prime': 0x03,
    'HBO Max': 0x04
}

NUMBER_BUTTONS = {
    '0': 0x50, '1': 0x51, '2': 0x52, '3': 0x53, '4': 0x54,
    '5': 0x55, '6': 0x56, '7': 0x57, '8': 0x58, '9': 0x59
}


def _web_server():
    import web_server
    return web_server


_INITIAL = {}


@pytest.fixture(scope="session")
def ws():
    """The web_server module (imported once, in-process)."""
    mod = _web_server()
    _INITIAL.setdefault("tv", copy.deepcopy({k: v for k, v in mod.tv_state.items() if k != "room_state"}))
    _INITIAL.setdefault("room", copy.deepcopy(mod.room_state))
    _INITIAL.setdefault("frame", copy.deepcopy(mod.current_frame))
    return mod


@pytest.fixture(autouse=True)
def _reset_server_state(request):
    """Give every test a fresh TV / room / frame state and a clean adapter registry."""
    if "web_server" not in sys.modules:
        yield
        return
    mod = request.getfixturevalue("ws")

    def _reset():
        timer = mod._notification_timer
        if timer is not None:
            timer.cancel()
        mod.tv_state.clear()
        mod.tv_state.update(copy.deepcopy(_INITIAL["tv"]))
        mod.room_state.clear()
        mod.room_state.update(copy.deepcopy(_INITIAL["room"]))
        mod.tv_state["room_state"] = mod.room_state
        with mod.frame_lock:
            mod.current_frame.clear()
            mod.current_frame.update(copy.deepcopy(_INITIAL["frame"]))
        mod._rate_limit_store.clear()
        try:
            from adapters import registry
            registry._INSTANCES.clear()
            registry._CONFIG.clear()
        except ImportError:
            pass

    _reset()
    yield
    _reset()


@pytest.fixture
def client(ws):
    """Flask test client for the simulator web server."""
    return ws.app.test_client()


@pytest.fixture
def sio_client(ws, client):
    """Connected flask_socketio test client sharing the Flask test client's cookies."""
    c = ws.socketio.test_client(ws.app, flask_test_client=client)
    assert c.is_connected()
    c.get_received()  # drop the initial connect burst
    yield c
    if c.is_connected():
        c.disconnect()


@pytest.fixture
def ensure_tv_on(client):
    """Ensure TV is powered on before test (state is reset after every test)."""
    if not get_state().get('powered_on'):
        assert press_button(BUTTON_CODES['Power'])
    assert get_state().get('powered_on') is True
    yield


@pytest.fixture
def api_key(monkeypatch, ws):
    """Enable API-key auth for the duration of a test; returns the key."""
    import service_layer
    key = "test-key-123"
    service_layer.get_service_config()
    monkeypatch.setitem(service_layer._config, "api_key", key)
    return key


def press_button(button_code, delay=None):
    """Press a button via the REST API. `delay` is accepted for backwards
    compatibility and ignored: the in-process server applies state synchronously."""
    response = _web_server().app.test_client().post(API_URL, json={'button_code': button_code})
    return response.status_code == 200


def get_state():
    """Current TV state via the REST API (None on error)."""
    response = _web_server().app.test_client().get(STATE_URL)
    if response.status_code == 200:
        return response.get_json()
    return None


def received_events(sio, name):
    """Payloads of all Socket.IO events called `name` received by test client `sio`."""
    return [m["args"][0] for m in sio.get_received() if m["name"] == name]
