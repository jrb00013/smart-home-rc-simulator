"""
Adapter registry + service layer tests. No network, devices, brokers or webhooks:
all external I/O is mocked.
"""
import json
import threading
from types import SimpleNamespace

import pytest

from adapters import registry
from adapters.registry import UnknownBackendError, get_adapter, list_backends
from adapters.simulator import SimulatorAdapter
import service_layer


@pytest.fixture(autouse=True)
def _clean_registry():
    registry._INSTANCES.clear()
    registry._CONFIG.clear()
    yield
    registry._INSTANCES.clear()
    registry._CONFIG.clear()


class TestRegistry:
    def test_list_backends(self):
        names = list_backends()
        for n in ("simulator", "broadlink", "samsung", "lg", "cec"):
            assert n in names

    def test_simulator_default(self):
        a = get_adapter("simulator", config={"simulator_api": "http://sim:1234", "api_key": "k"})
        assert isinstance(a, SimulatorAdapter)
        assert a._button_url == "http://sim:1234/api/button"
        assert a._api_key == "k"

    def test_unknown_target_raises_and_is_not_cached(self):
        with pytest.raises(UnknownBackendError):
            get_adapter("nope", config={"x": 1})
        assert "nope" not in registry._INSTANCES

    def test_named_simulator_device_inherits_api_key(self):
        cfg = {"api_key": "secret", "simulator_api": "http://sim:9",
               "backends": {"simulator": {"backend": "simulator"}}}
        a = get_adapter("simulator", config=cfg)
        assert a._api_key == "secret"
        assert a._button_url == "http://sim:9/api/button"

    def test_named_device_with_unknown_backend_raises(self):
        cfg = {"backends": {"tv": {"backend": "brodlink", "host": "1.2.3.4"}}}
        with pytest.raises(UnknownBackendError):
            get_adapter("tv", config=cfg)

    def test_named_device_kwargs(self):
        cfg = {"backends": {"bedroom": {"backend": "samsung", "host": "10.0.0.5", "port": 8002}}}
        a = get_adapter("bedroom", config=cfg)
        assert a.name == "samsung"
        assert a._host == "10.0.0.5" and a._port == 8002

    def test_default_backend_used_when_no_target(self):
        a = get_adapter(None, config={"default_backend": "lg", "x": 1})
        assert a.name == "lg"


class TestSimulatorAdapter:
    def test_send_button_posts_with_key(self, monkeypatch):
        import adapters.simulator as sim
        posted = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            posted.update(url=url, json=json, headers=headers)
            return SimpleNamespace(status_code=200)
        monkeypatch.setattr(sim.requests, "post", fake_post)
        a = SimulatorAdapter(api_base="http://h:1/", api_key="abc")
        assert a.send_button(0x10) is True
        assert posted["url"] == "http://h:1/api/button"
        assert posted["json"] == {"button_code": 0x10}
        assert posted["headers"]["X-API-Key"] == "abc"

    def test_send_button_failure(self, monkeypatch):
        import adapters.simulator as sim

        def boom(*a, **k):
            raise ConnectionError("down")
        monkeypatch.setattr(sim.requests, "post", boom)
        assert SimulatorAdapter(api_base="http://h:1").send_button(0x10) is False

    def test_against_in_process_server(self, monkeypatch, ws, client):
        """SimulatorAdapter talks to the real Flask app via a requests shim."""
        import adapters.simulator as sim

        def post(url, json=None, headers=None, timeout=None):
            r = client.post(url.split("h:1", 1)[1], json=json, headers=headers)
            return SimpleNamespace(status_code=r.status_code)
        monkeypatch.setattr(sim.requests, "post", post)
        assert SimulatorAdapter(api_base="http://h:1").send_button(0x10) is True
        assert ws.tv_state["powered_on"] is True


