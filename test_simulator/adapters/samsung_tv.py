"""
Samsung Smart TV (Tizen) adapter. Requires: pip install samsungtvws
Config: host (IP), port (optional), token (optional, or auto-saved).
"""
from typing import Any, Optional

from .base import RemoteBackend

try:
    from samsungtvws import SamsungTVWS
    SAMSUNG_AVAILABLE = True
except ImportError:
    SAMSUNG_AVAILABLE = False
    SamsungTVWS = None

# Map our button_code to Samsung WS key names (samsungtvws remote key names)
SAMSUNG_KEYS = {
    0x10: "KEY_POWER",
    0x11: "KEY_VOLUP",
    0x12: "KEY_VOLDOWN",
    0x13: "KEY_MUTE",
    0x14: "KEY_CHUP",
    0x15: "KEY_CHDOWN",
    0x20: "KEY_HOME",
    0x21: "KEY_MENU",
    0x22: "KEY_RETURN",
    0x23: "KEY_EXIT",
    0x24: "KEY_CONTENTS",
    0x25: "KEY_HDMI",
    0x26: "KEY_SOURCE",
    0x30: "KEY_UP",
    0x31: "KEY_DOWN",
    0x32: "KEY_LEFT",
    0x33: "KEY_RIGHT",
    0x34: "KEY_ENTER",
    0x35: "KEY_ENTER",
    0x40: "KEY_PLAY",
    0x41: "KEY_PAUSE",
    0x42: "KEY_STOP",
    0x43: "KEY_FF",
    0x44: "KEY_REWIND",
    0x70: "KEY_INFO",
    0x71: "KEY_GUIDE",
    0x72: "KEY_SETTINGS",
    0x01: "KEY_YOUTUBE",   # if supported
    0x02: "KEY_NETFLIX",
    0x82: "KEY_TV",
}


class SamsungTVAdapter(RemoteBackend):
    """Control Samsung Smart TV via WebSocket API."""

    def __init__(self, host: Optional[str] = None, port: int = 8001, token: Optional[str] = None, **kwargs: Any):
        self._host = host or kwargs.get("ip")
        self._port = port
        self._token = token
        self._tv = None

    @property
    def name(self) -> str:
        return "samsung"

    def _get_tv(self):
        if not SAMSUNG_AVAILABLE or not self._host:
            return None
        if self._tv is None:
            try:
                self._tv = SamsungTVWS(self._host, port=self._port, token=self._token)
            except Exception:
                pass
        return self._tv

    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        code = int(button_code) & 0xFF
        key = SAMSUNG_KEYS.get(code)
        if not key:
            return False
        tv = self._get_tv()
        if not tv:
            return False
        try:
            tv.send_key(key)
            if delay_ms > 0:
                import time
                time.sleep(delay_ms / 1000.0)
            return True
        except Exception:
            return False

    def available(self) -> bool:
        return SAMSUNG_AVAILABLE and bool(self._host)
