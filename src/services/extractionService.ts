/**
 * Classified as shared service because it manages high-speed in-browser Web Worker streaming extraction, chunked memory buffers, and zero-backend file export routines independently of any UI component. Placed in /src/services/extractionService.ts.
 */

import { logger } from './logger';

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
  lines: string[]; // Live preview buffer (up to 500 lines)
  fullContent?: string;
  blob?: Blob; // Complete zero-copy in-browser extracted Blob
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
  blob?: Blob;
}

export interface SaveTempFileResponse {
  success: boolean;
  filePath: string;
  sizeBytes: number;
  message: string;
}

// Active worker & abort controller registry
const activeWorkers = new Map<string, Worker>();
const activeAbortControllers = new Map<string, AbortController>();

/**
 * Parses extended escape sequences (\n, \r, \t, \0, \xHH)
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
 * Worker script code as string for inline Worker initialization.
 * Runs completely on background thread with zero UI thread contention.
 */
const WORKER_SOURCE = `
self.onmessage = async function(e) {
  const { jobId, file, rawText, sourceType, targetExpression, searchMode, options, batchSize } = e.data;
  const startTime = performance.now();

  const isMatchCase = options.matchCase;
  const isMatchWholeWord = options.matchWholeWord;
  const dotMatchesNewline = options.dotMatchesNewline;
  const stripChecksum = options.stripChecksum;
  const removeEmptyLines = options.removeEmptyLines;
  const bookmarkLine = options.bookmarkLine;
  const startNum = options.startLine && options.startLine > 0 ? options.startLine : 1;
  const endNum = options.endLine && options.endLine >= startNum ? options.endLine : Infinity;

  // Compile Matcher
  let compiledRegex = null;
  let targetPattern = targetExpression;

  if (searchMode === 'extended') {
    targetPattern = targetExpression
      .replace(/\\\\n/g, '\\n')
      .replace(/\\\\r/g, '\\r')
      .replace(/\\\\t/g, '\\t')
      .replace(/\\\\0/g, '\\0')
      .replace(/\\\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  if (searchMode === 'regex' && targetExpression.trim()) {
    try {
      let flags = 'g';
      if (!isMatchCase) flags += 'i';
      if (dotMatchesNewline) flags += 's';
      let pat = targetExpression;
      if (isMatchWholeWord) {
        pat = '\\\\b(?:' + pat + ')\\\\b';
      }
      compiledRegex = new RegExp(pat, flags);
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message });
      return;
    }
  }

  const testLine = (line) => {
    if (!targetExpression.trim()) return true;

    if (searchMode === 'regex' && compiledRegex) {
      compiledRegex.lastIndex = 0;
      return compiledRegex.test(line);
    }

    if (searchMode === 'extended') {
      const subject = isMatchCase ? line : line.toLowerCase();
      const target = isMatchCase ? targetPattern : targetPattern.toLowerCase();
      return subject.indexOf(target) !== -1;
    }

    // Normal / Literal
    const subject = isMatchCase ? line : line.toLowerCase();
    const target = isMatchCase ? targetExpression : targetExpression.toLowerCase();

    if (isMatchWholeWord) {
      const escaped = target.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
      const re = new RegExp('\\\\b' + escaped + '\\\\b', isMatchCase ? '' : 'i');
      return re.test(line);
    }

    return subject.indexOf(target) !== -1;
  };

  const previewLines = [];
  const matchedChunks = [];
  let currentBuffer = '';
  const BUFFER_FLUSH_SIZE = 1024 * 1024; // 1MB buffer chunk flush to avoid memory strain
  let tempFileSizeBytes = 0;
  let linesExtracted = 0;
  let linesProcessed = 0;

  let lastReportTime = performance.now();

  // Branch A: Process Raw Text Buffer
  if (sourceType === 'raw_text' || (!file && rawText)) {
    const text = rawText || '';
    const totalBytes = text.length;
    const lines = text.split(/\\r?\\n/);
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
      linesProcessed++;
      if (linesProcessed < startNum) continue;
      if (linesProcessed > endNum) break;

      let line = lines[i];
      if (removeEmptyLines && !line.trim()) continue;
      if (stripChecksum) line = line.replace(/\\*[0-9A-Fa-f]{2}$/, '');

      if (testLine(line)) {
        linesExtracted++;
        if (bookmarkLine) {
          line = '[MATCH #' + linesExtracted + '] ' + line;
        }
        if (previewLines.length < 500) {
          previewLines.push(line);
        }

        currentBuffer += line + '\\n';
        tempFileSizeBytes += line.length + 1;

        if (currentBuffer.length >= BUFFER_FLUSH_SIZE) {
          matchedChunks.push(currentBuffer);
          currentBuffer = '';
        }
      }

      const now = performance.now();
      if (now - lastReportTime > 60 || i === totalLines - 1) {
        lastReportTime = now;
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(99, Math.round(((i + 1) / totalLines) * 100));
        const throughput = elapsed > 0 ? ((totalBytes / (1024 * 1024)) / elapsed).toFixed(1) : '0.0';

        self.postMessage({
          type: 'progress',
          progressPct: progress,
          linesExtracted,
          linesProcessed,
          throughputMBps: throughput + ' MB/s',
          elapsedSeconds: elapsed.toFixed(2) + 's',
          processedBytes: totalBytes,
          previewLines: previewLines.slice(0, 500),
          sizeBytes: tempFileSizeBytes,
        });
      }
    }

    if (currentBuffer.length > 0) {
      matchedChunks.push(currentBuffer);
    }

    const finalBlob = new Blob(matchedChunks, { type: 'text/plain;charset=utf-8' });
    const finalElapsed = (performance.now() - startTime) / 1000;
    const finalThroughput = finalElapsed > 0 ? ((totalBytes / (1024 * 1024)) / finalElapsed).toFixed(1) : '0.0';

    self.postMessage({
      type: 'complete',
      linesExtracted,
      linesProcessed,
      throughputMBps: finalThroughput + ' MB/s',
      elapsedSeconds: finalElapsed.toFixed(2) + 's',
      previewLines,
      blob: finalBlob,
      sizeBytes: finalBlob.size,
    });
    return;
  }

  // Branch B: Multi-GB File Streaming via Blob.slice chunks (8MB chunks)
  const totalFileSize = file.size;
  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunk for ultra-high throughput & minimal RAM
  let offset = 0;
  let remainder = '';
  const textDecoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

  while (offset < totalFileSize) {
    const nextOffset = Math.min(offset + CHUNK_SIZE, totalFileSize);
    const chunkBlob = file.slice(offset, nextOffset);
    const chunkBuffer = await chunkBlob.arrayBuffer();
    const isLastChunk = nextOffset >= totalFileSize;
    const chunkText = textDecoder.decode(chunkBuffer, { stream: !isLastChunk });
    
    const combined = remainder + chunkText;
    const lines = combined.split(/\\r?\\n/);
    remainder = isLastChunk ? '' : (lines.pop() || '');

    for (let i = 0; i < lines.length; i++) {
      linesProcessed++;
      if (linesProcessed < startNum) continue;
      if (linesProcessed > endNum) {
        offset = totalFileSize;
        break;
      }

      let line = lines[i];
      if (removeEmptyLines && !line.trim()) continue;
      if (stripChecksum) line = line.replace(/\\*[0-9A-Fa-f]{2}$/, '');

      if (testLine(line)) {
        linesExtracted++;
        if (bookmarkLine) {
          line = '[MATCH #' + linesExtracted + '] ' + line;
        }
        if (previewLines.length < 500) {
          previewLines.push(line);
        }

        currentBuffer += line + '\\n';
        tempFileSizeBytes += line.length + 1;

        if (currentBuffer.length >= BUFFER_FLUSH_SIZE) {
          matchedChunks.push(currentBuffer);
          currentBuffer = '';
        }
      }
    }

    offset = nextOffset;
    const now = performance.now();
    if (now - lastReportTime > 50 || offset >= totalFileSize) {
      lastReportTime = now;
      const currentProgress = Math.min(99, Math.round((offset / totalFileSize) * 100));
      const elapsed = (now - startTime) / 1000;
      const mbProcessed = offset / (1024 * 1024);
      const currentThroughput = elapsed > 0 ? (mbProcessed / elapsed).toFixed(1) : '0.0';

      self.postMessage({
        type: 'progress',
        progressPct: currentProgress,
        linesExtracted,
        linesProcessed,
        throughputMBps: currentThroughput + ' MB/s',
        elapsedSeconds: elapsed.toFixed(2) + 's',
        processedBytes: offset,
        previewLines: previewLines.slice(0, 500),
        sizeBytes: tempFileSizeBytes,
      });
    }
  }

  // Trailing remainder if any
  if (remainder.length > 0) {
    linesProcessed++;
    let line = remainder;
    if (!removeEmptyLines || line.trim()) {
      if (stripChecksum) line = line.replace(/\\*[0-9A-Fa-f]{2}$/, '');
      if (testLine(line)) {
        linesExtracted++;
        if (bookmarkLine) line = '[MATCH #' + linesExtracted + '] ' + line;
        if (previewLines.length < 500) previewLines.push(line);
        currentBuffer += line + '\\n';
        tempFileSizeBytes += line.length + 1;
      }
    }
  }

  if (currentBuffer.length > 0) {
    matchedChunks.push(currentBuffer);
  }

  const finalBlob = new Blob(matchedChunks, { type: 'text/plain;charset=utf-8' });
  const finalElapsed = (performance.now() - startTime) / 1000;
  const finalThroughput = finalElapsed > 0 ? ((totalFileSize / (1024 * 1024)) / finalElapsed).toFixed(1) : '0.0';

  self.postMessage({
    type: 'complete',
    linesExtracted,
    linesProcessed,
    throughputMBps: finalThroughput + ' MB/s',
    elapsedSeconds: finalElapsed.toFixed(2) + 's',
    previewLines,
    blob: finalBlob,
    sizeBytes: finalBlob.size,
  });
};
`;

