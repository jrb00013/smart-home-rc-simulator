#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"

/**
 * @file main.c
 * @brief Main program for Phillips Universal Remote Control
 * 
 * This program demonstrates how to use the remote control system
 * to send IR commands for various buttons.
 */

/* Function prototypes */
void print_menu(void);
void print_button_list(void);
void demo_streaming_services(void);
void demo_basic_controls(void);
void demo_navigation(void);
void demo_playback(void);
void demo_advanced_features(void);

/**
 * @brief Print main menu
 */
void print_menu(void) {
    printf("\n");
    printf("========================================\n");
    printf("  Phillips Universal Remote Control\n");
    printf("========================================\n");
    printf("1. Demo Streaming Services (YouTube, Netflix, Prime, HBO Max)\n");
    printf("2. Demo Basic Controls (Power, Volume, Channel)\n");
    printf("3. Demo Navigation (Home, Menu, D-Pad)\n");
    printf("4. Demo Playback Controls (Play, Pause, Stop, etc.)\n");
    printf("5. Demo Advanced Features (Settings, Info, Guide, etc.)\n");
    printf("6. Show All Available Buttons\n");
    printf("7. Interactive Button Press\n");
    printf("0. Exit\n");
    printf("========================================\n");
    printf("Enter choice: ");
}

/**
 * @brief Print list of all available buttons
 */
void print_button_list(void) {
    printf("\n");
    printf("========================================\n");
    printf("  Available Remote Buttons\n");
    printf("========================================\n");
    printf("\nStreaming Services:\n");
    printf("  - YouTube (0x%02X)\n", BUTTON_YOUTUBE);
    printf("  - Netflix (0x%02X)\n", BUTTON_NETFLIX);
    printf("  - Amazon Prime (0x%02X)\n", BUTTON_AMAZON_PRIME);
    printf("  - HBO Max (0x%02X)\n", BUTTON_HBO_MAX);
    
    printf("\nBasic Controls:\n");
    printf("  - Power (0x%02X)\n", BUTTON_POWER);
    printf("  - Volume Up/Down (0x%02X/0x%02X)\n", BUTTON_VOLUME_UP, BUTTON_VOLUME_DOWN);
    printf("  - Mute (0x%02X)\n", BUTTON_MUTE);
    printf("  - Channel Up/Down (0x%02X/0x%02X)\n", BUTTON_CHANNEL_UP, BUTTON_CHANNEL_DOWN);
    
    printf("\nNavigation:\n");
    printf("  - Home (0x%02X)\n", BUTTON_HOME);
    printf("  - Menu (0x%02X)\n", BUTTON_MENU);
    printf("  - Back (0x%02X)\n", BUTTON_BACK);
    printf("  - Exit (0x%02X)\n", BUTTON_EXIT);
    printf("  - Options (0x%02X)\n", BUTTON_OPTIONS);
    printf("  - Input/Source (0x%02X/0x%02X)\n", BUTTON_INPUT, BUTTON_SOURCE);
    printf("  - D-Pad: Up, Down, Left, Right, OK (0x%02X-0x%02X)\n", BUTTON_UP, BUTTON_OK);
    
    printf("\nPlayback Controls:\n");
    printf("  - Play (0x%02X)\n", BUTTON_PLAY);
    printf("  - Pause (0x%02X)\n", BUTTON_PAUSE);
    printf("  - Stop (0x%02X)\n", BUTTON_STOP);
    printf("  - Fast Forward (0x%02X)\n", BUTTON_FAST_FORWARD);
    printf("  - Rewind (0x%02X)\n", BUTTON_REWIND);
    printf("  - Record (0x%02X)\n", BUTTON_RECORD);
    
    printf("\nNumber Pad:\n");
    printf("  - 0-9 (0x%02X-0x%02X)\n", BUTTON_0, BUTTON_9);
    printf("  - Dash (-) (0x%02X)\n", BUTTON_DASH);
    
    printf("\nColor Buttons:\n");
    printf("  - Red, Green, Yellow, Blue (0x%02X-0x%02X)\n", BUTTON_RED, BUTTON_BLUE);
    
    printf("\nAdvanced TV Controls:\n");
    printf("  - Info (0x%02X)\n", BUTTON_INFO);
    printf("  - Guide (0x%02X)\n", BUTTON_GUIDE);
    printf("  - Settings (0x%02X)\n", BUTTON_SETTINGS);
    printf("  - CC/Subtitles (0x%02X/0x%02X)\n", BUTTON_CC, BUTTON_SUBTITLES);
    printf("  - SAP/Audio (0x%02X/0x%02X)\n", BUTTON_SAP, BUTTON_AUDIO);
    printf("  - Sleep (0x%02X)\n", BUTTON_SLEEP);
    printf("  - Picture Mode (0x%02X)\n", BUTTON_PICTURE_MODE);
    printf("  - Aspect/Zoom/P.Size (0x%02X-0x%02X)\n", BUTTON_ASPECT, BUTTON_P_SIZE);
    
    printf("\nSmart TV Features:\n");
    printf("  - Voice/Mic (0x%02X/0x%02X)\n", BUTTON_VOICE, BUTTON_MIC);
    printf("  - Live TV (0x%02X)\n", BUTTON_LIVE_TV);
    printf("  - Stream (0x%02X)\n", BUTTON_STREAM);
    
    printf("\nSystem & Diagnostic:\n");
    printf("  - Display/Status (0x%02X/0x%02X)\n", BUTTON_DISPLAY, BUTTON_STATUS);
    printf("  - Help/E-Manual (0x%02X/0x%02X)\n", BUTTON_HELP, BUTTON_E_MANUAL);
    
    printf("\nGaming Controls:\n");
    printf("  - Game Mode (0x%02X)\n", BUTTON_GAME_MODE);
    
    printf("\nPicture Controls:\n");
    printf("  - Motion (0x%02X)\n", BUTTON_MOTION);
    printf("  - Backlight/Brightness (0x%02X/0x%02X)\n", BUTTON_BACKLIGHT, BUTTON_BRIGHTNESS);
    
    printf("\nAudio Controls:\n");
    printf("  - Sound Mode (0x%02X)\n", BUTTON_SOUND_MODE);
    printf("  - Sync (0x%02X)\n", BUTTON_SYNC);
    printf("  - Sound Output (0x%02X)\n", BUTTON_SOUND_OUTPUT);
    
    printf("\nInput & Connectivity:\n");
    printf("  - Multi View (0x%02X)\n", BUTTON_MULTI_VIEW);
    printf("  - PIP (0x%02X)\n", BUTTON_PIP);
    printf("  - Screen Mirror (0x%02X)\n", BUTTON_SCREEN_MIRROR);
    printf("\n");
}

