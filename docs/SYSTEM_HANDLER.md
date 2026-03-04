# System Handler

This document describes the system-level handler for overall system management, initialization, cleanup, and state management.

## Overview

The system handler provides:
- **Centralized system initialization** and cleanup
- **System state management** with state transitions
- **System-wide error handling** and reporting
- **System health monitoring** and health checks
- **System event management** (startup, shutdown, reset)
- **Automatic error recovery** (if configured)

## System States

- `SYSTEM_STATE_UNINITIALIZED` - System not initialized
- `SYSTEM_STATE_INITIALIZING` - System initialization in progress
- `SYSTEM_STATE_READY` - System ready for operation
- `SYSTEM_STATE_RUNNING` - System running normally
- `SYSTEM_STATE_ERROR` - System in error state
- `SYSTEM_STATE_SHUTTING_DOWN` - System shutdown in progress
- `SYSTEM_STATE_SHUTDOWN` - System shutdown complete

## System Events

- `SYSTEM_EVENT_STARTUP` - System startup
- `SYSTEM_EVENT_INITIALIZED` - System initialized
- `SYSTEM_EVENT_READY` - System ready
- `SYSTEM_EVENT_ERROR` - System error occurred
- `SYSTEM_EVENT_WARNING` - System warning
- `SYSTEM_EVENT_SHUTDOWN` - System shutdown
- `SYSTEM_EVENT_RESET` - System reset
- `SYSTEM_EVENT_SUSPEND` - System suspended
- `SYSTEM_EVENT_RESUME` - System resumed

## Usage

### Basic Initialization

```c
#include "system_handler.h"
#include "remote_control.h"

int main(void) {
    /* System handler is automatically initialized by remote_init() */
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize system\n");
        return 1;
    }
    
    /* System is now ready */
    remote_press_button(BUTTON_POWER);
    
    /* Cleanup (automatically handled by system handler) */
    remote_cleanup();
    return 0;
}
```

### Manual System Handler Usage

```c
/* Initialize system handler */
system_handler_init();

/* Configure system */
system_config_t config = {
    .auto_recovery = 1,
    .watchdog_enabled = 0,
    .error_logging = 1,
    .health_monitoring = 1,
    .health_check_interval_ms = 10000
};
system_handler_set_config(&config);

/* Register handlers */
system_handler_register_error(my_error_handler);
system_handler_register_event(my_event_handler);
system_handler_register_state_change(my_state_handler);

/* Initialize system */
system_init();
```

### System State Management

```c
/* Get current state */
system_state_t state = system_get_state();
printf("Current state: %d\n", state);

/* Set system state */
system_set_state(SYSTEM_STATE_RUNNING);

/* Check if system is ready */
if (system_get_state() == SYSTEM_STATE_READY) {
    printf("System is ready\n");
}
```

### Error Reporting

```c
/* Report system error */
system_report_error(SYSTEM_ERROR_HARDWARE_FAILURE, "IR hardware failed");

/* Report system warning */
system_report_warning("Connection quality degraded");
```

### Health Monitoring

```c
/* Get system health */
system_health_t* health = system_get_health();
if (health) {
    printf("Uptime: %u ms\n", health->uptime_ms);
    printf("Errors: %u\n", health->error_count);
    printf("Health score: %u/100\n", health->health_score);
}

/* Perform health check */
if (system_health_check() == 0) {
    printf("System is healthy\n");
} else {
    printf("System health check failed\n");
}
```

### System Events

```c
/* Trigger system event */
system_trigger_event(SYSTEM_EVENT_READY, NULL);

/* Register event handler */
int my_event_handler(system_event_t event, void* data) {
    printf("System event: %d\n", event);
    return 0;
}
system_handler_register_event(my_event_handler);
```

## Handler Registration

### System Initialization Handler

```c
int my_init_handler(void) {
    printf("System initializing...\n");
    /* Perform initialization */
    return 0;
}

system_handler_register_init(my_init_handler);
```

### System Cleanup Handler

```c
void my_cleanup_handler(void) {
    printf("System cleaning up...\n");
    /* Perform cleanup */
}

system_handler_register_cleanup(my_cleanup_handler);
```

### System Error Handler

```c
int my_error_handler(system_error_t error, const char* message) {
    printf("System error %d: %s\n", error, message);
    return 0;
}

system_handler_register_error(my_error_handler);
```

### System State Change Handler

```c
int my_state_handler(system_state_t old_state, system_state_t new_state) {
    printf("State changed: %d -> %d\n", old_state, new_state);
    return 0;
}

system_handler_register_state_change(my_state_handler);
```

### System Health Check Handler

```c
int my_health_handler(system_health_t* health) {
    if (health->health_score < 50) {
        printf("Warning: Low health score\n");
        return -1;
    }
    return 0;
}

system_handler_register_health_check(my_health_handler);
```

## System Operations

### System Reset

```c
/* Reset entire system */
if (system_reset() == 0) {
    printf("System reset successful\n");
}
```

### System Shutdown

```c
/* Graceful shutdown */
system_shutdown();
```

### Get System Uptime

```c
uint32_t uptime = system_get_uptime_ms();
printf("System uptime: %u ms\n", uptime);
```

## Integration

The system handler is automatically integrated:

1. **`remote_init()`** - Automatically initializes system handler
2. **Error Reporting** - All subsystems report errors to system handler
3. **State Management** - System state is tracked automatically
4. **Cleanup** - `remote_cleanup()` uses system handler for cleanup

## Configuration

```c
system_config_t config = {
    .auto_recovery = 1,              /* Enable automatic error recovery */
    .watchdog_enabled = 0,          /* Enable watchdog timer */
    .watchdog_timeout_ms = 5000,    /* Watchdog timeout */
    .error_logging = 1,             /* Enable error logging */
    .health_monitoring = 1,          /* Enable health monitoring */
    .health_check_interval_ms = 10000 /* Health check interval */
};

system_handler_set_config(&config);
```

## Health Score

Health score (0-100) is calculated based on:
- Error count (decreases score)
- Warning count (minor decrease)
- System uptime (increases confidence)
- Recent errors (more weight)

## Best Practices

1. **Always initialize system handler** before other subsystems
2. **Register error handlers** for proper error handling
3. **Monitor system health** regularly
4. **Use system events** for state tracking
5. **Enable auto-recovery** for production systems

## Example: Complete System Setup

```c
#include "system_handler.h"
#include "remote_control.h"

/* System event handler */
int system_event_handler(system_event_t event, void* data) {
    printf("System event: %d\n", event);
    return 0;
}

/* System error handler */
int system_error_handler(system_error_t error, const char* msg) {
    fprintf(stderr, "System error: %s\n", msg);
    return 0;
}

int main(void) {
    /* Initialize system handler */
    system_handler_init();
    
    /* Configure system */
    system_config_t config = {
        .auto_recovery = 1,
        .error_logging = 1,
        .health_monitoring = 1
    };
    system_handler_set_config(&config);
    
    /* Register handlers */
    system_handler_register_event(system_event_handler);
    system_handler_register_error(system_error_handler);
    
    /* Initialize remote control (uses system handler) */
    if (remote_init() != 0) {
        return 1;
    }
    
    /* Use remote control */
    remote_press_button(BUTTON_POWER);
    
    /* Check system health */
    system_health_check();
    
    /* Cleanup */
    remote_cleanup();
    system_handler_cleanup();
    return 0;
}
```

## See Also

- `include/system_handler.h` - System handler API reference
- `src/system_handler.c` - System handler implementation
- `examples/system_handler_example.c` - Complete example