/**
 * Starts an in-browser streaming extraction job using a dedicated Web Worker.
 * Multi-GB files are chunked through 8MB slices with zero UI stutter and minimal RAM.
 */
export const startExtractionJob = async (
  request: ExtractionRequest,
  onProgress: (job: ExtractionJob) => void
): Promise<ExtractionJob> => {
  const jobId = `job_browser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialTempFileName = request.sourcePath
    ? `temp_${request.sourcePath.split(/[/\\]/).pop() || 'data'}.tmp`
    : 'temp_extraction_stream.tmp';

  const totalBytes = request.file
    ? request.file.size
    : request.rawText
      ? new Blob([request.rawText]).size
      : 0;

  let currentJob: ExtractionJob = {
    jobId,
    status: 'running',
    statusText: 'Streaming in-browser engine...',
    progressPct: 0,
    linesExtracted: 0,
    linesProcessed: 0,
    throughputMBps: '0.0 MB/s',
    elapsedSeconds: '0.00s',
    processedBytes: 0,
    totalBytes,
    tempFile: {
      id: `temp_${jobId}`,
      name: initialTempFileName,
      path: `Browser::MemoryBuffer::${initialTempFileName}`,
      sizeBytes: 0,
      totalLines: 0,
      lines: [],
    },
  };

  onProgress(currentJob);

  logger.developer('Starting in-browser Web Worker streaming extraction', 'info', {
    jobId,
    sourceType: request.sourceType,
    totalBytes,
    searchMode: request.searchMode,
    expression: request.targetExpression,
  });

  return new Promise<ExtractionJob>((resolve, reject) => {
    try {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      activeWorkers.set(jobId, worker);

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data;

        if (data.type === 'progress') {
          currentJob = {
            ...currentJob,
            progressPct: data.progressPct,
            linesExtracted: data.linesExtracted,
            linesProcessed: data.linesProcessed,
            throughputMBps: data.throughputMBps,
            elapsedSeconds: data.elapsedSeconds,
            processedBytes: data.processedBytes,
            tempFile: {
              ...currentJob.tempFile,
              sizeBytes: data.sizeBytes,
              totalLines: data.linesExtracted,
              lines: data.previewLines,
            },
          };
          onProgress(currentJob);
        } else if (data.type === 'complete') {
          currentJob = {
            ...currentJob,
            status: 'completed',
            statusText: `Complete: ${data.linesExtracted.toLocaleString()} matches`,
            progressPct: 100,
            linesExtracted: data.linesExtracted,
            linesProcessed: data.linesProcessed,
            throughputMBps: data.throughputMBps,
            elapsedSeconds: data.elapsedSeconds,
            tempFile: {
              ...currentJob.tempFile,
              sizeBytes: data.sizeBytes,
              totalLines: data.linesExtracted,
              lines: data.previewLines,
              blob: data.blob,
            },
          };
          onProgress(currentJob);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          activeWorkers.delete(jobId);
          resolve(currentJob);
        } else if (data.type === 'error') {
          currentJob = {
            ...currentJob,
            status: 'error',
            statusText: `Error: ${data.error}`,
            error: data.error,
          };
          onProgress(currentJob);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          activeWorkers.delete(jobId);
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        logger.developer('Web Worker encountered error, falling back to main-thread chunker', 'warn', {
          error: err.message,
        });
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        activeWorkers.delete(jobId);
        // Fallback to asynchronous chunk reader on main thread
        executeMainThreadStreaming(request, currentJob, onProgress)
          .then(resolve)
          .catch(reject);
      };

      // Dispatch payload to worker
      worker.postMessage({
        jobId,
        file: request.file,
        rawText: request.rawText,
        sourceType: request.sourceType,
        targetExpression: request.targetExpression,
        searchMode: request.searchMode,
        options: request.options,
        batchSize: request.batchSize || 1000,
      });
    } catch (err: any) {
      logger.developer('Failed to instantiate Web Worker, executing async main-thread streamer', 'warn', {
        error: err?.message,
      });
      executeMainThreadStreaming(request, currentJob, onProgress)
        .then(resolve)
        .catch(reject);
    }
  });
};

/**
 * Main-thread streaming fallback using chunked slice loops and requestAnimationFrame
 */
async function executeMainThreadStreaming(
  request: ExtractionRequest,
  initialJob: ExtractionJob,
  onProgress: (job: ExtractionJob) => void
): Promise<ExtractionJob> {
  const abortController = new AbortController();
  activeAbortControllers.set(initialJob.jobId, abortController);

  const startTime = performance.now();
  let jobState: ExtractionJob = { ...initialJob, status: 'running' };

  const { options, searchMode, targetExpression } = request;
  const isMatchCase = options.matchCase;
  const isMatchWholeWord = options.matchWholeWord;
  const dotMatchesNewline = options.dotMatchesNewline;
  const stripChecksum = options.stripChecksum;
  const removeEmptyLines = options.removeEmptyLines;
  const bookmarkLine = options.bookmarkLine;
  const startNum = options.startLine && options.startLine > 0 ? options.startLine : 1;
  const endNum = options.endLine && options.endLine >= startNum ? options.endLine : Infinity;

  let compiledRegex: RegExp | null = null;
  let targetPattern = targetExpression;

  if (searchMode === 'extended') {
    targetPattern = parseExtendedEscapes(targetExpression);
  }

  if (searchMode === 'regex' && targetExpression.trim()) {
    try {
      let flags = 'g';
      if (!isMatchCase) flags += 'i';
      if (dotMatchesNewline) flags += 's';
      let pat = targetExpression;
      if (isMatchWholeWord) {
        pat = `\\b(?:${pat})\\b`;
      }
      compiledRegex = new RegExp(pat, flags);
    } catch (err: any) {
      jobState.status = 'error';
      jobState.statusText = `Regex Error: ${err.message}`;
      jobState.error = err.message;
      onProgress(jobState);
      return jobState;
    }
  }

  const testLine = (line: string): boolean => {
    if (!targetExpression.trim()) return true;

    if (searchMode === 'regex' && compiledRegex) {
      compiledRegex.lastIndex = 0;
      return compiledRegex.test(line);
    }

    if (searchMode === 'extended') {
      const subject = isMatchCase ? line : line.toLowerCase();
      const target = isMatchCase ? targetPattern : targetPattern.toLowerCase();
      return subject.includes(target);
    }

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
  const matchedChunks: string[] = [];
  let currentBuffer = '';
  let tempFileSizeBytes = 0;
  let linesExtracted = 0;
  let linesProcessed = 0;

  if (request.sourceType === 'raw_text' || (!request.file && request.rawText)) {
    const lines = (request.rawText || '').split(/\r?\n/);
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
      if (abortController.signal.aborted) {
        jobState.status = 'cancelled';
        jobState.statusText = 'Cancelled by user';
        onProgress(jobState);
        return jobState;
      }

      linesProcessed++;
      if (linesProcessed < startNum) continue;
      if (linesProcessed > endNum) break;

      let line = lines[i];
      if (removeEmptyLines && !line.trim()) continue;
      if (stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');

      if (testLine(line)) {
        linesExtracted++;
        if (bookmarkLine) line = `[MATCH #${linesExtracted}] ${line}`;
        if (previewLines.length < 500) previewLines.push(line);
        currentBuffer += line + '\n';
        tempFileSizeBytes += line.length + 1;
        if (currentBuffer.length >= 1024 * 1024) {
          matchedChunks.push(currentBuffer);
          currentBuffer = '';
        }
      }

      if (i % 2000 === 0) {
        const elapsed = (performance.now() - startTime) / 1000;
        jobState = {
          ...jobState,
          progressPct: Math.round(((i + 1) / totalLines) * 100),
          linesExtracted,
          linesProcessed,
          elapsedSeconds: `${elapsed.toFixed(2)}s`,
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
  } else if (request.file) {
    const file = request.file;
    const totalFileSize = file.size;
    const CHUNK_SIZE = 8 * 1024 * 1024;
    let offset = 0;
    let remainder = '';
    const textDecoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

    while (offset < totalFileSize) {
      if (abortController.signal.aborted) {
        jobState.status = 'cancelled';
        jobState.statusText = 'Cancelled by user';
        onProgress(jobState);
        return jobState;
      }

      const nextOffset = Math.min(offset + CHUNK_SIZE, totalFileSize);
      const chunkBlob = file.slice(offset, nextOffset);
      const chunkBuffer = await chunkBlob.arrayBuffer();
      const isLastChunk = nextOffset >= totalFileSize;
      const chunkText = textDecoder.decode(chunkBuffer, { stream: !isLastChunk });

      const combined = remainder + chunkText;
      const lines = combined.split(/\r?\n/);
      remainder = isLastChunk ? '' : (lines.pop() || '');

      for (let i = 0; i < lines.length; i++) {
        linesProcessed++;
        if (linesProcessed < startNum) continue;
        if (linesProcessed > endNum) {
          offset = totalFileSize;
          break;
        }

        let line = lines[i];
        if (removeEmptyLines && !line.trim()) continue;
        if (stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');

        if (testLine(line)) {
          linesExtracted++;
          if (bookmarkLine) line = `[MATCH #${linesExtracted}] ${line}`;
          if (previewLines.length < 500) previewLines.push(line);
          currentBuffer += line + '\n';
          tempFileSizeBytes += line.length + 1;
          if (currentBuffer.length >= 1024 * 1024) {
            matchedChunks.push(currentBuffer);
            currentBuffer = '';
          }
        }
      }

      offset = nextOffset;
      const elapsed = (performance.now() - startTime) / 1000;
      const mb = offset / (1024 * 1024);
      const throughput = elapsed > 0 ? (mb / elapsed).toFixed(1) : '0.0';

      jobState = {
        ...jobState,
        progressPct: Math.min(99, Math.round((offset / totalFileSize) * 100)),
        linesExtracted,
        linesProcessed,
        throughputMBps: `${throughput} MB/s`,
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
      await new Promise((r) => setTimeout(r, 0));
    }

    if (remainder.length > 0) {
      linesProcessed++;
      let line = remainder;
      if (!removeEmptyLines || line.trim()) {
        if (stripChecksum) line = line.replace(/\*[0-9A-Fa-f]{2}$/, '');
        if (testLine(line)) {
          linesExtracted++;
          if (bookmarkLine) line = `[MATCH #${linesExtracted}] ${line}`;
          if (previewLines.length < 500) previewLines.push(line);
          currentBuffer += line + '\n';
          tempFileSizeBytes += line.length + 1;
        }
      }
    }
  }

  if (currentBuffer.length > 0) {
    matchedChunks.push(currentBuffer);
  }

  const finalBlob = new Blob(matchedChunks, { type: 'text/plain;charset=utf-8' });
  const finalElapsed = (performance.now() - startTime) / 1000;
  const finalThroughput =
    finalElapsed > 0
      ? ((initialJob.totalBytes / (1024 * 1024)) / finalElapsed).toFixed(1)
      : '0.0';

  jobState = {
    ...jobState,
    status: 'completed',
    statusText: `Complete: ${linesExtracted.toLocaleString()} matches`,
    progressPct: 100,
    linesExtracted,
    linesProcessed,
    throughputMBps: `${finalThroughput} MB/s`,
    elapsedSeconds: `${finalElapsed.toFixed(2)}s`,
    tempFile: {
      ...jobState.tempFile,
      sizeBytes: finalBlob.size,
      totalLines: linesExtracted,
      lines: previewLines,
      blob: finalBlob,
    },
  };

  onProgress(jobState);
  activeAbortControllers.delete(initialJob.jobId);
  return jobState;
}

/**
 * Cancels a running extraction job by terminating its worker or firing abort signal
 */
export const cancelExtractionJob = async (jobId: string): Promise<void> => {
  const worker = activeWorkers.get(jobId);
  if (worker) {
    worker.terminate();
    activeWorkers.delete(jobId);
    logger.developer('Terminated Web Worker for extraction job', 'info', { jobId });
  }

  const controller = activeAbortControllers.get(jobId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(jobId);
  }
};

/**
 * Saves extracted file locally in the browser with native file picker or instant download trigger
 */
export const saveTempFile = async (params: SaveTempFileParams): Promise<SaveTempFileResponse> => {
  logger.developer('Saving extraction file directly in browser', 'info', {
    destinationPath: params.destinationPath,
    format: params.format,
  });

  const filename =
    params.destinationPath.split(/[/\\]/).pop() || `extracted_${Date.now()}.${params.format}`;

  const blob =
    params.blob ||
    new Blob([params.content || ''], {
      type: params.format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
    });

  // Attempt Native File System Access API if available
  if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${params.format.toUpperCase()} File`,
            accept: {
              [params.format === 'csv' ? 'text/csv' : 'text/plain']: [`.${params.format}`],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        filePath: handle.name || filename,
        sizeBytes: blob.size,
        message: `Saved ${handle.name || filename} successfully`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          filePath: filename,
          sizeBytes: 0,
          message: 'Save cancelled by user',
        };
      }
      // Fallback to link click if permission denied
    }
  }

  // Universal browser download fallback
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    filePath: filename,
    sizeBytes: blob.size,
    message: `Downloaded ${filename} successfully`,
  };
};

/**
 * Instant browser export helper for temp file contents
 */
export const exportTempFile = (job: ExtractionJob, format: 'log' | 'txt' | 'csv', customName?: string): void => {
  const filename = customName || `extracted_${job.jobId.slice(-6)}.${format}`;
  const blob =
    job.tempFile.blob ||
    new Blob([job.tempFile.fullContent || job.tempFile.lines.join('\n')], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
    });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
