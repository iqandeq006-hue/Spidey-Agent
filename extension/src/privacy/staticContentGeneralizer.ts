// Static Content & Document Artifact Generalizer (Dual-Track Redaction)
// Solves the "80% exposed screen" problem.
// Traverses non-input DOM elements: table cells (<td>, <th>), lists, spans, and paragraphs.
// Detects sensitive data and replaces in-place with Typed Functional Generalization Schemas:
// E.g. "Salary: ₹1,50,000" -> "Salary: <VAL:COMPENSATION tier='EXECUTIVE_L2'>"
// Real values are preserved strictly in the Local Inversion Vault.

import { classifySensitiveText } from './checksums';
import { vaultInstance } from './vault';
import { PIIType } from '../types';

export interface GeneralizationMatch {
  node: Node;
  originalText: string;
  replacementText: string;
  type: PIIType | 'FINANCIAL_AMOUNT' | 'CONFIDENTIAL_CODE';
}

export class StaticContentGeneralizer {
  private modifiedTextNodes: Map<Node, string> = new Map();

  // Reset and revert any previously generalized static text nodes
  public reset(): void {
    for (const [node, originalText] of this.modifiedTextNodes.entries()) {
      if (node.parentNode) {
        node.textContent = originalText;
      }
    }
    this.modifiedTextNodes.clear();
  }

  // Scan static content nodes across tables, cards, and document artifacts
  public scanAndGeneralizeStaticText(): { count: number; tokens: string[] } {
    const generatedTokens: string[] = [];
    let count = 0;

    // Target elements where static confidential data typically resides
    const targetElements = document.querySelectorAll<HTMLElement>(
      'td, th, dd, p, span, li, [data-sentry-static="true"], .table-cell, .data-row'
    );

    targetElements.forEach((el) => {
      // Skip if already marked or inside extension UI
      if (el.classList.contains('sentry-static-redacted') || el.closest('#sentry-agent-root') || el.closest('#sentry-risk-modal')) {
        return;
      }

      // Check direct text nodes
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE && child.textContent) {
          const rawText = child.textContent.trim();
          if (rawText.length < 4) continue;

          // 1. Check for standard checksum-validated PII
          const piiMatch = classifySensitiveText(rawText);
          if (piiMatch) {
            const token = vaultInstance.tokenize(rawText, piiMatch.type, `static:${el.tagName.toLowerCase()}`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(rawText, token);
            el.classList.add('sentry-static-redacted');
            generatedTokens.push(token);
            count++;
            continue;
          }

          // 2. Check for Currency & Financial Budget Amounts (e.g. ₹ 48,50,000 or Rs. 150000)
          const rupeeMatch = rawText.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i);
          if (rupeeMatch) {
            const fullMatch = rupeeMatch[0];
            const cleanDigits = rupeeMatch[1].replace(/,/g, '');
            const amount = parseFloat(cleanDigits);

            let bracket = 'TIER_1_STANDARD';
            if (amount >= 10000000) bracket = 'TIER_4_STRATEGIC_CRORE';
            else if (amount >= 2500000) bracket = 'TIER_3_HIGH_VALUE_LAKH';
            else if (amount >= 500000) bracket = 'TIER_2_MID_SCALE';

            const token = vaultInstance.tokenize(fullMatch, 'CUSTOM_SECRET' as PIIType, `budget:${bracket}`);
            const schemaTag = `<VAL:BUDGET bracket="${bracket}">`;

            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(fullMatch, schemaTag);
            el.classList.add('sentry-static-redacted');
            generatedTokens.push(schemaTag);
            count++;
          }
        }
      }
    });

    return { count, tokens: generatedTokens };
  }
}

export const staticContentGeneralizerInstance = new StaticContentGeneralizer();
