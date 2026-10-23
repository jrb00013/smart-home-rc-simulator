"""
Production-ready app config: env-first, with optional JSON file and validation.
All settings can be set via environment variables; file overrides are optional.
"""
import json
import logging
import os
import re
import secrets
from typing import List, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# -----------------------------------------------------------------------------
# Environment variable names (single source of truth)
# -----------------------------------------------------------------------------
ENV_HOST = "TV_REMOTE_HOST"
ENV_PORT = "TV_REMOTE_PORT"
ENV_SECRET_KEY = "TV_REMOTE_SECRET_KEY"
ENV_CORS_ORIGINS = "TV_REMOTE_CORS_ORIGINS"
ENV_LOG_LEVEL = "TV_REMOTE_LOG_LEVEL"
ENV_DEBUG = "TV_REMOTE_DEBUG"
ENV_RATE_LIMIT = "TV_REMOTE_RATE_LIMIT"  # e.g. "100/hour" or "10/minute" or "" to disable
ENV_SERVICE_CONFIG = "SERVICE_CONFIG"
ENV_AUTONOMOUS_CONFIG = "AUTONOMOUS_CONFIG"

# Loopback by default: the dev server must not be exposed to the network unless
# TV_REMOTE_HOST is set explicitly (the Dockerfile sets 0.0.0.0).
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5000
DEFAULT_LOG_LEVEL = "INFO"
# Empty = same-origin only for Socket.IO. Set TV_REMOTE_CORS_ORIGINS="*" to allow any origin.
DEFAULT_CORS_ORIGINS = ""
# No hardcoded SECRET_KEY: if neither env nor service_config provides one, a random
# per-process key is generated (sessions do not survive restarts, which is fine for dev).
FALLBACK_SECRET = secrets.token_hex(32)
_fallback_warned = False
LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")


def _env_bool(name: str, default: bool = False) -> bool:
    v = os.environ.get(name, "").strip().lower()
    if v in ("1", "true", "yes", "on"):
        return True
    if v in ("0", "false", "no", "off"):
        return False
    return default


def _env_list(name: str, default: List[str]) -> List[str]:
    v = os.environ.get(name, "").strip()
    if not v:
        return default
    return [x.strip() for x in re.split(r"[,;\s]+", v) if x.strip()]


def get_host() -> str:
    return os.environ.get(ENV_HOST, DEFAULT_HOST).strip() or DEFAULT_HOST


def get_port() -> int:
    try:
        return int(os.environ.get(ENV_PORT, str(DEFAULT_PORT)).strip())
    except ValueError:
        return DEFAULT_PORT


def get_secret_key() -> str:
    """Secret for Flask session/cookies. Prefer env; then service_config; then fallback (dev only)."""
    key = os.environ.get(ENV_SECRET_KEY, "").strip()
    if key:
        return key
    try:
        path = os.environ.get(ENV_SERVICE_CONFIG) or os.path.join(SCRIPT_DIR, "service_config.json")
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            key = (cfg.get("secret_key") or "").strip()
            if key:
                return key
    except Exception:
        pass
    global _fallback_warned
    if not _fallback_warned:
        _fallback_warned = True
        logging.getLogger("app_config").warning(
            "%s not set (and no secret_key in service_config); using a random per-process "
            "dev secret. Set %s in production.", ENV_SECRET_KEY, ENV_SECRET_KEY)
    return FALLBACK_SECRET


def get_cors_origins() -> List[str]:
    """CORS allowed origins. Env: comma/semicolon separated, or '*'.
    Returns [] when unset, meaning same-origin only (never "allow all" by default)."""
    v = os.environ.get(ENV_CORS_ORIGINS, DEFAULT_CORS_ORIGINS).strip()
    if v == "*":
        return ["*"]
    return [x.strip() for x in re.split(r"[,;\s]+", v) if x.strip()]


def is_loopback_host(host: str) -> bool:
    return (host or "").strip().lower() in LOOPBACK_HOSTS


def get_log_level() -> str:
    v = os.environ.get(ENV_LOG_LEVEL, DEFAULT_LOG_LEVEL).strip().upper()
    if v in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
        return v
    return DEFAULT_LOG_LEVEL


def get_debug() -> bool:
    return _env_bool(ENV_DEBUG, False)


def get_rate_limit() -> Optional[str]:
    """e.g. '100/hour' or '10/minute'. Empty string or unset = no limit."""
    v = os.environ.get(ENV_RATE_LIMIT, "").strip()
    if not v:
        return None
    return v


def validate_config(strict: bool = False) -> List[str]:
    """
    Validate config. Returns list of warning/error messages.
    If strict=True and there are errors, consider exiting.
    """
    errors: List[str] = []
    port = get_port()
    if port < 1 or port > 65535:
        errors.append(f"Invalid {ENV_PORT}: {port}")
    if get_debug():
        errors.append("Debug mode is on (TV_REMOTE_DEBUG=1); disable in production.")
        if not is_loopback_host(get_host()):
            errors.append("Debug mode is ignored when binding a non-loopback host (Werkzeug debugger = remote code execution).")
    if "*" in get_cors_origins():
        errors.append(f"{ENV_CORS_ORIGINS}=* lets any website drive the remote over Socket.IO.")
    if get_secret_key() == FALLBACK_SECRET and strict:
        errors.append(f"Set {ENV_SECRET_KEY} or secret_key in service_config for production.")
    return errors
