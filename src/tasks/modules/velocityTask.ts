import { TaskDefinition } from '../types';

export const velocityTask: TaskDefinition = {
  id: 9,
  title: 'Velocity Plot Graph',
  icon: '💨',
  description: 'Speed over ground (km/h & knots) and course heading over ground extracted from VTG & RMC sentences.',
  yAxisLabel: 'Speed Over Ground (km/h)',
  unit: 'km/h',
  isImplemented: true,
  category: 'velocity',
  calculationMethod: 'Parses Speed Over Ground (SOG) in km/h and knots, plus Track Made Good (TMG) course true angle from VTG and RMC.',
  nmeaSentencesUsed: ['$GNVTG', '$GPVTG', '$GNRMC', '$GPRMC'],
};
