"""
Tests for planned features (autonomous scheduling, presets, detect-brand API).
These validate config formats and document expected API shape; some tests are
skipped until the features are implemented. See docs/AI_DETECTION_AND_REVOLUTIONARY_PLAN.md.
"""
import json
import pytest
import os

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
SIMULATOR_ROOT = os.path.dirname(TESTS_DIR)


def _path(*parts):
    return os.path.join(SIMULATOR_ROOT, *parts)


# --- Autonomous control: config format (planned) ---------------------------------

# Sample structures matching the plan: time rules, presets, program rules.
SAMPLE_TIME_RULE = {
    "time": "19:00",
    "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    "action": "apply_preset",
    "preset_name": "living_room_evening",
}
SAMPLE_PRESET = {
    "name": "living_room_evening",
    "buttons": [
        {"button_code": 0x10, "delay_ms": 0},
        {"button_code": 0x25, "delay_ms": 3000},
        {"button_code": 0x11, "delay_ms": 500},
    ],
}
SAMPLE_PROGRAM_RULE = {
    "show_name": "News at 6",
    "channel": 5,
    "start_time": "18:00",
    "end_time": "18:30",
    "action": "switch_channel",
}


class TestAutonomousConfigFormat:
    """Validate config format for planned autonomous control (time rules, presets)."""

    def test_time_rule_is_valid_json(self):
        """Time rule must be serializable and have expected keys."""
        s = json.dumps(SAMPLE_TIME_RULE)
        data = json.loads(s)
        assert "time" in data
        assert "action" in data

    def test_preset_is_valid_json(self):
        """Preset must be serializable and have name + buttons list."""
        s = json.dumps(SAMPLE_PRESET)
        data = json.loads(s)
        assert "name" in data
        assert "buttons" in data
        assert isinstance(data["buttons"], list)
        for b in data["buttons"]:
            assert "button_code" in b

    def test_program_rule_is_valid_json(self):
        """Program rule must be serializable and have show/channel/action."""
        s = json.dumps(SAMPLE_PROGRAM_RULE)
        data = json.loads(s)
        assert "show_name" in data or "channel" in data
        assert "action" in data

    def test_autonomous_config_schema_placeholder(self):
        """Full autonomous config can list time_rules, presets, program_rules."""
        config = {
            "time_rules": [SAMPLE_TIME_RULE],
            "presets": [SAMPLE_PRESET],
            "program_rules": [SAMPLE_PROGRAM_RULE],
        }
        s = json.dumps(config)
        loaded = json.loads(s)
        assert len(loaded["time_rules"]) == 1
        assert len(loaded["presets"]) == 1
        assert len(loaded["program_rules"]) == 1


# --- Detect-brand API (implemented) -----------------------------------------------

class TestDetectBrandAPI:
    """POST /api/detect-brand returns brand and brand_id (keyword-based from text)."""

    def test_detect_brand_from_text_returns_brand_id(self, client):
        r = client.post("/api/detect-brand", json={"text": "I have a Samsung TV"})
        assert r.status_code == 200
        data = r.get_json()
        assert data["brand"] == "Samsung"
        assert data["brand_id"] == 1
        state = client.get("/api/state").get_json()
        assert state["detected_brand"] == "Samsung"
        assert state["detected_brand_id"] == 1

    def test_detect_brand_unknown_with_gibberish(self, client):
        r = client.post("/api/detect-brand", json={"text": "xyz random"})
        assert r.status_code == 200
        data = r.get_json()
        assert data.get("brand") == "Unknown"
        assert data.get("brand_id") == 0

    def test_detect_brand_accepts_query_key(self, client):
        r = client.post("/api/detect-brand", json={"query": "LG OLED"})
        assert r.status_code == 200
        assert r.get_json().get("brand_id") == 2

    @pytest.mark.parametrize("body", [{"text": 123}, {"text": ["Samsung"]}])
    def test_detect_brand_rejects_non_string(self, client, body):
        assert client.post("/api/detect-brand", json=body).status_code == 400

    def test_detect_brand_no_body(self, client):
        r = client.post("/api/detect-brand", data="garbage", content_type="text/plain")
        assert r.status_code == 200
        assert r.get_json()["brand"] == "Unknown"


# --- Brand detection module (unit, no server) -------------------------------------

