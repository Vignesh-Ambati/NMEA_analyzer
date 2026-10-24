/**
 * Centralized Diagnostic Logging & Inspection Engine
 * 
 * Provides structured, stage-by-stage logging for every layer:
 * - File Ingestion & Parsing
 * - Network & API requests (FastAPI calls, health pings, upload streams)
 * - Task Matrix computations
 * - Plotting & Charts rendering
 * - Engine & Developer operations
 * - Backend server logs ingestion
 * 
 * Replaces ad-hoc console.log statements with searchable, filterable,
 * and exportable diagnostics available directly in Developer Suite.
 */

export type LogStage = 'ingestion' | 'network' | 'tasks' | 'charts' | 'developer' | 'backend' | 'system';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface AppLogEntry {
  id: string;
  timestamp: string; // e.g. "06:34:21.412"
  isoDate: string;
  source: 'client' | 'backend';
  stage: LogStage;
  level: LogLevel;
  message: string;
  details?: any; // JSON payload, headers, stack trace, etc.
  durationMs?: number;
}

export interface OfflineDiagnosticEntry {
  id: string;
  timestamp: string;
  uiAction: string;
  route?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  backendUrl?: string;
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
const STORAGE_KEY = 'nmea_diagnostic_logs';
const OFFLINE_STORAGE_KEY = 'nmea_offline_diagnostics';

class DiagnosticLogger {
  private logs: AppLogEntry[] = [];
  private offlineDiagnostics: OfflineDiagnosticEntry[] = [];
  private subscribers: Set<LogSubscriber> = new Set();
  private isAutoPollActive = false;
  private pollIntervalRef: any = null;

  constructor() {
    this.clearPersistedDiagnostics();
    this.logs = [];
    this.offlineDiagnostics = [];
    this.system('Diagnostic Logger initialized in clean session');
  }

  private clearPersistedDiagnostics(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private formatTime(date: Date = new Date()): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  private loadPersistedLogs(): void {
    // Intentionally do not restore prior browser data so each dev session starts fresh.
    this.logs = [];
  }

  private loadPersistedOfflineDiagnostics(): void {
    // Intentionally do not restore prior browser data so each dev session starts fresh.
    this.offlineDiagnostics = [];
  }

  private persistLogs(): void {
    try {
      const slice = this.logs.slice(-300);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch {
      // ignore storage quota errors
    }
  }

  private persistOfflineDiagnostics(): void {
    try {
      const slice = this.offlineDiagnostics.slice(-250);
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(slice));
    } catch {
      // ignore storage quota errors
    }
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

    this.persistOfflineDiagnostics();

    this.log({
      source: 'client',
      stage: 'network',
      level: entry.level || 'error',
      message: entry.message || `Offline backend issue: ${entry.uiAction}`,
      details: {
        uiAction: entry.uiAction,
        route: entry.route,
        method: entry.method,
        backendUrl: entry.backendUrl,
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

  /**
   * Core logging function
   */
  public log(entry: Omit<AppLogEntry, 'id' | 'timestamp' | 'isoDate'>): AppLogEntry {
    const now = new Date();
    const fullEntry: AppLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: this.formatTime(now),
      isoDate: now.toISOString(),
    };

    this.logs.push(fullEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.persistLogs();

    this.subscribers.forEach((sub) => {
      try {
        sub(fullEntry, this.logs);
      } catch (err) {
        console.error('Error in log subscriber:', err);
      }
    });

    return fullEntry;
  }

  // Convenience methods by stage and level
  public info(stage: LogStage, message: string, details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage, level: 'info', message, details, durationMs });
  }

  public success(stage: LogStage, message: string, details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage, level: 'success', message, details, durationMs });
  }

  public warn(stage: LogStage, message: string, details?: any): AppLogEntry {
    return this.log({ source: 'client', stage, level: 'warn', message, details });
  }

  public error(stage: LogStage, message: string, details?: any): AppLogEntry {
    return this.log({ source: 'client', stage, level: 'error', message, details });
  }

  public debug(stage: LogStage, message: string, details?: any): AppLogEntry {
    return this.log({ source: 'client', stage, level: 'debug', message, details });
  }

  // Stage shortcuts
  public network(message: string, level: LogLevel = 'info', details?: any, durationMs?: number): AppLogEntry {
    return this.log({ source: 'client', stage: 'network', level, message, details, durationMs });
  }

  public ingestion(message: string, level: LogLevel = 'info', details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'ingestion', level, message, details });
  }

