/**
 * @file test_remote.c
 * @brief Remote control lifecycle, state and connection management tests.
 */

#include "test_harness.h"
#include "../../src/ir_asm.h"
#include "remote_control.h"
#include "remote_buttons.h"
#include "connection.h"
#include "handlers.h"

/* Virtual time: skip IR timing sleeps; count emitted pulses */
static int ir_pulses = 0;

static void null_trace(int level, uint32_t us) {
    (void)us;
    if (level) {
        ir_pulses++;
    }
}

static int pressed_calls = 0;
static unsigned char last_pressed = 0;
static int state_calls = 0;
static int error_calls = 0;
static error_type_t last_error = ERROR_NONE;

static int on_pressed(unsigned char code, const char* name) {
    (void)name;
    pressed_calls++;
    last_pressed = code;
    return 0;
}

static int on_state(void) {
    state_calls++;
    return 0;
}

static int on_error(error_type_t error, const char* message) {
    (void)message;
    error_calls++;
    last_error = error;
    return 0;
}

static void register_handlers(void) {
    handler_register_button_pressed(on_pressed);
    handler_register_state_changed(on_state);
    handler_register_error(on_error);
    pressed_calls = 0;
    state_calls = 0;
    error_calls = 0;
    last_error = ERROR_NONE;
}

static void fast_connection_config(void) {
    connection_config_t cfg = *connection_get_config();
    cfg.retry_delay_ms = 0;
    cfg.max_retries = 1;
    connection_set_config(&cfg);
}

TEST(press_before_init_fails) {
    CHECK_EQ_I(remote_press_button(BUTTON_POWER), -1);
    CHECK_EQ_I(remote_set_device(DEVICE_DVD), -1);
}

TEST(init_enables_presses) {
    /* Regression: remote_init() never marked the remote initialized, so
     * every remote_press_button() call failed. */
    CHECK_EQ_I(remote_init(), 0);
    register_handlers();
    fast_connection_config();
    CHECK_EQ_I(remote_press_button(BUTTON_POWER), 0);
    CHECK_EQ_I(pressed_calls, 1);
    CHECK_EQ_U(last_pressed, BUTTON_POWER);
    CHECK_EQ_I(remote_get_state()->is_powered_on, 1);
    CHECK(remote_is_connected());
    CHECK_EQ_U(connection_get_connected_device(), DEVICE_TV);
    /* init is idempotent */
    CHECK_EQ_I(remote_init(), 0);
}

TEST(volume_is_clamped) {
    remote_state_t* st = remote_get_state();
    int i;
    st->volume_level = 98;
    for (i = 0; i < 5; i++) {
        CHECK_EQ_I(remote_press_button(BUTTON_VOLUME_UP), 0);
    }
    CHECK_EQ_U(st->volume_level, 100);
    st->volume_level = 2;
    for (i = 0; i < 5; i++) {
        CHECK_EQ_I(remote_press_button(BUTTON_VOLUME_DOWN), 0);
    }
    CHECK_EQ_U(st->volume_level, 0);
}

TEST(channel_never_below_one) {
    remote_state_t* st = remote_get_state();
    st->channel = 2;
    CHECK_EQ_I(remote_press_button(BUTTON_CHANNEL_DOWN), 0);
    CHECK_EQ_I(remote_press_button(BUTTON_CHANNEL_DOWN), 0);
    CHECK_EQ_U(st->channel, 1);
    CHECK_EQ_I(remote_press_button(BUTTON_CHANNEL_UP), 0);
    CHECK_EQ_U(st->channel, 2);
}

TEST(unknown_button_rejected) {
    error_calls = 0;
    CHECK_EQ_I(remote_press_button(0x00), -1);
    CHECK_EQ_I(error_calls, 1);
    CHECK_EQ_I(last_error, ERROR_INVALID_BUTTON);
}

TEST(button_without_ir_code_fails_fast) {
    connection_stats_t before = *connection_get_stats();
    error_calls = 0;
    CHECK_EQ_I(remote_press_button(BUTTON_GAME1), -1);
    CHECK_EQ_I(last_error, ERROR_INVALID_IR_CODE);
    /* No futile transmissions/retries were attempted */
    CHECK_EQ_U(connection_get_stats()->total_transmissions, before.total_transmissions);
}

TEST(room_buttons_succeed_without_ir) {
    connection_stats_t before = *connection_get_stats();
    pressed_calls = 0;
    CHECK_EQ_I(remote_press_button(BUTTON_ROOM_LIGHTS_DIM), 0);
    CHECK_EQ_I(remote_press_button(BUTTON_ROOM_THERMOSTAT_UP), 0);
    CHECK_EQ_I(pressed_calls, 2);
    CHECK_EQ_U(connection_get_stats()->total_transmissions, before.total_transmissions);
}

