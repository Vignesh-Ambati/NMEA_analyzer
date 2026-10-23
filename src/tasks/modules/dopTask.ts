import { TaskDefinition } from '../types';

export const dopTask: TaskDefinition = {
  id: 4,
  title: 'Plot DOP graph',
  icon: '🎯',
  description: 'Dilution of Precision geometry analysis (HDOP, PDOP, VDOP) determining geometric constellation strength.',
  yAxisLabel: 'DOP Value',
  unit: '',
  isImplemented: true,
  category: 'position',
  calculationMethod: 'Parses horizontal (HDOP), position (PDOP), and vertical (VDOP) dilution factors from active GSA and GGA sentences.',
  nmeaSentencesUsed: ['$GNGSA', '$GPGSA', '$GNGGA', '$GPGGA'],
};
