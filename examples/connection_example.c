/**
 * @file connection_example.c
 * @brief Example demonstrating connection management
 */

#include "../include/remote_control.h"
#include "../include/connection.h"
#include "../include/remote_buttons.h"
#include <stdio.h>

int main(void) {
    printf("=== Connection Management Example ===\n\n");
    
    /* Initialize remote control */
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote control\n");
        return 1;
    }
    
    /* Configure connection settings */
    connection_config_t config = {
        .max_retries = 3,
        .retry_delay_ms = 500,
        .connection_timeout_ms = 5000,
        .verify_interval_ms = 30000,
        .auto_reconnect = 1,
        .verify_on_send = 0
    };
    connection_set_config(&config);
    
    /* Ensure connection to TV */
    printf("1. Establishing connection to TV...\n");
    if (remote_ensure_connection(DEVICE_TV) == 0) {
        printf("   Connection established!\n\n");
    } else {
        printf("   Connection failed!\n\n");
    }
    
    /* Check connection status */
    printf("2. Connection status: ");
    switch (connection_get_status()) {
        case CONNECTION_DISCONNECTED: printf("Disconnected\n"); break;
        case CONNECTION_CONNECTING: printf("Connecting...\n"); break;
        case CONNECTION_CONNECTED: printf("Connected\n"); break;
        case CONNECTION_VERIFYING: printf("Verifying...\n"); break;
        case CONNECTION_FAILED: printf("Failed\n"); break;
        case CONNECTION_TIMEOUT: printf("Timeout\n"); break;
    }
    printf("\n");
    
    /* Send commands (connection is automatically ensured) */
    printf("3. Sending commands (connection auto-ensured)...\n");
    remote_press_button(BUTTON_POWER);
    remote_press_button(BUTTON_VOLUME_UP);
    printf("\n");
    
    /* Get connection statistics */
    printf("4. Connection Statistics:\n");
    connection_stats_t* stats = connection_get_stats();
    printf("   Total transmissions: %u\n", stats->total_transmissions);
    printf("   Successful: %u\n", stats->successful_transmissions);
    printf("   Failed: %u\n", stats->failed_transmissions);
    printf("   Retries: %u\n", stats->retry_count);
    printf("   Connection attempts: %u\n", stats->connection_attempts);
    printf("\n");
    
    /* Get connection quality */
    printf("5. Connection Quality: ");
    switch (connection_get_quality()) {
        case QUALITY_NONE: printf("None\n"); break;
        case QUALITY_POOR: printf("Poor\n"); break;
        case QUALITY_FAIR: printf("Fair\n"); break;
        case QUALITY_GOOD: printf("Good\n"); break;
        case QUALITY_EXCELLENT: printf("Excellent\n"); break;
    }
    printf("\n");
    
    /* Test connection */
    printf("6. Testing connection...\n");
    if (connection_test(BUTTON_POWER) == 0) {
        printf("   Connection test passed!\n");
    } else {
        printf("   Connection test failed!\n");
    }
    printf("\n");
    
    /* Verify connection */
    printf("7. Verifying connection...\n");
    if (connection_verify() == 0) {
        printf("   Connection verified!\n");
    } else {
        printf("   Connection verification failed!\n");
    }
    printf("\n");
    
    /* Cleanup */
    remote_cleanup();
    printf("Example complete\n");
    
    return 0;
}


