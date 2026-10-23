#ifndef TEST_HARNESS_H
#define TEST_HARNESS_H

/**
 * @file test_harness.h
 * @brief Minimal dependency-free unit test harness.
 *
 * Usage:
 *   TEST(name) { CHECK(cond); CHECK_EQ_U(a, b); ... }
 *   int main(void) { RUN(name); ...; return TEST_SUMMARY(); }
 *
 * A failing CHECK records the failure and continues; TEST_SUMMARY() returns
 * nonzero if anything failed so `make test` stops.
 */

#include <stdio.h>
#include <string.h>

static int th_checks = 0;
static int th_failures = 0;
static int th_tests = 0;
static int th_current_failed = 0;

#define TEST(name) static void name(void)

#define CHECK(cond)                                                        \
    do {                                                                   \
        th_checks++;                                                       \
        if (!(cond)) {                                                     \
            th_failures++;                                                 \
            th_current_failed = 1;                                         \
            fprintf(stderr, "  FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond); \
        }                                                                  \
    } while (0)

#define CHECK_EQ_U(actual, expected)                                       \
    do {                                                                   \
        unsigned long long th_a = (unsigned long long)(actual);            \
        unsigned long long th_e = (unsigned long long)(expected);          \
        th_checks++;                                                       \
        if (th_a != th_e) {                                                \
            th_failures++;                                                 \
            th_current_failed = 1;                                         \
            fprintf(stderr, "  FAIL %s:%d: %s == 0x%llX, expected 0x%llX\n", \
                    __FILE__, __LINE__, #actual, th_a, th_e);              \
        }                                                                  \
    } while (0)

#define CHECK_EQ_I(actual, expected)                                       \
    do {                                                                   \
        long long th_a = (long long)(actual);                              \
        long long th_e = (long long)(expected);                            \
        th_checks++;                                                       \
        if (th_a != th_e) {                                                \
            th_failures++;                                                 \
            th_current_failed = 1;                                         \
            fprintf(stderr, "  FAIL %s:%d: %s == %lld, expected %lld\n",   \
                    __FILE__, __LINE__, #actual, th_a, th_e);              \
        }                                                                  \
    } while (0)

#define CHECK_STR(actual, expected)                                        \
    do {                                                                   \
        const char* th_a = (actual);                                       \
        const char* th_e = (expected);                                     \
        th_checks++;                                                       \
        if (th_a == NULL || strcmp(th_a, th_e) != 0) {                     \
            th_failures++;                                                 \
            th_current_failed = 1;                                         \
            fprintf(stderr, "  FAIL %s:%d: %s == \"%s\", expected \"%s\"\n", \
                    __FILE__, __LINE__, #actual, th_a ? th_a : "(null)", th_e); \
        }                                                                  \
    } while (0)

#define RUN(name)                                                          \
    do {                                                                   \
        th_tests++;                                                        \
        th_current_failed = 0;                                             \
        name();                                                            \
        printf("  %s %s\n", th_current_failed ? "[FAIL]" : "[ ok ]", #name); \
    } while (0)

#define TEST_SUMMARY()                                                     \
    (printf("%d tests, %d checks, %d failures\n", th_tests, th_checks,     \
            th_failures),                                                  \
     th_failures ? 1 : 0)

#endif /* TEST_HARNESS_H */
