"""
Security tests: API key enforcement (REST + Socket.IO), input validation,
static path traversal, preset/target validation, safe config defaults.
"""
import json

import pytest

from tests.conftest import API_URL, STATE_URL


class TestApiKeyREST:
    def test_no_key_configured_allows_access(self, client):
        assert client.get(STATE_URL).status_code == 200

    def test_missing_key_rejected(self, client, api_key):
        r = client.get(STATE_URL)
        assert r.status_code == 401
        assert r.get_json()["error"] == "Unauthorized"
        assert client.post(API_URL, json={"button_code": 0x10}).status_code == 401

    @pytest.mark.parametrize("make_kwargs", [
        lambda k: {"headers": {"X-API-Key": k}},
        lambda k: {"headers": {"Authorization": f"Bearer {k}"}},
        lambda k: {"query_string": {"api_key": k}},
    ])
    def test_valid_key_accepted(self, client, api_key, make_kwargs):
        assert client.get(STATE_URL, **make_kwargs(api_key)).status_code == 200

    @pytest.mark.parametrize("headers", [
        {"X-API-Key": "wrong"},
        {"X-API-Key": ""},
        {"Authorization": "Bearer wrong"},
        {"Authorization": "Basic dGVzdC1rZXktMTIzOg=="},
        {"Authorization": "Bearer "},
    ])
    def test_invalid_key_rejected(self, client, api_key, headers):
        assert client.get(STATE_URL, headers=headers).status_code == 401

    def test_prefix_of_key_rejected(self, client, api_key):
        assert client.get(STATE_URL, headers={"X-API-Key": api_key[:-1]}).status_code == 401

    def test_non_api_paths_not_gated(self, client, api_key):
        assert client.get("/").status_code == 200

    def test_double_slash_does_not_bypass(self, client, api_key):
        # Werkzeug merges slashes via a redirect; the redirected request is still gated.
        for path in ("//api/state", "/api//state", "/API/state"):
            r = client.get(path, follow_redirects=True)
            assert r.status_code in (401, 404), (path, r.status_code)

    def test_rejected_press_does_not_change_state(self, client, api_key, ws):
        client.post(API_URL, json={"button_code": 0x10})
        assert ws.tv_state["powered_on"] is False


class TestApiKeySocketIO:
    """Socket.IO used to be completely unauthenticated, bypassing the REST API key."""

    def test_unauthenticated_socket_rejected(self, ws, client, api_key):
        c = ws.socketio.test_client(ws.app, flask_test_client=client)
        assert not c.is_connected()

    def test_socket_auth_payload_accepted(self, ws, client, api_key):
        c = ws.socketio.test_client(ws.app, flask_test_client=client, auth={"api_key": api_key})
        assert c.is_connected()
        c.emit("button_press", {"button_code": 0x10})
        assert ws.tv_state["powered_on"] is True
        c.disconnect()

    def test_socket_header_accepted(self, ws, client, api_key):
        c = ws.socketio.test_client(ws.app, flask_test_client=client, headers={"X-API-Key": api_key})
        assert c.is_connected()
        c.disconnect()

    def test_socket_wrong_key_rejected(self, ws, client, api_key):
        c = ws.socketio.test_client(ws.app, flask_test_client=client, auth={"api_key": "nope"})
        assert not c.is_connected()

    def test_socket_no_key_configured_allowed(self, ws, client):
        c = ws.socketio.test_client(ws.app, flask_test_client=client)
        assert c.is_connected()
        c.disconnect()


class TestButtonValidation:
    @pytest.mark.parametrize("code", [0x10, "16", "0x10", " 0x10 "])
    def test_valid_codes(self, client, ws, code):
        r = client.post(API_URL, json={"button_code": code})
        assert r.status_code == 200
        assert r.get_json()["button_code"] == 0x10
        assert ws.tv_state["powered_on"] is True

    @pytest.mark.parametrize("code", [256, 0x110, -1, "abc", "", True, False, 1.5, [16], {"a": 1}, None])
    def test_invalid_codes_rejected(self, client, ws, code):
        r = client.post(API_URL, json={"button_code": code})
        assert r.status_code == 400
        assert ws.tv_state["last_button"] is None
        assert ws.tv_state["powered_on"] is False

    @pytest.mark.parametrize("kwargs", [
        {"data": "not json", "content_type": "text/plain"},
        {"data": "{bad json", "content_type": "application/json"},
        {},
        {"json": [16]},
        {"json": 16},
    ])
    def test_malformed_bodies_are_400(self, client, kwargs):
        assert client.post(API_URL, **kwargs).status_code == 400

    def test_from_hardware_must_be_bool(self, client):
        r = client.post(API_URL, json={"button_code": 0x10, "from_hardware": "yes"})
        assert r.status_code == 400

    def test_from_hardware_false_skips_interrupt(self, client, sio_client):
        client.post(API_URL, json={"button_code": 0x10, "from_hardware": False})
        names = [m["name"] for m in sio_client.get_received()]
        assert "tv_state_update" in names
        assert "hardware_interrupt" not in names

    def test_parse_button_code(self, ws):
        assert ws.parse_button_code(0) == 0
        assert ws.parse_button_code(255) == 255
        assert ws.parse_button_code("0xff") == 255
        assert ws.parse_button_code(256) is None
        assert ws.parse_button_code(True) is None
        assert ws.parse_button_code(16.0) is None

    def test_handle_button_press_rejects_invalid(self, ws):
        assert ws.handle_button_press("junk") is False
        assert ws.tv_state["last_button"] is None


