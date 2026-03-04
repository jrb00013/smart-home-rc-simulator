/**
 * @file ir_asm_x86.S
 * @brief x86/x86-64 assembly implementation for IR transmission
 * 
 * This file contains assembly routines for precise timing and IR protocol
 * encoding on x86/x86-64 platforms (PC, embedded x86 systems).
 */

/* Match include/ir_asm.h - do not include C header in assembly */
#ifndef CARRIER_PERIOD
#define CARRIER_PERIOD 26
#endif

#if defined(__x86_64__) || defined(_M_X64)
    /* x86-64 implementation */
    .text
    .globl delay_us
    .globl ir_carrier_burst
    .globl ir_send_rc5_bit
    .globl ir_led_on
    .globl ir_led_off

    /* CPU frequency-dependent delay calculation */
    /* Assuming ~2.4GHz CPU: 1 cycle = ~0.417ns, 1us = ~2400 cycles */
    #define CYCLES_PER_US 2400

delay_us:
    /* void delay_us(uint32_t us) */
    /* Input: %edi = us (microseconds) */
    pushq %rbx
    movl %edi, %ebx          /* Save us in %ebx */
    
    /* Calculate total cycles: us * CYCLES_PER_US */
    movl $CYCLES_PER_US, %eax
    mull %ebx                /* %eax = us * CYCLES_PER_US */
    movl %eax, %ecx          /* %ecx = loop counter */
    
    /* Delay loop */
delay_loop:
    pause                    /* CPU pause instruction for power efficiency */
    decl %ecx
    jnz delay_loop
    
    popq %rbx
    ret

ir_carrier_burst:
    /* void ir_carrier_burst(uint32_t duration_us) */
    /* Input: %edi = duration_us */
    pushq %rbx
    pushq %r12
    
    movl %edi, %ebx          /* duration_us */
    movl $CARRIER_PERIOD, %r12d  /* Period = 26us for 38kHz */
    
    /* Calculate number of carrier cycles */
    movl %ebx, %eax
    xorl %edx, %edx
    divl %r12d               /* %eax = duration_us / CARRIER_PERIOD */
    movl %eax, %ecx          /* %ecx = number of cycles */
    
carrier_loop:
    /* Turn LED ON */
    call ir_led_on
    movl $13, %edi           /* Half period = 13us */
    call delay_us
    
    /* Turn LED OFF */
    call ir_led_off
    movl $13, %edi           /* Half period = 13us */
    call delay_us
    
    decl %ecx
    jnz carrier_loop
    
    popq %r12
    popq %rbx
    ret

ir_send_rc5_bit:
    /* void ir_send_rc5_bit(uint8_t bit) */
    /* Input: %dil = bit (0 or 1) */
    pushq %rbx
    
    testb %dil, %dil         /* Test if bit is 0 */
    jz rc5_bit_0
    
    /* Bit 1: OFF then ON */
    call ir_led_off
    movl $889, %edi          /* 889us OFF */
    call delay_us
    call ir_led_on
    movl $889, %edi          /* 889us ON */
    call delay_us
    jmp rc5_bit_done
    
rc5_bit_0:
    /* Bit 0: ON then OFF */
    call ir_led_on
    movl $889, %edi          /* 889us ON */
    call delay_us
    call ir_led_off
    movl $889, %edi          /* 889us OFF */
    call delay_us
    
rc5_bit_done:
    popq %rbx
    ret

ir_led_on:
    /* void ir_led_on(void) */
    /* TODO: Platform-specific GPIO control */
    /* For PC simulation, this is a no-op */
    /* For embedded: Set GPIO pin high */
    ret

ir_led_off:
    /* void ir_led_off(void) */
    /* TODO: Platform-specific GPIO control */
    /* For PC simulation, this is a no-op */
    /* For embedded: Set GPIO pin low */
    ret

#elif defined(__i386__) || defined(_M_IX86)
    /* x86 (32-bit) implementation */
    .text
    .globl delay_us
    .globl ir_carrier_burst
    .globl ir_send_rc5_bit
    .globl ir_led_on
    .globl ir_led_off

    #define CYCLES_PER_US 2400

delay_us:
    /* void delay_us(uint32_t us) */
    /* Input: Stack[4] = us */
    pushl %ebx
    movl 8(%esp), %ebx       /* Get us from stack */
    
    /* Calculate total cycles */
    movl $CYCLES_PER_US, %eax
    mull %ebx                /* %eax = us * CYCLES_PER_US */
    movl %eax, %ecx          /* %ecx = loop counter */
    
delay_loop:
    pause
    decl %ecx
    jnz delay_loop
    
    popl %ebx
    ret

ir_carrier_burst:
    /* void ir_carrier_burst(uint32_t duration_us) */
    pushl %ebx
    movl 8(%esp), %ebx       /* duration_us */
    
    /* Calculate cycles */
    movl %ebx, %eax
    movl $26, %ecx           /* CARRIER_PERIOD = 26us */
    xorl %edx, %edx
    divl %ecx                /* %eax = duration_us / 26 */
    movl %eax, %ecx          /* %ecx = number of cycles */
    
carrier_loop:
    call ir_led_on
    pushl $13
    call delay_us
    addl $4, %esp
    
    call ir_led_off
    pushl $13
    call delay_us
    addl $4, %esp
    
    decl %ecx
    jnz carrier_loop
    
    popl %ebx
    ret

ir_send_rc5_bit:
    /* void ir_send_rc5_bit(uint8_t bit) */
    pushl %ebx
    movb 8(%esp), %bl        /* Get bit from stack */
    
    testb %bl, %bl
    jz rc5_bit_0
    
    /* Bit 1 */
    call ir_led_off
    pushl $889
    call delay_us
    addl $4, %esp
    call ir_led_on
    pushl $889
    call delay_us
    addl $4, %esp
    jmp rc5_bit_done
    
rc5_bit_0:
    /* Bit 0 */
    call ir_led_on
    pushl $889
    call delay_us
    addl $4, %esp
    call ir_led_off
    pushl $889
    call delay_us
    addl $4, %esp
    
rc5_bit_done:
    popl %ebx
    ret

ir_led_on:
    ret

ir_led_off:
    ret

#endif


