/**
 * @file interrupt_handlers.s
 * @brief Hardware interrupt handler implementations
 * 
 * Platform-specific interrupt handlers for IR transmission and GPIO events.
 */

#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
    /* x86/x86-64 Interrupt Handlers */
    .text
    .global ir_timer_interrupt_handler
    .global ir_gpio_interrupt_handler

    /* External C function for interrupt callback */
    .extern interrupt_callback

ir_timer_interrupt_handler:
    /* Timer interrupt handler for IR timing */
    pushq %rax
    pushq %rcx
    pushq %rdx
    
    /* Call C callback function */
    call interrupt_callback
    
    popq %rdx
    popq %rcx
    popq %rax
    iretq

ir_gpio_interrupt_handler:
    /* GPIO interrupt handler for button presses */
    pushq %rax
    pushq %rcx
    pushq %rdx
    
    /* Call C callback function */
    call interrupt_callback
    
    popq %rdx
    popq %rcx
    popq %rax
    iretq

#elif defined(__aarch64__) || defined(_M_ARM64) || defined(__arm__) || defined(_M_ARM)
    /* ARM Interrupt Handlers */
    .text
    .global ir_timer_interrupt_handler
    .global ir_gpio_interrupt_handler
    .extern interrupt_callback

ir_timer_interrupt_handler:
    /* Timer interrupt handler for IR timing */
#if defined(__aarch64__)
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl interrupt_callback
    ldp x29, x30, [sp], #16
    ret
#else
    push {lr}
    bl interrupt_callback
    pop {lr}
    bx lr
#endif

ir_gpio_interrupt_handler:
    /* GPIO interrupt handler for button presses */
#if defined(__aarch64__)
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl interrupt_callback
    ldp x29, x30, [sp], #16
    ret
#else
    push {lr}
    bl interrupt_callback
    pop {lr}
    bx lr
#endif

#elif defined(__AVR__)
    /* AVR Interrupt Handlers */
    .text
    .global TIMER1_COMPA_vect
    .global INT0_vect
    .extern interrupt_callback

TIMER1_COMPA_vect:
    /* Timer 1 Compare A interrupt for IR carrier generation */
    push r0
    in r0, SREG
    push r0
    push r24
    push r25
    
    /* Call C callback */
    rcall interrupt_callback
    
    pop r25
    pop r24
    pop r0
    out SREG, r0
    pop r0
    reti

INT0_vect:
    /* External interrupt 0 for button presses */
    push r0
    in r0, SREG
    push r0
    push r24
    push r25
    
    /* Call C callback */
    rcall interrupt_callback
    
    pop r25
    pop r24
    pop r0
    out SREG, r0
    pop r0
    reti

#endif


