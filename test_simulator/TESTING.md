# Testing the Simulator

Automated tests (pytest) and a manual checklist for the web and desktop simulators.
C and JavaScript checks are in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Automated tests

```bash
cd test_simulator
pip install -r requirements.txt -r requirements-dev.txt   # or: poetry install
pytest                                                     # or: poetry run pytest
```

The suite runs entirely in-process: the Flask app is driven through Flask's test client and
Socket.IO through `flask_socketio`'s test client. **No server needs to be running**, nothing
listens on a port, and no real devices, MQTT brokers or webhooks are contacted. `conftest.py`
also sets SDL dummy drivers so Pygame never opens a window, and points `SERVICE_CONFIG` at a
non-existent file so a developer's `service_config.json` or API key doesn't leak into tests.

Expected result: all tests pass, with one Windows-only test skipped on other platforms.

### Running a subset

```bash
pytest tests/test_api.py                                   # one file
pytest tests/test_api.py::TestButtonAPI::test_power_button # one test
pytest -k streaming                                        # by keyword
pytest tests/test_brand_detection.py tests/test_protocol_classifier.py tests/test_ir_synthetic.py
```

### Test files

| File | Covers |
|------|--------|
| `test_unit.py` | Module imports, file structure, Python syntax, HTML/JS structure |
| `test_environment.py` | Required imports, file layout, `web_server` symbols, HTML/JS structure |
| `test_api.py` | REST endpoints, button API, frame API, state consistency |
| `test_functional.py` | Power cycle, streaming apps, channels, navigation, volume, WebSocket |
| `test_all_buttons.py` | Every button code individually |
| `test_system.py` | Strict streaming checks, rapid switching, number-pad channels, Home, frame API |
| `test_remote_visual.py` | Button presses are accepted, change state, and broadcast `tv_state_update` (drives the 3D press animation) |
| `test_planned.py` | `autonomous_config.json` format, `scheduler.load_config()`, `/api/detect-brand`, IR pipeline |
| `test_scheduler.py` | Scheduler rule evaluation and targets |
| `test_adapters_service.py` | Backend adapters and service layer (auth, webhooks, MQTT config) |
| `test_security.py` | API-key enforcement on REST and Socket.IO, malformed input, path handling |
| `test_brand_detection.py` | Keyword brand detection (no model, confidence range, all brands) |
| `test_protocol_classifier.py` | Rule-based NEC/RC5/RC6 classifier and its 40% tolerance |
| `test_ir_synthetic.py` | Synthetic NEC/RC5/RC6 timing generation |

Markers (`unit`, `integration`, `functional`, `slow`, `requires_server`) are declared in
`pytest.ini`; `requires_server` is legacy and no longer needs a server.

### Fixtures (`tests/conftest.py`)

- `ws`: the imported `web_server` module (state is reset before each test).
- `client`: Flask test client; `sio_client`: Socket.IO test client.
- `ensure_tv_on`: powers the TV on for a test and off afterwards.
- `api_key`: enables API-key auth for a test.
- Helpers `press_button(button_code)` and `get_state()`.

### Streaming API smoke test

`test_streaming_api.sh` curls the frame endpoints of a **running** server on `localhost:5000`
and saves sample frames. A browser must have the simulator open for real frames to exist;
otherwise `/api/frame` returns a black placeholder PNG.

## Manual checklist (web simulator)

Start the server (`python web_server.py`) and open <http://localhost:5000>.

**Scene**
- [ ] The 3D house, TV and remote load with no errors in the browser console (F12).
- [ ] Status panel on the right, controls help at bottom left.

**Remote**
- [ ] Clicking Power shows the IR beam, the button glows green and presses in (~200 ms), the TV
      turns on and the status panel updates.
- [ ] Volume, Channel, Home and number-pad buttons behave as expected.

**Camera**
- [ ] Drag orbits, scroll zooms; `1`/`2`/`3`/`4` switch front/side/top/remote views; `Space` resets.
- [ ] *Walk around* enters first-person walk (WASD + mouse); `Esc` exits.

**Streaming apps** (TV must be on)

| Button | Code | Screen colour |
|--------|------|---------------|
| YouTube | `0x01` | `#FF0000` |
| Netflix | `0x02` | `#E50914` |
| Amazon Prime | `0x03` | `#00A8E1` |
| HBO Max | `0x04` | `#800080` |

- [ ] Each app cross-fades in (about 1 s), shows its name and an "Opening …" notification.
- [ ] The room's ambient light strip follows the app colour.

From the browser console you can drive the same checks:

```javascript
socket.emit('button_press', {button_code: 0x01});  // YouTube
```

**Smart home**
- [ ] `F1`–`F8`, `Shift+F1`–`F8` and `Ctrl+F1`–`F4` toggle scenes and devices (see
      [FEATURES.md](FEATURES.md#keyboard-and-mouse)).

## Manual checklist (desktop simulator)

```bash
python main.py
```

- [ ] A Pygame window opens with the TV and a status panel.
- [ ] `P` toggles power, `U`/`D` change volume (volume bar appears), `↑`/`↓` change channel.
- [ ] `Esc` closes the window.

## C remote with a simulator

See [GETTING_STARTED.md](../docs/GETTING_STARTED.md#connect-the-c-remote-to-a-simulator): build
with `make SIMULATOR=1 WEB=1`, run `./bin/remote_control`, choose menu option 1 or 2, and watch
the presses arrive in the browser.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Scene doesn't load | Browser console errors; Three.js loaded; WebGL enabled |
| Buttons do nothing | WebSocket connected (status panel); server running; if an API key is configured, the page must supply it |
| App colours don't change | TV is powered on; screen brightness > 0 |
| `pytest` can't import Flask | Activate the venv or use `poetry run pytest` |
