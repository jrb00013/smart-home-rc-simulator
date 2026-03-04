#ifndef HANDLERS_H
#define HANDLERS_H

#include "remote_buttons.h"
#include "ir_codes.h"
#include <stdint.h>

/**
 * @file handlers.h
 * @brief Interrupt and event handler definitions for remote control system
 */

/* Handler Return Codes */
#define HANDLER_SUCCESS     0
#define HANDLER_ERROR      -1
#define HANDLER_IGNORE      1

/* Event Types */
typedef enum {
    EVENT_BUTTON_PRESSED,
    EVENT_BUTTON_RELEASED,
    EVENT_IR_TRANSMIT_START,
    EVENT_IR_TRANSMIT_COMPLETE,
    EVENT_IR_TRANSMIT_ERROR,
    EVENT_STATE_CHANGED,
    EVENT_DEVICE_CHANGED,
    EVENT_ERROR,
    EVENT_TIMER_EXPIRED,
    EVENT_HARDWARE_INTERRUPT,
    /* Universal TV Events */
    EVENT_UNIVERSAL_SCAN_STARTED,
    EVENT_UNIVERSAL_SCAN_NEXT,
    EVENT_UNIVERSAL_SCAN_CONFIRMED,
    EVENT_UNIVERSAL_SCAN_CANCELLED,
    EVENT_UNIVERSAL_PROTOCOL_ATTEMPT,
    EVENT_UNIVERSAL_BRAND_DETECTED,
    EVENT_UNIVERSAL_CODE_LEARNED,
    /* System Events */
    EVENT_SYSTEM_STARTUP,
    EVENT_SYSTEM_SHUTDOWN,
    EVENT_SYSTEM_RESET,
    EVENT_SYSTEM_ERROR,
    EVENT_SYSTEM_WARNING
} event_type_t;

/* Error Types */
typedef enum {
    ERROR_NONE,
    ERROR_IR_NOT_INITIALIZED,
    ERROR_INVALID_BUTTON,
    ERROR_INVALID_IR_CODE,
    ERROR_TRANSMISSION_FAILED,
    ERROR_HARDWARE_FAILURE,
    ERROR_PROTOCOL_ERROR,
    ERROR_TIMEOUT,
    ERROR_UNIVERSAL_SCAN_FAILED,
    ERROR_UNIVERSAL_NO_CODES
} error_type_t;

/* Event Structure */
typedef struct {
    event_type_t type;
    uint32_t timestamp;
    union {
        struct {
            unsigned char button_code;
            const char* button_name;
        } button;
        struct {
            ir_code_t code;
            int success;
        } ir_transmit;
        struct {
            error_type_t error;
            const char* message;
        } error;
        struct {
            unsigned char old_device;
            unsigned char new_device;
        } device;
        struct {
            void* data;
        } custom;
        struct {
            unsigned char button_code;
            uint16_t code_index;
            uint16_t total_codes;
        } universal_scan;
        struct {
            uint8_t protocol;
            uint32_t code;
            const char* description;
        } universal_protocol;
        struct {
            uint8_t brand;
            const char* brand_name;
        } universal_brand;
    } data;
} event_t;

/* Handler Function Types */
typedef int (*button_handler_t)(unsigned char button_code, const char* button_name);
typedef int (*ir_handler_t)(ir_code_t code, int success);
typedef int (*error_handler_t)(error_type_t error, const char* message);
typedef int (*state_handler_t)(void);
typedef int (*event_handler_t)(event_t* event);
typedef int (*timer_handler_t)(uint32_t timer_id);
typedef void (*interrupt_handler_t)(void);

/* Universal TV Handler Function Types */
typedef int (*universal_scan_handler_t)(unsigned char button_code, uint16_t code_index, uint16_t total_codes);
typedef int (*universal_protocol_handler_t)(uint8_t protocol, uint32_t code, const char* description);
typedef int (*universal_brand_handler_t)(uint8_t brand, const char* brand_name);

