import React, { useState } from 'react';
import { FileText, Copy, Check, RotateCcw, AlertCircle, CheckCircle2, Info, Download } from 'lucide-react';

interface ExtractedResult {
  lines: string[];
  totalInputLines: number;
  matchedCount: number;
  filterApplied: string;
  rangeApplied: string;
}

export const BulkLineCopyUtility: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [regexQuery, setRegexQuery] = useState('');
  const [startLine, setStartLine] = useState('');
  const [endLine, setEndLine] = useState('');
  const [stripChecksum, setStripChecksum] = useState(false);
  const [removeEmptyLines, setRemoveEmptyLines] = useState(true);
  const [result, setResult] = useState<ExtractedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExtract = () => {
    setError(null);
    if (!inputText.trim()) {
      setError('Please paste raw multiline NMEA log lines to extract.');
      setResult(null);
      return;
    }

    let allLines = inputText.split(/\r?\n/);
    const totalInput = allLines.length;

    if (removeEmptyLines) {
      allLines = allLines.filter((l) => l.trim().length > 0);
    }

    // Line range slicing
    const s = parseInt(startLine, 10);
    const e = parseInt(endLine, 10);
    const startIdx = !isNaN(s) && s > 0 ? s - 1 : 0;
    const endIdx = !isNaN(e) && e >= (s || 1) ? e : allLines.length;
    let sliced = allLines.slice(startIdx, endIdx);

    // Filter by Talker / Sentence name
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toUpperCase();
      sliced = sliced.filter((line) => line.toUpperCase().includes(q));
    }

    // Regex pattern
    if (regexQuery.trim()) {
      try {
        const re = new RegExp(regexQuery.trim());
        sliced = sliced.filter((line) => re.test(line));
      } catch (err: any) {
        setError(`Invalid Regular Expression: ${err.message}`);
        return;
      }
    }

    // Strip Checksum (*XX)
    if (stripChecksum) {
      sliced = sliced.map((line) => line.replace(/\*[0-9A-Fa-f]{2}$/, ''));
    }

    setResult({
      lines: sliced,
      totalInputLines: totalInput,
      matchedCount: sliced.length,
      filterApplied: filterQuery.trim() || regexQuery.trim() || 'All Sentences',
      rangeApplied: `Lines ${startIdx + 1} - ${Math.min(endIdx, totalInput)}`,
    });
  };

  const handleReset = () => {
    setInputText('');
    setFilterQuery('');
    setRegexQuery('');
    setStartLine('');
    setEndLine('');
    setStripChecksum(false);
    setRemoveEmptyLines(true);
    setResult(null);
    setError(null);
  };

  const handleCopy = () => {
    if (!result || result.lines.length === 0) return;
    navigator.clipboard.writeText(result.lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result || result.lines.length === 0) return;
    const blob = new Blob([result.lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_nmea_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#E05318]" />
            <h3 className="text-base font-bold text-[#24211D] dark:text-slate-100">
              Data Extractor Pro
            </h3>
            {/* Modern Info button with hover popover */}
            <div className="relative group inline-flex items-center">
              <button
                type="button"
                className="w-5 h-5 rounded-md text-[#736E65] dark:text-slate-400 hover:text-[#E05318] hover:bg-[#EFEAE1] dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Data Extractor Pro Information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {/* Hover Info Tooltip */}
              <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 shadow-xl text-xs text-[#24211D] dark:text-slate-200 pointer-events-none">
                <div className="font-semibold text-[#E05318] mb-1">Data Extractor Pro</div>
                <p className="text-[11px] text-[#736E65] dark:text-slate-300 leading-relaxed">
                  High-performance regex and line slicer. Batch filter sentences by talker or regex expression, slice line ranges, strip trailing checksums, and export extracted data.
                </p>
              </div>
            </div>
          </div>
          {/* Exactly 1-line tag below Utility Name */}
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1 truncate">
            Extract, filter, slice line ranges, and export GNSS sentences with high-performance regex.
          </p>
        </div>
        {/* Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] hover:bg-[#E5DFD4] dark:hover:bg-slate-700/80 border border-[#E6E1D6] dark:border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Raw Multiline Text Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
          Raw Multiline NMEA Text or File Content
        </label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste multiline NMEA log text here (e.g. $GNGGA, $GNRMC, $GPGSV)..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318] resize-y"
        />
      </div>

      {/* Slicing & Filter Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            Sentence Filter (e.g. GGA)
          </label>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="GGA"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            Regex Pattern (Optional)
          </label>
          <input
            type="text"
            value={regexQuery}
            onChange={(e) => setRegexQuery(e.target.value)}
            placeholder="^\$GN(GGA|RMC)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            Start Line
          </label>
          <input
            type="text"
            value={startLine}
            onChange={(e) => setStartLine(e.target.value)}
            placeholder="1"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24211D] dark:text-slate-200 block">
            End Line
          </label>
          <input
            type="text"
            value={endLine}
            onChange={(e) => setEndLine(e.target.value)}
            placeholder="1000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-sm text-[#24211D] dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
          />
        </div>
      </div>

      {/* Slicing Options */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-[#24211D] dark:text-slate-300">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stripChecksum}
            onChange={(e) => setStripChecksum(e.target.checked)}
            className="w-4 h-4 rounded text-[#E05318] accent-[#E05318]"
          />
          <span>Strip Checksums (*XX)</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={removeEmptyLines}
            onChange={(e) => setRemoveEmptyLines(e.target.checked)}
            className="w-4 h-4 rounded text-[#E05318] accent-[#E05318]"
          />
          <span>Remove Empty Lines</span>
        </label>
      </div>

      {/* Extract Button */}
      <div className="flex items-center space-x-3 pt-1">
        <button
          type="button"
          onClick={handleExtract}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Extract Data</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-[#F5F2EB]/90 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Extracted Results</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-[#E05318] hover:underline font-mono flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Lines'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="text-xs text-[#E05318] hover:underline font-mono flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .log</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Matched Sentences
              </div>
              <div className="text-xl font-bold font-mono text-[#E05318] mt-1">
                {result.matchedCount}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                From {result.totalInputLines} total input lines
              </div>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Applied Filter
              </div>
              <div className="text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1 truncate">
                {result.filterApplied}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                {result.rangeApplied}
              </div>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-3.5 rounded-xl">
              <div className="text-[10px] text-[#736E65] dark:text-slate-400 uppercase font-mono">
                Checksum Status
              </div>
              <div className="text-base font-bold font-mono text-[#24211D] dark:text-slate-100 mt-1">
                {stripChecksum ? 'Checksums Stripped' : 'Preserved (*XX)'}
              </div>
              <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5">
                {removeEmptyLines ? 'Empty lines removed' : 'All lines kept'}
              </div>
            </div>
          </div>

          {/* Extracted Output Textarea */}
          <div className="space-y-1.5 pt-1">
            <textarea
              readOnly
              rows={8}
              value={result.lines.join('\n')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 font-mono text-xs text-[#24211D] dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
