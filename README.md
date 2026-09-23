# SentryAgent — Privacy-Preserving Browser Agent

> **Smart India Hackathon (SIH 2026) · Problem Statement SIH26171**  
> **Organization:** Indian Space Research Organisation (ISRO)  
> **Theme:** Smart Automation / Software  
> **Architecture Pattern:** Dual-Track Perception & Local Safety Boundary (Trustworthy Local-Remote Hybrid)  

---

## 🏛️ Project Directory Structure

```
SIH/
├── docs/                     # Comprehensive System Documentation & Research Notes
│   ├── CHANGELOG.md          # Full release history & empirical benchmarks (v2.5.0)
│   ├── BACKLOG.md            # Prioritized feature roadmap & multi-domain specifications
│   ├── SentryAgent.pptx      # Official SIH Presentation Slide Deck
│   └── notes/                # Market research, competitor audits, and session notes
│       ├── SIH26171-problem-statement.md
│       ├── SIH26171-research-notes.md
│       ├── PS26171-research-compiled.md
│       ├── PS26171-techniques-to-take.md
│       └── SIH26171-complete-session-history.md
├── extension/                # Chrome Manifest V3 Browser Extension (TypeScript + Vite)
│   ├── public/models/        # Standalone On-Device ONNX Models (BlazeFace + DBNet)
│   ├── src/                  # Modular source code (Vision, Privacy, Execution, Network)
│   ├── dist/                 # Production build bundle for chrome://extensions
│   └── README.md             # Extension architecture & build instructions
├── server/                   # Central Reasoning Engine (Python HTTP / FastAPI Gateway)
│   ├── app.py                # LLM planner (Ollama / Groq) over zero-PII opaque scene graphs
│   └── requirements.txt      # Zero-dependency standard library runner
├── testbed/                  # Unified Testing & Simulation Proving Ground
│   ├── index.html            # One-click browser entrypoint for testing
│   ├── simulation/           # 3 Interactive Portals: e-Procurement, HR, and ISTRAC Console
│   ├── automated-tests/      # Unit and live E2E integration test suites
│   ├── scripts/              # Repository audit & automation scripts
│   └── README.md             # Testing guide & test suite execution commands
├── result/                   # Empirical benchmark evidence, demo videos & screenshots
└── repo/                     # Competitor reference repositories archive (70+ repos audited)
```

---

## ⚡ Quick Start: Running the System Live

### 1. Start the Reasoning Server
From the project root:
```bash
python server/app.py
```
*Listens on `http://localhost:8000` (provides `/health` and `POST /api/v1/plan`).*

### 2. Run Automated Test Suites
```bash
cd extension
npm test        # Runs 9 unit tests (Verhoeff, Luhn, PAN, GSTIN, Vault, CCL, NMS)
npm run test:e2e # Tests live cryptographic SHA-256 wire contract against Python server
```

### 3. Load the Extension into Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select:  
   `c:\Users\iqand\Downloads\SIH\extension\dist`

### 4. Open the Simulation Proving Ground
Open `testbed/index.html` directly in your browser. Click the **SentryAgent** extension icon to launch the cyber-defense console and trigger autonomous task execution.
