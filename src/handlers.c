#define _POSIX_C_SOURCE 199309L
#include "../include/handlers.h"
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"
#ifdef SIMULATOR
# include "../include/tv_simulator.h"
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifdef _WIN32
# include <windows.h>
#else
# include <unistd.h>
# include <signal.h>
# include <sys/time.h>
#endif

/* Forward declaration for interrupt callback (called from assembly) */
void interrupt_callback(void);

/* Handler Storage */
handlers_t registered_handlers = {0};
static int handlers_initialized = 0;

/* Interrupt callback storage (used by handler_register_interrupt and assembly path) */
static interrupt_handler_t interrupt_callback_storage = NULL;

/**
 * @brief Initialize handler system
 */
int handler_init(void) {
    if (handlers_initialized) {
        return 0;
    }
    
    /* Clear all handlers */
    memset(&registered_handlers, 0, sizeof(handlers_t));
    
    handlers_initialized = 1;
    return 0;
}

/**
 * @brief Cleanup handler system
 */
void handler_cleanup(void) {
    if (!handlers_initialized) {
        return;
    }
    
    handler_unregister_all();
    handlers_initialized = 0;
}

/**
 * @brief Register button press handler
 */
int handler_register_button_pressed(button_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.button_pressed = handler;
    return 0;
}

/**
 * @brief Register button release handler
 */
int handler_register_button_released(button_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.button_released = handler;
    return 0;
}

/**
 * @brief Register IR transmission start handler
 */
int handler_register_ir_transmit_start(ir_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.ir_transmit_start = handler;
    return 0;
}

/**
 * @brief Register IR transmission complete handler
 */
int handler_register_ir_transmit_complete(ir_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.ir_transmit_complete = handler;
    return 0;
}

/**
 * @brief Register IR transmission error handler
 */
int handler_register_ir_transmit_error(ir_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.ir_transmit_error = handler;
    return 0;
}

/**
 * @brief Register error handler
 */
int handler_register_error(error_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.error_handler = handler;
    return 0;
}

/**
 * @brief Register state change handler
 */
int handler_register_state_changed(state_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.state_changed = handler;
    return 0;
}

/**
 * @brief Register custom event handler
 */
int handler_register_custom_event(event_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.custom_event = handler;
    return 0;
}

/**
 * @brief Register timer handler
 */
int handler_register_timer(timer_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.timer_handler = handler;
    return 0;
}

/**
 * @brief Register interrupt handler
 */
int handler_register_interrupt(interrupt_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    registered_handlers.interrupt_handler = handler;
    interrupt_callback_storage = handler;  /* Store for assembly callback */
    return 0;
}

/**
 * @brief Register all handlers at once
 */
int handler_register_all(handlers_t* handlers) {
    if (!handlers_initialized) {
        handler_init();
    }
    
    if (handlers == NULL) {
        return -1;
    }
    
    registered_handlers = *handlers;
    return 0;
}

/**
 * @brief Unregister all handlers
 */
void handler_unregister_all(void) {
    memset(&registered_handlers, 0, sizeof(handlers_t));
}

/* Universal TV Handler Registration Functions */

int handler_register_universal_scan_started(universal_scan_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    registered_handlers.universal_scan_started = handler;
    return 0;
}

int handler_register_universal_scan_next(universal_scan_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    registered_handlers.universal_scan_next = handler;
    return 0;
}

int handler_register_universal_scan_confirmed(universal_scan_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    registered_handlers.universal_scan_confirmed = handler;
    return 0;
}

int handler_register_universal_protocol_attempt(universal_protocol_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    registered_handlers.universal_protocol_attempt = handler;
    return 0;
}

int handler_register_universal_brand_detected(universal_brand_handler_t handler) {
    if (!handlers_initialized) {
        handler_init();
    }
    registered_handlers.universal_brand_detected = handler;
    return 0;
}

/* Universal TV Event Trigger Functions */

int handler_trigger_universal_scan_started(unsigned char button_code, uint16_t total_codes) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.universal_scan_started != NULL) {
        return registered_handlers.universal_scan_started(button_code, 0, total_codes);
    }
    
    return 0;
}

int handler_trigger_universal_scan_next(unsigned char button_code, uint16_t code_index, uint16_t total_codes) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.universal_scan_next != NULL) {
        return registered_handlers.universal_scan_next(button_code, code_index, total_codes);
    }
    
    return 0;
}

int handler_trigger_universal_scan_confirmed(unsigned char button_code, uint16_t code_index, uint16_t total_codes) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.universal_scan_confirmed != NULL) {
        return registered_handlers.universal_scan_confirmed(button_code, code_index, total_codes);
    }
    
    return 0;
}

