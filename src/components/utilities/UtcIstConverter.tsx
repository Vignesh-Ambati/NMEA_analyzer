import React, { useState } from 'react';
import { ArrowRightLeft, RotateCcw, AlertCircle, Sparkles, Copy, Check, Info } from 'lucide-react';
import { parseGnssTimeInput } from './timeParser';

interface ConversionResult {
  sourceNmea: string;
  sourceFormattedTime: string;
  sourceFormattedDate?: string;
  hasDate: boolean;
  targetNmeaTime: string;
  targetFormattedTime: string;
  targetFormattedDate?: string;
  targetFullNmea?: string;
  dayShiftText: string;
  direction: 'utc_to_ist' | 'ist_to_utc';
  unixEpochSec?: number;
}

export const UtcIstConverter: React.FC = () => {
  const [inputVal, setInputVal] = useState('');
  const [direction, setDirection] = useState<'utc_to_ist' | 'ist_to_utc'>('utc_to_ist');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convertTime = () => {
    setError(null);
    if (!inputVal.trim()) {
      setError('Please enter a timestamp');
      setResult(null);
      return;
    }

    const parsed = parseGnssTimeInput(inputVal);

    if (!parsed.isValid) {
      setError(parsed.errorMessage || 'Invalid input timestamp');
      setResult(null);
      return;
    }

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const secWhole = Math.floor(parsed.seconds);
    const secDec = parsed.seconds % 1;
    const secDecStr = secDec > 0 ? secDec.toFixed(2).substring(1) : (parsed.rawSecondsStr.includes('.') ? parsed.rawSecondsStr.substring(parsed.rawSecondsStr.indexOf('.')) : '.00');
    const formattedSec = `${pad2(secWhole)}${secDecStr.padEnd(3, '0')}`;

    const offsetHours = direction === 'utc_to_ist' ? 5.5 : -5.5;

    if (parsed.hasDate && parsed.timestampMs !== undefined) {
      // Full Date conversion
      const offsetMs = offsetHours * 3600 * 1000;
      const targetDate = new Date(parsed.timestampMs + offsetMs);

      const targetH = targetDate.getUTCHours();
      const targetM = targetDate.getUTCMinutes();
      const targetD = targetDate.getUTCDate();
      const targetMo = targetDate.getUTCMonth() + 1;
      const targetY = targetDate.getUTCFullYear();

      const targetFormattedTime = `${pad2(targetH)}:${pad2(targetM)}:${formattedSec}`;
      const targetNmeaTime = `${pad2(targetH)}${pad2(targetM)}${formattedSec}`;
      const targetFormattedDate = `${pad2(targetD)}/${pad2(targetMo)}/${targetY}`;
      const targetFullNmea = `${targetNmeaTime},${pad2(targetD)},${pad2(targetMo)},${targetY}`;

      // Check day shift
      let dayShiftText = 'Same Day';
      if (targetD !== parsed.day) {
        dayShiftText = direction === 'utc_to_ist' ? '+1 Day (Next Day)' : '-1 Day (Previous Day)';
      }

      setResult({
        sourceNmea: parsed.nmeaTimeStr + (parsed.nmeaDateStr ? `,${parsed.nmeaDateStr}` : ''),
        sourceFormattedTime: parsed.formattedTime,
        sourceFormattedDate: parsed.formattedDate,
        hasDate: true,
        targetNmeaTime,
        targetFormattedTime,
        targetFormattedDate,
        targetFullNmea,
        dayShiftText,
        direction,
        unixEpochSec: Math.floor(targetDate.getTime() / 1000),
      });
    } else {
      // Time-only conversion (+5h 30m or -5h 30m)
      const offsetMinutes = direction === 'utc_to_ist' ? 330 : -330;
      let totalMinutes = parsed.hours * 60 + parsed.minutes + offsetMinutes;

      let dayShiftText = 'Same Day';
      if (totalMinutes >= 1440) {
        dayShiftText = '+1 Day (Crosses Midnight)';
        totalMinutes = totalMinutes % 1440;
      } else if (totalMinutes < 0) {
        dayShiftText = '-1 Day (Crosses Midnight)';
        totalMinutes = (totalMinutes + 1440) % 1440;
      }

      const targetH = Math.floor(totalMinutes / 60);
      const targetM = totalMinutes % 60;

      const targetFormattedTime = `${pad2(targetH)}:${pad2(targetM)}:${formattedSec}`;
      const targetNmeaTime = `${pad2(targetH)}${pad2(targetM)}${formattedSec}`;

      setResult({
        sourceNmea: parsed.nmeaTimeStr,
        sourceFormattedTime: parsed.formattedTime,
        hasDate: false,
        targetNmeaTime,
        targetFormattedTime,
        targetFullNmea: targetNmeaTime,
        dayShiftText,
        direction,
      });
    }
  };

  const handleReset = () => {
    setInputVal('');
    setResult(null);
    setError(null);
  };

  const handleCopyTarget = () => {
    if (!result) return;
    const toCopy = result.targetFullNmea || result.targetFormattedTime;
    navigator.clipboard.writeText(toCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-[#E05318]" />
            <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100">
              UTC &harr; IST Timezone Converter
            </h3>

            {/* Modern Info button with hover popover */}
            <div className="relative group inline-flex items-center">
              <button
                type="button"
                className="w-5 h-5 rounded-md text-[#736E65] dark:text-slate-400 hover:text-[#E05318] hover:bg-[#EFEAE1] dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="UTC IST Converter Information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Hover Info Tooltip */}
              <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 shadow-xl text-xs text-[#24211D] dark:text-slate-200 pointer-events-none">
                <div className="font-semibold text-[#E05318] mb-1">UTC &harr; IST Timezone Converter</div>
                <p className="text-[11px] text-[#736E65] dark:text-slate-300 leading-relaxed">
                  Bi-directional converter between GNSS standard UTC and Indian Standard Time . Supports <span className="font-mono text-[#E05318]">141105.00,17,10,2026</span> or time-only <span className="font-mono text-[#E05318]">141105.00</span> with automatic day shift calculation.
                </p>
              </div>
            </div>
          </div>

          {/* Exactly 1-line tag below Utility Name */}
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 truncate">
            Bi-directional conversion between GNSS UTC and IST.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Direction Switcher */}
          <div className="flex items-center space-x-1 bg-[#EFEAE1]/70 dark:bg-slate-800 p-1 rounded-xl border border-[#E6E1D6] dark:border-slate-700 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setDirection('utc_to_ist');
                setResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                direction === 'utc_to_ist'
                  ? 'bg-[#E05318] text-white shadow-xs'
                  : 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D]'
              }`}
            >
              UTC &rarr; IST
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('ist_to_utc');
                setResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                direction === 'ist_to_utc'
                  ? 'bg-[#E05318] text-white shadow-xs'
                  : 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D]'
              }`}
            >
              IST &rarr; UTC
            </button>
          </div>

          {/* Reset Button (Styled as a real button) */}
        </div>
      </div>

      {/* Input Field (Plain input, no presets, no load utc button) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
          {direction === 'utc_to_ist' ? 'Input UTC Timestamp' : 'Input IST Timestamp'}
        </label>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && convertTime()}
          placeholder=""
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
        />
      </div>

      {/* Convert Button */}
      <div className="flex items-center space-x-3 pt-1">
        <button
          type="button"
          onClick={convertTime}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Convert to {direction === 'utc_to_ist' ? 'IST' : 'UTC '}</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Card */}
      {result && (
        <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Converted Timezone ({result.direction === 'utc_to_ist' ? 'IST' : 'UTC'})</span>
            </div>

            <button
              type="button"
              onClick={handleCopyTarget}
              className="text-xs text-[#E05318] hover:underline font-mono flex items-center space-x-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Converted'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Target Formatted Time */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                {result.direction === 'utc_to_ist' ? 'Target IST Time' : 'Target UTC Time'}
              </div>
              <div className="text-xl font-bold font-mono text-[#E05318] mt-1">
                {result.targetFormattedTime}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                NMEA: {result.targetNmeaTime}
              </div>
            </div>

            {/* Target Date (or Day Rollover note) */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                {result.hasDate ? 'Converted Date' : 'Day Shift Status'}
              </div>
              <div className="text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1">
                {result.targetFormattedDate || result.dayShiftText}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                {result.hasDate ? result.dayShiftText : 'Time-only input'}
              </div>
            </div>

            {/* Target Complete Output */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl sm:col-span-2 lg:col-span-1">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Full Converted Output String
              </div>
              <div className="text-sm font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1 break-all">
                {result.targetFullNmea}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                Offset: {result.direction === 'utc_to_ist' ? '+05:30:00' : '-05:30:00'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
