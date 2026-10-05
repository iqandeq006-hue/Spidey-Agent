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
  <a href="#-zero-trust-threat-model"><b>Security</b></a> ·
  <a href="#-visual-verification--evidence-gallery"><b>Evidence Gallery</b></a>
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
| **Inspect Proof of Redacted Portals** | [Visual Verification & Evidence Gallery](#-visual-verification--evidence-gallery) |

---

## 🏛️ System Architecture

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1f2937', 'edgeLabelBackground':'#111827', 'tertiaryColor': '#111827'}}}%%
flowchart TD
    subgraph ClientSandbox ["  🛡️ TRUSTED CLIENT SANDBOX (Chrome MV3 / On-Device)  "]
        RawInput["Raw Webpage DOM & HTML5 Canvas Elements"]

        subgraph NeuralPerception ["  🧠 Dual-Track Neural Perception Engine  "]
            BlazeFace["BlazeFace ONNX (Face Biometric Blackout)"]
            DBNet["DBNet ONNX + BFS CCL (Signature Pad & Text Segmentation)"]
            OmniParser["OmniParser v2.0 (Canvas Icons & UI Element Grounding)"]
            YOLOS["Quantized Vision Transformer (ViT q4 Visual Layout)"]
            MathEngines["Mathematical Checksums (Verhoeff D5, Luhn, ISO Mod-36)"]
        end

        subgraph ZeroTrustFirewall ["  🔒 Zero-Trust Privacy Boundary  "]
            WeakSetQuarantine["WeakSet<Node> DOM Object Memory Quarantine"]
            OriginVault["Origin-Locked Cryptographic Vault"]
            HITLGate["Human-in-the-Loop (HITL) Physical Secret Guard"]
        end

        SanitizedGraph["Opaque Semantic Scene Graph (Zero Raw Pixels)"]

        subgraph ClientAudit ["  ⚡ Laya On-Device Safety Gate  "]
            LayaONNX["Laya System-1 ONNX Model (<2ms Forward Pass)"]
        end

        HardwareDispatcher["Chrome CDP Hardware Event Dispatcher"]
    end

    subgraph ReasonerCore ["  🧠 HYBRID DECISION ENGINE (Server / Edge)  "]
        subgraph LayaCore ["  🚀 Fast-Path: Laya Decision Engine (~30ms)  "]
            LayaModel["Laya Non-Autoregressive Model (convaiinnovations/laya)"]
        end
        subgraph DeepPlanner ["  🐢 Slow-Path: Multihop Planner (Optional Fallback)  "]
            LLMBackend["LLM Provider (Groq / Ollama / OpenAI / Rule-Based)"]
        end
    end

    subgraph ExternalAgents ["  🔌 AI DEVELOPER TOOLS & IDES  "]
        MCPServer["Model Context Protocol Server (server/mcp_server.py)"]
    end

    RawInput --> NeuralPerception
    NeuralPerception --> ZeroTrustFirewall
    ZeroTrustFirewall --> SanitizedGraph
    SanitizedGraph -- "Sanitized Tokens Only (SHA-256 Digest)" --> LayaModel
    SanitizedGraph -. "stdio JSON-RPC" .-> MCPServer
    
    LayaModel -->|Routine Decisions (<30ms)| LayaONNX
    LayaModel -.->|Complex Multihop Decomposition| LLMBackend
    LLMBackend --> LayaONNX

    LayaONNX -->|TIER_1 / TIER_2 (Safe Action)| HardwareDispatcher
    LayaONNX -->|TIER_4 (Statutory/Financial Action)| HITLGate
    HITLGate -->|Manual Human Physical Approval| HardwareDispatcher
    HardwareDispatcher -->|Execute Hardware Event| RawInput
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

Evaluated against the standardized SIH-26171 Ground-Truth Benchmark Suite ([`testbed/benchmarks/run-benchmarks.mjs`](testbed/benchmarks/run-benchmarks.mjs)):

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
*In one click, this script verifies models, builds the extension, launches the local synthetic ISRO testbed on `localhost:3000`, starts the central reasoning server on `localhost:8000`, and opens Chrome.*

---

### Option 2: Manual Setup (Cross-Platform)

#### 1. Build the Chrome MV3 Extension
```bash
cd extension
npm install
npm run build      # Compiles TypeScript + Vite bundle into extension/dist/
```

#### 2. Start the Synthetic ISRO Testbed (Port 3000)
```bash
python -m http.server 3000 --directory testbed
```

#### 3. Start the Central Reasoning Server (Port 8000)
```bash
python server/app.py
```
*(Powered by the Laya decision model with deterministic rule-based planning by default; optional: set `OPENAI_API_KEY` or `GROQ_API_KEY` for multihop cloud LLMs).*

#### 4. Load the Extension into Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** ON (top-right corner).
3. Click **Load unpacked** and select the [`extension/dist`](extension/dist) folder.
4. Visit `http://localhost:3000` to interact with the synthetic ISRO portals.

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
│   └── papers/                   # Foundational Academic Literature
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
├── test_all.bat                  # 1-Click Verification Test Runner (Windows)
└── testbed/                      # Synthetic ISRO Intranet Evaluation Environment
    ├── automated-tests/          # 10 Automated Security & Privacy Test Suites
    ├── benchmarks/               # Performance & Token Savings Benchmarks
    └── index.html                # Synthetic ISTRAC, eProcurement & HR Portals
```

---

## 📚 Academic References & Research Foundations

1. **Laya Decision Engine:** *Non-Autoregressive Typed Decisions via Reinforcement Learning with Calibrated Scoring Rules (RLCD)* (Convai Innovations, 2025).
2. **DBNet:** *Real-time Scene Text Detection with Differentiable Binarization* (Liao et al., AAAI 2020).
3. **BlazeFace:** *Sub-millisecond Neural Face Detection on Mobile GPUs* (Bazarevsky et al., CVPR 2019).
4. **OmniParser v2.0:** *A Screen Parsing Module for Pure Vision Based GUI Agents* (Microsoft Research, 2024).
5. **Verhoeff Algorithm:** *Error Detecting Decimal Codes* (J. Verhoeff, Mathematical Centre Tracts 29, 1969).
6. **ISO/IEC 7064:** *Information technology — Security techniques — Check character systems* (ISO 7064:2003).

---

<p align="center">
  <b>SpideyAgent</b> · Developed for the Smart India Hackathon 2026 (SIH-26171)<br/>
  <i>Indian Space Research Organisation (ISRO)</i><br/><br/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
</p>
