# Production Deployment Guide

This document covers making the TV Remote service production-ready: env-based config, security, logging, and deployment options.

## Environment variables (single source of truth)

All settings can be set via environment variables. No JSON file is required for a minimal production deploy.

### Web server

| Variable | Description | Default |
|----------|-------------|---------|
| `TV_REMOTE_HOST` | Bind address | `0.0.0.0` |
| `TV_REMOTE_PORT` | Bind port | `5000` |
| `TV_REMOTE_SECRET_KEY` | Flask secret (sessions/cookies). **Set in production.** | (fallback dev key) |
| `TV_REMOTE_CORS_ORIGINS` | Comma-separated origins, or `*` | `*` |
| `TV_REMOTE_LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` | `INFO` |
| `TV_REMOTE_DEBUG` | Enable Flask debug mode. **Leave 0 in production.** | `0` |
| `TV_REMOTE_RATE_LIMIT` | Per-IP rate limit, e.g. `100/hour` or `10/minute`. Empty = no limit. | (none) |

### Service layer (auth, webhooks, MQTT)

| Variable | Description |
|----------|-------------|
| `TV_REMOTE_API_KEY` | If set, all `/api/*` requests must send `X-API-Key` or `Authorization: Bearer <key>`. |
| `TV_REMOTE_WEBHOOK_URL` | POST URL for state-change webhooks. |
| `SERVICE_CONFIG` | Optional path to `service_config.json` (overlays env). |
| `SIMULATOR_API` | Base URL for simulator adapter (scheduler/API). |
| `AUTONOMOUS_CONFIG` | Path to `autonomous_config.json` (scheduler). |

### Scheduler

| Variable | Description |
|----------|-------------|
| `AUTONOMOUS_CONFIG` | Path to automation config. |
| `SERVICE_CONFIG` | Path to service config (for backends). |

---

## Security checklist

- [ ] **Set `TV_REMOTE_SECRET_KEY`** to a long random string (e.g. `openssl rand -hex 32`). Do not use the default in production.
- [ ] **Set `TV_REMOTE_API_KEY`** if the API is reachable from untrusted networks. Require it for all `/api/*` calls.
- [ ] **Disable debug:** ensure `TV_REMOTE_DEBUG` is unset or `0`.
- [ ] **CORS:** set `TV_REMOTE_CORS_ORIGINS` to your front-end origins (e.g. `https://dashboard.example.com`) instead of `*` when possible.
- [ ] **Rate limit:** set `TV_REMOTE_RATE_LIMIT` (e.g. `100/hour`) to reduce abuse.
- [ ] **HTTPS:** run behind a reverse proxy (nginx, Caddy) with TLS. Do not expose the raw Flask port to the internet.
- [ ] **Secrets:** store API key and secret key in env or a secrets manager, not in committed config files.

---

## Logging

- Logging goes to **stdout** with format: `%(asctime)s [%(levelname)s] %(name)s: %(message)s`.
- Level is controlled by `TV_REMOTE_LOG_LEVEL`. Use `INFO` in production; use `DEBUG` only for troubleshooting.
- In containerized deployments, capture stdout/stderr for your log aggregator.

---

## Graceful shutdown

- **Web server:** Handles `SIGTERM` and `SIGINT`; logs shutdown and exits. Process managers (systemd, Kubernetes) should send SIGTERM.
- **Scheduler:** On `SIGTERM`/`SIGINT` sets a flag and exits the main loop after the current sleep. Run as a separate process or container.

---

## Running in production

### Option 1: Direct run (single process)

```bash
export TV_REMOTE_SECRET_KEY="your-secret-from-openssl-rand-hex-32"
export TV_REMOTE_API_KEY="your-api-key"
export TV_REMOTE_PORT=5000
export TV_REMOTE_CORS_ORIGINS="https://your-dashboard.example.com"
export TV_REMOTE_RATE_LIMIT="200/hour"
export TV_REMOTE_LOG_LEVEL=INFO

poetry run python web_server.py
# Or: poetry run web-server
```

### Option 2: Gunicorn (recommended for production)

Use a production WSGI server. SocketIO requires an async mode (eventlet or gevent).

```bash
pip install gunicorn eventlet
# Or: pip install gunicorn gevent gevent-websocket

export TV_REMOTE_SECRET_KEY="..."
export TV_REMOTE_API_KEY="..."

gunicorn --bind 0.0.0.0:5000 --workers 1 --worker-class eventlet \
  "web_server:app"
```

For SocketIO you typically use one worker. See [Flask-SocketIO deployment](https://flask-socketio.readthedocs.io/en/latest/deployment.html).

### Option 3: Docker

Example Dockerfile (minimal):

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir poetry && poetry config virtualenvs.create false && poetry install --no-dev
ENV TV_REMOTE_HOST=0.0.0.0
EXPOSE 5000
CMD ["python", "web_server.py"]
```

Run with env file:

```bash
docker build -t tv-remote -f test_simulator/Dockerfile test_simulator
docker run --rm -p 5000:5000 \
  -e TV_REMOTE_SECRET_KEY="..." \
  -e TV_REMOTE_API_KEY="..." \
  tv-remote
```

### Scheduler (separate process)

```bash
export AUTONOMOUS_CONFIG=/app/autonomous_config.json
export SERVICE_CONFIG=/app/service_config.json
poetry run python scheduler.py
```

Run as a second container or systemd unit.

---

## Health and monitoring

- **Health check:** `GET /api/health` returns `200` and `{"status": "ok", ...}`. Use for load balancers and readiness probes.
- **Backend status:** `GET /api/backends/status` returns availability of each adapter (simulator, broadlink, etc.).

---

## Config validation at startup

The server runs `validate_config(strict=False)` at startup and logs warnings for:

- Invalid port
- Debug mode on
- Missing secret key (when strict validation is enabled)

Fix any reported issues before going live.
