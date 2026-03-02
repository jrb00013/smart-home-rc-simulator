# Getting Started

Quick run guide: prerequisites, simulator options, C remote build, troubleshooting.

---

## Prerequisites: Install Poetry

Modern Linux (Ubuntu 23.04+, Debian 12+) blocks direct `pip install`. Poetry uses isolated virtual environments.

**Windows (PowerShell):**
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

**WSL/Linux/Mac:**
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

**Verify:**
```bash
poetry --version
```

If not found, add to PATH (`~/.bashrc` or `~/.zshrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
source ~/.bashrc
```

---

## Option 1: Web 3D Simulator

### Step 1: Install dependencies
```bash
cd test_simulator
poetry install
```

### Step 2: Start the web server
```bash
poetry run web-server
```
Or: `poetry run python web_server.py`

You should see:
```
============================================================
  Virtual TV Simulator - Web Server
============================================================
Access the 3D TV interface at: http://localhost:5000
```

### Step 3: Open in browser
Open `http://localhost:5000`. You get: 3D remote control, IR signal visualization, button feedback, camera views (1-4), status panel.

### Step 4: Connect C remote (optional)
In a new terminal:
```bash
cd ..   # project root
make clean
make SIMULATOR=1 WEB=1
./bin/remote_control
```
(Windows: `bin\remote_control.exe`)

The remote connects to the web server. If the server is not running, the program warns but continues.

---

## Option 2: Desktop Simulator (2D Pygame)

### Step 1: Install dependencies
```bash
cd test_simulator
poetry install
```

### Step 2: Run simulator
```bash
poetry run desktop-simulator
```
Or: `poetry run python main.py`

### Step 3: Keyboard shortcuts
- P = Power, U = Volume Up, D = Volume Down, M = Mute
- Arrow Up/Down = Channel Up/Down
- H = Home, N = Menu, ESC = Exit

### Step 4: Connect C remote (optional)
```bash
cd ..
make clean
make SIMULATOR=1
./bin/remote_control
```

---

## Quick test commands

**Browser console (F12 at http://localhost:5000):**
```javascript
socket.emit('button_press', {button_code: 0x10});  // Power
```

**REST API:**
```bash
curl -X POST http://localhost:5000/api/button -H "Content-Type: application/json" -d '{"button_code":16}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/button -Method POST -ContentType "application/json" -Body '{"button_code":16}'
```

---

## Troubleshooting

**"externally-managed-environment" (WSL/Linux)**  
Use Poetry. Do not use `pip install` for project dependencies.

**Module not found**  
Run from `test_simulator`: `poetry install`

**Poetry not found**  
Install Poetry (see Prerequisites), then `poetry --version` and `poetry install`

**Port 5000 in use**  
In `web_server.py` change `port=5000` to e.g. `port=5001`

**Web server won't start**  
Ensure Python 3.7+ and run `poetry install` in `test_simulator`

**Browser blank**  
Check console (F12); enable JavaScript; try another browser

**C program can't connect**  
Start web server first; build with `make SIMULATOR=1 WEB=1`; on Windows check firewall

---

## What you should see

**Web:** 3D TV and room, status panel (right), controls (bottom left), orbit camera on drag.

**Desktop:** 2D TV, status panel, keyboard shortcuts.

---

## Automated tests

With server running (for API/functional tests):
```bash
cd test_simulator
poetry run pytest
```
See [README_TESTS.md](../test_simulator/README_TESTS.md) for structure.

---

## Further documentation

- [Simulator overview](../test_simulator/README.md)
- [REST/WebSocket API](../test_simulator/API.md)
- [Test suite](../test_simulator/README_TESTS.md), [manual testing](../test_simulator/TESTING.md)
- [Documentation index](README.md)