int handler_trigger_universal_protocol_attempt(uint8_t protocol, uint32_t code, const char* description) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.universal_protocol_attempt != NULL) {
        return registered_handlers.universal_protocol_attempt(protocol, code, description);
    }
    
    return 0;
}

int handler_trigger_universal_brand_detected(uint8_t brand, const char* brand_name) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.universal_brand_detected != NULL) {
        return registered_handlers.universal_brand_detected(brand, brand_name);
    }
    
    return 0;
}

/**
 * @brief Get current timestamp in milliseconds
 */
static uint32_t get_timestamp(void) {
#ifdef _WIN32
    return (uint32_t)GetTickCount();
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
#endif
}

/**
 * @brief Trigger button press event
 */
int handler_trigger_button_pressed(unsigned char button_code) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.button_pressed != NULL) {
        const char* button_name = get_button_name(button_code);
        return registered_handlers.button_pressed(button_code, button_name);
    }
    
    return 0;
}

/**
 * @brief Trigger button release event
 */
int handler_trigger_button_released(unsigned char button_code) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.button_released != NULL) {
        const char* button_name = get_button_name(button_code);
        return registered_handlers.button_released(button_code, button_name);
    }
    
    return 0;
}

/**
 * @brief Trigger IR transmission start event
 */
int handler_trigger_ir_transmit_start(ir_code_t code) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.ir_transmit_start != NULL) {
        return registered_handlers.ir_transmit_start(code, 0);
    }
    
    return 0;
}

/**
 * @brief Trigger IR transmission complete event
 */
int handler_trigger_ir_transmit_complete(ir_code_t code, int success) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (success) {
        if (registered_handlers.ir_transmit_complete != NULL) {
            return registered_handlers.ir_transmit_complete(code, success);
        }
    } else {
        if (registered_handlers.ir_transmit_error != NULL) {
            return registered_handlers.ir_transmit_error(code, success);
        }
    }
    
    return 0;
}

/**
 * @brief Trigger error event
 */
int handler_trigger_error(error_type_t error, const char* message) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (registered_handlers.error_handler != NULL) {
        return registered_handlers.error_handler(error, message);
    }
    
    /* Default error handling */
    fprintf(stderr, "[Handler] Error %d: %s\n", error, message ? message : "Unknown error");
    return 0;
}

/**
 * @brief Trigger custom event
 */
int handler_trigger_custom_event(event_t* event) {
    if (!handlers_initialized) {
        return -1;
    }
    
    if (event == NULL) {
        return -1;
    }
    
    /* Set timestamp if not set */
    if (event->timestamp == 0) {
        event->timestamp = get_timestamp();
    }
    
    if (registered_handlers.custom_event != NULL) {
        return registered_handlers.custom_event(event);
    }
    
    return 0;
}

#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif

/* Timer and Interrupt Handler Support */

static timer_handler_t timer_callback = NULL;

#ifdef _WIN32
static HANDLE timer_handle = NULL;
#else
static struct itimerval timer_value;
static struct sigaction sa;
#endif

/**
 * @brief Timer interrupt handler (platform-specific)
 */
#ifdef _WIN32
static VOID CALLBACK timer_callback_wrapper(PVOID lpParam, BOOLEAN TimerOrWaitFired) {
    (void)lpParam;
    (void)TimerOrWaitFired;
    if (timer_callback != NULL) {
        timer_callback(0);
    }
}
#else
static void timer_signal_handler(int sig) {
    (void)sig;
    if (timer_callback != NULL) {
        timer_callback(0);
    }
}
#endif

/**
 * @brief Setup hardware timer
 * @param interval_ms Timer interval in milliseconds
 * @return 0 on success, -1 on failure
 */
int handler_setup_timer(uint32_t interval_ms) {
    if (timer_callback == NULL) {
        return -1;
    }
    
#ifdef _WIN32
    /* Windows: Use CreateTimerQueueTimer */
    if (timer_handle != NULL) {
        DeleteTimerQueueTimer(NULL, timer_handle, NULL);
    }
    
    if (!CreateTimerQueueTimer(&timer_handle, NULL, timer_callback_wrapper, NULL,
                               interval_ms, interval_ms, WT_EXECUTEDEFAULT)) {
        return -1;
    }
#else
    /* Unix/Linux: Use setitimer */
    sa.sa_handler = timer_signal_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    
    if (sigaction(SIGALRM, &sa, NULL) == -1) {
        return -1;
    }
    
    timer_value.it_value.tv_sec = interval_ms / 1000;
    timer_value.it_value.tv_usec = (interval_ms % 1000) * 1000;
    timer_value.it_interval.tv_sec = interval_ms / 1000;
    timer_value.it_interval.tv_usec = (interval_ms % 1000) * 1000;
    
    if (setitimer(ITIMER_REAL, &timer_value, NULL) == -1) {
        return -1;
    }
#endif
    
    return 0;
}

