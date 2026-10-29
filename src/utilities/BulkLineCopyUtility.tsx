/**
 * Classified as local logic because it controls component layout, interactive input clearing, sidebar toggle, drag-and-drop animation, and presentation of the live temp file. Placed in /src/utilities/BulkLineCopyUtility.tsx.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
  Download,
  PlayCircle,
  FolderOpen,
  UploadCloud,
  FileCode,
  Square,
  Sparkles,
  SlidersHorizontal,
  Save,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  ArrowDownUp,
  X,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  SearchMode,
  ExtractionOptions,
  ExtractionRequest,
  ExtractionJob,
  startExtractionJob,
  cancelExtractionJob,
  saveTempFile,
  exportTempFile,
} from "../services/extractionService";

const DEFAULT_TARGET_EXPR = "^ERROR|FATAL";
const DEFAULT_SOURCE_PATH = "C:\\logs\\massive_file.log";

export const BulkLineCopyUtility: React.FC = () => {
  const {
    files: appLoadedFiles,
    batchSize,
    setBatchSize,
    syncEngineTuning,
    isSyncingEngine,
  } = useApp();

  // Mode: File Stream vs Raw Data Paste
  const [inputMode, setInputMode] = useState<"file" | "raw">("file");

  // Input states with auto-clear defaults
  const [sourcePath, setSourcePath] = useState<string>(DEFAULT_SOURCE_PATH);
  const [hasUserEditedSource, setHasUserEditedSource] =
    useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const [rawText, setRawText] = useState<string>("");

  // Target expression with auto-clear default
  const [targetExpression, setTargetExpression] =
    useState<string>(DEFAULT_TARGET_EXPR);
  const [hasUserEditedTarget, setHasUserEditedTarget] =
    useState<boolean>(false);

  // Notepad++ Search Modes (Normal, Extended, Regular expression)
  const [searchMode, setSearchMode] = useState<SearchMode>("regex");
  const [dotMatchesNewline, setDotMatchesNewline] = useState<boolean>(false);

  // Notepad++ Matching & Marking Options
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);
  const [wrapAround, setWrapAround] = useState<boolean>(true);
  const [backwardDirection, setBackwardDirection] = useState<boolean>(false);
  const [bookmarkLine, setBookmarkLine] = useState<boolean>(false);
  const [purgeEachSearch, setPurgeEachSearch] = useState<boolean>(true);
  const [inSelection, setInSelection] = useState<boolean>(false);

  // Line slicing & Checksum controls
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [startLine, setStartLine] = useState<string>("");
  const [endLine, setEndLine] = useState<string>("");
  const [stripChecksum, setStripChecksum] = useState<boolean>(false);
  const [removeEmptyLines, setRemoveEmptyLines] = useState<boolean>(true);

  // Active Job Telemetry & Temp File State
  const [activeJob, setActiveJob] = useState<ExtractionJob>({
    jobId: "",
    status: "idle",
    statusText: "AWAITING COMMAND...",
    progressPct: 0,
    linesExtracted: 0,
    linesProcessed: 0,
    throughputMBps: "0.0 MB/s",
    elapsedSeconds: "0.00s",
    processedBytes: 0,
    totalBytes: 0,
    tempFile: {
      id: "temp_ready",
      name: "temp_extraction_stream.tmp",
      path: "%TEMP%\\DataExtractor\\temp_extraction_stream.tmp",
      sizeBytes: 0,
      totalLines: 0,
      lines: [],
    },
  });

  // UI notifications, errors & modals
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsPath, setSaveAsPath] = useState<string>(
    "C:\\logs\\extracted_final.log",
  );
  const [autoScrollTemp, setAutoScrollTemp] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tempViewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll temp file viewer during live extraction
  useEffect(() => {
    if (
      autoScrollTemp &&
      tempViewportRef.current &&
      activeJob.status === "running"
    ) {
      tempViewportRef.current.scrollTop = tempViewportRef.current.scrollHeight;
    }
  }, [activeJob.tempFile.lines.length, activeJob.status, autoScrollTemp]);

  // Click / Focus handler: Clears default value & active error on click
  const handleTargetFocus = () => {
    setError(null);
    if (!hasUserEditedTarget && targetExpression === DEFAULT_TARGET_EXPR) {
      setTargetExpression("");
      setHasUserEditedTarget(true);
    }
  };

  const handleSourceFocus = () => {
    setError(null);
    if (!hasUserEditedSource && sourcePath === DEFAULT_SOURCE_PATH) {
      setSourcePath("");
      setHasUserEditedSource(true);
    }
  };

  // Preload sample log data
  const handleLoadSampleData = () => {
    setInputMode("raw");
    const sample = [
      "2026-10-29T03:50:00.100Z [INFO] Host memory pool initialized: 32768 MB OK",
      "2026-10-29T03:50:01.420Z [DEBUG] Socket 0.0.0.0:3000 listening for multi-GB streaming pipe",
      "$GNGGA,141105.00,3723.2475,N,12202.1195,W,1,08,1.0,9.0,M,-34.0,M,,*43",
      "2026-10-29T03:50:02.012Z [WARN] Buffer backlog approaching 80% saturation",
      "2026-10-29T03:50:02.775Z [ERROR] Primary sensor bridge timed out after 3000ms idle",
      "$GNRMC,141105.00,A,3723.2475,N,12202.1195,W,0.05,309.62,171026,,,A*7B",
      "2026-10-29T03:50:03.119Z [FATAL] Critical bus failure at physical address 0xDEADBEEF",
      "$GPGSV,3,1,12,01,40,085,45,02,30,120,42,03,20,180,38,04,15,240,35*75",
      "2026-10-29T03:50:04.008Z [INFO] System heartbeat verified by watchdog",
      "2026-10-29T03:50:04.912Z [ERROR] CRC parity check mismatch on incoming telemetry packet #994",
      "$GNGGA,141106.00,3723.2476,N,12202.1196,W,1,09,0.9,9.2,M,-34.0,M,,*41",
      "2026-10-29T03:50:05.510Z [WARN] Thermal threshold reaching 78C on core 3",
      "2026-10-29T03:50:05.890Z [FATAL] Emergency shutdown triggered by thermal supervisor",
      "2026-10-29T03:50:06.000Z [INFO] Core dump written to /var/crash/dump.log. Total bytes: 14820",
    ].join("\n");
    setRawText(sample);
    setTargetExpression("^.*(ERROR|FATAL).*");
    setSearchMode("regex");
    setError(null);
  };

  // Handle file chosen via native browse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setInputMode("file");
    const winPath = `C:\\logs\\${file.name}`;
    setSourcePath(winPath);
    setHasUserEditedSource(true);
    setError(null);
    const tempName = `temp_${file.name.replace(/\.[^/.]+$/, "")}_extract.tmp`;
    setActiveJob((prev) => ({
      ...prev,
      totalBytes: file.size,
      status: "idle",
      statusText: `READY (${formatBytes(file.size)})`,
      tempFile: {
        ...prev.tempFile,
        name: tempName,
        path: `%TEMP%\\DataExtractor\\${tempName}`,
      },
    }));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Execute extraction engine
  const handleExecuteEngine = async () => {
    setError(null);
    setSaveSuccessMsg(null);

    if (inputMode === "file" && !selectedFile && !sourcePath.trim()) {
      setError(
        "Please select or specify a source log file (e.g., massive_file.log) to execute.",
      );
      return;
    }
    if (inputMode === "raw" && !rawText.trim()) {
      setError('Please paste raw text or click "Sample Data" to process.');
      return;
    }

    const options: ExtractionOptions = {
      matchCase,
      matchWholeWord,
      wrapAround,
      bookmarkLine,
      purgeEachSearch,
      backwardDirection,
      inSelection,
      dotMatchesNewline,
      stripChecksum,
      removeEmptyLines,
      startLine: parseInt(startLine, 10) || undefined,
      endLine: parseInt(endLine, 10) || undefined,
    };

    const request: ExtractionRequest = {
      sourceType:
        inputMode === "file"
          ? selectedFile
            ? "file_upload"
            : "file_path"
          : "raw_text",
      sourcePath: sourcePath.trim(),
      file: selectedFile,
      rawText: rawText,
      targetExpression,
      searchMode,
      batchSize,
      options,
    };

    try {
      const finalJob = await startExtractionJob(request, (updated) => {
        setActiveJob(updated);
      });
      setActiveJob(finalJob);
    } catch (err: any) {
      setError(err?.message || "Extraction execution failed");
    }
  };

  const handleCancel = async () => {
    if (activeJob.jobId) {
      await cancelExtractionJob(activeJob.jobId);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSourcePath(DEFAULT_SOURCE_PATH);
    setHasUserEditedSource(false);
    setRawText("");
    setTargetExpression(DEFAULT_TARGET_EXPR);
    setHasUserEditedTarget(false);
    setSearchMode("regex");
    setMatchCase(false);
    setMatchWholeWord(false);
    setWrapAround(true);
    setBookmarkLine(false);
    setPurgeEachSearch(true);
    setStartLine("");
    setEndLine("");
    setStripChecksum(false);
    setRemoveEmptyLines(true);
    setError(null);
    setSaveSuccessMsg(null);
    setActiveJob({
      jobId: "",
      status: "idle",
      statusText: "AWAITING COMMAND...",
      progressPct: 0,
      linesExtracted: 0,
      linesProcessed: 0,
      throughputMBps: "0.0 MB/s",
      elapsedSeconds: "0.00s",
      processedBytes: 0,
      totalBytes: 0,
      tempFile: {
        id: "temp_ready",
        name: "temp_extraction_stream.tmp",
        path: "%TEMP%\\DataExtractor\\temp_extraction_stream.tmp",
        sizeBytes: 0,
        totalLines: 0,
        lines: [],
      },
    });
  };

  // Sidebar Actions: Copy, Save, Save As, Export
  const handleCopyMarked = () => {
    const content =
      activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n");
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickSave = async () => {
    const content =
      activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n");
    const defaultDest = sourcePath
      ? sourcePath.replace(/\.[^/.]+$/, "") + "_extracted.log"
      : "C:\\logs\\extracted_final.log";

    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: defaultDest,
      format: "log",
      content,
    });

    if (res.success) {
      setSaveSuccessMsg(`File committed successfully to ${res.filePath}`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    }
  };

  const handleSaveAsSubmit = async () => {
    const content =
      activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n");
    const ext = saveAsPath.split(".").pop() || "log";
    const fmt = ext === "csv" ? "csv" : ext === "txt" ? "txt" : "log";

    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: saveAsPath,
      format: fmt as any,
      content,
    });

    setShowSaveAsModal(false);
    if (res.success) {
      setSaveSuccessMsg(`Saved as ${res.filePath}`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    }
  };

  const handleClearTemp = () => {
    setActiveJob((prev) => ({
      ...prev,
      linesExtracted: 0,
      tempFile: {
        ...prev.tempFile,
        sizeBytes: 0,
        totalLines: 0,
        lines: [],
        fullContent: "",
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Info Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-lg font-bold text-[#24211D] dark:text-slate-100">
                Data Extractor Pro
              </h3>
              <div className="relative group inline-flex items-center">
                <button
                  type="button"
                  className="w-5 h-5 rounded-md text-[#736E65] dark:text-slate-400 hover:text-[#2563EB] hover:bg-[#EFEAE1] dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Utility Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 shadow-xl text-xs text-[#24211D] dark:text-slate-200 pointer-events-none">
                  <div className="font-semibold text-[#2563EB] mb-1">
                    Backend Extraction Engine
                  </div>
                  <p className="text-[11px] text-[#736E65] dark:text-slate-300 leading-relaxed">
                    Designed to handle massive gigabyte log files that freeze
                    desktop tools like Notepad++. Creates a live backend temp
                    file, streams live telemetry, and lets you save, bookmark,
                    and export extracted data in real time.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1">
              Ultra-fast backend extraction engine with live temp file
              streaming, Notepad++ search modes, and instant export.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Preload sample error and GNSS logs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Data</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#2563EB] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div className="mt-4 pt-4 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#EFEAE1]/70 dark:bg-slate-950/60 border border-[#E6E1D6] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                inputMode === "file"
                  ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-xs font-semibold"
                  : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Backend File Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("raw")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                inputMode === "raw"
                  ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-xs font-semibold"
                  : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Paste Raw Data</span>
            </button>
          </div>

          {appLoadedFiles.length > 0 && (
            <div className="text-xs text-[#736E65] dark:text-slate-400 flex items-center space-x-2">
              <span className="font-mono text-[11px]">Ingested:</span>
              <button
                type="button"
                onClick={() => {
                  const target = appLoadedFiles[0];
                  setSourcePath(`C:\\logs\\${target.filename}`);
                  setHasUserEditedSource(true);
                  setError(null);
                }}
                className="text-[#2563EB] dark:text-blue-400 hover:underline font-semibold cursor-pointer truncate max-w-[200px]"
              >
                Use {appLoadedFiles[0].filename}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Save Success Notice Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center space-x-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE: 2-Column Split (Configuration + Live Temp File Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols): Backend Configuration & Execution Telemetry */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Backend Configuration (Output Destination section removed per instruction) */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
              <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                1. Backend Configuration
              </h4>
              <div className="flex items-center space-x-1.5 text-[11px] font-mono bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-2.5 py-1 rounded-lg text-blue-700 dark:text-blue-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>FastAPI Engine (≤ 5 GB) · Global Batch Size:</span>
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  {batchSize} lines
                </span>
                <div className="flex items-center space-x-1 pl-1">
                  <button
                    type="button"
                    onClick={() => setBatchSize(Math.max(100, batchSize - 250))}
                    className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 flex items-center justify-center hover:bg-blue-200 cursor-pointer font-bold leading-none"
                    title="Decrease global batch size"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBatchSize(Math.min(10000, batchSize + 250))
                    }
                    className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 flex items-center justify-center hover:bg-blue-200 cursor-pointer font-bold leading-none"
                    title="Increase global batch size"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => syncEngineTuning()}
                    disabled={isSyncingEngine}
                    className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 flex items-center justify-center hover:bg-blue-200 cursor-pointer ml-1"
                    title="Sync global engine tuning settings from backend / cache"
                  >
                    <RefreshCw
                      className={`w-2.5 h-2.5 ${isSyncingEngine ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Source File Section (or Raw Textarea) */}
            {inputMode === "file" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Source File
                  </label>
                  {selectedFile && (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {formatBytes(selectedFile.size)} Ready
                    </span>
                  )}
                </div>

                {/* Enlargeable Drag & Drop Zone */}
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                      return;
                    setIsDraggingOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    if (
                      e.dataTransfer.files &&
                      e.dataTransfer.files.length > 0
                    ) {
                      handleFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`transition-all duration-300 ease-out rounded-xl border relative overflow-hidden ${
                    isDraggingOver
                      ? "min-h-[140px] sm:min-h-[160px] p-6 border-2 border-dashed border-[#2563EB] bg-blue-50/80 dark:bg-blue-950/40 flex flex-col items-center justify-center text-center shadow-lg ring-4 ring-blue-500/10"
                      : "min-h-[46px] p-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  }`}
                >
                  {isDraggingOver ? (
                    <div className="flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95 duration-150 pointer-events-none select-none">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center animate-bounce">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-[#2563EB] dark:text-blue-300">
                        Release to Drop Massive Log File Here
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        FastAPI backend stream processes files up to 5 GB
                        (batch: {batchSize} lines) with zero browser memory
                        strain
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center w-full space-x-2 px-2">
                      <input
                        type="text"
                        value={sourcePath}
                        onFocus={handleSourceFocus}
                        onClick={handleSourceFocus}
                        onChange={(e) => {
                          setSourcePath(e.target.value);
                          setHasUserEditedSource(true);
                          setError(null);
                        }}
                        placeholder="C:\logs\massive_file.log"
                        className="flex-1 bg-transparent border-0 text-sm font-mono text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none py-1.5 px-2"
                      />
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setSourcePath(DEFAULT_SOURCE_PATH);
                            setHasUserEditedSource(false);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          title="Clear attached file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2 rounded-xl text-sm font-medium bg-[#E9EEF5] dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#DCE4EE] dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        Browse
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Drag file over path to expand into active drop zone, or click
                  field to clear and type path.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Raw Data Buffer
                  </label>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {rawText
                      ? `${rawText.split("\n").length.toLocaleString()} lines`
                      : "Empty buffer"}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={rawText}
                  onFocus={() => setError(null)}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste multiline logs, telemetry, error dumps, or arbitrary text here..."
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] resize-y shadow-2xs"
                />
              </div>
            )}

            {/* Target Expression (With auto-clear on click / focus) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  Target Expression
                </label>
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
                  <span>Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetExpression("^ERROR|FATAL");
                      setHasUserEditedTarget(true);
                      setError(null);
                    }}
                    className="hover:text-[#2563EB] hover:underline cursor-pointer"
                  >
                    ^ERROR|FATAL
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetExpression("GGA|RMC");
                      setHasUserEditedTarget(true);
                      setError(null);
                    }}
                    className="hover:text-[#2563EB] hover:underline cursor-pointer"
                  >
                    GGA|RMC
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={targetExpression}
                onFocus={handleTargetFocus}
                onClick={handleTargetFocus}
                onChange={(e) => {
                  setTargetExpression(e.target.value);
                  setHasUserEditedTarget(true);
                  setError(null);
                }}
                placeholder="e.g., ^ERROR|FATAL"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                Click input to automatically clear default value and begin
                typing your filter pattern.
              </p>
            </div>

            {/* Notepad++ Search Mode & Options (Replicating image_10d99619.png & image_59410808.png) */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#FAF8F5]/60 dark:bg-slate-900/60 p-4 sm:p-5 space-y-4">
              {/* Notepad++ Options Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Match case</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchWholeWord}
                    onChange={(e) => setMatchWholeWord(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Match whole word only</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wrapAround}
                    onChange={(e) => setWrapAround(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Wrap around</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bookmarkLine}
                    onChange={(e) => setBookmarkLine(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Bookmark line</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={purgeEachSearch}
                    onChange={(e) => setPurgeEachSearch(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Purge for each search</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={backwardDirection}
                    onChange={(e) => setBackwardDirection(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                  />
                  <span>Backward direction</span>
                </label>
              </div>

              {/* Notepad++ Search Mode Fieldset (Matches screenshot frame) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Search Mode
                </span>
                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="notepadSearchMode"
                      value="normal"
                      checked={searchMode === "normal"}
                      onChange={() => setSearchMode("normal")}
                      className="w-4 h-4 text-[#2563EB] accent-[#2563EB] cursor-pointer"
                    />
                    <span className="font-medium">Normal</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="notepadSearchMode"
                      value="extended"
                      checked={searchMode === "extended"}
                      onChange={() => setSearchMode("extended")}
                      className="w-4 h-4 text-[#2563EB] accent-[#2563EB] cursor-pointer"
                    />
                    <span className="font-medium">
                      Extended (\n, \r, \t, \0, \x...)
                    </span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="notepadSearchMode"
                        value="regex"
                        checked={searchMode === "regex"}
                        onChange={() => setSearchMode("regex")}
                        className="w-4 h-4 text-[#2563EB] accent-[#2563EB] cursor-pointer"
                      />
                      <span className="font-medium">Regular expression</span>
                    </label>
                    {searchMode === "regex" && (
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none pl-2 border-l border-slate-300 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={dotMatchesNewline}
                          onChange={(e) =>
                            setDotMatchesNewline(e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded text-[#2563EB] accent-[#2563EB] cursor-pointer"
                        />
                        <span>. matches newline</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Slicing & Checksum Advanced Controls */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-[#2563EB] dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {showAdvanced
                      ? "Hide Line Range Options"
                      : "Line Range Slicing & Checksum Stripping"}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Start Line
                      </label>
                      <input
                        type="text"
                        value={startLine}
                        onChange={(e) => setStartLine(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        End Line
                      </label>
                      <input
                        type="text"
                        value={endLine}
                        onChange={(e) => setEndLine(e.target.value)}
                        placeholder="Unlimited"
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stripChecksum}
                          onChange={(e) => setStripChecksum(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Strip Checksums (*XX)</span>
                      </label>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={removeEmptyLines}
                          onChange={(e) =>
                            setRemoveEmptyLines(e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Remove Empty Lines</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Execution & Telemetry (Matches image_8cd3d977.png) */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              2. Execution & Telemetry
            </h4>

            {/* Initialize / Cancel Button */}
            <div className="pt-1">
              {activeJob.status === "running" ? (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-white bg-blue-600 dark:bg-blue-600 flex items-center justify-center space-x-2 shadow-md cursor-wait opacity-90"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      Streaming to Backend Temp File ({activeJob.progressPct}%)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="py-3.5 px-5 rounded-xl font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteEngine}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-all duration-150 flex items-center justify-center space-x-2.5 shadow-md shadow-blue-500/20 cursor-pointer text-sm sm:text-base group"
                >
                  <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Initialize Extraction Engine</span>
                </button>
              )}
            </div>

            {/* Status & Progress Bar (Matches image_8cd3d977.png) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-400 dark:text-slate-500 tracking-wider">
                  {activeJob.statusText}
                </span>
                <span className="text-[#2563EB] dark:text-blue-400 text-base sm:text-lg">
                  {activeJob.progressPct}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ease-out ${
                    activeJob.status === "completed"
                      ? "bg-emerald-500"
                      : activeJob.status === "error"
                        ? "bg-rose-500"
                        : "bg-[#2563EB]"
                  }`}
                  style={{ width: `${activeJob.progressPct}%` }}
                />
              </div>
            </div>

            {/* Telemetry Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center shadow-2xs">
                <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  LINES EXTRACTED
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-100 mt-1">
                  {activeJob.linesExtracted.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center shadow-2xs">
                <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  LINES PROCESSED
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-100 mt-1">
                  {activeJob.linesProcessed.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center shadow-2xs">
                <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  THROUGHPUT
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#2563EB] dark:text-blue-400 mt-1">
                  {activeJob.throughputMBps}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center shadow-2xs">
                <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  EXECUTION TIME
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-100 mt-1">
                  {activeJob.elapsedSeconds}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Live Temp File Sidebar Display (Per Instruction 5 & 6) */}
        <div className="lg:col-span-5 bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs sticky top-4">
          {/* Sidebar Header: Live Temp File Title & Status */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
            <div className="flex items-center space-x-2 min-w-0">
              <FileDown className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  Live Temp File Display
                </h4>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {activeJob.tempFile.name}
                </div>
              </div>
            </div>

            {/* Live streaming status badge */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {activeJob.status === "running" ? (
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 animate-pulse border border-blue-200 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>LIVE TEMP STREAM</span>
                </span>
              ) : activeJob.status === "completed" ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" />
                  <span>SYNCED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  AWAITING EXEC
                </span>
              )}
            </div>
          </div>

          {/* Temp File Location Meta Card */}
          <div className="bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <span>Temp Buffer:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {formatBytes(activeJob.tempFile.sizeBytes)} (
                {activeJob.tempFile.totalLines.toLocaleString()} lines)
              </span>
            </div>
            <div
              className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate"
              title={activeJob.tempFile.path}
            >
              Path: {activeJob.tempFile.path}
            </div>
          </div>

          {/* Action Toolbar on the Sidebar (Save, Save As, Export, Copy, Clear) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickSave}
              disabled={activeJob.tempFile.lines.length === 0}
              className="flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Quick save to default destination"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const defaultName = sourcePath
                  ? sourcePath.replace(/\.[^/.]+$/, "") + "_filtered.log"
                  : "C:\\logs\\extracted.log";
                setSaveAsPath(defaultName);
                setShowSaveAsModal(true);
              }}
              disabled={activeJob.tempFile.lines.length === 0}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Save as custom path/file"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Save As...</span>
            </button>

            {/* Export Dropdown / Quick exports */}
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => exportTempFile(activeJob, "log")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] hover:bg-slate-50 border-r border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export as .log"
              >
                .log
              </button>
              <button
                type="button"
                onClick={() => exportTempFile(activeJob, "txt")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] hover:bg-slate-50 border-r border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export as .txt"
              >
                .txt
              </button>
              <button
                type="button"
                onClick={() => exportTempFile(activeJob, "csv")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export as .csv"
              >
                .csv
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyMarked}
              disabled={activeJob.tempFile.lines.length === 0}
              className="p-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy Marked Text (Notepad++)"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleClearTemp}
              disabled={activeJob.tempFile.lines.length === 0}
              className="p-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear temp file marks"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Content Stream Viewport */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Temp Stream Viewport:</span>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScrollTemp}
                  onChange={(e) => setAutoScrollTemp(e.target.checked)}
                  className="w-3 h-3 rounded text-[#2563EB] accent-[#2563EB]"
                />
                <span>Auto-scroll</span>
              </label>
            </div>

            <div
              ref={tempViewportRef}
              className="h-[360px] sm:h-[420px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 font-mono text-xs overflow-y-auto overflow-x-auto shadow-inner space-y-0.5"
            >
              {activeJob.tempFile.lines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-600 select-none">
                  <FileText className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
                  <p className="text-xs font-semibold">
                    Backend Temp File Empty
                  </p>
                  <p className="text-[11px] mt-1 max-w-[240px]">
                    Hit "Initialize Extraction Engine" to stream filtered lines
                    directly into this temp file.
                  </p>
                </div>
              ) : (
                activeJob.tempFile.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-slate-800 dark:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-900 px-1 rounded select-text"
                  >
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none w-8 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre break-all leading-tight">
                      {line}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SAVE AS MODAL */}
      {showSaveAsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Save className="w-5 h-5 text-[#2563EB]" />
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Save Extracted File As
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Target Save Path & Filename
              </label>
              <input
                type="text"
                value={saveAsPath}
                onChange={(e) => setSaveAsPath(e.target.value)}
                placeholder="C:\logs\extracted_final.log"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
              />
              <p className="text-[11px] text-slate-400 font-mono">
                Specify destination path. Supports .log, .txt, or .csv
                extension.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#EFEAE1] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#E5DFD4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shadow-sm"
              >
                Save & Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
