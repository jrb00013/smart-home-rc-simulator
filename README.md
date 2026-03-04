# 3D Autonomous Smart Home Simulator

A **3D smart home simulator** built around a virtual living room: TV, interactive remote, and room environment. Time-based rules and presets drive the TV (or real devices) automatically; the same stack can control the in-browser simulator or real TVs via Broadlink, Samsung, LG, or HDMI-CEC. The control layer is a C universal remote with multi-protocol IR, optional brand detection, and a rule-based IR protocol classifier. No cloud APIs or neural nets in the current implementation.

**In the simulator:** A full 3D room (floor, walls, window, sofa, lamps, media console) with a TV that responds to button presses. The room’s ambient light reacts to the current channel or app. You can drive it with the C program, the web UI (click the 3D remote or use the keyboard), or the **autonomous scheduler** (time rules and presets in JSON). The scheduler can target the simulator or named backends (e.g. a living-room TV) so one config runs “evening preset at 19:00” for the simulator or real hardware.

**Smart home integration:** REST API, optional API key, webhooks, and MQTT. Home Assistant and Node-RED can call the API or receive state-change events. Backend adapters (simulator, Broadlink, Samsung, LG, CEC) are selected per preset or per rule. See `test_simulator/docs/SERVICE_AND_AUTOMATION.md` and `test_simulator/docs/HOME_ASSISTANT_NODE_RED.md`.

**Extras:** Keyword-based **brand detection** (text matched against a fixed table; returns `brand_id` for the C universal TV). **IR protocol path:** `ir_synthetic` and `protocol_classifier` (rule-based, 40% tolerance). See `docs/AI_DETECTION_AND_REVOLUTIONARY_PLAN.md` for future directions.

## Features

### 3D Simulator and Automation
- **3D living room:** TV, remote, room (floor, walls, window, sofa, coffee table, lamps, plants, media console). Orbit camera, first-person mode, GPU-based graphics presets.
- **Autonomous scheduler:** Time rules (e.g. 19:00 weekdays) and presets (button sequences). Targets simulator or real devices via `autonomous_config.json` and `service_config.json`.
- **Remote as a service:** REST (state, button, presets, backends), WebSocket, optional API key, webhooks, MQTT. OpenAPI spec. Home Assistant and Node-RED examples.
- **Backend adapters:** Simulator (default), Broadlink IR blaster, Samsung Smart TV, LG webOS, HDMI-CEC. Per-rule or per-preset target.

### Streaming Service Buttons
- **YouTube** - Dedicated button for YouTube app
- **Netflix** - Dedicated button for Netflix app
- **Amazon Prime** - Dedicated button for Amazon Prime Video
- **HBO Max** - Dedicated button for HBO Max

### Standard Remote Buttons
- **Power** - Turn device on/off
- **Volume Up/Down** - Adjust audio volume
- **Mute** - Instant audio silence
- **Channel Up/Down** - Change channels
- **Home** - Go to main menu
- **Menu** - Access settings menu
- **Back/Return** - Go back one screen
- **Exit** - Close all menus
- **Input/Source** - Switch HDMI, cable, etc.
- **Options** - Context menu

### Directional Navigation
- **Up, Down, Left, Right** - Navigation pad
- **OK/Enter** - Confirm selection

### Playback Controls
- **Play** - Start playback
- **Pause** - Pause playback
- **Stop** - Stop playback
- **Fast Forward** - Skip forward
- **Rewind** - Skip backward
- **Record** - Start recording

### Number Pad
- **0-9** - Direct channel/number entry
- **Dash (-)** - For subchannels (e.g., 5-2)

### Color Buttons
- **Red, Green, Yellow, Blue** - Context-specific shortcuts

### Advanced TV Controls
- **Info** - Show program details
- **Guide** - Open program schedule
- **Settings** - Quick access to settings
- **CC/Subtitles** - Toggle closed captions
- **SAP/Audio** - Switch language/audio
- **Sleep** - Set TV sleep timer
- **Picture Mode** - Cycle picture modes
- **Aspect/Zoom/P.Size** - Adjust screen ratio

