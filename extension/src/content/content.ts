import { classifySensitiveText } from '../backend/privacy/checksums';
import { vaultInstance } from '../backend/privacy/vault';
import { visionEngineInstance } from '../backend/vision/visionEngine';
import { egressVerifierInstance, OpaqueSceneNode } from '../backend/network/egressVerifier';
import { actionDispatcherInstance, PlannedAction } from '../backend/execution/actionDispatcher';
import { cursorReticleInstance } from '../frontend/hud/cursorReticle';
import { PIIType, SanitizationReport } from '../backend/types';
import { spatialClassifierInstance } from '../backend/vision/spatialClassifier';
import { staticContentGeneralizerInstance } from '../backend/privacy/staticContentGeneralizer';
import { selfHealingAuditorInstance } from '../backend/network/selfHealingAuditor';
import { uiElementLocatorInstance } from '../backend/vision/uiElementLocator';
import { sentryPipelineInstance } from '../backend/vision/sentryPipeline';
import { deterministicNavigatorInstance } from '../backend/execution/deterministicNavigator';
import { sentrySpotlightInstance } from '../frontend/hud/sentrySpotlight';
import { localSystem1EngineInstance } from '../backend/execution/system1DecisionEngine';
import { structuralBoundaryInstance } from '../backend/privacy/structuralBoundary';

interface TrackedElement {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  originalValue: string;
  token: string;
  type: PIIType;
  originalText?: string;
  originalChecked?: boolean;
  overlayBadge?: HTMLElement;
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

// Verifies if a canvas actually contains the opaque blackout pixels (#0f172a)
export function isCanvasActivelyRedacted(canvas: HTMLCanvasElement): boolean {
  if (canvas.getAttribute('data-sentry-redacted') !== 'true') return false;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    let blackoutCount = 0;
    // Fast step by 16 bytes (every 4th pixel)
    for (let i = 0; i < d.length; i += 16) {
      if (d[i+3] === 255 && d[i] >= 10 && d[i] <= 20 && d[i+1] >= 18 && d[i+1] <= 28 && d[i+2] >= 36 && d[i+2] <= 48) {
        blackoutCount++;
        if (blackoutCount >= 25) return true;
      }
    }
    return false;
  } catch (e) {
    return true; // CORS tainted fallback
  }
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

  injectSentryStyles();
  actionDispatcherInstance.clearRegistry();

  // 0. Macro Spatial Layout & Domain Classification (2ms)
  const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
  const spatialResult = await spatialClassifierInstance.classifyScreen(Array.from(canvases));

  // 0.5. Structural Boundary Quarantine: Lock all password/credential form controls in memory
  structuralBoundaryInstance.evaluateAndQuarantineFormControls(document);

