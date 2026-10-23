"""
Service layer: load service_config (file + env), API key auth, webhooks, MQTT.
Used by web_server and scheduler. Production: set TV_REMOTE_API_KEY etc. via env.
"""
import hmac
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


def _key_matches(candidate: Optional[str], key: str) -> bool:
    """Constant-time comparison so the key cannot be recovered via response timing."""
    if not isinstance(candidate, str) or not candidate:
        return False
    return hmac.compare_digest(candidate.encode("utf-8"), key.encode("utf-8"))


def extract_api_key(request, auth: Any = None) -> Optional[str]:
    """API key from Authorization: Bearer, X-API-Key header, ?api_key= or a Socket.IO auth payload."""
    if isinstance(auth, dict) and auth.get("api_key"):
        return str(auth.get("api_key"))
    header = request.headers.get("Authorization") or ""
    if header.startswith("Bearer "):
        return header[7:].strip()
    return request.headers.get("X-API-Key") or request.args.get("api_key")


def check_auth(request, auth: Any = None) -> Optional[tuple]:
    """
    Check request for valid API key. Returns None if OK, else (error_dict, status_code).
    `auth` is the optional Socket.IO connect payload ({"api_key": "..."}).
    """
    key = require_api_key()
    if not key:
        return None
    if _key_matches(extract_api_key(request, auth), key):
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


def _new_mqtt_client(mqtt_module):
    """Create a paho Client compatible with paho-mqtt 1.x and 2.x (2.x requires callback_api_version)."""
    api_version = getattr(mqtt_module, "CallbackAPIVersion", None)
    if api_version is not None:
        return mqtt_module.Client(api_version.VERSION2)
    return mqtt_module.Client()


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
    def _pub():
        try:
            client = _new_mqtt_client(mqtt)
            if mqtt_cfg.get("username"):
                client.username_pw_set(mqtt_cfg.get("username"), mqtt_cfg.get("password"))
            client.connect(broker, port, 60)
            # Run the network loop until the message is actually written; a bare
            # publish()+disconnect() without a loop can drop the packet.
            client.loop_start()
            try:
                info = client.publish(topic, json.dumps(payload, default=str), qos=0)
                info.wait_for_publish(timeout=5)
            finally:
                client.disconnect()
                client.loop_stop()
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
            if not isinstance(payload, dict):
                raise ValueError("payload must be a JSON object")
            if "button_code" in payload:
                code = payload["button_code"]
                if isinstance(code, bool) or not isinstance(code, int) or not 0 <= code <= 0xFF:
                    raise ValueError(f"button_code must be an integer 0-255, got {code!r}")
                on_button(code)
            elif "preset" in payload:
                name = str(payload["preset"])
                target = str(payload.get("target", "simulator"))
                on_preset(name, target)
        except Exception as e:
            log.warning("MQTT command parse failed: %s", e)

    def run():
        try:
            client = _new_mqtt_client(mqtt)
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
