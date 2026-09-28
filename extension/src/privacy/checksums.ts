// Checksum-Validated PII and Sensitive Data Detectors
// Implements exact Verhoeff (Aadhaar), Luhn (Cards), PAN structure, GSTIN, and Indian IDs

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
// 15 characters: 2-digit state code + 10-char PAN + 1-char entity + 'Z' + 1 check char
export function validateGSTIN(gstinStr: string): boolean {
  const clean = gstinStr.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean)) return false;
  
  // Extract and validate the embedded PAN
  const embeddedPAN = clean.substring(2, 12);
  return validatePAN(embeddedPAN);
}

// ==========================================
// 5. Standard PII Regex Pattern Matchers
// ==========================================
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
const INDIAN_PHONE_REGEX = /(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/;
const INDIAN_PASSPORT_REGEX = /\b[A-Z][0-9]{7}\b/;
const INDIAN_BANK_IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;
const BANK_ACCOUNT_REGEX = /\b\d{9,18}\b/;
const FINANCIAL_BID_REGEX = /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d{2})?|\b[\d]{1,3}(?:,\d{2,3})*(?:\.\d{2})\b/;

const GLOBAL_PHONE_REGEX = /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b)/;
const USERNAME_HANDLE_REGEX = /^@[A-Za-z0-9_]{3,24}$/;
const USERNAME_PREFIX_REGEX = /(?:signed\s+in\s+as|logged\s+in\s+as|username:\s*|user:\s*)([A-Za-z0-9_.-]{3,30})/i;
const GREETING_NAME_REGEX = /(?:welcome|hello|hi),\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;

// Master classifier function: checks a given text and returns its detected PII type & confidence
export interface ChecksumMatch {
  type: 'AADHAAR' | 'PAN' | 'GSTIN' | 'CARD' | 'EMAIL' | 'PHONE' | 'PASSPORT' | 'CONFIDENTIAL_NUM' | 'USERNAME' | 'PERSON' | 'ADDRESS' | 'DOB' | 'GENDER' | 'PREFERENCE' | 'DOCUMENT' | 'LOCATION' | 'CONFIDENTIAL_TEXT' | 'COMPANY';
  cleanValue: string;
  confidence: number;
}

export function classifySensitiveText(text: string): ChecksumMatch | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Check for Aadhaar (must pass Verhoeff)
  const digitsOnly = trimmed.replace(/\s+/g, '');
  if (/^\d{12}$/.test(digitsOnly) && validateVerhoeff(digitsOnly)) {
    return { type: 'AADHAAR', cleanValue: trimmed, confidence: 0.99 };
  }

  // 2. Check for Payment Card (must pass Luhn)
  const cardDigits = trimmed.replace(/[\s-]+/g, '');
  if (/^\d{13,19}$/.test(cardDigits) && validateLuhn(cardDigits)) {
    return { type: 'CARD', cleanValue: trimmed, confidence: 0.99 };
  }

  // 3. Check for GSTIN (with embedded PAN validation)
  if (validateGSTIN(trimmed)) {
    return { type: 'GSTIN', cleanValue: trimmed.toUpperCase(), confidence: 0.98 };
  }

  // 4. Check for Indian PAN (with entity char check)
  if (validatePAN(trimmed)) {
    return { type: 'PAN', cleanValue: trimmed.toUpperCase(), confidence: 0.98 };
  }

  // 5. Check for Email
  if (EMAIL_REGEX.test(trimmed)) {
    return { type: 'EMAIL', cleanValue: trimmed, confidence: 0.95 };
  }

  // 6. Check for Phone (Indian or International)
  if ((INDIAN_PHONE_REGEX.test(trimmed) || GLOBAL_PHONE_REGEX.test(trimmed)) && trimmed.replace(/\D/g, '').length >= 10) {
    return { type: 'PHONE', cleanValue: trimmed, confidence: 0.93 };
  }

  // 7. Check for Username Handle (@user or "Logged in as user")
  if (USERNAME_HANDLE_REGEX.test(trimmed)) {
    return { type: 'USERNAME', cleanValue: trimmed, confidence: 0.95 };
  }
  const userPrefixMatch = trimmed.match(USERNAME_PREFIX_REGEX);
  if (userPrefixMatch) {
    return { type: 'USERNAME', cleanValue: userPrefixMatch[1], confidence: 0.92 };
  }

  // 8. Check for Person Greeting Name ("Welcome, Vikram", "Hello, Alex")
  const greetingMatch = trimmed.match(GREETING_NAME_REGEX);
  if (greetingMatch) {
    return { type: 'PERSON', cleanValue: greetingMatch[1], confidence: 0.90 };
  }

  // 9. Check for Passport
  if (INDIAN_PASSPORT_REGEX.test(trimmed)) {
    return { type: 'PASSPORT', cleanValue: trimmed.toUpperCase(), confidence: 0.92 };
  }

  // 10. Check for IFSC or Commercial Bank Account
  if (INDIAN_BANK_IFSC_REGEX.test(trimmed)) {
    return { type: 'CONFIDENTIAL_NUM', cleanValue: trimmed.toUpperCase(), confidence: 0.90 };
  }

  // 11. Financial Quotation or Confidential Price
  if (FINANCIAL_BID_REGEX.test(trimmed) && (trimmed.includes('₹') || trimmed.includes('INR') || (trimmed.includes(',') && trimmed.includes('.')))) {
    return { type: 'CONFIDENTIAL_NUM', cleanValue: trimmed, confidence: 0.88 };
  }

  return null;
}
