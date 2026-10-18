import React, { useState, useMemo } from 'react';
import { ParsedLogFile } from '../../types/nmea';
import { Search, Filter, CheckCircle2, XCircle, Download } from 'lucide-react';

interface SentenceInspectorProps {
  files: ParsedLogFile[];
  selectedFileId: string;
}

export const SentenceInspector: React.FC<SentenceInspectorProps> = ({ files, selectedFileId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const targetFile = useMemo(() => {
    if (selectedFileId === 'Combined') return files[0];
    return files.find((f) => f.id === selectedFileId) || files[0];
  }, [files, selectedFileId]);

  const availableTypes = useMemo(() => {
    if (!targetFile) return [];
    return Object.keys(targetFile.sentenceCounts || {});
  }, [targetFile]);

  const filteredSentences = useMemo(() => {
    if (!targetFile) return [];
    return targetFile.rawSentences.filter((s) => {
      if (selectedType !== 'ALL' && s.type !== selectedType) return false;
      if (searchTerm && !s.raw.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [targetFile, selectedType, searchTerm]);

  const totalPages = Math.ceil(filteredSentences.length / pageSize) || 1;
  const pagedSentences = filteredSentences.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportRawTxt = () => {
    if (!targetFile) return;
    const text = targetFile.rawSentences.map((s) => s.raw).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetFile.filename}_raw.nmea`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!targetFile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[#736E65]">
        No sentences available to inspect.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl shadow-xs select-none transition-colors">
      {/* Top Filter and Search Bar */}
      <div className="p-3 sm:p-4 border-b border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-slate-900 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Sentence type filter dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-[#FAF8F5] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-[#24211D] dark:text-slate-100 text-xs font-mono font-semibold pl-3 pr-7 py-1.5 rounded-xl focus:outline-none focus:border-[#E05318]"
            >
              <option value="ALL">All Types ({targetFile.rawSentences.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({targetFile.sentenceCounts[t]})
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#736E65] absolute left-3 top-2" />
            <input
              type="text"
              placeholder="Search sentence content..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-[#24211D] dark:text-slate-100 placeholder-[#736E65] focus:outline-none focus:border-[#E05318] w-48 sm:w-64"
            />
          </div>
        </div>

        {/* Export Raw File */}
        <div className="flex items-center space-x-2">
          <button
            onClick={exportRawTxt}
            type="button"
            className="px-3 py-1.5 rounded-xl border border-[#E6E1D6] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 text-[#736E65] dark:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Raw</span>
          </button>
        </div>
      </div>

      {/* Raw Sentence Table */}
      <div className="flex-1 overflow-auto text-xs font-mono select-text">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#EFEAE1]/80 dark:bg-slate-800 text-[#736E65] dark:text-slate-400 border-b border-[#E6E1D6] dark:border-slate-700 text-[11px] select-none">
            <tr>
              <th className="py-2 px-3 w-14 text-center">#</th>
              <th className="py-2 px-3 w-20">Type</th>
              <th className="py-2 px-3 w-28">Timestamp</th>
              <th className="py-2 px-3 w-16 text-center">Valid</th>
              <th className="py-2 px-3">Payload String</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E1D6] dark:divide-slate-800/80 text-[11px]">
            {pagedSentences.map((s, idx) => (
              <tr
                key={idx}
                className="hover:bg-[#FAF8F5]/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-1.5 px-3 text-center text-[#736E65] select-none">
                  {(currentPage - 1) * pageSize + idx + 1}
                </td>
                <td className="py-1.5 px-3 font-bold text-[#E05318]">
                  {s.type}
                </td>
                <td className="py-1.5 px-3 text-[#736E65] dark:text-slate-400 tabular-nums">
                  {s.timeStr}
                </td>
                <td className="py-1.5 px-3 text-center">
                  {s.validChecksum ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 inline" />
                  )}
                </td>
                <td className="py-1.5 px-3 text-[#24211D] dark:text-slate-200 break-all">
                  {s.raw}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between text-xs bg-[#FAF8F5] dark:bg-slate-900 shrink-0 select-none">
        <span className="text-[#736E65] dark:text-slate-400">
          Showing {filteredSentences.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, filteredSentences.length)} of {filteredSentences.length} sentences
        </span>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            type="button"
            className="px-2.5 py-1 rounded-lg border border-[#E6E1D6] dark:border-slate-700 text-[#736E65] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Prev
          </button>
          <span className="px-2 font-mono text-[11px] text-[#24211D] dark:text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            type="button"
            className="px-2.5 py-1 rounded-lg border border-[#E6E1D6] dark:border-slate-700 text-[#736E65] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
