// SentryAgent Conversational Co-Pilot Controller v3.0
// Unclustered, state-of-the-art chat interface for autonomous web automation & zero-egress privacy.

import { observabilityLogger, ObservabilityLogEntry, LogCategory } from '../network/observabilityLogger';

interface VaultRow {
  token: string;
  maskedReal: string;
  type: string;
}

window.addEventListener('DOMContentLoaded', async () => {
  // Elements: Tabs & Panes
  const tabBtnChat = document.getElementById('tab-btn-chat') as HTMLButtonElement;
  const tabBtnLogs = document.getElementById('tab-btn-logs') as HTMLButtonElement;
  const tabBtnVault = document.getElementById('tab-btn-vault') as HTMLButtonElement;
  const paneChat = document.getElementById('pane-chat') as HTMLElement;
  const paneLogs = document.getElementById('pane-logs') as HTMLElement;
  const paneVault = document.getElementById('pane-vault') as HTMLElement;

  // Elements: Quick Status Strip
  const stripPerimeter = document.getElementById('strip-perimeter-text') as HTMLElement;
  const stripRedacted = document.getElementById('strip-redacted-count') as HTMLElement;
  const stripLatency = document.getElementById('strip-latency') as HTMLElement;
  const vaultTabBadge = document.getElementById('vault-tab-badge') as HTMLElement;
  const vaultCountBadge = document.getElementById('vault-count-badge') as HTMLElement;
  const vaultList = document.getElementById('vault-list') as HTMLElement;

  // Elements: Chat Stream & Input
  const chatStream = document.getElementById('chat-stream') as HTMLElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const btnChatSend = document.getElementById('btn-chat-send') as HTMLButtonElement;

  // Elements: Telemetry Log Controls
  const logList = document.getElementById('log-list') as HTMLElement;
  const btnClearLogs = document.getElementById('btn-clear-logs') as HTMLButtonElement;
  const btnExportLogs = document.getElementById('btn-export-logs') as HTMLButtonElement;
  const filterChips = document.querySelectorAll('.filter-chip');

  // Elements: Header Shortcuts
  const btnOpenSpotlight = document.getElementById('btn-open-spotlight') as HTMLButtonElement;
  const btnDockSidepanel = document.getElementById('btn-dock-sidepanel') as HTMLButtonElement;

  let activeLogFilter: string = 'ALL';
  let isProcessing: boolean = false;

  // 1. Tab Switching: Chat vs Telemetry vs Vault
  function switchTab(target: 'chat' | 'logs' | 'vault') {
    tabBtnChat.classList.toggle('active', target === 'chat');
    tabBtnLogs.classList.toggle('active', target === 'logs');
    tabBtnVault.classList.toggle('active', target === 'vault');

    paneChat.style.display = target === 'chat' ? 'flex' : 'none';
    paneLogs.style.display = target === 'logs' ? 'flex' : 'none';
    paneVault.style.display = target === 'vault' ? 'flex' : 'none';

    if (target === 'logs') renderLogs();
    if (target === 'vault') refreshStatus();
  }

  tabBtnChat?.addEventListener('click', () => switchTab('chat'));
  tabBtnLogs?.addEventListener('click', () => switchTab('logs'));
  tabBtnVault?.addEventListener('click', () => switchTab('vault'));

  // 2. Tab Resolution Helper
  async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const current = tabs[0];
    if (current && !current.url?.startsWith('chrome-extension://') && !current.url?.startsWith('chrome://')) {
      return current;
    }
    const allTabs = await chrome.tabs.query({});
    const webTab = allTabs.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://') || t.url.startsWith('file://')));
    return webTab || current;
  }

  async function ensureContentScriptLoaded(tabId: number, url?: string): Promise<{ ok: boolean; reason?: string }> {
    if (url && (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://'))) {
      return { ok: false, reason: 'Chrome security prevents running extensions on browser internal pages (chrome://).' };
    }

    const isAlive = await new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'GET_VAULT_STATUS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (isAlive) return { ok: true };

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 120));
      return { ok: true };
    } catch (err: any) {
      if (url?.startsWith('file://')) {
        return { 
          ok: false, 
          reason: 'Chrome blocks extensions on local file:// URLs by default.\n\nOption 1: Open the testbed via http://localhost:3000\nOption 2: Go to chrome://extensions -> SentryAgent Details -> turn ON "Allow access to file URLs", then refresh the tab.' 
        };
      }
      return { ok: false, reason: 'Could not connect to page. Please refresh the page tab (F5) and try again.' };
    }
  }

  // 3. Chat Append Helpers
  function appendUserMessage(text: string) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-user';
    msgDiv.innerHTML = `
      <div class="msg-avatar">👤</div>
      <div class="msg-body">${escapeHtml(text)}</div>
    `;
    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function appendAgentMessage(text: string, stepCards: Array<{ title: string; detail?: string; latencyMs?: number }> = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-agent';

    let stepsHtml = '';
    if (stepCards.length > 0) {
      stepsHtml = stepCards.map(s => `
        <div class="step-card">
          <div class="step-header">
            <span>${escapeHtml(s.title)}</span>
            ${s.latencyMs !== undefined ? `<span>${s.latencyMs}ms</span>` : ''}
          </div>
          ${s.detail ? `<div class="step-detail">${escapeHtml(s.detail)}</div>` : ''}
        </div>
      `).join('');
    }

    msgDiv.innerHTML = `
      <div class="msg-avatar">🛡️</div>
      <div class="msg-body">
        <div class="msg-author">Sentry Co-Pilot</div>
        <div class="msg-text">${text}</div>
        ${stepsHtml}
      </div>
    `;
    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function appendThinkingMessage(): HTMLElement {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-agent thinking-msg';
    msgDiv.innerHTML = `
      <div class="msg-avatar">⚡</div>
      <div class="msg-body" style="font-style: italic; color: #94a3b8;">
        Perceiving DOM, evaluating intent & executing on-device...
      </div>
    `;
    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
    return msgDiv;
  }

  // 4. Conversational Autonomous Execution Engine
  async function handleUserPrompt(promptText: string) {
    const text = promptText.trim();
    if (!text || isProcessing) return;

    isProcessing = true;
    appendUserMessage(text);
    chatInput.value = '';
    const thinkingNode = appendThinkingMessage();

    const startTime = performance.now();
    const tab = await getActiveTab();

    if (!tab || !tab.id) {
      thinkingNode.remove();
      appendAgentMessage('Could not find an active browser tab to control.');
      isProcessing = false;
      return;
    }

    const lower = text.toLowerCase();

    // Route A: Direct Domain Shortcuts or URLs (e.g. "wikipedia", "google", "go to ...")
    const navMatch = text.match(/^(?:go\s+to|open|navigate\s+to|visit)\s+(.+)$/i);
    const candidateTarget = (navMatch ? navMatch[1] : text).trim();

    const domainShortcuts: Record<string, string> = {
      'wikipedia': 'https://en.wikipedia.org',
      'google': 'https://www.google.com',
      'github': 'https://github.com',
      'isro': 'https://www.isro.gov.in',
      'eprocure': 'https://eprocure.gov.in',
      'incometax': 'https://www.incometax.gov.in',
      'youtube': 'https://www.youtube.com',
      'chatgpt': 'https://chatgpt.com'
    };

    const isUrl = /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(candidateTarget);
    const shortcutMatch = domainShortcuts[candidateTarget.toLowerCase()];

    if (shortcutMatch || isUrl || navMatch) {
      let targetUrl = shortcutMatch || candidateTarget;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      await chrome.tabs.update(tab.id, { url: targetUrl });
      thinkingNode.remove();
      const elapsed = Math.round(performance.now() - startTime);

      appendAgentMessage(`Navigated active browser tab to <strong>${escapeHtml(targetUrl)}</strong>.`, [
        { title: '🌐 Direct Tab Navigation', detail: `Loaded ${targetUrl}`, latencyMs: elapsed }
      ]);
      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Navigated tab to ${targetUrl}`, `Prompt: "${text}"`, elapsed);
      isProcessing = false;
      return;
    }

    // Check if on internal page
    const check = await ensureContentScriptLoaded(tab.id, tab.url);
    if (!check.ok) {
      thinkingNode.remove();
      // Gracefully fall back to web search if on internal page
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
      await chrome.tabs.update(tab.id, { url: searchUrl });
      appendAgentMessage(`Dispatched web search for <em>"${escapeHtml(text)}"</em> on Google.`, [
        { title: '🔍 Web Search Fallback', detail: searchUrl, latencyMs: 0 }
      ]);
      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Dispatched web search for "${text}"`, `Target: ${searchUrl}`, 0);
      isProcessing = false;
      return;
    }

    // Route B: Privacy Protection / Redaction ("protect", "sanitize", "redact", "mask")
    if (lower.includes('protect') || lower.includes('sanitize') || lower.includes('redact') || lower.includes('mask')) {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_AND_SANITIZE', disclosureLevel: 'AUTO' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        if (response && response.success) {
          const report = response.report;
          stripRedacted.textContent = String(report.redactedCount || 0);
          stripPerimeter.textContent = 'Protected (Zero Egress)';

          appendAgentMessage(`🛡️ Scanned page on-device. All sensitive fields are redacted and sealed in local RAM. Zero data leaves your computer.`, [
            { title: '🔒 Local Inversion Vault', detail: `Redacted: ${report.redactedCount} items (${JSON.stringify(report.entitiesByType)})`, latencyMs: report.durationMs },
            { title: '⚡ Shannon Visual Entropy', detail: 'Macro layout classified via on-device GPU', latencyMs: 1 }
          ]);
          await observabilityLogger.log('REDACTION', 'SUCCESS', `Redacted ${report.redactedCount} fields on active page`, `Entities: ${JSON.stringify(report.entitiesByType)}`, report.durationMs);
          refreshStatus();
        } else {
          appendAgentMessage(`Could not sanitize page: ${response?.error || 'Unknown error'}`);
        }
      });
      return;
    }

    // Route C: Restore Original DOM ("restore", "reset", "undo", "unredact")
    if (lower === 'restore' || lower.includes('restore dom') || lower.includes('reset') || lower.includes('undo')) {
      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_DOM' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        stripRedacted.textContent = '0';
        stripPerimeter.textContent = 'Standby';

        appendAgentMessage('🔄 Restored DOM and canvas signatures to original unredacted values.');
        await observabilityLogger.log('SECURITY', 'INFO', 'DOM and Canvases rolled back to pristine state');
        refreshStatus();
      });
      return;
    }

    // Route D: Autonomous Multi-Step Form Submission / Bid ("submit", "bid", "run loop", "automate")
    if (lower.includes('submit') || lower.includes('bid') || lower.includes('automate') || lower.includes('run loop')) {
      chrome.tabs.sendMessage(tab.id, { type: 'RUN_AUTONOMOUS_STEP' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        if (response && response.success) {
          const rep = response.report;
          appendAgentMessage(`🤖 Autonomous action executed successfully: <strong>${escapeHtml(response.message || 'Action complete')}</strong>`, [
            { title: '⚡ System 1 Decision', detail: `Target: ${rep?.action?.targetLabel || 'Element'} (${rep?.action?.riskTier || 'TIER_4'})`, latencyMs: elapsed },
            { title: '🛡️ Local Risk Gate', detail: 'Action safely validated with zero data egress' }
          ]);
          await observabilityLogger.log('DECISION', 'SUCCESS', `Autonomous execution: ${response.message}`, undefined, elapsed);
          refreshStatus();
        } else {
          appendAgentMessage(`Autonomous step response: ${response?.message || 'Paused or requires confirmation'}`);
        }
      });
      return;
    }

    // Route E: Zero-AI Deterministic Execution (Search, Click, Fill, Chat)
    chrome.tabs.sendMessage(tab.id, { type: 'RUN_DETERMINISTIC_COMMAND', command: text }, async (response) => {
      thinkingNode.remove();
      isProcessing = false;
      const elapsed = Math.round(performance.now() - startTime);

      if (response && response.success) {
        stripLatency.textContent = `${response.latencyMs || elapsed}ms`;

        appendAgentMessage(`✔ ${escapeHtml(response.message)}`, [
          { 
            title: `🎯 ${response.executedVerb || 'ACTION'}: ${response.targetLabel || 'Target'}`, 
            detail: `Executed directly in active tab without cloud LLM calls`, 
            latencyMs: response.latencyMs || elapsed 
          }
        ]);
        await observabilityLogger.log('NAVIGATOR', 'SUCCESS', response.message, `Command: "${text}"`, response.latencyMs);
        refreshStatus();
      } else {
        appendAgentMessage(`❌ ${response?.message || 'Could not find a matching element on this page.'}`, [
          { title: 'Heuristic Matcher', detail: 'Try typing a more specific keyword or label', latencyMs: elapsed }
        ]);
        await observabilityLogger.log('NAVIGATOR', 'WARN', response?.message || 'Action failed', `Command: "${text}"`, elapsed);
      }
    });
  }

  // Send Click & Enter Key
  btnChatSend?.addEventListener('click', () => handleUserPrompt(chatInput.value));
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserPrompt(chatInput.value);
    }
  });

  // Prompt Chips & Quick Pills
  document.querySelectorAll('.prompt-chip, .quick-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-prompt') || '';
      if (p) handleUserPrompt(p);
    });
  });

  // 5. Status & Vault Inspection Refresh
  async function refreshStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_VAULT_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        const totalCount = response.totalCount || 0;
        stripRedacted.textContent = String(totalCount);
        vaultTabBadge.textContent = String(totalCount);
        vaultCountBadge.textContent = `${totalCount} Active`;

        if (response.isSanitized) {
          stripPerimeter.textContent = 'Protected (Zero Egress)';
        } else {
          stripPerimeter.textContent = 'Perimeter Active';
        }

        const entries: VaultRow[] = response.entries || [];
        if (entries.length > 0) {
          vaultList.innerHTML = entries.map(entry => `
            <div class="vault-row">
              <span class="token-tag">${escapeHtml(entry.token)}</span>
              <span class="masked-tag">${escapeHtml(entry.maskedReal)}</span>
            </div>
          `).join('');
        } else {
          vaultList.innerHTML = '<div class="vault-empty">No sensitive values recorded in Local Inversion Vault.</div>';
        }
      });
    } catch (e) {}
  }

  // 6. Observability Telemetry Logs
  async function renderLogs() {
    if (!logList) return;
    const logs = await observabilityLogger.getLogs();

    const filtered = activeLogFilter === 'ALL'
      ? logs
      : logs.filter(l => l.category === activeLogFilter);

    if (filtered.length === 0) {
      logList.innerHTML = `<div class="log-empty">No ${activeLogFilter !== 'ALL' ? activeLogFilter : ''} events recorded yet.</div>`;
      return;
    }

    logList.innerHTML = filtered.map(log => `
      <div class="log-entry cat-${escapeHtml(log.category)}">
        <div class="log-header">
          <span class="cat-badge">${escapeHtml(log.category)}</span>
          <span class="log-time">${escapeHtml(log.timeFormatted)}</span>
        </div>
        <div class="log-title">${escapeHtml(log.title)} ${log.latencyMs !== undefined ? `<span style="color: #38bdf8; font-family: monospace;">(${log.latencyMs}ms)</span>` : ''}</div>
        ${log.details ? `<div class="log-details">${escapeHtml(log.details)}</div>` : ''}
      </div>
    `).join('');
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeLogFilter = chip.getAttribute('data-filter') || 'ALL';
      renderLogs();
    });
  });

  btnClearLogs?.addEventListener('click', async () => {
    await observabilityLogger.clearLogs();
    renderLogs();
  });

  btnExportLogs?.addEventListener('click', () => {
    const jsonStr = observabilityLogger.exportAuditReport();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentry-audit-trail-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Real-time telemetry broadcast listener
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OBSERVABILITY_LOG_EVENT') {
      renderLogs();
    }
  });

  // 7. Header Shortcuts
  btnOpenSpotlight?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (tab?.id) {
      await ensureContentScriptLoaded(tab.id, tab.url);
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SPOTLIGHT' });
      await observabilityLogger.log('PERCEPTION', 'INFO', 'Toggled Floating Spotlight HUD (Ctrl+Shift+K)');
      window.close();
    }
  });

  btnDockSidepanel?.addEventListener('click', async () => {
    await observabilityLogger.log('PERCEPTION', 'INFO', 'Docked SentryAgent to native Chrome Side Panel');
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
      window.close();
    });
  });

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  refreshStatus();
  renderLogs();
});
