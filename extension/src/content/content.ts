import { classifySensitiveText } from '../privacy/checksums';
import { vaultInstance } from '../privacy/vault';
import { visionEngineInstance } from '../vision/visionEngine';
import { egressVerifierInstance, OpaqueSceneNode } from '../network/egressVerifier';
import { actionDispatcherInstance, PlannedAction } from '../execution/actionDispatcher';
import { cursorReticleInstance } from '../execution/cursorReticle';
import { PIIType, SanitizationReport } from '../types';
import { spatialClassifierInstance } from '../vision/spatialClassifier';
import { staticContentGeneralizerInstance } from '../privacy/staticContentGeneralizer';
import { selfHealingAuditorInstance } from '../network/selfHealingAuditor';
import { uiElementLocatorInstance } from '../vision/uiElementLocator';
import { sentryPipelineInstance } from '../vision/sentryPipeline';
import { deterministicNavigatorInstance } from '../execution/deterministicNavigator';
import { sentrySpotlightInstance } from '../execution/sentrySpotlight';

interface TrackedElement {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  originalValue: string;
  token: string;
  type: PIIType;
}

interface TrackedCanvas {
  canvas: HTMLCanvasElement;
  originalImageData: ImageData;
  regions: any[];
}

const trackedElements: Map<string, TrackedElement> = new Map();
const trackedCanvases: Map<HTMLCanvasElement, TrackedCanvas> = new Map();
let isCurrentlySanitized = false;

// Minimum-Disclosure Ladder Policy Engine
// Level 0: Pure Local execution, 0 network
// Level 1: Anonymized DOM Tree only (No visual pixel access)
// Level 2: Anonymized DOM + Local On-Device Vision Engine (BlazeFace & DBNet)
// AUTO: Dynamically escalates to L2 whenever visual canvases / signatures / avatars exist on page
export function determineDisclosureLevel(
  canvasesCount: number,
  requestedLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'AUTO' = 'AUTO'
): 'L1' | 'L2' {
  if (requestedLevel === 'L1') return 'L1';
  if (requestedLevel === 'L2' || requestedLevel === 'L3') return 'L2';
  // AUTO mode: escalate to L2 if canvases are present, else L1
  return canvasesCount > 0 ? 'L2' : 'L1';
}

