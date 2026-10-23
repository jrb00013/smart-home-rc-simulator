/**
 * @file test_buttons.c
 * @brief Button naming and button -> IR code mapping tests.
 */

#include "test_harness.h"
#include "remote_control.h"
#include "remote_buttons.h"
#include "ir_codes.h"

#include <string.h>

/* Every button defined in remote_buttons.h */
static const unsigned char all_buttons[] = {
    BUTTON_YOUTUBE, BUTTON_NETFLIX, BUTTON_AMAZON_PRIME, BUTTON_HBO_MAX,
    BUTTON_DISNEY_PLUS, BUTTON_APPLE_TV, BUTTON_HULU, BUTTON_PEACOCK,
    BUTTON_POWER, BUTTON_VOLUME_UP, BUTTON_VOLUME_DOWN, BUTTON_MUTE,
    BUTTON_CHANNEL_UP, BUTTON_CHANNEL_DOWN,
    BUTTON_HOME, BUTTON_MENU, BUTTON_BACK, BUTTON_EXIT, BUTTON_OPTIONS,
    BUTTON_INPUT, BUTTON_SOURCE,
    BUTTON_UP, BUTTON_DOWN, BUTTON_LEFT, BUTTON_RIGHT, BUTTON_OK, BUTTON_ENTER,
    BUTTON_PLAY, BUTTON_PAUSE, BUTTON_STOP, BUTTON_FAST_FORWARD, BUTTON_REWIND,
    BUTTON_RECORD,
    BUTTON_0, BUTTON_1, BUTTON_2, BUTTON_3, BUTTON_4, BUTTON_5, BUTTON_6,
    BUTTON_7, BUTTON_8, BUTTON_9, BUTTON_DASH,
    BUTTON_RED, BUTTON_GREEN, BUTTON_YELLOW, BUTTON_BLUE,
    BUTTON_INFO, BUTTON_GUIDE, BUTTON_SETTINGS, BUTTON_CC, BUTTON_SUBTITLES,
    BUTTON_SAP, BUTTON_AUDIO, BUTTON_SLEEP, BUTTON_PICTURE_MODE, BUTTON_ASPECT,
    BUTTON_ZOOM, BUTTON_P_SIZE,
    BUTTON_RECORD_LIST, BUTTON_SCHEDULE, BUTTON_SLEEP_TIMER, BUTTON_TIMER_MENU,
    BUTTON_VOICE, BUTTON_MIC, BUTTON_LIVE_TV, BUTTON_STREAM,
    BUTTON_DISPLAY, BUTTON_STATUS, BUTTON_HELP, BUTTON_E_MANUAL,
    BUTTON_GAME_MODE, BUTTON_GAME1, BUTTON_GAME2, BUTTON_GAME3, BUTTON_GAME_GUIDE,
    BUTTON_MOTION, BUTTON_BACKLIGHT, BUTTON_BRIGHTNESS,
    BUTTON_SOUND_MODE, BUTTON_SYNC, BUTTON_SOUND_OUTPUT,
    BUTTON_MULTI_VIEW, BUTTON_PIP, BUTTON_SCREEN_MIRROR, BUTTON_CAST,
    BUTTON_SCREEN_SHARE, BUTTON_HDR_MODE, BUTTON_HDR_GAME, BUTTON_HDR_FILM,
};

#define N_BUTTONS (sizeof(all_buttons) / sizeof(all_buttons[0]))

TEST(every_button_has_a_unique_name) {
    size_t i;
    size_t j;
    for (i = 0; i < N_BUTTONS; i++) {
        const char* name = get_button_name(all_buttons[i]);
        CHECK(name != NULL);
        CHECK(strcmp(name, "UNKNOWN") != 0);
        for (j = i + 1; j < N_BUTTONS; j++) {
            CHECK(strcmp(name, get_button_name(all_buttons[j])) != 0);
        }
    }
}

