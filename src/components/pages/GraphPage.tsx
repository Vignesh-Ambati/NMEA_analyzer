import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TASKS_CONFIG } from '../../services/tasks';
import { extractTaskData } from '../../services/nmeaParser';
import { InteractivePlot } from '../graph/InteractivePlot';
import { TrajectoryMap } from '../graph/TrajectoryMap';
import { SentenceInspector } from '../graph/SentenceInspector';
import { StatsPanel } from '../graph/StatsPanel';
import { SeriesData } from '../../types/nmea';
import {
  Maximize2,
  Minimize2,
  Move,
  ZoomIn,
  RotateCcw,
  Download,
  FileSpreadsheet,
  LineChart,
  Map,
  BarChart2,
  FileCode,
  Layers,
  UploadCloud,
  ArrowRight
} from 'lucide-react';

export const GraphPage: React.FC = () => {
  const {
    files,
    selectedFileId,
    setSelectedFileId,
    currentTaskId,
    navigateToFilePage,
    addLog,
    isFullpage,
    setIsFullpage,
    theme,
  } = useApp();

  const currentTask = useMemo(() => {
    return TASKS_CONFIG.find((t) => t.id === currentTaskId) || TASKS_CONFIG[0];
  }, [currentTaskId]);

  const [activeTab, setActiveTab] = useState<'plot' | 'map' | 'stats' | 'sentences'>('plot');
  const [interactionMode, setInteractionMode] = useState<'idle' | 'pan' | 'zoom'>('idle');

  // Eye-care friendly plot colors tied to active theme
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0F172A' : '#F8FAFC';
  const textColor = isDark ? '#CBD5E1' : '#475569';
  const gridColor = isDark ? '#1E2E48' : '#E2E8F0';
  const showGrid = true;

  const [resetCounter, setResetCounter] = useState(0);
  const [exportCounter, setExportCounter] = useState(0);

  const targetSeries = useMemo<SeriesData[]>(() => {
    const list = selectedFileId === 'Combined' ? files : files.filter((f) => f.id === selectedFileId);

    return list.map((file) => {
      const points = extractTaskData(file, currentTaskId);
      return {
        fileId: file.id,
        filename: file.filename,
        color: file.color,
        points,
      };
    });
  }, [files, selectedFileId, currentTaskId]);

  const handleExportPng = () => {
    setExportCounter((c) => c + 1);
  };

  const handleExportDone = (blobUrl: string) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `gnss_chart_${currentTask.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    a.click();
    addLog(`Exported plot image: ${a.download}`, 'success');
  };

  const handleExportCsv = () => {
    const rows = ['Timestamp_UTC,Epoch_Time_Sec,Dataset,Value,Unit'];
    targetSeries.forEach((s) => {
      s.points.forEach((p) => {
        const utc = new Date(p.time * 1000).toISOString();
        rows.push(`${utc},${p.time},${s.filename},${p.value},${currentTask.unit}`);
      });
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gnss_telemetry_${currentTask.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Exported dataset CSV: ${a.download}`, 'success');
  };

  const handlePanTool = () => {
    setInteractionMode((prev) => (prev === 'pan' ? 'idle' : 'pan'));
  };

  const handleZoomTool = () => {
    setInteractionMode((prev) => (prev === 'zoom' ? 'idle' : 'zoom'));
  };

  const handleResetScale = () => {
    setResetCounter((c) => c + 1);
    setInteractionMode('idle');
    addLog('Reset plot view to full data bounds', 'info');
  };

  // EMPTY STATE WHEN NO FILE IS LOADED
  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 select-none max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100/70 dark:bg-orange-950/40 flex items-center justify-center text-[#E05318]">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            No NMEA File to Plot
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Please upload an NMEA 0183 or UBX log file in Step 1 to generate interactive charts, ground track maps, and statistics.
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
    <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4 md:p-5 gap-2 sm:gap-3 select-none max-w-7xl mx-auto w-full">
      {/* Visualizer Header Toolbar (Responsive, Clean & Professional) */}
      <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0 transition-colors">
        {/* Left: Task Title & Multi-File Selector */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{currentTask.icon}</span>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentTask.title}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1.5">
              <span>{currentTask.unit ? `Unit: ${currentTask.unit}` : 'Binary Fix'}</span>
              <span>·</span>
              <span>Task #{currentTask.id}</span>
            </div>
          </div>

          {/* Dataset Switcher if multi-file */}
          {files.length > 1 && (
            <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200/80 dark:border-slate-800">
              <Layers className="w-4 h-4 text-sky-500 shrink-0" />
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="bg-slate-100/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none"
              >
                <option value="Combined">Combined ({files.length} files)</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center / Right: View Tabs (Plot, Map, Stats, Sentences) */}
        <div className="flex items-center space-x-1 bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('plot')}
            type="button"
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap text-xs ${
              activeTab === 'plot'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-[#E05318]" />
            <span>Plot</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            type="button"
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap text-xs ${
              activeTab === 'map'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-sky-500" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            type="button"
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap text-xs ${
              activeTab === 'stats'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('sentences')}
            type="button"
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors whitespace-nowrap text-xs ${
              activeTab === 'sentences'
                ? 'bg-[#FAFBFD] dark:bg-slate-900 text-[#E05318] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>Raw</span>
          </button>
        </div>
      </div>

      {/* Interactive Tool Actions Ribbon (Zoom, Pan, Reset, Export PNG, Export CSV, Fullpage) */}
      {activeTab === 'plot' && (
        <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs transition-colors shrink-0">
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Zoom Tool */}
            <button
              onClick={handleZoomTool}
              type="button"
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1 border transition-all cursor-pointer text-xs ${
                interactionMode === 'zoom'
                  ? 'bg-[#E05318] text-white border-[#E05318]'
                  : 'bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-[#E05318]'
              }`}
              title="Box Zoom: Drag across plot to zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Zoom</span>
            </button>

            {/* Pan Tool */}
            <button
              onClick={handlePanTool}
              type="button"
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1 border transition-all cursor-pointer text-xs ${
                interactionMode === 'pan'
                  ? 'bg-[#E05318] text-white border-[#E05318]'
                  : 'bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-[#E05318]'
              }`}
              title="Pan Tool: Drag to pan along time axis"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Pan</span>
            </button>

            {/* Reset View */}
            <button
              onClick={handleResetScale}
              type="button"
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1 bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-[#E05318] transition-all cursor-pointer text-xs"
              title="Reset Zoom & Pan to Full Extents"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Export PNG */}
            <button
              onClick={handleExportPng}
              type="button"
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1 bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-sky-500 transition-all cursor-pointer text-xs"
              title="Export High-Resolution PNG Snapshot"
            >
              <Download className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">PNG</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              type="button"
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-semibold flex items-center space-x-1 bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500 transition-all cursor-pointer text-xs"
              title="Export Telemetry Data Points as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Fullscreen Maximize */}
            <button
              onClick={() => setIsFullpage(!isFullpage)}
              type="button"
              className="p-1 sm:p-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-[#E05318] transition-all cursor-pointer"
              title={isFullpage ? 'Exit Fullscreen' : 'Fullscreen Plot'}
            >
              {isFullpage ? <Minimize2 className="w-3.5 h-3.5 text-[#E05318]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#E05318]" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas / Visualizer Stage Card (Spacious, 100% Responsive on Rotated Mobile and Desktop) */}
      <main className="flex-1 bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xs min-h-[260px] sm:min-h-[380px]">
        {activeTab === 'plot' && (
          <InteractivePlot
            series={targetSeries}
            yAxisLabel={currentTask.yAxisLabel}
            unit={currentTask.unit}
            interactionMode={interactionMode}
            isAutoMode={false}
            bgColor={bgColor}
            textColor={textColor}
            gridColor={gridColor}
            showGrid={showGrid}
            resetTrigger={resetCounter}
            exportTrigger={exportCounter}
            onExportDone={handleExportDone}
          />
        )}

        {activeTab === 'map' && (
          <TrajectoryMap files={files} selectedFileId={selectedFileId} />
        )}

        {activeTab === 'stats' && (
          <StatsPanel files={files} selectedFileId={selectedFileId} />
        )}

        {activeTab === 'sentences' && (
          <SentenceInspector files={files} selectedFileId={selectedFileId} />
        )}
      </main>
    </div>
  );
};
