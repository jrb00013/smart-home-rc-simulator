# Latency Measurement System - Implementation Guide

## Overview

The latency measurement system is fully integrated into the universal remote control project. It provides high-precision timing instrumentation for performance analysis and optimization.

## Architecture

### Core Components

1. **`include/latency.h`** - Public API and data structures
2. **`src/latency.c`** - Implementation with platform-specific timing
3. **Integration Points** - Automatic measurement in critical paths

### Integration Points

Latency measurement is automatically integrated into:

- **`src/ir_codes.c`** - IR transmission timing
  - Measures: `ir_transmit` operation
  - Tracks: Protocol encoding and transmission time

- **`src/remote_control.c`** - Button press operations
  - Measures: `button_press` operation
  - Tracks: Complete button press to IR completion

- **`src/universal_tv.c`** - Universal TV operations
  - Measures: `universal_tv` operation
  - Tracks: Multi-protocol transmission time

## Build System

### Makefile Targets

```bash
# Build latency probe
make latency-probe

# Build and run latency probe
make test-latency

# Build all examples (includes latency probe)
make examples
```

### Manual Build

```bash
# Build latency probe manually
gcc -Wall -Wextra -std=c11 -O2 -g -Iinclude \
    examples/latency_probe.c \
    obj/latency.o obj/handlers.o obj/ir_codes.o \
    obj/ir_protocol.o obj/universal_tv.o obj/remote_control.o \
    -o bin/latency_probe
```

## API Reference

### Initialization

```c
int latency_init(size_t max_samples);
void latency_cleanup(void);
```

Initializes the latency measurement system with a sample buffer.

### Timestamp Functions

```c
uint64_t latency_get_timestamp_us(void);
uint32_t latency_measure(uint64_t start_us, uint64_t end_us);
```

High-precision timestamp functions using platform-specific APIs:
- **Windows**: `QueryPerformanceCounter`
- **Linux/Unix**: `clock_gettime(CLOCK_MONOTONIC)`

### Probe API

```c
latency_probe_t probe;
latency_probe_start(&probe, "operation_name");
/* ... code to measure ... */
uint32_t latency = latency_probe_stop(&probe, "operation_name", code);
```

Clean API for measuring code blocks.

### Macros

```c
// Start measurement
uint64_t start = LATENCY_MEASURE_START();

// End measurement and record
LATENCY_MEASURE_END(start, "operation_name", code);

// Probe API
LATENCY_PROBE_START(probe, "name");
LATENCY_PROBE_STOP(probe, "operation", code);
```

### Statistics

```c
// Get overall statistics
latency_stats_t stats;
latency_get_stats(&stats);
latency_print_stats(&stats);

// Get per-operation statistics
latency_get_stats_for_operation("button_press", &stats);

// Quick accessors
uint32_t avg = latency_get_avg();
uint32_t max = latency_get_max();
uint32_t min = latency_get_min();
```

## Measurement Points

### Automatic Measurements

The following operations are automatically measured:

1. **`button_press`** - Complete button press operation
   - Location: `src/remote_control.c::remote_press_button()`
   - Measures: Button press to IR completion

2. **`ir_transmit`** - IR code transmission
   - Location: `src/ir_codes.c::ir_send()`
   - Measures: IR encoding and transmission

3. **`universal_tv`** - Universal TV multi-protocol
   - Location: `src/universal_tv.c::universal_tv_send_button()`
   - Measures: Multi-protocol transmission time

### Manual Measurements

You can add custom measurements:

```c
#include "latency.h"

uint64_t start = LATENCY_MEASURE_START();
/* Your code here */
LATENCY_MEASURE_END(start, "my_operation", 0x1234);
```

## Synthetic Probe

The synthetic probe (`examples/latency_probe.c`) provides comprehensive testing:

### Probes Included

1. **Button Press Latency** - 100 iterations
2. **IR Protocol Latency** - NEC, RC5, RC6 protocols
3. **Universal TV Latency** - Multi-protocol mode
4. **Event Handler Overhead** - Handler execution time
5. **End-to-End Latency** - Complete system latency

### Running the Probe

```bash
make test-latency
```

Or manually:

```bash
./bin/latency_probe
```

### Expected Output

