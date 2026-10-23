# Production Deployment Guide

Configuration, security, logging and deployment for the web server (`web_server.py`).

## Environment variables

All settings can be set via environment variables. No JSON file is required for a minimal production deploy.

### Web server

| Variable | Description | Default |
|----------|-------------|---------|
| `TV_REMOTE_HOST` | Bind address. Use `0.0.0.0` to accept connections from other machines (the Docker image does). | `127.0.0.1` |
| `TV_REMOTE_PORT` | Bind port | `5000` |
| `TV_REMOTE_SECRET_KEY` | Flask secret (sessions/cookies). Read from this variable, then `secret_key` in `service_config.json`; otherwise a random per-process key is generated and a warning is logged. **Set in production.** | random per process |
| `TV_REMOTE_CORS_ORIGINS` | Socket.IO allowed origins: comma-separated list, or `*` for any (logged as a warning) | empty = same-origin only |
| `TV_REMOTE_LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` | `INFO` |
| `TV_REMOTE_DEBUG` | Flask debug mode (also enables the `web_static/` hot-reload watcher). Refused when `TV_REMOTE_HOST` is not a loopback address. | `0` |
| `TV_REMOTE_RATE_LIMIT` | Per-IP rate limit, e.g. `100/hour` or `10/minute`. Empty = no limit. | (none) |

### Service layer (auth, webhooks, MQTT)

| Variable | Description |
|----------|-------------|
| `TV_REMOTE_API_KEY` | If set, all `/api/*` requests and Socket.IO connections must present the key (`X-API-Key`, `Authorization: Bearer`, `?api_key=`, or Socket.IO `auth: {api_key}`). |
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
- [ ] **Set `TV_REMOTE_API_KEY`** whenever the server binds to anything other than loopback. It gates `/api/*` and Socket.IO.
- [ ] **Disable debug:** ensure `TV_REMOTE_DEBUG` is unset or `0` (it is refused on non-loopback hosts anyway).
- [ ] **CORS:** leave `TV_REMOTE_CORS_ORIGINS` unset (same-origin) or list your front-end origins; avoid `*`.
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
export TV_REMOTE_HOST=0.0.0.0     # default 127.0.0.1 only accepts local connections
export TV_REMOTE_PORT=5000
export TV_REMOTE_CORS_ORIGINS="https://your-dashboard.example.com"
export TV_REMOTE_RATE_LIMIT="200/hour"
export TV_REMOTE_LOG_LEVEL=INFO

python web_server.py
# Or: poetry run web-server
```

### Option 2: Gunicorn

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
Note that Gunicorn imports `web_server:app` without calling `main()`, so the C-program IPC
listener, the MQTT command subscriber and the hot-reload watcher are not started, and the app
creates Socket.IO with `async_mode='threading'`. This path has not been tested in this repository.

### Option 3: Docker

`test_simulator/Dockerfile` builds a slim Python 3.11 image with the web-server dependencies
(no pygame), runs as a non-root user, sets `TV_REMOTE_HOST=0.0.0.0` and `TV_REMOTE_PORT=5000`,
and has a `HEALTHCHECK` on `/api/health`.

```bash
docker build -t tv-remote test_simulator
docker run --rm -p 5000:5000 \
  -e TV_REMOTE_SECRET_KEY="$(openssl rand -hex 32)" \
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

- **Health check:** `GET /api/health` returns `200` and `{"status": "ok", ...}`. Use for load balancers and readiness probes (the Docker image's `HEALTHCHECK` uses it). If an API key is set, the probe must send it too.
- **Backend status:** `GET /api/backends/status` returns availability of each adapter (simulator, broadlink, etc.).

---

## Config validation at startup

The server runs `validate_config(strict=False)` at startup and logs warnings for:

- Invalid port
- Debug mode on, or debug requested on a non-loopback host (ignored)
- `TV_REMOTE_CORS_ORIGINS=*`
- Missing secret key (when strict validation is enabled)

Fix any reported issues before going live.
