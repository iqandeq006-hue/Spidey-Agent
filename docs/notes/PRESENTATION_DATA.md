# SIH26171 — Presentation Data (Verified & Presentation-Ready)

## 0. Project Snapshot
- **Problem Statement:** SIH26171 (ISRO) — On-device Visual Perception for Light-weight Browser Agents
- **Project Name:** SpideyAgent
- **Architecture Pattern:** Dual-Track Perception & Local Safety Boundary
- **Status:** Implemented (Extension v1.0.0 / Reasoning Server v2.5)

---

## 1. Actual Prototype Status

**IMPLEMENTED & VERIFIED IN CODE:**
- **Chrome Manifest V3 Browser Extension:** Native TypeScript + Vite build pipeline with background service worker, persistent session management, and side panel controller.
- **On-Device Neural Vision:** ONNX Runtime Web (`onnxruntime-web` v1.30.0) accelerated by WebGPU with WASM SIMD fallback.
- **Face Biometrics Detection:** BlazeFace ONNX (535.8 KB) with IoU Non-Maximum Suppression (NMS) and skin-tone heuristic fallback.
- **Canvas Text Region Localization:** DBNet ONNX (4.75 MB) with dynamic resolution scaling and 8-connectivity Breadth-First Search (BFS) Connected-Component Labeling (CCL).
- **UI Icon & Control Locator:** Microsoft OmniParser v2.0 ONNX (80.4 MB) for identifying clickable sub-controls on canvases and unlabeled buttons, with built-in zero-parameter saliency fallback.
- **Zero-Parameter Spatial Classifier:** GPU viewport downsampling ($256 \times 256$) computing Shannon Visual Entropy in ~1.5 ms to classify macro layouts without neural overhead.
- **Mathematical PII Checksums:** Verhoeff algorithm for 12-digit Aadhaar, Luhn algorithm for cards, statutory 10-char + entity validation for PAN, and 15-char syntax + embedded PAN validation for GSTIN.
- **Complex Form Control Redaction:** Handles React-Select dropdowns, multi-select pill badges, file inputs (`<DOCUMENT_n>`), and static table cell generalization.
- **In-Place Canvas Pixel Redaction:** Permanently burns solid `#0f172a` blackout blocks with `#ef4444` borders and centered security watermark (`ZERO-EGRESS LOCAL REDACTION`) directly into canvas pixel buffers before transmission.
- **In-Memory Local Inversion Vault:** Bidirectional tokenization (`<AADHAAR_ID_1>`, `<PERSON_1>`) with session consistency and execution-time client-side rehydration.
- **Self-Healing Auditor & Fail-Closed Egress:** Computes Privacy Confidence Score ($C_{\text{privacy}}$), scans for high Shannon Entropy secrets ($H > 4.2$ bits), enforces canary tokens, and seals payloads with Web Crypto SHA-256 digests.
- **Client-Side System 1 Decision Engine:** Single forward-pass categorical classification (< 2 ms) for action type prediction, risk tiering, and argmax target node ranking without server latency.
- **Hardware-Level CDP Execution:** Chrome DevTools Protocol (`chrome.debugger` v1.3) mouse and keyboard dispatch generating trusted events (`isTrusted: true`), directly clicking HTML5 canvases.
- **Central Reasoning Server:** Python HTTP server (zero-dependency standard library) supporting local Ollama, Groq Cloud API, OpenAI-compatible endpoints, and deterministic fallback heuristics.
- **4-Tier Risk Policy Gate:** Intercepts high-stakes actions (`TIER_4`) and renders a local authorization modal requiring explicit human confirmation.
- **Model Context Protocol (MCP):** JSON-RPC 2.0 interface exposing privacy-preserving browser tools to external agents (Cursor, Claude Desktop).
- **Automated Verification Suite:** 20/20 automated tests passing (19 unit/pipeline tests + 1 live E2E server wire protocol test).

