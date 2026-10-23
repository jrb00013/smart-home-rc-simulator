/**
 * @file test_handlers.c
 * @brief Event handler, interrupt path, timer, system handler and latency tests.
 */

#include "test_harness.h"
#include "handlers.h"
#include "system_handler.h"
#include "latency.h"
#include "remote_buttons.h"

#include <time.h>

static int pressed_calls = 0;
static unsigned char last_pressed = 0;
static int interrupt_calls = 0;
static int timer_calls = 0;

static int on_pressed(unsigned char code, const char* name) {
    (void)name;
    pressed_calls++;
    last_pressed = code;
    return 0;
}

static void on_interrupt(void) {
    interrupt_calls++;
}

static int on_timer(uint32_t id) {
    (void)id;
    timer_calls++;
    return 0;
}

TEST(trigger_requires_init) {
    handler_cleanup();
    CHECK_EQ_I(handler_trigger_button_pressed(BUTTON_OK), -1);
    CHECK_EQ_I(handler_init(), 0);
    CHECK_EQ_I(handler_trigger_button_pressed(BUTTON_OK), 0);
}

TEST(trigger_dispatches) {
    pressed_calls = 0;
    handler_register_button_pressed(on_pressed);
    CHECK_EQ_I(handler_trigger_button_pressed(BUTTON_OK), 0);
    CHECK_EQ_I(pressed_calls, 1);
    CHECK_EQ_U(last_pressed, BUTTON_OK);
    handler_unregister_all();
    CHECK_EQ_I(handler_trigger_button_pressed(BUTTON_OK), 0);
    CHECK_EQ_I(pressed_calls, 1);
}

TEST(custom_event_timestamp) {
    event_t ev;
    ev.type = EVENT_HARDWARE_INTERRUPT;
    ev.timestamp = 0;
    ev.data.custom.data = NULL;
    CHECK_EQ_I(handler_trigger_custom_event(NULL), -1);
    CHECK_EQ_I(handler_trigger_custom_event(&ev), 0);
    ev.timestamp = 1234;
    CHECK_EQ_I(handler_trigger_custom_event(&ev), 0);
    CHECK_EQ_U(ev.timestamp, 1234);
}

TEST(gpio_interrupt_dispatches_once) {
    /* Regression: the button handler ran twice per interrupt */
    pressed_calls = 0;
    interrupt_calls = 0;
    handler_register_button_pressed(on_pressed);
    handler_register_interrupt(on_interrupt);
    interrupt_set_button(BUTTON_PLAY);
    interrupt_callback();
    CHECK_EQ_I(pressed_calls, 1);
    CHECK_EQ_I(interrupt_calls, 1);
    CHECK_EQ_U(last_pressed, BUTTON_PLAY);
}

TEST(gpio_repeated_button_not_dropped) {
    /* Regression: a second press of the same button was ignored forever */
    pressed_calls = 0;
    interrupt_set_button(BUTTON_VOLUME_UP);
    interrupt_callback();
    interrupt_set_button(BUTTON_VOLUME_UP);
    interrupt_callback();
    CHECK_EQ_I(pressed_calls, 2);
    /* An interrupt with no pending button is not a press */
    interrupt_callback();
    CHECK_EQ_I(pressed_calls, 2);
}

TEST(asm_isr_entry_returns) {
    /* Regression: the x86-64 entry ended in iretq and crashed when called */
    pressed_calls = 0;
    interrupt_set_button(BUTTON_STOP);
    ir_gpio_interrupt_handler();
    CHECK_EQ_I(pressed_calls, 1);
    CHECK_EQ_U(last_pressed, BUTTON_STOP);
}

TEST(timer_requires_handler) {
    handler_unregister_all();
    CHECK_EQ_I(handler_setup_timer(10), -1);
    CHECK_EQ_I(handler_dispatch_timer(), 0);
}

