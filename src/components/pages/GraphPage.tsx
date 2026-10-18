import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TASKS_CONFIG } from '../../services/tasks';
import { extractTaskData } from '../../services/nmeaParser';
import { InteractivePlot } from '../graph/InteractivePlot';
import { StatsPanel } from '../graph/StatsPanel';
import { SentenceInspector } from '../graph/SentenceInspector';
import { TrajectoryMap } from '../graph/TrajectoryMap';
import {
  ZoomIn,
  Move,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ArrowRight,
  UploadCloud,
  FileCode2,
  TableProperties,
  MapPin,
  LineChart
} from 'lucide-react';
import { SeriesData } from '../../types/nmea';

export const GraphPage: React.FC = () => {
  const {
    currentTaskId,
    setCurrentTaskId,
    files,
    selectedFileId,
    setSelectedFileId,
    theme,
    addLog,
    navigateToFilePage,
  } = useApp();

  const currentTask = TASKS_CONFIG.find((t) => t.id === currentTaskId) || TASKS_CONFIG[0];

  const [activeTab, setActiveTab] = useState<'plot' | 'map' | 'stats' | 'inspector'>('plot');
  const [interactionMode, setInteractionMode] = useState<'idle' | 'pan' | 'zoom'>('idle');
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

  // Warm eye-care plot styling for light mode, deep dark navy for dark mode
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0F172A' : '#FAF8F5';
  const textColor = isDark ? '#CBD5E1' : '#6E6961';
  const gridColor = isDark ? '#1E2E48' : '#E6E1D6';
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
        <div className="w-16 h-16 rounded-2xl bg-[#FDF3EE] dark:bg-orange-950/40 flex items-center justify-center text-[#E05318] border border-orange-200/60 dark:border-orange-900/40 shadow-xs">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#24211D] dark:text-slate-100">
            No Active Datasets Loaded
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 leading-relaxed">
            Please upload an NMEA log file in Step 1 to generate and view interactive plots.
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
    <div className="flex-1 flex flex-col overflow-hidden select-none bg-[#F5F2EB] dark:bg-slate-950">
      {/* Top Controls Toolbar */}
      <div className="h-14 px-3 sm:px-5 bg-[#FAF8F5] dark:bg-slate-900 border-b border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between shrink-0 gap-2 z-10 transition-colors">
        {/* Left Side: Task Dropdown & Active Dataset Selector */}
        <div className="flex items-center space-x-2 min-w-0">
          {/* Task Selector */}
          <div className="relative">
            <select
              value={currentTaskId}
              onChange={(e) => setCurrentTaskId(Number(e.target.value))}
              className="appearance-none bg-[#FAF8F5] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-[#24211D] dark:text-slate-100 text-xs font-semibold pl-3 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-[#E05318] cursor-pointer shadow-xs truncate max-w-[200px] sm:max-w-[260px]"
            >
              {TASKS_CONFIG.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id + 1}. {t.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#736E65] dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Dataset Multi-File Selector */}
          <div className="relative hidden xs:block">
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="appearance-none bg-[#FAF8F5] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-[#736E65] dark:text-slate-300 text-xs font-medium pl-3 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-[#E05318] cursor-pointer shadow-xs truncate max-w-[150px] sm:max-w-[190px]"
            >
              <option value="Combined">All Datasets ({files.length})</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.filename}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#736E65] dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* View Mode Tabs (Plot vs Map vs Stats vs Raw Inspector) */}
          <div className="hidden md:flex items-center space-x-1 bg-[#EFEAE1]/70 dark:bg-slate-800/80 p-0.5 rounded-xl border border-[#E6E1D6] dark:border-slate-700 text-xs ml-2">
            <button
              onClick={() => setActiveTab('plot')}
              type="button"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                activeTab === 'plot'
                  ? 'bg-[#FAF8F5] dark:bg-slate-900 text-[#E05318] shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Plot</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              type="button"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                activeTab === 'map'
                  ? 'bg-[#FAF8F5] dark:bg-slate-900 text-[#E05318] shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Trajectory</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              type="button"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                activeTab === 'stats'
                  ? 'bg-[#FAF8F5] dark:bg-slate-900 text-[#E05318] shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Statistics</span>
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              type="button"
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                activeTab === 'inspector'
                  ? 'bg-[#FAF8F5] dark:bg-slate-900 text-[#E05318] shadow-xs'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
          </div>
        </div>

        {/* Right Side: Graph Action Controls (Pan, Zoom, Reset, Export) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {activeTab === 'plot' && (
            <>
              {/* Pan Tool */}
              <button
                onClick={handlePanTool}
                type="button"
                className={`p-1.5 sm:p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  interactionMode === 'pan'
                    ? 'bg-[#E05318] text-white border-[#E05318] shadow-xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-700 hover:bg-[#EFEAE1] dark:hover:bg-slate-700'
                }`}
                title="Pan View (Drag chart left/right)"
              >
                <Move className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Tool */}
              <button
                onClick={handleZoomTool}
                type="button"
                className={`p-1.5 sm:p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  interactionMode === 'zoom'
                    ? 'bg-[#E05318] text-white border-[#E05318] shadow-xs'
                    : 'bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 border-[#E6E1D6] dark:border-slate-700 hover:bg-[#EFEAE1] dark:hover:bg-slate-700'
                }`}
                title="Zoom Tool (Box select to zoom)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Reset Scale */}
              <button
                onClick={handleResetScale}
                type="button"
                className="p-1.5 sm:p-2 rounded-xl border border-[#E6E1D6] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Reset Scale to Data Extents"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="h-5 w-px bg-[#E6E1D6] dark:border-slate-700 mx-1 hidden sm:block" />

              {/* Export PNG */}
              <button
                onClick={handleExportPng}
                type="button"
                className="p-1.5 sm:p-2 rounded-xl border border-[#E6E1D6] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Export Chart as PNG Image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCsv}
                type="button"
                className="p-1.5 sm:p-2 rounded-xl border border-[#E6E1D6] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Export Data Points as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Mobile view switcher */}
          <div className="flex md:hidden items-center ml-1">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-[#FAF8F5] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-xs font-semibold py-1.5 px-2 rounded-xl focus:outline-none"
            >
              <option value="plot">Plot</option>
              <option value="map">Trajectory</option>
              <option value="stats">Stats</option>
              <option value="inspector">Inspector</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Graph Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col p-2 sm:p-3">
        {activeTab === 'plot' && (
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
        )}

        {activeTab === 'map' && (
          <TrajectoryMap files={files} selectedFileId={selectedFileId} />
        )}

        {activeTab === 'stats' && (
          <StatsPanel files={files} selectedFileId={selectedFileId} />
        )}

        {activeTab === 'inspector' && (
          <SentenceInspector files={files} selectedFileId={selectedFileId} />
        )}
      </div>
    </div>
  );
};