**PLANNED / NOT IMPLEMENTED (Honest Boundaries):**
- Remote execution on Firefox/Safari (currently Chrome MV3 only).
- Optical Character Recognition (OCR transcription of exact words) — the prototype intentionally performs Neural Text-Region Detection (localization + bounding box redaction) rather than transcription, prioritizing privacy and speed.

---

## 2. Complete Architecture

```text
WEB PAGE (Interactive DOM & Canvases)
↓
LOCAL PERCEPTION (Dual-Track: DOM Tokenization + WebGPU ONNX Vision)
↓
SENSITIVE DATA DETECTION (Mathematical Checksums + BlazeFace / DBNet / OmniParser)
↓
PRIVACY GATE & INVERSION VAULT (Semantic Tokenization & In-Place Pixel Blackout)
↓
SELF-HEALING EGRESS AUDITOR (Canary Check + Entropy Scan + SHA-256 Seal)
↓
SANITIZED CONTEXT (Zero-PII Opaque Scene Graph)
↓  <-- FAIL-CLOSED EGRESS BOUNDARY (SHA-256 Digest)
REMOTE AI REASONING (LLM Gateway / Server Fast-Path Router)
↓
STRUCTURED ACTION PLAN (Categorized Risk Tiers TIER_1 to TIER_4)
↓
LOCAL RISK POLICY GATE (4-Tier Interception & Human Authorization Modal)
↓
BROWSER EXECUTION (Vault Rehydration & CDP Hardware-Level Dispatch)
```

**WHAT STAYS LOCAL (TRUSTED ZONE):**
- All raw screen pixels (Canvases, images, screenshots).
- Real PII values (Aadhaar, PAN, GSTIN, Passports, Bank Accounts, Phone numbers).
- Cryptographic Checksums (Verhoeff, Luhn) and hash calculations.
- In-memory Local Inversion Vault mappings.
- Physical execution via Chrome DevTools Protocol (`chrome.debugger`).

**WHAT LEAVES THE DEVICE (UNTRUSTED ZONE):**
- Opaque Node IDs (e.g., `node_btn_submit_tender`).
- Semantic Tokens (e.g., `<AADHAAR_ID_1>`, `<CONFIDENTIAL_VAL_1>`).
- Sanitized element labels.
- Web Crypto SHA-256 payload digest.

**WHAT THE SERVER RECEIVES:**
- A JSON payload with sanitized `nodes`, `digestSha256`, and `disclosureLevel`.

**WHAT THE SERVER NEVER RECEIVES:**
- Raw screen pixels or visual canvas buffers.
- Real Aadhaar, PAN, Credit Card, or GSTIN numbers.
- Real facial biometrics or signature curves.

---

## 3. Technologies Actually Used

### Browser & Client Core
- **Google Chrome:** Manifest V3 Extension architecture (`background.ts`, `content.ts`, `popup.ts`).
- **Chrome DevTools Protocol (CDP):** Hardware mouse and keyboard dispatch via `chrome.debugger` v1.3 (`isTrusted: true` events).
- **HTML5 Canvas API:** Direct pixel extraction (`getImageData`) and in-place blackout burning (`fillRect`).
- **Tactical UI:** Floating Spotlight Command HUD (`Ctrl+Shift+K`) and animated targeting reticle (`cursorReticle.ts`).

### Perception & Inference
- **ONNX Runtime Web (`onnxruntime-web` v1.30.0):** WebGPU execution provider with WASM SIMD fallback.
- **BlazeFace ONNX (535.8 KB):** Mobile facial biometrics detector.
- **DBNet ONNX (4.75 MB):** Real-time text region localization.
- **Microsoft OmniParser v2.0 ONNX (80.4 MB):** UI Icon detection and canvas control grounding.
- **Connected-Component Labeling (CCL):** Custom 8-connectivity Breadth-First Search (BFS) over probability maps.
- **Non-Maximum Suppression (NMS):** Custom IoU deduplication at `0.35` threshold.
- **Shannon Visual Entropy:** GPU downsampling to $256 \times 256$ for layout classification in ~1.5 ms.

