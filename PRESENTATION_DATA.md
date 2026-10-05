# SIH26171 — Presentation Data

## 0. Project Snapshot
- **Problem Statement:** SIH26171 (ISRO) — On-device Visual Perception for Light-weight Browser Agents
- **Project Name:** SpideyAgent
- **Architecture Pattern:** Dual-Track Perception & Local Safety Boundary
- **Status:** Implemented (v2.5.1)

## 1. Actual Prototype Status
**IMPLEMENTED:**
- Cross-Browser Extension (Chrome MV3 and Mozilla Firefox, TypeScript + Vite)
- On-device neural vision via ONNX Runtime Web (WebGPU/WASM)
- Face Biometrics Detection (BlazeFace ONNX)
- Canvas Text Region Detection (DBNet ONNX) with Multi-Region Connected-Component Labeling (CCL)
- Cryptographically verified PII Checksums (Verhoeff for Aadhaar, Luhn for cards, PAN/GSTIN structure validation)
- In-memory Local Inversion Vault (Tokenization and semantic rehydration)
- Fail-Closed Egress Verifier (SHA-256 sealed payload)
- Python Reasoning Server (Ollama / Groq / OpenAI compatible / Fallback Heuristic)
- Model Context Protocol (MCP) Server (Anthropic/Cursor standard JSON-RPC integration)
- 4-Tier Risk Policy Gate (Local validation of remote actions)
- 20/20 automated test suite passing

**PLANNED / NOT IMPLEMENTED:**
- Advanced Character Recognition (OCR transcription of exact words) — the current prototype performs Neural Text-Region Detection (localization + redaction) instead of transcription.

## 2. Complete Architecture
```text
WEB PAGE (Interactive DOM & Canvases)
↓
LOCAL PERCEPTION (Dual-Track: DOM Tokenization + Async ONNX Vision)
↓
SENSITIVE DATA DETECTION (Checksum Validators + BlazeFace/DBNet)
↓
PRIVACY GATE & INVERSION VAULT (Semantic Tokenization & Canvas Pixel Blackout)
↓
SANITIZED CONTEXT (Zero-PII Opaque Scene Graph)
↓  <-- FAIL-CLOSED EGRESS BOUNDARY (SHA-256 Digest)
REMOTE AI REASONING (LLM / System-1 Laya Decision Engine)
↓
STRUCTURED ACTION PLAN (Categorized Risk Tiers)
↓
LOCAL ACTION VALIDATION (4-Tier Risk Policy Gate)
↓
BROWSER EXECUTION (Token Rehydration & DOM Interaction)
```

**WHAT STAYS LOCAL:**
- All raw visual pixels (Canvases, Screenshots)
- Real PII values (Aadhaar, PAN, GSTIN, Passports, Bank Accounts)
- Cryptographic Checksums (Verhoeff, Luhn) computations
- Local Inversion Vault mapping

**WHAT LEAVES THE DEVICE:**
- Opaque Node IDs (e.g., `node_btn_submit`)
- Semantic Tokens (e.g., `<AADHAAR_ID_1>`, `<PERSON_1>`)
- Target labels (Sanitized)

**WHAT THE SERVER RECEIVES:**
- A JSON payload with sanitized `nodes`, `digestSha256`, and `disclosureLevel`.

**WHAT THE SERVER NEVER RECEIVES:**
- Raw screen pixels
- Real Aadhaar, PAN, Credit Card, or GSTIN numbers
- Real facial biometrics

## 3. Technologies Actually Used
### Browser
- Google Chrome (Manifest V3 Extension API)
- Content Scripts, Background Service Worker
- HTML5 Canvas API (Pixel extraction via `getImageData`)

### Perception & Inference
- ONNX Runtime Web (WASM / WebGPU execution provider)
- Breadth-First Search (BFS) for Connected-Component Labeling (CCL)
- Non-Maximum Suppression (NMS)

