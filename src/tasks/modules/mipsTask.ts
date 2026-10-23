import { TaskDefinition } from '../types';

export const mipsTask: TaskDefinition = {
  id: 1,
  title: 'Analyze MIPS',
  icon: '⚙️',
  description: 'Estimated receiver processing load and CPU execution cycles (MIPS) based on channel tracking and PVT filter rate.',
  yAxisLabel: 'Estimated MIPS',
  unit: 'MIPS',
  isImplemented: true,
  category: 'signal',
  calculationMethod: 'Derived from tracked correlation channels, active constellation matrix dimensions, and Kalman update epoch frequency.',
  nmeaSentencesUsed: ['$GNGSA', '$GPGSV', '$GNGGA'],
};
