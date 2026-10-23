/**
 * @file test_universal_tv.c
 * @brief Universal TV brand handling, code tables and scan mode tests.
 */

#include "test_harness.h"
#include "../../src/ir_asm.h"
#include "universal_tv.h"
#include "remote_buttons.h"
#include "handlers.h"

/* Skip real sleeping: protocol attempts are separated by 40 ms delays */
static void null_trace(int level, uint32_t us) {
    (void)level;
    (void)us;
}

static int scan_next_calls = 0;
static uint16_t scan_next_total = 0;
static uint16_t scan_next_index = 0;
static int confirmed_calls = 0;
static uint16_t confirmed_index = 0xFFFF;
static int brand_calls = 0;
static uint8_t brand_seen = 0xFF;
static int protocol_attempts = 0;

static int on_scan_next(unsigned char b, uint16_t idx, uint16_t total) {
    (void)b;
    scan_next_calls++;
    scan_next_index = idx;
    scan_next_total = total;
    return 0;
}

static int on_scan_confirmed(unsigned char b, uint16_t idx, uint16_t total) {
    (void)b;
    (void)total;
    confirmed_calls++;
    confirmed_index = idx;
    return 0;
}

static int on_brand(uint8_t brand, const char* name) {
    (void)name;
    brand_calls++;
    brand_seen = brand;
    return 0;
}

static int on_protocol(uint8_t protocol, uint32_t code, const char* d) {
    (void)protocol;
    (void)code;
    (void)d;
    protocol_attempts++;
    return 0;
}

static void reset_counters(void) {
    scan_next_calls = 0;
    confirmed_calls = 0;
    confirmed_index = 0xFFFF;
    brand_calls = 0;
    brand_seen = 0xFF;
    protocol_attempts = 0;
}

TEST(code_counts) {
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_POWER), 16);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_VOLUME_UP), 6);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_VOLUME_DOWN), 6);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_MUTE), 6);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_CHANNEL_UP), 6);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_CHANNEL_DOWN), 6);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_NETFLIX), 0);
    CHECK_EQ_U(universal_tv_get_code_count(0x00), 0);
}

TEST(brand_names) {
    CHECK_STR(universal_tv_brand_name(TV_BRAND_UNKNOWN), "Unknown");
    CHECK_STR(universal_tv_brand_name(TV_BRAND_SAMSUNG), "Samsung");
    CHECK_STR(universal_tv_brand_name(TV_BRAND_PHILIPS), "Philips");
    CHECK_STR(universal_tv_brand_name(TV_BRAND_SHARP), "Sharp");
    CHECK_STR(universal_tv_brand_name(TV_BRAND_COUNT), "Invalid");
    CHECK_STR(universal_tv_brand_name((tv_brand_t)-1), "Invalid");
    CHECK_STR(universal_tv_brand_name((tv_brand_t)200), "Invalid");
}

TEST(set_brand_validates) {
    int b;
    reset_counters();
    CHECK_EQ_I(universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL), 0);
    CHECK_EQ_I(universal_tv_get_brand(), TV_BRAND_UNKNOWN);

    for (b = 0; b < TV_BRAND_COUNT; b++) {
        CHECK_EQ_I(universal_tv_set_brand((tv_brand_t)b), 0);
        CHECK_EQ_I(universal_tv_get_brand(), b);
    }
    CHECK_EQ_I(brand_calls, TV_BRAND_COUNT);

    CHECK_EQ_I(universal_tv_set_brand(TV_BRAND_LG), 0);
    /* Out-of-range brands are rejected and leave the brand unchanged */
    CHECK_EQ_I(universal_tv_set_brand(TV_BRAND_COUNT), -1);
    CHECK_EQ_I(universal_tv_set_brand((tv_brand_t)-3), -1);
    CHECK_EQ_I(universal_tv_get_brand(), TV_BRAND_LG);

    /* init resets the brand */
    CHECK_EQ_I(universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL), 0);
    CHECK_EQ_I(universal_tv_get_brand(), TV_BRAND_UNKNOWN);
}

TEST(send_button_tries_every_code) {
    reset_counters();
    universal_tv_init(UNIVERSAL_MODE_MULTI_PROTOCOL);
    CHECK_EQ_I(universal_tv_send_button(BUTTON_VOLUME_UP), 0);
    CHECK_EQ_I(protocol_attempts, 6);

    /* With a brand set, brand codes go first but every code is still sent once */
    reset_counters();
    universal_tv_set_brand(TV_BRAND_SAMSUNG);
    CHECK_EQ_I(universal_tv_send_button(BUTTON_POWER), 0);
    CHECK_EQ_I(protocol_attempts, 16);
}

