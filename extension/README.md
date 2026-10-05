# SpideyAgent Browser Extension (Manifest V3)

**Target:** Chrome / Chromium Browsers (Manifest V3, TypeScript, Vite)  
**Security Guarantee:** Zero-PII Egress Boundary with On-Device Neural Vision  

---

## Directory Organization & Module Architecture

```
extension/
├── public/
│   └── models/                      # Standalone ONNX Neural Network Weights
│       ├── blazeface.onnx           # 536 KB: Real-time Facial Biometrics Detector
│       ├── ocr-det.onnx             # 4.75 MB: DBNet Text-Region Neural Detector
│       ├── yolos_tiny_q4.onnx       # 7.45 MB: YOLOS Vision Transformer
│       ├── omniparser_icon_detect.onnx # 76.7 MB: OmniParser v2.0 UI Detector
│       ├── laya_system1_int8.onnx   # 2.8 MB: On-Device System-1 Decision Engine
│       └── README.md                # Model specs, tensor shapes, and formulas
├── src/
│   ├── frontend/                    # User Interface & Visual Layer
│   │   ├── popup/                   # Side Panel Mission Control UI
│   │   │   ├── popup.html           # Conversational chat & telemetry console
│   │   │   ├── popup.ts             # Co-pilot controller & audit log streamer
│   │   │   └── popup.css            # Dark aerospace UI styling
│   │   └── hud/                     # In-Page In-DOM Visual Layer
│   │       ├── sentrySpotlight.ts   # Alt+R Spotlight Command Palette (Isolated Shadow DOM)
│   │       └── cursorReticle.ts     # Tactical HUD targeting cursor & action badge
│   ├── backend/                     # Extension Background & Local Security Engine
│   │   ├── background/              # Manifest V3 Service Worker
│   │   │   └── background.ts        # Persistent session owner across navigations
│   │   ├── privacy/                 # Deterministic PII Engine & Inversion Vault
│   │   │   ├── vault.ts             # Ephemeral Inversion Vault + Origin-Lock + Secret Guard
│   │   │   ├── structuralBoundary.ts # WeakSet DOM Node Quarantine Boundary
│   │   │   ├── checksums.ts         # Verhoeff, Luhn, PAN, Mod-36 GSTIN, UPI, Voter ID
│   │   │   ├── gazetteer.ts         # Offline Indian names gazetteer
│   │   │   └── staticContentGeneralizer.ts # Table & DOM text generalization
│   │   ├── vision/                  # On-Device Computer Vision Pipeline
│   │   │   ├── visionEngine.ts      # ONNX Runtime Web session loader & NMS
│   │   │   ├── spatialClassifier.ts # Coordinate normalization & bounding boxes
│   │   │   ├── uiElementLocator.ts  # OmniParser icon grounding & semantic mapping
│   │   │   └── sentryPipeline.ts    # 6-step vision perception coordinator
│   │   ├── execution/               # Action Dispatcher & Policy Gating
│   │   │   ├── actionDispatcher.ts  # "Reasoning != Authority" 4-tier risk gate
│   │   │   ├── deterministicNavigator.ts # Offline 0-LLM search & navigation
│   │   │   ├── system1Engine.ts     # ONNX Runtime System-1 decision inference
│   │   │   ├── system1DecisionEngine.ts # Decision engine fallback & dispatch
│   │   │   └── cdpDispatcher.ts     # Chrome DevTools Protocol dispatcher
│   │   ├── network/                 # Egress Governance & Observability
│   │   │   ├── egressVerifier.ts    # Canary token & raw PII leak barrier
│   │   │   ├── observabilityLogger.ts # Structured audit telemetry
│   │   │   └── selfHealingAuditor.ts # Multi-factor confidence score & self-healing
│   │   └── types/                   # TypeScript Wire Contracts & Schemas
│   │       └── index.ts             # Shared interfaces, session state, risk tiers
│   └── content/                     # Browser Webpage Bridge
│       └── content.ts               # Content script coordinator
├── dist/                            # Production build output (Vite)
├── manifest.json                    # Chrome Manifest V3 configuration
├── package.json                     # Dependencies and test scripts
├── tsconfig.json                    # TypeScript compiler configuration
└── vite.config.ts                   # Bundler configuration
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
