/**
 * Classified as shared service because it computes task matrix plot points and statistical summaries for GNSS analysis tasks independently of UI components. Placed in /src/services/taskCalculationService.ts.
 */

import { SeriesData, PlotDataPoint, ParsedLogFile } from '../types';
import { logger } from './logger';

/**
 * Computes deterministic, high-resolution time series points for a given task and file.
 * Handles client-side simulation when backend is offline or processed separately.
 */
export const calculateTaskSeries = (
  file: ParsedLogFile,
  taskId: number,
  pointsCount: number = 80
): SeriesData => {
  logger.system(`Calculating client-side task series for ${file.filename} (Task ${taskId})`);

  const points: PlotDataPoint[] = [];
  const baseTime = 1730592000; // Reference base epoch timestamp
  const color = file.color || '#E05318';

  // Deterministic seed based on filename and taskId
  let seed = 0;
  for (let i = 0; i < file.filename.length; i++) {
    seed = (seed + file.filename.charCodeAt(i) * 31) % 1000;
  }

  for (let i = 0; i < pointsCount; i++) {
    const time = baseTime + i * 2;
    const progress = i / pointsCount;
    let value = 0;

    switch (taskId) {
      case 1: {
        // C/N0 (Carrier to Noise ratio, typical 25 to 48 dB-Hz)
        const baseSignal = 36 + Math.sin(progress * Math.PI * 4 + seed) * 6;
        const noise = ((i * 17 + seed) % 10) / 3 - 1.5;
        value = Math.max(22, Math.min(50, Math.round((baseSignal + noise) * 10) / 10));
        break;
      }
      case 2: {
        // Estimated Processor Load in MIPS (e.g. 15 to 45 MIPS)
        const load = 22 + Math.cos(progress * Math.PI * 3 + seed) * 8 + (i % 5);
        value = Math.round(load * 10) / 10;
        break;
      }
      case 3: {
        // Position Fix Loss / Outages (1 = 3D Fix, 0 = Dropout)
        const hasOutage = (i > 25 && i < 30) || (i > 58 && i < 62);
        value = hasOutage ? 0 : 1;
        break;
      }
      case 4: {
        // Altitude MSL in meters (e.g. 120m to 180m flight/drive profile)
        const altitude = 135 + Math.sin(progress * Math.PI * 2 + seed) * 35 + ((i * 7) % 5);
        value = Math.round(altitude * 10) / 10;
        break;
      }
      case 5: {
        // DOP Value (HDOP / PDOP, typical 0.8 to 3.5)
        const dop = 1.2 + Math.sin(progress * Math.PI * 5 + seed) * 0.6 + ((i * 13) % 7) / 10;
        value = Math.max(0.7, Math.round(dop * 100) / 100);
        break;
      }
      case 6: {
        // Tracked & Used Satellite Count (8 to 22 sats)
        const sats = 14 + Math.round(Math.sin(progress * Math.PI * 2 + seed) * 4) + (i % 3);
        value = Math.max(6, Math.min(28, sats));
        break;
      }
      case 7: {
        // Receiver Reset Counter (Cumulative step function: 0, 1, 2...)
        const resets = i < 35 ? 0 : i < 65 ? 1 : 2;
        value = resets;
        break;
      }
      case 8: {
        // SBAS Differential Corrections (1 = Differential Lock, 0 = Autonomous)
        const sbasLocked = i < 15 ? 0 : i < 70 ? 1 : 0;
        value = sbasLocked;
        break;
      }
      case 9: {
        // Statistical Availability percentage (92% to 100%)
        const stat = 96.5 + Math.cos(progress * Math.PI * 3 + seed) * 2.5;
        value = Math.min(100, Math.round(stat * 10) / 10);
        break;
      }
      default: {
        value = Math.round(Math.sin(progress * Math.PI * 4) * 20 + 50);
        break;
      }
    }

    const date = new Date(time * 1000);
    const label = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;

    points.push({
      time,
      value,
      label,
    });
  }

  logger.system(`Calculated ${points.length} data points for Task ${taskId} on ${file.filename}`);

  return {
    fileId: file.id,
    filename: file.filename,
    color,
    points,
  };
};
