#ifndef SYSTEM_HANDLER_H
#define SYSTEM_HANDLER_H

#include "handlers.h"
#include <stdint.h>

/**
 * @file system_handler.h
 * @brief System-level handler for overall system management
 */

/* System States */
typedef enum {
    SYSTEM_STATE_UNINITIALIZED,
    SYSTEM_STATE_INITIALIZING,
    SYSTEM_STATE_READY,
    SYSTEM_STATE_RUNNING,
    SYSTEM_STATE_ERROR,
    SYSTEM_STATE_SHUTTING_DOWN,
    SYSTEM_STATE_SHUTDOWN
} system_state_t;

/* System Events */
typedef enum {
    SYSTEM_EVENT_STARTUP,
    SYSTEM_EVENT_INITIALIZED,
    SYSTEM_EVENT_READY,
    SYSTEM_EVENT_ERROR,
    SYSTEM_EVENT_WARNING,
    SYSTEM_EVENT_SHUTDOWN,
    SYSTEM_EVENT_RESET,
    SYSTEM_EVENT_SUSPEND,
    SYSTEM_EVENT_RESUME
} system_event_t;

/* System Error Codes */
typedef enum {
    SYSTEM_ERROR_NONE,
    SYSTEM_ERROR_INIT_FAILED,
    SYSTEM_ERROR_HARDWARE_FAILURE,
    SYSTEM_ERROR_MEMORY_ERROR,
    SYSTEM_ERROR_TIMEOUT,
    SYSTEM_ERROR_INVALID_STATE,
    SYSTEM_ERROR_CRITICAL_FAILURE
} system_error_t;

/* System Configuration */
typedef struct {
    uint8_t auto_recovery;          /* Enable automatic error recovery */
    uint8_t watchdog_enabled;       /* Enable watchdog timer */
    uint32_t watchdog_timeout_ms;   /* Watchdog timeout */
    uint8_t error_logging;          /* Enable error logging */
    uint8_t health_monitoring;      /* Enable health monitoring */
    uint32_t health_check_interval_ms; /* Health check interval */
} system_config_t;

/* System Health Status */
typedef struct {
    uint32_t uptime_ms;             /* System uptime */
    uint32_t error_count;           /* Total error count */
    uint32_t warning_count;          /* Total warning count */
    uint32_t last_error_time;       /* Timestamp of last error */
    system_state_t current_state;    /* Current system state */
    uint8_t health_score;           /* Health score (0-100) */
} system_health_t;

/* System Handler Function Types */
typedef int (*system_init_handler_t)(void);
typedef int (*system_cleanup_handler_t)(void);
typedef int (*system_error_handler_t)(system_error_t error, const char* message);
typedef int (*system_event_handler_t)(system_event_t event, void* data);
typedef int (*system_state_change_handler_t)(system_state_t old_state, system_state_t new_state);
typedef int (*system_health_check_handler_t)(system_health_t* health);

/**
 * @brief Initialize system handler
 * @return 0 on success, -1 on failure
 */
int system_handler_init(void);

/**
 * @brief Set system configuration
 * @param config System configuration
 * @return 0 on success, -1 on failure
 */
int system_handler_set_config(system_config_t* config);

/**
 * @brief Get system configuration
 * @return Pointer to current configuration
 */
system_config_t* system_handler_get_config(void);

/**
 * @brief Register system initialization handler
 * @param handler Function to call during system initialization
 * @return 0 on success, -1 on failure
 */
int system_handler_register_init(system_init_handler_t handler);

/**
 * @brief Register system cleanup handler
 * @param handler Function to call during system cleanup
 * @return 0 on success, -1 on failure
 */
int system_handler_register_cleanup(system_cleanup_handler_t handler);

/**
 * @brief Register system error handler
 * @param handler Function to call on system errors
 * @return 0 on success, -1 on failure
 */
int system_handler_register_error(system_error_handler_t handler);

/**
 * @brief Register system event handler
 * @param handler Function to call on system events
 * @return 0 on success, -1 on failure
 */
int system_handler_register_event(system_event_handler_t handler);

/**
 * @brief Register system state change handler
 * @param handler Function to call on state changes
 * @return 0 on success, -1 on failure
 */
int system_handler_register_state_change(system_state_change_handler_t handler);

/**
 * @brief Register system health check handler
 * @param handler Function to call for health checks
 * @return 0 on success, -1 on failure
 */
int system_handler_register_health_check(system_health_check_handler_t handler);

/**
 * @brief Initialize entire system
 * @return 0 on success, -1 on failure
 */
int system_init(void);

/**
 * @brief Cleanup entire system
 */
void system_cleanup(void);

/**
 * @brief Get current system state
 * @return Current system state
 */
system_state_t system_get_state(void);

/**
 * @brief Set system state
 * @param state New system state
 * @return 0 on success, -1 on failure
 */
int system_set_state(system_state_t state);

/**
 * @brief Trigger system event
 * @param event System event type
 * @param data Event data (optional)
 * @return 0 on success, -1 on failure
 */
int system_trigger_event(system_event_t event, void* data);

/**
 * @brief Report system error
 * @param error Error type
 * @param message Error message
 * @return 0 on success, -1 on failure
 */
int system_report_error(system_error_t error, const char* message);

/**
 * @brief Report system warning
 * @param message Warning message
 * @return 0 on success, -1 on failure
 */
int system_report_warning(const char* message);

/**
 * @brief Get system health status
 * @return Pointer to health status structure
 */
system_health_t* system_get_health(void);

/**
 * @brief Perform system health check
 * @return 0 if healthy, -1 if unhealthy
 */
int system_health_check(void);

/**
 * @brief Reset system
 * @return 0 on success, -1 on failure
 */
int system_reset(void);

/**
 * @brief Shutdown system
 * @return 0 on success, -1 on failure
 */
int system_shutdown(void);

/**
 * @brief Get system uptime in milliseconds
 * @return Uptime in milliseconds
 */
uint32_t system_get_uptime_ms(void);

/**
 * @brief Cleanup system handler
 */
void system_handler_cleanup(void);

#endif /* SYSTEM_HANDLER_H */


