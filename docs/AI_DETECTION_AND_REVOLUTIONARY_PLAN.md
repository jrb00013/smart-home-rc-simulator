# AI Detection & Revolutionary Directions — Plan Only

**Purpose:** Go deep on what “AI model detection” means in this project, explore ISR/IR/protocol/band AI ideas, and propose something **revolutionary** that (as far as public work goes) no one has done. **Plan only — no implementation here.**

---

## 1. What Does “AI Model Detection” Mean Here?

In this codebase, “model” can mean two different things. Clarifying both avoids confusion.

### 1.1 Device / TV “Model” Detection (What We Usually Mean)

**Goal:** Identify *which physical device* the user has (brand, product line, or exact model) so the remote can:

- Choose the right IR protocol and code set (e.g. Samsung NEC vs Philips RC5).
- Skip “try every protocol” and send the right code first.
- Optionally show “Controlling: Samsung Q80R” in the simulator or on a display.

**Ways to “detect” that model:**

| Input | Method | AI? | Notes |
|-------|--------|-----|--------|
| **Image** (photo of TV/remote) | Vision classifier (e.g. ResNet, ViT, or API like Nyckel) | Yes | “Point phone at TV” → brand/model. Exists commercially; open integration with our stack is rare. |
| **Text** (“I have a Samsung Q80”) | NLP / keyword / LLM | Yes (if LLM) | Map free text to `tv_brand_t` or code set. Simple keyword = no AI; LLM = AI. |
| **IR waveform** (one or a few captured buttons) | Timing + ML or rule-based matching | Optional | “Fingerprint” of pulse lengths → match to known device/protocol. ML can tolerate noise. |
| **Code scan result** (which code worked) | Already in project | No | We already “detect” by trial: which code worked → set brand. Not AI. |
| **Network** (TV on LAN) | UPnP/SSDP, vendor strings | No | Smart TV may expose model in HTTP/XML. Not AI. |

So **“AI model detection”** in this project = **using a learned model (vision, NLP, or signal ML) to infer TV/device brand or model from some input (image, text, or IR signal), then feeding that into `universal_tv_set_brand()` or protocol selection.**

---

### 1.2 “AI Model” as in ML Model (Meta-Sense)

**“AI model detection”** could also mean: *detecting which AI/ML model is being used* (e.g. which LLM generated a response). That’s unrelated to remotes/TVs. In our context we always mean **device/TV model detection** (and optionally protocol/signal detection) using AI, not “detecting AI models.”

---

## 2. ISR-Based AI (Interrupt Service Routine)

**Idea:** Run **tiny ML inference inside or immediately after the IR receiver’s interrupt handler** on the microcontroller.

### 2.1 What ISR Means Here

- **ISR** = Interrupt Service Routine. When the IR receiver pin toggles (edge), the MCU runs a small routine: record timestamp, maybe push to a buffer; optionally run a **very small** neural net (TinyML) on a short window of edges.
- **Goal:** Classify **in real time, on-device**, with minimal latency:
  - **Protocol** (NEC / RC5 / RC6 / Sony / unknown).
  - **Symbol** (e.g. “this burst is a 0” or “this burst is a 1”).
  - Or even **full command** (e.g. “POWER” for this protocol).

### 2.2 Why It’s Hard and Interesting

- **Timing:** IR protocols need microsecond-level timing. ISR must be short; inference must finish before the next edge or within a few ms.
- **Resources:** MCUs (e.g. ARM Cortex-M, AVR) have little RAM/Flash. Model must be tiny (few KB weights, quantized).
- **Data:** Need labeled IR waveforms (protocol + command) to train. Public datasets are scarce; we could generate from our own `ir_protocol.c` + captures.
- **Revolutionary angle:** Almost all open-source decoders are **rule-based** (match timing to known specs). **ISR-based TinyML** = “first edge arrives → run micro-model → output protocol + symbol (or command) before the frame ends.” No one in the open IR remote world has made this the *primary* decoder path with full protocol + command output.

### 2.3 What We Could Plan (No Code)

