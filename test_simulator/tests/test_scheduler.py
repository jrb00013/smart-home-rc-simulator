"""
Scheduler tests: time rules actually fire (regression: `last_triggered` was undefined,
so every tick raised NameError inside the loop's try/except and nothing ever ran).
"""
import time

import pytest

import scheduler


def _at(hour, minute, wday=0, yday=10):
    # struct_time: (year, mon, mday, hour, min, sec, wday, yday, isdst)
    return time.struct_time((2026, 1, 12, hour, minute, 0, wday, yday, 0))


PRESETS = [
    {"name": "evening", "target": "fake", "buttons": [{"button_code": 0x10}, {"button_code": 0x11, "delay_ms": 0}]},
    {"name": "morning", "buttons": [{"button_code": 0x10}]},
]


@pytest.fixture
def sent(monkeypatch):
    calls = []

    class Fake:
        def send_button(self, code, delay_ms=0):
            calls.append(code)
            return True

    targets = []

    def fake_get_adapter(target=None):
        targets.append(target)
        return Fake()

    monkeypatch.setattr(scheduler, "get_adapter_for_target", fake_get_adapter)
    monkeypatch.setattr(scheduler, "SEND_RETRY_DELAY_SEC", 0)
    return calls, targets


def test_rule_fires_at_its_minute(sent):
    calls, targets = sent
    rules = [{"time": "19:00", "action": "apply_preset", "preset_name": "evening"}]
    fired = scheduler.run_due_rules(rules, PRESETS, "simulator", {}, now=_at(19, 0))
    assert fired == [("evening", "fake")]
    assert calls == [0x10, 0x11]
    assert targets == ["fake"]


def test_rule_fires_once_per_minute(sent):
    calls, _ = sent
    rules = [{"time": "19:00", "action": "apply_preset", "preset_name": "evening"}]
    state = {}
    scheduler.run_due_rules(rules, PRESETS, "simulator", state, now=_at(19, 0))
    scheduler.run_due_rules(rules, PRESETS, "simulator", state, now=_at(19, 0))
    assert calls == [0x10, 0x11]
    # Same time next day fires again
    scheduler.run_due_rules(rules, PRESETS, "simulator", state, now=_at(19, 0, wday=1, yday=11))
    assert calls == [0x10, 0x11, 0x10, 0x11]


def test_rule_not_due(sent):
    calls, _ = sent
    rules = [{"time": "19:00", "action": "apply_preset", "preset_name": "evening"}]
    assert scheduler.run_due_rules(rules, PRESETS, "simulator", {}, now=_at(19, 1)) == []
    assert calls == []


def test_day_filter(sent):
    calls, _ = sent
    rules = [{"time": "07:30", "days": ["SAT", "sun"], "action": "apply_preset", "preset_name": "morning"}]
    assert scheduler.run_due_rules(rules, PRESETS, "simulator", {}, now=_at(7, 30, wday=0)) == []
    assert scheduler.run_due_rules(rules, PRESETS, "simulator", {}, now=_at(7, 30, wday=5)) == [("morning", "simulator")]


def test_target_precedence(sent):
    _, targets = sent
    rules = [{"time": "07:30", "action": "apply_preset", "preset_name": "evening", "target": "rule_t"}]
    scheduler.run_due_rules(rules, PRESETS, "default_t", {}, now=_at(7, 30))
    rules = [{"time": "07:30", "action": "apply_preset", "preset_name": "morning"}]
    scheduler.run_due_rules(rules, PRESETS, "default_t", {}, now=_at(7, 30))
    assert targets == ["rule_t", "default_t"]


def test_bad_rule_does_not_block_others(monkeypatch, sent):
    calls, _ = sent
    real = scheduler.get_adapter_for_target

    def flaky(target=None):
        if target == "bad":
            raise ValueError("unknown backend")
        return real(target)
    monkeypatch.setattr(scheduler, "get_adapter_for_target", flaky)
    rules = [
        {"time": "08:00", "action": "apply_preset", "preset_name": "evening", "target": "bad"},
        {"time": "08:00", "action": "apply_preset", "preset_name": "morning"},
    ]
    fired = scheduler.run_due_rules(rules, PRESETS, "simulator", {}, now=_at(8, 0))
    assert fired == [("morning", "simulator")]
    assert calls == [0x10]


@pytest.mark.parametrize("rule", [
    {"time": "", "action": "apply_preset", "preset_name": "morning"},
    {"time": "7pm", "action": "apply_preset", "preset_name": "morning"},
    {"time": 1900, "action": "apply_preset", "preset_name": "morning"},
    {"time": "08:00", "action": "other", "preset_name": "morning"},
    {"time": "08:00", "action": "apply_preset"},
])
def test_invalid_rules_skipped(sent, rule):
    calls, _ = sent
    assert scheduler.run_due_rules([rule], PRESETS, "simulator", {}, now=_at(8, 0)) == []
    assert calls == []


def test_last_triggered_pruned(sent):
    rules = [{"time": "08:00", "action": "apply_preset", "preset_name": "morning"}]
    state = {}
    scheduler.run_due_rules(rules, PRESETS, "simulator", state, now=_at(8, 0))
    assert state
    scheduler.run_due_rules(rules, PRESETS, "simulator", state, now=_at(8, 1))
    assert state == {}


def test_run_scheduler_loop_fires_rule(monkeypatch, tmp_path, sent):
    """End-to-end: run_scheduler's loop applies a due rule (would have hit NameError before)."""
    import json
    calls, _ = sent
    now = time.localtime()
    cfg = {
        "presets": PRESETS,
        "time_rules": [{"time": f"{now.tm_hour:02d}:{now.tm_min:02d}", "action": "apply_preset",
                        "preset_name": "morning"}],
        "default_target": "simulator",
        "check_interval_sec": 1,
    }
    p = tmp_path / "auto.json"
    p.write_text(json.dumps(cfg))
    monkeypatch.setattr(scheduler, "load_service_config", lambda: {})
    monkeypatch.setattr(scheduler.signal, "signal", lambda *a, **k: None)
    fixed = time.localtime()
    monkeypatch.setattr(scheduler.time, "localtime", lambda *a: fixed)

    class Stop(Exception):
        pass

    def fake_sleep(_):
        raise Stop
    monkeypatch.setattr(scheduler.time, "sleep", fake_sleep)
    with pytest.raises(Stop):
        scheduler.run_scheduler(str(p))
    assert calls == [0x10]