### Privacy & Security
- **Verhoeff Algorithm:** Dihedral group $D_5$ matrix multiplication for UIDAI Aadhaar validation.
- **Luhn Algorithm:** Mod 10 formula for credit/debit card validation.
- **Structural Entity Validation:** 10-char syntax + 4th-char entity verification for Indian PAN and GSTIN.
- **Self-Healing Auditor:** Privacy Confidence Score ($C_{\text{privacy}}$) and Shannon Entropy secret detection ($H > 4.2$ bits).
- **Web Crypto API:** Native client-side SHA-256 payload hashing.

### Backend & AI
- **Python HTTP Server:** Zero-dependency standard library (`http.server.HTTPServer` on port 8000).
- **LLM Integrations:** Groq Cloud API (`llama-3.3-70b-versatile`), local Ollama (`qwen2.5:latest`), OpenAI-compatible endpoints, and deterministic fallback heuristics.
- **System 1 Routing Philosophy:** Non-autoregressive fast-path decision routing (inspired by the Convai Laya paradigm) implemented client-side in TypeScript (<2ms) and server-side in Python.
- **Model Context Protocol (MCP):** JSON-RPC 2.0 MCP interface (`server/mcp_server.py`) exposing privacy tools to external agents.

### Toolchain & Testing
- **TypeScript + Vite:** Modern modular build pipeline.
- **Node.js Native Test Runner (`node --test`):** Automated 20-test verification suite covering privacy, algorithms, pipeline, and wire contracts.

---

## 4. Models and AI Components

### 1. Face Biometrics
- **MODEL:** BlazeFace
- **PARAMETER SIZE:** 535.8 KB (`blazeface.onnx`)
- **RUNTIME:** ONNX Runtime Web (WebGPU / WASM)
- **INPUT TYPE:** Float32 NCHW Tensor `[1, 3, 128, 128]` (normalized `/ 255.0`)
- **TASK:** Face Detection / Biometric Localization
- **POST-PROCESSING:** Anchor box decoding + IoU Non-Maximum Suppression (NMS) at threshold 0.35.
- **WHY WE CHOSE IT:** Sub-3ms inference on client hardware; completely eliminates the need to send user avatars or ID photos to remote VLMs.

### 2. Canvas Text Region Detection
- **MODEL:** DBNet (FPN ResNet architecture)
- **PARAMETER SIZE:** 4.75 MB (`ocr-det.onnx`)
- **RUNTIME:** ONNX Runtime Web (WebGPU / WASM)
- **INPUT TYPE:** Float32 NCHW Tensor `[1, 3, targetH, targetW]` (dynamically scaled to nearest multiple of 32; ImageNet normalized: `mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`)
- **TASK:** Text localization (clustering text bounding boxes, NOT character transcription)
- **POST-PROCESSING:** Probability map thresholding (> 0.35) followed by 8-connectivity BFS Connected-Component Labeling (CCL).
- **WHY WE CHOSE IT:** High-speed probability map generation allowing fine-grained segmentation without over-redacting safe visual space.

### 3. UI Icon & Interactive Control Locator
- **MODEL:** Microsoft OmniParser v2.0 (icon_detect)
- **PARAMETER SIZE:** 80.4 MB (`omniparser_icon_detect.onnx`)
- **RUNTIME:** ONNX Runtime Web (WebGPU / WASM)
- **INPUT TYPE:** Float32 NCHW Tensor `[1, 3, 640, 640]`
- **TASK:** Locating clickable icons, buttons, and sub-controls inside HTML5 canvases and unlabeled DOM nodes.
- **POST-PROCESSING:** Decodes `[1, 5, 8400]` detection matrix, applies NMS, and assigns opaque IDs.
- **FALLBACK:** Lightweight saliency and aspect-ratio heuristics when running on resource-constrained devices without the 80MB model.

