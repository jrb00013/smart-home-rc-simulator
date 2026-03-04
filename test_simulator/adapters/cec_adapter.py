"""
HDMI-CEC adapter. Requires: pycec or system libcec. Config: adapter (e.g. RPI, /dev/cec0).
CEC support is optional; if lib not available, adapter is registered but send_button returns False.
"""
import time
from typing import Any, Optional

from .base import RemoteBackend

CEC_AVAILABLE = False
cec = None
try:
    import cec
    CEC_AVAILABLE = True
except ImportError:
    pass

# Map button_code to key name for libcec (method names vary by pycec version)
CEC_KEYS = {
    0x10: "POWER",
    0x11: "VOLUMEUP",
    0x12: "VOLUMEDOWN",
    0x13: "MUTE",
    0x14: "CHANNELUP",
    0x15: "CHANNELDOWN",
    0x20: "ROOTMENU",
    0x21: "SETUPMENU",
    0x22: "BACK",
    0x23: "EXIT",
    0x25: "INPUTSELECT",
    0x26: "INPUTSELECT",
    0x30: "UP",
    0x31: "DOWN",
    0x32: "LEFT",
    0x33: "RIGHT",
    0x34: "SELECT",
    0x35: "SELECT",
    0x40: "PLAY",
    0x41: "PAUSE",
    0x42: "STOP",
    0x43: "FASTFORWARD",
    0x44: "REWIND",
}


class CECAdapter(RemoteBackend):
    """Send keypresses via HDMI-CEC (e.g. Raspberry Pi with CEC-capable HDMI)."""

    def __init__(self, adapter: Optional[str] = None, **kwargs: Any):
        self._adapter = adapter or "RPI"
        self._cec = None
        self._init = False

    @property
    def name(self) -> str:
        return "cec"

    def _ensure_init(self) -> bool:
        if not CEC_AVAILABLE or self._init:
            return bool(self._cec)
        try:
            self._cec = cec.ICECAdapter.Create(self._adapter)
            if self._cec and self._cec.Open():
                self._init = True
                return True
        except Exception:
            pass
        return False

    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        code = int(button_code) & 0xFF
        key_name = CEC_KEYS.get(code)
        if not key_name:
            return False
        if not CEC_AVAILABLE:
            return False
        if not self._ensure_init():
            return False
        try:
            # libcec: SendKeypress( logical_address, key, key_release )
            key_code = getattr(cec, f"CEC_USER_CONTROL_CODE_{key_name}", None)
            if key_code is None:
                key_code = cec.CEC_USER_CONTROL_CODE_SELECT
            self._cec.SendKeypress(0, key_code, False)
            time.sleep(0.05)
            self._cec.SendKeypress(0, key_code, True)
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            return True
        except Exception:
            return False

    def available(self) -> bool:
        return CEC_AVAILABLE and self._ensure_init()
