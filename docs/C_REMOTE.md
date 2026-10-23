# C Universal Remote

The C half of the project: a universal remote library (`include/`, `src/`), the interactive
demo program `bin/remote_control`, and examples in `examples/`.

IR transmission is **simulated** on a PC: codes are encoded and timed, but nothing drives a
real IR LED until you port the hardware layer (see [Hardware integration](#hardware-integration)).

## Build and run

```bash
make                  # builds bin/remote_control
./bin/remote_control  # bin\remote_control.exe on Windows (MinGW/MSYS2)
make examples         # builds every examples/*.c into bin/
make help             # lists all targets
```

| Target | What it does |
|--------|--------------|
| `make` / `make all` | Build `bin/remote_control` |
| `make run` | Build and run it |
| `make examples` | Build `bin/simple_example`, `universal_tv_example`, `handler_example`, `event_handlers_example`, `connection_example`, `system_handler_example`, `latency_probe` |
| `make test` | Build and run the C unit tests in `tests/c/` |
| `make sanitize` | Run the C unit tests under ASan/UBSan |
| `make latency-probe` / `make test-latency` | Build / build and run `bin/latency_probe` (about 3 minutes) |
| `make clean` / `make rebuild` | Remove `obj/` and `bin/` / clean then build |
| `make SIMULATOR=1` | Build with the simulator client (Unix socket / Windows named pipe) |
| `make SIMULATOR=1 WEB=1` | Build with the HTTP client that posts to the web simulator on `localhost:5000` |

Requirements: GCC or Clang and GNU Make (MinGW/MSYS2 on Windows). The default build compiles with
`-std=c11 -Wall -Wextra`.

## Interactive demo

`./bin/remote_control` shows a menu:

1. Demo Streaming Services (YouTube, Netflix, Prime, HBO Max)
2. Demo Basic Controls (Power, Volume, Channel)
3. Demo Navigation (Home, Menu, D-Pad)
4. Demo Playback Controls (Play, Pause, Stop, …)
5. Demo Advanced Features (Settings, Info, Guide, …)
6. Show All Available Buttons
7. Interactive Button Press (enter a hex code)
0. Exit

Built with `SIMULATOR=1 WEB=1` and with the web server running, every press also shows up in
the 3D simulator. See [GETTING_STARTED.md](GETTING_STARTED.md#connect-the-c-remote-to-a-simulator). See [GETTING_STARTED.md](GETTING_STARTED.md#connect-the-c-remote-to-a-simulator).

## Programmatic use

```c
#include "remote_control.h"

int main(void) {
    remote_init();                       /* universal mode is on for the TV device */
    remote_press_button(BUTTON_POWER);
    remote_press_button(BUTTON_YOUTUBE);
    remote_press_button(BUTTON_VOLUME_UP);
    remote_cleanup();
    return 0;
}
```

See `examples/simple_example.c`. Button constants are listed in [BUTTONS.md](BUTTONS.md).

## Universal TV support

`include/universal_tv.h` provides three modes (`universal_mode_t`):

| Mode | Status |
|------|--------|
| `UNIVERSAL_MODE_MULTI_PROTOCOL` (default) | Implemented. A button press sends every stored code for that button, across protocols. |
| `UNIVERSAL_MODE_SCAN` | Implemented. Steps through the stored codes one at a time until you confirm one. |
| `UNIVERSAL_MODE_LEARNED` | Enum value only. Learning needs an IR receiver and is not implemented (see [ROADMAP.md](../ROADMAP.md)). |

```c
#include "universal_tv.h"

universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL);
universal_tv_send_button(BUTTON_POWER);       /* tries every stored Power code */

universal_tv_set_brand(TV_BRAND_SAMSUNG);     /* try Samsung codes first; returns 0 on success */
universal_tv_send_button(BUTTON_POWER);

universal_tv_scan_start(BUTTON_POWER);        /* scan mode */
universal_tv_scan_next();                     /* send the next candidate */
universal_tv_scan_confirm();                  /* keep the one that worked */

universal_tv_cleanup();
```

See `examples/universal_tv_example.c`.

### Code database

`src/universal_tv.c` holds a small table of real-world codes:

| Button | Stored codes |
|--------|--------------|
| Power | 16 |
| Volume Up / Volume Down | 6 each |
| Mute | 6 |
| Channel Up / Channel Down | 6 each |

Codes use the NEC, RC5, RC6 and Sony SIRC protocols. Buttons without database entries are sent
with the single code from `src/ir_codes.c`. Brands in `tv_brand_t`: Samsung, LG, Sony, Philips,
Panasonic, TCL, Vizio, Hisense, Toshiba, Sharp (plus `TV_BRAND_UNKNOWN`). The simulator's
`POST /api/detect-brand` returns a `brand_id` in the same numbering.

Coverage of real TVs has not been measured; treat the table as a starting point.

## IR codes and protocols

- Protocol IDs (`include/ir_codes.h`): NEC `0x01`, RC5 `0x02`, RC6 `0x03`, Sony `0x04`, Phillips `0x05`.
- Carrier: 38 kHz.
- The per-button codes in `include/ir_codes.h` / `src/ir_codes.c` are **placeholders**. For real
  hardware, capture codes from the original remote with an IR receiver and replace them.

## Hardware integration

To drive a real IR LED you need to:

1. Connect an IR LED (with a driver transistor) to a GPIO pin.
2. Generate a 38 kHz carrier with a PWM or timer peripheral.
3. Implement mark/space timing for the protocol (RC5/RC6/NEC).
4. Replace the simulated transmit path with your GPIO/PWM code.

The repository contains assembly timing routines for x86, ARM and AVR, but the default build
uses the portable C fallback. See [ASSEMBLY_INTEGRATION.md](ASSEMBLY_INTEGRATION.md).

## Related C documentation

- [HANDLERS.md](HANDLERS.md): event and interrupt handlers
- [CONNECTION.md](CONNECTION.md): connection state, verification, retries
- [IO_MODE.md](IO_MODE.md): polling / interrupt / DMA / hybrid I/O modes
- [SYSTEM_HANDLER.md](SYSTEM_HANDLER.md): system lifecycle, errors, health
- [LATENCY.md](LATENCY.md): latency instrumentation and the synthetic probe
- [ASSEMBLY_INTEGRATION.md](ASSEMBLY_INTEGRATION.md): IR timing in assembly

## Troubleshooting

- **Build fails:** check that `gcc` and `make` are on `PATH`; run `make clean && make`.

## Known issues

- `connection_establish()` checks the link by transmitting a real Power code, so the first press
  after start-up can toggle the TV's power.
- Several buttons (GAME1–3, HDR modes, CAST, RECORD_LIST, …) have no IR code yet and return
  `ERROR_INVALID_IR_CODE`.
- The C web client always targets `localhost:5000`; it ignores `TV_REMOTE_PORT`.
- The per-architecture assembly timing files are not built (see
  [ASSEMBLY_INTEGRATION.md](ASSEMBLY_INTEGRATION.md)).
