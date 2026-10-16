import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Loader2 } from 'lucide-react';

export const ProgressIndicator: React.FC = () => {
  const { progressBarVisible, activeJobs, isProcessing, processingProgress, processingStatus, isFullpage } = useApp();
  const [jobIndex, setJobIndex] = useState(0);

  useEffect(() => {
    if (activeJobs.length <= 1) return;
    const interval = setInterval(() => {
      setJobIndex((prev) => (prev + 1) % activeJobs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJobs.length]);

  // If not processing and no active jobs, keep UI clean and hidden
  if (!progressBarVisible || isFullpage || (!isProcessing && activeJobs.length === 0)) return null;

  const currentJob = activeJobs.length > 0 ? activeJobs[jobIndex % activeJobs.length] : null;
  const displayPct = currentJob ? currentJob.pct : isProcessing ? processingProgress : 100;
  const displayText = currentJob
    ? `Parsing ${currentJob.filename} · ${currentJob.pct}%`
    : `${processingStatus} · ${processingProgress}%`;

  return (
    <div className="h-10 bg-[#FAFBFD] dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 text-xs transition-colors select-none shadow-xs">
      <div className="flex items-center space-x-2.5 w-64 truncate">
        <Loader2 className="w-4 h-4 text-[#E05318] animate-spin shrink-0" />
        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
          {displayText}
        </span>
      </div>

      <div className="flex-1 max-w-md mx-4 sm:mx-6">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E05318] rounded-full transition-all duration-300"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>

      <div className="w-16 text-right font-mono text-[11px] text-slate-400 font-semibold">
        {displayPct}%
      </div>
    </div>
  );
};
