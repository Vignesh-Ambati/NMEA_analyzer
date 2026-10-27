export type ThemeMode = 'dark' | 'light';

export type PageType = 'file' | 'task' | 'graph' | 'reference' | 'tools' | 'developer';

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

export interface ParsedLogFile {
  id: string;
  filename: string;
  fileSize: number;
  color?: string;
  totalSentences?: number;
}

export interface TaskDefinition {
  id: number;
  title: string;
  icon: string;
  description: string;
  yAxisLabel: string;
  unit: string;
  category: 'signal' | 'position' | 'system' | 'velocity';
  isImplemented: boolean;
}
