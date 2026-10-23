"""
Integration tests for REST API endpoints (in-process Flask test client).
"""
from tests.conftest import API_URL, STATE_URL, FRAME_URL, BUTTON_CODES, press_button, get_state


class TestServerConnection:
    """Test server connection and basic endpoints"""

    def test_server_running(self, client):
        """Server app responds"""
        response = client.get(STATE_URL)
        assert response.status_code == 200

    def test_state_endpoint(self, client):
        """Test /api/state endpoint returns valid JSON"""
        response = client.get(STATE_URL)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        assert 'powered_on' in data

    def test_button_endpoint_exists(self, client):
        """Test /api/button endpoint exists and accepts a valid code"""
        response = client.post(API_URL, json={'button_code': 0x10})
        assert response.status_code == 200


class TestButtonAPI:
    """Test button press API"""

    def test_power_button(self, client):
        """Test Power button press"""
        response = client.post(API_URL, json={'button_code': BUTTON_CODES['Power']})
        assert response.status_code == 200
        data = response.get_json()
        assert data == {'status': 'success', 'button_code': BUTTON_CODES['Power']}
        assert get_state()['powered_on'] is True

    def test_volume_up(self, client, ensure_tv_on):
        """Test Volume Up button"""
        initial_volume = get_state()['volume']
        assert press_button(BUTTON_CODES['Volume Up'])
        assert get_state()['volume'] == min(100, initial_volume + 1)

    def test_volume_down(self, client, ensure_tv_on):
        """Test Volume Down button"""
        initial_volume = get_state()['volume']
        assert press_button(BUTTON_CODES['Volume Down'])
        assert get_state()['volume'] == max(0, initial_volume - 1)

    def test_channel_up(self, client, ensure_tv_on):
        """Test Channel Up button"""
        initial_channel = get_state()['channel']
        assert press_button(BUTTON_CODES['Channel Up'])
        assert get_state()['channel'] == initial_channel + 1

    def test_mute_button(self, client, ensure_tv_on):
        """Test Mute button toggles mute state"""
        initial_muted = get_state()['muted']
        press_button(BUTTON_CODES['Mute'])
        assert get_state()['muted'] is (not initial_muted)
        press_button(BUTTON_CODES['Mute'])
        assert get_state()['muted'] is initial_muted

    def test_buttons_ignored_when_off(self, client):
        """Volume/channel buttons do nothing while the TV is off"""
        before = get_state()
        assert before['powered_on'] is False
        press_button(BUTTON_CODES['Volume Up'])
        press_button(BUTTON_CODES['Channel Up'])
        after = get_state()
        assert after['volume'] == before['volume']
        assert after['channel'] == before['channel']


class TestStreamingAPI:
    """Test streaming/frame API endpoints"""

    def test_frame_info_endpoint(self, client):
        """Test /api/frame/info endpoint"""
        response = client.get(f"{FRAME_URL}/info")
        assert response.status_code == 200
        data = response.get_json()
        assert data['has_frame'] is False
        assert data['frames_processed'] == 0

    def test_frame_png_endpoint(self, client, ensure_tv_on):
        """Test /api/frame endpoint returns PNG placeholder without a frame"""
        response = client.get(FRAME_URL)
        assert response.status_code == 200
        assert response.headers.get('content-type', '').startswith('image/png')
        assert response.data.startswith(b'\x89PNG')

    def test_frame_json_endpoint(self, client, ensure_tv_on):
        """Test /api/frame?format=json endpoint"""
        response = client.get(f"{FRAME_URL}?format=json")
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "").lower()
        data = response.get_json()
        assert isinstance(data, dict)
        assert data['frame'] is None


class TestStateConsistency:
    """Test state consistency across API calls"""

    def test_state_persists(self, client):
        """State is stable across requests with no input"""
        state1 = get_state()
        state2 = get_state()
        assert isinstance(state1, dict)
        assert state1 == state2

    def test_state_updates(self, client, ensure_tv_on):
        """Test state updates after button press"""
        initial_volume = get_state()['volume']
        press_button(BUTTON_CODES['Volume Up'])
        new_state = get_state()
        assert new_state['volume'] == initial_volume + 1
        assert new_state['last_button'] == 'Volume Up'
