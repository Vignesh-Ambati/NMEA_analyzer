import React, { useState } from 'react';
import { Clock, ArrowRightLeft, FileText, Wrench } from 'lucide-react';
import { UtilityConfig, UtilityId } from '../utilities/types';
import { TimeDifferenceCalculator } from '../utilities/TimeDifferenceCalculator';
import { UtcIstConverter } from '../utilities/UtcIstConverter';
import { BulkLineCopyUtility } from '../utilities/BulkLineCopyUtility';

const UTILITIES_CONFIG: UtilityConfig[] = [
  {
    id: 'timediff',
    title: 'Time Difference Calculator',
    shortTitle: 'Time Difference',
    categoryLabel: '| Time-1 - Time-2 | ≈ |Time Difference|',
    tagLine: 'Calculate duration and elapsed seconds between two GNSS timestamps.',
    detailedInfo: 'Calculates elapsed duration and seconds between two GNSS timestamps. Supports format: 141105.00,17,10,2026 (Time, Day, Month, Year) or time-only 141105.00.',
    inputFormat: '',
    outputSpec: 'Duration & Total Seconds',
    icon: Clock,
  },
  {
    id: 'utc_ist',
    title: 'UTC ⇋ IST Timezone Converter',
    shortTitle: 'UTC ↔ IST',
    categoryLabel: 'UTC ⇋ IST Conversion',
    tagLine: 'Bi-directional conversion between GNSS UTC and IST.',
    detailedInfo: 'Bi-directional converter between GNSS standard UTC and Indian Standard Time. Supports 141105.00,17,10,2026 or time-only 141105.00 with day shift.',
    inputFormat: '',
    outputSpec: 'IST Time, Date & Day Shift Status',
    icon: ArrowRightLeft,
  },
  {
    id: 'linecopy',
    title: 'Data Extractor Pro',
    shortTitle: 'Data Extractor Pro',
    categoryLabel: 'Regex & Line Extraction',
    tagLine: 'Extract, filter, slice line ranges, and export GNSS sentences with high-performance regex.',
    detailedInfo: 'High-performance regex and line slicer. Batch filter sentences by talker or regex expression, slice line ranges, strip trailing checksums, and export extracted data.',
    inputFormat: 'Raw Multiline NMEA Text or File',
    outputSpec: 'Filtered Lines (.log / .txt)',
    icon: FileText,
  },
];

export const ToolsPage: React.FC = () => {
  // Active tab: 'all' displays the grid of utilities; specific id displays that utility's workspace
  const [activeTab, setActiveTab] = useState<'all' | UtilityId>('all');

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full select-none">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <Wrench className="w-4 h-4" />
            <span>Standalone Engineering Suite</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-0.5">
            GNSS Standard Utilities
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5 truncate">
            Quick-access GNSS utilities for time deltas, timezone shifts, and raw sentence slicing.
          </p>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('all')}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          All Utilities
        </button>

        <button
          onClick={() => setActiveTab('timediff')}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'timediff'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Time Difference
        </button>

        <button
          onClick={() => setActiveTab('utc_ist')}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'utc_ist'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          UTC &harr; IST Converter
        </button>

        <button
          onClick={() => setActiveTab('linecopy')}
          type="button"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'linecopy'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
          }`}
        >
          Data Extractor Pro
        </button>
      </div>

      {/* VIEW 1: All Utilities Grid */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {UTILITIES_CONFIG.map((util) => {
            const IconComponent = util.icon;
            return (
              <div
                key={util.id}
                onClick={() => setActiveTab(util.id)}
                className="rounded-2xl p-5 transition-all cursor-pointer border flex flex-col justify-between group shadow-xs hover:shadow-md bg-[#FAF8F5] dark:bg-slate-900 border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono">
                      {util.categoryLabel}
                    </span>
                    <span className="text-[10px] text-[#E05318] font-mono bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
                      Open Tool
                    </span>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FDF3EE] dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-[#E05318] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug whitespace-normal break-words">
                        {util.title}
                      </h3>
                      <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 whitespace-normal break-words">
                        {util.tagLine}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Focused Utility Workspaces */}
      {activeTab === 'timediff' && <TimeDifferenceCalculator />}
      {activeTab === 'utc_ist' && <UtcIstConverter />}
      {activeTab === 'linecopy' && <BulkLineCopyUtility />}
    </div>
  );
};
