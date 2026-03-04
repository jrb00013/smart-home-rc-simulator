#include "../include/latency.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#ifdef _WIN32
    #include <windows.h>
#else
    #include <time.h>
    #include <sys/time.h>
#endif

/* Global latency statistics */
static latency_stats_t global_stats = {0};
static int latency_initialized = 0;

/**
 * @brief Get high-precision timestamp in microseconds
 */
uint64_t latency_get_timestamp_us(void) {
#ifdef _WIN32
    LARGE_INTEGER frequency, counter;
    QueryPerformanceFrequency(&frequency);
    QueryPerformanceCounter(&counter);
    return (uint64_t)(counter.QuadPart * 1000000ULL / frequency.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)(ts.tv_sec * 1000000ULL + ts.tv_nsec / 1000);
#endif
}

/**
 * @brief Initialize latency measurement system
 */
int latency_init(size_t max_samples) {
    if (latency_initialized) {
        return 0;
    }
    
    memset(&global_stats, 0, sizeof(latency_stats_t));
    
    if (max_samples > 0) {
        global_stats.samples = (latency_sample_t*)calloc(max_samples, sizeof(latency_sample_t));
        if (!global_stats.samples) {
            return -1;
        }
        global_stats.sample_capacity = max_samples;
    }
    
    global_stats.min_us = UINT32_MAX;
    latency_initialized = 1;
    
    return 0;
}

/**
 * @brief Cleanup latency measurement system
 */
void latency_cleanup(void) {
    if (!latency_initialized) {
        return;
    }
    
    if (global_stats.samples) {
        free(global_stats.samples);
        global_stats.samples = NULL;
    }
    
    memset(&global_stats, 0, sizeof(latency_stats_t));
    latency_initialized = 0;
}

/**
 * @brief Start a latency probe
 */
int latency_probe_start(latency_probe_t* probe, const char* name) {
    if (!probe || !latency_initialized) {
        return -1;
    }
    
    probe->start_time_us = latency_get_timestamp_us();
    probe->probe_name = name;
    probe->active = 1;
    probe->end_time_us = 0;
    
    return 0;
}

/**
 * @brief Stop a latency probe and record measurement
 */
uint32_t latency_probe_stop(latency_probe_t* probe, const char* operation, uint32_t code) {
    if (!probe || !probe->active || !latency_initialized) {
        return 0;
    }
    
    probe->end_time_us = latency_get_timestamp_us();
    uint32_t latency = latency_measure(probe->start_time_us, probe->end_time_us);
    
    latency_record(latency, operation ? operation : probe->probe_name, code);
    
    probe->active = 0;
    return latency;
}

/**
 * @brief Measure latency between two timestamps
 */
uint32_t latency_measure(uint64_t start_us, uint64_t end_us) {
    if (end_us < start_us) {
        return 0;  /* Clock wrap or invalid */
    }
    return (uint32_t)(end_us - start_us);
}

/**
 * @brief Record a latency sample
 */
int latency_record(uint32_t latency_us, const char* operation, uint32_t code) {
    if (!latency_initialized) {
        return -1;
    }
    
    /* Update global statistics */
    global_stats.count++;
    global_stats.sum_us += latency_us;
    
    if (latency_us < global_stats.min_us) {
        global_stats.min_us = latency_us;
    }
    if (latency_us > global_stats.max_us) {
        global_stats.max_us = latency_us;
    }
    
    global_stats.avg_us = (uint32_t)(global_stats.sum_us / global_stats.count);
    
    /* Store sample if buffer available */
    if (global_stats.samples && global_stats.sample_count < global_stats.sample_capacity) {
        latency_sample_t* sample = &global_stats.samples[global_stats.sample_count];
        sample->timestamp_us = latency_get_timestamp_us();
        sample->latency_us = latency_us;
        sample->operation = operation;
        sample->code = code;
        global_stats.sample_count++;
    }
    
    return 0;
}

/**
 * @brief Compare function for qsort (sort by latency)
 */
static int compare_latency(const void* a, const void* b) {
    const latency_sample_t* sa = (const latency_sample_t*)a;
    const latency_sample_t* sb = (const latency_sample_t*)b;
    if (sa->latency_us < sb->latency_us) return -1;
    if (sa->latency_us > sb->latency_us) return 1;
    return 0;
}

/**
 * @brief Calculate percentiles
 */
