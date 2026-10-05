# SpideyAgent (SIH26171) — Exhaustive Codebase Technical Specification & Nuances

> **Document Purpose:** An exhaustive, ground-truth technical audit of the `SIH_3` codebase. Every parameter, tensor shape, algorithm, hardware dispatch rule, edge-case bypass, and implementation detail below is verified directly against the source code.

---

## 1. System Architecture & Dual-Track Flow

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL CLIENT TRUSTED BOUNDARY                             │
│                                                                                        │
│  [ Web Page DOM & Canvases ]                                                           │
│         │                                                                              │
│         ├──────────────────────────────────────────┬─────────────────────────────────┐ │
│         ▼                                          ▼                                 ▼ │
│  [ Track 1: DOM & Form Perception ]       [ Track 2: Visual Perception ]   [ System 1 ]│
│  - Mathematical Checksums                 - BlazeFace ONNX (535KB)         - Spotlight │
│    • Verhoeff (Aadhaar UIDAI)             - DBNet ONNX (4.75MB)              HUD       │
│    • Luhn (Payment Cards)                 - OmniParser v2 (80.4MB)         - Visual    │
│    • PAN 10-char format + entity status   - Signature Stroke Heuristics      Reticle   │
│    • GSTIN 15-char syntax + embedded PAN  - Spatial Entropy Classifier     - Sub-2ms   │
│  - Specialized Form Controls              - In-Place Pixel Blackout          Argmax    │
│    • Multi-select pills, custom dropdowns   Burning (#0f172a + hatch)        Ranking   │
│    • File upload badge (<DOCUMENT_n>)     - Reversible Image Buffers                   │
│    • Static table column generalization                                                │
│         │                                          │                                   │
│         └────────────────────┬─────────────────────┘                                   │
│                              ▼                                                         │
│         [ Privacy Gate & Inversion Vault (vault.ts) ]                                  │
│         - Bidirectional in-memory tokenization (<AADHAAR_ID_1>, <PERSON_1>)            │
│         - Session-consistent token assignment via reverse index                        │
│                              ▼                                                         │
│         [ Self-Healing Auditor & Egress Boundary (selfHealingAuditor.ts) ]             │
│         - Mathematical Confidence Score (C_privacy)                                    │
│         - Shannon Entropy secret scanner (H > 4.2 bits catches unmasked API keys)      │
│         - Canary token verification (CANARY_XXXX)                                      │
│         - Residual real PII string scan (strings >= 5 chars)                           │
│         - Web Crypto SHA-256 Digest sealing the outbound payload                       │
└──────────────────────────────┼─────────────────────────────────────────────────────────┘
                               │ Sanitized Opaque Wire Payload (Zero Real PII)
                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            REMOTE / UNTRUSTED REASONING ZONE                           │
│                                                                                        │
│  [ Python HTTP Reasoning Server (app.py on Port 8000) ]                                │
│  - Fast Path: System-1 Keyword Heuristic Router (returns "engine": "laya-system-1")     │
│  - Remote LLM: Groq (Llama-3.3-70B) / Local Ollama (Qwen2.5) / Heuristic Fallback      │
│  - Output: Strict JSON Action Plan with targetOpaqueIds and Risk Tiers (TIER_1 - 4)    │
└──────────────────────────────┬─────────────────────────────────────────────────────────┘
                               │ Structured Action Plan
                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               LOCAL EXECUTION FIREWALL                                 │
│                                                                                        │
│  [ 4-Tier Local Risk Policy Gate (actionDispatcher.ts) ]                               │
│  - TIER_1 to TIER_3: Automatic execution                                               │
│  - TIER_4: On-Screen Modal (#sentry-risk-modal) requiring explicit user approval       │
│  - Local Token Rehydration: Vault replaces <TOKEN> with real value at execution point  │
│  - Hardware-Level Dispatch: Chrome DevTools Protocol (CDP Input.dispatchMouseEvent)    │
│    • Generates trusted events (isTrusted: true)                                        │
│    • Works on HTML5 canvases and bypasses bot protections                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Neural Models & Perception Nuances

All neural models run client-side inside the browser extension via **ONNX Runtime Web (`onnxruntime-web` v1.30.0)** with **WebGPU** hardware execution provider and **WASM SIMD** fallback.

| Model | File & Actual Size | Architecture | Input Tensor Details | Output & Post-Processing Nuances | Implementation File |
|---|---|---|---|---|---|
| **BlazeFace** | `blazeface.onnx`<br>(**535.8 KB**) | Mobile Face Detection & Biometrics | Float32 NCHW `[1, 3, 128, 128]`<br>(normalized `/ 255.0`) | • Decodes anchor boxes `[xmin, ymin, xmax, ymax]`.<br>• Custom **IoU Non-Maximum Suppression (NMS)** with threshold `0.35`.<br>• Heuristic fallback: Skin-tone cluster detector (`hasFaceCharacteristics`) checking $R>95, G>40, B>20$ and $(R-G)>15$ to catch human faces if ONNX fails. | [`visionEngine.ts:281-406`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/visionEngine.ts#L281-L406) |
| **DBNet** | `ocr-det.onnx`<br>(**4.75 MB**) | Real-time Scene Text Detection (FPN ResNet) | Float32 NCHW `[1, 3, targetH, targetW]`<br>• **Dynamic dimensions:** Canvas width/height dynamically rounded to nearest multiple of 32: `Math.max(32, Math.round(dim / 32) * 32)`.<br>• ImageNet normalized: `mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`. | • Outputs probability map `sigmoid_0.tmp_0`.<br>• Custom **Connected-Component Labeling (CCL)** with **8-connectivity BFS** clusters text regions (threshold > 0.35, min 8 px).<br>• Scales back to source canvas with 2px padding for tight redaction. | [`visionEngine.ts:409-558`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/visionEngine.ts#L409-L558) |
| **Microsoft OmniParser v2.0** | `omniparser_icon_detect.onnx`<br>(**80.4 MB**) | UI Icon Detection & Element Locator | Float32 NCHW `[1, 3, 640, 640]`<br>(normalized `/ 255.0`) | • Outputs `[1, 5, 8400]` detection matrix.<br>• Identifies clickable icons on canvases and unlabeled DOM buttons.<br>• Grounded into DOM scene graph with labels like `OmniParser_Icon_n`. | [`uiElementLocator.ts:1-274`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/uiElementLocator.ts#L1-L274) |
| **YOLOS (ViT)** | `yolos_tiny_q4.onnx`<br>(**7.81 MB**) | Vision Transformer asset | Listed in setup script & assets | Packaged asset model. | [`scripts/download_models.mjs:20`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/scripts/download_models.mjs#L20) |

### Key Vision Nuances & Edge-Case Handling in Code:
1. **Model Payload Sizing:**
   - Total model assets in `extension/public/models`: **~93.5 MB**.
   - If running on low-resource machines, `uiElementLocator.ts` falls back to saliency heuristics if OmniParser is absent, allowing a minimal neural footprint of **~5.28 MB** (BlazeFace + DBNet).
2. **Deep Space Telemetry False-Positive Protection:**
   - In [`visionEngine.ts:622-624`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/visionEngine.ts#L622-L624), the pen stroke detector explicitly skips the dark background of deep space satellite telemetry maps (`#040d1a`: $R < 15, G < 20, B < 35, \text{width} > 300$), preventing space telemetry charts from being incorrectly blacked out as signatures.
3. **CORS Tainted Canvas Fallback:**
   - If a canvas is tainted by cross-origin images and `ctx.getImageData()` throws a security error, the code catches it and generates an opaque placeholder `<CANVAS_BUFFER_n_tainted>` ([`visionEngine.ts:165-175`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/visionEngine.ts#L165-L175)), ensuring zero crashes.
4. **Re-burning Prevention:**
   - [`isCanvasActivelyRedacted()`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/visionEngine.ts#L693-L710) samples every 4th pixel to verify if `#0f172a` blackout pixels already exist. If found, it skips the canvas to prevent redundant re-redaction cycles.
5. **In-Place Visual Pixel Redaction:**
   - Mutates pixel buffers using `CanvasRenderingContext2D.fillRect`: solid slate `#0f172a`, 2px crimson `#ef4444` border, and centered watermarks `🔒 [LABEL]` and `ZERO-EGRESS LOCAL REDACTION`.
6. **Reversible Redaction:**
   - Before mutating canvases, [`content.ts:28`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/content/content.ts#L28) caches `originalImageData` in a `trackedCanvases` map. Calling `restoreOriginalPage()` restores the original canvas state via `ctx.putImageData()`.

---

## 3. Privacy, PII Detection & Checksum Engine Nuances

Implemented in [`extension/src/privacy/checksums.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/checksums.ts):

### A. Mathematical Checksums (Zero False Positives on Corrupted Numbers)
1. **Aadhaar Numbers (12 digits):**
   - Validated via the **Verhoeff Algorithm** using dihedral group $D_5$ multiplication table ($D$) and permutation table ($P$).
   - Catches 100% of single-digit errors and consecutive digit transpositions.
2. **Payment Card Numbers (13–19 digits):**
   - Validated via the **Luhn Algorithm** (mod 10 double-add on alternating digits).
3. **Indian Permanent Account Number (PAN):**
   - 10-char format `^[A-Z]{5}[0-9]{4}[A-Z]$`.
   - **4th-character entity check:** Must match `P` (Individual), `C` (Company), `H` (HUF), `A` (AOP), `B` (BOI), `G` (Govt), `J` (Artificial Juridical), `L` (Local), `F` (Firm), or `T` (Trust).
4. **Indian GSTIN (15 characters):**
   - Format `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`.
   - Automatically slices characters 3–12 (embedded PAN) and runs the full PAN validator.

### B. DOM Form Control Handling Nuances
In [`content.ts:91-350`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/content/content.ts#L91-L350):
- **Inputs & Textareas:** Replaces `.value` with token, stores original in `trackedElements`, adds CSS badge.
- **File Upload Inputs:** Extracts file name, tokenizes as `<DOCUMENT_n>`, and inserts an adjacent styled badge pill (`sentry-redacted-file-badge`).
- **Multi-Select Pills / Auto-complete Chips:** Scans `div[class*="multi-value"]` and `.badge`, replaces inner text with `<CONFIDENTIAL_TEXT_n>`.
- **Custom React-Select & Dropdowns:** Scans `div[class*="singleValue"]`, tokenizes selected text as `<LOCATION_n>`.
- **Static Content Generalization:** [`staticContentGeneralizer.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/staticContentGeneralizer.ts) maps raw monetary amounts to typed functional brackets (e.g. `<AMOUNT_RANGE_10K_50K>`).
- **Sensitive `<img>` Elements:** Detects profile pictures and signatures via selector heuristics (`img[src*="avatar"]`, `img[alt*="avatar"]`), applying localized visual blur shields.

### C. In-Memory Local Inversion Vault
In [`vault.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/vault.ts):
- `vault: Map<string, VaultEntry>` and `reverseIndex: Map<string, string>`.
- **Session Consistency:** If the same PAN or Aadhaar appears in 3 different inputs across a form, `reverseIndex` ensures all 3 receive the identical token (e.g. `<PAN_NO_1>`).
- Values are rehydrated **strictly on the client machine** at hardware execution time.

### D. Self-Healing Auditor & Shannon Entropy Scan
In [`selfHealingAuditor.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/network/selfHealingAuditor.ts):
- Evaluates outbound scene nodes with a **Privacy Confidence Score** ($C_{\text{privacy}}$):
  - Canary Token violation: $-1.0$ (instant fatal block).
  - Residual Real PII string ($\ge 5$ chars): $-0.40$ each.
  - High-Entropy word ($H > 4.2$ bits on strings $\ge 16$ chars): $-0.10$ each (catches leaked API keys, hashes, tokens).
- **Workflow Adaptation:**
  - $C \ge 98\%$: `FAST_PATH_TRANSMIT` (seals payload with SHA-256 and transmits).
  - $80\% \le C < 98\%$: `TRIGGER_AGGRESSIVE_HEALING` (expands visual bounding box padding ratio and re-scans).
  - $C < 80\%$: `DOWNGRADE_TO_DOM_ONLY` or `FAIL_CLOSED_BLOCK`.

---

## 4. Execution, Navigation & System 1 Nuances

### A. The Reality of "Laya" in Code vs. Client-Side System 1
- **Server-Side Laya ([`server/app.py:55-105`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/server/app.py#L55-L105)):**
  - `server/requirements.txt` has `laya>=0.3.20` and `app.py` has `import laya`.
  - **No Laya APIs are called.** The function `try_laya_system1_route()` executes plain Python keyword matching (`goal_lower = user_goal.lower()`, checking keywords `['submit', 'bid', 'pay', ...]`) and tags the response dictionary with `"engine": "laya-system-1"`.
- **Client-Side Real System 1 ([`system1DecisionEngine.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/system1DecisionEngine.ts)):**
  - Real, native TypeScript single-pass forward evaluator running in **< 2 ms** with zero server requests.
  - Predicts **Risk Head** (`TIER_4` for high-risk verbs, else `TIER_2`).
  - Predicts **Action Head** (`CLICK`, `TYPE`, `NAVIGATE`).
  - **Target Argmax Ranking:** Scores opaque nodes using keyword overlap, input role alignment (+2.0 for `INPUT` on `TYPE`), and recency penalties (-4.0 if previously clicked).
- **Spatial Visual Classifier ([`spatialClassifier.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/spatialClassifier.ts)):**
  - Downsamples viewport to $256 \times 256$ on GPU via `createImageBitmap` in **~1.5 ms**.
  - Computes Shannon Visual Entropy ($H(X) = -\sum p(x)\log_2 p(x)$) and spatial edge density.
  - Classifies macro layout into `STRUCTURED_FORM`, `DOCUMENT_ARTIFACT`, or `TELEMETRY_CANVAS`.

### B. Hardware-Level Dispatching via Chrome DevTools Protocol (CDP)
In [`cdpDispatcher.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/cdpDispatcher.ts):
- Attaches to Chrome's debugging port via `chrome.debugger` (protocol version 1.3).
- Uses `Input.dispatchMouseEvent` (`mouseMoved`, `mousePressed`, `mouseReleased`) and `Input.dispatchKeyEvent`.
- **Why CDP Matters:**
  - Events have `isTrusted === true` (identical to physical human mouse and keyboard input).
  - Works on HTML5 canvas coordinate spaces where synthetic DOM `.click()` fails.
  - Bypasses bot detection guards.
  - Gracefully falls back to synthetic DOM events if debugger permissions are inactive.

### C. Action Dispatcher Implementation Nuance
In [`actionDispatcher.ts:60-68`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/actionDispatcher.ts#L60-L68):
- `PlannedAction` interface defines `'CLICK' | 'TYPE' | 'FOCUS' | 'SCROLL' | 'NAVIGATE'`.
- `executeAction()` specifically implements handlers for:
  - **`CLICK`**: Glides visual reticle, scrolls element into center view, dispatches CDP hardware click.
  - **`TYPE`**: Rehydrates token from vault, dispatches CDP hardware keystrokes.
  - **`FOCUS`**: Native DOM `.focus()`.
  - *(Note: `SCROLL` and `NAVIGATE` are handled via CDP or `deterministicNavigator.ts` rather than separate branches in `executeAction()`)*.
- **Tier 4 Risk Gate Modal:** If `action.riskTier === 'TIER_4'`, execution pauses and displays `#sentry-risk-modal` on-screen. Execution aborts unless the user explicitly clicks "Authorize Action".

### D. User Interface & Observability
- **Spotlight Command HUD ([`sentrySpotlight.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/sentrySpotlight.ts)):** Floating palette summoned via `Ctrl+Shift+K` / `Cmd+Shift+K` for zero-AI navigation.
- **Targeting Reticle ([`cursorReticle.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/cursorReticle.ts)):** Tactical HUD crosshair that animates to target element coordinates before action execution.
- **Side Panel UI ([`popup.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/popup/popup.ts)):** Segmented into Chat Stream and Log Space with live Vault Drawer and Visual Proof Lightbox.
- **Multi-Hop Persistence ([`background.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/background/background.ts)):** State persisted to `chrome.storage.local`, allowing autonomous tasks up to 8 steps across full-page navigations without "multi-hop amnesia".

---

## 5. Backend Server & MCP Specification

### A. Central Reasoning Server ([`server/app.py`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/server/app.py))
- Uses Python standard library `http.server.HTTPServer` on port 8000.
- *(Note: `server/requirements.txt` lists `fastapi`, `uvicorn`, and `pydantic`, but none are imported in `app.py`)*.
- **Server SHA-256 Digest Nuance:**
  - The client verifies and computes the SHA-256 digest in `egressVerifier.ts`.
  - In `app.py:292-306`, the server logs `wire_digest = payload.get('digestSha256')` and reflects it back as `"verifiedDigest": wire_digest` without independently re-hashing the node array.
- **LLM Reasoning Hierarchy:**
  1. Fast-path heuristic router (`try_laya_system1_route`).
  2. Groq Cloud API (`llama-3.3-70b-versatile`) if `GROQ_API_KEY` is present.
  3. Local Ollama (`qwen2.5:latest`) on `http://localhost:11434`.
  4. Built-in rule-based heuristic planner (`heuristic_goal_planner`).

### B. Model Context Protocol (MCP) Server ([`server/mcp_server.py`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/server/mcp_server.py))
- Implements standard JSON-RPC 2.0 MCP interface (protocol version `2024-11-05`).
- Exposes tools to external agents (Cursor, Claude Desktop):
  - `browser_get_sanitized_state`: Retrieves sanitized scene graph with zero PII.
  - `browser_zero_ai_command`: Deterministic zero-AI browser execution.
  - `browser_click_node`: CDP hardware mouse click on opaque node IDs.
  - `browser_type_node`: CDP hardware keystrokes on target opaque inputs.

---

## 6. Automated Test Suite Breakdown

- **Framework:** Native Node.js Test Runner (`node --test`).
- **Execution Commands in `extension/package.json`:**
  - `npm run test`: Runs [`privacy.test.mjs`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/testbed/automated-tests/privacy.test.mjs) (**19 tests**, 100% passing standalone).
  - `npm run test:e2e`: Runs [`e2e-plan.test.mjs`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/testbed/automated-tests/e2e-plan.test.mjs) (**1 test**, passes against live Python server on port 8000).
  - `npm run test:all`: Runs all **20 tests** combined.

### Full Inventory of the 20 Tests:
1. `Verhoeff Checksum: Validates genuine Aadhaar numbers`
2. `Verhoeff Checksum: Rejects invalid or corrupted 12-digit numbers`
3. `Luhn Checksum: Correctly identifies valid and invalid payment cards`
4. `PAN Validator: Enforces 10-char format and valid entity character`
5. `GSTIN Validator: Verifies structure and embedded PAN`
6. `Local Inversion Vault: Tokenization, consistency, and safe rehydration`
7. `Fail-Closed Egress Verifier: Rejects canary strings and residual raw PII`
8. `Non-Maximum Suppression (NMS): Deduplicates overlapping anchor bounding boxes`
9. `Connected-Component Labeling (CCL): Separates multiple distinct text clusters instead of 1 giant box`
10. `Self-Healing Privacy Auditor: Calculates Confidence Score (C_privacy) & directs adaptive workflow`
11. `Dual-Track Static Content Generalization: Maps static table/text amounts to typed functional brackets`
12. `OmniParser-Inspired UI Icon Locator: Infers semantic roles for unlabeled icons & buttons`
13. `End-to-End Sentry Pipeline: Verifies 6-Step On-Device Perception and Safe Hardware Execution Gate`
14. `Zero-AI Deterministic Navigator: Parses verbs and extracts target queries with 0 LLM calls`
15. `Model Context Protocol (MCP): Verifies JSON-RPC 2.0 handshake and exposed privacy-preserving tools`
16. `Floating Spotlight Command HUD: Validates keyboard shortcuts and command execution dispatch`
17. `Local System-1 Decision Engine: Categorical action prediction, target ranking, and risk gating in < 2ms`
18. `Observability Telemetry Engine: Validates structured audit logging, category filtering, and JSON export`
19. `One-Key Redact -> Query -> Auto-Restore: Validates full on-device privacy lifecycle`
20. `End-to-End Server Protocol: Validates SHA-256 Digest and Plans Opaque Actions`

> **Note on Benchmark Metrics:** As noted in [`SIH_3/docs/notes/next-step-benchmark-plan.md`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/docs/notes/next-step-benchmark-plan.md), node test runner scripts use `MockVisionEngine` for Node-only headless execution. The **73.5 ms** figure is the measured live server round-trip latency; the individual sub-10ms neural inference latencies (BlazeFace 2.31ms, DBNet 6.12ms) represent WebGPU hardware projection benchmarks.
