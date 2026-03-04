"""
Base class for remote control backends (simulator, Broadlink, Samsung, LG, CEC).
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class RemoteBackend(ABC):
    """Abstract backend that can send button codes and optionally report state."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Backend identifier (e.g. 'simulator', 'broadlink')."""
        pass

    @abstractmethod
    def send_button(self, button_code: int, delay_ms: int = 0) -> bool:
        """Send a button code. Returns True if sent successfully."""
        pass

    def get_state(self) -> Optional[Dict[str, Any]]:
        """Return current device state if available (power, volume, etc.). Default: None."""
        return None

    def available(self) -> bool:
        """Return True if this backend is configured and ready to use."""
        return True
