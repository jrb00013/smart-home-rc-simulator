"""
Tier classifier: VRAM + resolution → ULTRA | HIGH | MEDIUM | LOW | SIM_SAFE.
No global GPU table. 4K increases VRAM requirements.
Hysteresis: optional previous_tier to avoid preset flickering at boundaries.
"""

# VRAM (GB) below which we consider ourselves "below" this tier (for hysteresis)
_TIER_LOWER_BOUNDS = {"ULTRA": 16, "HIGH": 10, "MEDIUM": 6, "LOW": 4, "SIM_SAFE": 0}
HYSTERESIS_GB = 0.5


class GPUTierClassifier:
    """Classify GPU capability into a single tier from VRAM and resolution."""

    # 4K threshold (3840*2160)
    _4K_PIXELS = 3840 * 2160

    def classify(self, caps, previous_tier=None):
        """
        caps: GPUCapabilities (name, vram_gb, resolution_width, resolution_height).
        previous_tier: optional last tier (for hysteresis); avoids downgrade at boundary.
        Returns one of: ULTRA, HIGH, MEDIUM, LOW, SIM_SAFE.
        """
        vram = caps.vram_gb
        pixels = caps.pixels

        # 4K needs more VRAM; shift thresholds down (require more VRAM for same tier)
        if pixels >= self._4K_PIXELS:
            vram_shift = 2.0
        else:
            vram_shift = 0.0

        raw = self._raw_tier(vram, vram_shift)
        if previous_tier and previous_tier in _TIER_LOWER_BOUNDS:
            # Only allow downgrade when clearly below the previous tier's bound
            bound = _TIER_LOWER_BOUNDS[previous_tier] - vram_shift
            if _tier_rank(raw) < _tier_rank(previous_tier) and vram >= (bound - HYSTERESIS_GB):
                return previous_tier
        return raw

    def _raw_tier(self, vram, vram_shift):
        if vram >= 16 - vram_shift:
            return "ULTRA"
        if vram >= 10 - vram_shift:
            return "HIGH"
        if vram >= 6 - vram_shift:
            return "MEDIUM"
        if vram >= 4:
            return "LOW"
        return "SIM_SAFE"


def _tier_rank(tier):
    order = ("SIM_SAFE", "LOW", "MEDIUM", "HIGH", "ULTRA")
    return order.index(tier) if tier in order else -1
