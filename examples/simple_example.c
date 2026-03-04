/**
 * @file simple_example.c
 * @brief Simple example demonstrating basic remote control usage
 * 
 * Compile with:
 *   gcc -I../include simple_example.c ../src/ir_codes.c ../src/remote_control.c -o simple_example
 */

#include <stdio.h>
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"

int main(void) {
    printf("=== Simple Remote Control Example ===\n\n");
    
    // Initialize the remote control system
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote control\n");
        return 1;
    }
    
    printf("Remote control initialized successfully!\n\n");
    
    // Example 1: Power on the TV
    printf("Example 1: Powering on TV\n");
    remote_press_button(BUTTON_POWER);
    printf("\n");
    
    // Example 2: Open YouTube
    printf("Example 2: Opening YouTube\n");
    remote_press_button(BUTTON_YOUTUBE);
    printf("\n");
    
    // Example 3: Adjust volume
    printf("Example 3: Increasing volume\n");
    for (int i = 0; i < 5; i++) {
        remote_press_button(BUTTON_VOLUME_UP);
    }
    printf("\n");
    
    // Example 4: Navigate menu
    printf("Example 4: Navigating menu\n");
    remote_press_button(BUTTON_HOME);
    remote_press_button(BUTTON_UP);
    remote_press_button(BUTTON_RIGHT);
    remote_press_button(BUTTON_OK);
    printf("\n");
    
    // Example 5: Open Netflix
    printf("Example 5: Opening Netflix\n");
    remote_press_button(BUTTON_NETFLIX);
    printf("\n");
    
    // Example 6: Playback controls
    printf("Example 6: Playback controls\n");
    remote_press_button(BUTTON_PLAY);
    remote_press_button(BUTTON_PAUSE);
    remote_press_button(BUTTON_STOP);
    printf("\n");
    
    // Example 7: Number pad - change to channel 5
    printf("Example 7: Changing to channel 5\n");
    remote_press_button(BUTTON_5);
    printf("\n");
    
    // Example 8: Advanced features
    printf("Example 8: Accessing settings\n");
    remote_press_button(BUTTON_SETTINGS);
    remote_press_button(BUTTON_BACK);
    printf("\n");
    
    // Get current state
    remote_state_t* state = remote_get_state();
    printf("Current State:\n");
    printf("  Device: %d\n", state->current_device);
    printf("  Volume: %d%%\n", state->volume_level);
    printf("  Channel: %d\n", state->channel);
    printf("  Powered: %s\n", state->is_powered_on ? "ON" : "OFF");
    printf("\n");
    
    // Cleanup
    remote_cleanup();
    printf("Remote control cleaned up\n");
    
    return 0;
}


