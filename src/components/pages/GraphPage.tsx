import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TASKS_CONFIG } from '../../services/tasks';
import { InteractivePlot } from '../graph/InteractivePlot';
import {
  ZoomIn,
  Move,
  RotateCcw,
  Download,
  ChevronDown,
  UploadCloud,
  LineChart,
} from 'lucide-react';
import { SeriesData } from '../../types';

export const GraphPage: React.FC = () => {
  const {
    currentTaskId,
    setCurrentTaskId,
    files,
    selectedFileId,
    setSelectedFileId,
    theme,
    navigateToFilePage,
  } = useApp();

  const currentTask = TASKS_CONFIG.find((t) => t.id === currentTaskId) || TASKS_CONFIG[0];

  const [interactionMode, setInteractionMode] = useState<'idle' | 'pan' | 'zoom'>('idle');
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

  // Eye-care plot styling for light mode, deep dark navy for dark mode
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0F172A' : '#FAF8F5';
  const textColor = isDark ? '#CBD5E1' : '#6E6961';
  const gridColor = isDark ? '#1E2E48' : '#E6E1D6';
  const showGrid = true;

  const [resetCounter, setResetCounter] = useState(0);
  const [exportCounter, setExportCounter] = useState(0);

  const targetSeries = useMemo<SeriesData[]>(() => {
    // When backend submits plot series, it will populate here
    return [];
  }, [files, selectedFileId, currentTaskId]);

  const handleExportPng = () => {
    setExportCounter((c) => c + 1);
  };

  const handleExportDone = (blobUrl: string) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `gnss_chart_${currentTask.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F2EB] dark:bg-slate-950 select-none">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-[#E6E1D6] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900 px-3 sm:px-4 flex items-center justify-between shrink-0">
        {/* Task Selector Dropdown & File Indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="relative group">
            <select
              value={currentTaskId}
              onChange={(e) => setCurrentTaskId(Number(e.target.value))}
              aria-label="Select GNSS Task"
              className="appearance-none bg-[#EFEAE1]/70 dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 rounded-xl py-1.5 pl-3 pr-8 text-xs font-bold text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318] cursor-pointer"
            >
              {TASKS_CONFIG.map((task) => (
                <option key={task.id} value={task.id}>
                  Task {task.id}: {task.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#736E65] pointer-events-none" />
          </div>

          {files.length > 0 ? (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{files.length} active dataset{files.length > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <button
              onClick={navigateToFilePage}
              type="button"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-[11px] font-mono text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload log to plot</span>
            </button>
          )}
        </div>

        {/* Chart Interaction Tools */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-[#EFEAE1]/60 dark:bg-slate-800 p-1 rounded-xl border border-[#E6E1D6] dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setInteractionMode((m) => (m === 'pan' ? 'idle' : 'pan'))}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                interactionMode === 'pan'
                  ? 'bg-[#E05318] text-white shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D]'
              }`}
              title="Pan tool (click and drag plot)"
              aria-label="Pan Tool"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode((m) => (m === 'zoom' ? 'idle' : 'zoom'))}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                interactionMode === 'zoom'
                  ? 'bg-[#E05318] text-white shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D]'
              }`}
              title="Zoom box tool"
              aria-label="Zoom Tool"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setResetCounter((c) => c + 1)}
            className="p-2 rounded-xl bg-[#EFEAE1]/60 dark:bg-slate-800 text-[#736E65] dark:text-slate-400 hover:text-[#24211D] border border-[#E6E1D6] dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
            title="Reset plot zoom and viewport"
            aria-label="Reset Plot View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPng}
            className="px-3 py-1.5 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            title="Export high-resolution PNG chart"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export PNG</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Plot Canvas */}
      <div className="flex-1 relative overflow-hidden flex flex-col p-2 sm:p-3">
        <div className="flex-1 w-full h-full bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs relative">
          <InteractivePlot
            series={targetSeries}
            yAxisLabel={currentTask.title}
            unit={currentTask.unit}
            interactionMode={interactionMode}
            isAutoMode={isAutoMode}
            bgColor={bgColor}
            textColor={textColor}
            gridColor={gridColor}
            showGrid={showGrid}
            resetTrigger={resetCounter}
            exportTrigger={exportCounter}
            onExportDone={handleExportDone}
          />
        </div>
      </div>
    </div>
  );
};
