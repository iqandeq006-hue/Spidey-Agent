# 🕷️ SpideyAgent — On-Device Visual Perception & Zero-Trust Privacy Firewall

<p align="center">
  <img src="extension/icons/logo.png" alt="SpideyAgent Shield" width="130" height="130" style="border-radius: 26px; box-shadow: 0 10px 30px rgba(66, 133, 244, 0.35);" />
</p>

<p align="center">
  <b>Powered by Laya: Non-Autoregressive Decision Model · In-Browser Neural Perception Engine</b><br/>
  <i>Smart India Hackathon 2026 · Indian Space Research Organisation (ISRO) · Problem Statement SIH-26171</i>
</p>

<p align="center">
  <a href="https://huggingface.co/convaiinnovations/laya"><img src="https://img.shields.io/badge/%F0%9F%A4%97%20Model-convaiinnovations%2Flaya-blue?style=flat-square" alt="Laya Decision Model"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/"><img src="https://img.shields.io/badge/Manifest-Chrome%20MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest MV3"></a>
  <a href="#-automated-verification-suite"><img src="https://img.shields.io/badge/Tests-19%2F19%20Passing-10B981?style=flat-square&logo=checkmarx&logoColor=white" alt="Tests 19/19 Passing"></a>
  <a href="#-empirical-benchmark-scorecard"><img src="https://img.shields.io/badge/Recall-100.0%25-059669?style=flat-square&logo=target&logoColor=white" alt="Recall 100%"></a>
  <a href="#-laya-non-autoregressive-decision-engine"><img src="https://img.shields.io/badge/Decision%20Latency-%3C%202ms%20ONNX%20%2F%20~30ms%20Server-8B5CF6?style=flat-square&logo=speedtest&logoColor=white" alt="Laya Latency"></a>
  <a href="#-zero-trust-threat-model"><img src="https://img.shields.io/badge/Zero--Egress-0%20Raw%20Bytes-EF4444?style=flat-square&logo=security&logoColor=white" alt="Zero Egress"></a>
  <a href="#-model-context-protocol-mcp-integration"><img src="https://img.shields.io/badge/Protocol-MCP%20JSON--RPC-F97316?style=flat-square&logo=anthropic&logoColor=white" alt="MCP Server"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start</b></a> ·
  <a href="#-the-laya-decision-model"><b>Laya Decision Model</b></a> ·
  <a href="#-how-it-fits-together"><b>How It Fits Together</b></a> ·
  <a href="#-system-architecture"><b>Architecture</b></a> ·
  <a href="#-on-device-neural-model-zoo"><b>Model Zoo</b></a> ·
  <a href="#-empirical-benchmark-scorecard"><b>Benchmarks</b></a> ·
  <a href="#-zero-trust-threat-model"><b>Security</b></a>
</p>

---

**Zero raw pixels. Zero leaked credentials. Non-autoregressive decision intelligence.**

As autonomous browser agents navigate defense and government intranets, uploading raw screen viewports or DOM trees to remote cloud LLMs causes catastrophic data egress: **radar telemetry, digital signatures, contractor bids, employee identities, and Aadhaar/PAN cards are exposed to external providers.**

