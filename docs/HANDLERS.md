# Event and Interrupt Handlers

This document describes the event and interrupt handler system for the Phillips Universal Remote Control.

## Overview

The handler system provides a callback mechanism for responding to events such as button presses, IR transmission completion, errors, state changes, and hardware interrupts.

## Handler Types

### Button Handlers

#### `button_handler_t`
Called when a button is pressed or released.

```c
int my_button_handler(unsigned char button_code, const char* button_name) {
    printf("Button: %s (0x%02X)\n", button_name, button_code);
    return HANDLER_SUCCESS;
}
```

**Registration:**
```c
handler_register_button_pressed(my_button_handler);
handler_register_button_released(my_button_handler);
```

### IR Transmission Handlers

#### `ir_handler_t`
Called when IR transmission starts, completes, or fails.

```c
int my_ir_handler(ir_code_t code, int success) {
    if (success) {
        printf("IR sent: 0x%08X\n", code.code);
    } else {
        printf("IR failed: 0x%08X\n", code.code);
    }
    return HANDLER_SUCCESS;
}
```

**Registration:**
```c
handler_register_ir_transmit_start(my_ir_handler);
handler_register_ir_transmit_complete(my_ir_handler);
handler_register_ir_transmit_error(my_ir_handler);
```

### Error Handlers

#### `error_handler_t`
Called when an error occurs.

```c
int my_error_handler(error_type_t error, const char* message) {
    printf("Error %d: %s\n", error, message);
    return HANDLER_SUCCESS;
}
```

**Error Types:**
- `ERROR_NONE` - No error
- `ERROR_IR_NOT_INITIALIZED` - IR system not initialized
- `ERROR_INVALID_BUTTON` - Unknown button code
- `ERROR_INVALID_IR_CODE` - Invalid IR code
- `ERROR_TRANSMISSION_FAILED` - IR transmission failed
- `ERROR_HARDWARE_FAILURE` - Hardware initialization failed
- `ERROR_PROTOCOL_ERROR` - Protocol encoding error
- `ERROR_TIMEOUT` - Operation timeout

**Registration:**
```c
handler_register_error(my_error_handler);
```

### State Change Handlers

#### `state_handler_t`
Called when remote control state changes (volume, channel, power, device).

```c
int my_state_handler(void) {
    remote_state_t* state = remote_get_state();
    printf("State: Volume=%d%%, Channel=%d\n", 
           state->volume_level, state->channel);
    return HANDLER_SUCCESS;
}
```

**Registration:**
```c
handler_register_state_changed(my_state_handler);
```

### Custom Event Handlers

#### `event_handler_t`
Called for custom events.

```c
int my_custom_handler(event_t* event) {
    printf("Event type: %d, timestamp: %u\n", 
           event->type, event->timestamp);
    return HANDLER_SUCCESS;
}
```

**Event Types:**
- `EVENT_BUTTON_PRESSED`
- `EVENT_BUTTON_RELEASED`
- `EVENT_IR_TRANSMIT_START`
- `EVENT_IR_TRANSMIT_COMPLETE`
- `EVENT_IR_TRANSMIT_ERROR`
- `EVENT_STATE_CHANGED`
- `EVENT_DEVICE_CHANGED`
- `EVENT_ERROR`
- `EVENT_TIMER_EXPIRED`
- `EVENT_HARDWARE_INTERRUPT`

**Registration:**
```c
handler_register_custom_event(my_custom_handler);
```

### Timer Handlers

#### `timer_handler_t`
Called when a hardware timer expires.

```c
int my_timer_handler(uint32_t timer_id) {
    printf("Timer %u expired\n", timer_id);
    return HANDLER_SUCCESS;
}
```

**Registration:**
```c
handler_register_timer(my_timer_handler);
handler_setup_timer(1000);  /* 1 second interval */
```

### Interrupt Handlers

#### `interrupt_handler_t`
Called on hardware interrupts (GPIO, timer, etc.).

```c
void my_interrupt_handler(void) {
    printf("Hardware interrupt occurred\n");
}
```

**Registration:**
```c
handler_register_interrupt(my_interrupt_handler);
handler_setup_interrupt(0);  /* Interrupt number */
```

## Usage Examples

### Basic Handler Registration

