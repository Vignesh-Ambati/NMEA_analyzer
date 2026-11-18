/**
 * Classified as local logic because it controls component layout, right-side options drawer, interactive input state, filter configuration, live streaming presentation, and user output actions. Placed in /src/utilities/BulkLineCopyUtility.tsx.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  Copy,
  Check,
  RotateCcw,
  Play,
  Square,
  UploadCloud,
  SlidersHorizontal,
  Save,
  Trash2,
  X,
  Search,
  Terminal,
  Download,
  ChevronDown,
  Info,
  FolderOpen,
  FileCode,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { logger } from "../services/logger";
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

interface PresetItem {
  id: string;
  label: string;
  pattern: string;
  mode: SearchMode;
  description: string;
}

const QUICK_PRESETS: PresetItem[] = [
  {
    id: "gpgga",
    label: "$GPGGA",
    pattern: "^\\$(GP|GN|GL|GA)GGA",
    mode: "regex",
    description: "GNSS 3D fix & altitude position",
  },
  {
    id: "gprmc",
    label: "$GPRMC",
    pattern: "^\\$(GP|GN|GL|GA)RMC",
    mode: "regex",
    description: "Minimum navigation telemetry",
  },
  {
    id: "gpgsv",
    label: "$GPGSV",
    pattern: "^\\$(GP|GN|GL|GA)GSV",
    mode: "regex",
    description: "Satellites in view & SNR values",
  },
  {
    id: "errors",
    label: "Errors",
    pattern: "(ERROR|ERR|FATAL|EXCEPTION)",
    mode: "regex",
    description: "Error & fatal diagnostic lines",
  },
  {
    id: "warnings",
    label: "Warnings",
    pattern: "(WARN|WARNING)",
    mode: "regex",
    description: "Warning and threshold alerts",
  },
];

const INITIAL_JOB_STATE: ExtractionJob = {
  jobId: "",
  status: "idle",
  statusText: "Ready",
  progressPct: 0,
  linesExtracted: 0,
  linesProcessed: 0,
  throughputMBps: "0.0 MB/s",
  elapsedSeconds: "0.00s",
  processedBytes: 0,
  totalBytes: 0,
  tempFile: {
    id: "temp_ready",
    name: "extracted_stream.log",
    path: "Browser::MemoryBuffer::extracted_stream.log",
    sizeBytes: 0,
    totalLines: 0,
    lines: [],
  },
};

export const BulkLineCopyUtility: React.FC = () => {
  const { batchSize, showToast } = useApp();

  // Layout controls: clean collapsible right-hand drawer & text editor toggle
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const [showRawEditor, setShowRawEditor] = useState<boolean>(true);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Input source mode & content
  const [inputMode, setInputMode] = useState<"file" | "raw">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>("");

  // Search pattern & mode
  const [targetExpression, setTargetExpression] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("regex");
  const [dotMatchesNewline, setDotMatchesNewline] = useState<boolean>(false);

  // Advanced rules
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);
  const [bookmarkLine, setBookmarkLine] = useState<boolean>(false);
  const [stripChecksum, setStripChecksum] = useState<boolean>(false);
  const [removeEmptyLines, setRemoveEmptyLines] = useState<boolean>(true);
  const [startLine, setStartLine] = useState<string>("");
  const [endLine, setEndLine] = useState<string>("");

  // Job & preview state
  const [activeJob, setActiveJob] = useState<ExtractionJob>(INITIAL_JOB_STATE);
  const [copied, setCopied] = useState<boolean>(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsName, setSaveAsName] = useState<string>("");
  const [autoScrollTemp, setAutoScrollTemp] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tempViewportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll live output stream while running
  useEffect(() => {
    if (
      autoScrollTemp &&
      tempViewportRef.current &&
      activeJob.status === "running"
    ) {
      tempViewportRef.current.scrollTop = tempViewportRef.current.scrollHeight;
    }
  }, [activeJob.tempFile.lines.length, activeJob.status, autoScrollTemp]);

  // Close export popover when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Count active non-default options for quiet status feedback
  const activeOptionCount = useMemo(() => {
    let count = 0;
    if (matchCase) count++;
    if (matchWholeWord) count++;
    if (stripChecksum) count++;
    if (!removeEmptyLines) count++;
    if (bookmarkLine) count++;
    if (dotMatchesNewline && searchMode === "regex") count++;
    if (startLine.trim()) count++;
    if (endLine.trim()) count++;
    return count;
  }, [
    matchCase,
    matchWholeWord,
    stripChecksum,
    removeEmptyLines,
    bookmarkLine,
    dotMatchesNewline,
    searchMode,
    startLine,
    endLine,
  ]);

  // Regex live syntax validation
  const regexStatus = useMemo(() => {
    if (!targetExpression.trim() || searchMode !== "regex") return null;
    try {
      new RegExp(targetExpression, matchCase ? "" : "i");
      return { valid: true, message: "Valid regex" };
    } catch (err: any) {
      return { valid: false, message: err?.message || "Invalid regex" };
    }
  }, [targetExpression, searchMode, matchCase]);

  const rawLineCount = useMemo(() => {
    if (!rawText) return 0;
    return rawText.split(/\r?\n/).length;
  }, [rawText]);

  const handleToggleRightPanel = () => {
    const next = !showRightPanel;
    setShowRightPanel(next);
    logger.developer("Toggled Data Extractor Pro options sidebar", "info", {
      open: next,
    });
  };

  const handleToggleRawEditor = () => {
    const next = !showRawEditor;
    setShowRawEditor(next);
    logger.developer("Toggled raw input editor", "info", { open: next });
  };

  const handleModeChange = (mode: "file" | "raw") => {
    setInputMode(mode);
    if (mode === "raw") {
      setShowRawEditor(true);
    }
    logger.developer("Switched extraction input mode", "info", { mode });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setInputMode("file");
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const outputName = `${baseName}_extracted.log`;

    setActiveJob((prev) => ({
      ...prev,
      totalBytes: file.size,
      status: "idle",
      statusText: "Ready",
      progressPct: 0,
      linesExtracted: 0,
      linesProcessed: 0,
      tempFile: {
        ...prev.tempFile,
        name: outputName,
        path: `Browser::MemoryBuffer::${outputName}`,
        lines: [],
        sizeBytes: 0,
        totalLines: 0,
        blob: undefined,
      },
    }));

    logger.ingestion("Loaded file in Data Extractor Pro", "info", {
      fileName: file.name,
      fileSize: file.size,
    });
    showToast(`Loaded ${file.name} (${formatBytes(file.size)})`, "info", 1800);
  };

  const handleClearFile = () => {
    const prevName = selectedFile?.name;
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setActiveJob(INITIAL_JOB_STATE);
    logger.ingestion("Cleared selected file in Data Extractor Pro", "info", {
      previousFile: prevName,
    });
  };

  const handleApplyPreset = (preset: PresetItem) => {
    setTargetExpression(preset.pattern);
    setSearchMode(preset.mode);
    logger.developer("Applied extraction filter preset", "info", {
      presetId: preset.id,
      pattern: preset.pattern,
      mode: preset.mode,
    });
    showToast(`Preset: ${preset.label}`, "info", 1400);
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    logger.developer("Changed search mode", "info", { searchMode: mode });
  };

  const handleExecuteEngine = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (inputMode === "file" && !selectedFile) {
      showToast("Drop or browse a source file first.", "error", 2200);
      logger.developer("Extraction skipped: no file selected", "warn");
      return;
    }
    if (inputMode === "raw" && !rawText.trim()) {
      showToast("Paste or type text to extract lines from.", "error", 2200);
      logger.developer("Extraction skipped: raw text empty", "warn");
      return;
    }
    if (regexStatus && !regexStatus.valid) {
      showToast("Invalid regular expression syntax.", "error", 2400);
      logger.developer("Extraction aborted: invalid regex", "warn", {
        targetExpression,
      });
      return;
    }

    const options: ExtractionOptions = {
      matchCase,
      matchWholeWord,
      wrapAround: true,
      bookmarkLine,
      purgeEachSearch: true,
      backwardDirection: false,
      inSelection: false,
      dotMatchesNewline,
      stripChecksum,
      removeEmptyLines,
      startLine: parseInt(startLine, 10) || undefined,
      endLine: parseInt(endLine, 10) || undefined,
    };

    const request: ExtractionRequest = {
      sourceType: inputMode === "file" ? "file_upload" : "raw_text",
      sourcePath: selectedFile ? selectedFile.name : "raw_buffer.log",
      file: inputMode === "file" ? selectedFile : null,
      rawText: inputMode === "raw" ? rawText : "",
      targetExpression,
      searchMode,
      batchSize,
      options,
    };

    logger.developer("Started browser extraction worker", "info", {
      sourceType: request.sourceType,
      fileName: selectedFile?.name,
      targetExpression,
      searchMode,
      options,
    });

    try {
      showToast("Extracting matching lines...", "info", 1400);
      const finalJob = await startExtractionJob(request, (updated) => {
        setActiveJob(updated);
      });
      setActiveJob(finalJob);

      if (finalJob.status === "completed") {
        if (inputMode === "raw" && finalJob.linesExtracted > 0) {
          setShowRawEditor(false);
        }
        logger.developer("Extraction completed", "success", {
          extracted: finalJob.linesExtracted,
          processed: finalJob.linesProcessed,
          throughput: finalJob.throughputMBps,
          duration: finalJob.elapsedSeconds,
        });
        showToast(
          `Extracted ${finalJob.linesExtracted.toLocaleString()} matching lines`,
          "success",
          2400,
        );
      }
    } catch (err: any) {
      logger.developer("Extraction failed", "error", {
        error: err?.message,
      });
      showToast(err?.message || "Extraction failed", "error", 3000);
    }
  };

  const handleCancel = async () => {
    if (activeJob.jobId) {
      logger.developer("Cancelled extraction job", "warn", {
        jobId: activeJob.jobId,
      });
      await cancelExtractionJob(activeJob.jobId);
      setActiveJob((prev) => ({
        ...prev,
        status: "cancelled",
        statusText: "Cancelled",
      }));
      showToast("Extraction cancelled", "warn", 1800);
    }
  };

  const handleReset = () => {
    if (activeJob.status === "running" && activeJob.jobId) {
      cancelExtractionJob(activeJob.jobId);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setRawText("");
    setShowRawEditor(true);
    setTargetExpression("");
    setSearchMode("regex");
    setMatchCase(false);
    setMatchWholeWord(false);
    setDotMatchesNewline(false);
    setBookmarkLine(false);
    setStartLine("");
    setEndLine("");
    setStripChecksum(false);
    setRemoveEmptyLines(true);
    setShowExportMenu(false);
    setActiveJob(INITIAL_JOB_STATE);

    logger.developer("Reset Data Extractor Pro", "info");
    showToast("Workspace reset", "info", 1400);
  };

  const hasOutput =
    activeJob.tempFile.lines.length > 0 ||
    (activeJob.tempFile.blob ? activeJob.tempFile.blob.size > 0 : false);

  const handleCopyMarked = async () => {
    let content = activeJob.tempFile.fullContent;
    if (!content && activeJob.tempFile.blob) {
      try {
        content = await activeJob.tempFile.blob.text();
      } catch {
        content = activeJob.tempFile.lines.join("\n");
      }
    }
    if (!content) {
      content = activeJob.tempFile.lines.join("\n");
    }

    if (!content) {
      showToast("Output is empty", "warn", 1500);
      return;
    }

    await navigator.clipboard.writeText(content);
    setCopied(true);
    logger.developer("Copied extracted lines to clipboard", "info", {
      totalLines: activeJob.linesExtracted,
      bytes: content.length,
    });
    showToast("Copied to clipboard", "success", 1800);
    setTimeout(() => setCopied(false), 1800);
  };

  const getSuggestedFilename = (ext = "log") => {
    if (selectedFile) {
      return `${selectedFile.name.replace(/\.[^/.]+$/, "")}_extracted.${ext}`;
    }
    return `extracted_output.${ext}`;
  };

  const handleQuickSave = async () => {
    if (!hasOutput) {
      showToast("Output is empty", "warn", 1500);
      return;
    }

    const defaultName = getSuggestedFilename("log");
    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: defaultName,
      format: "log",
      blob: activeJob.tempFile.blob,
      content:
        activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n"),
    });

    if (res.success) {
      logger.developer("Saved extracted file", "success", {
        filePath: res.filePath,
        sizeBytes: res.sizeBytes,
      });
      showToast(`Saved ${res.filePath}`, "success", 2200);
    } else if (res.message !== "Save cancelled by user") {
      logger.developer("Save failed", "error", { message: res.message });
      showToast(res.message || "Failed to save", "error", 2600);
    }
  };

  const handleSaveAsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = saveAsName.trim() || getSuggestedFilename("log");
    const ext = cleanName.split(".").pop()?.toLowerCase();
    const fmt = ext === "csv" ? "csv" : ext === "txt" ? "txt" : "log";

    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: cleanName,
      format: fmt,
      blob: activeJob.tempFile.blob,
      content:
        activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n"),
    });

    setShowSaveAsModal(false);
    if (res.success) {
      logger.developer("Saved extracted file via Save As", "success", {
        fileName: res.filePath,
        format: fmt,
      });
      showToast(`Saved ${res.filePath}`, "success", 2200);
    } else if (res.message !== "Save cancelled by user") {
      logger.developer("Save As failed", "error", { message: res.message });
      showToast(res.message || "Failed to save", "error", 2600);
    }
  };

  const handleExport = (format: "log" | "txt" | "csv") => {
    setShowExportMenu(false);
    if (!hasOutput) {
      showToast("No extracted data to export", "warn", 1500);
      return;
    }
    const customName = getSuggestedFilename(format);
    exportTempFile(activeJob, format, customName);
    logger.developer("Exported extracted output", "info", {
      format,
      fileName: customName,
    });
    showToast(`Exported ${customName}`, "success", 1800);
  };

  const handleClearOutput = () => {
    setActiveJob((prev) => ({
      ...prev,
      status: "idle",
      statusText: "Ready",
      progressPct: 0,
      linesExtracted: 0,
      linesProcessed: 0,
      tempFile: {
        ...prev.tempFile,
        sizeBytes: 0,
        totalLines: 0,
        lines: [],
        fullContent: "",
        blob: undefined,
      },
    }));
    logger.developer("Cleared extraction output", "info");
    showToast("Output cleared", "info", 1400);
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. CLEAN HEADER (Matches Time Difference & UTC Converter style) */}
      <div className="px-5 sm:px-6 py-4 border-b border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#E05318]" />
            <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100">
              Data Extractor Pro
            </h3>
            <div className="relative group inline-flex items-center">
              <button
                type="button"
                className="w-5 h-5 rounded-md text-[#736E65] dark:text-slate-400 hover:text-[#E05318] hover:bg-[#EFEAE1] dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Data Extractor Information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 shadow-xl text-xs text-[#24211D] dark:text-slate-200 pointer-events-none">
                <div className="font-semibold text-[#E05318] mb-1">
                  In-Browser Stream Extraction
                </div>
                <p className="text-[11px] text-[#736E65] dark:text-slate-300 leading-relaxed">
                  Streams multi-gigabyte log files inside a background browser
                  worker with minimal memory usage. Leave the pattern blank to
                  copy all lines or apply regex, plain text, and line-range
                  filters.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Fast in-browser line filtering and export for large logs or pasted
            text.
          </p>
        </div>

        {/* Right Header Actions: Source Mode, Options Drawer Toggle, Reset */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="inline-flex p-0.5 rounded-xl bg-[#EFEAE1]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange("file")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                inputMode === "file"
                  ? "bg-white dark:bg-slate-800 text-[#E05318] shadow-2xs"
                  : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>File</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("raw")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                inputMode === "raw"
                  ? "bg-white dark:bg-slate-800 text-[#E05318] shadow-2xs"
                  : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleRightPanel}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              showRightPanel
                ? "bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] border-orange-200 dark:border-orange-900/50"
                : "bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border-[#E6E1D6] dark:border-slate-700"
            }`}
            title={showRightPanel ? "Hide options panel" : "Show options & presets"}
          >
            {showRightPanel ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span>
              Options{activeOptionCount > 0 ? ` (${activeOptionCount})` : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Reset workspace"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED COMMAND SEARCH BAR (Source selector + Pattern + Match Mode + Extract CTA) */}
      <form
        onSubmit={handleExecuteEngine}
        className="px-5 sm:px-6 py-3.5 border-b border-[#E6E1D6] dark:border-slate-800 bg-[#F7F4EE]/70 dark:bg-slate-900/60"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Source Chip / Trigger */}
          {inputMode === "file" ? (
            selectedFile ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 lg:max-w-[260px] shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                  title="Click to choose a different file"
                >
                  <FileText className="w-3.5 h-3.5 text-[#E05318] shrink-0" />
                  <span className="text-xs font-semibold text-[#24211D] dark:text-slate-200 group-hover:text-[#E05318] truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-[#736E65] dark:text-slate-400 shrink-0">
                    {formatBytes(selectedFile.size)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="text-[#736E65] hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer shrink-0"
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318] text-xs font-semibold text-[#24211D] dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#E05318]" />
                <span>Choose File</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleToggleRawEditor}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318] text-xs font-medium text-[#24211D] dark:text-slate-200 flex items-center justify-between gap-2 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
            >
              <span className="font-mono tabular-nums">
                {rawLineCount.toLocaleString()} lines
              </span>
              <span className="text-[#E05318] font-semibold">
                {showRawEditor ? "Hide Input" : "Edit Text"}
              </span>
            </button>
          )}

          {/* Search Pattern Input + Inline Mode Switcher */}
          <div
            className={`flex-1 flex items-center rounded-xl bg-white dark:bg-slate-950 border transition-colors min-w-0 ${
              regexStatus && !regexStatus.valid
                ? "border-rose-400 dark:border-rose-600"
                : "border-[#E6E1D6] dark:border-slate-800 focus-within:border-[#E05318]"
            }`}
          >
            <Search className="w-4 h-4 text-[#736E65] dark:text-slate-400 ml-3 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={targetExpression}
              onChange={(e) => setTargetExpression(e.target.value)}
              placeholder="Filter pattern (e.g. ^\$GPGGA, ERROR, or leave empty for all lines)..."
              className="flex-1 min-w-0 px-2.5 py-2 bg-transparent font-mono text-xs text-[#24211D] dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {targetExpression && (
              <button
                type="button"
                onClick={() => setTargetExpression("")}
                className="p-1 text-[#736E65] hover:text-rose-600 cursor-pointer shrink-0"
                title="Clear pattern"
                aria-label="Clear pattern"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Inline Mode Switcher */}
            <div className="hidden sm:flex items-center border-l border-[#E6E1D6] dark:border-slate-800 px-1.5 gap-0.5 shrink-0">
              {(["regex", "normal", "extended"] as SearchMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSearchModeChange(mode)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    searchMode === mode
                      ? "bg-[#FDF3EE] dark:bg-orange-950/50 text-[#E05318]"
                      : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
                  }`}
                >
                  {mode === "regex"
                    ? "Regex"
                    : mode === "normal"
                      ? "Text"
                      : "Escaped"}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          {activeJob.status === "running" ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop ({activeJob.progressPct}%)</span>
            </button>
          ) : (
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C74612] text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Extract</span>
            </button>
          )}
        </div>

        {/* Inline mobile mode selector & regex warning line when needed */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 empty:mt-0">
          <div className="flex sm:hidden items-center gap-1">
            {(["regex", "normal", "extended"] as SearchMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleSearchModeChange(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  searchMode === mode
                    ? "bg-[#FDF3EE] dark:bg-orange-950/50 text-[#E05318]"
                    : "text-[#736E65] dark:text-slate-400"
                }`}
              >
                {mode === "regex"
                  ? "Regex"
                  : mode === "normal"
                    ? "Text"
                    : "Escaped"}
              </button>
            ))}
          </div>

          {regexStatus && !regexStatus.valid && (
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
              {regexStatus.message}
            </span>
          )}
        </div>
      </form>

      {/* Flush 2px Progress Rail */}
      <div className="h-0.5 w-full bg-transparent overflow-hidden">
        {(activeJob.status === "running" || activeJob.progressPct > 0) && (
          <div
            className={`h-full transition-all duration-200 ease-out ${
              activeJob.status === "completed"
                ? "bg-emerald-500"
                : activeJob.status === "error"
                  ? "bg-rose-500"
                  : "bg-[#E05318]"
            }`}
            style={{ width: `${activeJob.progressPct}%` }}
          />
        )}
      </div>

      {/* 3. MAIN WORKSPACE + OPTIONAL HIDEABLE RIGHT SIDEBAR */}
      <div className="flex flex-col lg:flex-row min-h-[540px]">
        {/* CENTER WORKSPACE */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-950">
          {/* Collapsible Raw Text Editor (Text mode only) */}
          {inputMode === "raw" && showRawEditor && (
            <div className="border-b border-[#E6E1D6] dark:border-slate-800 bg-[#FAF8F5]/50 dark:bg-slate-900/40">
              <div className="px-5 py-2 flex items-center justify-between border-b border-[#E6E1D6]/60 dark:border-slate-800/70">
                <span className="text-xs font-medium text-[#736E65] dark:text-slate-400">
                  Source Text
                </span>
                <div className="flex items-center gap-3">
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => setRawText("")}
                      className="text-xs text-[#736E65] hover:text-rose-600 dark:text-slate-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleRawEditor}
                    className="text-xs text-[#736E65] hover:text-[#24211D] dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
              </div>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste multiline logs, NMEA sentences, or raw text here..."
                className="w-full px-5 py-3 bg-transparent font-mono text-xs text-[#24211D] dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-y"
              />
            </div>
          )}

          {/* Slim Output Toolbar & Inline Tabular Metrics */}
          <div className="px-5 py-2.5 border-b border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5]/50 dark:bg-slate-900/30">
            {/* Left: Quiet inline metrics */}
            <div className="flex flex-wrap items-center divide-x divide-[#E6E1D6] dark:divide-slate-800 text-xs">
              <div className="pr-3">
                <span className="text-[#736E65] dark:text-slate-400 mr-1.5">
                  Matched
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#24211D] dark:text-slate-100">
                  {activeJob.linesExtracted.toLocaleString()}
                </span>
              </div>
              <div className="px-3">
                <span className="text-[#736E65] dark:text-slate-400 mr-1.5">
                  Scanned
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#24211D] dark:text-slate-100">
                  {activeJob.linesProcessed.toLocaleString()}
                </span>
              </div>
              <div className="px-3 hidden sm:block">
                <span className="text-[#736E65] dark:text-slate-400 mr-1.5">
                  Speed
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#E05318]">
                  {activeJob.throughputMBps}
                </span>
              </div>
              <div className="pl-3">
                <span className="text-[#736E65] dark:text-slate-400 mr-1.5">
                  Time
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#24211D] dark:text-slate-100">
                  {activeJob.elapsedSeconds}
                </span>
              </div>
            </div>

            {/* Right: Output Utilities */}
            <div className="flex items-center gap-1.5">
              <label className="hidden md:flex items-center gap-1.5 text-xs text-[#736E65] dark:text-slate-400 mr-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScrollTemp}
                  onChange={(e) => setAutoScrollTemp(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#E05318]"
                />
                <span>Auto-scroll</span>
              </label>

              <button
                type="button"
                onClick={handleCopyMarked}
                disabled={!hasOutput}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:border-[#E05318]/60 border border-[#E6E1D6] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickSave}
                disabled={!hasOutput}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:border-[#E05318]/60 border border-[#E6E1D6] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaveAsName(getSuggestedFilename("log"));
                  setShowSaveAsModal(true);
                }}
                disabled={!hasOutput}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:border-[#E05318]/60 border border-[#E6E1D6] dark:border-slate-700 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 hidden sm:inline-flex"
              >
                Save As
              </button>

              {/* Compact Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  disabled={!hasOutput}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:border-[#E05318]/60 border border-[#E6E1D6] dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => handleExport("log")}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono text-[#24211D] dark:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Save as .log
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("txt")}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono text-[#24211D] dark:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Save as .txt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("csv")}
                      className="w-full text-left px-3 py-1.5 text-xs font-mono text-[#24211D] dark:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Save as .csv
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleClearOutput}
                disabled={!hasOutput}
                className="p-1.5 rounded-lg text-[#736E65] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Clear output"
                aria-label="Clear output"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Output / Dropzone Canvas */}
          <div
            ref={tempViewportRef}
            onDragEnter={(e) => {
              if (inputMode !== "file") return;
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(true);
            }}
            onDragOver={(e) => {
              if (inputMode !== "file") return;
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              if (inputMode !== "file") return;
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDraggingOver(false);
            }}
            onDrop={(e) => {
              if (inputMode !== "file") return;
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelected(e.dataTransfer.files[0]);
              }
            }}
            className={`flex-1 min-h-[440px] max-h-[580px] overflow-auto font-mono text-xs transition-colors ${
              isDraggingOver
                ? "bg-orange-50/60 dark:bg-orange-950/20 ring-2 ring-inset ring-[#E05318]"
                : "bg-white dark:bg-slate-950"
            }`}
          >
            {isDraggingOver ? (
              <div className="h-full min-h-[440px] flex flex-col items-center justify-center text-center px-6 py-12 pointer-events-none select-none font-sans">
                <UploadCloud className="w-9 h-9 text-[#E05318] mb-3" />
                <p className="text-sm font-semibold text-[#24211D] dark:text-slate-100">
                  Release to load file
                </p>
                <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1">
                  Streamed locally in 8 MB slices
                </p>
              </div>
            ) : activeJob.tempFile.lines.length === 0 ? (
              <div className="h-full min-h-[440px] flex flex-col items-center justify-center text-center px-6 py-12 select-none font-sans">
                {inputMode === "file" && !selectedFile ? (
                  <>
                    <UploadCloud className="w-8 h-8 text-[#B5AEA4] dark:text-slate-700 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-[#24211D] dark:text-slate-200">
                      Drop a log file anywhere here
                    </p>
                    <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                      Supports .log, .nmea, .txt, and .csv files at multi-GB scale
                      without leaving your browser.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:bg-[#E5DFD4] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Browse Computer
                    </button>
                  </>
                ) : (
                  <>
                    <Terminal className="w-8 h-8 text-[#B5AEA4] dark:text-slate-700 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-[#24211D] dark:text-slate-200">
                      {activeJob.status === "completed"
                        ? "No matching lines found"
                        : selectedFile
                          ? `${selectedFile.name} ready`
                          : "Ready to extract"}
                    </p>
                    <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                      {activeJob.status === "completed"
                        ? "Try loosening your pattern or adjusting options in the sidebar."
                        : "Enter a filter pattern above or leave it blank, then click Extract."}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="py-2">
                {activeJob.tempFile.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-stretch hover:bg-[#F5F2EB]/80 dark:hover:bg-slate-900/70 transition-colors select-text"
                  >
                    <span className="w-12 sm:w-14 shrink-0 px-3 py-1 text-right text-[11px] tabular-nums text-[#9C958B] dark:text-slate-600 border-r border-[#E6E1D6]/70 dark:border-slate-800/80 select-none">
                      {idx + 1}
                    </span>
                    <span className="px-4 py-1 whitespace-pre break-all leading-relaxed text-[#24211D] dark:text-slate-200">
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiet Preview Footer when partial preview is truncated */}
          {activeJob.linesExtracted > activeJob.tempFile.lines.length && (
            <div className="px-5 py-2 border-t border-[#E6E1D6] dark:border-slate-800 text-[11px] text-[#736E65] dark:text-slate-400 flex items-center justify-between bg-[#FAF8F5]/60 dark:bg-slate-900/40">
              <span>
                Showing first {activeJob.tempFile.lines.length.toLocaleString()} of{" "}
                {activeJob.linesExtracted.toLocaleString()} matched lines
              </span>
              <span className="font-mono tabular-nums">
                Full {formatBytes(activeJob.tempFile.sizeBytes)} ready for Save
                / Export
              </span>
            </div>
          )}
        </div>

        {/* HIDEABLE RIGHT OPTIONS & PRESETS SIDEBAR */}
        {showRightPanel && (
          <aside className="w-full lg:w-[290px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#E6E1D6] dark:border-slate-800 bg-[#F7F4EE]/70 dark:bg-slate-900/50 divide-y divide-[#E6E1D6] dark:divide-slate-800">
            {/* Drawer Header */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#24211D] dark:text-slate-200">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E05318]" />
                <span>Filters & Presets</span>
              </div>
              <button
                type="button"
                onClick={handleToggleRightPanel}
                className="text-xs text-[#736E65] hover:text-[#24211D] dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Hide
              </button>
            </div>

            {/* Quick Presets */}
            <div className="p-5 space-y-2.5">
              <div className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                Quick Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => {
                  const isActive =
                    targetExpression === preset.pattern &&
                    searchMode === preset.mode;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      title={preset.description}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer border ${
                        isActive
                          ? "bg-[#E05318] text-white border-[#E05318]"
                          : "bg-white dark:bg-slate-950 text-[#24211D] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318]/60"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matching Flags */}
            <div className="p-5 space-y-3">
              <div className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                Matching Rules
              </div>
              <div className="space-y-2.5 text-xs text-[#24211D] dark:text-slate-300">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => {
                      setMatchCase(e.target.checked);
                      logger.developer("Toggled matchCase", "info", {
                        matchCase: e.target.checked,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#E05318]"
                  />
                  <span>Match case</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchWholeWord}
                    onChange={(e) => {
                      setMatchWholeWord(e.target.checked);
                      logger.developer("Toggled matchWholeWord", "info", {
                        matchWholeWord: e.target.checked,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#E05318]"
                  />
                  <span>Whole word only</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stripChecksum}
                    onChange={(e) => {
                      setStripChecksum(e.target.checked);
                      logger.developer("Toggled stripChecksum", "info", {
                        stripChecksum: e.target.checked,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#E05318]"
                  />
                  <span>Strip checksum (*XX)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeEmptyLines}
                    onChange={(e) => {
                      setRemoveEmptyLines(e.target.checked);
                      logger.developer("Toggled removeEmptyLines", "info", {
                        removeEmptyLines: e.target.checked,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#E05318]"
                  />
                  <span>Skip empty lines</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bookmarkLine}
                    onChange={(e) => {
                      setBookmarkLine(e.target.checked);
                      logger.developer("Toggled bookmarkLine", "info", {
                        bookmarkLine: e.target.checked,
                      });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#E05318]"
                  />
                  <span>Prefix match numbers</span>
                </label>

                {searchMode === "regex" && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dotMatchesNewline}
                      onChange={(e) => {
                        setDotMatchesNewline(e.target.checked);
                        logger.developer("Toggled dotMatchesNewline", "info", {
                          dotMatchesNewline: e.target.checked,
                        });
                      }}
                      className="w-3.5 h-3.5 rounded accent-[#E05318]"
                    />
                    <span>Dot matches newline</span>
                  </label>
                )}
              </div>
            </div>

            {/* Line Range Slice */}
            <div className="p-5 space-y-2.5">
              <div className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                Line Range
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#736E65] dark:text-slate-400 block mb-1">
                    From
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startLine}
                    onChange={(e) => setStartLine(e.target.value)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono tabular-nums text-[#24211D] dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#736E65] dark:text-slate-400 block mb-1">
                    To
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={endLine}
                    onChange={(e) => setEndLine(e.target.value)}
                    placeholder="End"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono tabular-nums text-[#24211D] dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* CLEAN SAVE AS MODAL */}
      {showSaveAsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveAsSubmit}
            className="bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
              <h4 className="text-sm font-bold text-[#24211D] dark:text-slate-100">
                Save Extracted File
              </h4>
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="text-[#736E65] hover:text-[#24211D] dark:hover:text-slate-200 p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="save-as-filename"
                className="text-xs font-medium text-[#24211D] dark:text-slate-300 block"
              >
                Filename
              </label>
              <input
                id="save-as-filename"
                type="text"
                autoFocus
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="extracted_output.log"
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
              />
              <p className="text-[11px] text-[#736E65] dark:text-slate-400">
                Supports .log, .txt, or .csv extensions.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-300 hover:bg-[#E5DFD4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E05318] hover:bg-[#C74612] text-white cursor-pointer"
              >
                Save File
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