class TestBrandDetectionModule:
    """brand_detection.detect_brand_from_text works without server."""

    def test_detect_samsung(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("I have a Samsung Q80")
        assert r["brand"] == "Samsung"
        assert r["brand_id"] == 1
        assert r["confidence"] > 0

    def test_detect_lg(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("LG OLED C2")
        assert r["brand"].lower() == "lg"
        assert r["brand_id"] == 2

    def test_detect_unknown(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("nothing specific")
        assert r["brand"] == "Unknown"
        assert r["brand_id"] == 0

    def test_detect_philips(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("Philips Ambilight TV")
        assert r["brand"].lower() == "philips"
        assert r["brand_id"] == 4

    def test_detect_sony(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("Sony Bravia X90")
        assert r["brand"].lower() == "sony"
        assert r["brand_id"] == 3

    def test_detect_empty_returns_unknown(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("")
        assert r["brand"] == "Unknown"
        assert r["brand_id"] == 0
        assert r["confidence"] == 0.0

    def test_detect_returns_confidence_in_range(self):
        from brand_detection import detect_brand_from_text
        r = detect_brand_from_text("Samsung Q80")
        assert 0 <= r["confidence"] <= 1.0
        assert "brand" in r and "brand_id" in r


# --- IR pipeline (synthetic data + protocol classifier) ---------------------------

class TestIRPipeline:
    """Synthetic IR pulse-length generator and rule-based protocol classifier."""

    def test_nec_timings_shape(self):
        from ir_synthetic import nec_code_to_timings
        t = nec_code_to_timings(0x20DF10EF)
        assert len(t) >= 4
        assert t[0] == 9000 and t[1] == 4500

    def test_classify_nec(self):
        from protocol_classifier import classify_protocol
        from ir_synthetic import nec_code_to_timings
        t = nec_code_to_timings(0x20DF10EF)
        r = classify_protocol(t)
        assert r["protocol"] == "NEC"
        assert r["protocol_id"] == 1

    def test_classify_rc5(self):
        from protocol_classifier import classify_protocol
        from ir_synthetic import rc5_code_to_timings
        t = rc5_code_to_timings(0x0C)
        r = classify_protocol(t)
        assert r["protocol"] == "RC5"
        assert r["protocol_id"] == 2

    def test_classify_rc6(self):
        from protocol_classifier import classify_protocol
        from ir_synthetic import rc6_code_to_timings
        t = rc6_code_to_timings(0x800F040C)
        r = classify_protocol(t)
        assert r["protocol"] == "RC6"
        assert r["protocol_id"] == 3

    def test_classify_unknown_on_short_list(self):
        from protocol_classifier import classify_protocol
        r = classify_protocol([100, 200])
        assert r["protocol"] == "unknown"
        assert r["protocol_id"] == 0
        assert r["confidence"] == 0.0

    def test_classify_returns_confidence_in_range(self):
        from protocol_classifier import classify_protocol
        from ir_synthetic import nec_code_to_timings
        t = nec_code_to_timings(0x20DF10EF)
        r = classify_protocol(t)
        assert 0 <= r["confidence"] <= 1.0
        assert "protocol" in r and "protocol_id" in r

    def test_rc5_timings_length(self):
        from ir_synthetic import rc5_code_to_timings
        t = rc5_code_to_timings(0x10, bits=14)
        assert len(t) == 14 * 2
        assert all(x == 889 for x in t)

    def test_nec_timings_bit_encoding(self):
        from ir_synthetic import nec_code_to_timings
        t = nec_code_to_timings(0x20DF10EF)
        assert t[0] == 9000 and t[1] == 4500
        assert len(t) == 2 + 32 * 2

    def test_evaluate_classifier_on_synthetic(self):
        from ir_synthetic import generate_dataset
        from protocol_classifier import evaluate_rule_based_classifier
        import tempfile
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            path = f.name
        try:
            generate_dataset(20, path)
            stats = evaluate_rule_based_classifier(path)
            assert stats["total"] > 0
            assert stats["accuracy"] >= 0.5
        finally:
            import os
            if os.path.exists(path):
                os.unlink(path)


# --- Autonomous config and scheduler (no server) ----------------------------------

class TestAutonomousConfigLoad:
    """autonomous_config.json loads and has structure expected by scheduler."""

    def test_autonomous_config_loads(self):
        path = _path("autonomous_config.json")
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
        assert "presets" in config
        assert "time_rules" in config
        assert isinstance(config["presets"], list)
        assert isinstance(config["time_rules"], list)

    def test_autonomous_config_preset_has_buttons(self):
        path = _path("autonomous_config.json")
        with open(path, "r", encoding="utf-8") as f:
            config = json.load(f)
        assert len(config["presets"]) >= 1
        preset = config["presets"][0]
        assert "name" in preset and "buttons" in preset
        assert len(preset["buttons"]) >= 1
        assert "button_code" in preset["buttons"][0]

    def test_scheduler_load_config(self):
        from scheduler import load_config
        config = load_config(_path("autonomous_config.json"))
        assert "presets" in config and "time_rules" in config
