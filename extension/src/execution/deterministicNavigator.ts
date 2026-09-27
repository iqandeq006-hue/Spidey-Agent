// Zero-AI Deterministic Search & Navigation Engine (Phase 4 & 6)
// Operates 100% offline with zero cloud LLM calls, zero latency overhead, and zero hallucinations.
// Uses structural DOM heuristics, OmniParser icon grounding, and Levenshtein similarity
// to autonomously find search boxes, execute queries, and navigate target links.

import { cdpDispatcherInstance } from './cdpDispatcher';
import { cursorReticleInstance } from './cursorReticle';
import { uiElementLocatorInstance } from '../vision/uiElementLocator';
import { vaultInstance } from '../privacy/vault';

export type DeterministicVerb = 'SEARCH' | 'CLICK' | 'FILL' | 'NAVIGATE' | 'INSPECT';

export interface ParsedCommand {
  raw: string;
  verb: DeterministicVerb;
  targetQuery: string;
  payloadValue?: string;
}

export interface NavigationResult {
  success: boolean;
  executedVerb: DeterministicVerb;
  targetLabel: string;
  targetX?: number;
  targetY?: number;
  message: string;
  latencyMs: number;
}

export class DeterministicNavigator {
  // 1. Parse natural command strings using strict deterministic grammars (No LLM)
  public parseCommand(commandStr: string): ParsedCommand {
    const trimmed = (commandStr || '').trim();
    if (!trimmed) {
      return { raw: '', verb: 'INSPECT', targetQuery: '' };
    }

    const lower = trimmed.toLowerCase();

    // Pattern: search <query> OR find <query>
    if (lower.startsWith('search ') || lower.startsWith('find ')) {
      const query = trimmed.replace(/^(search|find)\s+/i, '').trim();
      return { raw: trimmed, verb: 'SEARCH', targetQuery: query };
    }

    // Pattern: click <target> OR tap <target> OR press <target>
    if (lower.startsWith('click ') || lower.startsWith('tap ') || lower.startsWith('press ')) {
      const target = trimmed.replace(/^(click|tap|press)\s+/i, '').trim();
      return { raw: trimmed, verb: 'CLICK', targetQuery: target };
    }

    // Pattern: fill <field> with <value> OR type <value> into <field>
    const fillMatch = trimmed.match(/^fill\s+(.+?)\s+with\s+(.+)$/i);
    if (fillMatch) {
      return {
        raw: trimmed,
        verb: 'FILL',
        targetQuery: fillMatch[1].trim(),
        payloadValue: fillMatch[2].trim()
      };
    }

    const typeMatch = trimmed.match(/^type\s+(.+?)\s+into\s+(.+)$/i);
    if (typeMatch) {
      return {
        raw: trimmed,
        verb: 'FILL',
        targetQuery: typeMatch[2].trim(),
        payloadValue: typeMatch[1].trim()
      };
    }

    // Pattern: go to <url> OR navigate to <url> OR open <url>
    if (/^(go\s+to|navigate\s+to|open)\s+/i.test(lower)) {
      const url = trimmed.replace(/^(go\s+to|navigate\s+to|open)\s+/i, '').trim();
      return { raw: trimmed, verb: 'NAVIGATE', targetQuery: url };
    }

    // Default: treat ambiguous queries as a site search
    return { raw: trimmed, verb: 'SEARCH', targetQuery: trimmed };
  }

  // 2. Execute parsed command deterministically on current page
  public async executeCommand(commandStr: string, tabId: number = 0): Promise<NavigationResult> {
    const startTime = performance.now();
    const parsed = this.parseCommand(commandStr);

    console.log(`[DeterministicNavigator] Executing [${parsed.verb}] for query: "${parsed.targetQuery}"`);

    switch (parsed.verb) {
      case 'SEARCH':
        return await this.executeSiteSearch(parsed.targetQuery, tabId, startTime);
      case 'CLICK':
        return await this.executeFuzzyClick(parsed.targetQuery, tabId, startTime);
      case 'FILL':
        return await this.executeFieldFill(parsed.targetQuery, parsed.payloadValue || '', tabId, startTime);
      case 'NAVIGATE':
        return await this.executeDirectNavigation(parsed.targetQuery, startTime);
      default:
        return {
          success: false,
          executedVerb: 'INSPECT',
          targetLabel: '',
          message: `Unrecognized command: "${commandStr}"`,
          latencyMs: Math.round(performance.now() - startTime)
        };
    }
  }

