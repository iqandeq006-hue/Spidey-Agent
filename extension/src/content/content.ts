import { classifySensitiveText } from '../privacy/checksums';
import { vaultInstance } from '../privacy/vault';
import { visionEngineInstance } from '../vision/visionEngine';
import { egressVerifierInstance, OpaqueSceneNode } from '../network/egressVerifier';
import { actionDispatcherInstance, PlannedAction } from '../execution/actionDispatcher';
import { PIIType, SanitizationReport } from '../types';

interface TrackedElement {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  originalValue: string;
  token: string;
  type: PIIType;
}

const trackedElements: Map<string, TrackedElement> = new Map();
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
  let redactedCount = 0;
  const entitiesByType: Record<string, number> = {};
  const tokens: string[] = [];

  actionDispatcherInstance.clearRegistry();

  // A. Scan Form Inputs & Textareas (Track 1)
  const inputElements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), textarea'
  );

  inputElements.forEach((input, idx) => {
    const rawVal = input.value;
    if (!rawVal || rawVal.trim().length === 0) return;

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

      redactedCount++;
      entitiesByType[match.type] = (entitiesByType[match.type] || 0) + 1;
      tokens.push(token);
    }
  });

  // B. Run On-Device Vision Engine (Track 2: Gated by Minimum-Disclosure Ladder)
  let visualRegions: any[] = [];
  const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
  const activeLevel = determineDisclosureLevel(canvases.length, disclosureLevel);

  if (canvases.length > 0 && activeLevel !== 'L1') {
    console.log(`[SentryAgent] Minimum-Disclosure Ladder dynamically escalated to ${activeLevel} (${canvases.length} canvas element(s) detected). Running BlazeFace & DBNet neural vision...`);
    visualRegions = await visionEngineInstance.scanCanvases(canvases);

    visualRegions.forEach((reg) => {
      const piiType: PIIType = reg.type === 'FACE' 
        ? 'AVATAR_FACE' 
        : (reg.type === 'TEXT_REGION' ? 'CANVAS_TEXT' : 'CANVAS_SIGNATURE');
      vaultInstance.tokenize(`[VISUAL_BUFFER_${reg.id}]`, piiType);
      redactedCount++;
      entitiesByType[reg.type] = (entitiesByType[reg.type] || 0) + 1;
      tokens.push(reg.token);
    });
  } else if (canvases.length > 0) {
    console.log(`[SentryAgent] Minimum-Disclosure Notice: ${canvases.length} canvas(es) present but disclosure level constrained to ${activeLevel}. Vision pipeline skipped.`);
  }

  isCurrentlySanitized = true;
  injectSentryStyles();

  const report: SanitizationReport = {
    url: window.location.href,
    timestamp: Date.now(),
    redactedCount,
    entitiesByType,
    tokens,
    durationMs: Math.round(performance.now() - startTime),
    visualDetectionsCount: visualRegions.length,
    activeDisclosureLevel: activeLevel
  };

  console.log('[SentryAgent] Dual-Track Sanitization completed in', report.durationMs, 'ms. Report:', report);
  return report;
}

// 2. Build Zero-PII Opaque Scene Graph for Server Egress
export function buildOpaqueSceneGraph(): OpaqueSceneNode[] {
  const nodes: OpaqueSceneNode[] = [];
  let nodeCounter = 1;

  // Collect interactive elements and inputs
  const elements = document.querySelectorAll<HTMLElement>(
    'input, button, select, textarea, canvas, a[href]'
  );

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let role = el.tagName.toLowerCase();
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
      sanitizedLabel = (el.textContent || '').trim().substring(0, 40) || role;
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

  // Step C: Fail-Closed Egress Verification (SHA-256 sealed) with active disclosure level
  const knownRealValues: string[] = Array.from(trackedElements.values()).map(t => t.originalValue);
  const sealResult = await egressVerifierInstance.verifyAndSealPayload(
    sceneNodes,
    knownRealValues,
    activeLevel,
    scanReport.visualDetectionsCount
  );

  if (!sealResult.success || !sealResult.payload) {
    return { success: false, message: sealResult.error || 'Egress verification failed.' };
  }

  // Step D: Send Sanitized Wire Payload to Remote Reasoner (or local deterministic planner fallback)
  let plannedActions: PlannedAction[] = [];
  try {
    const resp = await fetch('http://localhost:8000/api/v1/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Digest': sealResult.payload.digestSha256
      },
      body: JSON.stringify(sealResult.payload)
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

// 4. Restore original DOM values (Rollback)
export function restoreOriginalDOM(): void {
  for (const [, item] of trackedElements.entries()) {
    if ('value' in item.element) {
      (item.element as HTMLInputElement).value = item.originalValue;
    }
    item.element.classList.remove('sentry-redacted-field');
  }

  isCurrentlySanitized = false;
  vaultInstance.reset();
  trackedElements.clear();
  console.log('[SentryAgent] Rolled back DOM to original unredacted state.');
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
  `;
  document.head.appendChild(style);
}

// Message Listener from Extension Popup / Background Worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_AND_SANITIZE') {
    const requestedLevel = message.disclosureLevel || 'AUTO';
    scanAndSanitizePage(requestedLevel).then((report) => {
      sendResponse({ success: true, report });
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
    runAutonomousStep().then((res) => {
      sendResponse(res);
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
});

console.log('[SentryAgent] Content Script v2 (Dual-Track + Risk Gate) loaded on', window.location.href);
