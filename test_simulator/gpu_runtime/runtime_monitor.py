"""
Optional runtime monitor: adjust preset from FPS (e.g. resolution scale).
Can be hooked to real FPS from the render loop later.
"""


class RuntimeMonitor:
    """
    Adjust graphics preset based on observed FPS (e.g. scale pixel ratio).
    Use from client if we add FPS reporting; for now no-op.
    """

    def get_fps(self):
        """Override or hook to real FPS from renderer."""
        return None

    def adjust(self, preset):
        """
        Optionally reduce resolution_scale / pixelRatio if FPS is low.
        preset is modified in place; returns preset.
        """
        fps = self.get_fps()
        if fps is None:
            return preset
        if fps < 30 and "pixelRatio" in preset:
            preset["pixelRatio"] = max(0.7, (preset.get("pixelRatio") or 1.0) - 0.05)
        elif fps < 45 and "pixelRatio" in preset:
            preset["pixelRatio"] = max(0.75, (preset.get("pixelRatio") or 1.0) - 0.025)
        return preset
