"""
Simulator backend: sends button codes to the local (or configured) simulator API.
"""
import time
import os
from typing import Optional

try:
    import requests
except ImportError:
    requests = None

from .base import RemoteBackend


class SimulatorAdapter(RemoteBackend):
    """Send buttons to the TV simulator via HTTP API."""

    def __init__(
        self,
        api_base: Optional[str] = None,
        state_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self._api_base = (api_base or os.environ.get("SIMULATOR_API", "http://localhost:5000")).rstrip("/")
        self._button_url = f"{self._api_base}/api/button"
        self._state_url = state_url or f"{self._api_base}/api/state"
        self._api_key = api_key or os.environ.get("TV_REMOTE_API_KEY")

    @property
    def name(self) -> str:
        return "simulator"

    def _headers(self):
        h = {"Content-Type": "application/json"}
        if self._api_key:
            h["X-API-Key"] = self._api_key
        return h

    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        if requests is None:
            return False
        try:
            r = requests.post(
                self._button_url,
                json={"button_code": button_code},
                headers=self._headers(),
                timeout=5,
            )
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            return r.status_code == 200
        except Exception:
            return False

    def get_state(self):
        if requests is None:
            return None
        try:
            r = requests.get(self._state_url, headers=self._headers(), timeout=3)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    def available(self) -> bool:
        return requests is not None
