import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { PageType, ParsedLogFile, ThemeMode } from "../types";
import {
  logger,
  cookieService,
  COOKIE_KEYS,
  uploadAndIngestGnssFile,
  syncEngineTuningSettings,
  saveCachedEngineParams,
  getCachedEngineParams,
} from "../services";
import {
  checkBackendHealth,
  getBackendPingIntervalMs,
  backendService,
} from "../backend";

export interface ConsoleMessage {
  id: string;
  timestamp: string;
  text: string;
  level: "info" | "warn" | "error" | "debug" | "success";
  stage?: string;
  source?: "client";
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
  currentPage: PageType;
  currentTaskId: number;
  setCurrentTaskId: (id: number) => void;
  navigateToFilePage: () => void;
  navigateToTaskPage: () => void;
  navigateToGraphPage: (taskId: number) => void;
  navigateToReferencePage: () => void;
  navigateToToolsPage: () => void;
  navigateToDeveloperPage: () => void;

  files: ParsedLogFile[];
  selectedFileId: string;
  setSelectedFileId: (id: string) => void;
  processFile: (
    file: File | { name: string; content: string; size?: number },
  ) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  activeJobs: ActiveJob[];

  theme: ThemeMode;
  toggleTheme: () => void;
  progressBarVisible: boolean;
  setProgressBarVisible: (val: boolean) => void;
  toggleProgressBar: () => void;
  debugMode: boolean;
  toggleDebugMode: () => void;

  isDevAuthenticated: boolean;
  authenticateDev: (
    password: string,
  ) => Promise<{ success: boolean; authenticated?: boolean; message?: string }>;
  logoutDeveloper: () => void;
  purgeClientStorage: () => void;

  batchSize: number;
  setBatchSize: (val: number) => void;
  retentionWindow: number;
  setRetentionWindow: (val: number) => void;
  workerCount: number;
  setWorkerCount: (val: number) => void;
  flushRamCache: () => void;

  logs: ConsoleMessage[];
  addLog: (
    text: string,
    level?: "info" | "warn" | "error" | "debug" | "success",
    stage?:
      | "ingestion"
      | "network"
      | "tasks"
      | "charts"
      | "developer"
      | "system",
    details?: any,
  ) => void;
  clearLogs: () => void;

