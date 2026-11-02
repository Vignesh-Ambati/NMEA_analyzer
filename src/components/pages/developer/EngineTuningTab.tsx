import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sliders,
  RefreshCw,
  Check,
  AlertCircle,
  Database,
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { backendService, EngineTuningParams } from "../../../backend";

export const EngineTuningTab: React.FC = () => {
  const {
    batchSize,
    setBatchSize,
    retentionWindow,
    setRetentionWindow,
    workerCount,
    setWorkerCount,
    addLog,
  } = useApp();

  const initialFetchRef = useRef(false);

  // Local state representing backend committed values
  const [committedParams, setCommittedParams] =
    useState<EngineTuningParams | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Check if current UI slider values differ from committed backend values
  const isDirty =
    committedParams !== null &&
    (batchSize !== committedParams.batchSize ||
      retentionWindow !== committedParams.retentionWindow ||
      workerCount !== committedParams.workerCount);

  // Auto-fetch parameters from backend on opening this tab, with a limited retry loop.
  const handleFetchFromBackend = useCallback(
    async (isInitial = false) => {
      const maxAttempts = 3;
      let attempt = 0;

      setIsFetching(true);

      try {
        while (attempt < maxAttempts) {
          attempt += 1;
          setStatusMessage(
            attempt === 1
              ? null
              : {
                  type: "info",
                  text: `Retrying engine parameters fetch (${attempt}/${maxAttempts})...`,
                },
          );

          try {
            const result = await backendService.fetchEngineParams();
            if (result.success && result.data) {
              setCommittedParams(result.data);
              setBatchSize(result.data.batchSize);
              setRetentionWindow(result.data.retentionWindow);
              setWorkerCount(result.data.workerCount);
              setLastSyncedAt(
                result.data.updatedAt
                  ? new Date(result.data.updatedAt).toLocaleTimeString()
                  : new Date().toLocaleTimeString(),
              );
              setStatusMessage({
                type: "success",
                text: isInitial
                  ? "Synchronized engine parameters with backend database."
                  : "Engine parameters reloaded from database.",
              });
              return;
            }

            if (attempt < maxAttempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, 400 * attempt),
              );
              continue;
            }

            setStatusMessage({
              type: "info",
              text:
                result.message ||
                "Backend DB params not found. Operating with session parameters.",
            });
            return;
          } catch (err: any) {
            const errorMessage =
              err?.message || "Failed to fetch parameters from backend.";

            if (attempt < maxAttempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, 400 * attempt),
              );
              continue;
            }

            setStatusMessage({
              type: "error",
              text: errorMessage,
            });
            return;
          }
        }
      } finally {
        setIsFetching(false);
      }
    },
    [setBatchSize, setRetentionWindow, setWorkerCount],
  );

  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    void handleFetchFromBackend(true);
  }, [handleFetchFromBackend]);

  // Commit tuning parameters to backend DB
  const handleCommitToBackend = async () => {
    setIsCommitting(true);
    setStatusMessage(null);
    const paramsToCommit: EngineTuningParams = {
      batchSize,
      retentionWindow,
      workerCount,
    };

    try {
      const result = await backendService.commitEngineParams(paramsToCommit);
      if (result.success) {
        setCommittedParams(paramsToCommit);
        setLastSyncedAt(new Date().toLocaleTimeString());
        setStatusMessage({
          type: "success",
          text: result.message || "Tuning parameters committed to database.",
        });
        addLog(
          `Engine parameters committed to backend DB: batchSize=${batchSize.toLocaleString()} lines, retentionWindow=${retentionWindow} days, concurrentWorkers=${workerCount} cores`,
          "success",
          "developer",
        );
      } else {
        setStatusMessage({
          type: "error",
          text:
            result.message ||
            "Failed to commit parameters to backend database.",
        });
        addLog(
          `Failed to commit engine params: ${result.message}`,
          "error",
          "developer",
        );
      }
    } catch (err: any) {
      const msg =
        err?.message || "Network error while saving parameters to database.";
      setStatusMessage({
        type: "error",
        text: msg,
      });
      addLog(`Commit error: ${msg}`, "error", "developer");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        {/* Card Header & Backend DB Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E1D6] dark:border-slate-800">
          <div>
            <h3 className="text-m font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#E05318]" />
              <span>Engine Ingestion & Buffer Tuning</span>
            </h3>
            <p className="text-s text-[#736E65] dark:text-slate-400 mt-0.5">
              Tuning backend services via parameters
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleFetchFromBackend(false)}
              disabled={isFetching || isCommitting}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Reload parameters from backend database"
            >
              <ArrowDownToLine
                className={`w-3.5 h-3.5 ${isFetching ? "animate-bounce text-[#E05318]" : ""}`}
              />
              <span>{isFetching ? "Fetching..." : "Fetch from DB"}</span>
            </button>

            <button
              type="button"
              onClick={handleCommitToBackend}
              disabled={isFetching || isCommitting}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-white flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                isDirty
                  ? "bg-[#E05318] hover:bg-[#C94713] ring-2 ring-orange-500/20"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              title="Commit current slider parameters to backend database"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <ArrowUpToLine className="w-3.5 h-3.5" />
                  <span>{isDirty ? "Commit Changes to DB" : "Save to DB"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#F5F2EB]/80 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-[#E05318]" />
            <span className="text-slate-700 dark:text-slate-300">
              Database Sync:
            </span>
            <span
              className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                isDirty
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              {isDirty ? "Unsaved Local Changes" : "Synchronized with DB"}
            </span>
          </div>

          <div className="text-[11px] text-[#736E65] dark:text-slate-400">
            Last Synced:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {lastSyncedAt || "Not fetched"}
            </span>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 animate-in fade-in duration-150 border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                : statusMessage.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
                  : "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed font-mono">
              {statusMessage.text}
            </span>
          </div>
        )}

        {/* Tuning Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 1. BATCH_SIZE (Number of Lines to Send) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-s font-mono font-bold text-slate-800 dark:text-slate-200 block">
                  BATCH_SIZE
                </span>
                <span className="text-[11px] text-[#736E65] dark:text-slate-400">
                  Number of lines dispatched per processing to backend
                </span>
              </div>
              <span className="text-[#E05318] font-bold font-mono text-sm px-2.5 py-1 rounded-lg bg-orange-500/10 dark:bg-orange-950/40 border border-orange-500/20 shrink-0">
                {batchSize.toLocaleString()} lines
              </span>
            </div>

            {/* Direct Styled User Input */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="100"
                  max="10000000"
                  step="5000"
                  value={batchSize || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setBatchSize(Math.min(10000000, Math.max(1, val)));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E05318]/30 focus:border-[#E05318] text-[#24211D] dark:text-slate-100"
                  placeholder="Enter lines count (e.g. 50000)"
                />
              </div>
            </div>

            {/* Quick Presets (50k to 10M) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Quick Batch Size Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "50K", value: 50000 },
                  { label: "100K", value: 100000 },
                  { label: "250K", value: 250000 },
                  { label: "500K", value: 500000 },
                  { label: "1M", value: 1000000 },
                  { label: "5M", value: 5000000 },
                  { label: "10M", value: 10000000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setBatchSize(preset.value);
                      addLog(
                        `Batch size set to preset ${preset.label} (${preset.value.toLocaleString()} lines)`,
                        "info",
                        "developer",
                      );
                    }}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                      batchSize === preset.value
                        ? "bg-[#E05318] text-white font-bold border-[#E05318] shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#E05318]/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. RETENTION_WINDOW (Days / Hours / Months) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-s font-mono font-bold text-slate-800 dark:text-slate-200 block">
                  RETENTION_WINDOW
                </span>
                <span className="text-[11px] text-[#736E65] dark:text-slate-400">
                  Number of days to keep ingested logs and data retained
                </span>
              </div>
              <span className="text-[#E05318] font-bold font-mono text-sm px-2.5 py-1 rounded-lg bg-orange-500/10 dark:bg-orange-950/40 border border-orange-500/20 shrink-0">
                {retentionWindow} {retentionWindow === 1 ? "Day" : "Days"}
              </span>
            </div>

            {/* Direct Styled User Input */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={retentionWindow || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setRetentionWindow(Math.min(3650, Math.max(1, val)));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E05318]/30 focus:border-[#E05318] text-[#24211D] dark:text-slate-100"
                  placeholder="Enter retention in days"
                />
              </div>
            </div>

            {/* Retention Presets (Days, Hours, Months) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Retention Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "7 Days", value: 7 },
                  { label: "14 Days", value: 14 },
                  { label: "30 Days", value: 30 },
                  { label: "90 Days", value: 90 },
                  { label: "180 Days", value: 180 },
                  { label: "365 Days", value: 365 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setRetentionWindow(preset.value);
                      addLog(
                        `Retention window set to preset ${preset.label}`,
                        "info",
                        "developer",
                      );
                    }}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                      retentionWindow === preset.value
                        ? "bg-[#E05318] text-white font-bold border-[#E05318] shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#E05318]/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. CONCURRENT_WORKERS (Multiprocessing CPU Processes) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-4 sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-s font-mono font-bold text-slate-800 dark:text-slate-200 block">
                  CONCURRENT_WORKERS
                </span>
                <span className="text-[11px] text-[#736E65] dark:text-slate-400">
                  Multiprocessing CPU worker processes spawned for parallel
                  sentence parsing and extraction
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sky-500 font-bold font-mono text-sm px-2.5 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/20 shrink-0">
                  {workerCount}{" "}
                  {workerCount === 1
                    ? "Worker Process"
                    : "Parallel Worker Processes"}
                </span>
              </div>
            </div>

            {/* Direct Worker Count Input & Stepper */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-48">
                <input
                  type="number"
                  min="1"
                  max="128"
                  step="1"
                  value={workerCount || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setWorkerCount(Math.min(128, Math.max(1, val)));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-[#24211D] dark:text-slate-100"
                  placeholder="Processes (1-128)"
                />
                <span className="absolute right-10 top-2.5 text-[11px] font-mono text-slate-400 pointer-events-none">
                  cores
                </span>
              </div>

              {/* Multiprocessing Worker Presets */}
              <div className="flex flex-wrap gap-2 flex-1">
                {[
                  { label: "1x (Single)", value: 1 },
                  { label: "2x (Dual)", value: 2 },
                  { label: "4x (Quad)", value: 4 },
                  { label: "8x (Octa)", value: 8 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setWorkerCount(preset.value);
                      addLog(
                        `Multiprocessing worker count set to ${preset.value} cores`,
                        "info",
                        "developer",
                      );
                    }}
                    className={`py-2 px-3 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
                      workerCount === preset.value
                        ? "bg-sky-500 text-white font-bold border-sky-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