- **Option A — Protocol-only in ISR:** On each IR frame (after a short buffer of edges), run a small TFLite model: input = normalized pulse lengths (or FFT of timing), output = protocol ID. Then classic rule-based decoder for that protocol turns bits into command.
- **Option B — End-to-end in ISR:** Same buffer → one small net → protocol + command (e.g. 6 protocol classes × 64 commands = 384 classes, or two small nets in sequence). Purely data-driven; no hand-written protocol state machine for decoding.
- **Option C — Symbol-level in ISR:** Model outputs “0” or “1” per symbol; state machine only does framing. Balances ML robustness to noise with existing protocol logic.

---

## 3. IR-Based Protocol AI (Beyond ISR)

Same idea as above but **not necessarily in ISR**: **AI that consumes raw or preprocessed IR and outputs protocol (and optionally brand/command).**

### 3.1 Inputs

- **Raw:** ADC samples from IR receiver (or timestamp sequence of edges).
- **Preprocessed:** Sequence of pulse lengths (mark/space in µs), or spectrogram, or statistical features (mean pulse, variance, burst count, etc.).

### 3.2 Outputs

- **Protocol** (NEC, RC5, RC6, Sony, Samsung, LG, unknown).
- **Brand** (optional): inferred from protocol + address bits (e.g. NEC address 0x20DF → Samsung/LG).
- **Command** (button): full decode so we can “learn” a new remote with one press and replay it.

### 3.3 Why AI Instead of Rules?

- **Noise / real world:** Rule-based decoders break on jitter, reflections, long cables. ML can learn tolerance.
- **Unknown protocols:** New or proprietary protocols: model can at least cluster “this looks like NEC-ish” or “unknown.”
- **Single pipeline:** One model for many protocols instead of 50+ hand-written decoders (like IRMP).
- **Learning from user:** “That was wrong — it’s Philips” → reinforce or fine-tune so next time we prefer RC5 for this device.

### 3.4 Who’s Done What (Short)

- **Rule-based multi-protocol:** IRMP, Arduino-IRremote, ripyl, our `ir_protocol.c` — dominant.
- **ML for IR:** TinyML_IR-Sensor (TFLite classification on sensor data), some research on gesture/IR. **No dominant open “raw IR waveform → protocol + command” neural pipeline** that replaces rule decoders.
- **RF:** Deep learning for 160 shortwave signals (1 s observation, ~90% accuracy) shows **signal → class** is viable; IR has fewer classes and simpler structure.

**Revolutionary angle:** First **open, general-purpose “IR waveform → (protocol, command)” neural decoder** that works across NEC/RC5/RC6/Sony and optionally outputs brand, with a path to run on embedded (TinyML) or in Python for learning/crowd-sourcing.

---

## 4. Python AI–Based “Communication Band” Detection

**“Communication band”** here = **how** the device talks: IR vs RF; if IR, which carrier (38 kHz vs 40 kHz, etc.); if RF, which band (e.g. 433 MHz). So: **physical layer + carrier**, not just protocol.

### 4.1 What We Could Detect (With Python + Optional SDR / Capture Hardware)

| Band / Channel | How to capture | AI role |
|----------------|----------------|---------|
| **IR vs RF** | Single hardware that can sample IR (e.g. TSOP + ADC) and/or RF (SDR or 433 MHz RX) | Classifier: “this segment is IR” vs “this segment is RF.” |
| **IR carrier** | Raw ADC or demodulated timing; FFT or filter bank | “38 kHz” vs “40 kHz” vs “56 kHz” (some remotes). |
| **Protocol family** | Same as §3: pulse timing → NEC vs Philips vs Sony. | Protocol AI as above, run in Python for training and offline analysis. |
| **RF band** | SDR IQ or simple 433 MHz receiver + envelope | 433 MHz vs 868 MHz vs 2.4 GHz (if we ever support RF). |

### 4.2 Python’s Role