TEST(scan_unknown_button) {
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_NETFLIX), -1);
    CHECK_EQ_I(universal_tv_scan_next(), -1);
    CHECK_EQ_I(universal_tv_scan_confirm(), -1);
}

TEST(scan_confirm_requires_a_sent_code) {
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_MUTE), 0);
    CHECK_EQ_I(universal_tv_scan_confirm(), -1);
    universal_tv_scan_cancel();
    CHECK_EQ_I(universal_tv_scan_next(), -1);
}

TEST(scan_confirm_picks_last_sent_code) {
    reset_counters();
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_VOLUME_UP), 0);
    CHECK_EQ_I(universal_tv_scan_next(), 0); /* idx 0 */
    CHECK_EQ_I(universal_tv_scan_next(), 0); /* idx 1: Philips RC5 */
    CHECK_EQ_I(universal_tv_scan_confirm(), 0);
    CHECK_EQ_I(confirmed_calls, 1);
    CHECK_EQ_U(confirmed_index, 1);
    CHECK_EQ_I(universal_tv_get_brand(), TV_BRAND_PHILIPS);
    CHECK_EQ_U(brand_seen, TV_BRAND_PHILIPS);
    /* scan finished */
    CHECK_EQ_I(universal_tv_scan_confirm(), -1);
}

TEST(scan_can_confirm_final_code) {
    /* Regression: after the last code the index wrapped to 0 and confirm()
     * refused, so the final code in a table could never be selected. */
    uint16_t n = universal_tv_get_code_count(BUTTON_CHANNEL_DOWN);
    uint16_t i;
    reset_counters();
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_CHANNEL_DOWN), 0);
    for (i = 0; i < n; i++) {
        CHECK_EQ_I(universal_tv_scan_next(), 0);
    }
    CHECK_EQ_I(universal_tv_scan_confirm(), 0);
    CHECK_EQ_U(confirmed_index, n - 1);
    CHECK_EQ_I(universal_tv_get_brand(), TV_BRAND_LG);
}

TEST(scan_wraps_around) {
    uint16_t n = universal_tv_get_code_count(BUTTON_MUTE);
    uint16_t i;
    reset_counters();
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_MUTE), 0);
    for (i = 0; i < n + 2; i++) {
        CHECK_EQ_I(universal_tv_scan_next(), 0);
    }
    CHECK_EQ_I(scan_next_calls, n + 2);
    CHECK_EQ_U(scan_next_index, 1);
    CHECK_EQ_I(universal_tv_scan_confirm(), 0);
    CHECK_EQ_U(confirmed_index, 1);
}

TEST(scan_state_survives_other_lookups) {
    /* Regression: lookups shared one static struct, so querying another
     * button mid-scan silently swapped the table being scanned. */
    reset_counters();
    universal_tv_init(UNIVERSAL_MODE_SCAN);
    CHECK_EQ_I(universal_tv_scan_start(BUTTON_POWER), 0);
    CHECK_EQ_U(universal_tv_get_code_count(BUTTON_VOLUME_UP), 6);
    CHECK_EQ_I(universal_tv_send_button(BUTTON_MUTE), 0);
    CHECK_EQ_I(universal_tv_scan_next(), 0);
    CHECK_EQ_U(scan_next_total, 16);
    universal_tv_scan_cancel();
}

int main(void) {
    printf("test_universal_tv\n");
    ir_set_trace_hook(null_trace);
    handler_init();
    handler_register_universal_scan_next(on_scan_next);
    handler_register_universal_scan_confirmed(on_scan_confirmed);
    handler_register_universal_brand_detected(on_brand);
    handler_register_universal_protocol_attempt(on_protocol);

    RUN(code_counts);
    RUN(brand_names);
    RUN(set_brand_validates);
    RUN(send_button_tries_every_code);
    RUN(scan_unknown_button);
    RUN(scan_confirm_requires_a_sent_code);
    RUN(scan_confirm_picks_last_sent_code);
    RUN(scan_can_confirm_final_code);
    RUN(scan_wraps_around);
    RUN(scan_state_survives_other_lookups);

    universal_tv_cleanup();
    handler_cleanup();
    return TEST_SUMMARY();
}