/* Handler Registration Structure */
typedef struct {
    button_handler_t button_pressed;
    button_handler_t button_released;
    ir_handler_t ir_transmit_start;
    ir_handler_t ir_transmit_complete;
    ir_handler_t ir_transmit_error;
    error_handler_t error_handler;
    state_handler_t state_changed;
    event_handler_t custom_event;
    timer_handler_t timer_handler;
    interrupt_handler_t interrupt_handler;
    /* Universal TV Handlers */
    universal_scan_handler_t universal_scan_started;
    universal_scan_handler_t universal_scan_next;
    universal_scan_handler_t universal_scan_confirmed;
    universal_protocol_handler_t universal_protocol_attempt;
    universal_brand_handler_t universal_brand_detected;
} handlers_t;

/**
 * @brief Register button press handler
 * @param handler Function to call when button is pressed
 * @return 0 on success, -1 on failure
 */
int handler_register_button_pressed(button_handler_t handler);

/**
 * @brief Register button release handler
 * @param handler Function to call when button is released
 * @return 0 on success, -1 on failure
 */
int handler_register_button_released(button_handler_t handler);

/**
 * @brief Register IR transmission start handler
 * @param handler Function to call when IR transmission starts
 * @return 0 on success, -1 on failure
 */
int handler_register_ir_transmit_start(ir_handler_t handler);

/**
 * @brief Register IR transmission complete handler
 * @param handler Function to call when IR transmission completes
 * @return 0 on success, -1 on failure
 */
int handler_register_ir_transmit_complete(ir_handler_t handler);

/**
 * @brief Register IR transmission error handler
 * @param handler Function to call when IR transmission fails
 * @return 0 on success, -1 on failure
 */
int handler_register_ir_transmit_error(ir_handler_t handler);

/**
 * @brief Register error handler
 * @param handler Function to call on errors
 * @return 0 on success, -1 on failure
 */
int handler_register_error(error_handler_t handler);

/**
 * @brief Register state change handler
 * @param handler Function to call when state changes
 * @return 0 on success, -1 on failure
 */
int handler_register_state_changed(state_handler_t handler);

/**
 * @brief Register custom event handler
 * @param handler Function to call for custom events
 * @return 0 on success, -1 on failure
 */
int handler_register_custom_event(event_handler_t handler);

/**
 * @brief Register timer handler
 * @param handler Function to call on timer expiration
 * @return 0 on success, -1 on failure
 */
int handler_register_timer(timer_handler_t handler);

/**
 * @brief Register interrupt handler
 * @param handler Function to call on hardware interrupt
 * @return 0 on success, -1 on failure
 */
int handler_register_interrupt(interrupt_handler_t handler);

/**
 * @brief Register all handlers at once
 * @param handlers Structure containing all handler functions
 * @return 0 on success, -1 on failure
 */
int handler_register_all(handlers_t* handlers);

/**
 * @brief Unregister all handlers
 */
void handler_unregister_all(void);

/**
 * @brief Trigger button press event
 * @param button_code Button code that was pressed
 * @return 0 on success, -1 on failure
 */
int handler_trigger_button_pressed(unsigned char button_code);

/**
 * @brief Trigger button release event
 * @param button_code Button code that was released
 * @return 0 on success, -1 on failure
 */
int handler_trigger_button_released(unsigned char button_code);

/**
 * @brief Trigger IR transmission start event
 * @param code IR code being transmitted
 * @return 0 on success, -1 on failure
 */
int handler_trigger_ir_transmit_start(ir_code_t code);

/**
 * @brief Trigger IR transmission complete event
 * @param code IR code that was transmitted
 * @param success 1 if successful, 0 if failed
 * @return 0 on success, -1 on failure
 */
int handler_trigger_ir_transmit_complete(ir_code_t code, int success);

/**
 * @brief Trigger error event
 * @param error Error type
 * @param message Error message
 * @return 0 on success, -1 on failure
 */
int handler_trigger_error(error_type_t error, const char* message);

/**
 * @brief Trigger custom event
 * @param event Event structure
 * @return 0 on success, -1 on failure
 */
