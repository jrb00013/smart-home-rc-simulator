"""
Broadlink IR blaster adapter. Requires: pip install broadlink
Config: host (IP), optional code_map { button_code_hex: "base64_or_hex" } from learned codes.
"""
import time
from typing import Any, Dict, Optional

from .base import RemoteBackend

# Optional: broadlink
try:
    import broadlink
    BROADLINK_AVAILABLE = True
except ImportError:
    BROADLINK_AVAILABLE = False
    broadlink = None


# Users must provide code_map in service_config (learned via Broadlink app or our API).
# Example: "backends": { "living_room": { "backend": "broadlink", "host": "192.168.1.100", "code_map": { "16": "2600..." } } }
DEFAULT_CODE_MAP = {}


class BroadlinkAdapter(RemoteBackend):
    """Send IR via Broadlink device (RM pro, RM mini, etc.)."""

    def __init__(
        self,
        host: Optional[str] = None,
        code_map: Optional[Dict[int, str]] = None,
        timeout: int = 5,
        **kwargs: Any,
    ):
        self._host = host or kwargs.get("ip")
        self._code_map = {int(k): v for k, v in (code_map or DEFAULT_CODE_MAP).items()}
        self._timeout = timeout
        self._device = None

    @property
    def name(self) -> str:
        return "broadlink"

    def _get_device(self):
        if not BROADLINK_AVAILABLE or not self._host:
            return None
        if self._device is None:
            try:
                devices = broadlink.discover(timeout=self._timeout)
                for d in devices:
                    if getattr(d, "host", None) and (str(d.host[0]) == str(self._host)):
                        d.auth()
                        self._device = d
                        break
                if self._device is None and devices:
                    devices[0].auth()
                    self._device = devices[0]
            except Exception:
                pass
        return self._device

    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        code = int(button_code) & 0xFF
        ir_hex = self._code_map.get(code)
        if not ir_hex:
            return False
        dev = self._get_device()
        if not dev:
            return False
        try:
            # Broadlink expects packet as bytes (hex string or base64)
            raw = ir_hex.replace(" ", "").strip()
            if all(c in "0123456789abcdefABCDEF" for c in raw):
                data = bytes.fromhex(raw)
            else:
                import base64
                data = base64.b64decode(ir_hex)
            # Pad to 16 bytes for AES if needed
            if len(data) % 16:
                data += b"\x00" * (16 - len(data) % 16)
            dev.send_data(data)
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            return True
        except Exception:
            return False

    def available(self) -> bool:
        return BROADLINK_AVAILABLE and bool(self._host or self._get_device())
