/**
 * Dedicated Types & Interfaces for GNSS Analysis Tasks
 */

export type TaskCategory = 'signal' | 'position' | 'system' | 'velocity';

export interface TaskDefinition {
  id: number;
  title: string;
  icon: string;
  description: string;
  yAxisLabel: string;
  unit: string;
  isImplemented: boolean;
  category?: TaskCategory;
  calculationMethod?: string;
  nmeaSentencesUsed?: string[];
}

export interface TaskDataPoint {
  time: number; // Unix epoch seconds or relative seconds
  value: number;
  label?: string;
  rawSentence?: string;
}

export interface TaskSeriesResult {
  fileId: string;
  filename: string;
  color: string;
  points: TaskDataPoint[];
}

export interface TaskSummaryStats {
  min: number;
  max: number;
  avg: number;
  count: number;
  stdDev?: number;
  latestValue?: number;
}
