/**
 * Core Backend API Client
 *
 * Implements client calls matching API_REFERENCE_75150e21.md Section 3 & 5.
 * Uses centralized config and route endpoints.
 */

import { getApiUrl } from './config';
import { ENDPOINTS } from './endpoints';
import { logger } from '../services/logger';

export interface HealthResponse {
  status: string;
  service?: string;
  message?: string;
  api_prefix?: string;
  backend_state?: {
    status?: string;
    last_action?: string;
    updated_at?: string;
  };
}

export interface HealthCheckResult {
  online: boolean;
  latencyMs: number;
  data?: HealthResponse;
  error?: string;
  checkedAt: string;
  url: string;
}

export const checkBackendHealth = async (timeoutMs = 4000): Promise<HealthCheckResult> => {
  const url = getApiUrl(ENDPOINTS.HEALTH);
  const start = performance.now();
  const checkedAt = new Date().toLocaleTimeString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errText = `HTTP ${response.status} ${response.statusText}`;
      logger.network(`Backend health check failed: ${errText}`, 'warn', {
        url,
        statusCode: response.status,
        durationMs: latencyMs,
      }, latencyMs);

      logger.recordOfflineDiagnostic({
        uiAction: 'Backend Health Ping',
        route: url,
        method: 'GET',
        statusCode: response.status,
        statusText: response.statusText,
        level: 'warn',
        message: `Backend returned HTTP status ${response.status}`,
        error: errText,
      });

      return {
        online: false,
        latencyMs,
        error: errText,
        checkedAt,
        url,
      };
    }

    const data: HealthResponse = await response.json().catch(() => ({ status: 'healthy' }));
    logger.network(`Backend Core API is ONLINE (${latencyMs}ms)`, 'success', {
      url,
      data,
      durationMs: latencyMs,
    }, latencyMs);

    return {
      online: true,
      latencyMs,
      data,
      checkedAt,
      url,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const isAbort = err.name === 'AbortError';
    const errorMsg = isAbort ? `Connection timed out after ${timeoutMs}ms` : (err.message || 'Network unreachable');

    logger.network(`Backend ping failed: ${errorMsg}`, 'warn', {
      url,
      error: errorMsg,
      durationMs: latencyMs,
    }, latencyMs);

    logger.recordOfflineDiagnostic({
      uiAction: 'Backend Health Ping',
      route: url,
      method: 'GET',
      level: 'warn',
      message: 'Backend Core API service unreachable',
      error: errorMsg,
      notes: 'Make sure FastAPI backend is running on configured host and port',
    });

    return {
      online: false,
      latencyMs,
      error: errorMsg,
      checkedAt,
      url,
    };
  }
};
