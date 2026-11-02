/**
 * Classified as shared service because it manages synchronizing global engine tuning parameters between the backend, app state, and storage cache. Placed in /src/services/engineTuningService.ts.
 */

import { fetchEngineParams } from "../backend/apiClient";
import { EngineTuningParams } from "../backend/types";
import { cookieService, COOKIE_KEYS } from "./cookieService";
import { logger } from "./logger";

export interface SyncedEngineTuningResult {
  success: boolean;
  params: EngineTuningParams;
  source: "backend" | "cache" | "default";
  message: string;
}

const DEFAULT_PARAMS: EngineTuningParams = {
  batchSize: 50000, // Number of lines per chunk (e.g., 50k to 10M lines)
  retentionWindow: 30, // Data and log retention window in days
  workerCount: 4, // Multiprocessing backend worker processes
};

/**
 * Reads cached engine parameters from persistent cookies / localStorage cache.
 */
export const getCachedEngineParams = (): EngineTuningParams => {
  try {
    const rawBatch = cookieService.get(COOKIE_KEYS.BATCH_SIZE);
    const rawRetention = cookieService.get(COOKIE_KEYS.RETENTION_WINDOW);
    const rawWorkers = cookieService.get(COOKIE_KEYS.WORKER_COUNT);

    let parsedBatch = rawBatch
      ? parseInt(rawBatch, 10)
      : DEFAULT_PARAMS.batchSize;
    if (isNaN(parsedBatch) || parsedBatch < 100)
      parsedBatch = DEFAULT_PARAMS.batchSize;

    let parsedRetention = rawRetention
      ? parseInt(rawRetention, 10)
      : DEFAULT_PARAMS.retentionWindow;
    // Migrate legacy seconds (>365) to days
    if (parsedRetention > 365) {
      parsedRetention = Math.max(1, Math.round(parsedRetention / 86400)) || 30;
    }
    if (isNaN(parsedRetention) || parsedRetention <= 0)
      parsedRetention = DEFAULT_PARAMS.retentionWindow;

    let parsedWorkers = rawWorkers
      ? parseInt(rawWorkers, 10)
      : DEFAULT_PARAMS.workerCount;
    if (isNaN(parsedWorkers) || parsedWorkers <= 0)
      parsedWorkers = DEFAULT_PARAMS.workerCount;

    return {
      batchSize: parsedBatch,
      retentionWindow: parsedRetention,
      workerCount: parsedWorkers,
    };
  } catch {
    return DEFAULT_PARAMS;
  }
};

/**
 * Saves engine tuning parameters to cache (cookieService + localStorage + memory).
 */
export const saveCachedEngineParams = (params: EngineTuningParams): void => {
  try {
    cookieService.set(COOKIE_KEYS.BATCH_SIZE, String(params.batchSize));
    cookieService.set(
      COOKIE_KEYS.RETENTION_WINDOW,
      String(params.retentionWindow),
    );
    cookieService.set(COOKIE_KEYS.WORKER_COUNT, String(params.workerCount));

    // Also save structured object cache
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        "engine_tuning_cache",
        JSON.stringify({
          ...params,
          syncedAt: new Date().toISOString(),
        }),
      );
    }
  } catch (err) {
    logger.developer(
      "Failed to cache engine tuning parameters to storage",
      "warn",
      err,
    );
  }
};

/**
 * Synchronizes engine tuning settings from the backend API.
 * Updates local cache and returns the synchronized parameters.
 * If backend is offline, gracefully loads and returns cached settings.
 */
export const syncEngineTuningSettings =
  async (): Promise<SyncedEngineTuningResult> => {
    logger.developer(
      "Synchronizing global engine tuning settings with backend (GET /api/dev/engine-params)...",
      "info",
    );

    try {
      const res = await fetchEngineParams();

      if (res.success && res.data) {
        let liveRetention = Number(res.data.retentionWindow ?? 30);
        if (liveRetention > 365) {
          liveRetention = Math.max(1, Math.round(liveRetention / 86400)) || 30;
        }

        const liveParams: EngineTuningParams = {
          batchSize: Number(res.data.batchSize ?? 50000),
          retentionWindow: liveRetention,
          workerCount: Number(res.data.workerCount ?? 4),
          updatedAt: res.data.updatedAt,
        };

        // Persist latest backend values to cache
        saveCachedEngineParams(liveParams);

        logger.developer(
          `Global engine tuning settings synchronized from backend: batchSize=${liveParams.batchSize} lines, retentionWindow=${liveParams.retentionWindow} days, multiprocessingWorkers=${liveParams.workerCount}`,
          "success",
          liveParams,
        );

        return {
          success: true,
          params: liveParams,
          source: "backend",
          message: "Engine tuning settings synchronized from backend database",
        };
      }
    } catch (err: any) {
      logger.developer(
        `Backend engine params sync error: ${err?.message}`,
        "warn",
      );
    }

    // Fallback to cache if backend unreachable
    const cached = getCachedEngineParams();
    logger.developer(
      "Backend engine params unreachable; loaded settings from cache",
      "info",
      cached,
    );

    return {
      success: false,
      params: cached,
      source: "cache",
      message: "Backend offline; using cached engine tuning parameters",
    };
  };
