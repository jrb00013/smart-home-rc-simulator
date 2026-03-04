#define _POSIX_C_SOURCE 199309L
#include "../include/connection.h"
#include "../include/handlers.h"
#include "../include/remote_buttons.h"
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

/* Connection State */
static connection_status_t connection_status = CONNECTION_DISCONNECTED;
static connection_stats_t connection_stats = {0};

static int connection_initialized = 0;
static unsigned char connected_device = 0;
static uint32_t last_verify_time = 0;

/* Make connection_config accessible externally */
connection_config_t connection_config = {
    .max_retries = CONNECTION_DEFAULT_MAX_RETRIES,
    .retry_delay_ms = CONNECTION_DEFAULT_RETRY_DELAY_MS,
    .connection_timeout_ms = CONNECTION_DEFAULT_TIMEOUT_MS,
    .verify_interval_ms = CONNECTION_DEFAULT_VERIFY_INTERVAL_MS,
    .auto_reconnect = CONNECTION_DEFAULT_AUTO_RECONNECT,
    .verify_on_send = CONNECTION_DEFAULT_VERIFY_ON_SEND
};

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
 * @brief Delay in milliseconds
 */
static void delay_ms(uint32_t ms) {
#ifdef _WIN32
    Sleep(ms);
#else
    usleep(ms * 1000);
#endif
}

/**
 * @brief Calculate connection quality based on statistics
 */
static connection_quality_t calculate_quality(void) {
    if (connection_stats.total_transmissions == 0) {
        return QUALITY_NONE;
    }
    
    float success_rate = (float)connection_stats.successful_transmissions / 
                         (float)connection_stats.total_transmissions;
    
    if (success_rate >= 0.95f) {
        return QUALITY_EXCELLENT;
    } else if (success_rate >= 0.80f) {
        return QUALITY_GOOD;
    } else if (success_rate >= 0.60f) {
        return QUALITY_FAIR;
    } else {
        return QUALITY_POOR;
    }
}

/**
 * @brief Initialize connection management
 */
int connection_init(void) {
    if (connection_initialized) {
        return 0;
    }
    
    connection_status = CONNECTION_DISCONNECTED;
    memset(&connection_stats, 0, sizeof(connection_stats_t));
    connection_stats.quality = QUALITY_NONE;
    
    connection_initialized = 1;
    printf("[Connection] Connection management initialized\n");
    return 0;
}

/**
 * @brief Set connection configuration
 */
int connection_set_config(connection_config_t* config) {
    if (config == NULL) {
        return -1;
    }
    
    connection_config = *config;
    printf("[Connection] Configuration updated\n");
    return 0;
}

/**
 * @brief Get current connection configuration
 */
connection_config_t* connection_get_config(void) {
    return &connection_config;
}

/**
 * @brief Establish connection to target device
 */
int connection_establish(unsigned char device_type) {
    if (!connection_initialized) {
        fprintf(stderr, "[Connection] Error: Connection system not initialized\n");
        handler_trigger_error(ERROR_IR_NOT_INITIALIZED, "Connection system not initialized");
        return -1;
    }
    
    /* If already connected to the same device, return success */
    if (connection_status == CONNECTION_CONNECTED && connected_device == device_type) {
        printf("[Connection] Already connected to device %d\n", device_type);
        return 0;
    }
    
    connection_status = CONNECTION_CONNECTING;
    connection_stats.connection_attempts++;
    
    const char* device_name = "Unknown";
    switch (device_type) {
        case 0x01: device_name = "TV"; break;
        case 0x02: device_name = "DVD"; break;
        case 0x03: device_name = "Streaming"; break;
        case 0x04: device_name = "Cable"; break;
        case 0x05: device_name = "Audio"; break;
    }
    
    printf("[Connection] Establishing connection to %s (device %d)...\n", device_name, device_type);
    
    /* Verify IR system is initialized */
    /* In a real implementation, this would test hardware */
    
    /* Test connection by sending a test command with retries */
    int test_result = -1;
    int attempt;
    
    for (attempt = 0; attempt <= connection_config.max_retries; attempt++) {
        if (attempt > 0) {
            printf("[Connection] Connection test retry %d/%d...\n", attempt, connection_config.max_retries);
            delay_ms(connection_config.retry_delay_ms);
        }
        
        test_result = connection_test(BUTTON_POWER);
        
        if (test_result == 0) {
            break;  /* Success */
        }
    }
    
    if (test_result == 0) {
        connection_status = CONNECTION_CONNECTED;
        connected_device = device_type;
        last_verify_time = get_timestamp_ms();
        connection_stats.last_success_time = last_verify_time;
        connection_stats.quality = QUALITY_GOOD;
        
        printf("[Connection] Successfully connected to %s (device %d)\n", device_name, device_type);
        printf("[Connection] Connection quality: Good\n");
        return 0;
    } else {
        connection_status = CONNECTION_FAILED;
        connection_stats.last_failure_time = get_timestamp_ms();
        fprintf(stderr, "[Connection] Failed to connect to %s (device %d) after %d attempts\n", 
                device_name, device_type, connection_config.max_retries + 1);
        handler_trigger_error(ERROR_TRANSMISSION_FAILED, "Connection establishment failed");
        return -1;
    }
}

/**
 * @brief Verify connection to target device
 */
