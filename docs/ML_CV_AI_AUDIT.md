# ML / CV / AI Audit

Audit of what this project uses (and does not use) in the categories of machine learning (ML), computer vision (CV), and artificial intelligence (AI). No marketing language; implementation only.

---

## Summary

| Category | Used in implementation | Notes |
|----------|------------------------|-------|
| Machine learning | No | No training, no inference, no model files, no frameworks (PyTorch, TensorFlow, etc.). |
| Computer vision | No | No image classification, no object detection, no feature extraction from pixels. |
| AI (broad) | No | No neural networks, no embeddings, no external inference APIs. |

The codebase implements **deterministic, rule-based logic** only. Two components are sometimes mislabeled as "AI" or "ML-ready"; both are explicit algorithms with no learned parameters.

---

## Components Reviewed

### 1. Brand detection (text to TV brand)

**Location:** `test_simulator/brand_detection.py`; exposed via `POST /api/detect-brand` in `test_simulator/web_server.py`.

**Algorithm:**
- Input: single string (e.g. user utterance or query).
- Process: case-normalized substring and word-boundary match against a fixed table `BRAND_KEYWORDS` (e.g. `"samsung"`, `"qled"`, `"lg"`, `"oled"`). No tokenization beyond `str.lower()` and `re.search(rf"\b{re.escape(kw)}\b", ...)`.
- Output: brand name, integer `brand_id` (aligned with C enum `tv_brand_t`), and a confidence scalar derived from match length and whether the match was word-boundary.

**Dependencies:** Python standard library only (`re`). No NLP libraries, no embeddings, no external APIs, no models.

**Conclusion:** Not ML, not NLP in the learned sense. Keyword lookup with a hand-maintained table.

---

### 2. IR protocol classification (pulse-length list to protocol ID)

**Location:** `test_simulator/protocol_classifier.py`. Consumes timing sequences produced by `test_simulator/ir_synthetic.py`.

**Algorithm:**
- Input: list of integers (pulse lengths in microseconds, alternating mark/space).
- Process: compare the first one or two values to fixed thresholds (with 40% tolerance): 9000/4500 -> NEC, 2666/889 -> RC6, repeated 889 -> RC5. No learning, no weights, no dataset used at runtime.
- Output: protocol name, protocol_id (1=NEC, 2=RC5, 3=RC6, 0=unknown), confidence float.

**Dependencies:** None beyond standard library. `ir_synthetic.py` generates sequences from the same numeric constants as the C encoder (`ir_protocol.c`); no model, no training.

**Conclusion:** Not ML. Rule-based threshold classification. The word "classifier" is used in the sense of "decision rule," not "trained model."

---

### 3. Image handling (simulator)

**Location:** `test_simulator/web_server.py` (frame export as PNG/JPEG).

**What is used:** Optional dependency `PIL` (Pillow). Used only for format conversion: decode base64 PNG, convert to RGB if needed, encode as JPEG. No image analysis, no object detection, no feature extraction, no vision models.

**Conclusion:** Not CV. Image I/O and format conversion only.

---

### 4. Planned or documented but not implemented

**Location:** `docs/AI_DETECTION_AND_REVOLUTIONARY_PLAN.md`.

That document describes possible future directions: vision-based TV brand detection, neural protocol decoding, TinyML in an ISR, reinforcement learning for protocol ordering. None of these are implemented in the repository. No code paths call any of these; no dependencies are pulled for them.

---

## Dependencies (relevant to ML/CV/AI)

**C:** None. No TensorFlow Lite, no ONNX, no inference runtimes.

**Python (test_simulator):**
- `flask`, `flask-socketio`, `python-socketio`: HTTP/WebSocket server.
- `pygame`: 2D simulator UI.
- `requests`: HTTP client (scheduler, tests).
- `Pillow` (optional): image format conversion only; not in default dependency list, imported only when available.

No PyTorch, TensorFlow, Keras, OpenCV, scikit-learn, transformers, or similar. No `.tflite`, `.onnx`, `.pt`, `.h5` or other model files in the repository.

---

## References

- Brand detection implementation: `test_simulator/brand_detection.py`
- Protocol classifier: `test_simulator/protocol_classifier.py`
- Synthetic timing generator: `test_simulator/ir_synthetic.py`
- Tests (audit alignment): `test_simulator/tests/test_brand_detection.py`, `test_protocol_classifier.py`, `test_ir_synthetic.py`
- Future/plan (no implementation): `docs/AI_DETECTION_AND_REVOLUTIONARY_PLAN.md`