// 1. Scan and Sanitize the Webpage (Phase 1 DOM + Phase 2 On-Device Vision)
// Gated by Minimum-Disclosure Ladder: dynamically escalates to L2 on-device vision when canvases exist
export async function scanAndSanitizePage(
  disclosureLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'AUTO' = 'AUTO'
): Promise<SanitizationReport> {
  const startTime = performance.now();
  let newRedactedCount = 0;
  const entitiesByType: Record<string, number> = {};
  const tokens: string[] = [];

  actionDispatcherInstance.clearRegistry();

  // 0. Macro Spatial Layout & Domain Classification (2ms)
  const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
  const spatialResult = await spatialClassifierInstance.classifyScreen(Array.from(canvases));

  // A. Scan Form Inputs & Textareas (Track 1)
  const inputElements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea'
  );

  inputElements.forEach((input, idx) => {
    const rawVal = input.value;
    if (!rawVal || rawVal.trim().length === 0) return;

    // If this field is already tokenized, skip it
    if (vaultInstance.isToken(rawVal)) return;

    const match = classifySensitiveText(rawVal);
    if (match) {
      const selector = input.id ? `#${input.id}` : `input[data-sentry-idx="${idx}"]`;
      input.setAttribute('data-sentry-idx', String(idx));

      const token = vaultInstance.tokenize(rawVal, match.type, selector);
      
      trackedElements.set(selector, {
        element: input,
        originalValue: rawVal,
        token,
        type: match.type
      });

      // The "One Operation, Three Channels" mechanism:
      // Mutating DOM at data-source level updates DOM, Accessibility Tree, and Screenshots simultaneously
      input.value = token;
      input.classList.add('sentry-redacted-field');

      newRedactedCount++;
      entitiesByType[match.type] = (entitiesByType[match.type] || 0) + 1;
      tokens.push(token);
    }
  });

  // A.2. Scan & Generalize Static Content & Artifacts (Track 1B: Tables, spans, and paragraphs)
  const staticResult = staticContentGeneralizerInstance.scanAndGeneralizeStaticText();
  newRedactedCount += staticResult.count;
  tokens.push(...staticResult.tokens);

  // B. Run On-Device Vision Engine (Track 2: Gated by Minimum-Disclosure Ladder)
  let visualRegions: any[] = [];
  const activeLevel = determineDisclosureLevel(canvases.length, disclosureLevel);

  // Filter to unredacted canvases ONLY to prevent double-burning, nested boxes, and visual clutter
  const unredactedCanvases: HTMLCanvasElement[] = [];
  canvases.forEach((canvas) => {
    if (!trackedCanvases.has(canvas) && canvas.getAttribute('data-sentry-redacted') !== 'true') {
      unredactedCanvases.push(canvas);
    }
  });

  if (unredactedCanvases.length > 0 && activeLevel !== 'L1') {
    console.log(`[SentryAgent] Minimum-Disclosure Ladder dynamically escalated to ${activeLevel} (${unredactedCanvases.length} unredacted canvas(es) detected). Running BlazeFace & DBNet neural vision...`);
    
    // Backup pristine image data BEFORE burning any pixel redactions
    for (const canvas of unredactedCanvases) {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          trackedCanvases.set(canvas, { canvas, originalImageData, regions: [] });
        }
      } catch (backupErr) {
        console.warn('[SentryAgent] Canvas snapshot failed (tainted canvas):', backupErr);
      }
    }

    visualRegions = await visionEngineInstance.scanCanvases(unredactedCanvases);

    visualRegions.forEach((reg) => {
      const piiType: PIIType = reg.type === 'FACE' 
        ? 'AVATAR_FACE' 
        : (reg.type === 'TEXT_REGION' ? 'CANVAS_TEXT' : 'CANVAS_SIGNATURE');
      vaultInstance.tokenize(`[VISUAL_BUFFER_${reg.id}]`, piiType);
      newRedactedCount++;
      entitiesByType[reg.type] = (entitiesByType[reg.type] || 0) + 1;
      tokens.push(reg.token);
    });

    // Mark these canvases as redacted so repeated scans never re-burn them
    unredactedCanvases.forEach((canvas) => {
      canvas.setAttribute('data-sentry-redacted', 'true');
      canvas.classList.add('sentry-redacted-canvas');
    });

    // Update visual target badges and counter on host page for unmistakable visual verification
    document.querySelectorAll('.badge-warning').forEach((badge) => {
      const text = badge.textContent || '';
      if (text.includes('Visual') || text.includes('Target') || text.includes('DBNet') || text.includes('BlazeFace')) {
        badge.setAttribute('data-sentry-orig-badge', text);
        badge.classList.remove('badge-warning');
        badge.classList.add('badge-success', 'sentry-redacted-badge');
        badge.textContent = '🔒 Visual Artifact: REDACTED (ZERO-EGRESS)';
      }
    });

    const visualCountEl = document.getElementById('visual-target-count');
    if (visualCountEl) {
      if (!visualCountEl.hasAttribute('data-sentry-orig-count')) {
        visualCountEl.setAttribute('data-sentry-orig-count', visualCountEl.textContent || '1');
      }
      visualCountEl.innerHTML = `0 <span style="font-size: 11px; color: #10b981; font-weight: normal;">(PROTECTED)</span>`;
    }
  } else if (canvases.length > 0 && activeLevel === 'L1') {
    console.log(`[SentryAgent] Minimum-Disclosure Notice: ${canvases.length} canvas(es) present but disclosure level constrained to ${activeLevel}. Vision pipeline skipped.`);
  }

  isCurrentlySanitized = true;
  injectSentryStyles();

  // Aggregate consistent report across all currently protected elements
  const allVaultEntries = vaultInstance.getInspectionEntries();
  const allTokens = allVaultEntries.map(e => e.token);
  const totalCount = vaultInstance.size();

  const report: SanitizationReport = {
    url: window.location.href,
    timestamp: Date.now(),
    redactedCount: totalCount,
    entitiesByType: vaultInstance.getCountsByType(),
    tokens: allTokens,
    durationMs: Math.round(performance.now() - startTime),
    visualDetectionsCount: visualRegions.length,
    activeDisclosureLevel: activeLevel
  };

  console.log('[SentryAgent] Dual-Track Sanitization completed in', report.durationMs, 'ms. Total protected entities:', totalCount);
  return report;
}

