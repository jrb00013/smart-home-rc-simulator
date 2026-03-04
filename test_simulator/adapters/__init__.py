"""
Remote backends: simulator, IR blaster (Broadlink), smart TVs (Samsung, LG), HDMI-CEC.
Used by the scheduler and by the API to send buttons to a chosen target.
"""
from .base import RemoteBackend
from .simulator import SimulatorAdapter
from .registry import get_adapter, list_backends, register_backend

# Optional adapters (lazy import so missing deps don't break server)
def get_broadlink_adapter():
    from .broadlink_adapter import BroadlinkAdapter
    return BroadlinkAdapter

def get_samsung_adapter():
    from .samsung_tv import SamsungTVAdapter
    return SamsungTVAdapter

def get_lg_adapter():
    from .lg_tv import LGTVAdapter
    return LGTVAdapter

def get_cec_adapter():
    from .cec_adapter import CECAdapter
    return CECAdapter

__all__ = [
    "RemoteBackend",
    "SimulatorAdapter",
    "get_adapter",
    "list_backends",
    "register_backend",
]
