# Test Suite

This directory contains a comprehensive pytest test suite for the Virtual TV Simulator.

## Running Tests

### Run All Tests

```bash
# Make sure server is running first
poetry run web-server

# In another terminal, run tests
poetry run pytest
```

### Run Specific Test Categories

```bash
# Unit tests only (no server required)
poetry run pytest tests/test_unit.py

# API tests (requires server)
poetry run pytest tests/test_api.py

# Functional tests (requires server)
poetry run pytest tests/test_functional.py

# All button tests
poetry run pytest tests/test_all_buttons.py

# System tests (streaming, channels, frame API, rapid switching)
poetry run pytest tests/test_system.py

# Environment tests (imports, file structure, syntax; no server)
poetry run pytest tests/test_environment.py

# Planned features (autonomous config format, detect-brand placeholder; no server)
poetry run pytest tests/test_planned.py

# ML/CV/AI audit components (brand detection, protocol classifier, synthetic IR)
poetry run pytest tests/test_brand_detection.py tests/test_protocol_classifier.py tests/test_ir_synthetic.py
```

### Run with Verbose Output

```bash
poetry run pytest -v
```

### Run Specific Test

```bash
poetry run pytest tests/test_api.py::TestButtonAPI::test_power_button
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py          # Shared fixtures and configuration
├── test_unit.py         # Unit tests (no server required)
├── test_environment.py  # Environment checks: imports, file structure, syntax (no server)
├── test_planned.py      # Planned/revolutionary: autonomous config, detect-brand API, brand/IR tests
├── test_brand_detection.py   # ML audit: brand detection (keyword-based)
├── test_protocol_classifier.py # ML audit: IR protocol classifier (rule-based)
├── test_ir_synthetic.py      # ML audit: synthetic NEC/RC5/RC6 data
├── test_api.py          # REST API integration tests
├── test_functional.py   # Functional workflow tests
├── test_system.py       # System tests: streaming, channels, frame API, rapid switching
└── test_all_buttons.py # Test all button codes
```

## Test Categories

### Unit Tests (`test_unit.py`)
- Module imports
- File structure (paths use SIMULATOR_ROOT; run from any cwd)
- Python syntax
- HTML structure
- JavaScript structure

**No server required** - These tests can run without the web server.

### Planned / revolutionary features (`test_planned.py`)
- **Autonomous config:** Time rules, presets, program rules as valid JSON; `autonomous_config.json` loads and has presets/time_rules; `scheduler.load_config()` works.
- **Detect-brand API:** With server: POST `/api/detect-brand` returns brand/brand_id (Samsung, unknown, accepts `query` key). Without server: skipped.
- **Brand detection module:** `detect_brand_from_text` for Samsung, LG, Philips, Sony, unknown, empty string; confidence in 0..1.
- **IR pipeline:** NEC/RC5/RC6 timings shape and bit encoding; `classify_protocol` for NEC, RC5, RC6, unknown (short list); confidence in range; `evaluate_rule_based_classifier` on synthetic dataset.

**No server required** for most tests; Detect-brand API tests skip when server is not running.

### ML audit components (split by module)
- **`test_brand_detection.py`** — [docs/ML_CV_AI_AUDIT.md](../docs/ML_CV_AI_AUDIT.md): no `.model`/`.predict`; response shape; confidence range; unknown/gibberish; all audited brands (Samsung–Sharp).
- **`test_protocol_classifier.py`** — API surface; NEC/RC5/RC6/unknown; response shape; 40% tolerance; `evaluate_rule_based_classifier` on synthetic data.
- **`test_ir_synthetic.py`** — NEC/RC5/RC6 timing constants; `generate_dataset` format and protocols.

**No server required.**

### API Tests (`test_api.py`)
- Server connection
- REST API endpoints
- Button press API
- Streaming/frame API
- State consistency

**Requires server** - Server must be running (`poetry run web-server`).

### Functional Tests (`test_functional.py`)
- Power cycle
- Streaming services
- Channel changes
- Navigation
- Volume control
- WebSocket functionality

**Requires server** - Server must be running.

### All Buttons Tests (`test_all_buttons.py`)
- Tests every button code individually

**Requires server** - Server must be running.

### System Tests (`test_system.py`)
- Strict streaming service verification (`current_app` matches)
- Rapid streaming switching (multiple cycles)
- Channel changes and TV show mode (number buttons, `current_app` None/Home)
- Home button returns to Home
- Frame API (info, PNG/JSON)

**Requires server** - Server must be running. Integrates scenarios for robust system testing.

### Environment Tests (`test_environment.py`)
- File structure (paths relative to test package)
- Python syntax
- Required imports (flask, socketio, etc.)
- Web server module symbols
- HTML and JavaScript structure

**No server required** - Safe to run from any working directory.

## Fixtures

### `server_running`
Checks if server is running, skips tests if not.

### `tv_state`
Gets current TV state.

### `ensure_tv_on`
Ensures TV is powered on before test, turns it off after.

## Helper Functions

### `press_button(button_code, delay=0.5)`
Presses a button via API and waits.

### `get_state()`
Gets current TV state from API.

## Configuration

Test configuration is in `pytest.ini`:
- Test paths
- Output verbosity
- Markers for test categorization

## Continuous Integration

To run tests in CI:

```bash
# Start server in background
poetry run web-server &
sleep 5  # Wait for server to start

# Run tests
poetry run pytest

# Stop server
pkill -f web-server
```

## Troubleshooting

### Tests fail with "Server is not running"
Start the server first:
```bash
poetry run web-server
```

### Tests timeout
Increase timeout in `conftest.py` or check server is responding.

### Some tests are skipped
Check if server is running and accessible at `http://localhost:5000`.

