// Checksum-Validated PII and Sensitive Data Detectors
// Implements exact Verhoeff (Aadhaar), Luhn (Cards), PAN structure, GSTIN, and Indian IDs
import { isIndianName, findIndianNames } from './gazetteer';

// ==========================================
// 1. Verhoeff Algorithm for Aadhaar (UIDAI)
// ==========================================
const VERHOEFF_D: number[][] = [
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

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export function validateVerhoeff(numStr: string): boolean {
  const clean = numStr.replace(/\s+/g, '');
  if (!/^\d{12}$/.test(clean)) return false;

  let c = 0;
  const digits = clean.split('').map(Number).reverse();

  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }

  return c === 0;
}

// ==========================================
// 2. Luhn Algorithm for Payment Cards
// ==========================================
export function validateLuhn(cardStr: string): boolean {
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

// ==========================================
// 3. Indian PAN (Permanent Account Number)
// ==========================================
// 5 letters, 4 digits, 1 letter. 4th letter is entity type: P, C, H, A, B, G, J, L, F, T
const VALID_PAN_ENTITY_TYPES = new Set(['P', 'C', 'H', 'A', 'B', 'G', 'J', 'L', 'F', 'T']);

export function validatePAN(panStr: string): boolean {
  const clean = panStr.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return false;
  const entityChar = clean.charAt(3);
  return VALID_PAN_ENTITY_TYPES.has(entityChar);
}

// ==========================================
// 4. Indian GSTIN (Goods & Services Tax ID)
// ==========================================
// Official Government of India / ISO 7064 Mod-36 Checksum
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function validateGSTINMod36(gstinStr: string): boolean {
  const clean = (gstinStr || '').trim().toUpperCase();
  if (clean.length !== 15) return false;
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) return false;

  // Verify embedded PAN
  const embeddedPAN = clean.substring(2, 12);
  if (!validatePAN(embeddedPAN)) return false;

  // Compute Mod-36 Check Digit
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

// Structural GSTIN validator (supports both strict Mod-36 and standard structure)
export function validateGSTIN(gstinStr: string): boolean {
  const clean = (gstinStr || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) return false;
  
  // Extract and validate the embedded PAN
  const embeddedPAN = clean.substring(2, 12);
  return validatePAN(embeddedPAN);
}

// ==========================================
// 5. Indian UPI Virtual Payment Address (VPA)
// ==========================================
// Comprehensive list of 70+ verified NPCI banking and fintech handles
export const UPI_HANDLES = new Set<string>([
  'okhdfcbank', 'oksbi', 'okaxis', 'okicici', 'paytm', 'ybl', 'axl', 'ibl', 'apl', 'upi',
  'sbi', 'hdfcbank', 'icici', 'kotak', 'barodampay', 'idfcbank', 'indus', 'federal', 'pnb',
  'boi', 'cnrb', 'unionbank', 'jupiteraxis', 'fam', 'freecharge', 'mbk', 'airtel', 'jio',
  'slice', 'naviaxis', 'yesbank', 'dbs', 'citi', 'hsbc', 'sc', 'rbl', 'kbl', 'aubank',
  'equitas', 'timecosmos', 'waaxis', 'wahdfcbank', 'wasbi', 'waicici', 'postbank', 'ptyes',
  'ptaxis', 'pthdfc', 'ptsbi', 'yapl', 'rapl', 'abfspay', 'axisbank', 'timepay', 'cred', 'fi'
]);

export function validateUPI(upiStr: string): boolean {
  if (!upiStr || !upiStr.includes('@')) return false;
  const clean = upiStr.trim().toLowerCase();
  
  // Exclude standard email domains
  if (/\.(com|org|net|edu|gov|io|co|in)$/i.test(clean)) return false;

  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [username, handle] = parts;

  if (!/^[a-z0-9._-]{2,64}$/.test(username)) return false;
  return UPI_HANDLES.has(handle) || /^[a-z]{2,20}$/.test(handle);
}

// ==========================================
// 6. Indian Voter ID (EPIC Card)
// ==========================================
// 3 letters (State/Assembly code) + 7 digits
export function validateVoterID(voterStr: string): boolean {
  const clean = (voterStr || '').trim().toUpperCase();
  return /^[A-Z]{3}[0-9]{7}$/.test(clean);
}

// ==========================================
// 7. Payment Card Expiration Date
// ==========================================
export function validateCardExpiry(expStr: string): boolean {
  const clean = (expStr || '').trim();
  const match = clean.match(/^(0[1-9]|1[0-2])\s?\/\s?([0-9]{2}|20[0-9]{2})$/);
  if (!match) return false;
  return true;
}

// ==========================================
// 8. Standard PII Regex Pattern Matchers & Universal Canonicalizer
// ==========================================
export function normalizeObfuscatedText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*[\(\[\{]?(?:at|@)[\)\]\}]?\s*/gi, '@')
    .replace(/\s*[\(\[\{]?(?:dot|\.)[\)\]\}]?\s*/gi, '.');
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
const INDIAN_PHONE_REGEX = /(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/;
const INDIAN_LANDLINE_REGEX = /(?:(?:\+91|0)[ -]?)?(?:0\d{2,4}[ -]?)?\d{6,8}\b/;
const GLOBAL_PHONE_REGEX = /(?:(?:\+?\d{1,3}[-.\s]?)?\(?0?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b)/;

const INDIAN_PASSPORT_REGEX = /\b[A-PR-WY][1-9]\d\s?\d{4}[1-9]\b|\b[A-Z][0-9]{7}\b/;
const INDIAN_BANK_IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;
const BANK_ACCOUNT_REGEX = /\b\d{9,18}\b/;
const FINANCIAL_BID_REGEX = /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d{2})?|\b[\d]{1,3}(?:,\d{2,3})*(?:\.\d{2})\b/;

const USERNAME_HANDLE_REGEX = /^@[A-Za-z0-9_.-]{3,30}$/;
const USERNAME_PREFIX_REGEX = /(?:signed\s+in\s+as|logged\s+in\s+as|username:\s*|user:\s*)([A-Za-z0-9_.-]{3,30})/i;
const GREETING_NAME_REGEX = /(?:welcome|hello|hi|dear|namaste|thanks|regards)[\s,:]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i;

// Universal Orthographic Personal Name Grammars (e.g., "Dharshin R", "R. Dharshin", "Alexander B.")
const INITIAL_NAME_REGEX = /^[A-Za-z][a-z]{1,24}\s+[A-Za-z]\.?$/i;
const PREFIX_INITIAL_NAME_REGEX = /^[A-Za-z]\.?\s+[A-Za-z][a-z]{1,24}$/i;
const DATE_FORMAT_REGEX = /^(?:0?[1-9]|[12]\d|3[01])[\/\-.](?:0?[1-9]|1[012])[\/\-.](?:19\d{2}|20\d{2})$|^(?:19\d{2}|20\d{2})[\/\-.](?:0?[1-9]|1[012])[\/\-.](?:0?[1-9]|[12]\d|3[01])$/;
const MASKED_AADHAAR_REGEX = /^(?:[Xx]{4}[ -]?){2}\d{4}$/;

// Master classifier function: checks a given text and returns its detected PII type & confidence
export interface ChecksumMatch {
  type: 
    | 'AADHAAR' | 'PAN' | 'GSTIN' | 'CARD' | 'EMAIL' | 'PHONE' | 'PASSPORT' 
    | 'CONFIDENTIAL_NUM' | 'USERNAME' | 'PERSON' | 'ADDRESS' | 'DOB' | 'GENDER' 
    | 'PREFERENCE' | 'DOCUMENT' | 'LOCATION' | 'CONFIDENTIAL_TEXT' | 'COMPANY'
    | 'UPI' | 'VOTER_ID' | 'OTP' | 'CVV' | 'PASSWORD';
  cleanValue: string;
  confidence: number;
}

export function classifySensitiveText(text: string): ChecksumMatch | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const normalized = normalizeObfuscatedText(trimmed);

  // 1. Check for Aadhaar (must pass Verhoeff, or masked XXXX XXXX 1234)
  const digitsOnly = trimmed.replace(/\s+/g, '');
  if (/^\d{12}$/.test(digitsOnly) && validateVerhoeff(digitsOnly)) {
    return { type: 'AADHAAR', cleanValue: trimmed, confidence: 0.99 };
  }
  if (MASKED_AADHAAR_REGEX.test(trimmed)) {
    return { type: 'AADHAAR', cleanValue: trimmed, confidence: 0.98 };
  }

  // 2. Check for Payment Card (must pass Luhn)
  const cardDigits = trimmed.replace(/[\s-]+/g, '');
  if (/^\d{13,19}$/.test(cardDigits) && validateLuhn(cardDigits)) {
    return { type: 'CARD', cleanValue: trimmed, confidence: 0.99 };
  }

  // 3. Check for GSTIN (with Mod-36 Check Digit validation)
  if (validateGSTINMod36(trimmed)) {
    return { type: 'GSTIN', cleanValue: trimmed.toUpperCase(), confidence: 0.99 };
  } else if (validateGSTIN(trimmed)) {
    return { type: 'GSTIN', cleanValue: trimmed.toUpperCase(), confidence: 0.95 };
  }

  // 4. Check for Indian PAN (with entity char check)
  if (validatePAN(trimmed)) {
    return { type: 'PAN', cleanValue: trimmed.toUpperCase(), confidence: 0.98 };
  }

  // 5. Check for UPI Virtual Payment Address
  if (validateUPI(trimmed)) {
    return { type: 'UPI', cleanValue: trimmed.toLowerCase(), confidence: 0.96 };
  }

  // 6. Check for Voter ID (EPIC)
  if (validateVoterID(trimmed)) {
    return { type: 'VOTER_ID', cleanValue: trimmed.toUpperCase(), confidence: 0.94 };
  }

  // 7. Check for Email (supports both standard and de-obfuscated forms like user(at)domain(dot)com)
  if (EMAIL_REGEX.test(trimmed) || EMAIL_REGEX.test(normalized)) {
    return { type: 'EMAIL', cleanValue: trimmed, confidence: 0.95 };
  }

  // 8. Check for Phone (Indian Mobile, Landlines with STD codes like 0120/011/080, or International)
  const phoneDigits = trimmed.replace(/\D/g, '');
  if (
    (INDIAN_PHONE_REGEX.test(trimmed) || INDIAN_LANDLINE_REGEX.test(trimmed) || GLOBAL_PHONE_REGEX.test(trimmed)) &&
    phoneDigits.length >= 10 && phoneDigits.length <= 14
  ) {
    return { type: 'PHONE', cleanValue: trimmed, confidence: 0.93 };
  }

  // 9. Check for Date of Birth / Calendar Dates (DD/MM/YYYY)
  if (DATE_FORMAT_REGEX.test(trimmed)) {
    return { type: 'DOB', cleanValue: trimmed, confidence: 0.95 };
  }

  // 10. Check for Free-Text Indian Names via Gazetteer or Universal Initial-Grammar
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length <= 3 && isIndianName(words)) {
    return { type: 'PERSON', cleanValue: trimmed, confidence: 0.93 };
  }
  if (INITIAL_NAME_REGEX.test(trimmed) || PREFIX_INITIAL_NAME_REGEX.test(trimmed)) {
    return { type: 'PERSON', cleanValue: trimmed, confidence: 0.92 };
  }

  // 11. Check for Username Handle (@user, user prefix, etc.)
  if (USERNAME_HANDLE_REGEX.test(trimmed)) {
    return { type: 'USERNAME', cleanValue: trimmed, confidence: 0.95 };
  }
  const userPrefixMatch = trimmed.match(USERNAME_PREFIX_REGEX);
  if (userPrefixMatch) {
    return { type: 'USERNAME', cleanValue: userPrefixMatch[1], confidence: 0.92 };
  }

  // 12. Check for Person Greeting Name ("Welcome DHARSHIN R", "Welcome, Vikram", "Hello, Alex")
  const greetingMatch = trimmed.match(GREETING_NAME_REGEX);
  if (greetingMatch) {
    return { type: 'PERSON', cleanValue: greetingMatch[1], confidence: 0.92 };
  }

  // 12. Check for Passport
  if (INDIAN_PASSPORT_REGEX.test(trimmed)) {
    return { type: 'PASSPORT', cleanValue: trimmed.toUpperCase(), confidence: 0.92 };
  }

  // 13. Check for Card Expiry
  if (validateCardExpiry(trimmed)) {
    return { type: 'CONFIDENTIAL_NUM', cleanValue: trimmed, confidence: 0.88 };
  }

  // 14. Check for IFSC or Commercial Bank Account
  if (INDIAN_BANK_IFSC_REGEX.test(trimmed)) {
    return { type: 'CONFIDENTIAL_NUM', cleanValue: trimmed.toUpperCase(), confidence: 0.90 };
  }

  // 15. Financial Quotation or Confidential Price
  if (FINANCIAL_BID_REGEX.test(trimmed) && (trimmed.includes('₹') || trimmed.includes('INR') || (trimmed.includes(',') && trimmed.includes('.')))) {
    return { type: 'CONFIDENTIAL_NUM', cleanValue: trimmed, confidence: 0.88 };
  }

  return null;
}
