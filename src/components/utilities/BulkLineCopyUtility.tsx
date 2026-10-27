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
    addLog('Bulk extractor file browser opened', 'info', 'system');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileObject(file);
      setInputPath(file.name);
      addLog(`Bulk extractor input file selected: ${file.name}`, 'info', 'system');
      
      // Auto-fill Output Path
      if (!outputPath) {
        const extIndex = file.name.lastIndexOf('.');
        const newPath = extIndex > -1 
            ? file.name.substring(0, extIndex) + '_extracted' + file.name.substring(extIndex)
            : file.name + '_extracted.log';
        setOutputPath(newPath);
        addLog(`Bulk extractor output filename auto-filled to ${newPath}`, 'debug', 'system');
      }
    }
  };

  const startExtraction = async () => {
    addLog('Bulk extraction workflow started', 'info', 'system');
    if (!inputPath || !outputPath || !expression) {
      const message = 'Please provide source file, output destination, and a target expression.';
      setErrorMessage(message);
      setStatus('error');
      addLog(`Bulk extractor validation failed: ${message}`, 'warn', 'system');
      return;
    }

    setErrorMessage(null);
    setStatus('processing');
    setProgress(15);
    setExtractedContent('');

    try {
      if (!fileObject) {
        throw new Error('Please choose a source file before extracting.');
      }

      setProgress(40);
      addLog(`Bulk extractor reading source file ${fileObject.name}`, 'debug', 'system');
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
      addLog(`Data Extractor Pro: ${matchedLines.length} lines extracted from ${fileObject.name}.`, 'success', 'system');
    } catch (error: any) {
      setStatus('error');
      const msg = error.message || 'Extraction failed';
      setErrorMessage(msg);
      addLog(`Data Extractor Pro error: ${msg}`, 'error', 'system');
    }
  };

  const handleDownload = () => {
    addLog('Bulk extractor download action triggered', 'info', 'system');
    if (!extractedContent) return;
    const blob = new Blob([extractedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputPath || 'extracted_lines.log';
    link.click();
    URL.revokeObjectURL(url);
    addLog(`Downloaded extracted file: ${outputPath || 'extracted_lines.log'}`, 'info', 'system');
  };

  const handleCopy = () => {
    addLog('Bulk extractor copy action triggered', 'info', 'system');
    if (!extractedContent) return;
    navigator.clipboard.writeText(extractedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog('Bulk extractor content copied to clipboard', 'success', 'system');
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
            Local line extraction and data cleanup utility
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
                  onChange={(e) => {
                    addLog(`Bulk extractor input path changed to ${e.target.value}`, 'debug', 'system');
                    setInputPath(e.target.value);
                  }}
                  placeholder="example.log" 
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
                />
                <button 
                  type="button" 
                  onClick={() => {
                    addLog('Bulk extractor browse button clicked', 'info', 'system');
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-mono font-semibold bg-[#E05318] hover:bg-[#C94713] text-white transition-colors cursor-pointer"
                >
                  Browse
                </button>
                <input type="file" ref={fileInputRef} onChange={handleBrowseInput} className="hidden" />
              </div>
            </div>
            
            {/* Output Destination */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Output File
              </label>
              <input 
                type="text" 
                value={outputPath}
                onChange={(e) => {
                  addLog(`Bulk extractor output path changed to ${e.target.value}`, 'debug', 'system');
                  setOutputPath(e.target.value);
                }}
                placeholder="filtered_output.log" 
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
              />
            </div>

            {/* Search Expression Setup */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[#24211D] dark:text-slate-200">
                Search Expression
              </label>
              <input 
                type="text" 
                value={expression}
                onChange={(e) => {
                  addLog(`Bulk extractor expression updated: ${e.target.value}`, 'debug', 'system');
                  setExpression(e.target.value);
                }}
                placeholder="e.g. GGA|VTG|RMC" 
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
              />
            </div>

            {/* Options: Match Case, Whole Word, Search Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox" 
                  checked={matchCase}
                  onChange={(e) => {
                    addLog(`Bulk extractor matchCase toggled to ${e.target.checked}`, 'debug', 'system');
                    setMatchCase(e.target.checked);
                  }}
                  className="w-4 h-4 accent-[#E05318] rounded" 
                /> 
                <span>Match Case</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox" 
                  checked={matchWholeWord}
                  onChange={(e) => {
                    addLog(`Bulk extractor matchWholeWord toggled to ${e.target.checked}`, 'debug', 'system');
                    setMatchWholeWord(e.target.checked);
                  }}
                  className="w-4 h-4 accent-[#E05318] rounded" 
                /> 
                <span>Whole Word</span>
              </label>
              <div>
                <select
                  value={searchMode}
                  onChange={(e) => {
                    const value = e.target.value as 'normal' | 'extended' | 'regex';
                    addLog(`Bulk extractor search mode changed to ${value}`, 'debug', 'system');
                    setSearchMode(value);
                  }}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E05318]"
                >
                  <option value="normal">Normal</option>
                  <option value="extended">Extended</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: Execution & Telemetry */}
        <section className="flex flex-col gap-5">
          <h2 className="text-sm font-bold text-[#736E65] dark:text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>2. Execution Telemetry</span>
          </h2>

          <div className="space-y-4 bg-[#F5F2EB]/90 dark:bg-slate-950 p-4 sm:p-5 rounded-xl border border-[#E6E1D6] dark:border-slate-800">
            {/* Status & Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                <Play className="w-4 h-4 text-[#E05318]" />
                <span>{status.toUpperCase()}</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{progress}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#E05318] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Lines</div>
                <div className="text-lg font-bold text-[#24211D] dark:text-slate-100">
                  {linesExtracted}
                </div>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500 dark:text-slate-400">Mode</div>
                <div className="text-lg font-bold text-[#24211D] dark:text-slate-100">
                  {searchMode}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startExtraction}
                className="flex-1 px-4 py-2 text-xs font-bold uppercase rounded-lg bg-[#E05318] hover:bg-[#C94713] text-white transition-colors cursor-pointer"
              >
                Run Extractor
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!extractedContent}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-4 h-4 inline" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!extractedContent}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 inline" /> : <Copy className="w-4 h-4 inline" />}
              </button>
            </div>

            {/* Status Messages */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {status === 'complete' && extractedContent && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Extraction complete.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Extracted Content Preview */}
      {extractedContent && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 text-xs font-mono text-slate-300 border-b border-slate-800">
            Extracted Output
          </div>
          <pre className="p-3 text-[11px] text-slate-200 whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {extractedContent}
          </pre>
        </div>
      )}
    </div>
  );
};