#ifndef IR_ASM_H
#define IR_ASM_H

#include <stdint.h>

/**
 * @file ir_asm.h
 * @brief Assembly function declarations for IR transmission
 * 
 * These functions provide hardware-level control for precise IR timing
 * required by Phillips RC5/RC6 protocols.
 */

/* Timing Constants (in microseconds) */
#define RC5_BIT_TIME        889     /* RC5 bit time: 889us */
#define RC5_START_BIT_TIME  889     /* RC5 start bit: 889us */
#define RC5_REPEAT_DELAY    114000  /* RC5 repeat delay: 114ms */

#define RC6_BIT_TIME        444     /* RC6 bit time: 444us */
#define RC6_LEADER_PULSE    2666    /* RC6 leader pulse: 2.666ms */
#define RC6_LEADER_SPACE    889     /* RC6 leader space: 889us */
#define RC6_REPEAT_DELAY    108000  /* RC6 repeat delay: 108ms */

#define CARRIER_FREQ        38000   /* 38kHz carrier frequency */
#define CARRIER_PERIOD      26      /* Period in microseconds (1/38000 * 1000000) */

/**
 * @brief Precise microsecond delay (assembly implementation)
 * @param us Number of microseconds to delay
 * 
 * This function provides microsecond-level precision required for IR protocols.
 * Implementation varies by platform (x86, ARM, AVR).
 */
void delay_us(uint32_t us);

/**
 * @brief Generate 38kHz carrier burst
 * @param duration_us Duration of carrier burst in microseconds
 * 
 * Generates a 38kHz modulated signal for the specified duration.
 * Used to modulate IR data bits.
 */
void ir_carrier_burst(uint32_t duration_us);

/**
 * @brief Send RC5 protocol bit
 * @param bit Bit value (0 or 1)
 * 
 * Sends a single bit using RC5 protocol timing:
 * - Bit 0: 889us carrier ON, 889us carrier OFF
 * - Bit 1: 889us carrier OFF, 889us carrier ON
 */
void ir_send_rc5_bit(uint8_t bit);

/**
 * @brief Send RC6 protocol bit
 * @param bit Bit value (0 or 1)
 * 
 * Sends a single bit using RC6 protocol timing:
 * - Bit 0: 444us carrier ON, 444us carrier OFF
 * - Bit 1: 444us carrier OFF, 444us carrier ON
 */
void ir_send_rc6_bit(uint8_t bit);

/**
 * @brief Send RC5 protocol code
 * @param code 14-bit RC5 code
 * 
 * Sends complete RC5 command:
 * - Start bits (2 bits)
 * - Toggle bit (1 bit)
 * - Address (5 bits)
 * - Command (6 bits)
 */
void ir_send_rc5(uint16_t code);

/**
 * @brief Send RC6 protocol code
 * @param code 20-bit RC6 code
 * 
 * Sends complete RC6 command:
 * - Leader pulse (2.666ms)
 * - Leader space (889us)
 * - Start bit
 * - Mode bits (3 bits)
 * - Toggle bit (1 bit)
 * - Address (8 bits)
 * - Command (8 bits)
 */
void ir_send_rc6(uint32_t code);

/**
 * @brief Send NEC protocol code
 * @param code 32-bit NEC code
 * 
 * Sends complete NEC command:
 * - Leader pulse (9ms)
 * - Leader space (4.5ms)
 * - Address (16 bits, LSB first)
 * - Command (16 bits, LSB first, inverted)
 */
void ir_send_nec(uint32_t code);

/**
 * @brief Send NEC protocol bit
 * @param bit Bit value (0 or 1)
 * 
 * NEC bit timing:
 * - Bit 0: 560us pulse, 560us space
 * - Bit 1: 560us pulse, 1690us space
 */
void ir_send_nec_bit(uint8_t bit);

/**
 * @brief Convert 32-bit IR code to RC5 format
 * @param code 32-bit IR code
 * @return 14-bit RC5 code
 */
uint16_t ir_code_to_rc5(uint32_t code);

/**
 * @brief Convert 32-bit IR code to RC6 format
 * @param code 32-bit IR code
 * @return 20-bit RC6 code
 */
uint32_t ir_code_to_rc6(uint32_t code);

/**
 * @brief Turn IR LED ON (hardware-specific)
 */
void ir_led_on(void);

/**
 * @brief Turn IR LED OFF (hardware-specific)
 */
void ir_led_off(void);

/**
 * @brief Initialize IR hardware pins (hardware-specific)
 * @param pin GPIO pin number for IR LED
 * @return 0 on success, -1 on failure
 */
int ir_hw_init(uint8_t pin);

#endif /* IR_ASM_H */

