import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

// 1. Verhoeff Tables & Algorithm
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

function validateVerhoeff(numStr) {
  const clean = numStr.replace(/\s+/g, '');
  if (!/^\d{12}$/.test(clean)) return false;
  let c = 0;
  const digits = clean.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}

// 2. Luhn Algorithm
function validateLuhn(cardStr) {
  const clean = cardStr.replace(/[\s-]+/g, '');
  if (!/^\d{13,19}$/.test(clean)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// 3. Indian PAN
const VALID_PAN_ENTITY_TYPES = new Set(['P', 'C', 'H', 'A', 'B', 'G', 'J', 'L', 'F', 'T']);
function validatePAN(panStr) {
  const clean = panStr.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return false;
  return VALID_PAN_ENTITY_TYPES.has(clean.charAt(3));
}

// 4. Indian GSTIN
function validateGSTIN(gstinStr) {
  const clean = gstinStr.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) return false;
  return validatePAN(clean.substring(2, 12));
}

// 5. Inversion Vault Simulation
class TestVault {
  constructor() {
    this.vault = new Map();
    this.reverse = new Map();
    this.counter = 0;
  }
  tokenize(realVal, type) {
    if (this.reverse.has(realVal)) return this.reverse.get(realVal);
    this.counter++;
    const token = `<${type}_ID_${this.counter}>`;
    this.vault.set(token, realVal);
    this.reverse.set(realVal, token);
    return token;
  }
  rehydrate(text) {
    let res = text;
    for (const [token, real] of this.vault.entries()) {
      res = res.split(token).join(real);
    }
    return res;
  }
}

// 6. Fail-Closed Egress Verifier Simulation
function verifyAndSealOutbound(nodes, knownRealValues, canary) {
  const serialized = JSON.stringify(nodes);
  if (serialized.includes(canary)) {
    return { success: false, error: 'Canary detected in wire payload' };
  }
  for (const realVal of knownRealValues) {
    if (realVal.length >= 5 && serialized.includes(realVal)) {
      return { success: false, error: `Residual PII detected: ${realVal}` };
    }
  }
  const digest = crypto.createHash('sha256').update(serialized).digest('hex');
  return { success: true, digest, nodeCount: nodes.length };
}

// =================== TEST SUITE ===================

test('Verhoeff Checksum: Validates genuine Aadhaar numbers', () => {
  assert.strictEqual(validateVerhoeff('9999 9999 0019'), true, 'Known valid Aadhaar with spacing');
  assert.strictEqual(validateVerhoeff('999999990019'), true, 'Known valid Aadhaar without spacing');
});

test('Verhoeff Checksum: Rejects invalid or corrupted 12-digit numbers', () => {
  assert.strictEqual(validateVerhoeff('999999990018'), false, 'Corrupted checksum digit');
  assert.strictEqual(validateVerhoeff('999999990109'), false, 'Transposition error must be caught');
  assert.strictEqual(validateVerhoeff('123456789'), false, 'Too short');
  assert.strictEqual(validateVerhoeff('abcdefghijkl'), false, 'Non-digits');
});

test('Luhn Checksum: Correctly identifies valid and invalid payment cards', () => {
  assert.strictEqual(validateLuhn('4532 0151 1283 0366'), true, 'Valid Visa test card');
  assert.strictEqual(validateLuhn('4532015112830366'), true, 'Valid card unspaced');
  assert.strictEqual(validateLuhn('4532015112830367'), false, 'Altered digit fails Luhn');
  assert.strictEqual(validateLuhn('1234'), false, 'Too short to be card');
});

test('PAN Validator: Enforces 10-char format and valid entity character', () => {
  assert.strictEqual(validatePAN('AAACA7890B'), true, 'Company PAN');
  assert.strictEqual(validatePAN('ABCDE1234F'), false, 'D is not a valid 4th entity char');
  assert.strictEqual(validatePAN('ABCPD1234F'), true, 'Individual P PAN');
  assert.strictEqual(validatePAN('INVALID_PAN'), false, 'Invalid shape');
});

test('GSTIN Validator: Verifies structure and embedded PAN', () => {
  assert.strictEqual(validateGSTIN('29AAACA7890B1Z5'), true, 'Valid Karnataka GSTIN with Company PAN');
  assert.strictEqual(validateGSTIN('29ABCDE1234F1Z5'), false, 'Fails because embedded PAN is invalid');
  assert.strictEqual(validateGSTIN('12345'), false, 'Malformed GSTIN');
});

test('Local Inversion Vault: Tokenization, consistency, and safe rehydration', () => {
  const vault = new TestVault();
  const token1 = vault.tokenize('999999990019', 'AADHAAR');
  assert.strictEqual(token1, '<AADHAAR_ID_1>');

  const token2 = vault.tokenize('999999990019', 'AADHAAR');
  assert.strictEqual(token2, '<AADHAAR_ID_1>', 'Idempotent tokenization');

  const token3 = vault.tokenize('AAACA7890B', 'PAN');
  assert.strictEqual(token3, '<PAN_ID_2>');

  const serverPlan = 'Submitting form with AADHAAR: <AADHAAR_ID_1> and PAN: <PAN_ID_2>';
  const executedPayload = vault.rehydrate(serverPlan);
  assert.strictEqual(
    executedPayload,
    'Submitting form with AADHAAR: 999999990019 and PAN: AAACA7890B',
    'Local rehydration should faithfully restore values'
  );
});

test('Fail-Closed Egress Verifier: Rejects canary strings and residual raw PII', () => {
  const canary = 'CANARY_SECRET_XYZ';
  const realPiiList = ['999999990019', 'AAACA7890B'];

  // Test 1: Payload containing canary fails closed
  const leakedCanaryPayload = [{ opaqueId: 'node_1', sanitizedLabel: `test ${canary}` }];
  const res1 = verifyAndSealOutbound(leakedCanaryPayload, realPiiList, canary);
  assert.strictEqual(res1.success, false, 'Canary leak must fail closed');

  // Test 2: Payload containing raw Aadhaar fails closed
  const leakedPiiPayload = [{ opaqueId: 'node_2', sanitizedLabel: 'Aadhaar is 999999990019' }];
  const res2 = verifyAndSealOutbound(leakedPiiPayload, realPiiList, canary);
  assert.strictEqual(res2.success, false, 'Raw PII leak must fail closed');

  // Test 3: Clean sanitized payload passes and receives valid SHA-256 seal
  const cleanPayload = [
    { opaqueId: 'node_1', sanitizedLabel: '<AADHAAR_ID_1>' },
    { opaqueId: 'node_2', sanitizedLabel: '<PAN_NO_1>' }
  ];
  const res3 = verifyAndSealOutbound(cleanPayload, realPiiList, canary);
  assert.strictEqual(res3.success, true, 'Clean payload must pass');
  assert.strictEqual(typeof res3.digest, 'string');
  assert.strictEqual(res3.digest.length, 64, 'SHA-256 hex string must be 64 chars');
});

// 7. Non-Maximum Suppression (NMS) Unit Test
function computeIoU(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.w * a.h + b.w * b.h - intersection;
  return union > 0 ? intersection / union : 0;
}

function applyNMS(boxes, iouThreshold = 0.35) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const selected = [];
  for (const box of sorted) {
    if (!selected.some(sel => computeIoU(box, sel) > iouThreshold)) {
      selected.push(box);
    }
  }
  return selected;
}

