import React, { useState, useMemo } from 'react';
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
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Wrench,
  RotateCcw
} from 'lucide-react';

export type UtilityId = 'timediff' | 'utc_ist' | 'linecopy' | 'checksum';

interface UtilityConfig {
  id: UtilityId;
  num: number;
  title: string;
  category: 'all' | 'time' | 'timezone' | 'lines' | 'checksum';
  categoryLabel: string;
  badge: string;
  description: string;
  spec: string;
  icon: React.ComponentType<{ className?: string }>;
}

const UTILITIES_CONFIG: UtilityConfig[] = [
  {
    id: 'timediff',
    num: 1,
    title: 'Timestamp Delta & Interval Calculator',
    category: 'time',
    categoryLabel: 'HH:MM:SS.sss Delta',
    badge: 'Time & Epochs',
    description: 'Compute precise elapsed seconds, formatted duration, and expected GNSS fix epoch counts at 1Hz, 5Hz, and 10Hz between two fix timestamps.',
    spec: 'Seconds & Epochs',
    icon: Clock,
  },
  {
    id: 'utc_ist',
    num: 2,
    title: 'UTC ↔ IST Timezone Converter',
    category: 'timezone',
    categoryLabel: 'GMT+0 ↔ GMT+5:30',
    badge: 'Timezone Shift',
    description: 'Bi-directional high-precision converter between GNSS standard UTC (GMT+0) and Indian Standard Time (IST, GMT+5:30) with epoch timestamp calculation.',
    spec: '±05:30 Offset',
    icon: ArrowRightLeft,
  },
  {
    id: 'linecopy',
    num: 3,
    title: 'Bulk NMEA Line Slicer & Filter',
    category: 'lines',
    categoryLabel: 'Batch Extraction',
    badge: 'Line Slicer',
    description: 'Filter sentences by talker/type (e.g. GGA, RMC), slice line number ranges, strip trailing checksums, and bulk export to clipboard or file.',
    spec: 'Raw NMEA Lines',
    icon: FileText,
  },
  {
    id: 'checksum',
    num: 4,
    title: 'NMEA 0183 Checksum Validator',
    category: 'checksum',
    categoryLabel: '8-bit XOR (*XX)',
    badge: 'Integrity Check',
    description: 'Compute or verify the 8-bit XOR checksum byte for any NMEA 0183 talker sentence according to official standard specifications.',
    spec: 'HEX 8-bit XOR',
    icon: Calculator,
  },
];

