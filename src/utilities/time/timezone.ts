/**
 * UTC <-> IST Timezone Conversion Utilities
 * 
 * UTC is GMT+0:00
 * IST is GMT+5:30 (India Standard Time = UTC + 5 hours 30 minutes = 19,800 seconds)
 */

import { ParsedGnssTime, TimezoneConvertResult } from '../types';

export const IST_OFFSET_SECONDS = 5 * 3600 + 30 * 60; // 19800 seconds

export function convertUtcToIst(parsed: ParsedGnssTime): TimezoneConvertResult {
  const pad2 = (n: number) => n.toString().padStart(2, '0');

  if (parsed.timestampMs !== undefined) {
    // Exact date conversion using timestamps
    const istMs = parsed.timestampMs + IST_OFFSET_SECONDS * 1000;
    const istDate = new Date(istMs);

    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const seconds = istDate.getUTCSeconds();
    const millis = istDate.getUTCMilliseconds();

    const secFraction = (seconds + millis / 1000).toFixed(2);
    const secWhole = pad2(Math.floor(parseFloat(secFraction)));
    const secDec = secFraction.includes('.') ? secFraction.substring(secFraction.indexOf('.')) : '.00';

    const outputTime = `${pad2(hours)}:${pad2(minutes)}:${secWhole}${secDec}`;
    const outputDate = `${pad2(istDate.getUTCDate())}/${pad2(istDate.getUTCMonth() + 1)}/${istDate.getUTCFullYear()}`;

    const originalDay = parsed.day || 0;
    const newDay = istDate.getUTCDate();
    let dayShift: -1 | 0 | 1 = 0;
    if (newDay > originalDay) dayShift = 1;
    else if (newDay < originalDay) dayShift = -1;

    return {
      direction: 'utc_to_ist',
      inputTime: parsed.formattedTime,
      outputTime,
      outputDate,
      dayShift,
    };
  }

  // Time-only conversion with rolling seconds of day
  const totalSeconds = parsed.totalSecondsOfDay + IST_OFFSET_SECONDS;
  const dayShift: -1 | 0 | 1 = totalSeconds >= 86400 ? 1 : 0;
  const wrappedSeconds = ((totalSeconds % 86400) + 86400) % 86400;

  const hours = Math.floor(wrappedSeconds / 3600);
  const minutes = Math.floor((wrappedSeconds % 3600) / 60);
  const seconds = wrappedSeconds % 60;

  const secFraction = seconds.toFixed(2);
  const secWhole = pad2(Math.floor(seconds));
  const secDec = secFraction.includes('.') ? secFraction.substring(secFraction.indexOf('.')) : '.00';
  const outputTime = `${pad2(hours)}:${pad2(minutes)}:${secWhole}${secDec}`;

  return {
    direction: 'utc_to_ist',
    inputTime: parsed.formattedTime,
    outputTime,
    dayShift,
  };
}

export function convertIstToUtc(parsed: ParsedGnssTime): TimezoneConvertResult {
  const pad2 = (n: number) => n.toString().padStart(2, '0');

  if (parsed.timestampMs !== undefined) {
    const utcMs = parsed.timestampMs - IST_OFFSET_SECONDS * 1000;
    const utcDate = new Date(utcMs);

    const hours = utcDate.getUTCHours();
    const minutes = utcDate.getUTCMinutes();
    const seconds = utcDate.getUTCSeconds();
    const millis = utcDate.getUTCMilliseconds();

    const secFraction = (seconds + millis / 1000).toFixed(2);
    const secWhole = pad2(Math.floor(parseFloat(secFraction)));
    const secDec = secFraction.includes('.') ? secFraction.substring(secFraction.indexOf('.')) : '.00';

    const outputTime = `${pad2(hours)}:${pad2(minutes)}:${secWhole}${secDec}`;
    const outputDate = `${pad2(utcDate.getUTCDate())}/${pad2(utcDate.getUTCMonth() + 1)}/${utcDate.getUTCFullYear()}`;

    const originalDay = parsed.day || 0;
    const newDay = utcDate.getUTCDate();
    let dayShift: -1 | 0 | 1 = 0;
    if (newDay < originalDay) dayShift = -1;
    else if (newDay > originalDay) dayShift = 1;

    return {
      direction: 'ist_to_utc',
      inputTime: parsed.formattedTime,
      outputTime,
      outputDate,
      dayShift,
    };
  }

  const totalSeconds = parsed.totalSecondsOfDay - IST_OFFSET_SECONDS;
  const dayShift: -1 | 0 | 1 = totalSeconds < 0 ? -1 : 0;
  const wrappedSeconds = ((totalSeconds % 86400) + 86400) % 86400;

  const hours = Math.floor(wrappedSeconds / 3600);
  const minutes = Math.floor((wrappedSeconds % 3600) / 60);
  const seconds = wrappedSeconds % 60;

  const secFraction = seconds.toFixed(2);
  const secWhole = pad2(Math.floor(seconds));
  const secDec = secFraction.includes('.') ? secFraction.substring(secFraction.indexOf('.')) : '.00';
  const outputTime = `${pad2(hours)}:${pad2(minutes)}:${secWhole}${secDec}`;

  return {
    direction: 'ist_to_utc',
    inputTime: parsed.formattedTime,
    outputTime,
    dayShift,
  };
}
