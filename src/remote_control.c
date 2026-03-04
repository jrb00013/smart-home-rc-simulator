#include "../include/remote_control.h"
#include "../include/remote_buttons.h"
#include "../include/handlers.h"
#include "../include/connection.h"
#include "../include/system_handler.h"
#include "../include/latency.h"
#ifdef SIMULATOR
#include "../include/tv_simulator.h"
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* External handler registration (from handlers.c) */
extern handlers_t registered_handlers;

/* External connection config (from connection.c) */
extern connection_config_t connection_config;

/* Delay function for retries */
static void delay_ms(uint32_t ms) {
#ifdef _WIN32
    Sleep(ms);
#else
    usleep(ms * 1000);
#endif
}

/* Remote Control State */
static remote_state_t remote_state = {
    .current_device = DEVICE_TV,
    .volume_level = 50,
    .channel = 1,
    .is_powered_on = 0
};

static int remote_initialized = 0;
static int universal_mode_enabled = 0;

/**
 * @brief Get button name from button code
 */
const char* get_button_name(unsigned char button_code) {
    switch (button_code) {
        /* Streaming Services */
        case BUTTON_YOUTUBE: return "YouTube";
        case BUTTON_NETFLIX: return "Netflix";
        case BUTTON_AMAZON_PRIME: return "Amazon Prime";
        case BUTTON_HBO_MAX: return "HBO Max";
        
        /* Basic Controls */
        case BUTTON_POWER: return "Power";
        case BUTTON_VOLUME_UP: return "Volume Up";
        case BUTTON_VOLUME_DOWN: return "Volume Down";
        case BUTTON_MUTE: return "Mute";
        case BUTTON_CHANNEL_UP: return "Channel Up";
        case BUTTON_CHANNEL_DOWN: return "Channel Down";
        
        /* Navigation */
        case BUTTON_HOME: return "Home";
        case BUTTON_MENU: return "Menu";
        case BUTTON_BACK: return "Back";
        case BUTTON_EXIT: return "Exit";
        case BUTTON_OPTIONS: return "Options";
        case BUTTON_INPUT: return "Input";
        case BUTTON_SOURCE: return "Source";
        
        /* Directional Pad */
        case BUTTON_UP: return "Up";
        case BUTTON_DOWN: return "Down";
        case BUTTON_LEFT: return "Left";
        case BUTTON_RIGHT: return "Right";
        case BUTTON_OK: return "OK";
        case BUTTON_ENTER: return "Enter";
        
        /* Playback Controls */
        case BUTTON_PLAY: return "Play";
        case BUTTON_PAUSE: return "Pause";
        case BUTTON_STOP: return "Stop";
        case BUTTON_FAST_FORWARD: return "Fast Forward";
        case BUTTON_REWIND: return "Rewind";
        case BUTTON_RECORD: return "Record";
        
        /* Number Pad */
        case BUTTON_0: return "0";
        case BUTTON_1: return "1";
        case BUTTON_2: return "2";
        case BUTTON_3: return "3";
        case BUTTON_4: return "4";
        case BUTTON_5: return "5";
        case BUTTON_6: return "6";
        case BUTTON_7: return "7";
        case BUTTON_8: return "8";
        case BUTTON_9: return "9";
        case BUTTON_DASH: return "Dash (-)";
        
        /* Color Buttons */
        case BUTTON_RED: return "Red";
        case BUTTON_GREEN: return "Green";
        case BUTTON_YELLOW: return "Yellow";
        case BUTTON_BLUE: return "Blue";
        
        /* Advanced TV Controls */
        case BUTTON_INFO: return "Info";
        case BUTTON_GUIDE: return "Guide";
        case BUTTON_SETTINGS: return "Settings";
        case BUTTON_CC: return "Closed Captions";
        case BUTTON_SUBTITLES: return "Subtitles";
        case BUTTON_SAP: return "SAP";
        case BUTTON_AUDIO: return "Audio";
        case BUTTON_SLEEP: return "Sleep";
        case BUTTON_PICTURE_MODE: return "Picture Mode";
        case BUTTON_ASPECT: return "Aspect";
        case BUTTON_ZOOM: return "Zoom";
        case BUTTON_P_SIZE: return "Picture Size";
        
        /* Smart TV Features */
        case BUTTON_VOICE: return "Voice";
        case BUTTON_MIC: return "Microphone";
        case BUTTON_LIVE_TV: return "Live TV";
        case BUTTON_STREAM: return "Stream";
        
        /* System & Diagnostic */
        case BUTTON_DISPLAY: return "Display";
        case BUTTON_STATUS: return "Status";
        case BUTTON_HELP: return "Help";
        case BUTTON_E_MANUAL: return "E-Manual";
        
        /* Gaming Controls */
        case BUTTON_GAME_MODE: return "Game Mode";
        
        /* Picture Controls */
        case BUTTON_MOTION: return "Motion";
        case BUTTON_BACKLIGHT: return "Backlight";
        case BUTTON_BRIGHTNESS: return "Brightness";
        
        /* Audio Controls */
        case BUTTON_SOUND_MODE: return "Sound Mode";
        case BUTTON_SYNC: return "Sync";
        case BUTTON_SOUND_OUTPUT: return "Sound Output";
        
        /* Input & Connectivity */
        case BUTTON_MULTI_VIEW: return "Multi View";
        case BUTTON_PIP: return "Picture in Picture";
        case BUTTON_SCREEN_MIRROR: return "Screen Mirror";
        
        default: return "UNKNOWN";
    }
}