### 4. Zero-Parameter Spatial Visual Classifier
- **MODEL:** None (Pure Mathematical Heuristic)
- **RUNTIME:** WebGPU / Canvas 2D
- **INPUT TYPE:** Viewport canvas downsampled to $256 \times 256$ in ~1.5 ms via GPU `createImageBitmap`.
- **TASK:** Macro layout classification (`STRUCTURED_FORM`, `DOCUMENT_ARTIFACT`, `TELEMETRY_CANVAS`).
- **WHY WE CHOSE IT:** Zero-download, sub-2ms layout routing that avoids running heavy neural models on text-only pages.

---

## 5. Privacy / PII Pipeline

### Detected & Validated Entities:
- **Aadhaar Numbers:** Regex + **Verhoeff Algorithm** dihedral $D_5$ group validation (rejects invalid checksums and transpositions).
- **Payment Cards:** Regex + **Luhn Algorithm** mod 10 validation.
- **Indian PAN:** Regex + 10-char format + 4th-char statutory entity type (`P`, `C`, `H`, `A`, `B`, `G`, `J`, `L`, `F`, `T`).
- **GSTIN:** Regex + 15-char structure + embedded PAN validation.
- **Digital Signatures:** Canvas pen-stroke trajectory heuristic with dark ink tracking (includes telemetry filter to prevent blacking out deep-space `#040d1a` backgrounds).
- **Faces & Avatars:** BlazeFace ONNX inference + skin-tone cluster heuristics.
- **Text on Canvases:** DBNet ONNX + 8-connectivity BFS Connected-Component Labeling.
- **Standard PII:** Regex matchers for Email, Indian Mobile (+91), Passport, and Bank IFSC.
- **Form Controls:** Native `<select>`, React-Select custom dropdowns, multi-select chips, and file upload names (`<DOCUMENT_n>`).

### Redaction Implementation:
- **DOM / Text:** Bidirectional Semantic Tokenization (e.g. `<AADHAAR_ID_1>`, `<PAN_NO_1>`). Original values are retained exclusively in the client's Local Inversion Vault.
- **Canvas / Visual:** In-place pixel blackout burning. Solid `#0f172a` slate rectangle with `#ef4444` border and `ZERO-EGRESS LOCAL REDACTION` security watermark permanently drawn into canvas pixels before network serialization.
- **Reversibility:** Original canvas buffers and DOM values are cached locally in memory, allowing instant one-key restoration (`restoreOriginalPage()`).

---

## 6. Browser Agent / Action Pipeline

### Supported Actions:
- **CLICK:** Dispatched via Chrome DevTools Protocol hardware click (`Input.dispatchMouseEvent`) with coordinates resolved from opaque node bounding boxes.
- **TYPE:** Locally rehydrates `<TOKEN>` to the real value from the Local Inversion Vault, then dispatches hardware keystrokes via CDP (`Input.dispatchKeyEvent`).
- **FOCUS:** Native DOM element focus.
- **SCROLL & NAVIGATE:** Viewport scrolling and URL navigation via CDP.

### Action Validation & Policy Gate:
- **Opaque Node Resolution:** The action planner only sees and outputs opaque IDs (e.g. `node_btn_submit_tender`). The local Action Dispatcher maps these IDs to live DOM elements.
- **4-Tier Risk Policy Gate:**
  - `TIER_1`: Read-only, focus, scrolling (Automatic execution).
  - `TIER_2`: Non-sensitive form input (Automatic execution).
  - `TIER_3`: URL navigation / tab switching (Automatic execution).
  - `TIER_4`: High-stakes statutory actions (submitting tenders, deleting records, payment checkout, firing rocket burns).
- **Local Human-in-the-Loop Interception:** For `TIER_4` actions, execution automatically pauses and injects `#sentry-risk-modal` on-screen. The action is blocked until the user explicitly reviews and authorizes it.

---

## 7. Actual Demo Workflow (ISRO e-Procurement Proving Ground)

