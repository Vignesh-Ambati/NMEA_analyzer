/**
 * Backend Runtime Configuration
 *
 * Reads backend host, port, protocol, prefix, and ping interval from environment variables
 * and provides dynamic resolution so protocol changes (http <-> https) always propagate reliably.
 * Reference: API_REFERENCE_75150e21.md Section 1 & 4
 */

export const getBackendProtocol = (): string => {
  const env = import.meta.env.VITE_BACKEND_PROTOCOL;
  if (env && typeof env === "string") {
    return env.trim().toLowerCase();
  }
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.protocol
  ) {
    return window.location.protocol.replace(":", "");
  }
  return "https";
};

export const getBackendHost = (): string => {
  const env = import.meta.env.VITE_BACKEND_HOST;
  if (env && typeof env === "string") {
    return env.trim();
  }
  return "127.0.0.1";
};

export const getBackendPort = (): string => {
  const env = import.meta.env.VITE_BACKEND_PORT;
  if (env !== undefined && env !== null && String(env).trim() !== "") {
    return String(env).trim();
  }
  return "8000";
};

export const getApiPrefix = (): string => {
  const env = import.meta.env.VITE_API_PREFIX;
  if (env && typeof env === "string") {
    return env.trim();
  }
  return "/api";
};

export const getBackendBaseUrl = (): string => {
  const protocol = getBackendProtocol();
  const explicitUrl = import.meta.env.VITE_BACKEND_URL;
  if (
    explicitUrl &&
    typeof explicitUrl === "string" &&
    explicitUrl.trim() !== ""
  ) {
    let clean = explicitUrl.trim().replace(/\/+$/, "");
    // If VITE_BACKEND_PROTOCOL is explicitly defined, enforce that protocol on the URL
    if (import.meta.env.VITE_BACKEND_PROTOCOL) {
      clean = clean.replace(/^[a-zA-Z]+:\/\//, `${protocol}://`);
    }
    return clean;
  }

  const host = getBackendHost();
  const port = getBackendPort();
  return `${protocol}://${host}${port ? `:${port}` : ""}`;
};

export const getApiBaseUrl = (): string => {
  const base = getBackendBaseUrl();
  const prefix = getApiPrefix().replace(/^\/*/, "/").replace(/\/+$/, "");
  return `${base}${prefix}`;
};

export const getApiUrl = (endpoint: string): string => {
  const apiBase = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${apiBase}${cleanEndpoint}`;
};

export const getBackendPingIntervalMs = (): number => {
  const envVal = import.meta.env.VITE_BACKEND_PING_INTERVAL_MS;
  const parsed = envVal ? parseInt(String(envVal), 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 30 * 60 * 1000; // 30 minutes default
};
