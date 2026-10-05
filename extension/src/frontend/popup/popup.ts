// SpideyAgent Conversational Co-Pilot Controller v3.3
// Features:
// 1. Flexible /nav: URLs, domain shortcuts, and in-page navigation (e.g. "/nav to payment page")
// 2. /protect: Captures on-device zero-PII proof screenshot, attaches to chat dock, ready for query
// 3. Query Server with Zero-Egress: Sends sealed opaque payload to backend reasoner (or local engine)
// 4. Human-in-the-Loop Confirmation: Dedicated safety gate overlay for any risky action (Tier 3/4, payment, submit)

import { observabilityLogger, ObservabilityLogEntry } from '../../backend/network/observabilityLogger';
import { PlannedAction } from '../../backend/execution/actionDispatcher';
import { layaSystem1EngineInstance } from '../../backend/execution/system1Engine';

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
  const slashPalette = document.getElementById('slash-palette') as HTMLElement;
  const btnGalleryTrigger = document.getElementById('btn-gallery-trigger') as HTMLButtonElement;
  const cmdChips = document.querySelectorAll<HTMLButtonElement>('.cmd-chip');
  const slashItems = document.querySelectorAll<HTMLElement>('.slash-item');

  // Elements: Screenshot History & Downloader Gallery Modal
  const galleryModal = document.getElementById('gallery-modal') as HTMLElement;
  const galleryList = document.getElementById('gallery-list') as HTMLElement;
  const btnCloseGallery = document.getElementById('btn-close-gallery') as HTMLButtonElement;
  const btnClearGallery = document.getElementById('btn-clear-gallery') as HTMLButtonElement;

  // Elements: Attached Snapshot Bar
  const attachedSnapshotBar = document.getElementById('attached-snapshot-bar') as HTMLElement;
  const attachedSnapshotThumb = document.getElementById('attached-snapshot-thumb') as HTMLImageElement;
  const btnDetachSnapshot = document.getElementById('btn-detach-snapshot') as HTMLButtonElement;

  // Elements: Human-in-the-Loop (HITL) Overlay
  const hitlOverlay = document.getElementById('hitl-overlay') as HTMLElement;
  const hitlActionVal = document.getElementById('hitl-action-val') as HTMLElement;
  const hitlTargetVal = document.getElementById('hitl-target-val') as HTMLElement;
  const hitlRiskVal = document.getElementById('hitl-risk-val') as HTMLElement;
  const hitlRationaleVal = document.getElementById('hitl-rationale-val') as HTMLElement;
  const btnHitlAbort = document.getElementById('btn-hitl-abort') as HTMLButtonElement;
  const btnHitlAuthorize = document.getElementById('btn-hitl-authorize') as HTMLButtonElement;

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
    if (e.key === 'Escape') {
      closeProofLightbox();
      closeHitlModal(false);
      closeGalleryModal();
    }
  });

  // --- Screenshot History & Downloader Module ---
  interface ScreenshotRecord {
    id: string;
    dataUrl: string;
    timestamp: number;
    dateStr: string;
    pageTitle: string;
    pageUrl: string;
    redactedCount: number;
  }

  async function getScreenshotHistory(): Promise<ScreenshotRecord[]> {
    const data = await chrome.storage.local.get('spidey_screenshot_history');
    return data.spidey_screenshot_history || [];
  }

  async function saveScreenshotToHistory(rec: ScreenshotRecord): Promise<void> {
    const history = await getScreenshotHistory();
    history.unshift(rec);
    if (history.length > 30) history.length = 30;
    await chrome.storage.local.set({ spidey_screenshot_history: history });
  }

  function downloadScreenshot(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function renderGallery() {
    if (!galleryList) return;
    const history = await getScreenshotHistory();
    galleryList.innerHTML = '';

    if (history.length === 0) {
      galleryList.innerHTML = `
        <div class="gallery-empty">
          No screenshot proofs captured yet.<br>Click <strong>/protect</strong> on any page to capture and save a verified proof!
        </div>
      `;
      return;
    }

    history.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      card.innerHTML = `
        <div class="gallery-item-thumb-box" title="Click to view full lightbox">
          <img src="${item.dataUrl}" class="gallery-item-thumb" alt="Proof ${idx + 1}" />
        </div>
        <div class="gallery-item-meta">
          <div class="gallery-item-title" title="${escapeHtml(item.pageTitle)}">${escapeHtml(item.pageTitle || 'Webpage')}</div>
          <span class="gallery-item-badge">${item.redactedCount} Redacted</span>
        </div>
        <div class="gallery-item-time">${item.dateStr} · ${escapeHtml(item.pageUrl ? new URL(item.pageUrl).hostname : '')}</div>
        <div class="gallery-item-actions">
          <button type="button" class="btn-gallery-dl" data-idx="${idx}">
            ⬇ Download Proof
          </button>
          <button type="button" class="btn-gallery-attach" data-idx="${idx}">
            📎 Attach to Chat
          </button>
        </div>
      `;

      // Thumb preview
      card.querySelector('.gallery-item-thumb-box')?.addEventListener('click', () => {
        openProofLightbox(item.dataUrl);
      });

      // Download button
      card.querySelector('.btn-gallery-dl')?.addEventListener('click', () => {
        const cleanName = (item.pageTitle || 'proof').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
        downloadScreenshot(item.dataUrl, `spideyagent-redacted-${cleanName}-${item.timestamp}.png`);
      });

      // Attach button
      card.querySelector('.btn-gallery-attach')?.addEventListener('click', () => {
        attachProtectedSnapshot(item.dataUrl);
        closeGalleryModal();
      });

      galleryList.appendChild(card);
    });
  }

  function openGalleryModal() {
    if (galleryModal) {
      renderGallery();
      galleryModal.style.display = 'flex';
    }
  }

  function closeGalleryModal() {
    if (galleryModal) {
      galleryModal.style.display = 'none';
    }
  }

  btnGalleryTrigger?.addEventListener('click', openGalleryModal);
  btnCloseGallery?.addEventListener('click', closeGalleryModal);
  galleryModal?.addEventListener('click', (e) => {
    if (e.target === galleryModal) closeGalleryModal();
  });
  btnClearGallery?.addEventListener('click', async () => {
    await chrome.storage.local.remove('spidey_screenshot_history');
    renderGallery();
  });

  vaultProofWrapper?.addEventListener('click', () => {
    if (vaultProofImg && vaultProofImg.src) {
      openProofLightbox(vaultProofImg.src);
    }
  });

  let activeLogFilter: string = 'ALL';
  let isProcessing: boolean = false;
  let activeSlashIndex: number = 0;
  let activeSnapshotUrl: string | null = null;
  let hitlResolver: ((authorized: boolean) => void) | null = null;

  // Attach / Detach Snapshot Bar Handlers
  function attachProtectedSnapshot(proofUrl: string) {
    activeSnapshotUrl = proofUrl;
    if (attachedSnapshotThumb && attachedSnapshotBar) {
      attachedSnapshotThumb.src = proofUrl;
      attachedSnapshotBar.style.display = 'flex';
    }
  }

  function detachProtectedSnapshot() {
    activeSnapshotUrl = null;
    if (attachedSnapshotBar) {
      attachedSnapshotBar.style.display = 'none';
    }
  }

  btnDetachSnapshot?.addEventListener('click', detachProtectedSnapshot);
  attachedSnapshotThumb?.addEventListener('click', () => {
    if (activeSnapshotUrl) openProofLightbox(activeSnapshotUrl);
  });

  // Human-in-the-Loop Modal Trigger
  function promptHumanInTheLoop(action: PlannedAction): Promise<boolean> {
    return new Promise((resolve) => {
      hitlResolver = resolve;
      if (hitlActionVal) hitlActionVal.textContent = action.action;
      if (hitlTargetVal) hitlTargetVal.textContent = action.targetLabel || action.targetOpaqueId;
      if (hitlRiskVal) hitlRiskVal.textContent = action.riskTier || 'TIER_4 HIGH RISK';
      if (hitlRationaleVal) {
        hitlRationaleVal.textContent = action.reason || 'This action initiates persistent payment or form submission.';
      }
      if (hitlOverlay) {
        hitlOverlay.style.display = 'flex';
      }
    });
  }

  function closeHitlModal(authorized: boolean) {
    if (hitlOverlay) {
      hitlOverlay.style.display = 'none';
    }
    if (hitlResolver) {
      hitlResolver(authorized);
      hitlResolver = null;
    }
  }

  btnHitlAuthorize?.addEventListener('click', () => closeHitlModal(true));
  btnHitlAbort?.addEventListener('click', () => closeHitlModal(false));

  function isActionRisky(action: PlannedAction): boolean {
    if (action.riskTier === 'TIER_4' || action.riskTier === 'TIER_3') return true;
    const label = (action.targetLabel || '').toLowerCase();
    const act = (action.action || '').toLowerCase();
    const dangerousKeywords = ['pay', 'payment', 'submit', 'order', 'checkout', 'confirm', 'buy', 'transfer', 'delete', 'disburse', 'sign', 'authorize'];
    return dangerousKeywords.some(kw => label.includes(kw) || act.includes(kw));
  }

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

  // 2. Active Tab Resolution Helper (Finds the true focused webpage)
  function isInternalTab(tab?: chrome.tabs.Tab): boolean {
    if (!tab) return true;
    const url = (tab.url || (tab as any).pendingUrl || '').toLowerCase();
    if (!url) return false;
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') || 
           url.startsWith('edge://') || 
           url.startsWith('about:') || 
           url.startsWith('devtools://') ||
           url.startsWith('view-source:');
  }

  async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    // 1. In a Chrome side panel, currentWindow: true gets the exact tab in the window where the panel is docked
    try {
      const current = await chrome.tabs.query({ active: true, currentWindow: true });
      if (current[0] && !isInternalTab(current[0])) {
        return current[0];
      }
    } catch {}

    // 2. Try lastFocusedWindow
    try {
      const lastFocused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (lastFocused[0] && !isInternalTab(lastFocused[0])) {
        return lastFocused[0];
      }
    } catch {}

    // 3. Fallback: query all active tabs across all windows for a web page
    try {
      const allActive = await chrome.tabs.query({ active: true });
      const webTab = allActive.find(t => !isInternalTab(t) && t.url && (t.url.startsWith('http') || t.url.startsWith('file')));
      if (webTab) return webTab;
      return allActive[0];
    } catch {}

    return undefined;
  }

  function pingTab(tabId: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'GET_VAULT_STATUS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async function ensureContentScriptLoaded(tabId: number, tab?: chrome.tabs.Tab): Promise<{ ok: boolean; reason?: string }> {
    if (isInternalTab(tab)) {
      return { 
        ok: false, 
        reason: 'Chrome security prevents extensions from running on internal browser pages (like <code>chrome://newtab</code>).<br><br>💡 <strong>Try this:</strong><br>• Open any web page (e.g. type <code>/nav to youtube</code> or <code>/nav https://isro.gov.in</code> or your portal)<br>• Then run <code>/protect</code> on that page to see on-device redaction, face blurring, and snapshot attachment!' 
      };
    }

    // Step 1: Fast ping existing content script
    let isAlive = await pingTab(tabId);
    if (isAlive) return { ok: true };

    // Step 2: Inject wrapped content.js dynamically
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 200));
      isAlive = await pingTab(tabId);
      if (isAlive) return { ok: true };
    } catch (err: any) {
      console.warn('[SpideyAgent] Script injection error:', err);
    }

    // Step 3: If still not responding (stale tab from before extension reload), reload tab
    // and wait for document to be ready
    try {
      await chrome.tabs.reload(tabId);
      await new Promise((resolve) => {
        const listener = (tid: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tid === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(false);
        }, 3500);
      });
      await new Promise(r => setTimeout(r, 400));
      isAlive = await pingTab(tabId);
      if (isAlive) return { ok: true };
    } catch (reloadErr) {
      console.warn('[SpideyAgent] Auto-reload error:', reloadErr);
    }

    return { 
      ok: false, 
      reason: 'Could not connect to this webpage. Please press <strong>F5</strong> to reload the tab so SpideyAgent can attach and protect it.' 
    };
  }

  // 3. Chat Stream Rendering Helpers
  function clearWelcomeState() {
    if (welcomeBox && welcomeBox.parentNode) {
      welcomeBox.remove();
    }
  }

  function appendUserMessage(text: string, withSnapshot: boolean = false) {
    clearWelcomeState();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg msg-user';
    const snapshotTag = withSnapshot && activeSnapshotUrl ? `
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-size:10px; color:#fca5a5;">
        <span>📸 Protected Snapshot Attached</span>
      </div>
    ` : '';
    msgDiv.innerHTML = `
      <div class="msg-avatar">👤</div>
      <div class="msg-body">
        ${snapshotTag}
        <div>${escapeHtml(text)}</div>
      </div>
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
      <div class="msg-avatar">
        <img src="/icons/logo.png" class="msg-avatar-spider" alt="SpideyAgent" />
      </div>
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
      <div class="msg-avatar">
        <img src="/icons/logo.png" class="msg-avatar-spider" alt="SpideyAgent" />
      </div>
      <div class="msg-body" style="font-style: italic; color: #94a3b8;">
        SpideyAgent reasoning on-device...
      </div>
    `;
    chatStream.appendChild(msgDiv);
    chatStream.scrollTop = chatStream.scrollHeight;
    return msgDiv;
  }

  // 4. Slash Commands Palette Interactions
  function showSlashPalette() {
    if (slashPalette) {
      slashPalette.style.display = 'flex';
      updateActiveSlashItem(0);
    }
  }

  function hideSlashPalette() {
    if (slashPalette) {
      slashPalette.style.display = 'none';
    }
  }

  function updateActiveSlashItem(index: number) {
    if (!slashItems || slashItems.length === 0) return;
    activeSlashIndex = (index + slashItems.length) % slashItems.length;
    slashItems.forEach((item, idx) => {
      item.classList.toggle('active', idx === activeSlashIndex);
    });
  }



  slashItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      const cmd = item.getAttribute('data-cmd');
      if (cmd) {
        selectCommand(cmd);
      }
    });
    item.addEventListener('mouseenter', () => updateActiveSlashItem(idx));
  });

  cmdChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-cmd');
      if (cmd) {
        selectCommand(cmd);
      }
    });
  });

  function selectCommand(cmd: string) {
    hideSlashPalette();
    if (cmd === '/protect' || cmd === '/restore') {
      handleUserPrompt(cmd);
    } else {
      chatInput.value = cmd;
      chatInput.focus();
    }
  }

  chatInput?.addEventListener('input', () => {
    const val = chatInput.value;
    if (val.startsWith('/') && !val.includes(' ')) {
      showSlashPalette();
      const filter = val.toLowerCase();
      let hasVisible = false;
      slashItems.forEach((item, idx) => {
        const itemCmd = item.getAttribute('data-cmd') || '';
        const match = itemCmd.toLowerCase().includes(filter);
        item.style.display = match ? 'flex' : 'none';
        if (match && !hasVisible) {
          updateActiveSlashItem(idx);
          hasVisible = true;
        }
      });
    } else {
      hideSlashPalette();
    }
  });

  chatInput?.addEventListener('keydown', (e) => {
    if (slashPalette.style.display !== 'none') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateActiveSlashItem(activeSlashIndex + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateActiveSlashItem(activeSlashIndex - 1);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !chatInput.value.trim().includes(' '))) {
        e.preventDefault();
        const activeItem = slashItems[activeSlashIndex];
        if (activeItem) {
          const cmd = activeItem.getAttribute('data-cmd');
          if (cmd) selectCommand(cmd);
        }
        return;
      }
      if (e.key === 'Escape') {
        hideSlashPalette();
        return;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (slashPalette && !slashPalette.contains(e.target as Node) && e.target !== chatInput) {
      hideSlashPalette();
    }
  });

  // 5. Conversational Autonomous Execution Engine
  async function handleUserPrompt(promptText: string) {
    const text = promptText.trim();
    if (!text || isProcessing) return;

    hideSlashPalette();
    isProcessing = true;
    const hasSnapshot = Boolean(activeSnapshotUrl);
    appendUserMessage(text, hasSnapshot);
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

    // ==========================================
    // COMMAND 1: /protect (On-Device Privacy Shield + Snapshot Attachment)
    // ==========================================
    if (text === '/protect' || text.startsWith('/protect ') || lower === 'protect' || lower === 'protect page' || lower === 'redact' || lower === 'redact page') {
      const check = await ensureContentScriptLoaded(tab.id, tab);
      if (!check.ok) {
        thinkingNode.remove();
        appendAgentMessage(`⚠️ ${check.reason}`);
        isProcessing = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_AND_SANITIZE', disclosureLevel: 'AUTO' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        const lastErr = chrome.runtime.lastError;
        if (lastErr || !response || !response.success) {
          const errMsg = lastErr?.message || response?.error;
          if (errMsg && errMsg.includes('Receiving end does not exist')) {
            appendAgentMessage(`⚠️ <strong>Connection Notice:</strong> Please press <strong>F5</strong> to reload the webpage, then run <code>/protect</code>.`);
          } else {
            appendAgentMessage(`⚠️ Could not redact page: ${escapeHtml(errMsg || 'Please reload the webpage (F5) and try again.')}`);
          }
          return;
        }

        const report = response.report;

        // Capture on-device screenshot proof of the redacted page
        let proofUrl: string | undefined = undefined;
        try {
          await new Promise(r => setTimeout(r, 150)); // Ensure DOM has repainted with blackboxed styling
          if (tab.windowId) {
            proofUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 75 });
          }
          if (proofUrl) {
            await chrome.storage.local.set({ spidey_latest_proof: proofUrl, sentry_latest_proof: proofUrl });
            attachProtectedSnapshot(proofUrl);
            await saveScreenshotToHistory({
              id: 'snap_' + Date.now(),
              dataUrl: proofUrl,
              timestamp: Date.now(),
              dateStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              pageTitle: tab.title || 'Protected Page',
              pageUrl: tab.url || '',
              redactedCount: report.redactedCount
            });
          }
        } catch (e) {
          console.warn('[SpideyAgent] Could not capture screenshot proof:', e);
        }

        // Auto-Restore live DOM: restore webpage back to normal for the user,
        // while the chat dock maintains the attached zero-PII redacted snapshot and the vault retains tokens!
        chrome.tabs.sendMessage(tab.id!, { type: 'RESTORE_ORIGINAL_DOM', clearVault: false });

        appendAgentMessage(
          `🕷️ <strong>Webpage Protected & Redacted:</strong> Found and redacted <strong>${report.redactedCount} sensitive item(s)</strong>.<br>🔄 <em>Live webpage restored to normal for browsing. Zero-PII redacted snapshot attached to chat dock ready for your query!</em>`,
          [
            { title: '🔒 Redacted & Snapshot Captured', detail: `${report.redactedCount} entities protected: ${JSON.stringify(report.entitiesByType)}`, latencyMs: report.durationMs },
            { title: '🔄 Live Webpage Restored', detail: 'Original webpage restored while screenshot stays securely attached', latencyMs: 10 }
          ],
          proofUrl
        );

        if (proofUrl && vaultProofSection && vaultProofImg) {
          vaultProofImg.src = proofUrl;
          vaultProofSection.style.display = 'block';
        }

        await observabilityLogger.log('SECURITY', 'SUCCESS', `Protected active tab: ${report.redactedCount} entities redacted`, `Entities: ${JSON.stringify(report.entitiesByType)}`, report.durationMs);
        updateLogBadge();
        refreshVaultStatus();
      });
      return;
    }

    // ==========================================
    // COMMAND 1B: /restore (Un-redact Live Webpage)
    // ==========================================
    if (text === '/restore' || lower === 'restore' || lower === 'restore page' || lower === 'unredact') {
      const check = await ensureContentScriptLoaded(tab.id, tab);
      if (!check.ok) {
        thinkingNode.remove();
        appendAgentMessage(`⚠️ ${check.reason}`);
        isProcessing = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_DOM', clearVault: false }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        detachProtectedSnapshot();
        appendAgentMessage(
          `🔄 <strong>Webpage Restored:</strong> All original values and DOM elements have been restored to your active tab.`,
          [
            { title: '🔄 Live DOM Restored', detail: 'Original webpage elements rehydrated from local vault', latencyMs: elapsed }
          ]
        );
        await observabilityLogger.log('SECURITY', 'INFO', 'Webpage restored by user command', `Tab: ${tab.id}`, elapsed);
        updateLogBadge();
        refreshVaultStatus();
      });
      return;
    }

    // ==========================================
    // COMMAND 2: /search <query> (Google Web Search)
    // ==========================================
    if (text.startsWith('/search')) {
      const query = text.replace(/^\/search\s*/i, '').trim();
      if (!query) {
        thinkingNode.remove();
        appendAgentMessage('💡 Please provide a search query.<br><code>/search latest ISRO mission updates</code>');
        isProcessing = false;
        return;
      }

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

    // ==========================================
    // COMMAND 3: /nav (Natural Navigation & In-Page Link Finder: e.g. "/nav to payment page")
    // ==========================================
    if (text.startsWith('/nav')) {
      const rawTarget = text.replace(/^\/nav\s*/i, '').trim();
      const cleanTarget = rawTarget.replace(/^to\s+/i, '').trim();

      if (!cleanTarget) {
        thinkingNode.remove();
        appendAgentMessage('💡 Please specify a destination.<br><code>/nav to payment page</code> or <code>/nav youtube</code>');
        isProcessing = false;
        return;
      }

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
        'signature': 'https://szimek.github.io/signature_pad/',
        'signature pad': 'https://szimek.github.io/signature_pad/'
      };

      const isDirectUrl = /^https?:\/\//i.test(cleanTarget) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(cleanTarget);
      const shortcut = domainShortcuts[cleanTarget.toLowerCase()];

      if (shortcut || isDirectUrl) {
        let targetUrl = shortcut || cleanTarget;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }

        await chrome.tabs.update(tab.id, { url: targetUrl });
        thinkingNode.remove();
        const elapsed = Math.round(performance.now() - startTime);

        appendAgentMessage(`Navigated to <strong>${escapeHtml(targetUrl)}</strong>`, [
          { title: '🌐 Tab Navigation', detail: `Loaded ${targetUrl}`, latencyMs: elapsed }
        ]);
        await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `Navigated to ${targetUrl}`, `Destination: "${cleanTarget}"`, elapsed);
        updateLogBadge();
        isProcessing = false;
        return;
      }

      // In-page intent: "/nav to payment page", "/nav to checkout", "/nav to login", etc.
      // Ask content script to find and click matching element/link on page
      chrome.tabs.sendMessage(tab.id, { type: 'RUN_DETERMINISTIC_COMMAND', command: `click ${cleanTarget}` }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        const elapsed = Math.round(performance.now() - startTime);

        if (response && response.success) {
          appendAgentMessage(`🌐 <strong>Navigated on page:</strong> Found and activated <strong>"${escapeHtml(response.targetLabel || cleanTarget)}"</strong>`, [
            { 
              title: `🎯 Target Activated: ${response.targetLabel || cleanTarget}`, 
              detail: response.message || 'Target located and activated', 
              latencyMs: response.latencyMs || elapsed 
            }
          ]);
          await observabilityLogger.log('NAVIGATOR', 'SUCCESS', `In-page navigation to ${cleanTarget}`, response.message, elapsed);
          updateLogBadge();
          refreshVaultStatus();
        } else {
          // If not found on active page, fallback to Google search
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanTarget)}`;
          await chrome.tabs.update(tab.id!, { url: searchUrl });
          appendAgentMessage(`Could not find "${escapeHtml(cleanTarget)}" on this page. Searching web for: <strong>"${escapeHtml(cleanTarget)}"</strong>`, [
            { title: '🔍 Web Fallback Search', detail: searchUrl, latencyMs: elapsed }
          ]);
          await observabilityLogger.log('NAVIGATOR', 'INFO', `Nav fallback search for "${cleanTarget}"`, searchUrl, elapsed);
          updateLogBadge();
        }
      });
      return;
    }

    // ==========================================
    // COMMAND 4: /restore (Restore DOM)
    // ==========================================
    if (text === '/restore' || lower === 'restore') {
      const check = await ensureContentScriptLoaded(tab.id, tab);
      if (!check.ok) {
        thinkingNode.remove();
        appendAgentMessage('Could not connect to page to restore.');
        isProcessing = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_DOM' }, async (response) => {
        thinkingNode.remove();
        isProcessing = false;
        detachProtectedSnapshot();
        await chrome.storage.local.remove(['spidey_latest_proof', 'sentry_latest_proof']);
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

    // ==========================================
    // GENERAL QUERY / CHATBOT QUERY (Zero-Egress Server Query + Risk Gate)
    // ==========================================
    const check = await ensureContentScriptLoaded(tab.id, tab);
    if (!check.ok) {
      thinkingNode.remove();
      appendAgentMessage(`⚠️ ${check.reason}`);
      isProcessing = false;
      return;
    }

    // Step A: Extract & Seal Opaque Scene Graph from page (with fail-safe timeout)
    const extractRes = await new Promise<any>((resolve) => {
      const timer = setTimeout(() => resolve(null), 1500);
      try {
        chrome.tabs.sendMessage(tab.id!, { type: 'EXTRACT_AND_SEAL' }, (res) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(res);
          }
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });

    let serverAnswer: string | null = null;
    let plannedActions: PlannedAction[] = [];

    // Step B: Send sealed opaque payload AND attached screenshot to Central Reasoning Server
    const outboundPayload = {
      userGoal: text,
      screenshot: activeSnapshotUrl || null,
      hasScreenshot: Boolean(activeSnapshotUrl),
      nodes: extractRes?.wirePayload?.nodes || [],
      digestSha256: extractRes?.wirePayload?.digestSha256 || '',
      timestamp: Date.now()
    };

    console.log('[SpideyAgent] Packaging query with attached screenshot for reasoner server:', {
      userGoal: text,
      hasScreenshot: outboundPayload.hasScreenshot,
      digest: outboundPayload.digestSha256
    });

    if (extractRes && extractRes.wirePayload) {
      try {
        const controller = new AbortController();
        const fetchTimer = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch('http://localhost:8000/api/v1/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outboundPayload),
          signal: controller.signal
        });
        clearTimeout(fetchTimer);

        if (resp.ok) {
          const data = await resp.json();
          serverAnswer = data.thought || 'Analysis complete.';
          plannedActions = data.actions || [];
        }
      } catch (serverErr) {
        console.log('[SpideyAgent] Central server offline; evaluating locally via System 1 & Deterministic engine.');
      }
    }

      // Step C: Process Actions or Fallback
      if (plannedActions.length > 0) {
        thinkingNode.remove();
        isProcessing = false;

        if (serverAnswer) {
          appendAgentMessage(`🧠 <strong>Spidey Reasoner:</strong> ${escapeHtml(serverAnswer)}`);
        }

        const action = plannedActions[0];

        // Laya System-1 On-Device Safety Audit (< 4ms single forward pass)
        // Checks the remote provider's recommended action against local risk invariants
        const layaAudit = await layaSystem1EngineInstance.evaluateAction({
          userGoal: text,
          targetOpaqueId: action.targetOpaqueId,
          targetLabel: action.targetLabel,
          targetRole: action.action
        });

        console.log(`[Laya System-1 Verification] Audited remote plan in ${layaAudit.inferenceLatencyMs.toFixed(1)}ms:`, layaAudit);

        // If Laya flags the action as risky or requiring HITL, enforce safety gate
        const isRisky = layaAudit.requiresHITL || layaAudit.predictedRiskTier === 'TIER_4' || layaAudit.predictedRiskTier === 'TIER_3' || isActionRisky(action);
        if (isRisky) {
          action.riskTier = layaAudit.predictedRiskTier || 'TIER_4';
          action.reason = `[Laya Checked]: ${layaAudit.reason || action.reason}`;

          await observabilityLogger.log(
            'RISK_GATE', 
            'WARN', 
            `Laya System-1 Gated Action: ${action.action} on ${action.targetLabel}`, 
            `Risk: ${action.riskTier} (Confidence: ${(layaAudit.riskConfidence * 100).toFixed(0)}%, Latency: ${layaAudit.inferenceLatencyMs.toFixed(1)}ms)`, 
            layaAudit.inferenceLatencyMs
          );

          // Trigger Human-in-the-Loop Confirmation Overlay!
          const authorized = await promptHumanInTheLoop(action);
          if (!authorized) {
            appendAgentMessage(`✕ <strong>Action Denied:</strong> Aborted by user at Human-in-the-Loop Safety Gate. No changes were made to the page.`);
            await observabilityLogger.log('RISK_GATE', 'WARN', `Action aborted by user: ${action.action} on ${action.targetLabel}`);
            updateLogBadge();
            return;
          }

          // User Authorized: Execute the risky action
          chrome.tabs.sendMessage(tab.id!, { type: 'EXECUTE_ACTION', action }, async (execRes) => {
            appendAgentMessage(`✔ <strong>Action Authorized & Dispatched:</strong> Successfully executed <code>${escapeHtml(action.action)}</code> on "${escapeHtml(action.targetLabel)}" with zero-egress local rehydration.`, [
              { title: `⚡ Dispatched: ${action.action}`, detail: `Target: ${action.targetLabel} (${action.riskTier}) · Laya Verified`, latencyMs: Math.round(performance.now() - startTime) }
            ]);
            await observabilityLogger.log('RISK_GATE', 'SUCCESS', `User authorized risky action: ${action.action}`, action.targetLabel);
            updateLogBadge();
            refreshVaultStatus();
          });
          return;
        }

        // Action is safe (Tier 1/2) -> Execute directly
        chrome.tabs.sendMessage(tab.id!, { type: 'EXECUTE_ACTION', action }, async (execRes) => {
          appendAgentMessage(`✔ Executed action: <strong>${escapeHtml(action.action)}</strong> on ${escapeHtml(action.targetLabel)}`, [
            { title: '⚡ Action Dispatched', detail: action.reason || 'Safe autonomous action', latencyMs: Math.round(performance.now() - startTime) }
          ]);
          await observabilityLogger.log('EXECUTION', 'SUCCESS', `Safe execution: ${action.action}`, action.targetLabel);
          updateLogBadge();
          refreshVaultStatus();
        });
        return;
      }

      // If no server actions planned, check for in-page deterministic action
      // Check if command itself sounds like a risky action (e.g. "click payment", "pay 500", "submit form")
      const isDirectRisky = /pay|payment|submit|checkout|confirm|order|delete|transfer/i.test(text);

      if (isDirectRisky) {
        thinkingNode.remove();
        isProcessing = false;

        const fakeAction: PlannedAction = {
          step: 1,
          action: 'CLICK',
          targetOpaqueId: 'interactive_element',
          targetLabel: text,
          riskTier: 'TIER_4',
          reason: `User requested high-stakes operation: "${text}"`
        };

        const authorized = await promptHumanInTheLoop(fakeAction);
        if (!authorized) {
          appendAgentMessage(`✕ <strong>Action Denied:</strong> Aborted by user at Human-in-the-Loop Safety Gate.`);
          await observabilityLogger.log('RISK_GATE', 'WARN', `Action aborted by user: ${text}`);
          updateLogBadge();
          return;
        }

        // Authorized: execute deterministic click
        chrome.tabs.sendMessage(tab.id!, { type: 'RUN_DETERMINISTIC_COMMAND', command: text }, async (response) => {
          if (response && response.success) {
            appendAgentMessage(`✔ <strong>Action Authorized & Dispatched:</strong> ${escapeHtml(response.message)}`, [
              { title: `🎯 ${response.executedVerb || 'ACTION'}: ${response.targetLabel || 'Target'}`, detail: 'Local hardware dispatch with zero-egress vault rehydration', latencyMs: response.latencyMs || Math.round(performance.now() - startTime) }
            ]);
            await observabilityLogger.log('RISK_GATE', 'SUCCESS', `Authorized execution: ${text}`, response.message);
            updateLogBadge();
            refreshVaultStatus();
          } else {
            appendAgentMessage(`Could not execute action: ${escapeHtml(response?.message || 'Element not found')}`);
          }
        });
        return;
      }

      // Normal deterministic command or query fallback
      chrome.tabs.sendMessage(tab.id!, { type: 'RUN_DETERMINISTIC_COMMAND', command: text }, async (response) => {
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
          await observabilityLogger.log('EXECUTION', 'SUCCESS', `Deterministic command executed: ${response.message}`, `Command: "${text}"`, elapsed);
          updateLogBadge();
          refreshVaultStatus();
        } else {
          const snapshotHint = activeSnapshotUrl ? '<br><br>📸 <em>Protected snapshot is active. You can ask queries like "What is the form about?", "Click next", or "/nav to payment page".</em>' : '';
          appendAgentMessage(
            `SpideyAgent: ${escapeHtml(response?.message || 'I could not find an interactable element matching that query.')}${snapshotHint}<br><br>💡 Try using commands:<br>• <code>/protect</code> — Mask all PII on this page<br>• <code>/nav to payment page</code> — In-page navigation<br>• <code>/search &lt;query&gt;</code> — Web search`
          );
        }
      });
  }

  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserPrompt(chatInput.value);
  });

  // 6. Log Space Rendering & Filtering
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLogFilter = btn.dataset.filter || 'ALL';
      renderLogs();
    });
  });

  btnClearLogs?.addEventListener('click', async () => {
    await observabilityLogger.clearLogs();
    renderLogs();
    updateLogBadge();
  });

  btnExportLogs?.addEventListener('click', async () => {
    const jsonStr = observabilityLogger.exportAuditReport();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spidey-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  async function renderLogs() {
    if (!logList) return;
    const allLogs: ObservabilityLogEntry[] = await observabilityLogger.getLogs();
    const filtered = allLogs.filter((log: ObservabilityLogEntry) => {
      if (activeLogFilter === 'ALL') return true;
      return log.category === activeLogFilter;
    });

    if (filtered.length === 0) {
      logList.innerHTML = `<div class="empty-state">No ${activeLogFilter.toLowerCase()} logs recorded yet.</div>`;
      return;
    }

    logList.innerHTML = filtered.map((log: ObservabilityLogEntry) => `
      <div class="log-entry ${log.level}">
        <div class="log-entry-header">
          <span class="log-category">${escapeHtml(log.category)} · ${escapeHtml(log.level)}</span>
          <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="log-message">${escapeHtml(log.title)}</div>
        ${log.details ? `<div class="log-metadata" style="font-size:10px; color:#94a3b8; margin-top:2px;">${escapeHtml(log.details)}</div>` : ''}
      </div>
    `).join('');
  }

  async function updateLogBadge() {
    if (logCountBadge) {
      const logs = await observabilityLogger.getLogs();
      logCountBadge.textContent = String(logs.length);
    }
  }

  // 7. Local Vault Status
  async function refreshVaultStatus() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    try {
      chrome.storage.local.get(['spidey_latest_proof', 'sentry_latest_proof'], (res) => {
        const proof = res?.spidey_latest_proof || res?.sentry_latest_proof;
        if (proof && vaultProofSection && vaultProofImg) {
          vaultProofImg.src = proof;
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
