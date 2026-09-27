# SentryAgent — Engineering Feature Backlog & Roadmap

**Project:** SentryAgent (ISRO SIH26171)  
**Target:** Smart India Hackathon 2026 Evaluation  
**Status:** Production Hardened / Master Pipeline Deployed  

---

## 🟢 Section A: Verified & Implemented Milestones

### 1. Tactical Sentry HUD Reticle / Cursor (Zero-Dependency)
- **Status:** `[COMPLETED]` — [`extension/src/execution/cursorReticle.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/cursorReticle.ts)
- **Delivered:** Injects an isolated Shadow DOM (`#sentry-hud-cursor`) with zero external animation dependencies. Implements smooth glide translation, cyan/saffron mission-control crosshair, target lock-on, and radial click ripples.

### 2. Cross-Page Task Checklist & Multi-Hop State Persistence
- **Status:** `[COMPLETED]` — [`extension/src/background/background.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/background/background.ts)
- **Delivered:** Stores session state in `chrome.storage.local`, intercepts page transitions via `chrome.tabs.onUpdated`, and tracks sub-goal checklists across multi-page workflows without amnesia.

### 3. Dual-Track Privacy Vault with Algorithmic Checksums
- **Status:** `[COMPLETED]` — [`extension/src/privacy/vault.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/vault.ts) & [`checksums.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/checksums.ts)
- **Delivered:** Verhoeff checksums for Aadhaar, Luhn for credit cards, regex formatters for PAN/GSTIN, and deterministic local tokenization (`<AADHAAR_ID_1>`) with in-browser rehydration.

### 4. GPU Spatial Layout Classifier (System 1 Decision Engine)
- **Status:** `[COMPLETED]` — [`extension/src/vision/spatialClassifier.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/spatialClassifier.ts)
- **Delivered:** Downsamples screen to a $256 \times 256$ micro-thumbnail in 1.5ms on the GPU. Computes Shannon Visual Entropy and edge density to classify `STRUCTURED_FORM`, `DOCUMENT_ARTIFACT`, and `TELEMETRY_CANVAS`.

### 5. On-Device Microsoft OmniParser v2.0 ONNX Engine
- **Status:** `[COMPLETED]` — [`extension/src/vision/uiElementLocator.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/uiElementLocator.ts) & [`models/omniparser_icon_detect.onnx`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/public/models/omniparser_icon_detect.onnx)
- **Delivered:** Downloaded official weights from Hugging Face (`microsoft/OmniParser-v2.0`, MIT) and exported to an 8,400-anchor YOLO ONNX model. Detects buttons and widgets inside `<canvas>` telemetry dashboards and infers semantic roles for unlabeled icon buttons.

### 6. Self-Healing Privacy Auditor & Egress Controller
- **Status:** `[COMPLETED]` — [`extension/src/network/selfHealingAuditor.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/network/selfHealingAuditor.ts)
- **Delivered:** Calculates Privacy Confidence Score ($C_{\text{privacy}}$). $C \ge 98\%$ routes to fast path; $80\% \le C < 98\%$ autonomously widens redaction padding by 20% and re-masks; $C < 80\%$ strips visual crops and downgrades to DOM L1.

### 7. Dual-Track Static Content Generalization
- **Status:** `[COMPLETED]` — [`extension/src/privacy/staticContentGeneralizer.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/staticContentGeneralizer.ts)
- **Delivered:** Scans `<td>`, `<span>`, `<p>` text nodes to generalize non-input financial figures and tender bids into typed schemas (`<VAL:BUDGET bracket="TIER_3_HIGH_VALUE_LAKH">`).

### 8. Option A Hardware-Level CDP Dispatcher
- **Status:** `[COMPLETED]` — [`extension/src/execution/cdpDispatcher.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/cdpDispatcher.ts)
- **Delivered:** Dispatches trusted hardware mouse clicks, keystrokes, and keyboard keys directly via `chrome.debugger`. Bypasses bot protections with zero external Playwright/Node process required on Demo Day!

### 9. Master 6-Step Autonomous Perception Pipeline
- **Status:** `[COMPLETED]` — [`extension/src/vision/sentryPipeline.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/vision/sentryPipeline.ts)
- **Delivered:** Unifies Trigger $\to$ GPU Classifier $\to$ Privacy Shield $\to$ Self-Healing Auditor $\to$ Element Locator $\to$ CDP Hardware Execution.

### 10. Zero-AI Deterministic Web Search & Navigation Engine
- **Status:** `[COMPLETED]` — [`extension/src/execution/deterministicNavigator.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/deterministicNavigator.ts)
- **Delivered:** 100% offline, zero-LLM command runner (`SEARCH <query>`, `CLICK <label>`, `FILL <field>`). Uses DOM heuristic search box scoring and Levenshtein similarity to execute in <5ms with zero cloud calls.

### 11. Model Context Protocol (MCP) Server Bridge
- **Status:** `[COMPLETED]` — [`server/mcp_server.py`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/server/mcp_server.py)
- **Delivered:** Standard JSON-RPC 2.0 MCP server exposing `browser_get_sanitized_state`, `browser_zero_ai_command`, `browser_click_node`, and `browser_fill_node` for Claude Desktop, Cursor, and any MCP agent.

---

## 🔵 Section B: Active Roadmap & Enhancements

### 12. In-Browser Side Panel Copilot UI
- **Objective:** Provide a persistent side-by-side Chrome Side Panel chat console (`chrome.sidePanel`) allowing live natural language conversations while watching SentryAgent navigate.
- **Components:** Message stream, real-time telemetry badge, and one-click human approval buttons for Tier 4 actions.

### 13. Sentry Real-Time Telemetry Audit Ledger Stream
- **Objective:** Visual popup stream showing microsecond timestamped logs of every Verhoeff checksum, ONNX inference time, and SHA-256 wire seal event.
