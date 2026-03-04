#ifndef LATENCY_H
#define LATENCY_H

#include <stdint.h>
#include <stddef.h>

/**
 * @file latency.h
 * @brief Latency measurement and optimization system
 * 
 * This module provides high-precision latency measurement for:
 * - Button press to IR transmission latency
 * - IR protocol encoding latency
 * - Universal TV multi-protocol latency
 * - Event handler latency
 * - Overall system latency
 */

/* Latency Measurement Structure */
typedef struct {
    uint64_t timestamp_us;      /* Timestamp in microseconds */
    uint32_t latency_us;        /* Measured latency in microseconds */
    const char* operation;      /* Operation name */
    uint32_t code;              /* Associated code/ID */
} latency_sample_t;

/* Latency Statistics */
typedef struct {
    uint32_t count;             /* Number of samples */
    uint32_t min_us;            /* Minimum latency (microseconds) */
    uint32_t max_us;            /* Maximum latency (microseconds) */
    uint64_t sum_us;            /* Sum of all latencies */
    uint32_t avg_us;            /* Average latency */
    uint32_t p50_us;            /* 50th percentile (median) */
    uint32_t p95_us;            /* 95th percentile */
    uint32_t p99_us;            /* 99th percentile */
    latency_sample_t* samples;   /* Sample buffer */
    size_t sample_capacity;     /* Maximum samples */
    size_t sample_count;        /* Current sample count */
} latency_stats_t;

/* Latency Probe Context */
typedef struct {
    uint64_t start_time_us;     /* Probe start time */
    uint64_t end_time_us;       /* Probe end time */
    const char* probe_name;     /* Probe identifier */
    int active;                 /* Is probe active */
} latency_probe_t;

/**
 * @brief Initialize latency measurement system
 * @param max_samples Maximum number of samples to store
 * @return 0 on success, -1 on failure
 */
int latency_init(size_t max_samples);

/**
 * @brief Cleanup latency measurement system
 */
void latency_cleanup(void);

/**
 * @brief Get current high-precision timestamp in microseconds
 * @return Timestamp in microseconds
 */
uint64_t latency_get_timestamp_us(void);

/**
 * @brief Start a latency probe
 * @param probe Probe context (must be allocated by caller)
 * @param name Probe name/identifier
 * @return 0 on success, -1 on failure
 */
int latency_probe_start(latency_probe_t* probe, const char* name);

/**
 * @brief Stop a latency probe and record measurement
 * @param probe Probe context
 * @param operation Operation name
 * @param code Associated code/ID
 * @return Measured latency in microseconds, or 0 on error
 */
uint32_t latency_probe_stop(latency_probe_t* probe, const char* operation, uint32_t code);

/**
 * @brief Measure latency between two timestamps
 * @param start_us Start timestamp
 * @param end_us End timestamp
 * @return Latency in microseconds
 */
uint32_t latency_measure(uint64_t start_us, uint64_t end_us);

/**
 * @brief Record a latency sample
 * @param latency_us Latency in microseconds
 * @param operation Operation name
 * @param code Associated code/ID
 * @return 0 on success, -1 on failure
 */
int latency_record(uint32_t latency_us, const char* operation, uint32_t code);

/**
 * @brief Get latency statistics
 * @param stats Output structure for statistics
 * @return 0 on success, -1 on failure
 */
int latency_get_stats(latency_stats_t* stats);

/**
 * @brief Get latency statistics for a specific operation
 * @param operation Operation name
 * @param stats Output structure for statistics
 * @return 0 on success, -1 on failure
 */
int latency_get_stats_for_operation(const char* operation, latency_stats_t* stats);

/**
 * @brief Reset all latency statistics
 */
void latency_reset_stats(void);

/**
 * @brief Print latency statistics
 * @param stats Statistics to print
 */
void latency_print_stats(const latency_stats_t* stats);

/**
 * @brief Print all latency statistics
 */
void latency_print_all_stats(void);

/**
 * @brief Get current average latency
 * @return Average latency in microseconds, or 0 if no samples
 */
uint32_t latency_get_avg(void);

/**
 * @brief Get current maximum latency
 * @return Maximum latency in microseconds, or 0 if no samples
 */
uint32_t latency_get_max(void);

/**
 * @brief Get current minimum latency
 * @return Minimum latency in microseconds, or 0 if no samples
 */
uint32_t latency_get_min(void);

/* Latency measurement macros for easy instrumentation */
#define LATENCY_PROBE_START(probe, name) \
    do { \
        latency_probe_start(&(probe), (name)); \
    } while(0)

#define LATENCY_PROBE_STOP(probe, op, code) \
    latency_probe_stop(&(probe), (op), (code))

#define LATENCY_MEASURE_START() \
    latency_get_timestamp_us()

#define LATENCY_MEASURE_END(start, op, code) \
    do { \
        uint64_t _end = latency_get_timestamp_us(); \
        uint32_t _lat = latency_measure((start), _end); \
        latency_record(_lat, (op), (code)); \
    } while(0)

#endif /* LATENCY_H */


