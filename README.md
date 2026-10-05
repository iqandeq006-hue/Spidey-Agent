# 🕷️ SpideyAgent — On-Device Visual Perception & Zero-Trust Privacy Firewall

<p align="center">
  <img src="extension/icons/logo.png" alt="SpideyAgent Shield" width="130" height="130" style="border-radius: 26px; box-shadow: 0 10px 30px rgba(66, 133, 244, 0.35);" />
</p>

<p align="center">
  <b>Hardware-Gated · Air-Gapped · Dual-Track In-Browser Neural Perception Engine</b><br/>
  <i>Smart India Hackathon 2026 · Indian Space Research Organisation (ISRO) · Problem Statement SIH-26171</i>
</p>

<p align="center">
  <a href="https://developer.chrome.com/docs/extensions/mv3/"><img src="https://img.shields.io/badge/Manifest-Chrome%20MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest MV3"></a>
  <a href="#-automated-verification-suite"><img src="https://img.shields.io/badge/Tests-19%2F19%20Passing-10B981?style=flat-square&logo=checkmarx&logoColor=white" alt="Tests 19/19 Passing"></a>
  <a href="#-empirical-benchmark-scorecard"><img src="https://img.shields.io/badge/Recall-100.0%25-059669?style=flat-square&logo=target&logoColor=white" alt="Recall 100%"></a>
  <a href="#-empirical-benchmark-scorecard"><img src="https://img.shields.io/badge/Perception%20Latency-%3C%201ms%20avg-38BDF8?style=flat-square&logo=speedtest&logoColor=white" alt="Latency <1ms"></a>
  <a href="#-on-device-neural-model-zoo"><img src="https://img.shields.io/badge/Inference-ONNX%20WebGPU%20%2F%20WASM-8B5CF6?style=flat-square&logo=webgpu&logoColor=white" alt="ONNX Runtime Web"></a>
  <a href="#-zero-trust-threat-model"><img src="https://img.shields.io/badge/Zero--Egress-0%20Raw%20Bytes-EF4444?style=flat-square&logo=security&logoColor=white" alt="Zero Egress"></a>
  <a href="#-model-context-protocol-mcp-integration"><img src="https://img.shields.io/badge/Protocol-MCP%20JSON--RPC-F97316?style=flat-square&logo=anthropic&logoColor=white" alt="MCP Server"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start</b></a> ·
  <a href="#-how-it-fits-together"><b>How It Fits Together</b></a> ·
  <a href="#-visual-verification--evidence-gallery"><b>Evidence Gallery</b></a> ·
  <a href="#-system-architecture"><b>Architecture</b></a> ·
  <a href="#-on-device-neural-model-zoo"><b>Model Zoo</b></a> ·
  <a href="#-empirical-benchmark-scorecard"><b>Benchmarks</b></a> ·
  <a href="#-zero-trust-threat-model"><b>Security</b></a> ·
  <a href="#-interactive-spotlight-hud"><b>Controls</b></a>
</p>

---

**Zero raw pixels. Zero leaked credentials. Deterministic on-device privacy.**

As autonomous browser agents take over web navigation, they routinely upload raw screen viewports and DOM trees to remote Vision-Language Models (VLMs). In defense, aerospace, and public sector environments, this causes catastrophic data leakage: **radar telemetry, digital signatures, contractor bids, employee identities, and Aadhaar/PAN cards are transmitted to untrusted cloud servers.**

**SpideyAgent** acts as a **hardware-gated cognitive airlock** inside the browser sandbox:
- **Zero Raw Data Egress:** Faces, signature pads, credentials, and telemetry streams are intercepted and burned out in-memory on the client machine before any frame or DOM payload is serialized.
- **On-Device Neural Perception:** Runs 5 quantized ONNX models directly on the client's WebGPU / WASM SIMD runtime — zero external vision APIs or cloud inference.
- **Mathematical Checksum Guarantees:** Eliminates hallucinations and false positives using Dihedral Group $D_5$ (Verhoeff for Aadhaar), ISO 7064 Mod-36 (GSTIN), and Luhn (Cards).
- **Origin-Locked State Vault:** Cryptographic tokens are permanently tied to `window.location.origin`. High-stakes statutory actions (TIER_4) mandate physical Human-in-the-Loop (HITL) approval.

---

## 🧭 Evaluation Roadmap

