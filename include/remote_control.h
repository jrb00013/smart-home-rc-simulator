#ifndef REMOTE_CONTROL_H
#define REMOTE_CONTROL_H

#include "remote_buttons.h"
#include "ir_codes.h"

/**
 * @file remote_control.h
 * @brief Main remote control interface functions
 */

/* Forward declaration */
struct connection_config;

/* Remote Control State */
typedef struct {
    unsigned char current_device;  /* Currently controlled device */
    unsigned char volume_level;   /* Current volume level (0-100) */
    unsigned char channel;         /* Current channel */
    int is_powered_on;             /* Power state */
} remote_state_t;

/**
 * @brief Initialize remote control system
 * @return 0 on success, -1 on failure
 */
int remote_init(void);

/**
 * @brief Press a button on the remote
 * @param button_code Button code from remote_buttons.h
 * @return 0 on success, -1 on failure
 */
int remote_press_button(unsigned char button_code);

/**
 * @brief Get button name from button code
 * @param button_code Button code
 * @return Button name string, or "UNKNOWN" if not found
 */
const char* get_button_name(unsigned char button_code);

/**
 * @brief Get current remote state
 * @return Pointer to remote state structure
 */
remote_state_t* remote_get_state(void);

/**
 * @brief Set target device for remote control
 * @param device_type Device type identifier
 * @return 0 on success, -1 on failure
 */
int remote_set_device(unsigned char device_type);

/**
 * @brief Cleanup remote control system
 */
void remote_cleanup(void);

/**
 * @brief Ensure connection to target device
 * @param device_type Device type to connect to
 * @return 0 on success, -1 on failure
 */
int remote_ensure_connection(unsigned char device_type);

/**
 * @brief Check if remote is connected to device
 * @return 1 if connected, 0 if disconnected
 */
int remote_is_connected(void);

/* Device Type Constants */
#define DEVICE_TV          0x01
#define DEVICE_DVD         0x02
#define DEVICE_STREAMING   0x03
#define DEVICE_CABLE       0x04
#define DEVICE_AUDIO       0x05

#endif /* REMOTE_CONTROL_H */

