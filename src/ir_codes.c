#include "../include/ir_codes.h"
#include "../include/remote_buttons.h"
#include "../include/platform.h"
#include "../include/handlers.h"
#include "../include/io_mode.h"
#include "../include/latency.h"
#include "ir_asm.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Protocol timing constants */
#define RC5_BIT_TIME        889
#define RC5_REPEAT_DELAY    114000
#define RC6_BIT_TIME        444
#define RC6_LEADER_PULSE    2666
#define RC6_LEADER_SPACE    889
#define RC6_REPEAT_DELAY    108000

/* Forward declarations from ir_protocol.c */
extern void ir_send_rc5(uint16_t code);
extern void ir_send_rc6(uint32_t code);
extern uint16_t ir_code_to_rc5(uint32_t code);
extern uint32_t ir_code_to_rc6(uint32_t code);

/* IR Hardware State */
static int ir_initialized = 0;

/**
 * @brief Get IR code for a button code
 */
ir_code_t get_ir_code(unsigned char button_code) {
    ir_code_t ir;
    ir.protocol = IR_PROTOCOL_PHILLIPS;
    ir.frequency = 38000;  /* Standard IR frequency: 38kHz */
    ir.repeat_count = 1;
    
    /* Map button codes to IR codes */
    switch (button_code) {
        /* Streaming Services */
        case BUTTON_YOUTUBE:
            ir.code = IR_YOUTUBE;
            break;
        case BUTTON_NETFLIX:
            ir.code = IR_NETFLIX;
            break;
        case BUTTON_AMAZON_PRIME:
            ir.code = IR_AMAZON_PRIME;
            break;
        case BUTTON_HBO_MAX:
            ir.code = IR_HBO_MAX;
            break;
        
        /* Basic Controls */
        case BUTTON_POWER:
            ir.code = IR_POWER;
            break;
        case BUTTON_VOLUME_UP:
            ir.code = IR_VOLUME_UP;
            break;
        case BUTTON_VOLUME_DOWN:
            ir.code = IR_VOLUME_DOWN;
            break;
        case BUTTON_MUTE:
            ir.code = IR_MUTE;
            break;
        case BUTTON_CHANNEL_UP:
            ir.code = IR_CHANNEL_UP;
            break;
        case BUTTON_CHANNEL_DOWN:
            ir.code = IR_CHANNEL_DOWN;
            break;
        
        /* Navigation */
        case BUTTON_HOME:
            ir.code = IR_HOME;
            break;
        case BUTTON_MENU:
            ir.code = IR_MENU;
            break;
        case BUTTON_BACK:
            ir.code = IR_BACK;
            break;
        case BUTTON_EXIT:
            ir.code = IR_EXIT;
            break;
        case BUTTON_OPTIONS:
            ir.code = IR_OPTIONS;
            break;
        case BUTTON_INPUT:
        case BUTTON_SOURCE:
            ir.code = IR_INPUT;
            break;
        
        /* Directional Pad */
        case BUTTON_UP:
            ir.code = IR_UP;
            break;
        case BUTTON_DOWN:
            ir.code = IR_DOWN;
            break;
        case BUTTON_LEFT:
            ir.code = IR_LEFT;
            break;
        case BUTTON_RIGHT:
            ir.code = IR_RIGHT;
            break;
        case BUTTON_OK:
            ir.code = IR_OK;
            break;
        case BUTTON_ENTER:
            ir.code = IR_ENTER;
            break;
        
        /* Playback Controls */
        case BUTTON_PLAY:
            ir.code = IR_PLAY;
            break;
        case BUTTON_PAUSE:
            ir.code = IR_PAUSE;
            break;
        case BUTTON_STOP:
            ir.code = IR_STOP;
            break;
        case BUTTON_FAST_FORWARD:
            ir.code = IR_FAST_FORWARD;
            break;
        case BUTTON_REWIND:
            ir.code = IR_REWIND;
            break;
        case BUTTON_RECORD:
            ir.code = IR_RECORD;
            break;
        
        /* Number Pad */
        case BUTTON_0:
            ir.code = IR_0;
            break;
        case BUTTON_1:
            ir.code = IR_1;
            break;
        case BUTTON_2:
            ir.code = IR_2;
            break;
        case BUTTON_3:
            ir.code = IR_3;
            break;
        case BUTTON_4:
            ir.code = IR_4;
            break;
        case BUTTON_5:
            ir.code = IR_5;
            break;
        case BUTTON_6:
            ir.code = IR_6;
            break;
        case BUTTON_7:
            ir.code = IR_7;
            break;
        case BUTTON_8:
            ir.code = IR_8;
            break;
        case BUTTON_9:
            ir.code = IR_9;
            break;
        case BUTTON_DASH:
            ir.code = IR_DASH;
            break;
        
        /* Color Buttons */
        case BUTTON_RED:
            ir.code = IR_RED;
            break;
        case BUTTON_GREEN:
            ir.code = IR_GREEN;
            break;
        case BUTTON_YELLOW:
            ir.code = IR_YELLOW;
            break;
        case BUTTON_BLUE:
            ir.code = IR_BLUE;
            break;
        
        /* Advanced TV Controls */
        case BUTTON_INFO:
            ir.code = IR_INFO;
            break;
        case BUTTON_GUIDE:
            ir.code = IR_GUIDE;
            break;
        case BUTTON_SETTINGS:
            ir.code = IR_SETTINGS;
            break;
        case BUTTON_CC:
        case BUTTON_SUBTITLES:
            ir.code = IR_CC;
            break;
        case BUTTON_SAP:
        case BUTTON_AUDIO:
            ir.code = IR_SAP;
            break;
        case BUTTON_SLEEP:
            ir.code = IR_SLEEP;
            break;
        case BUTTON_PICTURE_MODE:
            ir.code = IR_PICTURE_MODE;
            break;
        case BUTTON_ASPECT:
        case BUTTON_ZOOM:
        case BUTTON_P_SIZE:
            ir.code = IR_ASPECT;
            break;
        
        /* Smart TV Features */
        case BUTTON_VOICE:
        case BUTTON_MIC:
            ir.code = IR_VOICE;
            break;
        case BUTTON_LIVE_TV:
            ir.code = IR_LIVE_TV;
            break;
        case BUTTON_STREAM:
            ir.code = IR_STREAM;
            break;
        
        /* System & Diagnostic */
        case BUTTON_DISPLAY:
        case BUTTON_STATUS:
            ir.code = IR_DISPLAY;
            break;
        case BUTTON_HELP:
        case BUTTON_E_MANUAL:
            ir.code = IR_HELP;
            break;
        
        /* Gaming Controls */
        case BUTTON_GAME_MODE:
            ir.code = IR_GAME_MODE;
            break;
        
        /* Picture Controls */
        case BUTTON_MOTION:
            ir.code = IR_MOTION;
            break;
        case BUTTON_BACKLIGHT:
        case BUTTON_BRIGHTNESS:
            ir.code = IR_BRIGHTNESS;
            break;
        
        /* Audio Controls */
        case BUTTON_SOUND_MODE:
            ir.code = IR_SOUND_MODE;
            break;
        case BUTTON_SYNC:
            ir.code = IR_SYNC;
            break;
        case BUTTON_SOUND_OUTPUT:
            ir.code = IR_SOUND_OUTPUT;
            break;
        
        /* Input & Connectivity */
        case BUTTON_MULTI_VIEW:
            ir.code = IR_MULTI_VIEW;
            break;
        case BUTTON_PIP:
            ir.code = IR_PIP;
            break;
        case BUTTON_SCREEN_MIRROR:
            ir.code = IR_SCREEN_MIRROR;
            break;
        
        default:
            ir.code = 0x00000000;  /* Unknown button */
            break;
    }
    
    return ir;
}

