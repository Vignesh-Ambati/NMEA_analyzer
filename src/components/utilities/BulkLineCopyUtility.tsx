import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  FolderSearch, 
  Settings2, 
  Activity, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  FileCode2
} from 'lucide-react';

export const BulkLineCopyUtility: React.FC = () => {
  const { addLog } = useApp();

  // Configuration State
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [expression, setExpression] = useState('');
  const [searchMode, setSearchMode] = useState('normal');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);

  // Telemetry & Execution State
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [linesExtracted, setLinesExtracted] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden File Inputs for UI simulation
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setInputPath(file.name);
      
      // UX Trick: Auto-fill Output Path
      if (!outputPath) {
        const extIndex = file.name.lastIndexOf('.');
        const newPath = extIndex > -1 
            ? file.name.substring(0, extIndex) + '_extracted' + file.name.substring(extIndex)
            : file.name + '_extracted.log';
        setOutputPath(newPath);
      }
    }
  };

  // Simulates the backend extraction progress visually
  const startExtraction = () => {
    if (!inputPath || !outputPath || !expression) {
      setErrorMessage("Please provide input file, output destination, and a target expression.");
      setStatus('error');
      return;
    }

    setErrorMessage(null);
    setStatus('processing');
    setProgress(0);
    setLinesExtracted(0);
    addLog(`Initializing extraction engine for target: ${expression}`, 'info');

    // Fake progress simulation
    let currentProg = 0;
    let currentLines = 0;
    const interval = setInterval(() => {
      currentProg += Math.floor(Math.random() * 15) + 5;
      currentLines += Math.floor(Math.random() * 5000);
      
      if (currentProg >= 100) {
        currentProg = 100;
        clearInterval(interval);
        setStatus('complete');
        addLog(`Extraction complete. ${currentLines.toLocaleString()} lines written.`, 'success');
      }
      
      setProgress(Math.min(currentProg, 100));
      setLinesExtracted(currentLines);
    }, 400);
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E1D6] dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-[#E05318]" />
            <h3 className="text-lg font-bold text-[#24211D] dark:text-slate-100">
              Data Extractor Pro
            </h3>
          </div>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1">
            High-Performance Regex Engine (O(1) Memory Footprint)
          </p>
        </div>
      </div>

      {/* Main Grid Layout: Configuration (Left) & Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL 1: Backend Configuration */}
        <section className="flex flex-col gap-5">
          <h2 className="text-sm font-bold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-2">
            <Settings2 className="w-4 h-4" />
            <span>1. Engine Configuration</span>
          </h2>
          
          <div className="space-y-4 bg-[#F5F2EB]/90 dark:bg-slate-950 p-4 sm:p-5 rounded-xl border border-[#E6E1D6] dark:border-slate-800">
            {/* Source File */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Source File
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputPath}
                  onChange={(e) => setInputPath(e.target.value)}
                  placeholder="C:\logs\massive_file.log" 
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                <input type="file" ref={fileInputRef} onChange={handleBrowseInput} className="hidden" />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#E05318] rounded-lg border border-[#E6E1D6] dark:border-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>Browse</span>
                </button>
              </div>
            </div>
            
            {/* Output Destination */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Output Destination
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="C:\logs\extracted.log" 
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#E05318] rounded-lg border border-[#E6E1D6] dark:border-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>Browse</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Expression Setup */}
          <div className="space-y-4 bg-[#F5F2EB]/90 dark:bg-slate-950 p-4 sm:p-5 rounded-xl border border-[#E6E1D6] dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Target Expression
              </label>
              <input 
                type="text" 
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g., ^ERROR|FATAL" 
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 text-[#736E65] dark:text-slate-400 uppercase">
                  Search Mode
                </label>
                <select 
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                >
                  <option value="normal">Normal (Exact Literal)</option>
                  <option value="extended">Extended (\n, \t)</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>
              <div className="flex flex-col justify-center gap-2 mt-2 sm:mt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#24211D] dark:text-slate-200">
                  <input 
                    type="checkbox" 
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#E05318] rounded" 
                  /> 
                  Match Case
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#24211D] dark:text-slate-200">
                  <input 
                    type="checkbox" 
                    checked={matchWholeWord}
                    onChange={(e) => setMatchWholeWord(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#E05318] rounded" 
                  /> 
                  Match Whole Word
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: Execution & Telemetry */}
        <section className="flex flex-col gap-5">
          <h2 className="text-sm font-bold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>2. Execution & Telemetry</span>
          </h2>
          
          {/* Main Action Button */}
          <button 
            onClick={startExtraction}
            disabled={status === 'processing'}
            className={`w-full py-4 rounded-xl shadow-md transition-all text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${
              status === 'processing'
                ? 'bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-500 cursor-not-allowed border border-[#E6E1D6] dark:border-slate-700'
                : 'bg-[#E05318] hover:bg-[#C94713] text-white cursor-pointer active:scale-[0.98]'
            }`}
          >
            {status === 'processing' ? (
              <>
                <Activity className="w-5 h-5 animate-pulse" />
                Processing Data...
              </>
            ) : status === 'complete' ? (
              <>
                <Play className="w-5 h-5" />
                Run Another Extraction
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Initialize Extraction Engine
              </>
            )}
          </button>

          {/* HUD Status Box */}
          <div className={`mt-2 bg-[#F5F2EB]/90 dark:bg-slate-950 rounded-xl border border-[#E6E1D6] dark:border-slate-800 p-5 sm:p-6 flex flex-col gap-6 transition-opacity duration-300 ${status === 'idle' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Progress Header */}
            <div className="flex justify-between items-end">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${
                status === 'complete' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#736E65] dark:text-slate-400'
              }`}>
                {status === 'idle' ? 'Awaiting Command...' : status === 'processing' ? 'Extracting...' : 'Complete'}
              </span>
              <span className="text-3xl font-black text-[#E05318] font-mono leading-none">
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#E6E1D6] dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-[#FF7A45] to-[#E05318] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-[#FAF8F5] dark:bg-slate-900 p-4 rounded-xl border border-[#E6E1D6] dark:border-slate-800 text-center shadow-xs">
                <p className="text-[10px] text-[#736E65] dark:text-slate-400 font-bold uppercase mb-1">Lines Extracted</p>
                <p className="text-2xl font-mono font-bold text-[#24211D] dark:text-slate-100">
                  {linesExtracted.toLocaleString()}
                </p>
              </div>
              <div className="bg-[#FAF8F5] dark:bg-slate-900 p-4 rounded-xl border border-[#E6E1D6] dark:border-slate-800 text-center shadow-xs flex flex-col items-center justify-center">
                <p className="text-[10px] text-[#736E65] dark:text-slate-400 font-bold uppercase mb-1">Engine Status</p>
                {status === 'complete' ? (
                  <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold font-mono">STANDBY</span>
                  </div>
                ) : status === 'processing' ? (
                  <div className="flex items-center space-x-1.5 text-[#E05318]">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-bold font-mono">ACTIVE</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold font-mono text-[#736E65] dark:text-slate-500">IDLE</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Error Box */}
          {status === 'error' && errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

        </section>
      </div>
    </div>
  );
};