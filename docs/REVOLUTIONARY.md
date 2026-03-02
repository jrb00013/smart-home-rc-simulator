# Why This Stack Is Revolutionary

One sentence: **No other open project combines a C universal remote (multi-protocol IR), a 3D TV simulator, text→brand detection with no cloud, pulse-length→protocol classification using the same timing as the encoder, and autonomous time/preset scheduling in a single codebase.**

## What Actually Exists (No Hype)

- **C side:** Universal remote with NEC/RC5/RC6/Sony, code database, optional assembly timing, connection/retry, latency instrumentation. Builds with or without simulator; when simulator is enabled it talks over sockets/HTTP.
- **Simulator:** 3D web (Three.js) and 2D desktop (Pygame) TV that responds to the same button codes. REST + WebSocket. No other open “universal remote” repo ships a full 3D simulator that shares state with the C program.
- **Brand detection:** Free text (e.g. “Samsung Q80”) is matched against a fixed keyword table. Returns `brand_id` that matches C `tv_brand_t`. Simulator state holds `detected_brand` so the remote can call `universal_tv_set_brand()`. No API keys, no cloud, no models—just one codebase that goes from “user said Samsung” to “C uses Samsung codes first.”
- **IR protocol from timings:** `ir_synthetic` produces lists of pulse lengths (µs) from the **same** NEC/RC5/RC6 constants as `ir_protocol.c`. `protocol_classifier` identifies protocol by checking the first pulse/space against 9ms/4.5ms (NEC), 2.66ms/889µs (RC6), or repeated 889µs (RC5). So: the same numbers that **encode** IR in C are used to **decode** protocol from a timing list. No other open universal-remote stack has the encoder and a timing-based protocol classifier sharing one spec in one repo.
- **Autonomous scheduler:** JSON config (time rules + presets). A Python daemon polls every 30s and POSTs button sequences to the simulator when a rule fires. So “at 19:00 run this preset” works with the same TV state and API as manual control.

## Why It’s Novel

- **Unified stack:** C remote, simulator, brand detection, protocol classification, and scheduling are in one repo and one story. You don’t glue three separate projects.
- **No external services:** Brand detection and protocol classification run locally. No API keys, no cloud inference.
- **Encoder/decoder symmetry:** IR timing constants are defined once (C); Python uses them to generate synthetic timings and to classify protocol. One source of truth for “what NEC/RC5/RC6 look like.”
- **Simulator as first-class target:** The remote is designed to drive either real IR or the simulator. Tests and demos don’t require hardware.

## What “Revolutionary” Means Here

Not “we use AI” or “ML-ready.” It means: **first open codebase that does all of the above together**—universal remote, 3D simulator, local text→brand_id, timing-based protocol ID from encoder constants, and time/preset automation—with no cloud and no hand-wavy “future ML” in the critical path. The implementation is rule-based and explicit; the revolution is the combination and the single-repo, single-spec design.