test('Non-Maximum Suppression (NMS): Deduplicates overlapping anchor bounding boxes', () => {
  const rawBoxes = [
    { x: 50, y: 50, w: 40, h: 40, score: 0.95 },
    { x: 52, y: 51, w: 38, h: 39, score: 0.88 }, // highly overlapping (IoU > 0.8)
    { x: 53, y: 49, w: 41, h: 40, score: 0.72 }, // highly overlapping
    { x: 150, y: 150, w: 40, h: 40, score: 0.90 } // distinct non-overlapping face
  ];
  const filtered = applyNMS(rawBoxes, 0.35);
  assert.strictEqual(filtered.length, 2, 'Should deduplicate 3 overlapping anchor boxes into 1 top box, leaving 2 distinct faces');
  assert.strictEqual(filtered[0].score, 0.95, 'Top confidence box must be preserved');
  assert.strictEqual(filtered[1].score, 0.90, 'Separate face box must be preserved');
});

// 8. Connected-Component Labeling (CCL) for DBNet Text Clustering
function extractTextRegionsCCL(probMap, mapW, mapH, textThreshold = 0.35, minPixelCount = 5) {
  const visited = new Uint8Array(mapW * mapH);
  const detectedRegions = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1]
  ];

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const idx = y * mapW + x;
      if (visited[idx] || probMap[idx] < textThreshold) continue;

      const queue = [x, y];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;
      let pixelCount = 0;
      let head = 0;

      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];
        pixelCount++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let i = 0; i < 8; i++) {
          const nx = cx + neighbors[i][0];
          const ny = cy + neighbors[i][1];
          if (nx >= 0 && nx < mapW && ny >= 0 && ny < mapH) {
            const nIdx = ny * mapW + nx;
            if (!visited[nIdx] && probMap[nIdx] >= textThreshold) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }

      if (pixelCount >= minPixelCount) {
        detectedRegions.push({
          x: minX,
          y: minY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
          pixelCount
        });
      }
    }
  }
  return detectedRegions;
}

