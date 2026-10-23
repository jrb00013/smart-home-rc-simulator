# Assembly Integration Guide

This document explains the assembly code integration for precise IR timing in the Phillips Universal Remote Control project.

## Overview

IR remote control protocols (RC5, RC6) require microsecond-level precision for reliable transmission. The repository contains assembly timing routines for x86, ARM and AVR, plus a portable C fallback.

> **Current build:** the default `Makefile` always compiles the C fallback (`src/ir_asm_c.c`, `-DIR_USE_C_FALLBACK`) and assembles only `src/interrupt_handlers.S` (the ISR entry points). The per-architecture files below are kept for hardware ports and are not compiled by default.

## Architecture Support

The project includes assembly implementations for multiple platforms:

### x86/x86-64
- **File**: `src/ir_asm_x86.S`
- **Platforms**: PC, Intel-based embedded systems
- **Features**: 
  - Precise delay loops using CPU cycle counting
  - 38kHz carrier generation
  - RC5/RC6 bit encoding

### ARM (32-bit and 64-bit)
- **File**: `src/ir_asm_arm.s`
- **Platforms**: ARM Cortex-M, ARMv7, ARMv8, Raspberry Pi
- **Features**:
  - Cycle-accurate delays
  - GPIO control for IR LED
  - Optimized for embedded ARM systems

### AVR
- **File**: `src/ir_asm_avr.S`
- **Platforms**: Arduino, ATmega microcontrollers
- **Features**:
  - Clock-dependent timing (adjustable F_CPU)
  - Direct GPIO port manipulation
  - Minimal overhead for 8-bit microcontrollers

### C Fallback
- **File**: `src/ir_asm_c.c`
- **Platforms**: Any platform without assembly support
- **Features**:
  - Platform-specific delay functions (Windows, Linux, generic)
  - Less precise but functional
  - Used by the default build on every platform

## Assembly Functions

### Core Timing Functions

#### `delay_us(uint32_t us)`
Provides microsecond-level delays using CPU cycle counting.

**Implementation Notes**:
- x86: Uses `pause` instruction for power efficiency
- ARM: Uses simple decrement loops
- AVR: Clock-dependent, requires F_CPU definition

#### `ir_carrier_burst(uint32_t duration_us)`
Generates a 38kHz modulated carrier signal for the specified duration.

**Timing**:
- Carrier frequency: 38kHz
- Period: 26 microseconds
- Half period: 13 microseconds (ON/OFF)

### Protocol Functions

#### `ir_send_rc5_bit(uint8_t bit)`
Sends a single RC5 protocol bit using Manchester encoding:
- **Bit 0**: 889μs ON, 889μs OFF
- **Bit 1**: 889μs OFF, 889μs ON

#### `ir_send_rc6_bit(uint8_t bit)`
Sends a single RC6 protocol bit:
- **Bit 0**: 444μs ON, 444μs OFF
- **Bit 1**: 444μs OFF, 444μs ON

### Hardware Control Functions

#### `ir_led_on(void)` / `ir_led_off(void)`
Control the IR LED GPIO pin.

**Platform-Specific**:
- **AVR**: Direct port manipulation (`sbi`/`cbi` instructions)
- **ARM**: Memory-mapped GPIO registers (TODO: implement)
- **x86**: No-op for simulation (TODO: implement GPIO)

#### `ir_hw_init(uint8_t pin)`
Initializes hardware GPIO for IR LED.

## Protocol Implementation

### RC5 Protocol
- **Format**: 14 bits
  - Start bits: 2 bits (always 1, 1)
  - Toggle bit: 1 bit
  - Address: 5 bits
  - Command: 6 bits
- **Timing**: 889μs per bit
- **Encoding**: Manchester (phase-encoded)

### RC6 Protocol
- **Format**: 20 bits
  - Leader pulse: 2.666ms
  - Leader space: 889μs
  - Start bit: 1 bit
  - Mode: 3 bits
  - Toggle: 1 bit
  - Address: 8 bits
  - Command: 8 bits
- **Timing**: 444μs per bit
- **Encoding**: Pulse-width modulated

## Building with Assembly

