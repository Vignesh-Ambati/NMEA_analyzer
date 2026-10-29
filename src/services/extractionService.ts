/**
 * Classified as shared service because it handles extraction backend API communications, chunked telemetry polling, temp file lifecycle management, and export routines independently of any UI component. Placed in /src/services/extractionService.ts.
 */

import { logger } from './logger';
import { getApiUrl } from '../backend/config';
import { ENDPOINTS } from '../backend/endpoints';

export type SearchMode = 'normal' | 'extended' | 'regex';

export interface ExtractionOptions {
  matchCase: boolean;
  matchWholeWord: boolean;
  wrapAround: boolean;
  bookmarkLine: boolean;
  purgeEachSearch: boolean;
  backwardDirection: boolean;
  inSelection: boolean;
  dotMatchesNewline: boolean;
  stripChecksum: boolean;
  removeEmptyLines: boolean;
  startLine?: number;
  endLine?: number;
}

export interface ExtractionRequest {
  sourceType: 'file_path' | 'file_upload' | 'raw_text';
  sourcePath?: string;
  file?: File | null;
  rawText?: string;
  targetExpression: string;
  searchMode: SearchMode;
  batchSize?: number;
  options: ExtractionOptions;
}

export interface TempFileMetadata {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  totalLines: number;
  lines: string[]; // Live preview buffer (e.g. up to 1000 lines)
  fullContent?: string;
}

export interface ExtractionJob {
  jobId: string;
  status: 'idle' | 'initializing' | 'running' | 'completed' | 'cancelled' | 'error';
  statusText: string;
  progressPct: number;
  linesExtracted: number;
  linesProcessed: number;
  throughputMBps: string;
  elapsedSeconds: string;
  processedBytes: number;
  totalBytes: number;
  tempFile: TempFileMetadata;
  error?: string;
}

export interface SaveTempFileParams {
  tempFileId: string;
  destinationPath: string;
  format: 'log' | 'txt' | 'csv';
  content?: string;
}

export interface SaveTempFileResponse {
  success: boolean;
  filePath: string;
  sizeBytes: number;
  message: string;
}

// Global active cancellation controller map
const activeAbortControllers = new Map<string, AbortController>();

/**
 * Parses Notepad++ extended escape sequences (\n, \r, \t, \0, \xHH)
 */