/**
 * @brief Initialize IR transmission hardware
 * 
 * Initializes hardware using assembly functions for GPIO control.
 * Platform-specific initialization is handled by ir_hw_init().
 */
int ir_init(void) {
    if (ir_initialized) {
        return 0;  /* Already initialized */
    }
    
    /* Initialize handler system if not already done */
    handler_init();
    
    /* Initialize I/O mode system */
    if (io_mode_init() != 0) {
        fprintf(stderr, "[IR] Warning: I/O mode system initialization failed\n");
    }
    
    /* Configure I/O mode for IR transmission (timing-critical) */
    io_config_t io_cfg = {
        .mode = IO_MODE_HYBRID,
        .flags = IO_FLAG_TIMING_CRITICAL,
        .timing = {
            .max_latency_us = 100,      /* IR timing is critical (< 100us) */
            .min_interval_us = 0,
            .timeout_us = 5000,
            .jitter_tolerance_us = 10   /* Very tight jitter tolerance */
        },
        .interrupt_priority = 7,        /* High priority for IR */
        .polling_interval_us = 10,      /* Fast polling if needed */
        .use_dma = 0
    };
    io_mode_set_config(&io_cfg);
    
    printf("[IR] Initializing IR transmitter...\n");
    printf("[IR] Carrier frequency: 38kHz\n");
    printf("[IR] Protocol: Phillips RC5/RC6\n");
    
#if USE_ASM_IR
    printf("[IR] Using assembly-optimized timing\n");
#else
    printf("[IR] Using C fallback implementation\n");
#endif
    
    /* Initialize hardware GPIO (default pin, adjust as needed) */
    if (ir_hw_init(0) != 0) {
        fprintf(stderr, "[IR] Warning: Hardware initialization may have failed\n");
        handler_trigger_error(ERROR_HARDWARE_FAILURE, "IR hardware initialization failed");
        /* Continue anyway for simulation */
    }
    
    ir_initialized = 1;
    return 0;
}

