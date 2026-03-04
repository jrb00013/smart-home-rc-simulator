"""
GPU detection: device name and total VRAM.
Uses GPUtil (NVIDIA via nvidia-smi). Fallback for headless / no GPU / non-NVIDIA.
Multi-GPU: selects the GPU with the most VRAM (best for rendering).
"""

try:
    import GPUtil
    _HAS_GPUTIL = True
except ImportError:
    _HAS_GPUTIL = False
    GPUtil = None


class GPUDetector:
    """Detect GPU name and VRAM. With multiple GPUs, picks the one with the most VRAM."""

    def detect(self):
        """
        Return dict with name, vram_gb, driver (if available), or None if detection fails.
        When multiple GPUs exist, returns the GPU with the largest memoryTotal (best for graphics).
        """
        if not _HAS_GPUTIL:
            return None
        try:
            gpus = GPUtil.getGPUs()
            if not gpus:
                return None
            # Multiple GPUs/CPUs: use the one with the most VRAM for graphics
            gpu = max(gpus, key=lambda g: g.memoryTotal or 0)
            vram_mb = gpu.memoryTotal
            vram_gb = vram_mb / 1024.0 if vram_mb else 0.0
            return {
                "name": (gpu.name or "Unknown GPU").strip(),
                "vram_gb": round(vram_gb, 2),
                "driver": getattr(gpu, "driver", None),
            }
        except Exception:
            return None
