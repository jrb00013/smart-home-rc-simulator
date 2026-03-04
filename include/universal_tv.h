#ifndef UNIVERSAL_TV_H
#define UNIVERSAL_TV_H

#include <stdint.h>
#include "ir_codes.h"

/**
 * @file universal_tv.h
 * @brief Universal TV support - Multi-protocol IR codes for any TV brand
 * 
 * This module implements three strategies for universal TV control:
 * 1. Multi-Protocol Universal Sender - tries multiple protocols per button
 * 2. Code Scan Mode - cycles through stored codes until one works
 * 3. Auto-Learning Universal - captures and replays codes (requires IR receiver)
 */

/* Universal TV Mode */
typedef enum {
    UNIVERSAL_MODE_MULTI_PROTOCOL,  /* Try all protocols (Option 1) */
    UNIVERSAL_MODE_SCAN,             /* Code scan mode (Option 2) */
    UNIVERSAL_MODE_LEARNED           /* Use learned codes (Option 3) */
} universal_mode_t;

/* TV Brand Identifiers */
typedef enum {
    TV_BRAND_UNKNOWN = 0,
    TV_BRAND_SAMSUNG,
    TV_BRAND_LG,
    TV_BRAND_SONY,
    TV_BRAND_PHILIPS,
    TV_BRAND_PANASONIC,
    TV_BRAND_TCL,
    TV_BRAND_VIZIO,
    TV_BRAND_HISENSE,
    TV_BRAND_TOSHIBA,
    TV_BRAND_SHARP,
    TV_BRAND_COUNT
} tv_brand_t;

/* Universal TV Code Entry */
typedef struct {
    uint32_t code;          /* IR code value */
    uint8_t protocol;       /* Protocol type (IR_PROTOCOL_*) */
    uint8_t bit_length;     /* Number of bits */
    tv_brand_t brand;       /* TV brand this code works with */
    const char* description; /* Human-readable description */
} universal_tv_code_t;

/* Universal TV Code Set (for one button across multiple brands/protocols) */
typedef struct {
    unsigned char button_code;      /* Button code from remote_buttons.h */
    universal_tv_code_t* codes;     /* Array of codes to try */
    uint16_t code_count;            /* Number of codes in array */
} universal_button_codes_t;

/**
 * @brief Initialize universal TV system
 * @param mode Universal mode to use
 * @return 0 on success, -1 on failure
 */
int universal_tv_init(universal_mode_t mode);

/**
 * @brief Send button command using universal multi-protocol strategy
 * @param button_code Button code from remote_buttons.h
 * @return 0 on success, -1 on failure
 * 
 * This function tries multiple protocols and codes for maximum compatibility.
 * Strategy: Send NEC, RC5, RC6, Sony, Samsung, LG codes in sequence.
 */
int universal_tv_send_button(unsigned char button_code);

/**
 * @brief Start code scan mode for a specific button
 * @param button_code Button code to scan for
 * @return 0 on success, -1 on failure
 * 
 * Cycles through stored codes. User should press button repeatedly
 * until TV responds, then confirm to save that code.
 */
int universal_tv_scan_start(unsigned char button_code);

/**
 * @brief Continue code scan (call repeatedly while scanning)
 * @return 0 if still scanning, 1 if code found, -1 on error
 */
int universal_tv_scan_next(void);

/**
 * @brief Confirm current code in scan mode (save it)
 * @return 0 on success, -1 on failure
 */
int universal_tv_scan_confirm(void);

/**
 * @brief Cancel code scan mode
 */
void universal_tv_scan_cancel(void);

/**
 * @brief Set TV brand (optimizes code selection)
 * @param brand TV brand identifier
 */
void universal_tv_set_brand(tv_brand_t brand);

/**
 * @brief Get current TV brand
 * @return TV brand identifier
 */
tv_brand_t universal_tv_get_brand(void);

/**
 * @brief Get universal code count for a button
 * @param button_code Button code
 * @return Number of universal codes available for this button
 */
uint16_t universal_tv_get_code_count(unsigned char button_code);

/**
 * @brief Cleanup universal TV system
 */
void universal_tv_cleanup(void);

#endif /* UNIVERSAL_TV_H */


