/**
 * @file handler_example.c
 * @brief Example demonstrating handler usage
 * 
 * This example shows how to register and use event handlers
 * for the remote control system.
 */

#include "../include/remote_control.h"
#include "../include/handlers.h"
#include "../include/remote_buttons.h"
#include <stdio.h>

/* Example button press handler */
int my_button_handler(unsigned char button_code, const char* button_name) {
    printf("[Handler] Button pressed: %s (0x%02X)\n", button_name, button_code);
    return HANDLER_SUCCESS;
}

/* Example IR transmission handler */
int my_ir_handler(ir_code_t code, int success) {
    if (success) {
        printf("[Handler] IR transmission successful: 0x%08X\n", code.code);
    } else {
        printf("[Handler] IR transmission failed: 0x%08X\n", code.code);
    }
    return HANDLER_SUCCESS;
}

/* Example error handler */
int my_error_handler(error_type_t error, const char* message) {
    printf("[Handler] Error %d: %s\n", error, message ? message : "Unknown");
    return HANDLER_SUCCESS;
}

/* Example state change handler */
int my_state_handler(void) {
    remote_state_t* state = remote_get_state();
    printf("[Handler] State changed - Device: %d, Volume: %d%%, Channel: %d, Power: %s\n",
           state->current_device, state->volume_level, state->channel,
           state->is_powered_on ? "ON" : "OFF");
    return HANDLER_SUCCESS;
}

/* Example custom event handler */
int my_custom_event_handler(event_t* event) {
    printf("[Handler] Custom event: Type %d, Timestamp: %u\n",
           event->type, event->timestamp);
    return HANDLER_SUCCESS;
}

/* Example timer handler */
int my_timer_handler(uint32_t timer_id) {
    printf("[Handler] Timer expired: %u\n", timer_id);
    return HANDLER_SUCCESS;
}

int main(void) {
    printf("=== Handler Example ===\n\n");
    
    /* Initialize remote control */
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote control\n");
        return 1;
    }
    
    /* Register individual handlers */
    printf("Registering handlers...\n");
    handler_register_button_pressed(my_button_handler);
    handler_register_ir_transmit_complete(my_ir_handler);
    handler_register_error(my_error_handler);
    handler_register_state_changed(my_state_handler);
    handler_register_custom_event(my_custom_event_handler);
    handler_register_timer(my_timer_handler);
    
    printf("\nHandlers registered. Testing...\n\n");
    
    /* Test button press (will trigger button handler) */
    printf("1. Testing button press handler:\n");
    remote_press_button(BUTTON_POWER);
    printf("\n");
    
    /* Test volume change (will trigger state change handler) */
    printf("2. Testing state change handler:\n");
    remote_press_button(BUTTON_VOLUME_UP);
    printf("\n");
    
    /* Test streaming service (will trigger IR handler) */
    printf("3. Testing IR transmission handler:\n");
    remote_press_button(BUTTON_YOUTUBE);
    printf("\n");
    
    /* Test custom event */
    printf("4. Testing custom event handler:\n");
    event_t custom_event = {
        .type = EVENT_HARDWARE_INTERRUPT,
        .timestamp = 0,
        .data.custom.data = NULL
    };
    handler_trigger_custom_event(&custom_event);
    printf("\n");
    
    /* Alternative: Register all handlers at once */
    printf("5. Registering all handlers at once:\n");
    handlers_t all_handlers = {
        .button_pressed = my_button_handler,
        .button_released = NULL,
        .ir_transmit_start = NULL,
        .ir_transmit_complete = my_ir_handler,
        .ir_transmit_error = NULL,
        .error_handler = my_error_handler,
        .state_changed = my_state_handler,
        .custom_event = my_custom_event_handler,
        .timer_handler = my_timer_handler,
        .interrupt_handler = NULL
    };
    handler_register_all(&all_handlers);
    printf("All handlers registered\n\n");
    
    /* Cleanup */
    remote_cleanup();
    printf("Example complete\n");
    
    return 0;
}

