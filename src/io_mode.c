#define _POSIX_C_SOURCE 199309L
#include "../include/io_mode.h"
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

/* I/O Mode State */
static io_config_t io_config = {
    .mode = IO_DEFAULT_MODE,
    .flags = 0,
    .timing = {
        .max_latency_us = IO_DEFAULT_MAX_LATENCY_US,
        .min_interval_us = 0,
        .timeout_us = IO_DEFAULT_TIMEOUT_US,
        .jitter_tolerance_us = 50
    },
    .interrupt_priority = IO_DEFAULT_INTERRUPT_PRIORITY,
    .polling_interval_us = IO_DEFAULT_POLLING_INTERVAL_US,
    .use_dma = 0
};

static int io_mode_initialized = 0;
static int interrupt_enabled = 0;
static int dma_available = 0;

/* Statistics */
static uint32_t total_operations = 0;
static uint32_t interrupt_operations = 0;
static uint32_t polling_operations = 0;
static uint32_t total_latency_us = 0;

/**
 * @brief Get current timestamp in microseconds
 */
static uint32_t get_timestamp_us(void) {
#ifdef _WIN32
    LARGE_INTEGER frequency, counter;
    QueryPerformanceFrequency(&frequency);
    QueryPerformanceCounter(&counter);
    return (uint32_t)(counter.QuadPart * 1000000ULL / frequency.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)(ts.tv_sec * 1000000ULL + ts.tv_nsec / 1000);
#endif
}

/**
 * @brief Initialize I/O mode system
 */
int io_mode_init(void) {
    if (io_mode_initialized) {
        return 0;
    }
    
    /* Detect available I/O modes */
    interrupt_enabled = io_mode_interrupt_available();
    dma_available = io_mode_dma_available();
    
    /* Reset statistics */
    total_operations = 0;
    interrupt_operations = 0;
    polling_operations = 0;
    total_latency_us = 0;
    
    printf("[IO Mode] I/O mode system initialized\n");
    printf("[IO Mode] Interrupt mode: %s\n", interrupt_enabled ? "Available" : "Not available");
    printf("[IO Mode] DMA mode: %s\n", dma_available ? "Available" : "Not available");
    
    io_mode_initialized = 1;
    return 0;
}

/**
 * @brief Set I/O configuration
 */
int io_mode_set_config(io_config_t* config) {
    if (config == NULL) {
        return -1;
    }
    
    /* Validate configuration */
    if (config->mode == IO_MODE_INTERRUPT && !interrupt_enabled) {
        fprintf(stderr, "[IO Mode] Warning: Interrupt mode not available, using polling\n");
        config->mode = IO_MODE_POLLING;
    }
    
    if (config->mode == IO_MODE_DMA && !dma_available) {
        fprintf(stderr, "[IO Mode] Warning: DMA mode not available, using polling\n");
        config->mode = IO_MODE_POLLING;
    }
    
    io_config = *config;
    printf("[IO Mode] Configuration updated: Mode=%d, Flags=0x%02X\n", 
           io_config.mode, io_config.flags);
    
    return 0;
}

/**
 * @brief Get current I/O configuration
 */
io_config_t* io_mode_get_config(void) {
    return &io_config;
}

/**
 * @brief Select optimal I/O mode based on constraints
 */
io_mode_t io_mode_select_optimal(timing_constraints_t* constraints, uint8_t flags) {
    if (constraints == NULL) {
        return io_config.mode;
    }
    
    /* If timing is critical and interrupts available, use interrupts */
    if ((flags & IO_FLAG_TIMING_CRITICAL) && interrupt_enabled) {
        if (constraints->max_latency_us < 100) {
            return IO_MODE_INTERRUPT;  /* Very tight timing requires interrupts */
        }
    }
    
    /* If low power mode, prefer polling */
    if (flags & IO_FLAG_LOW_POWER) {
        return IO_MODE_POLLING;
    }
    
    /* If DMA available and high throughput needed */
    if (dma_available && (flags & IO_FLAG_HIGH_PRIORITY)) {
        return IO_MODE_DMA;
    }
    
    /* Default to hybrid mode */
    return IO_MODE_HYBRID;
}

/**
 * @brief Check if interrupt mode is available
 */
int io_mode_interrupt_available(void) {
    /* In real implementation, check hardware capabilities */
    /* For now, assume available on embedded platforms */
#ifdef __AVR__
    return 1;  /* AVR has interrupts */
#elif defined(__arm__) || defined(__aarch64__)
    return 1;  /* ARM has interrupts */
#else
    return 0;  /* PC simulation - no hardware interrupts */
#endif
}

/**
 * @brief Check if DMA mode is available
 */
int io_mode_dma_available(void) {
    /* In real implementation, check hardware capabilities */
    /* For now, assume not available (would need hardware-specific code) */
    return 0;
}

/**
 * @brief Enable interrupt-driven I/O
 */
