/**
 * @file universal_tv_example.c
 * @brief Example demonstrating universal TV support with multi-protocol and scan mode
 * 
 * This example shows how to use the universal TV functionality to control
 * any TV brand without hardcoding specific IR codes.
 * 
 * Compile with:
 *   gcc -I../include universal_tv_example.c ../src/ir_codes.c ../src/ir_protocol.c \
 *       ../src/universal_tv.c ../src/remote_control.c -o universal_tv_example
 */

#include <stdio.h>
#include "../include/universal_tv.h"
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"

int main(void) {
    printf("=== Universal TV Remote Example ===\n\n");
    
    /* Initialize universal TV system */
    printf("Initializing universal TV system...\n");
    if (universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL) != 0) {
        fprintf(stderr, "Failed to initialize universal TV system\n");
        return 1;
    }
    printf("Universal TV system initialized!\n\n");
    
    /* Example 1: Multi-Protocol Universal Sender (Option 1) */
    printf("========================================\n");
    printf("Example 1: Multi-Protocol Universal Sender\n");
    printf("========================================\n");
    printf("This sends multiple protocols/codes for maximum compatibility.\n");
    printf("When you press POWER, it tries:\n");
    printf("  - NEC protocol (Samsung/LG)\n");
    printf("  - RC5 protocol (Philips)\n");
    printf("  - RC6 protocol (Philips)\n");
    printf("  - Sony SIRC protocol\n");
    printf("  - And more...\n\n");
    
    printf("Sending POWER button (tries all protocols)...\n");
    universal_tv_send_button(BUTTON_POWER);
    printf("\n");
    
    printf("Sending VOLUME_UP button (tries all protocols)...\n");
    universal_tv_send_button(BUTTON_VOLUME_UP);
    printf("\n");
    
    printf("Sending MUTE button (tries all protocols)...\n");
    universal_tv_send_button(BUTTON_MUTE);
    printf("\n");
    
    /* Example 2: Code Scan Mode (Option 2) */
    printf("========================================\n");
    printf("Example 2: Code Scan Mode\n");
    printf("========================================\n");
    printf("This mode cycles through codes until you find one that works.\n");
    printf("How it works:\n");
    printf("  1. Start scan mode for a button\n");
    printf("  2. Press button repeatedly - remote cycles through codes\n");
    printf("  3. When TV responds, confirm to save that code\n");
    printf("  4. Remote remembers the working code for your TV\n\n");
    
    printf("Starting scan mode for POWER button...\n");
    if (universal_tv_scan_start(BUTTON_POWER) == 0) {
        printf("Scan mode active. In real usage:\n");
        printf("  - Press POWER button repeatedly\n");
        printf("  - Remote will cycle through codes\n");
        printf("  - When TV turns on/off, confirm the code\n\n");
        
        /* Simulate scanning through a few codes */
        printf("Simulating scan (cycling through codes):\n");
        for (int i = 0; i < 5; i++) {
            printf("  [Press %d] ", i + 1);
            universal_tv_scan_next();
            printf("\n");
        }
        
        printf("\nSimulating user confirmation (TV responded):\n");
        universal_tv_scan_confirm();
        printf("\n");
    }
    
    /* Example 3: Setting TV Brand (Optimization) */
    printf("========================================\n");
    printf("Example 3: Setting TV Brand\n");
    printf("========================================\n");
    printf("If you know your TV brand, set it for optimized code selection.\n\n");
    
    printf("Setting TV brand to Samsung...\n");
    universal_tv_set_brand(TV_BRAND_SAMSUNG);
    printf("Now sending POWER - will prioritize Samsung codes\n");
    universal_tv_send_button(BUTTON_POWER);
    printf("\n");
    
    printf("Setting TV brand to Philips...\n");
    universal_tv_set_brand(TV_BRAND_PHILIPS);
    printf("Now sending POWER - will prioritize Philips RC5/RC6 codes\n");
    universal_tv_send_button(BUTTON_POWER);
    printf("\n");
    
    /* Example 4: Integration with Remote Control */
    printf("========================================\n");
    printf("Example 4: Integration with Remote Control\n");
    printf("========================================\n");
    printf("The remote_control module automatically uses universal mode for TV.\n\n");
    
    if (remote_init() == 0) {
        printf("Remote initialized with universal TV support\n");
        printf("Pressing buttons - universal mode is active for TV device\n\n");
        
        remote_press_button(BUTTON_POWER);
        printf("\n");
        
        remote_press_button(BUTTON_VOLUME_UP);
        printf("\n");
        
        remote_press_button(BUTTON_VOLUME_DOWN);
        printf("\n");
        
        remote_cleanup();
    }
    
    /* Example 5: Code Count Information */
    printf("========================================\n");
    printf("Example 5: Code Database Information\n");
    printf("========================================\n");
    printf("Number of universal codes available:\n");
    printf("  POWER: %d codes\n", universal_tv_get_code_count(BUTTON_POWER));
    printf("  VOLUME_UP: %d codes\n", universal_tv_get_code_count(BUTTON_VOLUME_UP));
    printf("  VOLUME_DOWN: %d codes\n", universal_tv_get_code_count(BUTTON_VOLUME_DOWN));
    printf("  MUTE: %d codes\n", universal_tv_get_code_count(BUTTON_MUTE));
    printf("  CHANNEL_UP: %d codes\n", universal_tv_get_code_count(BUTTON_CHANNEL_UP));
    printf("  CHANNEL_DOWN: %d codes\n", universal_tv_get_code_count(BUTTON_CHANNEL_DOWN));
    printf("\n");
    
    /* Cleanup */
    universal_tv_cleanup();
    printf("Universal TV system cleaned up\n");
    
    printf("\n=== Summary ===\n");
    printf("✅ Option 1 (Multi-Protocol): Implemented - tries all protocols\n");
    printf("✅ Option 2 (Scan Mode): Implemented - cycles through codes\n");
    printf("⚠️  Option 3 (Auto-Learn): Requires IR receiver hardware\n");
    printf("\nYour remote now works with ANY TV brand!\n");
    
    return 0;
}


