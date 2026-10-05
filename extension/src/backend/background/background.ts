// SpideyAgent Background Service Worker (Manifest V3)
// Autonomous Multi-Hop Task Runner & Cross-Page Session Manager
// Prevents Multi-Hop Amnesia by keeping state persistently across tab navigations.

import { AgentSessionState, PlannedAction } from '../types';

let currentSession: AgentSessionState | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SpideyAgent] Background Service Worker installed successfully.');
  // Configure Side Panel to automatically open when user clicks extension icon in toolbar
  if ((chrome as any).sidePanel?.setPanelBehavior) {
    (chrome as any).sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err: any) => console.error('[SpideyAgent] Failed to set side panel behavior:', err));
  }
});

// Configure side panel behavior on top-level service worker startup
if ((chrome as any).sidePanel?.setPanelBehavior) {
  (chrome as any).sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: any) => console.error('[SpideyAgent] setPanelBehavior error:', err));
}

// Fallback action click listener in case setPanelBehavior is bypassed
chrome.action?.onClicked?.addListener(async (tab) => {
  if (tab.windowId && (chrome as any).sidePanel?.open) {
    try {
      await (chrome as any).sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.error('[SpideyAgent] Failed to open side panel on click:', err);
    }
  }
});

// Restore previous session from storage if service worker wakes up
chrome.storage.local.get(['sentry_active_session'], (res) => {
  if (res.sentry_active_session) {
    currentSession = res.sentry_active_session;
    console.log('[SpideyAgent] Restored active session:', currentSession);
  }
});

// Save session state helper
async function saveSession(session: AgentSessionState | null): Promise<void> {
  currentSession = session;
  if (session) {
    await chrome.storage.local.set({ sentry_active_session: session });
  } else {
    await chrome.storage.local.remove(['sentry_active_session']);
  }
}

// 1. Start Autonomous Multi-Hop Task
export async function startAutonomousTask(userGoal: string, tabId: number): Promise<{ success: boolean; message: string }> {
  currentSession = {
    taskId: 'task_' + Date.now(),
    userGoal,
    status: 'RUNNING',
    currentStep: 1,
    maxSteps: 8,
    checklist: [],
    actionHistory: [],
    lastUpdated: Date.now()
  };

  await saveSession(currentSession);
  console.log(`[SpideyAgent Background] Started autonomous multi-hop task [${currentSession.taskId}]: "${userGoal}"`);

  // Execute Step 1
  runSessionStep(tabId);
  return { success: true, message: `Task started: "${userGoal}"` };
}

// 2. Execute Single Step in the Autonomous Loop
export async function runSessionStep(tabId: number): Promise<void> {
  if (!currentSession || currentSession.status !== 'RUNNING') return;

  if (currentSession.currentStep > currentSession.maxSteps) {
    console.log('[SpideyAgent Background] Max steps limit reached. Marking session COMPLETED.');
    currentSession.status = 'COMPLETED';
    await saveSession(currentSession);
    return;
  }

  console.log(`[SpideyAgent Background] Running Step ${currentSession.currentStep}/${currentSession.maxSteps}...`);

  try {
    // A. Ask Content Script to Scan and Seal Opaque Scene Graph
    // Sends 'AUTO' so content script dynamically escalates to L2 whenever canvas/visuals are present
    const extractRes = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_AND_SEAL',
      disclosureLevel: 'AUTO' // Dynamic ladder gating: L1 for text-only DOM, L2 for canvas/signatures
    });

    if (!extractRes || !extractRes.wirePayload) {
      console.warn('[SpideyAgent Background] Content script returned empty payload. Waiting for page settle...');
      return;
    }

    const { wirePayload } = extractRes;
    wirePayload.userGoal = currentSession.userGoal;
    wirePayload.history = currentSession.actionHistory;
    wirePayload.checklist = currentSession.checklist;

    // B. Send Sanitized Payload to Server LLM Reasoner
    console.log('[SpideyAgent Background] Sending SHA-256 sealed payload to http://localhost:8000/api/v1/plan');
    const planResp = await fetch('http://localhost:8000/api/v1/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Digest': wirePayload.digestSha256
      },
      body: JSON.stringify(wirePayload)
    });

    if (!planResp.ok) {
      throw new Error(`Reasoner returned HTTP ${planResp.status}`);
    }

    const planData = await planResp.json();
    console.log('[SpideyAgent Background] Received Plan from Reasoner:', planData);

    // Update Checklist from Reasoner
    if (planData.checklist && Array.isArray(planData.checklist)) {
      currentSession.checklist = planData.checklist;
    }

    const actions: PlannedAction[] = planData.actions || [];
    if (actions.length === 0 || planData.isFinished) {
      console.log('[SpideyAgent Background] Reasoner indicated task is finished or no actions left.');
      currentSession.status = 'COMPLETED';
      await saveSession(currentSession);
      return;
    }

    // C. Dispatch Action to Tab
    const actionToExecute = actions[0];
    console.log(`[SpideyAgent Background] Dispatching Action: [${actionToExecute.action}] on [${actionToExecute.targetOpaqueId}]`);

    const execRes = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      action: actionToExecute
    });

    // Record Action in History
    currentSession.actionHistory.push({
      step: currentSession.currentStep,
      action: actionToExecute.action,
      targetLabel: actionToExecute.targetLabel || actionToExecute.targetOpaqueId,
      riskTier: actionToExecute.riskTier,
      reason: actionToExecute.reason
    });

    currentSession.currentStep++;
    currentSession.lastUpdated = Date.now();
    await saveSession(currentSession);

    if (execRes && execRes.causedNavigation) {
      console.log('[SpideyAgent Background] Action triggered page navigation. Waiting for tab onUpdated event...');
      // Navigation handler will automatically continue the loop
    } else {
      // Pause slightly and continue next step on same page
      setTimeout(() => {
        runSessionStep(tabId);
      }, 1000);
    }
  } catch (err: any) {
    console.error('[SpideyAgent Background] Step execution error:', err?.message || err);
  }
}

// 3. Tab Navigation Listener: Handles Page Transitions & Multi-Hop Autonomy
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    if (currentSession && currentSession.status === 'RUNNING') {
      console.log(`[SpideyAgent Background] Tab ${tabId} reloaded / navigated to ${tab.url}. Resuming multi-hop autonomous loop!`);
      setTimeout(() => {
        runSessionStep(tabId);
      }, 1200); // Allow DOM and scripts to hydrate
    }
  }
});

// 4. Message Dispatcher for Extension UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_AUTONOMOUS_SESSION') {
    const goal = message.userGoal || 'Perform autonomous procurement submission';
    const targetTabId = message.tabId || sender.tab?.id;
    if (targetTabId) {
      startAutonomousTask(goal, targetTabId).then(sendResponse);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          startAutonomousTask(goal, tabs[0].id).then(sendResponse);
        }
      });
    }
    return true;
  }

  if (message.type === 'GET_SESSION_STATE') {
    sendResponse({ session: currentSession });
    return true;
  }

  if (message.type === 'ABORT_SESSION') {
    if (currentSession) {
      currentSession.status = 'FAILED';
      saveSession(null);
    }
    sendResponse({ success: true, message: 'Autonomous task aborted by user.' });
    return true;
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.windowId && (chrome as any).sidePanel?.open) {
        (chrome as any).sidePanel.open({ windowId: currentTab.windowId })
          .then(() => sendResponse({ success: true }))
          .catch((err: any) => sendResponse({ success: false, error: String(err) }));
      } else {
        sendResponse({ success: false, error: 'SidePanel API not available or tab window not found' });
      }
    });
    return true;
  }
});