  // A. Deterministic Site Search
  private async executeSiteSearch(query: string, tabId: number, startTime: number): Promise<NavigationResult> {
    // 1. Locate primary search input using structural heuristic ranking
    const searchInput = this.locateSearchInput();
    if (!searchInput) {
      return {
        success: false,
        executedVerb: 'SEARCH',
        targetLabel: '',
        message: 'No search input element found on the active page.',
        latencyMs: Math.round(performance.now() - startTime)
      };
    }

    // 2. Animate HUD reticle to search box
    const rect = searchInput.getBoundingClientRect();
    const centerX = Math.round(rect.left + rect.width / 2);
    const centerY = Math.round(rect.top + rect.height / 2);
    await cursorReticleInstance.glideTo(centerX, centerY, 'Search Input Box', 'TYPE');

    // 3. Clear existing text and type query via hardware CDP
    searchInput.focus();
    searchInput.value = '';
    await cdpDispatcherInstance.hardwareType(tabId, query, searchInput);

    // 4. Trigger search execution: look for adjacent submit button or press Enter
    const searchForm = searchInput.closest('form');
    const submitBtn = searchForm?.querySelector<HTMLButtonElement | HTMLInputElement>(
      'button[type="submit"], input[type="submit"], button:not([type])'
    );

    if (submitBtn) {
      const btnRect = submitBtn.getBoundingClientRect();
      const bx = Math.round(btnRect.left + btnRect.width / 2);
      const by = Math.round(btnRect.top + btnRect.height / 2);
      await cursorReticleInstance.glideTo(bx, by, 'Search Submit Button', 'CLICK');
      await cdpDispatcherInstance.hardwareClick(tabId, bx, by, submitBtn);
    } else {
      // Hardware Enter Key
      await cdpDispatcherInstance.hardwareKey(tabId, 'Enter');
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    return {
      success: true,
      executedVerb: 'SEARCH',
      targetLabel: searchInput.placeholder || 'Search Box',
      targetX: centerX,
      targetY: centerY,
      message: `Executed search for "${query}" in ${Math.round(performance.now() - startTime)}ms`,
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // B. Fuzzy Text & Semantic Click Matcher
  private async executeFuzzyClick(targetText: string, tabId: number, startTime: number): Promise<NavigationResult> {
    const candidates = document.querySelectorAll<HTMLElement>(
      'button, a[href], [role="button"], input[type="button"], input[type="submit"], [tabindex="0"]'
    );

    let bestElement: HTMLElement | null = null;
    let highestScore = 0;
    const targetNorm = targetText.toLowerCase();

    candidates.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      const title = (el.getAttribute('title') || '').trim().toLowerCase();

      let score = 0;

      // Exact match = 1.0
      if (text === targetNorm || aria === targetNorm || title === targetNorm) {
        score = 1.0;
      } else if (text.includes(targetNorm) || aria.includes(targetNorm)) {
        // Substring match weighted by length ratio
        score = 0.70 + (targetNorm.length / Math.max(text.length, 1)) * 0.25;
      } else {
        // Levenshtein similarity
        const sim = this.computeSimilarity(targetNorm, text.substring(0, 50));
        if (sim > 0.50) score = sim * 0.75;
      }

      if (score > highestScore) {
        highestScore = score;
        bestElement = el;
      }
    });

    // Check OmniParser icon buttons if DOM text match is weak
    if (highestScore < 0.60) {
      const iconButtons = uiElementLocatorInstance.detectUnlabeledIconButtons();
      for (const icon of iconButtons) {
        if (icon.label.toLowerCase().includes(targetNorm) || targetNorm.includes(icon.label.toLowerCase())) {
          highestScore = 0.85;
          // Locate corresponding DOM element
          const allButtons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));
          const matched = allButtons.find(b => {
            const r = b.getBoundingClientRect();
            return Math.abs(r.left - icon.x) < 5 && Math.abs(r.top - icon.y) < 5;
          });
          if (matched) {
            bestElement = matched;
            break;
          }
        }
      }
    }

    if (!bestElement || highestScore < 0.40) {
      return {
        success: false,
        executedVerb: 'CLICK',
        targetLabel: targetText,
        message: `Could not locate interactive target matching "${targetText}". Best match score: ${Math.round(highestScore * 100)}%`,
        latencyMs: Math.round(performance.now() - startTime)
      };
    }

    const rect = (bestElement as HTMLElement).getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    const label = ((bestElement as HTMLElement).textContent || '').trim().substring(0, 30) || targetText;

    await cursorReticleInstance.glideTo(cx, cy, label, 'CLICK');
    await cdpDispatcherInstance.hardwareClick(tabId, cx, cy, bestElement as HTMLElement);

