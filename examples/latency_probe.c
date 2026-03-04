/**
 * @file latency_probe.c
 * @brief Synthetic latency probe for testing and optimization
 * 
 * This synthetic probe measures latency across the entire remote control system:
 * - Button press to IR transmission
 * - IR protocol encoding
 * - Universal TV multi-protocol
 * - Event handler overhead
 * - Overall system latency
 * 
 * Compile with:
 *   gcc -I../include latency_probe.c ../src/latency.c ../src/handlers.c \
 *       ../src/ir_codes.c ../src/ir_protocol.c ../src/universal_tv.c \
 *       ../src/remote_control.c -o latency_probe
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/latency.h"
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"
#include "../include/universal_tv.h"
#include "../include/handlers.h"

/* Test configuration */
#define PROBE_ITERATIONS 100
#define PROBE_WARMUP 10

/**
 * @brief Synthetic probe: Button press latency
 */
void probe_button_press_latency(void) {
    printf("========================================\n");
    printf("Probe: Button Press Latency\n");
    printf("========================================\n");
    printf("Measuring latency from button press to IR transmission start...\n\n");
    
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote\n");
        return;
    }
    
    latency_probe_t probe;
    uint32_t latencies[PROBE_ITERATIONS];
    uint32_t sum = 0;
    uint32_t min = UINT32_MAX;
    uint32_t max = 0;
    
    /* Warmup */
    for (int i = 0; i < PROBE_WARMUP; i++) {
        remote_press_button(BUTTON_POWER);
    }
    
    /* Measure */
    for (int i = 0; i < PROBE_ITERATIONS; i++) {
        LATENCY_PROBE_START(probe, "button_press");
        remote_press_button(BUTTON_POWER);
        uint32_t lat = LATENCY_PROBE_STOP(probe, "button_press", BUTTON_POWER);
        
        latencies[i] = lat;
        sum += lat;
        if (lat < min) min = lat;
        if (lat > max) max = lat;
    }
    
    uint32_t avg = sum / PROBE_ITERATIONS;
    
    printf("Results (%d iterations):\n", PROBE_ITERATIONS);
    printf("  Min:  %u us (%.3f ms)\n", min, min / 1000.0);
    printf("  Max:  %u us (%.3f ms)\n", max, max / 1000.0);
    printf("  Avg:  %u us (%.3f ms)\n", avg, avg / 1000.0);
    printf("\n");
    
    remote_cleanup();
}

/**
 * @brief Synthetic probe: IR protocol encoding latency
 */
void probe_ir_protocol_latency(void) {
    printf("========================================\n");
    printf("Probe: IR Protocol Encoding Latency\n");
    printf("========================================\n");
    printf("Measuring latency for different IR protocols...\n\n");
    
    if (ir_init() != 0) {
        fprintf(stderr, "Failed to initialize IR\n");
        return;
    }
    
    latency_probe_t probe;
    ir_code_t codes[] = {
        {0x20DF10EF, IR_PROTOCOL_NEC, 38000, 1},
        {0x0C, IR_PROTOCOL_RC5, 38000, 1},
        {0x800F040C, IR_PROTOCOL_RC6, 38000, 1}
    };
    
    const char* protocol_names[] = {"NEC", "RC5", "RC6"};
    
    for (int p = 0; p < 3; p++) {
        uint32_t sum = 0;
        uint32_t min = UINT32_MAX;
        uint32_t max = 0;
        
        printf("Protocol: %s\n", protocol_names[p]);
        
        for (int i = 0; i < PROBE_ITERATIONS; i++) {
            LATENCY_PROBE_START(probe, "ir_protocol");
            ir_send(codes[p]);
            uint32_t lat = LATENCY_PROBE_STOP(probe, "ir_protocol", codes[p].protocol);
            
            sum += lat;
            if (lat < min) min = lat;
            if (lat > max) max = lat;
        }
        
        uint32_t avg = sum / PROBE_ITERATIONS;
        printf("  Min:  %u us (%.3f ms)\n", min, min / 1000.0);
        printf("  Max:  %u us (%.3f ms)\n", max, max / 1000.0);
        printf("  Avg:  %u us (%.3f ms)\n", avg, avg / 1000.0);
        printf("\n");
    }
    
    ir_cleanup();
}