- **Training:** Generate or collect lots of labeled data (IR/RF, protocol, carrier); train in PyTorch/TF; export TFLite or ONNX for C/embedded.
- **Offline analysis:** User captures a mystery remote; Python script runs a model → “IR, 38 kHz, NEC, likely Samsung” → output config (e.g. JSON) that the C remote or simulator uses.
- **Optional live band detection:** If the “remote” device has a way to stream raw signal to a host (e.g. USB), Python could run a heavier model in real time and send “use NEC at 38 kHz” to the firmware.

### 4.3 Revolutionary Angle

- **Single dongle + AI:** One hardware dongle that can *receive* both IR and RF (or at least IR with wideband capture). Python (or embedded) model: “this is IR 38 kHz NEC” or “this is 433 MHz OOK” → auto-switch the remote’s TX path (IR blaster vs RF TX). **Automatic “band” detection** (IR vs RF + carrier) is not standard in consumer universal remotes; they usually assume IR only or require manual selection.
- **Crowd-sourced band database:** Users capture “unknown” remotes; Python classifies band + protocol; results uploaded (anonymized) to improve the global model. “Shazam for remotes” at the **physical layer**.

---

## 5. Revolutionary Ideas — What No One’s Done (As One Coherent Stack)

Below are **three directions** that are under-served in the open world, and how they could fit together.

---

### 5.1 Direction A: “Shazam for Remotes” — One Button → Device Identity

**Idea:** User points their *original* remote at our device and presses **one button** (e.g. POWER). We capture the IR waveform (timing + optional raw). A **cloud or local model**:

- Fingerprints the waveform (or a compact feature vector).
- Returns: **device brand + protocol + exact code** (or code set ID).

Then our universal remote **downloads or selects** the right code set and never needs a full “try all protocols” scan again.

**Why it’s revolutionary:**

- No one has opened a **crowd-sourced IR fingerprint → device identity** service with a single-button flow.
- Commercially, universal remotes use code lists (by brand/model) or long scan; they don’t “recognize” the device from one press.
- We already have: C universal sender, code DB, simulator. Missing: **capture path + fingerprint model + backend**.

**Pieces:**

1. **Capture:** IR receiver (or simulator stub) → record pulse timing (and optionally raw) per button press.
2. **Fingerprint:** ML model (or robust hash of timing + protocol params) → embedding or discrete “device ID.”
3. **Backend:** DB of fingerprint → (brand, protocol, code set). Crowd-sourced: when a user confirms “yes, that’s my Samsung,” we store fingerprint → Samsung NEC.
4. **Integration:** Our C or Python client sends fingerprint → gets back brand/codes → `universal_tv_set_brand()` or load code set.

---

### 5.2 Direction B: Neural “IR Waveform → Protocol + Command” as Primary Decoder

**Idea:** Treat **raw IR (timing or ADC)** as the input to a **single neural pipeline** that outputs:

- Protocol ID.
- Decoded command (e.g. button code or vendor-specific code).

Rule-based decoders become **fallback or verification**, not the main path. Model is trained on synthetic data (from our `ir_protocol.c` + noise) and real captures; runs in Python for learning and optionally on MCU (TinyML) for real-time decode.

**Why it’s revolutionary:**

- Every open decoder today is rule-based (IRMP, Arduino-IRremote, etc.). A **general-purpose neural decoder** that handles NEC/RC5/RC6/Sony (and noise) in one model is not available as the main decoder.
- Enables **learning from one example:** capture one POWER press → model decodes → we replay that code. No need to “identify protocol” by hand.

**Pieces:**

1. **Dataset:** Generate labeled IR timing (and optionally raw) for our supported protocols + commands; add real captures; label protocol + command.
2. **Model:** 1D CNN or RNN (or small Transformer) on pulse-length sequence (or spectrogram); output protocol logits + command logits (or single multi-task head).
3. **Training:** Python (PyTorch/TF); export TFLite/ONNX.
4. **Deployment:** (a) Python service: receive capture → run model → return protocol + command for simulator/C. (b) Optional: TFLite on ARM MCU in ISR or right after frame for “neural decoder first.”

