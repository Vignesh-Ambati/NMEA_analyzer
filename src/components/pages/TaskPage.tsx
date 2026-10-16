import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { TASKS_CONFIG } from '../../services/tasks';
import {
  UploadCloud,
  ChevronRight,
  ArrowRight,
  PlusCircle,
  LayoutGrid
} from 'lucide-react';

export const TaskPage: React.FC = () => {
  const {
    files,
    currentTaskId,
    navigateToGraphPage,
    navigateToFilePage,
    processFile,
    isProcessing,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'signal' | 'position' | 'system' | 'velocity'>('all');
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        processFile(e.target.files[i]);
      }
    }
  };

  const filteredTasks = TASKS_CONFIG.filter((task) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'signal') return [0, 1, 5].includes(task.id);
    if (categoryFilter === 'position') return [2, 3, 4, 8].includes(task.id);
    if (categoryFilter === 'system') return [6, 7].includes(task.id);
    if (categoryFilter === 'velocity') return [9].includes(task.id);
    return true;
  });

  // EMPTY STATE WHEN NO FILE IS LOADED
  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 select-none max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100/70 dark:bg-orange-950/40 flex items-center justify-center text-[#E05318]">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            No NMEA Log File Loaded
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Please upload an NMEA 0183 or UBX log file in Step 1 to execute and visualize the 10 GNSS telemetry analysis modules.
          </p>
        </div>
        <button
          onClick={navigateToFilePage}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2"
        >
          <span>Go to File Ingestion (Step 1)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full select-none">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <LayoutGrid className="w-4 h-4" />
            <span>Step 2 · Select Analysis Task</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            GNSS Task Matrix ({TASKS_CONFIG.length} Modules)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any module below to plot its telemetry series across {files.length} active dataset{files.length > 1 ? 's' : ''}.
          </p>
        </div>

        {/* Add comparison file button */}
        <div className="flex items-center space-x-2 shrink-0">
          <input
            type="file"
            ref={addFileInputRef}
            onChange={handleAddFile}
            multiple
            accept=".log,.txt,.nmea,.ubx,*"
            className="hidden"
          />
          <button
            onClick={() => addFileInputRef.current?.click()}
            disabled={isProcessing}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAFBFD] dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#E05318] border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-[#E05318]" />
            <span>Add Comparison File</span>
          </button>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAFBFD] dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          All Tasks ({TASKS_CONFIG.length})
        </button>
        <button
          onClick={() => setCategoryFilter('signal')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'signal'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAFBFD] dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          Signal & Constellation
        </button>
        <button
          onClick={() => setCategoryFilter('position')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'position'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAFBFD] dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          Position & Fix
        </button>
        <button
          onClick={() => setCategoryFilter('system')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'system'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAFBFD] dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          Receiver & SBAS
        </button>
        <button
          onClick={() => setCategoryFilter('velocity')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            categoryFilter === 'velocity'
              ? 'bg-[#E05318] text-white shadow-xs'
              : 'bg-[#FAFBFD] dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          Velocity & Heading
        </button>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredTasks.map((task) => {
          const isSelected = currentTaskId === task.id;

          return (
            <div
              key={task.id}
              onClick={() => navigateToGraphPage(task.id)}
              className={`bg-[#FAFBFD] dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md group ${
                isSelected
                  ? 'border-[#E05318] ring-2 ring-[#E05318]/20'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-[#E05318]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl sm:text-3xl">{task.icon}</span>
                  <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Task #{task.id}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug">
                  {task.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                  {task.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  {task.unit ? `Unit: ${task.unit}` : 'Binary Fix State'}
                </span>
                <span className="font-semibold text-[#E05318] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Launch Plot</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
