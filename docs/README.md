# Documentation Index

Start with the [project README](../README.md), then [GETTING_STARTED.md](GETTING_STARTED.md).

## Using the project

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Install and run the C remote, web and desktop simulators, scheduler; troubleshooting |
| [BUTTONS.md](BUTTONS.md) | Every button code, and what each part of the system does with it |
| [../test_simulator/FEATURES.md](../test_simulator/FEATURES.md) | 3D scene, animations, keyboard and mouse controls |
| [../test_simulator/API.md](../test_simulator/API.md) | REST and WebSocket API |
| [../test_simulator/docs/SERVICE_AND_AUTOMATION.md](../test_simulator/docs/SERVICE_AND_AUTOMATION.md) | API keys, webhooks, MQTT, device adapters, scheduler config |
| [../test_simulator/docs/HOME_ASSISTANT_NODE_RED.md](../test_simulator/docs/HOME_ASSISTANT_NODE_RED.md) | Home Assistant and Node-RED examples |
| [../test_simulator/PRODUCTION.md](../test_simulator/PRODUCTION.md) | Environment variables, security checklist, Docker, Gunicorn |

## C remote

| Document | Description |
|----------|-------------|
| [C_REMOTE.md](C_REMOTE.md) | Build targets, demo program, universal TV modes, code database, known issues |
| [HANDLERS.md](HANDLERS.md) | Event and interrupt handlers |
| [CONNECTION.md](CONNECTION.md) | Connection state, verification, send-with-retry |
| [IO_MODE.md](IO_MODE.md) | Polling / interrupt / DMA / hybrid I/O modes |
| [SYSTEM_HANDLER.md](SYSTEM_HANDLER.md) | System lifecycle, errors, health monitoring |
| [LATENCY.md](LATENCY.md) | Latency API, measurement points, synthetic probe |
| [ASSEMBLY_INTEGRATION.md](ASSEMBLY_INTEGRATION.md) | IR timing routines (x86, ARM, AVR) and the C fallback |

## Simulator internals

| Document | Description |
|----------|-------------|
| [../test_simulator/README.md](../test_simulator/README.md) | Module map, how the pieces talk, graphics preset, brand detection |
| [../test_simulator/web_static/js/simulator/README.md](../test_simulator/web_static/js/simulator/README.md) | Front-end JavaScript modules and load order |
| [../test_simulator/gpu_runtime/UPGRADE.md](../test_simulator/gpu_runtime/UPGRADE.md) | Graphics runtime: config persistence, hysteresis |
| [ML_CV_AI_AUDIT.md](ML_CV_AI_AUDIT.md) | What ML/CV/AI the project does and does not use |

## Contributing

| Document | Description |
|----------|-------------|
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Build, test and lint commands; doc conventions |
| [../test_simulator/TESTING.md](../test_simulator/TESTING.md) | pytest suite and manual checklists |
| [../CHANGELOG.md](../CHANGELOG.md) | History of notable changes |
| [../ROADMAP.md](../ROADMAP.md) | Known gaps and unimplemented ideas |