class TestStaticFiles:
    @pytest.mark.parametrize("path", [
        "/static/../web_server.py",
        "/static/..%2fweb_server.py",
        "/static/%2e%2e/web_server.py",
        "/static/../../etc/passwd",
        "/static//etc/passwd",
        "/static/js/../../service_config.example.json",
    ])
    def test_path_traversal_blocked(self, client, path):
        r = client.get(path, follow_redirects=True)
        assert r.status_code in (400, 404), (path, r.status_code)
        assert b"SECRET" not in r.data and b"import" not in r.data[:200]

    def test_static_file_served(self, client):
        r = client.get("/static/js/simulator/main.js")
        assert r.status_code == 200
        r.close()


class TestSecurityHeaders:
    def test_nosniff_and_frame_options(self, client):
        r = client.get(STATE_URL)
        assert r.headers["X-Content-Type-Options"] == "nosniff"
        assert r.headers["X-Frame-Options"] == "SAMEORIGIN"


@pytest.fixture
def presets_file(tmp_path, monkeypatch):
    cfg = {
        "default_target": "simulator",
        "presets": [
            {"name": "evening", "buttons": [
                {"button_code": 0x10, "delay_ms": 0},
                {"button_code": 0x11, "delay_ms": 0},
            ]},
            {"name": "broken", "buttons": [
                {"button_code": "junk"},
                {"button_code": 999},
                {"button_code": 0x10, "delay_ms": -5},
                "not-a-dict",
                {"button_code": 0x10},
            ]},
        ],
        "time_rules": [],
    }
    p = tmp_path / "autonomous_config.json"
    p.write_text(json.dumps(cfg))
    monkeypatch.setenv("AUTONOMOUS_CONFIG", str(p))
    return p


class TestPresets:
    def test_list_presets(self, client, presets_file):
        data = client.get("/api/presets").get_json()
        assert [p["name"] for p in data["presets"]] == ["evening", "broken"]

    def test_trigger_runs_in_process(self, client, ws, presets_file):
        r = client.post("/api/preset/evening/trigger")
        assert r.status_code == 200
        assert r.get_json()["buttons_sent"] == 2
        assert ws.tv_state["powered_on"] is True
        assert ws.tv_state["volume"] == 51

    def test_trigger_skips_invalid_entries(self, client, ws, presets_file):
        r = client.post("/api/preset/broken/trigger")
        assert r.status_code == 200
        assert r.get_json()["buttons_sent"] == 1
        assert ws.tv_state["powered_on"] is True

    def test_unknown_preset_404(self, client, presets_file):
        assert client.post("/api/preset/nope/trigger").status_code == 404

    def test_traversal_style_name_is_just_not_found(self, client, presets_file):
        assert client.post("/api/preset/..%2f..%2fetc%2fpasswd/trigger").status_code == 404

    def test_overlong_name_400(self, client, presets_file):
        assert client.post("/api/preset/" + "a" * 500 + "/trigger").status_code == 400

    @pytest.mark.parametrize("target", ["does-not-exist", "../../x"])
    def test_unknown_target_400(self, client, presets_file, target):
        r = client.post("/api/preset/evening/trigger", json={"target": target})
        assert r.status_code == 400

    def test_unknown_target_not_cached(self, client, presets_file):
        from adapters import registry
        for i in range(20):
            client.post("/api/preset/evening/trigger", json={"target": f"t{i}"})
        assert not any(k.startswith("t") for k in registry._INSTANCES)

    def test_non_string_target_400(self, client, presets_file):
        assert client.post("/api/preset/evening/trigger", json={"target": 5}).status_code == 400

    def test_body_must_be_object(self, client, presets_file):
        assert client.post("/api/preset/evening/trigger", json=[1]).status_code == 400

    def test_registered_backend_receives_buttons(self, client, presets_file):
        from adapters import registry
        from adapters.base import RemoteBackend
        sent = []

        class FakeBackend(RemoteBackend):
            name = "fake"

            def send_button(self, button_code, delay_ms=0):
                sent.append((button_code, delay_ms))
                return True

        registry.register_backend("fake", FakeBackend)
        try:
            r = client.post("/api/preset/evening/trigger?target=fake")
            assert r.status_code == 200
            assert sent == [(0x10, 0), (0x11, 0)]
        finally:
            registry._REGISTRY.pop("fake", None)

    def test_errors_do_not_leak_exception_text(self, client, presets_file, monkeypatch):
        import presets_loader

        def boom(*a, **k):
            raise RuntimeError("secret internal detail /etc/whatever")
        monkeypatch.setattr(presets_loader, "get_presets", boom)
        r = client.get("/api/presets")
        assert r.status_code == 500
        assert b"secret internal detail" not in r.data


