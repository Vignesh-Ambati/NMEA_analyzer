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
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <BookOpen className="w-4 h-4" />
            <span>NMEA-0183 Educational Reference Guide</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-1">
            GNSS Sentence & Protocol Guide
          </h2>
          <p className="text-xs sm:text-sm text-[#736E65] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Understand how GNSS receivers output coordinate positioning, constellation tracking, and accuracy metrics. Click any sentence below to view its complete protocol specifications in a floatable popup.
          </p>
        </div>

        <button
          onClick={navigateToFilePage}
          type="button"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer flex items-center space-x-2 shrink-0 self-start md:self-center"
        >
          <span>Analyze a Log File</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#736E65] absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search sentences (e.g. GGA, RMC, DOP, GSV, VTG)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 text-[#24211D] dark:text-slate-100 placeholder-[#736E65]/70 focus:outline-none focus:border-[#E05318] shadow-xs"
        />
      </div>

      {/* Grid of Sentence Cards with Info trigger */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredGuide.map((item) => (
          <div
            key={item.sentence}
            onClick={() => setPopupItem(item)}
            className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-[#E05318] bg-orange-100/70 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                  {item.sentence}
                </span>
                <span className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono">
                  {item.fields.length} fields
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug">
                {item.name}
              </h3>
              <p className="text-xs text-[#736E65] dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-[#736E65] dark:text-slate-400 font-mono truncate max-w-[140px]">
                {item.talkers}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupItem(item);
                }}
                className="font-semibold text-[#E05318] flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
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
            className="bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between shrink-0 bg-[#FAF8F5] dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-base font-bold text-[#E05318] bg-orange-100/70 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg">
                  {popupItem.sentence}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#24211D] dark:text-slate-100 leading-tight">
                    {popupItem.name}
                  </h3>
                  <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-medium">
                    NMEA-0183 Protocol Specification
                  </div>
                </div>
              </div>

              {/* Close Button X at right corner */}
              <button
                onClick={() => setPopupItem(null)}
                type="button"
                className="p-1.5 rounded-lg text-[#736E65] hover:text-[#24211D] dark:hover:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#736E65] font-mono mb-1">
                  Description
                </h4>
                <p className="text-xs sm:text-sm text-[#24211D] dark:text-slate-300 leading-relaxed">
                  {popupItem.description}
                </p>
              </div>

              {/* Example Sentence Box with 1-click Copy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#736E65] font-mono">
                    Sample Sentence Output
                  </h4>
                  <button
                    onClick={() => handleCopyExample(popupItem.example)}
                    type="button"
                    className="text-[11px] text-[#E05318] hover:text-[#C94713] font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedExample ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Sample</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-[#F5F2EB]/90 dark:bg-slate-950 font-mono text-[11px] text-[#24211D] dark:text-slate-200 border border-[#E6E1D6] dark:border-slate-800 overflow-x-auto select-all">
                  {popupItem.example}
                </div>
              </div>

              {/* Supported Talkers */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#736E65] font-mono mb-1">
                  Supported GNSS Talkers
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {popupItem.talkers.split(', ').map((talker) => (
                    <span
                      key={talker}
                      className="px-2 py-0.5 rounded-md bg-[#ECE5D8]/80 dark:bg-slate-800 text-[11px] font-mono text-[#24211D] dark:text-slate-300 border border-[#E6E1D6] dark:border-slate-700"
                    >
                      {talker}
                    </span>
                  ))}
                </div>
              </div>

              {/* Field Specifications Table */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#736E65] font-mono mb-2 flex items-center space-x-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#E05318]" />
                  <span>Payload Field Definitions ({popupItem.fields.length} Fields)</span>
                </h4>
                <div className="border border-[#E6E1D6] dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#EFEAE1]/70 dark:bg-slate-800/80 text-[11px] font-mono uppercase tracking-wider text-[#736E65] border-b border-[#E6E1D6] dark:border-slate-700">
                        <th className="py-2 px-3 w-12 text-center">#</th>
                        <th className="py-2 px-3">Field Name</th>
                        <th className="py-2 px-3">Example</th>
                        <th className="py-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E1D6] dark:divide-slate-800 text-[11px]">
                      {popupItem.fields.map((f, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5]/60 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold text-center text-[#736E65]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#24211D] dark:text-slate-200">
                            {f.name}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#E05318] text-[10px]">
                            {f.example}
                          </td>
                          <td className="py-2 px-3 text-[#736E65] dark:text-slate-300">
                            {f.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E6E1D6] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setPopupItem(null)}
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EFEAE1] dark:bg-slate-800 hover:bg-[#ECE5D8] text-[#24211D] dark:text-slate-200 transition-colors cursor-pointer border border-[#E6E1D6] dark:border-slate-700"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
