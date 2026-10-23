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

export type LogSubscriber = (entry: AppLogEntry, allLogs: AppLogEntry[]) => void;

const MAX_LOGS = 1000;
const STORAGE_KEY = 'nmea_diagnostic_logs';

class DiagnosticLogger {
  private logs: AppLogEntry[] = [];
  private subscribers: Set<LogSubscriber> = new Set();
  private isAutoPollActive = false;
  private pollIntervalRef: any = null;

  constructor() {
    this.loadPersistedLogs();
    this.system('Diagnostic Logger initialized and ready');
  }

  private formatTime(date: Date = new Date()): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  private loadPersistedLogs(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_LOGS);
        }
      }
    } catch {
      this.logs = [];
    }
  }

  private persistLogs(): void {
    try {
      // Save last 300 logs to prevent exceeding localStorage quotas
      const slice = this.logs.slice(-300);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch {
      // ignore storage quota errors
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

    // Notify subscribers
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
    try {
      localStorage.removeItem(STORAGE_KEY);
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
        return { count: 0, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Connection failed';
      this.network(`Failed to query backend logs: ${errMsg}`, 'error', {
        error: errMsg,
        hint: 'Verify backend host and port in Developer Suite',
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
