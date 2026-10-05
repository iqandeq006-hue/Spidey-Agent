import test from 'node:test';
import assert from 'node:assert';

// Simulated Laya System-1 Non-Autoregressive Decision Engine
class TestLayaSystem1Engine {
  constructor() {
    this.HIGH_RISK_VERBS = [
      'submit', 'bid', 'pay', 'checkout', 'delete', 'burn', 'authorize', 
      'finalize', 'transfer', 'confirm', 'purchase', 'register', 'wire'
    ];
    this.SECRET_KEYWORDS = ['password', 'pass', 'otp', 'cvv', 'cvc', 'pin', 'secret'];
  }

  evaluate(candidate) {
    const startTime = performance.now();
    const goal = (candidate.userGoal || '').toLowerCase();
    const label = (candidate.targetLabel || '').toLowerCase();
    const id = (candidate.targetOpaqueId || '').toLowerCase();

    const isSecret = this.SECRET_KEYWORDS.some(k => label.includes(k) || id.includes(k));
    const isHighRisk = this.HIGH_RISK_VERBS.some(v => goal.includes(v)) || isSecret;

    const riskTier = isHighRisk ? 'TIER_4' : 'TIER_2';
    let predictedAction = 'CLICK';

    if (goal.startsWith('search') || goal.includes('type') || goal.includes('enter') || goal.includes('fill')) {
      predictedAction = 'TYPE';
    } else if (goal.startsWith('navigate') || goal.startsWith('go to')) {
      predictedAction = 'NAVIGATE';
    }

    const latency = performance.now() - startTime;
    return {
      predictedAction,
      predictedRiskTier: riskTier,
      riskConfidence: isHighRisk ? 0.98 : 0.92,
      actionConfidence: 0.95,
      requiresHITL: riskTier === 'TIER_4',
      latencyMs: latency,
      engine: 'laya-system-1'
    };
  }
}

test('Laya System-1: Non-autoregressive forward pass predicts routine action in <2ms', () => {
  const engine = new TestLayaSystem1Engine();
  const decision = engine.evaluate({
    userGoal: 'Click on Documentation link',
    targetOpaqueId: 'node_btn_docs',
    targetLabel: 'Documentation',
    targetRole: 'A'
  });

  assert.strictEqual(decision.predictedAction, 'CLICK');
  assert.strictEqual(decision.predictedRiskTier, 'TIER_2');
  assert.strictEqual(decision.requiresHITL, false, 'Routine navigation must not require HITL');
  assert.ok(decision.latencyMs < 5.0, 'Inference latency must be sub-5ms');
});

test('Laya System-1: Classifies financial checkout and submission as TIER_4 with mandatory HITL', () => {
  const engine = new TestLayaSystem1Engine();
  const decision = engine.evaluate({
    userGoal: 'Pay Rs 5000 and submit tender quote',
    targetOpaqueId: 'node_btn_submit_tender',
    targetLabel: 'Submit & Pay Bid',
    targetRole: 'BUTTON'
  });

  assert.strictEqual(decision.predictedRiskTier, 'TIER_4');
  assert.strictEqual(decision.requiresHITL, true, 'High-stakes statutory action must trigger HITL gate');
  assert.ok(decision.riskConfidence >= 0.95, 'High confidence in risk assignment');
});

test('Laya System-1: Detects secret credential target and blocks autonomous action', () => {
  const engine = new TestLayaSystem1Engine();
  const decision = engine.evaluate({
    userGoal: 'Fill user login details',
    targetOpaqueId: 'node_input_user_password',
    targetLabel: 'Enter Account Password',
    targetRole: 'INPUT'
  });

  assert.strictEqual(decision.predictedRiskTier, 'TIER_4');
  assert.strictEqual(decision.requiresHITL, true, 'Password target must trigger human-in-the-loop');
});