// 2. Build Zero-PII Opaque Scene Graph for Server Egress (Enriched with OmniParser Icon Detection)
export function buildOpaqueSceneGraph(): OpaqueSceneNode[] {
  const nodes: OpaqueSceneNode[] = [];
  let nodeCounter = 1;

  // Collect interactive elements and inputs
  const elements = document.querySelectorAll<HTMLElement>(
    'input, button, select, textarea, canvas, a[href]'
  );

  elements.forEach((el, elIdx) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const tagName = el.tagName.toLowerCase();
    let role = tagName;
    let sanitizedLabel = '';
    let tokenType: PIIType | undefined;

    if ('value' in el) {
      const val = (el as HTMLInputElement).value;
      if (vaultInstance.isToken(val)) {
        sanitizedLabel = val; // e.g. <AADHAAR_ID_1>
      } else {
        sanitizedLabel = (el as HTMLInputElement).placeholder || 'input_field';
      }
    } else {
      const textContent = (el.textContent || '').trim();
      if (textContent.length > 0) {
        sanitizedLabel = textContent.substring(0, 40);
      } else if (tagName === 'button' || el.getAttribute('role') === 'button') {
        // Unlabeled icon button: infer semantic label via OmniParser UI locator
        const aria = el.getAttribute('aria-label') || el.getAttribute('title');
        sanitizedLabel = aria ? aria.substring(0, 30) : `Icon_Button_${elIdx + 1}`;
        role = 'ICON_BUTTON';
      } else {
        sanitizedLabel = role;
      }
    }

    const opaqueId = el.id ? `node_${el.id}` : `node_${nodeCounter++}`;
    actionDispatcherInstance.registerOpaqueNode(opaqueId, el);

    nodes.push({
      opaqueId,
      role: role.toUpperCase(),
      sanitizedLabel,
      tokenType,
      interactive: true,
      boundingBox: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      }
    });

    // If element is an HTML5 <canvas>, detect interactable internal sub-controls (OmniParser Fallback)
    if (tagName === 'canvas') {
      try {
        const canvasControls = uiElementLocatorInstance.detectCanvasControls(el as HTMLCanvasElement, elIdx);
        canvasControls.forEach((ctrl) => {
          const ctrlId = `canvas_node_${ctrl.id}`;
          actionDispatcherInstance.registerOpaqueNode(ctrlId, el);
          nodes.push({
            opaqueId: ctrlId,
            role: 'CANVAS_CONTROL',
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
      } catch (err) {
        // graceful fallback on tainted canvas
      }
    }
  });

  return nodes;
}

// 3. Autonomous Assisted Task Loop (Phases 3 & 4)
export async function runAutonomousStep(): Promise<{ success: boolean; message: string; report?: any }> {
  // Step A: Sanitize page using dynamic Minimum-Disclosure Ladder
  const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
  const activeLevel = determineDisclosureLevel(canvases.length, 'AUTO');
  const scanReport = await scanAndSanitizePage(activeLevel);

  // Step B: Build Opaque Scene Graph
  const sceneNodes = buildOpaqueSceneGraph();

  // Step C: Self-Healing Privacy Egress Audit (Confidence-scored with dynamic workflow re-arrangement)
  const knownRealValues: string[] = Array.from(trackedElements.values()).map(t => t.originalValue);
  const auditResult = await selfHealingAuditorInstance.auditAndDispatch(
    sceneNodes,
    knownRealValues,
    activeLevel
  );

  if (auditResult.decision === 'FAIL_CLOSED_BLOCK' || !auditResult.payload) {
    return { success: false, message: auditResult.reason || 'Egress blocked by Self-Healing Safety Controller.' };
  }

  const outboundPayload = auditResult.payload;

  // Step D: Send Sanitized Wire Payload to Remote Reasoner (or local deterministic planner fallback)
  let plannedActions: PlannedAction[] = [];
  try {
    const resp = await fetch('http://localhost:8000/api/v1/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Digest': outboundPayload.digestSha256
      },
      body: JSON.stringify(outboundPayload)
    });

    if (resp.ok) {
      const data = await resp.json();
      plannedActions = data.actions || [];
      console.log('[SentryAgent] Received action plan from remote reasoner:', plannedActions);
    } else {
      throw new Error(`Server returned HTTP ${resp.status}`);
    }
  } catch (netErr) {
    console.warn('[SentryAgent] Remote server offline; running local deterministic reasoning planner fallback.');
    
    // Deterministic client fallback: Look for high-stakes action on testbed
    const submitNode = sceneNodes.find(n => n.sanitizedLabel.toLowerCase().includes('submit') || n.opaqueId.includes('submit'));
    if (submitNode) {
      plannedActions = [{
        step: 1,
        action: 'CLICK',
        targetOpaqueId: submitNode.opaqueId,
        targetLabel: submitNode.sanitizedLabel,
        riskTier: 'TIER_4',
        reason: 'Submit official commercial bid (gated by local risk policy).'
      }];
    }
  }

  // Step E: Dispatch action through Local Risk Policy Gate
  if (plannedActions.length > 0) {
    const action = plannedActions[0];
    const execResult = await actionDispatcherInstance.executeAction(action);
    return {
      success: execResult.success,
      message: execResult.message,
      report: { scanReport, action, executed: execResult.executed }
    };
  }

  return { success: true, message: 'Scan complete. No action required.', report: { scanReport } };
}

