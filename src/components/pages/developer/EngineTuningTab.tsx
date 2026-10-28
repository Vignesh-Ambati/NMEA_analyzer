import React, { useState, useEffect, useCallback } from "react";
import { Sliders, RefreshCw, Check, AlertCircle, Database, ArrowDownToLine, ArrowUpToLine } from "lucide-react";
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

  // Local state representing backend committed values
  const [committedParams, setCommittedParams] = useState<EngineTuningParams | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Check if current UI slider values differ from committed backend values
  const isDirty = committedParams !== null && (
    batchSize !== committedParams.batchSize ||
    retentionWindow !== committedParams.retentionWindow ||
    workerCount !== committedParams.workerCount
  );

  // Auto-fetch parameters from backend on opening this tab
  const handleFetchFromBackend = useCallback(async (isInitial = false) => {
    setIsFetching(true);
    setStatusMessage(null);
    try {
      const result = await backendService.fetchEngineParams();
      if (result.success && result.data) {
        setCommittedParams(result.data);
        setBatchSize(result.data.batchSize);
        setRetentionWindow(result.data.retentionWindow);
        setWorkerCount(result.data.workerCount);
        setLastSyncedAt(result.data.updatedAt ? new Date(result.data.updatedAt).toLocaleTimeString() : new Date().toLocaleTimeString());
        setStatusMessage({
          type: "success",
          text: isInitial ? "Synchronized engine parameters with backend database." : "Engine parameters reloaded from database.",
        });
      } else {
        setStatusMessage({
          type: "info",
          text: result.message || "Backend DB params not found. Operating with session parameters.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to fetch parameters from backend.",
      });
    } finally {
      setIsFetching(false);
    }
  }, [setBatchSize, setRetentionWindow, setWorkerCount]);

  useEffect(() => {
    handleFetchFromBackend(true);
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
        addLog(`Engine parameters committed to backend DB: batchSize=${batchSize}, retentionWindow=${retentionWindow}s, workers=${workerCount}`, "success", "developer");
      } else {
        setStatusMessage({
          type: "error",
          text: result.message || "Failed to commit parameters to backend database.",
        });
        addLog(`Failed to commit engine params: ${result.message}`, "error", "developer");
      }
    } catch (err: any) {
      const msg = err?.message || "Network error while saving parameters to database.";
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
            <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#E05318]" />
              <span>Engine Ingestion & Buffer Tuning</span>
            </h3>
            <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
              Tuning parameters are auto-fetched on tab open and synchronized directly with the backend database.
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
              <ArrowDownToLine className={`w-3.5 h-3.5 ${isFetching ? "animate-bounce text-[#E05318]" : ""}`} />
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
            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
              isDirty
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}>
              {isDirty ? "Unsaved Local Changes" : "Synchronized with DB"}
            </span>
          </div>

          <div className="text-[11px] text-[#736E65] dark:text-slate-400">
            Last Synced: <span className="font-semibold text-slate-800 dark:text-slate-200">{lastSyncedAt || "Not fetched"}</span>
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
            <span className="leading-relaxed font-mono">{statusMessage.text}</span>
          </div>
        )}

        {/* Tuning Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BATCH_SIZE Slider */}
          <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                BATCH_SIZE
              </span>
              <span className="text-[#E05318] font-bold">
                {batchSize} epochs
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Min: 100</span>
              <span>Chunking buffer for stream decoding</span>
              <span>Max: 2000</span>
            </div>
          </div>

          {/* RETENTION_WINDOW Slider */}
          <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                RETENTION_WINDOW
              </span>
              <span className="text-[#E05318] font-bold">
                {retentionWindow}s ({Math.round(retentionWindow / 60)}m)
              </span>
            </div>
            <input
              type="range"
              min="600"
              max="7200"
              step="300"
              value={retentionWindow}
              onChange={(e) => setRetentionWindow(Number(e.target.value))}
              className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Min: 10m</span>
              <span>Telemetry window retention cutoff</span>
              <span>Max: 120m</span>
            </div>
          </div>

          {/* CONCURRENT_WORKERS Selector */}
          <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5 sm:col-span-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                CONCURRENT_WORKERS
              </span>
              <span className="text-sky-500 font-bold">
                {workerCount} Worker Threads
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorkerCount(w)}
                  className={`py-2 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
                    workerCount === w
                      ? "bg-sky-500 text-white font-bold border-sky-500 shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {w}x Workers
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center">
              Parallel sentence parsing and aggregation workers for multi-task charts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
