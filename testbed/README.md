# SpideyAgent Testbed & Verification Suite

This directory contains the testing framework, interactive simulation portals, and automated test suites for evaluating the SpideyAgent browser extension against the ISRO SIH26171 criteria.

---

## Directory Organization

```
testbed/
├── index.html               # Root entrypoint for quick one-click browser preview
├── script.js                # Core interactive portal logic
├── style.css                # ISRO & ISTRAC mission styling
├── simulation/              # Standalone 3-Portal Simulation Proving Ground
│   ├── index.html           # Full portal simulation (e-Procurement, HR, ISTRAC)
│   ├── script.js            # Avatar generation, signature canvas, and satellite telemetry
│   └── style.css            # Dark mode, tactical mission HUD, and cyber styling
├── automated-tests/         # Automated Unit & E2E Test Suites
│   ├── privacy.test.mjs     # 9 Unit tests: Verhoeff, Luhn, PAN, GSTIN, Vault, CCL, NMS
│   └── e2e-plan.test.mjs    # E2E integration test against live Python reasoning server
├── scripts/                 # Automation & Competitor Audit Scripts
│   ├── clone_repos.ps1      # Bulk cloning script for competitor repos
│   ├── check_commits.ps1    # Git commit freshness audit script
│   └── check_remotes.ps1    # Remote upstream tracking script
└── evidence/                # Empirical benchmark records & validation artifacts
```

---

## How to Run Tests

### 1. Run Automated Unit & Privacy Tests
From the `extension/` folder:
```bash
npm test
```
*Executes all 9 mathematical checksum, vault, and ONNX post-processing tests.*

### 2. Run Live End-to-End Server Protocol Test
Ensure `server/app.py` is running on port 8000:
```bash
npm run test:e2e
```
*Tests full cryptographic SHA-256 digest validation and opaque action planning.*

### 3. Run All Tests Concurrently
```bash
npm run test:all
```

---

## Interactive Proving Ground Portals
Open `testbed/index.html` directly in Google Chrome:
1. **e-Procurement Portal (`eproc.isro.gov.in`):** Commercial tender bidding, PAN, GSTIN, escrow accounts, and vector signature canvas.
2. **Internal HR & Deputation Portal:** Personnel records, Verhoeff-validated Aadhaar (`9999 9999 0019`), and biometric badge avatar canvas.
3. **ISTRAC Mission Operations Console (`istrac.isro.gov.in`):** Satellite telemetry displays (with dual text clusters for DBNet CCL testing), flight director biometric badge, and Tier 4 orbital burn confirmation button.