/**
 * @brief Send IR code using assembly-optimized protocol encoding
 * 
 * This function uses assembly routines for precise timing and protocol encoding.
 * Supports RC5 and RC6 protocols with hardware-level control.
 */
int ir_send(ir_code_t code) {
    if (!ir_initialized) {
        fprintf(stderr, "[IR] Error: IR not initialized. Call ir_init() first.\n");
        handler_trigger_error(ERROR_IR_NOT_INITIALIZED, "IR system not initialized");
        return -1;
    }
    
    if (code.code == 0) {
        fprintf(stderr, "[IR] Error: Invalid IR code (0x00000000)\n");
        handler_trigger_error(ERROR_INVALID_IR_CODE, "Invalid IR code: 0x00000000");
        return -1;
    }
    
    printf("[IR] Sending code: 0x%08X (Protocol: %d, Freq: %d Hz, Repeats: %d)\n",
           code.code, code.protocol, code.frequency, code.repeat_count);
    
    /* Measure latency: IR transmission */
    uint64_t ir_start = LATENCY_MEASURE_START();
    
    /* Trigger IR transmission start event */
    handler_trigger_ir_transmit_start(code);
    
    /* Check I/O mode constraints for timing-critical IR transmission */
    io_config_t* io_cfg = io_mode_get_config();
    if (io_cfg && (io_cfg->flags & IO_FLAG_TIMING_CRITICAL)) {
        /* Verify timing constraints are met */
        if (io_cfg->timing.max_latency_us < 100) {
            printf("[IR] Using timing-critical I/O mode (max latency: %u us)\n", 
                   io_cfg->timing.max_latency_us);
        }
    }
    
    /* Send IR code using appropriate protocol */
    int i;
    int transmission_success = 1;
    for (i = 0; i < code.repeat_count; i++) {
        switch (code.protocol) {
            case IR_PROTOCOL_RC5:
                {
                    uint16_t rc5_code = ir_code_to_rc5(code.code);
                    ir_send_rc5(rc5_code);
                }
                break;
            
            case IR_PROTOCOL_RC6:
                {
                    uint32_t rc6_code = ir_code_to_rc6(code.code);
                    ir_send_rc6(rc6_code);
                }
                break;
            
            case IR_PROTOCOL_PHILLIPS:
                /* Default to RC5 for Phillips remotes */
                {
                    uint16_t rc5_code = ir_code_to_rc5(code.code);
                    ir_send_rc5(rc5_code);
                }
                break;
            
            default:
                fprintf(stderr, "[IR] Error: Unsupported protocol: %d\n", code.protocol);
                handler_trigger_error(ERROR_PROTOCOL_ERROR, "Unsupported IR protocol");
                transmission_success = 0;
                break;
        }
        
        if (!transmission_success) {
            break;
        }
        
        /* Repeat delay between transmissions */
        if (i < code.repeat_count - 1) {
            if (code.protocol == IR_PROTOCOL_RC6) {
                delay_us(RC6_REPEAT_DELAY);
            } else {
                delay_us(RC5_REPEAT_DELAY);
            }
        }
    }
    
    /* Measure latency: IR transmission complete */
    LATENCY_MEASURE_END(ir_start, "ir_transmit", code.code);
    
    /* Trigger IR transmission complete event */
    handler_trigger_ir_transmit_complete(code, transmission_success);
    
    if (!transmission_success) {
        handler_trigger_error(ERROR_TRANSMISSION_FAILED, "IR transmission failed");
        return -1;
    }
    
    return 0;
}

/**
 * @brief Deinitialize IR transmission hardware
 */
void ir_cleanup(void) {
    if (!ir_initialized) {
        return;
    }
    
    /* TODO: Cleanup hardware-specific resources */
    /* Example:
     * - Disable timer/PWM
     * - Reset GPIO pins
     * - Disable interrupts
     */
    
    printf("[IR] Cleaning up IR transmitter...\n");
    ir_initialized = 0;
}

