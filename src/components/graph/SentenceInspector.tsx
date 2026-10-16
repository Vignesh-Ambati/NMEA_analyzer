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
    return <div className="p-8 text-center text-slate-400">No file loaded.</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAFBFD] dark:bg-slate-900 rounded-2xl overflow-hidden select-none transition-colors">
      {/* Search & Filter Header Bar */}
      <div className="h-12 px-4 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search sentence string..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1 bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#E05318] w-40 sm:w-56"
            />
          </div>

          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Sentences ({targetFile.totalSentences})</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type} ({targetFile.sentenceCounts[type]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportRawTxt}
            className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 hover:border-[#E05318] bg-[#FAFBFD] dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors"
            title="Download complete raw NMEA text"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Text</span>
          </button>
        </div>
      </div>

      {/* Sentence Table with Horizontal Overflow handling */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 z-10">
            <tr>
              <th className="py-2 px-3 w-12 font-semibold">#</th>
              <th className="py-2 px-3 w-20 font-semibold">Talker</th>
              <th className="py-2 px-3 w-20 font-semibold">Type</th>
              <th className="py-2 px-3 w-24 font-semibold">Time</th>
              <th className="py-2 px-3 w-20 font-semibold text-center">Checksum</th>
              <th className="py-2 px-3 font-semibold">Raw NMEA Sentence String</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80">
            {pagedSentences.map((s, idx) => {
              const lineNum = (currentPage - 1) * pageSize + idx + 1;
              return (
                <tr
                  key={idx}
                  className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors select-text"
                >
                  <td className="py-1.5 px-3 text-slate-400 tabular-nums">
                    {lineNum}
                  </td>
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    {s.talker}
                  </td>
                  <td className="py-1.5 px-3 text-[#E05318] font-bold">
                    {s.type}
                  </td>
                  <td className="py-1.5 px-3 text-slate-500 tabular-nums">
                    {s.timeStr}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    {s.validChecksum ? (
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-500">
                        <XCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200 break-all select-all">
                    {s.raw}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSentences.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No NMEA sentences match current query criteria.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="h-10 px-4 bg-slate-100/60 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
        <span className="text-slate-500">
          Showing {(currentPage - 1) * pageSize + 1}-
          {Math.min(currentPage * pageSize, filteredSentences.length)} of {filteredSentences.length}
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Prev
          </button>
          <span className="text-slate-500 tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
