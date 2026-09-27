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

## ⚡ Quick Start: 1-Click Execution & Testing

### Option A: 1-Click Windows Demo (Recommended)
Simply double-click:
```cmd
run_demo.bat
```
This automatically:
1. Builds the Chrome MV3 Extension (`extension/dist/`) via TypeScript & Vite.
2. Runs all 18 automated security and pipeline verification tests.
3. Spawns the Local Synthetic ISRO Proving Ground on `http://localhost:3000`.
4. Spawns the Sentry Central Reasoning Server on `http://localhost:8000` with Convai Laya System 1 routing enabled.
5. Launches your browser directly to the testbed environment.

---

### Option B: Manual Step-by-Step Execution

#### 1. Build Extension & Run Automated Tests
```bash
cd extension
npm install
npm run build      # Compiles TypeScript & Vite bundle into extension/dist/ in ~1.1s
npm run test:all   # Runs all 18 Unit, Pipeline, Privacy, and Live Wire Contract tests
```

#### 2. Start the Synthetic ISRO Testbed Proving Ground
```bash
python -m http.server 3000 --directory testbed
```
*Access in browser at `http://localhost:3000` (features e-Procurement, HR, and ISTRAC portals).*

#### 3. Start Central Reasoning Engine & Laya System 1 (Optional)
```bash
python server/app.py
```
*Listens on `http://localhost:8000`. Enables Convai Laya (~25ms) and LLM fallback.*

#### 4. Load Extension into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select:  
   `<repo_root>/extension/dist`
4. Navigate to `http://localhost:3000`.

---

## 🎮 Interactive Controls & Capabilities

1. **In-Page Floating Spotlight HUD (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> or <kbd>Alt</kbd> + <kbd>S</kbd>)**:
   - Type `search propellant`, `click submit`, `sanitize`, `seal`, or `restore`.
   - Executes deterministically in **< 1ms** with **0 LLM calls** directly inside the active tab.
2. **Persistent Chrome Side Panel (<kbd>◫ Dock</kbd>)**:
   - Click the **◫ Dock** button in the popup header to dock SentryAgent into Chrome's native right-side dock.
   - Remains permanently visible across multi-page workflows without closing on clicks.
3. **Local System-1 Non-Autoregressive Decision Engine**:
   - Executes routine actions on-device in **< 2ms** with **zero server dependencies**.
4. **Model Context Protocol (MCP) Server**:
   - Connect any external AI (Claude Desktop, Cursor) securely via `python server/mcp_server.py`.