class TestBroadlinkLearn:
    def test_learn_validates_timeout(self, client, monkeypatch):
        import adapters.broadlink_adapter as bl
        monkeypatch.setattr(bl, "BROADLINK_AVAILABLE", True)
        for bad in (0, 10 ** 6, "x"):
            r = client.post("/api/backends/broadlink/learn", json={"host": "10.0.0.1", "timeout_sec": bad})
            assert r.status_code == 400, bad

    def test_learn_requires_host(self, client, monkeypatch):
        import adapters.broadlink_adapter as bl
        monkeypatch.setattr(bl, "BROADLINK_AVAILABLE", True)
        assert client.post("/api/backends/broadlink/learn", json={}).status_code == 400

    def test_learn_without_library_501(self, client, monkeypatch):
        import adapters.broadlink_adapter as bl
        monkeypatch.setattr(bl, "BROADLINK_AVAILABLE", False)
        assert client.post("/api/backends/broadlink/learn", json={"host": "x"}).status_code == 501


class TestRateLimit:
    def test_rate_limit_enforced(self, client, monkeypatch):
        monkeypatch.setenv("TV_REMOTE_RATE_LIMIT", "3/minute")
        codes = [client.get(STATE_URL).status_code for _ in range(5)]
        assert codes == [200, 200, 200, 429, 429]

    def test_rate_limit_store_bounded(self, ws, monkeypatch):
        monkeypatch.setenv("TV_REMOTE_RATE_LIMIT", "100/minute")
        monkeypatch.setattr(ws, "_RATE_LIMIT_MAX_TRACKED", 10)
        clock = [1000.0]
        monkeypatch.setattr(ws.time, "time", lambda: clock[0])
        for i in range(10):
            ws._rate_limit_exceeded(f"10.0.0.{i}")
        clock[0] += 120
        for i in range(5):
            ws._rate_limit_exceeded(f"10.0.1.{i}")
        assert len(ws._rate_limit_store) <= 11


class TestConfigDefaults:
    def test_default_host_is_loopback(self, monkeypatch):
        import app_config
        monkeypatch.delenv("TV_REMOTE_HOST", raising=False)
        assert app_config.get_host() == "127.0.0.1"

    def test_default_cors_is_same_origin(self, monkeypatch, ws):
        import app_config
        monkeypatch.delenv("TV_REMOTE_CORS_ORIGINS", raising=False)
        assert app_config.get_cors_origins() == []
        # [] would mean "CORS disabled" in engineio; the server must pass None (same-origin).
        assert ws.socketio.server.eio.cors_allowed_origins is None

    def test_cors_star_explicit(self, monkeypatch):
        import app_config
        monkeypatch.setenv("TV_REMOTE_CORS_ORIGINS", "*")
        assert app_config.get_cors_origins() == ["*"]
        assert any("*" in m for m in app_config.validate_config())

    def test_cross_origin_socket_rejected_by_default(self, ws, client):
        c = ws.socketio.test_client(ws.app, flask_test_client=client,
                                    headers={"Origin": "https://evil.example"})
        # flask_socketio's test client bypasses the engineio CORS check, so assert config instead
        assert ws.socketio.server.eio.cors_allowed_origins is None
        if c.is_connected():
            c.disconnect()

    def test_secret_key_from_env(self, monkeypatch):
        import app_config
        monkeypatch.setenv("TV_REMOTE_SECRET_KEY", "from-env")
        assert app_config.get_secret_key() == "from-env"

    def test_no_hardcoded_fallback_secret(self, monkeypatch, caplog):
        import app_config
        monkeypatch.delenv("TV_REMOTE_SECRET_KEY", raising=False)
        monkeypatch.setattr(app_config, "_fallback_warned", False)
        with caplog.at_level("WARNING", logger="app_config"):
            key = app_config.get_secret_key()
        assert key != "phillips_remote_tv_simulator"
        assert len(key) >= 32
        assert "TV_REMOTE_SECRET_KEY" in caplog.text

    def test_debug_on_public_host_flagged(self, monkeypatch):
        import app_config
        monkeypatch.setenv("TV_REMOTE_DEBUG", "1")
        monkeypatch.setenv("TV_REMOTE_HOST", "0.0.0.0")
        msgs = app_config.validate_config()
        assert any("non-loopback" in m for m in msgs)

    def test_main_disables_debug_on_public_host(self, ws, monkeypatch):
        calls = {}
        monkeypatch.setenv("TV_REMOTE_DEBUG", "1")
        monkeypatch.setenv("TV_REMOTE_HOST", "0.0.0.0")
        monkeypatch.setattr(ws, "start_ipc_listener", lambda: None)
        monkeypatch.setattr(ws, "_start_hmr_watcher", lambda: None)
        import signal
        monkeypatch.setattr(signal, "signal", lambda *a, **k: None)
        monkeypatch.setattr(ws.socketio, "run", lambda app, **kw: calls.update(kw))
        ws.main()
        assert calls["host"] == "0.0.0.0"
        assert calls["debug"] is False
