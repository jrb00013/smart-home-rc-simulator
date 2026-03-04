"""
Registry of backends. Loads from service_config backends and optional adapters.
"""
import os
from typing import Any, Dict, Optional

from .base import RemoteBackend
from .simulator import SimulatorAdapter

_REGISTRY: Dict[str, type] = {
    "simulator": SimulatorAdapter,
}
_INSTANCES: Dict[str, RemoteBackend] = {}
_CONFIG: Dict[str, Any] = {}


def register_backend(name: str, adapter_class: type) -> None:
    _REGISTRY[name] = adapter_class


def _load_optional_adapters():
    """Register optional backends if their deps are available."""
    try:
        from .broadlink_adapter import BroadlinkAdapter
        _REGISTRY["broadlink"] = BroadlinkAdapter
    except ImportError:
        pass
    try:
        from .samsung_tv import SamsungTVAdapter
        _REGISTRY["samsung"] = SamsungTVAdapter
    except ImportError:
        pass
    try:
        from .lg_tv import LGTVAdapter
        _REGISTRY["lg"] = LGTVAdapter
    except ImportError:
        pass
    try:
        from .cec_adapter import CECAdapter
        _REGISTRY["cec"] = CECAdapter
    except ImportError:
        pass


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load service_config.json; merge with env. Sets _CONFIG."""
    global _CONFIG
    import json
    path = config_path or os.environ.get("SERVICE_CONFIG")
    if not path:
        script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(script_dir, "service_config.json")
    if path and os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            _CONFIG = json.load(f)
    else:
        _CONFIG = {}
    return _CONFIG


def get_adapter(
    target: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
) -> RemoteBackend:
    """
    Return a RemoteBackend for the given target.
    target: 'simulator' | 'broadlink' | 'samsung' | 'lg' | 'cec' or a named device from config.
    """
    _load_optional_adapters()
    cfg = config or _CONFIG or load_config()
    backends_cfg = cfg.get("backends", {})
    default_target = cfg.get("default_backend", "simulator")

    name = target or default_target
    # Named device? e.g. backends.living_room_tv.backend = "broadlink"
    if name in backends_cfg:
        device = backends_cfg[name]
        backend_type = device.get("backend", name)
        adapter_class = _REGISTRY.get(backend_type)
        if adapter_class is None:
            adapter_class = _REGISTRY.get("simulator", SimulatorAdapter)
        key = f"{name}:{backend_type}"
        if key not in _INSTANCES:
            kwargs = {k: v for k, v in device.items() if k != "backend"}
            _INSTANCES[key] = adapter_class(**kwargs)
        return _INSTANCES[key]

    adapter_class = _REGISTRY.get(name, _REGISTRY.get("simulator", SimulatorAdapter))
    if name not in _INSTANCES:
        if name == "simulator":
            api_base = cfg.get("simulator_api") or os.environ.get("SIMULATOR_API", "http://localhost:5000")
            api_key = cfg.get("api_key") or os.environ.get("TV_REMOTE_API_KEY")
            _INSTANCES[name] = SimulatorAdapter(api_base=api_base, api_key=api_key)
        else:
            _INSTANCES[name] = adapter_class()
    return _INSTANCES[name]


def list_backends() -> list:
    """Return list of registered backend names."""
    _load_optional_adapters()
    return list(_REGISTRY.keys())
