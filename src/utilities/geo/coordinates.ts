/**
 * GNSS Geodesic & Coordinate Utilities
 */

/**
 * Convert NMEA DDMM.mmmm format to Decimal Degrees
 * e.g. 1258.1234 N -> 12 + 58.1234/60 = 12.968723 deg
 */
export function nmeaToDecimalDegrees(coord: number, dir: 'N' | 'S' | 'E' | 'W'): number {
  const deg = Math.floor(coord / 100);
  const min = coord % 100;
  let dec = deg + min / 60;
  if (dir === 'S' || dir === 'W') {
    dec = -dec;
  }
  return dec;
}

/**
 * Calculate Great-Circle Haversine distance in meters between two lat/lon points
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