/**
 * @brief Demo streaming service buttons
 */
void demo_streaming_services(void) {
    printf("\n=== Streaming Services Demo ===\n");
    printf("Testing dedicated streaming service buttons...\n\n");
    
    remote_press_button(BUTTON_YOUTUBE);
    printf("\n");
    
    remote_press_button(BUTTON_NETFLIX);
    printf("\n");
    
    remote_press_button(BUTTON_AMAZON_PRIME);
    printf("\n");
    
    remote_press_button(BUTTON_HBO_MAX);
    printf("\n");
}

/**
 * @brief Demo basic control buttons
 */
void demo_basic_controls(void) {
    printf("\n=== Basic Controls Demo ===\n");
    
    remote_press_button(BUTTON_POWER);
    printf("\n");
    
    remote_press_button(BUTTON_VOLUME_UP);
    printf("\n");
    
    remote_press_button(BUTTON_VOLUME_UP);
    printf("\n");
    
    remote_press_button(BUTTON_VOLUME_DOWN);
    printf("\n");
    
    remote_press_button(BUTTON_MUTE);
    printf("\n");
    
    remote_press_button(BUTTON_CHANNEL_UP);
    printf("\n");
    
    remote_press_button(BUTTON_CHANNEL_DOWN);
    printf("\n");
}

/**
 * @brief Demo navigation buttons
 */