class TestDeviceAdapters:
    def test_broadlink_no_wrong_device_fallback(self, monkeypatch):
        import adapters.broadlink_adapter as bl
        other = SimpleNamespace(host=("10.0.0.99", 80), auth=lambda: None, send_data=lambda d: None)
        monkeypatch.setattr(bl, "BROADLINK_AVAILABLE", True)
        monkeypatch.setattr(bl, "broadlink", SimpleNamespace(discover=lambda timeout: [other]), raising=False)
        a = bl.BroadlinkAdapter(host="10.0.0.5", code_map={"16": "26000000"})
        assert a._get_device() is None
        assert a.send_button(0x10) is False

    def test_broadlink_sends_to_matching_host(self, monkeypatch):
        import adapters.broadlink_adapter as bl
        sent = []
        dev = SimpleNamespace(host=("10.0.0.5", 80), auth=lambda: None, send_data=sent.append)
        monkeypatch.setattr(bl, "BROADLINK_AVAILABLE", True)
        monkeypatch.setattr(bl, "broadlink", SimpleNamespace(discover=lambda timeout: [dev]), raising=False)
        a = bl.BroadlinkAdapter(host="10.0.0.5", code_map={"16": "26000000"})
        assert a.send_button(0x10) is True
        assert sent and sent[0].startswith(bytes.fromhex("26000000"))

    def test_samsung_maps_keys(self, monkeypatch):
        import adapters.samsung_tv as st
        keys = []

        class FakeTV:
            def __init__(self, host, port=None, token=None):
                pass

            def send_key(self, k):
                keys.append(k)
        monkeypatch.setattr(st, "SAMSUNG_AVAILABLE", True)
        monkeypatch.setattr(st, "SamsungTVWS", FakeTV)
        a = st.SamsungTVAdapter(host="10.0.0.2")
        assert a.send_button(0x10) is True
        assert a.send_button(0xEE) is False  # unmapped
        assert keys == ["KEY_POWER"]

    def test_lg_maps_keys(self, monkeypatch):
        import adapters.lg_tv as lg
        keys = []
        monkeypatch.setattr(lg, "LG_AVAILABLE", True)
        monkeypatch.setattr(lg, "WebOsClient", lambda host: SimpleNamespace(send_button=keys.append))
        assert lg.LGTVAdapter(host="10.0.0.3").send_button(0x11) is True
        assert keys == ["VOLUMEUP"]

    def test_adapters_unavailable_without_libs(self):
        import adapters.cec_adapter as cec
        if not cec.CEC_AVAILABLE:
            assert cec.CECAdapter().send_button(0x10) is False


