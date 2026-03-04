#ifndef PLATFORM_H
#define PLATFORM_H

/**
 * @file platform.h
 * @brief Platform detection and assembly function selection
 */

/* Platform Detection */
#if defined(__x86_64__) || defined(_M_X64)
    #define PLATFORM_X86_64
    #define IR_ASM_FILE "ir_asm_x86.s"
#elif defined(__i386__) || defined(_M_IX86)
    #define PLATFORM_X86
    #define IR_ASM_FILE "ir_asm_x86.s"
#elif defined(__aarch64__) || defined(_M_ARM64)
    #define PLATFORM_ARM64
    #define IR_ASM_FILE "ir_asm_arm.s"
#elif defined(__arm__) || defined(_M_ARM)
    #define PLATFORM_ARM
    #define IR_ASM_FILE "ir_asm_arm.s"
#elif defined(__AVR__)
    #define PLATFORM_AVR
    #define IR_ASM_FILE "ir_asm_avr.S"
#else
    #define PLATFORM_GENERIC
    /* Use C fallback implementation */
#endif

/* Assembly function availability */
#if defined(PLATFORM_X86_64) || defined(PLATFORM_X86) || \
    defined(PLATFORM_ARM64) || defined(PLATFORM_ARM) || \
    defined(PLATFORM_AVR)
    #define USE_ASM_IR 1
#else
    #define USE_ASM_IR 0
#endif

#endif /* PLATFORM_H */