  isFullpage: boolean;
  setIsFullpage: (val: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  toggleSidebar: () => void;

  devUnlocked: boolean;
  registerDevSecretClick: () => void;
  devToastMessage: string | null;

  hasProceededToTasks: boolean;
  proceedToTaskMatrix: () => void;

  backendStatus: "online" | "offline" | "checking";
  isCheckingBackend: boolean;
  lastBackendPingTime: string | null;
  backendLatencyMs: number | null;
  pingBackend: () => Promise<boolean>;

  syncEngineTuning: () => Promise<void>;
  isSyncingEngine: boolean;
}

const getInitialTheme = (): ThemeMode => {
  const saved = cookieService.get(COOKIE_KEYS.THEME);
  if (saved === "dark" || saved === "light") return saved;

  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<PageType>("file");
  const [currentTaskId, setCurrentTaskId] = useState<number>(3);
  const [files, setFiles] = useState<ParsedLogFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("Combined");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("Ready");
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [progressBarVisible, setProgressBarVisible] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isFullpage, setIsFullpage] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return cookieService.get(COOKIE_KEYS.SIDEBAR_COLLAPSED) === "true";
  });

  // Backend status and ping state
  const [backendStatus, setBackendStatus] = useState<
    "online" | "offline" | "checking"
  >("checking");
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);
  const [lastBackendPingTime, setLastBackendPingTime] = useState<string | null>(
    null,
  );
  const [backendLatencyMs, setBackendLatencyMs] = useState<number | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      cookieService.set(COOKIE_KEYS.SIDEBAR_COLLAPSED, String(next));
      logger.system(
        `Sidebar collapsed state changed to ${next ? "collapsed" : "expanded"}`,
      );
      return next;
    });
  }, []);

  const [devUnlocked, setDevUnlocked] = useState<boolean>(false);
  const [devClickCount, setDevClickCount] = useState<number>(0);
  const [devToastMessage, setDevToastMessage] = useState<string | null>(null);
  const clickTimeoutRef = React.useRef<any>(null);

  const registerDevSecretClick = useCallback(() => {
    logger.developer(
      "Developer secret click gesture registered in UI shell",
      "debug",
    );
    if (devUnlocked) {
      setDevToastMessage("Developer Suite is already unlocked!");
      logger.developer(
        "Developer suite already unlocked; secret click ignored",
        "info",
      );
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
        setDevToastMessage(
          `You are ${remaining} tap${remaining > 1 ? "s" : ""} away from Developer Suite.`,
        );
        logger.developer(
          `Developer unlock sequence progress: ${next}/7`,
          "debug",
        );
      } else if (remaining <= 0) {
        setDevUnlocked(true);
        setDevToastMessage("🎉 Developer Suite Unlocked!");
        logger.developer(
          "Developer suite unlocked via secret-click sequence",
          "success",
        );
        setTimeout(() => setDevToastMessage(null), 4000);
        return 0;
      }
      return next;
    });
  }, [devUnlocked]);

  const logoutDeveloper = useCallback(() => {
    logger.developer("Developer logout requested from UI context", "info");
    setIsDevAuthenticated(false);
    setDevUnlocked(false);
    setDevToastMessage("🔒 Developer Suite locked & hidden.");
    setTimeout(() => setDevToastMessage(null), 3000);
    setCurrentPage((prev) => (prev === "developer" ? "file" : prev));
  }, []);

  useEffect(() => {
    if (!devUnlocked && currentPage === "developer") {
      logger.developer(
        "Developer page blocked because suite is locked",
        "warn",
      );
      setCurrentPage("file");
    }
  }, [devUnlocked, currentPage]);

  const [isDevModalOpen, setIsDevModalOpen] = useState<boolean>(false);
  const [isDevAuthenticated, setIsDevAuthenticated] = useState<boolean>(false);

  // Clear legacy client storage credentials on initialization
  useEffect(() => {
    try {
      localStorage.removeItem("dev_pin");
      localStorage.removeItem("dev_token");
    } catch {
      // Ignored if storage is restricted
    }
  }, []);

  const [batchSize, setBatchSize] = useState<number>(() => {
    const saved = cookieService.get(COOKIE_KEYS.BATCH_SIZE);
    return saved ? parseInt(saved, 10) : 500;
  });
  const [retentionWindow, setRetentionWindow] = useState<number>(() => {
    const saved = cookieService.get(COOKIE_KEYS.RETENTION_WINDOW);
    return saved ? parseInt(saved, 10) : 3600;
  });
  const [workerCount, setWorkerCount] = useState<number>(() => {
    const saved = cookieService.get(COOKIE_KEYS.WORKER_COUNT);
    return saved ? parseInt(saved, 10) : 4;
  });

  const [logs, setLogs] = useState<ConsoleMessage[]>(() =>
    logger.getLogs().map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      text: l.message,
      level: l.level,
      stage: l.stage,
      source: l.source,
      details: l.details,
      durationMs: l.durationMs,
    })),
  );

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

  useEffect(() => {
    if (
      files.length === 0 &&
      (currentPage === "task" || currentPage === "graph")
    ) {
      logger.system(
        `Page reset from ${currentPage} because no datasets remain in the workspace`,
      );
      setCurrentPage("file");
    }
  }, [files.length, currentPage]);

  const addLog = useCallback(
    (
      text: string,
      level: "info" | "warn" | "error" | "debug" | "success" = "info",
      stage:
        | "ingestion"
        | "network"
        | "tasks"
        | "charts"
        | "developer"
        | "system" = "system",
      details?: any,
    ) => {
      logger.log({
        source: "client",
        stage,
        level,
        message: text,
        details,
      });
    },
    [],
  );

  const clearLogs = useCallback(() => {
    logger.clear();
    setLogs([]);
    logger.system("UI log buffer cleared by user action");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      addLog(`Theme switched to ${next} mode`, "info");
      return next;
    });
  }, [addLog]);

  const toggleProgressBar = useCallback(() => {
    setProgressBarVisible((prev) => {
      const next = !prev;
      logger.system(`Progress bar toggled to ${next ? "visible" : "hidden"}`);
      return next;
    });
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugMode((prev) => {
      const next = !prev;
      addLog(
        `Debug mode ${next ? "enabled" : "disabled"}`,
        next ? "warn" : "info",
      );
      return next;
    });
  }, [addLog]);

  const authenticateDev = useCallback(
    async (
      password: string,
    ): Promise<{
      success: boolean;
      authenticated?: boolean;
      message?: string;
    }> => {
      const trimmed = password.trim();

      if (!trimmed) {
        addLog(
          "Developer authentication failed: empty password submitted.",
          "error",
          "developer",
        );
        return {
          success: false,
          authenticated: false,
          message: "Please enter the developer password.",
        };
      }

      addLog(
        "Verifying developer credentials against backend database (POST /api/dev/auth)...",
        "info",
        "developer",
      );
      const result = await backendService.verifyDevPassword(trimmed);

      if (result.authenticated) {
        setIsDevAuthenticated(true);
        addLog(
          "Developer authentication verified by backend DB: access granted.",
          "success",
          "developer",
        );
        return { success: true, authenticated: true, message: result.message };
      }

      if (result.isOffline) {
        addLog(
          `Developer authentication offline: ${result.message}`,
          "warn",
          "developer",
        );
        return {
          success: false,
          authenticated: false,
          message:
            "Backend database service is offline or unreachable. Authentication requires an active database connection.",
        };
      }

      addLog(
        `Developer authentication rejected: ${result.message}`,
        "error",
        "developer",
      );
      return {
        success: false,
        authenticated: false,
        message: result.message || "Invalid developer credentials.",
      };
    },
    [addLog],
  );

  const flushRamCache = useCallback(() => {
    logger.clear();
    setLogs([]);
    addLog(
      "Telemetry RAM cache and temporary buffers purged from memory.",
      "success",
      "system",
    );
  }, [addLog]);

  const purgeClientStorage = useCallback(() => {
    try {
      localStorage.removeItem("dev_pin");
      localStorage.removeItem("dev_token");
      sessionStorage.clear();
      addLog(
        "Local client cache and session storages purged.",
        "success",
        "system",
      );
    } catch {
      addLog("Failed to purge local client storage.", "warn", "system");
    }
  }, [addLog]);

  useEffect(() => {
    addLog(
      "NMEA Log Analyzer initialized. Ready for genuine log upload.",
      "info",
    );
  }, [addLog]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      body.classList.add("dark");
      body.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      body.classList.add("light");
      body.classList.remove("dark");
    }

    // Persist to centralized cookie service
    cookieService.set(COOKIE_KEYS.THEME, theme);
  }, [theme]);

  const processFile = useCallback(
    async (file: File | { name: string; content: string; size?: number }) => {
      const filename = file.name || "unnamed.log";
      const sizeBytes = file.size || (file as any).fileSize || 0;
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingStatus(
        `Connecting to FastAPI backend (Batch size: ${batchSize})...`,
      );
      addLog(
        `Initiating backend file ingestion for ${filename} (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB, batchSize=${batchSize})`,
        "info",
        "ingestion",
      );

      try {
        const parsedFile = await uploadAndIngestGnssFile(
          file,
          batchSize,
          (pct, status) => {
            setProcessingProgress(pct);
            setProcessingStatus(status);
          },
        );

        setFiles((prev) => [...prev, parsedFile]);
        setSelectedFileId(parsedFile.id);
        addLog(
          `Backend parsed ${filename}: ${(parsedFile.totalSentences || 0).toLocaleString()} sentences processed with zero browser memory overhead`,
          "success",
          "ingestion",
        );
      } catch (err: any) {
        addLog(
          `File ingestion error for ${filename}: ${err?.message || "Failed to ingest file"}`,
          "error",
          "ingestion",
        );
      } finally {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus("Ready");
      }
    },
    [addLog, batchSize],
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== id);
        if (selectedFileId === id) {
          setSelectedFileId(
            remaining.length > 0 ? remaining[0].id : "Combined",
          );
        }
        return remaining;
      });
      addLog(`Dataset ${id} removed from workspace`, "info", "ingestion");
    },
    [addLog, selectedFileId],
  );

  const clearFiles = useCallback(() => {
    logger.system("All workspace datasets cleared by user action");
    setFiles([]);
    setSelectedFileId("Combined");
    addLog("All files cleared from workspace.", "info");
  }, [addLog]);

  const navigateToFilePage = useCallback(() => {
    logger.system("Navigation: File page selected");
    setCurrentPage("file");
  }, []);

  const navigateToTaskPage = useCallback(() => {
    logger.system("Navigation: Task page selected");
    setCurrentPage("task");
  }, []);

  const navigateToGraphPage = useCallback((taskId: number) => {
    logger.system(`Navigation: Graph page selected for task ${taskId}`);
    setCurrentTaskId(taskId);
    setCurrentPage("graph");
  }, []);

  const navigateToReferencePage = useCallback(() => {
    logger.system("Navigation: Reference page selected");
    setCurrentPage("reference");
  }, []);

  const navigateToToolsPage = useCallback(() => {
    logger.system("Navigation: Tools page selected");
    setCurrentPage("tools");
  }, []);

  const navigateToDeveloperPage = useCallback(() => {
    logger.system("Navigation: Developer page selected");
    setDevUnlocked(true);
    setCurrentPage("developer");
  }, []);

  const [isSyncingEngine, setIsSyncingEngine] = useState<boolean>(false);

  const syncEngineTuning = useCallback(async () => {
    setIsSyncingEngine(true);
    try {
      const res = await syncEngineTuningSettings();
      if (res.params) {
        setBatchSize(res.params.batchSize);
        setRetentionWindow(res.params.retentionWindow);
        setWorkerCount(res.params.workerCount);
        addLog(
          `Engine tuning settings synchronized: batchSize=${res.params.batchSize}, retentionWindow=${res.params.retentionWindow}s, workerCount=${res.params.workerCount} (${res.source})`,
          res.success ? "success" : "info",
          "developer",
        );
      }
    } catch (err: any) {
      addLog(
        `Failed to synchronize engine tuning: ${err?.message}`,
        "warn",
        "developer",
      );
    } finally {
      setIsSyncingEngine(false);
    }
  }, [addLog]);

  const pingBackend = useCallback(async (): Promise<boolean> => {
    setIsCheckingBackend(true);
    setBackendStatus((prev) => (prev === "online" ? "online" : "checking"));

    const result = await checkBackendHealth();

    setIsCheckingBackend(false);
    setBackendStatus(result.online ? "online" : "offline");
    setLastBackendPingTime(result.checkedAt);
    setBackendLatencyMs(result.latencyMs);

    if (result.online) {
      addLog(
        `Backend ping check: ONLINE (${result.latencyMs}ms) at ${result.url}`,
        "success",
        "network",
        { latencyMs: result.latencyMs, data: result.data },
      );
      // Synchronize engine tuning parameters whenever backend sync confirms online status
      syncEngineTuning();
    } else {
      addLog(
        `Backend ping check: OFFLINE (${result.error}) at ${result.url}`,
        "warn",
        "network",
        { error: result.error, latencyMs: result.latencyMs },
      );
    }

    return result.online;
  }, [addLog, syncEngineTuning]);

  // Periodic automatic async ping every 30 minutes (and immediate check and engine tuning sync on mount)
  useEffect(() => {
    syncEngineTuning();
    pingBackend();

    const intervalMs = getBackendPingIntervalMs();
    const intervalTimer = setInterval(() => {
      pingBackend();
      syncEngineTuning();
    }, intervalMs);

    return () => clearInterval(intervalTimer);
  }, [pingBackend, syncEngineTuning]);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        currentTaskId,
        setCurrentTaskId: (id: number) => {
          logger.system(`Current task id changed to ${id}`);
          setCurrentTaskId(id);
        },
        navigateToFilePage,
        navigateToTaskPage,
        navigateToGraphPage,
        navigateToReferencePage,
        navigateToToolsPage,
        navigateToDeveloperPage,
        files,
        selectedFileId,
        setSelectedFileId: (id: string) => {
          logger.system(`Selected dataset changed to ${id}`);
          setSelectedFileId(id);
        },
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
        setProgressBarVisible: (val: boolean) => {
          logger.system(
            `Progress bar visibility changed to ${val ? "visible" : "hidden"}`,
          );
          setProgressBarVisible(val);
        },
        toggleProgressBar,
        debugMode,
        toggleDebugMode,
        isDevAuthenticated,
        authenticateDev,
        logoutDeveloper,
        purgeClientStorage,
        batchSize,
        setBatchSize: (val: number) => {
          cookieService.set(COOKIE_KEYS.BATCH_SIZE, String(val));
          saveCachedEngineParams({
            batchSize: val,
            retentionWindow,
            workerCount,
          });
          logger.developer(`Batch size adjusted to ${val} and cached`, "info");
          setBatchSize(val);
        },
        retentionWindow,
        setRetentionWindow: (val: number) => {
          cookieService.set(COOKIE_KEYS.RETENTION_WINDOW, String(val));
          saveCachedEngineParams({
            batchSize,
            retentionWindow: val,
            workerCount,
          });
          logger.developer(
            `Retention window adjusted to ${val}s and cached`,
            "info",
          );
          setRetentionWindow(val);
        },
        workerCount,
        setWorkerCount: (val: number) => {
          cookieService.set(COOKIE_KEYS.WORKER_COUNT, String(val));
          saveCachedEngineParams({
            batchSize,
            retentionWindow,
            workerCount: val,
          });
          logger.developer(
            `Worker count adjusted to ${val} and cached`,
            "info",
          );
          setWorkerCount(val);
        },
        flushRamCache,
        logs,
        addLog,
        clearLogs,
        isFullpage,
        setIsFullpage: (val: boolean) => {
          logger.system(`Fullpage mode set to ${val ? "enabled" : "disabled"}`);
          setIsFullpage(val);
        },
        sidebarCollapsed,
        setSidebarCollapsed: (val: boolean) => {
          logger.system(
            `Sidebar collapsed state set to ${val ? "collapsed" : "expanded"}`,
          );
          setSidebarCollapsed(val);
        },
        toggleSidebar,
        devUnlocked,
        registerDevSecretClick,
        devToastMessage,
        hasProceededToTasks: files.length > 0,
        proceedToTaskMatrix: navigateToTaskPage,

        backendStatus,
        isCheckingBackend,
        lastBackendPingTime,
        backendLatencyMs,
        pingBackend,

        syncEngineTuning,
        isSyncingEngine,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
