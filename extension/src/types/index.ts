export type PIIType =
  | 'AADHAAR'
  | 'PAN'
  | 'GSTIN'
  | 'CARD'
  | 'EMAIL'
  | 'PHONE'
  | 'PASSPORT'
  | 'CONFIDENTIAL_NUM'
  | 'PERSON'
  | 'USERNAME'
  | 'CANVAS_SIGNATURE'
  | 'AVATAR_FACE'
  | 'CANVAS_TEXT';

export interface DetectionResult {
  type: PIIType;
  rawText: string;
  token: string;
  confidence: number;
  selector?: string;
  source: 'DOM_INPUT' | 'DOM_TEXT' | 'CANVAS' | 'IMAGE';
  timestamp: number;
}

export interface VaultEntry {
  token: string;
  realValue: string;
  type: PIIType;
  detectedAt: number;
  sourceElementSelector?: string;
}

export interface SanitizationReport {
  url: string;
  timestamp: number;
  redactedCount: number;
  entitiesByType: Record<string, number>;
  tokens: string[];
  durationMs: number;
  visualDetectionsCount?: number;
  activeDisclosureLevel?: 'L0' | 'L1' | 'L2' | 'L3';
}

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

export interface SubGoalItem {
  id: number;
  description: string;
  done: boolean;
}

export interface AgentSessionState {
  taskId: string;
  userGoal: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED_RISK_CONFIRMATION' | 'COMPLETED' | 'FAILED';
  currentStep: number;
  maxSteps: number;
  checklist: SubGoalItem[];
  actionHistory: Array<{ step: number; action: string; targetLabel: string; riskTier: string; reason: string }>;
  lastUrl?: string;
  lastUpdated: number;
}

export interface OpaqueSceneNode {
  opaqueId: string;
  role: string;
  sanitizedLabel: string;
  tokenType?: PIIType;
  interactive: boolean;
  boundingBox: { x: number; y: number; w: number; h: number };
}

export type ExtensionMessage =
  | { type: 'SCAN_AND_SANITIZE'; tabId?: number }
  | { type: 'RESTORE_ORIGINAL_DOM'; tabId?: number }
  | { type: 'GET_VAULT_STATUS'; tabId?: number }
  | { type: 'RUN_AUTONOMOUS_STEP'; tabId?: number }
  | { type: 'VAULT_STATUS_RESPONSE'; entries: VaultEntry[]; totalCount: number; isSanitized: boolean }
  | { type: 'SANITIZATION_COMPLETED'; report: SanitizationReport }
  | { type: 'EXECUTE_PROTECTED_ACTION'; action: string; targetSelector: string; tabId?: number };
