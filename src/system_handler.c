#include "../include/system_handler.h"
#include "../include/handlers.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#include <sys/time.h>
#endif

/* System Handler State */
static system_state_t system_state = SYSTEM_STATE_UNINITIALIZED;
static system_config_t system_config = {
    .auto_recovery = 1,
    .watchdog_enabled = 0,
    .watchdog_timeout_ms = 5000,
    .error_logging = 1,
    .health_monitoring = 1,
    .health_check_interval_ms = 10000
};

static system_health_t system_health = {0};
static int system_handler_initialized = 0;
static uint32_t system_start_time = 0;

/* Registered Handlers */
static system_init_handler_t init_handler = NULL;
static system_cleanup_handler_t cleanup_handler = NULL;
static system_error_handler_t error_handler = NULL;
static system_event_handler_t event_handler = NULL;
static system_state_change_handler_t state_change_handler = NULL;
static system_health_check_handler_t health_check_handler = NULL;

/**
 * @brief Get current timestamp in milliseconds
 */
static uint32_t get_timestamp_ms(void) {
#ifdef _WIN32
    return (uint32_t)GetTickCount();
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
#endif
}

/**
 * @brief Initialize system handler
 */
int system_handler_init(void) {
    if (system_handler_initialized) {
        return 0;
    }
    
    system_state = SYSTEM_STATE_INITIALIZING;
    system_start_time = get_timestamp_ms();
    
    memset(&system_health, 0, sizeof(system_health_t));
    system_health.current_state = SYSTEM_STATE_INITIALIZING;
    system_health.health_score = 100;
    
    system_handler_initialized = 1;
    printf("[System] System handler initialized\n");
    
    return 0;
}

/**
 * @brief Set system configuration
 */
int system_handler_set_config(system_config_t* config) {
    if (config == NULL) {
        return -1;
    }
    
    system_config = *config;
    printf("[System] Configuration updated\n");
    return 0;
}

/**
 * @brief Get system configuration
 */
system_config_t* system_handler_get_config(void) {
    return &system_config;
}

/**
 * @brief Register system initialization handler
 */
int system_handler_register_init(system_init_handler_t handler) {
    init_handler = handler;
    return 0;
}

/**
 * @brief Register system cleanup handler
 */
int system_handler_register_cleanup(system_cleanup_handler_t handler) {
    cleanup_handler = handler;
    return 0;
}

/**
 * @brief Register system error handler
 */
int system_handler_register_error(system_error_handler_t handler) {
    error_handler = handler;
    return 0;
}

/**
 * @brief Register system event handler
 */
int system_handler_register_event(system_event_handler_t handler) {
    event_handler = handler;
    return 0;
}

/**
 * @brief Register system state change handler
 */
int system_handler_register_state_change(system_state_change_handler_t handler) {
    state_change_handler = handler;
    return 0;
}

/**
 * @brief Register system health check handler
 */
int system_handler_register_health_check(system_health_check_handler_t handler) {
    health_check_handler = handler;
    return 0;
}

/**
 * @brief Initialize entire system
 */
int system_init(void) {
    if (system_state == SYSTEM_STATE_READY || 
        system_state == SYSTEM_STATE_RUNNING) {
        printf("[System] System already initialized\n");
        return 0;
    }
    
    if (system_state != SYSTEM_STATE_UNINITIALIZED && 
        system_state != SYSTEM_STATE_SHUTDOWN &&
        system_state != SYSTEM_STATE_INITIALIZING) {
        fprintf(stderr, "[System] Error: System in invalid state\n");
        return -1;
    }
    
    system_set_state(SYSTEM_STATE_INITIALIZING);
    system_trigger_event(SYSTEM_EVENT_STARTUP, NULL);
    
    printf("[System] Initializing system...\n");
    
    /* Call registered init handler */
    if (init_handler != NULL) {
        if (init_handler() != 0) {
            system_report_error(SYSTEM_ERROR_INIT_FAILED, "System initialization failed");
            system_set_state(SYSTEM_STATE_ERROR);
            return -1;
        }
    }
    
    system_set_state(SYSTEM_STATE_READY);
    system_trigger_event(SYSTEM_EVENT_INITIALIZED, NULL);
    
    printf("[System] System initialized successfully\n");
    return 0;
}

/**
 * @brief Cleanup entire system
 */
void system_cleanup(void) {
    if (system_state == SYSTEM_STATE_SHUTDOWN || 
        system_state == SYSTEM_STATE_UNINITIALIZED) {
        return;
    }
    
    system_set_state(SYSTEM_STATE_SHUTTING_DOWN);
    system_trigger_event(SYSTEM_EVENT_SHUTDOWN, NULL);
    
    printf("[System] Cleaning up system...\n");
    
    /* Call registered cleanup handler */
    if (cleanup_handler != NULL) {
        cleanup_handler();
    }
    
    system_set_state(SYSTEM_STATE_SHUTDOWN);
    printf("[System] System cleanup complete\n");
}

/**
 * @brief Get current system state
 */
system_state_t system_get_state(void) {
    return system_state;
}

/**
 * @brief Set system state
 */
int system_set_state(system_state_t new_state) {
    if (new_state == system_state) {
        return 0;  /* No change */
    }
    
    system_state_t old_state = system_state;
    system_state = new_state;
    system_health.current_state = new_state;
    
    /* Call state change handler */
    if (state_change_handler != NULL) {
        state_change_handler(old_state, new_state);
    }
    
    /* Trigger state change event */
    event_t event = {
        .type = EVENT_STATE_CHANGED,
        .timestamp = get_timestamp_ms(),
        .data.custom.data = NULL
    };
    handler_trigger_custom_event(&event);
    
    return 0;
}

