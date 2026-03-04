#ifndef IO_MODE_H
#define IO_MODE_H

#include <stdint.h>

/**
 * @file io_mode.h
 * @brief I/O mode management for interrupt-driven vs polling operations
 */

/* I/O Operation Modes */
typedef enum {
    IO_MODE_POLLING,          /* Software polling mode */
    IO_MODE_INTERRUPT,        /* Hardware interrupt-driven mode */
    IO_MODE_DMA,              /* DMA-based transfers */
    IO_MODE_HYBRID            /* Automatic selection based on constraints */
} io_mode_t;

/* I/O Operation Flags */
#define IO_FLAG_NON_BLOCKING  0x01  /* Non-blocking operation */
#define IO_FLAG_TIMING_CRITICAL 0x02  /* Timing-critical operation */
#define IO_FLAG_LOW_POWER     0x04  /* Low power mode */
#define IO_FLAG_HIGH_PRIORITY 0x08  /* High priority operation */

/* Timing Constraints */
typedef struct {
    uint32_t max_latency_us;      /* Maximum acceptable latency (microseconds) */
    uint32_t min_interval_us;     /* Minimum interval between operations */
    uint32_t timeout_us;          /* Operation timeout */
    uint8_t jitter_tolerance_us;  /* Acceptable timing jitter */
} timing_constraints_t;

/* I/O Configuration */
typedef struct {
    io_mode_t mode;                    /* I/O operation mode */
    uint8_t flags;                     /* Operation flags */
    timing_constraints_t timing;        /* Timing constraints */
    uint8_t interrupt_priority;        /* Interrupt priority (0-15) */
    uint8_t polling_interval_us;        /* Polling interval in microseconds */
    uint8_t use_dma;                   /* Use DMA if available */
} io_config_t;

/* I/O Operation Status */
typedef enum {
    IO_STATUS_IDLE,
    IO_STATUS_PENDING,
    IO_STATUS_IN_PROGRESS,
    IO_STATUS_COMPLETE,
    IO_STATUS_TIMEOUT,
    IO_STATUS_ERROR
} io_status_t;

/* I/O Operation Result */
typedef struct {
    io_status_t status;
    uint32_t actual_latency_us;    /* Actual operation latency */
    uint32_t timestamp_start;      /* Operation start timestamp */
    uint32_t timestamp_end;        /* Operation end timestamp */
    int error_code;                 /* Error code if failed */
} io_result_t;

/**
 * @brief Initialize I/O mode system
 * @return 0 on success, -1 on failure
 */
int io_mode_init(void);

/**
 * @brief Set I/O configuration
 * @param config I/O configuration structure
 * @return 0 on success, -1 on failure
 */
int io_mode_set_config(io_config_t* config);

/**
 * @brief Get current I/O configuration
 * @return Pointer to current configuration
 */
io_config_t* io_mode_get_config(void);

/**
 * @brief Select optimal I/O mode based on constraints
 * @param constraints Timing constraints
 * @param flags Operation flags
 * @return Recommended I/O mode
 */
io_mode_t io_mode_select_optimal(timing_constraints_t* constraints, uint8_t flags);

/**
 * @brief Check if interrupt mode is available
 * @return 1 if available, 0 if not
 */
int io_mode_interrupt_available(void);

/**
 * @brief Check if DMA mode is available
 * @return 1 if available, 0 if not
 */
int io_mode_dma_available(void);

/**
 * @brief Enable interrupt-driven I/O
 * @param priority Interrupt priority (0-15)
 * @return 0 on success, -1 on failure
 */
int io_mode_enable_interrupt(uint8_t priority);

/**
 * @brief Disable interrupt-driven I/O
 */
void io_mode_disable_interrupt(void);

/**
 * @brief Enable polling mode
 * @param interval_us Polling interval in microseconds
 * @return 0 on success, -1 on failure
 */
int io_mode_enable_polling(uint32_t interval_us);

/**
 * @brief Execute I/O operation with constraints
 * @param operation Function pointer to I/O operation
 * @param data Operation data
 * @param constraints Timing constraints
 * @param flags Operation flags
 * @return I/O operation result
 */
io_result_t io_mode_execute(
    int (*operation)(void*),
    void* data,
    timing_constraints_t* constraints,
    uint8_t flags
);

/**
 * @brief Wait for I/O operation completion (non-blocking check)
 * @param result I/O operation result
 * @param timeout_us Timeout in microseconds
 * @return 1 if complete, 0 if still pending, -1 on error
 */
int io_mode_wait_complete(io_result_t* result, uint32_t timeout_us);

/**
 * @brief Get I/O operation statistics
 * @param total_ops Total operations performed
 * @param interrupt_ops Operations using interrupts
 * @param polling_ops Operations using polling
 * @param avg_latency_us Average operation latency
 */
void io_mode_get_stats(uint32_t* total_ops, uint32_t* interrupt_ops, 
                       uint32_t* polling_ops, uint32_t* avg_latency_us);

/**
 * @brief Cleanup I/O mode system
 */
void io_mode_cleanup(void);

/* Default Configurations */
#define IO_DEFAULT_MODE            IO_MODE_HYBRID
#define IO_DEFAULT_MAX_LATENCY_US  1000      /* 1ms default max latency */
#define IO_DEFAULT_TIMEOUT_US      5000      /* 5ms default timeout */
#define IO_DEFAULT_POLLING_INTERVAL_US 100   /* 100us polling interval */
#define IO_DEFAULT_INTERRUPT_PRIORITY 5      /* Medium priority */

#endif /* IO_MODE_H */


