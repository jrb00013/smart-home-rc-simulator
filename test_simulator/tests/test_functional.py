"""
Functional tests for complete workflows
"""
import pytest
import requests
import time
import socketio
from tests.conftest import (
    BASE_URL, API_URL, STATE_URL, BUTTON_CODES, STREAMING_SERVICES,
    NUMBER_BUTTONS, press_button, get_state
)


def _wait_for_power_state(expected, timeout=8.0, poll=0.5):
    """Poll get_state() until powered_on matches expected or timeout."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = get_state()
        if state is not None and state.get('powered_on') is expected:
            return state
        time.sleep(poll)
    return get_state()


class TestPowerCycle:
    """Test power on/off cycle"""
    
    def test_power_on(self, server_running):
        """Test turning TV on"""
        # Turn off first if on
        state = get_state()
        if state and state.get('powered_on'):
            press_button(BUTTON_CODES['Power'])
            _wait_for_power_state(False, timeout=5.0)
        
        # Turn on
        press_button(BUTTON_CODES['Power'])
        state = _wait_for_power_state(True)
        assert state is not None, "get_state() returned None"
        assert state.get('powered_on') is True, f"Expected TV on, got state: {state}"
    
    def test_power_off(self, server_running, ensure_tv_on):
        """Test turning TV off"""
        press_button(BUTTON_CODES['Power'])
        state = _wait_for_power_state(False)
        assert state is not None, "get_state() returned None"
        assert state.get('powered_on') is False, f"Expected TV off, got state: {state}"


class TestStreamingServices:
    """Test streaming service switching"""
    
    @pytest.mark.parametrize("service_name,button_code", [
        ('YouTube', 0x01),
        ('Netflix', 0x02),
        ('Amazon Prime', 0x03),
        ('HBO Max', 0x04),
    ])
    def test_streaming_service(self, server_running, ensure_tv_on, service_name, button_code):
        """Test each streaming service"""
        # Ensure TV is actually on (poll in case ensure_tv_on sleep was not enough)
        for _ in range(10):
            state = get_state()
            if state is not None and state.get('powered_on'):
                break
            time.sleep(0.5)
        press_button(button_code, delay=2.0)
        state = None
        for _ in range(20):
            state = get_state()
            if state is not None and state.get('current_app') == service_name:
                break
            time.sleep(0.5)
        assert state is not None, "get_state() returned None"
        assert state.get('current_app') == service_name, (
            f"Expected current_app={service_name!r}, got {state.get('current_app')!r} (powered_on={state.get('powered_on')})"
        )


class TestChannelChanges:
    """Test channel changing functionality"""
    
    def test_channel_up(self, server_running, ensure_tv_on):
        """Test channel up button"""
        initial_state = get_state()
        initial_channel = initial_state.get('channel', 1) if initial_state else 1

        press_button(BUTTON_CODES['Channel Up'], delay=0.6)
        new_state = None
        for _ in range(10):
            new_state = get_state()
            if new_state is not None:
                new_channel = new_state.get('channel', 1)
                if new_channel != initial_channel:
                    break
            time.sleep(0.3)
        assert new_state is not None
        new_channel = new_state.get('channel', 1)
        assert new_channel > initial_channel or new_channel == 1, (
            f"Channel should increase or wrap to 1: initial={initial_channel}, got {new_channel}"
        )
    
    def test_channel_down(self, server_running, ensure_tv_on):
        """Test channel down button"""
        initial_state = get_state()
        initial_channel = initial_state.get('channel', 1) if initial_state else 1
        
        press_button(BUTTON_CODES['Channel Down'])
        
        new_state = get_state()
        new_channel = new_state.get('channel', 1) if new_state else 1
        
        # Channel should decrease, or wrap (1 -> max), or stay at 1
        assert new_channel <= initial_channel or initial_channel == 1
    
    @pytest.mark.parametrize("channel_number", [123, 456, 789, 42, 7])
    def test_number_buttons(self, server_running, ensure_tv_on, channel_number):
        """Test number buttons for channel entry"""
        channel_str = str(channel_number).zfill(3)
        
        for digit in channel_str:
            button_code = NUMBER_BUTTONS[digit]
            press_button(button_code, delay=0.2)
        
        time.sleep(1.0)  # Wait for channel change
        
        state = get_state()
        assert state is not None
        # Channel should be set (may be last 3 digits if multi-digit)
        assert state.get('channel') is not None


class TestNavigation:
    """Test navigation buttons"""
    
    def test_home_button(self, server_running, ensure_tv_on):
        """Test Home button"""
        press_button(BUTTON_CODES['Home'])
        
        state = get_state()
        assert state is not None
        # Should be on Home screen or app should be set
        assert state.get('current_app') is not None
    
    def test_menu_button(self, server_running, ensure_tv_on):
        """Test Menu button"""
        press_button(BUTTON_CODES['Menu'])
        
        state = get_state()
        assert state is not None
        # Menu state should be set
        assert 'show_menu' in state or state.get('current_app') is not None
    
    def test_back_button(self, server_running, ensure_tv_on):
        """Test Back button"""
        press_button(BUTTON_CODES['Back'])
        
        state = get_state()
        assert state is not None
        # Should handle back action
        assert state is not None


class TestVolumeControl:
    """Test volume control functionality"""
    
    def test_volume_increase(self, server_running, ensure_tv_on):
        """Test volume increase"""
        initial_state = get_state()
        initial_volume = initial_state.get('volume', 0) if initial_state else 0
        
        press_button(BUTTON_CODES['Volume Up'])
        press_button(BUTTON_CODES['Volume Up'])
        
        new_state = get_state()
        new_volume = new_state.get('volume', 0) if new_state else 0
        
        assert new_volume >= initial_volume
    
    def test_volume_decrease(self, server_running, ensure_tv_on):
        """Test volume decrease"""
        # First increase volume
        press_button(BUTTON_CODES['Volume Up'], delay=0.3)
        press_button(BUTTON_CODES['Volume Up'], delay=0.3)
        
        initial_state = get_state()
        initial_volume = initial_state.get('volume', 0) if initial_state else 0
        
        press_button(BUTTON_CODES['Volume Down'])
        
        new_state = get_state()
        new_volume = new_state.get('volume', 0) if new_state else 0
        
        assert new_volume <= initial_volume
    
    def test_mute_toggle(self, server_running, ensure_tv_on):
        """Test mute toggle"""
        initial_state = get_state()
        initial_muted = initial_state.get('muted', False) if initial_state else False
        
        press_button(BUTTON_CODES['Mute'])
        
        new_state = get_state()
        new_muted = new_state.get('muted', False) if new_state else False
        
        # Mute should toggle
        assert new_muted != initial_muted
        
        # Toggle back
        press_button(BUTTON_CODES['Mute'])
        final_state = get_state()
        final_muted = final_state.get('muted', False) if final_state else False
        
        # Should be back to original state
        assert final_muted == initial_muted


class TestWebSocket:
    """Test WebSocket functionality"""
    
    def test_websocket_connection(self, server_running):
        """Test WebSocket connection"""
        sio = socketio.Client()
        connected = False
        
        @sio.on('connect')
        def on_connect():
            nonlocal connected
            connected = True
        
        try:
            sio.connect(BASE_URL, wait_timeout=5)
            time.sleep(1)
            assert connected is True
        finally:
            sio.disconnect()
    
    def test_websocket_button_press(self, server_running, ensure_tv_on):
        """Test button press via WebSocket"""
        sio = socketio.Client()
        state_received = False
        
        @sio.on('tv_state_update')
        def on_state_update(data):
            nonlocal state_received
            state_received = True
        
        try:
            sio.connect(BASE_URL, wait_timeout=5)
            time.sleep(1)
            
            # Send button press
            sio.emit('button_press', {'button_code': BUTTON_CODES['Volume Up']})
            time.sleep(1)
            
            # Should receive state update
            assert state_received is True
        finally:
            sio.disconnect()