int connection_verify(void) {
    if (!connection_initialized) {
        return -1;
    }
    
    if (connection_status != CONNECTION_CONNECTED) {
        return -1;
    }
    
    /* Check if verification interval has passed */
    uint32_t current_time = get_timestamp_ms();
    if (current_time - last_verify_time < connection_config.verify_interval_ms) {
        return 0;  /* Still within verification interval */
    }
    
    connection_status = CONNECTION_VERIFYING;
    
    /* Send a test command to verify connection */
    if (connection_test(BUTTON_POWER) == 0) {
        connection_status = CONNECTION_CONNECTED;
        last_verify_time = current_time;
        connection_stats.last_success_time = current_time;
        connection_stats.quality = calculate_quality();
        return 0;
    } else {
        connection_status = CONNECTION_FAILED;
        connection_stats.last_failure_time = current_time;
        
        if (connection_config.auto_reconnect) {
            printf("[Connection] Connection lost, attempting reconnect...\n");
            return connection_reconnect();
        }
        
        return -1;
    }
}

/**
 * @brief Test connection by sending a test command
 */
int connection_test(unsigned char test_button) {
    if (!connection_initialized) {
        return -1;
    }
    
    /* Get IR code for test button */
    ir_code_t test_code = get_ir_code(test_button);
    if (test_code.code == 0) {
        return -1;
    }
    
    /* Send test command */
    int result = ir_send(test_code);
    
    if (result == 0) {
        connection_stats.successful_transmissions++;
    } else {
        connection_stats.failed_transmissions++;
    }
    
    connection_stats.total_transmissions++;
    connection_stats.quality = calculate_quality();
    
    return result;
}

/**
 * @brief Get current connection status
 */
connection_status_t connection_get_status(void) {
    return connection_status;
}

/**
 * @brief Get connection statistics
 */
connection_stats_t* connection_get_stats(void) {
    return &connection_stats;
}

/**
 * @brief Get connection quality
 */
connection_quality_t connection_get_quality(void) {
    connection_stats.quality = calculate_quality();
    return connection_stats.quality;
}

/**
 * @brief Check if connection is active
 */
int connection_is_connected(void) {
    if (connection_status == CONNECTION_CONNECTED) {
        /* Verify connection if configured */
        if (connection_config.verify_on_send) {
            return connection_verify() == 0;
        }
        return 1;
    }
    return 0;
}

/**
 * @brief Get currently connected device
 */
unsigned char connection_get_connected_device(void) {
    if (connection_status == CONNECTION_CONNECTED) {
        return connected_device;
    }
    return 0;
}

/**
 * @brief Reconnect to device
 */
int connection_reconnect(void) {
    if (!connection_initialized) {
        return -1;
    }
    
    if (connected_device == 0) {
        fprintf(stderr, "[Connection] No device to reconnect to\n");
        return -1;
    }
    
    printf("[Connection] Reconnecting to device %d...\n", connected_device);
    
    /* Disconnect first */
    connection_disconnect();
    
    /* Wait before reconnecting */
    delay_ms(connection_config.retry_delay_ms);
    
    /* Attempt to reconnect */
    return connection_establish(connected_device);
}

/**
 * @brief Disconnect from device
 */
void connection_disconnect(void) {
    if (connection_status == CONNECTION_DISCONNECTED) {
        return;
    }
    
    connection_status = CONNECTION_DISCONNECTED;
    connected_device = 0;
    printf("[Connection] Disconnected\n");
}

/**
 * @brief Send IR code with connection verification and retry
 */
int connection_send_with_retry(ir_code_t code) {
    if (!connection_initialized) {
        handler_trigger_error(ERROR_IR_NOT_INITIALIZED, "Connection system not initialized");
        return -1;
    }
    
    /* Verify connection if configured */
    if (connection_config.verify_on_send) {
        if (connection_verify() != 0) {
            if (connection_config.auto_reconnect) {
                if (connection_reconnect() != 0) {
                    handler_trigger_error(ERROR_TRANSMISSION_FAILED, "Connection lost and reconnect failed");
                    return -1;
                }
            } else {
                handler_trigger_error(ERROR_TRANSMISSION_FAILED, "Connection not verified");
                return -1;
            }
        }
    }
    
    /* Send with retry logic */
    int attempt;
    int result = -1;
    
    for (attempt = 0; attempt <= connection_config.max_retries; attempt++) {
        if (attempt > 0) {
            printf("[Connection] Retry attempt %d/%d\n", attempt, connection_config.max_retries);
            delay_ms(connection_config.retry_delay_ms);
        }
        
        result = ir_send(code);
        
        if (result == 0) {
            connection_stats.successful_transmissions++;
            connection_stats.total_transmissions++;
            connection_stats.last_success_time = get_timestamp_ms();
            connection_stats.quality = calculate_quality();
            return 0;
        } else {
            connection_stats.failed_transmissions++;
            connection_stats.retry_count++;
        }
    }
    
    connection_stats.total_transmissions++;
    connection_stats.last_failure_time = get_timestamp_ms();
    connection_stats.quality = calculate_quality();
    
    handler_trigger_error(ERROR_TRANSMISSION_FAILED, "IR transmission failed after retries");
    
    /* Auto-reconnect on failure if configured */
    if (connection_config.auto_reconnect && connection_status == CONNECTION_CONNECTED) {
        printf("[Connection] Transmission failed, attempting reconnect...\n");
        connection_reconnect();
    }
    
    return -1;
}

/**
 * @brief Reset connection statistics
 */
void connection_reset_stats(void) {
    memset(&connection_stats, 0, sizeof(connection_stats_t));
    connection_stats.quality = QUALITY_NONE;
    printf("[Connection] Statistics reset\n");
}

/**
 * @brief Cleanup connection management
 */
void connection_cleanup(void) {
    if (!connection_initialized) {
        return;
    }
    
    connection_disconnect();
    connection_initialized = 0;
    printf("[Connection] Connection management cleaned up\n");
}

