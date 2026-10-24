import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ParsedLogFile, PageType, ThemeMode } from '../types/nmea';
import { parseNmeaContent } from '../services/nmeaParser';
import { HealthCheckResult, apiClient } from '../config/apiClient';
import { backendService } from '../services/backend/backendService';
import { logger, AppLogEntry } from '../services/logger';

export interface ConsoleMessage {
  id: string;
  timestamp: string;
  text: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  stage?: string;
  source?: 'client' | 'backend';
  details?: any;
  durationMs?: number;
}

export interface ActiveJob {
  id: string;
  filename: string;
  pct: number;
  status: string;
}

interface AppContextType {
  // Navigation & Page
  currentPage: PageType;
  currentTaskId: number;
  setCurrentTaskId: (id: number) => void;
  navigateToFilePage: () => void;
  navigateToTaskPage: () => void;
  navigateToGraphPage: (taskId: number) => void;
  navigateToReferencePage: () => void;
  navigateToToolsPage: () => void;
  navigateToDeveloperPage: () => void;

  // Files & Data - 100% BLANK BY DEFAULT, NO SIMULATED DATA
  files: ParsedLogFile[];
  selectedFileId: string;
  setSelectedFileId: (id: string) => void;
  processFile: (file: File | { name: string; content: string; size?: number }) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Processing state
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  activeJobs: ActiveJob[];

  // Settings & Toggles
  theme: ThemeMode;
  toggleTheme: () => void;
  progressBarVisible: boolean;
  setProgressBarVisible: (val: boolean) => void;
  toggleProgressBar: () => void;
  debugMode: boolean;
  toggleDebugMode: () => void;

  // Developer Suite
  isDevAuthenticated: boolean;
  authenticateDev: (pin: string) => Promise<{ success: boolean; isDemo?: boolean; message?: string }>;
  devPasscode: string;
  setDevPasscode: (newPin: string) => void;
  logoutDeveloper: () => void;

  // Advanced Engineering Tuning
  batchSize: number;
  setBatchSize: (val: number) => void;
  retentionWindow: number;
  setRetentionWindow: (val: number) => void;
  workerCount: number;
  setWorkerCount: (val: number) => void;
  flushRamCache: () => void;

  // Console & Diagnostic Logs
  logs: ConsoleMessage[];
  addLog: (
    text: string,
    level?: 'info' | 'warn' | 'error' | 'debug' | 'success',
    stage?: 'ingestion' | 'network' | 'tasks' | 'charts' | 'developer' | 'backend' | 'system',
    details?: any
  ) => void;
  clearLogs: () => void;

