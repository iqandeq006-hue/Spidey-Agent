import test from 'node:test';
import assert from 'node:assert';

// Egress Verifier and Risk Governance Test Harness
class TestEgressGovernance {
  constructor() {
    this.canaryTokens = new Set(['CANARY_TOKEN_A', 'CANARY_SECRET_B']);
    this.quarantinedOrigins = new Set(['https://malicious-analytics.com', 'https://attacker-webhook.site']);
    this.riskTiers = {
      SCROLL: 'TIER_1',
      FOCUS: 'TIER_1',
      TYPE_NON_SENSITIVE: 'TIER_2',
      NAVIGATE: 'TIER_3',
      CLICK_SUBMIT_PAYMENT: 'TIER_4',
      FIRE_STATUTORY_ACTION: 'TIER_4'
    };
  }

  evaluateEgress(payload, destinationUrl) {
    // 1. Canary check
    for (const canary of this.canaryTokens) {
      if (payload.includes(canary)) {
        return { allowed: false, reason: 'CANARY_LEAK_DETECTED' };
      }
    }

    // 2. Untrusted origin check
    if (this.quarantinedOrigins.has(destinationUrl)) {
      return { allowed: false, reason: 'QUARANTINED_DESTINATION_BLOCKED' };
    }

    // 3. Raw 12-digit number check (Aadhaar leak guard)
    if (/(?<!\d)[2-9]\d{11}(?!\d)/.test(payload)) {
      return { allowed: false, reason: 'UNREDACTED_AADHAAR_EGRESS' };
    }

    // 4. Raw PAN check
    if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(payload)) {
      return { allowed: false, reason: 'UNREDACTED_PAN_EGRESS' };
    }

    return { allowed: true, reason: 'CLEAN_EGRESS_APPROVED' };
  }

  evaluateActionRisk(actionType, targetLabel) {
    const label = (targetLabel || '').toLowerCase();
    if (label.includes('pay') || label.includes('submit') || label.includes('confirm') || label.includes('transfer')) {
      return { tier: 'TIER_4', requiresHumanConfirmation: true };
    }
    const defaultTier = this.riskTiers[actionType] || 'TIER_2';
    return { tier: defaultTier, requiresHumanConfirmation: defaultTier === 'TIER_4' };
  }
}

test('Egress Governance: Intercepts and blocks synthetic canary tokens', () => {
  const gov = new TestEgressGovernance();
  const result = gov.evaluateEgress('Payload data CANARY_TOKEN_A end', 'https://legit-server.com');
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'CANARY_LEAK_DETECTED');
});

test('Egress Governance: Blocks communication with known attacker webhook domains', () => {
  const gov = new TestEgressGovernance();
  const result = gov.evaluateEgress('Clean sanitized payload <TOKEN_1>', 'https://attacker-webhook.site');
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'QUARANTINED_DESTINATION_BLOCKED');
});

test('Egress Governance: Blocks residual unredacted Aadhaar in outbound network stream', () => {
  const gov = new TestEgressGovernance();
  const result = gov.evaluateEgress('Sending unredacted 999999990019 to backend', 'https://agent-backend.com');
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'UNREDACTED_AADHAAR_EGRESS');
});

test('Egress Governance: Blocks residual unredacted PAN in outbound network stream', () => {
  const gov = new TestEgressGovernance();
  const result = gov.evaluateEgress('Sending unredacted AAACA7890B to backend', 'https://agent-backend.com');
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.reason, 'UNREDACTED_PAN_EGRESS');
});

test('Egress Governance: Approves sanitized tokenized opaque graphs', () => {
  const gov = new TestEgressGovernance();
  const result = gov.evaluateEgress('Sending <AADHAAR_ID_1> and <PAN_ID_2> safely', 'https://agent-backend.com');
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.reason, 'CLEAN_EGRESS_APPROVED');
});

test('Risk Governance: TIER_1 read/scroll action auto-approves without prompt', () => {
  const gov = new TestEgressGovernance();
  const risk = gov.evaluateActionRisk('SCROLL', 'Page Viewport');
  assert.strictEqual(risk.tier, 'TIER_1');
  assert.strictEqual(risk.requiresHumanConfirmation, false);
});

test('Risk Governance: TIER_4 statutory submit action triggers human confirmation', () => {
  const gov = new TestEgressGovernance();
  const risk = gov.evaluateActionRisk('CLICK_SUBMIT_PAYMENT', 'Confirm Statutory Bid & Pay');
  assert.strictEqual(risk.tier, 'TIER_4');
  assert.strictEqual(risk.requiresHumanConfirmation, true);
});

test('Risk Governance: TIER_4 bank transfer action triggers human confirmation', () => {
  const gov = new TestEgressGovernance();
  const risk = gov.evaluateActionRisk('CLICK', 'Transfer Rs 50,000 to Beneficiary');
  assert.strictEqual(risk.tier, 'TIER_4');
  assert.strictEqual(risk.requiresHumanConfirmation, true);
});

test('Risk Governance: Routine non-sensitive typing auto-approves', () => {
  const gov = new TestEgressGovernance();
  const risk = gov.evaluateActionRisk('TYPE_NON_SENSITIVE', 'Search Query Input');
  assert.strictEqual(risk.tier, 'TIER_2');
  assert.strictEqual(risk.requiresHumanConfirmation, false);
});

test('Risk Governance: Cross-domain navigation assigns TIER_3 review level', () => {
  const gov = new TestEgressGovernance();
  const risk = gov.evaluateActionRisk('NAVIGATE', 'External Site Link');
  assert.strictEqual(risk.tier, 'TIER_3');
});