### Privacy
- Verhoeff Algorithm (Aadhaar validation)
- Luhn Algorithm (Card validation)
- Cryptographic SHA-256 Hashing (Egress validation)

### Backend & AI
- Python HTTP Server (Zero-dependency standard library)
- Ollama / Groq / OpenAI-compatible API
- Convai Laya System 1 Decision Engine (Non-autoregressive routing)

### Automation
- TypeScript + Vite
- Playwright (Used STRICTLY for automated tests, not in the live extension)

## 4. Models and AI Components
### Face Biometrics
- **MODEL:** BlazeFace
- **PARAMETER SIZE:** 535 KB (`blazeface.onnx`)
- **RUNTIME:** ONNX Runtime Web (WebGPU/WASM)
- **INPUT TYPE:** Float32 NCHW Tensor `[1, 3, 128, 128]`
- **TASK:** Face Detection / Localization
- **WHY WE CHOSE IT:** Extremely lightweight, baked-in anchor decoding, sub-5ms inference.

### Canvas Text Region Detection
- **MODEL:** DBNet (FPN ResNet architecture)
- **PARAMETER SIZE:** 4.7 MB (`ocr-det.onnx`)
- **RUNTIME:** ONNX Runtime Web (WebGPU/WASM)
- **INPUT TYPE:** ImageNet-normalized Float32 Tensors `[1, 3, 128, 256]`
- **TASK:** Text localization (finding text clusters, NOT transcription)
- **WHY WE CHOSE IT:** Fast probability map generation suitable for downstream CCL segmentation.

## 5. Privacy / PII Pipeline
**Detected Entities:**
- **Aadhaar Numbers:** Detected via Regex + **Verhoeff Algorithm** validation.
- **Payment Cards:** Detected via Regex + **Luhn Algorithm** validation.
- **Indian PAN:** Detected via Regex + 10-char syntax + 4th-char entity status validation.
- **GSTIN:** Detected via Regex + embedded PAN validation.
- **Faces:** Detected via **BlazeFace** on-device inference.
- **Text/Signatures on Canvases:** Detected via **DBNet + CCL** and Stroke detection heuristics.
- **Mobile/Email/Passport:** Detected via Regex patterns.

**Redaction Implementation:**
- **DOM/Text:** Semantic Tokenization (e.g., replaced with `<AADHAAR_ID_1>`). The real value is saved in a Local Inversion Vault.
- **Canvas/Visual:** In-Place Pixel Redaction Burning. Permanently draws an opaque blackout shield with a security watermark (`ZERO-EGRESS LOCAL REDACTION`) directly into canvas pixels at exact model bounding boxes BEFORE network transmission.

## 6. Browser Agent / Action Pipeline
**Supported Actions:**
- CLICK
- TYPE
- SCROLL
- WAIT
- NAVIGATE

**Validation:**
- Server returns a structured JSON action plan with a `riskTier` (TIER_1 to TIER_4) and `targetOpaqueId`.
- The Action Dispatcher maps the opaque ID to the DOM element.
- **4-Tier Risk Policy Gate:** For TIER_4 (high-stakes actions like submitting tenders or firing rocket burns), the agent pauses and triggers a Local Risk Gate Modal requiring explicit user authorization.
- Before execution, semantic tokens are rehydrated to their original values from the Local Inversion Vault.

## 7. Actual Demo Workflow
1. **OPEN PAGE:** User navigates to the ISRO e-Procurement Portal (`eproc.isro.gov.in`).
2. **DETECT PRIVATE DATA:** Extension scans DOM for PAN/GSTIN and scans the signature pad canvas using DBNet/Stroke detection.
3. **REDACT:** DOM values are tokenized (e.g., `<CONFIDENTIAL_VAL_1>`). Canvas pixels are permanently blacked out.
4. **SEND SANITIZED CONTEXT:** A SHA-256 sealed, zero-PII opaque scene graph is sent to the local Python Reasoning Server.
5. **AI DECIDES ACTION:** Server evaluates the goal ("Submit official tender bid") and returns a TIER_4 `CLICK` action on `node_btn_submit_tender`.
6. **LOCAL VALIDATION:** The browser extension intercepts the TIER_4 action and displays the Risk Gate modal for user approval.
7. **EXECUTE ACTION:** Upon approval, tokens are rehydrated and the button is clicked.

