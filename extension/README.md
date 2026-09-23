# SentryAgent Browser Extension (Manifest V3)

**Target:** Chrome / Chromium Browsers (Manifest V3, TypeScript, Vite)  
**Security Guarantee:** Zero-PII Egress Boundary with On-Device Neural Vision  

---

## Directory Organization & Module Architecture

```
extension/
├── public/
│   └── models/               # Standalone ONNX Neural Network Weights
│       ├── blazeface.onnx    # 536 KB: Real-time Facial Biometrics Detector
│       ├── ocr-det.onnx      # 4.75 MB: DBNet Text-Region Neural Detector
│       └── README.md         # Model specs, tensor shapes, and normalization formulas
├── src/
│   ├── background/           # Service Worker Autonomous Runner
│   │   └── background.ts     # Persistent session owner across tab reloads (solves multi-hop amnesia)
│   ├── content/              # Content Script Coordinator
│   │   └── content.ts        # Dual-track perception (Track 1 DOM + Track 2 Canvas Vision)
│   ├── execution/            # Action Execution & Safety Boundary
│   │   ├── actionDispatcher.ts # "Reasoning ≠ Authority" 4-tier risk gate + confirmation modal
│   │   └── cursorReticle.ts  # Zero-dependency tactical HUD targeting cursor
│   ├── network/              # Cryptographic Egress Boundary
│   │   └── egressVerifier.ts # Pre-flight canary leak filter & SHA-256 signed safe envelope
│   ├── popup/                # Cyber-Defense Mission Control UI
│   │   ├── popup.html        # Telemetry console, live counters, and step trigger
│   │   ├── popup.ts          # UI controller communicating with active tab & background
│   │   └── popup.css         # ISRO military-grade cyber styling
│   ├── privacy/              # Deterministic PII Engine & Vault
│   │   ├── checksums.ts      # Verhoeff (Aadhaar), Luhn (Cards), PAN 4th-char, GSTIN, Mobile, ₹
│   │   └── vault.ts          # Ephemeral Inversion Vault (<PERSON_1>, <AADHAAR_ID_1>)
│   ├── types/                # TypeScript Wire Contracts & Schemas
│   │   └── index.ts          # Shared interfaces, session state, risk tiers, and action types
│   └── vision/               # On-Device WebGPU/WASM Vision Pipeline
│       └── visionEngine.ts   # ONNX Runtime Web session loader, NMS, and DBNet 8-way CCL
├── dist/                     # Production build output loaded via chrome://extensions
├── manifest.json             # Chrome Manifest V3 configuration
├── package.json              # Dependencies and automated test scripts
├── tsconfig.json             # TypeScript compiler configuration
└── vite.config.ts            # Vite bundler with automatic ONNX and WASM asset copy
```

---

## How to Build and Load
1. **Compile:**
   ```bash
   npm run build
   ```
2. **Load into Browser:**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle).
   - Click **Load unpacked** and select the `extension/dist` folder.
