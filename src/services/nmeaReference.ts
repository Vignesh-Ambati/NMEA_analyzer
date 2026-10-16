export interface NmeaDocItem {
  sentence: string;
  name: string;
  description: string;
  talkers: string;
  example: string;
  fields: { name: string; desc: string; example: string }[];
}

export const NMEA_REFERENCE_GUIDE: NmeaDocItem[] = [
  {
    sentence: '$--GGA',
    name: 'Global Positioning System Fix Data',
    description: 'Provides 3D position coordinates (latitude, longitude), fix quality, number of satellites used, horizontal dilution of precision (HDOP), and ellipsoidal/orthometric altitude.',
    talkers: 'GP (GPS), GL (GLONASS), GN (Multi-GNSS), GA (Galileo), GB (BeiDou)',
    example: '$GNGGA,123519.00,3746.4940,N,12225.1640,W,1,10,0.9,545.4,M,-28.4,M,,*47',
    fields: [
      { name: 'UTC Time', desc: 'Time of position fix in hhmmss.ss format', example: '123519.00' },
      { name: 'Latitude', desc: 'Degrees & decimal minutes with hemisphere (N/S)', example: '3746.4940, N' },
      { name: 'Longitude', desc: 'Degrees & decimal minutes with hemisphere (E/W)', example: '12225.1640, W' },
      { name: 'Fix Quality', desc: '0=Invalid, 1=GPS SPS, 2=DGPS/SBAS, 4=RTK Fixed, 5=RTK Float', example: '1 (GPS Fix)' },
      { name: 'SVs Used', desc: 'Number of space vehicles used in navigation calculation', example: '10' },
      { name: 'HDOP', desc: 'Horizontal Dilution of Precision (<1.0 is ideal)', example: '0.9' },
      { name: 'Altitude', desc: 'Antenna altitude above mean sea level in meters', example: '545.4 M' },
    ],
  },
  {
    sentence: '$--RMC',
    name: 'Recommended Minimum Specific GNSS Data',
    description: 'Contains essential navigation metrics including UTC time, fix validity status, position coordinates, speed over ground, course heading, and UTC date.',
    talkers: 'GP, GL, GN, GA, GB',
    example: '$GNRMC,123519.00,A,3746.4940,N,12225.1640,W,120.5,45.2,161026,,,A*73',
    fields: [
      { name: 'Status', desc: 'A = Autonomous/Valid Fix, V = Navigation Receiver Warning (Void)', example: 'A' },
      { name: 'Speed Over Ground', desc: 'Horizontal vehicle speed measured in nautical knots', example: '120.5 knots' },
      { name: 'Course Over Ground', desc: 'True ground track heading in degrees (000.0 - 359.9)', example: '45.2°' },
      { name: 'Date', desc: 'UTC date in ddmmyy format', example: '161026 (16 Oct 2026)' },
    ],
  },
  {
    sentence: '$--GSA',
    name: 'GNSS DOP and Active Satellites',
    description: 'Identifies which satellite PRNs are actively used for the position fix, 2D/3D operating mode, and geometric Dilution of Precision metrics (PDOP, HDOP, VDOP).',
    talkers: 'GP, GL, GN, GA, GB',
    example: '$GNGSA,A,3,03,14,16,22,26,29,31,32,,,,,1.4,0.9,1.1*1E',
    fields: [
      { name: 'Selection Mode', desc: 'M = Manual (forced 2D/3D), A = Automatic 2D/3D switching', example: 'A' },
      { name: 'Fix Mode', desc: '1 = Fix not available, 2 = 2D fix, 3 = 3D fix', example: '3 (3D Fix)' },
      { name: 'PDOP', desc: 'Positional Dilution of Precision (3D spherical accuracy)', example: '1.4' },
      { name: 'HDOP', desc: 'Horizontal Dilution of Precision', example: '0.9' },
      { name: 'VDOP', desc: 'Vertical Dilution of Precision (elevation accuracy)', example: '1.1' },
    ],
  },
  {
    sentence: '$--GSV',
    name: 'GNSS Satellites in View',
    description: 'Provides detailed constellation status for visible satellites including space vehicle PRN, elevation angle, azimuth bearing, and signal-to-noise ratio / C/N0 in dB-Hz.',
    talkers: 'GP (GPS), GL (GLONASS), GA (Galileo), GB (BeiDou)',
    example: '$GPGSV,3,1,11,03,78,045,46,14,54,120,44,16,42,280,42,22,38,190,41*77',
    fields: [
      { name: 'Total Messages', desc: 'Number of GSV sentences required to report all satellites', example: '3' },
      { name: 'Message Number', desc: 'Current sentence sequence index', example: '1' },
      { name: 'SVs in View', desc: 'Total number of satellites above the receiver horizon', example: '11' },
      { name: 'PRN & SNR (C/N0)', desc: 'Satellite ID, Elevation (0-90°), Azimuth (0-359°), C/N0 (dB-Hz)', example: 'PRN 03 @ 46 dB-Hz' },
    ],
  },
  {
    sentence: '$--VTG',
    name: 'Course Over Ground and Ground Speed',
    description: 'Reports true and magnetic course bearings and velocity measured in knots and kilometers per hour.',
    talkers: 'GP, GL, GN',
    example: '$GNVTG,45.2,T,,M,120.5,N,223.2,K,A*28',
    fields: [
      { name: 'Course (True)', desc: 'Track relative to True North in degrees', example: '45.2°' },
      { name: 'Speed (Knots)', desc: 'Ground speed in nautical knots', example: '120.5 N' },
      { name: 'Speed (Km/h)', desc: 'Ground speed in kilometers per hour', example: '223.2 K' },
    ],
  },
  {
    sentence: '$--ZDA',
    name: 'Time & Date',
    description: 'High-precision atomic UTC time, day, month, year, and local timezone hour/minute offsets.',
    talkers: 'GP, GN',
    example: '$GNZDA,123519.00,16,10,2026,00,00*7D',
    fields: [
      { name: 'UTC Time', desc: 'Accurate UTC time down to milliseconds', example: '12:35:19.00' },
      { name: 'Day / Month / Year', desc: 'Full four-digit calendar date', example: '16 / 10 / 2026' },
    ],
  },
];
