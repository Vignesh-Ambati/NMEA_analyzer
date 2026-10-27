/**
 * GNSS Time & Date Parser Utility
 * 
 * Supports NMEA format:
 *   "141105.00,17,10,2026" (HHMMSS.ss,DD,MM,YYYY)
 *   "141105.00" (time only)
 *   "14:11:05.00, 17, 10, 2026"
 *   "14:11:05.00"
 */

import { ParsedGnssTime } from './types';
export type { ParsedGnssTime };

export function parseGnssTimeInput(input: string): ParsedGnssTime {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      rawSecondsStr: '00',
      totalSecondsOfDay: 0,
      formattedTime: '',
      nmeaTimeStr: '',
      hasDate: false,
      rawInput: input,
      isValid: false,
      errorMessage: 'Please enter a timestamp (e.g. 141105.00,17,10,2026 or 141105.00)',
    };
  }

  try {
    const commaParts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
    const timePart = commaParts[0];

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let rawSecondsStr = '00';

    if (timePart.includes(':')) {
      const colParts = timePart.split(':');
      hours = parseInt(colParts[0], 10);
      minutes = parseInt(colParts[1], 10);
      seconds = parseFloat(colParts[2] || '0');
      rawSecondsStr = colParts[2] || '00';
    } else {
      if (timePart.length < 4) {
        return {
          hours: 0,
          minutes: 0,
          seconds: 0,
          rawSecondsStr: '',
          totalSecondsOfDay: 0,
          formattedTime: '',
          nmeaTimeStr: '',
          hasDate: false,
          rawInput: input,
          isValid: false,
          errorMessage: 'Invalid time format. Expected HHMMSS.ss or HH:MM:SS',
        };
      }
      hours = parseInt(timePart.substring(0, 2), 10);
      minutes = parseInt(timePart.substring(2, 4), 10);
      const rest = timePart.substring(4);
      seconds = rest ? parseFloat(rest) : 0;
      rawSecondsStr = rest || '00';
    }

    if (isNaN(hours) || hours < 0 || hours > 23 || isNaN(minutes) || minutes < 0 || minutes > 59 || isNaN(seconds) || seconds < 0 || seconds >= 60) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        rawSecondsStr: '',
        totalSecondsOfDay: 0,
        formattedTime: '',
        nmeaTimeStr: '',
        hasDate: false,
        rawInput: input,
        isValid: false,
        errorMessage: 'Time values out of valid range (Hours: 0-23, Minutes: 0-59, Seconds: 0-59.999)',
      };
    }

    const totalSecondsOfDay = hours * 3600 + minutes * 60 + seconds;

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const secWhole = Math.floor(seconds);
    const secDec = seconds % 1;
    const secDecStr = secDec > 0 ? secDec.toFixed(2).substring(1) : (rawSecondsStr.includes('.') ? rawSecondsStr.substring(rawSecondsStr.indexOf('.')) : '.00');
    const formattedSeconds = `${pad2(secWhole)}${secDecStr.padEnd(3, '0')}`;
    const formattedTime = `${pad2(hours)}:${pad2(minutes)}:${formattedSeconds}`;
    const nmeaTimeStr = `${pad2(hours)}${pad2(minutes)}${formattedSeconds}`;

    let hasDate = false;
    let day: number | undefined;
    let month: number | undefined;
    let year: number | undefined;
    let formattedDate: string | undefined;
    let nmeaDateStr: string | undefined;
    let timestampMs: number | undefined;

    if (commaParts.length >= 4) {
      day = parseInt(commaParts[1], 10);
      month = parseInt(commaParts[2], 10);
      let parsedYear = parseInt(commaParts[3], 10);
      if (parsedYear < 100) parsedYear += 2000;
      year = parsedYear;

      if (!isNaN(day) && day >= 1 && day <= 31 && !isNaN(month) && month >= 1 && month <= 12 && !isNaN(year) && year >= 1970) {
        hasDate = true;
        formattedDate = `${pad2(day)}/${pad2(month)}/${year}`;
        nmeaDateStr = `${pad2(day)},${pad2(month)},${year}`;
        const secInt = Math.floor(seconds);
        const millis = Math.round((seconds - secInt) * 1000);
        timestampMs = Date.UTC(year, month - 1, day, hours, minutes, secInt, millis);
      }
    } else if (commaParts.length === 2) {
      const datePart = commaParts[1];
      if (datePart.includes('/')) {
        const dp = datePart.split('/');
        day = parseInt(dp[0], 10);
        month = parseInt(dp[1], 10);
        let py = parseInt(dp[2], 10);
        if (py < 100) py += 2000;
        year = py;
      } else if (datePart.includes('-')) {
        const dp = datePart.split('-');
        year = parseInt(dp[0], 10);
        month = parseInt(dp[1], 10);
        day = parseInt(dp[2], 10);
      }
      if (day && month && year && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
        hasDate = true;
        formattedDate = `${pad2(day)}/${pad2(month)}/${year}`;
        nmeaDateStr = `${pad2(day)},${pad2(month)},${year}`;
        const secInt = Math.floor(seconds);
        const millis = Math.round((seconds - secInt) * 1000);
        timestampMs = Date.UTC(year, month - 1, day, hours, minutes, secInt, millis);
      }
    }

    return {
      hours,
      minutes,
      seconds,
      rawSecondsStr,
      totalSecondsOfDay,
      formattedTime,
      nmeaTimeStr,
      hasDate,
      day,
      month,
      year,
      formattedDate,
      nmeaDateStr,
      timestampMs,
      rawInput: input,
      isValid: true,
    };
  } catch (err: unknown) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      rawSecondsStr: '',
      totalSecondsOfDay: 0,
      formattedTime: '',
      nmeaTimeStr: '',
      hasDate: false,
      rawInput: input,
      isValid: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to parse GNSS time',
    };
  }
}
