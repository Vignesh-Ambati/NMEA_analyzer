import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NMEA_REFERENCE_GUIDE, NmeaDocItem } from '../../services/nmeaReference';
import {
  BookOpen,
  Search,
  ArrowRight,
  Info,
  X,
  Copy,
  Check,
  Code2
} from 'lucide-react';

export const ReferencePage: React.FC = () => {
  const { navigateToFilePage } = useApp();
  const [search, setSearch] = useState('');
  // Floatable data popup state
  const [popupItem, setPopupItem] = useState<NmeaDocItem | null>(null);
  const [copiedExample, setCopiedExample] = useState(false);

  // Close floatable modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopupItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyExample = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const filteredGuide = NMEA_REFERENCE_GUIDE.filter(
    (item) =>
      item.sentence.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full select-none">
      {/* Educational Header Card */}
      <div className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <BookOpen className="w-4 h-4" />
            <span>NMEA-0183 Educational Reference Guide</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            GNSS Sentence & Protocol Guide
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Understand how GNSS receivers output coordinate positioning, constellation tracking, and accuracy metrics. Click any sentence below to view its complete protocol specifications in a floatable popup.
          </p>
        </div>

        <button
          onClick={navigateToFilePage}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2 shrink-0 self-start md:self-center"
        >
          <span>Analyze a Log File</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search sentences (e.g. GGA, RMC, DOP, GSV, VTG)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#E05318] shadow-xs"
        />
      </div>

      {/* Grid of Sentence Cards with Info trigger */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredGuide.map((item) => (
          <div
            key={item.sentence}
            onClick={() => setPopupItem(item)}
            className="bg-[#FAFBFD] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#E05318] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-[#E05318] bg-orange-100/60 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                  {item.sentence}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.fields.length} fields
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug">
                {item.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                {item.talkers}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupItem(item);
                }}
                className="font-semibold text-[#E05318] flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform"
              >
                <Info className="w-3.5 h-3.5" />
                <span>View Info</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floatable Data Popup Modal */}
      {popupItem && (
        <div
          onClick={() => setPopupItem(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in duration-150 select-text"
        >
          {/* Modal Container: clicking anywhere inside will NOT close, clicking outside closes */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAFBFD] dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-[#FAFBFD] dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-base font-bold text-[#E05318] bg-orange-100/60 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg">
                  {popupItem.sentence}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {popupItem.name}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium">
                    NMEA-0183 Protocol Specification
                  </div>
                </div>
              </div>

              {/* Close Button X at right corner */}
              <button
                onClick={() => setPopupItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close (or click outside)"
                aria-label="Close specification popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Description */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Description
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {popupItem.description}
                </p>
              </div>

              {/* Example Sentence Box with 1-click Copy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Sample Sentence Output
                  </h4>
                  <button
                    onClick={() => handleCopyExample(popupItem.example)}
                    className="text-[11px] text-[#E05318] hover:text-[#C94713] font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedExample ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Sample</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <code className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all block leading-relaxed">
                    {popupItem.example}
                  </code>
                </div>
              </div>

              {/* Talker prefixes */}
              <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Compatible Talker Prefixes:
                </span>
                <span className="font-mono font-medium text-[#E05318]">
                  {popupItem.talkers}
                </span>
              </div>

              {/* Parameter Field Breakdown Table */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                  Field Breakdown ({popupItem.fields.length} Parameters)
                </h4>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                        <th className="py-2.5 px-3 font-semibold w-10">#</th>
                        <th className="py-2.5 px-3 font-semibold">Field Name</th>
                        <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Description</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                      {popupItem.fields.map((f: { name: string; desc: string; example: string }, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 font-mono text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{f.name}</div>
                            <div className="text-[10px] text-slate-400 sm:hidden mt-0.5">
                              {f.desc}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell text-[11px]">
                            {f.desc}
                          </td>
                          <td className="py-2 px-3 font-mono text-right text-[#E05318]">
                            <span className="bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                              {f.example}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-100/40 dark:bg-slate-950/40">
              <span className="text-[11px] text-slate-400">
                Click outside or press Escape to close
              </span>
              <button
                onClick={() => setPopupItem(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
