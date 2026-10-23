import { TaskDefinition } from '../types';

export const svCountTask: TaskDefinition = {
  id: 5,
  title: 'Plot SV count for fix graph',
  icon: '🔢',
  description: 'Total number of satellites in view versus active space vehicles used in navigation fix solution.',
  yAxisLabel: 'SV Count',
  unit: 'SVs',
  isImplemented: true,
  category: 'system',
  calculationMethod: 'Compares total satellites tracked in GSV against SVs flagged as active in GSA fix channels.',
  nmeaSentencesUsed: ['$GNGGA', '$GPGGA', '$GNGSA', '$GPGSV'],
};
