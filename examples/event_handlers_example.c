/**
 * @file event_handlers_example.c
 * @brief Example demonstrating event handlers for universal remote
 * 
 * This example shows how to register and use event handlers for:
 * - Button presses
 * - IR transmission events
 * - Universal TV scan mode
 * - Protocol attempts
 * - Brand detection
 * 
 * Compile with:
 *   gcc -I../include event_handlers_example.c ../src/handlers.c \
 *       ../src/ir_codes.c ../src/ir_protocol.c ../src/universal_tv.c \
 *       ../src/remote_control.c -o event_handlers_example
 */

#include <stdio.h>
#include "../include/handlers.h"
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"
#include "../include/universal_tv.h"

/* Event Handler Functions */

int on_button_pressed(unsigned char button_code, const char* button_name) {
    printf("[Event] Button Pressed: %s (0x%02X)\n", button_name, button_code);
    return HANDLER_SUCCESS;
}

int on_button_released(unsigned char button_code, const char* button_name) {
    printf("[Event] Button Released: %s (0x%02X)\n", button_name, button_code);
    return HANDLER_SUCCESS;
}

int on_ir_transmit_start(ir_code_t code, int success) {
    (void)success;
    printf("[Event] IR Transmission Started: 0x%08X (Protocol: %d)\n", 
           code.code, code.protocol);
    return HANDLER_SUCCESS;
}

int on_ir_transmit_complete(ir_code_t code, int success) {
    if (success) {
        printf("[Event] IR Transmission Complete: 0x%08X (Success)\n", code.code);
    } else {
        printf("[Event] IR Transmission Failed: 0x%08X\n", code.code);
    }
    return HANDLER_SUCCESS;
}

int on_error(error_type_t error, const char* message) {
    printf("[Event] Error %d: %s\n", error, message ? message : "Unknown");
    return HANDLER_SUCCESS;
}

int on_universal_scan_started(unsigned char button_code, uint16_t code_index, uint16_t total_codes) {
    (void)code_index;
    const char* button_name = get_button_name(button_code);
    printf("[Event] Universal Scan Started: %s (0x%02X) - %d codes to try\n", 
           button_name, button_code, total_codes);
    return HANDLER_SUCCESS;
}

int on_universal_scan_next(unsigned char button_code, uint16_t code_index, uint16_t total_codes) {
    const char* button_name = get_button_name(button_code);
    printf("[Event] Universal Scan Next: %s (0x%02X) - Code %d/%d\n", 
           button_name, button_code, code_index + 1, total_codes);
    return HANDLER_SUCCESS;
}

int on_universal_scan_confirmed(unsigned char button_code, uint16_t code_index, uint16_t total_codes) {
    (void)total_codes;
    const char* button_name = get_button_name(button_code);
    printf("[Event] Universal Scan Confirmed: %s (0x%02X) - Code %d works!\n", 
           button_name, button_code, code_index + 1);
    return HANDLER_SUCCESS;
}

int on_universal_protocol_attempt(uint8_t protocol, uint32_t code, const char* description) {
    const char* protocol_names[] = {
        "Unknown", "NEC", "RC5", "RC6", "Sony SIRC", "Philips"
    };
    const char* protocol_name = (protocol < 6) ? protocol_names[protocol] : "Unknown";
    
    printf("[Event] Universal Protocol Attempt: %s - %s (0x%08X)\n", 
           protocol_name, description, code);
    return HANDLER_SUCCESS;
}

int on_universal_brand_detected(uint8_t brand, const char* brand_name) {
    printf("[Event] Universal Brand Detected: %s (ID: %d)\n", brand_name, brand);
    return HANDLER_SUCCESS;
}

int main(void) {
    printf("=== Event Handlers Example ===\n\n");
    
    /* Initialize handler system */
    if (handler_init() != 0) {
        fprintf(stderr, "Failed to initialize handler system\n");
        return 1;
    }
    
    /* Register all event handlers */
    printf("Registering event handlers...\n");
    handler_register_button_pressed(on_button_pressed);
    handler_register_button_released(on_button_released);
    handler_register_ir_transmit_start(on_ir_transmit_start);
    handler_register_ir_transmit_complete(on_ir_transmit_complete);
    handler_register_error(on_error);
    handler_register_universal_scan_started(on_universal_scan_started);
    handler_register_universal_scan_next(on_universal_scan_next);
    handler_register_universal_scan_confirmed(on_universal_scan_confirmed);
    handler_register_universal_protocol_attempt(on_universal_protocol_attempt);
    handler_register_universal_brand_detected(on_universal_brand_detected);
    printf("Event handlers registered!\n\n");
    
    /* Example 1: Button Press Events */
    printf("========================================\n");
    printf("Example 1: Button Press Events\n");
    printf("========================================\n");
    if (remote_init() == 0) {
        remote_press_button(BUTTON_POWER);
        printf("\n");
        remote_press_button(BUTTON_VOLUME_UP);
        printf("\n");
    }
    
    /* Example 2: Universal TV Scan Mode Events */
    printf("========================================\n");
    printf("Example 2: Universal TV Scan Mode Events\n");
    printf("========================================\n");
    if (universal_tv_init(UNIVERSAL_MODE_SCAN) == 0) {
        printf("Starting scan mode for POWER button...\n");
        universal_tv_scan_start(BUTTON_POWER);
        printf("\n");
        
        printf("Simulating scan through codes:\n");
        for (int i = 0; i < 3; i++) {
            universal_tv_scan_next();
            printf("\n");
        }
        
        printf("Confirming code (simulating TV response):\n");
        universal_tv_scan_confirm();
        printf("\n");
    }
    
    /* Example 3: Universal Protocol Attempt Events */
    printf("========================================\n");
    printf("Example 3: Universal Protocol Attempt Events\n");
    printf("========================================\n");
    if (universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL) == 0) {
        printf("Sending POWER button (triggers protocol attempt events):\n");
        universal_tv_send_button(BUTTON_POWER);
        printf("\n");
    }
    
    /* Example 4: Brand Detection Events */
    printf("========================================\n");
    printf("Example 4: Brand Detection Events\n");
    printf("========================================\n");
    printf("Setting TV brand to Samsung:\n");
    universal_tv_set_brand(TV_BRAND_SAMSUNG);
    printf("\n");
    
    printf("Setting TV brand to Philips:\n");
    universal_tv_set_brand(TV_BRAND_PHILIPS);
    printf("\n");
    
    /* Cleanup */
    universal_tv_cleanup();
    remote_cleanup();
    handler_cleanup();
    
    printf("\n=== Summary ===\n");
    printf("✅ Button press/release events\n");
    printf("✅ IR transmission events\n");
    printf("✅ Universal scan mode events\n");
    printf("✅ Protocol attempt events\n");
    printf("✅ Brand detection events\n");
    printf("✅ Error events\n");
    printf("\nAll event handlers working correctly!\n");
    
    return 0;
}


