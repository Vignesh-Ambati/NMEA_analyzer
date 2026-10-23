export interface NMEASentence {
  raw: string;
  talker: string;      // GP, GL, GN, GA, GB
  type: string;        // GGA, RMC, GSA, GSV, VTG, ZDA
  timestamp: number;   // UNIX epoch seconds
  timeStr: string;     // HH:MM:SS
  fields: string[];
  validChecksum: boolean;
}

export interface EpochData {
  time: number;          // UNIX timestamp in seconds
  timeStr: string;       // HH:MM:SS
  dateStr?: string;      // YYYY-MM-DD
  latitude?: number;     // Decimal degrees
  longitude?: number;    // Decimal degrees
  altitude?: number;     // MSL altitude in meters
  geoidalSep?: number;   // Geoidal separation in meters
  speedKnots?: number;   // Speed in knots
  speedKmh?: number;     // Speed in km/h
  heading?: number;      // Course over ground (deg)
  fixQuality?: number;   // 0=No fix, 1=GPS, 2=DGPS, 4=RTK Fixed, 5=RTK Float
  fixType?: number;      // 1=No fix, 2=2D, 3=3D
  satellitesUsed?: number;
  satellitesInView?: number;
  pdop?: number;
  hdop?: number;
  vdop?: number;
  mips?: number;         // Estimated processor load MIPS
  cn0Values?: { prn: number; cn0: number; system: string }[];
  avgCn0?: number;
  maxCn0?: number;
  sbasUsed?: boolean;
  isReset?: boolean;
}

export interface ParsedLogFile {
  id: string;
  filename: string;
  fileSize: number;
  totalSentences: number;
  validSentences: number;
  invalidSentences: number;
  sentenceCounts: Record<string, number>;
  epochs: EpochData[];
  rawSentences: NMEASentence[];
  startTime: number;
  endTime: number;
  durationSeconds: number;
  color: string;
  stats: LogStats;
}

export interface LogStats {
  totalEpochs: number;
  validFixEpochs: number;
  fixLossEpochs: number;
  fixAvailabilityPct: number;
  minAltitude: number;
  maxAltitude: number;
  avgAltitude: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  minHdop: number;
  maxHdop: number;
  avgHdop: number;
  maxSvCount: number;
  avgSvCount: number;
  avgCn0: number;
  resetsCount: number;
  sbasUsageCount: number;
  cepMeters?: number;
  drms2Meters?: number;
}

export interface TaskDefinition {
  id: number;
  title: string;
  icon: string;
  description: string;
  yAxisLabel: string;
  unit: string;
  isImplemented: boolean;
}

export interface PlotDataPoint {
  time: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface SeriesData {
  fileId: string;
  filename: string;
  color: string;
  points: PlotDataPoint[];
}

export type ThemeMode = 'dark' | 'light';

export type PageType = 'file' | 'task' | 'graph' | 'reference' | 'tools' | 'developer';