/**
 * @brief Initialize remote control system
 */
int remote_init(void) {
    if (remote_initialized) {
        return 0;
    }
    
    /* Initialize system handler first */
    if (system_handler_init() != 0) {
        fprintf(stderr, "[Remote] Failed to initialize system handler\n");
        return -1;
    }
    
    /* Initialize TV simulator if enabled */
#ifdef SIMULATOR
    if (tv_simulator_init() != 0) {
        printf("[Remote] Warning: Could not connect to TV simulator\n");
        printf("[Remote] Simulator may not be running. Start it with:\n");
        printf("[Remote]   Desktop: python test_simulator/main.py\n");
        printf("[Remote]   Web:     python test_simulator/web_server.py\n");
        printf("[Remote] Continuing without simulator...\n");
        /* Don't fail initialization if simulator is not available */
    } else {
        printf("[Remote] Connected to TV simulator\n");
    }
#endif
    
    /* Use system handler for initialization */
    return system_init();
}

/**
 * @brief Press a button on the remote
 */
int remote_press_button(unsigned char button_code) {
    if (!remote_initialized) {
        fprintf(stderr, "[Remote] Error: Remote not initialized. Call remote_init() first.\n");
        return -1;
    }
    
    const char* button_name = get_button_name(button_code);
    if (strcmp(button_name, "UNKNOWN") == 0) {
        fprintf(stderr, "[Remote] Error: Unknown button code: 0x%02X\n", button_code);
        handler_trigger_error(ERROR_INVALID_BUTTON, "Unknown button code");
        return -1;
    }
    
    printf("[Remote] Pressing button: %s (0x%02X)\n", button_name, button_code);
    
    /* Measure latency: Button press to IR transmission */
    uint64_t button_start = LATENCY_MEASURE_START();
    
#ifdef SIMULATOR
    /* Route through assembly ISR so the real interrupt path is exercised:
     * interrupt_set_button -> ir_gpio_interrupt_handler (assembly) -> interrupt_callback
     * -> tv_simulator_send_button + handler_trigger_button_pressed */
    interrupt_set_button(button_code);
    ir_gpio_interrupt_handler();
#else
    /* Trigger button press event (non-simulator path) */
    handler_trigger_button_pressed(button_code);
#endif
    
    /* Update state for certain buttons */
    switch (button_code) {
        case BUTTON_POWER:
            remote_state.is_powered_on = !remote_state.is_powered_on;
            printf("[Remote] Power: %s\n", remote_state.is_powered_on ? "ON" : "OFF");
            break;
        
        case BUTTON_VOLUME_UP:
            if (remote_state.volume_level < 100) {
                remote_state.volume_level++;
            }
            printf("[Remote] Volume: %d%%\n", remote_state.volume_level);
            break;
        
        case BUTTON_VOLUME_DOWN:
            if (remote_state.volume_level > 0) {
                remote_state.volume_level--;
            }
            printf("[Remote] Volume: %d%%\n", remote_state.volume_level);
            break;
        
        case BUTTON_CHANNEL_UP:
            remote_state.channel++;
            printf("[Remote] Channel: %d\n", remote_state.channel);
            break;
        
        case BUTTON_CHANNEL_DOWN:
            if (remote_state.channel > 1) {
                remote_state.channel--;
            }
            printf("[Remote] Channel: %d\n", remote_state.channel);
            break;
        
        case BUTTON_0:
        case BUTTON_1:
        case BUTTON_2:
        case BUTTON_3:
        case BUTTON_4:
        case BUTTON_5:
        case BUTTON_6:
        case BUTTON_7:
        case BUTTON_8:
        case BUTTON_9:
            /* Channel number entry would be handled by a state machine */
            printf("[Remote] Number pad: %s\n", button_name);
            break;
    }
    
    /* Ensure connection before sending - always verify and establish if needed */
    unsigned char current_connected = connection_get_connected_device();
    if (!remote_is_connected() || remote_state.current_device != current_connected) {
        printf("[Remote] Ensuring connection to device %d...\n", remote_state.current_device);
        if (remote_ensure_connection(remote_state.current_device) != 0) {
            fprintf(stderr, "[Remote] Failed to establish connection to device %d\n", remote_state.current_device);
            handler_trigger_error(ERROR_TRANSMISSION_FAILED, "Connection not established");
            
            /* Try one more time with a delay */
            printf("[Remote] Retrying connection establishment...\n");
            delay_ms(connection_config.retry_delay_ms);
            if (remote_ensure_connection(remote_state.current_device) != 0) {
                fprintf(stderr, "[Remote] Connection establishment failed after retry\n");
                return -1;
            }
            printf("[Remote] Connection established on retry\n");
        }
    }
    
    /* Get IR code and send it with connection retry */
    ir_code_t ir_code = get_ir_code(button_code);
    if (connection_send_with_retry(ir_code) != 0) {
        fprintf(stderr, "[Remote] Failed to send IR code\n");
        handler_trigger_error(ERROR_TRANSMISSION_FAILED, "Failed to send IR code");
        return -1;
    }
    
    /* Trigger state change if applicable */
    if (registered_handlers.state_changed != NULL) {
        registered_handlers.state_changed();
    }
    
    /* Measure latency: Complete button press */
    LATENCY_MEASURE_END(button_start, "button_press", button_code);
    
    return 0;
}

