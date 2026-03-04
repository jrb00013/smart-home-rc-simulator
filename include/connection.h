#ifndef CONNECTION_H
#define CONNECTION_H

#include "ir_codes.h"
#include "remote_control.h"
#include <stdint.h>

/**
 * @file connection.h
 * @brief Remote connection management and verification
 */

/* Connection Status */
typedef enum {
    CONNECTION_DISCONNECTED,
    CONNECTION_CONNECTING,
    CONNECTION_CONNECTED,
    CONNECTION_VERIFYING,
    CONNECTION_FAILED,
    CONNECTION_TIMEOUT
} connection_status_t;

/* Connection Quality */
typedef enum {
    QUALITY_NONE,
    QUALITY_POOR,
    QUALITY_FAIR,
    QUALITY_GOOD,
    QUALITY_EXCELLENT
} connection_quality_t;

/* Connection Statistics */
typedef struct {
    uint32_t total_transmissions;
    uint32_t successful_transmissions;
    uint32_t failed_transmissions;
    uint32_t retry_count;
    uint32_t connection_attempts;
    uint32_t last_success_time;
    uint32_t last_failure_time;
    connection_quality_t quality;
} connection_stats_t;

/* Connection Configuration */
typedef struct {
    uint8_t max_retries;           /* Maximum retry attempts */
    uint32_t retry_delay_ms;       /* Delay between retries (ms) */
    uint32_t connection_timeout_ms; /* Connection timeout (ms) */
    uint32_t verify_interval_ms;   /* Connection verification interval (ms) */
    uint8_t auto_reconnect;         /* Auto-reconnect on failure */
    uint8_t verify_on_send;        /* Verify connection before each send */
} connection_config_t;

/**
 * @brief Initialize connection management
 * @return 0 on success, -1 on failure
 */
int connection_init(void);

/**
 * @brief Set connection configuration
 * @param config Connection configuration structure
 * @return 0 on success, -1 on failure
 */
int connection_set_config(connection_config_t* config);

/**
 * @brief Get current connection configuration
 * @return Pointer to configuration structure
 */
connection_config_t* connection_get_config(void);

/* External access to connection config (for delay_ms usage) */
extern connection_config_t connection_config;

/**
 * @brief Establish connection to target device
 * @param device_type Device type to connect to
 * @return 0 on success, -1 on failure
 */
int connection_establish(unsigned char device_type);

/**
 * @brief Verify connection to target device
 * @return 0 if connected, -1 if disconnected
 */
int connection_verify(void);

/**
 * @brief Test connection by sending a test command
 * @param test_button Button code to test (e.g., BUTTON_POWER)
 * @return 0 on success, -1 on failure
 */
int connection_test(unsigned char test_button);

/**
 * @brief Get current connection status
 * @return Connection status
 */
connection_status_t connection_get_status(void);

/**
 * @brief Get connection statistics
 * @return Pointer to statistics structure
 */
connection_stats_t* connection_get_stats(void);

/**
 * @brief Get connection quality
 * @return Connection quality rating
 */
connection_quality_t connection_get_quality(void);

/**
 * @brief Check if connection is active
 * @return 1 if connected, 0 if disconnected
 */
int connection_is_connected(void);

/**
 * @brief Get currently connected device
 * @return Device type, or 0 if not connected
 */
unsigned char connection_get_connected_device(void);

/**
 * @brief Reconnect to device
 * @return 0 on success, -1 on failure
 */
int connection_reconnect(void);

/**
 * @brief Disconnect from device
 */
void connection_disconnect(void);

/**
 * @brief Send IR code with connection verification and retry
 * @param code IR code to send
 * @return 0 on success, -1 on failure
 */
int connection_send_with_retry(ir_code_t code);

/**
 * @brief Reset connection statistics
 */
void connection_reset_stats(void);

/**
 * @brief Cleanup connection management
 */
void connection_cleanup(void);

/* Default Configuration */
#define CONNECTION_DEFAULT_MAX_RETRIES        3
#define CONNECTION_DEFAULT_RETRY_DELAY_MS     500
#define CONNECTION_DEFAULT_TIMEOUT_MS        5000
#define CONNECTION_DEFAULT_VERIFY_INTERVAL_MS 30000
#define CONNECTION_DEFAULT_AUTO_RECONNECT     1
#define CONNECTION_DEFAULT_VERIFY_ON_SEND     0

#endif /* CONNECTION_H */

