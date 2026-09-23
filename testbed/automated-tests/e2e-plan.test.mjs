import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

test('End-to-End Server Protocol: Validates SHA-256 Digest and Plans Opaque Actions', async () => {
  const nodes = [
    {
      opaqueId: 'node_btn_submit_tender',
      role: 'BUTTON',
      sanitizedLabel: 'Submit Official Tender Bid',
      interactive: true,
      boundingBox: { x: 50, y: 350, w: 220, h: 45 }
    },
    {
      opaqueId: 'node_input_quote',
      role: 'INPUT',
      sanitizedLabel: '<CONFIDENTIAL_VAL_1>',
      interactive: true,
      boundingBox: { x: 50, y: 150, w: 300, h: 40 }
    }
  ];

  const payloadString = JSON.stringify(nodes);
  const digestSha256 = crypto.createHash('sha256').update(payloadString).digest('hex');

  const wirePayload = {
    timestamp: Date.now(),
    digestSha256,
    disclosureLevel: 'L1',
    userGoal: 'Submit official tender bid',
    nodeCount: nodes.length,
    nodes
  };

  const response = await fetch('http://localhost:8000/api/v1/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Digest': digestSha256
    },
    body: JSON.stringify(wirePayload)
  });

  assert.strictEqual(response.status, 200, 'Server should respond with HTTP 200 OK');
  const data = await response.json();

  assert.strictEqual(data.status, 'SUCCESS');
  assert(Array.isArray(data.actions), 'Actions should be an array');
  assert(data.actions.length > 0, 'Should return at least one action');

  const action = data.actions[0];
  assert.strictEqual(action.targetOpaqueId, 'node_btn_submit_tender');
  assert.strictEqual(action.riskTier, 'TIER_4');
  console.log('✓ Successfully verified End-to-End wire contract against live Python server:', action);
});
