/**
 * @file system_handler_example.c
 * @brief Example demonstrating system handler usage
 */

#include "../include/system_handler.h"
#include "../include/remote_control.h"
#include <stdio.h>

/* System event handler */
int my_system_event_handler(system_event_t event, void* data) {
    const char* event_name = "Unknown";
    switch (event) {
        case SYSTEM_EVENT_STARTUP: event_name = "Startup"; break;
        case SYSTEM_EVENT_INITIALIZED: event_name = "Initialized"; break;
        case SYSTEM_EVENT_READY: event_name = "Ready"; break;
        case SYSTEM_EVENT_ERROR: event_name = "Error"; break;
        case SYSTEM_EVENT_WARNING: event_name = "Warning"; break;
        case SYSTEM_EVENT_SHUTDOWN: event_name = "Shutdown"; break;
        case SYSTEM_EVENT_RESET: event_name = "Reset"; break;
        default: break;
    }
    printf("[System Handler] Event: %s\n", event_name);
    return 0;
}

/* System error handler */
int my_system_error_handler(system_error_t error, const char* message) {
    printf("[System Handler] Error %d: %s\n", error, message ? message : "Unknown");
    return 0;
}

/* System state change handler */
int my_state_change_handler(system_state_t old_state, system_state_t new_state) {
    const char* old_name = "Unknown", *new_name = "Unknown";
    
    switch (old_state) {
        case SYSTEM_STATE_UNINITIALIZED: old_name = "Uninitialized"; break;
        case SYSTEM_STATE_INITIALIZING: old_name = "Initializing"; break;
        case SYSTEM_STATE_READY: old_name = "Ready"; break;
        case SYSTEM_STATE_RUNNING: old_name = "Running"; break;
        case SYSTEM_STATE_ERROR: old_name = "Error"; break;
        case SYSTEM_STATE_SHUTTING_DOWN: old_name = "Shutting Down"; break;
        case SYSTEM_STATE_SHUTDOWN: old_name = "Shutdown"; break;
    }
    
    switch (new_state) {
        case SYSTEM_STATE_UNINITIALIZED: new_name = "Uninitialized"; break;
        case SYSTEM_STATE_INITIALIZING: new_name = "Initializing"; break;
        case SYSTEM_STATE_READY: new_name = "Ready"; break;
        case SYSTEM_STATE_RUNNING: new_name = "Running"; break;
        case SYSTEM_STATE_ERROR: new_name = "Error"; break;
        case SYSTEM_STATE_SHUTTING_DOWN: new_name = "Shutting Down"; break;
        case SYSTEM_STATE_SHUTDOWN: new_name = "Shutdown"; break;
    }
    
    printf("[System Handler] State change: %s -> %s\n", old_name, new_name);
    return 0;
}

/* System health check handler */
int my_health_check_handler(system_health_t* health) {
    printf("[System Handler] Health check:\n");
    printf("  Uptime: %u ms\n", health->uptime_ms);
    printf("  Errors: %u\n", health->error_count);
    printf("  Warnings: %u\n", health->warning_count);
    printf("  Health score: %u/100\n", health->health_score);
    return 0;
}

int main(void) {
    printf("=== System Handler Example ===\n\n");
    
    /* Initialize system handler */
    if (system_handler_init() != 0) {
        fprintf(stderr, "Failed to initialize system handler\n");
        return 1;
    }
    
    /* Register system handlers */
    system_handler_register_event(my_system_event_handler);
    system_handler_register_error(my_system_error_handler);
    system_handler_register_state_change(my_state_change_handler);
    system_handler_register_health_check(my_health_check_handler);
    
    /* Configure system */
    system_config_t config = {
        .auto_recovery = 1,
        .watchdog_enabled = 0,
        .watchdog_timeout_ms = 5000,
        .error_logging = 1,
        .health_monitoring = 1,
        .health_check_interval_ms = 10000
    };
    system_handler_set_config(&config);
    
    /* Initialize system */
    printf("1. Initializing system...\n");
    if (system_init() != 0) {
        fprintf(stderr, "System initialization failed\n");
        return 1;
    }
    printf("\n");
    
    /* Get system state */
    printf("2. System state: ");
    switch (system_get_state()) {
        case SYSTEM_STATE_READY: printf("Ready\n"); break;
        case SYSTEM_STATE_RUNNING: printf("Running\n"); break;
        default: printf("Other\n"); break;
    }
    printf("\n");
    
    /* Get system health */
    printf("3. System health:\n");
    system_health_t* health = system_get_health();
    if (health) {
        printf("   Uptime: %u ms\n", health->uptime_ms);
        printf("   Health score: %u/100\n", health->health_score);
    }
    printf("\n");
    
    /* Perform health check */
    printf("4. Performing health check...\n");
    if (system_health_check() == 0) {
        printf("   System is healthy\n");
    } else {
        printf("   System health check failed\n");
    }
    printf("\n");
    
    /* Report warning */
    printf("5. Reporting system warning...\n");
    system_report_warning("This is a test warning");
    printf("\n");
    
    /* Report error */
    printf("6. Reporting system error...\n");
    system_report_error(SYSTEM_ERROR_TIMEOUT, "Test timeout error");
    printf("\n");
    
    /* Get updated health */
    printf("7. Updated system health:\n");
    health = system_get_health();
    if (health) {
        printf("   Errors: %u\n", health->error_count);
        printf("   Warnings: %u\n", health->warning_count);
        printf("   Health score: %u/100\n", health->health_score);
    }
    printf("\n");
    
    /* Shutdown system */
    printf("8. Shutting down system...\n");
    system_shutdown();
    printf("\n");
    
    /* Cleanup */
    system_handler_cleanup();
    printf("Example complete\n");
    
    return 0;
}