---

### 5.3 Direction C: Reinforcement Learning for “Which Protocol to Try First”

**Idea:** Our universal sender currently does **fixed order**: try NEC, then RC5, then RC6, etc. Instead, a **policy** (could be learned) decides **which protocol/code to try first** (and next) based on:

- **Context:** Time of day, last used device, or (more importantly) **device fingerprint** from one capture (Direction A).
- **Feedback:** “TV did not respond” vs “TV responded” (from user or from simulator/IR feedback).

**RL formulation:**

- **State:** Device fingerprint (or “unknown”), maybe last N attempts and outcomes.
- **Action:** Which protocol/code to send next.
- **Reward:** +1 if TV responds, 0 or small negative for “no response” (and optionally penalty for too many tries).

**Why it’s interesting:**

- First **learning-based protocol selection** for universal remotes: adapt over time per device or per user.
- Could run in the cloud (policy server) or on-device (small policy network). Simulator can provide “fake” feedback for training (e.g. “we’re simulating Samsung, so NEC works”).

**Pieces:**

1. **Simulator integration:** Simulator declares “I am Samsung”; when C sends NEC Samsung code, simulator says “success”; when C sends RC5, “fail.” Log (state, action, reward) for training.
2. **Policy:** Small network or table: state → action (which code index to try). Train with DQN or policy gradient.
3. **Deployment:** C remote asks “which code first for this fingerprint?” (or uses on-device policy); after send, reports success/fail to update policy (optional).

---

## 6. How the Pieces Fit Together (Single “Revolutionary” Story)

A **unified story** that no one has delivered open-source:

1. **Band + protocol detection (Python + optional hardware)**  
   Capture raw or timing from “mystery” remote → Python AI: **IR vs RF**, **carrier**, **protocol**, and optionally **command**. Output: config for our C remote and simulator.

2. **Single-button device identity (“Shazam”)**  
   One press from user’s remote → fingerprint → backend (or local DB) → **brand + code set**. C remote sets `universal_tv_set_brand()` or loads that set; no long scan.

3. **Neural IR decoder (waveform → protocol + command)**  
   Primary decoder path (Python first, TinyML later): raw/timing → protocol + command. Enables learning new remotes from one press and feeds into (2).

4. **ISR / embedded TinyML (stretch)**  
   Same neural decoder, quantized and run in ISR or right after frame on MCU: **real-time, on-device** “what protocol and what button” with no cloud. Differentiates from “everything in Python.”

5. **RL protocol ordering (optimization)**  
   Policy that chooses which protocol/code to try first based on fingerprint and feedback. Makes the universal sender **adaptive** instead of fixed order.

6. **Autonomous control (scheduling, presets, program-based)**  
   Buttons are sent **automatically** by the system: time-of-day rules, “set screen” presets (e.g. “7pm = power on, HDMI 1, Netflix, volume 40”), and program-based switching (e.g. “when *News at 6* is on, switch to channel 5”). See §7 below.

**Tagline:** “First open universal remote stack with **AI-driven band + protocol detection**, **one-press device identity**, **neural IR decode**, and **autonomous scheduling/presets** — with a path to **TinyML in the interrupt path** and **learned protocol selection**.”

---

## 7. Autonomous Control: Scheduling, Presets, Program-Based Switching

**Idea:** The remote (or a companion service) **produces button presses automatically** — no user in the loop — based on time, presets (“set screens”), or program guide (cable/broadcast). Goal: “Set it and forget it” for daily routines and program-specific behavior.

### 7.1 Time-of-Day Rules

- **What:** At a specific clock time (or window), the system sends a fixed sequence of IR commands.
- **Examples:**
  - 7:00 AM → POWER ON, INPUT HDMI 1, volume 20 (morning news).
  - 6:00 PM → POWER ON, Netflix app, volume 35 (evening streaming).
  - 11:30 PM → MUTE, then after 2 min POWER OFF (sleep).
