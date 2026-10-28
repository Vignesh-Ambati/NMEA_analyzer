import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Search,
  Trash2,
  Download,
  Layers,
  Activity,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { logger } from "../../../services/logger";

export const LogsTab: React.FC = () => {
  const { logs, clearLogs, addLog } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "client">("all");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).catch(() => fallbackClipboardCopy(text));
      } else {
        fallbackClipboardCopy(text);
      }
    } catch {
      fallbackClipboardCopy(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fallbackClipboardCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch {
      // Ignored if blocked
    }
  };

  // Safe file download via blob without prompt blocks
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addLog(`Diagnostic file downloaded: ${filename}`, "success", "developer");
    } catch (err: any) {
      addLog(`Failed to download report: ${err?.message || "Unknown error"}`, "error", "developer");
    }
  };

  // Export full diagnostic report as JSON file
  const handleDownloadJsonReport = () => {
    const jsonStr = logger.exportJson();
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(jsonStr, `nmea-diagnostics-${dateStr}.json`, "application/json");
  };

  // Export offline diagnostics report as JSON file
  const handleDownloadOfflineReport = () => {
    const jsonStr = logger.exportOfflineDiagnostics();
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(jsonStr, `offline-debug-report-${dateStr}.json`, "application/json");
  };

  const filteredLogs = logs.filter((log) => {
    if (filterSource !== "all") {
      const src = log.source || "client";
      if (src !== filterSource) return false;
    }
    if (filterStage !== "all") {
      const stg = log.stage || "system";
      if (stg !== filterStage) return false;
    }
    if (filterLevel !== "all" && log.level !== filterLevel) return false;
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

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
        {/* Top Control Bar: Source Switcher & Global Actions */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
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
                CLIENT ({logs.filter((l) => (l.source || "client") === "client").length})
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadOfflineReport}
              className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border border-amber-800/60 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download offline error report file"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Offline Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonReport}
              className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download full JSON diagnostics report"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Download JSON</span>
            </button>

            <button
              type="button"
              onClick={clearLogs}
              className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg bg-slate-800 hover:text-rose-400 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Clear all logs from buffer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Second Bar: Search & Stage / Level Filters */}
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
                Clear filters or run ingestion / backend actions to inspect live telemetry.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              let textClass = "text-slate-300";
              let badgeClass = "text-sky-400 bg-sky-950/60 border border-sky-800/40";
              if (log.level === "success") {
                textClass = "text-emerald-300";
                badgeClass = "text-emerald-400 bg-emerald-950/60 border border-emerald-800/40";
              } else if (log.level === "warn") {
                textClass = "text-amber-300";
                badgeClass = "text-amber-400 bg-amber-950/60 border border-amber-800/40";
              } else if (log.level === "error") {
                textClass = "text-rose-300 font-semibold";
                badgeClass = "text-rose-400 bg-rose-950/60 border border-rose-800/40";
              } else if (log.level === "debug") {
                textClass = "text-slate-400";
                badgeClass = "text-slate-400 bg-slate-900 border border-slate-800";
              }

              const isExpanded = expandedLogIds.has(log.id);
              const hasDetails = log.details !== undefined && log.details !== null;

              return (
                <div
                  key={log.id}
                  className="hover:bg-white/[0.04] p-1.5 rounded-lg border border-transparent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 min-w-0 flex-1">
                      <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                        {log.timestamp}
                      </span>

                      <span className="text-[9px] font-bold px-1 rounded shrink-0 uppercase border text-sky-300 bg-sky-950/60 border-sky-800/50">
                        {log.source || "client"}
                      </span>

                      {log.stage && (
                        <span className="text-[9px] font-bold px-1 rounded shrink-0 uppercase text-slate-400 bg-slate-900 border border-slate-800">
                          {log.stage}
                        </span>
                      )}

                      <span className={`text-[9px] font-bold px-1.5 rounded shrink-0 uppercase ${badgeClass}`}>
                        {log.level}
                      </span>

                      {log.durationMs !== undefined && (
                        <span className="text-[9px] px-1 rounded shrink-0 text-amber-400/90 bg-amber-950/40 border border-amber-900/40">
                          {log.durationMs}ms
                        </span>
                      )}

                      <span className={`break-all ${textClass}`}>
                        {log.text}
                      </span>
                    </div>

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
              Displaying: <strong className="text-slate-200">{filteredLogs.length}</strong> / {logs.length} entries
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
    </div>
  );
};