TEST(every_room_button_has_a_name) {
    unsigned int code;
    for (code = BUTTON_ROOM_SCENE_MOVIE; code <= BUTTON_ROOM_DINING_ROOM_LIGHT; code++) {
        const char* name = get_button_name((unsigned char)code);
        CHECK(strncmp(name, "Room: ", 6) == 0);
    }
}

TEST(unknown_buttons) {
    const unsigned char unknown[] = {0x00, 0x09, 0x0F, 0x16, 0x5B, 0x64, 0x84, 0x94, 0xA5, 0xB3, 0xC3, 0xD8};
    size_t i;
    for (i = 0; i < sizeof(unknown); i++) {
        CHECK_STR(get_button_name(unknown[i]), "UNKNOWN");
        CHECK_EQ_U(get_ir_code(unknown[i]).code, 0);
    }
}

TEST(known_ir_mappings) {
    CHECK_EQ_U(get_ir_code(BUTTON_POWER).code, IR_POWER);
    CHECK_EQ_U(get_ir_code(BUTTON_VOLUME_UP).code, IR_VOLUME_UP);
    CHECK_EQ_U(get_ir_code(BUTTON_VOLUME_DOWN).code, IR_VOLUME_DOWN);
    CHECK_EQ_U(get_ir_code(BUTTON_YOUTUBE).code, IR_YOUTUBE);
    CHECK_EQ_U(get_ir_code(BUTTON_0).code, IR_0);
    CHECK_EQ_U(get_ir_code(BUTTON_9).code, IR_9);
    CHECK_EQ_U(get_ir_code(BUTTON_BLUE).code, IR_BLUE);
    CHECK_EQ_U(get_ir_code(BUTTON_SCREEN_MIRROR).code, IR_SCREEN_MIRROR);
    /* Aliased buttons share a code */
    CHECK_EQ_U(get_ir_code(BUTTON_SOURCE).code, IR_INPUT);
    CHECK_EQ_U(get_ir_code(BUTTON_SUBTITLES).code, IR_CC);
    CHECK_EQ_U(get_ir_code(BUTTON_ZOOM).code, IR_ASPECT);
}

TEST(all_streaming_buttons_have_codes) {
    /* Disney+, Apple TV+, Hulu and Peacock used to map to 0 and fail */
    const unsigned char streaming[] = {
        BUTTON_YOUTUBE, BUTTON_NETFLIX, BUTTON_AMAZON_PRIME, BUTTON_HBO_MAX,
        BUTTON_DISNEY_PLUS, BUTTON_APPLE_TV, BUTTON_HULU, BUTTON_PEACOCK,
    };
    size_t i;
    size_t j;
    for (i = 0; i < sizeof(streaming); i++) {
        uint32_t c = get_ir_code(streaming[i]).code;
        CHECK(c != 0);
        for (j = i + 1; j < sizeof(streaming); j++) {
            CHECK(c != get_ir_code(streaming[j]).code);
        }
    }
}

TEST(ir_code_defaults) {
    size_t i;
    for (i = 0; i < N_BUTTONS; i++) {
        ir_code_t c = get_ir_code(all_buttons[i]);
        CHECK_EQ_U(c.protocol, IR_PROTOCOL_PHILLIPS);
        CHECK_EQ_U(c.frequency, 38000);
        CHECK(c.repeat_count >= 1);
    }
}

TEST(room_buttons_have_no_ir) {
    unsigned int code;
    for (code = BUTTON_ROOM_SCENE_MOVIE; code <= BUTTON_ROOM_DINING_ROOM_LIGHT; code++) {
        CHECK_EQ_U(get_ir_code((unsigned char)code).code, 0);
    }
}

int main(void) {
    printf("test_buttons\n");
    RUN(every_button_has_a_unique_name);
    RUN(every_room_button_has_a_name);
    RUN(unknown_buttons);
    RUN(known_ir_mappings);
    RUN(all_streaming_buttons_have_codes);
    RUN(ir_code_defaults);
    RUN(room_buttons_have_no_ir);
    return TEST_SUMMARY();
}
