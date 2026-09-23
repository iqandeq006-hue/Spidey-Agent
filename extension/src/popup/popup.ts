// SentryAgent Popup Controller v2 (Phases 1-4)

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

  async function getActiveTabId(): Promise<number | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id;
  }

  async function refreshStatus() {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    try {
      chrome.tabs.sendMessage(tabId, { type: 'GET_VAULT_STATUS' }, (response) => {
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
    const tabId = await getActiveTabId();
    if (!tabId) return;

    btnAutonomous.disabled = true;
    btnAutonomous.innerHTML = '<span>🤖 Reasoner Planning & Risk Gating...</span>';

    chrome.tabs.sendMessage(tabId, { type: 'RUN_AUTONOMOUS_STEP' }, (response) => {
      btnAutonomous.disabled = false;
      btnAutonomous.innerHTML = '<span class="btn-icon">🤖</span> Run End-to-End Agent Loop';

      if (response && response.success) {
        refreshStatus();
        window.close(); // Close popup so user sees the on-screen Risk Gate modal on the page!
      } else {
        alert(response?.message || 'Autonomous step encountered an issue. Check console.');
      }
    });
  });

  // Manual Scan
  btnScan?.addEventListener('click', async () => {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    btnScan.disabled = true;
    btnScan.innerHTML = '<span>⏳ Scanning...</span>';

    chrome.tabs.sendMessage(tabId, { type: 'SCAN_AND_SANITIZE' }, (response) => {
      btnScan.disabled = false;
      btnScan.innerHTML = '<span class="btn-icon">⚡</span> Scan & Sanitize';

      if (response && response.success) {
        refreshStatus();
      } else {
        alert('Could not sanitize active tab. Ensure you are on a valid webpage.');
      }
    });
  });

  // Restore
  btnRestore?.addEventListener('click', async () => {
    const tabId = await getActiveTabId();
    if (!tabId) return;

    chrome.tabs.sendMessage(tabId, { type: 'RESTORE_ORIGINAL_DOM' }, (response) => {
      if (response && response.success) {
        refreshStatus();
      }
    });
  });

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  refreshStatus();
});
