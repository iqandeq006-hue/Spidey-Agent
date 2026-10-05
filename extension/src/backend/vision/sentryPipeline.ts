// Complete SpideyAgent 6-Step Autonomous Perception & Execution Pipeline
// Implements the exact on-device sequence:
// 1. Agent Trigger & Viewport Capture
// 2. GPU Spatial Classifier (256x256 downsample, visual entropy, macro layout in 1.5ms)
// 3. Privacy & Sensitive Data Shield (BlazeFace face blur + PaddleOCR text mask + DOM tokenization)
// 4. Self-Healing Privacy Auditor (C_privacy score >= 98%, dynamic 20% padding expansion)
// 5. Interactive Element Locator (DOM first, OmniParser icon locator for canvas/unlabeled controls)
// 6. CDP Dispatcher (Hardware-level click/type via chrome.debugger)

import { spatialClassifierInstance, SpatialClassificationResult } from './spatialClassifier';
import { visionEngineInstance, VisualBBox } from './visionEngine';
import { uiElementLocatorInstance, UIIconDetection } from './uiElementLocator';
import { staticContentGeneralizerInstance } from '../privacy/staticContentGeneralizer';
import { selfHealingAuditorInstance, AuditResult } from '../network/selfHealingAuditor';
import { cdpDispatcherInstance } from '../execution/cdpDispatcher';
import { vaultInstance } from '../privacy/vault';
import { OpaqueSceneNode } from '../network/egressVerifier';
import { PlannedAction } from '../execution/actionDispatcher';

export interface PipelineExecutionReport {
  timestamp: number;
  durationMs: number;
  step1_triggered: boolean;
  step2_spatial: SpatialClassificationResult;
  step3_privacy: {
    facesMasked: number;
    textRegionsMasked: number;
    staticTokensGeneralized: number;
    totalVaultProtected: number;
  };
  step4_audit: AuditResult;
  step5_elements: {
    totalInteractiveNodes: number;
    canvasControlsDetected: number;
    iconButtonsDetected: number;
  };
  step6_readyForExecution: boolean;
}

export class SentryPipeline {
  // Execute the full 6-step on-device perception & privacy verification cycle
  public async executeCycle(
    canvases: HTMLCanvasElement[] = [],
    requestedDisclosure: 'AUTO' | 'L1' | 'L2' = 'AUTO'
  ): Promise<{ report: PipelineExecutionReport; sceneGraph: OpaqueSceneNode[] }> {
    const cycleStart = performance.now();

    // ─────────────────────────────────────────────────────────────
    // STEP 1: TRIGGER & VIEWPORT PREPARATION
    // ─────────────────────────────────────────────────────────────
    const step1_triggered = true;

    // ─────────────────────────────────────────────────────────────
    // STEP 2: GPU SPATIAL CLASSIFIER (1.5ms)
    // ─────────────────────────────────────────────────────────────
    const spatialResult = await spatialClassifierInstance.classifyScreen(canvases);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: PRIVACY & SENSITIVE DATA SHIELD (BlazeFace + PaddleOCR + Generalizer)
    // ─────────────────────────────────────────────────────────────
    let facesMasked = 0;
    let textRegionsMasked = 0;

    // Scan canvases if permitted by spatial mode and disclosure ladder
    if (canvases.length > 0 && requestedDisclosure !== 'L1') {
      const visualRegions: VisualBBox[] = await visionEngineInstance.scanCanvases(canvases);
      facesMasked = visualRegions.filter(r => r.type === 'FACE').length;
      textRegionsMasked = visualRegions.filter(r => r.type === 'TEXT_REGION' || r.type === 'CANVAS_CREDENTIAL').length;
    }

    // Static text node functional generalization
    const staticGenResult = staticContentGeneralizerInstance.scanAndGeneralizeStaticText();

    // ─────────────────────────────────────────────────────────────
    // STEP 5: INTERACTIVE ELEMENT LOCATOR (DOM + OmniParser UI Icons)
    // ─────────────────────────────────────────────────────────────
    const sceneGraph: OpaqueSceneNode[] = [];
    let canvasControlsCount = 0;
    let iconButtonsCount = 0;

    // 5A. Locate controls within HTML5 Canvases (OmniParser Saliency Pass)
    canvases.forEach((canvas, idx) => {
      const canvasControls = uiElementLocatorInstance.detectCanvasControls(canvas, idx);
      canvasControlsCount += canvasControls.length;
      canvasControls.forEach((ctrl) => {
        sceneGraph.push({
          opaqueId: ctrl.id,
          role: ctrl.type,
          sanitizedLabel: ctrl.label,
          interactive: true,
          boundingBox: {
            x: ctrl.x,
            y: ctrl.y,
            w: ctrl.width,
            h: ctrl.height
          }
        });
      });
    });

    // 5B. Locate unlabeled icon buttons in DOM
    const iconButtons = uiElementLocatorInstance.detectUnlabeledIconButtons();
    iconButtonsCount = iconButtons.length;
    iconButtons.forEach((btn) => {
      sceneGraph.push({
        opaqueId: btn.id,
        role: 'ICON_BUTTON',
        sanitizedLabel: btn.label,
        interactive: true,
        boundingBox: {
          x: btn.x,
          y: btn.y,
          w: btn.width,
          h: btn.height
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 4: SELF-HEALING PRIVACY AUDITOR (>=98% Confidence Gate)
    // ─────────────────────────────────────────────────────────────
    const knownSensitiveVaultValues = vaultInstance.getRealValues();
    const auditResult = await selfHealingAuditorInstance.auditAndDispatch(
      sceneGraph,
      knownSensitiveVaultValues,
      requestedDisclosure === 'AUTO' ? 'L2' : requestedDisclosure
    );

    // ─────────────────────────────────────────────────────────────
    // STEP 6: READY FOR CDP HARDWARE DISPATCHER
    // ─────────────────────────────────────────────────────────────
    const isExecutionSafe = auditResult.decision !== 'FAIL_CLOSED_BLOCK';

    const report: PipelineExecutionReport = {
      timestamp: Date.now(),
      durationMs: Math.round(performance.now() - cycleStart),
      step1_triggered,
      step2_spatial: spatialResult,
      step3_privacy: {
        facesMasked,
        textRegionsMasked,
        staticTokensGeneralized: staticGenResult.count,
        totalVaultProtected: vaultInstance.size()
      },
      step4_audit: auditResult,
      step5_elements: {
        totalInteractiveNodes: sceneGraph.length,
        canvasControlsDetected: canvasControlsCount,
        iconButtonsDetected: iconButtonsCount
      },
      step6_readyForExecution: isExecutionSafe
    };

    return { report, sceneGraph };
  }

  // Execute a verified hardware action via Step 6 CDP Dispatcher
  public async executeVerifiedAction(
    tabId: number,
    action: PlannedAction,
    targetElement?: HTMLElement
  ): Promise<boolean> {
    if (action.action === 'CLICK') {
      const x = (action as any).targetX || 0;
      const y = (action as any).targetY || 0;
      return await cdpDispatcherInstance.hardwareClick(tabId, x, y, targetElement);
    } else if (action.action === 'TYPE' && action.payloadValue) {
      const realValue = vaultInstance.rehydrate(action.payloadValue);
      return await cdpDispatcherInstance.hardwareType(tabId, realValue, targetElement);
    }
    return false;
  }
}

export const sentryPipelineInstance = new SentryPipeline();
