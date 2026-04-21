#!/usr/bin/env python3
"""
Autonomous scheduler: time-of-day rules + presets → automatic button presses.
Uses adapters: simulator (default), broadlink, samsung, lg, cec.
Production: set AUTONOMOUS_CONFIG, SERVICE_CONFIG via env. Handles SIGTERM for graceful exit.
"""
import json
import logging
import os
import signal
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG_PATH = os.path.join(SCRIPT_DIR, "autonomous_config.json")
DEFAULT_CHECK_INTERVAL_SEC = 30
DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
SEND_RETRIES = 2
SEND_RETRY_DELAY_SEC = 0.5

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("scheduler")


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_service_config():
    """Load service_config so adapters (backends) are available."""
    try:
        from service_layer import load_service_config as _load
        return _load()
    except ImportError:
        return {}
    try:
        from adapters.registry import load_config as _load
        return _load()
    except ImportError:
        return {}


def get_adapter_for_target(target: str = None):
    """Resolve target to a RemoteBackend (simulator, broadlink, named device, etc.)."""
    from adapters.registry import get_adapter
    return get_adapter(target=target)


def send_button_with_retry(adapter, code: int, delay_ms: int = 0) -> bool:
    """Send one button with retries."""
    for attempt in range(SEND_RETRIES):
        if adapter.send_button(code, delay_ms):
            return True
        if attempt < SEND_RETRIES - 1:
            time.sleep(SEND_RETRY_DELAY_SEC)
    return False


def apply_preset(presets: list, preset_name: str, target: str = None) -> bool:
    """
    Apply a preset: send its button sequence to the given target.
    target: backend name or named device from service_config (e.g. simulator, living_room_tv).
    """
    adapter = get_adapter_for_target(target)
    for p in presets:
        if p.get("name") == preset_name:
            for b in p.get("buttons", []):
                code = b.get("button_code")
                delay = b.get("delay_ms", 0)
                if code is not None:
                    if not send_button_with_retry(adapter, code, delay):
                        log.warning("send_button failed for code %s (preset=%s target=%s)", code, preset_name, target)
            return True
    return False


def should_run_rule(rule: dict) -> bool:
    now = time.localtime()
    rule_time = rule.get("time", "")
    if not rule_time:
        return False
    try:
        h, m = map(int, rule_time.split(":"))
    except ValueError:
        return False
    days = rule.get("days") or DAY_NAMES
    today = DAY_NAMES[now.tm_wday]
    if today not in [d.lower() for d in days]:
        return False
    # Trigger if we're in the same minute (scheduler runs every CHECK_INTERVAL_SEC)
    return now.tm_hour == h and now.tm_min == m


def run_scheduler(config_path: str):
    load_service_config()
    config = load_config(config_path)
    presets = config.get("presets", [])
    time_rules = config.get("time_rules", [])
    default_target = config.get("default_target")
    check_interval = config.get("check_interval_sec", DEFAULT_CHECK_INTERVAL_SEC)

    if not default_target:
        try:
            from service_layer import get_service_config
            default_target = get_service_config().get("default_backend", "simulator")
        except ImportError:
            default_target = "simulator"

    log.info("Scheduler started | config=%s default_target=%s rules=%d presets=%d check_interval=%ds",
             config_path, default_target, len(time_rules), len(presets), check_interval)

    shutdown_requested = False
    def _on_signal(signum, frame):
        nonlocal shutdown_requested
        log.info("Shutdown requested (signal=%s)", signum)
        shutdown_requested = True
    signal.signal(signal.SIGTERM, _on_signal)
    signal.signal(signal.SIGINT, _on_signal)

    while not shutdown_requested:
        try:
            now = time.localtime()
            minute_key = (now.tm_hour, now.tm_min)

            for rule in time_rules:
                if rule.get("action") != "apply_preset":
                    continue
                preset_name = rule.get("preset_name")
                if not preset_name:
                    continue
                if not should_run_rule(rule):
                    continue
                key = (minute_key, preset_name)
                if last_triggered.get(key) == minute_key:
                    continue
                last_triggered[key] = minute_key
                # Per-rule target, or preset target, or default
                target = rule.get("target")
                if not target:
                    for p in presets:
                        if p.get("name") == preset_name:
                            target = p.get("target")
                            break
                if not target:
                    target = default_target
                log.info("Trigger | time=%s preset=%s target=%s", rule.get("time"), preset_name, target)
                apply_preset(presets, preset_name, target=target)

            if len(last_triggered) > 100:
                last_triggered = {k: v for k, v in list(last_triggered.items())[-50:]}

        except Exception as e:
            log.exception("Scheduler error: %s", e)

        time.sleep(check_interval)


def main():
    config_path = os.environ.get("AUTONOMOUS_CONFIG", DEFAULT_CONFIG_PATH)
    if not os.path.isfile(config_path):
        print(f"[Scheduler] Config not found: {config_path}")
        sys.exit(1)
    try:
        from adapters.registry import get_adapter
        get_adapter("simulator")  # ensure adapter layer loads
    except ImportError as e:
        print(f"[Scheduler] Adapters not available: {e}")
        sys.exit(1)
    run_scheduler(config_path)


if __name__ == "__main__":
    main()