    return {
      success: true,
      executedVerb: 'CLICK',
      targetLabel: label,
      targetX: cx,
      targetY: cy,
      message: `Clicked "${label}" (Match: ${Math.round(highestScore * 100)}%) in ${Math.round(performance.now() - startTime)}ms`,
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // C. Deterministic Field Fill
  private async executeFieldFill(
    fieldName: string,
    value: string,
    tabId: number,
    startTime: number
  ): Promise<NavigationResult> {
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
    );

    let bestInput: HTMLInputElement | HTMLTextAreaElement | null = null;
    let highestScore = 0;
    const targetNorm = fieldName.toLowerCase();

    inputs.forEach((input) => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();

      // Check closest label element
      const labelEl = input.id ? document.querySelector(`label[for="${input.id}"]`) : input.closest('label');
      const labelText = (labelEl?.textContent || '').toLowerCase();

      let score = 0;
      if (name.includes(targetNorm) || id.includes(targetNorm)) score += 0.85;
      if (placeholder.includes(targetNorm) || aria.includes(targetNorm)) score += 0.80;
      if (labelText.includes(targetNorm)) score += 0.90;

      if (score > highestScore) {
        highestScore = score;
        bestInput = input;
      }
    });

    if (!bestInput || highestScore < 0.40) {
      return {
        success: false,
        executedVerb: 'FILL',
        targetLabel: fieldName,
        message: `Field matching "${fieldName}" not found.`,
        latencyMs: Math.round(performance.now() - startTime)
      };
    }

    const rect = (bestInput as HTMLInputElement).getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);

    await cursorReticleInstance.glideTo(cx, cy, fieldName, 'TYPE');
    (bestInput as HTMLInputElement).focus();

    // Rehydrate value if it's a vault token, otherwise use value directly
    const realVal = vaultInstance.rehydrate(value);
    await cdpDispatcherInstance.hardwareType(tabId, realVal, bestInput as HTMLInputElement);

    return {
      success: true,
      executedVerb: 'FILL',
      targetLabel: fieldName,
      targetX: cx,
      targetY: cy,
      message: `Filled "${fieldName}" with value in ${Math.round(performance.now() - startTime)}ms`,
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // D. Direct Navigation
  private async executeDirectNavigation(url: string, startTime: number): Promise<NavigationResult> {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    }

    return {
      success: true,
      executedVerb: 'NAVIGATE',
      targetLabel: targetUrl,
      message: `Navigating to ${targetUrl}`,
      latencyMs: Math.round(performance.now() - startTime)
    };
  }

  // Structural Heuristic Search Box Locator across real-world web domains
  private locateSearchInput(): HTMLInputElement | HTMLTextAreaElement | null {
    // 1. Explicit search input
    const typeSearch = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (typeSearch && this.isElementVisible(typeSearch)) return typeSearch;

    // 2. High-profile search elements (Google, Wikipedia, Amazon, YouTube, GitHub, portals)
    const knownSearch = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'textarea[name="q" i], input[name="q" i], input#searchInput, input#search, input#twotabsearchtextbox, input[name="query" i], input[id*="search" i]'
    );
    if (knownSearch && this.isElementVisible(knownSearch)) return knownSearch;

    // 3. Elements with search attributes
    const attrSearch = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input[name*="search" i], textarea[name*="search" i], input[placeholder*="search" i], textarea[placeholder*="search" i], input[aria-label*="search" i], textarea[aria-label*="search" i]'
    );
    if (attrSearch && this.isElementVisible(attrSearch)) return attrSearch;

    // 4. Input inside a search form or role="search"
    const roleSearch = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      '[role="search"] input:not([type="hidden"]), [role="search"] textarea, form[action*="search" i] input:not([type="hidden"])'
    );
    if (roleSearch && this.isElementVisible(roleSearch)) return roleSearch;

    // 5. Fallback: single primary text input or textarea on page
    const allInputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], input:not([type]), textarea'
    )).filter(el => this.isElementVisible(el));

    if (allInputs.length === 1) return allInputs[0];

    return null;
  }

  private isElementVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  // Fast Levenshtein-based similarity (0.0 to 1.0)
  private computeSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;

    let previousRow: number[] = Array.from({ length: shorter.length + 1 }, (_, i) => i);
    for (let i = 0; i < longer.length; i++) {
      const currentRow = [i + 1];
      for (let j = 0; j < shorter.length; j++) {
        const cost = longer[i] === shorter[j] ? 0 : 1;
        currentRow.push(Math.min(
          currentRow[j] + 1,       // insertion
          previousRow[j + 1] + 1,  // deletion
          previousRow[j] + cost    // substitution
        ));
      }
      previousRow = currentRow;
    }

    const editDistance = previousRow[shorter.length];
    return (longerLength - editDistance) / longerLength;
  }
}

export const deterministicNavigatorInstance = new DeterministicNavigator();
