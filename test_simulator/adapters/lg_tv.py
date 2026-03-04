"""
LG webOS TV adapter. Requires: pip install pylgtv. Config: host (IP), port (optional).
"""
import time
from typing import Any, Optional

from .base import RemoteBackend

try:
    from pylgtv import WebOsClient
    LG_AVAILABLE = True
except ImportError:
    LG_AVAILABLE = False
    WebOsClient = None

# Map button_code to LG button name (webOS input key)
LG_KEYS = {
    0x10: "POWER",
    0x11: "VOLUMEUP",
    0x12: "VOLUMEDOWN",
    0x13: "MUTE",
    0x14: "CHANNELUP",
    0x15: "CHANNELDOWN",
    0x20: "HOME",
    0x21: "MENU",
    0x22: "BACK",
    0x23: "EXIT",
    0x25: "INPUT",
    0x26: "INPUT",
    0x30: "UP",
    0x31: "DOWN",
    0x32: "LEFT",
    0x33: "RIGHT",
    0x34: "ENTER",
    0x35: "ENTER",
    0x40: "PLAY",
    0x41: "PAUSE",
    0x42: "STOP",
    0x43: "FASTFORWARD",
    0x44: "REWIND",
    0x70: "INFO",
    0x72: "SETTINGS",
}


class LGTVAdapter(RemoteBackend):
    """Control LG webOS TV via pylgtv."""

    def __init__(self, host: Optional[str] = None, port: int = 3000, **kwargs: Any):
        self._host = host or kwargs.get("ip")
        self._port = port
        self._client = None

    @property
    def name(self) -> str:
        return "lg"

    def _get_client(self):
        if not LG_AVAILABLE or not self._host:
            return None
        if self._client is None:
            try:
                self._client = WebOsClient(self._host)
            except Exception:
                pass
        return self._client

    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        code = int(button_code) & 0xFF
        key = LG_KEYS.get(code)
        if not key:
            return False
        client = self._get_client()
        if not client:
            return False
        try:
            client.send_button(key)
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            return True
        except Exception:
            return False

    def available(self) -> bool:
        return LG_AVAILABLE and bool(self._host)