export const ToolsPage: React.FC = () => {
  const { addLog } = useApp();

  // Selected tool (null = Matrix Grid view, identical to Task Page)
  const [selectedToolId, setSelectedToolId] = useState<UtilityId | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'time' | 'timezone' | 'lines' | 'checksum'>('all');

  // Filter utilities by category
  const filteredUtilities = useMemo(() => {
    if (categoryFilter === 'all') return UTILITIES_CONFIG;
    return UTILITIES_CONFIG.filter((u) => u.category === categoryFilter);
  }, [categoryFilter]);

  // -------------------------------------------------------------
  // Tool 1: Time Difference Calculator State
  // -------------------------------------------------------------
  const [time1, setTime1] = useState('12:00:00.000');
  const [time2, setTime2] = useState('12:05:32.450');

  const timeDiffResult = useMemo(() => {
    try {
      const parseHms = (str: string) => {
        const parts = str.trim().split(':');
        if (parts.length < 2) return null;
        const h = parseFloat(parts[0]) || 0;
        const m = parseFloat(parts[1]) || 0;
        const s = parts[2] ? parseFloat(parts[2]) : 0;
        return h * 3600 + m * 60 + s;
      };

      const sec1 = parseHms(time1);
      const sec2 = parseHms(time2);

      if (sec1 === null || sec2 === null) return null;

      const diffSec = Math.abs(sec2 - sec1);
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = (diffSec % 60).toFixed(3);

      return {
        totalSeconds: diffSec.toFixed(3),
        formatted: `${hours}h ${mins}m ${secs}s`,
        epochsAt1Hz: Math.round(diffSec),
        epochsAt5Hz: Math.round(diffSec * 5),
        epochsAt10Hz: Math.round(diffSec * 10),
      };
    } catch {
      return null;
    }
  }, [time1, time2]);

  // -------------------------------------------------------------
  // Tool 2: UTC to IST & Vice-Versa Converter State
  // -------------------------------------------------------------
  const [utcInput, setUtcInput] = useState(() => {
    const d = new Date();
    return d.toISOString().substring(11, 23); // "HH:MM:SS.sss"
  });
  const [utcDateInput, setUtcDateInput] = useState(() => {
    const d = new Date();
    return d.toISOString().substring(0, 10); // "YYYY-MM-DD"
  });

  const [direction, setDirection] = useState<'utc_to_ist' | 'ist_to_utc'>('utc_to_ist');

  const conversionResult = useMemo(() => {
    try {
      const dateTimeStr = `${utcDateInput}T${utcInput}Z`;
      const baseDate = new Date(dateTimeStr);
      if (isNaN(baseDate.getTime())) return null;

      if (direction === 'utc_to_ist') {
        const istOffsetMs = 5.5 * 3600 * 1000;
        const istDate = new Date(baseDate.getTime() + istOffsetMs);
        return {
          originalTz: 'UTC (GMT+0)',
          targetTz: 'IST (Indian Standard Time, GMT+5:30)',
          targetTimeStr: istDate.toISOString().substring(11, 23),
          targetDateStr: istDate.toISOString().substring(0, 10),
          fullIso: istDate.toISOString().replace('Z', '+05:30'),
          epochSeconds: Math.floor(baseDate.getTime() / 1000),
        };
      } else {
        const istOffsetMs = 5.5 * 3600 * 1000;
        const utcDate = new Date(baseDate.getTime() - istOffsetMs);
        return {
          originalTz: 'IST (GMT+5:30)',
          targetTz: 'UTC (GMT+0)',
          targetTimeStr: utcDate.toISOString().substring(11, 23),
          targetDateStr: utcDate.toISOString().substring(0, 10),
          fullIso: utcDate.toISOString(),
          epochSeconds: Math.floor(utcDate.getTime() / 1000),
        };
      }
    } catch {
      return null;
    }
  }, [utcInput, utcDateInput, direction]);

  // -------------------------------------------------------------
  // Tool 3: Bulk Line Copy & Filter State
  // -------------------------------------------------------------
  const [sourceText, setSourceText] = useState(
    `$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A\n$GPGSV,2,1,08,01,40,083,46,02,17,308,41,08,61,189,48,10,38,230,44*77\n$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48\n$GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1*39`
  );
  const [filterQuery, setFilterQuery] = useState('');
  const [lineRangeFrom, setLineRangeFrom] = useState<number | ''>(1);
  const [lineRangeTo, setLineRangeTo] = useState<number | ''>(100);
  const [stripChecksums, setStripChecksums] = useState(false);
  const [copiedBulk, setCopiedBulk] = useState(false);

  const processedLines = useMemo(() => {
    const rawLines = sourceText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const fromIdx = typeof lineRangeFrom === 'number' ? Math.max(1, lineRangeFrom) - 1 : 0;
    const toIdx = typeof lineRangeTo === 'number' ? Math.max(fromIdx, lineRangeTo) : rawLines.length;

    const sliced = rawLines.slice(fromIdx, toIdx);

    const filtered = filterQuery.trim()
      ? sliced.filter((l) => l.toUpperCase().includes(filterQuery.toUpperCase().trim()))
      : sliced;

    if (stripChecksums) {
      return filtered.map((l) => {
        const star = l.indexOf('*');
        return star !== -1 ? l.substring(0, star) : l;
      });
    }

    return filtered;
  }, [sourceText, filterQuery, lineRangeFrom, lineRangeTo, stripChecksums]);

  const handleCopyBulk = () => {
    navigator.clipboard.writeText(processedLines.join('\n'));
    setCopiedBulk(true);
    setTimeout(() => setCopiedBulk(false), 2000);
  };

  const handleDownloadBulk = () => {
    const blob = new Blob([processedLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_nmea_lines_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Exported ${processedLines.length} NMEA lines to ${a.download}`, 'success');
  };

  // -------------------------------------------------------------
  // Tool 4: NMEA Checksum Calculator State
  // -------------------------------------------------------------
  const [rawSentence, setRawSentence] = useState('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47');
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  const computeNmeaChecksum = (payload: string): string => {
    let clean = payload.trim();
    if (clean.startsWith('$') || clean.startsWith('!')) {
      clean = clean.substring(1);
    }
    const starIdx = clean.indexOf('*');
    if (starIdx !== -1) {
      clean = clean.substring(0, starIdx);
    }
    let checksum = 0;
    for (let i = 0; i < clean.length; i++) {
      checksum ^= clean.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  };

  const rawTrimmed = rawSentence.trim();
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

  const activeUtilConfig = UTILITIES_CONFIG.find((u) => u.id === selectedToolId);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header Card (Mirrors TaskPage.tsx styling exactly) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <Wrench className="w-4 h-4" />
            <span>Standalone Engineering Suite</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-0.5">
            GNSS Standard Utilities ({UTILITIES_CONFIG.length} Modules)
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Independent utilities for GNSS time delta calculation, timezone conversions, batch line slicing, and checksum validation.
          </p>
        </div>

        {/* View Switcher / Return to Matrix Button */}
        {selectedToolId !== null && (
          <button
            onClick={() => setSelectedToolId(null)}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF8F5] dark:bg-slate-900 text-[#24211D] dark:text-slate-200 hover:border-[#E05318] border border-[#E6E1D6] dark:border-slate-800 flex items-center space-x-2 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#E05318]" />
            <span>Back to Utilities Matrix</span>
          </button>
        )}
      </div>

      {/* Category Filter Chips (Mirrors TaskPage.tsx filter bar) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setCategoryFilter('all');
            if (selectedToolId && categoryFilter !== 'all') setSelectedToolId(null);
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          All Utilities ({UTILITIES_CONFIG.length})
        </button>
        <button
          onClick={() => {
            setCategoryFilter('time');
            setSelectedToolId('timediff');
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'time'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Time & Intervals
        </button>
        <button
          onClick={() => {
            setCategoryFilter('timezone');
            setSelectedToolId('utc_ist');
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'timezone'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Timezone Shifts
        </button>
        <button
          onClick={() => {
            setCategoryFilter('lines');
            setSelectedToolId('linecopy');
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'lines'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Line Operations
        </button>
        <button
          onClick={() => {
            setCategoryFilter('checksum');
            setSelectedToolId('checksum');
          }}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'checksum'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Integrity & Hash
        </button>
      </div>

      {/* VIEW 1: UTILITIES MATRIX GRID (Identical design to TaskPage's task grid cards!) */}
      {selectedToolId === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredUtilities.map((util) => {
            const IconComponent = util.icon;
            return (
              <div
                key={util.id}
                onClick={() => setSelectedToolId(util.id)}
                className="rounded-2xl p-5 transition-all cursor-pointer border flex flex-col justify-between group shadow-xs hover:shadow-md bg-[#FAF8F5] dark:bg-slate-900 border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#E05318] bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
                      Util {util.num}
                    </span>
                    <span className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono">
                      {util.categoryLabel}
                    </span>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FDF3EE] dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-[#E05318] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug">
                        {util.title}
                      </h3>
                      <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 leading-relaxed">
                        {util.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[#736E65] dark:text-slate-400 font-mono text-[11px]">
                    Output: <strong>{util.spec}</strong>
                  </span>
                  <span className="font-semibold text-[#E05318] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Launch Utility</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: FOCUSED UTILITY WORKSPACE */
        <div className="space-y-4">
          {/* Quick Sub-navigation between utilities */}
          <div className="flex items-center justify-between bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#E05318] bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
                Util {activeUtilConfig?.num}
              </span>
              <span className="text-sm font-bold text-[#24211D] dark:text-slate-100">
                {activeUtilConfig?.title}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              {UTILITIES_CONFIG.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedToolId(u.id)}
                  type="button"
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    selectedToolId === u.id
                      ? 'bg-[#E05318] text-white'
                      : 'text-[#736E65] dark:text-slate-400 hover:bg-[#EFEAE1] dark:hover:bg-slate-800'
                  }`}
                  title={u.title}
                >
                  U{u.num}
                </button>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------------------
              TOOL 1: Time Difference Calculator Workspace
              ------------------------------------------------------------- */}
          {selectedToolId === 'timediff' && (
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#E05318]" />
                  <span>GNSS Timestamp Delta & Interval Calculator</span>
                </h3>
                <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                  Compute precise elapsed seconds, epoch counts, and duration between two GPS/NMEA fix timestamps (HH:MM:SS.sss).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                    Start Timestamp (T1)
                  </label>
                  <input
                    type="text"
                    value={time1}
                    onChange={(e) => setTime1(e.target.value)}
                    placeholder="12:00:00.000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {['12:00:00.000', '00:00:00.000', '08:30:15.500'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTime1(preset)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                    End Timestamp (T2)
                  </label>
                  <input
                    type="text"
                    value={time2}
                    onChange={(e) => setTime2(e.target.value)}
                    placeholder="12:05:32.450"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {['12:05:32.450', '12:01:00.000', '09:00:00.000'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTime2(preset)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calculation Output Card */}
              {timeDiffResult ? (
                <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Calculated Interval Results</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        Formatted Delta
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#E05318] mt-0.5">
                        {timeDiffResult.formatted}
                      </div>
                    </div>

                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        Total Seconds
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                        {timeDiffResult.totalSeconds} s
                      </div>
                    </div>

                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        1 Hz Epochs
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                        {timeDiffResult.epochsAt1Hz.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        10 Hz Epochs
                      </div>
                      <div className="text-sm sm:text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5">
                        {timeDiffResult.epochsAt10Hz.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-mono">
                  Enter valid timestamps in HH:MM:SS or HH:MM:SS.sss format to view delta duration.
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------
              TOOL 2: UTC to IST Converter Workspace
              ------------------------------------------------------------- */}
          {selectedToolId === 'utc_ist' && (
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                    <ArrowRightLeft className="w-4 h-4 text-[#E05318]" />
                    <span>UTC &harr; IST High-Precision Timezone Converter</span>
                  </h3>
                  <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                    Convert between GNSS standard UTC (GMT+0) and Indian Standard Time (IST, GMT+5:30).
                  </p>
                </div>

                <div className="flex items-center space-x-1 bg-[#EFEAE1]/70 dark:bg-slate-800 p-1 rounded-xl border border-[#E6E1D6] dark:border-slate-700 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setDirection('utc_to_ist')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                      direction === 'utc_to_ist'
                        ? 'bg-[#E05318] text-white shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D]'
                    }`}
                  >
                    UTC &rarr; IST
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('ist_to_utc')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                      direction === 'ist_to_utc'
                        ? 'bg-[#E05318] text-white shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D]'
                    }`}
                  >
                    IST &rarr; UTC
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                    Source Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={utcDateInput}
                    onChange={(e) => setUtcDateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                      {direction === 'utc_to_ist' ? 'Source UTC Time' : 'Source IST Time'} (HH:MM:SS.sss)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setUtcDateInput(now.toISOString().substring(0, 10));
                        setUtcInput(now.toISOString().substring(11, 23));
                      }}
                      className="text-[10px] text-[#E05318] hover:underline font-mono flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Use Current UTC</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={utcInput}
                    onChange={(e) => setUtcInput(e.target.value)}
                    placeholder="12:00:00.000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>
              </div>

              {conversionResult && (
                <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Converted Target Timezone</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl sm:col-span-1">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        Target Time ({direction === 'utc_to_ist' ? 'IST' : 'UTC'})
                      </div>
                      <div className="text-lg font-bold font-mono text-[#E05318] mt-0.5">
                        {conversionResult.targetTimeStr}
                      </div>
                      <div className="text-xs font-mono text-[#736E65] dark:text-slate-400 mt-0.5">
                        {conversionResult.targetDateStr}
                      </div>
                    </div>

                    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl sm:col-span-2">
                      <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                        ISO-8601 & Epoch Timestamp
                      </div>
                      <div className="text-sm font-bold font-mono text-[#24211D] dark:text-slate-100 mt-0.5 truncate">
                        {conversionResult.fullIso}
                      </div>
                      <div className="text-xs font-mono text-[#736E65] dark:text-slate-400 mt-0.5">
                        Unix Epoch: {conversionResult.epochSeconds} seconds
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------
              TOOL 3: Bulk Line Copy & Filter Workspace
              ------------------------------------------------------------- */}
          {selectedToolId === 'linecopy' && (
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#E05318]" />
                    <span>Bulk NMEA Line Slicer & Extraction Utility</span>
                  </h3>
                  <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                    Filter thousands of lines by sentence type (GGA, RMC, GSV), slice row indices, and export.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyBulk}
                    type="button"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {copiedBulk ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBulk ? 'Copied!' : `Copy (${processedLines.length} lines)`}</span>
                  </button>

                  <button
                    onClick={handleDownloadBulk}
                    type="button"
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#E05318] flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              {/* Controls bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F5F2EB]/90 dark:bg-slate-950 p-4 rounded-xl border border-[#E6E1D6] dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 uppercase font-mono">
                    Filter by Sentence (e.g. GGA)
                  </label>
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="e.g. GGA, RMC, GSV"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#736E65] dark:text-slate-400 uppercase font-mono">
                    Line Range (From &rarr; To)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={lineRangeFrom}
                      onChange={(e) => setLineRangeFrom(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                    <span className="text-xs text-[#736E65] dark:text-slate-400 font-mono">to</span>
                    <input
                      type="number"
                      value={lineRangeTo}
                      onChange={(e) => setLineRangeTo(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="100"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                  </div>
                </div>

                <div className="flex items-center sm:justify-center pt-2 sm:pt-4">
                  <label className="flex items-center space-x-2 text-xs text-[#24211D] dark:text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stripChecksums}
                      onChange={(e) => setStripChecksums(e.target.checked)}
                      className="rounded accent-[#E05318]"
                    />
                    <span>Strip Checksum (*XX)</span>
                  </label>
                </div>
              </div>

              {/* Source & Result Textarea */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#736E65] dark:text-slate-400 font-mono">
                    <span>Source Log Input</span>
                    <span>{sourceText.split('\n').length} lines</span>
                  </div>
                  <textarea
                    rows={8}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Paste NMEA lines here..."
                    className="w-full p-3 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#736E65] dark:text-slate-400 font-mono">
                    <span>Extracted & Filtered Output</span>
                    <span className="text-[#E05318] font-bold">{processedLines.length} matched</span>
                  </div>
                  <textarea
                    rows={8}
                    readOnly
                    value={processedLines.join('\n')}
                    placeholder="Filtered lines will appear here..."
                    className="w-full p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              TOOL 4: NMEA Checksum Calculator Workspace
              ------------------------------------------------------------- */}
          {selectedToolId === 'checksum' && (
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-[#E05318]" />
                  <span>NMEA 0183 8-bit XOR Checksum Calculator & Validator</span>
                </h3>
                <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
                  Calculate and verify the 8-bit XOR checksum byte (between $ and *) for any standard sentence.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200">
                  Sentence Payload or Raw String
                </label>
                <input
                  type="text"
                  value={rawSentence}
                  onChange={(e) => setRawSentence(e.target.value)}
                  placeholder="$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs sm:text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
                    '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A',
                    '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRawSentence(preset)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] cursor-pointer"
                    >
                      Preset {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Calculation Display */}
              <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Checksum Verification</span>
                  </div>

                  {isCompleteWithChecksum && (
                    <div className="flex items-center space-x-1.5 text-xs font-mono">
                      {isValidChecksum ? (
                        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>VALID CHECKSUM</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold bg-red-100/70 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-200/60 dark:border-red-800/40">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>MISMATCH (Given: *{providedChecksum})</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl sm:col-span-1">
                    <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                      Computed Checksum Byte
                    </div>
                    <div className="text-xl font-bold font-mono text-[#E05318] mt-0.5">
                      *{calculatedChecksum}
                    </div>
                  </div>

                  <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3 rounded-xl sm:col-span-2">
                    <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono flex items-center justify-between">
                      <span>Complete Validated Sentence</span>
                      <button
                        onClick={handleCopyChecksum}
                        type="button"
                        className="text-[#E05318] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedChecksum ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedChecksum ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#24211D] dark:text-slate-100 mt-1 break-all">
                      {assembledSentence}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
