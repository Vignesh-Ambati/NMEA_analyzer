/**
 * Tasks Registry
 * 
 * Central registry uniting dedicated task modules.
 */

import { TaskDefinition, TaskCategory } from './types';
import { cn0Task } from './modules/cn0Task';
import { mipsTask } from './modules/mipsTask';
import { positionLossTask } from './modules/positionLossTask';
import { altitudeTask } from './modules/altitudeTask';
import { dopTask } from './modules/dopTask';
import { svCountTask } from './modules/svCountTask';
import { resetCountTask } from './modules/resetCountTask';
import { sbasTask } from './modules/sbasTask';
import { statsTask } from './modules/statsTask';
import { velocityTask } from './modules/velocityTask';

export const TASKS_CONFIG: TaskDefinition[] = [
  cn0Task,
  mipsTask,
  positionLossTask,
  altitudeTask,
  dopTask,
  svCountTask,
  resetCountTask,
  sbasTask,
  statsTask,
  velocityTask,
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