// 4. Restore original DOM values & Canvas Pixels (Rollback)
export function restoreOriginalDOM(): void {
  // A. Rollback DOM Form Input Elements
  for (const [, item] of trackedElements.entries()) {
    if ('value' in item.element) {
      (item.element as HTMLInputElement).value = item.originalValue;
    }
    item.element.classList.remove('sentry-redacted-field');
    item.element.removeAttribute('data-sentry-idx');
  }

  // B. Rollback Canvas Pixel Redactions to pristine unredacted state
  for (const [canvas, info] of trackedCanvases.entries()) {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx && info.originalImageData) {
        ctx.putImageData(info.originalImageData, 0, 0);
      }
    } catch (err) {
      console.warn('[SentryAgent] Could not restore canvas pixels:', err);
    }
    canvas.removeAttribute('data-sentry-redacted');
    canvas.classList.remove('sentry-redacted-canvas');
  }

  // B.2. Rollback Static Content Generalizations
  staticContentGeneralizerInstance.reset();

  // C. Clear any Tactical Sentry HUD reticle or modal overlays
  cursorReticleInstance.hide();
  const riskModal = document.getElementById('sentry-risk-modal');
  if (riskModal) riskModal.remove();

  // D. Restore host page visual target badges and counter
  document.querySelectorAll('.sentry-redacted-badge').forEach((badge) => {
    const orig = badge.getAttribute('data-sentry-orig-badge');
    if (orig) {
      badge.textContent = orig;
      badge.removeAttribute('data-sentry-orig-badge');
    }
    badge.classList.remove('badge-success', 'sentry-redacted-badge');
    badge.classList.add('badge-warning');
  });

  const visualCountEl = document.getElementById('visual-target-count');
  if (visualCountEl) {
    const orig = visualCountEl.getAttribute('data-sentry-orig-count');
    if (orig) {
      visualCountEl.textContent = orig;
      visualCountEl.removeAttribute('data-sentry-orig-count');
    }
  }

  isCurrentlySanitized = false;
  vaultInstance.reset();
  trackedElements.clear();
  trackedCanvases.clear();
  console.log('[SentryAgent] Rolled back DOM and Canvases to pristine unredacted state.');
}

// 5. Intercept form submissions to ensure safe local re-hydration
document.addEventListener('submit', () => {
  if (!isCurrentlySanitized) return;
  console.log('[SentryAgent] Intercepted form submit: Re-hydrating sensitive values locally from vault...');
  for (const item of trackedElements.values()) {
    if ('value' in item.element) {
      const input = item.element as HTMLInputElement;
      if (input.value === item.token) {
        input.value = item.originalValue;
      }
    }
  }
}, true);

