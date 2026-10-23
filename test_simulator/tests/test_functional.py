"""
Functional tests for complete workflows (in-process Flask + Socket.IO test clients).
"""
import pytest

from tests.conftest import BUTTON_CODES, NUMBER_BUTTONS, press_button, get_state, received_events


class TestPowerCycle:
    """Test power on/off cycle"""

    def test_power_on(self, client):
        assert get_state()['powered_on'] is False
        press_button(BUTTON_CODES['Power'])
        state = get_state()
        assert state['powered_on'] is True
        assert state['current_app'] is None  # powers on to live TV

    def test_power_off(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Power'])
        assert get_state()['powered_on'] is False


class TestStreamingServices:
    """Test streaming service switching"""

    @pytest.mark.parametrize("service_name,button_code", [
        ('YouTube', 0x01),
        ('Netflix', 0x02),
        ('Amazon Prime', 0x03),
        ('HBO Max', 0x04),
    ])
    def test_streaming_service(self, client, ensure_tv_on, service_name, button_code):
        press_button(button_code)
        assert get_state()['current_app'] == service_name


class TestChannelChanges:
    """Test channel changing functionality"""

    def test_channel_up(self, client, ensure_tv_on):
        initial_channel = get_state()['channel']
        press_button(BUTTON_CODES['Channel Up'])
        assert get_state()['channel'] == initial_channel % 999 + 1

    def test_channel_down(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Channel Up'])
        initial_channel = get_state()['channel']
        press_button(BUTTON_CODES['Channel Down'])
        assert get_state()['channel'] == initial_channel - 1

    def test_channel_down_wraps(self, client, ensure_tv_on):
        assert get_state()['channel'] == 1
        press_button(BUTTON_CODES['Channel Down'])
        assert get_state()['channel'] == 999

    def test_channel_up_wraps(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Channel Down'])  # 1 -> 999
        press_button(BUTTON_CODES['Channel Up'])
        assert get_state()['channel'] == 1

    @pytest.mark.parametrize("channel_number", [123, 456, 789, 42, 7])
    def test_number_buttons(self, client, ensure_tv_on, channel_number):
        for digit in str(channel_number).zfill(3):
            press_button(NUMBER_BUTTONS[digit])
        assert get_state()['channel'] == channel_number

    def test_partial_entry_does_not_tune(self, client, ensure_tv_on):
        press_button(NUMBER_BUTTONS['4'])
        press_button(NUMBER_BUTTONS['2'])
        state = get_state()
        assert state['channel'] == 1
        assert state['channel_input'] == '42'


class TestNavigation:
    """Test navigation buttons"""

    def test_home_button(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Home'])
        assert get_state()['current_app'] == 'Home'

    def test_menu_button(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Menu'])
        assert get_state()['show_menu'] is True
        press_button(BUTTON_CODES['Menu'])
        assert get_state()['show_menu'] is False

    def test_back_button(self, client, ensure_tv_on):
        press_button(BUTTON_CODES['Menu'])
        press_button(BUTTON_CODES['Info'])
        press_button(BUTTON_CODES['Back'])
        state = get_state()
        assert state['show_menu'] is False
        assert state['show_info'] is False
        assert state['show_settings'] is False

    def test_input_cycles(self, client, ensure_tv_on):
        seen = []
        for _ in range(7):
            press_button(BUTTON_CODES['Input'])
            seen.append(get_state()['input_source'])
        assert seen == ['HDMI 2', 'HDMI 3', 'HDMI 4', 'TV', 'Component', 'AV', 'HDMI 1']


class TestVolumeControl:
    """Test volume control functionality"""

    def test_volume_increase(self, client, ensure_tv_on):
        initial_volume = get_state()['volume']
        press_button(BUTTON_CODES['Volume Up'])
        press_button(BUTTON_CODES['Volume Up'])
        assert get_state()['volume'] == initial_volume + 2

    def test_volume_decrease(self, client, ensure_tv_on):
        initial_volume = get_state()['volume']
        press_button(BUTTON_CODES['Volume Down'])
        assert get_state()['volume'] == initial_volume - 1

    def test_volume_clamped(self, client, ensure_tv_on, sio_client):
        sio_client.emit('update_volume', {'volume': 100})
        press_button(BUTTON_CODES['Volume Up'])
        assert get_state()['volume'] == 100
        sio_client.emit('update_volume', {'volume': 0})
        press_button(BUTTON_CODES['Volume Down'])
        assert get_state()['volume'] == 0

    @pytest.mark.parametrize("bad", ["50", None, 101, -1, True, [3]])
    def test_update_volume_rejects_invalid(self, client, sio_client, bad):
        before = get_state()['volume']
        sio_client.emit('update_volume', {'volume': bad})
        assert sio_client.is_connected()
        assert get_state()['volume'] == before

    def test_mute_toggle(self, client, ensure_tv_on):
        initial_muted = get_state()['muted']
        press_button(BUTTON_CODES['Mute'])
        assert get_state()['muted'] != initial_muted
        press_button(BUTTON_CODES['Mute'])
        assert get_state()['muted'] == initial_muted


class TestRoomAutomation:
    """Room / whole-house scene buttons (0xE0-0xF3)."""

    def test_movie_scene(self, client):
        press_button(0xE0)
        rs = get_state()['room_state']
        assert rs['scene'] == 'movie'
        assert rs['lights_main'] == 15

    def test_all_off_then_full(self, client):
        press_button(0xE2)
        rs = get_state()['room_state']
        assert rs['scene'] == 'off' and rs['lights_main'] == 0 and rs['kitchen_light'] is False
        press_button(0xE4)
        rs = get_state()['room_state']
        assert rs['lights_main'] == 100 and rs['scene'] == 'default'

    def test_dim_floors_at_zero(self, client):
        for _ in range(6):
            press_button(0xE3)
        assert get_state()['room_state']['lights_main'] == 0

    def test_device_toggle(self, client):
        before = get_state()['room_state']['oven_on']
        press_button(0xEC)
        assert get_state()['room_state']['oven_on'] is (not before)


class TestWebSocket:
    """Test WebSocket functionality"""

    def test_websocket_connection(self, ws, client):
        sio = ws.socketio.test_client(ws.app, flask_test_client=client)
        try:
            assert sio.is_connected()
            names = [m['name'] for m in sio.get_received()]
            assert 'tv_state_update' in names
            assert 'connected' in names
            assert 'graphics_preset' in names
        finally:
            sio.disconnect()

    def test_request_state(self, client, sio_client):
        sio_client.emit('request_state')
        assert received_events(sio_client, 'tv_state_update')

    def test_websocket_button_press(self, client, ensure_tv_on, sio_client):
        sio_client.emit('button_press', {'button_code': BUTTON_CODES['Volume Up']})
        assert received_events(sio_client, 'tv_state_update')
