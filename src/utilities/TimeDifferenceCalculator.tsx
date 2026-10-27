import React, { useState } from 'react';
import { Clock, Calculator, Calendar, RotateCcw, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { parseGnssTimeInput, ParsedGnssTime } from './timeParser';

interface DiffResult {
  formattedDiff: string;
  totalSeconds: string;
  daysDiff: number;
  hoursDiff: number;
  minutesDiff: number;
  secondsDiff: string;
  t1: ParsedGnssTime;
  t2: ParsedGnssTime;
  isDateCompared: boolean;
}

export const TimeDifferenceCalculator: React.FC = () => {
  const [t1Input, setT1Input] = useState('');
  const [t2Input, setT2Input] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateDiff = () => {
    setError(null);
    if (!t1Input.trim()) {
      setError('Please enter Start Time ( Time-1 )');
      setResult(null);
      return;
    }
    if (!t2Input.trim()) {
      setError('Please enter End Time ( Time-2 )');
      setResult(null);
      return;
    }

    const p1 = parseGnssTimeInput(t1Input);
    const p2 = parseGnssTimeInput(t2Input);

    if (!p1.isValid) {
      setError(`Start Time Error: ${p1.errorMessage || 'Invalid input'}`);
      setResult(null);
      return;
    }

    if (!p2.isValid) {
      setError(`End Time Error: ${p2.errorMessage || 'Invalid input'}`);
      setResult(null);
      return;
    }

    // Both have dates
    if (p1.hasDate && p2.hasDate && p1.timestampMs !== undefined && p2.timestampMs !== undefined) {
      const diffMs = Math.abs(p2.timestampMs - p1.timestampMs);
      const totalSec = diffMs / 1000;

      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = (totalSec % 60).toFixed(3);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setResult({
        formattedDiff: parts.join(' '),
        totalSeconds: totalSec.toFixed(3),
        daysDiff: days,
        hoursDiff: hours,
        minutesDiff: minutes,
        secondsDiff: seconds,
        t1: p1,
        t2: p2,
        isDateCompared: true,
      });
    } else {
      const diffSec = Math.abs(p2.totalSecondsOfDay - p1.totalSecondsOfDay);
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = (diffSec % 60).toFixed(3);

      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setResult({
        formattedDiff: parts.join(' '),
        totalSeconds: diffSec.toFixed(3),
        daysDiff: 0,
        hoursDiff: hours,
        minutesDiff: minutes,
        secondsDiff: seconds,
        t1: p1,
        t2: p2,
        isDateCompared: false,
      });
    }
  };

  const handleReset = () => {
    setT1Input('');
    setT2Input('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#E05318]" />
            <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100">
              Time Difference Calculator
            </h3>
            {/* Modern Info button with hover popover */}
            <div className="relative group inline-flex items-center">
              <button
                type="button"
                className="w-5 h-5 rounded-md text-[#736E65] dark:text-slate-400 hover:text-[#E05318] hover:bg-[#EFEAE1] dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Time Difference Information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {/* Hover Info Tooltip */}
              <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 shadow-xl text-xs text-[#24211D] dark:text-slate-200 pointer-events-none">
                <div className="font-semibold text-[#E05318] mb-1">Time Difference Calculator</div>
                <p className="text-[11px] text-[#736E65] dark:text-slate-300 leading-relaxed">
                  Calculates elapsed duration and seconds between two GNSS timestamps. Supports <span className="font-mono text-[#E05318]">141105.00,17,10,2026</span> (Time, Day, Month, Year) or time-only <span className="font-mono text-[#E05318]">141105.00</span>.
                </p>
              </div>
            </div>
          </div>
          {/* Exactly 1-line tag below Utility Name */}
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 truncate">
            Calculate duration and elapsed seconds between two GNSS timestamps.
          </p>
        </div>
        {/* Reset Button (Styled as a real button) */}
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Input Grid (Plain, clean inputs without preset buttons) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* T1 Start Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            Start Time ( Time-1 )
          </label>
          <input
            type="text"
            value={t1Input}
            onChange={(e) => setT1Input(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && calculateDiff()}
            placeholder=""
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>

        {/* T2 End Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            End Time ( Time-2 )
          </label>
          <input
            type="text"
            value={t2Input}
            onChange={(e) => setT2Input(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && calculateDiff()}
            placeholder=""
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex items-center space-x-3 pt-1">
        <button
          type="button"
          onClick={calculateDiff}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2"
        >
          <Calculator className="w-4 h-4" />
          <span>Calculate Time Difference</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Calculation Results</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Formatted Duration */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Duration Difference
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-[#E05318] mt-1">
                {result.formattedDiff}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                {result.hoursDiff}h {result.minutesDiff}m {result.secondsDiff}s {result.daysDiff > 0 ? `(${result.daysDiff} days)` : ''}
              </div>
            </div>

            {/* Total Elapsed Seconds */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Total Elapsed Seconds
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1">
                {result.totalSeconds} s
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                {(parseFloat(result.totalSeconds) / 60).toFixed(2)} minutes
              </div>
            </div>

            {/* Mode / Date Status */}
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl sm:col-span-2 lg:col-span-1">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#E05318]" />
                <span>Input Mode</span>
              </div>
              <div className="text-xs font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1">
                {result.isDateCompared ? 'Full Timestamp (Date & Time)' : 'Time-Only Delta'}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                T1: {result.t1.formattedTime} {result.t1.formattedDate ? `(${result.t1.formattedDate})` : ''} &rarr; T2: {result.t2.formattedTime} {result.t2.formattedDate ? `(${result.t2.formattedDate})` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
