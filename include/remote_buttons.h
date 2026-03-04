#ifndef REMOTE_BUTTONS_H
#define REMOTE_BUTTONS_H

/**
 * @file remote_buttons.h
 * @brief Button definitions and enumerations for Phillips Universal Remote
 */

/* Streaming Service Buttons */
#define BUTTON_YOUTUBE     0x01
#define BUTTON_NETFLIX     0x02
#define BUTTON_AMAZON_PRIME 0x03
#define BUTTON_HBO_MAX     0x04

/* Basic Control Buttons */
#define BUTTON_POWER       0x10
#define BUTTON_VOLUME_UP   0x11
#define BUTTON_VOLUME_DOWN 0x12
#define BUTTON_MUTE        0x13
#define BUTTON_CHANNEL_UP  0x14
#define BUTTON_CHANNEL_DOWN 0x15

/* Navigation Buttons */
#define BUTTON_HOME        0x20
#define BUTTON_MENU        0x21
#define BUTTON_BACK        0x22
#define BUTTON_EXIT        0x23
#define BUTTON_OPTIONS     0x24
#define BUTTON_INPUT       0x25
#define BUTTON_SOURCE      0x26

/* Directional Pad */
#define BUTTON_UP          0x30
#define BUTTON_DOWN        0x31
#define BUTTON_LEFT        0x32
#define BUTTON_RIGHT       0x33
#define BUTTON_OK          0x34
#define BUTTON_ENTER       0x35

/* Playback Controls */
#define BUTTON_PLAY        0x40
#define BUTTON_PAUSE       0x41
#define BUTTON_STOP        0x42
#define BUTTON_FAST_FORWARD 0x43
#define BUTTON_REWIND      0x44
#define BUTTON_RECORD      0x45

/* Number Pad */
#define BUTTON_0           0x50
#define BUTTON_1           0x51
#define BUTTON_2           0x52
#define BUTTON_3           0x53
#define BUTTON_4           0x54
#define BUTTON_5           0x55
#define BUTTON_6           0x56
#define BUTTON_7           0x57
#define BUTTON_8           0x58
#define BUTTON_9           0x59
#define BUTTON_DASH        0x5A

/* Color Buttons */
#define BUTTON_RED         0x60
#define BUTTON_GREEN       0x61
#define BUTTON_YELLOW      0x62
#define BUTTON_BLUE        0x63

/* Advanced TV Controls */
#define BUTTON_INFO        0x70
#define BUTTON_GUIDE       0x71
#define BUTTON_SETTINGS    0x72
#define BUTTON_CC          0x73
#define BUTTON_SUBTITLES   0x74
#define BUTTON_SAP         0x75
#define BUTTON_AUDIO       0x76
#define BUTTON_SLEEP       0x77
#define BUTTON_PICTURE_MODE 0x78
#define BUTTON_ASPECT      0x79
#define BUTTON_ZOOM        0x7A
#define BUTTON_P_SIZE      0x7B

/* Smart TV Features */
#define BUTTON_VOICE       0x80
#define BUTTON_MIC         0x81
#define BUTTON_LIVE_TV     0x82
#define BUTTON_STREAM      0x83

/* System & Diagnostic */
#define BUTTON_DISPLAY     0x90
#define BUTTON_STATUS      0x91
#define BUTTON_HELP        0x92
#define BUTTON_E_MANUAL    0x93

/* Gaming Controls */
#define BUTTON_GAME_MODE   0xA0

/* Picture Controls */
#define BUTTON_MOTION      0xB0
#define BUTTON_BACKLIGHT   0xB1
#define BUTTON_BRIGHTNESS  0xB2

/* Audio Controls */
#define BUTTON_SOUND_MODE  0xC0
#define BUTTON_SYNC        0xC1
#define BUTTON_SOUND_OUTPUT 0xC2

/* Input & Connectivity */
#define BUTTON_MULTI_VIEW  0xD0
#define BUTTON_PIP         0xD1
#define BUTTON_SCREEN_MIRROR 0xD2

/* Button Type Enumeration */
typedef enum {
    BTN_STREAMING,
    BTN_BASIC,
    BTN_NAVIGATION,
    BTN_DIRECTIONAL,
    BTN_PLAYBACK,
    BTN_NUMBER,
    BTN_COLOR,
    BTN_ADVANCED,
    BTN_SMART,
    BTN_SYSTEM,
    BTN_GAMING,
    BTN_PICTURE,
    BTN_AUDIO,
    BTN_CONNECTIVITY
} button_type_t;

/* Button Structure */
typedef struct {
    unsigned char code;
    const char* name;
    button_type_t type;
} button_t;

#endif /* REMOTE_BUTTONS_H */


