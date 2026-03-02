# Documentation Index

Single entry point for project documentation. Links are relative to this directory (`docs/`). Simulator docs live in `test_simulator/` and are linked from the last section.

**Contents of docs/:** GETTING_STARTED, ASSEMBLY_INTEGRATION, CONNECTION, HANDLERS, IO_MODE, SYSTEM_HANDLER, LATENCY_OPTIMIZATION, LATENCY_IMPLEMENTATION, ML_CV_AI_AUDIT, REVOLUTIONARY, AI_DETECTION_AND_REVOLUTIONARY_PLAN, README (this file).

---

## Getting started

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick run: Poetry, web/desktop simulator, C remote, troubleshooting |

---

## C / firmware reference

| Document | Description |
|----------|-------------|
| [ASSEMBLY_INTEGRATION.md](ASSEMBLY_INTEGRATION.md) | IR timing: assembly (x86, ARM, AVR), C fallback, 38 kHz carrier |
| [CONNECTION.md](CONNECTION.md) | Connection management: status, retry, verification, send-with-retry |
| [HANDLERS.md](HANDLERS.md) | Event and interrupt handlers: button, IR, state, registration API |
| [IO_MODE.md](IO_MODE.md) | I/O mode and hardware abstraction |
| [SYSTEM_HANDLER.md](SYSTEM_HANDLER.md) | System handler integration |

---

## Latency

| Document | Description |
|----------|-------------|
| [LATENCY_OPTIMIZATION.md](LATENCY_OPTIMIZATION.md) | How to use the latency system and run the probe |
| [LATENCY_IMPLEMENTATION.md](LATENCY_IMPLEMENTATION.md) | Implementation details, integration points, API |

---

## Audits and rationale

| Document | Description |
|----------|-------------|
| [ML_CV_AI_AUDIT.md](ML_CV_AI_AUDIT.md) | What ML/CV/AI the project uses (and does not use); implementation-only |
| [REVOLUTIONARY.md](REVOLUTIONARY.md) | Why this stack is novel: single codebase, no cloud, encoder/decoder symmetry |

---

## Roadmap (not implemented)

| Document | Description |
|----------|-------------|
| [AI_DETECTION_AND_REVOLUTIONARY_PLAN.md](AI_DETECTION_AND_REVOLUTIONARY_PLAN.md) | Plan: device/brand detection ideas, IR protocol, autonomous control |

---

## Simulator (test_simulator)

| Document | Description |
|----------|-------------|
| [../test_simulator/README.md](../test_simulator/README.md) | Simulator overview, quick start, features |
| [../test_simulator/SETUP.md](../test_simulator/SETUP.md) | Setup: Poetry, WSL/Linux/Windows, troubleshooting |
| [../test_simulator/FEATURES.md](../test_simulator/FEATURES.md) | Features: 3D/VR, keyboard, status, APIs |
| [../test_simulator/API.md](../test_simulator/API.md) | REST and WebSocket API reference |
| [../test_simulator/TESTING.md](../test_simulator/TESTING.md) | Manual testing guide |
| [../test_simulator/README_TESTS.md](../test_simulator/README_TESTS.md) | Pytest test suite: structure, running, fixtures |