int handler_trigger_custom_event(event_t* event);

/**
 * @brief Initialize handler system
 * @return 0 on success, -1 on failure
 */
int handler_init(void);

/**
 * @brief Cleanup handler system
 */
void handler_cleanup(void);

/* Universal TV Event Handlers */

/**
 * @brief Register universal scan started handler
 * @param handler Function to call when scan mode starts
 * @return 0 on success, -1 on failure
 */
int handler_register_universal_scan_started(universal_scan_handler_t handler);

/**
 * @brief Register universal scan next handler
 * @param handler Function to call when scanning to next code
 * @return 0 on success, -1 on failure
 */
int handler_register_universal_scan_next(universal_scan_handler_t handler);

/**
 * @brief Register universal scan confirmed handler
 * @param handler Function to call when code is confirmed
 * @return 0 on success, -1 on failure
 */
int handler_register_universal_scan_confirmed(universal_scan_handler_t handler);

/**
 * @brief Register universal protocol attempt handler
 * @param handler Function to call when trying a protocol
 * @return 0 on success, -1 on failure
 */
int handler_register_universal_protocol_attempt(universal_protocol_handler_t handler);

/**
 * @brief Register universal brand detected handler
 * @param handler Function to call when TV brand is detected
 * @return 0 on success, -1 on failure
 */
int handler_register_universal_brand_detected(universal_brand_handler_t handler);

/**
 * @brief Trigger universal scan started event
 * @param button_code Button being scanned
 * @param total_codes Total number of codes to try
 * @return 0 on success, -1 on failure
 */
int handler_trigger_universal_scan_started(unsigned char button_code, uint16_t total_codes);

/**
 * @brief Trigger universal scan next event
 * @param button_code Button being scanned
 * @param code_index Current code index
 * @param total_codes Total number of codes
 * @return 0 on success, -1 on failure
 */
int handler_trigger_universal_scan_next(unsigned char button_code, uint16_t code_index, uint16_t total_codes);

/**
 * @brief Trigger universal scan confirmed event
 * @param button_code Button that was confirmed
 * @param code_index Confirmed code index
 * @param total_codes Total number of codes
 * @return 0 on success, -1 on failure
 */
int handler_trigger_universal_scan_confirmed(unsigned char button_code, uint16_t code_index, uint16_t total_codes);

/**
 * @brief Trigger universal protocol attempt event
 * @param protocol Protocol being tried
 * @param code IR code being sent
 * @param description Protocol description
 * @return 0 on success, -1 on failure
 */
int handler_trigger_universal_protocol_attempt(uint8_t protocol, uint32_t code, const char* description);

/**
 * @brief Trigger universal brand detected event
 * @param brand TV brand identifier
 * @param brand_name Brand name string
 * @return 0 on success, -1 on failure
 */
int handler_trigger_universal_brand_detected(uint8_t brand, const char* brand_name);

/* Interrupt callback functions (bridges assembly -> C -> JavaScript) */

/**
 * @brief C callback function called from assembly interrupt handlers
 * This is the bridge between hardware interrupts and C handlers
 */
void interrupt_callback(void);

/**
 * @brief Set interrupt type before interrupt occurs
 * @param type 0 = timer interrupt, 1 = GPIO interrupt (button press)
 */
void interrupt_set_type(int type);

/**
 * @brief Set button code from hardware interrupt detection
 * @param button_code The button code detected by hardware GPIO
 * 
 * This function should be called by hardware-specific code when a button
 * press is detected, before triggering the interrupt.
 */
void interrupt_set_button(unsigned char button_code);

/**
 * @brief Get last interrupt timestamp
 * @return Timestamp of last interrupt
 */
uint32_t interrupt_get_timestamp(void);

/**
 * @brief GPIO interrupt handler (assembly ISR)
 * Called when a button press is detected in hardware. In simulation, call
 * interrupt_set_button(button_code) first, then this, to run the full ISR path.
 */
void ir_gpio_interrupt_handler(void);

#endif /* HANDLERS_H */

