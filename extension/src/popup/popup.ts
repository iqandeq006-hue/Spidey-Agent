// SentryAgent Popup Controller v2.5 (Observability & Full Audit Trail)

import { observabilityLogger, ObservabilityLogEntry, LogCategory } from '../network/observabilityLogger';

interface VaultRow {
  token: string;
  maskedReal: string;
  type: string;
}

window.addEventListener('DOMContentLoaded', async () => {
  const btnScan = document.getElementById('btn-scan') as HTMLButtonElement;
  const btnRestore = document.getElementById('btn-restore') as HTMLButtonElement;
  const btnAutonomous = document.getElementById('btn-autonomous') as HTMLButtonElement;
  const metricRedacted = document.getElementById('metric-redacted') as HTMLElement;
  const metricVault = document.getElementById('metric-vault') as HTMLElement;
  const perimeterStatus = document.getElementById('perimeter-status') as HTMLElement;
  const visionStatus = document.getElementById('vision-status') as HTMLElement;
  const vaultBadge = document.getElementById('vault-count-badge') as HTMLElement;
  const vaultList = document.getElementById('vault-list') as HTMLElement;

  // Observability Log Elements
  const tabBtnLogs = document.getElementById('tab-btn-logs') as HTMLButtonElement;
  const tabBtnVault = document.getElementById('tab-btn-vault') as HTMLButtonElement;
  const panelLogs = document.getElementById('panel-logs') as HTMLElement;
  const panelVault = document.getElementById('panel-vault') as HTMLElement;
  const logList = document.getElementById('log-list') as HTMLElement;
  const btnClearLogs = document.getElementById('btn-clear-logs') as HTMLButtonElement;
  const btnExportLogs = document.getElementById('btn-export-logs') as HTMLButtonElement;
  const filterChips = document.querySelectorAll('.filter-chip');

  let activeFilter: string = 'ALL';

  // 1. Tab Switching: Live Logs vs Vault
  tabBtnLogs?.addEventListener('click', () => {
    tabBtnLogs.classList.add('active');
    tabBtnVault.classList.remove('active');
    panelLogs.style.display = 'block';
    panelVault.style.display = 'none';
  });

  tabBtnVault?.addEventListener('click', () => {
    tabBtnVault.classList.add('active');
    tabBtnLogs.classList.remove('active');
    panelVault.style.display = 'block';
    panelLogs.style.display = 'none';
  });

  // 2. Render Observability Logs
  async function renderLogs() {
    if (!logList) return;
    const logs = await observabilityLogger.getLogs();

    const filtered = activeFilter === 'ALL'
      ? logs
      : logs.filter(l => l.category === activeFilter);

    if (filtered.length === 0) {
      logList.innerHTML = `<div class="log-empty">No ${activeFilter !== 'ALL' ? activeFilter : ''} events recorded yet.</div>`;
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

  // Filter Chip Listeners
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'ALL';
      renderLogs();
    });
  });

  // Clear Logs
  btnClearLogs?.addEventListener('click', async () => {
    await observabilityLogger.clearLogs();
    renderLogs();
  });

  // Export JSON Audit Trail
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

  // Real-time listener for log broadcasts
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OBSERVABILITY_LOG_EVENT') {
      renderLogs();
    }
  });

  // 3. Tab Management
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
      return { ok: false, reason: 'Chrome security prevents running extensions on browser internal pages (chrome://). Please navigate to any real website (e.g. google.com, wikipedia.org, or any public portal).' };
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
      console.warn('[SentryAgent Popup] Script injection failed:', err);
      if (url?.startsWith('file://')) {
        return { 
          ok: false, 
          reason: 'Chrome blocks extensions on local file:// URLs by default.\n\nOption 1: Open the testbed via http://localhost:3000\nOption 2: Go to chrome://extensions -> SentryAgent Details -> turn ON "Allow access to file URLs", then refresh the tab.' 
        };
      }
      return { ok: false, reason: 'Could not connect to page. Please refresh the page tab (F5) and try again.' };
    }
  }

  async function refreshStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_VAULT_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          perimeterStatus.textContent = 'Ready to Protect';
          return;
        }

        if (response.acceleration && visionStatus) {
          visionStatus.textContent = response.acceleration;
        }

        updateUIState(response.isSanitized, response.entries || [], response.totalCount || 0);
      });
    } catch (e) {
      console.error('[SentryAgent Popup] Error connecting to tab:', e);
    }
    renderLogs();
  }

  function updateUIState(isSanitized: boolean, entries: VaultRow[], totalCount: number) {
    if (isSanitized) {
      perimeterStatus.textContent = 'PROTECTED (ZERO EGRESS)';
      perimeterStatus.className = 'status-val active';
      btnRestore.disabled = false;
      metricRedacted.textContent = String(totalCount);
      metricVault.textContent = String(totalCount);
      vaultBadge.textContent = `${totalCount} Active`;

      if (entries.length > 0) {
        vaultList.innerHTML = entries.map(entry => `
          <div class="vault-row">
            <span class="token-tag">${escapeHtml(entry.token)}</span>
            <span class="masked-tag">${escapeHtml(entry.maskedReal)}</span>
          </div>
        `).join('');
      } else {
        vaultList.innerHTML = '<div class="vault-empty">No sensitive values recorded.</div>';
      }
    } else {
      perimeterStatus.textContent = 'Standby';
      perimeterStatus.className = 'status-val';
      btnRestore.disabled = true;
      metricRedacted.textContent = '0';
      metricVault.textContent = '0';
      vaultBadge.textContent = '0 Active';
      vaultList.innerHTML = '<div class="vault-empty">Click "Run End-to-End Agent Loop" to activate protection and execute assisted task.</div>';
    }
  }

  // End-to-End Autonomous Agent Loop Trigger
  btnAutonomous?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    btnAutonomous.disabled = true;
    btnAutonomous.innerHTML = '<span>🤖 Reasoner Planning & Risk Gating...</span>';

    const check = await ensureContentScriptLoaded(tab.id, tab.url);
    if (!check.ok) {
      btnAutonomous.disabled = false;
      btnAutonomous.innerHTML = '<span class="btn-icon">🤖</span> Run End-to-End Agent Loop';
      alert(check.reason || 'Could not connect to active page.');
      return;
    }

    await observabilityLogger.log('DECISION', 'INFO', 'Triggered autonomous agent loop on active tab', `URL: ${tab.url}`);

    chrome.tabs.sendMessage(tab.id, { type: 'RUN_AUTONOMOUS_STEP' }, async (response) => {
      btnAutonomous.disabled = false;
      btnAutonomous.innerHTML = '<span class="btn-icon">🤖</span> Run End-to-End Agent Loop';

      if (chrome.runtime.lastError) {
        alert(`Communication error: ${chrome.runtime.lastError.message}\nPlease refresh the tab (F5).`);
        return;
      }

      if (response && response.success) {
        await observabilityLogger.log('EXECUTION', 'SUCCESS', `Autonomous step executed: ${response.message}`);
        refreshStatus();
        window.close(); // Close popup so user sees on-screen Risk Gate modal
      } else {
        await observabilityLogger.log('RISK_GATE', 'WARN', `Autonomous step paused or failed: ${response?.message}`);
        alert(response?.message || 'Autonomous step encountered an issue. Check console.');
      }
    });
  });

  // Manual Scan
  btnScan?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    btnScan.disabled = true;
    btnScan.innerHTML = '<span>⏳ Scanning...</span>';

    const check = await ensureContentScriptLoaded(tab.id, tab.url);
    if (!check.ok) {
      btnScan.disabled = false;
      btnScan.innerHTML = '<span class="btn-icon">⚡</span> Scan & Sanitize';
      alert(check.reason || 'Could not connect to active page.');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'SCAN_AND_SANITIZE' }, async (response) => {
      btnScan.disabled = false;
      btnScan.innerHTML = '<span class="btn-icon">⚡</span> Scan & Sanitize';

      if (chrome.runtime.lastError) {
        alert(`Communication error: ${chrome.runtime.lastError.message}\nPlease refresh the tab (F5).`);
        return;
      }

      if (response && response.success) {
        await observabilityLogger.log(
          'REDACTION',
          'SUCCESS',
          `Scanned & redacted ${response.report?.totalRedacted || 0} sensitive entities`,
          `Tokens: ${JSON.stringify(response.report?.entitiesByType || {})}`,
          response.report?.durationMs
        );
        refreshStatus();
      } else {
        alert(response?.error || 'Could not sanitize active tab. Please refresh the page (F5).');
      }
    });
  });

  // Restore
  btnRestore?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_DOM' }, async (response) => {
      if (response && response.success) {
        await observabilityLogger.log('SECURITY', 'INFO', 'DOM and Canvases rolled back to unredacted state');
        refreshStatus();
      }
    });
  });

  // Zero-AI Deterministic Execution (with Smart Real-World URL Navigation)
  const zeroAiInput = document.getElementById('zero-ai-input') as HTMLInputElement;
  const btnZeroAiRun = document.getElementById('btn-zero-ai-run') as HTMLButtonElement;
  const zeroAiStatus = document.getElementById('zero-ai-status') as HTMLElement;

  async function runZeroAiCommand() {
    const cmd = zeroAiInput.value.trim();
    if (!cmd) return;

    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    btnZeroAiRun.disabled = true;
    zeroAiStatus.textContent = `⚡ Executing: "${cmd}"...`;

    // 1. Smart Real-World Domain & Website Navigation Resolver
    // Handles commands like "wikipedia", "google", "go to github.com", "open isro.gov.in" directly!
    const navMatch = cmd.match(/^(?:go\s+to|open|navigate\s+to|visit)\s+(.+)$/i);
    const candidateTarget = (navMatch ? navMatch[1] : cmd).trim();

    const domainShortcuts: Record<string, string> = {
      'wikipedia': 'https://en.wikipedia.org',
      'google': 'https://www.google.com',
      'github': 'https://github.com',
      'isro': 'https://www.isro.gov.in',
      'eprocure': 'https://eprocure.gov.in',
      'incometax': 'https://www.incometax.gov.in',
      'youtube': 'https://www.youtube.com'
    };

    const isUrl = /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(candidateTarget);
    const shortcutMatch = domainShortcuts[candidateTarget.toLowerCase()];

    if (shortcutMatch || isUrl || navMatch) {
      let targetUrl = shortcutMatch || candidateTarget;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Dispatched navigation to ${targetUrl}`, `Command: "${cmd}"`, 0);
      zeroAiStatus.textContent = `✔ Navigating to ${targetUrl}...`;
      await chrome.tabs.update(tab.id, { url: targetUrl });
      btnZeroAiRun.disabled = false;
      renderLogs();
      return;
    }

    // 2. In-Page Command Execution (Search, Click, Fill on current page)
    const check = await ensureContentScriptLoaded(tab.id, tab.url);
    if (!check.ok) {
      // If user is on an internal chrome:// page, gracefully fall back to web search!
      const searchMatch = cmd.match(/^(?:search\s+(?:web\s+for|web|for)?|find)\s+(.+)$/i);
      const query = (searchMatch ? searchMatch[1] : cmd).trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Dispatched web search for "${query}"`, `Target: ${searchUrl}`, 0);
      zeroAiStatus.textContent = `✔ Searching web for "${query}"...`;
      await chrome.tabs.update(tab.id, { url: searchUrl });
      btnZeroAiRun.disabled = false;
      renderLogs();
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'RUN_DETERMINISTIC_COMMAND', command: cmd }, async (response) => {
      btnZeroAiRun.disabled = false;
      if (chrome.runtime.lastError) {
        zeroAiStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
        return;
      }
      if (response && response.success) {
        zeroAiStatus.textContent = `✔ ${response.message}`;
        await observabilityLogger.log('NAVIGATOR', 'SUCCESS', response.message, `Command: "${cmd}"`, response.latencyMs);
        refreshStatus();
      } else {
        zeroAiStatus.textContent = `❌ ${response?.message || 'Action failed.'}`;
        await observabilityLogger.log('NAVIGATOR', 'WARN', response?.message || 'Action failed', `Command: "${cmd}"`, response?.latencyMs);
        renderLogs();
      }
    });
  }

  btnZeroAiRun?.addEventListener('click', runZeroAiCommand);
  zeroAiInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runZeroAiCommand();
  });

  // Spotlight HUD Trigger
  const btnOpenSpotlight = document.getElementById('btn-open-spotlight') as HTMLButtonElement;
  btnOpenSpotlight?.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (tab?.id) {
      await ensureContentScriptLoaded(tab.id, tab.url);
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SPOTLIGHT' });
      await observabilityLogger.log('PERCEPTION', 'INFO', 'Toggled Floating Spotlight HUD (Ctrl+Shift+K)');
      window.close();
    }
  });

  // Dock to Persistent Chrome Side Panel
  const btnDockSidepanel = document.getElementById('btn-dock-sidepanel') as HTMLButtonElement;
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
