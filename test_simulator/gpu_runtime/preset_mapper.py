"""
Map GPU tier to simulator graphics preset.
Preset keys match what tv-simulator.js uses (renderer, shadows, textures, fog, particles).
Each tier produces distinct values so the client applies different graphics and textures
(ULTRA/HIGH/MEDIUM/LOW/SIM_SAFE). Supports multiple GPUs (server picks best by VRAM)
and CPU-only/headless (SIM_SAFE).
"""


class GraphicsPresetMapper:
    """Maps tier (ULTRA/HIGH/MEDIUM/LOW/SIM_SAFE) to simulator preset dict."""

    def map(self, tier):
        """
        Return preset dict for the simulator. Keys are consumed by tv-simulator.js.
        """
        presets = {
            "ULTRA": self._ultra(),
            "HIGH": self._high(),
            "MEDIUM": self._medium(),
            "LOW": self._low(),
            "SIM_SAFE": self._sim_safe(),
        }
        return presets.get(tier, self._medium()).copy()

    def _ultra(self):
        return {
            "antialias": True,
            "shadowMapEnabled": True,
            "shadowMapType": "PCFSoftShadowMap",
            "shadowMapSize": 4096,
            "shadowRadius": 2,
            "castShadow": True,
            "toneMappingExposure": 1.05,
            "pixelRatio": 1.0,
            "floorTextureWidth": 512,
            "floorTextureHeight": 256,
            "wallTextureSize": 256,
            "ceilingTextureSize": 128,
            "fogFar": 42,
            "ambientParticleCount": 100,
        }

    def _high(self):
        return {
            "antialias": True,
            "shadowMapEnabled": True,
            "shadowMapType": "PCFSoftShadowMap",
            "shadowMapSize": 2048,
            "shadowRadius": 1.5,
            "castShadow": True,
            "toneMappingExposure": 1.05,
            "pixelRatio": 1.0,
            "floorTextureWidth": 512,
            "floorTextureHeight": 256,
            "wallTextureSize": 256,
            "ceilingTextureSize": 128,
            "fogFar": 38,
            "ambientParticleCount": 80,
        }

    def _medium(self):
        """Decent graphics — default for unknown or mid-tier GPU."""
        return {
            "antialias": True,
            "shadowMapEnabled": True,
            "shadowMapType": "PCFShadowMap",
            "shadowMapSize": 1024,
            "shadowRadius": 1,
            "castShadow": True,
            "toneMappingExposure": 1.0,
            "pixelRatio": 0.95,
            "floorTextureWidth": 256,
            "floorTextureHeight": 128,
            "wallTextureSize": 128,
            "ceilingTextureSize": 64,
            "fogFar": 32,
            "ambientParticleCount": 40,
        }

    def _low(self):
        return {
            "antialias": True,
            "shadowMapEnabled": True,
            "shadowMapType": "BasicShadowMap",
            "shadowMapSize": 512,
            "shadowRadius": 0,
            "castShadow": True,
            "toneMappingExposure": 1.0,
            "pixelRatio": 0.9,
            "floorTextureWidth": 256,
            "floorTextureHeight": 128,
            "wallTextureSize": 128,
            "ceilingTextureSize": 64,
            "fogFar": 28,
            "ambientParticleCount": 20,
        }

    def _sim_safe(self):
        """Fallback when GPU is weak or detection fails — minimal quality."""
        return {
            "antialias": False,
            "shadowMapEnabled": False,
            "shadowMapType": "BasicShadowMap",
            "shadowMapSize": 256,
            "shadowRadius": 0,
            "castShadow": False,
            "toneMappingExposure": 1.0,
            "pixelRatio": 0.75,
            "floorTextureWidth": 128,
            "floorTextureHeight": 64,
            "wallTextureSize": 64,
            "ceilingTextureSize": 32,
            "fogFar": 24,
            "ambientParticleCount": 0,
        }
