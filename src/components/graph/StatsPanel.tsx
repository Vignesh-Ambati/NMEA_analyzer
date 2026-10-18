import React, { useMemo } from 'react';
import { ParsedLogFile } from '../../types/nmea';
import { Activity, Satellite, Mountain, Gauge, Clock, ShieldCheck, BarChart3, AlertOctagon } from 'lucide-react';

interface StatsPanelProps {
  files: ParsedLogFile[];
  selectedFileId: string;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ files, selectedFileId }) => {
  const targetFiles = useMemo(() => {
    if (selectedFileId === 'Combined') return files;
    return files.filter((f) => f.id === selectedFileId);
  }, [files, selectedFileId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl select-none transition-colors">
      {targetFiles.map((file) => {
        const { stats } = file;

        return (
          <div
            key={file.id}
            className="bg-[#F5F2EB]/80 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E6E1D6] dark:border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: file.color }}
                />
                <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100">
                  {file.filename}
                </h3>
                <span className="text-[11px] font-mono text-[#736E65] dark:text-slate-400">
                  [{(file.fileSize / 1024).toFixed(1)} KB]
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-[#736E65] dark:text-slate-400">
                  Duration: <strong className="text-[#E05318]">{file.durationSeconds}s</strong>
                </span>
                <span className="text-[#736E65] dark:text-slate-400">
                  Total Epochs: <strong className="text-[#24211D] dark:text-slate-200">{stats.totalEpochs}</strong>
                </span>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#E6E1D6] dark:border-slate-800 shadow-xs">
                <div className="flex items-center space-x-1.5 text-[#736E65] dark:text-slate-400 mb-1">
                  <Satellite className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="text-[11px] font-medium">Max Satellites</span>
                </div>
                <div className="text-base font-bold text-[#24211D] dark:text-slate-100 font-mono">
                  {stats.maxSvCount} SVs
                </div>
                <div className="text-[10px] text-[#736E65] dark:text-slate-400 mt-0.5">
                  Avg: {stats.avgSvCount.toFixed(1)} in view
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#E6E1D6] dark:border-slate-800 shadow-xs">
                <div className="flex items-center space-x-1.5 text-[#736E65] dark:text-slate-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-medium">Min HDOP</span>
                </div>
                <div className="text-base font-bold text-[#24211D] dark:text-slate-100 font-mono">
                  {stats.minHdop < 99 ? stats.minHdop.toFixed(2) : 'N/A'}
                </div>
                <div className="text-[10px] text-[#736E65] dark:text-slate-400 mt-0.5">
                  Max: {stats.maxHdop > 0 ? stats.maxHdop.toFixed(2) : 'N/A'}
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#E6E1D6] dark:border-slate-800 shadow-xs">
                <div className="flex items-center space-x-1.5 text-[#736E65] dark:text-slate-400 mb-1">
                  <Mountain className="w-3.5 h-3.5 text-[#E05318]" />
                  <span className="text-[11px] font-medium">Altitude Span</span>
                </div>
                <div className="text-base font-bold text-[#24211D] dark:text-slate-100 font-mono">
                  {stats.maxAltitude > -999 ? `${stats.minAltitude.toFixed(1)} - ${stats.maxAltitude.toFixed(1)}` : 'N/A'} m
                </div>
                <div className="text-[10px] text-[#736E65] dark:text-slate-400 mt-0.5">
                  Above mean sea level
                </div>
              </div>

              <div className="p-3 bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-[#E6E1D6] dark:border-slate-800 shadow-xs">
                <div className="flex items-center space-x-1.5 text-[#736E65] dark:text-slate-400 mb-1">
                  <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-[11px] font-medium">Avg C/N0 SNR</span>
                </div>
                <div className="text-base font-bold text-[#24211D] dark:text-slate-100 font-mono">
                  {stats.avgCn0 > 0 ? `${stats.avgCn0.toFixed(1)} dB-Hz` : 'N/A'}
                </div>
                <div className="text-[10px] text-[#736E65] dark:text-slate-400 mt-0.5">
                  Signal carrier-to-noise
                </div>
              </div>
            </div>

            {/* Sentence Breakdown list */}
            <div>
              <div className="text-[11px] font-bold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono mb-2">
                Sentence Type Breakdown
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(file.sentenceCounts).map(([type, count]) => (
                  <div
                    key={type}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex items-center space-x-2 font-mono"
                  >
                    <span className="font-bold text-[#E05318]">{type}</span>
                    <span className="text-[#736E65] dark:text-slate-400 text-[11px]">
                      {count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