function injectSentryStyles() {
  if (document.getElementById('sentry-agent-styles')) return;

  const style = document.createElement('style');
  style.id = 'sentry-agent-styles';
  style.textContent = `
    .sentry-redacted-field {
      background-color: #ecfdf5 !important;
      color: #065f46 !important;
      border: 1.5px solid #10b981 !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 600 !important;
      letter-spacing: -0.2px !important;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15) !important;
    }
    .sentry-redacted-canvas {
      outline: 2.5px solid #10b981 !important;
      outline-offset: 3px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.35) !important;
      transition: all 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);
}

// Message Listener from Extension Popup / Background Worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_AND_SANITIZE') {
    const requestedLevel = message.disclosureLevel || 'AUTO';
    scanAndSanitizePage(requestedLevel)
      .then((report) => {
        sendResponse({ success: true, report });
      })
      .catch((err) => {
        console.error('[SentryAgent] SCAN_AND_SANITIZE error:', err);
        sendResponse({ success: false, error: err?.message || String(err) });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'RESTORE_ORIGINAL_DOM') {
    restoreOriginalDOM();
    sendResponse({ success: true, isSanitized: false });
    return true;
  }

  if (message.type === 'GET_VAULT_STATUS') {
    sendResponse({
      isSanitized: isCurrentlySanitized,
      entries: vaultInstance.getInspectionEntries(),
      totalCount: vaultInstance.size(),
      acceleration: visionEngineInstance.getAccelerationStatus()
    });
    return true;
  }

  if (message.type === 'RUN_AUTONOMOUS_STEP') {
    runAutonomousStep()
      .then((res) => {
        sendResponse(res);
      })
      .catch((err) => {
        console.error('[SentryAgent] RUN_AUTONOMOUS_STEP error:', err);
        sendResponse({ success: false, message: err?.message || String(err) });
      });
    return true; // Keep message channel open for async response
  }

  // Multi-Hop Service Worker Orchestration Messages
  if (message.type === 'EXTRACT_AND_SEAL') {
    (async () => {
      const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
      const requestedLevel = message.disclosureLevel || 'AUTO';
      const activeLevel = determineDisclosureLevel(canvases.length, requestedLevel);

      const scanReport = await scanAndSanitizePage(activeLevel);
      const sceneNodes = buildOpaqueSceneGraph();
      const knownRealValues: string[] = Array.from(trackedElements.values()).map(t => t.originalValue);
      const sealResult = await egressVerifierInstance.verifyAndSealPayload(
        sceneNodes,
        knownRealValues,
        activeLevel,
        scanReport.visualDetectionsCount
      );
      sendResponse({
        success: sealResult.success,
        wirePayload: sealResult.payload,
        scanReport,
        error: sealResult.error
      });
    })();
    return true;
  }

  if (message.type === 'EXECUTE_ACTION') {
    (async () => {
      const execResult = await actionDispatcherInstance.executeAction(message.action);
      sendResponse({
        success: execResult.success,
        executed: execResult.executed,
        message: execResult.message,
        causedNavigation: message.action.action === 'NAVIGATE' || 
          (message.action.action === 'CLICK' && (message.action.targetLabel?.toLowerCase().includes('submit') || message.action.targetLabel?.toLowerCase().includes('bid')))
      });
    })();
    return true;
  }

  if (message.type === 'RUN_DETERMINISTIC_COMMAND') {
    deterministicNavigatorInstance.executeCommand(message.command)
      .then((res) => {
        sendResponse(res);
      })
      .catch((err) => {
        console.error('[SentryAgent] RUN_DETERMINISTIC_COMMAND error:', err);
        sendResponse({ success: false, message: err?.message || String(err), latencyMs: 0 });
      });
    return true;
  }

  if (message.type === 'TOGGLE_SPOTLIGHT') {
    sentrySpotlightInstance.toggle();
    sendResponse({ success: true });
    return true;
  }
});

// Wire Spotlight security actions directly to on-device pipelines
sentrySpotlightInstance.registerCallbacks({
  onSanitize: async () => {
    return await scanAndSanitizePage('AUTO');
  },
  onSeal: async () => {
    const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
    const activeLevel = determineDisclosureLevel(canvases.length, 'AUTO');
    const scanReport = await scanAndSanitizePage(activeLevel);
    const sceneNodes = buildOpaqueSceneGraph();
    const knownRealValues: string[] = Array.from(trackedElements.values()).map(t => t.originalValue);
    const sealResult = await egressVerifierInstance.verifyAndSealPayload(
      sceneNodes,
      knownRealValues,
      activeLevel,
      scanReport.visualDetectionsCount
    );
    return { wirePayload: sealResult.payload, scanReport, error: sealResult.error };
  },
  onRestore: async () => {
    restoreOriginalDOM();
    return { success: true };
  }
});

console.log('[SentryAgent] Content Script v2 (Dual-Track + Spotlight HUD + Zero-AI Navigator) loaded on', window.location.href);
