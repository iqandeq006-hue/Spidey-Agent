import test from 'node:test';
import assert from 'node:assert';

// Standalone mirror of checksums and gazetteer functions
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function validatePAN(panStr) {
  const clean = (panStr || '').trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return false;
  const entityChar = clean.charAt(3);
  return new Set(['P', 'C', 'H', 'A', 'B', 'G', 'J', 'L', 'F', 'T']).has(entityChar);
}

function validateGSTINMod36(gstinStr) {
  const clean = (gstinStr || '').trim().toUpperCase();
  if (clean.length !== 15) return false;
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) return false;

  const embeddedPAN = clean.substring(2, 12);
  if (!validatePAN(embeddedPAN)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GST_CHARS.indexOf(clean[i]);
    if (v < 0) return false;
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  const expectedCheck = GST_CHARS[(36 - (sum % 36)) % 36];
  return expectedCheck === clean[14];
}

const UPI_HANDLES = new Set([
  'okhdfcbank', 'oksbi', 'okaxis', 'okicici', 'paytm', 'ybl', 'axl', 'ibl', 'apl', 'upi',
  'sbi', 'hdfcbank', 'icici', 'kotak', 'barodampay', 'idfcbank', 'indus', 'federal', 'pnb',
  'boi', 'cnrb', 'unionbank', 'jupiteraxis', 'fam', 'freecharge', 'mbk', 'airtel', 'jio',
  'slice', 'naviaxis', 'yesbank', 'dbs', 'citi', 'hsbc', 'sc', 'rbl', 'kbl', 'aubank'
]);

function validateUPI(upiStr) {
  if (!upiStr || !upiStr.includes('@')) return false;
  const clean = upiStr.trim().toLowerCase();
  if (/\.(com|org|net|edu|gov|io|co|in)$/i.test(clean)) return false;

  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [username, handle] = parts;

  if (!/^[a-z0-9._-]{2,64}$/.test(username)) return false;
  return UPI_HANDLES.has(handle) || /^[a-z]{2,20}$/.test(handle);
}

function validateVoterID(voterStr) {
  const clean = (voterStr || '').trim().toUpperCase();
  return /^[A-Z]{3}[0-9]{7}$/.test(clean);
}

const GIVEN_NAMES = new Set(['rohan', 'ananya', 'vikram', 'aditya', 'priya', 'rahul', 'sneha']);
const SURNAMES = new Set(['mehta', 'iyer', 'sharma', 'patel', 'singh', 'gupta', 'reddy']);

function isIndianName(words) {
  if (!words || words.length < 2 || words.length > 3) return false;
  const lw = words.map(w => w.toLowerCase());
  if (/^(?:Dr|Shri|Smt|Mr|Mrs|Ms)\.?$/i.test(words[0])) {
    return GIVEN_NAMES.has(lw[1]) || SURNAMES.has(lw[lw.length - 1]);
  }
  return GIVEN_NAMES.has(lw[0]) || SURNAMES.has(lw[lw.length - 1]);
}

// ================= TEST SUITE =================

test('GSTIN ISO 7064 Mod-36: Mathematically verifies authentic 15th check character', () => {
  // Known valid Karnataka merchant GSTIN
  assert.strictEqual(validateGSTINMod36('29AAKCP5821Q1ZL'), true, 'Valid Mod-36 GSTIN must pass');

  // Altered 15th digit fails checksum
  assert.strictEqual(validateGSTINMod36('29AAKCP5821Q1ZM'), false, 'Corrupted 15th digit must be rejected');

  // Corrupted PAN inside GSTIN fails
  assert.strictEqual(validateGSTINMod36('29ABCDE1234F1ZL'), false, 'Invalid embedded PAN fails');
});

test('UPI VPA Detector: Validates genuine NPCI handles and rejects emails', () => {
  assert.strictEqual(validateUPI('ananya.iyer@okaxis'), true, 'Axis GooglePay UPI');
  assert.strictEqual(validateUPI('merchant99@paytm'), true, 'Paytm handle');
  assert.strictEqual(validateUPI('9876543210@ybl'), true, 'PhonePe YBL handle');
  assert.strictEqual(validateUPI('vikram@upi'), true, 'BHIM generic handle');

  // False positive defense: Standard emails must NOT be classified as UPI
  assert.strictEqual(validateUPI('ananya.iyer@gmail.com'), false, 'Standard email must not match UPI');
  assert.strictEqual(validateUPI('support@isro.gov.in'), false, 'Government email must not match UPI');
});

test('Indian Voter ID (EPIC): Validates 3-char state prefix and 7 numeric digits', () => {
  assert.strictEqual(validateVoterID('WBF1234567'), true, 'Valid EPIC number');
  assert.strictEqual(validateVoterID('DLB9876543'), true, 'Valid Delhi EPIC');
  assert.strictEqual(validateVoterID('DL9876543'), false, 'Too short (2 letters)');
  assert.strictEqual(validateVoterID('DLB987654A'), false, 'Non-digit in serial number');
});

test('Indian Names Gazetteer: Accurately detects names while rejecting UI labels', () => {
  assert.strictEqual(isIndianName(['Rohan', 'Mehta']), true, 'Given + Surname');
  assert.strictEqual(isIndianName(['Ananya', 'Iyer']), true, 'Given + Surname');
  assert.strictEqual(isIndianName(['Dr', 'Vikram', 'Sharma']), true, 'Honorific + Full Name');

  // UI phrase rejection defense:
  assert.strictEqual(isIndianName(['Travel', 'Desk']), false, 'UI label must be rejected');
  assert.strictEqual(isIndianName(['Account', 'Summary']), false, 'Banking UI label must be rejected');
  assert.strictEqual(isIndianName(['Confirm', 'Order']), false, 'Action label must be rejected');
});
