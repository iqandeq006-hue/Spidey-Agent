import { PIIType, VaultEntry, RehydrationSecurityResult } from '../types';

export const SECRET_PII_TYPES = new Set<PIIType>([
  'PASSWORD',
  'OTP',
  'CVV',
  'CONFIDENTIAL_TEXT'
]);

export class LocalInversionVault {
  // Token -> VaultEntry mapping (stored exclusively in client memory)
  private vault: Map<string, VaultEntry> = new Map();
  // Reverse index: realValue -> token (ensures identical values share a consistent token within the session)
  private reverseIndex: Map<string, string> = new Map();
  // Per-type counter for deterministic readable tokens: <AADHAAR_ID_1>, <PERSON_1>, etc.
  private counters: Map<PIIType, number> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.vault.clear();
    this.reverseIndex.clear();
    this.counters.clear();
  }

  // Tokenize a sensitive string: returns an existing token or generates a new semantic token
  public tokenize(
    realValue: string,
    type: PIIType,
    selector?: string,
    origin?: string,
    isSecret?: boolean
  ): string {
    const trimmed = realValue.trim();
    if (!trimmed) return realValue;

    // Resolve capture origin (defaults to active browser origin or 'local-origin')
    const resolvedOrigin = origin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'local-origin');
    const resolvedSecret = isSecret !== undefined ? isSecret : SECRET_PII_TYPES.has(type);

    // Check if we already tokenized this exact value
    const existingToken = this.reverseIndex.get(trimmed);
    if (existingToken) {
      return existingToken;
    }

    // Generate new semantic token
    const nextIndex = (this.counters.get(type) || 0) + 1;
    this.counters.set(type, nextIndex);

    const tokenPrefix = this.getTokenPrefix(type);
    const token = `<${tokenPrefix}_${nextIndex}>`;

    const entry: VaultEntry = {
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

  // Verify whether a token is safe to rehydrate in the current execution context
  public verifyRehydrationSecurity(
    tokenOrText: string,
    targetOrigin?: string,
    isAutonomousAction: boolean = true
  ): RehydrationSecurityResult {
    const trimmedToken = tokenOrText.trim();
    const entry = this.vault.get(trimmedToken);

    if (!entry) {
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    const currentOrigin = targetOrigin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'local-origin');

    // 1. SECRET Guard: Passwords, OTPs, CVVs cannot be rehydrated autonomously!
    if (entry.isSecret && isAutonomousAction) {
      return {
        allowed: false,
        requiresHITL: true,
        reason: 'SECRET_BLOCKED',
        sourceOrigin: entry.sourceOrigin,
        targetOrigin: currentOrigin
      };
    }

    // 2. Origin-Lock: Cross-site rehydration is blocked (e.g. data captured on Site A cannot be typed into Site B)
    if (entry.sourceOrigin && currentOrigin && entry.sourceOrigin !== 'local-origin' && currentOrigin !== 'local-origin' && entry.sourceOrigin !== currentOrigin) {
      return {
        allowed: false,
        requiresHITL: false,
        reason: 'ORIGIN_MISMATCH',
        sourceOrigin: entry.sourceOrigin,
        targetOrigin: currentOrigin
      };
    }

    return {
      allowed: true,
      rehydratedValue: entry.realValue,
      reason: 'ALLOWED',
      sourceOrigin: entry.sourceOrigin,
      targetOrigin: currentOrigin
    };
  }

  // Re-hydrate a token back into its real value locally (with strict origin and secret enforcement)
  public rehydrate(
    tokenOrText: string,
    targetOrigin?: string,
    isAutonomousAction: boolean = false
  ): string {
    if (!tokenOrText) return tokenOrText;

    const trimmed = tokenOrText.trim();
    // Direct token lookup
    const directEntry = this.vault.get(trimmed);
    if (directEntry) {
      const securityCheck = this.verifyRehydrationSecurity(trimmed, targetOrigin, isAutonomousAction);
      if (!securityCheck.allowed) {
        if (securityCheck.requiresHITL) {
          console.warn(`[Vault Security] Autonomous rehydration of SECRET (${directEntry.type}) blocked by Zero-Trust policy.`);
        } else if (securityCheck.reason === 'ORIGIN_MISMATCH') {
          console.warn(`[Vault Security] Cross-origin rehydration blocked: captured on ${directEntry.sourceOrigin}, targeted to ${targetOrigin}`);
        }
        return tokenOrText; // Fail-closed: keep token intact
      }
      return directEntry.realValue;
    }

    // Replace occurrences of known tokens within a larger string
    let result = tokenOrText;
    for (const [token, entry] of this.vault.entries()) {
      if (result.includes(token)) {
        const securityCheck = this.verifyRehydrationSecurity(token, targetOrigin, isAutonomousAction);
        if (securityCheck.allowed && securityCheck.rehydratedValue) {
          result = result.split(token).join(securityCheck.rehydratedValue);
        } else {
          console.warn(`[Vault Security] Token ${token} skipped in payload: ${securityCheck.reason}`);
        }
      }
    }
    return result;
  }

  // Check if a string is a registered token
  public isToken(str: string): boolean {
    return this.vault.has(str.trim());
  }

  // Get total count of protected entities
  public size(): number {
    return this.vault.size;
  }

  // Get all raw real values (for self-healing residual leak checks)
  public getRealValues(): string[] {
    return Array.from(this.vault.values()).map(e => e.realValue);
  }

  // Get all active entries (for popup inspection with partial masking)
  public getInspectionEntries(): Array<{ token: string; maskedReal: string; type: PIIType }> {
    const list: Array<{ token: string; maskedReal: string; type: PIIType }> = [];
    for (const entry of this.vault.values()) {
      list.push({
        token: entry.token,
        maskedReal: this.maskForPreview(entry.realValue, entry.type),
        type: entry.type
      });
    }
    return list;
  }

  // Find first token registered for a specific PIIType
  public lookupByType(type: PIIType): string | undefined {
    for (const entry of this.vault.values()) {
      if (entry.type === type) return entry.token;
    }
    return undefined;
  }

  // Get aggregated counts of protected entities grouped by type
  public getCountsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.vault.values()) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }
    return counts;
  }

  // Helper: mask sensitive values for safe visual verification
  private maskForPreview(val: string, type: PIIType): string {
    if (val.length <= 4) return '••••';
    if (type === 'EMAIL') {
      const parts = val.split('@');
      return `${parts[0].charAt(0)}•••@${parts[1]}`;
    }
    const visibleChars = Math.min(2, Math.floor(val.length / 3));
    return val.substring(0, visibleChars) + '••••' + val.substring(val.length - visibleChars);
  }

  private getTokenPrefix(type: PIIType): string {
    switch (type) {
      case 'AADHAAR': return 'AADHAAR_ID';
      case 'PAN': return 'PAN_NO';
      case 'GSTIN': return 'GSTIN_ID';
      case 'CARD': return 'CARD_NO';
      case 'EMAIL': return 'EMAIL';
      case 'PHONE': return 'PHONE_NO';
      case 'PASSPORT': return 'PASSPORT_ID';
      case 'CONFIDENTIAL_NUM': return 'CONFIDENTIAL_VAL';
      case 'PERSON': return 'PERSON';
      case 'USERNAME': return 'USERNAME';
      case 'ADDRESS': return 'ADDRESS';
      case 'DOB': return 'DOB';
      case 'GENDER': return 'GENDER';
      case 'PREFERENCE': return 'PREFERENCE';
      case 'DOCUMENT': return 'DOCUMENT';
      case 'LOCATION': return 'LOCATION';
      case 'CONFIDENTIAL_TEXT': return 'CONFIDENTIAL';
      case 'COMPANY': return 'COMPANY';
      case 'CANVAS_SIGNATURE': return 'REDACTED_SIGNATURE';
      case 'AVATAR_FACE': return 'REDACTED_AVATAR';
      case 'PASSWORD': return 'SECRET_PASSWORD';
      case 'OTP': return 'SECRET_OTP';
      case 'CVV': return 'SECRET_CVV';
      case 'UPI': return 'UPI_ID';
      case 'VOTER_ID': return 'VOTER_ID';
      default: return 'PROTECTED_DATA';
    }
  }
}

// Global singleton instance for the extension
export const vaultInstance = new LocalInversionVault();
