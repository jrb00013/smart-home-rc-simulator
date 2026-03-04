"""
Capability model: GPU name, VRAM, and target resolution for tier classification.
"""

from dataclasses import dataclass


@dataclass
class GPUCapabilities:
    name: str
    vram_gb: float
    resolution_width: int
    resolution_height: int
    synthetic_score: float = 0.0

    @property
    def pixels(self):
        return self.resolution_width * self.resolution_height
