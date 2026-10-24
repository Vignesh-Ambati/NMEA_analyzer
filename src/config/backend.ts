/**
 * Centralized Backend Server & Network Configuration
 * 
 * Provides a single source of truth for backend host, port, protocol,
 * API paths, and WebSocket endpoints. No file needs to hardcode addresses or ports.
 */

export interface BackendConfig {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  apiPrefix: string;
  wsProtocol: 'ws' | 'wss';
  timeoutMs: number;
}

const STORAGE_KEY = 'nmea_centralized_backend_config';

/**
 * Resolve default configuration using environment variables or local Vite defaults.
 */
const getDefaultConfig = (): BackendConfig => {
  const metaEnv = ((import.meta as any).env || {}) as Record<string, string | undefined>;
  const envProtocol = (metaEnv.VITE_BACKEND_PROTOCOL || '').toLowerCase();
  const envHost = metaEnv.VITE_BACKEND_HOST;
  const envPort = metaEnv.VITE_BACKEND_PORT || '8000';
  const envApiPrefix = metaEnv.VITE_API_BASE_URL || '/api';
  const envWsProtocol = (metaEnv.VITE_WS_PROTOCOL || '').toLowerCase();

  const isBrowser = typeof window !== 'undefined';
  const defaultProtocol = envProtocol === 'https' ? 'https' : (isBrowser && window.location.protocol === 'https:' ? 'https' : 'http');
  const defaultHost = envHost || (isBrowser ? window.location.hostname : '127.0.0.1');
  const defaultWsProtocol = envWsProtocol === 'wss' ? 'wss' : (defaultProtocol === 'https' ? 'wss' : 'ws');

  return {
    protocol: defaultProtocol,
    host: defaultHost || '127.0.0.1',
    port: envPort,
    apiPrefix: envApiPrefix,
    wsProtocol: defaultWsProtocol,
    timeoutMs: 15000,
  };
};

/**
 * Load persisted custom backend settings or fall back to defaults
 */
export const loadBackendConfig = (): BackendConfig => {
  const defaults = getDefaultConfig();
  if (typeof window === 'undefined') return defaults;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  return defaults;
};

// Current active in-memory configuration
let currentConfig: BackendConfig = loadBackendConfig();

// Listeners for runtime configuration changes
type ConfigListener = (config: BackendConfig) => void;
const listeners = new Set<ConfigListener>();

export const subscribeBackendConfig = (listener: ConfigListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Save updated backend configuration (persists to localStorage and notifies listeners)
 */
export const updateBackendConfig = (patch: Partial<BackendConfig>): BackendConfig => {
  currentConfig = {
    ...currentConfig,
    ...patch,
  };

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
    }
  } catch {
    // ignore storage errors
  }

  listeners.forEach((fn) => fn(currentConfig));
  return currentConfig;
};

/**
 * Reset backend configuration back to environment defaults
 */
export const resetBackendConfig = (): BackendConfig => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  currentConfig = getDefaultConfig();
  listeners.forEach((fn) => fn(currentConfig));
  return currentConfig;
};

/**
 * Get current configuration
 */
export const getBackendConfig = (): BackendConfig => ({ ...currentConfig });

/**
 * Get current backend host (e.g. "localhost" or "192.168.1.100")
 */
export const getBackendHost = (): string => currentConfig.host;

/**
 * Get current backend port (e.g. "3000" or "8000")
 */
export const getBackendPort = (): string => currentConfig.port;

/**
 * Get current backend protocol ("http" | "https")
 */
export const getBackendProtocol = (): string => currentConfig.protocol;

/**
 * Get fully-qualified root address (e.g. "http://localhost:3000")
 */
export const getBackendAddress = (): string => {
  const { protocol, host, port } = currentConfig;
  const isStandardPort = (protocol === 'http' && port === '80') || (protocol === 'https' && port === '443') || !port;
  return isStandardPort ? `${protocol}://${host}` : `${protocol}://${host}:${port}`;
};

/**
 * Get base URL for REST API (e.g. "http://localhost:3000/api")
 */
export const getApiBaseUrl = (): string => {
  const root = getBackendAddress();
  const prefix = currentConfig.apiPrefix.startsWith('/') ? currentConfig.apiPrefix : `/${currentConfig.apiPrefix}`;
  return `${root}${prefix}`;
};

/**
 * Build a fully qualified API endpoint URL
 * @example getApiUrl('/nmea/upload') => "http://localhost:3000/api/nmea/upload"
 */
export const getApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};

/**
 * Build a fully qualified WebSocket URL for streaming telemetry
 * @example getWebSocketUrl('/stream') => "ws://localhost:3000/api/stream"
 */
export const getWebSocketUrl = (path: string = '/stream'): string => {
  const { wsProtocol, host, port } = currentConfig;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isStandardPort = (wsProtocol === 'ws' && port === '80') || (wsProtocol === 'wss' && port === '443') || !port;
  const hostPart = isStandardPort ? host : `${host}:${port}`;
  return `${wsProtocol}://${hostPart}${currentConfig.apiPrefix}${cleanPath}`;
};

/**
 * Centralized Endpoints Dictionary
 */
export const ENDPOINTS = {
  HEALTH: '/health',
  STATUS: '/status',
  CONFIG: '/config',
  PARSE_NMEA: '/nmea/parse',
  UPLOAD_LOG: '/nmea/upload',
  TASKS: '/nmea/tasks',
  SATELLITES: '/nmea/satellites',
  STREAM_TELEMETRY: '/stream',
} as const;
