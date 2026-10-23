#include "../include/universal_tv.h"
#include "../include/ir_codes.h"
#include "../include/remote_buttons.h"
#include "../include/platform.h"
#include "../include/handlers.h"
#include "../include/latency.h"
#include "ir_asm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Universal TV State */
static universal_mode_t current_mode = UNIVERSAL_MODE_MULTI_PROTOCOL;
static tv_brand_t current_brand = TV_BRAND_UNKNOWN;
static int scan_active = 0;
static unsigned char scan_button = 0;
static uint16_t scan_index = 0;          /* Next code to try */
static int scan_last_sent = -1;          /* Index of the code last sent, -1 if none */
static const universal_button_codes_t* scan_codes = NULL;

static const char* const brand_names[TV_BRAND_COUNT] = {
    "Unknown", "Samsung", "LG", "Sony", "Philips", "Panasonic",
    "TCL", "Vizio", "Hisense", "Toshiba", "Sharp"
};

/* Protocol delay between attempts (milliseconds) */
#define PROTOCOL_DELAY_MS 40

/* ============================================================================
 * UNIVERSAL TV CODE DATABASE
 * ============================================================================
 * Common IR codes for POWER button across multiple brands/protocols
 * These are real-world codes that work with many TV models
 */

/* POWER Button Codes - Multi-Protocol */
static universal_tv_code_t power_codes[] = {
    /* NEC Protocol (Samsung, LG, many others) */
    {0x20DF10EF, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Power"},
    {0x20DF8877, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG NEC Power"},
    {0x20DF40BF, IR_PROTOCOL_NEC, 32, TV_BRAND_UNKNOWN, "Generic NEC Power"},
    
    /* RC5 Protocol (Philips) */
    {0x0C, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Power"},
    {0x100C, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Power (Alt)"},
    
    /* RC6 Protocol (Philips) */
    {0x800F040C, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Power"},
    
    /* Sony SIRC Protocol */
    {0xA90, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Power"},
    {0x1A90, IR_PROTOCOL_SONY, 15, TV_BRAND_SONY, "Sony SIRC Power (15-bit)"},
    {0x1A90, IR_PROTOCOL_SONY, 20, TV_BRAND_SONY, "Sony SIRC Power (20-bit)"},
    
    /* Samsung Protocol */
    {0xE0E040BF, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Power"},
    {0xE0E019E6, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Power (Alt)"},
    
    /* LG Protocol */
    {0x20DF10EF, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Power"},
    {0x20DF8877, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Power (Alt)"},
    
    /* Panasonic */
    {0x4004, IR_PROTOCOL_NEC, 16, TV_BRAND_PANASONIC, "Panasonic Power"},
    
    /* TCL */
    {0x20DF10EF, IR_PROTOCOL_NEC, 32, TV_BRAND_TCL, "TCL Power"},
    
    /* Vizio */
    {0x20DF10EF, IR_PROTOCOL_NEC, 32, TV_BRAND_VIZIO, "Vizio Power"},
};

#define POWER_CODE_COUNT (sizeof(power_codes) / sizeof(power_codes[0]))

/* VOLUME_UP Button Codes */
static universal_tv_code_t volume_up_codes[] = {
    {0x20DF40BF, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Volume Up"},
    {0x10, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Volume Up"},
    {0x800F0410, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Volume Up"},
    {0x490, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Volume Up"},
    {0xE0E0E01F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Volume Up"},
    {0x20DF40BF, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Volume Up"},
};

#define VOLUME_UP_CODE_COUNT (sizeof(volume_up_codes) / sizeof(volume_up_codes[0]))

/* VOLUME_DOWN Button Codes */
static universal_tv_code_t volume_down_codes[] = {
    {0x20DFC03F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Volume Down"},
    {0x11, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Volume Down"},
    {0x800F0411, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Volume Down"},
    {0xC90, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Volume Down"},
    {0xE0E0D02F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Volume Down"},
    {0x20DFC03F, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Volume Down"},
};

#define VOLUME_DOWN_CODE_COUNT (sizeof(volume_down_codes) / sizeof(volume_down_codes[0]))

/* MUTE Button Codes */
static universal_tv_code_t mute_codes[] = {
    {0x20DF906F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Mute"},
    {0x0D, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Mute"},
    {0x800F040D, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Mute"},
    {0x290, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Mute"},
    {0xE0E0F00F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Mute"},
    {0x20DF906F, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Mute"},
};

#define MUTE_CODE_COUNT (sizeof(mute_codes) / sizeof(mute_codes[0]))

/* CHANNEL_UP Button Codes */
static universal_tv_code_t channel_up_codes[] = {
    {0x20DF00FF, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Channel Up"},
    {0x20, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Channel Up"},
    {0x800F0420, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Channel Up"},
    {0x090, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Channel Up"},
    {0xE0E048B7, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Channel Up"},
    {0x20DF00FF, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Channel Up"},
};

#define CHANNEL_UP_CODE_COUNT (sizeof(channel_up_codes) / sizeof(channel_up_codes[0]))

/* CHANNEL_DOWN Button Codes */
static universal_tv_code_t channel_down_codes[] = {
    {0x20DF807F, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung/LG NEC Channel Down"},
    {0x21, IR_PROTOCOL_RC5, 14, TV_BRAND_PHILIPS, "Philips RC5 Channel Down"},
    {0x800F0421, IR_PROTOCOL_RC6, 20, TV_BRAND_PHILIPS, "Philips RC6 Channel Down"},
    {0x890, IR_PROTOCOL_SONY, 12, TV_BRAND_SONY, "Sony SIRC Channel Down"},
    {0xE0E0C837, IR_PROTOCOL_NEC, 32, TV_BRAND_SAMSUNG, "Samsung Channel Down"},
    {0x20DF807F, IR_PROTOCOL_NEC, 32, TV_BRAND_LG, "LG Channel Down"},
};

#define CHANNEL_DOWN_CODE_COUNT (sizeof(channel_down_codes) / sizeof(channel_down_codes[0]))

/* Button -> code table map. Entries are immutable so a pointer returned by
 * get_universal_codes() stays valid (e.g. while a scan is in progress). */
#define UNIVERSAL_ENTRY(btn, arr) \
    { (btn), (arr), (uint16_t)(sizeof(arr) / sizeof((arr)[0])) }

static const universal_button_codes_t universal_button_map[] = {
    UNIVERSAL_ENTRY(BUTTON_POWER, power_codes),
    UNIVERSAL_ENTRY(BUTTON_VOLUME_UP, volume_up_codes),
    UNIVERSAL_ENTRY(BUTTON_VOLUME_DOWN, volume_down_codes),
    UNIVERSAL_ENTRY(BUTTON_MUTE, mute_codes),
    UNIVERSAL_ENTRY(BUTTON_CHANNEL_UP, channel_up_codes),
    UNIVERSAL_ENTRY(BUTTON_CHANNEL_DOWN, channel_down_codes),
};

static const universal_button_codes_t* get_universal_codes(unsigned char button_code) {
    size_t i;
    for (i = 0; i < sizeof(universal_button_map) / sizeof(universal_button_map[0]); i++) {
        if (universal_button_map[i].button_code == button_code) {
            return &universal_button_map[i];
        }
    }
    return NULL;
}

/* Send code using specific protocol */
static int send_code_with_protocol(const universal_tv_code_t* code_entry) {
    if (!code_entry) return -1;
    
    printf("[Universal] Sending: %s (0x%08X, Protocol: %u, %u bits)\n",
           code_entry->description, (unsigned)code_entry->code,
           (unsigned)code_entry->protocol, (unsigned)code_entry->bit_length);
    
    /* Trigger protocol attempt event */
    handler_trigger_universal_protocol_attempt(
        code_entry->protocol, 
        code_entry->code, 
        code_entry->description
    );
    
    switch (code_entry->protocol) {
        case IR_PROTOCOL_NEC:
            /* NEC protocol - send 32-bit code */
            ir_send_nec(code_entry->code);
            break;
            
        case IR_PROTOCOL_RC5:
            {
                uint16_t rc5_code = ir_code_to_rc5(code_entry->code);
                ir_send_rc5(rc5_code);
            }
            break;
            
        case IR_PROTOCOL_RC6:
            {
                uint32_t rc6_code = ir_code_to_rc6(code_entry->code);
                ir_send_rc6(rc6_code);
            }
            break;
            
        case IR_PROTOCOL_SONY:
            /* Sony SIRC protocol */
            printf("[Universal] [Sony SIRC] 0x%04X (%d bits)\n", 
                   (uint16_t)code_entry->code, code_entry->bit_length);
            delay_us(40000); /* Simulate transmission */
            break;
            
        default:
            printf("[Universal] Warning: Unsupported protocol %d\n", code_entry->protocol);
            return -1;
    }
    
    return 0;
}

/* ============================================================================
 * PUBLIC FUNCTIONS
 * ============================================================================ */

int universal_tv_init(universal_mode_t mode) {
    current_mode = mode;
    current_brand = TV_BRAND_UNKNOWN;
    scan_active = 0;
    scan_codes = NULL;
    scan_index = 0;
    scan_last_sent = -1;
    
    printf("[Universal TV] Initialized in mode: %d\n", mode);
    printf("[Universal TV] Multi-protocol universal sender ready\n");
    
    return 0;
}

int universal_tv_send_button(unsigned char button_code) {
    /* Measure latency: Universal TV transmission */
    uint64_t universal_start = LATENCY_MEASURE_START();
    
    const universal_button_codes_t* codes = get_universal_codes(button_code);
    
    if (!codes || codes->code_count == 0) {
        /* Fallback to standard IR code */
        printf("[Universal] No universal codes for button 0x%02X, using standard IR\n", button_code);
        ir_code_t standard_code = get_ir_code(button_code);
        int result = ir_send(standard_code);
        LATENCY_MEASURE_END(universal_start, "universal_tv", button_code);
        return result;
    }
    
    printf("[Universal] Sending button 0x%02X using multi-protocol strategy\n", button_code);
    printf("[Universal] Trying %d different codes/protocols...\n", codes->code_count);
    
    /* Strategy: Send all codes in sequence with small delays */
    /* This mimics how cheap universal remotes work */
    int sent = 0;
    int i;
    for (i = 0; i < codes->code_count; i++) {
        const universal_tv_code_t* code_entry = &codes->codes[i];
        
        /* If brand is set, prioritize codes for that brand */
        if (current_brand != TV_BRAND_UNKNOWN && 
            code_entry->brand == current_brand) {
            /* Send brand-specific code first */
            if (send_code_with_protocol(code_entry) == 0) {
                sent++;
            }
            delay_us(PROTOCOL_DELAY_MS * 1000);
        }
    }
    
    /* Now send all codes (or remaining codes) */
    for (i = 0; i < codes->code_count; i++) {
        const universal_tv_code_t* code_entry = &codes->codes[i];
        
        /* Skip if already sent (brand-specific) */
        if (current_brand != TV_BRAND_UNKNOWN && 
            code_entry->brand == current_brand) {
            continue;
        }
        
        if (send_code_with_protocol(code_entry) == 0) {
            sent++;
        }
        
        /* Small delay between protocol attempts */
        if (i < codes->code_count - 1) {
            delay_us(PROTOCOL_DELAY_MS * 1000);
        }
    }
    
    printf("[Universal] Multi-protocol transmission complete\n");
    
    /* Measure latency: Universal TV transmission complete */
    LATENCY_MEASURE_END(universal_start, "universal_tv", button_code);
    
    return sent > 0 ? 0 : -1;
}

int universal_tv_scan_start(unsigned char button_code) {
    const universal_button_codes_t* codes = get_universal_codes(button_code);
    
    if (!codes || codes->code_count == 0) {
        printf("[Universal] No codes available for button 0x%02X\n", button_code);
        return -1;
    }
    
    scan_active = 1;
    scan_button = button_code;
    scan_index = 0;
    scan_last_sent = -1;
    scan_codes = codes;
    
    printf("[Universal] Scan mode started for button 0x%02X\n", button_code);
    printf("[Universal] Press button repeatedly. When TV responds, confirm to save code.\n");
    printf("[Universal] Total codes to try: %d\n", codes->code_count);
    
    /* Trigger scan started event */
    handler_trigger_universal_scan_started(button_code, codes->code_count);
    
    return 0;
}

int universal_tv_scan_next(void) {
    if (!scan_active || !scan_codes) {
        return -1;
    }
    
    if (scan_index >= scan_codes->code_count) {
        printf("[Universal] Scan complete - no working code found\n");
        scan_active = 0;
        return -1;
    }
    
    const universal_tv_code_t* code_entry = &scan_codes->codes[scan_index];
    
    printf("[Universal] [Scan %d/%d] Trying: %s\n", 
           scan_index + 1, scan_codes->code_count, code_entry->description);
    
    /* Trigger scan next event */
    handler_trigger_universal_scan_next(scan_button, scan_index, scan_codes->code_count);
    
    send_code_with_protocol(code_entry);
    scan_last_sent = scan_index;
    
    scan_index++;
    
    if (scan_index >= scan_codes->code_count) {
        /* Reached end, loop back */
        scan_index = 0;
        printf("[Universal] Reached end of codes, looping...\n");
    }
    
    return 0; /* Still scanning */
}

int universal_tv_scan_confirm(void) {
    /* Nothing to confirm until at least one code has been sent. Track the
     * last sent index explicitly: scan_index wraps to 0 after the final
     * code, which previously made the last code impossible to confirm. */
    if (!scan_active || !scan_codes || scan_last_sent < 0) {
        return -1;
    }
    
    uint16_t confirmed_index = (uint16_t)scan_last_sent;
    
    const universal_tv_code_t* confirmed_code = &scan_codes->codes[confirmed_index];
    
    printf("[Universal] Code confirmed: %s (0x%08X)\n",
           confirmed_code->description, (unsigned)confirmed_code->code);
    printf("[Universal] This code will be used for button 0x%02X\n", scan_button);
    
    /* Trigger scan confirmed event */
    handler_trigger_universal_scan_confirmed(scan_button, confirmed_index, scan_codes->code_count);
    
    /* TODO: Save confirmed code to persistent storage */
    /* For now, we'll set it as the preferred code for this brand */
    if (confirmed_code->brand != TV_BRAND_UNKNOWN) {
        current_brand = confirmed_code->brand;
        printf("[Universal] TV brand set to: %d\n", current_brand);
        
        /* Trigger brand detected event */
        handler_trigger_universal_brand_detected((uint8_t)current_brand,
                                                 universal_tv_brand_name(current_brand));
    }
    
    scan_active = 0;
    scan_codes = NULL;
    scan_last_sent = -1;
    return 0;
}

void universal_tv_scan_cancel(void) {
    if (scan_active) {
        printf("[Universal] Scan mode cancelled\n");
        scan_active = 0;
        scan_codes = NULL;
        scan_last_sent = -1;
    }
}

static int brand_is_valid(tv_brand_t brand) {
    return (int)brand >= 0 && (int)brand < (int)TV_BRAND_COUNT;
}

const char* universal_tv_brand_name(tv_brand_t brand) {
    return brand_is_valid(brand) ? brand_names[brand] : "Invalid";
}

int universal_tv_set_brand(tv_brand_t brand) {
    if (!brand_is_valid(brand)) {
        fprintf(stderr, "[Universal] Invalid TV brand: %d\n", (int)brand);
        return -1;
    }
    
    current_brand = brand;
    printf("[Universal] TV brand set to: %s\n", brand_names[brand]);
    
    /* Trigger brand detected event */
    handler_trigger_universal_brand_detected((uint8_t)brand, brand_names[brand]);
    return 0;
}

tv_brand_t universal_tv_get_brand(void) {
    return current_brand;
}

uint16_t universal_tv_get_code_count(unsigned char button_code) {
    const universal_button_codes_t* codes = get_universal_codes(button_code);
    return codes ? codes->code_count : 0;
}

void universal_tv_cleanup(void) {
    if (scan_active) {
        universal_tv_scan_cancel();
    }
    printf("[Universal TV] Cleaned up\n");
}

