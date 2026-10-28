import React from "react";
import { RefreshCw, Trash2, Activity, Server, Shield, Check, Globe } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { getApiUrl, ENDPOINTS, getBackendBaseUrl, getApiPrefix } from "../../../backend";

export const MiscTab: React.FC = () => {
  const {
    flushRamCache,
    purgeClientStorage,
    backendStatus,
    isCheckingBackend,
    lastBackendPingTime,
    backendLatencyMs,
    pingBackend,
  } = useApp();

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Client Memory & Storage Purge Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-[#E05318]" />
            <span>Memory Buffers & Storage Management</span>
          </h3>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Purge volatile UI telemetry buffers, cached chart epochs, and client session storage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Flush RAM Cache */}
          <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                Flush UI RAM Cache
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Resets in-memory log entries and temporary chart caches
              </span>
            </div>

            <button
              type="button"
              onClick={flushRamCache}
              className="py-2 px-3.5 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-900 hover:text-[#E05318] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flush RAM</span>
            </button>
          </div>

          {/* Purge Client Storages */}
          <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                Purge Client Storage
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Clears non-essential sessionStorage and legacy tokens
              </span>
            </div>

            <button
              type="button"
              onClick={purgeClientStorage}
              className="py-2 px-3.5 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-900 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Storage</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Backend Health & Diagnostics Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Backend Service Connection Diagnostics</span>
          </h3>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Real-time ping monitor for the backend Core API and database service.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 min-w-0">
            <span
              className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${
                isCheckingBackend
                  ? "bg-amber-400 animate-ping"
                  : backendStatus === "online"
                  ? "bg-emerald-500 shadow-xs"
                  : "bg-rose-500 shadow-xs"
              }`}
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#24211D] dark:text-slate-100 font-mono">
                  {getApiUrl(ENDPOINTS.HEALTH)}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    backendStatus === "online"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                      : isCheckingBackend
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                      : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  {isCheckingBackend
                    ? "Checking..."
                    : backendStatus === "online"
                    ? "Service Online"
                    : "Service Offline"}
                </span>
              </div>

              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono flex flex-wrap items-center gap-2">
                <span>
                  Latency:{" "}
                  <strong className={backendLatencyMs !== null ? "text-emerald-600 dark:text-emerald-400" : ""}>
                    {backendLatencyMs !== null ? `${backendLatencyMs}ms` : "N/A"}
                  </strong>
                </span>
                <span>•</span>
                <span>Last Ping: {lastBackendPingTime || "Never"}</span>
                <span>•</span>
                <span>Auto-ping: Every 30m</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => pingBackend()}
            disabled={isCheckingBackend}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-200 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-2 transition-all cursor-pointer shrink-0 self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isCheckingBackend ? "animate-spin text-[#E05318]" : ""}`}
            />
            <span>{isCheckingBackend ? "Pinging..." : "Ping Backend Now"}</span>
          </button>
        </div>

        {/* Runtime Environment Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#F5F2EB]/50 dark:bg-slate-950/60 border border-[#E6E1D6] dark:border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Backend Base URL
            </span>
            <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {getBackendBaseUrl()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F2EB]/50 dark:bg-slate-950/60 border border-[#E6E1D6] dark:border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              API Route Prefix
            </span>
            <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
              {getApiPrefix()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F2EB]/50 dark:bg-slate-950/60 border border-[#E6E1D6] dark:border-slate-800/80">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Credential Storage
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Storage / DB Only</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
