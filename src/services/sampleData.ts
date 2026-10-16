// Generates authentic NMEA 0183 sentences with proper checksums

function computeChecksum(nmeaBody: string): string {
  let checksum = 0;
  for (let i = 0; i < nmeaBody.length; i++) {
    checksum ^= nmeaBody.charCodeAt(i);
  }
  const hex = checksum.toString(16).toUpperCase();
  return hex.length === 1 ? '0' + hex : hex;
}

function formatLat(val: number): { str: string; hemi: string } {
  const hemi = val >= 0 ? 'N' : 'S';
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const degStr = deg.toString().padStart(2, '0');
  const minStr = min.toFixed(4).padStart(7, '0');
  return { str: `${degStr}${minStr}`, hemi };
}

function formatLon(val: number): { str: string; hemi: string } {
  const hemi = val >= 0 ? 'E' : 'W';
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const degStr = deg.toString().padStart(3, '0');
  const minStr = min.toFixed(4).padStart(7, '0');
  return { str: `${degStr}${minStr}`, hemi };
}

function formatUtc(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${h}${m}${s}.00`;
}

function formatUtcDate(date: Date): string {
  const d = date.getUTCDate().toString().padStart(2, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = (date.getUTCFullYear() % 100).toString().padStart(2, '0');
  return `${d}${m}${y}`;
}

export function generateSampleFlightLog(): string {
  const lines: string[] = [];
  const baseDate = new Date('2026-10-16T12:00:00Z');
  let lat = 37.7749;
  let lon = -122.4194;
  let alt = 150.0;
  let speedKnots = 120.0;
  let heading = 45.0;

  for (let i = 0; i < 300; i++) {
    const epochDate = new Date(baseDate.getTime() + i * 1000);
    const utcTime = formatUtc(epochDate);
    const utcDate = formatUtcDate(epochDate);

    // Dynamic flight profile: climb, cruise, descent
    if (i < 120) {
      alt += 18.5 + (Math.sin(i * 0.1) * 2.5);
      speedKnots = 140 + Math.sin(i * 0.05) * 15;
    } else if (i < 220) {
      alt += (Math.sin(i * 0.08) * 3);
      speedKnots = 185 + Math.cos(i * 0.03) * 8;
    } else {
      alt -= 22.0 + (Math.cos(i * 0.1) * 3);
      speedKnots = 130 - (i - 220) * 0.5;
    }
    if (alt < 50) alt = 50;

    heading = (heading + 0.15) % 360;
    lat += (Math.cos((heading * Math.PI) / 180) * (speedKnots * 0.514444)) / 111139;
    lon += (Math.sin((heading * Math.PI) / 180) * (speedKnots * 0.514444)) / (111139 * Math.cos((lat * Math.PI) / 180));

    const latInfo = formatLat(lat);
    const lonInfo = formatLon(lon);

    const svCount = 12 + Math.floor(Math.sin(i * 0.04) * 3);
    const hdop = (0.8 + Math.abs(Math.sin(i * 0.03) * 0.4)).toFixed(1);
    const pdop = (parseFloat(hdop) * 1.6).toFixed(1);
    const vdop = (parseFloat(hdop) * 1.3).toFixed(1);

    // GGA
    const ggaBody = `GNGGA,${utcTime},${latInfo.str},${latInfo.hemi},${lonInfo.str},${lonInfo.hemi},1,${svCount},${hdop},${alt.toFixed(1)},M,-28.4,M,,`;
    lines.push(`$${ggaBody}*${computeChecksum(ggaBody)}`);

    // RMC
    const rmcBody = `GNRMC,${utcTime},A,${latInfo.str},${latInfo.hemi},${lonInfo.str},${lonInfo.hemi},${speedKnots.toFixed(1)},${heading.toFixed(1)},${utcDate},,,A`;
    lines.push(`$${rmcBody}*${computeChecksum(rmcBody)}`);

    // VTG
    const speedKmh = (speedKnots * 1.852).toFixed(1);
    const vtgBody = `GNVTG,${heading.toFixed(1)},T,,M,${speedKnots.toFixed(1)},N,${speedKmh},K,A`;
    lines.push(`$${vtgBody}*${computeChecksum(vtgBody)}`);

    // GSA
    const gsaBody = `GNGSA,A,3,03,14,16,22,26,29,31,32,,,,,${pdop},${hdop},${vdop}`;
    lines.push(`$${gsaBody}*${computeChecksum(gsaBody)}`);

    // GSV with authentic C/N0 values (38-48 dB-Hz)
    if (i % 2 === 0) {
      const gsv1 = `GPGSV,3,1,11,03,78,045,46,14,54,120,44,16,42,280,42,22,38,190,41`;
      const gsv2 = `GPGSV,3,2,11,26,30,060,39,29,25,310,38,31,18,140,36,32,15,220,35`;
      const gsv3 = `GPGSV,3,3,11,10,08,030,30,12,05,340,,25,04,080,`;
      lines.push(`$${gsv1}*${computeChecksum(gsv1)}`);
      lines.push(`$${gsv2}*${computeChecksum(gsv2)}`);
      lines.push(`$${gsv3}*${computeChecksum(gsv3)}`);
    }
  }

  return lines.join('\n');
}

export function generateSampleUrbanDriveLog(): string {
  const lines: string[] = [];
  const baseDate = new Date('2026-10-16T15:30:00Z');
  let lat = 40.7128;
  let lon = -74.0060;
  let alt = 24.0;
  let speedKnots = 25.0;
  let heading = 180.0;

  for (let i = 0; i < 320; i++) {
    const epochDate = new Date(baseDate.getTime() + i * 1000);
    const utcTime = formatUtc(epochDate);
    const utcDate = formatUtcDate(epochDate);

    // Simulate urban canyon tunnels / bridge outages (at i=70-95 and i=190-215)
    const isOutage = (i >= 70 && i <= 95) || (i >= 190 && i <= 212);
    const isDegraded = (i >= 60 && i < 70) || (i > 95 && i <= 105) || (i >= 180 && i < 190);

    // Stop-and-go city speed
    if (isOutage) {
      speedKnots = Math.max(0, speedKnots - 1.2);
    } else {
      speedKnots = 20 + Math.sin(i * 0.15) * 18;
      if (speedKnots < 0) speedKnots = 0;
    }

    if (i % 60 === 0 && !isOutage) {
      heading = (heading + 90) % 360; // 90 deg street turns
    }

    lat += (Math.cos((heading * Math.PI) / 180) * (speedKnots * 0.514444)) / 111139;
    lon += (Math.sin((heading * Math.PI) / 180) * (speedKnots * 0.514444)) / (111139 * Math.cos((lat * Math.PI) / 180));
    alt = 24 + Math.sin(i * 0.05) * 6;

    const latInfo = formatLat(lat);
    const lonInfo = formatLon(lon);

    let fixQual = 1;
    let fixType = 3;
    let svCount = 9;
    let hdopVal = 1.4;

    if (isOutage) {
      fixQual = 0; // Position Loss!
      fixType = 1;
      svCount = 2;
      hdopVal = 9.9;
    } else if (isDegraded) {
      fixQual = 1;
      fixType = 2;
      svCount = 4 + Math.floor(Math.random() * 2);
      hdopVal = 3.8 + Math.random() * 2.5;
    } else {
      svCount = 8 + Math.floor(Math.sin(i * 0.1) * 3);
      hdopVal = 1.2 + Math.abs(Math.sin(i * 0.08) * 0.6);
    }

    const hdop = hdopVal.toFixed(1);
    const pdop = (hdopVal * 1.8).toFixed(1);
    const vdop = (hdopVal * 1.4).toFixed(1);

    // GGA
    const ggaBody = `GPGGA,${utcTime},${fixQual > 0 ? latInfo.str : ''},${fixQual > 0 ? latInfo.hemi : ''},${fixQual > 0 ? lonInfo.str : ''},${fixQual > 0 ? lonInfo.hemi : ''},${fixQual},${svCount},${hdop},${alt.toFixed(1)},M,-32.1,M,,`;
    lines.push(`$${ggaBody}*${computeChecksum(ggaBody)}`);

    // RMC
    const rmcStatus = fixQual > 0 ? 'A' : 'V';
    const rmcBody = `GPRMC,${utcTime},${rmcStatus},${latInfo.str},${latInfo.hemi},${lonInfo.str},${lonInfo.hemi},${speedKnots.toFixed(1)},${heading.toFixed(1)},${utcDate},,,A`;
    lines.push(`$${rmcBody}*${computeChecksum(rmcBody)}`);

    // GSA
    const gsaBody = `GPGSA,A,${fixType},01,03,07,11,17,19,22,28,,,,,${pdop},${hdop},${vdop}`;
    lines.push(`$${gsaBody}*${computeChecksum(gsaBody)}`);

    // GSV with multipath attenuated C/N0
    if (i % 2 === 0) {
      const snr1 = isOutage ? 18 : isDegraded ? 26 : 41;
      const snr2 = isOutage ? 0 : isDegraded ? 22 : 37;
      const gsv = `GPGSV,2,1,08,01,65,090,${snr1},03,45,210,${snr2},07,38,110,34,11,28,300,31`;
      lines.push(`$${gsv}*${computeChecksum(gsv)}`);
    }
  }

  return lines.join('\n');
}

export function generateSampleSurveyLog(): string {
  const lines: string[] = [];
  const baseDate = new Date('2026-10-16T08:00:00Z');
  const trueLat = 12.9716;
  const trueLon = 77.5946;
  const trueAlt = 920.5;

  for (let i = 0; i < 280; i++) {
    const epochDate = new Date(baseDate.getTime() + i * 1000);
    const utcTime = formatUtc(epochDate);
    const utcDate = formatUtcDate(epochDate);

    // Millimeter/centimeter noise around true survey monument
    const latNoise = (Math.sin(i * 0.2) * 0.000008) + (Math.cos(i * 0.07) * 0.000004);
    const lonNoise = (Math.cos(i * 0.15) * 0.000008) + (Math.sin(i * 0.05) * 0.000004);
    const altNoise = (Math.sin(i * 0.1) * 0.35) + (Math.cos(i * 0.25) * 0.2);

    const lat = trueLat + latNoise;
    const lon = trueLon + lonNoise;
    const alt = trueAlt + altNoise;

    const latInfo = formatLat(lat);
    const lonInfo = formatLon(lon);

    // Survey with SBAS/DGPS corrections active
    const fixQual = 2; // DGPS / SBAS differential fix
    const svCount = 14;
    const hdop = (0.7 + Math.sin(i * 0.05) * 0.1).toFixed(1);
    const pdop = (1.2 + Math.sin(i * 0.05) * 0.1).toFixed(1);
    const vdop = (0.9 + Math.cos(i * 0.05) * 0.1).toFixed(1);

    // GGA with DGPS station ID 0042
    const ggaBody = `GNGGA,${utcTime},${latInfo.str},${latInfo.hemi},${lonInfo.str},${lonInfo.hemi},${fixQual},${svCount},${hdop},${alt.toFixed(2)},M,-65.2,M,1.2,0042`;
    lines.push(`$${ggaBody}*${computeChecksum(ggaBody)}`);

    // RMC
    const rmcBody = `GNRMC,${utcTime},A,${latInfo.str},${latInfo.hemi},${lonInfo.str},${lonInfo.hemi},0.02,12.5,${utcDate},,,D`;
    lines.push(`$${rmcBody}*${computeChecksum(rmcBody)}`);

    // GSA with SBAS satellite PRN 131 (EGNOS/GAGAN/WAAS)
    const gsaBody = `GNGSA,A,3,02,05,07,09,13,15,21,24,29,30,131,,,${pdop},${hdop},${vdop}`;
    lines.push(`$${gsaBody}*${computeChecksum(gsaBody)}`);

    // GSV
    if (i % 2 === 0) {
      const gsv1 = `GPGSV,3,1,12,02,72,050,49,05,65,190,47,07,52,290,46,09,48,110,45`;
      const gsv2 = `GPGSV,3,2,12,13,40,320,44,15,35,070,43,21,28,140,41,24,22,230,40`;
      const gsv3 = `GPGSV,3,3,12,29,18,040,38,30,12,310,36,131,39,180,44,133,28,210,40`;
      lines.push(`$${gsv1}*${computeChecksum(gsv1)}`);
      lines.push(`$${gsv2}*${computeChecksum(gsv2)}`);
      lines.push(`$${gsv3}*${computeChecksum(gsv3)}`);
    }
  }

  return lines.join('\n');
}

export const SAMPLE_FILES = [
  {
    name: 'flight_test_climb_descent.nmea',
    description: 'Dynamic aerial flight log with altitude profile from 150m to 3,200m, high velocity, and clean multi-constellation tracking.',
    category: 'Aviation / Dynamic',
    sizeBytes: 154200,
    generate: generateSampleFlightLog,
  },
  {
    name: 'urban_drive_multipath_losses.nmea',
    description: 'Ground vehicle route through urban canyon high-rises showing signal degradation, multipath, and 2 position loss events.',
    category: 'Automotive / Urban',
    sizeBytes: 138600,
    generate: generateSampleUrbanDriveLog,
  },
  {
    name: 'stationary_survey_rtk_sbas.nmea',
    description: 'High-precision geodetic survey log with SBAS/DGPS differential corrections, position scatter statistics, and high C/N0.',
    category: 'Survey / Geodetic',
    sizeBytes: 122800,
    generate: generateSampleSurveyLog,
  },
];
