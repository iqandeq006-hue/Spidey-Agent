import test from 'node:test';
import assert from 'node:assert';

// Standalone Vault test harness matching extension/src/privacy/vault.ts
class TestSecureVault {
  constructor() {
    this.vault = new Map();
    this.reverseIndex = new Map();
    this.counters = new Map();
    this.SECRET_TYPES = new Set(['PASSWORD', 'OTP', 'CVV', 'CONFIDENTIAL_TEXT']);
  }

  tokenize(realValue, type, selector, origin, isSecret) {
    const trimmed = (realValue || '').trim();
    if (!trimmed) return realValue;

    const resolvedOrigin = origin || 'https://incometax.gov.in';
    const resolvedSecret = isSecret !== undefined ? isSecret : this.SECRET_TYPES.has(type);

    if (this.reverseIndex.has(trimmed)) {
      return this.reverseIndex.get(trimmed);
    }

    const nextIdx = (this.counters.get(type) || 0) + 1;
    this.counters.set(type, nextIdx);
    const token = `<${type}_ID_${nextIdx}>`;

    const entry = {
      token,
      realValue: trimmed,
      type,
      detectedAt: Date.now(),
      sourceElementSelector: selector,
      sourceOrigin: resolvedOrigin,
      isSecret: resolvedSecret
    };

    this.vault.set(token, entry);
    this.reverseIndex.set(trimmed, token);
    return token;
  }

  verifyRehydrationSecurity(token, targetOrigin, isAutonomous = true) {
    const entry = this.vault.get(token.trim());
    if (!entry) return { allowed: false, reason: 'NOT_FOUND' };

    // 1. SECRET set guard
    if (entry.isSecret && isAutonomous) {
      return { allowed: false, requiresHITL: true, reason: 'SECRET_BLOCKED', entry };
    }

    // 2. Origin Lock
    const curOrigin = targetOrigin || 'https://incometax.gov.in';
    if (entry.sourceOrigin && curOrigin && entry.sourceOrigin !== curOrigin) {
      return { allowed: false, requiresHITL: false, reason: 'ORIGIN_MISMATCH', entry };
    }

    return { allowed: true, rehydratedValue: entry.realValue, reason: 'ALLOWED', entry };
  }

  rehydrate(tokenOrText, targetOrigin, isAutonomous = false) {
    if (!tokenOrText) return tokenOrText;

    const trimmed = tokenOrText.trim();
    const direct = this.vault.get(trimmed);
    if (direct) {
      const check = this.verifyRehydrationSecurity(trimmed, targetOrigin, isAutonomous);
      return check.allowed ? direct.realValue : tokenOrText;
    }

    let result = tokenOrText;
    for (const [token, entry] of this.vault.entries()) {
      if (result.includes(token)) {
        const check = this.verifyRehydrationSecurity(token, targetOrigin, isAutonomous);
        if (check.allowed) {
          result = result.split(token).join(entry.realValue);
        }
      }
    }
    return result;
  }
}

// ================= TEST CASES =================

test('Vault Origin-Lock: Allows rehydration on matching same-origin', () => {
  const vault = new TestSecureVault();
  const token = vault.tokenize('999999990019', 'AADHAAR', '#aadhaar_input', 'https://incometax.gov.in');

  const check = vault.verifyRehydrationSecurity(token, 'https://incometax.gov.in', true);
  assert.strictEqual(check.allowed, true, 'Same origin rehydration must be permitted');
  assert.strictEqual(check.rehydratedValue, '999999990019');
});

test('Vault Origin-Lock: BLOCKS cross-origin token exfiltration attempt', () => {
  const vault = new TestSecureVault();
  // Captured on legitimate government site
  const token = vault.tokenize('999999990019', 'AADHAAR', '#aadhaar_input', 'https://incometax.gov.in');

  // Attacker site attempts to rehydrate the token
  const check = vault.verifyRehydrationSecurity(token, 'https://attacker-webhook.site', true);
  assert.strictEqual(check.allowed, false, 'Cross-origin rehydration must be strictly blocked');
  assert.strictEqual(check.reason, 'ORIGIN_MISMATCH');

  // Test rehydrate() string preservation
  const payload = vault.rehydrate(`Sending data: ${token}`, 'https://attacker-webhook.site', true);
  assert.strictEqual(payload, `Sending data: ${token}`, 'Token must not be replaced with raw value on foreign origin');
});

test('Vault SECRET Guard: Blocks autonomous agent from typing passwords and OTPs', () => {
  const vault = new TestSecureVault();
  const pwToken = vault.tokenize('SuperSecretPass123!', 'PASSWORD', '#password');
  const otpToken = vault.tokenize('784920', 'OTP', '#otp_input');

  // Autonomous attempt
  const pwCheck = vault.verifyRehydrationSecurity(pwToken, 'https://incometax.gov.in', true);
  assert.strictEqual(pwCheck.allowed, false, 'Password rehydration by autonomous bot must be blocked');
  assert.strictEqual(pwCheck.requiresHITL, true, 'Must flag that human input is required');
  assert.strictEqual(pwCheck.reason, 'SECRET_BLOCKED');

  const otpCheck = vault.verifyRehydrationSecurity(otpToken, 'https://incometax.gov.in', true);
  assert.strictEqual(otpCheck.allowed, false, 'OTP rehydration by autonomous bot must be blocked');
  assert.strictEqual(otpCheck.requiresHITL, true);

  // Manual / Human confirmation allows it
  const humanCheck = vault.verifyRehydrationSecurity(pwToken, 'https://incometax.gov.in', false);
  assert.strictEqual(humanCheck.allowed, true, 'Human manual action allowed to rehydrate');
});
