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
MAX_CHECK_INTERVAL_SEC = 30
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


def should_run_rule(rule: dict, now: time.struct_time = None) -> bool:
    now = now or time.localtime()
    rule_time = rule.get("time", "")
    if not rule_time:
        return False
    try:
        h, m = map(int, rule_time.split(":"))
    except (ValueError, AttributeError):
        return False
    days = rule.get("days") or DAY_NAMES
    today = DAY_NAMES[now.tm_wday]
    if today not in [str(d).lower() for d in days]:
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
    # Rules match on the minute; checking less often than ~twice a minute misses them.
    if not isinstance(check_interval, (int, float)) or not 1 <= check_interval <= MAX_CHECK_INTERVAL_SEC:
        log.warning("check_interval_sec=%r out of range; using %ds", check_interval, DEFAULT_CHECK_INTERVAL_SEC)
        check_interval = DEFAULT_CHECK_INTERVAL_SEC

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

    last_triggered: dict = {}
    while not shutdown_requested:
        try:
            run_due_rules(time_rules, presets, default_target, last_triggered)
        except Exception as e:
            log.exception("Scheduler error: %s", e)

        time.sleep(check_interval)


def run_due_rules(time_rules: list, presets: list, default_target: str,
                  last_triggered: dict, now: time.struct_time = None) -> list:
    """Fire every rule due in the current minute, at most once per (minute, preset).

    `last_triggered` is mutated to remember what already fired (the loop checks more
    than once a minute). Returns the list of (preset_name, target) applied.
    Previously `last_triggered` was never defined, so every tick raised NameError
    (swallowed by the loop's except) and no rule ever fired.
    """
    now = now or time.localtime()
    minute_key = (now.tm_yday, now.tm_hour, now.tm_min)
    fired = []
    for rule in time_rules:
        if rule.get("action") != "apply_preset":
            continue
        preset_name = rule.get("preset_name")
        if not preset_name:
            continue
        if not should_run_rule(rule, now):
            continue
        key = (minute_key, preset_name)
        if key in last_triggered:
            continue
        last_triggered[key] = True
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
        try:
            apply_preset(presets, preset_name, target=target)
            fired.append((preset_name, target))
        except Exception:
            # One bad rule (e.g. unknown target) must not stop the others.
            log.exception("Preset %s failed for target %s", preset_name, target)

    # Forget entries from previous minutes so the dict stays small.
    for k in [k for k in last_triggered if k[0] != minute_key]:
        del last_triggered[k]
    return fired


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
