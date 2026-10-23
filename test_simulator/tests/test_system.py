"""
System tests for the TV simulator: streaming, channels, frame API, rapid switching.
Runs in-process (Flask + flask_socketio test clients).
"""
import base64

import pytest

from tests.conftest import (
    FRAME_URL,
    BUTTON_CODES,
    STREAMING_SERVICES,
    NUMBER_BUTTONS,
    press_button,
    get_state,
)

# Minimal 1x1 PNG (base64, no data URL prefix) for frame pipeline test
_MINIMAL_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestStreamingStrict:
    """Streaming service tests with strict current_app verification."""

    @pytest.mark.parametrize("service_name,button_code", list(STREAMING_SERVICES.items()))
    def test_streaming_service_app_matches(self, client, ensure_tv_on, service_name, button_code):
        """After pressing a streaming button, current_app must match the service."""
        press_button(button_code)
        assert get_state().get("current_app") == service_name


class TestRapidStreamingSwitch:
    """Rapid switching between streaming services (stress/consistency)."""

    def test_rapid_streaming_cycles(self, client, ensure_tv_on):
        """Multiple cycles through all streaming services; state must stay consistent."""
        for cycle in range(5):
            for service_name, button_code in STREAMING_SERVICES.items():
                press_button(button_code)
                state = get_state()
                assert state.get("current_app") == service_name, (
                    f"Cycle {cycle + 1} {service_name}: got {state.get('current_app')!r}"
                )


class TestChannelAndTVShows:
    """Channel changes and TV show display (number buttons, current_app for TV)."""

    @pytest.mark.parametrize("channel_number", [456, 789, 123, 42, 7])
    def test_channel_set_and_tv_mode(self, client, ensure_tv_on, channel_number):
        """Three digits tune the channel exactly and switch to live TV."""
        press_button(STREAMING_SERVICES["Netflix"])
        for digit in str(channel_number).zfill(3):
            press_button(NUMBER_BUTTONS[digit])
        state = get_state()
        assert state.get("channel") == channel_number
        assert state.get("current_app") is None
        assert state.get("channel_input") == ""

    def test_stale_digits_are_discarded(self, client, ensure_tv_on, ws, monkeypatch):
        """Digits older than the entry timeout must not prefix a new entry."""
        clock = [1000.0]
        monkeypatch.setattr(ws.time, "time", lambda: clock[0])
        press_button(NUMBER_BUTTONS["4"])
        clock[0] += ws.CHANNEL_INPUT_TIMEOUT_SEC + 1
        for d in "015":
            press_button(NUMBER_BUTTONS[d])
            clock[0] += 0.1
        assert get_state()["channel"] == 15

    def test_home_from_tv_returns_home(self, client, ensure_tv_on):
        """Home button returns to Home screen (current_app == 'Home')."""
        press_button(STREAMING_SERVICES["YouTube"])
        assert get_state().get("current_app") == "YouTube"
        press_button(BUTTON_CODES["Home"])
        assert get_state().get("current_app") == "Home"


class TestFrameAPI:
    """Frame/streaming API availability and basic shape."""

    def _send_frame(self, sio, **overrides):
        payload = {"frame_data": _MINIMAL_PNG_B64, "width": 512, "height": 512, "format": "png"}
        payload.update(overrides)
        sio.emit("frame_update", payload)

    def test_frame_pipeline_receives_via_socketio(self, client, sio_client):
        """frame_update over Socket.IO is visible via GET /api/frame/info."""
        before = client.get(f"{FRAME_URL}/info").get_json()
        self._send_frame(sio_client)
        data = client.get(f"{FRAME_URL}/info").get_json()
        assert data["has_frame"] is True
        assert data["frames_processed"] == before["frames_processed"] + 1
        assert data["width"] == 512 and data["height"] == 512

    def test_frame_png_roundtrip(self, client, sio_client):
        self._send_frame(sio_client)
        r = client.get(FRAME_URL)
        assert r.status_code == 200
        assert r.mimetype == "image/png"
        assert r.data == base64.b64decode(_MINIMAL_PNG_B64)

    def test_frame_json_roundtrip(self, client, sio_client):
        self._send_frame(sio_client)
        data = client.get(f"{FRAME_URL}?format=json").get_json()
        assert data["frame"] == _MINIMAL_PNG_B64
        assert data["format"] == "png"

    def test_frame_jpeg_conversion(self, client, sio_client, ws):
        if not ws.HAS_PIL:
            r = client.get(f"{FRAME_URL}?format=jpeg")
            assert r.status_code in (200, 501)
            pytest.skip("Pillow not installed; JPEG conversion not available")
        self._send_frame(sio_client)
        r = client.get(f"{FRAME_URL}?format=jpeg")
        assert r.status_code == 200
        assert r.mimetype == "image/jpeg"
        assert r.data.startswith(b"\xff\xd8")

    def test_frame_jpeg_passthrough(self, client, sio_client, ws):
        """A stored frame that is already JPEG used to return None (500)."""
        if not ws.HAS_PIL:
            pytest.skip("Pillow not installed")
        import io
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (4, 4), "red").save(buf, format="JPEG")
        self._send_frame(sio_client, frame_data=base64.b64encode(buf.getvalue()).decode(), format="jpeg")
        r = client.get(f"{FRAME_URL}?format=jpeg")
        assert r.status_code == 200
        assert r.data == buf.getvalue()

    def test_frame_accepts_data_url(self, client, sio_client):
        self._send_frame(sio_client, frame_data="data:image/png;base64," + _MINIMAL_PNG_B64)
        assert client.get(FRAME_URL).data == base64.b64decode(_MINIMAL_PNG_B64)

    @pytest.mark.parametrize("bad", [
        {"frame_data": 123},
        {"width": "512"},
        {"height": -1},
        {"width": True},
        {"width": 10 ** 6},
    ])
    def test_frame_update_rejects_invalid(self, client, sio_client, bad):
        self._send_frame(sio_client, **bad)
        assert client.get(f"{FRAME_URL}/info").get_json()["has_frame"] is False

    def test_frame_update_non_dict_ignored(self, client, sio_client):
        sio_client.emit("frame_update", "not a dict")
        assert client.get(f"{FRAME_URL}/info").get_json()["has_frame"] is False

    def test_frame_info_returns_dimensions(self, client, ensure_tv_on):
        data = client.get(f"{FRAME_URL}/info").get_json()
        assert data["width"] > 0 and data["height"] > 0

    def test_frame_png_or_json_available(self, client, ensure_tv_on):
        r_png = client.get(FRAME_URL)
        assert r_png.status_code == 200 and r_png.mimetype == "image/png"
        r_json = client.get(f"{FRAME_URL}?format=json")
        assert r_json.status_code == 200 and r_json.is_json
