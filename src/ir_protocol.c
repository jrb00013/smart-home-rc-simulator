#include "../include/ir_codes.h"
#include "ir_asm.h"
#include <stdint.h>

/**
 * @file ir_protocol.c
 * @brief IR protocol implementation using assembly functions
 * 
 * This file implements RC5 and RC6 protocol encoding using
 * the assembly timing functions for precise control.
 */

/**
 * @brief Send RC5 protocol code
 * 
 * RC5 Protocol Format (14 bits):
 * - Start bits: 2 bits (always 1, 1)
 * - Toggle bit: 1 bit (toggles on each key press)
 * - Address: 5 bits (device address)
 * - Command: 6 bits (command code)
 */
void ir_send_rc5(uint16_t code) {
    uint8_t bit;
    int i;
    
    /* RC5 uses Manchester encoding: bit 0 = ON then OFF, bit 1 = OFF then ON */
    /* Send bits MSB first */
    for (i = 13; i >= 0; i--) {
        bit = (code >> i) & 0x01;
        ir_send_rc5_bit(bit);
    }
}

/**
 * @brief Send RC6 protocol code
 * 
 * RC6 Protocol Format (20 bits):
 * - Leader pulse: 2.666ms
 * - Leader space: 889us
 * - Start bit: 1 bit
 * - Mode: 3 bits
 * - Toggle: 1 bit
 * - Address: 8 bits
 * - Command: 8 bits
 */
void ir_send_rc6(uint32_t code) {
    uint8_t bit;
    int i;
    
    /* Send leader pulse */
    ir_led_on();
    delay_us(RC6_LEADER_PULSE);
    
    /* Send leader space */
    ir_led_off();
    delay_us(RC6_LEADER_SPACE);
    
    /* Send start bit (always 1) */
    ir_send_rc6_bit(1);
    
    /* Send remaining bits MSB first (19 bits) */
    for (i = 18; i >= 0; i--) {
        bit = (code >> i) & 0x01;
        ir_send_rc6_bit(bit);
    }
}

/**
 * @brief Convert 32-bit IR code to RC5 format
 * @param code 32-bit IR code
 * @return 14-bit RC5 code
 */
uint16_t ir_code_to_rc5(uint32_t code) {
    /* Extract relevant bits for RC5 */
    /* RC5: 14 bits total */
    uint16_t rc5 = 0;
    
    /* Start bits (always 1, 1) */
    rc5 |= (1 << 13);
    rc5 |= (1 << 12);
    
    /* Toggle bit (bit 11) - use bit 31 from code */
    if (code & 0x80000000) {
        rc5 |= (1 << 11);
    }
    
    /* Address (bits 10-6) - use bits 15-11 from code */
    rc5 |= ((code >> 11) & 0x1F) << 6;
    
    /* Command (bits 5-0) - use bits 5-0 from code */
    rc5 |= (code & 0x3F);
    
    return rc5;
}

/**
 * @brief Convert 32-bit IR code to RC6 format
 * @param code 32-bit IR code
 * @return 20-bit RC6 code
 */
uint32_t ir_code_to_rc6(uint32_t code) {
    /* RC6: 20 bits total */
    uint32_t rc6 = 0;
    
    /* Start bit (bit 19) - always 1 */
    rc6 |= (1 << 19);
    
    /* Mode (bits 18-16) - use bits 18-16 from code, default to 0 */
    rc6 |= ((code >> 16) & 0x07) << 16;
    
    /* Toggle (bit 15) - use bit 31 from code */
    if (code & 0x80000000) {
        rc6 |= (1 << 15);
    }
    
    /* Address (bits 14-7) - use bits 15-8 from code */
    rc6 |= ((code >> 8) & 0xFF) << 7;
    
    /* Command (bits 6-0) - use bits 6-0 from code */
    rc6 |= (code & 0x7F);
    
    return rc6;
}

/**
 * @brief Send NEC protocol code
 * 
 * NEC Protocol Format (32 bits):
 * - Leader pulse: 9ms
 * - Leader space: 4.5ms
 * - Address: 16 bits (LSB first)
 * - Command: 16 bits (LSB first, inverted)
 * - Repeat: 9ms pulse, 2.25ms space, 560us pulse
 */
void ir_send_nec(uint32_t code) {
    uint8_t bit;
    int i;
    uint16_t address = (code >> 16) & 0xFFFF;
    uint16_t command = code & 0xFFFF;
    
    /* Send leader pulse (9ms) */
    ir_led_on();
    delay_us(9000);
    
    /* Send leader space (4.5ms) */
    ir_led_off();
    delay_us(4500);
    
    /* Send address (16 bits, LSB first) */
    for (i = 0; i < 16; i++) {
        bit = (address >> i) & 0x01;
        ir_send_nec_bit(bit);
    }
    
    /* Send command (16 bits, LSB first) */
    for (i = 0; i < 16; i++) {
        bit = (command >> i) & 0x01;
        ir_send_nec_bit(bit);
    }
    
    /* Send stop bit */
    ir_led_on();
    delay_us(560);
    ir_led_off();
}

/**
 * @brief Send NEC protocol bit
 * @param bit Bit value (0 or 1)
 * 
 * NEC bit timing:
 * - Bit 0: 560us pulse, 560us space
 * - Bit 1: 560us pulse, 1690us space
 */
void ir_send_nec_bit(uint8_t bit) {
    ir_led_on();
    delay_us(560);  /* Pulse */
    ir_led_off();
    
    if (bit) {
        delay_us(1690);  /* Space for bit 1 */
    } else {
        delay_us(560);   /* Space for bit 0 */
    }
}

