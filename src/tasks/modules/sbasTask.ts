import { TaskDefinition } from '../types';

export const sbasTask: TaskDefinition = {
  id: 7,
  title: 'SBAS use in the log',
  icon: '🛰️',
  description: 'Analysis of Space Based Augmentation System (WAAS / EGNOS / GAGAN) tracking and differential correction status.',
  yAxisLabel: 'SBAS Differential Active',
  unit: 'Status',
  isImplemented: true,
  category: 'system',
  calculationMethod: 'Checks for DGPS fix indicator 2 in GGA, active PRNs in 120-158 range (EGNOS, WAAS, GAGAN), and diff age.',
  nmeaSentencesUsed: ['$GNGGA', '$GPGSA', '$GPGSV'],
};
