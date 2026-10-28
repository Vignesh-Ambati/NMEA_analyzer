/**
 * Centralized Diagnostic Logging & Inspection Engine
 *
 * Provides structured, stage-by-stage logging for every layer:
 * - File Ingestion & Parsing
 * - Task Matrix computations
 * - Plotting & Charts rendering
 * - Engine & Developer operations
 *
 * Replaces ad-hoc console.log statements with searchable, filterable,
 * and exportable diagnostics available directly in Developer Suite.
 */

export type LogStage = 'ingestion' | 'network' | 'tasks' | 'charts' | 'developer' | 'system';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface AppLogEntry {
  id: string;
  timestamp: string;
  isoDate: string;
  source: 'client';
  stage: LogStage;
  level: LogLevel;
  message: string;
  details?: any;
  durationMs?: number;
}

export interface OfflineDiagnosticEntry {
  id: string;
  timestamp: string;
  uiAction: string;
  route?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  statusCode?: number;
  statusText?: string;
  level: LogLevel;
  message: string;
  error?: string;
  payload?: any;
  fallbackAction?: string;
  notes?: string;
}

export type LogSubscriber = (entry: AppLogEntry, allLogs: AppLogEntry[]) => void;

const MAX_LOGS = 1000;

/**
 * Deep credential redaction to guarantee passwords, tokens, and secret keys
 * are never stored in memory logs, developer console, or exported reports.
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    return data.replace(/(password|passcode|pin|secret|auth|token|credential)=([^&\s]+)/gi, "$1=[REDACTED]");
  }
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (/password|passcode|pin|secret|credential|token|auth_token|auth_key/i.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = redactSensitiveData(val);
    }
  }
  return sanitized;
}

class DiagnosticLogger {
  private logs: AppLogEntry[] = [];
  private offlineDiagnostics: OfflineDiagnosticEntry[] = [];
  private subscribers: Set<LogSubscriber> = new Set();

  constructor() {
    this.logs = [];
    this.offlineDiagnostics = [];
    this.system('Diagnostic Logger initialized in clean session');
  }

  private formatTime(date: Date = new Date()): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  public recordOfflineDiagnostic(entry: Omit<OfflineDiagnosticEntry, 'id' | 'timestamp'>): OfflineDiagnosticEntry {
    const now = new Date();
    const fullEntry: OfflineDiagnosticEntry = {
      ...entry,
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
    };

    this.offlineDiagnostics.push(fullEntry);
    if (this.offlineDiagnostics.length > 250) {
      this.offlineDiagnostics.shift();
    }

    this.log({
      source: 'client',
      stage: 'network',
      level: entry.level || 'error',
      message: entry.message || `Offline issue: ${entry.uiAction}`,
      details: {
        uiAction: entry.uiAction,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        statusText: entry.statusText,
        error: entry.error,
        payload: entry.payload,
        fallbackAction: entry.fallbackAction,
        notes: entry.notes,
      },
    });

    return fullEntry;
  }

  public getOfflineDiagnostics(): OfflineDiagnosticEntry[] {
    return [...this.offlineDiagnostics];
  }

  public exportOfflineDiagnostics(): string {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: this.offlineDiagnostics.length,
      entries: this.offlineDiagnostics,
    }, null, 2);
  }

  public async saveOfflineDiagnosticsToFile(filename: string = 'offline-debug.json'): Promise<{ success: boolean; fileName?: string; error?: string }> {
    const report = this.exportOfflineDiagnostics();
    const blob = new Blob([report], { type: 'application/json' });
    const safeFileName = (filename || 'offline-debug.json').replace(/[\\/]+/g, '').replace(/^\.+/, '');

    try {
      if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
        const handle = await window.showSaveFilePicker({
          suggestedName: safeFileName,
          types: [{
            description: 'JSON Diagnostics',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, fileName: safeFileName };
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, fileName: safeFileName };
    } catch (err: any) {
      const message = err?.message || 'Unable to save offline diagnostics';
      this.recordOfflineDiagnostic({
        uiAction: 'save_offline_report',
        route: '/ui/logs',
        method: 'POST',
        level: 'warn',
        message: 'Offline diagnostics export failed',
        error: message,
        fallbackAction: 'Browser file export fallback was cancelled or unsupported',
      });
      return { success: false, error: message };
    }
  }

  public log(entry: Omit<AppLogEntry, 'id' | 'timestamp' | 'isoDate'>): AppLogEntry {
    const now = new Date();
    const sanitizedDetails = entry.details ? redactSensitiveData(entry.details) : undefined;
    const sanitizedMessage = typeof entry.message === 'string'
      ? entry.message.replace(/(password|passcode|pin|secret|auth)=([^&\s]+)/gi, '$1=[REDACTED]')
      : entry.message;

    const fullEntry: AppLogEntry = {
      ...entry,
      message: sanitizedMessage,
      details: sanitizedDetails,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: this.formatTime(now),
      isoDate: now.toISOString(),
    };

    this.logs.push(fullEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.subscribers.forEach((subscriber) => subscriber(fullEntry, [...this.logs]));
    return fullEntry;
  }

  public getLogs(): AppLogEntry[] {
    return [...this.logs];
  }

  public exportJson(): string {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: this.logs.length,
      entries: this.logs,
    }, null, 2);
  }

  public subscribe(subscriber: LogSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  public clear(): void {
    this.logs = [];
    this.offlineDiagnostics = [];
    this.subscribers.forEach((subscriber) => subscriber({
      id: `log-clear`,
      timestamp: this.formatTime(),
      isoDate: new Date().toISOString(),
      source: 'client',
      stage: 'system',
      level: 'info',
      message: 'Diagnostic log buffer cleared.',
    }, []));
  }

  public system(message: string, details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'system', level: 'info', message, details });
  }

  public ingestion(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'ingestion', level, message, details, durationMs });
  }

  public network(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'network', level, message, details, durationMs });
  }

  public developer(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'developer', level, message, details, durationMs });
  }

  public tasks(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'tasks', level, message, details, durationMs });
  }

  public charts(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'charts', level, message, details, durationMs });
  }

  public backend(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'network', level, message, details, durationMs });
  }
}

export const logger = new DiagnosticLogger();