`make` builds with the C fallback on every platform; no extra flags are needed. The Makefile
detects the architecture (`ASM_FILE` is set to `ir_asm_x86.S` or `ir_asm_arm.s`) but does not
currently add that file to the build.

To use an assembly implementation on a hardware port, add the matching file to `ASM_SOURCES`,
drop `-DIR_USE_C_FALLBACK`, and build with your cross toolchain, for example
`make CC=arm-none-eabi-gcc AS=arm-none-eabi-as`. Cross-compiling has not been tested with the
current Makefile (it calls `uname` and adds POSIX defines for the host).

## Hardware Integration

### GPIO Configuration

For actual hardware, you need to:

1. **Define IR LED Pin**:
   - AVR: Edit `IR_LED_PORT`, `IR_LED_PIN`, `IR_LED_DDR` in `ir_asm_avr.S`
   - ARM: Implement GPIO register access in `ir_led_on()`/`ir_led_off()`
   - x86: Use platform-specific GPIO libraries

2. **Set Clock Frequency**:
   - AVR: Define `F_CPU` (e.g., `-DF_CPU=16000000UL` for 16MHz)
   - ARM/x86: Timing is calculated automatically

### Example: AVR/Arduino

```c
// In ir_asm_avr.S, adjust these defines:
#define IR_LED_PORT PORTB
#define IR_LED_PIN  0
#define IR_LED_DDR  DDRB

// Compile with:
avr-gcc -DF_CPU=16000000UL -mmcu=atmega328p ...
```

### Example: ARM (Raspberry Pi)

```c
// Implement GPIO control in ir_asm_arm.s:
ir_led_on:
    ldr r0, =GPIO_BASE
    mov r1, #(1 << IR_LED_PIN)
    str r1, [r0, #GPIO_SET_OFFSET]
    bx lr
```

## Timing Calibration

### Adjusting for CPU Speed

Assembly timing is CPU-dependent. Adjust `CYCLES_PER_US` in assembly files:

```assembly
/* For 2.4GHz CPU: 1 cycle = 0.417ns, 1us = 2400 cycles */
#define CYCLES_PER_US 2400

/* For 1GHz CPU: 1 cycle = 1ns, 1us = 1000 cycles */
#define CYCLES_PER_US 1000
```

### Measuring Actual Timing

Use an oscilloscope or logic analyzer to verify:
- Carrier frequency: Should be 38kHz ± 1kHz
- RC5 bit timing: Should be 889μs ± 50μs
- RC6 bit timing: Should be 444μs ± 25μs

## Testing

### Simulation Mode

The default build already uses the C fallback, so testing without hardware is just:

```bash
make
./bin/remote_control
```

### Hardware Testing

1. Connect IR LED to GPIO pin
2. Point at IR receiver or TV
3. Use oscilloscope to verify timing
4. Test with actual TV/device

## Troubleshooting

### Assembly Not Compiling

- Check that your platform is supported
- Verify assembly syntax for your target
- Use the default build (C fallback): `make clean && make`

### Timing Inaccurate

- Calibrate `CYCLES_PER_US` for your CPU speed
- Check for compiler optimizations affecting timing
- Use hardware timers for better precision

### IR Not Working

- Verify GPIO pin configuration
- Check IR LED polarity and current limiting
- Measure carrier frequency with oscilloscope
- Ensure proper protocol encoding

## Performance

### Assembly vs C

- **Assembly**: Microsecond precision, minimal overhead
- **C Fallback**: Millisecond precision, system-dependent

### Optimization

Assembly code is already optimized for:
- Minimal instruction count
- Cache-friendly loops
- Power-efficient delays (x86 `pause` instruction)

## Future Enhancements

Hardware-timer delays, DMA carrier generation, interrupt-driven encoding and IR learning are
listed in [ROADMAP.md](../ROADMAP.md).

## References

- [RC5 Protocol Specification](https://en.wikipedia.org/wiki/RC-5)
- [RC6 Protocol Specification](https://en.wikipedia.org/wiki/RC-6)
- [IR Remote Control Protocols](https://www.sbprojects.net/knowledge/ir/)