/**
 * @brief Trigger system event
 */
int system_trigger_event(system_event_t event, void* data) {
    if (!system_handler_initialized) {
        return -1;
    }
    
    /* Call registered event handler */
    if (event_handler != NULL) {
        event_handler(event, data);
    }
    
    /* Log event */
    const char* event_name = "Unknown";
    switch (event) {
        case SYSTEM_EVENT_STARTUP: event_name = "Startup"; break;
        case SYSTEM_EVENT_INITIALIZED: event_name = "Initialized"; break;
        case SYSTEM_EVENT_READY: event_name = "Ready"; break;
        case SYSTEM_EVENT_ERROR: event_name = "Error"; break;
        case SYSTEM_EVENT_WARNING: event_name = "Warning"; break;
        case SYSTEM_EVENT_SHUTDOWN: event_name = "Shutdown"; break;
        case SYSTEM_EVENT_RESET: event_name = "Reset"; break;
        case SYSTEM_EVENT_SUSPEND: event_name = "Suspend"; break;
        case SYSTEM_EVENT_RESUME: event_name = "Resume"; break;
    }
    
    printf("[System] Event: %s\n", event_name);
    return 0;
}

/**
 * @brief Report system error
 */
int system_report_error(system_error_t error, const char* message) {
    if (!system_handler_initialized) {
        return -1;
    }
    
    system_health.error_count++;
    system_health.last_error_time = get_timestamp_ms();
    
    /* Update health score */
    if (system_health.health_score > 0) {
        system_health.health_score -= 5;  /* Decrease health score */
    }
    
    const char* error_name = "Unknown";
    switch (error) {
        case SYSTEM_ERROR_NONE: error_name = "None"; break;
        case SYSTEM_ERROR_INIT_FAILED: error_name = "Init Failed"; break;
        case SYSTEM_ERROR_HARDWARE_FAILURE: error_name = "Hardware Failure"; break;
        case SYSTEM_ERROR_MEMORY_ERROR: error_name = "Memory Error"; break;
        case SYSTEM_ERROR_TIMEOUT: error_name = "Timeout"; break;
        case SYSTEM_ERROR_INVALID_STATE: error_name = "Invalid State"; break;
        case SYSTEM_ERROR_CRITICAL_FAILURE: error_name = "Critical Failure"; break;
    }
    
    if (system_config.error_logging) {
        fprintf(stderr, "[System] Error: %s - %s\n", error_name, message ? message : "Unknown error");
    }
    
    /* Call registered error handler */
    if (error_handler != NULL) {
        error_handler(error, message);
    }
    
    /* Trigger error event */
    system_trigger_event(SYSTEM_EVENT_ERROR, (void*)message);
    
    /* Set error state if critical */
    if (error == SYSTEM_ERROR_CRITICAL_FAILURE) {
        system_set_state(SYSTEM_STATE_ERROR);
    }
    
    return 0;
}

/**
 * @brief Report system warning
 */
int system_report_warning(const char* message) {
    if (!system_handler_initialized) {
        return -1;
    }
    
    system_health.warning_count++;
    
    if (system_config.error_logging) {
        printf("[System] Warning: %s\n", message ? message : "Unknown warning");
    }
    
    system_trigger_event(SYSTEM_EVENT_WARNING, (void*)message);
    return 0;
}

/**
 * @brief Get system health status
 */
system_health_t* system_get_health(void) {
    if (!system_handler_initialized) {
        return NULL;
    }
    
    system_health.uptime_ms = get_timestamp_ms() - system_start_time;
    return &system_health;
}

/**
 * @brief Perform system health check
 */
int system_health_check(void) {
    if (!system_handler_initialized) {
        return -1;
    }
    
    system_health_t* health = system_get_health();
    if (health == NULL) {
        return -1;
    }
    
    /* Call registered health check handler */
    if (health_check_handler != NULL) {
        health_check_handler(health);
    }
    
    /* Determine health status */
    if (health->health_score < 50) {
        system_report_warning("System health score is low");
        return -1;  /* Unhealthy */
    }
    
    return 0;  /* Healthy */
}

/**
 * @brief Reset system
 */
int system_reset(void) {
    printf("[System] Resetting system...\n");
    
    system_trigger_event(SYSTEM_EVENT_RESET, NULL);
    
    /* Cleanup */
    system_cleanup();
    
    /* Reset state */
    system_state = SYSTEM_STATE_UNINITIALIZED;
    system_start_time = 0;
    memset(&system_health, 0, sizeof(system_health_t));
    
    /* Reinitialize */
    return system_init();
}

/**
 * @brief Shutdown system
 */
int system_shutdown(void) {
    system_cleanup();
    return 0;
}

/**
 * @brief Get system uptime in milliseconds
 */
uint32_t system_get_uptime_ms(void) {
    if (system_start_time == 0) {
        return 0;
    }
    return get_timestamp_ms() - system_start_time;
}

/**
 * @brief Cleanup system handler
 */
void system_handler_cleanup(void) {
    if (!system_handler_initialized) {
        return;
    }
    
    system_cleanup();
    system_handler_initialized = 0;
    printf("[System] System handler cleaned up\n");
}