```c
#include "remote_control.h"
#include "handlers.h"

int main(void) {
    remote_init();
    
    /* Register button handler */
    handler_register_button_pressed(my_button_handler);
    
    /* Press button (triggers handler) */
    remote_press_button(BUTTON_POWER);
    
    remote_cleanup();
    return 0;
}
```

### Registering All Handlers

```c
handlers_t all_handlers = {
    .button_pressed = my_button_handler,
    .ir_transmit_complete = my_ir_handler,
    .error_handler = my_error_handler,
    .state_changed = my_state_handler,
    .custom_event = my_custom_handler,
    .timer_handler = my_timer_handler,
    .interrupt_handler = my_interrupt_handler
};

handler_register_all(&all_handlers);
```

### Manual Event Triggering

```c
/* Trigger button press event */
handler_trigger_button_pressed(BUTTON_YOUTUBE);

/* Trigger error event */
handler_trigger_error(ERROR_TRANSMISSION_FAILED, "IR send failed");

/* Trigger custom event */
event_t event = {
    .type = EVENT_HARDWARE_INTERRUPT,
    .timestamp = 0,
    .data.custom.data = NULL
};
handler_trigger_custom_event(&event);
```

## Handler Return Codes

- `HANDLER_SUCCESS` (0) - Handler executed successfully
- `HANDLER_ERROR` (-1) - Handler encountered an error
- `HANDLER_IGNORE` (1) - Handler wants to ignore the event

## Integration with Remote Control

Handlers are automatically integrated into the remote control system:

- **Button Presses**: `remote_press_button()` triggers `EVENT_BUTTON_PRESSED`
- **IR Transmission**: `ir_send()` triggers `EVENT_IR_TRANSMIT_START` and `EVENT_IR_TRANSMIT_COMPLETE`
- **State Changes**: Volume/channel/power changes trigger `EVENT_STATE_CHANGED`
- **Errors**: All error conditions trigger `EVENT_ERROR`

## Platform-Specific Interrupts

### x86/x86-64
- Timer interrupts via hardware timers
- GPIO interrupts via platform-specific drivers

### ARM
- Timer interrupts via ARM system timers
- GPIO interrupts via memory-mapped registers

### AVR
- Timer interrupts via Timer1 Compare A (`TIMER1_COMPA_vect`)
- External interrupts via INT0 (`INT0_vect`)

See `src/interrupt_handlers.s` for platform-specific implementations.

## Thread Safety

**Note**: The current implementation is **not thread-safe**. For multi-threaded applications:

1. Use mutexes/locks around handler registration
2. Use thread-safe event queues
3. Consider using message queues for event passing

## Best Practices

1. **Keep handlers short**: Handlers should execute quickly to avoid blocking
2. **Don't block**: Avoid long-running operations in handlers
3. **Error handling**: Always check return codes
4. **Cleanup**: Unregister handlers when done
5. **Initialization**: Initialize handler system before registering handlers

## Example: Complete Handler Setup

```c
#include "remote_control.h"
#include "handlers.h"

/* Define all handlers */
int button_handler(unsigned char code, const char* name) {
    printf("Button: %s\n", name);
    return HANDLER_SUCCESS;
}

int ir_handler(ir_code_t code, int success) {
    printf("IR: %s\n", success ? "OK" : "FAIL");
    return HANDLER_SUCCESS;
}

int error_handler(error_type_t error, const char* msg) {
    fprintf(stderr, "Error: %s\n", msg);
    return HANDLER_SUCCESS;
}

int main(void) {
    /* Initialize */
    remote_init();
    handler_init();
    
    /* Register handlers */
    handler_register_button_pressed(button_handler);
    handler_register_ir_transmit_complete(ir_handler);
    handler_register_error(error_handler);
    
    /* Use remote control (handlers will be called automatically) */
    remote_press_button(BUTTON_POWER);
    remote_press_button(BUTTON_VOLUME_UP);
    
    /* Cleanup */
    handler_cleanup();
    remote_cleanup();
    return 0;
}
```

## See Also

- `examples/handler_example.c` - Complete handler example
- `include/handlers.h` - Handler API reference
- `src/handlers.c` - Handler implementation
- `src/interrupt_handlers.s` - Hardware interrupt handlers


