/**
 * Core Backend API Client & Services
 *
 * Implements client calls matching API_REFERENCE_75150e21.md Section 3 & 5
 * and Developer Authentication via POST /api/dev/auth.
 */

import { getApiUrl } from "./config";
import { ENDPOINTS } from "./endpoints";
import { logger } from "../services/logger";

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

export interface DevAuthResponse {
  authenticated: boolean;
  message?: string;
  detail?: string;
  error?: string;
  status?: string;
  user?: string;
}
export interface VerifyDevPasswordResult {
  success: boolean;
  authenticated: boolean;
  message: string;
  statusCode?: number;
  isOffline?: boolean;
}
/**
 * Health check ping to GET /api/health
 */
export const checkBackendHealth = async (
  timeoutMs = 4000,
): Promise<HealthCheckResult> => {
  const url = getApiUrl(ENDPOINTS.HEALTH);
  const start = performance.now();
  const checkedAt = new Date().toLocaleTimeString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errText = `HTTP ${response.status} ${response.statusText}`;
      logger.network(
        `Backend health check failed: ${errText}`,
        "warn",
        {
          url,
          statusCode: response.status,
          durationMs: latencyMs,
        },
        latencyMs,
      );

      logger.recordOfflineDiagnostic({
        uiAction: "Backend Health Ping",
        route: url,
        method: "GET",
        statusCode: response.status,
        statusText: response.statusText,
        level: "warn",
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

    const data: HealthResponse = await response
      .json()
      .catch(() => ({ status: "healthy" }));
    logger.network(
      `Backend Core API is ONLINE (${latencyMs}ms)`,
      "success",
      {
        url,
        data,
        durationMs: latencyMs,
      },
      latencyMs,
    );

    return {
      online: true,
      latencyMs,
      data,
      checkedAt,
      url,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const isAbort = err.name === "AbortError";
    const errorMsg = isAbort
      ? `Connection timed out after ${timeoutMs}ms`
      : err.message || "Network unreachable";

    logger.network(
      `Backend ping failed: ${errorMsg}`,
      "warn",
      {
        url,
        error: errorMsg,
        durationMs: latencyMs,
      },
      latencyMs,
    );

    logger.recordOfflineDiagnostic({
      uiAction: "Backend Health Ping",
      route: url,
      method: "GET",
      level: "warn",
      message: "Backend Core API service unreachable",
      error: errorMsg,
      notes: "Make sure FastAPI backend is running on configured host and port",
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
/**
 * Verify developer credentials with the backend:
 * Issues POST /api/dev/auth with scrypt hashing verification against SQLite database.
 */
export const verifyDevPassword = async (
  password: string,
  timeoutMs = 5000,
): Promise<VerifyDevPasswordResult> => {
  const url = getApiUrl(ENDPOINTS.DEV_AUTH);
  const start = performance.now();
  logger.network(
    `Initiating developer authentication request to ${url}`,
    "info",
    {
      route: url,
      method: "POST",
    },
  );
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        password,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    if (response.ok) {
      const data: DevAuthResponse = await response
        .json()
        .catch(() => ({ authenticated: true }));
      const isAuthenticated =
        data.authenticated === true || data.status === "ok";
      if (isAuthenticated) {
        const successMsg =
          data.message || "Developer authenticated successfully.";
        logger.developer(
          `Developer authentication succeeded against backend (${latencyMs}ms)`,
          "success",
          {
            url,
            latencyMs,
            message: successMsg,
          },
          latencyMs,
        );
        return {
          success: true,
          authenticated: true,
          message: successMsg,
          statusCode: response.status,
        };
      } else {
        const rejectMsg =
          data.detail ||
          data.message ||
          data.error ||
          "Developer authentication rejected.";
        logger.developer(
          `Developer authentication rejected: ${rejectMsg}`,
          "warn",
          {
            url,
            statusCode: response.status,
            latencyMs,
          },
          latencyMs,
        );
        return {
          success: false,
          authenticated: false,
          message: rejectMsg,
          statusCode: response.status,
        };
      }
    }
    // Handle 401 Unauthorized or other HTTP error responses
    const errorBody: any = await response.json().catch(() => ({}));
    const errorDetail =
      errorBody.detail ||
      errorBody.message ||
      errorBody.error ||
      (response.status === 401
        ? "Invalid developer credentials. Please check your password."
        : `Authentication failed (HTTP ${response.status}: ${response.statusText})`);
    logger.developer(
      `Developer authentication rejected (HTTP ${response.status}): ${errorDetail}`,
      "warn",
      {
        url,
        statusCode: response.status,
        durationMs: latencyMs,
      },
      latencyMs,
    );
    return {
      success: false,
      authenticated: false,
      message: errorDetail,
      statusCode: response.status,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const isAbort = err.name === "AbortError";
    const offlineMessage = isAbort
      ? `Connection timed out after ${timeoutMs}ms. Backend server at ${url} did not respond.`
      : `Backend service is offline or unreachable`;
    logger.developer(
      `Developer authentication offline error: ${offlineMessage}`,
      "warn",
      {
        url,
        error: err.message,
        durationMs: latencyMs,
      },
      latencyMs,
    );
    logger.recordOfflineDiagnostic({
      uiAction: "Developer Authentication",
      route: url,
      method: "POST",
      level: "warn",
      message: "Developer auth offline fallback: backend service unreachable",
      error: err.message || "Network unreachable",
      notes:
        "Make sure FastAPI backend with SQLite auth is running at POST /api/dev/auth",
    });
    return {
      success: false,
      authenticated: false,
      message: offlineMessage,
      isOffline: true,
    };
  }
};
/**
 * Unified Backend Service client
 */
export const backendService = {
  checkHealth: checkBackendHealth,
  verifyDevPassword,
};