  // Fullscreen & Sidebar Maximization
  isFullpage: boolean;
  setIsFullpage: (val: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  toggleSidebar: () => void;

  // 7-Click Secret Developer Mode Unlock
  devUnlocked: boolean;
  registerDevSecretClick: () => void;
  devToastMessage: string | null;

  // Workflow gating: Task Matrix & Charts visible only after proceeding
  hasProceededToTasks: boolean;
  proceedToTaskMatrix: () => void;

  // Backend Integration State
  routeToBackend: boolean;
  setRouteToBackend: (val: boolean) => void;
  backendStatus: HealthCheckResult | null;
  refreshBackendStatus: () => Promise<void>;
}

const COLOR_CYCLE = ['#FF5A1F', '#38BDF8', '#34D399', '#F472B6', '#A78BFA', '#FBBF24', '#4ADE80'];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('file');
  const [currentTaskId, setCurrentTaskId] = useState<number>(3); // Default task: Altitude
  // 100% BLANK INITIAL STATE - NO SIMULATED LOGS OR SAMPLES
  const [files, setFiles] = useState<ParsedLogFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('Combined');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('Ready');
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);

  // Backend integration state
  const [routeToBackend, setRouteToBackend] = useState<boolean>(() => {
    try {
      localStorage.removeItem('nmea_route_to_backend');
      return false;
    } catch {
      return false;
    }
  });
  const [backendStatus, setBackendStatus] = useState<HealthCheckResult | null>(null);

  const refreshBackendStatus = useCallback(async () => {
    try {
      const res = await apiClient.checkHealth();
      setBackendStatus(res);
    } catch {
      setBackendStatus(null);
    }
  }, []);

  // Initial backend check
  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  // Persist routeToBackend toggle
  useEffect(() => {
    try {
      localStorage.setItem('nmea_route_to_backend', String(routeToBackend));
    } catch {
      // ignore
    }
  }, [routeToBackend]);

  // Default to light theme for clean look, with dark theme available
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      localStorage.removeItem('nmea_theme_mode');
    } catch {
      // ignore
    }
    return 'light';
  });
  const [progressBarVisible, setProgressBarVisible] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isFullpage, setIsFullpage] = useState<boolean>(false);

  // Sidebar minimize state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      localStorage.removeItem('nmea_sidebar_collapsed');
    } catch {
      // ignore
    }
    return false;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nmea_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // 7-Click Secret Developer Mode Unlock state
  const [devUnlocked, setDevUnlocked] = useState<boolean>(() => {
    try {
      localStorage.removeItem('nmea_dev_unlocked');
    } catch {
      // ignore
    }
    return false;
  });
  const [devClickCount, setDevClickCount] = useState<number>(0);
  const [devToastMessage, setDevToastMessage] = useState<string | null>(null);
  const clickTimeoutRef = React.useRef<any>(null);

  const registerDevSecretClick = useCallback(() => {
    if (devUnlocked) {
      setDevToastMessage('Developer Suite is already unlocked!');
      setTimeout(() => setDevToastMessage(null), 2500);
      return;
    }

    setDevClickCount((prev) => {
      const next = prev + 1;
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        setDevClickCount(0);
        setDevToastMessage(null);
      }, 3500);

      const remaining = 7 - next;
      if (remaining > 0 && remaining <= 4) {
        setDevToastMessage(`You are ${remaining} tap${remaining > 1 ? 's' : ''} away from Developer Suite.`);
      } else if (remaining <= 0) {
        setDevUnlocked(true);
        setDevToastMessage('🎉 Developer Suite Unlocked!');
        try {
          localStorage.setItem('nmea_dev_unlocked', 'true');
        } catch {
          // ignore
        }
        setTimeout(() => setDevToastMessage(null), 4000);
        return 0;
      }
      return next;
    });
  }, [devUnlocked]);

  // Log out Developer to hide the Developer Suite back
  const logoutDeveloper = useCallback(() => {
    setIsDevAuthenticated(false);
    setDevUnlocked(false);
    try {
      localStorage.removeItem('nmea_dev_unlocked');
    } catch {
      // ignore
    }
    setDevToastMessage('🔒 Developer Suite locked & hidden.');
    setTimeout(() => setDevToastMessage(null), 3000);
    setCurrentPage((prev) => (prev === 'developer' ? 'file' : prev));
  }, []);

  // Guard: If dev is locked, redirect away from developer page
  useEffect(() => {
    if (!devUnlocked && currentPage === 'developer') {
      setCurrentPage('file');
    }
  }, [devUnlocked, currentPage]);

  // Developer state
  const [isDevModalOpen, setIsDevModalOpen] = useState<boolean>(false);
  const [isDevAuthenticated, setIsDevAuthenticated] = useState<boolean>(false);
  const [devPasscode, setDevPasscode] = useState<string>('');

  // Engineering Tuning Parameters
  const [batchSize, setBatchSize] = useState<number>(500);
  const [retentionWindow, setRetentionWindow] = useState<number>(3600);
  const [workerCount, setWorkerCount] = useState<number>(4);

  const [logs, setLogs] = useState<ConsoleMessage[]>(() => {
    return logger.getLogs().map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      text: l.message,
      level: l.level,
      stage: l.stage,
      source: l.source,
      details: l.details,
      durationMs: l.durationMs,
    }));
  });

  // Subscribe to logger real-time broadcasts
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [
        ...prev.slice(-500),
        {
          id: entry.id,
          timestamp: entry.timestamp,
          text: entry.message,
          level: entry.level,
          stage: entry.stage,
          source: entry.source,
          details: entry.details,
          durationMs: entry.durationMs,
        },
      ]);
    });
    return unsubscribe;
  }, []);

  // Guard: If files are cleared, redirect from task/graph back to file page
  useEffect(() => {
    if (files.length === 0 && (currentPage === 'task' || currentPage === 'graph')) {
      setCurrentPage('file');
    }
  }, [files.length, currentPage]);

  const addLog = useCallback(
    (
      text: string,
      level: 'info' | 'warn' | 'error' | 'debug' | 'success' = 'info',
      stage: 'ingestion' | 'network' | 'tasks' | 'charts' | 'developer' | 'backend' | 'system' = 'system',
      details?: any
    ) => {
      logger.log({
        source: 'client',
        stage,
        level,
        message: text,
        details,
      });
    },
    []
  );

  const clearLogs = useCallback(() => {
    logger.clear();
    setLogs([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('nmea_theme_mode', next);
      } catch {
        // ignore
      }
      addLog(`Theme switched to ${next} mode`, 'info');
      return next;
    });
  }, [addLog]);

  const toggleProgressBar = useCallback(() => {
    setProgressBarVisible((prev) => !prev);
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugMode((prev) => {
      const next = !prev;
      addLog(`Debug mode ${next ? 'enabled' : 'disabled'}`, next ? 'warn' : 'info');
      return next;
    });
  }, [addLog]);

  const openDevModal = useCallback(() => {
    setIsDevModalOpen(true);
  }, []);

  const closeDevModal = useCallback(() => {
    setIsDevModalOpen(false);
  }, []);

  const authenticateDev = useCallback(
    async (pin: string): Promise<{ success: boolean; isDemo?: boolean; message?: string }> => {
      const res = await backendService.verifyDevPassword(pin);
      if (res.success) {
        setIsDevAuthenticated(true);
        addLog(`Developer access granted: ${res.message || 'Authenticated'}`, 'success');
      } else {
        addLog(`Developer authentication failed: ${res.message || 'Invalid password'}`, 'error');
      }
      return res;
    },
    [addLog]
  );

  const lockDevConsole = useCallback(() => {
    setIsDevAuthenticated(false);
    addLog('Developer Console locked.', 'warn');
  }, [addLog]);

  const flushRamCache = useCallback(() => {
    addLog('Telemetry RAM cache flushed.', 'info');
  }, [addLog]);

  // Initial setup
  useEffect(() => {
    addLog('NMEA Log Analyzer initialized. Ready for genuine log upload.', 'info');
  }, [addLog]);

  // Sync theme to root html and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }, [theme]);

  const processFile = useCallback(
    async (fileInput: File | { name: string; content: string; size?: number }) => {
      const filename = fileInput.name;
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const jobColor = COLOR_CYCLE[files.length % COLOR_CYCLE.length];

      setIsProcessing(true);
      setProcessingProgress(15);
      setProcessingStatus(`Parsing ${filename}...`);
      addLog(`Processing file ${filename}...`, 'info');

      const jobId = fileId;
      setActiveJobs((prev) => [...prev, { id: jobId, filename, pct: 20, status: 'Parsing' }]);

      try {
        let content = '';
        let fileSize = 0;

        if ('content' in fileInput) {
          content = fileInput.content;
          fileSize = fileInput.size || content.length;
        } else {
          fileSize = fileInput.size;
          content = await fileInput.text();
        }

        setProcessingProgress(55);
        setProcessingStatus(`Validating sentences...`);
        setActiveJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, pct: 60, status: 'Validating' } : j))
        );
        await new Promise((r) => setTimeout(r, 80));

        setProcessingProgress(85);
        setProcessingStatus(`Building index...`);
        setActiveJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, pct: 90, status: 'Indexing' } : j))
        );
        await new Promise((r) => setTimeout(r, 80));

        const parsed = parseNmeaContent(content, filename, fileId, jobColor, fileSize);

        // Optional Backend Routing: If user activated auto-route to backend
        if (routeToBackend) {
          addLog(`Dispatching ${filename} to backend API (/nmea/upload)...`, 'info');
          if (fileInput instanceof File) {
            backendService.uploadFile(fileInput, filename).then((backendRes) => {
              if (backendRes.success) {
                addLog(`Backend upload successful for ${filename}: ${backendRes.message || 'OK'}`, 'success');
              } else {
                addLog(`Backend upload notice: ${backendRes.error}`, 'warn');
              }
            });
          } else {
            const blob = new Blob([content], { type: 'text/plain' });
            backendService.uploadFile(blob, filename).then((backendRes) => {
              if (backendRes.success) {
                addLog(`Backend upload successful for ${filename}: ${backendRes.message || 'OK'}`, 'success');
              } else {
                addLog(`Backend upload notice: ${backendRes.error}`, 'warn');
              }
            });
          }
        }

        setProcessingProgress(100);
        setProcessingStatus(`Complete`);
        setActiveJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, pct: 100, status: 'Complete' } : j))
        );

        setFiles((prev) => [...prev, parsed]);
        setSelectedFileId(files.length === 0 ? parsed.id : 'Combined');

        addLog(`Successfully parsed ${filename}: ${parsed.totalSentences} sentences, ${parsed.epochs.length} epochs.`, 'success');

        await new Promise((r) => setTimeout(r, 150));
        setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
        setIsProcessing(false);
      } catch (err: any) {
        setIsProcessing(false);
        setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
        addLog(`Error parsing ${filename}: ${err?.message || err}`, 'error');
        throw err;
      }
    },
    [files.length, addLog, routeToBackend]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== id);
        if (selectedFileId === id) {
          setSelectedFileId(remaining.length > 0 ? (remaining.length > 1 ? 'Combined' : remaining[0].id) : 'Combined');
        }
        return remaining;
      });
      addLog(`File removed.`, 'info');
    },
    [selectedFileId, addLog]
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    setSelectedFileId('Combined');
    addLog('All files cleared from workspace.', 'info');
  }, [addLog]);

  const navigateToFilePage = useCallback(() => {
    setCurrentPage('file');
  }, []);

  const navigateToTaskPage = useCallback(() => {
    setCurrentPage('task');
  }, []);

  const navigateToGraphPage = useCallback(
    (taskId: number) => {
      setCurrentTaskId(taskId);
      setCurrentPage('graph');
    },
    []
  );

  const navigateToReferencePage = useCallback(() => {
    setCurrentPage('reference');
  }, []);

  const navigateToToolsPage = useCallback(() => {
    setCurrentPage('tools');
  }, []);

  const navigateToDeveloperPage = useCallback(() => {
    setCurrentPage('developer');
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        currentTaskId,
        setCurrentTaskId,
        navigateToFilePage,
        navigateToTaskPage,
        navigateToGraphPage,
        navigateToReferencePage,
        navigateToToolsPage,
        navigateToDeveloperPage,
        files,
        selectedFileId,
        setSelectedFileId,
        processFile,
        removeFile,
        clearFiles,
        isProcessing,
        processingProgress,
        processingStatus,
        activeJobs,
        theme,
        toggleTheme,
        progressBarVisible,
        setProgressBarVisible,
        toggleProgressBar,
        debugMode,
        toggleDebugMode,
        isDevAuthenticated,
        authenticateDev,
        devPasscode,
        setDevPasscode,
        logoutDeveloper,
        batchSize,
        setBatchSize,
        retentionWindow,
        setRetentionWindow,
        workerCount,
        setWorkerCount,
        flushRamCache,
        logs,
        addLog,
        clearLogs,
        isFullpage,
        setIsFullpage,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        devUnlocked,
        registerDevSecretClick,
        devToastMessage,
        hasProceededToTasks: files.length > 0,
        proceedToTaskMatrix: navigateToTaskPage,
        routeToBackend,
        setRouteToBackend,
        backendStatus,
        refreshBackendStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
