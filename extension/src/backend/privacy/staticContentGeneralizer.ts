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
      if (table.closest('#spidey-agent-root') || table.closest('#sentry-risk-modal')) return;
      if (this.isVisualWidgetTable(table)) return; // Exclude graphical charts, heatmaps, and calendars

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

        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) return;

        // Check 1: Key-Value Pair Form Row (e.g. <td>Date of Birth</td><td>22/04/2005</td><td>Cast</td><td>VANIYAN</td>)
        for (let i = 0; i < cells.length - 1; i += 2) {
          const labelCell = cells[i];
          const valCell = cells[i + 1];
          if (!labelCell || !valCell) continue;

          const labelText = (labelCell.textContent || '').trim().toLowerCase();
          const valText = (valCell.textContent || '').trim();
          if (!valText || vaultInstance.isToken(valText)) continue;

          // Sensitive identity and profile labels
          if (
            labelText.match(/gender|sex|dob|birth|religion|caste|cast|aadhar|aadhaar|nationality|tongue|blood|category|father|mother|spouse|address|phone|mobile|email|pan|passport|roll|register|reg\.?\s*no/i)
          ) {
            let piiType: PIIType = 'CONFIDENTIAL_TEXT';
            if (labelText.includes('gender') || labelText.includes('sex')) piiType = 'GENDER';
            else if (labelText.includes('dob') || labelText.includes('birth')) piiType = 'DOB';
            else if (labelText.includes('aadhar') || labelText.includes('aadhaar')) piiType = 'AADHAAR';
            else if (labelText.includes('name') || labelText.includes('father') || labelText.includes('mother')) piiType = 'PERSON';
            else if (labelText.includes('phone') || labelText.includes('mobile')) piiType = 'PHONE';
            else if (labelText.includes('email')) piiType = 'EMAIL';

            const selector = `table:kv:${table.id || tIdx}:r${rIdx}:c${i + 1}`;
            const token = vaultInstance.tokenize(valText, piiType, selector);

            this.modifiedElements.set(valCell, valCell.innerHTML);
            valCell.innerHTML = '';
            const badge = document.createElement('span');
            badge.className = 'sentry-redacted-field sentry-table-cell-redacted';
            badge.textContent = token;
            valCell.appendChild(badge);
            valCell.setAttribute('data-sentry-redacted', 'true');

            recordEntity(token, piiType);
          }
        }

        // Check 2: Standard Tabular Columns
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
    // TRACK 2: Non-Table Static Content (Universal DOM Scanner: Paragraphs, Spans, Headings, Links, Cards, Lists)
    // ==========================================
    const staticContainers = document.querySelectorAll<HTMLElement>(
      'p, span, div, h1, h2, h3, h4, h5, h6, li, dd, dt, a, b, strong, em, label, [data-sentry-static="true"], .table-cell, .data-row'
    );

    staticContainers.forEach((el) => {
      if (el.closest('table') || el.classList.contains('sentry-static-redacted') || el.closest('#spidey-agent-root') || el.closest('#sentry-risk-modal') || el.closest('#spidey-agent-root')) {
        return;
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE && child.textContent) {
          let rawText = child.textContent.trim();
          if (rawText.length < 3) continue;

          // 1. Direct check for standard checksum-validated PII across the whole text node
          const piiMatch = classifySensitiveText(rawText);
          if (piiMatch) {
            const token = vaultInstance.tokenize(rawText, piiMatch.type, `static:${el.tagName.toLowerCase()}`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(rawText, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, piiMatch.type);
            continue;
          }

          // 1B. Inline Email Detection inside sentences (e.g. "Send bill to user@company.com today")
          const inlineEmailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
          if (inlineEmailMatch) {
            const emailVal = inlineEmailMatch[0];
            const token = vaultInstance.tokenize(emailVal, 'EMAIL', `static:inline:email`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(emailVal, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, 'EMAIL');
            rawText = child.textContent.trim();
          }

          // 1C. Inline Aadhaar (XXXX XXXX XXXX or 12 digits)
          const inlineAadhaarMatch = rawText.match(/\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b/);
          if (inlineAadhaarMatch && !vaultInstance.isToken(inlineAadhaarMatch[0])) {
            const aadhVal = inlineAadhaarMatch[0];
            const token = vaultInstance.tokenize(aadhVal, 'AADHAAR', `static:inline:aadhaar`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(aadhVal, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, 'AADHAAR');
            rawText = child.textContent.trim();
          }

          // 1D. Inline PAN (5 letters, 4 numbers, 1 letter)
          const inlinePanMatch = rawText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
          if (inlinePanMatch && !vaultInstance.isToken(inlinePanMatch[0])) {
            const panVal = inlinePanMatch[0];
            const token = vaultInstance.tokenize(panVal, 'PAN', `static:inline:pan`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(panVal, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, 'PAN');
            rawText = child.textContent.trim();
          }

          // 1E. Delimited sub-string scanning (handles utility bars: "email | phone1 | phone2")
          if (rawText.includes('|') || rawText.includes('•') || rawText.includes('/') || rawText.includes('\n')) {
            const parts = rawText.split(/([|•\/\n])/);
            let hasPartRedacted = false;
            let reconstructed = '';

            for (const part of parts) {
              const trimmedPart = part.trim();
              const partMatch = trimmedPart.length >= 4 ? classifySensitiveText(trimmedPart) : null;
              if (partMatch) {
                const token = vaultInstance.tokenize(trimmedPart, partMatch.type, `static:sub:${partMatch.type}`);
                reconstructed += part.replace(trimmedPart, token);
                recordEntity(token, partMatch.type);
                hasPartRedacted = true;
              } else {
                reconstructed += part;
              }
            }

            if (hasPartRedacted) {
              this.modifiedTextNodes.set(child, child.textContent);
              child.textContent = reconstructed;
              el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
              continue;
            }
          }

          // 1F. Inline Contact & Phone Detection inside full sentences
          const inlinePhoneMatch = rawText.match(/(?:(?:\+91|0)[ -]?)?[6-9]\d{9}\b|\b0\d{2,4}[ -]?\d{6,8}\b|\b\d{3}[ -]\d{3}[ -]\d{4}\b/);
          if (inlinePhoneMatch && !vaultInstance.isToken(inlinePhoneMatch[0])) {
            const phoneVal = inlinePhoneMatch[0];
            const token = vaultInstance.tokenize(phoneVal, 'PHONE', `static:inline:phone`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(phoneVal, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, 'PHONE');
            continue;
          }

          // 1G. Inline Greeting & Welcome Name inside banners
          const greetingMatch = rawText.match(/(?:welcome|hello|hi|dear|namaste)[\s,:]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i);
          if (greetingMatch && !vaultInstance.isToken(greetingMatch[1])) {
            const nameVal = greetingMatch[1];
            const token = vaultInstance.tokenize(nameVal, 'PERSON', `static:greeting`);
            this.modifiedTextNodes.set(child, child.textContent);
            child.textContent = child.textContent.replace(nameVal, token);
            el.classList.add('sentry-static-redacted', 'sentry-redacted-field');
            recordEntity(token, 'PERSON');
            continue;
          }

          // 2. Check for Currency & Financial Amounts
          const rupeeMatch = rawText.match(/(?:₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d{2})?)/i);
          if (rupeeMatch && !vaultInstance.isToken(rupeeMatch[0])) {
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

  // Helper: Detect whether a table is a graphical chart, heatmap, calendar, or matrix widget
  private isVisualWidgetTable(table: HTMLTableElement): boolean {
    if (table.querySelector('svg, canvas')) return true;

    const role = (table.getAttribute('role') || '').toLowerCase();
    if (['grid', 'img', 'graphics-document'].includes(role)) return true;

    const classAndId = `${table.className || ''} ${table.id || ''}`.toLowerCase();
    if (classAndId.match(/calendar|chart|graph|heatmap|matrix|timeline|activity|contribution/)) return true;

    const sampleCells = table.querySelectorAll('td');
    if (sampleCells.length >= 8) {
      let emptyCount = 0;
      sampleCells.forEach(td => {
        if (!(td.textContent || '').trim()) emptyCount++;
      });
      if (emptyCount / sampleCells.length > 0.4) return true;
    }

    return false;
  }
}

export const staticContentGeneralizerInstance = new StaticContentGeneralizer();
