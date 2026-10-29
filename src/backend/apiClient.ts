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
const extractErrorMessage = (payload: any, fallback: string): string => {
  if (!payload || typeof payload === "string") {
    return payload || fallback;
  }

  if (typeof payload === "object") {
    if (typeof payload.detail === "string") {
      return payload.detail;
    }

    if (typeof payload.detail === "object" && payload.detail !== null) {
      const nestedMessage =
        payload.detail.detail || payload.detail.message || payload.detail.error;
      if (typeof nestedMessage === "string") {
        return nestedMessage;
      }
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }
  }

  return fallback;
};

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
        const rejectMsg = extractErrorMessage(
          data,
          "Developer authentication rejected.",
        );
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
    const errorDetail = extractErrorMessage(
      errorBody,
      response.status === 401
        ? "Invalid developer credentials. Please check your password."
        : `Authentication failed (HTTP ${response.status}: ${response.statusText})`,
    );
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
 * Fetch engine parameters from backend (GET /api/dev/engine-params)
 */
export const fetchEngineParams = async (
  timeoutMs = 5000,
): Promise<{
  success: boolean;
  data?: import("./types").EngineTuningParams;
  message?: string;
  error?: string;
}> => {
  const url = getApiUrl(ENDPOINTS.DEV_ENGINE_PARAMS);
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      const data: any = await response.json();
      const params = {
        batchSize: Number(data.batchSize ?? data.batch_size ?? 500),
        retentionWindow: Number(
          data.retentionWindow ?? data.retention_window ?? 3600,
        ),
        workerCount: Number(data.workerCount ?? data.worker_count ?? 4),
        updatedAt:
          data.updatedAt || data.updated_at || new Date().toISOString(),
      };
      logger.developer(
        `Fetched engine parameters from backend DB (${latencyMs}ms)`,
        "success",
        { url, params },
        latencyMs,
      );
      return { success: true, data: params };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = extractErrorMessage(
      errData,
      `Failed to fetch engine params (HTTP ${response.status})`,
    );
    logger.developer(`Engine params fetch failed: ${errMsg}`, "warn", {
      url,
      statusCode: response.status,
    });
    return { success: false, message: errMsg };
  } catch (err: any) {
    const errMsg =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Backend offline";
    logger.developer(`Engine params fetch error: ${errMsg}`, "warn", {
      url,
      error: errMsg,
    });
    return { success: false, error: errMsg, message: errMsg };
  }
};

/**
 * Commit engine parameters to backend DB (POST /api/dev/engine-params)
 */
export const commitEngineParams = async (
  params: import("./types").EngineTuningParams,
  timeoutMs = 6000,
): Promise<{
  success: boolean;
  message: string;
  params?: import("./types").EngineTuningParams;
}> => {
  const url = getApiUrl(ENDPOINTS.DEV_ENGINE_PARAMS);
  const start = performance.now();
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
        batchSize: params.batchSize,
        batch_size: params.batchSize,
        retentionWindow: params.retentionWindow,
        retention_window: params.retentionWindow,
        workerCount: params.workerCount,
        worker_count: params.workerCount,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const successMsg =
        data.message || "Engine parameters synchronized with backend database.";
      logger.developer(
        `Committed engine params to backend DB (${latencyMs}ms)`,
        "success",
        { url, params },
        latencyMs,
      );
      return { success: true, message: successMsg, params };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = extractErrorMessage(
      errData,
      `Backend rejected engine params (HTTP ${response.status})`,
    );
    logger.developer(`Engine params commit rejected: ${errMsg}`, "error", {
      url,
      statusCode: response.status,
    });
    return { success: false, message: errMsg };
  } catch (err: any) {
    const errMsg =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Backend offline";
    logger.developer(`Engine params commit error: ${errMsg}`, "error", {
      url,
      error: errMsg,
    });
    return {
      success: false,
      message: `Failed to commit to backend: ${errMsg}`,
    };
  }
};

/**
 * Update developer access password in backend DB (POST /api/dev/password)
 * Note: Never logs passwords or sensitive payloads!
 */
export const updateDevPassword = async (
  payload: import("./types").UpdateDevPasswordPayload,
  timeoutMs = 6000,
): Promise<{ success: boolean; message: string }> => {
  const url = getApiUrl(ENDPOINTS.DEV_PASSWORD);
  const start = performance.now();
  logger.network(`Initiating password update request to ${url}`, "info", {
    route: url,
    method: "POST",
  });
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
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        password: payload.newPassword,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const successMsg =
        data.message ||
        "Developer access password successfully updated in backend database.";
      logger.developer(
        `Developer access password updated in backend DB (${latencyMs}ms)`,
        "success",
        { url },
        latencyMs,
      );
      return { success: true, message: successMsg };
    }

    const errData = await response.json().catch(() => ({}));
    const errMsg = extractErrorMessage(
      errData,
      `Password update failed (HTTP ${response.status})`,
    );
    logger.developer(`Developer password update rejected: ${errMsg}`, "warn", {
      url,
      statusCode: response.status,
    });
    return { success: false, message: errMsg };
  } catch (err: any) {
    const errMsg =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Backend offline";
    logger.developer(`Developer password update error: ${errMsg}`, "error", {
      url,
      error: errMsg,
    });
    return { success: false, message: `Backend error: ${errMsg}` };
  }
};

/**
 * Unified Backend Service client
 */
export const backendService = {
  checkHealth: checkBackendHealth,
  verifyDevPassword,
  fetchEngineParams,
  commitEngineParams,
  updateDevPassword,
};