/**
 * @brief Synthetic probe: Universal TV multi-protocol latency
 */
void probe_universal_tv_latency(void) {
    printf("========================================\n");
    printf("Probe: Universal TV Multi-Protocol Latency\n");
    printf("========================================\n");
    printf("Measuring latency for universal TV multi-protocol mode...\n\n");
    
    if (universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL) != 0) {
        fprintf(stderr, "Failed to initialize universal TV\n");
        return;
    }
    
    latency_probe_t probe;
    uint32_t sum = 0;
    uint32_t min = UINT32_MAX;
    uint32_t max = 0;
    
    /* Warmup */
    for (int i = 0; i < PROBE_WARMUP; i++) {
        universal_tv_send_button(BUTTON_POWER);
    }
    
    /* Measure */
    for (int i = 0; i < PROBE_ITERATIONS; i++) {
        LATENCY_PROBE_START(probe, "universal_tv");
        universal_tv_send_button(BUTTON_POWER);
        uint32_t lat = LATENCY_PROBE_STOP(probe, "universal_tv", BUTTON_POWER);
        
        sum += lat;
        if (lat < min) min = lat;
        if (lat > max) max = lat;
    }
    
    uint32_t avg = sum / PROBE_ITERATIONS;
    
    printf("Results (%d iterations):\n", PROBE_ITERATIONS);
    printf("  Min:  %u us (%.3f ms)\n", min, min / 1000.0);
    printf("  Max:  %u us (%.3f ms)\n", max, max / 1000.0);
    printf("  Avg:  %u us (%.3f ms)\n", avg, avg / 1000.0);
    printf("  Note: Multi-protocol mode sends multiple codes, so latency is higher\n");
    printf("\n");
    
    universal_tv_cleanup();
}

/**
 * @brief Synthetic probe: Event handler overhead
 */
void probe_event_handler_latency(void) {
    printf("========================================\n");
    printf("Probe: Event Handler Overhead\n");
    printf("========================================\n");
    printf("Measuring latency added by event handlers...\n\n");
    
    if (handler_init() != 0) {
        fprintf(stderr, "Failed to initialize handlers\n");
        return;
    }
    
    /* Register a minimal handler */
    int handler_called = 0;
    int on_button(unsigned char code, const char* name) {
        (void)code;
        (void)name;
        handler_called++;
        return HANDLER_SUCCESS;
    }
    
    handler_register_button_pressed(on_button);
    
    latency_probe_t probe;
    uint32_t sum = 0;
    uint32_t min = UINT32_MAX;
    uint32_t max = 0;
    
    /* Measure with handlers */
    for (int i = 0; i < PROBE_ITERATIONS; i++) {
        LATENCY_PROBE_START(probe, "event_handler");
        handler_trigger_button_pressed(BUTTON_POWER);
        uint32_t lat = LATENCY_PROBE_STOP(probe, "event_handler", BUTTON_POWER);
        
        sum += lat;
        if (lat < min) min = lat;
        if (lat > max) max = lat;
    }
    
    uint32_t avg = sum / PROBE_ITERATIONS;
    
    printf("Results (%d iterations):\n", PROBE_ITERATIONS);
    printf("  Min:  %u us (%.3f ms)\n", min, min / 1000.0);
    printf("  Max:  %u us (%.3f ms)\n", max, max / 1000.0);
    printf("  Avg:  %u us (%.3f ms)\n", avg, avg / 1000.0);
    printf("  Handler calls: %d\n", handler_called);
    printf("\n");
    
    handler_cleanup();
}

/**
 * @brief Synthetic probe: End-to-end latency
 */
