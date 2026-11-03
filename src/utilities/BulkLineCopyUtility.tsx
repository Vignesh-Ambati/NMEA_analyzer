/**
 * Classified as local logic because it controls component layout, interactive input state, filter configuration, live streaming presentation, and user output actions. Placed in /src/utilities/BulkLineCopyUtility.tsx.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Download,
  PlayCircle,
  FolderOpen,
  UploadCloud,
  FileCode,
  Square,
  SlidersHorizontal,
  Save,
  Trash2,
  X,
  FileDown,
  Search,
  Filter,
  Terminal,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  CheckSquare,
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

const GNSS_PRESETS: PresetItem[] = [
  {
    id: "gpgga",
    label: "$GPGGA",
    pattern: "^\\$(GP|GN|GL|GA)GGA",
    mode: "regex",
    description: "GNSS 3D fix & altitude position data",
  },
  {
    id: "gprmc",
    label: "$GPRMC",
    pattern: "^\\$(GP|GN|GL|GA)RMC",
    mode: "regex",
    description: "Recommended minimum navigation sentence",
  },
  {
    id: "gpgsv",
    label: "$GPGSV",
    pattern: "^\\$(GP|GN|GL|GA)GSV",
    mode: "regex",
    description: "Satellites in view & SNR metrics",
  },
  {
    id: "errors",
    label: "[ERROR]",
    pattern: "(ERROR|ERR|FATAL|EXCEPTION)",
    mode: "regex",
    description: "Diagnostic errors & fatal system events",
  },
  {
    id: "warnings",
    label: "[WARN]",
    pattern: "(WARN|WARNING)",
    mode: "regex",
    description: "System warnings and threshold alerts",
  },
];

export const BulkLineCopyUtility: React.FC = () => {
  const { files: appLoadedFiles, batchSize, showToast } = useApp();

  // Mode: File Stream vs Raw Data Paste
  const [inputMode, setInputMode] = useState<"file" | "raw">("file");

  // Source selection states
  const [sourcePath, setSourcePath] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>("");

  // Target expression & mode
  const [targetExpression, setTargetExpression] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("regex");
  const [dotMatchesNewline, setDotMatchesNewline] = useState<boolean>(false);

  // Advanced extraction options
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);
  const [wrapAround, setWrapAround] = useState<boolean>(true);
  const [bookmarkLine, setBookmarkLine] = useState<boolean>(false);
  const [purgeEachSearch, setPurgeEachSearch] = useState<boolean>(true);
  const [stripChecksum, setStripChecksum] = useState<boolean>(false);
  const [removeEmptyLines, setRemoveEmptyLines] = useState<boolean>(true);
  const [startLine, setStartLine] = useState<string>("");
  const [endLine, setEndLine] = useState<string>("");

  // Active Job Telemetry & Temp File State
  const [activeJob, setActiveJob] = useState<ExtractionJob>({
    jobId: "",
    status: "idle",
    statusText: "Ready for extraction",
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

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsPath, setSaveAsPath] = useState<string>("");
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Switch input mode (File stream vs Raw buffer)
  const handleModeChange = (mode: "file" | "raw") => {
    setInputMode(mode);
    logger.developer("Changed extraction input mode", "info", { mode });
  };

  // Handle file attached via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setInputMode("file");
    const generatedPath = `C:\\logs\\${file.name}`;
    setSourcePath(generatedPath);
    const tempName = `temp_${file.name.replace(/\.[^/.]+$/, "")}_extract.tmp`;

    setActiveJob((prev) => ({
      ...prev,
      totalBytes: file.size,
      status: "idle",
      statusText: `Ready to stream (${formatBytes(file.size)})`,
      tempFile: {
        ...prev.tempFile,
        name: tempName,
        path: `%TEMP%\\DataExtractor\\${tempName}`,
      },
    }));

    logger.ingestion("Attached file for streaming extraction", "info", {
      fileName: file.name,
      fileSize: file.size,
    });
    showToast(`Loaded ${file.name} (${formatBytes(file.size)})`, "info", 1800);
  };

  // Select loaded file from workspace
  const handleSelectWorkspaceFile = (filename: string) => {
    setInputMode("file");
    const winPath = `C:\\logs\\${filename}`;
    setSourcePath(winPath);
    setSelectedFile(null); // Backend path reference mode
    const tempName = `temp_${filename.replace(/\.[^/.]+$/, "")}_extract.tmp`;

    setActiveJob((prev) => ({
      ...prev,
      status: "idle",
      statusText: `Linked workspace file: ${filename}`,
      tempFile: {
        ...prev.tempFile,
        name: tempName,
        path: `%TEMP%\\DataExtractor\\${tempName}`,
      },
    }));

    logger.ingestion("Selected workspace file for extraction", "info", {
      filename,
    });
    showToast(`Targeted workspace file: ${filename}`, "info", 1800);
  };

  // Apply quick filter preset
  const handleApplyPreset = (preset: PresetItem) => {
    setTargetExpression(preset.pattern);
    setSearchMode(preset.mode);
    logger.developer("Applied extraction filter preset", "info", {
      presetId: preset.id,
      pattern: preset.pattern,
      mode: preset.mode,
    });
    showToast(`Filter preset: ${preset.label}`, "info", 1400);
  };

  // Search mode selector
  const handleSearchModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    logger.developer("Changed extraction search mode", "info", {
      searchMode: mode,
    });
  };

  // Execute extraction engine
  const handleExecuteEngine = async () => {
    if (inputMode === "file" && !selectedFile && !sourcePath.trim()) {
      showToast("Please choose or specify a source log file.", "error", 2400);
      return;
    }
    if (inputMode === "raw" && !rawText.trim()) {
      showToast("Please paste or enter text to extract lines from.", "error", 2400);
      return;
    }

    const options: ExtractionOptions = {
      matchCase,
      matchWholeWord,
      wrapAround,
      bookmarkLine,
      purgeEachSearch,
      backwardDirection: false,
      inSelection: false,
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

    logger.network("Triggered extraction engine job", "info", {
      sourceType: request.sourceType,
      targetExpression,
      searchMode,
      hasFileUpload: !!selectedFile,
    });

    try {
      showToast("Streaming extraction started...", "info", 1500);
      const finalJob = await startExtractionJob(request, (updated) => {
        setActiveJob(updated);
      });
      setActiveJob(finalJob);

      if (finalJob.status === "completed") {
        logger.developer("Extraction completed successfully", "info", {
          extracted: finalJob.linesExtracted,
          throughput: finalJob.throughputMBps,
          duration: finalJob.elapsedSeconds,
        });
        showToast(
          `Extracted ${finalJob.linesExtracted.toLocaleString()} matching lines`,
          "success",
          2600,
        );
      }
    } catch (err: any) {
      logger.network("Extraction job failed", "error", {
        error: err?.message,
      });
      showToast(err?.message || "Extraction job failed", "error", 3200);
    }
  };

  // Cancel running job
  const handleCancel = async () => {
    if (activeJob.jobId) {
      logger.developer("User requested cancellation of extraction job", "warn", {
        jobId: activeJob.jobId,
      });
      await cancelExtractionJob(activeJob.jobId);
      showToast("Extraction cancelled", "warn", 2000);
    }
  };

  // Reset all state to clean initial defaults
  const handleReset = () => {
    setSelectedFile(null);
    setSourcePath("");
    setRawText("");
    setTargetExpression("");
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
    setShowAdvanced(false);

    setActiveJob({
      jobId: "",
      status: "idle",
      statusText: "Ready for extraction",
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

    logger.developer("Reset Data Extractor Pro configuration and buffers", "info");
    showToast("Data Extractor Pro reset", "info", 1400);
  };

  // Copy extracted lines
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
      showToast("No extracted content to copy", "warn", 1600);
      return;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    logger.developer("Copied extracted output to clipboard", "info", {
      linesCount: activeJob.tempFile.lines.length,
      bytes: content.length,
    });
    showToast("Extracted lines copied to clipboard", "success", 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save to file (default path)
  const handleQuickSave = async () => {
    if (activeJob.tempFile.lines.length === 0 && !activeJob.tempFile.blob) {
      showToast("Output buffer is empty", "warn", 1600);
      return;
    }
    const defaultDest = sourcePath
      ? sourcePath.replace(/\.[^/.]+$/, "") + "_extracted.log"
      : "extracted_data.log";

    showToast("Saving extracted output...", "info", 1400);
    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: defaultDest,
      format: "log",
      blob: activeJob.tempFile.blob,
      content: activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n"),
    });

    if (res.success) {
      const fileName = res.filePath.split(/[/\\]/).pop() || res.filePath;
      logger.developer("Saved extraction output directly in browser", "info", {
        fileName,
        sizeBytes: res.sizeBytes,
      });
      showToast(`Saved as ${fileName}`, "success", 2400);
    } else {
      logger.developer("Failed saving extraction output", "error", {
        message: res.message,
      });
      showToast(res.message || "Failed to save file", "error", 3000);
    }
  };

  // Save As modal commit
  const handleSaveAsSubmit = async () => {
    const targetPath = saveAsPath.trim() || "extracted_data.log";
    const ext = targetPath.split(".").pop() || "log";
    const fmt = ext === "csv" ? "csv" : ext === "txt" ? "txt" : "log";

    showToast("Saving file...", "info", 1400);
    const res = await saveTempFile({
      tempFileId: activeJob.tempFile.id,
      destinationPath: targetPath,
      format: fmt as any,
      blob: activeJob.tempFile.blob,
      content: activeJob.tempFile.fullContent || activeJob.tempFile.lines.join("\n"),
    });

    setShowSaveAsModal(false);
    if (res.success) {
      const fileName = res.filePath.split(/[/\\]/).pop() || res.filePath;
      logger.developer("Saved extraction file via Save As", "info", {
        targetPath,
        format: fmt,
      });
      showToast(`Saved as ${fileName}`, "success", 2400);
    } else {
      logger.developer("Save As failed", "error", { message: res.message });
      showToast(res.message || "Failed to save file", "error", 3000);
    }
  };

  // Export helper (.log, .txt, .csv)
  const handleExport = (format: "log" | "txt" | "csv") => {
    if (activeJob.tempFile.lines.length === 0) {
      showToast("No extracted data to export", "warn", 1600);
      return;
    }
    exportTempFile(activeJob, format);
    logger.developer("Exported extraction temp file", "info", { format });
    showToast(`Exported .${format} file`, "success", 1800);
  };

  // Clear output buffer
  const handleClearOutput = () => {
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
    logger.developer("Cleared extraction output buffer", "info");
    showToast("Output buffer cleared", "info", 1400);
  };

  // Helper validation for regex preview
  const regexStatus = useMemo(() => {
    if (!targetExpression.trim() || searchMode !== "regex") return null;
    try {
      new RegExp(targetExpression, matchCase ? "" : "i");
      return { valid: true, message: "Valid Regex" };
    } catch (err: any) {
      return { valid: false, message: err?.message || "Invalid expression" };
    }
  }, [targetExpression, searchMode, matchCase]);

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* HEADER SECTION: Clean, modern header with quick stats & actions */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
                Data Extractor Pro
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                100% In-Browser Engine
              </span>
            </div>
            <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              High-throughput in-browser Web Worker streaming engine. Extracts
              matching lines, NMEA sentences, and diagnostics from multi-gigabyte
              files with minimal memory usage and zero server overhead.
            </p>
          </div>

          {/* Mode Switch & Global Reset */}
          <div className="flex items-center space-x-3 self-start md:self-auto">
            <div className="inline-flex p-1 rounded-xl bg-[#EFEAE1]/80 dark:bg-slate-950/70 border border-[#E6E1D6] dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange("file")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  inputMode === "file"
                    ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-xs"
                    : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>File Stream</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  inputMode === "raw"
                    ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-xs"
                    : "text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Raw Buffer</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Reset all fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE GRID: Left Config & Controls, Right Live Output Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Extraction Configuration & Filters (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* STEP 1: SOURCE SELECTION */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-[#2563EB] dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">
                  1
                </span>
                <h4 className="text-sm font-bold text-[#24211D] dark:text-slate-100 uppercase tracking-wider">
                  Source Dataset
                </h4>
              </div>

              {selectedFile && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-semibold">
                  {formatBytes(selectedFile.size)} ready
                </span>
              )}
            </div>

            {inputMode === "file" ? (
              <div className="space-y-3">
                {/* Workspace Files Quick Selector */}
                {appLoadedFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono">
                      Loaded In Workspace:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {appLoadedFiles.map((file, idx) => {
                        const isSelected =
                          sourcePath.includes(file.filename) ||
                          selectedFile?.name === file.filename;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              handleSelectWorkspaceFile(file.filename)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                                : "bg-white dark:bg-slate-950 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-800 hover:border-[#2563EB]/50"
                            }`}
                          >
                            {file.filename}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* File Dropzone & Path Row */}
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
                  className={`rounded-xl border-2 border-dashed transition-all p-4 text-center cursor-pointer ${
                    isDraggingOver
                      ? "border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/10"
                      : "border-[#E6E1D6] dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
                    <div className="w-10 h-10 rounded-full bg-[#EFEAE1] dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                      {selectedFile ? (
                        <span className="text-[#2563EB] dark:text-blue-400">
                          {selectedFile.name}
                        </span>
                      ) : (
                        "Drop any log file here or click to browse"
                      )}
                    </div>
                    <p className="text-[11px] text-[#736E65] dark:text-slate-400">
                      Supports .log, .nmea, .txt, .csv up to multi-GB scale
                    </p>
                  </div>
                </div>

                {/* Path input option */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#736E65] dark:text-slate-400">
                    File Path / Stream Location:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={sourcePath}
                      onChange={(e) => setSourcePath(e.target.value)}
                      placeholder="e.g. C:\logs\mission_gnss_capture.log"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                    />
                    {sourcePath && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourcePath("");
                          setSelectedFile(null);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        title="Clear path"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Raw Text Buffer View */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#736E65] dark:text-slate-400">
                    Direct Log / Text Buffer
                  </label>
                  <span className="text-[11px] font-mono text-[#736E65] dark:text-slate-400">
                    {rawText
                      ? `${rawText.split("\n").length.toLocaleString()} lines`
                      : "0 lines"}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste multiline telemetry, NMEA sentences, or diagnostic logs here..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] resize-y"
                />
              </div>
            )}
          </div>

          {/* STEP 2: PATTERN & SEARCH CONFIGURATION */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-[#2563EB] dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">
                  2
                </span>
                <h4 className="text-sm font-bold text-[#24211D] dark:text-slate-100 uppercase tracking-wider">
                  Filter & Extraction Pattern
                </h4>
              </div>

              {regexStatus && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                    regexStatus.valid
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                  }`}
                >
                  {regexStatus.message}
                </span>
              )}
            </div>

            {/* Pattern Input & Search Mode Selector */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#24211D] dark:text-slate-300">
                    Match Expression:
                  </label>
                  {targetExpression && (
                    <button
                      type="button"
                      onClick={() => setTargetExpression("")}
                      className="text-[11px] text-[#736E65] hover:text-rose-500 cursor-pointer"
                    >
                      Clear expression
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={targetExpression}
                    onChange={(e) => setTargetExpression(e.target.value)}
                    placeholder="e.g. ^\$GPGGA|^\$GPRMC or [ERROR]"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs sm:text-sm text-[#24211D] dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Search Mode Radio Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-[#736E65] dark:text-slate-400 mr-1">
                  Mode:
                </span>
                <button
                  type="button"
                  onClick={() => handleSearchModeChange("regex")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    searchMode === "regex"
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-white dark:bg-slate-950 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  Regular Expression
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchModeChange("normal")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    searchMode === "normal"
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-white dark:bg-slate-950 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  Literal Substring
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchModeChange("extended")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    searchMode === "extended"
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-white dark:bg-slate-950 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  Extended (\n, \t)
                </button>
              </div>

              {/* Quick Filter Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {GNSS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      title={preset.description}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white dark:bg-slate-950 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 text-[#24211D] dark:text-slate-200 border border-[#E6E1D6] dark:border-slate-800 hover:border-[#2563EB]/40 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Modifiers Collapsible */}
              <div className="pt-2 border-t border-[#E6E1D6] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full py-1 text-xs font-semibold text-[#736E65] dark:text-slate-300 hover:text-[#2563EB] cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Rule Modifiers & Line Slicing</span>
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="pt-3 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#24211D] dark:text-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={matchCase}
                          onChange={(e) => setMatchCase(e.target.checked)}
                          className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Match case</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={matchWholeWord}
                          onChange={(e) => setMatchWholeWord(e.target.checked)}
                          className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Match whole word only</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={stripChecksum}
                          onChange={(e) => setStripChecksum(e.target.checked)}
                          className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Strip NMEA Checksums (*XX)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={removeEmptyLines}
                          onChange={(e) =>
                            setRemoveEmptyLines(e.target.checked)
                          }
                          className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Remove empty lines</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bookmarkLine}
                          onChange={(e) => setBookmarkLine(e.target.checked)}
                          className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                        />
                        <span>Bookmark line index</span>
                      </label>
                      {searchMode === "regex" && (
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dotMatchesNewline}
                            onChange={(e) =>
                              setDotMatchesNewline(e.target.checked)
                            }
                            className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                          />
                          <span>. matches newline</span>
                        </label>
                      )}
                    </div>

                    {/* Slicing range inputs */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E6E1D6] dark:border-slate-800">
                      <div>
                        <label className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 block mb-1">
                          Start Line
                        </label>
                        <input
                          type="text"
                          value={startLine}
                          onChange={(e) => setStartLine(e.target.value)}
                          placeholder="e.g. 1"
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono text-[#24211D] dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 block mb-1">
                          End Line
                        </label>
                        <input
                          type="text"
                          value={endLine}
                          onChange={(e) => setEndLine(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 text-xs font-mono text-[#24211D] dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: EXECUTION & TELEMETRY */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-[#2563EB] dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">
                  3
                </span>
                <h4 className="text-sm font-bold text-[#24211D] dark:text-slate-100 uppercase tracking-wider">
                  Engine Execution & Metrics
                </h4>
              </div>
              <span className="text-[11px] font-mono font-semibold text-[#736E65] dark:text-slate-400">
                {activeJob.statusText}
              </span>
            </div>

            {/* Run / Cancel Action Button */}
            <div>
              {activeJob.status === "running" ? (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3 px-5 rounded-xl font-semibold text-white bg-[#2563EB] flex items-center justify-center space-x-2 shadow-md cursor-wait opacity-90 text-sm"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Streaming Extraction ({activeJob.progressPct}%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="py-3 px-4 rounded-xl font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center space-x-1.5 text-sm"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteEngine}
                  className="w-full py-3 px-5 rounded-xl font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-all flex items-center justify-center space-x-2 shadow-md shadow-blue-500/15 cursor-pointer text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Execute Extraction Engine</span>
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-[#736E65] dark:text-slate-400">
                  Engine Progress
                </span>
                <span className="text-[#2563EB] dark:text-blue-400 font-bold">
                  {activeJob.progressPct}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#EFEAE1] dark:bg-slate-800 rounded-full overflow-hidden">
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

            {/* Telemetry Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold font-mono text-[#736E65] dark:text-slate-400 uppercase tracking-wider">
                  Extracted
                </div>
                <div className="text-lg font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                  {activeJob.linesExtracted.toLocaleString()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold font-mono text-[#736E65] dark:text-slate-400 uppercase tracking-wider">
                  Processed
                </div>
                <div className="text-lg font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                  {activeJob.linesProcessed.toLocaleString()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold font-mono text-[#736E65] dark:text-slate-400 uppercase tracking-wider">
                  Throughput
                </div>
                <div className="text-lg font-bold font-mono text-[#2563EB] dark:text-blue-400 mt-0.5">
                  {activeJob.throughputMBps}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold font-mono text-[#736E65] dark:text-slate-400 uppercase tracking-wider">
                  Elapsed
                </div>
                <div className="text-lg font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                  {activeJob.elapsedSeconds}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Output Stream Terminal & Export Suite (6 cols) */}
        <div className="lg:col-span-6 bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs sticky top-4">
          {/* Output Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
              <div>
                <h4 className="text-sm font-bold text-[#24211D] dark:text-slate-100">
                  Extracted Stream Viewport
                </h4>
                <div className="text-[11px] font-mono text-[#736E65] dark:text-slate-400">
                  {activeJob.tempFile.name}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-xs text-[#736E65] dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScrollTemp}
                  onChange={(e) => setAutoScrollTemp(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#2563EB] accent-[#2563EB]"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarked}
              disabled={activeJob.tempFile.lines.length === 0}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#2563EB] border border-[#E6E1D6] dark:border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "Copied" : "Copy All"}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickSave}
              disabled={activeJob.tempFile.lines.length === 0}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#2563EB] border border-[#E6E1D6] dark:border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Save As...</span>
            </button>

            {/* Quick Export Formats */}
            <div className="inline-flex rounded-xl border border-[#E6E1D6] dark:border-slate-700 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => handleExport("log")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#2563EB] border-r border-[#E6E1D6] dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download as .log"
              >
                .log
              </button>
              <button
                type="button"
                onClick={() => handleExport("txt")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#2563EB] border-r border-[#E6E1D6] dark:border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download as .txt"
              >
                .txt
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={activeJob.tempFile.lines.length === 0}
                className="py-1.5 px-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#2563EB] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download as .csv"
              >
                .csv
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearOutput}
              disabled={activeJob.tempFile.lines.length === 0}
              className="p-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-[#736E65] hover:text-rose-500 border border-[#E6E1D6] dark:border-slate-700 cursor-pointer shadow-xs transition-all ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear output stream"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Code/Stream Viewport */}
          <div
            ref={tempViewportRef}
            className="h-[460px] sm:h-[520px] w-full rounded-xl border border-[#E6E1D6] dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 font-mono text-xs overflow-y-auto overflow-x-auto shadow-inner space-y-0.5"
          >
            {activeJob.tempFile.lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-600 select-none">
                <Terminal className="w-10 h-10 mb-3 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-semibold text-[#24211D] dark:text-slate-300">
                  Extraction Output Buffer Empty
                </p>
                <p className="text-[11px] mt-1 max-w-xs text-[#736E65] dark:text-slate-400">
                  Configure your source dataset and pattern, then execute the
                  engine to stream filtered lines directly into this viewport.
                </p>
              </div>
            ) : (
              activeJob.tempFile.lines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2 text-[#24211D] dark:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-900/80 px-1 py-0.5 rounded select-text"
                >
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 select-none w-10 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre break-all leading-tight font-mono text-xs">
                    {line}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#736E65] dark:text-slate-400 px-1">
            <span>
              Lines in preview: {activeJob.tempFile.lines.length.toLocaleString()}
            </span>
            <span>{formatBytes(activeJob.tempFile.sizeBytes)} buffered</span>
          </div>
        </div>
      </div>

      {/* SAVE AS MODAL */}
      {showSaveAsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Save className="w-5 h-5 text-[#2563EB]" />
                <h4 className="text-base font-bold text-[#24211D] dark:text-slate-100">
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
              <label className="text-xs font-semibold text-[#24211D] dark:text-slate-300 block">
                Target Save Path & Filename
              </label>
              <input
                type="text"
                value={saveAsPath}
                onChange={(e) => setSaveAsPath(e.target.value)}
                placeholder="C:\logs\extracted_final.log"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
              />
              <p className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono">
                Specify destination path. Supports .log, .txt, or .csv
                extensions.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:bg-[#E5DFD4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer shadow-xs"
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
