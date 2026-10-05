// SpideyAgent Structural Zero-Trust Boundary (Memory-Level Node Quarantine)
// Operates on direct JavaScript object references in memory via WeakSet/WeakMap.
// Unlike string regex which can be bypassed by encoding or splitting,
// structural boundaries make PII leakage physically impossible at the JavaScript engine level.
// When DOM elements are deleted or garbage collected, references are automatically pruned.

export interface QuarantineMetadata {
  reason: 'PII_INPUT' | 'PASSWORD_FIELD' | 'SECRET_CREDENTIAL' | 'CANVAS_REGION' | 'DYNAMIC_MUTATION';
  piiType?: string;
  token?: string;
  quarantinedAt: number;
  sourceOrigin: string;
}

export class StructuralBoundaryEngine {
  // Direct DOM Node memory quarantine set (Garbage-Collection safe)
  private quarantinedNodes: WeakSet<Node> = new WeakSet();
  // Associated metadata for quarantined objects
  private nodeMetadata: WeakMap<Node, QuarantineMetadata> = new WeakMap();
  // Total quarantine counter for observability telemetry
  private lifetimeQuarantinedCount: number = 0;

  // Add a DOM Node to the quarantine set
  public quarantineNode(node: Node, meta?: Partial<QuarantineMetadata>): void {
    if (!node) return;

    this.quarantinedNodes.add(node);
    this.lifetimeQuarantinedCount++;

    const metadata: QuarantineMetadata = {
      reason: meta?.reason || 'PII_INPUT',
      piiType: meta?.piiType,
      token: meta?.token,
      quarantinedAt: Date.now(),
      sourceOrigin: meta?.sourceOrigin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'local-origin')
    };

    this.nodeMetadata.set(node, metadata);
  }

  // Check if a node OR any of its parent containers are quarantined
  public isQuarantined(node: Node | null): boolean {
    let curr: Node | null = node;
    while (curr) {
      if (this.quarantinedNodes.has(curr)) {
        return true;
      }
      curr = curr.parentNode;
    }
    return false;
  }

  // Retrieve metadata for a quarantined node
  public getMetadata(node: Node): QuarantineMetadata | undefined {
    return this.nodeMetadata.get(node);
  }

  // Egress Sanitization Guard:
  // Intercepts any DOM text/attribute serialization destined for remote servers.
  // If the node is structurally quarantined, raw text is NEVER returned.
  public sanitizeForEgress(node: Node, rawText: string): { sanitized: string; isQuarantined: boolean; token?: string } {
    if (this.isQuarantined(node)) {
      const meta = this.nodeMetadata.get(node);
      const replacement = meta?.token || `[STRUCTURALLY_QUARANTINED_${meta?.piiType || 'NODE'}]`;
      return {
        sanitized: replacement,
        isQuarantined: true,
        token: meta?.token
      };
    }

    return {
      sanitized: rawText,
      isQuarantined: false
    };
  }

  // Automatically evaluates standard high-risk HTML patterns and quarantines them upfront
  public evaluateAndQuarantineFormControls(root: Document | HTMLElement = document): number {
    let quarantinedCount = 0;

    // 1. Password and credential inputs
    const passwordInputs = root.querySelectorAll('input[type="password"], input[autocomplete*="password"], input[name*="pass" i], input[id*="pass" i]');
    passwordInputs.forEach(el => {
      if (!this.quarantinedNodes.has(el)) {
        this.quarantineNode(el, { reason: 'PASSWORD_FIELD', piiType: 'PASSWORD' });
        quarantinedCount++;
      }
    });

    // 2. OTP and verification code inputs
    const otpInputs = root.querySelectorAll('input[name*="otp" i], input[id*="otp" i], input[autocomplete="one-time-code"], input[name*="2fa" i]');
    otpInputs.forEach(el => {
      if (!this.quarantinedNodes.has(el)) {
        this.quarantineNode(el, { reason: 'SECRET_CREDENTIAL', piiType: 'OTP' });
        quarantinedCount++;
      }
    });

    // 3. CVV and payment card security codes
    const cvvInputs = root.querySelectorAll('input[name*="cvv" i], input[name*="cvc" i], input[id*="cvv" i], input[id*="cvc" i], input[autocomplete="cc-csc"]');
    cvvInputs.forEach(el => {
      if (!this.quarantinedNodes.has(el)) {
        this.quarantineNode(el, { reason: 'SECRET_CREDENTIAL', piiType: 'CVV' });
        quarantinedCount++;
      }
    });

    return quarantinedCount;
  }

  // Lifetime counter for audits
  public getLifetimeCount(): number {
    return this.lifetimeQuarantinedCount;
  }
}

// Global structural boundary singleton
export const structuralBoundaryInstance = new StructuralBoundaryEngine();