## 8. Performance and Evaluation Results
- **BlazeFace Biometrics Latency:** 2.31 ms (Measured via WebGPU inference).
- **DBNet Text Localization Latency:** 6.12 ms (Measured via WebGPU inference).
- **CCL Cluster Flood-Fill Latency:** 0.58 ms (Measured during BFS).
- **Client-Side NMS Filter Latency:** 0.05 ms (Measured during IoU deduplication).
- **Total Visual Perception Pass:** ~9.01 ms (Measured on full canvas buffers).
- **End-to-End Server Protocol Latency:** 73.5 ms (Measured in integration test).
- **Automated Test Coverage:** 20/20 Passing (Measured via Node.js test runner).

## 9. SIH Evaluation Criteria Mapping
### 1. Visual Context Extraction — 25%
- **What it does:** Extracts visual elements from canvases (faces, text, signatures) entirely on-device.
- **Implementation:** ONNX Runtime Web + BlazeFace + DBNet via WebGPU.
- **Evidence:** Total visual perception pass completes in ~9.01 ms.
- **PPT Metric:** Visual Inference Latency: <10 ms.
- **Weakness:** Relies on canvas elements; complex nested shadow DOM or highly dynamic WebGL contexts might require fallback.

### 2. Sensitive/PII Detection — 20%
- **What it does:** High-precision local PII detection using strict validation algorithms rather than just regex.
- **Implementation:** Verhoeff algorithm for Aadhaar, Luhn for cards, structural entity checks for PAN/GSTIN.
- **Evidence:** 100% pass rate in unit tests rejecting corrupted/invalid 12-digit numbers.
- **PPT Metric:** Detection Precision (Zero false positives on invalid checksums).

### 3. Redaction Precision — 20%
- **What it does:** Segments text clusters individually to avoid over-blacking whitespace.
- **Implementation:** Connected-Component Labeling (CCL) with 8-connectivity BFS over DBNet probability maps.
- **Evidence:** Successfully isolates distinct text clusters on the ISTRAC multispectral canvas, preserving 100% of the middle non-text imagery.
- **PPT Metric:** Multi-Region Whitespace Preservation Rate (Precision of Redaction).

### 4. Client-side Resource Utilization — 20%
- **What it does:** Runs extremely lightweight models selectively.
- **Implementation:** BlazeFace (535KB) and DBNet (4.7MB) run on demand. Dynamic Disclosure-Ladder Gating (L0-L3) prevents running neural passes on text-only pages.
- **Evidence:** Minimal memory footprint; neural weights total ~5.2 MB.
- **PPT Metric:** Total Model Size: 5.2 MB.

### 5. End-to-End Latency — 15%
- **What it does:** Round-trip reasoning execution is highly optimized.
- **Implementation:** On-device processing takes ~9ms; Server fallback/routing takes ~30ms (Laya engine); E2E HTTP overhead is minimal.
- **Evidence:** Measured round-trip E2E wire contract validation at 73.5 ms.
- **PPT Metric:** E2E Execution Latency: 73.5 ms.

## 10. Slide 2 — Proposed Solution
### A. Main Solution Statement
SpideyAgent is an on-device, zero-data-egress browser automation system that locally sanitizes visual and structural screen context before remote AI reasoning begins.

### B. Core Workflow
PERCEIVE LOCALLY → DETECT PII → SANITIZE & TOKENIZE → REASON REMOTELY → VALIDATE & ACT

