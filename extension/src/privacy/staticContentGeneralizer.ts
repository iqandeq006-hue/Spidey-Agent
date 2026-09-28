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
  private modifiedElements: Map<HTMLElement, string> = new Map();

  // Reset and revert any previously generalized static text nodes & elements
  public reset(): void {
    for (const [node, originalText] of this.modifiedTextNodes.entries()) {
      if (node.parentNode) {
        node.textContent = originalText;
      }
    }
    this.modifiedTextNodes.clear();

    for (const [el, originalHTML] of this.modifiedElements.entries()) {
      if (el.parentNode) {
        el.innerHTML = originalHTML;
        el.classList.remove('sentry-static-redacted', 'sentry-redacted-field');
        el.removeAttribute('data-sentry-redacted');
      }
    }
    this.modifiedElements.clear();
  }

  // Scan static content nodes across tables, cards, and document artifacts
  public scanAndGeneralizeStaticText(): { count: number; tokens: string[]; entitiesByType: Record<string, number> } {
    const generatedTokens: string[] = [];
    const entitiesByType: Record<string, number> = {};
    let count = 0;

    const recordEntity = (token: string, type: string) => {
      generatedTokens.push(token);
      entitiesByType[type] = (entitiesByType[type] || 0) + 1;
      count++;
    };

    // ==========================================
    // TRACK 1: Structured HTML Data Tables (<table>, <tr>, <td>)
    // ==========================================
    const tables = document.querySelectorAll<HTMLTableElement>('table');
    tables.forEach((table, tIdx) => {
      if (table.closest('#sentry-agent-root') || table.closest('#sentry-risk-modal')) return;

      // Extract column headers
      let headers: string[] = [];
      const thElements = table.querySelectorAll('thead th, thead td');
      if (thElements.length > 0) {
        headers = Array.from(thElements).map(th => (th.textContent || '').trim().toLowerCase());
      } else {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          const cells = firstRow.querySelectorAll('th, td');
          if (firstRow.querySelector('th') || cells.length > 0) {
            headers = Array.from(cells).map(c => (c.textContent || '').trim().toLowerCase());
          }
        }
      }

      const rows = table.querySelectorAll('tbody tr, tr');
      rows.forEach((row, rIdx) => {
        // Skip header-only row
        if (row.querySelectorAll('th').length > 0 && row.querySelectorAll('td').length === 0) return;

        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;

        cells.forEach((td, cIdx) => {
          if (td.getAttribute('data-sentry-redacted') === 'true') return;

          const rawVal = (td.textContent || '').trim();
          if (!rawVal || rawVal.length === 0 || vaultInstance.isToken(rawVal)) return;

          const colHeader = headers[cIdx] || '';
          let piiType: PIIType = 'CONFIDENTIAL_TEXT';

          const piiMatch = classifySensitiveText(rawVal);
          if (piiMatch) {
            piiType = piiMatch.type;
          } else if (colHeader.includes('company') || colHeader.includes('org') || colHeader.includes('vendor') || colHeader.includes('firm') || colHeader.includes('business') || colHeader.includes('employer')) {
            piiType = 'COMPANY';
          } else if (colHeader.includes('contact') || colHeader.includes('name') || colHeader.includes('person') || colHeader.includes('user') || colHeader.includes('employee') || colHeader.includes('client') || colHeader.includes('customer') || colHeader.includes('patient') || colHeader.includes('author')) {
            piiType = 'PERSON';
          } else if (colHeader.includes('country') || colHeader.includes('city') || colHeader.includes('state') || colHeader.includes('address') || colHeader.includes('location') || colHeader.includes('region') || colHeader.includes('place')) {
            piiType = 'LOCATION';
          } else if (colHeader.includes('email')) {
            piiType = 'EMAIL';
          } else if (colHeader.includes('phone') || colHeader.includes('mobile') || colHeader.includes('tel')) {
            piiType = 'PHONE';
          } else if (colHeader.includes('date') || colHeader.includes('dob') || colHeader.includes('birth')) {
            piiType = 'DOB';
          } else if (colHeader.includes('price') || colHeader.includes('cost') || colHeader.includes('amount') || colHeader.includes('salary') || colHeader.includes('total') || colHeader.includes('fee') || colHeader.includes('revenue')) {
            piiType = 'CONFIDENTIAL_NUM';
          } else if (colHeader.includes('id') || colHeader.includes('no') || colHeader.includes('code') || colHeader.includes('num')) {
            piiType = 'CONFIDENTIAL_NUM';
          } else if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(rawVal)) {
            piiType = 'PERSON';
          }

          const selector = `table:${table.id || tIdx}:r${rIdx}:c${cIdx}`;
          const token = vaultInstance.tokenize(rawVal, piiType, selector);

          this.modifiedElements.set(td, td.innerHTML);
          td.innerHTML = '';
          const badge = document.createElement('span');
          badge.className = 'sentry-redacted-field sentry-table-cell-redacted';
          badge.textContent = token;
          td.appendChild(badge);
          td.setAttribute('data-sentry-redacted', 'true');

          recordEntity(token, piiType);
        });
      });
    });

    // ==========================================
    // TRACK 2: Non-Table Static Content (Cards, Lists, Key-Value Pairs, Paragraphs)
    // ==========================================
    const staticContainers = document.querySelectorAll<HTMLElement>(
      'dd, p, span, li, [data-sentry-static="true"], .table-cell, .data-row'
    );

    staticContainers.forEach((el) => {
      if (el.closest('table') || el.classList.contains('sentry-static-redacted') || el.closest('#sentry-agent-root') || el.closest('#sentry-risk-modal')) {
        return;
      }

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
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, piiMatch.type);
            continue;
          }

          // 2. Check for Currency & Financial Amounts
          const rupeeMatch = rawText.match(/(?:₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d{2})?)/i);
          if (rupeeMatch) {
            const fullMatch = rupeeMatch[0];
            const cleanDigits = rupeeMatch[1].replace(/,/g, '');
            const amount = parseFloat(cleanDigits);

            let bracket = 'TIER_1_STANDARD';
            if (amount >= 10000000) bracket = 'TIER_4_STRATEGIC_CRORE';
            else if (amount >= 2500000) bracket = 'TIER_3_HIGH_VALUE_LAKH';
            else if (amount >= 500000) bracket = 'TIER_2_MID_SCALE';

            const token = vaultInstance.tokenize(fullMatch, 'CONFIDENTIAL_NUM', `budget:${bracket}`);
            const schemaTag = `<VAL:BUDGET bracket="${bracket}">`;

            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(fullMatch, schemaTag);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(schemaTag, 'CONFIDENTIAL_NUM');
          }
        }
      }
    });

    return { count, tokens: generatedTokens, entitiesByType };
  }
}

export const staticContentGeneralizerInstance = new StaticContentGeneralizer();
