"""
Pytest configuration and fixtures for Virtual TV Simulator tests
"""
import pytest
import requests
import time
import threading
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:5000"
API_URL = f"{BASE_URL}/api/button"
STATE_URL = f"{BASE_URL}/api/state"
FRAME_URL = f"{BASE_URL}/api/frame"

# Button codes
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
    'Info': 0x23,
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


@pytest.fixture(scope="session")
def server_running():
    """Check if server is running, skip tests if not"""
    try:
        response = requests.get(STATE_URL, timeout=2)
        if response.status_code == 200:
            return True
    except:
        pass
    pytest.skip("Server is not running. Start with: poetry run web-server")


@pytest.fixture
def tv_state(server_running):
    """Get current TV state"""
    response = requests.get(STATE_URL, timeout=2)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def ensure_tv_on(server_running):
    """Ensure TV is powered on before test"""
    state = requests.get(STATE_URL, timeout=2).json()
    if not state.get('powered_on'):
        requests.post(API_URL, json={'button_code': BUTTON_CODES['Power']}, timeout=2)
        # Poll until TV is on (handles slow power-on)
        for _ in range(15):
            time.sleep(0.5)
            state = requests.get(STATE_URL, timeout=2).json()
            if state.get('powered_on'):
                break
    yield
    # Cleanup: turn TV off after test
    state = requests.get(STATE_URL, timeout=2).json()
    if state.get('powered_on'):
        requests.post(API_URL, json={'button_code': BUTTON_CODES['Power']}, timeout=2)


def press_button(button_code, delay=0.5):
    """Helper function to press a button"""
    try:
        response = requests.post(
            API_URL,
            json={'button_code': button_code},
            headers={'Content-Type': 'application/json'},
            timeout=2
        )
        time.sleep(delay)
        return response.status_code == 200
    except Exception as e:
        pytest.fail(f"Failed to press button 0x{button_code:02X}: {e}")


def get_state():
    """Helper function to get TV state"""
    try:
        response = requests.get(STATE_URL, timeout=2)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

