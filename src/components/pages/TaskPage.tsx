import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { TASKS_CONFIG, getTasksByCategory, TaskCategory, TaskFilterBar, TaskGrid } from '../../tasks';
import {
  UploadCloud,
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

  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        processFile(e.target.files[i]);
      }
    }
  };

  const filteredTasks = getTasksByCategory(categoryFilter);

  // EMPTY STATE WHEN NO FILE IS LOADED
  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 select-none max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#FDF3EE] dark:bg-orange-950/40 flex items-center justify-center text-[#E05318] border border-orange-200/60 dark:border-orange-900/40 shadow-xs">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#24211D] dark:text-slate-100">
            No NMEA Log File Loaded
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 leading-relaxed">
            Please upload an NMEA 0183 or UBX log file in Step 1 to execute and visualize the 10 GNSS telemetry analysis modules.
          </p>
        </div>
        <button
          onClick={navigateToFilePage}
          type="button"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6E1D6] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <LayoutGrid className="w-4 h-4" />
            <span>Step 2 · Select Analysis Task</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-0.5">
            GNSS Task Matrix ({TASKS_CONFIG.length} Modules)
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
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
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF8F5] dark:bg-slate-900 text-[#24211D] dark:text-slate-200 hover:border-[#E05318] border border-[#E6E1D6] dark:border-slate-800 flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-[#E05318]" />
            <span>Add Comparison File</span>
          </button>
        </div>
      </div>

      {/* Category Filter Buttons from dedicated TaskFilterBar */}
      <TaskFilterBar
        currentCategory={categoryFilter}
        onSelectCategory={setCategoryFilter}
      />

      {/* Task Grid Cards from dedicated TaskGrid */}
      <TaskGrid
        tasks={filteredTasks}
        selectedTaskId={currentTaskId}
        onSelectTask={navigateToGraphPage}
      />
    </div>
  );
};