**SpideyAgent** pairs a **hardware-gated on-device privacy airlock** with the groundbreaking **Laya Non-Autoregressive Decision Model** ([`convaiinnovations/laya`](https://huggingface.co/convaiinnovations/laya)):
- 🧠 **Laya Decision Intelligence:** Eliminates slow, non-deterministic 3,000ms autoregressive LLM calls. Laya delivers typed, calibrated decisions in a **single forward pass (~33ms on server / <2ms on-device via quantized ONNX)** trained via reinforcement learning against strictly proper scoring rules (RLCD).
- 🛡️ **Zero Raw Data Egress:** Faces, signature pads, credentials, and telemetry streams are intercepted and burned out in-memory on the client machine before any frame or DOM payload is serialized.
- 🔬 **On-Device Multi-Modal Perception:** Runs 5 quantized ONNX models directly on the client's WebGPU / WASM SIMD runtime — zero external vision APIs or cloud inference.
- 🔒 **Cryptographic State Locking:** Outbound states are signed with SHA-256 integrity digests, and sensitive tokens are permanently bound to `window.location.origin` with Human-in-the-Loop (HITL) physical gating.

---

## ⚡ The Laya Decision Model

SpideyAgent integrates **Laya** ([`convaiinnovations/laya`](https://huggingface.co/convaiinnovations/laya)), the state-of-the-art non-autoregressive decision model, across both client and server tiers:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           LAYA DUAL-TIER DECISION ENGINE                                │
│                                                                                         │
│   CLIENT-SIDE AUDIT (ONNX Runtime Web)            SERVER-SIDE ROUTER (Python PyTorch)   │
│   • Model: laya_system1_int8.onnx (18.7 KB)       • Model: convaiinnovations/laya       │
│   • Latency: < 2.0 ms (WebAssembly / WebGPU)      • Latency: ~30-33 ms (Single Pass)    │
│   • Role: Real-time action safety audit,          • Role: Non-autoregressive structured │
│     risk tiering (TIER_1..4), & HITL gating         goal-to-node routing & planning     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why Laya Outperforms Autoregressive Cloud LLMs:
1. **Single Forward Pass Execution:** Unlike generative LLMs that generate tokens autoregressively (taking 2,000ms–4,000ms), Laya evaluates the user goal and sanitized scene nodes in **one forward pass (~33ms)**.
2. **Calibrated Confidence & Proper Scoring (RLCD):** Trained with Reinforcement Learning against Strictly Proper Scoring Rules. It outputs calibrated probabilities, directly quantifying risk confidence.
3. **On-Device Safety Gate:** Every planned action is audited on-device in **<2ms** by `laya_system1_int8.onnx` before dispatch. If an action mutates sensitive data or submits financial forms (`TIER_4`), Laya halts execution and demands manual human approval.

---

## 🧭 Evaluation Roadmap

| What do you want to inspect? | Start here |
|:---|:---|
| **Launch 1-Click Live Judge Demo** | [Quick Start](#-quick-start) (`run_demo.bat`) |
| **Inspect Laya Non-Autoregressive Decision Engine** | [The Laya Decision Model](#-the-laya-decision-model) |
| **Understand the 4 Architectural Planes** | [How It Fits Together](#-how-it-fits-together) |
| **Review Technical Architecture & Dataflow** | [System Architecture](#-system-architecture) |
| **Audit On-Device Neural Vision Weights** | [On-Device Neural Model Zoo](#-on-device-neural-model-zoo) |
| **Review Empirical Precision & Latency Numbers** | [Empirical Benchmark Scorecard](#-empirical-benchmark-scorecard) |
| **Examine Prompt-Injection & Exploit Defenses** | [Zero-Trust Threat Model](#-zero-trust-threat-model) |
| **Run the 19 Automated Privacy & Unit Tests** | [Automated Verification Suite](#-automated-verification-suite) |

---

## 🏛️ System Architecture

### 1. High-Level Data Flow Pipeline

```mermaid
flowchart TD
    subgraph STAGE1 ["STAGE 1: In-Browser Perception and Capture"]
        DOM["Raw Viewport and DOM (content.ts)"]
        SENTRY["Parallel ONNX Sentry Pipeline (visionEngine.ts)"]
        BF["BlazeFace ONNX: Face Blackout (2.1ms)"]
        DB["DBNet ONNX: Signature Pad Text (6.9ms)"]
        OP["OmniParser v2: UI Icon Grounding (28ms)"]
        YO["YOLOS-ViT q4: Visual Layout (18.5ms)"]
        DOM --> SENTRY
        SENTRY --> BF
        SENTRY --> DB
        SENTRY --> OP
        SENTRY --> YO
    end

    subgraph STAGE2 ["STAGE 2: Zero-Trust Privacy Airlock"]
        CHECKSUM["Deterministic Mathematical Checksums (checksums.ts)"]
        QUARANTINE["WeakSet Node Memory Quarantine (structuralBoundary.ts)"]
        VAULT["Origin-Locked Token Vault and SHA-256 Signer (vault.ts)"]
        CHECKSUM --> QUARANTINE
        QUARANTINE --> VAULT
    end

    subgraph STAGE3 ["STAGE 3: Laya Non-Autoregressive Decision Brain"]
        ROUTER["Laya Router: Script and Language Classifier (server/app.py)"]
        FORWARD["Single Forward Pass: choice, score, noul (convaiinnovations/laya)"]
        ROUTER --> FORWARD
    end

    subgraph STAGE4 ["STAGE 4: On-Device Safety Audit and Hardware Dispatch"]
        AUDIT["Laya System-1 ONNX: Risk Classifier in under 2ms (system1Engine.ts)"]
        GATE{"Risk Tier Assessment"}
        AUTO["TIER 1 and 2: Safe Action -> Chrome DevTools Protocol Dispatch"]
        HITL["TIER 4: Financial or Statutory -> Physical HITL Approval Dialog"]
        AUDIT --> GATE
        GATE -->|"Safe Action"| AUTO
        GATE -->|"Sensitive Mutation"| HITL
    end

    STAGE1 ==>|"Scrubbed Visual Pixels and Quarantined Nodes"| STAGE2
    STAGE2 ==>|"Opaque Semantic Scene Graph: Zero Raw Bytes"| STAGE3
    STAGE3 ==>|"Planned Action Intent and Target Element ID"| STAGE4
```

### 2. End-to-End Pipeline Execution Map

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SPIDEYAGENT END-TO-END PIPELINE FLOW                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 [1. BROWSER INJECTION & DOM MONITOR]
    User Navigation / Goal Dispatched
          │
          ▼
    extension/src/content/content.ts  (Spotlight HUD Interception)
          │
 ─────────┼───────────────────────────────────────────────────────────────────────────────────────────────
 [2. ON-DEVICE NEURAL PERCEPTION & PRIVACY AIRLOCK] (0 Raw Bytes Egress)
          │
          ├──► visionEngine.ts (WebGPU / WASM SIMD Hardware-Accelerated Vision)
          │      ├── BlazeFace ONNX (536 KB / 2.1 ms)   ──► Blackout employee badges & passport scans
          │      ├── DBNet Text ONNX (4.75 MB / 6.9 ms) ──► Burn out text on canvas signature pads
          │      ├── OmniParser v2 (76.7 MB / 28.0 ms)  ──► Ground UI icon / button coordinates
          │      └── YOLOS-ViT q4 (7.45 MB / 18.5 ms)   ──► Vision Transformer layout hierarchy
          │
          ├──► checksums.ts (Cryptographic & Deterministic Validators)
          │      ├── Verhoeff D5 Algorithm  ──► Mathematical validation of 12-digit Indian Aadhaar
          │      ├── Luhn Algorithm         ──► Validation of 16-digit payment cards
          │      └── ISO 7064 Mod-36        ──► Validation of 15-char Indian GSTIN tax identifiers
          │
          └──► structuralBoundary.ts & vault.ts (Quarantine & Tokenization)
                 ├── WeakSet<Node> Quarantine ──► Prevents V8 DOM serializer from touching sensitive nodes
                 ├── Origin-Locked Vault      ──► Replaces PII with <AADHAAR>, <GSTIN>, <PERSON> tokens
                 └── SHA-256 State Signer     ──► Signs sanitized scene graph to prevent tampering
          │
 ─────────┼───────────────────────────────────────────────────────────────────────────────────────────────
 [3. LAYA NON-AUTOREGRESSIVE REASONING SERVER] (Port 8000 / MCP JSON-RPC)
          │
          ▼
    server/app.py (Laya Fast-Path Decision Router)
          │
          ├──► Script & Language Detector (<0.5 ms) ──► Routes to laya or laya-multilingual
          │
          └──► Single Forward Pass (~33 ms, Non-Autoregressive, Zero LLM Hallucination)
                 ├── choice  ──► Select target interactive element from sanitized scene graph
                 ├── score   ──► Predict execution urgency score & action complexity
                 └── noul    ──► Calibrated probability: P(Action mutates state or impacts privacy)
          │
 ─────────┼───────────────────────────────────────────────────────────────────────────────────────────────
 [4. ON-DEVICE SAFETY AUDIT & HARDWARE-LEVEL DISPATCH] (<2 ms On-Device)
          │
          ▼
    extension/src/backend/execution/system1Engine.ts (laya_system1_int8.onnx)
          │
          ├── Evaluates action safety against local security policy in < 2.0 ms
          │
          ├───► TIER 1 / TIER 2 (Safe Navigation, Read, Form Fill)
          │       └── cdpDispatcher.ts ──► Trusted Chrome DevTools Protocol hardware click/type
          │
          └───► TIER 4 (Statutory Submission, Financial Checkout, Auth)
                  └── vault.ts (HITL Gate) ──► Physical Human Approval Dialog Required
```

---

### 📂 Codebase Logic Map

Every source file mapped to its architectural role in the pipeline:

| Layer | Module / File | Role in Pipeline |
|:------|:-------------|:-----------------|
| **Injection** | `extension/src/content/content.ts` | Injects Spotlight HUD, intercepts DOM mutations, orchestrates the full client pipeline |
| **Background SW** | `extension/src/backend/background/background.ts` | Service Worker event bus — manages tab lifecycle, routes messages between content ↔ server |
| **Perception** | `extension/src/backend/vision/visionEngine.ts` | Orchestrates all 4 ONNX model inferences over `<canvas>` and visible DOM |
| **Perception** | `extension/src/backend/vision/sentryPipeline.ts` | Sequential model-run pipeline with pixel burnout callbacks |
| **Perception** | `extension/src/backend/vision/spatialClassifier.ts` | Maps bounding boxes to DOM regions for mask application |
| **Perception** | `extension/src/backend/vision/uiElementLocator.ts` | OmniParser / YOLOS UI element coordinate locator |
| **Privacy** | `extension/src/backend/privacy/structuralBoundary.ts` | `WeakSet<Node>` quarantine — prevents V8 serialization of sensitive nodes |
| **Privacy** | `extension/src/backend/privacy/vault.ts` | Origin-locked token vault; HITL guard for passwords & OTPs |
| **Privacy** | `extension/src/backend/privacy/checksums.ts` | Verhoeff D5 (Aadhaar), Luhn (card), ISO 7064 Mod-36 (GSTIN) validation |
| **Privacy** | `extension/src/backend/privacy/staticContentGeneralizer.ts` | Replaces detected PII with opaque semantic tokens (`<AADHAAR>`, `<PERSON>`) |
| **Privacy** | `extension/src/backend/privacy/gazetteer.ts` | Named-entity recognizer for person names, addresses, org names |
| **Network** | `extension/src/backend/network/egressVerifier.ts` | Hard assertion: blocks any serialization containing raw PII bytes |
| **Network** | `extension/src/backend/network/observabilityLogger.ts` | Local-only structured audit trail (never exfiltrated) |
| **Network** | `extension/src/backend/network/selfHealingAuditor.ts` | Post-action invariant checker; re-triggers scrubbing on DOM mutation |
| **Safety Gate** | `extension/src/backend/execution/system1Engine.ts` | Loads & runs `laya_system1_int8.onnx` — classifies action risk in **<2 ms** |
| **Safety Gate** | `extension/src/backend/execution/system1DecisionEngine.ts` | Maps Laya output probabilities to TIER_1 / TIER_2 / TIER_4 decision labels |
| **Dispatch** | `extension/src/backend/execution/actionDispatcher.ts` | Serializes approved plan steps; routes TIER_4 to HITL, rest to CDP |
| **Dispatch** | `extension/src/backend/execution/cdpDispatcher.ts` | Injects trusted hardware-level events via Chrome DevTools Protocol |
| **Dispatch** | `extension/src/backend/execution/deterministicNavigator.ts` | Replay engine for multi-step goal decomposition plans |
| **Server** | `server/app.py` | FastAPI reasoning server; instantiates Laya `Router`, exposes `/plan` endpoint |
| **Server** | `server/mcp_server.py` | stdio JSON-RPC MCP server (`protect`, `browser_get_sanitized_state` tools) |
| **Server** | `server/redaction_engine.py` | Headless Playwright runner; outputs `redact/before/*.png` + `redact/after/*.jpeg` |
| **Models** | `extension/public/models/laya_system1_int8.onnx` | INT8 quantized on-device Laya decision classifier (18.7 KB) |
| **Models** | `extension/public/models/blazeface.onnx` | Sub-millisecond face detector (536 KB) |
| **Models** | `extension/public/models/dbnet.onnx` | Differentiable binarization text detector (4.75 MB) |
| **Models** | `extension/public/models/omniparser.onnx` | GUI element grounding model (76.7 MB) |
| **Models** | `extension/public/models/yolos_tiny_q4.onnx` | Quantized Vision Transformer (7.45 MB) |

---

### 🔄 Laya Decision Engine — Internal Data Path

Mirroring Laya's `Router → Agent → forward_pass` architecture ([reference.md](reference.md)):

```
User Goal String  ──►  server/app.py (Router)
                              │
                    ┌─────────▼──────────────────────────────┐
                    │  Script & Language Detection (<0.5 ms)  │
                    │  laya.router.detect_script()            │
                    └──────┬──────────────────┬──────────────┘
                           │ Latin/English     │ Non-Latin / Multilingual
                           ▼                  ▼
                     laya Agent          laya-multilingual Agent
                   (ModernBERT-L)        (mmBERT-base · 100+ lang)
                     421M params          322M params · up to 8192 tok
                           │                  │
                           └──────┬───────────┘
                                  │  Single Forward Pass (~30 ms)
                                  ▼
                        Typed Decision Output
                        ┌──────────────────────────────────┐
                        │  choice  → target DOM node ID    │
                        │  score   → action urgency tier   │
                        │  noul    → P(sensitive action)   │
                        └──────────────┬───────────────────┘
                                       │
                                       ▼
                          extension/  system1Engine.ts
                          laya_system1_int8.onnx  (<2 ms)
                          ┌──────────────────────────┐
                          │  TIER_1 → safe click      │
                          │  TIER_2 → form fill       │
                          │  TIER_4 → HITL required   │
                          └──────────┬────────────────┘
                                     │
                             cdpDispatcher.ts
                             Chrome Hardware Event
```

---

## 🧩 How It Fits Together

SpideyAgent operates across **four distinct, coordinated planes**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CLIENT PRIVACY AIRLOCK (Chrome MV3 Sandbox)                         │
│    • Injects Spotlight HUD (Alt+S) & Real-Time Security Badge          │
│    • WeakSet<Node> DOM Object Memory Quarantine                        │
│    • Origin-Locked Cryptographic Vault (sourceOrigin validation)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. IN-BROWSER NEURAL PERCEPTION LAYER (WebGPU / WASM SIMD)             │
│    • BlazeFace ONNX: In-place pixel burnout of employee ID badge photos│
│    • DBNet ONNX + BFS CCL: Non-DOM canvas digital signature masks      │
│    • OmniParser v2.0: Interactive control localization on <canvas>     │
│    • Checksum Engines: Verhoeff D5, Luhn, ISO 7064 Mod-36              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  (Sanitized Scene Graph · Zero Pixels)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. LAYA NON-AUTOREGRESSIVE DECISION BRAIN (server/app.py : Port 8000)   │
│    • Primary Engine: Convai Laya (convaiinnovations/laya)              │
│    • Typed decision routing in a single forward pass (~30ms)           │
│    • Deep multihop fallback for open-ended exploratory queries         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. LAYA ON-DEVICE SAFETY AUDIT & DISPATCH (Client-Side)                │
│    • laya_system1_int8.onnx audits remote action in <2ms               │
│    • Classifies risk tier (TIER_1 to TIER_4); enforces HITL gate       │
│    • Dispatches trusted hardware input via Chrome CDP                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Technical Innovations

<table>
<tr>
<td width="50%">
<h3>1. WeakSet DOM Memory Quarantine</h3>
<ul>
  <li><b>Vulnerability:</b> Regex scrapers fail against Unicode homoglyphs, zero-width spaces, or split DOM trees (e.g. <code>&lt;span&gt;4111&lt;/span&gt;&lt;span&gt;1111&lt;/span&gt;</code>).</li>
  <li><b>Our Solution:</b> Direct <code>WeakSet&lt;Node&gt;</code> quarantine in <a href="extension/src/privacy/structuralBoundary.ts"><code>structuralBoundary.ts</code></a>. Sensitive DOM elements are quarantined by <b>V8 object memory reference</b>. They can never be serialized to JSON.</li>
</ul>
</td>
<td width="50%">
<h3>2. Mathematical Checksum Verification</h3>
<ul>
  <li><b>Vulnerability:</b> Naive regex causes massive false positives (e.g. flagging a random 12-digit serial number as an Aadhaar ID).</li>
  <li><b>Our Solution:</b> Strict algorithmic verification:
    <ul>
      <li><b>Aadhaar:</b> Dihedral Group $D_5$ (Verhoeff algorithm).</li>
      <li><b>GSTIN:</b> ISO 7064 Mod 37, 36 (Mod-36) check polynomial.</li>
      <li><b>Credit Cards:</b> Luhn mod-10 algorithm.</li>
      <li><b>UPI:</b> 70+ verified NPCI banking suffixes.</li>
    </ul>
  </li>
</ul>
</td>
</tr>
<tr>
<td width="50%">
<h3>3. Dual-Track Vision & Canvas Masking</h3>
<ul>
  <li><b>Vulnerability:</b> DOM-only agents are completely blind to data rendered in HTML5 <code>&lt;canvas&gt;</code>, WebGL telemetry charts, and signature pads.</li>
  <li><b>Our Solution:</b> On-device <b>DBNet</b> and <b>BlazeFace</b> segment pixels and burn opaque black rectangles into canvas memory locally before screenshot generation.</li>
</ul>
</td>
<td width="50%">
<h3>4. Laya Non-Autoregressive Intelligence</h3>
<ul>
  <li><b>Vulnerability:</b> Autoregressive cloud LLMs take 3–4 seconds per action and cannot guarantee deterministic safety constraints.</li>
  <li><b>Our Solution:</b> The <b>Laya Decision Model</b> evaluates actions in a <b>single forward pass</b>, providing sub-millisecond on-device safety auditing and sub-35ms server routing.</li>
</ul>
</td>
</tr>
</table>

---

## 🤖 On-Device Neural Model Zoo

All models execute **100% locally** in the browser sandbox via `onnxruntime-web` with WebGPU hardware acceleration and WASM SIMD fallback:

| Model | Architecture | Weights Size | Input Tensor | WebGPU Latency | Pipeline Responsibility |
|:---|:---|:---:|:---:|:---:|:---|
| **Laya System-1** | INT8 Non-Autoregressive Decision Classifier | **18.7 KB** | `[1, 64]` | **< 2.0 ms** | Sub-millisecond on-device safety audit & risk classification. |
| **BlazeFace** | Anchor-decoded SSD Face Bounding | **536 KB** | `[1, 3, 128, 128]` | **2.1 ms** | Detects employee faces, badges, and passport scans; burns blackout blocks. |
| **DBNet Text** | Differentiable Binarization Text Detector | **4.75 MB** | `[1, 3, H, W]` (pad 32) | **6.9 ms** | Localizes non-DOM text on signature pads, stamped blueprints, and diagrams. |
| **OmniParser v2.0** | GUI Element & Icon Grounding | **76.7 MB** | `[1, 3, 640, 640]` | **28.0 ms** | Detects interactable UI icons and buttons on custom canvas dashboards. |
| **YOLOS-ViT (q4)** | Quantized Vision Transformer (ViT) | **7.45 MB** | `[1, 3, 512, 512]` | **18.5 ms** | Visual layout understanding fulfilling ISRO's Vision Transformer requirement. |

> *Model weights are fetched on-demand during project setup via [`scripts/download_models.mjs`](scripts/download_models.mjs).*

---

## 📊 Empirical Benchmark Scorecard

Evaluated against the standardized SIH-26171 Ground-Truth Benchmark Suite:

```text
================================================================================
  SPIDEYAGENT SIH-26171 EMPIRICAL BENCHMARK SCORECARD
================================================================================
  Target Domain                   Ground Truth   Recall    Precision  F1-Score   Latency
  ------------------------------------------------------------------------------
  Corporate NetBanking & Tax      10 Entities    100.0%    83.3%      0.909      1.34 ms
  Merchant Payment Gateway        10 Entities    100.0%   100.0%      1.000      0.57 ms
  Citizen Statutory Identity KYC  10 Entities    100.0%   100.0%      1.000      0.18 ms
  ------------------------------------------------------------------------------
  OVERALL BENCHMARK RESULTS       30 Entities    100.0%    93.8%      0.968      0.70 ms avg
================================================================================
```

| Evaluation Domain | Ground Truth | Detection Recall | Precision | F1-Score | Processing Latency |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Corporate NetBanking (PAN, GSTIN, Bank A/C)** | 10 Entities | **100.0%** | 83.3% | 0.909 | 1.34 ms |
| **Merchant Payment Gateway (Cards, CVV, UPI)** | 10 Entities | **100.0%** | **100.0%** | **1.000** | 0.57 ms |
| **Citizen Statutory Identity (Aadhaar, Passport)** | 10 Entities | **100.0%** | **100.0%** | **1.000** | 0.18 ms |
| **OVERALL GROUND TRUTH BENCHMARK** | **30 Entities** | **100.0%** | **93.8%** | **0.968** | **0.70 ms avg** |

---

## 🛡️ Zero-Trust Threat Model

| Threat Vector | Attack Scenario | Traditional Failure Mode | SpideyAgent Defense Mechanism |
|:---|:---|:---|:---|
| **Compromised Planner** | Malicious agent commands: `type(attacker_url, {{TOKEN_AADHAAR}})` | Rehydrates Aadhaar token on attacker domain. | 🛡️ **Origin-Lock:** Rejects token rehydration with `ORIGIN_MISMATCH` because target origin does not match source. |
| **Credential Phishing** | Rogue planner commands agent to autofill master password. | Agent types raw password into target field. | 🛡️ **HITL Secret Guard:** Passwords/OTPs cannot be rehydrated autonomously; execution halts for physical human typing. |
| **Unicode & DOM Splitting** | Attacker encodes PII across child spans (`<span>999</span><span>999</span>`). | Regex scanners miss fragmented text; data leaks. | 🛡️ **WeakSet Quarantine:** The parent container DOM object is quarantined directly in V8 memory. |
| **Canvas Pixel Exfiltration** | Page renders classified telemetry on HTML5 `<canvas>`. | Agent uploads raw screenshot containing canvas data. | 🛡️ **Hardware Masking:** DBNet & OmniParser detect canvas data and burn pixel blackouts before frame capture. |

---

## 📸 Visual Verification & Evidence Gallery

*All proof images provided by the evaluation team will be displayed in this gallery.*

<table width="100%">
<tr>
<td width="50%" align="center" valign="top">
<h4>🛰️ 1. ISTRAC Satellite Telemetry</h4>
<p><sub>Classified transponder keys, telemetry streams, and orbital vectors sanitized into cryptographic tokens.</sub></p>
</td>
<td width="50%" align="center" valign="top">
<h4>💼 2. GeM / eProcurement Portal</h4>
<p><sub>Contractor PAN, ISO 7064 Mod-36 GSTIN, and HTML5 canvas digital signature pads bounded via DBNet.</sub></p>
</td>
</tr>
<tr>
<td width="50%" align="center" valign="top">
<h4>👥 3. HR Employee Deputation</h4>
<p><sub>Employee service records, phone numbers, Aadhaar, and photo badge avatars blacked out via BlazeFace.</sub></p>
</td>
<td width="50%" align="center" valign="top">
<h4>🌐 4. Live Domain Verification</h4>
<p><sub>Universal redaction engine verified across live public portals with zero-egress state generation.</sub></p>
</td>
</tr>
</table>

---

## 🔌 Model Context Protocol (MCP) Integration

SpideyAgent includes a production-grade **Model Context Protocol (MCP)** server ([`server/mcp_server.py`](server/mcp_server.py)), allowing IDEs and autonomous AI tools (such as Antigravity IDE, Claude Desktop, and Cursor) to interact with the browser safely:

* **`browser_get_sanitized_state`**: Retrieves the live DOM with all sensitive identity attributes, telemetry coordinates, and PII replaced with sanitized semantic tokens.
* **`protect`**: One-command privacy auditor (`protect <url>`). Loads any web portal, performs in-browser neural perception and PII scrubbing, and saves the redacted proof image directly into [`redact/`](redact/).
* **Automatic Discovery**: Opening this repository in an IDE automatically connects the server via [`.agents/mcp_config.json`](.agents/mcp_config.json).

---

## 🧪 Automated Verification Suite

All 19 core security, privacy, checksum, and pipeline tests run natively on Node.js without any external test framework dependencies:

```bash
cd extension
npm run test
```

```text
✔ Verhoeff Checksum: Correctly identifies valid Indian Aadhaar numbers
✔ Verhoeff Checksum: Rejects transposed and forged Aadhaar numbers
✔ GSTIN Mod-36: Validates authentic 15-character GSTIN format
✔ Luhn Checksum: Validates genuine payment cards and flags invalid numbers
✔ UPI VPA Detector: Validates genuine NPCI handles and rejects standard emails
✔ WeakSet Structural Boundary: Quarantines DOM node reference directly in memory
✔ WeakSet Structural Boundary: Automatically inherits quarantine down parent tree
✔ Vault Origin-Lock: Allows token rehydration on matching same-origin
✔ Vault Origin-Lock: BLOCKS cross-origin token exfiltration attempt
✔ Vault SECRET Guard: Blocks autonomous agent from typing passwords and OTPs
✔ BlazeFace & DBNet Canvas Engine: Detects and burns pixel masks into canvas
✔ Laya System-1: Non-autoregressive forward pass predicts routine action in <2ms
✔ Laya System-1: Classifies financial checkout and submission as TIER_4 with mandatory HITL
...
ℹ tests 19 | pass 19 | fail 0 | duration_ms ~180ms
```

---

## 🚀 Quick Start

### Option 1: 1-Click Windows Presentation Launcher
Double-click:
```cmd
run_demo.bat
```
*In one click, this script verifies models, builds the extension, starts the central reasoning server on `localhost:8000`, and prepares Chrome for live testing.*

---

### Option 2: Manual Setup (Cross-Platform)

#### 1. Build the Chrome MV3 Extension
```bash
cd extension
npm install
npm run build      # Compiles TypeScript + Vite bundle into extension/dist/
```

#### 2. Start the Central Reasoning Server (Port 8000)
```bash
python server/app.py
```
*(Powered by the Laya decision model with deterministic rule-based planning by default; optional: set `OPENAI_API_KEY` or `GROQ_API_KEY` for multihop cloud LLMs).*

#### 3. Load the Extension into Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** ON (top-right corner).
3. Click **Load unpacked** and select the [`extension/dist`](extension/dist) folder.
4. Navigate to any live website (e.g. [SIH Portal](https://www.sih.gov.in), [DemoQA Practice Form](https://demoqa.com/automation-practice-form), [W3Schools Tables](https://www.w3schools.com/html/html_tables.asp)).
5. Press <kbd>Alt</kbd> + <kbd>S</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> to activate SpideyAgent.

---

## 🎮 Interactive Spotlight HUD

* **Spotlight Command HUD:** Press <kbd>Alt</kbd> + <kbd>S</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> to summon the agent spotlight overlay.
* **Instant Privacy Redact & Ask:** Press <kbd>Alt</kbd> + <kbd>R</kbd> to scrub the screen and open the privacy-safe command prompt.
* **Persistent Dock Mode:** Click **◫ Dock** in the popup header to dock SpideyAgent into Chrome's native right-side dock.

---

## 📂 Repository Structure

```text
SIH_3/
├── .agents/                      # Model Context Protocol (MCP) server configuration
│   └── mcp_config.json
├── docs/                         # Presentation & Academic Research
│   ├── SpideyAgent.pptx          # Official Hackathon Pitch Deck & Slides
│   └── papers/                   # Foundational Academic Literature (Local PDFs)
├── extension/                    # Chrome MV3 Privacy-Preserving Agent Client
│   ├── icons/                    # Project logos, icons, and avatars
│   ├── public/models/            # Compiled standalone ONNX Neural Models
│   │   ├── laya_system1_int8.onnx# Laya non-autoregressive decision model
│   │   ├── blazeface.onnx        # Face detection model
│   │   ├── dbnet.onnx            # Canvas text detection model
│   │   ├── omniparser.onnx       # Icon/element locator
│   │   └── yolos_tiny_q4.onnx    # Quantized Vision Transformer
│   ├── src/                      # TypeScript Source (Perception, Privacy, HUD)
│   └── package.json
├── redact/                       # On-Device Redacted Visual Evidence Directory
├── run_demo.bat                  # 1-Click Demo Launcher (Windows)
├── scripts/
│   └── download_models.mjs       # On-demand ONNX model downloader
├── server/                       # Reasoning Engine & MCP Server
│   ├── app.py                    # Central Reasoning Server with Laya Engine
│   ├── mcp_server.py             # Stdio Model Context Protocol Server
│   └── redaction_engine.py       # Headless Playwright Redaction Engine
├── test_all.bat                  # Verification Test Suite Proof of Compliance
└── tests/                        # 10 Automated Security & Privacy Test Suites (Archived Proof)
    ├── privacy.test.mjs          # Mathematical checksums (Verhoeff, Luhn, GSTIN)
    ├── vault-security.test.mjs   # Origin-locking & HITL Secret Guard
    ├── structural-boundary.test.mjs
    ├── autonomous-canvas-vision.test.mjs
    └── system1-onnx.test.mjs     # Laya non-autoregressive decision benchmarks
```

---

## 📚 Academic References & Research Foundations

All literature referenced in SpideyAgent's system design is archived in the repository [`docs/papers/`](docs/papers/) directory and linked to their primary publications below:

1. **OmniParser v2.0:** *A Screen Parsing Module for Pure Vision Based GUI Agents* (Microsoft Research, 2024).
   * 🔗 ArXiv Publication: [arXiv:2411.05644](https://arxiv.org/abs/2411.05644)
   * 📄 Local Paper Archive: [`docs/papers/OmniParser_v2_arxiv_2411.05644.pdf`](docs/papers/OmniParser_v2_arxiv_2411.05644.pdf)

2. **ScreenAI:** *A Vision-Language Model for UI and Infographics Understanding* (Google Research, 2024).
   * 🔗 ArXiv Publication: [arXiv:2402.04615](https://arxiv.org/abs/2402.04615)
   * 📄 Local Paper Archive: [`docs/papers/ScreenAI_arxiv_2402.04615.pdf`](docs/papers/ScreenAI_arxiv_2402.04615.pdf)

3. **SeeClick:** *Harnessing GUI Grounding for Advanced Visual GUI Agents* (Cheng et al., 2024).
   * 🔗 ArXiv Publication: [arXiv:2401.10935](https://arxiv.org/abs/2401.10935)
   * 📄 Local Paper Archive: [`docs/papers/SeeClick_arxiv_2401.10935.pdf`](docs/papers/SeeClick_arxiv_2401.10935.pdf)

4. **UI-JEPA:** *Joint-Embedding Predictive Architecture for Visual Web Interaction* (2024).
   * 🔗 ArXiv Publication: [arXiv:2409.04081](https://arxiv.org/abs/2409.04081)
   * 📄 Local Paper Archive: [`docs/papers/UI-JEPA_arxiv_2409.04081.pdf`](docs/papers/UI-JEPA_arxiv_2409.04081.pdf)

5. **Available, but Invisible:** *Evaluating and Mitigating Visual Privacy Risks in Web GUI Agents* (2024).
   * 🔗 ArXiv Publication: [arXiv:2402.10139](https://arxiv.org/abs/2402.10139)
   * 📄 Local Paper Archive: [`docs/papers/Available_but_Invisible_arxiv_2602.10139.pdf`](docs/papers/Available_but_Invisible_arxiv_2602.10139.pdf)

6. **Laya Decision Model:** *Non-Autoregressive Typed Decisions via Reinforcement Learning with Calibrated Scoring Rules (RLCD)* (Convai Innovations, 2025).
   * 🔗 Model Weights & Documentation: [convaiinnovations/laya on HuggingFace](https://huggingface.co/convaiinnovations/laya)

7. **DBNet:** *Real-time Scene Text Detection with Differentiable Binarization* (Liao et al., AAAI 2020).
   * 🔗 ArXiv Publication: [arXiv:1911.08947](https://arxiv.org/abs/1911.08947)

8. **BlazeFace:** *Sub-millisecond Neural Face Detection on Mobile GPUs* (Bazarevsky et al., CVPR 2019).
   * 🔗 ArXiv Publication: [arXiv:1907.05047](https://arxiv.org/abs/1907.05047)

9. **Verhoeff Algorithm:** *Error Detecting Decimal Codes* (J. Verhoeff, Mathematical Centre Tracts 29, 1969).
   * 🔗 Monograph Archive: [Centrum Wiskunde & Informatica (CWI) Institutional Repository](https://pure.cwi.nl/ws/portalfiles/portal/14352/14352A.pdf)

10. **ISO/IEC 7064:** *Information technology — Security techniques — Check character systems* (ISO 7064:2003 MOD 37, 36).
    * 🔗 International Standard Specification: [ISO Standards Catalog ISO/IEC 7064:2003](https://www.iso.org/standard/31531.html)

---

<p align="center">
  <b>SpideyAgent</b> · Developed for the Smart India Hackathon 2026 (SIH-26171) by <b>Team Silence like Lasagna</b><br/>
  <i>Indian Space Research Organisation (ISRO)</i><br/><br/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
</p>
