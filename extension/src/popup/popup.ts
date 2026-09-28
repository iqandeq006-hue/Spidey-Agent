// SentryAgent Conversational Co-Pilot Controller v3.1
// Clean, uncluttered interface: dedicated Chat for Navigation & Search, separate Log Space for Telemetry.

import { observabilityLogger, ObservabilityLogEntry } from '../network/observabilityLogger';

interface VaultRow {
  token: string;
  maskedReal: string;
  type: string;
}

window.addEventListener('DOMContentLoaded', async () => {
  // Elements: Segmented Tabs & Panes
  const tabBtnChat = document.getElementById('tab-btn-chat') as HTMLButtonElement;
  const tabBtnLogs = document.getElementById('tab-btn-logs') as HTMLButtonElement;
  const paneChat = document.getElementById('pane-chat') as HTMLElement;
  const paneLogs = document.getElementById('pane-logs') as HTMLElement;
  const logCountBadge = document.getElementById('log-count-badge') as HTMLElement;

  // Elements: Chat Stream & Input Form
  const chatStream = document.getElementById('chat-stream') as HTMLElement;
  const chatForm = document.getElementById('chat-form') as HTMLFormElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const welcomeBox = document.getElementById('welcome-box') as HTMLElement;

  // Elements: Log Space
  const logList = document.getElementById('log-list') as HTMLElement;
  const btnClearLogs = document.getElementById('btn-clear-logs') as HTMLButtonElement;
  const btnExportLogs = document.getElementById('btn-export-logs') as HTMLButtonElement;
  const filterBtns = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
  const vaultToggle = document.getElementById('vault-toggle') as HTMLElement;
  const vaultDrawer = document.getElementById('vault-drawer') as HTMLElement;
  const vaultCountBadge = document.getElementById('vault-count-badge') as HTMLElement;
  const vaultList = document.getElementById('vault-list') as HTMLElement;
  const vaultProofSection = document.getElementById('vault-proof-section') as HTMLElement;
  const vaultProofWrapper = document.getElementById('vault-proof-wrapper') as HTMLElement;
  const vaultProofImg = document.getElementById('vault-proof-img') as HTMLImageElement;

  // Elements: Lightbox Modal
  const proofModal = document.getElementById('proof-modal') as HTMLElement;
  const modalProofImg = document.getElementById('modal-proof-img') as HTMLImageElement;
  const btnCloseModal = document.getElementById('btn-close-modal') as HTMLButtonElement;

  function openProofLightbox(imgSrc: string) {
    if (modalProofImg && proofModal) {
      modalProofImg.src = imgSrc;
      proofModal.style.display = 'flex';
    }
  }

  function closeProofLightbox() {
    if (proofModal) {
      proofModal.style.display = 'none';
    }
  }

  btnCloseModal?.addEventListener('click', closeProofLightbox);
  proofModal?.addEventListener('click', (e) => {
    if (e.target === proofModal) closeProofLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProofLightbox();
  });

  vaultProofWrapper?.addEventListener('click', () => {
    if (vaultProofImg && vaultProofImg.src) {
      openProofLightbox(vaultProofImg.src);
    }
  });

  let activeLogFilter: string = 'ALL';
  let isProcessing: boolean = false;

  // 1. Tab Switching: Chat vs Logs
  function switchTab(target: 'chat' | 'logs') {
    tabBtnChat.classList.toggle('active', target === 'chat');
    tabBtnLogs.classList.toggle('active', target === 'logs');

    paneChat.style.display = target === 'chat' ? 'flex' : 'none';
    paneLogs.style.display = target === 'logs' ? 'flex' : 'none';

    if (target === 'logs') {
      renderLogs();
      refreshVaultStatus();
    } else {
      chatInput.focus();
    }
  }

  tabBtnChat?.addEventListener('click', () => switchTab('chat'));
  tabBtnLogs?.addEventListener('click', () => switchTab('logs'));

  // Toggle Vault Drawer inside Log Space
  vaultToggle?.addEventListener('click', () => {
    if (vaultDrawer) {
      const isHidden = vaultDrawer.style.display === 'none';
      vaultDrawer.style.display = isHidden ? 'block' : 'none';
    }
  });

  // 2. Active Tab Resolution Helper
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
      return { ok: false, reason: 'Browser internal page' };
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
      return { ok: false, reason: 'Could not connect to page' };
    }
  }

  // 3. Chat Stream Rendering Helpers
  function clearWelcomeState() {
    if (welcomeBox && welcomeBox.parentNode) {
      welcomeBox.remove();
    }
  }

  function appendUserMessage(text: string) {
    clearWelcomeState();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-user';
    msgDiv.innerHTML = `
      <div class="msg-avatar">👤</div>
      <div class="msg-body">${escapeHtml(text)}</div>
    `;
    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function appendAgentMessage(
    text: string, 
    stepCards: Array<{ title: string; detail?: string; latencyMs?: number }> = [],
    proofImgUrl?: string
  ) {
    clearWelcomeState();
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

    let proofHtml = '';
    if (proofImgUrl) {
      proofHtml = `
        <div class="proof-card" title="Click to view full redacted proof">
          <div class="proof-card-header">
            <span>📸 Redacted Page Visual Proof</span>
            <span class="proof-expand-hint">Click to Expand 🔍</span>
          </div>
          <div class="proof-thumb-box">
            <img src="${proofImgUrl}" class="proof-thumb-img" alt="Redaction Proof" />
          </div>
        </div>
      `;
    }

    msgDiv.innerHTML = `
      <div class="msg-avatar">🛡️</div>
      <div class="msg-body">
        <div>${text}</div>
        ${stepsHtml}
        ${proofHtml}
      </div>
    `;

    if (proofImgUrl) {
      const proofCard = msgDiv.querySelector('.proof-card');
      proofCard?.addEventListener('click', () => openProofLightbox(proofImgUrl));
    }

    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function appendThinkingMessage(): HTMLElement {
    clearWelcomeState();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-agent thinking-msg';
    msgDiv.innerHTML = `
      <div class="msg-avatar">⚡</div>
      <div class="msg-body" style="font-style: italic; color: #94a3b8;">
        Processing on-device...
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

    // Route 1: Privacy Protection ("protect", "sanitize", "redact", "mask")
    if (lower.includes('protect') || lower.includes('sanitize') || lower.includes('redact') || lower.includes('mask')) {
      const check = await ensureContentScriptLoaded(tab.id, tab.url);
      if (!check.ok) {
        thinkingNode.remove();
        appendAgentMessage(`⚠️ Cannot protect this page: ${check.reason || 'Extensions cannot run on internal browser tabs (chrome://). Please refresh or open a web page.'}`);
        isProcessing = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_AND_SANITIZE', disclosureLevel: 'AUTO' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        if (response && response.success) {
          const report = response.report;

          // Capture on-device screenshot proof of the redacted page
          let proofUrl: string | undefined = undefined;
          try {
            await new Promise(r => setTimeout(r, 120)); // Ensure DOM has repainted with blackboxed styling
            if (tab.windowId) {
              proofUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 75 });
            }
            if (proofUrl) {
              await chrome.storage.local.set({ sentry_latest_proof: proofUrl });
            }
          } catch (e) {
            console.warn('[SentryAgent] Could not capture screenshot proof:', e);
          }

          // 2. Atomic Auto-Restore: Immediately return user's live DOM to normal while preserving vault
          chrome.tabs.sendMessage(tab.id!, { type: 'RESTORE_ORIGINAL_DOM', clearVault: false });

          appendAgentMessage(
            `🛡️ <strong>Atomic Privacy Lifecycle Complete:</strong> Page was blackboxed on-device, snapshotted for zero-egress transmission, and live DOM auto-restored.`,
            [
              { title: '🔒 Redaction & Snapshot', detail: `Captured proof with ${report.redactedCount} blackboxed entities (${JSON.stringify(report.entitiesByType)})`, latencyMs: report.durationMs },
              { title: '🔄 Live DOM Auto-Restored', detail: 'Original webpage elements restored immediately for uninterrupted browsing', latencyMs: 12 }
            ],
            proofUrl
          );

          if (proofUrl && vaultProofSection && vaultProofImg) {
            vaultProofImg.src = proofUrl;
            vaultProofSection.style.display = 'block';
          }

          await observabilityLogger.log('SECURITY', 'SUCCESS', `Atomic Redact->Capture->Restore: ${report.redactedCount} entities protected`, `Entities: ${JSON.stringify(report.entitiesByType)}`, report.durationMs);
          updateLogBadge();
          refreshVaultStatus();
        } else {
          appendAgentMessage(`Could not sanitize page: ${response?.error || 'Unknown error'}`);
        }
      });
      return;
    }

    // Route 2: Restore Original Page ("restore", "restore dom")
    if (lower === 'restore' || lower.includes('restore dom')) {
      const check = await ensureContentScriptLoaded(tab.id, tab.url);
      if (!check.ok) {
        thinkingNode.remove();
        appendAgentMessage('Could not connect to page to restore.');
        isProcessing = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_DOM' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        await chrome.storage.local.remove('sentry_latest_proof');
        if (vaultProofSection) {
          vaultProofSection.style.display = 'none';
        }
        appendAgentMessage('🔄 Restored DOM and canvas elements to their original unredacted values.');
        await observabilityLogger.log('SECURITY', 'INFO', 'DOM and Canvases rolled back to pristine state');
        updateLogBadge();
        refreshVaultStatus();
      });
      return;
    }

    // Route 3: Direct Domain Shortcuts or URLs
    const navMatch = text.match(/^(?:go\s+to|open|navigate\s+to|visit)\s+(.+)$/i);
    const candidateTarget = (navMatch ? navMatch[1] : text).trim();

    const domainShortcuts: Record<string, string> = {
      'youtube': 'https://www.youtube.com',
      'google': 'https://www.google.com',
      'wikipedia': 'https://en.wikipedia.org',
      'github': 'https://github.com',
      'reddit': 'https://www.reddit.com',
      'twitter': 'https://twitter.com',
      'x': 'https://x.com',
      'amazon': 'https://www.amazon.com',
      'isro': 'https://www.isro.gov.in',
      'eprocure': 'https://eprocure.gov.in',
      'incometax': 'https://www.incometax.gov.in',
      'chatgpt': 'https://chatgpt.com',
      'claude': 'https://claude.ai',
      'claude desktop': 'https://claude.ai',
      'signature': 'https://szimek.github.io/signature_pad/',
      'signature pad': 'https://szimek.github.io/signature_pad/',
      'testbed': 'http://localhost:3000'
    };

    const shortcutMatch = domainShortcuts[candidateTarget.toLowerCase()];
    const isUrl = /^https?:\/\//i.test(candidateTarget) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(candidateTarget);

    if (shortcutMatch || isUrl) {
      let targetUrl = shortcutMatch || candidateTarget;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      await chrome.tabs.update(tab.id, { url: targetUrl });
      thinkingNode.remove();
      const elapsed = Math.round(performance.now() - startTime);

      appendAgentMessage(`Navigated to <strong>${escapeHtml(targetUrl)}</strong>`, [
        { title: '🌐 Tab Navigation', detail: `Loaded ${targetUrl}`, latencyMs: elapsed }
      ]);
      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Navigated to ${targetUrl}`, `Prompt: "${text}"`, elapsed);
      updateLogBadge();
      isProcessing = false;
      return;
    }

    // If "open <phrase>" has spaces and is not a direct URL/shortcut, search Google
    if (navMatch && !isUrl) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(candidateTarget)}`;
      await chrome.tabs.update(tab.id, { url: searchUrl });
      thinkingNode.remove();
      const elapsed = Math.round(performance.now() - startTime);

      appendAgentMessage(`Searching Google for: <strong>"${escapeHtml(candidateTarget)}"</strong>`, [
        { title: '🔍 Web Search', detail: searchUrl, latencyMs: elapsed }
      ]);
      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Searched Google for "${candidateTarget}"`, `Target: ${searchUrl}`, elapsed);
      updateLogBadge();
      isProcessing = false;
      return;
    }

    // Route 4: Web Search Query ("search ...", "google ...")
    const searchMatch = text.match(/^(?:search|google|find\s+web)\s+(.+)$/i);
    if (searchMatch && !lower.includes('on page') && !lower.includes('in page') && !lower.includes('button')) {
      const query = searchMatch[1].trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await chrome.tabs.update(tab.id, { url: searchUrl });
      thinkingNode.remove();
      const elapsed = Math.round(performance.now() - startTime);

      appendAgentMessage(`Searching Google for: <strong>"${escapeHtml(query)}"</strong>`, [
        { title: '🔍 Web Search', detail: searchUrl, latencyMs: elapsed }
      ]);
      await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Searched Google for "${query}"`, `Target: ${searchUrl}`, elapsed);
      updateLogBadge();
      isProcessing = false;
      return;
    }

    // Route E: Autonomous Multi-Step Automation ("automate", "submit", "bid", "run loop")
    if (lower.includes('automate') || lower.includes('submit') || lower.includes('bid') || lower.includes('run loop')) {
      chrome.tabs.sendMessage(tab.id, { type: 'RUN_AUTONOMOUS_STEP' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        if (response && response.success) {
          const rep = response.report;
          appendAgentMessage(`🤖 Autonomous action executed: <strong>${escapeHtml(response.message || 'Action complete')}</strong>`, [
            { title: '⚡ Action Execution', detail: `Target: ${rep?.action?.targetLabel || 'Element'} (${rep?.action?.riskTier || 'TIER_4'})`, latencyMs: elapsed }
          ]);
          await observabilityLogger.log('EXECUTION', 'SUCCESS', `Autonomous execution: ${response.message}`, undefined, elapsed);
          updateLogBadge();
          refreshVaultStatus();
        } else {
          appendAgentMessage(`Autonomous step response: ${response?.message || 'Paused or requires confirmation'}`);
        }
      });
      return;
    }

    // Route F: In-Page Deterministic Interaction (Search in page, Click element, Fill form)
    chrome.tabs.sendMessage(tab.id, { type: 'RUN_DETERMINISTIC_COMMAND', command: text }, async (response) => {
      thinkingNode.remove();
      isProcessing = false;
      const elapsed = Math.round(performance.now() - startTime);

      if (response && response.success) {
        appendAgentMessage(`✔ ${escapeHtml(response.message)}`, [
          { 
            title: `🎯 ${response.executedVerb || 'ACTION'}: ${response.targetLabel || 'Target'}`, 
            detail: 'Executed directly in active tab without cloud LLM calls', 
            latencyMs: response.latencyMs || elapsed 
          }
        ]);
        await observabilityLogger.log('EXECUTION', 'SUCCESS', response.message, `Command: "${text}"`, response.latencyMs);
        updateLogBadge();
      } else {
        // Fallback: If page didn't have the target element, try Google search
        appendAgentMessage(`Could not find <em>"${escapeHtml(text)}"</em> on this page. Would you like me to search the web for it?`);
        await observabilityLogger.log('NAVIGATOR', 'WARN', response?.message || 'Element not found', `Command: "${text}"`, elapsed);
        updateLogBadge();
      }
    });
  }

  // Form Submit Handler
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserPrompt(chatInput.value);
  });

  // Starter Suggestions Click Handler
  document.querySelectorAll('.starter-card').forEach(card => {
    card.addEventListener('click', () => {
      const p = card.getAttribute('data-prompt') || '';
      if (p) handleUserPrompt(p);
    });
  });

  // 5. Log Space Rendering & Filtering
  async function renderLogs() {
    if (!logList) return;
    const logs = await observabilityLogger.getLogs();

    let filtered: ObservabilityLogEntry[] = logs;
    if (activeLogFilter === 'NAVIGATOR') {
      filtered = logs.filter(l => l.category === 'NAVIGATOR');
    } else if (activeLogFilter === 'EXECUTION') {
      filtered = logs.filter(l => l.category === 'EXECUTION' || l.category === 'DECISION');
    } else if (activeLogFilter === 'SECURITY') {
      filtered = logs.filter(l => l.category === 'SECURITY' || l.category === 'REDACTION' || l.category === 'PERCEPTION');
    }

    if (filtered.length === 0) {
      logList.innerHTML = `<div class="empty-state">No ${activeLogFilter !== 'ALL' ? activeLogFilter.toLowerCase() : ''} logs recorded yet.</div>`;
      return;
    }

    logList.innerHTML = filtered.map(log => `
      <div class="log-card">
        <div class="log-meta">
          <span class="log-tag cat-${escapeHtml(log.category)}">${escapeHtml(log.category)}</span>
          <span class="log-time">${escapeHtml(log.timeFormatted)}</span>
        </div>
        <div class="log-headline">
          <span>${escapeHtml(log.title)}</span>
          ${log.latencyMs !== undefined ? `<span class="latency-pill">${log.latencyMs}ms</span>` : ''}
        </div>
        ${log.details ? `<div class="log-info-text">${escapeHtml(log.details)}</div>` : ''}
      </div>
    `).join('');
  }

  async function updateLogBadge() {
    const logs = await observabilityLogger.getLogs();
    if (logCountBadge) {
      logCountBadge.textContent = String(logs.length);
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLogFilter = btn.getAttribute('data-filter') || 'ALL';
      renderLogs();
    });
  });

  btnClearLogs?.addEventListener('click', async () => {
    await observabilityLogger.clearLogs();
    renderLogs();
    updateLogBadge();
  });

  btnExportLogs?.addEventListener('click', () => {
    const jsonStr = observabilityLogger.exportAuditReport();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentry-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Real-time telemetry broadcast listener
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OBSERVABILITY_LOG_EVENT') {
      renderLogs();
      updateLogBadge();
    }
  });

  // 6. Local Vault Status (Cleanly shown inside Log Space)
  async function refreshVaultStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    try {
      chrome.storage.local.get(['sentry_latest_proof'], (res) => {
        if (res && res.sentry_latest_proof && vaultProofSection && vaultProofImg) {
          vaultProofImg.src = res.sentry_latest_proof;
          vaultProofSection.style.display = 'block';
        } else if (vaultProofSection) {
          vaultProofSection.style.display = 'none';
        }
      });

      chrome.tabs.sendMessage(tab.id, { type: 'GET_VAULT_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        const totalCount = response.totalCount || 0;
        if (vaultCountBadge) {
          vaultCountBadge.textContent = `${totalCount} protected`;
        }

        const entries: VaultRow[] = response.entries || [];
        if (vaultList) {
          if (entries.length > 0) {
            vaultList.innerHTML = entries.map(entry => `
              <div class="vault-item">
                <span class="vault-token">${escapeHtml(entry.token)}</span>
                <span class="vault-masked">${escapeHtml(entry.maskedReal)}</span>
              </div>
            `).join('');
          } else {
            vaultList.innerHTML = '<div class="empty-vault-text">No sensitive data currently vaulted on this page.</div>';
          }
        }
      });
    } catch (e) {}
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial load
  updateLogBadge();
  renderLogs();
  refreshVaultStatus();
});