static void calculate_percentiles(latency_stats_t* stats) {
    if (!stats->samples || stats->sample_count == 0) {
        return;
    }
    
    /* Sort samples by latency */
    qsort(stats->samples, stats->sample_count, sizeof(latency_sample_t), compare_latency);
    
    /* Calculate percentiles */
    if (stats->sample_count > 0) {
        stats->p50_us = stats->samples[stats->sample_count / 2].latency_us;
    }
    if (stats->sample_count > 0) {
        size_t p95_idx = (size_t)(stats->sample_count * 0.95);
        if (p95_idx >= stats->sample_count) p95_idx = stats->sample_count - 1;
        stats->p95_us = stats->samples[p95_idx].latency_us;
    }
    if (stats->sample_count > 0) {
        size_t p99_idx = (size_t)(stats->sample_count * 0.99);
        if (p99_idx >= stats->sample_count) p99_idx = stats->sample_count - 1;
        stats->p99_us = stats->samples[p99_idx].latency_us;
    }
}

/**
 * @brief Get latency statistics
 */
int latency_get_stats(latency_stats_t* stats) {
    if (!stats || !latency_initialized) {
        return -1;
    }
    
    *stats = global_stats;
    calculate_percentiles(stats);
    
    return 0;
}

/**
 * @brief Get latency statistics for a specific operation
 */
int latency_get_stats_for_operation(const char* operation, latency_stats_t* stats) {
    if (!operation || !stats || !latency_initialized) {
        return -1;
    }
    
    memset(stats, 0, sizeof(latency_stats_t));
    stats->min_us = UINT32_MAX;
    
    if (!global_stats.samples) {
        return -1;
    }
    
    /* Filter samples by operation */
    for (size_t i = 0; i < global_stats.sample_count; i++) {
        const latency_sample_t* sample = &global_stats.samples[i];
        if (sample->operation && strcmp(sample->operation, operation) == 0) {
            stats->count++;
            stats->sum_us += sample->latency_us;
            
            if (sample->latency_us < stats->min_us) {
                stats->min_us = sample->latency_us;
            }
            if (sample->latency_us > stats->max_us) {
                stats->max_us = sample->latency_us;
            }
        }
    }
    
    if (stats->count > 0) {
        stats->avg_us = (uint32_t)(stats->sum_us / stats->count);
    }
    
    return 0;
}

/**
 * @brief Reset all latency statistics
 */
void latency_reset_stats(void) {
    if (!latency_initialized) {
        return;
    }
    
    global_stats.count = 0;
    global_stats.min_us = UINT32_MAX;
    global_stats.max_us = 0;
    global_stats.sum_us = 0;
    global_stats.avg_us = 0;
    global_stats.p50_us = 0;
    global_stats.p95_us = 0;
    global_stats.p99_us = 0;
    global_stats.sample_count = 0;
}

/**
 * @brief Print latency statistics
 */
void latency_print_stats(const latency_stats_t* stats) {
    if (!stats) {
        return;
    }
    
    printf("=== Latency Statistics ===\n");
    printf("Samples: %u\n", stats->count);
    
    if (stats->count > 0) {
        printf("Min:     %u us (%.3f ms)\n", stats->min_us, stats->min_us / 1000.0);
        printf("Max:     %u us (%.3f ms)\n", stats->max_us, stats->max_us / 1000.0);
        printf("Avg:     %u us (%.3f ms)\n", stats->avg_us, stats->avg_us / 1000.0);
        
        if (stats->sample_count > 0) {
            printf("P50:     %u us (%.3f ms)\n", stats->p50_us, stats->p50_us / 1000.0);
            printf("P95:     %u us (%.3f ms)\n", stats->p95_us, stats->p95_us / 1000.0);
            printf("P99:     %u us (%.3f ms)\n", stats->p99_us, stats->p99_us / 1000.0);
        }
    } else {
        printf("No samples recorded\n");
    }
    printf("\n");
}

/**
 * @brief Print all latency statistics
 */
void latency_print_all_stats(void) {
    latency_stats_t stats;
    if (latency_get_stats(&stats) == 0) {
        latency_print_stats(&stats);
    }
}

/**
 * @brief Get current average latency
 */
uint32_t latency_get_avg(void) {
    return global_stats.avg_us;
}

/**
 * @brief Get current maximum latency
 */
uint32_t latency_get_max(void) {
    return global_stats.max_us;
}

/**
 * @brief Get current minimum latency
 */
uint32_t latency_get_min(void) {
    return global_stats.min_us == UINT32_MAX ? 0 : global_stats.min_us;
}


