#ifndef TIME_UTIL_H
#define TIME_UTIL_H

/**
 * @file time_util.h
 * @brief Internal portable sleep / monotonic clock helpers.
 *
 * Replaces the per-file copies of delay_ms()/get_timestamp_ms() that used
 * usleep(), which is not declared under strict POSIX feature macros and is
 * not specified for arguments >= 1,000,000. nanosleep() is POSIX.1b
 * (_POSIX_C_SOURCE >= 199309L) and is restarted here on EINTR.
 */

#include <stdint.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <errno.h>
#include <time.h>
#endif

/** Sleep for at least @p us microseconds. */
static inline void tu_sleep_us(uint64_t us) {
    if (us == 0) {
        return;
    }
#ifdef _WIN32
    Sleep((DWORD)((us + 999) / 1000));
#else
    struct timespec req;
    struct timespec rem;
    req.tv_sec = (time_t)(us / 1000000u);
    req.tv_nsec = (long)((us % 1000000u) * 1000u);
    while (nanosleep(&req, &rem) != 0 && errno == EINTR) {
        req = rem;
    }
#endif
}

/** Sleep for at least @p ms milliseconds. */
static inline void tu_sleep_ms(uint32_t ms) {
    tu_sleep_us((uint64_t)ms * 1000u);
}

/** Monotonic clock in milliseconds (wraps at 2^32). */
static inline uint32_t tu_monotonic_ms(void) {
#ifdef _WIN32
    return (uint32_t)GetTickCount();
#else
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) {
        return 0;
    }
    return (uint32_t)((uint64_t)ts.tv_sec * 1000u + (uint64_t)ts.tv_nsec / 1000000u);
#endif
}

#endif /* TIME_UTIL_H */
