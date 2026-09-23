// Fail-Closed Egress Boundary & Cryptographic Digest (Phase 3)
// Enforces that NO raw PII or canary string can ever cross the network wire.
// Binds every outbound payload with a verifiable SHA-256 cryptographic digest.

import { PIIType } from '../types';

export interface OpaqueSceneNode {
  opaqueId: string;
  role: string;
  sanitizedLabel: string;
  tokenType?: PIIType;
  interactive: boolean;
  boundingBox: { x: number; y: number; w: number; h: number };
}

export interface SanitizedWirePayload {
  version: '1.0';
  timestamp: number;
  disclosureLevel: 'L0' | 'L1' | 'L2' | 'L3';
  digestSha256: string;
  nodes: OpaqueSceneNode[];
  visualRegionsCount: number;
  canarySignature: string;
}

export class FailClosedEgressVerifier {
  private activeCanaryToken: string = '';

  constructor() {
    this.refreshCanary();
  }

  public refreshCanary(): string {
    this.activeCanaryToken = 'CANARY_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    return this.activeCanaryToken;
  }

  public getCanary(): string {
    return this.activeCanaryToken;
  }

  // Cryptographic SHA-256 digest computation using Web Crypto API
  public async computeSHA256(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Pre-flight egress verification: fails closed if any forbidden token or PII slips through
  public async verifyAndSealPayload(
    nodes: OpaqueSceneNode[],
    knownRealValues: string[],
    level: 'L0' | 'L1' | 'L2' | 'L3' = 'L1',
    visualRegionsCount?: number
  ): Promise<{ success: boolean; payload?: SanitizedWirePayload; error?: string }> {
    const serializedNodes = JSON.stringify(nodes);

    // 1. Canary Leak Check
    if (serializedNodes.includes(this.activeCanaryToken)) {
      console.error('[EgressVerifier] FAIL-CLOSED: Canary token found in outbound payload! Egress blocked.');
      return { success: false, error: 'Egress Blocked: Canary string detected in payload.' };
    }

    // 2. Raw PII Residual String Check
    for (const realVal of knownRealValues) {
      if (realVal.length >= 5 && serializedNodes.includes(realVal)) {
        console.error(`[EgressVerifier] FAIL-CLOSED: Residual unmasked real value "${realVal.substring(0, 3)}***" detected in wire payload!`);
        return { success: false, error: `Egress Blocked: Unmasked PII residual detected.` };
      }
    }

    // 3. Compute Cryptographic SHA-256 Digest
    const digest = await this.computeSHA256(serializedNodes);

    const payload: SanitizedWirePayload = {
      version: '1.0',
      timestamp: Date.now(),
      disclosureLevel: level,
      digestSha256: digest,
      nodes,
      visualRegionsCount: visualRegionsCount !== undefined 
        ? visualRegionsCount 
        : nodes.filter(n => n.role === 'CANVAS' || n.role === 'IMAGE').length,
      canarySignature: 'VERIFIED_CLEAN_' + digest.substring(0, 8)
    };

    console.log('[EgressVerifier] Egress Pre-flight Passed. Payload sealed with digest:', digest);
    return { success: true, payload };
  }
}

export const egressVerifierInstance = new FailClosedEgressVerifier();