export const parseExtendedEscapes = (str: string): string => {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * Starts an extraction job by submitting payload to backend API (or falling back to streaming engine)
 * and continuously emits live telemetry and temp file updates.
 */
export const startExtractionJob = async (
  request: ExtractionRequest,
  onProgress: (job: ExtractionJob) => void
): Promise<ExtractionJob> => {
  const jobId = `job_ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const abortController = new AbortController();
  activeAbortControllers.set(jobId, abortController);

  const initialTempFileName = request.sourcePath
    ? `temp_${request.sourcePath.split(/[/\\]/).pop() || 'data'}.tmp`
    : 'temp_extraction_stream.tmp';

  let currentJob: ExtractionJob = {
    jobId,
    status: 'initializing',
    statusText: 'INITIALIZING EXTRACTION ENGINE...',
    progressPct: 0,
    linesExtracted: 0,
    linesProcessed: 0,
    throughputMBps: '0.0 MB/s',
    elapsedSeconds: '0.00s',
    processedBytes: 0,
    totalBytes: request.file ? request.file.size : request.rawText ? new Blob([request.rawText]).size : 0,
    tempFile: {
      id: `temp_${jobId}`,
      name: initialTempFileName,
      path: `%TEMP%\\DataExtractor\\${initialTempFileName}`,
      sizeBytes: 0,
      totalLines: 0,
      lines: [],
    },
  };

  onProgress(currentJob);

  // 1. Attempt POST to backend endpoint (e.g. /api/extraction/bulk-line-copy)
  const backendUrl = getApiUrl(ENDPOINTS.EXTRACTION_COPY);
  let backendHandled = false;

  try {
    const postPayload = {
      jobId,
      sourceType: request.sourceType,
      sourcePath: request.sourcePath,
      targetExpression: request.targetExpression,
      searchMode: request.searchMode,
      batchSize: request.batchSize || 500,
      options: request.options,
      hasFileUpload: !!request.file,
      fileSize: request.file ? request.file.size : 0,
    };

    logger.network(`POST ${backendUrl} extraction initialization`, 'info', postPayload);

    // Short-timeout probe to see if backend service endpoint is currently answering
    const probeController = new AbortController();
    const probeTimeout = setTimeout(() => probeController.abort(), 1200);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(postPayload),
      signal: probeController.signal,
    }).catch(() => null);

    clearTimeout(probeTimeout);

    if (response && response.ok) {
      const data = await response.json();
      if (data && data.success) {
        backendHandled = true;
        logger.network(`Backend accepted extraction job ${jobId}`, 'info', data);
        // Start backend polling for status and temp file stream
        return await pollBackendJobStatus(jobId, currentJob, onProgress, abortController.signal);
      }
    }
  } catch (err: any) {
    logger.developer(`Backend extraction API unavailable, switching to client high-speed streaming engine: ${err?.message}`, 'debug');
  }

  // 2. High-Speed Local Streaming Temp File Engine (simulating exact backend protocol & speed)
  if (!backendHandled) {
    return await executeStreamingEngine(request, currentJob, onProgress, abortController);
  }

  return currentJob;
};

/**
 * Cancels a running extraction job
 */
export const cancelExtractionJob = async (jobId: string): Promise<void> => {
  const controller = activeAbortControllers.get(jobId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(jobId);
  }

  try {
    const cancelUrl = getApiUrl(`/extraction/cancel/${jobId}`);
    await fetch(cancelUrl, { method: 'POST' }).catch(() => {});
  } catch {
    // Ignore offline cancel errors
  }
};

/**
 * Saves or commits the temp file to a specific destination path or triggers system file download
 */
export const saveTempFile = async (params: SaveTempFileParams): Promise<SaveTempFileResponse> => {
  const saveUrl = getApiUrl('/extraction/save');
  logger.network(`Saving temp file ${params.tempFileId} to ${params.destinationPath}`, 'info', params);

  try {
    const response = await fetch(saveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => null);

    if (response && response.ok) {
      const resData = await response.json();
      return resData;
    }
  } catch (err: any) {
    logger.developer(`Backend save endpoint offline, saving client-side: ${err?.message}`, 'debug');
  }

  // Client-side fallback: trigger direct file download
  const content = params.content || '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const filename = params.destinationPath.split(/[/\\]/).pop() || `extracted_${Date.now()}.${params.format}`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);

  return {
    success: true,
    filePath: params.destinationPath,
    sizeBytes: blob.size,
    message: `Saved as ${filename} successfully`,
  };
};

/**
 * Quick export helper for temp file contents
 */
export const exportTempFile = (job: ExtractionJob, format: 'log' | 'txt' | 'csv', customName?: string): void => {
  const content = job.tempFile.fullContent || job.tempFile.lines.join('\n');
  const filename = customName || `extracted_${job.jobId.slice(-6)}.${format}`;
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Polls backend for job status and temp file chunk updates
 */
async function pollBackendJobStatus(
  jobId: string,
  initialJob: ExtractionJob,
  onProgress: (job: ExtractionJob) => void,
  signal: AbortSignal
): Promise<ExtractionJob> {
  const statusUrl = getApiUrl(ENDPOINTS.TASK_STATUS(jobId));
  let jobState = { ...initialJob };

  while (!signal.aborted) {
    try {
      const res = await fetch(statusUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        jobState = {
          ...jobState,
          status: data.status || 'running',
          statusText: data.statusText || 'PROCESSING DATA ON SERVER...',
          progressPct: data.progressPct ?? jobState.progressPct,
          linesExtracted: data.linesExtracted ?? jobState.linesExtracted,
          linesProcessed: data.linesProcessed ?? jobState.linesProcessed,
          throughputMBps: data.throughputMBps || jobState.throughputMBps,
          elapsedSeconds: data.elapsedSeconds || jobState.elapsedSeconds,
          tempFile: {
            ...jobState.tempFile,
            ...(data.tempFile || {}),
            lines: data.recentLines || jobState.tempFile.lines,
          },
        };
        onProgress(jobState);

        if (jobState.status === 'completed' || jobState.status === 'cancelled' || jobState.status === 'error') {
          break;
        }
      }
    } catch {
      // transient network poll failure
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  activeAbortControllers.delete(jobId);
  return jobState;
}

/**
 * High-speed multi-GB chunked streaming engine simulating backend temp-file creation
 */
async function executeStreamingEngine(
  request: ExtractionRequest,
  job: ExtractionJob,
  onProgress: (job: ExtractionJob) => void,
  controller: AbortController
): Promise<ExtractionJob> {
  const startTime = performance.now();
  let jobState: ExtractionJob = { ...job, status: 'running', statusText: 'STREAMING CHUNKS...' };

  const { searchMode, targetExpression, options } = request;
  const isMatchCase = options.matchCase;
  const isMatchWholeWord = options.matchWholeWord;
  const dotMatchesNewline = options.dotMatchesNewline;

  // Build matcher
  let compiledRegex: RegExp | null = null;
  let targetPattern = targetExpression;

  if (searchMode === 'extended') {
    targetPattern = parseExtendedEscapes(targetExpression);
  }

  if (searchMode === 'regex') {
    try {
      let flags = '';
      if (!isMatchCase) flags += 'i';
      if (dotMatchesNewline) flags += 's';
      let pat = targetExpression;
      if (isMatchWholeWord) {
        pat = `\\b(?:${pat})\\b`;
      }
      compiledRegex = new RegExp(pat, flags);
    } catch (err: any) {
      jobState.status = 'error';
      jobState.statusText = `INVALID REGEX: ${err.message}`;
      jobState.error = err.message;
      onProgress(jobState);
      return jobState;
    }
  }

  const testLine = (line: string): boolean => {
    if (!targetExpression.trim()) return true;

    if (searchMode === 'regex' && compiledRegex) {
      return compiledRegex.test(line);
    }

    if (searchMode === 'extended') {
      const subject = isMatchCase ? line : line.toLowerCase();
      const target = isMatchCase ? targetPattern : targetPattern.toLowerCase();
      return subject.includes(target);
    }

    // Normal
    const subject = isMatchCase ? line : line.toLowerCase();
    const target = isMatchCase ? targetExpression : targetExpression.toLowerCase();

    if (isMatchWholeWord) {
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, isMatchCase ? '' : 'i');
      return re.test(line);
    }

    return subject.includes(target);
  };

  const previewLines: string[] = [];
  let tempFileSizeBytes = 0;
  let linesExtracted = 0;
  let linesProcessed = 0;
  const startNum = options.startLine && options.startLine > 0 ? options.startLine : 1;
  const endNum = options.endLine && options.endLine >= startNum ? options.endLine : Infinity;

  // Branch 1: Raw Text processing
  if (request.sourceType === 'raw_text' || (!request.file && request.rawText)) {
    const rawLines = (request.rawText || '').split(/\r?\n/);
    const totalLines = rawLines.length;
    const totalBytes = new Blob([request.rawText || '']).size;

    for (let i = 0; i < totalLines; i++) {
      if (controller.signal.aborted) {
        jobState.status = 'cancelled';
        jobState.statusText = 'CANCELLED BY USER';
        onProgress(jobState);
        return jobState;
      }

      linesProcessed++;
      if (linesProcessed < startNum) continue;
      if (linesProcessed > endNum) break;

      let line = rawLines[i];
      if (options.removeEmptyLines && !line.trim()) continue;
      if (options.stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');

      if (testLine(line)) {
        linesExtracted++;
        if (options.bookmarkLine) {
          line = `[MATCH #${linesExtracted}] ${line}`;
        }
        if (previewLines.length < 500) {
          previewLines.push(line);
        }
        tempFileSizeBytes += line.length + 1;
      }

      // Live update every 1000 lines or on completion
      if (i % 1000 === 0 || i === totalLines - 1) {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(100, Math.round(((i + 1) / totalLines) * 100));
        const throughput = elapsed > 0 ? ((totalBytes / (1024 * 1024)) / elapsed).toFixed(1) : '999.0';

        jobState = {
          ...jobState,
          progressPct: progress,
          linesExtracted,
          linesProcessed,
          throughputMBps: `${throughput} MB/s`,
          elapsedSeconds: `${elapsed.toFixed(2)}s`,
          processedBytes: totalBytes,
          tempFile: {
            ...jobState.tempFile,
            sizeBytes: tempFileSizeBytes,
            totalLines: linesExtracted,
            lines: [...previewLines],
          },
        };
        onProgress(jobState);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const totalElapsed = (performance.now() - startTime) / 1000;
    jobState = {
      ...jobState,
      status: 'completed',
      statusText: `EXTRACTION COMPLETE (${linesExtracted.toLocaleString()} MATCHES)`,
      progressPct: 100,
      elapsedSeconds: `${totalElapsed.toFixed(2)}s`,
      tempFile: {
        ...jobState.tempFile,
        sizeBytes: tempFileSizeBytes,
        lines: [...previewLines],
      },
    };
    onProgress(jobState);
    activeAbortControllers.delete(job.jobId);
    return jobState;
  }

  // Branch 2: Multi-GB File Streaming via Blob.slice chunks (up to 5 GB without RAM strain)
  const file = request.file!;
  const totalFileSize = file.size;
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
  let offset = 0;
  let remainder = '';

  while (offset < totalFileSize) {
    if (controller.signal.aborted) {
      jobState.status = 'cancelled';
      jobState.statusText = 'CANCELLED BY USER';
      onProgress(jobState);
      return jobState;
    }

    const nextOffset = Math.min(offset + CHUNK_SIZE, totalFileSize);
    const chunkBlob = file.slice(offset, nextOffset);
    const chunkText = await chunkBlob.text();
    const combined = remainder + chunkText;
    const lines = combined.split(/\r?\n/);
    remainder = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      linesProcessed++;
      if (linesProcessed < startNum) continue;
      if (linesProcessed > endNum) {
        offset = totalFileSize;
        break;
      }

      let line = lines[i];
      if (options.removeEmptyLines && !line.trim()) continue;
      if (options.stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');

      if (testLine(line)) {
        linesExtracted++;
        if (options.bookmarkLine) {
          line = `[MATCH #${linesExtracted}] ${line}`;
        }
        if (previewLines.length < 500) {
          previewLines.push(line);
        }
        tempFileSizeBytes += line.length + 1;
      }
    }

    offset = nextOffset;
    const currentProgress = Math.min(99, Math.round((offset / totalFileSize) * 100));
    const elapsed = (performance.now() - startTime) / 1000;
    const mbProcessed = offset / (1024 * 1024);
    const currentThroughput = elapsed > 0 ? (mbProcessed / elapsed).toFixed(1) : '0.0';

    jobState = {
      ...jobState,
      progressPct: currentProgress,
      linesExtracted,
      linesProcessed,
      throughputMBps: `${currentThroughput} MB/s`,
      elapsedSeconds: `${elapsed.toFixed(2)}s`,
      processedBytes: offset,
      tempFile: {
        ...jobState.tempFile,
        sizeBytes: tempFileSizeBytes,
        totalLines: linesExtracted,
        lines: [...previewLines],
      },
    };
    onProgress(jobState);

    // Yield to keep UI buttery smooth at 60fps
    await new Promise((r) => setTimeout(r, 0));
  }

  // Trailing remainder
  if (remainder.length > 0 && !controller.signal.aborted) {
    linesProcessed++;
    let line = remainder;
    if (!options.removeEmptyLines || line.trim()) {
      if (options.stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');
      if (testLine(line)) {
        linesExtracted++;
        if (options.bookmarkLine) line = `[MATCH #${linesExtracted}] ${line}`;
        if (previewLines.length < 500) previewLines.push(line);
        tempFileSizeBytes += line.length + 1;
      }
    }
  }

  const finalElapsed = (performance.now() - startTime) / 1000;
  const finalThroughput = finalElapsed > 0 ? ((totalFileSize / (1024 * 1024)) / finalElapsed).toFixed(1) : '0.0';

  jobState = {
    ...jobState,
    status: 'completed',
    statusText: `EXTRACTION COMPLETE (${linesExtracted.toLocaleString()} MATCHES)`,
    progressPct: 100,
    throughputMBps: `${finalThroughput} MB/s`,
    elapsedSeconds: `${finalElapsed.toFixed(2)}s`,
    tempFile: {
      ...jobState.tempFile,
      sizeBytes: tempFileSizeBytes,
      lines: [...previewLines],
    },
  };
  onProgress(jobState);
  activeAbortControllers.delete(job.jobId);
  return jobState;
}