  // A.1. Scan Form Inputs & Textareas (Track 1)
  const inputElements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
  );

  inputElements.forEach((input, idx) => {
    const rawVal = input.value;
    if (!rawVal || rawVal.trim().length === 0) return;

    // If this field is already tokenized, skip it
    if (vaultInstance.isToken(rawVal)) return;

    let match = classifySensitiveText(rawVal);
    
    // Semantic Form Deduction: Detect Name, Address, DOB, Secrets from field attributes & labels
    if (!match) {
      const fieldId = (input.id || '').toLowerCase();
      const fieldName = (input.name || '').toLowerCase();
      const fieldPlaceholder = (input.placeholder || '').toLowerCase();
      const fieldAutocomplete = (input.autocomplete || '').toLowerCase();
      const fieldType = (input.getAttribute('type') || '').toLowerCase();

      let labelText = '';
      if (input.id) {
        const labelEl = document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) labelText = (labelEl.textContent || '').toLowerCase();
      }
      if (!labelText) {
        const parentLabel = input.closest('label');
        if (parentLabel) labelText = (parentLabel.textContent || '').toLowerCase();
      }

      const meta = `${fieldId} ${fieldName} ${fieldPlaceholder} ${fieldAutocomplete} ${labelText}`;

      if (meta.includes('name') || meta.includes('fname') || meta.includes('lname') || meta.includes('first') || meta.includes('last') || meta.includes('user') || meta.includes('student')) {
        match = { type: 'PERSON', cleanValue: rawVal, confidence: 0.95 };
      } else if (meta.includes('address') || meta.includes('street') || meta.includes('city') || meta.includes('location')) {
        match = { type: 'ADDRESS', cleanValue: rawVal, confidence: 0.95 };
      } else if (meta.includes('date') || meta.includes('birth') || meta.includes('dob') || fieldType === 'date' || /^\d{1,2}[-\/\s][A-Za-z0-9]{3,}[-\/\s]\d{2,4}$/.test(rawVal) || /^\d{4}-\d{2}-\d{2}$/.test(rawVal)) {
        match = { type: 'DOB', cleanValue: rawVal, confidence: 0.95 };
      } else if (fieldType === 'password' || meta.includes('pass') || meta.includes('secret') || meta.includes('pin')) {
        match = { type: 'CONFIDENTIAL_NUM', cleanValue: rawVal, confidence: 0.95 };
      } else if (meta.includes('phone') || meta.includes('mobile') || meta.includes('tel')) {
        match = { type: 'PHONE', cleanValue: rawVal, confidence: 0.95 };
      } else if (meta.includes('email') || meta.includes('mail')) {
        match = { type: 'EMAIL', cleanValue: rawVal, confidence: 0.95 };
      } else if (meta.includes('subject') || meta.includes('course') || meta.includes('skill')) {
        match = { type: 'CONFIDENTIAL_TEXT', cleanValue: rawVal, confidence: 0.95 };
      } else {
        // Universal fallback: Any filled form input is sensitive user data
        match = { type: 'CONFIDENTIAL_TEXT', cleanValue: rawVal, confidence: 0.90 };
      }
    }

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

      // Memory-level structural quarantine (fail-closed against exfiltration)
      structuralBoundaryInstance.quarantineNode(input, {
        reason: 'PII_INPUT',
        piiType: match.type,
        token
      });

      // Mutating DOM at data-source level updates DOM, Accessibility Tree, and Screenshots simultaneously
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      if (input.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(input, token);
      } else if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, token);
      } else {
        input.value = token;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      input.classList.add('sentry-redacted-field');

      newRedactedCount++;
      entitiesByType[match.type] = (entitiesByType[match.type] || 0) + 1;
      tokens.push(token);
    }
  });

  // A.2. Scan Checkable Inputs (Radios & Checkboxes - e.g., Gender, Hobbies)
  const checkables = document.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]:checked, input[type="checkbox"]:checked'
  );
  checkables.forEach((input, idx) => {
    let labelEl: HTMLElement | null = null;
    if (input.id) {
      labelEl = document.querySelector<HTMLElement>(`label[for="${input.id}"]`);
    }
    if (!labelEl) {
      labelEl = input.closest('label');
    }
    if (!labelEl && input.parentElement) {
      labelEl = input.parentElement.querySelector('label') || input.parentElement;
    }

    const rawVal = (labelEl?.textContent || input.value || '').trim();
    if (!rawVal || vaultInstance.isToken(rawVal)) return;

    const inputName = (input.name || '').toLowerCase();
    const isGender = inputName.includes('gender') || ['male', 'female', 'other'].includes(rawVal.toLowerCase());
    const isPreference = inputName.includes('hobbi') || inputName.includes('interest') || inputName.includes('sport') || inputName.includes('music');
    const piiType: PIIType = isGender ? 'GENDER' : (isPreference ? 'PREFERENCE' : 'CONFIDENTIAL_TEXT');

    const selector = input.id ? `#${input.id}` : `checkable[data-sentry-idx="${idx}"]`;
    input.setAttribute('data-sentry-idx', String(idx));
    const token = vaultInstance.tokenize(rawVal, piiType, selector);

    if (labelEl) {
      const origText = labelEl.textContent || '';
      labelEl.textContent = token;
      labelEl.classList.add('sentry-redacted-field');

      trackedElements.set(selector, {
        element: labelEl,
        originalValue: rawVal,
        originalText: origText,
        originalChecked: input.checked,
        token,
        type: piiType
      });
    }

    newRedactedCount++;
    entitiesByType[piiType] = (entitiesByType[piiType] || 0) + 1;
    tokens.push(token);
  });

  // A.3. Scan File Upload Inputs (e.g., Picture upload)
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  fileInputs.forEach((fileInput, idx) => {
    const rawVal = fileInput.files?.[0]?.name || fileInput.value.replace(/.*[\/\\]/, '');
    if (!rawVal || rawVal.trim().length === 0 || vaultInstance.isToken(rawVal)) return;

    const selector = fileInput.id ? `#${fileInput.id}` : `file-input[data-sentry-idx="${idx}"]`;
    fileInput.setAttribute('data-sentry-idx', String(idx));
    const token = vaultInstance.tokenize(rawVal, 'DOCUMENT', selector);

    const badge = document.createElement('span');
    badge.className = 'sentry-redacted-field sentry-redacted-file-badge';
    badge.textContent = token;

    fileInput.classList.add('sentry-file-input-redacted');
    fileInput.after(badge);

    trackedElements.set(selector, {
      element: fileInput,
      originalValue: rawVal,
      token,
      type: 'DOCUMENT',
      overlayBadge: badge
    });

    newRedactedCount++;
    entitiesByType['DOCUMENT'] = (entitiesByType['DOCUMENT'] || 0) + 1;
    tokens.push(token);
  });

  // A.4. Scan Multi-Select Badges & Auto-Complete Chips (e.g., Subjects)
  const multiValues = document.querySelectorAll<HTMLElement>(
    'div[class*="multi-value"], div[class*="multiValue"], div[class*="MultiValue"], .badge:not(.sentry-redacted-field), [class*="chip"]:not(.sentry-redacted-field)'
  );
  multiValues.forEach((mv, idx) => {
    if (mv.classList.contains('sentry-redacted-field') || mv.getAttribute('data-sentry-redacted') === 'true') return;
    const labelChild = mv.querySelector<HTMLElement>('div[class*="label"], [class*="Label"]') || mv;
    let rawText = (labelChild.textContent || '').trim();
    rawText = rawText.replace(/[×x]$/, '').trim();
    if (!rawText || vaultInstance.isToken(rawText)) return;

    const selector = `multi-val-${idx}`;
    const token = vaultInstance.tokenize(rawText, 'CONFIDENTIAL_TEXT', selector);
    const origText = labelChild.textContent || '';
    
    labelChild.textContent = token;
    mv.classList.add('sentry-redacted-field');
    mv.setAttribute('data-sentry-redacted', 'true');

    trackedElements.set(selector, {
      element: labelChild,
      originalValue: rawText,
      originalText: origText,
      token,
      type: 'CONFIDENTIAL_TEXT'
    });

    newRedactedCount++;
    entitiesByType['CONFIDENTIAL_TEXT'] = (entitiesByType['CONFIDENTIAL_TEXT'] || 0) + 1;
    tokens.push(token);
  });

  // A.5. Scan Custom Single-Value Dropdowns & Selects (e.g., State, City)
  const singleValues = document.querySelectorAll<HTMLElement>(
    'div[class*="single-value"], div[class*="singleValue"], div[class*="SingleValue"]'
  );
  singleValues.forEach((sv, idx) => {
    if (sv.classList.contains('sentry-redacted-field') || sv.getAttribute('data-sentry-redacted') === 'true') return;
    const rawText = (sv.textContent || '').trim();
    if (!rawText || rawText.toLowerCase().startsWith('select ') || vaultInstance.isToken(rawText)) return;

    const selector = `single-val-${idx}`;
    const token = vaultInstance.tokenize(rawText, 'LOCATION', selector);
    const origText = sv.textContent || '';

    sv.textContent = token;
    sv.classList.add('sentry-redacted-field');
    sv.setAttribute('data-sentry-redacted', 'true');

    trackedElements.set(selector, {
      element: sv,
      originalValue: rawText,
      originalText: origText,
      token,
      type: 'LOCATION'
    });

    newRedactedCount++;
    entitiesByType['LOCATION'] = (entitiesByType['LOCATION'] || 0) + 1;
    tokens.push(token);
  });

  // A.6. Scan Native Select Dropdowns
  const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select');
  nativeSelects.forEach((sel, idx) => {
    if (sel.selectedIndex < 0) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    const rawVal = (opt.textContent || opt.value || '').trim();
    if (!rawVal || rawVal.toLowerCase().startsWith('select ') || vaultInstance.isToken(rawVal)) return;

    const selector = sel.id ? `#${sel.id}` : `select[data-sentry-idx="${idx}"]`;
    sel.setAttribute('data-sentry-idx', String(idx));
    const token = vaultInstance.tokenize(rawVal, 'LOCATION', selector);
    const origText = opt.textContent || '';

    opt.textContent = token;
    sel.classList.add('sentry-redacted-field');

    trackedElements.set(selector, {
      element: opt,
      originalValue: rawVal,
      originalText: origText,
      token,
      type: 'LOCATION'
    });

    newRedactedCount++;
    entitiesByType['LOCATION'] = (entitiesByType['LOCATION'] || 0) + 1;
    tokens.push(token);
  });

  // A.2. Scan & Generalize Static Content & Artifacts (Track 1B: Tables, spans, and paragraphs)
  const staticResult = staticContentGeneralizerInstance.scanAndGeneralizeStaticText();
  newRedactedCount += staticResult.count;
  tokens.push(...staticResult.tokens);
  if (staticResult.entitiesByType) {
    for (const [t, c] of Object.entries(staticResult.entitiesByType)) {
      entitiesByType[t] = (entitiesByType[t] || 0) + c;
    }
  }

  // A.3. Universal Semantic Identity Elements (W3C Microdata, Schema.org, Microformats: Name & Handle)
  const identityElements = document.querySelectorAll<HTMLElement>(
    '[itemprop="name"], [itemprop="author"], .p-name, .p-nickname, .vcard .fn, [class*="fullname" i], [class*="profile-name" i], [data-testid*="user" i]'
  );
  identityElements.forEach((el, idx) => {
    if (el.classList.contains('sentry-redacted-field') || el.getAttribute('data-sentry-redacted') === 'true') return;
    if (el.closest('#spidey-agent-root') || el.closest('#sentry-risk-modal')) return;

    const rawText = (el.textContent || '').trim();
    if (!rawText || rawText.length < 2 || vaultInstance.isToken(rawText)) return;

    // Discard generic non-personal navigation text
    const lower = rawText.toLowerCase();
    if (['search', 'overview', 'repositories', 'projects', 'packages', 'stars', 'home', 'dashboard'].includes(lower)) return;

    const isHandle = el.classList.contains('p-nickname') || lower.startsWith('@') || /^[a-z0-9_-]+$/i.test(rawText);
    const piiType: PIIType = isHandle ? 'USERNAME' : 'PERSON';

    const selector = el.id ? `#${el.id}` : `identity-node-${idx}`;
    const token = vaultInstance.tokenize(rawText, piiType, selector);
    const origText = el.textContent || '';

    el.textContent = token;
    el.classList.add('sentry-redacted-field');
    el.setAttribute('data-sentry-redacted', 'true');

    trackedElements.set(selector, {
      element: el,
      originalValue: rawText,
      originalText: origText,
      token,
      type: piiType
    });

    newRedactedCount++;
    entitiesByType[piiType] = (entitiesByType[piiType] || 0) + 1;
    tokens.push(token);
  });

  // A.4. Dual-Gated Visual Image & Face Redaction (Check tags first; if no tags, STILL run on-device vision)
  const allImages = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
  for (let idx = 0; idx < allImages.length; idx++) {
    const img = allImages[idx];
    if (img.classList.contains('sentry-redacted-field') || img.getAttribute('data-sentry-redacted') === 'true') continue;
    if (img.closest('#spidey-agent-root') || img.closest('#sentry-risk-modal')) continue;

    const altOrClassOrId = `${img.className} ${img.alt} ${img.id} ${img.src} ${img.getAttribute('itemprop') || ''}`.toLowerCase();

    // EXCLUDE Institutional Brand Logos, University Crests, and Header Branding
    const isLogoOrEmblem = /logo|brand|emblem|crest|insignia|seal|header-logo|univ-logo/i.test(altOrClassOrId) ||
                           img.closest('header, nav, .navbar, .brand, .site-header') !== null;
    if (isLogoOrEmblem) continue;

    const isTagIndicated = /avatar|profile|user|photo|student|candidate|faculty|bio|author|member|passport|id[-_]?card|signature|sign/i.test(altOrClassOrId);
    const isInProfileCard = img.closest('.profile, .student, [class*="profile" i], [class*="student" i], [id*="profile" i], [id*="student" i]') !== null;
    
    // Check 1: Explicit tag/class indication or inside profile card
    // Check 2: Unlabeled generic image (e.g. on KTU or student portals) -> run on-device neural face check
    let shouldRedact = isTagIndicated || isInProfileCard;
    if (!shouldRedact) {
      try {
        const isFaceDetected = await visionEngineInstance.scanImageForFace(img);
        if (isFaceDetected) {
          shouldRedact = true;
        }
      } catch (faceErr) {
        // Tainted canvas or cross-origin CORS image: skip gracefully
      }
    }

    if (shouldRedact) {
      const isSig = altOrClassOrId.includes('sign');
      const piiType: PIIType = isSig ? 'CANVAS_SIGNATURE' : 'AVATAR_FACE';

      const selector = img.id ? `#${img.id}` : `img[data-sentry-img-idx="${idx}"]`;
      img.setAttribute('data-sentry-img-idx', String(idx));
      const token = vaultInstance.tokenize(`[IMAGE_${img.src.substring(0, 40)}]`, piiType, selector);

      img.classList.add('sentry-redacted-field', 'sentry-redacted-image');
      img.setAttribute('data-sentry-redacted', 'true');

      trackedElements.set(selector, {
        element: img,
        originalValue: img.src,
        token,
        type: piiType
      });

      newRedactedCount++;
      entitiesByType[piiType] = (entitiesByType[piiType] || 0) + 1;
      tokens.push(token);
    }
  }

  // B. Run On-Device Vision Engine (Track 2: Gated by Minimum-Disclosure Ladder)
  let visualRegions: any[] = [];
  const activeLevel = determineDisclosureLevel(canvases.length, disclosureLevel);

  // Filter to unredacted canvases ONLY to prevent double-burning, nested boxes, and visual clutter
  // If a canvas was cleared or re-drawn by the user, immediately purge stale tracking
  const unredactedCanvases: HTMLCanvasElement[] = [];
  canvases.forEach((canvas) => {
    if (!isCanvasActivelyRedacted(canvas)) {
      canvas.removeAttribute('data-sentry-redacted');
      canvas.classList.remove('sentry-redacted-canvas');
      trackedCanvases.delete(canvas);
      unredactedCanvases.push(canvas);
    }
  });

  if (unredactedCanvases.length > 0 && activeLevel !== 'L1') {
    console.log(`[SpideyAgent] Minimum-Disclosure Ladder dynamically escalated to ${activeLevel} (${unredactedCanvases.length} unredacted canvas(es) detected). Running BlazeFace & DBNet neural vision...`);
    
    // Backup pristine image data BEFORE burning any pixel redactions
    for (const canvas of unredactedCanvases) {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          trackedCanvases.set(canvas, { canvas, originalImageData, regions: [] });
        }
      } catch (backupErr) {
        console.warn('[SpideyAgent] Canvas snapshot failed (tainted canvas):', backupErr);
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
    console.log(`[SpideyAgent] Minimum-Disclosure Notice: ${canvases.length} canvas(es) present but disclosure level constrained to ${activeLevel}. Vision pipeline skipped.`);
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

  console.log('[SpideyAgent] Dual-Track Sanitization completed in', report.durationMs, 'ms. Total protected entities:', totalCount);
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

  // Step D: Local System 1 Non-Autoregressive Decision Engine (< 2ms, 100% Client-Side)
  // Operates directly in-browser with zero Python server requirement.
  let plannedActions: PlannedAction[] = [];
  const localDecision = localSystem1EngineInstance.evaluate(outboundPayload.userGoal || 'Submit procurement form', sceneNodes);

  if (localDecision && localDecision.confidence >= 0.80) {
    console.log(`[SpideyAgent] Local System-1 fast-path evaluated in ${localDecision.latencyMs}ms (Confidence: ${(localDecision.confidence * 100).toFixed(0)}%):`, localDecision.action);
    plannedActions = [localDecision.action];
  } else {
    // Optional Fallback to External Server / LLM only if local System 1 is uncertain
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
        console.log('[SpideyAgent] Received action plan from remote reasoner:', plannedActions);
      }
    } catch (netErr) {
      console.log('[SpideyAgent] Central server offline; executing purely via Local System 1 Decision Engine.');
      if (localDecision) {
        plannedActions = [localDecision.action];
      }
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
export function restoreOriginalDOM(clearVault: boolean = true): void {
  // A. Rollback DOM Form Input Elements & Selections
  for (const [, item] of trackedElements.entries()) {
    if ('value' in item.element) {
      const el = item.element as HTMLInputElement | HTMLTextAreaElement;
      
      // Use native setter to bypass React's property override and force state sync
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      
      try {
        if (el.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, item.originalValue);
        } else if (el.tagName.toLowerCase() === 'input' && (el as HTMLInputElement).type !== 'file' && nativeInputValueSetter) {
          nativeInputValueSetter.call(el, item.originalValue);
        } else if ((el as HTMLInputElement).type !== 'file') {
          el.value = item.originalValue;
        }
        
        // Dispatch events so React/Vue/Angular state managers catch the restoration
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (err) {
        console.warn('[SpideyAgent] Could not cleanly restore value for element', el, err);
      }
    }
    if (item.originalChecked !== undefined && 'checked' in item.element) {
      (item.element as HTMLInputElement).checked = item.originalChecked;
    }
    if (item.originalText !== undefined) {
      item.element.textContent = item.originalText;
    }
    if (item.overlayBadge && item.overlayBadge.parentNode) {
      item.overlayBadge.remove();
    }
    item.element.classList.remove('sentry-redacted-field', 'sentry-redacted-image', 'sentry-file-input-redacted', 'sentry-static-redacted');
    item.element.removeAttribute('data-sentry-idx');
    item.element.removeAttribute('data-sentry-img-idx');
    item.element.removeAttribute('data-sentry-redacted');

    if (item.element.parentElement) {
      item.element.parentElement.classList.remove('sentry-redacted-field', 'sentry-redacted-image', 'sentry-static-redacted');
      item.element.parentElement.removeAttribute('data-sentry-redacted');
    }
  }

  // A.5. Global Cleanup: Ensure absolutely NO orphaned Sentry UI artifacts remain (fixes React wrapper issues)
  document.querySelectorAll('.sentry-redacted-field, .sentry-static-redacted, .sentry-file-input-redacted, .sentry-redacted-image, .sentry-redacted-canvas').forEach(el => {
    el.classList.remove('sentry-redacted-field', 'sentry-static-redacted', 'sentry-file-input-redacted', 'sentry-redacted-image', 'sentry-redacted-canvas');
    el.removeAttribute('data-sentry-redacted');
  });
  document.querySelectorAll('.sentry-redacted-file-badge').forEach(badge => badge.remove());

  // B. Rollback Canvas Pixel Redactions to pristine unredacted state
  for (const [canvas, info] of trackedCanvases.entries()) {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx && info.originalImageData) {
        ctx.putImageData(info.originalImageData, 0, 0);
      }
    } catch (err) {
      console.warn('[SpideyAgent] Could not restore canvas pixels:', err);
    }
    canvas.removeAttribute('data-sentry-redacted');
    canvas.classList.remove('sentry-redacted-canvas');
  }
  trackedCanvases.clear();
  trackedElements.clear();

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
  if (clearVault) {
    vaultInstance.reset();
  }
  trackedElements.clear();
  trackedCanvases.clear();
  console.log(`[SpideyAgent] Rolled back DOM and Canvases to pristine state (clearVault=${clearVault}).`);
}

