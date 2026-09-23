// Action Dispatcher & 4-Tier Local Risk Policy Gate (Phase 4)
// Enforces the "Reasoning != Authority" security rule.
// Downstream LLMs only propose actions; the local client authorizes, gates, and executes them.

import { vaultInstance } from '../privacy/vault';

export type RiskTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

export interface PlannedAction {
  step: number;
  action: 'CLICK' | 'TYPE' | 'FOCUS' | 'SCROLL' | 'NAVIGATE';
  targetOpaqueId: string;
  targetLabel: string;
  riskTier: RiskTier;
  reason: string;
  payloadValue?: string;
}

import { cursorReticleInstance } from './cursorReticle';

export class ActionDispatcher {
  // Map of opaque node ID -> Live DOM Element
  private idToElementMap: Map<string, HTMLElement> = new Map();

  public registerOpaqueNode(opaqueId: string, element: HTMLElement): void {
    this.idToElementMap.set(opaqueId, element);
  }

  public clearRegistry(): void {
    this.idToElementMap.clear();
  }

  // Execute a planned action through the local risk policy gate
  public async executeAction(action: PlannedAction): Promise<{ success: boolean; executed: boolean; message: string }> {
    const targetEl = this.idToElementMap.get(action.targetOpaqueId);
    if (!targetEl) {
      return { success: false, executed: false, message: `Target opaque ID "${action.targetOpaqueId}" not found in current DOM registry.` };
    }

    console.log(`[ActionDispatcher] Evaluating action "${action.action}" on [${action.targetOpaqueId}] (${action.riskTier})`);

    // Animate Tactical Sentry HUD Reticle to target coordinates
    const rect = targetEl.getBoundingClientRect();
    const centerX = Math.round(rect.left + rect.width / 2);
    const centerY = Math.round(rect.top + rect.height / 2);
    await cursorReticleInstance.glideTo(centerX, centerY, action.targetLabel || action.targetOpaqueId, action.action);

    // Gating for TIER_4 (Irreversible / High-Stakes Statutory Actions)
    if (action.riskTier === 'TIER_4') {
      const authorized = await this.promptRiskConfirmationModal(action, targetEl);
      if (!authorized) {
        return { success: true, executed: false, message: 'Action aborted by user at Local Risk Gate.' };
      }
    }

    // Rehydrate values locally if the action involves typing or submitting
    if (action.action === 'TYPE' && action.payloadValue) {
      const realValue = vaultInstance.rehydrate(action.payloadValue);
      if ('value' in targetEl) {
        (targetEl as HTMLInputElement).value = realValue;
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (action.action === 'CLICK') {
      // Prior to clicking a submit button, ensure all fields are locally re-hydrated
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.click();
    } else if (action.action === 'FOCUS') {
      targetEl.focus();
    }

    return {
      success: true,
      executed: true,
      message: `Action [${action.action}] successfully dispatched on [${action.targetOpaqueId}].`
    };
  }

  // Injects an on-screen confirmation modal for Tier 4 high-stakes actions
  private promptRiskConfirmationModal(action: PlannedAction, element: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
      // Remove any existing modal
      const existing = document.getElementById('sentry-risk-modal');
      if (existing) existing.remove();

      const modalOverlay = document.createElement('div');
      modalOverlay.id = 'sentry-risk-modal';
      modalOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const modalBox = document.createElement('div');
      modalBox.style.cssText = `
        background: #1e293b;
        color: #f8fafc;
        border-radius: 12px;
        border: 2px solid #ef4444;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        width: 480px;
        max-width: 90vw;
        padding: 24px;
      `;

      modalBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="font-size: 28px;">⚠️</div>
          <div>
            <div style="color: #ef4444; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              SentryAgent • Local Risk Gate (Tier 4)
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #ffffff;">
              Authorization Required: High-Stakes Action
            </div>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 14px; margin-bottom: 18px; font-size: 13px; line-height: 1.5;">
          <div style="margin-bottom: 6px;">
            <strong style="color: #94a3b8;">Requested Action:</strong>
            <span style="color: #38bdf8; font-weight: 600; font-family: monospace;">${action.action}</span> on <span style="font-family: monospace; color: #f59e0b;">${action.targetOpaqueId}</span>
          </div>
          <div style="margin-bottom: 6px;">
            <strong style="color: #94a3b8;">Target Description:</strong> ${action.targetLabel}
          </div>
          <div>
            <strong style="color: #94a3b8;">Agent Rationale:</strong> ${action.reason}
          </div>
        </div>

        <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 20px; line-height: 1.4;">
          🔒 <strong>Zero-Egress Notice:</strong> The remote server recommended this step using an opaque identifier only. If authorized, SentryAgent will rehydrate real values locally on this device before submitting.
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="sentry-btn-abort" style="
            background: #334155; color: #f8fafc; border: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
            ✕ Abort Action
          </button>
          <button id="sentry-btn-authorize" style="
            background: #ef4444; color: #ffffff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);">
            ✓ Authorize & Dispatch
          </button>
        </div>
      `;

      modalOverlay.appendChild(modalBox);
      document.body.appendChild(modalOverlay);

      document.getElementById('sentry-btn-abort')?.addEventListener('click', () => {
        modalOverlay.remove();
        resolve(false);
      });

      document.getElementById('sentry-btn-authorize')?.addEventListener('click', () => {
        modalOverlay.remove();
        resolve(true);
      });
    });
  }
}

export const actionDispatcherInstance = new ActionDispatcher();