test('Connected-Component Labeling (CCL): Separates multiple distinct text clusters instead of 1 giant box', () => {
  const mapW = 64;
  const mapH = 32;
  const probMap = new Float32Array(mapW * mapH);

  // Cluster 1: Left signature block (x: 5..15, y: 10..15)
  for (let y = 10; y <= 15; y++) {
    for (let x = 5; x <= 15; x++) {
      probMap[y * mapW + x] = 0.88;
    }
  }

  // Cluster 2: Right date stamp block (x: 45..55, y: 10..15)
  for (let y = 10; y <= 15; y++) {
    for (let x = 45; x <= 55; x++) {
      probMap[y * mapW + x] = 0.91;
    }
  }

  const clusters = extractTextRegionsCCL(probMap, mapW, mapH);
  assert.strictEqual(clusters.length, 2, 'Must yield exactly 2 independent text region bounding boxes');

  // Verify left cluster bounds
  assert.strictEqual(clusters[0].x, 5);
  assert.strictEqual(clusters[0].w, 11);

  // Verify right cluster bounds
  assert.strictEqual(clusters[1].x, 45);
  assert.strictEqual(clusters[1].w, 11);

  // Verify middle zone (x: 16..44) is completely unredacted (high precision of redaction)
  const middleWidth = clusters[1].x - (clusters[0].x + clusters[0].w);
  assert.strictEqual(middleWidth, 29, 'Middle 29 pixels must be preserved without over-blacking');
});

// 9. Self-Healing Egress Auditor: Mathematical Confidence & Dynamic Workflow
function calculatePrivacyConfidence(canaryViolation, residualPiiCount, highEntropyCount) {
  let c = 1.0;
  if (canaryViolation) c -= 1.0;
  c -= residualPiiCount * 0.40;
  c -= highEntropyCount * 0.10;
  return Math.round(Math.max(0.0, Math.min(1.0, c)) * 100) / 100;
}

test('Self-Healing Privacy Auditor: Calculates Confidence Score (C_privacy) & directs adaptive workflow', () => {
  // Scenario A: Completely clean payload
  const cleanScore = calculatePrivacyConfidence(false, 0, 0);
  assert.strictEqual(cleanScore, 1.0, 'Clean payload must receive 100% confidence');

  // Scenario B: Marginal confidence (e.g. 1 high-entropy string) -> Self-Healing range (80% - 98%)
  const healingScore = calculatePrivacyConfidence(false, 0, 1);
  assert.strictEqual(healingScore, 0.90, 'Single high-entropy string triggers 90% confidence (Self-Healing tier)');
  assert.ok(healingScore >= 0.80 && healingScore < 0.98, 'Must route to autonomous 2nd pass');

  // Scenario C: Severe residual leak -> Downgrade / Block tier
  const leakScore = calculatePrivacyConfidence(false, 2, 0);
  assert.strictEqual(leakScore, 0.20, 'Unmasked PII triggers <80% confidence');
  assert.ok(leakScore < 0.80, 'Must trigger visual strip and downgrade to DOM L1');

  // Scenario D: Canary breach -> Fatal block
  const fatalScore = calculatePrivacyConfidence(true, 0, 0);
  assert.strictEqual(fatalScore, 0.0, 'Canary violation must immediately drop score to 0.0');
});

// 10. Dual-Track Static Generalization: Financial & Regulatory Amounts
function generalizeFinancialAmount(str) {
  const match = str.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i);
  if (!match) return str;
  const num = parseFloat(match[1].replace(/,/g, ''));
  let bracket = 'TIER_1_STANDARD';
  if (num >= 10000000) bracket = 'TIER_4_STRATEGIC_CRORE';
  else if (num >= 2500000) bracket = 'TIER_3_HIGH_VALUE_LAKH';
  else if (num >= 500000) bracket = 'TIER_2_MID_SCALE';
  return `<VAL:BUDGET bracket="${bracket}">`;
}

test('Dual-Track Static Content Generalization: Maps static table/text amounts to typed functional brackets', () => {
  const tenderBid = generalizeFinancialAmount('Total Estimated Cost: ₹ 48,50,000/-');
  assert.strictEqual(tenderBid, '<VAL:BUDGET bracket="TIER_3_HIGH_VALUE_LAKH">');

  const executiveSalary = generalizeFinancialAmount('Gross Compensation: INR 1,25,00,000');
  assert.strictEqual(executiveSalary, '<VAL:BUDGET bracket="TIER_4_STRATEGIC_CRORE">');

  const nonFinancial = generalizeFinancialAmount('Standard Component Serial: 99482');
  assert.strictEqual(nonFinancial, 'Standard Component Serial: 99482', 'Non-currency strings must not be over-redacted');
});



