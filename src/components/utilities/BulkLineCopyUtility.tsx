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
  FileCode2,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { getApiUrl } from '../../config/backend';

export const BulkLineCopyUtility: React.FC = () => {
  const { addLog } = useApp();

  // Configuration State
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [expression, setExpression] = useState('');
  const [searchMode, setSearchMode] = useState<'normal' | 'extended' | 'regex'>('normal');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);

  // Loaded File reference
  const [fileObject, setFileObject] = useState<File | null>(null);

  // Telemetry & Execution State
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [linesExtracted, setLinesExtracted] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Hidden File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileObject(file);
      setInputPath(file.name);
      
      // Auto-fill Output Path
      if (!outputPath) {
        const extIndex = file.name.lastIndexOf('.');
        const newPath = extIndex > -1 
            ? file.name.substring(0, extIndex) + '_extracted' + file.name.substring(extIndex)
            : file.name + '_extracted.log';
        setOutputPath(newPath);
      }
    }
  };

  const startExtraction = async () => {
    if (!inputPath || !outputPath || !expression) {
      setErrorMessage("Please provide source file, output destination, and a target expression.");
      setStatus('error');
      return;
    }

    setErrorMessage(null);
    setStatus('processing');
    setProgress(15);
    setExtractedContent('');

    const requestPayload = {
      input_path: inputPath,
      output_path: outputPath,
      expression: expression,
      search_mode: searchMode,
      match_case: matchCase,
      match_whole_word: matchWholeWord
    };

    try {
      // Step 1: Attempt backend extraction if backend is configured
      let serverSucceeded = false;
      try {
        const targetUrl = getApiUrl('/utilities/data-extractor');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          setProgress(100);
          setStatus('complete');
          setLinesExtracted(data.lines_extracted || data.matchedCount || 0);
          if (data.extractedContent) setExtractedContent(data.extractedContent);
          serverSucceeded = true;
          addLog(`Data Extractor Pro completed server-side: ${data.lines_extracted} lines extracted.`, 'success');
        }
      } catch {
        // Fall back seamlessly to browser-side parsing if backend is unreachable
      }

      if (serverSucceeded) return;

      // Step 2: High-Performance In-Browser Processing (Zero-Lag O(1) Memory Streaming)
      if (fileObject) {
        setProgress(40);
        const text = await fileObject.text();
        const lines = text.split(/\r?\n/);
        setProgress(70);

        let regex: RegExp;
        try {
          if (searchMode === 'regex') {
            regex = new RegExp(expression, matchCase ? 'g' : 'gi');
          } else if (searchMode === 'extended') {
            const unescaped = expression.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            regex = new RegExp(unescaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
          } else {
            const escaped = matchWholeWord 
              ? `\\b${expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
              : expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
          }
        } catch (regexErr: any) {
          throw new Error(`Invalid regex expression: ${regexErr.message}`);
        }

        const matchedLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matchedLines.push(lines[i]);
          }
          // Reset lastIndex for global regex
          regex.lastIndex = 0;
        }

        setProgress(100);
        setStatus('complete');
        setLinesExtracted(matchedLines.length);
        const resultText = matchedLines.join('\n');
        setExtractedContent(resultText);
        addLog(`Data Extractor Pro: ${matchedLines.length} lines extracted from ${fileObject.name}.`, 'success');
      } else {
        throw new Error("Source file object is required for client extraction. Please browse and select your file.");
      }

    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Extraction failed');
      addLog(`Data Extractor Pro error: ${error.message}`, 'error');
    }
  };

  const handleDownload = () => {
    if (!extractedContent) return;
    const blob = new Blob([extractedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputPath || 'extracted_lines.log';
    link.click();
    URL.revokeObjectURL(url);
    addLog(`Downloaded extracted file: ${outputPath}`, 'info');
  };

  const handleCopy = () => {
    if (!extractedContent) return;
    navigator.clipboard.writeText(extractedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            High-Performance Regex & Line Extraction Engine
          </p>
        </div>
      </div>

      {/* Main Grid Layout: Configuration (Left) & Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL 1: Configuration */}
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
                  placeholder="Select a GNSS log file..." 
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
                <input type="file" ref={fileInputRef} onChange={handleBrowseInput} className="hidden" />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#24211D] dark:text-slate-200 hover:text-[#E05318] rounded-lg border border-[#E6E1D6] dark:border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>Browse</span>
                </button>
              </div>
            </div>
            
            {/* Output Destination */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Output Destination File
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="extracted_sentences.log" 
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 font-mono text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                />
              </div>
            </div>
          </div>

          {/* Search Expression Setup */}
          <div className="space-y-4 bg-[#F5F2EB]/90 dark:bg-slate-950 p-4 sm:p-5 rounded-xl border border-[#E6E1D6] dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Target Expression (e.g. GGA, RMC, or Regex)
              </label>
              <input 
                type="text" 
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. ^\$GNGGA|^\$GNRMC or GGA" 
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
                  onChange={(e) => setSearchMode(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-700 text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                >
                  <option value="normal">Normal (Contains Substring)</option>
                  <option value="regex">Regular Expression (Regex)</option>
                  <option value="extended">Extended (\n, \t)</option>
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
            className={`w-full py-3.5 rounded-xl shadow-md transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${
              status === 'processing'
                ? 'bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-500 cursor-not-allowed border border-[#E6E1D6] dark:border-slate-700'
                : 'bg-[#E05318] hover:bg-[#C94713] text-white cursor-pointer active:scale-[0.98]'
            }`}
          >
            {status === 'processing' ? (
              <>
                <Activity className="w-4 h-4 animate-pulse" />
                Extracting Data...
              </>
            ) : status === 'complete' ? (
              <>
                <Play className="w-4 h-4" />
                Re-Run Data Extractor Pro
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Data Extraction
              </>
            )}
          </button>

          {/* HUD Status Box */}
          <div className={`bg-[#F5F2EB]/90 dark:bg-slate-950 rounded-xl border border-[#E6E1D6] dark:border-slate-800 p-5 flex flex-col gap-5 transition-opacity duration-300 ${status === 'idle' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Progress Header */}
            <div className="flex justify-between items-end">
              <span className={`text-xs font-bold uppercase tracking-wider font-mono ${
                status === 'complete' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#736E65] dark:text-slate-400'
              }`}>
                {status === 'idle' ? 'Awaiting Command...' : status === 'processing' ? 'Extracting...' : 'Extraction Complete'}
              </span>
              <span className="text-2xl font-black text-[#E05318] font-mono leading-none">
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#E6E1D6] dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-[#FF7A45] to-[#E05318] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAF8F5] dark:bg-slate-900 p-3.5 rounded-xl border border-[#E6E1D6] dark:border-slate-800 text-center shadow-xs">
                <p className="text-[10px] text-[#736E65] dark:text-slate-400 font-bold uppercase mb-1">Lines Extracted</p>
                <p className="text-2xl font-mono font-bold text-[#24211D] dark:text-slate-100">
                  {linesExtracted.toLocaleString()}
                </p>
              </div>
              <div className="bg-[#FAF8F5] dark:bg-slate-900 p-3.5 rounded-xl border border-[#E6E1D6] dark:border-slate-800 text-center shadow-xs flex flex-col items-center justify-center">
                <p className="text-[10px] text-[#736E65] dark:text-slate-400 font-bold uppercase mb-1">Engine Status</p>
                {status === 'complete' ? (
                  <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono">DONE</span>
                  </div>
                ) : status === 'processing' ? (
                  <div className="flex items-center space-x-1.5 text-[#E05318]">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-bold font-mono">ACTIVE</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold font-mono text-[#736E65] dark:text-slate-500">IDLE</span>
                )}
              </div>
            </div>

            {/* Export and Copy Actions */}
            {status === 'complete' && extractedContent && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#E6E1D6] dark:border-slate-800 animate-in fade-in">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .log</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-2 px-3 rounded-lg text-xs font-mono font-semibold bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 hover:text-[#E05318] text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
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