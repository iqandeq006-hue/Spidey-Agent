// SpideyAgent Observability & Audit Logging Engine (Client-Side & MV3)
// Provides complete transparency into perception, redactions, decisions, and hardware execution.
// Persists structured telemetry to chrome.storage.local with exportable JSON audit trails.

export type LogCategory = 
  | 'PERCEPTION'      // Canvas/DOM scanning, Shannon Entropy, OmniParser icons
  | 'REDACTION'       // PII classification, Verhoeff/Luhn checksum, Vault tokenization
  | 'SECURITY'        // Fail-Closed Egress, SHA-256 seal, Canary verification
  | 'DECISION'        // System-1 Non-Autoregressive routing, Kahneman Fast-Path
  | 'NAVIGATOR'       // Zero-AI Deterministic commands, fuzzy Levenshtein matches
  | 'EXECUTION'       // CDP hardware dispatch, reticle animations, click/type events
  | 'RISK_GATE';      // Statutory risk tiers (TIER_1 - TIER_4), policy enforcement

export type LogLevel = 'INFO' | 'WARN' | 'SUCCESS' | 'CRITICAL';

export interface ObservabilityLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  category: LogCategory;
  level: LogLevel;
  title: string;
  details?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

const MAX_LOGS_BUFFER = 120;
const STORAGE_KEY = 'sentry_observability_logs';

export class ObservabilityLogger {
  private inMemoryLogs: ObservabilityLogEntry[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.initStorage();
  }

  private async initStorage(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const data = await chrome.storage.local.get(STORAGE_KEY);
        if (Array.isArray(data[STORAGE_KEY])) {
          this.inMemoryLogs = data[STORAGE_KEY];
        }
      } catch (err) {
        console.warn('[ObservabilityLogger] Storage load failed:', err);
      }
    }
    this.isLoaded = true;
  }

  // Record a high-fidelity observability event
  public async log(
    category: LogCategory,
    level: LogLevel,
    title: string,
    details?: string,
    latencyMs?: number,
    metadata?: Record<string, any>
  ): Promise<ObservabilityLogEntry> {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const entry: ObservabilityLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      timeFormatted,
      category,
      level,
      title,
      details,
      latencyMs,
      metadata
    };

    // Prepend to memory buffer
    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > MAX_LOGS_BUFFER) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, MAX_LOGS_BUFFER);
    }

    // Persist to storage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: this.inMemoryLogs });
      } catch (err) {
        // ignore storage quota errors
      }
    }

    // Broadcast event to active popups / side panels
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'OBSERVABILITY_LOG_EVENT',
          logEntry: entry
        }).catch(() => {}); // Catch when no UI listeners are active
      } catch (e) {}
    }

    console.log(`[SentryTelemetry][${category}][${level}] ${title} ${latencyMs !== undefined ? `(${latencyMs}ms)` : ''}`);
    return entry;
  }

  // Get all active logs
  public async getLogs(): Promise<ObservabilityLogEntry[]> {
    if (!this.isLoaded && typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (Array.isArray(data[STORAGE_KEY])) {
        this.inMemoryLogs = data[STORAGE_KEY];
      }
      this.isLoaded = true;
    }
    return [...this.inMemoryLogs];
  }

  // Clear all logs
  public async clearLogs(): Promise<void> {
    this.inMemoryLogs = [];
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  }

  // Export full audit report as structured JSON
  public exportAuditReport(): string {
    const report = {
      generatedAt: new Date().toISOString(),
      agentVersion: '2.5.0',
      totalEvents: this.inMemoryLogs.length,
      zeroEgressAssurance: 'ALL_OPERATIONS_LOCAL_OR_SHA256_SEALED',
      telemetryLog: this.inMemoryLogs
    };
    return JSON.stringify(report, null, 2);
  }
}

export const observabilityLogger = new ObservabilityLogger();
