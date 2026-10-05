<div align="center">

# 🕷️ SpideyAgent (SIH-26171)
### *On-Device Visual Perception & Zero-Trust Firewall for Light-weight Browser Agents*

**Smart India Hackathon 2026 · Indian Space Research Organisation (ISRO)**  
*Air-Gapped, Hardware-Gated, Dual-Track Perception Architecture*

[![Chrome Extension](https://img.shields.io/badge/Chrome-MV3%20Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Tests Passing](https://img.shields.io/badge/Tests-53%2F53%20Passing-10B981?logo=checkmarx&logoColor=white)](#-automated-test-suite--verification)
[![Ground Truth Recall](https://img.shields.io/badge/Recall-100.0%25-059669?logo=target&logoColor=white)](#-empirical-benchmark-scorecard)
[![Precision](https://img.shields.io/badge/Precision-93.8%25-10B981)](#-empirical-benchmark-scorecard)
[![Perception Latency](https://img.shields.io/badge/Perception%20Latency-%3C%201ms%20avg-38BDF8?logo=speedtest&logoColor=white)](#-empirical-benchmark-scorecard)
[![System 1 Engine](https://img.shields.io/badge/Decision%20Engine-Laya%20ONNX%20%28%3C4ms%29-8B5CF6)](#-laya-system-1-decision-engine)
[![Security Boundary](https://img.shields.io/badge/Zero--Trust-WeakSet%20Quarantine-EF4444?logo=security&logoColor=white)](#-zero-trust-security--threat-model)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## 📖 Executive Summary & Mission

> 💬 *"Book a flight and file my travel reimbursement claim."*  
> 
> The autonomous browser agent navigates the web — but **not a single raw screen pixel, password, Aadhaar number, or PAN card ever leaves your machine.**  
> Faces are detected on-device via **BlazeFace**, non-DOM canvas text is bounded via **DBNet**, unlabeled UI controls are grounded via **OmniParser v2.0**, and PII is scrubbed into cryptographic semantic tokens. The remote AI reasoning brain only receives abstract, zero-PII scene graphs. **Even if the cloud planner is compromised, client-side origin locks, WeakSet memory boundaries, and Human-in-the-Loop gates make data exfiltration mathematically impossible.**

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph BrowserClient ["Trusted Client: Chrome MV3 Sandbox (On-Device)"]
        RawDOM["Raw Webpage DOM & Canvas"]
        
        subgraph Perception ["Track 1 & Track 2 Perception Layer"]
            Entropy["Spatial Entropy Classifier (<1.5ms)"]
            BlazeFace["BlazeFace ONNX (Face Bounding)"]
            DBNet["DBNet ONNX (Text Locating)"]
            OmniParser["OmniParser v2.0 (Icon Locating)"]
            Checksums["Checksum Engines (Verhoeff, Luhn, Mod-36)"]
        end

        subgraph Security ["Zero-Trust Boundary"]
            WeakSetGuard["WeakSet Object Memory Quarantine"]
            Vault["Origin-Locked Cryptographic Vault"]
            HITLGate["Human-in-the-Loop (HITL) Secret Guard"]
        end

        SceneGraph["Opaque Scene Graph Generator"]
        System1["Laya System-1 ONNX Engine (<4ms)"]
        CDP["Hardware CDP Execution Dispatcher"]
    end

    subgraph RemoteServer ["Untrusted Planner / Cloud Server"]
        LLM["Planner Brain (Groq Llama-3.3 / Ollama)"]
    end

    RawDOM --> Perception
    Perception --> Security
    Security --> SceneGraph
    SceneGraph -- "Sanitized Tokens Only (Zero Pixels)" --> LLM
    LLM -- "Action Plan with Opaque Node IDs" --> System1
    System1 -->|TIER_1 / TIER_2 (Safe)| CDP
    System1 -->|TIER_4 (Statutory/Secret)| HITLGate
    HITLGate -->|Human Approved| CDP
    CDP -->|Simulated Input Event| RawDOM
```

---

## 🏆 Core Technical Innovations

### 1. WeakSet Structural Boundary (Runtime DOM Quarantine)
* **The Problem:** Regex scanning alone is reactive and brittle. Attackers can split strings, use Unicode homoglyphs, or encode text to bypass regex.
* **SpideyAgent's Innovation:** We implement a **`WeakSet<Node>` memory boundary** in [`structuralBoundary.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/structuralBoundary.ts).
* Sensitive inputs (`type="password"`, OTP, CVV, and verified identity fields) are quarantined as **direct JavaScript object memory references**.
* Accidental serialization to the planner is structurally impossible at the V8 engine level, with automatic garbage-collection cleanup.

### 2. Vault Origin-Lock & HITL Secret Guard
* **The Problem:** Typical browser vaults rehydrate tokens on any site, enabling cross-origin exfiltration.
* **SpideyAgent's Innovation ([`vault.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/privacy/vault.ts)):**
  * **Origin-Lock:** Each token records `sourceOrigin: window.location.origin`. Rehydration on mismatched origins is permanently blocked.
  * **`SECRET_SET` Policy:** Passwords, OTPs, and CVVs cannot be rehydrated autonomously by an agent. When targeted, execution halts and the **Spotlight HUD** requests manual human input.

### 3. Laya System-1 Non-Autoregressive Decision Engine
* **The Problem:** Cloud LLMs take 2,000ms–4,000ms per step, leaking user telemetry over the internet.
* **SpideyAgent's Innovation ([`system1Engine.ts`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/src/execution/system1Engine.ts)):**
  * We compile an INT8-quantized non-autoregressive decision model ([`laya_system1_int8.onnx`](file:///c:/Users/iqand/Downloads/HACK/SIH_3/extension/public/models/laya_system1_int8.onnx)) running directly on **ONNX Runtime Web**.
  * Executes a single forward pass in **< 4 milliseconds** on WebAssembly/WebGPU, classifying action feasibility, risk tiers (`TIER_1` to `TIER_4`), and intent with zero network calls.

### 4. 15 Indian & Global PII Types with Mathematical Checksums
Unlike competitors that rely on naive keyword matching, SpideyAgent mathematically verifies entities before tokenization:
* **Indian Aadhaar:** Exact **Verhoeff algorithm** (dihedral group $D_5$).
* **Indian GSTIN:** Official **ISO 7064 Mod 37, 36 (Mod-36)** check digit verification on the 15th character.
* **Payment Cards:** Complete **Luhn algorithm** + IIN issuer identification (Visa, Mastercard, RuPay, Amex).
* **UPI VPAs:** 70+ verified NPCI banking handles (`@okhdfcbank`, `@paytm`, `@ybl`, `@oksbi`).
* **Indian Voter ID (EPIC):** 3-character state code prefix + 7 numeric serial digits.
* **Indian Names Gazetteer:** 350+ validated given names & surnames with false-positive rejection of UI labels.

---

## 📊 Empirical Benchmark Scorecard

Evaluated against the standardized SIH-26171 Ground-Truth Benchmark Suite (`testbed/benchmarks/run-benchmarks.mjs`):

| Test Domain / Page | Ground Truth Items | Recall | Precision | F1-Score | Perception Latency |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Corporate NetBanking & Tax Portal** | 10 | **100.0%** | 83.3% | 0.909 | 1.34 ms |
| **Merchant Payment Gateway Checkout** | 10 | **100.0%** | **100.0%** | **1.000** | 0.57 ms |
| **Citizen Statutory Identity (KYC)** | 10 | **100.0%** | **100.0%** | **1.000** | 0.18 ms |
|:---|:---:|:---:|:---:|:---:|:---:|
| **TOTAL / OVERALL BENCHMARK** | **30 Items** | **100.0%** | **93.8%** | **0.968** | **0.70 ms avg** |

> *Run benchmarks yourself:* `node testbed/benchmarks/run-benchmarks.mjs`

---

## 🛡️ Zero-Trust Security & Threat Model

| Threat Vector | Attack Scenario | Competitor Vulnerability | SpideyAgent Defense |
|:---|:---|:---|:---|
| **Compromised Planner** | Malicious LLM plans: `type(attacker_site, {{TOKEN_AADHAAR}})` | ❌ Rehydrates token blindly on attacker domain. | 🛡️ **Origin-Lock:** Refuses rehydration due to origin mismatch (`ORIGIN_MISMATCH`). |
| **Password Theft** | Rogue planner commands agent to autofill master password. | ❌ Agent types raw password into target field. | 🛡️ **HITL Secret Guard:** Passwords/OTPs cannot be rehydrated autonomously. Surfaces Human-in-the-Loop modal. |
| **Regex Evasion** | Attacker encodes PII across chunks or custom attributes. | ❌ Regex misses transformed text; data leaks. | 🛡️ **WeakSet Quarantine:** The DOM node reference is memory-quarantined at the V8 engine level. |
| **Canvas & WebGL Leaks** | Webpage renders sensitive data inside HTML5 `<canvas>`. | ❌ DOM-only scrapers are completely blind. | 🛡️ **Dual-Track Vision:** DBNet & OmniParser v2.0 detect text/icons and burn blacked-out pixel masks before capture. |

---

## 🧪 Automated Test Suite & Verification

SpideyAgent features **53 automated unit and security tests** running on Node.js's native test runner (`node --test`):

```bash
# Run the full 53-test security and perception suite
node --test testbed/automated-tests/privacy.test.mjs \
            testbed/automated-tests/vault-security.test.mjs \
            testbed/automated-tests/structural-boundary.test.mjs \
            testbed/automated-tests/system1-onnx.test.mjs \
            testbed/automated-tests/checksums-extended.test.mjs \
            testbed/automated-tests/egress-risk.test.mjs \
            testbed/automated-tests/edge-cases.test.mjs
```

```text
✔ GSTIN ISO 7064 Mod-36: Mathematically verifies authentic 15th check character
✔ UPI VPA Detector: Validates genuine NPCI handles and rejects emails
✔ Indian Voter ID (EPIC): Validates 3-char state prefix and 7 numeric digits
✔ Indian Names Gazetteer: Accurately detects names while rejecting UI labels
✔ Egress Governance: Intercepts and blocks synthetic canary tokens
✔ Egress Governance: Blocks communication with known attacker webhook domains
✔ WeakSet Structural Boundary: Quarantines DOM node reference directly in memory
✔ WeakSet Structural Boundary: Inherits quarantine down parent container tree
✔ Laya System-1: Non-autoregressive forward pass predicts routine action in <2ms
✔ Laya System-1: Classifies financial checkout and submission as TIER_4 with mandatory HITL
✔ Vault Origin-Lock: Allows rehydration on matching same-origin
✔ Vault Origin-Lock: BLOCKS cross-origin token exfiltration attempt
✔ Vault SECRET Guard: Blocks autonomous agent from typing passwords and OTPs
...
ℹ tests 53 | pass 53 | fail 0 | duration_ms ~250ms
```

---

## ⚡ Quick Start: 1-Click Execution & Testing

### Option A: 1-Click Windows Demo
Double-click:
```cmd
run_demo.bat
```
This automatically compiles the extension bundle, starts the local testbed on `http://localhost:3000`, spawns the central reasoning server on `http://localhost:8000`, and runs test verification.

### Option B: Manual Setup
```bash
# 1. Build the Chrome MV3 Extension
cd extension
npm install
npm run build      # Compiles TypeScript + Vite bundle into extension/dist/

# 2. Run the synthetic ISRO testbed
python -m http.server 3000 --directory ../testbed

# 3. Load unpacked into Chrome
# Open chrome://extensions/ -> Enable Developer Mode -> Click "Load unpacked" -> Select extension/dist
```

---

## 🎮 Interactive Controls

* **Floating Spotlight Command HUD:** Press <kbd>Alt</kbd> + <kbd>S</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd>.
* **One-Key Redact & Ask Mode:** Press <kbd>Alt</kbd> + <kbd>R</kbd> to scrub the screen and open the privacy-safe command prompt.
* **Persistent Dock:** Click **◫ Dock** in the popup header to dock SpideyAgent into Chrome's native right-side dock.

---

<div align="center">
<b>SpideyAgent</b> · Built for the Smart India Hackathon 2026 (SIH-26171) · Indian Space Research Organisation (ISRO)
</div>
