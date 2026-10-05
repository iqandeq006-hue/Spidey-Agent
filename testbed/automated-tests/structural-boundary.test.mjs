import test from 'node:test';
import assert from 'node:assert';

// Memory-level WeakSet structural boundary simulation
class TestStructuralBoundary {
  constructor() {
    this.quarantinedNodes = new WeakSet();
    this.nodeMetadata = new WeakMap();
  }

  quarantine(node, meta = {}) {
    this.quarantinedNodes.add(node);
    this.nodeMetadata.set(node, meta);
  }

  isQuarantined(node) {
    let curr = node;
    while (curr) {
      if (this.quarantinedNodes.has(curr)) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  sanitizeEgress(node, rawText) {
    if (this.isQuarantined(node)) {
      const meta = this.nodeMetadata.get(node);
      return meta?.token || '[STRUCTURALLY_QUARANTINED_NODE]';
    }
    return rawText;
  }
}

test('WeakSet Structural Boundary: Quarantines DOM node reference directly in memory', () => {
  const boundary = new TestStructuralBoundary();

  // Mock DOM elements
  const inputPassword = { tagName: 'INPUT', type: 'password', value: 'MySecretPassword123' };
  const inputSearch = { tagName: 'INPUT', type: 'text', value: 'shoes' };

  boundary.quarantine(inputPassword, { token: '<SECRET_PASSWORD_1>', piiType: 'PASSWORD' });

  assert.strictEqual(boundary.isQuarantined(inputPassword), true, 'Password input must be in quarantine');
  assert.strictEqual(boundary.isQuarantined(inputSearch), false, 'Normal search input must not be quarantined');

  // Serialization guard
  const egressText = boundary.sanitizeEgress(inputPassword, inputPassword.value);
  assert.strictEqual(egressText, '<SECRET_PASSWORD_1>', 'Raw value must be blocked by structural boundary');

  const safeEgress = boundary.sanitizeEgress(inputSearch, inputSearch.value);
  assert.strictEqual(safeEgress, 'shoes', 'Non-quarantined node passes through unchanged');
});

test('WeakSet Structural Boundary: Inherits quarantine down parent container tree', () => {
  const boundary = new TestStructuralBoundary();

  const secretForm = { id: 'secret-kyc-card', tagName: 'DIV' };
  const formRow = { tagName: 'DIV', parentNode: secretForm };
  const innerSpan = { tagName: 'SPAN', parentNode: formRow, text: 'Sensitive Detail' };

  boundary.quarantine(secretForm);

  assert.strictEqual(boundary.isQuarantined(innerSpan), true, 'Child element must inherit structural boundary protection');
});
