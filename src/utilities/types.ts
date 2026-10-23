import React from 'react';

export type UtilityId = 'timediff' | 'utc_ist' | 'linecopy';

export interface UtilityConfig {
  id: UtilityId;
  title: string;
  shortTitle: string;
  categoryLabel: string;
  tagLine: string;
  detailedInfo: string;
  inputFormat: string;
  outputSpec: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ParsedGnssTime {
  hours: number;
  minutes: number;
  seconds: number;
  rawSecondsStr: string;
  totalSecondsOfDay: number;
  formattedTime: string;
  nmeaTimeStr: string;
  hasDate: boolean;
  day?: number;
  month?: number;
  year?: number;
  formattedDate?: string;
  nmeaDateStr?: string;
  timestampMs?: number;
  rawInput: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface TimeDifferenceResult {
  deltaSeconds: number;
  deltaHours: number;
  deltaMinutes: number;
  deltaRemSeconds: number;
  formattedDelta: string;
  isNegative: boolean;
}

export interface TimezoneConvertResult {
  direction: 'utc_to_ist' | 'ist_to_utc';
  inputTime: string;
  outputTime: string;
  outputDate?: string;
  dayShift: -1 | 0 | 1;
}

export interface SlicedLineResult {
  lines: string[];
  totalInputLines: number;
  matchedCount: number;
  removedChecksumsCount: number;
}
