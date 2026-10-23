import { TaskDefinition } from '../types';

export const positionLossTask: TaskDefinition = {
  id: 2,
  title: 'Check for position losses',
  icon: '📍',
  description: 'Epoch-by-epoch fix continuity detection to pinpoint fix losses, outage durations, and recovery latency.',
  yAxisLabel: 'Fix State (1=Valid, 0=Loss)',
  unit: 'State',
  isImplemented: true,
  category: 'position',
  calculationMethod: 'Monitors GGA fix quality indicator (0=Invalid, 1=GPS, 2=DGPS/SBAS) and RMC status (A=Active, V=Void).',
  nmeaSentencesUsed: ['$GNGGA', '$GPGGA', '$GNRMC', '$GPRMC'],
};