class TestServiceLayer:
    def test_check_auth_constant_time_paths(self, monkeypatch):
        monkeypatch.setitem(service_layer._config, "api_key", "k1")
        monkeypatch.setattr(service_layer, "_config_loaded", True)
        req = SimpleNamespace(headers={}, args={})
        assert service_layer.check_auth(req)[1] == 401
        assert service_layer.check_auth(req, auth={"api_key": "k1"}) is None
        req = SimpleNamespace(headers={"Authorization": "Bearer k1"}, args={})
        assert service_layer.check_auth(req) is None

    def test_load_config_env_overlay(self, monkeypatch, tmp_path):
        p = tmp_path / "svc.json"
        p.write_text(json.dumps({"api_key": "file", "webhook_url": None}))
        monkeypatch.setenv("TV_REMOTE_API_KEY", "env")
        cfg = service_layer.load_service_config(str(p))
        try:
            assert cfg["api_key"] == "env"
        finally:
            monkeypatch.delenv("TV_REMOTE_API_KEY")
            service_layer.load_service_config()

    def test_invalid_json_config(self, tmp_path):
        p = tmp_path / "svc.json"
        p.write_text("{not json")
        try:
            assert service_layer.load_service_config(str(p)) == {}
        finally:
            service_layer.load_service_config()

    def test_webhook_posts_event(self, monkeypatch):
        import requests
        done = threading.Event()
        got = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            got.update(url=url, json=json, headers=headers)
            done.set()
            return SimpleNamespace(status_code=200)
        monkeypatch.setattr(requests, "post", fake_post)
        monkeypatch.setattr(service_layer, "_config", {"webhook_url": "http://hook", "webhook_headers": {"X-T": "1"}})
        monkeypatch.setattr(service_layer, "_config_loaded", True)
        service_layer.fire_webhook("state_change", {"a": 1})
        assert done.wait(2)
        assert got["json"] == {"event": "state_change", "a": 1}
        assert got["headers"]["X-T"] == "1"

    def test_webhook_filtered_event(self, monkeypatch):
        import requests
        monkeypatch.setattr(requests, "post", lambda *a, **k: pytest.fail("should not post"))
        monkeypatch.setattr(service_layer, "_config", {"webhook_url": "http://hook", "webhook_events": ["x"]})
        monkeypatch.setattr(service_layer, "_config_loaded", True)
        service_layer.fire_webhook("state_change", {})

    def test_new_mqtt_client_paho2(self):
        import paho.mqtt.client as mqtt
        c = service_layer._new_mqtt_client(mqtt)  # VERSION2 callbacks (2.0.x rejected bare Client())
        assert isinstance(c, mqtt.Client)

    def test_publish_mqtt_uses_broker(self, monkeypatch):
        import paho.mqtt.client as mqtt
        done = threading.Event()
        rec = {}

        class FakeClient:
            def __init__(self, *a, **k):
                rec["init"] = a

            def username_pw_set(self, u, p):
                rec["user"] = u

            def connect(self, host, port, keepalive):
                rec["broker"] = (host, port)

            def loop_start(self):
                pass

            def loop_stop(self):
                done.set()

            def publish(self, topic, payload, qos=0):
                rec["topic"], rec["payload"] = topic, json.loads(payload)
                return SimpleNamespace(wait_for_publish=lambda timeout=None: None)

            def disconnect(self):
                pass
        monkeypatch.setattr(mqtt, "Client", FakeClient)
        monkeypatch.setattr(service_layer, "_config", {"mqtt": {"enabled": True, "broker": "b", "port": 1, "username": "u"}})
        monkeypatch.setattr(service_layer, "_config_loaded", True)
        service_layer.publish_mqtt("state_change", {"v": 1})
        assert done.wait(2)
        assert rec["broker"] == ("b", 1)
        assert rec["topic"] == "tv_remote/events/state_change"
        assert rec["payload"] == {"v": 1}
        assert rec["user"] == "u"

    def test_mqtt_command_validation(self, monkeypatch):
        import paho.mqtt.client as mqtt
        holder = {}
        ready = threading.Event()

        class FakeClient:
            def __init__(self, *a, **k):
                holder["c"] = self

            def username_pw_set(self, *a):
                pass

            def connect(self, *a):
                pass

            def subscribe(self, t):
                holder["topic"] = t

            def loop_forever(self):
                ready.set()
        monkeypatch.setattr(mqtt, "Client", FakeClient)
        monkeypatch.setattr(service_layer, "_config", {"mqtt": {"enabled": True, "subscribe_commands": True}})
        monkeypatch.setattr(service_layer, "_config_loaded", True)
        buttons, presets = [], []
        service_layer.start_mqtt_command_subscriber(buttons.append, lambda n, t: presets.append((n, t)))
        assert ready.wait(2)
        c = holder["c"]
        for payload in ({"button_code": 16}, {"button_code": 272}, {"button_code": "16"},
                        {"button_code": True}, [1], {"preset": "p"}):
            c.on_message(c, None, SimpleNamespace(payload=json.dumps(payload).encode()))
        c.on_message(c, None, SimpleNamespace(payload=b"\xff not json"))
        assert holder["topic"] == "tv_remote/command"
        assert buttons == [16]
        assert presets == [("p", "simulator")]
