import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Server,
  Terminal,
  Sliders,
  RefreshCw,
  Copy,
  Check,
  Search,
  Trash2,
  Code2,
  Send,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Download,
  Radio,
  Layers,
  Activity
} from 'lucide-react';
import { logger } from '../../services/logger';
import {
  getBackendConfig,
  updateBackendConfig,
  resetBackendConfig,
  getBackendAddress,
  getApiBaseUrl,
  subscribeBackendConfig,
  BackendConfig
} from '../../config/backend';
import { apiClient } from '../../config/apiClient';
import { backendService, EngineParams } from '../../services/backend/backendService';
import { encryptedStorage } from '../../services/security/encryptedStorage';

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
    backendStatus,
    refreshBackendStatus,
    logoutDeveloper,
    isDevAuthenticated,
    authenticateDev,
    navigateToFilePage,
  } = useApp();

  // Authentication Screen State
  const [authPinInput, setAuthPinInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(false);

  // Authenticated Workspace State (2 tabs: 'backend' | 'engine' | 'logs')
  const [activeTab, setActiveTab] = useState<'backend' | 'engine' | 'logs'>('backend');

  // Backend Config State
  const [backendCfg, setBackendCfg] = useState<BackendConfig>(getBackendConfig());
  const [hostInput, setHostInput] = useState<string>(backendCfg.host);
  const [portInput, setPortInput] = useState<string>(backendCfg.port);
  const [protocolInput, setProtocolInput] = useState<'http' | 'https'>(backendCfg.protocol);
  const [apiPrefixInput, setApiPrefixInput] = useState<string>(backendCfg.apiPrefix);

  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  // Endpoint Playground State
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<string>('/health');
  const [playgroundMethod, setPlaygroundMethod] = useState<'GET' | 'POST'>('GET');
  const [playgroundBody, setPlaygroundBody] = useState<string>('{\n  "content": "$GNGGA,141105.00,1258.1234,N,07735.5678,E,1,12,0.9,150.0,M,-28.4,M,,*42"\n}');
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [isExecutingRequest, setIsExecutingRequest] = useState<boolean>(false);

  // Engine Backend Submission State
  const [isSubmittingEngine, setIsSubmittingEngine] = useState<boolean>(false);
  const [engineSubmitMsg, setEngineSubmitMsg] = useState<string | null>(null);

  // Terminal state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Advanced Diagnostic Log Filters & Actions
  const [filterSource, setFilterSource] = useState<'all' | 'client' | 'backend'>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [isFetchingBackendLogs, setIsFetchingBackendLogs] = useState<boolean>(false);
  const [backendLogMsg, setBackendLogMsg] = useState<string | null>(null);
  const [autoPollBackend, setAutoPollBackend] = useState<boolean>(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFetchBackendLogs = async () => {
    setIsFetchingBackendLogs(true);
    setBackendLogMsg(null);
    try {
      const res = await logger.fetchBackendLogs(apiClient);
      if (res.error) {
        setBackendLogMsg(`Backend query: ${res.error}`);
      } else {
        setBackendLogMsg(`Successfully loaded ${res.count} backend log records.`);
      }
      setTimeout(() => setBackendLogMsg(null), 4000);
    } catch (err: any) {
      setBackendLogMsg(`Query failed: ${err?.message || err}`);
    } finally {
      setIsFetchingBackendLogs(false);
    }
  };

  // Auto-poll backend logs if enabled and backend is reachable
  useEffect(() => {
    if (!autoPollBackend || !backendStatus?.reachable || activeTab !== 'logs') return;
    const interval = setInterval(() => {
      logger.fetchBackendLogs(apiClient);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPollBackend, backendStatus?.reachable, activeTab]);

  // Export full diagnostic report
  const handleExportJson = () => {
    const jsonStr = logger.exportJson();
    copyToClipboard(jsonStr, 'export-json');
  };

  const handleExportText = () => {
    const textStr = logger.exportText();
    copyToClipboard(textStr, 'export-text');
  };

  const handleExportOfflineDiagnostics = async () => {
    try {
      const result = await logger.saveOfflineDiagnosticsToFile('offline-debug-report.json');
      if (result.success) {
        setBackendLogMsg(`Offline diagnostics saved to ${result.fileName}`);
        addLog(`Offline diagnostics exported to a local file: ${result.fileName}`, 'success', 'system');
      } else {
        setBackendLogMsg(`Offline diagnostics export failed: ${result.error}`);
        addLog(`Offline diagnostics export failed: ${result.error}`, 'error', 'system');
      }
      setTimeout(() => setBackendLogMsg(null), 4000);
    } catch (err: any) {
      setBackendLogMsg(`Export failed: ${err?.message || 'Unknown error'}`);
      addLog(`Offline diagnostics export failed: ${err?.message || 'Unknown error'}`, 'error', 'system');
    }
  };

  // PIN update state
  const [newPin, setNewPin] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeBackendConfig((newConfig) => {
      setBackendCfg(newConfig);
      setHostInput(newConfig.host);
      setPortInput(newConfig.port);
      setProtocolInput(newConfig.protocol);
      setApiPrefixInput(newConfig.apiPrefix);
    });
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current && activeTab === 'logs') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeTab]);

  // Handle Authentication Submission
  const handleAuthSubmit = async (e?: React.FormEvent, directPin?: string) => {
    if (e) e.preventDefault();
    const pinToTest = (directPin !== undefined ? directPin : authPinInput).trim();
    if (!pinToTest) {
      setAuthError('Please enter the developer password or PIN.');
      return;
    }

    setIsVerifyingAuth(true);
    setAuthError(null);

    try {
      const result = await authenticateDev(pinToTest);
      if (!result.success) {
        setAuthError(result.message || 'Invalid password.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication request failed.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handlePing = async () => {
    setIsPinging(true);
    try {
      await refreshBackendStatus();
      addLog(`Ping check completed for backend at ${getBackendAddress()}`, 'info');
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateBackendConfig({
      host: hostInput.trim() || 'localhost',
      port: portInput.trim(),
      protocol: protocolInput,
      apiPrefix: apiPrefixInput.trim() || '/api',
    });
    setBackendCfg(updated);
    // Point 3: Save to encrypted storage vault & backend
    encryptedStorage.setItem('dev_backend_config', updated);
    backendService.saveDevSettings({ backendConfig: updated });

    setConfigSavedMsg('Backend configuration updated and securely saved.');
    addLog(`Backend updated: ${updated.protocol}://${updated.host}:${updated.port}`, 'success');
    setTimeout(() => setConfigSavedMsg(null), 3000);
    handlePing();
  };

  const handleResetConfig = () => {
    const defaults = resetBackendConfig();
    setBackendCfg(defaults);
    setHostInput(defaults.host);
    setPortInput(defaults.port);
    setProtocolInput(defaults.protocol);
    setApiPrefixInput(defaults.apiPrefix);
    encryptedStorage.removeItem('dev_backend_config');
    setConfigSavedMsg('Restored default environment configuration.');
    addLog('Restored default backend configuration', 'info');
    setTimeout(() => setConfigSavedMsg(null), 3000);
  };

  // Point 4: Submit Engine Parameters to Backend FastAPI
  const handleSubmitEngineParams = async () => {
    setIsSubmittingEngine(true);
    setEngineSubmitMsg(null);

    const params: EngineParams = {
      batchSize,
      retentionWindow,
      workerCount,
      debugMode
    };

    try {
      const result = await backendService.submitEngineParameters(params);
      setEngineSubmitMsg(result.message);
      addLog(`Engine parameters submitted: BATCH=${batchSize}, RETENTION=${retentionWindow}s, WORKERS=${workerCount}x`, 'success');
      setTimeout(() => setEngineSubmitMsg(null), 4000);
    } catch (err: any) {
      setEngineSubmitMsg(`Failed to submit: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingEngine(false);
    }
  };

  const handleRunPlaygroundRequest = async () => {
    setIsExecutingRequest(true);
    setPlaygroundResult(null);
    const startTime = performance.now();

    try {
      if (playgroundMethod === 'GET') {
        const res = await apiClient.get(playgroundEndpoint);
        const duration = Math.round(performance.now() - startTime);
        setPlaygroundResult({
          status: res.statusCode,
          success: res.success,
          durationMs: duration,
          data: res.data,
          error: res.error,
        });
        addLog(`Playground GET ${playgroundEndpoint} -> ${res.statusCode} (${duration}ms)`, res.success ? 'success' : 'warn');
      } else {
        let parsedBody: any = undefined;
        try {
          parsedBody = JSON.parse(playgroundBody);
        } catch {
          parsedBody = { raw: playgroundBody };
        }
        const res = await apiClient.post(playgroundEndpoint, parsedBody);
        const duration = Math.round(performance.now() - startTime);
        setPlaygroundResult({
          status: res.statusCode,
          success: res.success,
          durationMs: duration,
          data: res.data,
          error: res.error,
        });
        addLog(`Playground POST ${playgroundEndpoint} -> ${res.statusCode} (${duration}ms)`, res.success ? 'success' : 'warn');
      }
    } catch (err: any) {
      setPlaygroundResult({
        status: 0,
        success: false,
        durationMs: Math.round(performance.now() - startTime),
        error: err?.message || 'Request failed',
      });
      addLog(`Playground request failed: ${err?.message}`, 'error');
    } finally {
      setIsExecutingRequest(false);
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
      encryptedStorage.setItem('dev_pin', newPin.trim());
      setPinChangeMsg(`PIN saved to encrypted vault: ${newPin.trim()}`);
      setNewPin('');
      addLog('Developer authorization PIN updated in encrypted storage.', 'info');
      setTimeout(() => setPinChangeMsg(null), 3500);
    } else {
      setPinChangeMsg('PIN must be at least 4 characters.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    // 1. Source filter
    if (filterSource !== 'all') {
      const src = log.source || 'client';
      if (src !== filterSource) return false;
    }
    // 2. Stage filter
    if (filterStage !== 'all') {
      const stg = log.stage || 'system';
      if (stg !== filterStage) return false;
    }
    // 3. Level filter
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    // 4. Search term (searches message text, stage name, or payload details)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const textMatch = log.text.toLowerCase().includes(term);
      const stageMatch = (log.stage || '').toLowerCase().includes(term);
      const detailsMatch = log.details ? JSON.stringify(log.details).toLowerCase().includes(term) : false;
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
              Password authentication verified against backend FastAPI server with demo testing access.
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={(e) => handleAuthSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Developer Password / PIN
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authPinInput}
                  onChange={(e) => setAuthPinInput(e.target.value)}
                  placeholder="Enter PIN..."
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingAuth}
              className="w-full py-3 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-bold font-mono uppercase shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isVerifyingAuth ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Password...</span>
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
              type="button"
              onClick={() => {
                setAuthPinInput('7788');
                handleAuthSubmit(undefined, '7788');
              }}
              className="w-full py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Use Demo PIN (7788)</span>
            </button>

            <button
              type="button"
              onClick={navigateToFilePage}
              className="text-xs text-[#736E65] dark:text-slate-400 hover:text-[#E05318] transition-colors cursor-pointer"
            >
              Cancel & Return Home
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
            Engineering Console & Backend Integration
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Centralized network endpoints, FastAPI synchronization, and engine buffer tuning.
          </p>
        </div>

        {/* Live Server Connection Status + Log Out Button */}
        <div className="flex items-center space-x-2 shrink-0">
            {/* Centralized Backend Sync Status Pill */}
          <button
            onClick={refreshBackendStatus}
            type="button"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer border shadow-xs ${
              backendStatus?.reachable
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300/80 dark:border-emerald-800/70 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60'
                : 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300/80 dark:border-rose-800/70 hover:bg-rose-100/80 dark:hover:bg-rose-900/60'
            }`}
            title={
              backendStatus?.reachable
                ? `Backend Synced (${backendStatus.latencyMs ? `${backendStatus.latencyMs}ms` : 'Online'}) · Click to refresh`
                : 'Backend Disconnected · Click to test / reconnect'
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendStatus?.reachable
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse'
                  : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
              }`}
            />
            <span className="hidden sm:inline">
              {backendStatus?.reachable ? 'Backend Synced' : 'Backend Offline'}
            </span>
            <span className="inline sm:hidden">
              {backendStatus?.reachable ? 'Synced' : 'Offline'}
            </span>
          </button>

          <button
            onClick={handlePing}
            disabled={isPinging}
            type="button"
            className="p-2 rounded-xl border border-[#E6E1D6] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] transition-colors cursor-pointer"
            title="Ping Backend Server"
          >
            <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
          </button>

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

      {/* Clean 3 Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('backend')}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'backend'
              ? 'bg-[#E05318] text-white shadow-xs font-bold'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Backend & API Endpoints</span>
        </button>

        <button
          onClick={() => setActiveTab('engine')}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'engine'
              ? 'bg-[#E05318] text-white shadow-xs font-bold'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Engine Ingestion & Tuning</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'logs'
              ? 'bg-[#E05318] text-white shadow-xs font-bold'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Terminal Logs & Security</span>
        </button>
      </div>

      {/* TAB 1: BACKEND CONFIG & ENDPOINT PLAYGROUND */}
      {activeTab === 'backend' && (
        <div className="space-y-5">
          {/* Server Settings Form */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
              <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                <Server className="w-4 h-4 text-[#E05318]" />
                <span>Centralized Server & Port Configuration</span>
              </h3>
              <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                Target: <span className="font-mono font-bold text-[#E05318]">{getBackendAddress()}</span> · API: <span className="font-mono text-sky-600 dark:text-sky-400">{getApiBaseUrl()}</span>
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Protocol
                  </label>
                  <select
                    value={protocolInput}
                    onChange={(e) => setProtocolInput(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Host / Domain / IP
                  </label>
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    placeholder="localhost or 192.168.1.100"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    placeholder="3000 or 8000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              </div>

              {configSavedMsg && (
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{configSavedMsg}</span>
                </p>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={handlePing}
                  disabled={isPinging}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:text-[#E05318] transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>Ping Host</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-3 py-2 rounded-xl text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Endpoint Playground */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                <Send className="w-4 h-4 text-[#E05318]" />
                <span>Interactive API Endpoint Playground</span>
              </h3>
              <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                Send real test requests directly to <span className="font-mono text-[#E05318]">{getBackendAddress()}</span> and inspect server responses.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={playgroundMethod}
                  onChange={(e) => setPlaygroundMethod(e.target.value as any)}
                  className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-[#E05318] shrink-0"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>

                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs truncate">
                    {getBackendAddress()}/api
                  </span>
                  <input
                    type="text"
                    value={playgroundEndpoint}
                    onChange={(e) => setPlaygroundEndpoint(e.target.value)}
                    placeholder="/health or /nmea/parse"
                    className="w-full pl-36 sm:pl-48 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>

                <button
                  onClick={handleRunPlaygroundRequest}
                  disabled={isExecutingRequest}
                  type="button"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isExecutingRequest ? 'animate-pulse' : ''}`} />
                  <span>{isExecutingRequest ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>

              {playgroundMethod === 'POST' && (
                <div>
                  <label className="block text-[11px] text-slate-500 font-sans font-semibold mb-1">
                    JSON Payload:
                  </label>
                  <textarea
                    rows={3}
                    value={playgroundBody}
                    onChange={(e) => setPlaygroundBody(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              )}

              {playgroundResult && (
                <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center space-x-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          playgroundResult.success ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-bold">
                        HTTP {playgroundResult.status || 'UNREACHABLE'}
                      </span>
                    </span>
                    <span className="text-slate-400">{playgroundResult.durationMs}ms</span>
                  </div>

                  <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono overflow-x-auto text-emerald-400 leading-relaxed max-h-48">
                    <code>
                      {playgroundResult.data
                        ? JSON.stringify(playgroundResult.data, null, 2)
                        : playgroundResult.error || 'No response body'}
                    </code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENGINE INGESTION & TUNING (With Submit to Backend Button) */}
      {activeTab === 'engine' && (
        <div className="space-y-5">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#E05318]" />
                <span>Engine Ingestion & Memory Buffer Tuning</span>
              </h3>
              <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                Tune telemetry buffering and concurrency parameters, then submit them to update the backend FastAPI daemon.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
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
                    addLog(`BATCH_SIZE adjusted to ${e.target.value}`, 'info');
                  }}
                  className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Epoch chunking buffer for stream decoding</p>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
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
                    addLog(`RETENTION_WINDOW adjusted to ${e.target.value}s`, 'info');
                  }}
                  className="w-full accent-[#E05318] h-1.5 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Memory retention cutoff for sliding telemetry</p>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 space-y-2">
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
              </div>

              <div className="p-4 rounded-xl bg-[#F5F2EB]/60 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                    TELEMETRY CACHE
                  </span>
                  <span className="text-[10px] text-slate-400">Purge memory buffers</span>
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

            {/* Point 4: SUBMIT BUTTON FOR ENGINE INGESTION AND TUNING */}
            <div className="pt-4 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Synchronize with Backend Daemon
                </span>
                <span className="text-[11px] text-slate-500">
                  Transmits parameters to FastAPI endpoint <code className="text-[#E05318]">POST /api/dev/engine-params</code>
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitEngineParams}
                disabled={isSubmittingEngine}
                className="px-5 py-2.5 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-mono font-bold uppercase shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
              >
                {isSubmittingEngine ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting to Backend...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Engine Parameters</span>
                  </>
                )}
              </button>
            </div>

            {engineSubmitMsg && (
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <Check className="w-4 h-4 shrink-0" />
                <span>{engineSubmitMsg}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TERMINAL LOGS & SECURITY */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Diagnostic Console Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
            {/* Top Bar: Source Switcher & Global Diagnostics Actions */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              {/* Source Tabs: All vs Client vs Backend */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterSource('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filterSource === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>ALL ({logs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterSource('client')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filterSource === 'client'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-sky-400'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>CLIENT ({logs.filter((l) => (l.source || 'client') === 'client').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterSource('backend')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    filterSource === 'backend'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-purple-400'
                  }`}
                >
                  <Server className="w-3 h-3" />
                  <span>BACKEND ({logs.filter((l) => l.source === 'backend').length})</span>
                  {backendStatus?.reachable && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Action Buttons: Fetch Backend Logs, Auto-Poll, Export */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleFetchBackendLogs}
                  disabled={isFetchingBackendLogs}
                  className="px-2.5 py-1.5 text-[11px] font-mono rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Query live backend server logs (GET /api/dev/logs)"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingBackendLogs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Fetch Backend Logs</span>
                  <span className="inline sm:hidden">Fetch</span>
                </button>

                <label className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPollBackend}
                    onChange={(e) => setAutoPollBackend(e.target.checked)}
                    className="accent-purple-500 w-3 h-3"
                  />
                  <span>Auto-Poll (5s)</span>
                </label>

                <button
                  type="button"
                  onClick={handleExportOfflineDiagnostics}
                  className="px-2 py-1.5 text-[11px] font-mono rounded-lg bg-amber-900/60 hover:bg-amber-800/60 text-amber-200 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Save local offline backend diagnostics report"
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
                  {copiedKey === 'export-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                  <span className="hidden sm:inline">{copiedKey === 'export-json' ? 'Copied' : 'JSON'}</span>
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

                {/* Stage Filter */}
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
                  <option value="backend">BACKEND FASTAPI</option>
                  <option value="system">SYSTEM</option>
                </select>

                {/* Level Filter */}
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

            {/* Backend Log Status Banner (if notice exists) */}
            {backendLogMsg && (
              <div className="bg-purple-950/40 border-b border-purple-800/40 px-4 py-1.5 text-[11px] font-mono text-purple-300 flex items-center justify-between">
                <span>{backendLogMsg}</span>
                <button
                  type="button"
                  onClick={() => setBackendLogMsg(null)}
                  className="text-purple-400 hover:text-purple-200"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Monospace Stream Log Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 font-mono text-[11px] leading-relaxed space-y-1.5 select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 select-none">
                  <Terminal className="w-8 h-8 text-slate-700" />
                  <p className="text-xs font-mono">No log entries matching the selected criteria.</p>
                  <p className="text-[10px] text-slate-600">
                    Try clearing filters or click &ldquo;Fetch Backend Logs&rdquo; to query FastAPI server.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
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

                  const isExpanded = expandedLogIds.has(log.id);
                  const hasDetails = log.details !== undefined && log.details !== null;
                  const isBackend = log.source === 'backend';

                  return (
                    <div
                      key={log.id}
                      className={`hover:bg-white/[0.04] p-1.5 rounded-lg border transition-colors ${
                        isBackend
                          ? 'border-purple-900/30 bg-purple-950/10'
                          : 'border-transparent'
                      }`}
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
                              isBackend
                                ? 'text-purple-300 bg-purple-950/60 border-purple-800/50'
                                : 'text-sky-300 bg-sky-950/60 border-sky-800/50'
                            }`}
                          >
                            {isBackend ? 'BACKEND' : 'CLIENT'}
                          </span>

                          {/* Stage Badge */}
                          {log.stage && (
                            <span className="text-[9px] font-bold px-1 rounded shrink-0 uppercase text-slate-400 bg-slate-900 border border-slate-800">
                              {log.stage}
                            </span>
                          )}

                          {/* Level Badge */}
                          <span className={`text-[9px] font-bold px-1.5 rounded shrink-0 uppercase ${badgeClass}`}>
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
                            <span>{'{...}'}</span>
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
                              onClick={() => copyToClipboard(JSON.stringify(log.details, null, 2), `payload-${log.id}`)}
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
                            {typeof log.details === 'string'
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
                <span>Displaying: <strong className="text-slate-200">{filteredLogs.length}</strong> / {logs.length} entries</span>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400">Errors: {logs.filter((l) => l.level === 'error').length}</span>
                <span className="text-amber-400">Warnings: {logs.filter((l) => l.level === 'warn').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Target: <strong className="text-[#E05318]">{getBackendAddress()}</strong></span>
              </div>
            </div>
          </div>

          {/* Backend Diagnostics Guidance Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold font-mono text-[#E05318] uppercase flex items-center space-x-2">
                  <Server className="w-4 h-4" />
                  <span>FastAPI Backend Diagnostics Integration</span>
                </h4>
                <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                  Your primary source for issue isolation. Backend requests, health check latencies, engine parameter syncs, and parsing exceptions are recorded here in real time.
                </p>
              </div>

              <div className="shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                    backendStatus?.reachable
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  {backendStatus?.reachable ? 'Backend Synced' : 'Backend Offline'}
                </span>
              </div>
            </div>

            {!backendStatus?.reachable && (
              <div className="p-3 rounded-xl bg-[#F5F2EB] dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono text-[#736E65] dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Tip: To receive real-time server-side logs, start your FastAPI service:
                </p>
                <code className="text-[#E05318] block bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  uvicorn main:app --host 127.0.0.1 --port 8000 --reload
                </code>
              </div>
            )}
          </div>

          {/* Security & Access Management */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono text-[#E05318] uppercase flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Developer Access Key</span>
              </h4>
              <p className="text-xs text-[#736E65] dark:text-slate-400">
                Update authorization PIN or log out to hide Developer Suite from the navigation bar.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <form onSubmit={handleChangePin} className="flex items-center space-x-2">
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
            <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 px-2">{pinChangeMsg}</p>
          )}
        </div>
      )}
    </div>
  );
};
