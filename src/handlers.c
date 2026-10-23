/* setitimer() and SA_RESTART are XSI extensions */
#ifndef _XOPEN_SOURCE
#define _XOPEN_SOURCE 700
#endif
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include "../include/handlers.h"
#include "../include/remote_control.h"
#include "../include/remote_buttons.h"
#ifdef SIMULATOR
# include "../include/tv_simulator.h"
#endif
#include "time_util.h"
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
    
    handler_stop_timer();
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
    interrupt_callback_storage = handlers->interrupt_handler;
    return 0;
}

/**
 * @brief Unregister all handlers
 */
void handler_unregister_all(void) {
    memset(&registered_handlers, 0, sizeof(handlers_t));
    interrupt_callback_storage = NULL;
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
        event->timestamp = tu_monotonic_ms();
    }
    
    if (registered_handlers.custom_event != NULL) {
        return registered_handlers.custom_event(event);
    }
    
    return 0;
}

/* Timer and Interrupt Handler Support
 *
 * The timer fires asynchronously (SIGALRM on POSIX, a thread-pool callback on
 * Windows). Neither context may safely run arbitrary user code (printf,
 * malloc, the handler table...), so the asynchronous side only bumps a
 * pending counter and handler_dispatch_timer() runs the registered
 * timer_handler from the caller's normal context.
 */

#ifdef _WIN32
static HANDLE timer_handle = NULL;
static volatile LONG timer_pending = 0;

static VOID CALLBACK timer_callback_wrapper(PVOID lpParam, BOOLEAN TimerOrWaitFired) {
    (void)lpParam;
    (void)TimerOrWaitFired;
    InterlockedIncrement(&timer_pending);
}
#else
static volatile sig_atomic_t timer_pending = 0;
static int timer_active = 0;

static void timer_signal_handler(int sig) {
    (void)sig;
    /* Async-signal-safe: only touch a sig_atomic_t */
    timer_pending = 1;
}
#endif

/**
 * @brief Setup periodic timer that drives the registered timer handler
 * @param interval_ms Timer interval in milliseconds (must be > 0)
 * @return 0 on success, -1 on failure
 */
int handler_setup_timer(uint32_t interval_ms) {
    if (registered_handlers.timer_handler == NULL || interval_ms == 0) {
        return -1;
    }
    
#ifdef _WIN32
    /* Windows: Use CreateTimerQueueTimer */
    if (timer_handle != NULL) {
        DeleteTimerQueueTimer(NULL, timer_handle, NULL);
        timer_handle = NULL;
    }
    
    if (!CreateTimerQueueTimer(&timer_handle, NULL, timer_callback_wrapper, NULL,
                               interval_ms, interval_ms, WT_EXECUTEDEFAULT)) {
        timer_handle = NULL;
        return -1;
    }
#else
    /* Unix/Linux: Use setitimer */
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = timer_signal_handler;
    sigemptyset(&sa.sa_mask);
    /* Restart interrupted syscalls so blocking reads (e.g. fgets on stdin)
     * are not aborted with EINTR every tick */
    sa.sa_flags = SA_RESTART;
    
    if (sigaction(SIGALRM, &sa, NULL) == -1) {
        return -1;
    }
    
    struct itimerval timer_value;
    timer_value.it_value.tv_sec = (time_t)(interval_ms / 1000);
    timer_value.it_value.tv_usec = (suseconds_t)((interval_ms % 1000) * 1000);
    timer_value.it_interval = timer_value.it_value;
    
    if (setitimer(ITIMER_REAL, &timer_value, NULL) == -1) {
        return -1;
    }
    timer_active = 1;
#endif
    
    return 0;
}

/**
 * @brief Run the timer handler for any timer expirations since the last call
 * @return 1 if the handler was dispatched, 0 if nothing was pending,
 *         -1 if a tick was pending but no timer handler is registered
 */
int handler_dispatch_timer(void) {
#ifdef _WIN32
    LONG pending = InterlockedExchange(&timer_pending, 0);
#else
    int pending = timer_pending;
    timer_pending = 0;
#endif
    if (!pending) {
        return 0;
    }
    if (registered_handlers.timer_handler == NULL) {
        return -1;
    }
    registered_handlers.timer_handler(0);
    return 1;
}

/**
 * @brief Stop timer
 */
void handler_stop_timer(void) {
#ifdef _WIN32
    if (timer_handle != NULL) {
        DeleteTimerQueueTimer(NULL, timer_handle, NULL);
        timer_handle = NULL;
    }
    InterlockedExchange(&timer_pending, 0);
#else
    if (timer_active) {
        struct itimerval timer_value;
        memset(&timer_value, 0, sizeof(timer_value));
        setitimer(ITIMER_REAL, &timer_value, NULL);
        timer_active = 0;
    }
    timer_pending = 0;
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
        
        /* Each simulated GPIO interrupt carries exactly one press (the code is
         * consumed above), so repeated presses of the same button are real
         * presses and must not be filtered out. */
        if (button_code != 0) {
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
            
            /* Trigger button press handler (exactly once) */
            handler_trigger_button_pressed(button_code);
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

