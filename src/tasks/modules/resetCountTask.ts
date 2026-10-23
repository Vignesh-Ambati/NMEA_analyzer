import { TaskDefinition } from '../types';

export const resetCountTask: TaskDefinition = {
  id: 6,
  title: 'Number of times reset Count',
  icon: '🔄',
  description: 'Detection of GNSS receiver resets, cold/warm start reboots, and timestamp discontinuities.',
  yAxisLabel: 'Reset Triggered',
  unit: 'Events',
  isImplemented: true,
  category: 'system',
  calculationMethod: 'Monitors time deltas exceeding expected interval, receiver proprietary restart sentences, and cold boot fix resets.',
  nmeaSentencesUsed: ['$GNGGA', '$GNRMC', '$PUBX'],
};