### Smart TV Features
- **Voice/Mic** - Activate voice assistant
- **Live TV** - Jump to broadcast input
- **Stream** - Access streaming services

### System & Diagnostic
- **Display/Status** - Show resolution, HDR info
- **Help/E-Manual** - Open digital manual

### Gaming Controls
- **Game Mode** - Reduce input lag

### Picture Controls
- **Motion** - Motion smoothing
- **Backlight/Brightness** - Adjust luminance

### Audio Controls
- **Sound Mode** - Switch audio modes
- **Sync** - Adjust audio delay
- **Sound Output** - Switch output (TV, HDMI ARC, etc.)

### Input & Connectivity
- **Multi View** - Split screen viewing
- **PIP** - Picture in Picture
- **Screen Mirror** - Wireless display mode

## Project Structure

```
universal-remote-simulator/
├── include/                  # C headers
│   ├── remote_buttons.h      # Button definitions and constants
│   ├── ir_codes.h            # IR code mappings and protocol
│   ├── remote_control.h      # Main remote control interface
│   └── universal_tv.h       # Universal TV support (multi-protocol)
├── src/                      # C source (remote, IR, universal TV)
│   ├── ir_codes.c
│   ├── ir_protocol.c         # RC5, RC6, NEC, etc.
│   ├── universal_tv.c        # Code database and multi-protocol sender
│   ├── remote_control.c
│   ├── tv_simulator_web.c    # Web simulator client (SIMULATOR=1 WEB=1)
│   └── main.c
├── examples/
│   ├── simple_example.c
│   └── universal_tv_example.c
├── docs/                     # C/firmware and project docs (see docs/README.md)
├── test_simulator/           # 3D simulator and smart home stack
│   ├── web_server.py         # Flask + SocketIO web app
│   ├── virtual_tv.py         # TV state and button handling
│   ├── scheduler.py          # Autonomous time rules + presets
│   ├── service_layer.py      # Auth, webhooks, MQTT
│   ├── autonomous_config.json
│   ├── adapters/             # Backends: simulator, broadlink, samsung, lg, cec
│   ├── gpu_runtime/         # GPU detection and graphics preset
│   ├── web_static/           # 3D frontend (Three.js)
│   ├── web_templates/
│   ├── docs/                 # SERVICE_AND_AUTOMATION, HOME_ASSISTANT_NODE_RED
│   └── tests/
├── obj/                      # Object files (generated)
├── bin/                      # Executable (generated)
├── Makefile
└── README.md                 # This file
```

## Documentation

- **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** — Quick run: Poetry, simulator, C remote, troubleshooting
- **[docs/README.md](docs/README.md)** — Full documentation index (C, latency, handlers, simulator, roadmap)
- **[docs/REVOLUTIONARY.md](docs/REVOLUTIONARY.md)** — Why this stack is novel
- **[docs/ML_CV_AI_AUDIT.md](docs/ML_CV_AI_AUDIT.md)** — ML/CV/AI audit (what is and is not used)
- **3D simulator and smart home:** [test_simulator/README.md](test_simulator/README.md), [test_simulator/API.md](test_simulator/API.md), [test_simulator/FEATURES.md](test_simulator/FEATURES.md). Automation: [test_simulator/docs/SERVICE_AND_AUTOMATION.md](test_simulator/docs/SERVICE_AND_AUTOMATION.md), [test_simulator/docs/HOME_ASSISTANT_NODE_RED.md](test_simulator/docs/HOME_ASSISTANT_NODE_RED.md). Tests: [test_simulator/README_TESTS.md](test_simulator/README_TESTS.md), [test_simulator/TESTING.md](test_simulator/TESTING.md).

## Building the Project

### Prerequisites
- GCC compiler (MinGW on Windows, gcc on Linux/Mac)
- Make utility

### Build Commands

```bash
# Build the project
make

# Build with virtual TV simulator support (optional)
make SIMULATOR=1

# Clean build artifacts
make clean

# Rebuild from scratch
make rebuild

# Build and run
make run

# Show help
make help
```

### Manual Compilation

