# Latency Measurement

Microsecond timing instrumentation for the C remote: an API (`include/latency.h`,
`src/latency.c`), measurement points built into the hot paths, and a synthetic probe
(`examples/latency_probe.c`).

## Quick start

```bash
make test-latency      # build and run bin/latency_probe; takes about 3 minutes
# or: make latency-probe && ./bin/latency_probe   (make examples also builds it)
```

The universal-TV probe dominates the run time because it waits between codes.

## Where latency is measured

`latency_init()` is **not** called by `remote_init()`; call it yourself (the probe does). Until it
is called, the measurement macros below are no-ops.

| Operation name | Location | Measures |
|----------------|----------|----------|
| `button_press` | `remote_press_button()` in `src/remote_control.c` | Button press to IR completion |
| `ir_transmit` | `ir_send()` in `src/ir_codes.c` | IR encode and transmit |
| `universal_tv` | `universal_tv_send_button()` in `src/universal_tv.c` | Full multi-protocol send |

The probe also records `ir_protocol` and `event_handler` samples.

## API

```c
#include "latency.h"

int  latency_init(size_t max_samples);      /* e.g. latency_init(1000) */
void latency_cleanup(void);

uint64_t latency_get_timestamp_us(void);
uint32_t latency_measure(uint64_t start_us, uint64_t end_us);
int      latency_record(uint32_t latency_us, const char* operation, uint32_t code);

/* Block measurement */
latency_probe_t probe;
latency_probe_start(&probe, "operation_name");
/* ... */
uint32_t us = latency_probe_stop(&probe, "operation_name", code);

/* Macros */
uint64_t start = LATENCY_MEASURE_START();
LATENCY_MEASURE_END(start, "operation_name", code);
LATENCY_PROBE_START(probe, "name");
LATENCY_PROBE_STOP(probe, "operation", code);

/* Statistics */
latency_stats_t stats;
latency_get_stats(&stats);
latency_get_stats_for_operation("button_press", &stats);
latency_print_stats(&stats);
latency_print_all_stats();
uint32_t avg = latency_get_avg(), max = latency_get_max(), min = latency_get_min();
```

Statistics include min, max, average and P50/P95/P99.

Timing sources: `QueryPerformanceCounter` on Windows, `clock_gettime(CLOCK_MONOTONIC)` elsewhere.

## The synthetic probe

`bin/latency_probe` runs five probes (100 iterations each, 10 warm-up) and then prints overall and
per-operation statistics:

1. Button press latency
2. IR protocol encoding latency (NEC, RC5, RC6)
3. Universal TV multi-protocol latency
4. Event handler overhead
5. End-to-end latency

Sample per-operation averages from one run on an x86-64 Linux desktop (C fallback timing
build); your numbers will differ:

```
Operation: ir_protocol      Avg:   17665 us
Operation: universal_tv     Avg: 1599151 us   (~1.6 s: every stored code is sent with a delay between them)
Operation: event_handler    Avg:       0 us
```

## Targets and optimisation ideas

Targets (not currently met by the universal-TV path):

| Path | Target |
|------|--------|
| Button press | < 5 ms |
| IR transmission | < 50 ms (protocol-dependent) |
| Universal TV (all protocols) | < 200 ms |
| Event handlers | < 1 ms |

Ways to get there:

- **Universal TV:** set a brand (`universal_tv_set_brand`) so its codes go first, cache the code
  that worked, skip protocols that are known not to apply, and shorten the inter-code delay.
- **IR encoding:** use the assembly timing routines on real hardware; minimise `delay_us()` calls.
- **Handlers:** keep them short and non-blocking.
- **Button press:** reduce `printf()` and redundant connection checks in production builds.

## Overhead

- Timestamp call: roughly 0.1–1 us depending on platform.
- Recording a sample: O(1). Percentiles: O(n log n), computed only when statistics are requested.
- Sample buffer size is set by `latency_init(max_samples)`.

## Troubleshooting

- **No samples recorded:** call `latency_init()` before measuring.
- **Overhead too high:** shrink the buffer, or compile the macros out in production.
- **Numbers look wrong:** run warm-up iterations first; check clock resolution on your platform.

Future ideas (live dashboard, histograms, CSV export, thread safety) are tracked in
[ROADMAP.md](../ROADMAP.md).