### C. Key Innovation / Differentiators
- **Algorithmic Validation:** Uses Verhoeff and Luhn checksums instead of unreliable LLM hallucination for PII detection.
- **Connected-Component Labeling (CCL):** Prevents visual over-redaction by precisely segmenting distinct text clusters.
- **Model Context Protocol (MCP):** Connects external AI agents (like Claude Desktop) through a zero-PII secure bridge.
- **Zero-PII Opaque Scene Graphs:** The remote AI only ever sees semantic tokens and node IDs.
- **Local Inversion Vault:** Cryptographic rehydration of real values happens strictly on the client side at execution time.
- **Dynamic Disclosure Gating:** Neural vision is dynamically bypassed on text-only pages to save client resources.

### D. Central Product/Agent Identity
**SPIDER AGENT**
"See the web. Detect the sensitive. Act locally."

### E. Slide-ready copy
**On-device Neural Vision**
Uses lightweight ONNX models directly in the browser.

**Mathematical PII Detection**
Validates Aadhaar and PAN using strict checksums.

**Zero-Data Egress**
Private data never leaves the local machine.

**Semantic Tokenization**
Replaces PII with `<AADHAAR_ID_1>` for the remote AI.

## 11. Slide 3 — Technical Approach
### A. Architecture diagram
```text
USER WEBPAGE (DOM + Canvas)
↓
DUAL-TRACK PERCEPTION (Checksum Engine + WebGPU Vision)
↓
PRIVACY GATE (Tokenization + Pixel Blackout)
↓
SANITIZED OPAQUE GRAPH (SHA-256 Sealed)
↓
REMOTE REASONING (LLM Gateway)
↓
STRUCTURED ACTION PLAN (Categorized Risk Tiers)
↓
4-TIER RISK POLICY GATE (Local Authorization)
↓
BROWSER EXECUTION (DOM Rehydration)
```

### B. Technology Stack
- **Browser:** Chrome MV3
- **Perception:** ONNX Runtime Web, BlazeFace, DBNet
- **Privacy:** Verhoeff, Luhn Checksums, Connected-Component Labeling
- **Inference:** WebGPU / WASM
- **Backend & AI:** Python, Ollama, Groq, Model Context Protocol (MCP)

### C. Technical implementation details
- **Why local inference?** To guarantee visual data never hits the network, solving the core privacy requirement.
- **Why structured actions?** To enforce deterministic risk gating before execution.
- **Why sanitization before transmission?** The fail-closed egress boundary prevents raw PII leakage even if the remote AI is compromised.

### D. Data flow
**LOCAL / TRUSTED ZONE:** Raw pixels, DOM text, Checksum computations, Local Inversion Vault.
**REMOTE / UNTRUSTED ZONE:** Opaque node IDs, Semantic tokens, Action generation.

### E. Demo workflow
OPEN e-Procurement Portal → DETECT PAN/GSTIN & Canvas Signature → REDACT & TOKENIZE → SEND SANITIZED CONTEXT → AI GENERATES `TIER_4` CLICK ACTION → LOCAL VALIDATION MODAL → EXECUTE ACTION

## 12. Slide 4 — Feasibility and Viability
### TECHNICAL READINESS
- **Implementation Status:** The prototype currently uses standard Chrome MV3 APIs and production-ready ONNX Runtime Web for WebGPU acceleration.
- **Models:** Uses highly optimized, quantified ONNX models (BlazeFace and DBNet) that are fully functional in our testbed.

### FEASIBILITY
- **Lightweight Constraints:** The total AI model payload is under 6MB, making it feasible for low-end laptops.
- **Latency Control:** Total visual perception takes less than 10ms by offloading processing to WebGPU and utilizing dynamic disclosure gating.

### VIABILITY
- **Primary Domain:** Government (ISRO e-Procurement, ISTRAC telemetry).
- **Secondary Domains:** Healthcare systems, Enterprise HR, Banking, and Defense workflows where zero-trust browser execution is mandatory.

