# Changelog

Notable changes, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project has no tagged releases yet, so history is grouped by date. Earlier entries were
reconstructed from the git log.

## [Unreleased]

### Changed
- Documentation overhaul: the README is now a short landing page with a quick start and an
  architecture diagram; commands, ports, endpoints, config keys and keyboard shortcuts were
  checked against the code and corrected.
- Merged `test_simulator/SETUP.md` into `docs/GETTING_STARTED.md`, `test_simulator/README_TESTS.md`
  into `test_simulator/TESTING.md`, and the two latency docs into `docs/LATENCY.md`.

### Added
- `CONTRIBUTING.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/BUTTONS.md`, `docs/C_REMOTE.md`.
- `scripts/check_links.py` to check relative links and anchors in Markdown files.

### Removed
- `docs/REVOLUTIONARY.md` (promotional; its factual content lives in the README and the audit).

## 2026-06-01 – Full house scene

### Added
- The 3D room became a full house with exterior and neighbourhood: stairs and mezzanine,
  kitchen and appliances, dining area, fireplace, foyer, garage, deck, backyard, street props,
  ceiling-fan rotation and small animations.

## 2026-04-21 – More buttons

### Added
- Streaming platform buttons (Disney+, Apple TV+, Hulu, Peacock), recording and gaming controls,
  HDR modes, screen-sharing buttons.
- TV screen colour feeds the room's ambient lighting.

## 2026-03-04 – Smart home, service layer, Docker

### Added
- Whole-house device button codes `0xE8`–`0xF3` in C and in the web server state.
- Smart home panel and devices in the scene; walk mode and camera fixes.
- Service layer (API key, webhooks, MQTT), device adapters, OpenAPI spec and Docker support.

### Changed
- Simulator JavaScript split from one file into modules under `web_static/js/simulator/`.
- Scheduler execution and web server handling; tests aligned with the new behaviour.

### Removed
- Obsolete AI detection plan document.

## 2026-03-02 – Brand detection, IR classifier, scheduler

### Added
- Keyword brand detection and `POST /api/detect-brand`.
- Synthetic IR timing generator, rule-based protocol classifier, autonomous scheduler.
- `test_environment.py` and `test_system.py` (replacing the old test archive).
- Button codes extracted to a single Python module; server-injected codes in the web UI.

### Fixed
- `/api/frame?format=json` response; `h_addr` usage in the C web client; flaky mute and
  channel-down tests.

### Changed
- Assembly files renamed from `.s` to `.S`; simulator presses routed through the ISR path.
- Latency docs moved into `docs/`; docs reorganised with an index.

## 2026-02-25 to 2026-02-27 – Initial import

### Added
- C universal remote: IR codes and protocols, universal TV, handlers, connection, I/O mode,
  system handler, latency module, ARM/AVR/x86 assembly and C fallback, Makefile, examples.
- Python desktop simulator and IPC server; web server with the interactive 3D TV, streaming
  service animations and the frame streaming API.
- Integration and 3D test suites, setup guides, license.