- **Inputs:** Time (and optional day-of-week, timezone). Optional: “only if TV is currently off” to avoid redundant presses.
- **Where it could live:** Scheduler daemon (Python or C) that wakes at the right time and sends button codes via existing IPC/API to the C remote or directly to the simulator. Config: JSON or small DSL (e.g. `07:00 → power_on, input_hdmi1, volume 20`).

### 7.2 “Set Screen” / Preset Scenes

- **What:** A **named preset** = one target state: power, input, app, channel, volume, picture/sound mode. User (or a time rule) selects a preset → system sends the minimal button sequence to reach that state from current state.
- **Examples:**
  - **“Living room evening”:** Power ON, HDMI 2, volume 40, picture “Cinema.”
  - **“Gaming”:** Power ON, HDMI 3, Game Mode ON, volume 50.
  - **“Off”:** POWER OFF (or MUTE + POWER OFF after delay).
- **Scheduled use:** “At 7pm every day, apply preset ‘Living room evening’.” So **set screen** is the target; **time-of-day** is the trigger.
- **State awareness:** Ideally the system knows current power/input/app (from simulator or from a real TV’s API/HDMI-CEC). Then it only sends deltas (e.g. if already on HDMI 2, don’t spam INPUT). Simulator already has full state; real hardware could use CEC or “assume unknown” and send full sequence.

### 7.3 Program-Based Switching (Cable / Broadcast)

- **What:** Trigger automatic switching based on **what’s on** — e.g. “when *News at 6* is on, switch to channel 5” or “when the football game starts on ESPN, go to HDMI 1 and channel 42.”
- **Inputs:** Program guide (EPG) or schedule: show name, channel, start/end time. Rule: “when &lt;show&gt; is on → go to &lt;channel or input&gt;.”
- **Flow:**
  1. Guide source: XMLTV, API (e.g. from cable provider or OTA guide), or manual list (show name, channel, time window).
  2. Scheduler checks current time vs guide; if “News at 6” is on now → send CHANNEL_5 (or INPUT HDMI 1 + channel 5).
  3. Optional: “Switch back when show ends” (e.g. return to previous input/channel).
- **Where it could live:** Python service that fetches/parses guide, computes “what should be on now,” and sends the corresponding button sequence (channel number, or input + channel) via the same IPC/API as time-of-day. C remote or simulator executes the presses.

### 7.4 Other Autonomous Ideas (To Keep in Mind)

- **Presence / activity:** “If no one has pressed a button for 30 minutes and it’s past 11pm → POWER OFF.” Requires some notion of “activity” (PIR, or “no button events” from our own remote). Simulator could simulate “idle timeout.”
- **Brightness / time:** “After sunset, apply preset ‘Night’ (lower backlight).” Needs timezone + optional location or manual “sunset” time; then trigger preset or send brightness-down commands.
- **Macro on schedule:** Run a **multi-step macro** (e.g. POWER, wait 3s, INPUT HDMI 2, wait 1s, launch Netflix) at a fixed time. Same as time-of-day but with a sequence and delays; our existing “macro” notion (if any) can be reused.
- **“Follow the program”:** User picks a show once; system auto-switches to that show’s channel whenever it’s on (recurring). Subcase of program-based.
- **Conflict resolution:** Two rules at same time (e.g. “7pm Netflix” vs “7pm News at 6”) → priority or “ask user” or “last-defined wins.” Plan: config supports priority or a simple policy.

### 7.5 Integration With the Rest of the Stack

- **Execution path:** Autonomous logic (Python or C daemon) decides *what* to send; it uses the **same** channel as manual control: e.g. POST `/api/button` to simulator, or IPC to C remote that then blasts IR. So “autonomous” = another **source** of button events, not a separate hardware path.
- **Simulator:** Simulator already has full TV state and handles button codes. Add a **scheduler** (or separate process) that at the right time calls the same `handle_button_press(button_code)` or REST API. Simulator can also expose “current time” (real or simulated) for testing (e.g. “fast-forward” time for demos).
- **Config format:** One place to define:
  - **Time rules:** cron-like or “HH:MM [preset_name]” or “HH:MM → button list.”
  - **Presets:** name → list of (button_code, optional_delay_ms).
  - **Program rules:** (show name or ID, channel, optional input) + optional recurrence.