```bash
gcc -Wall -Wextra -std=c11 -O2 -Iinclude -c src/ir_codes.c -o obj/ir_codes.o
gcc -Wall -Wextra -std=c11 -O2 -Iinclude -c src/remote_control.c -o obj/remote_control.o
gcc -Wall -Wextra -std=c11 -O2 -Iinclude -c src/main.c -o obj/main.o
gcc obj/*.o -o bin/remote_control
```

## Usage

### Running the Program

```bash
./bin/remote_control
```

The program provides an interactive menu with the following options:

1. **Demo Streaming Services** - Test YouTube, Netflix, Prime, HBO Max buttons
2. **Demo Basic Controls** - Test Power, Volume, Channel buttons
3. **Demo Navigation** - Test Home, Menu, D-Pad buttons
4. **Demo Playback Controls** - Test Play, Pause, Stop, etc.
5. **Demo Advanced Features** - Test Settings, Info, Guide, etc.
6. **Show All Available Buttons** - Display complete button list
7. **Interactive Button Press** - Press buttons by hex code

### Programmatic Usage

**Basic Usage** (Universal mode enabled automatically):
```c
#include "remote_control.h"

int main() {
    // Initialize remote control (universal mode enabled for TV)
    remote_init();
    
    // Press buttons - universal mode works automatically for TV
    remote_press_button(BUTTON_POWER);      // Tries all protocols
    remote_press_button(BUTTON_YOUTUBE);
    remote_press_button(BUTTON_VOLUME_UP);  // Tries all protocols
    
    // Cleanup
    remote_cleanup();
    return 0;
}
```

**Advanced Universal TV Usage**:
```c
#include "universal_tv.h"
#include "remote_buttons.h"

int main() {
    // Initialize universal TV system
    universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL);
    
    // Option 1: Multi-protocol sender (tries all protocols)
    universal_tv_send_button(BUTTON_POWER);
    
    // Option 2: Set TV brand for optimization
    universal_tv_set_brand(TV_BRAND_SAMSUNG);
    universal_tv_send_button(BUTTON_POWER);  // Prioritizes Samsung codes
    
    // Option 3: Code scan mode
    universal_tv_scan_start(BUTTON_POWER);
    universal_tv_scan_next();  // Cycle through codes
    universal_tv_scan_confirm();  // Save working code
    
    universal_tv_cleanup();
    return 0;
}
```

See `examples/universal_tv_example.c` for complete examples.

## Universal TV Support

**This remote works with ANY TV brand.** No hardcoded IR codes needed.

The project implements **three universal TV strategies**:

### Option 1: Multi-Protocol Universal Sender (Default)

**How it works**: When you press a button, the remote tries multiple IR protocols and codes in sequence.

**Supported Protocols**:
- **NEC** - Samsung, LG, TCL, Vizio, and many others
- **RC5** - Philips and some other brands
- **RC6** - Philips (extended)
- **Sony SIRC** - Sony TVs
- **Samsung Protocol** - Samsung-specific codes
- **LG Protocol** - LG-specific codes

**Example**: When you press POWER, it sends:
1. NEC code for Samsung/LG
2. RC5 code for Philips
3. RC6 code for Philips
4. Sony SIRC code
5. And more...

This gives you **90%+ TV compatibility** without knowing your TV brand!

### Option 2: Code Scan Mode

**How it works**: Like store-bought universal remotes - cycle through codes until one works.

**Usage**:
```c
// Start scan mode for POWER button
universal_tv_scan_start(BUTTON_POWER);

// Press button repeatedly - remote cycles through codes
universal_tv_scan_next();  // Try next code
universal_tv_scan_next();  // Try next code
// ... when TV responds ...

// Confirm and save the working code
universal_tv_scan_confirm();
```

**Process**:
1. Hold setup button (or call `universal_tv_scan_start()`)
2. Press POWER repeatedly
3. Remote cycles through 100+ stored TV codes
4. When TV turns off → confirm to save that code
5. Remote remembers it for future use

### Option 3: Auto-Learning Universal (Requires Hardware)

