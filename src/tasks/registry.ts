/**
 * Tasks Registry
 *
 * Central registry of GNSS analysis tasks definitions.
 */

import { TaskDefinition, TaskCategory } from './types';

export const TASKS_CONFIG: TaskDefinition[] = [
  {
    id: 1,
    title: 'Carrier-to-Noise Ratio (C/N0)',
    icon: 'Radio',
    description: 'Satellite carrier signal strength in dB-Hz across active constellations.',
    yAxisLabel: 'C/N0 (dB-Hz)',
    unit: 'dB-Hz',
    category: 'signal',
    isImplemented: false,
  },
  {
    id: 2,
    title: 'Estimated Processor Load (MIPS)',
    icon: 'Cpu',
    description: 'Processor workload estimated from sentence rate and multi-constellation tracking.',
    yAxisLabel: 'Load (MIPS)',
    unit: 'MIPS',
    category: 'system',
    isImplemented: false,
  },
  {
    id: 3,
    title: 'Position Fix Loss / Outages',
    icon: 'AlertTriangle',
    description: 'Chronological timeline of position fix dropouts and recovery events.',
    yAxisLabel: 'Fix Status',
    unit: 'status',
    category: 'position',
    isImplemented: false,
  },
  {
    id: 4,
    title: 'Altitude (MSL & Ellipsoidal)',
    icon: 'TrendingUp',
    description: 'Mean sea level altitude and geoidal height variations over flight/drive log.',
    yAxisLabel: 'Altitude (m)',
    unit: 'm',
    category: 'position',
    isImplemented: false,
  },
  {
    id: 5,
    title: 'Dilution of Precision (DOP)',
    icon: 'Compass',
    description: 'HDOP, VDOP, and PDOP geometric satellite geometry dilution metrics.',
    yAxisLabel: 'DOP Value',
    unit: '',
    category: 'system',
    isImplemented: false,
  },
  {
    id: 6,
    title: 'Tracked & Used SV Count',
    icon: 'Satellite',
    description: 'Number of satellites used in navigation solution versus total in view.',
    yAxisLabel: 'SV Count',
    unit: 'sats',
    category: 'system',
    isImplemented: false,
  },
  {
    id: 7,
    title: 'Receiver Reset Counter',
    icon: 'RefreshCw',
    description: 'Cumulative count and timestamp markers of receiver restarts/resets.',
    yAxisLabel: 'Reset Events',
    unit: 'events',
    category: 'system',
    isImplemented: false,
  },
  {
    id: 8,
    title: 'SBAS Differential Corrections',
    icon: 'Shield',
    description: 'Satellite-based augmentation system (WAAS/EGNOS/GAGAN) differential lock.',
    yAxisLabel: 'SBAS Active',
    unit: '',
    category: 'signal',
    isImplemented: false,
  },
  {
    id: 9,
    title: 'Comprehensive Statistical Summary',
    icon: 'BarChart2',
    description: 'Fix availability percentages, RMS errors, and constellation metrics summary.',
    yAxisLabel: 'Percentage (%)',
    unit: '%',
    category: 'signal',
    isImplemented: false,
  },
  {
    id: 10,
    title: 'Ground Speed & Velocity',
    icon: 'Gauge',
    description: 'Over-the-ground velocity in km/h and knots derived from VTG and RMC sentences.',
    yAxisLabel: 'Speed (km/h)',
    unit: 'km/h',
    category: 'velocity',
    isImplemented: false,
  },
];

export const getTaskById = (id: number): TaskDefinition => {
  return TASKS_CONFIG.find((t) => t.id === id) || TASKS_CONFIG[0];
};

export const getTasksByCategory = (category: TaskCategory | 'all'): TaskDefinition[] => {
  if (category === 'all') return TASKS_CONFIG;
  return TASKS_CONFIG.filter((t) => t.category === category);
};

export interface TaskCategoryInfo {
  id: TaskCategory | 'all';
  label: string;
  count: number;
}

export const getTaskCategories = (): TaskCategoryInfo[] => [
  { id: 'all', label: `All Tasks (${TASKS_CONFIG.length})`, count: TASKS_CONFIG.length },
  { id: 'signal', label: 'Signal & SNR', count: TASKS_CONFIG.filter((t) => t.category === 'signal').length },
  { id: 'position', label: 'Coordinates & Altitude', count: TASKS_CONFIG.filter((t) => t.category === 'position').length },
  { id: 'system', label: 'Satellites & Dilution', count: TASKS_CONFIG.filter((t) => t.category === 'system').length },
  { id: 'velocity', label: 'Ground Speed & Course', count: TASKS_CONFIG.filter((t) => t.category === 'velocity').length },
];