TEST(timer_dispatches_from_main_context) {
    /* Regression: the registered timer handler was never wired up and the
     * signal handler would have run user code in signal context. */
    struct timespec ts = {0, 5 * 1000 * 1000};
    int i;
    int dispatched = 0;
    timer_calls = 0;
    handler_register_timer(on_timer);
    CHECK_EQ_I(handler_setup_timer(0), -1);
    CHECK_EQ_I(handler_setup_timer(10), 0);
    for (i = 0; i < 200 && dispatched < 3; i++) {
        nanosleep(&ts, NULL);
        if (handler_dispatch_timer() == 1) {
            dispatched++;
        }
    }
    handler_stop_timer();
    CHECK(dispatched >= 3);
    CHECK_EQ_I(timer_calls, dispatched);
    nanosleep(&ts, NULL);
    nanosleep(&ts, NULL);
    CHECK_EQ_I(handler_dispatch_timer(), 0);
}

/* ---------------- system handler ---------------- */

TEST(system_health_score) {
    int i;
    system_health_t* h;
    CHECK_EQ_I(system_handler_init(), 0);
    CHECK_EQ_I(system_init(), 0);
    CHECK_EQ_I(system_get_state(), SYSTEM_STATE_READY);
    h = system_get_health();
    CHECK(h != NULL);
    CHECK_EQ_U(h->health_score, 100);
    CHECK_EQ_I(system_health_check(), 0);
    for (i = 0; i < 30; i++) {
        system_report_error(SYSTEM_ERROR_TIMEOUT, "test");
    }
    CHECK_EQ_U(h->health_score, 0); /* floors at 0, no wrap-around */
    CHECK_EQ_U(h->error_count, 30);
    CHECK_EQ_I(system_health_check(), -1);
    /* Regression: reset left the score at 0 so the system stayed unhealthy */
    CHECK_EQ_I(system_reset(), 0);
    h = system_get_health();
    CHECK_EQ_U(h->health_score, 100);
    CHECK_EQ_U(h->error_count, 0);
    CHECK_EQ_I(system_health_check(), 0);
    system_handler_cleanup();
    CHECK_EQ_I(system_get_state(), SYSTEM_STATE_SHUTDOWN);
}

/* ---------------- latency ---------------- */

TEST(latency_stats) {
    latency_stats_t s;
    uint32_t v;
    CHECK_EQ_I(latency_record(5, "x", 0), -1); /* not initialized */
    CHECK_EQ_I(latency_init(100), 0);
    for (v = 1; v <= 100; v++) {
        latency_record(v, (v % 2) ? "odd" : "even", v);
    }
    CHECK_EQ_I(latency_get_stats(&s), 0);
    CHECK_EQ_U(s.count, 100);
    CHECK_EQ_U(s.min_us, 1);
    CHECK_EQ_U(s.max_us, 100);
    CHECK_EQ_U(s.avg_us, 50);
    CHECK_EQ_U(s.p50_us, 51);
    CHECK_EQ_U(s.p95_us, 96);
    CHECK_EQ_U(s.p99_us, 100);
    CHECK_EQ_I(latency_get_stats_for_operation("odd", &s), 0);
    CHECK_EQ_U(s.count, 50);
    CHECK_EQ_U(s.min_us, 1);
    CHECK_EQ_U(s.max_us, 99);
    /* Beyond capacity: aggregates keep counting, samples buffer is bounded */
    latency_record(1000, "odd", 0);
    CHECK_EQ_I(latency_get_stats(&s), 0);
    CHECK_EQ_U(s.count, 101);
    CHECK_EQ_U(s.max_us, 1000);
    CHECK_EQ_U(s.sample_count, 100);
    CHECK_EQ_U(latency_measure(10, 5), 0);
    CHECK_EQ_U(latency_measure(5, 10), 5);
    latency_reset_stats();
    CHECK_EQ_U(latency_get_min(), 0);
    latency_cleanup();
}

int main(void) {
    printf("test_handlers\n");
    RUN(trigger_requires_init);
    RUN(trigger_dispatches);
    RUN(custom_event_timestamp);
    RUN(gpio_interrupt_dispatches_once);
    RUN(gpio_repeated_button_not_dropped);
    RUN(asm_isr_entry_returns);
    RUN(timer_requires_handler);
    RUN(timer_dispatches_from_main_context);
    RUN(system_health_score);
    RUN(latency_stats);
    handler_cleanup();
    return TEST_SUMMARY();
}
