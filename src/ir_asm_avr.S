/**
 * @file ir_asm_avr.S
 * @brief AVR assembly implementation for IR transmission
 * 
 * This file contains assembly routines for precise timing and IR protocol
 * encoding on AVR microcontrollers (Arduino, ATmega, etc.).
 * 
 * Compile with: avr-gcc -c ir_asm_avr.S -o ir_asm_avr.o
 * 
 * Note: AVR timing is clock-dependent. Adjust F_CPU define for your clock speed.
 */

#ifdef __AVR__

#include <avr/io.h>

    .text
    .global delay_us
    .global ir_carrier_burst
    .global ir_send_rc5_bit
    .global ir_led_on
    .global ir_led_off

    /* Define IR LED pin (adjust for your hardware) */
    #ifndef IR_LED_PORT
    #define IR_LED_PORT PORTB
    #endif
    #ifndef IR_LED_PIN
    #define IR_LED_PIN 0
    #endif
    #ifndef IR_LED_DDR
    #define IR_LED_DDR DDRB
    #endif

    /* CPU frequency (adjust for your AVR) */
    #ifndef F_CPU
    #define F_CPU 16000000UL  /* 16MHz default */
    #endif

    /* Calculate cycles per microsecond */
    #define CYCLES_PER_US (F_CPU / 1000000UL)

delay_us:
    /* void delay_us(uint16_t us) */
    /* Input: r24:r25 = us (16-bit, but typically only r24 used for < 256us) */
    /* 
     * Timing: Each loop iteration = 4 cycles
     * Total cycles needed = us * CYCLES_PER_US
     * Loop iterations = (us * CYCLES_PER_US) / 4
     */
    push r18
    push r19
    
    /* Load us into r18 */
    mov r18, r24
    
    /* Calculate loop count: (us * CYCLES_PER_US) / 4 */
    ldi r19, CYCLES_PER_US / 4
    mul r18, r19
    mov r18, r0              /* r18 = loop counter (low byte) */
    
delay_loop:
    nop                      /* 1 cycle */
    nop                      /* 1 cycle */
    dec r18                  /* 1 cycle */
    brne delay_loop          /* 2 cycles (1 if not branching) */
    /* Total: 4 cycles per iteration */
    
    pop r19
    pop r18
    ret

ir_carrier_burst:
    /* void ir_carrier_burst(uint16_t duration_us) */
    /* Input: r24:r25 = duration_us */
    push r18
    push r19
    push r20
    push r21
    
    mov r18, r24             /* duration_us */
    
    /* Calculate number of carrier cycles: duration_us / 26 */
    ldi r19, 26              /* CARRIER_PERIOD = 26us */
    mov r20, r18
    clr r21
    /* Simple division: r20 = r20 / r19 */
    /* For small values, use repeated subtraction */
    
    mov r21, r20             /* Save original */
    clr r20
carrier_div_loop:
    sub r21, r19
    brcs carrier_div_done
    inc r20
    rjmp carrier_div_loop
carrier_div_done:
    mov r18, r20             /* r18 = number of cycles */
    
carrier_loop:
    rcall ir_led_on
    ldi r24, 13              /* Half period = 13us */
    rcall delay_us
    rcall ir_led_off
    ldi r24, 13              /* Half period = 13us */
    rcall delay_us
    
    dec r18
    brne carrier_loop
    
    pop r21
    pop r20
    pop r19
    pop r18
    ret

ir_send_rc5_bit:
    /* void ir_send_rc5_bit(uint8_t bit) */
    /* Input: r24 = bit (0 or 1) */
    push r18
    
    tst r24                  /* Test if bit is 0 */
    breq rc5_bit_0
    
    /* Bit 1: OFF then ON */
    rcall ir_led_off
    ldi r24, 0x79            /* 889 = 0x0379, use low byte approximation */
    ldi r25, 0x03            /* High byte */
    rcall delay_us
    rcall ir_led_on
    ldi r24, 0x79
    ldi r25, 0x03
    rcall delay_us
    rjmp rc5_bit_done
    
rc5_bit_0:
    /* Bit 0: ON then OFF */
    rcall ir_led_on
    ldi r24, 0x79            /* 889us */
    ldi r25, 0x03
    rcall delay_us
    rcall ir_led_off
    ldi r24, 0x79
    ldi r25, 0x03
    rcall delay_us
    
rc5_bit_done:
    pop r18
    ret

ir_led_on:
    /* void ir_led_on(void) */
    /* Set IR LED pin high */
    sbi IR_LED_PORT, IR_LED_PIN
    ret

ir_led_off:
    /* void ir_led_off(void) */
    /* Set IR LED pin low */
    cbi IR_LED_PORT, IR_LED_PIN
    ret

ir_hw_init:
    /* int ir_hw_init(uint8_t pin) */
    /* Input: r24 = pin number */
    /* Configure pin as output */
    sbi IR_LED_DDR, IR_LED_PIN
    cbi IR_LED_PORT, IR_LED_PIN  /* Start with LED off */
    clr r24                    /* Return 0 (success) */
    ret

#endif /* __AVR__ */