void demo_navigation(void) {
    printf("\n=== Navigation Demo ===\n");
    
    remote_press_button(BUTTON_HOME);
    printf("\n");
    
    remote_press_button(BUTTON_MENU);
    printf("\n");
    
    remote_press_button(BUTTON_UP);
    printf("\n");
    
    remote_press_button(BUTTON_DOWN);
    printf("\n");
    
    remote_press_button(BUTTON_LEFT);
    printf("\n");
    
    remote_press_button(BUTTON_RIGHT);
    printf("\n");
    
    remote_press_button(BUTTON_OK);
    printf("\n");
    
    remote_press_button(BUTTON_BACK);
    printf("\n");
    
    remote_press_button(BUTTON_EXIT);
    printf("\n");
    
    remote_press_button(BUTTON_INPUT);
    printf("\n");
}

/**
 * @brief Demo playback controls
 */
void demo_playback(void) {
    printf("\n=== Playback Controls Demo ===\n");
    
    remote_press_button(BUTTON_PLAY);
    printf("\n");
    
    remote_press_button(BUTTON_PAUSE);
    printf("\n");
    
    remote_press_button(BUTTON_STOP);
    printf("\n");
    
    remote_press_button(BUTTON_FAST_FORWARD);
    printf("\n");
    
    remote_press_button(BUTTON_REWIND);
    printf("\n");
    
    remote_press_button(BUTTON_RECORD);
    printf("\n");
}

/**
 * @brief Demo advanced features
 */
void demo_advanced_features(void) {
    printf("\n=== Advanced Features Demo ===\n");
    
    remote_press_button(BUTTON_INFO);
    printf("\n");
    
    remote_press_button(BUTTON_GUIDE);
    printf("\n");
    
    remote_press_button(BUTTON_SETTINGS);
    printf("\n");
    
    remote_press_button(BUTTON_CC);
    printf("\n");
    
    remote_press_button(BUTTON_PICTURE_MODE);
    printf("\n");
    
    remote_press_button(BUTTON_SLEEP);
    printf("\n");
    
    remote_press_button(BUTTON_VOICE);
    printf("\n");
    
    remote_press_button(BUTTON_GAME_MODE);
    printf("\n");
}

/**
 * @brief Interactive button press
 */
void interactive_button_press(void) {
    char input[256];
    unsigned char button_code;
    
    printf("\n=== Interactive Button Press ===\n");
    printf("Enter button code in hex (e.g., 0x01 for YouTube, or 'q' to quit): ");
    
    if (fgets(input, sizeof(input), stdin) == NULL) {
        return;
    }
    
    /* Remove newline */
    input[strcspn(input, "\n")] = 0;
    
    if (input[0] == 'q' || input[0] == 'Q') {
        return;
    }
    
    /* Parse hex input */
    if (sscanf(input, "0x%hhx", &button_code) == 1 || sscanf(input, "%hhx", &button_code) == 1) {
        remote_press_button(button_code);
    } else {
        printf("Invalid input. Please enter hex code (e.g., 0x01)\n");
    }
}

/**
 * @brief Main function
 */
int main(int argc, char* argv[]) {
    int choice;
    char input[256];
    
    printf("Phillips Universal Remote Control\n");
    printf("Initializing...\n");
    
    /* Initialize remote control */
    if (remote_init() != 0) {
        fprintf(stderr, "Failed to initialize remote control\n");
        return 1;
    }
    
    /* Main loop */
    while (1) {
        print_menu();
        
        if (fgets(input, sizeof(input), stdin) == NULL) {
            break;
        }
        
        choice = atoi(input);
        
        switch (choice) {
            case 1:
                demo_streaming_services();
                break;
            case 2:
                demo_basic_controls();
                break;
            case 3:
                demo_navigation();
                break;
            case 4:
                demo_playback();
                break;
            case 5:
                demo_advanced_features();
                break;
            case 6:
                print_button_list();
                break;
            case 7:
                interactive_button_press();
                break;
            case 0:
                printf("Exiting...\n");
                remote_cleanup();
                return 0;
            default:
                printf("Invalid choice. Please try again.\n");
                break;
        }
    }
    
    remote_cleanup();
    return 0;
}