**Best overall design** - requires IR receiver:
- Add IR receiver to your device
- Point original remote at receiver
- Capture and store codes automatically
- Replay later - works with any brand automatically

**Status**: Framework ready, requires IR receiver hardware implementation.

### Using Universal Mode

**Automatic (Recommended)**:
```c
// Universal mode is enabled by default for TV device
remote_init();  // Automatically uses universal mode for TV
remote_press_button(BUTTON_POWER);  // Tries all protocols
```

**Manual Control**:
```c
// Initialize universal TV system
universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL);

// Send button using universal mode
universal_tv_send_button(BUTTON_POWER);

// Set TV brand for optimization (optional)
universal_tv_set_brand(TV_BRAND_SAMSUNG);
universal_tv_send_button(BUTTON_POWER);  // Prioritizes Samsung codes
```

**Supported TV Brands**:
- Samsung
- LG
- Sony
- Philips
- Panasonic
- TCL
- Vizio
- Hisense
- Toshiba
- Sharp
- And more (generic codes work for most)

### Code Database

The universal TV system includes a database of real-world IR codes:
- **POWER**: 13+ codes across multiple protocols
- **VOLUME_UP/DOWN**: 6+ codes each
- **MUTE**: 6+ codes
- **CHANNEL_UP/DOWN**: 6+ codes each
- More buttons can be added easily

See `src/universal_tv.c` for the complete code database.

## IR Code Configuration

**Important**: The IR codes in this project are placeholder values. To use with actual hardware:

1. **Capture IR Codes**: Use an IR receiver to capture codes from original remotes
2. **Phillips Documentation**: Consult Phillips documentation for protocol specifications
3. **Calibration**: Test and calibrate codes for your specific TV/device models
4. **Update Codes**: Replace placeholder values in `include/ir_codes.h`

**However**: With universal TV mode enabled, you don't need to configure codes manually - it works with most TVs automatically!

### IR Protocol Notes

- **Protocols**: NEC, RC5, RC6, Sony SIRC (multi-protocol support)
- **Carrier Frequency**: 38kHz (standard)
- **Code Format**: 32-bit IR command codes (protocol-specific encoding)

## Assembly Integration

The project includes **assembly-optimized code** for precise IR timing required by RC5/RC6 protocols.

### Supported Platforms

- **x86/x86-64**: PC and Intel-based systems (`ir_asm_x86.s`)
- **ARM (32/64-bit)**: ARM Cortex-M, ARMv7, ARMv8, Raspberry Pi (`ir_asm_arm.s`)
- **AVR**: Arduino, ATmega microcontrollers (`ir_asm_avr.S`)
- **C Fallback**: Automatic fallback for unsupported platforms (`ir_asm_c.c`)

### Features

- **Microsecond-precise timing** for IR protocols
- **38kHz carrier generation** with assembly-optimized loops
- **RC5/RC6 protocol encoding** with Manchester encoding
- **Hardware GPIO control** for IR LED

### Building with Assembly

Assembly code is automatically detected and compiled:

```bash
make
```

To force C fallback (for simulation):

```bash
make CFLAGS="-DIR_USE_C_FALLBACK"
```

See `docs/ASSEMBLY_INTEGRATION.md` for detailed documentation.

## Hardware Integration

For actual hardware implementation, you'll need to:

1. **IR LED**: Connect IR LED to GPIO pin
2. **PWM/Timer**: Set up PWM or timer for 38kHz carrier frequency
3. **Protocol Implementation**: Implement RC5/RC6 protocol timing
4. **Modulation**: Modulate data with carrier frequency

Example hardware setup (for embedded systems):
- GPIO pin configured as output
- Timer/PWM generating 38kHz square wave
- Interrupt handlers for precise timing

## Button Code Reference

### Streaming Services
- `BUTTON_YOUTUBE` (0x01)
- `BUTTON_NETFLIX` (0x02)
- `BUTTON_AMAZON_PRIME` (0x03)
- `BUTTON_HBO_MAX` (0x04)

