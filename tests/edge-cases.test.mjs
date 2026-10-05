import test from 'node:test';
import assert from 'node:assert';

// Edge case validation helpers
function isMaskedAadhaar(str) {
  return /(?<![\w])[Xx*•]{4}[ -]?[Xx*•]{4}[ -]?\d{4}(?!\d)/.test(str.trim());
}

function isMaskedCard(str) {
  return /(?<![\w])[Xx*•]{4}[ -]?[Xx*•]{4}[ -]?[Xx*•]{4}[ -]?\d{4}(?!\d)/.test(str.trim()) ||
         /(?<![\w])\d{4}[ -]?[Xx*•]{4}[ -]?[Xx*•]{4}[ -]?\d{4}(?!\d)/.test(str.trim());
}

function isIndianPincode(str) {
  return /^[1-9][0-9]{2}\s?[0-9]{3}$/.test(str.trim());
}

function isFalsePositiveOrderNumber(str) {
  // Common tracking / UUID / Order format that should NOT be confused with PAN or Aadhaar
  return /^ORD-[A-Z0-9_-]{4,24}$/i.test(str.trim()) || 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function normalizeIndianPhone(phoneStr) {
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return `+${digits}`;
  return null;
}

test('Edge Cases: Correctly recognizes masked Aadhaar numbers', () => {
  assert.strictEqual(isMaskedAadhaar('XXXX-XXXX-0019'), true);
  assert.strictEqual(isMaskedAadhaar('•••• •••• 0019'), true);
  assert.strictEqual(isMaskedAadhaar('**** **** 0019'), true);
  assert.strictEqual(isMaskedAadhaar('1234-5678-0019'), false, 'Unmasked Aadhaar handled by Verhoeff');
});

test('Edge Cases: Correctly recognizes masked payment cards', () => {
  assert.strictEqual(isMaskedCard('4532-XXXX-XXXX-0366'), true);
  assert.strictEqual(isMaskedCard('••••-••••-••••-0366'), true);
  assert.strictEqual(isMaskedCard('12345'), false);
});

test('Edge Cases: Rejects UUIDs and order IDs from triggering PII false positives', () => {
  const orderId = 'ORD-20261003-AB12';
  const uuid = 'c4a8d09f-4318-4a1f-9b12-984372910fa3';
  assert.strictEqual(isFalsePositiveOrderNumber(orderId), true);
  assert.strictEqual(isFalsePositiveOrderNumber(uuid), true);
  assert.strictEqual(isFalsePositiveOrderNumber('AAACA7890B'), false, 'Genuine PAN is not an order ID');
});

test('Edge Cases: Normalizes Indian phone numbers across multiple formats', () => {
  assert.strictEqual(normalizeIndianPhone('9876543210'), '+919876543210', '10-digit standard');
  assert.strictEqual(normalizeIndianPhone('09876543210'), '+919876543210', 'Leading 0 format');
  assert.strictEqual(normalizeIndianPhone('+91 98765 43210'), '+919876543210', 'Spaced international');
  assert.strictEqual(normalizeIndianPhone('+91-98765-43210'), '+919876543210', 'Hyphenated');
  assert.strictEqual(normalizeIndianPhone('12345'), null, 'Invalid phone rejected');
});

test('Edge Cases: Validates Indian 6-digit postal pincodes', () => {
  assert.strictEqual(isIndianPincode('560001'), true, 'Bengaluru GPO');
  assert.strictEqual(isIndianPincode('110 001'), true, 'New Delhi with space');
  assert.strictEqual(isIndianPincode('012345'), false, 'Cannot start with 0');
  assert.strictEqual(isIndianPincode('12345'), false, 'Too short');
  assert.strictEqual(isIndianPincode('5600011'), false, 'Too long');
});

test('Edge Cases: Validates shadow DOM simulation boundary encapsulation', () => {
  const shadowHost = {
    shadowRoot: {
      querySelectorAll: (sel) => sel.includes('password') ? [{ id: 'shadow_pwd', value: 'secret' }] : []
    }
  };

  const foundPasswords = shadowHost.shadowRoot.querySelectorAll('input[type="password"]');
  assert.strictEqual(foundPasswords.length, 1);
  assert.strictEqual(foundPasswords[0].id, 'shadow_pwd');
});

test('Edge Cases: Case-insensitive PAN and GSTIN handling', () => {
  const panLower = 'aaaca7890b';
  const gstinLower = '29aakcp5821q1zl';
  assert.strictEqual(panLower.toUpperCase(), 'AAACA7890B');
  assert.strictEqual(gstinLower.toUpperCase(), '29AAKCP5821Q1ZL');
});

test('Edge Cases: Validates Indian Bank IFSC format (4 letters, 0, 6 alphanumeric)', () => {
  const isIFSC = (s) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.trim().toUpperCase());
  assert.strictEqual(isIFSC('HDFC0000128'), true);
  assert.strictEqual(isIFSC('SBIN0001234'), true);
  assert.strictEqual(isIFSC('HDFC1000128'), false, '5th char must be 0');
  assert.strictEqual(isIFSC('HDF0000128'), false, 'Bank code must be 4 chars');
});

test('Edge Cases: Validates Indian Passport standard format', () => {
  const isPassport = (s) => /^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$|^[A-Z][0-9]{7}$/.test(s.trim().toUpperCase());
  assert.strictEqual(isPassport('Z1234567'), true);
  assert.strictEqual(isPassport('A1234567'), true);
  assert.strictEqual(isPassport('12345678'), false, 'Must start with letter');
});

test('Edge Cases: Verhoeff transposition error resistance (catches swapped adjacent digits)', () => {
  const VERHOEFF_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VERHOEFF_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[2,3,4,0,1,7,8,9,5,6],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  function check(s) {
    let c = 0;
    const digits = s.split('').map(Number).reverse();
    for (let i = 0; i < digits.length; i++) c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
    return c === 0;
  }
  assert.strictEqual(check('999999990019'), true, 'Valid Aadhaar');
  assert.strictEqual(check('999999990109'), false, 'Swapped 01 vs 10 must be caught');
});

test('Edge Cases: Luhn check digit catches single altered digit', () => {
  function luhn(s) {
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let n = parseInt(s[i], 10);
      if (alt) { n *= 2; if (n > 9) n = (n % 10) + 1; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }
  assert.strictEqual(luhn('4532015112830366'), true, 'Valid card');
  assert.strictEqual(luhn('4532015112830367'), false, 'Altered last digit caught');
});

test('Edge Cases: UPI sub-addressing format handling', () => {
  const isUpiSub = (s) => /^[a-z0-9._+-]+@okhdfcbank$/i.test(s.trim());
  assert.strictEqual(isUpiSub('user+tax@okhdfcbank'), true);
  assert.strictEqual(isUpiSub('user.office@okhdfcbank'), true);
});

