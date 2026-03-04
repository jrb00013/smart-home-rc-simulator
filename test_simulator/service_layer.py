"""
Service layer: load service_config (file + env), API key auth, webhooks, MQTT.
Used by web_server and scheduler. Production: set TV_REMOTE_API_KEY etc. via env.
"""
import json
import logging
import os
import threading
from typing import Any, Callable, Dict, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SERVICE_CONFIG_PATH = os.path.join(SCRIPT_DIR, "service_config.json")

_config: Dict[str, Any] = {}
_config_loaded = False
log = logging.getLogger("service_layer")


def load_service_config(path: Optional[str] = None) -> Dict[str, Any]:
    """Load config from file (if present), then overlay env vars. No file required for production."""
    global _config, _config_loaded
    p = path or os.environ.get("SERVICE_CONFIG") or DEFAULT_SERVICE_CONFIG_PATH
    if os.path.isfile(p):
        try:
            with open(p, "r", encoding="utf-8") as f:
                _config = json.load(f)
        except json.JSONDecodeError as e:
            log.warning("Invalid JSON in service_config %s: %s", p, e)
            _config = {}
        except Exception as e:
            log.warning("Could not load service_config %s: %s", p, e)
            _config = {}
    else:
        _config = {}
    # Env overlay (production: configure entirely via env)
    if os.environ.get("TV_REMOTE_API_KEY"):
        _config["api_key"] = os.environ.get("TV_REMOTE_API_KEY")
    if os.environ.get("TV_REMOTE_WEBHOOK_URL"):
        _config["webhook_url"] = os.environ.get("TV_REMOTE_WEBHOOK_URL")
    if os.environ.get("SIMULATOR_API"):
        _config["simulator_api"] = os.environ.get("SIMULATOR_API")
    _config_loaded = True
    return _config


def get_service_config() -> Dict[str, Any]:
    if not _config_loaded:
        load_service_config()
    return _config


def require_api_key() -> Optional[str]:
    """Return configured API key if auth is enabled, else None (no auth required)."""
    cfg = get_service_config()
    key = cfg.get("api_key") or os.environ.get("TV_REMOTE_API_KEY")
    return key if key else None


def check_auth(request) -> Optional[tuple]:
    """
    Check request for valid API key. Returns None if OK, else (error_dict, status_code).
    """
    key = require_api_key()
    if not key:
        return None
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth[7:].strip()
        if token == key:
            return None
    api_key = request.headers.get("X-API-Key") or request.args.get("api_key")
    if api_key == key:
        return None
    return ({"error": "Unauthorized", "message": "Missing or invalid API key"}, 401)


def fire_webhook(event: str, payload: Dict[str, Any]) -> None:
    """POST payload to webhook_url in background if configured. Retries once after 2s on failure."""
    cfg = get_service_config()
    url = cfg.get("webhook_url") or os.environ.get("TV_REMOTE_WEBHOOK_URL")
    if not url:
        return
    events = cfg.get("webhook_events", ["state_change"])
    if event not in events:
        return
    headers = {"Content-Type": "application/json"}
    extra_headers = cfg.get("webhook_headers") or {}
    if isinstance(extra_headers, dict):
        headers.update(extra_headers)

    def _post(retry: bool = True):
        try:
            import requests
            r = requests.post(url, json={"event": event, **payload}, headers=headers, timeout=10)
            if r.status_code >= 400 and retry:
                import time
                time.sleep(2)
                _post(retry=False)
        except Exception as e:
            log.warning("Webhook POST failed: %s", e)
            if retry:
                import time
                time.sleep(2)
                _post(retry=False)

    threading.Thread(target=_post, daemon=True).start()


def publish_mqtt(event: str, payload: Dict[str, Any]) -> None:
    """Publish state event to MQTT if enabled."""
    cfg = get_service_config()
    mqtt_cfg = cfg.get("mqtt") or {}
    if not mqtt_cfg.get("enabled"):
        return
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        return
    prefix = mqtt_cfg.get("topic_prefix", "tv_remote")
    topic = f"{prefix}/events/{event}"
    broker = mqtt_cfg.get("broker", "localhost")
    port = mqtt_cfg.get("port", 1883)
    client = None

    def _pub():
        nonlocal client
        try:
            client = mqtt.Client()
            if mqtt_cfg.get("username"):
                client.username_pw_set(mqtt_cfg.get("username"), mqtt_cfg.get("password"))
            client.connect(broker, port, 60)
            import json as _json
            client.publish(topic, _json.dumps(payload), qos=0)
            client.disconnect()
        except Exception as e:
            log.warning("MQTT publish failed: %s", e)

    threading.Thread(target=_pub, daemon=True).start()


def start_mqtt_command_subscriber(on_button: Callable[[int], None], on_preset: Callable[[str, str], None]) -> None:
    """
    Subscribe to MQTT command topic. Messages: {"button_code": 16} or {"preset": "name", "target": "simulator"}.
    Runs in a background thread. on_button(button_code), on_preset(preset_name, target) are called from that thread.
    """
    cfg = get_service_config()
    mqtt_cfg = cfg.get("mqtt") or {}
    if not mqtt_cfg.get("enabled") or not mqtt_cfg.get("subscribe_commands"):
        return
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        return
    prefix = mqtt_cfg.get("topic_prefix", "tv_remote")
    topic = f"{prefix}/command"
    broker = mqtt_cfg.get("broker", "localhost")
    port = mqtt_cfg.get("port", 1883)

    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            if "button_code" in payload:
                code = int(payload["button_code"]) & 0xFF
                on_button(code)
            elif "preset" in payload:
                name = str(payload["preset"])
                target = str(payload.get("target", "simulator"))
                on_preset(name, target)
        except Exception as e:
            log.warning("MQTT command parse failed: %s", e)

    def run():
        try:
            client = mqtt.Client()
            if mqtt_cfg.get("username"):
                client.username_pw_set(mqtt_cfg.get("username"), mqtt_cfg.get("password"))
            client.on_message = on_message
            client.connect(broker, port, 60)
            client.subscribe(topic)
            client.loop_forever()
        except Exception as e:
            log.warning("MQTT subscriber failed: %s", e)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    log.info("MQTT command subscriber started: %s", topic)
