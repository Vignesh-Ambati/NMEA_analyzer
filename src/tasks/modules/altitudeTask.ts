import { TaskDefinition } from '../types';

export const altitudeTask: TaskDefinition = {
  id: 3,
  title: 'Plot altitude graph',
  icon: '🏔️',
  description: 'Mean Sea Level (MSL) altitude and geoidal undulation over mission timeline extracted from GGA sentences.',
  yAxisLabel: 'Altitude (m)',
  unit: 'm',
  isImplemented: true,
  category: 'position',
  calculationMethod: 'Extracted from Antenna Altitude above MSL field in GGA sentence, accounting for geoid separation.',
  nmeaSentencesUsed: ['$GNGGA', '$GPGGA'],
};