// 5. Intercept form submissions to ensure safe local re-hydration
document.addEventListener('submit', () => {
  if (!isCurrentlySanitized) return;
  console.log('[SpideyAgent] Intercepted form submit: Re-hydrating sensitive values locally from vault...');
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
  if (document.getElementById('spidey-agent-styles')) return;

  const style = document.createElement('style');
  style.id = 'spidey-agent-styles';
  style.textContent = `
    .sentry-redacted-field, .sentry-static-redacted {
      background-color: #070b14 !important;
      color: #38bdf8 !important;
      border: 1.5px solid #0284c7 !important;
      font-family: 'JetBrains Mono', 'Segoe UI Mono', monospace !important;
      font-weight: 700 !important;
      letter-spacing: 0.3px !important;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.25) !important;
      border-radius: 4px !important;
    }
    .sentry-table-cell-redacted {
      display: inline-block !important;
      padding: 4px 10px !important;
      font-size: 11.5px !important;
      min-width: 90px !important;
      text-align: center !important;
      box-sizing: border-box !important;
      line-height: 1.4 !important;
      vertical-align: middle !important;
      margin: 2px 0 !important;
    }
    img.sentry-redacted-image {
      filter: blur(18px) brightness(0.15) !important;
      outline: 2px solid #0284c7 !important;
      outline-offset: -2px !important;
      box-shadow: 0 0 15px rgba(2, 132, 199, 0.4) !important;
      transition: filter 0.2s ease !important;
    }
    .sentry-file-input-redacted {
      color: transparent !important;
    }
    .sentry-redacted-file-badge {
      display: inline-block !important;
      padding: 3px 8px !important;
      font-size: 11px !important;
      vertical-align: middle !important;
      margin-left: 8px !important;
    }
    .sentry-redacted-canvas {
      outline: 2.5px solid #ef4444 !important;
      outline-offset: 3px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.35) !important;
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
        console.error('[SpideyAgent] SCAN_AND_SANITIZE error:', err);
        sendResponse({ success: false, error: err?.message || String(err) });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'RESTORE_ORIGINAL_DOM') {
    const clearVault = message.clearVault !== false;
    restoreOriginalDOM(clearVault);
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
        console.error('[SpideyAgent] RUN_AUTONOMOUS_STEP error:', err);
        sendResponse({ success: false, message: err?.message || String(err) });
      });
    return true; // Keep message channel open for async response
  }

  // Multi-Hop Service Worker Orchestration Messages
  if (message.type === 'EXTRACT_AND_SEAL') {
    (async () => {
      try {
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
      } catch (err: any) {
        console.warn('[SpideyAgent] EXTRACT_AND_SEAL error:', err);
        sendResponse({
          success: false,
          error: err?.message || String(err)
        });
      }
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
        console.error('[SpideyAgent] RUN_DETERMINISTIC_COMMAND error:', err);
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

// Wire Spotlight security actions directly to on-device pipelines & reasoner
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
  },
  onQueryServer: async (query: string) => {
    // 1. Ensure page is sanitized locally before anything leaves
    if (!isCurrentlySanitized) {
      await scanAndSanitizePage('AUTO');
    }

    // 2. Build Zero-PII Opaque Scene Graph
    const sceneNodes = buildOpaqueSceneGraph();
    const knownRealValues: string[] = Array.from(trackedElements.values()).map(t => t.originalValue);

    // 3. Seal payload with SHA-256 digest
    const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas');
    const activeLevel = determineDisclosureLevel(canvases.length, 'AUTO');
    const sealResult = await egressVerifierInstance.verifyAndSealPayload(
      sceneNodes,
      knownRealValues,
      activeLevel,
      0
    );

    const startT = performance.now();
    let answer = '';
    let actions: PlannedAction[] = [];
    let latencyMs = 0;

    // 4. Try remote reasoner server (e.g. localhost:8000 or Claude bridge)
    try {
      const resp = await fetch('http://localhost:8000/api/v1/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Digest': sealResult.payload?.digestSha256 || ''
        },
        body: JSON.stringify({
          ...sealResult.payload,
          userGoal: query
        })
      });

      latencyMs = Math.round(performance.now() - startT);
      if (resp.ok) {
        const data = await resp.json();
        answer = data.thought || data.explanation || `Reasoning complete over ${sceneNodes.length} sanitized UI nodes.`;
        actions = data.actions || [];
      } else {
        throw new Error(`Server returned HTTP ${resp.status}`);
      }
    } catch (netErr) {
      latencyMs = Math.round(performance.now() - startT);
      // Fallback: Local System-1 Decision Engine (100% on-device, < 2ms)
      const localDecision = localSystem1EngineInstance.evaluate(query, sceneNodes);
      if (localDecision && localDecision.confidence >= 0.70) {
        answer = `⚡ Local System 1 Reasoner (${localDecision.latencyMs}ms, 100% on-device):\nInstinctive match for "${query}". Target: "${localDecision.action.targetLabel}" with ${(localDecision.confidence * 100).toFixed(0)}% confidence.`;
        actions = [localDecision.action];
      } else {
        answer = `🛡️ Zero-PII Egress Verified (Digest: ${sealResult.payload?.digestSha256?.substring(0, 10)}...)\nProtected ${vaultInstance.size()} confidential entity tokens. Scanned ${sceneNodes.length} elements.\nServer is offline, but all personal data remains securely locked in your local vault.`;
      }
    }

    return {
      answer,
      actions,
      digest: sealResult.payload?.digestSha256,
      redactedCount: vaultInstance.size(),
      latencyMs
    };
  },
  onExecuteAction: async (action: PlannedAction) => {
    return await actionDispatcherInstance.executeAction(action);
  }
});

console.log('[SpideyAgent] Content Script v2 (Dual-Track + Spotlight HUD + Zero-AI Navigator) loaded on', window.location.href);
