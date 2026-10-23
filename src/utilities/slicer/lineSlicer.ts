/**
 * NMEA Line Slicer & Filter Algorithms
 */

import { SlicedLineResult } from '../types';

export interface LineSliceOptions {
  filterType?: string; // e.g. "GGA", "RMC", or "all"
  startLine?: number;
  endLine?: number;
  stripChecksum?: boolean;
}

export function sliceNmeaLines(rawText: string, options: LineSliceOptions): SlicedLineResult {
  const allLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const totalInputLines = allLines.length;

  let matched = allLines;
  let removedChecksumsCount = 0;

  // 1. Line range slicing
  const start = Math.max(0, (options.startLine ?? 1) - 1);
  const end = options.endLine ? Math.min(allLines.length, options.endLine) : allLines.length;
  matched = matched.slice(start, end);

  // 2. Type filtering
  if (options.filterType && options.filterType.toLowerCase() !== 'all') {
    const filterUpper = options.filterType.toUpperCase();
    matched = matched.filter((line) => {
      // e.g. $GNGGA or $GPGGA matches GGA
      return line.toUpperCase().includes(filterUpper);
    });
  }

  // 3. Strip checksums
  if (options.stripChecksum) {
    matched = matched.map((line) => {
      const astIdx = line.indexOf('*');
      if (astIdx !== -1) {
        removedChecksumsCount++;
        return line.substring(0, astIdx);
      }
      return line;
    });
  }

  return {
    lines: matched,
    totalInputLines,
    matchedCount: matched.length,
    removedChecksumsCount,
  };
}
