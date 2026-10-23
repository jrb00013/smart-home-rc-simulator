# Getting Started

Set up and run each part of the project: the C remote, the 3D web simulator, the 2D desktop
simulator, and the scheduler. For a five-minute version see the [README](../README.md#quick-start).

- [Prerequisites](#prerequisites)
- [Build the C remote](#build-the-c-remote)
- [Install the Python simulator](#install-the-python-simulator)
- [Run the web simulator](#run-the-web-simulator)
- [Run the desktop simulator](#run-the-desktop-simulator)
- [Connect the C remote to a simulator](#connect-the-c-remote-to-a-simulator)
- [Run the scheduler](#run-the-scheduler)
- [Troubleshooting](#troubleshooting)

## Prerequisites

| For | You need |
|-----|----------|
| C remote | `gcc` or `clang` and GNU `make` (MinGW/MSYS2 on Windows) |
| Simulators | Python 3.10+ (the CI targets 3.10+; `pyproject.toml` allows 3.8.1+) and either `pip` + `venv` or [Poetry](https://python-poetry.org/) |
| Web simulator | A browser with WebGL |

## Build the C remote

From the repository root:

```bash
make                  # bin/remote_control
make examples         # bin/*_example and bin/latency_probe
./bin/remote_control  # bin\remote_control.exe on Windows
```

Details, targets and known issues: [C_REMOTE.md](C_REMOTE.md).

## Install the Python simulator

Everything Python lives in `test_simulator/`. Pick one of the two options.

**pip + venv** (works everywhere, including Debian/Ubuntu where system `pip install` is blocked
with `externally-managed-environment`):

```bash
cd test_simulator
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt    # add -r requirements-dev.txt for pytest and ruff
```

**Poetry:**

```bash
cd test_simulator
poetry install
```

`pyproject.toml` defines console scripts, so with Poetry you can use `poetry run web-server`
and `poetry run desktop-simulator`. With pip, run the modules directly (`python web_server.py`,
`python main.py`). There is no `poetry.lock` in the repository, so Poetry resolves fresh versions.

Installing Poetry, if you want it:

```bash
curl -sSL https://install.python-poetry.org | python3 -        # Linux / macOS / WSL
# Windows PowerShell:
# (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
export PATH="$HOME/.local/bin:$PATH"                             # if `poetry` is not found
```

`requirements.txt` also pulls in optional extras (GPUtil for GPU detection, PyYAML for the
OpenAPI JSON endpoint, paho-mqtt for MQTT). Pillow (JPEG frames) and the device adapters'
libraries (`broadlink`, `samsungtvws`, `pylgtv`, `cec`) are optional and not installed by default.

## Run the web simulator

```bash
cd test_simulator
python web_server.py          # or: poetry run web-server   or: ./run_web_server.sh
```

Open <http://localhost:5000>. You get the 3D house with the TV and a clickable remote. The server
binds to `127.0.0.1:5000` by default; change it with `TV_REMOTE_HOST` / `TV_REMOTE_PORT` (all
settings: [PRODUCTION.md](../test_simulator/PRODUCTION.md#environment-variables)).

Try it from another terminal:

```bash
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/button -H "Content-Type: application/json" -d '{"button_code":16}'
curl http://localhost:5000/api/state
```

PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/button -Method POST -ContentType "application/json" -Body '{"button_code":16}'
```

Or from the browser console (F12) on the simulator page:

```javascript
socket.emit('button_press', {button_code: 0x10});  // Power
```

Mouse, keyboard and walk-mode controls are in
[FEATURES.md](../test_simulator/FEATURES.md#keyboard-and-mouse). The full API is in
[API.md](../test_simulator/API.md).

## Run the desktop simulator

A 2D Pygame window that shows the same TV state:

```bash
cd test_simulator
python main.py                # or: poetry run desktop-simulator   or: ./run_simulator.sh
```

Desktop keys: `P` power, `U`/`D` volume, `M` mute, `↑`/`↓` channel, `H` home, `N` menu, `B` back,
`I` info, `1`–`5` channels, `Y` YouTube, `T` Netflix, `A` Prime, `G` game mode, `Esc` quit.

## Connect the C remote to a simulator

Start the simulator first, then from the repository root:

| Simulator | Build | Transport |
|-----------|-------|-----------|
| Web | `make clean && make SIMULATOR=1 WEB=1` | HTTP `POST /api/button` to `TV_REMOTE_HOST`:`TV_REMOTE_PORT` (default `localhost:5000`), with `TV_REMOTE_API_KEY` if set |
| Desktop, or web via IPC | `make clean && make SIMULATOR=1` | Unix socket `/tmp/phillips_remote_tv.sock` (Windows named pipe `\\.\pipe\phillips_remote_tv`) |

```bash
./bin/remote_control
```

With the web build you should see `[Simulator] Connected to web server (3D TV interface)`. The
web server also starts the IPC listener, so a `SIMULATOR=1` build can talk to it too. If the
simulator is not running, the C program warns and continues.

## Run the scheduler

Applies presets at set times (for example, "evening preset at 19:00"). With the web server
running:

```bash
cd test_simulator
python scheduler.py           # or: poetry run python scheduler.py
```

Rules and presets are in `autonomous_config.json`. See
[SERVICE_AND_AUTOMATION.md](../test_simulator/docs/SERVICE_AND_AUTOMATION.md).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `error: externally-managed-environment` | Use a venv or Poetry (see [Install](#install-the-python-simulator)); don't `pip install` into system Python. |
| `ModuleNotFoundError` | Activate the venv / use `poetry run`, and run from `test_simulator/`. |
| `poetry: command not found` | Add `~/.local/bin` to `PATH`, or use pip + venv instead. |
| Port 5000 in use | `TV_REMOTE_PORT=5001 python web_server.py`, and export the same `TV_REMOTE_PORT` for the C web client. |
| Can't reach the server from another machine | It binds to `127.0.0.1` by default; set `TV_REMOTE_HOST=0.0.0.0` (and read the [security checklist](../test_simulator/PRODUCTION.md#security-checklist)). |
| Blank browser page | Check the browser console (F12); WebGL and JavaScript must be enabled. |
| C program can't connect (web) | Start the server first; build with `SIMULATOR=1 WEB=1`; check the firewall. |
| C program can't connect (IPC, Unix) | Remove a stale `/tmp/phillips_remote_tv.sock` and run only one simulator. |
| Server status | `curl http://localhost:5000/api/health`, or `lsof -i :5000` / `Get-NetTCPConnection -LocalPort 5000`. |

Testing: [test_simulator/TESTING.md](../test_simulator/TESTING.md).