- **C side:** If the remote runs on device 24/7, it could run a small scheduler (e.g. cron-like table in flash) and emit button presses itself; or it could receive “send these buttons now” from a Python/cloud scheduler via HTTP or local socket. Either way, the C code path is “send this sequence” — same as manual.

### 7.6 Why This Fits the “Revolutionary” Story

- Combines **universal remote** (we already have protocols + simulator) with **home-automation–style scheduling** and **guide-aware behavior** in one open stack. Many commercial “smart” remotes or hubs do scheduling, but rarely with an open, programmable, IR-first design and a 3D simulator for testing.
- **Set screen + time + program** in one config and one execution path is a clear, user-visible feature: “My remote turns on the right thing at the right time and even switches to my show.”

---

## 8. Recommended Order (If We Implement Later)

**AI / detection path:**
1. **Define interfaces:** Capture format (timing array, optional raw), “detected brand/protocol/command” API for C and simulator.
2. **Python band + protocol AI (offline):** Generate data from our protocols; train “timing → protocol” and “timing → protocol + command”; expose via REST or script. No hardware required for training if we use synthetic data.
3. **Single-button fingerprint + backend:** Design fingerprint format and minimal backend (or local JSON DB); integrate with simulator and C so “one press → set brand” works in our stack.
4. **Neural decoder as primary path:** Replace or complement rule decode in one code path (e.g. Python learning tool) with the neural model.
5. **RL protocol order:** Simulator provides feedback; train policy; plug into C sender as “which code to try first.”
6. **TinyML / ISR:** Shrink model; run in C on ARM or in simulator’s “virtual ISR” for demos; document for real hardware.

**Autonomous control path (can run in parallel):**
7. **Scheduler + presets:** Config format for time-of-day rules and “set screen” presets; daemon (Python or C) that triggers button sequences via existing simulator/remote API. Test in simulator with real or simulated time.
8. **Program-based rules:** EPG/guide ingestion (XMLTV or API); rules “when show X is on → channel Y”; scheduler evaluates guide and sends channel/input commands at the right time.
9. **Optional:** Idle timeout (auto power-off), time-based brightness/preset (e.g. “night” after sunset), conflict policy for overlapping rules.

---

## 9. Summary Table

| Idea | Meaning | Revolutionary? | Dependencies |
|------|--------|----------------|--------------|
| **AI model detection** | Detect TV/device brand or model from image, text, or IR so we set the right protocol/codes | Novel when wired to our stack (image/text → set_brand) | Vision/NLP API or local model; simulator/C API |
| **ISR-based AI** | TinyML inside or right after IR edge ISR → protocol or symbol or command in real time on MCU | Yes — no open “neural decoder in ISR” for IR | TinyML, labeled IR data, MCU with enough Flash/RAM |
| **IR protocol AI** | Neural net: raw or timing → protocol (+ brand, + command) | Yes — no general-purpose neural IR decoder in open | Dataset, Python training, optional TFLite |
| **Python band detection** | AI classifies IR vs RF, carrier, protocol from capture; outputs config | Yes if combined with auto-switching TX (IR vs RF) and crowd DB | Capture hardware or simulator stub; Python model |
| **Shazam for remotes** | One button capture → fingerprint → device identity → code set | Yes — no open single-press identity service | Capture + fingerprint model + backend |
| **RL protocol order** | Learn which protocol/code to try first per device or fingerprint | Yes — adaptive sender, not fixed order | Simulator feedback; policy training; C integration |
| **Autonomous control** | Automatic button presses: time-of-day, “set screen” presets, program-based (cable/guide) switching, idle timeout, time-based presets | Strong differentiator — open IR stack + scheduling + guide-aware in one place | Scheduler daemon; config (rules + presets + guide); same execution path as manual (API/IPC) |

This document is **plan only**. Implementation would follow in separate design docs and code.
