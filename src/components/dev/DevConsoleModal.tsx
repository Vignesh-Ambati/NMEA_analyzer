import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Unlock,
  X,
  Terminal,
  Activity,
  KeyRound,
  Trash2,
  Copy,
  Check,
  Search,
  Sliders,
  RefreshCw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const DevConsoleModal: React.FC = () => {
  const {
    isDevModalOpen,
    closeDevModal,
    isDevAuthenticated,
    authenticateDev,
    lockDevConsole,
    devPasscode,
    setDevPasscode,
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
    files,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'terminal' | 'engine' | 'telemetry' | 'security'>('terminal');
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [newPin, setNewPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDevModalOpen && !isDevAuthenticated) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [isDevModalOpen, isDevAuthenticated]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeTab]);

  if (!isDevModalOpen) return null;

  const handleAuthenticate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pinInput.trim()) {
      setAuthError('Please enter authorization PIN.');
      return;
    }
    const success = authenticateDev(pinInput.trim());
    if (success) {
      setAuthError(null);
      setPinInput('');
    } else {
      setAuthError('Incorrect PIN. Access restricted.');
      setPinInput('');
    }
  };

  const handleQuickUnlock = () => {
    authenticateDev('7788');
    setAuthError(null);
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length >= 4) {
      setDevPasscode(newPin.trim());
      setPinChangeMsg(`PIN successfully updated to: ${newPin.trim()}`);
      setNewPin('');
      setTimeout(() => setPinChangeMsg(null), 3500);
    } else {
      setPinChangeMsg('PIN must be at least 4 digits/characters.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchTerm && !log.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[620px] max-h-[92vh] flex flex-col overflow-hidden text-[#24211D] dark:text-slate-100 transition-colors">
        {/* Modal Window Header */}
        <div className="h-14 bg-[#EFEAE1]/70 dark:bg-slate-950 border-b border-[#E6E1D6] dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isDevAuthenticated ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              {isDevAuthenticated ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold font-mono tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  Developer Diagnostics
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${isDevAuthenticated ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                  {isDevAuthenticated ? 'AUTHORIZED' : 'RESTRICTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Low-level Sentence Parsers & Performance Profiling
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isDevAuthenticated && (
              <button
                onClick={lockDevConsole}
                type="button"
                className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-500 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
                title="Lock Engineering Console"
              >
                <Lock className="w-3 h-3" />
                <span>Lock</span>
              </button>
            )}

            <button
              onClick={closeDevModal}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isDevAuthenticated ? (
          /* SECURITY RESTRICTION GATE */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-[#E05318] mb-4">
              <KeyRound className="w-7 h-7" />
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
              Restricted Engineering Verification
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              This panel contains low-level sentence parsing logs, memory buffer tuning, and receiver benchmarks. Please authenticate with authorization PIN to enter.
            </p>

            <form onSubmit={handleAuthenticate} className="w-full max-w-xs space-y-3">
              <div>
                <input
                  ref={pinInputRef}
                  type="password"
                  placeholder="Enter Passcode (PIN: 7788)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full text-center px-4 py-2.5 text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                {authError && (
                  <p className="text-xs text-rose-500 font-mono mt-1.5 flex items-center justify-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{authError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase bg-[#E05318] hover:bg-[#C94713] text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Unlock Developer Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Convenience 1-click unlock button */}
              <button
                type="button"
                onClick={handleQuickUnlock}
                className="w-full py-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-[#E05318] transition-colors cursor-pointer"
              >
                Use Default Engineering PIN (7788)
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ENGINEERING WORKSPACE */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="h-11 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    activeTab === 'terminal'
                      ? 'bg-white dark:bg-slate-800 text-[#E05318] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal Logs</span>
                </button>

                <button
                  onClick={() => setActiveTab('engine')}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    activeTab === 'engine'
                      ? 'bg-white dark:bg-slate-800 text-[#E05318] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Engine Tuning</span>
                </button>

                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    activeTab === 'telemetry'
                      ? 'bg-white dark:bg-slate-800 text-[#E05318] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Parser Benchmarks</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    activeTab === 'security'
                      ? 'bg-white dark:bg-slate-800 text-[#E05318] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Access Key</span>
                </button>
              </div>

              <div className="text-[10px] font-mono text-slate-400 hidden sm:block">
                BUFFER: {logs.length} entries
              </div>
            </div>

            {/* Tab 1: Terminal Console */}
            {activeTab === 'terminal' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
                {/* Search & Actions toolbar */}
                <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search log messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 pr-2 py-1 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded text-slate-200 w-48 focus:outline-none focus:border-[#E05318]"
                      />
                    </div>

                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="px-2 py-1 text-[10px] font-mono bg-slate-950 border border-slate-800 rounded text-slate-300"
                    >
                      <option value="all">ALL LEVELS</option>
                      <option value="info">INFO</option>
                      <option value="success">SUCCESS</option>
                      <option value="warn">WARN</option>
                      <option value="error">ERROR</option>
                    </select>

                    <label className="hidden sm:flex items-center space-x-1 text-[10px] font-mono text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        className="accent-[#E05318]"
                      />
                      <span>Auto-Scroll</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyLogs}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:text-sky-400 text-slate-300 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={clearLogs}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:text-rose-400 text-slate-300 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Monospace Stream Log Area */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1 select-text"
                >
                  {filteredLogs.map((log) => {
                    let textClass = 'text-slate-300';
                    let badgeClass = 'text-sky-400 bg-sky-950/60 border border-sky-800/40';
                    if (log.level === 'success') {
                      textClass = 'text-emerald-300';
                      badgeClass = 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40';
                    } else if (log.level === 'warn') {
                      textClass = 'text-amber-300';
                      badgeClass = 'text-amber-400 bg-amber-950/60 border border-amber-800/40';
                    } else if (log.level === 'error') {
                      textClass = 'text-rose-300 font-semibold';
                      badgeClass = 'text-rose-400 bg-rose-950/60 border border-rose-800/40';
                    } else if (log.level === 'debug') {
                      textClass = 'text-slate-400';
                      badgeClass = 'text-slate-400 bg-slate-900 border border-slate-800';
                    }

                    return (
                      <div key={log.id} className="flex items-start space-x-2 hover:bg-white/[0.04] px-1 py-0.5 rounded">
                        <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                        <span className={`text-[9px] font-bold px-1.5 rounded shrink-0 uppercase ${badgeClass}`}>
                          {log.level}
                        </span>
                        <span className={`break-all ${textClass}`}>{log.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Engine Tuning */}
            {activeTab === 'engine' && (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-wider text-[#E05318] uppercase mb-1">
                    Telemetry Ingestion & Memory Parameters
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tune internal epoch buffer windows and worker thread allocation for high-rate GNSS captures.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Batch Size Slider */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">BATCH_SIZE</span>
                      <span className="text-[#E05318] font-bold">{batchSize} epochs</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={batchSize}
                      onChange={(e) => {
                        setBatchSize(Number(e.target.value));
                        addLog(`[CONFIG] BATCH_SIZE updated to ${e.target.value}`, 'debug');
                      }}
                      className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Controls the vectorization batch size for background sentence processing.
                    </p>
                  </div>

                  {/* Retention Window */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">RETENTION_WINDOW</span>
                      <span className="text-[#E05318] font-bold">{retentionWindow}s ({Math.round(retentionWindow / 60)}m)</span>
                    </div>
                    <input
                      type="range"
                      min="600"
                      max="7200"
                      step="300"
                      value={retentionWindow}
                      onChange={(e) => {
                        setRetentionWindow(Number(e.target.value));
                        addLog(`[CONFIG] RETENTION_WINDOW updated to ${e.target.value}s`, 'debug');
                      }}
                      className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Maximum telemetry epoch duration retained before rolling memory compaction.
                    </p>
                  </div>

                  {/* Worker Threads */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">CONCURRENT_WORKERS</span>
                      <span className="text-sky-500 font-bold">{workerCount} Threads</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 4, 8].map((w) => (
                        <button
                          key={w}
                          onClick={() => setWorkerCount(w)}
                          className={`flex-1 py-1 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                            workerCount === w
                              ? 'bg-sky-500 text-white font-bold border-sky-500'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {w}x
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Thread count for concurrent multi-file decompression and parsing.
                    </p>
                  </div>

                  {/* Memory & Debug Dumps */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                        DEBUG_GRAPH_EXPORTS
                      </span>
                      <button
                        onClick={toggleDebugMode}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          debugMode ? 'bg-[#E05318] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {debugMode ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    <button
                      onClick={flushRamCache}
                      className="w-full py-2 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Flush Telemetry RAM Cache</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Parser Telemetry */}
            {activeTab === 'telemetry' && (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900">
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-wider text-sky-500 uppercase mb-1">
                    Parser Throughput & Checksum Benchmarks
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time verification metrics and sentence health across active NMEA-0183 channels.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">THROUGHPUT</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">16,400</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">sentences / sec</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">CHECKSUM INTEGRITY</div>
                    <div className="text-xl font-bold text-sky-500 mt-1">100.0%</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">0 bit parity errors</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">EPOCH LATENCY</div>
                    <div className="text-xl font-bold text-purple-500 mt-1">0.42 ms</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">avg per solution</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">TOTAL LOADED</div>
                    <div className="text-xl font-bold text-[#E05318] mt-1">
                      {files.reduce((a, f) => a + f.totalSentences, 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">sentences in heap</div>
                  </div>
                </div>

                {/* Sentence Breakdown Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Talker / Sentence</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Count</th>
                        <th className="py-2.5 px-3 text-right">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="py-2 px-3 text-[#E05318] font-bold">$GNGGA / $GPGGA</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Global Positioning System Fix Telemetry</td>
                        <td className="py-2 px-3 text-right font-bold">450</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">100% OK</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#E05318] font-bold">$GNRMC / $GPRMC</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Recommended Minimum Specific GNSS Data</td>
                        <td className="py-2 px-3 text-right font-bold">450</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">100% OK</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#E05318] font-bold">$GNGSA / $GPGSA</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">GNSS DOP and Active Satellites</td>
                        <td className="py-2 px-3 text-right font-bold">450</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">100% OK</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#E05318] font-bold">$GPGSV / $GLGSV</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Satellites in View and C/N0 SNR (dB-Hz)</td>
                        <td className="py-2 px-3 text-right font-bold">675</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">100% OK</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Security & Passcode */}
            {activeTab === 'security' && (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900">
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-wider text-[#E05318] uppercase mb-1">
                    Security & Session Policy
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage access passcode for gating engineering diagnostics away from operational users.
                  </p>
                </div>

                <div className="max-w-md p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Update Engineering Access PIN
                  </div>

                  <form onSubmit={handleChangePin} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter new 4-8 digit PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold font-mono bg-[#E05318] hover:bg-[#C94713] text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Save New PIN
                    </button>
                    {pinChangeMsg && (
                      <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{pinChangeMsg}</p>
                    )}
                  </form>
                </div>

                <div className="pt-3">
                  <button
                    onClick={lockDevConsole}
                    className="px-4 py-2 text-xs font-bold font-mono rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Engineering Console Immediately</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