### Basic Controls
- `BUTTON_POWER` (0x10)
- `BUTTON_VOLUME_UP` (0x11)
- `BUTTON_VOLUME_DOWN` (0x12)
- `BUTTON_MUTE` (0x13)
- `BUTTON_CHANNEL_UP` (0x14)
- `BUTTON_CHANNEL_DOWN` (0x15)

See `include/remote_buttons.h` for complete list.

## Development Notes

- The project uses standard C11
- Modular design for easy extension
- Hardware abstraction layer for IR transmission
- State management for remote control

## License

This project is provided as-is for educational and development purposes.

## Contributing

When adding new buttons or features:
1. Add button definition to `include/remote_buttons.h`
2. Add IR code mapping to `include/ir_codes.h`
3. Implement mapping in `src/ir_codes.c`
4. Add button name in `src/remote_control.c`
5. Update documentation

## Troubleshooting

### Build Issues
- Ensure GCC and Make are installed
- Check that all source files are present
- Verify include paths are correct

### Runtime Issues
- IR codes are placeholders - replace with actual codes
- Hardware initialization may need device-specific code
- Check console output for error messages

## Running the 3D Simulator

The web app serves the 3D smart home simulator: living room (floor, walls, window, sofa, lamps, media console), TV, and interactive 3D remote. Room lighting reacts to the current channel or app. Orbit the camera, zoom to the TV or remote, use keyboard shortcuts or click the remote. Optional: run the **autonomous scheduler** so time rules apply presets automatically.

### Quick start

1. **Install and start the web server:**
   ```bash
   cd test_simulator
   poetry install
   poetry run web-server
   ```
   Open http://localhost:5000. Or use `pip install -r requirements.txt` and run the server (see test_simulator/README.md).

2. **Optional: C remote control (sends button presses to the simulator):**
   ```bash
   make clean
   make SIMULATOR=1 WEB=1
   ./bin/remote_control
   ```

3. **Optional: Autonomous scheduler (time rules and presets):**
   With the web server running, in another terminal:
   ```bash
   cd test_simulator
   poetry run python scheduler.py
   ```
   Edit `autonomous_config.json` for times and presets; use `service_config.json` and adapters to target real devices. See test_simulator/docs/SERVICE_AND_AUTOMATION.md.

## Latency Measurement and Optimization

The project includes a comprehensive latency measurement system for performance analysis and optimization.

### Features

- **High-precision timing** - Microsecond resolution using platform-specific APIs
- **Automatic instrumentation** - Measures button presses, IR transmission, and universal TV operations
- **Synthetic probe** - Comprehensive test suite for latency analysis
- **Statistics tracking** - Min, max, average, and percentile calculations
- **Per-operation analysis** - Track latency for specific operations

### Quick Start

```bash
# Build and run latency probe
make test-latency

# Or build manually
make latency-probe
./bin/latency_probe
```

### Usage

```c
#include "latency.h"

// Initialize (done automatically in remote_init())
latency_init(1000);

// Automatic measurement (already integrated)
remote_press_button(BUTTON_POWER);

// View statistics
latency_print_all_stats();
```

See `docs/LATENCY_OPTIMIZATION.md` and `docs/LATENCY_IMPLEMENTATION.md` for complete documentation.

- **3D simulator:** Living room (floor, walls, window, sofa, lamps, media console, rug), TV, 3D remote. Room glow reacts to channel/app. GPU-based graphics presets. WebSocket + REST.
- **Autonomous scheduler:** Time rules and presets in `autonomous_config.json`; targets simulator or real backends. `scheduler.py` runs as a daemon; optional `service_config.json` for auth, webhooks, MQTT, and named devices.
- **Smart home:** REST API, webhooks, MQTT, Home Assistant and Node-RED examples. Adapters: simulator, Broadlink, Samsung, LG, CEC.
- **C universal remote:** Multi-protocol IR, brand detection (keyword table, `POST /api/detect-brand`), code scan mode. Latency measurement and assembly-optimized timing.
- **IR protocol path:** `ir_synthetic.py` and `protocol_classifier.py` (rule-based, 40% tolerance); no neural nets.
- **Planned:** IR learning (IR receiver), hardware-specific IR, multi-device profiles, macro recording, expanded code database.