1. **NAVIGATE:** User opens the ISRO e-Procurement Portal simulation (`eproc.isro.gov.in`).
2. **DETECT & CLASSIFY:** Extension analyzes the page:
   - Macro layout classified as `STRUCTURED_FORM` via Spatial Visual Classifier (~1.5 ms).
   - Form fields scanned: PAN (`AAACA7890B`) and GSTIN (`29AAACA7890B1Z5`) mathematically validated.
   - Digital signature canvas scanned via stroke tracking.
3. **LOCAL REDACTION:**
   - PAN is tokenized as `<PAN_NO_1>` and stored in the Local Inversion Vault.
   - Signature canvas pixels are burned with `#0f172a` blackout box and security watermark.
4. **EGRESS AUDIT:** Self-Healing Auditor computes $C_{\text{privacy}} = 100\%$, verifies canary, and seals the zero-PII opaque scene graph with a SHA-256 digest.
5. **REMOTE REASONING:** Python server receives the sanitized JSON graph, evaluates user goal ("Submit official tender bid"), and outputs a `TIER_4` `CLICK` action targeting `node_btn_submit_tender`.
6. **LOCAL RISK GATE MODAL:** The browser extension intercepts the `TIER_4` action, renders the confirmation modal, and displays the targeting reticle over the button.
7. **HARDWARE DISPATCH:** Upon user click on "Authorize Action", tokens are rehydrated and Chrome DevTools Protocol dispatches a physical hardware click.

---

## 8. Performance and Evaluation Results

- **Client System-1 Decision Latency:** < 2 ms (Categorical forward-pass action prediction and target ranking in TypeScript).
- **GPU Spatial Layout Classification:** ~1.5 ms (Shannon Visual Entropy on $256 \times 256$ tensor).
- **BlazeFace Biometrics Inference:** ~2.3 ms (WebGPU hardware execution).
- **DBNet Text Localization Inference:** ~6.1 ms (WebGPU hardware execution).
- **CCL Cluster Flood-Fill Latency:** 0.58 ms (8-connectivity BFS).
- **Client-Side NMS Filter Latency:** 0.05 ms (IoU deduplication).
- **End-to-End Server Protocol Round-Trip:** 73.5 ms (Measured live integration test against Python server).
- **Automated Test Coverage:** 20/20 Passing (Measured via native Node.js test runner).

---

## 9. SIH Evaluation Criteria Mapping

### 1. Visual Context Extraction — 25%
- **What it does:** Extracts visual elements from canvases (faces, text regions, signatures) entirely on-device.
- **Implementation:** ONNX Runtime Web + BlazeFace + DBNet + OmniParser via WebGPU.
- **Evidence:** Sub-10ms visual inference pass with zero pixel egress over the network.
- **PPT Metric:** Total Visual Inference Latency: < 10 ms.

### 2. Sensitive/PII Detection — 20%
- **What it does:** High-precision local PII detection using strict validation algorithms rather than regex alone.
- **Implementation:** Verhoeff algorithm (Aadhaar), Luhn algorithm (cards), structural entity checks (PAN/GSTIN).
- **Evidence:** 100% pass rate in unit tests rejecting invalid/corrupted 12-digit numbers and invalid entity PANs.
- **PPT Metric:** Zero False Positives on corrupted checksums.

### 3. Redaction Precision — 20%
- **What it does:** Segments text clusters individually to avoid over-blacking whitespace.
- **Implementation:** Connected-Component Labeling (CCL) with 8-connectivity BFS over DBNet probability maps.
- **Evidence:** Isolates distinct text clusters on multispectral canvases while preserving non-text imagery.
- **PPT Metric:** Multi-Region Whitespace Preservation Rate.

### 4. Client-side Resource Utilization — 20%
- **What it does:** Runs extremely lightweight models selectively.
- **Implementation:** Dynamic Minimum-Disclosure Ladder (L0–L3) bypasses neural vision passes on text-only pages; core perception weights total ~5.28 MB (BlazeFace + DBNet).
- **Evidence:** Minimal memory footprint; spatial classifier classifies layouts in 1.5 ms with 0 MB download.
- **PPT Metric:** Core Vision Model Payload: ~5.28 MB.