| What do you want to inspect? | Start here |
|:---|:---|
| **Launch 1-Click Live Judge Demo** | [Quick Start](#-quick-start) (`run_demo.bat`) |
| **Inspect Live Portal Redaction Proofs** | [Visual Verification & Evidence Gallery](#-visual-verification--evidence-gallery) |
| **Understand the 4 Architectural Planes** | [How It Fits Together](#-how-it-fits-together) |
| **Review Technical Architecture & Dataflow** | [System Architecture](#-system-architecture) |
| **Audit On-Device Neural Vision Weights** | [On-Device Neural Model Zoo](#-on-device-neural-model-zoo) |
| **Review Empirical Precision & Latency Numbers** | [Empirical Benchmark Scorecard](#-empirical-benchmark-scorecard) |
| **Examine Prompt-Injection & Exploit Defenses** | [Zero-Trust Threat Model](#-zero-trust-threat-model) |
| **Run the 19 Automated Privacy & Unit Tests** | [Automated Verification Suite](#-automated-verification-suite) |
| **Connect Antigravity / Cursor / Claude via MCP** | [Model Context Protocol (MCP) Integration](#-model-context-protocol-mcp-integration) |

---

## 📸 Visual Verification & Evidence Gallery

Every screenshot below was captured on-device by SpideyAgent. Notice that **all biometric face avatars, digital signature pads, tender values, and telemetry coordinates are completely masked or tokenized locally before capture:**

<table width="100%">
<tr>
<td width="50%" align="center" valign="top">
<h3>🛰️ 1. ISTRAC Satellite Mission Telemetry</h3>
<a href="redact/istrac_mission_ops_all_1790101573967.png"><img src="redact/istrac_mission_ops_all_1790101573967.png" alt="ISTRAC Telemetry Dashboard Redacted" style="border-radius: 8px; border: 1px solid #30363d;" /></a>
<br/>
<p align="left"><sub><b>Protected Elements:</b> Transponder authorization keys, optical sensor azimuth/elevation streams, and radar trajectory matrices masked into <code>&lt;CLASSIFIED_COORD&gt;</code> tokens.</sub></p>
</td>
<td width="50%" align="center" valign="top">
<h3>💼 2. GeM / eProcurement Commercial Bidding</h3>
<a href="redact/eprocurement_portal_1790101368665.png"><img src="redact/eprocurement_portal_1790101368665.png" alt="eProcurement Commercial Portal Redacted" style="border-radius: 8px; border: 1px solid #30363d;" /></a>
<br/>
<p align="left"><sub><b>Protected Elements:</b> Contractor PAN, ISO 7064 Mod-36 verified GSTIN, confidential tender quote figures, and <b>HTML5 canvas digital signature pads</b> bounded via DBNet.</sub></p>
</td>
</tr>
<tr>
<td width="50%" align="center" valign="top">
<h3>👥 3. ISRO HR Employee Deputation Records</h3>
<a href="redact/hr_deputation_portal_1790101472779.png"><img src="redact/hr_deputation_portal_1790101472779.png" alt="HR Employee Deputation Portal Redacted" style="border-radius: 8px; border: 1px solid #30363d;" /></a>
<br/>
<p align="left"><sub><b>Protected Elements:</b> Scientist service IDs, phone numbers, Aadhaar (Verhoeff validated), and <b>employee ID photo avatars completely blacked out via BlazeFace</b>.</sub></p>
</td>
<td width="50%" align="center" valign="top">
<h3>🌐 4. Real-World Live Web: Wikipedia & Identity Tests</h3>
<a href="redact/redacted_en_wikipedia_org_wiki_List_of_space_agencies.png"><img src="redact/redacted_en_wikipedia_org_wiki_List_of_space_agencies.png" alt="Wikipedia Space Agencies Redacted" style="border-radius: 8px; border: 1px solid #30363d;" /></a>
<br/>
<p align="left"><sub><b>Protected Elements:</b> Universal redaction engine proven live on public domains (Wikipedia Space Agencies, DemoQA forms, and identity generators) with instant token masking.</sub></p>
</td>
</tr>
</table>

---

## 🧩 How It Fits Together

SpideyAgent is organized into **four modular, decoupled planes**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. THE EXTENSION CLIENT (Chrome MV3 Sandbox)                           │
│    • Injects Spotlight HUD (Alt+S) & Cursor Reticle                    │
│    • DOM Tree Parsing & WeakSet<Node> Object Memory Quarantine          │
│    • Origin-Locked Cryptographic State Vault (vault.ts)                │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. ON-DEVICE NEURAL PERCEPTION LAYER (WebGPU / WASM SIMD)               │
│    • BlazeFace ONNX: Detects ID badges & burns facial pixel blackouts  │
│    • DBNet ONNX + BFS CCL: Segments signature pads on <canvas>         │
│    • OmniParser v2.0: Detects interactive controls on canvas dashboards │
│    • Checksum Engines: Verhoeff D5, Luhn, ISO 7064 Mod-36              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  (Sanitized Scene Graph · Zero Pixels)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. CENTRAL REASONING SERVER (server/app.py : Port 8000)                │
│    • Receives abstract scene graphs signed with SHA-256 wire digests    │
│    • Routes to LLM Providers (Groq / Ollama / OpenAI) if keys present  │
│    • Built-in Deterministic Rule-Based Fallback for air-gapped demo    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. MODEL CONTEXT PROTOCOL (MCP) BRIDGE (server/mcp_server.py)          │
│    • Exposes browser_get_sanitized_state & protect tools over stdio     │
│    • Enables Antigravity, Cursor, and Claude to drive browser safely   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ System Architecture

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1f2937', 'edgeLabelBackground':'#111827', 'tertiaryColor': '#111827'}}}%%
flowchart TD
    subgraph ClientSandbox ["  🛡️ TRUSTED CLIENT SANDBOX (Chrome MV3 / On-Device)  "]
        RawInput["Raw Webpage DOM & HTML5 Canvas Elements"]

        subgraph NeuralPerception ["  🧠 Dual-Track In-Browser Neural Perception Engine  "]
            BlazeFace["BlazeFace ONNX (Face Biometric Blackout)"]
            DBNet["DBNet ONNX + BFS CCL (Signature Pad & Text Segmentation)"]
            OmniParser["OmniParser v2.0 (Canvas Icons & UI Element Grounding)"]
            YOLOS["Quantized Vision Transformer (ViT q4 Visual Layout)"]
            MathEngines["Mathematical Checksums (Verhoeff D5, Luhn, ISO Mod-36)"]
        end

        subgraph ZeroTrustFirewall ["  🔒 Zero-Trust Hardware-Gated Firewall  "]
            WeakSetQuarantine["WeakSet<Node> DOM Object Memory Quarantine"]
            OriginVault["Origin-Locked Cryptographic Vault"]
            HITLGate["Human-in-the-Loop (HITL) Physical Secret Guard"]
        end

        SanitizedGraph["Opaque Semantic Scene Graph (Zero Raw Pixels)"]
        System1["Laya System-1 ONNX Engine (<2ms Fast Heuristic Decision)"]
        HardwareDispatcher["Chrome CDP Hardware Event Dispatcher"]
    end

    subgraph ReasonerServer ["  ☁️ REASONING BRAIN (Local Server / Optional Cloud LLM)  "]
        ServerApp["Reasoning Server (server/app.py)"]
        LLMBackend["LLM Provider (Groq / Ollama / OpenAI / Rule-Based Fallback)"]
    end

    subgraph ExternalAgents ["  🔌 AI DEVELOPER TOOLS & IDES  "]
        MCPServer["Model Context Protocol Server (server/mcp_server.py)"]
    end

    RawInput --> NeuralPerception
    NeuralPerception --> ZeroTrustFirewall
    ZeroTrustFirewall --> SanitizedGraph
    SanitizedGraph -- "Only Sanitized Ephemeral Tokens" --> ServerApp
    SanitizedGraph -. "stdio JSON-RPC" .-> MCPServer
    ServerApp --> LLMBackend
    LLMBackend -- "Abstract Action Plan (Opaque Node IDs)" --> System1
    System1 -->|TIER_1 / TIER_2 (Routine/Safe)| HardwareDispatcher
    System1 -->|TIER_4 (Statutory/Financial)| HITLGate
    HITLGate -->|Manual Human Physical Approval| HardwareDispatcher
    HardwareDispatcher -->|Simulate Trusted Physical Click/Type| RawInput
```

---

## ⚡ Key Technical Innovations

<table>
<tr>
<td width="50%">
<h3>1. WeakSet DOM Object Memory Quarantine</h3>
<ul>
  <li><b>The Vulnerability:</b> Regex scrapers fail against Unicode homoglyphs, zero-width spaces, or split DOM trees (e.g. <code>&lt;span&gt;4111&lt;/span&gt;&lt;span&gt;1111&lt;/span&gt;</code>).</li>
  <li><b>Our Solution:</b> Direct <code>WeakSet&lt;Node&gt;</code> quarantine in <a href="extension/src/privacy/structuralBoundary.ts"><code>structuralBoundary.ts</code></a>. Sensitive DOM elements are quarantined by <b>V8 object memory reference</b>. They can never be serialized to JSON or leaked to the planner.</li>
</ul>
</td>
<td width="50%">
<h3>2. Mathematical Checksum Verification</h3>
<ul>
  <li><b>The Vulnerability:</b> Naive regex causes massive false positives (e.g. flagging a random 12-digit component serial as an Aadhaar ID).</li>
  <li><b>Our Solution:</b> Strict mathematical verification:
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
  <li><b>The Vulnerability:</b> DOM-only agents are 100% blind to data rendered in HTML5 <code>&lt;canvas&gt;</code>, WebGL telemetry charts, and signature pads.</li>
  <li><b>Our Solution:</b> On-device <b>DBNet</b> and <b>BlazeFace</b> segment pixels and burn opaque black rectangles into canvas memory locally before screenshot generation.</li>
</ul>
</td>
<td width="50%">
<h3>4. Origin-Locked Cryptographic Vault</h3>
<ul>
  <li><b>The Vulnerability:</b> Prompt injection attacks command agents to autofill passwords or PII tokens onto malicious third-party URLs.</li>
  <li><b>Our Solution:</b> Tokens record <code>sourceOrigin = window.location.origin</code>. Token rehydration on mismatched origins throws <code>ORIGIN_MISMATCH</code> and permanently aborts. High-stakes secrets require physical human input.</li>
</ul>
</td>
</tr>
</table>

---

## 🤖 On-Device Neural Model Zoo

All models execute **100% locally** in the browser sandbox via `onnxruntime-web` with WebGPU hardware acceleration and WASM SIMD fallback. Zero bytes of model weights or inference tensors ever egress:

| Model | Architecture | Weights Size | Input Tensor | WebGPU Latency | Pipeline Responsibility |
|:---|:---|:---:|:---:|:---:|:---|
| **BlazeFace** | Anchor-decoded SSD Face Bounding | **536 KB** | `[1, 3, 128, 128]` | **2.1 ms** | Detects employee faces, badges, and passport scans; burns blackout blocks. |
| **DBNet Text** | Differentiable Binarization Text Detector | **4.75 MB** | `[1, 3, H, W]` (pad 32) | **6.9 ms** | Localizes non-DOM text on signature pads, stamped blueprints, and diagrams. |
| **OmniParser v2.0** | GUI Element & Icon Grounding | **76.7 MB** | `[1, 3, 640, 640]` | **28.0 ms** | Detects interactable UI icons and buttons on custom canvas dashboards. |
| **YOLOS-ViT (q4)** | Quantized Vision Transformer (ViT) | **7.45 MB** | `[1, 3, 512, 512]` | **18.5 ms** | Visual layout understanding fulfilling ISRO's Vision Transformer requirement. |
| **Laya System-1** | INT8 Non-Autoregressive Decision Classifier | **18.7 KB** | `[1, 64]` | **< 2.0 ms** | Sub-50ms reactive decision making without querying cloud LLMs. |

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
*(Runs deterministic rule-based planning by default; optional: set `OPENAI_API_KEY` or `GROQ_API_KEY` for external cloud LLM providers).*

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
│   │   ├── blazeface.onnx        # Face detection model
│   │   ├── dbnet.onnx            # Canvas text detection model
│   │   ├── omniparser.onnx       # Icon/element locator
│   │   └── yolos_tiny_q4.onnx    # Quantized Vision Transformer
│   ├── src/                      # TypeScript Source (Perception, Privacy, HUD)
│   └── package.json
├── redact/                       # On-Device Redacted Visual Evidence Gallery
│   ├── istrac_mission_ops_*.png  # Redacted satellite telemetry dashboard
│   ├── eprocurement_*.png        # Redacted tender bids & signature pads
│   └── hr_deputation_*.png       # Redacted employee records & face masks
├── run_demo.bat                  # 1-Click Demo Launcher (Windows)
├── scripts/
│   └── download_models.mjs       # On-demand ONNX model downloader
├── server/                       # Reasoning Engine & MCP Server
│   ├── app.py                    # Central Reasoning Server (Port 8000)
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

The algorithms and architectures in SpideyAgent are grounded in foundational academic research:

1. **DBNet:** *Real-time Scene Text Detection with Differentiable Binarization* (Liao et al., AAAI 2020).
2. **BlazeFace:** *Sub-millisecond Neural Face Detection on Mobile GPUs* (Bazarevsky et al., CVPR 2019).
3. **OmniParser v2.0:** *A Screen Parsing Module for Pure Vision Based GUI Agents* (Microsoft Research, 2024).
4. **Verhoeff Algorithm:** *Error Detecting Decimal Codes* (J. Verhoeff, Mathematical Centre Tracts 29, 1969).
5. **ISO/IEC 7064:** *Information technology — Security techniques — Check character systems* (ISO 7064:2003).

---

<p align="center">
  <b>SpideyAgent</b> · Developed for the Smart India Hackathon 2026 (SIH-26171)<br/>
  <i>Indian Space Research Organisation (ISRO)</i><br/><br/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
</p>
