# Latency Measurement and Optimization

This document describes the latency measurement system and how to use it to optimize performance.

## Overview

The latency measurement system provides high-precision timing instrumentation for:
- **Button press to IR transmission** - Total time from button press to IR signal
- **IR protocol encoding** - Time to encode and send IR codes
- **Universal TV multi-protocol** - Latency when trying multiple protocols
- **Event handler overhead** - Time spent in event handlers
- **End-to-end latency** - Complete system latency

## Quick Start

### Running the Synthetic Probe

The synthetic probe automatically measures latency across all critical paths:

```bash
gcc -I../include latency_probe.c ../src/latency.c ../src/handlers.c \
    ../src/ir_codes.c ../src/ir_protocol.c ../src/universal_tv.c \
    ../src/remote_control.c -o latency_probe

./latency_probe
```

### Using Latency Measurement in Code

```c
#include "latency.h"

/* Initialize latency system */
latency_init(1000);  /* Store up to 1000 samples */

/* Measure latency */
uint64_t start = LATENCY_MEASURE_START();
/* ... your code ... */
LATENCY_MEASURE_END(start, "operation_name", code);

/* Print statistics */
latency_print_all_stats();
```

## Latency Measurement API

### Initialization

```c
int latency_init(size_t max_samples);
void latency_cleanup(void);
```

### Timestamp Functions

```c
uint64_t latency_get_timestamp_us(void);
uint32_t latency_measure(uint64_t start_us, uint64_t end_us);
```

### Probe API

```c
latency_probe_t probe;
latency_probe_start(&probe, "operation_name");
/* ... code to measure ... */
uint32_t latency = latency_probe_stop(&probe, "operation_name", code);
```

### Statistics

```c
latency_stats_t stats;
latency_get_stats(&stats);
latency_print_stats(&stats);

/* Per-operation statistics */
latency_get_stats_for_operation("button_press", &stats);
```

## Current Latency Measurements

The system automatically measures latency for:

1. **`button_press`** - Complete button press operation
2. **`ir_transmit`** - IR code transmission
3. **`universal_tv`** - Universal TV multi-protocol transmission

## Optimization Targets

Based on typical IR remote requirements:

- **Button Press Latency**: < 10ms (target: < 5ms)
- **IR Transmission**: < 50ms (protocol-dependent)
- **Universal TV**: < 200ms (multiple protocols)
- **Event Handlers**: < 1ms (should be minimal)

## Synthetic Probe Results

The synthetic probe (`examples/latency_probe.c`) measures:

1. **Button Press Latency** - 100 iterations
2. **IR Protocol Latency** - NEC, RC5, RC6 protocols
3. **Universal TV Latency** - Multi-protocol mode
4. **Event Handler Overhead** - Handler execution time
5. **End-to-End Latency** - Complete system latency

### Expected Output

```
=== Synthetic Latency Probe ===

Probe: Button Press Latency
Results (100 iterations):
  Min:  245 us (0.245 ms)
  Max:  1234 us (1.234 ms)
  Avg:  456 us (0.456 ms)

Probe: IR Protocol Encoding Latency
Protocol: NEC
  Min:  1234 us (1.234 ms)
  Max:  2345 us (2.345 ms)
  Avg:  1567 us (1.567 ms)

...
```

## Optimization Strategies

### 1. Reduce Event Handler Overhead

- Keep handlers minimal and fast
- Avoid blocking operations in handlers
- Use async processing for heavy operations

### 2. Optimize IR Protocol Encoding

- Use assembly-optimized functions
- Minimize delay_us() calls
- Batch protocol operations

### 3. Universal TV Optimization

- Cache working codes per brand
- Skip unnecessary protocol attempts
- Use brand detection to prioritize codes

### 4. Button Press Optimization

- Minimize state updates
- Reduce printf() calls in production
- Optimize connection checks

## Real-Time Monitoring

You can monitor latency in real-time:

```c
/* Get current statistics */
uint32_t avg = latency_get_avg();
uint32_t max = latency_get_max();
uint32_t min = latency_get_min();

printf("Current latency - Min: %u us, Max: %u us, Avg: %u us\n", 
       min, max, avg);
```

## Integration Points

Latency measurement is automatically integrated into:

- `src/ir_codes.c` - IR transmission
- `src/remote_control.c` - Button presses
- `src/universal_tv.c` - Universal TV operations

## Performance Impact

The latency measurement system has minimal overhead:

- **Timestamp calls**: ~0.1-1.0 microseconds (platform-dependent)
- **Sample storage**: O(1) per measurement
- **Statistics calculation**: O(n log n) for percentiles (only when requested)

## Best Practices

1. **Initialize early** - Call `latency_init()` during system startup
2. **Use probes** - Use `latency_probe_t` for clean measurement blocks
3. **Monitor regularly** - Check statistics periodically
4. **Optimize hot paths** - Focus on operations with high latency
5. **Test with probe** - Run synthetic probe regularly to catch regressions

## See Also

- `include/latency.h` - Complete API documentation
- `src/latency.c` - Implementation
- `examples/latency_probe.c` - Synthetic probe example


