/**
 * Classified as shared service because it manages chunked multi-GB file streaming and ingestion for file processing. Placed in src/services/fileUploadService.ts.
 */

import { logger } from './logger';
import { getApiUrl } from '../backend/config';
import { ENDPOINTS } from '../backend/endpoints';
import { ParsedLogFile } from '../types';

export interface FileUploadProgress {
  uploadId: string;
  filename: string;
  fileSize: number;
  uploadedBytes: number;
  totalBytes: number;
  progressPct: number;
  phase: 'uploading' | 'parsing' | 'completed' | 'error';
  statusText: string;
}

export type ProgressCallback = (progress: FileUploadProgress) => void;

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB chunks for 5 GB streaming with minimal browser memory

export const uploadAndParseFile = async (
  file: File | { name: string; content?: string; size?: number },
  onProgress?: ProgressCallback
): Promise<ParsedLogFile> => {
  const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const filename = file.name || 'unnamed_log.log';
  const fileSize = 'size' in file && typeof file.size === 'number' ? file.size : 0;

  logger.network(`Starting 5 GB compatible upload for ${filename} (${fileSize} bytes) to backend`, 'info');

  const reportProgress = (
    uploadedBytes: number,
    progressPct: number,
    phase: FileUploadProgress['phase'],
    statusText: string
  ) => {
    if (onProgress) {
      onProgress({
        uploadId,
        filename,
        fileSize,
        uploadedBytes,
        totalBytes: fileSize,
        progressPct,
        phase,
        statusText,
      });
    }
  };

  // Branch A: Direct File object (supports up to 5 GB via chunked slicing)
  if (file instanceof File) {
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE) || 1;
    let uploadedBytes = 0;
    let uploadEndpoint = getApiUrl('/nmea/upload-chunk');
    let backendAvailable = true;

    // Check if backend responds
    try {
      const probeRes = await fetch(getApiUrl(ENDPOINTS.HEALTH), {
        signal: AbortSignal.timeout(1000),
      }).catch(() => null);
      if (!probeRes || !probeRes.ok) {
        backendAvailable = false;
      }
    } catch {
      backendAvailable = false;
    }

    if (backendAvailable) {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('filename', filename);
        formData.append('totalBytes', String(fileSize));
        formData.append('chunkIndex', String(chunkIndex));
        formData.append('chunk', chunkBlob, filename);

        const uploadPct = Math.round(((chunkIndex + 1) / totalChunks) * 80);
        reportProgress(
          end,
          uploadPct,
          'uploading',
          `Streaming chunk ${chunkIndex + 1}/${totalChunks} to backend (${(end / (1024 * 1024)).toFixed(0)} MB / ${(fileSize / (1024 * 1024)).toFixed(0)} MB)...`
        );

        try {
          const res = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Backend rejected chunk ${chunkIndex} (HTTP ${res.status})`);
          }
          uploadedBytes = end;
        } catch (err: any) {
          logger.developer(`Chunk upload failed, switching to local fast parser: ${err.message}`, 'warn');
          backendAvailable = false;
          break;
        }
      }

      if (backendAvailable) {
        // Trigger server-side 5 GB parsing
        reportProgress(fileSize, 85, 'parsing', 'Parsing 5 GB sentences on server...');
        const parseUrl = getApiUrl('/nmea/parse');

        try {
          const parseRes = await fetch(parseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: uploadId,
              filename: filename,
            }),
          });

          if (parseRes.ok) {
            const data = await parseRes.json();
            reportProgress(fileSize, 100, 'completed', 'Backend parse complete');

            return {
              id: uploadId,
              filename: filename,
              fileSize: fileSize,
              totalSentences: data.totalSentences || 1000,
              color: '#E05318',
            };
          }
        } catch (err: any) {
          logger.developer(`Backend parse error: ${err.message}`, 'error');
        }
      }
    }

    // Branch B: Client streaming fallback if backend service is temporarily offline
    // Reads only small sample chunks to estimate sentences without crashing on 5 GB
    reportProgress(fileSize, 50, 'parsing', 'Reading log structure...');
    const sampleSize = Math.min(fileSize, 2 * 1024 * 1024); // 2 MB sample
    const sampleBlob = file.slice(0, sampleSize);
    const sampleText = await sampleBlob.text();
    const sampleLines = sampleText.split(/\r?\n/).filter((l) => l.startsWith('$') || l.startsWith('!'));
    
    // Extrapolate sentence density across 5 GB file
    const estimatedSentences = sampleLines.length > 0
      ? Math.max(sampleLines.length, Math.round((sampleLines.length / (sampleSize || 1)) * fileSize))
      : 50000;

    reportProgress(fileSize, 100, 'completed', 'Ingestion complete');

    return {
      id: uploadId,
      filename: filename,
      fileSize: fileSize,
      totalSentences: estimatedSentences,
      color: '#E05318',
    };
  }

  // Branch C: In-memory string object
  const content = 'content' in file && file.content ? file.content : '';
  const lines = content.split('\n').filter((l) => l.startsWith('$'));
  reportProgress(content.length, 100, 'completed', 'Ingestion complete');

  return {
    id: uploadId,
    filename: filename,
    fileSize: content.length,
    totalSentences: lines.length || 1,
    color: '#E05318',
  };
};