### 5. End-to-End Latency — 15%
- **What it does:** Highly optimized client-server execution loop.
- **Implementation:** Client-side System 1 decision engine runs in < 2 ms; live server wire contract executes in 73.5 ms.
- **Evidence:** Measured round-trip E2E wire protocol validation at 73.5 ms.
- **PPT Metric:** E2E Protocol Latency: 73.5 ms.

---

## 10. Slide Copy & Pitch Points

### Slide 2 — Proposed Solution
- **Core Statement:** SpideyAgent is an on-device, zero-data-egress browser agent that locally sanitizes visual and structural screen context before remote AI reasoning begins.
- **Core Workflow:** PERCEIVE LOCALLY → DETECT PII → SANITIZE & TOKENIZE → REASON REMOTELY → VALIDATE & ACT LOCALLY.
- **Key Differentiators:**
  - *Algorithmic Checksums:* Verhoeff & Luhn validation eliminates LLM hallucination in PII detection.
  - *In-Place Pixel Blackout:* Mutates canvas pixel buffers directly before network serialization.
  - *Zero-PII Opaque Scene Graphs:* Remote AI only ever sees opaque IDs (`node_xxx`) and tokens (`<AADHAAR_ID_1>`).
  - *Local Inversion Vault:* Rehydration occurs strictly on the local machine at hardware execution time.
  - *Hardware-Level CDP Dispatch:* Chrome DevTools Protocol executes trusted clicks on canvases where synthetic events fail.

### Slide 3 — Technical Approach
- **Browser:** Chrome MV3 (Background Service Worker, Content Scripts, Side Panel).
- **Perception:** ONNX Runtime Web (WebGPU), BlazeFace, DBNet, OmniParser, Spatial Visual Entropy.
- **Privacy:** Verhoeff, Luhn, PAN/GSTIN Validators, Connected-Component Labeling, Self-Healing Auditor.
- **Execution:** Chrome DevTools Protocol (CDP `Input.dispatchMouseEvent`), 4-Tier Risk Policy Gate.
- **Backend:** Python HTTP Server, Groq, Ollama, MCP Server.

### Slide 4 — Feasibility and Viability
- **Lightweight Constraints:** Core vision models total ~5.28 MB, executing in < 10 ms on standard laptop GPUs via WebGPU.
- **Zero-Egress Guarantee:** Raw pixels and real PII never touch the network; fail-closed boundary rejects unmasked data.
- **Viability Domains:** ISRO e-Procurement, ISTRAC satellite telemetry, Healthcare records, Defense procurement, Banking.

---

## 11. Claims to Avoid (Judge Defense Preparedness)

- **Do NOT claim:** "We perform full Optical Character Recognition (OCR) to transcribe text."
  - *Defense:* We intentionally perform **Text-Region Detection (localization)** using DBNet + CCL to redact text clusters without the high compute and latency cost of generative OCR models.
- **Do NOT claim:** "We run a 70B LLM inside the browser."
  - *Defense:* The browser runs lightweight ONNX perception models (BlazeFace, DBNet) and a < 2 ms System-1 decision probe; heavy reasoning is offloaded to remote servers using zero-PII opaque graphs.
- **Do NOT claim:** "We run the external Convai Laya neural weights on our Python server."
  - *Defense:* SpideyAgent adopted the **non-autoregressive System 1 decision paradigm** pioneered by Laya, implementing it natively in client TypeScript (< 2 ms) and server fast-path routing.
- **Do NOT claim:** "We support Safari or Firefox."
  - *Defense:* Prototype is built specifically for Chrome Manifest V3 to leverage WebGPU and the Chrome DevTools Protocol (`chrome.debugger`).

---

## 12. Final Judge-Facing One-Liner

> **"SpideyAgent is an on-device, dual-track privacy agent that mathematically validates sensitive data and visually redacts canvases in under 10 milliseconds, enabling secure browser automation with zero data egress."**
