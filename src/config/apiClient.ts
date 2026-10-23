/**
 * Centralized API & Networking Client
 * 
 * Interacts with backend servers using centralized host, port, and endpoints.
 * Provides typed methods for REST and health checks without hardcoding URLs.
 */

import { getApiUrl, getBackendAddress, ENDPOINTS, getBackendConfig } from './backend';
import { logger } from '../services/logger';

export interface HealthCheckResult {
  reachable: boolean;
  status: 'online' | 'offline' | 'unreachable';
  statusCode?: number;
  latencyMs: number;
  url: string;
  timestamp: string;
  serverInfo?: {
    version?: string;
    mode?: string;
    uptime?: number;
  };
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

class CentralizedApiClient {
  /**
   * Universal GET request builder
   */
  async get<T = any>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const urlStr = getApiUrl(endpoint);
    const url = new URL(urlStr);
    const startTime = performance.now();

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    logger.network(`HTTP GET ${endpoint}`, 'debug', {
      url: url.toString(),
      params,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getBackendConfig().timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const durationMs = Math.round(performance.now() - startTime);

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        logger.network(`HTTP GET ${endpoint} -> ${response.status}`, 'info', {
          statusCode: response.status,
          durationMs,
        }, durationMs);
      } else {
        logger.network(`HTTP GET ${endpoint} -> ${response.status}`, 'warn', {
          statusCode: response.status,
          statusText: response.statusText,
          durationMs,
        }, durationMs);
      }

      return {
        success: response.ok,
        data,
        statusCode: response.status,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const durationMs = Math.round(performance.now() - startTime);
      const errMsg = err?.message || 'Network request failed';
      logger.network(`HTTP GET ${endpoint} failed: ${errMsg}`, 'error', {
        error: errMsg,
        durationMs,
      }, durationMs);

      return {
        success: false,
        error: errMsg,
        statusCode: 0,
      };
    }
  }

  /**
   * Universal POST request builder
   */
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getBackendConfig().timeoutMs);

    logger.network(`HTTP POST ${endpoint}`, 'debug', {
      url,
      payload: body,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const durationMs = Math.round(performance.now() - startTime);

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        logger.network(`HTTP POST ${endpoint} -> ${response.status}`, 'info', {
          statusCode: response.status,
          durationMs,
        }, durationMs);
      } else {
        logger.network(`HTTP POST ${endpoint} -> ${response.status}`, 'warn', {
          statusCode: response.status,
          statusText: response.statusText,
          durationMs,
        }, durationMs);
      }

      return {
        success: response.ok,
        data,
        statusCode: response.status,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const durationMs = Math.round(performance.now() - startTime);
      const errMsg = err?.message || 'Network request failed';
      logger.network(`HTTP POST ${endpoint} failed: ${errMsg}`, 'error', {
        error: errMsg,
        durationMs,
      }, durationMs);

      return {
        success: false,
        error: errMsg,
        statusCode: 0,
      };
    }
  }

  /**
   * Check connection health of centralized backend
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const rootUrl = getBackendAddress();
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      // First try /health or /api/health
      const healthUrl = `${rootUrl}${ENDPOINTS.HEALTH}`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      let serverInfo: any = undefined;
      try {
        serverInfo = await response.json();
      } catch {
        // ok if plain text
      }

      const res: HealthCheckResult = {
        reachable: response.ok,
        status: response.ok ? 'online' : 'unreachable',
        statusCode: response.status,
        latencyMs,
        url: healthUrl,
        timestamp,
        serverInfo,
      };

      if (response.ok) {
        logger.network(`Backend health check OK (${latencyMs}ms)`, 'success', {
          latencyMs,
          url: healthUrl,
          serverInfo,
        }, latencyMs);
      } else {
        logger.network(`Backend health check returned HTTP ${response.status}`, 'warn', {
          statusCode: response.status,
          latencyMs,
          url: healthUrl,
        }, latencyMs);
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);
      const errMsg = err?.name === 'AbortError' ? 'Connection timed out (4s)' : (err?.message || 'Host connection refused');

      logger.network(`Backend health ping: unreachable (${errMsg})`, 'debug', {
        error: errMsg,
        latencyMs,
        target: `${rootUrl}${ENDPOINTS.HEALTH}`,
      }, latencyMs);

      return {
        reachable: false,
        status: 'unreachable',
        latencyMs,
        url: `${rootUrl}${ENDPOINTS.HEALTH}`,
        timestamp,
        error: errMsg,
      };
    }
  }
}

export const apiClient = new CentralizedApiClient();
