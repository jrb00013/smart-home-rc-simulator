/**
 * @file interrupt_handlers.S
 * @brief Interrupt handler entry points
 *
 * On hosted platforms (x86, ARM under Linux/macOS/Windows) these are ordinary
 * functions called from C (remote_press_button() invokes
 * ir_gpio_interrupt_handler() to exercise the simulated ISR path), so they
 * follow the normal C calling convention and return with ret/bx. Returning
 * with iretq from a function reached through `call` pops a bogus CS/RFLAGS/
 * RSP/SS frame and crashes the process.
 *
 * On AVR they are real interrupt vectors and return with reti.
 */

#if defined(__APPLE__)
#define SYM(name) _##name
#else
#define SYM(name) name
#endif

#if defined(__ELF__)
#define FUNC_TYPE(name) .type SYM(name), %function
#define FUNC_SIZE(name) .size SYM(name), . - SYM(name)
#else
#define FUNC_TYPE(name)
#define FUNC_SIZE(name)
#endif

#if defined(__x86_64__) || defined(_M_X64)
    /* x86-64: keep the stack 16-byte aligned across the call */
    .text
    .globl SYM(ir_timer_interrupt_handler)
    .globl SYM(ir_gpio_interrupt_handler)
    FUNC_TYPE(ir_timer_interrupt_handler)
    FUNC_TYPE(ir_gpio_interrupt_handler)

#if defined(__ELF__) && (defined(__PIC__) || defined(__PIE__))
#define CALL_C(name) call SYM(name)@PLT
#else
#define CALL_C(name) call SYM(name)
#endif

    .p2align 4
SYM(ir_timer_interrupt_handler):
    subq $8, %rsp
    CALL_C(interrupt_callback)
    addq $8, %rsp
    ret
    FUNC_SIZE(ir_timer_interrupt_handler)

    .p2align 4
SYM(ir_gpio_interrupt_handler):
    subq $8, %rsp
    CALL_C(interrupt_callback)
    addq $8, %rsp
    ret
    FUNC_SIZE(ir_gpio_interrupt_handler)

#elif defined(__i386__) || defined(_M_IX86)
    /* i386 cdecl: interrupt_callback takes no arguments */
    .text
    .globl SYM(ir_timer_interrupt_handler)
    .globl SYM(ir_gpio_interrupt_handler)
    FUNC_TYPE(ir_timer_interrupt_handler)
    FUNC_TYPE(ir_gpio_interrupt_handler)

SYM(ir_timer_interrupt_handler):
    subl $12, %esp
    call SYM(interrupt_callback)
    addl $12, %esp
    ret
    FUNC_SIZE(ir_timer_interrupt_handler)

SYM(ir_gpio_interrupt_handler):
    subl $12, %esp
    call SYM(interrupt_callback)
    addl $12, %esp
    ret
    FUNC_SIZE(ir_gpio_interrupt_handler)

#elif defined(__aarch64__) || defined(_M_ARM64)
    .text
    .globl SYM(ir_timer_interrupt_handler)
    .globl SYM(ir_gpio_interrupt_handler)
    FUNC_TYPE(ir_timer_interrupt_handler)
    FUNC_TYPE(ir_gpio_interrupt_handler)

    .p2align 2
SYM(ir_timer_interrupt_handler):
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl SYM(interrupt_callback)
    ldp x29, x30, [sp], #16
    ret
    FUNC_SIZE(ir_timer_interrupt_handler)

    .p2align 2
SYM(ir_gpio_interrupt_handler):
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl SYM(interrupt_callback)
    ldp x29, x30, [sp], #16
    ret
    FUNC_SIZE(ir_gpio_interrupt_handler)

#elif defined(__arm__) || defined(_M_ARM)
    .text
    .globl SYM(ir_timer_interrupt_handler)
    .globl SYM(ir_gpio_interrupt_handler)
    FUNC_TYPE(ir_timer_interrupt_handler)
    FUNC_TYPE(ir_gpio_interrupt_handler)

    .p2align 2
SYM(ir_timer_interrupt_handler):
    /* push an extra register to keep the stack 8-byte aligned (AAPCS) */
    push {r4, lr}
    bl SYM(interrupt_callback)
    pop {r4, lr}
    bx lr
    FUNC_SIZE(ir_timer_interrupt_handler)

    .p2align 2
SYM(ir_gpio_interrupt_handler):
    push {r4, lr}
    bl SYM(interrupt_callback)
    pop {r4, lr}
    bx lr
    FUNC_SIZE(ir_gpio_interrupt_handler)

#elif defined(__AVR__)
    /* AVR Interrupt Handlers (real vectors). The callee may clobber every
     * call-used register (r18-r27, r30-r31, r0, r1 must be zero), so save
     * them all. */
    .text
    .global TIMER1_COMPA_vect
    .global INT0_vect
    .extern interrupt_callback

TIMER1_COMPA_vect:
    push r1
    push r0
    in r0, 0x3F
    push r0
    clr r1
    push r18
    push r19
    push r20
    push r21
    push r22
    push r23
    push r24
    push r25
    push r26
    push r27
    push r30
    push r31
    rcall interrupt_callback
    pop r31
    pop r30
    pop r27
    pop r26
    pop r25
    pop r24
    pop r23
    pop r22
    pop r21
    pop r20
    pop r19
    pop r18
    pop r0
    out 0x3F, r0
    pop r0
    pop r1
    reti

INT0_vect:
    push r1
    push r0
    in r0, 0x3F
    push r0
    clr r1
    push r18
    push r19
    push r20
    push r21
    push r22
    push r23
    push r24
    push r25
    push r26
    push r27
    push r30
    push r31
    rcall interrupt_callback
    pop r31
    pop r30
    pop r27
    pop r26
    pop r25
    pop r24
    pop r23
    pop r22
    pop r21
    pop r20
    pop r19
    pop r18
    pop r0
    out 0x3F, r0
    pop r0
    pop r1
    reti

#endif

/* Mark the stack non-executable (silences ld's executable-stack warning) */
#if defined(__ELF__)
    .section .note.GNU-stack,"",%progbits
#endif
