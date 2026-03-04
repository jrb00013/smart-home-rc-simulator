"""
GPU runtime: detection, tier classification, and graphics preset mapping.
Classifies by GPU device name + VRAM + resolution, maps to simulator graphics presets.
No global GPU database — hardware characteristics → capability → preset.
Supports config persistence and hysteresis to prevent preset flickering.
"""

from .detector import GPUDetector
from .capability import GPUCapabilities
from .tier_classifier import GPUTierClassifier
from .preset_mapper import GraphicsPresetMapper
from .runtime_monitor import RuntimeMonitor
from . import config as graphics_config

__all__ = [
    "GPUDetector",
    "GPUCapabilities",
    "GPUTierClassifier",
    "GraphicsPresetMapper",
    "RuntimeMonitor",
    "get_graphics_preset",
    "set_graphics_config",
]


def get_graphics_preset(resolution_width=1920, resolution_height=1080, config_path=None):
    """
    Detect GPU, classify tier (with hysteresis), return simulator graphics preset dict.
    Loads/saves graphics_config.json for tier override and last_tier/last_vram (hysteresis).
    Safe to call on headless or when GPUtil is missing (returns SIM_SAFE preset).
    """
    cfg = graphics_config.load_config(config_path)
    mapper = GraphicsPresetMapper()

    if not cfg["use_auto"] and cfg["tier_override"]:
        tier = cfg["tier_override"]
        preset = mapper.map(tier)
        preset["_tier"] = tier
        preset["_gpu_name"] = None
        preset["_vram_gb"] = None
        preset["_tier_override"] = True
        return preset

    detector = GPUDetector()
    gpu_info = detector.detect()
    if not gpu_info:
        tier = "SIM_SAFE"
        caps = None
    else:
        caps = GPUCapabilities(
            name=gpu_info["name"],
            vram_gb=gpu_info["vram_gb"],
            resolution_width=resolution_width,
            resolution_height=resolution_height,
        )
        classifier = GPUTierClassifier()
        tier = classifier.classify(caps, previous_tier=cfg.get("last_tier"))
        cfg["last_tier"] = tier
        cfg["last_vram_gb"] = caps.vram_gb
        graphics_config.save_config(cfg, config_path)

    preset = mapper.map(tier)
    preset["_tier"] = tier
    preset["_gpu_name"] = (caps.name if caps else None) or "unknown"
    preset["_vram_gb"] = (caps.vram_gb if caps else None)
    preset["_tier_override"] = False
    return preset


def set_graphics_config(use_auto=None, tier_override=None, config_path=None):
    """
    Update persisted graphics config (tier override or revert to auto).
    use_auto=True clears override; tier_override='MEDIUM' etc. forces a tier.
    Returns the updated config dict.
    """
    cfg = graphics_config.load_config(config_path)
    if use_auto is not None:
        cfg["use_auto"] = bool(use_auto)
        if use_auto:
            cfg["tier_override"] = None
    if tier_override is not None:
        cfg["tier_override"] = tier_override if tier_override in graphics_config.VALID_TIERS else None
        if tier_override:
            cfg["use_auto"] = False
    graphics_config.save_config(cfg, config_path)
    return cfg