TEST(set_device_notifies) {
    state_calls = 0;
    CHECK_EQ_I(remote_set_device(DEVICE_DVD), 0);
    CHECK_EQ_U(remote_get_state()->current_device, DEVICE_DVD);
    CHECK_EQ_I(state_calls, 1);
    /* Next press reconnects to the new device */
    CHECK_EQ_I(remote_press_button(BUTTON_PLAY), 0);
    CHECK_EQ_U(connection_get_connected_device(), DEVICE_DVD);
    CHECK_EQ_I(remote_set_device(DEVICE_TV), 0);
}

TEST(reconnect_keeps_device) {
    /* Regression: connection_reconnect() disconnected (clearing the device)
     * and then tried to connect to device 0. */
    CHECK_EQ_I(connection_establish(DEVICE_STREAMING), 0);
    CHECK_EQ_U(connection_get_connected_device(), DEVICE_STREAMING);
    CHECK_EQ_I(connection_reconnect(), 0);
    CHECK_EQ_I(connection_get_status(), CONNECTION_CONNECTED);
    CHECK_EQ_U(connection_get_connected_device(), DEVICE_STREAMING);
}

TEST(stats_are_consistent) {
    ir_code_t good = get_ir_code(BUTTON_MUTE);
    ir_code_t bad = good;
    connection_stats_t* s;
    connection_config_t cfg = *connection_get_config();
    bad.protocol = IR_PROTOCOL_SONY; /* unsupported by ir_send -> fails */

    /* keep auto-reconnect's test transmission out of the counts */
    cfg.auto_reconnect = 0;
    connection_set_config(&cfg);
    connection_reset_stats();
    CHECK_EQ_I(connection_send_with_retry(good), 0);
    CHECK_EQ_I(connection_send_with_retry(bad), -1);
    s = connection_get_stats();
    CHECK_EQ_U(s->total_transmissions,
               s->successful_transmissions + s->failed_transmissions);
    CHECK_EQ_U(s->successful_transmissions, 1);
    /* 1 + max_retries attempts for the failing code */
    CHECK_EQ_U(s->failed_transmissions, 1 + connection_get_config()->max_retries);
    CHECK_EQ_U(s->retry_count, connection_get_config()->max_retries);
    /* zero code is rejected without counting as a transmission */
    good.code = 0;
    CHECK_EQ_I(connection_send_with_retry(good), -1);
    CHECK_EQ_U(s->total_transmissions,
               s->successful_transmissions + s->failed_transmissions);
}

TEST(cleanup_and_reinit) {
    remote_cleanup();
    CHECK_EQ_I(remote_press_button(BUTTON_POWER), -1);
    CHECK_EQ_I(connection_get_status(), CONNECTION_DISCONNECTED);
    CHECK_EQ_I(remote_init(), 0);
    register_handlers();
    fast_connection_config();
    CHECK_EQ_I(remote_press_button(BUTTON_MUTE), 0);
    CHECK_EQ_I(pressed_calls, 1);
    remote_cleanup();
    /* cleanup is idempotent */
    remote_cleanup();
}

TEST(connect_and_verify_emit_no_ir) {
    /* Regression: establish/verify probed by sending POWER, toggling the TV
     * on every connect and every verify interval. */
    CHECK_EQ_I(remote_init(), 0);
    fast_connection_config();
    connection_disconnect();
    connection_stats_t before = *connection_get_stats();
    ir_pulses = 0;
    CHECK_EQ_I(connection_establish(DEVICE_TV), 0);
    connection_config_t cfg = *connection_get_config();
    cfg.verify_interval_ms = 0;
    connection_set_config(&cfg);
    CHECK_EQ_I(connection_verify(), 0);
    CHECK_EQ_I(ir_pulses, 0);
    CHECK_EQ_U(connection_get_stats()->total_transmissions, before.total_transmissions);
    /* Control: an explicit test send does emit IR */
    CHECK_EQ_I(connection_test(BUTTON_INFO), 0);
    CHECK(ir_pulses > 0);
}

int main(void) {
    printf("test_remote\n");
    ir_set_trace_hook(null_trace);
    RUN(press_before_init_fails);
    RUN(init_enables_presses);
    RUN(volume_is_clamped);
    RUN(channel_never_below_one);
    RUN(unknown_button_rejected);
    RUN(button_without_ir_code_fails_fast);
    RUN(room_buttons_succeed_without_ir);
    RUN(set_device_notifies);
    RUN(reconnect_keeps_device);
    RUN(connect_and_verify_emit_no_ir);
    RUN(stats_are_consistent);
    RUN(cleanup_and_reinit);
    return TEST_SUMMARY();
}
