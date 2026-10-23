import { TaskDefinition } from '../types';

export const statsTask: TaskDefinition = {
  id: 8,
  title: 'Plot statistics vs true values',
  icon: '📐',
  description: 'Position error scatter, radial deviation from centroid monument, 1-sigma, 2-sigma 2DRMS, and CEP metrics.',
  yAxisLabel: 'Radial Scatter Error (m)',
  unit: 'm',
  isImplemented: true,
  category: 'position',
  calculationMethod: 'Computes Euclidean coordinate deviations from anchor reference centroid, evaluating Circular Error Probable (CEP 50%) and 2DRMS (95%).',
  nmeaSentencesUsed: ['$GNGGA', '$GNRMC'],
};
