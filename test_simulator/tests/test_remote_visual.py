"""
Tests to ensure the remote works and that button presses trigger the visual
animation pipeline (WebSocket state updates so the 3D remote shows green
highlight and press animation). In-process via flask_socketio's test client.
"""
from tests.conftest import API_URL, BUTTON_CODES, press_button, get_state, received_events


class TestRemoteWorks:
    """Verify the remote accepts button presses and state updates."""

    def test_remote_accepts_button_press(self, client):
        response = client.post(API_URL, json={"button_code": BUTTON_CODES["Power"]})
        assert response.status_code == 200

    def test_remote_state_updates_after_button(self, client, ensure_tv_on):
        initial_vol = get_state()["volume"]
        press_button(BUTTON_CODES["Volume Up"])
        assert get_state()["volume"] == initial_vol + 1


class TestVisualAnimationPipeline:
    """Button presses must broadcast tv_state_update so the client can animate."""

    def test_websocket_receives_state_update_on_button_press(self, client, ensure_tv_on, sio_client):
        """REST button press broadcasts tv_state_update to Socket.IO clients."""
        before = get_state()["volume"]
        press_button(BUTTON_CODES["Volume Up"])
        updates = received_events(sio_client, "tv_state_update")
        assert len(updates) >= 1
        assert updates[-1]["volume"] == before + 1
        assert updates[-1]["last_button"] == "Volume Up"

    def test_rest_press_emits_hardware_interrupt(self, client, sio_client):
        """API presses default to from_hardware=True and emit interrupt events."""
        press_button(BUTTON_CODES["Power"])
        names = [m["name"] for m in sio_client.get_received()]
        assert "hardware_interrupt" in names
        assert "button_press_interrupt" in names

    def test_websocket_button_press_triggers_state_broadcast(self, client, ensure_tv_on, sio_client):
        """Emitting button_press over WebSocket results in tv_state_update."""
        before = get_state()["channel"]
        sio_client.emit("button_press", {"button_code": BUTTON_CODES["Channel Up"]})
        updates = received_events(sio_client, "tv_state_update")
        assert len(updates) >= 1
        assert updates[-1]["channel"] == before + 1

    def test_websocket_invalid_button_ignored(self, client, ensure_tv_on, sio_client):
        before = get_state()
        for bad in ("nope", 999, -1, True, None, [1]):
            sio_client.emit("button_press", {"button_code": bad})
        sio_client.emit("button_press", "not a dict")
        assert sio_client.is_connected()
        assert get_state() == before
