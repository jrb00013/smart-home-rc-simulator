#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include "../include/ir_codes.h"
#include "../include/platform.h"
#include "ir_asm.h"
#include <stdint.h>

/**
 * @file ir_asm_c.c
 * @brief C fallback implementation for IR assembly functions
 * 
 * This file provides C implementations of the assembly functions
 * for platforms that don't have assembly support or for simulation.
 * 
 * Note: Timing precision is limited compared to assembly implementations.
 */

#if !USE_ASM_IR || defined(IR_USE_C_FALLBACK)

#include "time_util.h"

/* Simulated LED state and optional waveform trace hook */
static int ir_led_level = 0;
static ir_trace_hook_t ir_trace_hook = 0;

void ir_set_trace_hook(ir_trace_hook_t hook) {
    ir_trace_hook = hook;
}

/* Sleep-based delay (adequate for simulation; real hardware needs a timer).
 * With a trace hook installed the delay is reported instead of slept, which
 * lets tests decode the generated waveform in virtual time. */
void delay_us(uint32_t us) {
    if (ir_trace_hook) {
        ir_trace_hook(ir_led_level, us);
        return;
    }
    tu_sleep_us(us);
}

void ir_carrier_burst(uint32_t duration_us) {
    uint32_t cycles = duration_us / CARRIER_PERIOD;
    uint32_t i;
    
    for (i = 0; i < cycles; i++) {
        ir_led_on();
        delay_us(CARRIER_PERIOD / 2);
        ir_led_off();
        delay_us(CARRIER_PERIOD / 2);
    }
}

void ir_send_rc5_bit(uint8_t bit) {
    if (bit) {
        /* Bit 1: OFF then ON */
        ir_led_off();
        delay_us(RC5_BIT_TIME);
        ir_led_on();
        delay_us(RC5_BIT_TIME);
    } else {
        /* Bit 0: ON then OFF */
        ir_led_on();
        delay_us(RC5_BIT_TIME);
        ir_led_off();
        delay_us(RC5_BIT_TIME);
    }
}

void ir_send_rc6_bit(uint8_t bit) {
    /* RC6 uses the opposite Manchester convention to RC5 */
    if (bit) {
        /* Bit 1: ON then OFF */
        ir_led_on();
        delay_us(RC6_BIT_TIME);
        ir_led_off();
        delay_us(RC6_BIT_TIME);
    } else {
        /* Bit 0: OFF then ON */
        ir_led_off();
        delay_us(RC6_BIT_TIME);
        ir_led_on();
        delay_us(RC6_BIT_TIME);
    }
}

void ir_led_on(void) {
    /* Platform-specific GPIO control goes here; simulation tracks the level */
    ir_led_level = 1;
}

void ir_led_off(void) {
    /* Platform-specific GPIO control goes here; simulation tracks the level */
    ir_led_level = 0;
}

int ir_hw_init(uint8_t pin) {
    /* Platform-specific GPIO initialization */
    /* For simulation, this is a no-op */
    /* TODO: Implement hardware-specific GPIO initialization */
    (void)pin;  /* Suppress unused parameter warning */
    return 0;
}

#endif /* !USE_ASM_IR || IR_USE_C_FALLBACK */

