/**
 * Dedicated Backend Integration Service
 * 
 * Provides zero-friction integration methods for sending NMEA logs,
 * streaming receiver telemetry, and querying backend-computed metrics.
 * Operates purely on real data; never simulates data.
 */

import { apiClient, HealthCheckResult, ApiResponse } from '../../config/apiClient';
import { getBackendAddress, getBackendPort, getApiUrl, getWebSocketUrl, ENDPOINTS } from '../../config/backend';
import { encryptedStorage } from '../security/encryptedStorage';
import { logger } from '../logger';

export interface BackendUploadResult {
  success: boolean;
  fileId?: string;
  totalSentences?: number;
  epochsCount?: number;
  message?: string;
  error?: string;
}

export interface BackendParseResult {
  success: boolean;
  sentencesCount?: number;
  epochs?: any[];
  error?: string;
}

export interface EngineParams {
  batchSize: number;
  retentionWindow: number;
  workerCount: number;
  debugMode: boolean;
}

class BackendIntegrationService {
  /**
   * Health ping to check if backend server is listening on active host and port
   */
  async checkHealth(): Promise<HealthCheckResult> {
    return apiClient.checkHealth();
  }

  /**
   * Authenticate developer password against backend FastAPI server
   * Supports demo access fallback for testing
   */
  async verifyDevPassword(password: string): Promise<{ success: boolean; isDemo?: boolean; message?: string }> {
    const trimmed = password.trim();
    logger.developer('Developer verification request initiated', 'debug');

    try {
      // 1. Try real backend FastAPI endpoint
      const response = await apiClient.post('/dev/auth', { password: trimmed });
      if (response.success && response.data?.authenticated) {
        logger.developer('Developer authenticated by backend FastAPI', 'success', {
          serverMessage: response.data?.message,
        });
        return { success: true, message: response.data?.message || 'Authenticated by backend' };
      }
    } catch {
      // Backend offline / standalone
    }

    // 2. Demo testing access fallback
    const savedPin = encryptedStorage.getItem<string>('dev_pin', '7788');
    if (trimmed === savedPin || trimmed === '7788' || trimmed === 'admin' || trimmed === 'demo') {
      const mode = trimmed === '7788' || trimmed === 'admin' ? 'Demo access granted' : 'Encrypted vault access verified';
      logger.developer(`Developer authenticated via ${mode}`, 'info', { isDemo: true });
      return {
        success: true,
        isDemo: true,
        message: mode,
      };
    }

    logger.developer('Developer authentication rejected: invalid password or PIN', 'warn');
    return {
      success: false,
      message: 'Invalid password. (Use demo PIN 7788 or verify against your backend)'
    };
  }

  /**
   * Fetch relative developer settings from backend or encrypted storage
   */
  async fetchDevSettings(): Promise<any> {
    try {
      const res = await apiClient.get('/dev/settings');
      if (res.success && res.data) {
        encryptedStorage.setItem('dev_settings', res.data);
        return res.data;
      }
    } catch {
      // offline
    }
    return encryptedStorage.getItem('dev_settings', null);
  }

  /**
   * Save relative developer settings to backend or encrypted storage
   */
  async saveDevSettings(settings: any): Promise<boolean> {
    encryptedStorage.setItem('dev_settings', settings);
    try {
      const res = await apiClient.post('/dev/settings', settings);
      return res.success;
    } catch {
      return false;
    }
  }

  /**
   * Submit and update engine ingestion & tuning parameters to backend FastAPI
   */
  async submitEngineParameters(params: EngineParams): Promise<{ success: boolean; message: string }> {
    encryptedStorage.setItem('engine_params', params);
    logger.developer(`Submitting engine parameters to FastAPI (BATCH=${params.batchSize}, RETENTION=${params.retentionWindow}s, WORKERS=${params.workerCount}x)`, 'info', params);

    try {
      const res = await apiClient.post('/dev/engine-params', {
        batch_size: params.batchSize,
        retention_window: params.retentionWindow,
        concurrent_workers: params.workerCount,
        debug_mode: params.debugMode,
        timestamp: new Date().toISOString()
      });

      if (res.success) {
        const msg = res.data?.message || 'Engine parameters applied to backend FastAPI';
        logger.developer(`Engine tuning applied on backend: ${msg}`, 'success', res.data);
        return {
          success: true,
          message: msg,
        };
      }
    } catch {
      // Backend offline
    }

    const fallbackMsg = 'Engine parameters saved to encrypted local vault (Backend currently offline)';
    logger.developer(`Backend offline: ${fallbackMsg}`, 'warn');
    return {
      success: true,
      message: fallbackMsg,
    };
  }

  /**
   * Upload an authentic NMEA/UBX file directly to the backend
   * Uses multipart/form-data POST to /api/nmea/upload
   */
  async uploadFile(file: File | Blob, filename: string): Promise<BackendUploadResult> {
    const url = getApiUrl(ENDPOINTS.UPLOAD_LOG);
    const formData = new FormData();
    formData.append('file', file, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `Backend returned HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const json = await response.json();
      return {
        success: true,
        fileId: json.fileId || json.id,
        totalSentences: json.totalSentences || json.sentencesCount,
        epochsCount: json.epochsCount || json.epochs?.length,
        message: json.message || 'File parsed successfully on backend',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      return {
        success: false,
        error: err?.message || `Failed to connect to backend at ${getBackendAddress()}`,
      };
    }
  }

  /**
   * Send raw NMEA text content to backend parse endpoint
   * POST to /api/nmea/parse
   */
  async parseRawNmea(rawContent: string, filename?: string): Promise<BackendParseResult> {
    const response = await apiClient.post(ENDPOINTS.PARSE_NMEA, {
      content: rawContent,
      filename: filename || 'raw_stream.log',
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Backend parsing request failed',
      };
    }

    return {
      success: true,
      sentencesCount: response.data?.totalSentences,
      epochs: response.data?.epochs,
    };
  }

  /**
   * Retrieve task analysis data from backend if server-side processing is used
   */
  async fetchTaskMetrics(taskId: number, fileId?: string): Promise<ApiResponse> {
    const endpoint = `${ENDPOINTS.TASKS}/${taskId}`;
    return apiClient.get(endpoint, fileId ? { fileId } : undefined);
  }

  /**
   * Establish live real-time WebSocket connection to backend receiver stream
   */
  connectTelemetryStream(
    onSentence: (rawSentence: string) => void,
    onStatusChange?: (status: 'connecting' | 'open' | 'closed' | 'error') => void
  ): { disconnect: () => void } {
    const wsUrl = getWebSocketUrl(ENDPOINTS.STREAM_TELEMETRY);
    let socket: WebSocket | null = null;
    let isClosedExplicitly = false;

    try {
      onStatusChange?.('connecting');
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        onStatusChange?.('open');
      };

      socket.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data.trim()) {
          onSentence(event.data.trim());
        }
      };

      socket.onerror = () => {
        onStatusChange?.('error');
      };

      socket.onclose = () => {
        if (!isClosedExplicitly) {
          onStatusChange?.('closed');
        }
      };
    } catch {
      onStatusChange?.('error');
    }

    return {
      disconnect: () => {
        isClosedExplicitly = true;
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
      },
    };
  }
}

export const backendService = new BackendIntegrationService();
