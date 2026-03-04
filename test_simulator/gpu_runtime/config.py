"""
Graphics config persistence to disk.
Stores tier override, use_auto, and last tier/VRAM for hysteresis.
Config file: graphics_config.json (next to test_simulator, or cwd).
"""

import json
import os

# Default path: test_simulator/graphics_config.json
_CONFIG_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CONFIG_PATH = os.path.join(_CONFIG_DIR, "graphics_config.json")

VALID_TIERS = frozenset({"ULTRA", "HIGH", "MEDIUM", "LOW", "SIM_SAFE"})


def load_config(path=None):
    """
    Load graphics config from JSON. Returns dict with:
      use_auto (bool): if True, tier is auto from GPU; if False, use tier_override
      tier_override (str | None): forced tier when use_auto is False
      last_tier (str): last detected tier (for hysteresis)
      last_vram_gb (float | None): last detected VRAM
    """
    p = path or DEFAULT_CONFIG_PATH
    out = {
        "use_auto": True,
        "tier_override": None,
        "last_tier": None,
        "last_vram_gb": None,
    }
    try:
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data.get("use_auto"), bool):
                out["use_auto"] = data["use_auto"]
            if data.get("tier_override") is not None and data["tier_override"] in VALID_TIERS:
                out["tier_override"] = data["tier_override"]
            if data.get("last_tier") in VALID_TIERS:
                out["last_tier"] = data["last_tier"]
            if isinstance(data.get("last_vram_gb"), (int, float)):
                out["last_vram_gb"] = float(data["last_vram_gb"])
    except (OSError, json.JSONDecodeError):
        pass
    return out


def save_config(config, path=None):
    """Persist config dict to JSON."""
    p = path or DEFAULT_CONFIG_PATH
    try:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        return True
    except OSError:
        return False