### CHALLENGES & MITIGATION
| CHALLENGE | MITIGATION |
|---|---|
| False positives on PII | Utilized mathematical checksums (Verhoeff/Luhn) over simple Regex. |
| Visual over-redaction (Blacking out safe UI) | Implemented DBNet + CCL BFS segmentation for tight bounding boxes. |
| Browser memory limits | Combined total model size restricted to ~5.2MB; run dynamically. |
| Unsafe AI actions | Enforced a 4-Tier Risk Policy Gate for local authorization. |

## 13. Slide 5 — Impact and Benefits
### VISUAL STRUCTURE
LEFT: 4 Impact Cards
CENTER: Spider Agent Mascot
RIGHT: 4 Benefit Cards

**LEFT (IMPACT)**
**Sensitive data stays on-device**
before AI reasoning begins.

**Raw private content is blocked**
via cryptographic fail-closed egress.

**Visual context is sanitized**
preventing over-redaction of interfaces.

**High-stakes actions are gated**
by local 4-tier risk policies.

**RIGHT (BENEFITS)**
**Government workflows remain secure**
while leveraging remote AI.

**Resource usage is optimized**
through dynamic disclosure gating.

**Enterprise data avoids leakage**
ensuring zero-trust execution.

**Developers build trustworthy automation**
with verifiable privacy boundaries (via MCP).

## 14. Slide 6 — Research and References
### Model evidence
**BlazeFace**
- **PARAMETER SIZE:** 535 KB
- **RUNTIME:** ONNX Runtime Web
- **INPUT TYPE:** Float32 NCHW Tensor `[1, 3, 128, 128]`
- **TASK:** Face Detection
- **KNOWN BENCHMARKS:** Sub-millisecond inference on mobile GPUs (Published benchmark).
- **WHY WE CHOSE IT:** Ideal for browser-based, client-side biometrics without heavy payload.

**DBNet**
- **PARAMETER SIZE:** 4.7 MB
- **RUNTIME:** ONNX Runtime Web
- **INPUT TYPE:** Float32 Tensor `[1, 3, 128, 256]`
- **TASK:** Text Localization
- **WHY WE CHOSE IT:** Provides high-accuracy probability maps compatible with our custom CCL segmentation.

### Research gap
**EXISTING APPROACH**
vs
**OUR APPROACH**

- **Remote Perception:** Sends raw screenshots to VLM servers.
- **Our Approach:** Local WebGPU perception ensures zero visual egress.

- **Regex-based PII:** High false positive rates.
- **Our Approach:** Algorithmic Verhoeff/Luhn checksum validation.

- **Blind Redaction:** Black-boxes entire regions.
- **Our Approach:** CCL precise multi-region text segmentation.

## 15. Recommended Diagrams
- **Dual-Track Perception Flowchart:** DOM/Checksum path vs Canvas/ONNX path merging at the Privacy Gate.
- **Risk Policy Gate Diagram:** Untrusted Server → Action Plan → Local `TIER_4` Block → User Auth → Execution.

## 16. Recommended Icons / Visual Elements
- **Local Inversion Vault:** A safe/vault icon representing token storage.
- **Egress Boundary:** A locked shield representing the SHA-256 seal.
- **Spider Agent:** Use as a subtle motif connecting "Local Perception" to "Action".

## 17. Claims We Should NOT Make
- "We use Optical Character Recognition (OCR) to read text." (We only do Text-Region Detection / Localization).
- "We are the first zero-egress agent."
- "We support Safari." (Currently Chrome and Firefox only).
- "Our agent hallucinates zero actions." (We mitigate risk via gating, but LLMs can still propose invalid actions).

## 18. Missing Information We Need to Collect
- [NOT FOUND IN PROJECT] Exact CPU/Memory utilization footprint metrics over extended sessions.
- [NOT FOUND IN PROJECT] Scalability of the Python reasoning server under concurrent multi-user load.

## 19. Final Judge-Facing One-Liner
"SpideyAgent is an on-device, dual-track privacy agent that mathematically validates and visually redacts sensitive context in under 10 milliseconds, ensuring zero-trust AI browser automation."
