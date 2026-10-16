import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  ArrowRightLeft,
  Copy,
  Check,
  Calculator,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

// Computes 8-bit XOR NMEA checksum
function computeNmeaChecksum(body: string): string {
  let clean = body.trim();
  if (clean.startsWith('$') || clean.startsWith('!')) {
    clean = clean.substring(1);
  }
  const starIdx = clean.indexOf('*');
  if (starIdx !== -1) {
    clean = clean.substring(0, starIdx);
  }

  let xor = 0;
  for (let i = 0; i < clean.length; i++) {
    xor ^= clean.charCodeAt(i);
  }
  return xor.toString(16).toUpperCase().padStart(2, '0');
}

export const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timediff' | 'utc_ist' | 'linecopy' | 'checksum'>('timediff');

  /* -------------------------------------------------------------
     TOOL 1: TIME DIFFERENCE CALCULATOR
  ------------------------------------------------------------- */
  const [t1Input, setT1Input] = useState<string>('08:15:30.000');
  const [t2Input, setT2Input] = useState<string>('08:45:55.500');

  const parseTimeToSeconds = (tStr: string): number | null => {
    const parts = tStr.trim().split(':');
    if (parts.length < 2) return null;
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parts[2] ? parseFloat(parts[2]) : 0;
    return hours * 3600 + mins * 60 + secs;
  };

  const timeDiffData = useMemo(() => {
    const s1 = parseTimeToSeconds(t1Input);
    const s2 = parseTimeToSeconds(t2Input);
    if (s1 === null || s2 === null) return null;

    let delta = s2 - s1;
    if (delta < 0) {
      // Cross-midnight wrap
      delta += 86400;
    }

    const h = Math.floor(delta / 3600);
    const m = Math.floor((delta % 3600) / 60);
    const s = (delta % 60).toFixed(3);

    return {
      totalSeconds: delta.toFixed(3),
      totalMilliseconds: Math.round(delta * 1000).toLocaleString(),
      formatted: `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s}s`,
      epochs1Hz: Math.floor(delta) + 1,
      epochs5Hz: Math.floor(delta * 5) + 1,
      epochs10Hz: Math.floor(delta * 10) + 1,
    };
  }, [t1Input, t2Input]);

  /* -------------------------------------------------------------
     TOOL 2: UTC <-> IST CONVERTER
  ------------------------------------------------------------- */
  const [utcDateStr, setUtcDateStr] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().substring(0, 10);
  });
  const [utcTimeStr, setUtcTimeStr] = useState<string>('12:00:00');

  const [istDateStr, setIstDateStr] = useState<string>('');
  const [istTimeStr, setIstTimeStr] = useState<string>('');
  const [liveUtc, setLiveUtc] = useState<string>('');
  const [liveIst, setLiveIst] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveUtc(now.toUTCString().replace('GMT', 'UTC'));
      setLiveIst(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'medium',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute IST from UTC
  const istResult = useMemo(() => {
    try {
      const combined = `${utcDateStr}T${utcTimeStr}Z`;
      const dt = new Date(combined);
      if (isNaN(dt.getTime())) return null;

      // Add 5 hours 30 mins (19800000 ms)
      const istDate = new Date(dt.getTime() + 5.5 * 3600 * 1000);
      return {
        iso: dt.toISOString(),
        istFormatted: istDate.toUTCString().replace('GMT', 'IST (+5:30)'),
        istTime: istDate.toISOString().substring(11, 19),
        istDateOnly: istDate.toISOString().substring(0, 10),
      };
    } catch {
      return null;
    }
  }, [utcDateStr, utcTimeStr]);

  // Compute UTC from IST
  const handleIstToUtcConvert = () => {
    try {
      if (!istTimeStr) return;
      const datePart = istDateStr || new Date().toISOString().substring(0, 10);
      const combined = `${datePart}T${istTimeStr}Z`;
      const dt = new Date(combined);
      // Subtract 5h30m
      const utcDate = new Date(dt.getTime() - 5.5 * 3600 * 1000);
      setUtcDateStr(utcDate.toISOString().substring(0, 10));
      setUtcTimeStr(utcDate.toISOString().substring(11, 19));
    } catch {
      // ignore
    }
  };

  /* -------------------------------------------------------------
     TOOL 3: BULK LINE COPY & RANGE FILTER UTILITY
  ------------------------------------------------------------- */
  const [bulkInput, setBulkInput] = useState<string>(
    `$GNGGA,081230.00,1258.9124,N,07735.1234,E,1,12,0.85,910.4,M,-84.0,M,,*47
$GNRMC,081230.00,A,1258.9124,N,07735.1234,E,42.5,182.4,161026,,,A*6B
$GNGSA,A,3,02,04,05,09,12,18,20,24,25,,,,1.2,0.85,0.9*1A
$GPGSV,3,1,12,02,40,050,44,04,25,120,41,05,60,210,48,09,15,310,38*7C
$GPGSV,3,2,12,12,35,080,43,18,50,150,46,20,20,280,39,24,65,030,49*7E
$GPGSV,3,3,12,25,10,190,36,29,05,040,32,31,08,340,34,32,12,230,37*7A
$GNVTG,182.4,T,,M,42.5,N,78.7,K,A*23
$GNGGA,081231.00,1258.9130,N,07735.1240,E,1,12,0.85,910.6,M,-84.0,M,,*4D
$GNRMC,081231.00,A,1258.9130,N,07735.1240,E,42.8,182.5,161026,,,A*6D`
  );
  const [lineFilterPrefix, setLineFilterPrefix] = useState<string>('ALL');
  const [startLine, setStartLine] = useState<number>(1);
  const [endLine, setEndLine] = useState<number>(100);
  const [copiedLines, setCopiedLines] = useState<boolean>(false);

  const filteredBulkLines = useMemo(() => {
    const rawLines = bulkInput.split('\n').filter((l) => l.trim().length > 0);
    return rawLines
      .filter((line, idx) => {
        const lineNum = idx + 1;
        if (lineNum < startLine || lineNum > endLine) return false;
        if (lineFilterPrefix !== 'ALL') {
          return line.toUpperCase().includes(lineFilterPrefix.toUpperCase());
        }
        return true;
      })
      .join('\n');
  }, [bulkInput, lineFilterPrefix, startLine, endLine]);

  const handleCopyFilteredLines = () => {
    navigator.clipboard.writeText(filteredBulkLines);
    setCopiedLines(true);
    setTimeout(() => setCopiedLines(false), 2000);
  };

  const handleDownloadFilteredLines = () => {
    const blob = new Blob([filteredBulkLines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmea_filtered_lines_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* -------------------------------------------------------------
     TOOL 4: CHECKSUM CALCULATOR
  ------------------------------------------------------------- */
  const [inputSentence, setInputSentence] = useState<string>(
    '$GNGGA,123519.00,3746.2944,N,12225.2691,W,1,10,0.9,152.4,M,-28.0,M,,'
  );
  const [copiedChecksum, setCopiedChecksum] = useState<boolean>(false);

  const rawTrimmed = inputSentence.trim();
  const sentenceBody = rawTrimmed.replace(/^[$!]/, '');
  const starPos = sentenceBody.indexOf('*');
  const providedChecksum = starPos !== -1 ? sentenceBody.substring(starPos + 1).trim().toUpperCase() : null;
  const contentToHash = starPos !== -1 ? sentenceBody.substring(0, starPos) : sentenceBody;
  const calculatedChecksum = computeNmeaChecksum(contentToHash);
  const isCompleteWithChecksum = starPos !== -1;
  const isValidChecksum = isCompleteWithChecksum && providedChecksum === calculatedChecksum;
  const assembledSentence = `${rawTrimmed.startsWith('$') || rawTrimmed.startsWith('!') ? '' : '$'}${contentToHash}*${calculatedChecksum}`;

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(assembledSentence);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header Card */}
      <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            Standalone Engineering Toolkit
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            GNSS Standard Utilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Independent utilities that function standalone without requiring a log file upload.
          </p>
        </div>

        {/* Feature Sub-Tabs Selector */}
        <div className="flex items-center space-x-1 bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('timediff')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'timediff'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time Delta</span>
          </button>
          <button
            onClick={() => setActiveTab('utc_ist')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'utc_ist'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>UTC &harr; IST</span>
          </button>
          <button
            onClick={() => setActiveTab('linecopy')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'linecopy'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bulk Line Copy</span>
          </button>
          <button
            onClick={() => setActiveTab('checksum')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'checksum'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Checksum</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          TAB 1: TIME DIFFERENCE CALCULATOR
      ------------------------------------------------------------- */}
      {activeTab === 'timediff' && (
        <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 transition-colors">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              NMEA Epoch Time Difference Calculator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculate elapsed duration, delta seconds, and sample epoch counts between two UTC timestamps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                Start Timestamp (HH:MM:SS.sss)
              </label>
              <input
                type="text"
                value={t1Input}
                onChange={(e) => setT1Input(e.target.value)}
                placeholder="08:15:30.000"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                End Timestamp (HH:MM:SS.sss)
              </label>
              <input
                type="text"
                value={t2Input}
                onChange={(e) => setT2Input(e.target.value)}
                placeholder="08:45:55.500"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
            </div>
          </div>

          {/* Results Summary Box */}
          {timeDiffData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">Total Delta Time</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#E05318] mt-1">
                  {timeDiffData.totalSeconds} s
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {timeDiffData.totalMilliseconds} ms
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">Formatted Duration</div>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
                  {timeDiffData.formatted}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  HH:MM:SS span
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">Epochs at 1 Hz</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {timeDiffData.epochs1Hz.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Standard NMEA rate
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">Epochs at 5 Hz / 10 Hz</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                  {timeDiffData.epochs5Hz.toLocaleString()} / {timeDiffData.epochs10Hz.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  High-rate navigation
                </div>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px]">Quick Presets:</span>
            <button
              onClick={() => {
                setT1Input('12:00:00.000');
                setT2Input('12:15:00.000');
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-[#E05318] text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
            >
              15 Minutes
            </button>
            <button
              onClick={() => {
                setT1Input('06:00:00.000');
                setT2Input('07:00:00.000');
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-[#E05318] text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
            >
              1 Hour
            </button>
            <button
              onClick={() => {
                setT1Input('23:55:00.000');
                setT2Input('00:05:00.000');
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-[#E05318] text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
            >
              Midnight Crossover (10m)
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: UTC <-> IST CONVERTER
      ------------------------------------------------------------- */}
      {activeTab === 'utc_ist' && (
        <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 transition-colors">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              UTC &harr; Indian Standard Time (IST) Converter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bidirectional time converter with +05:30 offset for NavIC / IRNSS and GNSS flight and ground test logs.
            </p>
          </div>

          {/* Live Clocks Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Live UTC Clock</div>
              <div className="text-base sm:text-lg font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                {liveUtc || 'Loading UTC...'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Live Indian Standard Time (IST)</div>
              <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {liveIst || 'Loading IST...'}
              </div>
            </div>
          </div>

          {/* Two-Column Converter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* UTC to IST Section */}
            <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Convert UTC &rarr; IST</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 font-mono">UTC Date</label>
                  <input
                    type="date"
                    value={utcDateStr}
                    onChange={(e) => setUtcDateStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono">UTC Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={utcTimeStr}
                    onChange={(e) => setUtcTimeStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              </div>

              {istResult && (
                <div className="p-3.5 rounded-lg bg-orange-100/40 dark:bg-orange-950/30 border border-[#E05318]/30 space-y-1">
                  <div className="text-[10px] font-mono text-[#E05318] uppercase font-bold">
                    Result in IST (UTC + 05:30)
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {istResult.istTime}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Date: {istResult.istDateOnly} ({istResult.istFormatted})
                  </div>
                </div>
              )}
            </div>

            {/* IST to UTC Section */}
            <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Convert IST &rarr; UTC</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 font-mono">IST Date</label>
                  <input
                    type="date"
                    value={istDateStr || utcDateStr}
                    onChange={(e) => setIstDateStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono">IST Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={istTimeStr}
                    onChange={(e) => setIstTimeStr(e.target.value)}
                    placeholder="17:30:00"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              </div>

              <button
                onClick={handleIstToUtcConvert}
                className="w-full py-2.5 rounded-lg text-xs font-bold font-mono uppercase bg-[#E05318] hover:bg-[#C94713] text-white transition-colors cursor-pointer"
              >
                Calculate UTC Time (-5:30)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: BULK LINE COPY & RANGE FILTER UTILITY
      ------------------------------------------------------------- */}
      {activeTab === 'linecopy' && (
        <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bulk Line Copy & Range Filter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Extract lines by talker filter (GGA, RMC, GSV) and line number ranges for quick copying.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyFilteredLines}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              >
                {copiedLines ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLines ? 'Copied Lines!' : 'Copy Lines in Bulk'}</span>
              </button>

              <button
                onClick={handleDownloadFilteredLines}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                title="Download Filtered Text"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 font-mono">Filter by Sentence Type</label>
              <select
                value={lineFilterPrefix}
                onChange={(e) => setLineFilterPrefix(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Sentence Types</option>
                <option value="GGA">$GNGGA / $GPGGA (Fix Coordinates)</option>
                <option value="RMC">$GNRMC / $GPRMC (Speed & Heading)</option>
                <option value="GSA">$GNGSA / $GPGSA (DOP Accuracy)</option>
                <option value="GSV">$GPGSV / $GLGSV (Satellites & C/N0)</option>
                <option value="VTG">$GNVTG (Course over Ground)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-mono">Start Line #</label>
              <input
                type="number"
                min={1}
                value={startLine}
                onChange={(e) => setStartLine(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-mono">End Line #</label>
              <input
                type="number"
                min={1}
                value={endLine}
                onChange={(e) => setEndLine(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Textarea for bulk paste & view */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">
              Raw NMEA Lines (Paste or edit lines below):
            </label>
            <textarea
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E05318] select-text"
            />
          </div>

          {/* Filtered Output Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">
                Filtered Output ({filteredBulkLines.split('\n').filter(Boolean).length} lines matched)
              </span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs max-h-48 overflow-y-auto break-all select-text border border-slate-800">
              {filteredBulkLines || 'No lines match current filter criteria.'}
            </pre>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 4: CHECKSUM CALCULATOR & VALIDATOR
      ------------------------------------------------------------- */}
      {activeTab === 'checksum' && (
        <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 transition-colors">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              NMEA Checksum & Sentence Validator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Test and generate 8-bit XOR checksums for any custom sentence in real-time.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-mono mb-2">
              Enter or Paste Raw NMEA Sentence
            </label>
            <input
              type="text"
              value={inputSentence}
              onChange={(e) => setInputSentence(e.target.value)}
              placeholder="e.g. $GNGGA,123519.00,3746.2944,N,12225.2691,W,1,10,0.9,152.4,M,-28.0,M,,"
              className="w-full px-4 py-3 text-xs sm:text-sm font-mono bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#E05318]"
            />
          </div>

          {/* Validation Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-100/60 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-400">Calculated XOR Checksum</div>
              <div className="text-2xl font-bold font-mono text-[#E05318] mt-1">
                *{calculatedChecksum}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                8-bit bitwise XOR parity
              </div>
            </div>

            <div className="bg-slate-100/60 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] font-medium text-slate-400">Provided Checksum</div>
              <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
                {providedChecksum ? `*${providedChecksum}` : 'None provided'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {providedChecksum ? 'Found in input string' : 'Auto-append enabled below'}
              </div>
            </div>

            <div className="bg-slate-100/60 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="text-[11px] font-medium text-slate-400">Parity Verification</div>
              <div className="flex items-center space-x-2 mt-1">
                {isCompleteWithChecksum ? (
                  isValidChecksum ? (
                    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>VALID CHECKSUM</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                      <XCircle className="w-5 h-5 shrink-0" />
                      <span>MISMATCH ERROR</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span>CHECKSUM CALCULATED</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {isCompleteWithChecksum
                  ? isValidChecksum
                    ? '100% Valid Parity'
                    : `Expected *${calculatedChecksum}`
                  : 'Ready for use'}
              </div>
            </div>
          </div>

          {/* Validated Output & One-Click Copy */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-mono">
                Validated Full NMEA String
              </span>
              <button
                onClick={handleCopyChecksum}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#E05318] transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                {copiedChecksum ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedChecksum ? 'Copied' : 'Copy Sentence'}</span>
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm break-all select-text border border-slate-800">
              {assembledSentence}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