/**
 * @brief Stop hardware timer
 */
void handler_stop_timer(void) {
#ifdef _WIN32
    if (timer_handle != NULL) {
        DeleteTimerQueueTimer(NULL, timer_handle, NULL);
        timer_handle = NULL;
    }
#else
    timer_value.it_value.tv_sec = 0;
    timer_value.it_value.tv_usec = 0;
    timer_value.it_interval.tv_sec = 0;
    timer_value.it_interval.tv_usec = 0;
    setitimer(ITIMER_REAL, &timer_value, NULL);
#endif
}

/**
 * @brief Setup interrupt handler (platform-specific)
 * @param interrupt_number Hardware interrupt number
 * @return 0 on success, -1 on failure
 */
int handler_setup_interrupt(int interrupt_number) {
    (void)interrupt_number;  /* Platform-specific implementation needed */
    
    if (interrupt_callback_storage == NULL) {
        return -1;
    }
    
    /* TODO: Platform-specific interrupt setup */
    /* For embedded systems, this would configure hardware interrupts */
    /* For PC simulation, this is a placeholder */
    
    return 0;
}

/* Interrupt state tracking */
static volatile unsigned char last_gpio_state = 0;
static volatile uint32_t interrupt_timestamp = 0;
static volatile int interrupt_type = 0; /* 0 = timer, 1 = GPIO */
static volatile unsigned char pending_button_code = 0; /* Button code from hardware interrupt */

/**
 * @brief Read GPIO state to detect button press (platform-specific)
 * @return Button code or 0 if no button pressed
 * 
 * This function should be implemented to read actual GPIO pins in hardware.
 * For simulation, we use a shared variable set by the interrupt handler.
 */
static unsigned char read_gpio_button_state(void) {
    /* In real hardware, this would:
     * 1. Read GPIO pin states
     * 2. Decode button matrix
     * 3. Return button code
     * 
     * For simulation, we use pending_button_code set by interrupt_set_button()
     */
    unsigned char button = pending_button_code;
    pending_button_code = 0; /* Clear after reading */
    return button;
}

/**
 * @brief Set button code from hardware interrupt (called before interrupt_callback)
 * @param button_code The button code detected by hardware
 * 
 * This bridges hardware detection -> interrupt callback -> C handler
 */
void interrupt_set_button(unsigned char button_code) {
    interrupt_set_type(1); /* GPIO interrupt */
    pending_button_code = button_code;
}

/**
 * @brief C callback function for interrupt handlers (called from assembly)
 * This bridges hardware interrupts (assembly) -> C handlers -> JavaScript (via WebSocket)
 */
void interrupt_callback(void) {
    /* Get current timestamp */
    interrupt_timestamp = (uint32_t)time(NULL);
    
    /* Check if this is a GPIO interrupt (button press) */
    if (interrupt_type == 1) {
        /* Read GPIO state to detect which button was pressed */
        unsigned char button_code = read_gpio_button_state();
        
        if (button_code != 0 && button_code != last_gpio_state) {
            /* Button press detected - trigger C command chain */
            printf("[Interrupt] Button press detected: 0x%02X\n", button_code);
#ifdef SIMULATOR
            /* Send to TV simulator when using assembly ISR path (simulated GPIO) */
            tv_simulator_send_button(button_code);
#endif
            /* Trigger hardware interrupt event */
            if (registered_handlers.interrupt_handler != NULL) {
                registered_handlers.interrupt_handler();
            }
            
            /* Trigger button press handler - this is the C command */
            if (registered_handlers.button_pressed != NULL) {
                const char* button_name = get_button_name(button_code);
                registered_handlers.button_pressed(button_code, button_name);
            }
            
            /* Also trigger via handler system for full event chain */
            handler_trigger_button_pressed(button_code);
            
            /* Update last state */
            last_gpio_state = button_code;
        }
    } else {
        /* Timer interrupt - handle IR timing */
        if (registered_handlers.interrupt_handler != NULL) {
            registered_handlers.interrupt_handler();
        }
    }
}

/**
 * @brief Set interrupt type (called before interrupt occurs)
 * @param type 0 = timer, 1 = GPIO
 */
void interrupt_set_type(int type) {
    interrupt_type = type;
}

/**
 * @brief Get last interrupt timestamp
 */
uint32_t interrupt_get_timestamp(void) {
    return interrupt_timestamp;
}

