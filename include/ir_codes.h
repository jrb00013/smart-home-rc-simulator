#ifndef IR_CODES_H
#define IR_CODES_H

#include <stdint.h>

/**
 * @file ir_codes.h
 * @brief IR code definitions for Phillips Universal Remote
 * 
 * Note: These are placeholder IR codes. Actual codes should be:
 * - Captured from original remotes using IR receivers
 * - Obtained from Phillips documentation
 * - Calibrated for your specific TV/device models
 */

/* IR Protocol Constants */
#define IR_PROTOCOL_NEC       0x01
#define IR_PROTOCOL_RC5       0x02
#define IR_PROTOCOL_RC6       0x03
#define IR_PROTOCOL_SONY      0x04
#define IR_PROTOCOL_PHILLIPS  0x05

/* IR Code Structure */
typedef struct {
    uint32_t code;           /* IR command code */
    uint8_t protocol;        /* Protocol type */
    uint16_t frequency;       /* Carrier frequency (typically 38kHz) */
    uint8_t repeat_count;    /* Number of repeats for reliability */
} ir_code_t;

/* Streaming Service IR Codes (Placeholder values - replace with actual codes) */
#define IR_YOUTUBE        0x12345678
#define IR_NETFLIX        0x12345679
#define IR_AMAZON_PRIME   0x1234567A
#define IR_HBO_MAX        0x1234567B

/* Basic Control IR Codes */
#define IR_POWER          0x00000001
#define IR_VOLUME_UP      0x00000002
#define IR_VOLUME_DOWN    0x00000003
#define IR_MUTE           0x00000004
#define IR_CHANNEL_UP     0x00000005
#define IR_CHANNEL_DOWN   0x00000006

/* Navigation IR Codes */
#define IR_HOME           0x00000010
#define IR_MENU           0x00000011
#define IR_BACK           0x00000012
#define IR_EXIT           0x00000013
#define IR_OPTIONS        0x00000014
#define IR_INPUT          0x00000015
#define IR_SOURCE         0x00000016

/* Directional Pad IR Codes */
#define IR_UP             0x00000020
#define IR_DOWN           0x00000021
#define IR_LEFT           0x00000022
#define IR_RIGHT          0x00000023
#define IR_OK             0x00000024
#define IR_ENTER          0x00000025

/* Playback IR Codes */
#define IR_PLAY           0x00000030
#define IR_PAUSE          0x00000031
#define IR_STOP           0x00000032
#define IR_FAST_FORWARD   0x00000033
#define IR_REWIND         0x00000034
#define IR_RECORD         0x00000035

/* Number Pad IR Codes */
#define IR_0              0x00000040
#define IR_1              0x00000041
#define IR_2              0x00000042
#define IR_3              0x00000043
#define IR_4              0x00000044
#define IR_5              0x00000045
#define IR_6              0x00000046
#define IR_7              0x00000047
#define IR_8              0x00000048
#define IR_9              0x00000049
#define IR_DASH           0x0000004A

/* Color Button IR Codes */
#define IR_RED            0x00000050
#define IR_GREEN          0x00000051
#define IR_YELLOW         0x00000052
#define IR_BLUE           0x00000053

/* Advanced TV Control IR Codes */
#define IR_INFO           0x00000060
#define IR_GUIDE          0x00000061
#define IR_SETTINGS       0x00000062
#define IR_CC             0x00000063
#define IR_SUBTITLES      0x00000064
#define IR_SAP            0x00000065
#define IR_AUDIO          0x00000066
#define IR_SLEEP          0x00000067
#define IR_PICTURE_MODE   0x00000068
#define IR_ASPECT         0x00000069
#define IR_ZOOM           0x0000006A
#define IR_P_SIZE         0x0000006B

/* Smart TV Feature IR Codes */
#define IR_VOICE          0x00000070
#define IR_MIC            0x00000071
#define IR_LIVE_TV        0x00000072
#define IR_STREAM         0x00000073

/* System & Diagnostic IR Codes */
#define IR_DISPLAY        0x00000080
#define IR_STATUS         0x00000081
#define IR_HELP           0x00000082
#define IR_E_MANUAL       0x00000083

/* Gaming Control IR Codes */
#define IR_GAME_MODE      0x00000090

/* Picture Control IR Codes */
#define IR_MOTION         0x000000A0
#define IR_BACKLIGHT      0x000000A1
#define IR_BRIGHTNESS     0x000000A2

/* Audio Control IR Codes */
#define IR_SOUND_MODE     0x000000B0
#define IR_SYNC           0x000000B1
#define IR_SOUND_OUTPUT   0x000000B2

/* Input & Connectivity IR Codes */
#define IR_MULTI_VIEW     0x000000C0
#define IR_PIP            0x000000C1
#define IR_SCREEN_MIRROR  0x000000C2

/**
 * @brief Get IR code for a button code
 * @param button_code Button code from remote_buttons.h
 * @return IR code structure
 */
ir_code_t get_ir_code(unsigned char button_code);

/**
 * @brief Initialize IR transmission hardware
 * @return 0 on success, -1 on failure
 */
int ir_init(void);

/**
 * @brief Send IR code
 * @param code IR code structure to send
 * @return 0 on success, -1 on failure
 */
int ir_send(ir_code_t code);

/**
 * @brief Deinitialize IR transmission hardware
 */
void ir_cleanup(void);

#endif /* IR_CODES_H */