  public tasks(message: string, level: LogLevel = 'info', details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'tasks', level, message, details });
  }

  public charts(message: string, level: LogLevel = 'info', details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'charts', level, message, details });
  }

  public developer(message: string, level: LogLevel = 'info', details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'developer', level, message, details });
  }

  public system(message: string, level: LogLevel = 'info', details?: any): AppLogEntry {
    return this.log({ source: 'client', stage: 'system', level, message, details });
  }

  /**
   * Log ingested from backend FastAPI server
   */
  public backendLog(
    message: string,
    level: LogLevel = 'info',
    stage: LogStage = 'backend',
    details?: any,
    serverTimestamp?: string
  ): AppLogEntry {
    return this.log({
      source: 'backend',
      stage,
      level,
      message,
      details: details ? { ...details, serverTimestamp } : { serverTimestamp },
    });
  }

  /**
   * Subscribe to new log messages in real-time
   */
  public subscribe(subscriber: LogSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Retrieve all recorded logs
   */
  public getLogs(): AppLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all recorded logs
   */
  public clear(): void {
    this.logs = [];
    this.offlineDiagnostics = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.system('Log buffer cleared by user');
  }

  /**
   * Fetch backend logs from FastAPI server
   */
  public async fetchBackendLogs(apiClient: any): Promise<{ count: number; error?: string }> {
    const startTime = performance.now();
    try {
      this.network('Querying backend server logs (GET /api/dev/logs)...', 'debug');

      const response = await apiClient.get('/dev/logs');
      const duration = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        const rawLogs = Array.isArray(response.data) ? response.data : (response.data.logs || []);
        let count = 0;

        rawLogs.forEach((item: any) => {
          const msg = typeof item === 'string' ? item : item.message || item.text || JSON.stringify(item);
          const lvl = (item.level as LogLevel) || 'info';
          const stg = (item.stage as LogStage) || 'backend';
          this.backendLog(msg, lvl, stg, item.details || item.metadata, item.timestamp);
          count++;
        });

        this.network(`Fetched ${count} backend logs from FastAPI in ${duration}ms`, 'success', { count, duration });
        return { count };
      } else {
        const errMsg = response.error || `HTTP ${response.statusCode} from backend`;
        this.network(`Backend log query notice: ${errMsg}`, 'warn', {
          statusCode: response.statusCode,
          error: response.error,
          hint: 'Ensure FastAPI daemon is running with endpoint GET /api/dev/logs',
        });
        this.recordOfflineDiagnostic({
          uiAction: 'fetch_backend_logs',
          route: '/dev/logs',
          method: 'GET',
          statusCode: response.statusCode,
          level: 'warn',
          message: 'Backend log fetch failed while offline or unavailable',
          error: errMsg,
          fallbackAction: 'Developer console remains in local-only mode',
        });
        return { count: 0, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Connection failed';
      this.network(`Failed to query backend logs: ${errMsg}`, 'error', {
        error: errMsg,
        hint: 'Verify backend host and port in Developer Suite',
      });
      this.recordOfflineDiagnostic({
        uiAction: 'fetch_backend_logs',
        route: '/dev/logs',
        method: 'GET',
        statusCode: 0,
        level: 'error',
        message: 'Attempt to query backend logs failed',
        error: errMsg,
        fallbackAction: 'No backend log polling available in offline mode',
      });
      return { count: 0, error: errMsg };
    }
  }

  /**
   * Export logs as formatted JSON string
   */
  public exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as plain text formatted for diagnostics
   */
  public exportText(): string {
    return this.logs
      .map((l) => {
        const dur = l.durationMs !== undefined ? ` (${l.durationMs}ms)` : '';
        const det = l.details ? ` | DETAILS: ${JSON.stringify(l.details)}` : '';
        return `[${l.timestamp}] [${l.source.toUpperCase()}] [${l.stage.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}${dur}${det}`;
      })
      .join('\n');
  }
}

export const logger = new DiagnosticLogger();
