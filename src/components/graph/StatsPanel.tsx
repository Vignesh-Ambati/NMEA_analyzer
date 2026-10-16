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
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFBFD] dark:bg-slate-900 rounded-2xl select-none transition-colors">
      {targetFiles.map((file) => {
        const { stats } = file;

        return (
          <div
            key={file.id}
            className="bg-slate-100/60 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: file.color }}
                />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {file.filename}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  [{(file.fileSize / 1024).toFixed(1)} KB]
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">
                  Duration: <strong className="text-sky-500">{file.durationSeconds}s</strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Total Epochs: <strong className="text-slate-800 dark:text-slate-200">{stats.totalEpochs}</strong>
                </span>
              </div>
            </div>

            {/* Stat metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Fix Availability */}
              <div className="bg-[#FAFBFD] dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Fix Availability</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {stats.fixAvailabilityPct}%
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {stats.validFixEpochs} / {stats.totalEpochs} epochs
                </div>
              </div>

              {/* Satellites in View */}
              <div className="bg-[#FAFBFD] dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Avg Satellites</span>
                  <Satellite className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                  {stats.avgSvCount}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Max: {stats.maxSvCount} SVs
                </div>
              </div>

              {/* Mean SNR / C/N0 */}
              <div className="bg-[#FAFBFD] dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Avg C/N0 (SNR)</span>
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {stats.avgCn0} <span className="text-xs">dB-Hz</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Signal strength
                </div>
              </div>

              {/* Position Accuracy (HDOP) */}
              <div className="bg-[#FAFBFD] dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Avg HDOP</span>
                  <Gauge className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  {stats.avgHdop}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Horizontal precision
                </div>
              </div>
            </div>

            {/* Altitude & Speed summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="text-slate-400 text-[10px]">Min Altitude</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stats.minAltitude !== Infinity ? `${stats.minAltitude.toFixed(1)} m` : '--'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="text-slate-400 text-[10px]">Max Altitude</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stats.maxAltitude !== -Infinity ? `${stats.maxAltitude.toFixed(1)} m` : '--'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="text-slate-400 text-[10px]">Max Speed</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stats.maxSpeedKmh !== -Infinity ? `${stats.maxSpeedKmh.toFixed(1)} km/h` : '--'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="text-slate-400 text-[10px]">Parsed Sentences</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {file.totalSentences.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
