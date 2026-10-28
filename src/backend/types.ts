/**
 * Backend Data Contracts & Interfaces
 *
 * Prepared for upcoming backend server integration (NMEA parsing, epoch aggregation, and task telemetry).
 */

export interface BackendParsedSentence {
  raw: string;
  talker: string;      // GP, GL, GN, GA, GB
  type: string;        // GGA, RMC, GSA, GSV, VTG, ZDA
  timestamp: number;   // UNIX epoch seconds
  timeStr: string;     // HH:MM:SS
  fields: string[];
  validChecksum: boolean;
}

export interface BackendEpochData {
  time: number;
  timeStr: string;
  dateStr?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speedKmh?: number;
  heading?: number;
  fixQuality?: number;
  satellitesUsed?: number;
  hdop?: number;
  pdop?: number;
  vdop?: number;
  avgCn0?: number;
}

export interface BackendFileUploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  fileSize: number;
  totalSentences: number;
  epochsCount: number;
  message?: string;
  error?: string;
}

export interface BackendTaskCalculationPayload {
  fileId: string;
  taskId: number;
  parameters?: Record<string, any>;
}

export interface BackendTaskCalculationResponse {
  taskId: number;
  fileId: string;
  points: Array<{
    time: number;
    value: number;
    label?: string;
  }>;
  summary?: {
    min: number;
    max: number;
    avg: number;
    count: number;
  };
}

export interface EngineTuningParams {
  batchSize: number;
  retentionWindow: number;
  workerCount: number;
  updatedAt?: string;
}

export interface EngineTuningResponse {
  success: boolean;
  message: string;
  params?: EngineTuningParams;
}

export interface UpdateDevPasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export interface UpdateDevPasswordResponse {
  success: boolean;
  message: string;
}
