import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import {
  Terminal,
  Sliders,
  RefreshCw,
  Check,
  Search,
  Trash2,
  Code2,
  LogOut,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  Activity,
} from "lucide-react";
import { logger } from "../../services/logger";
import { getApiUrl, ENDPOINTS } from "../../backend";

export const DeveloperPage: React.FC = () => {
  const {
    logs,
    clearLogs,
    addLog,
    batchSize,
    setBatchSize,
    retentionWindow,
    setRetentionWindow,
    workerCount,
    setWorkerCount,
    debugMode,
    toggleDebugMode,
    flushRamCache,
    logoutDeveloper,
    isDevAuthenticated,
    authenticateDev,
    navigateToFilePage,
    backendStatus,
    isCheckingBackend,
    lastBackendPingTime,
    backendLatencyMs,
    pingBackend,
  } = useApp();

  // Authentication Screen State
  const [authPinInput, setAuthPinInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(false);

  // Authenticated Workspace State (2 tabs: 'engine' | 'logs')
  const [activeTab, setActiveTab] = useState<"engine" | "logs">("engine");

  // Terminal state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Advanced Diagnostic Log Filters & Actions
  const [filterSource, setFilterSource] = useState<"all" | "client">("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export full diagnostic report
  const handleExportJson = () => {
    const jsonStr = logger.exportJson();
    copyToClipboard(jsonStr, "export-json");
  };

  const handleExportOfflineDiagnostics = async () => {
    try {
      const result = await logger.saveOfflineDiagnosticsToFile(
        "offline-debug-report.json",
      );
      if (result.success) {
        addLog(
          `Offline diagnostics exported to local file: ${result.fileName}`,
          "success",
          "system",
        );
      } else {
        addLog(
          `Offline diagnostics export failed: ${result.error}`,
          "error",
          "system",
        );
      }
    } catch (err: any) {
      addLog(
        `Offline diagnostics export failed: ${err?.message || "Unknown error"}`,
        "error",
        "system",
      );
    }
  };

  // PIN update state
  const [newPin, setNewPin] = useState<string>("");
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup subscription if any
    };
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current && activeTab === "logs") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeTab]);

  // Handle Authentication Submission
  const handleAuthSubmit = async (e?: React.FormEvent, directPin?: string) => {
    if (e) e.preventDefault();
    const pinToTest = (
      directPin !== undefined ? directPin : authPinInput
    ).trim();
    if (!pinToTest) {
      setAuthError("Please enter the developer password or PIN.");
      return;
    }

    setIsVerifyingAuth(true);
    setAuthError(null);

    try {
      const result = await authenticateDev(pinToTest);
      if (!result.success) {
        setAuthError(result.message || "Invalid credentials.");
      } else {
        setAuthPinInput("");
        setAuthError(null);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Authentication request failed.");
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length >= 4) {
      try {
        localStorage.setItem("dev_pin", newPin.trim());
      } catch {
        // fallback
      }
      setPinChangeMsg(`PIN saved locally: ${newPin.trim()}`);
      setNewPin("");
      addLog("Developer authorization PIN updated locally.", "info");
      setTimeout(() => setPinChangeMsg(null), 3500);
    } else {
      setPinChangeMsg("PIN must be at least 4 characters.");
    }
  };

  const filteredLogs = logs.filter((log) => {
    // 1. Source filter
    if (filterSource !== "all") {
      const src = log.source || "client";
      if (src !== filterSource) return false;
    }
    // 2. Stage filter
    if (filterStage !== "all") {
      const stg = log.stage || "system";
      if (stg !== filterStage) return false;
    }
    // 3. Level filter
    if (filterLevel !== "all" && log.level !== filterLevel) return false;
    // 4. Search term (searches message text, stage name, or payload details)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const textMatch = log.text.toLowerCase().includes(term);
      const stageMatch = (log.stage || "").toLowerCase().includes(term);
      const detailsMatch = log.details
        ? JSON.stringify(log.details).toLowerCase().includes(term)
        : false;
      if (!textMatch && !stageMatch && !detailsMatch) return false;
    }
    return true;
  });

  // SCREEN 1: DEVELOPER AUTHENTICATION / PASSWORD SCREEN (When !isDevAuthenticated)
  if (!isDevAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#F5F2EB] dark:bg-slate-950 select-none">
        <div className="w-full max-w-md bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Lock Icon & Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#E05318] flex items-center justify-center border border-orange-300/60 dark:border-orange-800/60 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
              Developer Suite Access
            </h2>
            <p className="text-xs text-[#736E65] dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              SQLite-backed scrypt authentication via Core API (POST
              /api/dev/auth)
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={(e) => handleAuthSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Developer Password
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default: 7788
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={authPinInput}
                  onChange={(e) => setAuthPinInput(e.target.value)}
                  placeholder="Enter developer passkey..."
                  disabled={isVerifyingAuth}
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isVerifyingAuth}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingAuth}
              className="w-full py-3 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-bold font-mono uppercase shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifyingAuth ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Backend...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Developer Suite</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Access Button for Fast Testing */}
          <div className="pt-2 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-col items-center gap-3">
            <button
              onClick={logoutDeveloper}
              type="button"
              className="w-full py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-2"
              title="Log out and lock Developer Suite"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: AUTHENTICATED DEVELOPER SUITE WORKSPACE
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-5 max-w-6xl mx-auto w-full select-none">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <Code2 className="w-4 h-4" />
            <span>Developer Suite</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-0.5">
            Local Engineering Console
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            UI-only tuning, diagnostics, and local developer controls.
          </p>
        </div>

        {/* Log Out Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Log Out Developer */}
          <button
            onClick={logoutDeveloper}
            type="button"
            className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
            title="Log out and lock Developer Suite"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Clean 2 Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("engine")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "engine"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Engine Tuning</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === "logs"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Local Console</span>
        </button>
      </div>

      {/* TAB 1: ENGINE INGESTION & TUNING (With Submit to Backend Button) */}
      {activeTab === "engine" && (
        <div className="space-y-5">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#E05318]" />
                <span>Engine Ingestion & Memory Buffer Tuning</span>
              </h3>
              <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                Adjust the local UI tuning values that remain inside the
                application state for this session.
              </p>
            </div>

            {/* Core Backend Connection Status */}
            <div className="p-4 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isCheckingBackend
                      ? "bg-amber-400 animate-ping"
                      : backendStatus === "online"
                        ? "bg-emerald-500 shadow-xs"
                        : "bg-rose-500 shadow-xs"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#24211D] dark:text-slate-100">
                      Core Backend Service ({getApiUrl(ENDPOINTS.HEALTH)})
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
                  <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                    Latency:{" "}
                    {backendLatencyMs !== null
                      ? `${backendLatencyMs}ms`
                      : "N/A"}{" "}
                    · Last ping: {lastBackendPingTime || "Never"} · Auto-ping:
                    every 30m
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => pingBackend()}
                disabled={isCheckingBackend}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-200 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCheckingBackend ? "animate-spin text-[#E05318]" : ""}`}
                />
                <span>
                  {isCheckingBackend ? "Pinging..." : "Ping Backend Now"}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
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
                  onChange={(e) => {
                    setBatchSize(Number(e.target.value));
                    addLog(`BATCH_SIZE adjusted to ${e.target.value}`, "info");
                  }}
                  className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Epoch chunking buffer for stream decoding
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
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
                  onChange={(e) => {
                    setRetentionWindow(Number(e.target.value));
                    addLog(
                      `RETENTION_WINDOW adjusted to ${e.target.value}s`,
                      "info",
                    );
                  }}
                  className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Memory retention cutoff for sliding telemetry
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    CONCURRENT_WORKERS
                  </span>
                  <span className="text-sky-500 font-bold">
                    {workerCount} Threads
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 4, 8].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWorkerCount(w)}
                      className={`flex-1 py-1 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                        workerCount === w
                          ? "bg-sky-500 text-white font-bold border-sky-500"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {w}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                    TELEMETRY CACHE
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Purge memory buffers
                  </span>
                </div>
                <button
                  onClick={flushRamCache}
                  className="py-1.5 px-3 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flush RAM</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERMINAL LOGS & SECURITY */}
      {activeTab === "logs" && (
        <div className="space-y-5">
          {/* Diagnostic Console Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
            {/* Top Bar: Source Switcher & Global Diagnostics Actions */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              {/* Source Tabs: All vs Client vs Backend */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterSource("all")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filterSource === "all"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>ALL ({logs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterSource("client")}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filterSource === "client"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-sky-400"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>
                    CLIENT (
                    {
                      logs.filter((l) => (l.source || "client") === "client")
                        .length
                    }
                    )
                  </span>
                </button>
              </div>

              {/* Action Buttons: Fetch Backend Logs, Auto-Poll, Export */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportOfflineDiagnostics}
                  className="px-2 py-1.5 text-[11px] font-mono rounded-lg bg-amber-900/60 hover:bg-amber-800/60 text-amber-200 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Save local offline diagnostics report"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline Log</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-2 py-1.5 text-[11px] font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Copy full diagnostic report as JSON"
                >
                  {copiedKey === "export-json" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedKey === "export-json" ? "Copied" : "JSON"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={clearLogs}
                  className="px-2 py-1.5 text-[11px] font-mono rounded-lg bg-slate-800 hover:text-rose-400 text-slate-300 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Clear all logs from buffer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>

            {/* Second Bar: Search, Stage Filter, Level Filter */}
            <div className="bg-slate-900/60 border-b border-slate-800 px-3.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search messages, payloads, stages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-[#E05318]"
                  />
                </div>

                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="px-2.5 py-1 text-[10px] font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="all">ALL STAGES</option>
                  <option value="ingestion">INGESTION</option>
                  <option value="network">NETWORK / API</option>
                  <option value="tasks">TASKS & MATRIX</option>
                  <option value="charts">CHARTS / PLOT</option>
                  <option value="developer">ENGINE & DEV</option>
                  <option value="system">SYSTEM</option>
                </select>

                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-2.5 py-1 text-[10px] font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
                >
                  <option value="all">ALL LEVELS</option>
                  <option value="info">INFO</option>
                  <option value="success">SUCCESS</option>
                  <option value="warn">WARN</option>
                  <option value="error">ERROR</option>
                  <option value="debug">DEBUG</option>
                </select>
              </div>

              <label className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="accent-[#E05318] w-3 h-3"
                />
                <span>Auto-Scroll</span>
              </label>
            </div>

            {/* Monospace Stream Log Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 font-mono text-[11px] leading-relaxed space-y-1.5 select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 select-none">
                  <Terminal className="w-8 h-8 text-slate-700" />
                  <p className="text-xs font-mono">
                    No log entries matching the selected criteria.
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Try clearing filters to inspect current local status.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  let textClass = "text-slate-300";
                  let badgeClass =
                    "text-sky-400 bg-sky-950/60 border border-sky-800/40";
                  if (log.level === "success") {
                    textClass = "text-emerald-300";
                    badgeClass =
                      "text-emerald-400 bg-emerald-950/60 border border-emerald-800/40";
                  } else if (log.level === "warn") {
                    textClass = "text-amber-300";
                    badgeClass =
                      "text-amber-400 bg-amber-950/60 border border-amber-800/40";
                  } else if (log.level === "error") {
                    textClass = "text-rose-300 font-semibold";
                    badgeClass =
                      "text-rose-400 bg-rose-950/60 border border-rose-800/40";
                  } else if (log.level === "debug") {
                    textClass = "text-slate-400";
                    badgeClass =
                      "text-slate-400 bg-slate-900 border border-slate-800";
                  }

                  const isExpanded = expandedLogIds.has(log.id);
                  const hasDetails =
                    log.details !== undefined && log.details !== null;

                  return (
                    <div
                      key={log.id}
                      className="hover:bg-white/[0.04] p-1.5 rounded-lg border border-transparent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          {/* Timestamp */}
                          <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                            {log.timestamp}
                          </span>

                          {/* Source Badge (Client vs Backend) */}
                          <span
                            className={`text-[9px] font-bold px-1 rounded shrink-0 uppercase border ${
                              "client" === "client"
                                ? "text-sky-300 bg-sky-950/60 border-sky-800/50"
                                : "text-sky-300 bg-sky-950/60 border-sky-800/50"
                            }`}
                          >
                            {"client"}
                          </span>

                          {/* Stage Badge */}
                          {log.stage && (
                            <span className="text-[9px] font-bold px-1 rounded shrink-0 uppercase text-slate-400 bg-slate-900 border border-slate-800">
                              {log.stage}
                            </span>
                          )}

                          {/* Level Badge */}
                          <span
                            className={`text-[9px] font-bold px-1.5 rounded shrink-0 uppercase ${badgeClass}`}
                          >
                            {log.level}
                          </span>

                          {/* Duration Badge */}
                          {log.durationMs !== undefined && (
                            <span className="text-[9px] px-1 rounded shrink-0 text-amber-400/90 bg-amber-950/40 border border-amber-900/40">
                              {log.durationMs}ms
                            </span>
                          )}

                          {/* Main Log Text */}
                          <span className={`break-all ${textClass}`}>
                            {log.text}
                          </span>
                        </div>

                        {/* Expand Details Trigger */}
                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() => toggleExpandLog(log.id)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-sky-300 bg-slate-900 border border-slate-800 flex items-center space-x-1 shrink-0 cursor-pointer"
                            title="Toggle detailed structured payload"
                          >
                            <span>{"{...}"}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-2.5 h-2.5" />
                            ) : (
                              <ChevronRight className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable JSON Inspector */}
                      {hasDetails && isExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto space-y-1">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 text-slate-400">
                            <span className="font-semibold uppercase tracking-wider text-[9px]">
                              Structured Diagnostics Payload
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(log.details, null, 2),
                                  `payload-${log.id}`,
                                )
                              }
                              className="text-sky-400 hover:underline cursor-pointer flex items-center space-x-1"
                            >
                              {copiedKey === `payload-${log.id}` ? (
                                <span className="text-emerald-400">Copied</span>
                              ) : (
                                <span>Copy JSON</span>
                              )}
                            </button>
                          </div>
                          <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary Bar */}
            <div className="h-7 bg-slate-900/90 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
              <div className="flex items-center space-x-3">
                <span>
                  Displaying:{" "}
                  <strong className="text-slate-200">
                    {filteredLogs.length}
                  </strong>{" "}
                  / {logs.length} entries
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400">
                  Errors: {logs.filter((l) => l.level === "error").length}
                </span>
                <span className="text-amber-400">
                  Warnings: {logs.filter((l) => l.level === "warn").length}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Access Management */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono text-[#E05318] uppercase flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Developer Access Key</span>
              </h4>
              <p className="text-xs text-[#736E65] dark:text-slate-400">
                Update authorization PIN or log out to hide Developer Suite from
                the navigation bar.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <form
                onSubmit={handleChangePin}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318] w-28"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold font-mono bg-[#E05318] hover:bg-[#C94713] text-white rounded-xl transition-colors cursor-pointer"
                >
                  Save PIN
                </button>
              </form>

              <button
                type="button"
                onClick={logoutDeveloper}
                className="py-1.5 px-4 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {pinChangeMsg && (
            <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 px-2">
              {pinChangeMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
