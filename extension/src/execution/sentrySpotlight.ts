// SentryAgent In-Page Floating Spotlight Command Bar (Zero-AI HUD)
// Triggered via Ctrl+Shift+K (or Cmd+Shift+K) / Alt+S on any webpage.
// Operates in an isolated Shadow DOM with zero CSS bleed.
// Enables sub-millisecond keyword search, button clicks, form fills, and privacy commands with 0 LLM tokens.

import { deterministicNavigatorInstance } from './deterministicNavigator';
import { cursorReticleInstance } from './cursorReticle';

export class SentrySpotlight {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private isOpen: boolean = false;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLDivElement | null = null;
  private statusBadgeEl: HTMLSpanElement | null = null;

  // Callbacks for global page commands
  private onSanitize?: () => Promise<any>;
  private onSeal?: () => Promise<any>;
  private onRestore?: () => Promise<any>;

  constructor() {
    this.registerGlobalHotkey();
  }

  public registerCallbacks(opts: {
    onSanitize?: () => Promise<any>;
    onSeal?: () => Promise<any>;
    onRestore?: () => Promise<any>;
  }) {
    this.onSanitize = opts.onSanitize;
    this.onSeal = opts.onSeal;
    this.onRestore = opts.onRestore;
  }

  private registerGlobalHotkey(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Shortcut 1: Ctrl+Shift+K or Cmd+Shift+K
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
        return;
      }

      // Shortcut 2: Alt+S
      if (e.altKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
        return;
      }