```
=== Synthetic Latency Probe ===

Running synthetic latency probes...
Iterations per probe: 100 (warmup: 10)

========================================
Probe: Button Press Latency
========================================
Measuring latency from button press to IR transmission start...

Results (100 iterations):
  Min:  245 us (0.245 ms)
  Max:  1234 us (1.234 ms)
  Avg:  456 us (0.456 ms)

========================================
Probe: IR Protocol Encoding Latency
========================================
Measuring latency for different IR protocols...

Protocol: NEC
  Min:  1234 us (1.234 ms)
  Max:  2345 us (2.345 ms)
  Avg:  1567 us (1.567 ms)

...

========================================
Overall Latency Statistics
========================================
=== Latency Statistics ===
Samples: 500
Min:     245 us (0.245 ms)
Max:     12345 us (12.345 ms)
Avg:     1234 us (1.234 ms)
P50:     987 us (0.987 ms)
P95:     3456 us (3.456 ms)
P99:     5678 us (5.678 ms)
```

## Performance Characteristics

### Overhead

- **Timestamp call**: ~0.1-1.0 microseconds (platform-dependent)
- **Sample storage**: O(1) per measurement
- **Statistics calculation**: O(n log n) for percentiles (only when requested)

### Memory Usage

- **Per sample**: ~24 bytes (latency_sample_t)
- **Default buffer**: 1000 samples = ~24 KB
- **Configurable**: Set via `latency_init(max_samples)`

## Optimization Guidelines

### Target Latencies

Based on IR remote requirements:

- **Button Press**: < 5ms (target: < 2ms)
- **IR Transmission**: < 50ms (protocol-dependent)
- **Universal TV**: < 200ms (multiple protocols expected)
- **Event Handlers**: < 1ms (should be minimal)

### Optimization Strategies

1. **Reduce Event Handler Overhead**
   - Keep handlers minimal
   - Avoid blocking operations
   - Use async processing

2. **Optimize IR Protocol Encoding**
   - Use assembly-optimized functions
   - Minimize delay_us() calls
   - Batch operations

3. **Universal TV Optimization**
   - Cache working codes per brand
   - Skip unnecessary protocol attempts
   - Use brand detection

4. **Button Press Optimization**
   - Minimize state updates
   - Reduce printf() in production
   - Optimize connection checks

## Platform Support

### Windows

Uses `QueryPerformanceCounter` for high-precision timing:
- Resolution: Typically < 1 microsecond
- Monotonic: Yes
- Overhead: Low

### Linux/Unix

Uses `clock_gettime(CLOCK_MONOTONIC)`:
- Resolution: Typically < 1 microsecond
- Monotonic: Yes
- Overhead: Low

### Fallback

If platform-specific APIs are unavailable, falls back to:
- `gettimeofday()` (deprecated but available)
- Lower precision but functional

## Testing

### Unit Tests

The synthetic probe serves as a comprehensive test:

```bash
make test-latency
```

### Integration Tests

Latency measurement is automatically active in:
- `remote_init()` - Initializes latency system
- All button presses - Automatically measured
- All IR transmissions - Automatically measured

### Verification

Check that measurements are working:

```c
latency_init(100);
remote_init();
remote_press_button(BUTTON_POWER);
uint32_t avg = latency_get_avg();
printf("Average latency: %u us\n", avg);
```

## Troubleshooting

### No Measurements Recorded

- Ensure `latency_init()` is called before use
- Check that operations are being executed
- Verify includes are correct

### High Overhead

- Reduce sample buffer size
- Disable measurements in production (use conditional compilation)
- Optimize handler functions

### Inaccurate Measurements

- Check platform-specific timing implementation
- Verify clock resolution
- Consider warmup iterations

## Future Enhancements

Potential improvements:

1. **Real-time monitoring** - Live latency dashboard
2. **Histogram support** - Distribution analysis
3. **Export to CSV** - Data analysis tools
4. **Conditional compilation** - Zero overhead in production
5. **Multi-threaded support** - Thread-safe measurements

## See Also

- `include/latency.h` - Complete API documentation
- `src/latency.c` - Implementation details
- `examples/latency_probe.c` - Synthetic probe example
- `docs/LATENCY_OPTIMIZATION.md` - Optimization guide