void probe_end_to_end_latency(void) {
    printf("========================================\n");
    printf("Probe: End-to-End Latency\n");
    printf("========================================\n");
    printf("Measuring complete latency from button press to IR completion...\n\n");
    
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote\n");
        return;
    }
    
    latency_probe_t probe;
    uint32_t latencies[PROBE_ITERATIONS];
    uint32_t sum = 0;
    uint32_t min = UINT32_MAX;
    uint32_t max = 0;
    
    /* Warmup */
    for (int i = 0; i < PROBE_WARMUP; i++) {
        remote_press_button(BUTTON_POWER);
    }
    
    /* Measure end-to-end */
    for (int i = 0; i < PROBE_ITERATIONS; i++) {
        LATENCY_PROBE_START(probe, "end_to_end");
        remote_press_button(BUTTON_POWER);
        uint32_t lat = LATENCY_PROBE_STOP(probe, "end_to_end", BUTTON_POWER);
        
        latencies[i] = lat;
        sum += lat;
        if (lat < min) min = lat;
        if (lat > max) max = lat;
    }
    
    /* Calculate percentiles */
    int compare_uint32(const void* a, const void* b) {
        uint32_t va = *(const uint32_t*)a;
        uint32_t vb = *(const uint32_t*)b;
        if (va < vb) return -1;
        if (va > vb) return 1;
        return 0;
    }
    qsort(latencies, PROBE_ITERATIONS, sizeof(uint32_t), compare_uint32);
    uint32_t p50 = latencies[PROBE_ITERATIONS / 2];
    uint32_t p95 = latencies[(int)(PROBE_ITERATIONS * 0.95)];
    uint32_t p99 = latencies[(int)(PROBE_ITERATIONS * 0.99)];
    
    uint32_t avg = sum / PROBE_ITERATIONS;
    
    printf("Results (%d iterations):\n", PROBE_ITERATIONS);
    printf("  Min:  %u us (%.3f ms)\n", min, min / 1000.0);
    printf("  Max:  %u us (%.3f ms)\n", max, max / 1000.0);
    printf("  Avg:  %u us (%.3f ms)\n", avg, avg / 1000.0);
    printf("  P50:  %u us (%.3f ms)\n", p50, p50 / 1000.0);
    printf("  P95:  %u us (%.3f ms)\n", p95, p95 / 1000.0);
    printf("  P99:  %u us (%.3f ms)\n", p99, p99 / 1000.0);
    printf("\n");
    
    remote_cleanup();
}

int main(void) {
    printf("=== Synthetic Latency Probe ===\n\n");
    
    /* Initialize latency measurement */
    if (latency_init(1000) != 0) {
        fprintf(stderr, "Failed to initialize latency measurement\n");
        return 1;
    }
    
    printf("Running synthetic latency probes...\n");
    printf("Iterations per probe: %d (warmup: %d)\n\n", PROBE_ITERATIONS, PROBE_WARMUP);
    
    /* Run all probes */
    probe_button_press_latency();
    probe_ir_protocol_latency();
    probe_universal_tv_latency();
    probe_event_handler_latency();
    probe_end_to_end_latency();
    
    /* Print overall statistics */
    printf("========================================\n");
    printf("Overall Latency Statistics\n");
    printf("========================================\n");
    latency_print_all_stats();
    
    /* Print per-operation statistics */
    printf("========================================\n");
    printf("Per-Operation Statistics\n");
    printf("========================================\n");
    
    const char* operations[] = {
        "button_press",
        "ir_protocol",
        "universal_tv",
        "event_handler",
        "end_to_end"
    };
    
    for (int i = 0; i < 5; i++) {
        latency_stats_t stats;
        if (latency_get_stats_for_operation(operations[i], &stats) == 0 && stats.count > 0) {
            printf("\nOperation: %s\n", operations[i]);
            latency_print_stats(&stats);
        }
    }
    
    /* Cleanup */
    latency_cleanup();
    
    printf("=== Probe Complete ===\n");
    printf("Use these measurements to identify and optimize latency bottlenecks.\n");
    
    return 0;
}