      // Escape key closes spotlight
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    }, true);
  }

  private ensureMounted(): void {
    if (this.container && document.body.contains(this.container)) return;

    this.container = document.createElement('div');
    this.container.id = 'sentry-spotlight-root';
    this.container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
      display: none;
    `;

    this.shadow = this.container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(10, 15, 29, 0.65);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 14vh;
        animation: fadeIn 0.15s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes popIn {
        from { transform: scale(0.96) translateY(-10px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }

      .palette {
        width: 640px;
        max-width: 92vw;
        background: rgba(15, 23, 42, 0.95);
        border: 1.5px solid rgba(56, 189, 248, 0.4);
        border-radius: 14px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(6, 182, 212, 0.25);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'JetBrains Mono', monospace;
        color: #f1f5f9;
        animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .palette-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: rgba(30, 41, 59, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.8px;
        color: #38bdf8;
        text-transform: uppercase;
      }

      .brand-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f59e0b;
        box-shadow: 0 0 8px #f59e0b;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #94a3b8;
      }

      .kbd-badge {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-family: monospace;
        color: #cbd5e1;
      }

      .input-wrapper {
        position: relative;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .search-icon {
        font-size: 18px;
        color: #38bdf8;
      }

      input.command-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: #f8fafc;
        font-family: inherit;
      }

      input.command-input::placeholder {
        color: #64748b;
      }

      .status-pill {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #34d399;
        font-weight: 600;
        white-space: nowrap;
        display: none;
      }

      .chips-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        overflow-x: auto;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        background: rgba(15, 23, 42, 0.4);
      }

      .chip-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }

      .chip-btn:hover {
        background: rgba(56, 189, 248, 0.2);
        border-color: #38bdf8;
        color: #38bdf8;
        transform: translateY(-1px);
      }

      .results-area {
        max-height: 240px;
        overflow-y: auto;
        padding: 8px 0;
      }

      .result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        cursor: pointer;
        transition: background 0.1s ease;
        border-left: 2px solid transparent;
      }

      .result-item:hover, .result-item.active {
        background: rgba(56, 189, 248, 0.12);
        border-left-color: #38bdf8;
      }

      .item-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .item-verb {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(56, 189, 248, 0.2);
        color: #38bdf8;
        letter-spacing: 0.5px;
      }

      .item-title {
        font-size: 13px;
        color: #f1f5f9;
        font-weight: 500;
      }

      .item-subtitle {
        font-size: 11px;
        color: #94a3b8;
      }

      .item-right {
        font-size: 11px;
        color: #64748b;
        font-family: monospace;
      }

      .footer-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: rgba(10, 15, 29, 0.7);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 11px;
        color: #64748b;
      }

      .footer-shortcuts {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    `;

    this.shadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const palette = document.createElement('div');
    palette.className = 'palette';

    palette.innerHTML = `
      <div class="palette-header">
        <div class="brand">
          <div class="brand-dot"></div>
          <span>SentryAgent Zero-AI Spotlight</span>
        </div>
        <div class="header-right">
          <span>0 Cloud LLM Calls</span>
          <span class="kbd-badge">ESC to close</span>
        </div>
      </div>
      <div class="input-wrapper">
        <span class="search-icon">⚡</span>
        <input class="command-input" type="text" placeholder="Type: search cryogenic, click download, sanitize, seal..." spellcheck="false" autocomplete="off" />
        <span class="status-pill" id="sentry-status-badge">✓ 0.8ms</span>
      </div>
      <div class="chips-bar">
        <button class="chip-btn" data-cmd="search ">🔍 Search Page</button>
        <button class="chip-btn" data-cmd="click ">⚡ Click Button</button>
        <button class="chip-btn" data-cmd="sanitize">🛡️ Sanitize DOM</button>
        <button class="chip-btn" data-cmd="seal">🔒 Seal & Verify</button>
        <button class="chip-btn" data-cmd="restore">🔄 Restore DOM</button>
        <button class="chip-btn" data-cmd="sidepanel">◫ Side Panel</button>
      </div>
      <div class="results-area" id="sentry-results"></div>
      <div class="footer-bar">
        <div><span>Engine:</span> <strong style="color: #38bdf8;">Deterministic DOM + OmniParser Heuristics</strong></div>
        <div class="footer-shortcuts">
          <span><span class="kbd-badge">↵</span> Execute</span>
          <span><span class="kbd-badge">Ctrl+Shift+K</span> Toggle</span>
        </div>
      </div>
    `;

    backdrop.appendChild(palette);
    this.shadow.appendChild(backdrop);
    document.body.appendChild(this.container);

    this.inputEl = this.shadow.querySelector('input.command-input') as HTMLInputElement;
    this.resultsEl = this.shadow.querySelector('#sentry-results') as HTMLDivElement;
    this.statusBadgeEl = this.shadow.querySelector('#sentry-status-badge') as HTMLSpanElement;

    // Attach chip event listeners
    const chips = this.shadow.querySelectorAll('.chip-btn');
    chips.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).getAttribute('data-cmd') || '';
        if (cmd === 'sanitize' || cmd === 'seal' || cmd === 'restore' || cmd === 'sidepanel') {
          this.executeSpecialCommand(cmd);
        } else {
          if (this.inputEl) {
            this.inputEl.value = cmd;
            this.inputEl.focus();
            this.renderSuggestions(cmd);
          }
        }
      });
    });

    // Input events
    this.inputEl?.addEventListener('input', () => {
      const val = this.inputEl?.value || '';
      this.renderSuggestions(val);
    });

    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = this.inputEl?.value.trim() || '';
        if (val) {
          this.execute(val);
        }
      }
    });
  }

  // Render live predictive suggestions matching page elements
  private renderSuggestions(query: string): void {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Default help suggestions
      this.resultsEl.innerHTML = `
        <div class="result-item" data-cmd="search tender">
          <div class="item-left">
            <span class="item-verb">SEARCH</span>
            <div>
              <div class="item-title">Search active page for keywords</div>
              <div class="item-subtitle">e.g. search propellant, find registration</div>
            </div>
          </div>
          <div class="item-right">&lt; 1ms</div>
        </div>
        <div class="result-item" data-cmd="click submit">
          <div class="item-left">
            <span class="item-verb" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">CLICK</span>
            <div>
              <div class="item-title">Click buttons, icons, or navigation links</div>
              <div class="item-subtitle">e.g. click download, click submit, tap login</div>
            </div>
          </div>
          <div class="item-right">&lt; 1ms</div>
        </div>
        <div class="result-item" data-cmd="sanitize">
          <div class="item-left">
            <span class="item-verb" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">SECURITY</span>
            <div>
              <div class="item-title">Scan & Anonymize On-Device</div>
              <div class="item-subtitle">Redacts Aadhaar, PAN, GSTIN & Canvas visual signatures</div>
            </div>
          </div>
          <div class="item-right">L0-L2</div>
        </div>
      `;
    } else {
      // Live DOM scanning for matching targets
      const parsed = deterministicNavigatorInstance.parseCommand(trimmed);
      const candidates: Array<{ label: string; role: string; score: number; x: number; y: number }> = [];

      const interactives = document.querySelectorAll<HTMLElement>(
        'button, a, input, select, textarea, [role="button"], [onclick]'
      );

      const searchTerms = parsed.targetQuery.toLowerCase().split(/\s+/).filter(Boolean);

      interactives.forEach((el) => {
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '').trim();
        if (!text || text.length > 80) return;

        const lowerText = text.toLowerCase();
        let matches = 0;
        for (const t of searchTerms) {
          if (lowerText.includes(t)) matches++;
        }

        if (matches > 0) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            candidates.push({
              label: text,
              role: el.tagName.toLowerCase(),
              score: matches / searchTerms.length,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            });
          }
        }
      });

      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        candidates.slice(0, 5).forEach((cand) => {
          const item = document.createElement('div');
          item.className = 'result-item';
          item.innerHTML = `
            <div class="item-left">
              <span class="item-verb">${parsed.verb}</span>
              <div>
                <div class="item-title">${this.escapeHtml(cand.label)}</div>
                <div class="item-subtitle">&lt;${cand.role}&gt; at (${cand.x}, ${cand.y})</div>
              </div>
            </div>
            <div class="item-right">Match: ${Math.round(cand.score * 100)}%</div>
          `;
          item.addEventListener('click', () => {
            this.execute(`${parsed.verb.toLowerCase()} ${cand.label}`);
          });
          this.resultsEl?.appendChild(item);
        });
      } else {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
          <div class="item-left">
            <span class="item-verb">${parsed.verb}</span>
            <div>
              <div class="item-title">Execute "${this.escapeHtml(query)}"</div>
              <div class="item-subtitle">Press Enter to dispatch directly via deterministic engine</div>
            </div>
          </div>
          <div class="item-right">Enter ↵</div>
        `;
        item.addEventListener('click', () => {
          this.execute(query);
        });
        this.resultsEl?.appendChild(item);
      }
    }

    // Attach click to items
    this.resultsEl.querySelectorAll('.result-item[data-cmd]').forEach((item) => {
      item.addEventListener('click', () => {
        const cmd = item.getAttribute('data-cmd') || '';
        if (cmd === 'sanitize') {
          this.executeSpecialCommand('sanitize');
        } else {
          if (this.inputEl) {
            this.inputEl.value = cmd;
            this.inputEl.focus();
            this.renderSuggestions(cmd);
          }
        }
      });
    });
  }

  // Handle special built-in commands
  private async executeSpecialCommand(cmd: string): Promise<void> {
    const startTime = performance.now();
    if (cmd === 'sanitize') {
      this.showStatus('Sanitizing...', '#38bdf8');
      if (this.onSanitize) {
        const rep = await this.onSanitize();
        const elapsed = Math.round(performance.now() - startTime);
        this.showStatus(`✓ Redacted ${rep?.totalRedacted || 0} items in ${elapsed}ms`, '#34d399');
      }
      setTimeout(() => this.close(), 700);
      return;
    }

    if (cmd === 'seal') {
      this.showStatus('Verifying SHA-256 seal...', '#38bdf8');
      if (this.onSeal) {
        const res = await this.onSeal();
        const elapsed = Math.round(performance.now() - startTime);
        this.showStatus(`✓ Sealed (Digest: ${res?.wirePayload?.digestSha256?.substring(0, 8)}...) in ${elapsed}ms`, '#34d399');
      }
      setTimeout(() => this.close(), 900);
      return;
    }

    if (cmd === 'restore') {
      this.showStatus('Restoring DOM...', '#f59e0b');
      if (this.onRestore) {
        await this.onRestore();
        this.showStatus('✓ DOM Restored', '#34d399');
      }
      setTimeout(() => this.close(), 600);
      return;
    }

    if (cmd === 'sidepanel') {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      this.close();
      return;
    }
  }

  // Execute full command string
  public async execute(commandStr: string): Promise<void> {
    const trimmed = commandStr.trim().toLowerCase();
    if (trimmed === 'sanitize' || trimmed === 'seal' || trimmed === 'restore' || trimmed === 'sidepanel') {
      await this.executeSpecialCommand(trimmed);
      return;
    }

    this.showStatus('Dispatching...', '#38bdf8');
    const result = await deterministicNavigatorInstance.executeCommand(commandStr);

    if (result.success) {
      this.showStatus(`✓ ${result.message} (${result.latencyMs}ms)`, '#34d399');
      // Trigger cursor reticle visual feedback if target coordinates are available
      if (result.targetX !== undefined && result.targetY !== undefined) {
        cursorReticleInstance.glideTo(result.targetX, result.targetY, result.targetLabel || 'Target', result.executedVerb);
      }
      setTimeout(() => {
        this.close();
      }, 650);
    } else {
      this.showStatus(`⚠ ${result.message} (${result.latencyMs}ms)`, '#f87171');
    }
  }

  private showStatus(msg: string, color: string): void {
    if (!this.statusBadgeEl) return;
    this.statusBadgeEl.textContent = msg;
    this.statusBadgeEl.style.display = 'inline-block';
    this.statusBadgeEl.style.color = color;
    this.statusBadgeEl.style.borderColor = color;
  }

  public open(): void {
    this.ensureMounted();
    if (this.container) {
      this.container.style.display = 'block';
      this.isOpen = true;
      setTimeout(() => {
        this.inputEl?.focus();
        this.inputEl?.select();
        this.renderSuggestions(this.inputEl?.value || '');
      }, 50);
    }
  }

  public close(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isOpen = false;
      if (this.statusBadgeEl) this.statusBadgeEl.style.display = 'none';
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return '&#39;';
      }
    });
  }
}

export const sentrySpotlightInstance = new SentrySpotlight();
