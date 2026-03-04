# I/O Mode Management

This document describes the I/O mode management system for handling interrupt-driven vs polling operations with timing constraints.

## Overview

The I/O mode system provides:
- **Automatic mode selection** (interrupt vs polling) based on timing constraints
- **Timing constraint management** for critical operations
- **Non-blocking operation support** for responsive systems
- **I/O statistics** tracking for performance monitoring
- **Hardware capability detection** (interrupts, DMA)

## I/O Modes

### Polling Mode (`IO_MODE_POLLING`)
- Software-based polling at configurable intervals
- Lower power consumption
- Predictable latency
- Suitable for non-critical operations

### Interrupt Mode (`IO_MODE_INTERRUPT`)
- Hardware interrupt-driven operations
- Lower latency for timing-critical operations
- Higher priority handling
- Requires interrupt support

### DMA Mode (`IO_MODE_DMA`)
- Direct Memory Access for high-throughput operations
- Minimal CPU overhead
- Requires DMA-capable hardware

### Hybrid Mode (`IO_MODE_HYBRID`)
- Automatic selection based on constraints
- Optimal mode selection for each operation
- Default mode for most applications

## Timing Constraints

```c
typedef struct {
    uint32_t max_latency_us;      /* Maximum acceptable latency */
    uint32_t min_interval_us;     /* Minimum interval between operations */
    uint32_t timeout_us;          /* Operation timeout */
    uint8_t jitter_tolerance_us;  /* Acceptable timing jitter */
} timing_constraints_t;
```

## Usage

### Basic Initialization

```c
#include "io_mode.h"

/* Initialize I/O mode system */
io_mode_init();

/* Configure for timing-critical IR transmission */
io_config_t config = {
    .mode = IO_MODE_HYBRID,
    .flags = IO_FLAG_TIMING_CRITICAL,
    .timing = {
        .max_latency_us = 100,      /* 100us max latency */
        .timeout_us = 5000,         /* 5ms timeout */
        .jitter_tolerance_us = 10   /* 10us jitter tolerance */
    },
    .interrupt_priority = 7,        /* High priority */
    .polling_interval_us = 10       /* 10us polling if needed */
};

io_mode_set_config(&config);
```

### Mode Selection

```c
/* Automatic mode selection based on constraints */
timing_constraints_t constraints = {
    .max_latency_us = 50,           /* Very tight timing */
    .timeout_us = 1000,
    .jitter_tolerance_us = 5
};

io_mode_t mode = io_mode_select_optimal(&constraints, IO_FLAG_TIMING_CRITICAL);
/* Returns IO_MODE_INTERRUPT if interrupts available */
```

### Operation Execution

```c
/* Execute operation with timing constraints */
int my_io_operation(void* data) {
    /* Perform I/O operation */
    return 0;  /* Success */
}

timing_constraints_t timing = {
    .max_latency_us = 100,
    .timeout_us = 5000
};

io_result_t result = io_mode_execute(
    my_io_operation,
    my_data,
    &timing,
    IO_FLAG_TIMING_CRITICAL
);

if (result.status == IO_STATUS_COMPLETE) {
    printf("Operation completed in %u us\n", result.actual_latency_us);
}
```

### Non-Blocking Operations

```c
/* Non-blocking operation check */
io_result_t result = io_mode_execute(operation, data, &timing, IO_FLAG_NON_BLOCKING);

/* Check completion without blocking */
while (io_mode_wait_complete(&result, 1000) == 0) {
    /* Do other work */
    /* ... */
}

if (result.status == IO_STATUS_COMPLETE) {
    /* Operation complete */
}
```

## Integration with IR Transmission

The I/O mode system is automatically integrated into IR transmission:

```c
/* IR initialization sets up timing-critical I/O mode */
ir_init();  /* Automatically configures I/O mode for IR */

/* IR transmission uses I/O mode constraints */
ir_send(code);  /* Uses timing-critical mode */
```

## Configuration Flags

### `IO_FLAG_NON_BLOCKING`
Non-blocking operation - returns immediately if operation cannot complete.

### `IO_FLAG_TIMING_CRITICAL`
Timing-critical operation - uses interrupt mode if available.

### `IO_FLAG_LOW_POWER`
Low power mode - prefers polling over interrupts.

### `IO_FLAG_HIGH_PRIORITY`
High priority operation - uses highest available priority.

## Statistics

```c
uint32_t total_ops, interrupt_ops, polling_ops, avg_latency;

io_mode_get_stats(&total_ops, &interrupt_ops, &polling_ops, &avg_latency);

printf("Total operations: %u\n", total_ops);
printf("Interrupt operations: %u\n", interrupt_ops);
printf("Polling operations: %u\n", polling_ops);
printf("Average latency: %u us\n", avg_latency);
```

## Platform Support

### Interrupt Mode Availability
- **AVR**: Available (hardware interrupts)
- **ARM**: Available (system interrupts)
- **x86**: Limited (requires hardware-specific drivers)

### DMA Mode Availability
- Platform-dependent
- Requires DMA-capable hardware
- Currently not available in default implementation

## Best Practices

1. **Use hybrid mode** for automatic optimization
2. **Set appropriate timing constraints** for your application
3. **Monitor statistics** to optimize performance
4. **Use interrupt mode** for timing-critical operations
5. **Use polling mode** for low-power applications

## Example: Complete I/O Mode Setup

```c
#include "io_mode.h"
#include "ir_codes.h"

int main(void) {
    /* Initialize I/O mode */
    io_mode_init();
    
    /* Configure for IR transmission */
    io_config_t config = {
        .mode = IO_MODE_HYBRID,
        .flags = IO_FLAG_TIMING_CRITICAL,
        .timing = {
            .max_latency_us = 100,
            .timeout_us = 5000,
            .jitter_tolerance_us = 10
        },
        .interrupt_priority = 7,
        .polling_interval_us = 10
    };
    io_mode_set_config(&config);
    
    /* Initialize IR (uses I/O mode) */
    ir_init();
    
    /* Send IR code (automatically uses optimal I/O mode) */
    ir_code_t code = {0x12345678, IR_PROTOCOL_RC5, 38000, 1};
    ir_send(code);
    
    /* Get statistics */
    uint32_t total, interrupt, polling, avg;
    io_mode_get_stats(&total, &interrupt, &polling, &avg);
    printf("I/O operations: %u total, %u interrupt, %u polling\n", 
           total, interrupt, polling);
    
    /* Cleanup */
    io_mode_cleanup();
    return 0;
}
```

## See Also

- `include/io_mode.h` - I/O mode API reference
- `src/io_mode.c` - I/O mode implementation
- `docs/ASSEMBLY_INTEGRATION.md` - Assembly timing details