int io_mode_enable_interrupt(uint8_t priority) {
    if (!interrupt_enabled) {
        fprintf(stderr, "[IO Mode] Error: Interrupt mode not available\n");
        return -1;
    }
    
    io_config.mode = IO_MODE_INTERRUPT;
    io_config.interrupt_priority = priority;
    interrupt_enabled = 1;
    
    printf("[IO Mode] Interrupt mode enabled (priority: %d)\n", priority);
    return 0;
}

/**
 * @brief Disable interrupt-driven I/O
 */
void io_mode_disable_interrupt(void) {
    io_config.mode = IO_MODE_POLLING;
    interrupt_enabled = 0;
    printf("[IO Mode] Interrupt mode disabled, using polling\n");
}

/**
 * @brief Enable polling mode
 */
int io_mode_enable_polling(uint32_t interval_us) {
    io_config.mode = IO_MODE_POLLING;
    io_config.polling_interval_us = interval_us;
    printf("[IO Mode] Polling mode enabled (interval: %u us)\n", interval_us);
    return 0;
}

/**
 * @brief Execute I/O operation with constraints
 */
io_result_t io_mode_execute(
    int (*operation)(void*),
    void* data,
    timing_constraints_t* constraints,
    uint8_t flags
) {
    io_result_t result = {0};
    result.status = IO_STATUS_PENDING;
    
    if (operation == NULL) {
        result.status = IO_STATUS_ERROR;
        result.error_code = -1;
        return result;
    }
    
    /* Select I/O mode if hybrid */
    io_mode_t mode = io_config.mode;
    if (mode == IO_MODE_HYBRID) {
        mode = io_mode_select_optimal(constraints, flags);
    }
    
    /* Record start time */
    result.timestamp_start = get_timestamp_us();
    result.status = IO_STATUS_IN_PROGRESS;
    
    /* Execute operation based on mode */
    if (mode == IO_MODE_INTERRUPT && interrupt_enabled) {
        /* Interrupt-driven operation */
        interrupt_operations++;
        /* In real implementation, this would set up interrupt and return */
        /* For now, execute directly but mark as interrupt mode */
        int op_result = operation(data);
        result.timestamp_end = get_timestamp_us();
        result.actual_latency_us = result.timestamp_end - result.timestamp_start;
        
        if (op_result == 0) {
            result.status = IO_STATUS_COMPLETE;
        } else {
            result.status = IO_STATUS_ERROR;
            result.error_code = op_result;
        }
    } else {
        /* Polling mode operation */
        polling_operations++;
        
        /* Check timing constraints */
        uint32_t timeout = constraints ? constraints->timeout_us : io_config.timing.timeout_us;
        
        int op_result = operation(data);
        result.timestamp_end = get_timestamp_us();
        result.actual_latency_us = result.timestamp_end - result.timestamp_start;
        
        /* Check timeout */
        if (result.actual_latency_us > timeout) {
            result.status = IO_STATUS_TIMEOUT;
            result.error_code = -1;
        } else if (op_result == 0) {
            result.status = IO_STATUS_COMPLETE;
        } else {
            result.status = IO_STATUS_ERROR;
            result.error_code = op_result;
        }
    }
    
    /* Update statistics */
    total_operations++;
    total_latency_us += result.actual_latency_us;
    
    /* Check latency constraints */
    if (constraints && result.actual_latency_us > constraints->max_latency_us) {
        fprintf(stderr, "[IO Mode] Warning: Operation exceeded max latency (%u > %u us)\n",
                result.actual_latency_us, constraints->max_latency_us);
    }
    
    return result;
}

/**
 * @brief Wait for I/O operation completion (non-blocking check)
 */
int io_mode_wait_complete(io_result_t* result, uint32_t timeout_us) {
    if (result == NULL) {
        return -1;
    }
    
    if (result->status == IO_STATUS_COMPLETE) {
        return 1;  /* Already complete */
    }
    
    if (result->status == IO_STATUS_ERROR || result->status == IO_STATUS_TIMEOUT) {
        return -1;  /* Failed */
    }
    
    /* Check if timeout has elapsed */
    uint32_t current_time = get_timestamp_us();
    uint32_t elapsed = current_time - result->timestamp_start;
    
    if (elapsed > timeout_us) {
        result->status = IO_STATUS_TIMEOUT;
        return -1;
    }
    
    return 0;  /* Still pending */
}

/**
 * @brief Get I/O operation statistics
 */
void io_mode_get_stats(uint32_t* total_ops, uint32_t* interrupt_ops, 
                       uint32_t* polling_ops, uint32_t* avg_latency_us) {
    if (total_ops) *total_ops = total_operations;
    if (interrupt_ops) *interrupt_ops = interrupt_operations;
    if (polling_ops) *polling_ops = polling_operations;
    if (avg_latency_us) {
        *avg_latency_us = total_operations > 0 ? total_latency_us / total_operations : 0;
    }
}

/**
 * @brief Cleanup I/O mode system
 */
void io_mode_cleanup(void) {
    if (!io_mode_initialized) {
        return;
    }
    
    io_mode_disable_interrupt();
    io_mode_initialized = 0;
    printf("[IO Mode] I/O mode system cleaned up\n");
}

