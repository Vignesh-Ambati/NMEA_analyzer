import React from "react";
import {
  RefreshCw,
  Trash2,
  Activity,
  Server,
  Shield,
  Check,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import {
  getApiUrl,
  ENDPOINTS,
  getBackendBaseUrl,
  getApiPrefix,
} from "../../../backend";

/**
 * Classified as local logic because it manages developer miscellaneous tools, live memory telemetry display, and cache purge execution feedback. Placed in /src/components/pages/developer/MiscTab.tsx.
 */

export const MiscTab: React.FC = () => {
  const {
    flushRamCache,
    purgeClientStorage,
    logs,
    files,
    activeJobs,
    addLog,
    backendStatus,
    isCheckingBackend,
    lastBackendPingTime,
    backendLatencyMs,
    pingBackend,
    showToast,
  } = useApp();

  const [showMemoryCard, setShowMemoryCard] = React.useState(true);
  const [showBackendCard, setShowBackendCard] = React.useState(true);

  // Live storage counters
  const [storageStats, setStorageStats] = React.useState<{
    cookieCount: number;
    localStorageCount: number;
    sessionStorageCount: number;
  }>({ cookieCount: 0, localStorageCount: 0, sessionStorageCount: 0 });

  const refreshStorageStats = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const cookies = document.cookie
        ? document.cookie.split(";").filter((c) => c.trim().length > 0).length
        : 0;
      const ls = window.localStorage ? window.localStorage.length : 0;
      const ss = window.sessionStorage ? window.sessionStorage.length : 0;
      setStorageStats({
        cookieCount: cookies,
        localStorageCount: ls,
        sessionStorageCount: ss,
      });
    } catch {
      // Ignored in strict sandbox
    }
  }, []);

  React.useEffect(() => {
    refreshStorageStats();
  }, [refreshStorageStats]);

  const handleFlushRam = () => {
    addLog("Executing thorough Flush RAM action...", "info", "system");
    const result = flushRamCache();
    showToast(
      `UI RAM flushed: ${result?.logsFreed ?? logs.length} logs & ${result?.filesFreed ?? files.length} datasets freed`,
      "success",
    );
  };

  const handlePurgeStorage = () => {
    addLog(
      "Executing thorough Purge Client Storage action...",
      "info",
      "system",
    );
    const result = purgeClientStorage();
    refreshStorageStats();
    showToast(
      `Client storage purged: cleared ${result.cookiesRemoved} cookies & ${result.localStorageKeysRemoved} local storage keys`,
      "success",
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Client Memory & Storage Purge Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-[#E05318]" />
            <span>Memory & Storage</span>
          </h3>

          <button
            type="button"
            onClick={() => setShowMemoryCard((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-mono font-semibold text-slate-600 transition-colors hover:text-[#E05318] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            {showMemoryCard ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Show
              </>
            )}
          </button>
        </div>

        {showMemoryCard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Flush RAM Cache Card */}
            <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                    Flush UI RAM
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFlushRam}
                  className="py-2 px-3.5 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-900 hover:text-[#E05318] hover:border-orange-300 dark:hover:border-orange-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#E05318]" />
                  <span>Flush RAM</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#E6E1D6]/70 dark:border-slate-800/80 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Logs
                  </span>
                  <span className="font-bold text-[#E05318]">
                    {logs.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Files
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {files.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Jobs
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {activeJobs.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Purge Client Storages Card */}
            <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                    Purge Storage
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handlePurgeStorage}
                  className="py-2 px-3.5 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-900 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#E6E1D6]/70 dark:border-slate-800/80 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Cookies
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {storageStats.cookieCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Local
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {storageStats.localStorageCount}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Session
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {storageStats.sessionStorageCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Backend Health & Diagnostics Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Backend Health</span>
          </h3>

          <button
            type="button"
            onClick={() => setShowBackendCard((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-mono font-semibold text-slate-600 transition-colors hover:text-[#E05318] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            {showBackendCard ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Show
              </>
            )}
          </button>
        </div>

        {showBackendCard && (
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
                        ? "Online"
                        : "Offline"}
                  </span>
                </div>

                <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono flex flex-wrap items-center gap-2">
                  <span>
                    Latency:{" "}
                    <strong
                      className={
                        backendLatencyMs !== null
                          ? "text-emerald-600 dark:text-emerald-400"
                          : ""
                      }
                    >
                      {backendLatencyMs !== null
                        ? `${backendLatencyMs}ms`
                        : "N/A"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Last Ping: {lastBackendPingTime || "Never"}</span>
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
              <span>{isCheckingBackend ? "Pinging..." : "Ping Now"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
