/**
 * Backend Runtime Configuration
 *
 * Reads backend host, port, protocol, prefix, and ping interval from external environment variables.
 * Reference: API_REFERENCE_75150e21.md Section 1 & 4
 */

export const getBackendProtocol = (): string =>
  import.meta.env.VITE_BACKEND_PROTOCOL || (typeof window !== 'undefined' && window.location.protocol.replace(':', '')) || 'http';

export const getBackendHost = (): string =>
  import.meta.env.VITE_BACKEND_HOST || '127.0.0.1';

export const getBackendPort = (): string =>
  import.meta.env.VITE_BACKEND_PORT || '8000';

export const getApiPrefix = (): string =>
  import.meta.env.VITE_API_PREFIX || '/api';

export const getBackendBaseUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  const protocol = getBackendProtocol();
  const host = getBackendHost();
  const port = getBackendPort();
  return `${protocol}://${host}${port ? `:${port}` : ''}`;
};

export const getApiBaseUrl = (): string => {
  const base = getBackendBaseUrl();
  const prefix = getApiPrefix().replace(/^\/*/, '/').replace(/\/+$/, '');
  return `${base}${prefix}`;
};

export const getApiUrl = (endpoint: string): string => {
  const apiBase = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${apiBase}${cleanEndpoint}`;
};

export const getBackendPingIntervalMs = (): number => {
  const envVal = import.meta.env.VITE_BACKEND_PING_INTERVAL_MS;
  const parsed = envVal ? parseInt(envVal, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 30 * 60 * 1000; // 30 minutes default
};