/**
 * @brief Get current remote state
 */
remote_state_t* remote_get_state(void) {
    return &remote_state;
}

/**
 * @brief Set target device for remote control
 */
int remote_set_device(unsigned char device_type) {
    if (!remote_initialized) {
        fprintf(stderr, "[Remote] Error: Remote not initialized\n");
        return -1;
    }
    
    const char* device_name = "Unknown";
    switch (device_type) {
        case DEVICE_TV: device_name = "TV"; break;
        case DEVICE_DVD: device_name = "DVD"; break;
        case DEVICE_STREAMING: device_name = "Streaming"; break;
        case DEVICE_CABLE: device_name = "Cable"; break;
        case DEVICE_AUDIO: device_name = "Audio"; break;
    }
    
    unsigned char old_device = remote_state.current_device;
    remote_state.current_device = device_type;
    printf("[Remote] Device set to: %s\n", device_name);
    
    /* Trigger state change event */
    if (registered_handlers.state_changed != NULL) {
        registered_handlers.state_changed();
    }
    
    return 0;
}

/**
 * @brief Ensure connection to target device
 */
int remote_ensure_connection(unsigned char device_type) {
    if (!remote_initialized) {
        fprintf(stderr, "[Remote] Error: Remote not initialized\n");
        return -1;
    }
    
    if (connection_is_connected() && remote_state.current_device == device_type) {
        return 0;  /* Already connected */
    }
    
    return connection_establish(device_type);
}

/**
 * @brief Check if remote is connected to device
 */
int remote_is_connected(void) {
    return connection_is_connected();
}

/**
 * @brief Internal cleanup function
 */
static void remote_cleanup_internal(void) {
    if (!remote_initialized) {
        return;
    }
    
#ifdef SIMULATOR
    tv_simulator_cleanup();
#endif
    
    connection_cleanup();
    ir_cleanup();
    handler_cleanup();
    printf("[Remote] Remote control cleaned up\n");
    remote_initialized = 0;
}

/**
 * @brief Cleanup remote control system
 */
void remote_cleanup(void) {
    system_cleanup();
    system_handler_cleanup();
}

