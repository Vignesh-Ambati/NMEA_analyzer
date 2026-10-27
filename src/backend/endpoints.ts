/**
 * Backend API Route Registry
 *
 * Sourced directly from API_REFERENCE_75150e21.md (Section 2 & 4).
 */

export const ENDPOINTS = {
  HEALTH: '/health',
  DEV_LOGS: '/dev/logs',
  DEV_AUTH: '/dev/auth',
  DEV_SETTINGS: '/dev/settings',
  DEV_ENGINE_PARAMS: '/dev/engine-params',
  PARSE_NMEA: '/nmea/parse',
  UPLOAD_LOG: '/nmea/upload',
  EXTRACTION_COPY: '/extraction/bulk-line-copy',
  TASK_STATUS: (taskId: string | number) => `/tasks/${taskId}`,
} as const;

export const ROUTE_HEALTH = ENDPOINTS.HEALTH;
export const ROUTE_DEV_LOGS = ENDPOINTS.DEV_LOGS;
export const ROUTE_DEV_AUTH = ENDPOINTS.DEV_AUTH;
export const ROUTE_DEV_SETTINGS = ENDPOINTS.DEV_SETTINGS;
export const ROUTE_DEV_ENGINE_PARAMS = ENDPOINTS.DEV_ENGINE_PARAMS;
export const ROUTE_NMEA_PARSE = ENDPOINTS.PARSE_NMEA;
export const ROUTE_NMEA_UPLOAD = ENDPOINTS.UPLOAD_LOG;
export const ROUTE_EXTRACTION_COPY = ENDPOINTS.EXTRACTION_COPY;
export const ROUTE_EXTRACTION_STATUS = ENDPOINTS.TASK_STATUS;
