import { TaskDefinition } from '../types';

export const cn0Task: TaskDefinition = {
  id: 0,
  title: 'Plot C/N0 graph',
  icon: '📈',
  description: 'Carrier-to-Noise density ratio (dB-Hz) for tracked satellites over time across GPS, GLONASS, Galileo, and BeiDou.',
  yAxisLabel: 'C/N0 (dB-Hz)',
  unit: 'dB-Hz',
  isImplemented: true,
  category: 'signal',
  calculationMethod: 'Aggregated average and peak carrier-to-noise density ratio extracted from GSV sentence space vehicles.',
  nmeaSentencesUsed: ['$GPGSV', '$GLGSV', '$GAGSV', '$GBGSV', '$BDGSV'],
};
