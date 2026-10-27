import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  ArrowLeft,
  ArrowRight,
  Home,
  Sun,
  Moon,
  UploadCloud,
  LayoutGrid,
  LineChart,
  BookOpen,
  Wrench,
  Code2,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';
import { TASKS_CONFIG } from '../../services/tasks';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const {
    currentPage,
    currentTaskId,
    files,
    theme,
    toggleTheme,
    navigateToFilePage,
    navigateToTaskPage,
    navigateToGraphPage,
    isFullpage,
  } = useApp();

  if (isFullpage) return null;

  const currentTask = TASKS_CONFIG.find((t) => t.id === currentTaskId) || TASKS_CONFIG[0];
  const hasFiles = files.length > 0;

  // Smart Step Back navigation
  const handleBack = () => {
    if (currentPage === 'graph') {
      navigateToTaskPage();
    } else if (currentPage === 'task') {
      navigateToFilePage();
    } else if (currentPage === 'reference' || currentPage === 'tools' || currentPage === 'developer') {
      navigateToFilePage();
    }
  };

  // Smart Step Forward navigation
  const handleForward = () => {
    if (currentPage === 'file' && hasFiles) {
      navigateToTaskPage();
    } else if (currentPage === 'task' && hasFiles) {
      navigateToGraphPage(currentTaskId);
    }
  };

  const canGoBack = currentPage !== 'file';
  const canGoForward = hasFiles && (currentPage === 'file' || currentPage === 'task');
  const isWorkflowPage = currentPage === 'file' || currentPage === 'task' || currentPage === 'graph';

  const totalSentences = files.reduce((acc, f) => acc + (f.totalSentences || 0), 0);

  return (
    <header className="h-16 px-3 sm:px-6 bg-[#FAF8F5]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between shrink-0 select-none z-30 transition-colors">
      
      {/* LEFT SECTION: Mobile Menu + Context-Aware Curved Navigation Stepper / Badge */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          type="button"
          className="p-2 -ml-1 rounded-full text-slate-500 hover:text-[#24211D] dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 md:hidden cursor-pointer transition-colors shrink-0"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* 1. WORKFLOW PIPELINE CAPSULE (Displayed only during Analysis Workflow) */}
        {isWorkflowPage && (
          <div className="bg-[#EFEAE1]/70 dark:bg-slate-950/70 p-1 rounded-full border border-[#E6E1D6] dark:border-slate-800/80 flex items-center shadow-xs">
            {/* Step 1: Ingestion */}
            <button
              onClick={navigateToFilePage}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                currentPage === 'file'
                  ? 'bg-[#E05318] text-white shadow-xs font-bold'
                  : hasFiles
                  ? 'text-emerald-700 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5'
                  : 'text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200'
              }`}
              title="Step 1: Upload NMEA / UBX log files"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>1. Ingestion</span>
              {hasFiles && currentPage !== 'file' && (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              )}
            </button>

            {/* Separator / Connector */}
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

            {/* Step 2: Task Matrix */}
            <button
              onClick={hasFiles ? navigateToTaskPage : undefined}
              disabled={!hasFiles}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 ${
                currentPage === 'task'
                  ? 'bg-[#E05318] text-white shadow-xs font-bold cursor-pointer'
                  : hasFiles
                  ? 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                  : 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title={hasFiles ? 'Step 2: Task Selection Matrix' : 'Upload a log file to activate tasks'}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>2. Task Matrix</span>
            </button>

            {/* Step 3: Analytics Plot (Only visible if a task is active or accessible) */}
            {hasFiles && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />
                <button
                  onClick={() => navigateToGraphPage(currentTaskId)}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 max-w-40 sm:max-w-56 truncate ${
                    currentPage === 'graph'
                      ? 'bg-[#E05318] text-white shadow-xs font-bold cursor-pointer'
                      : 'text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title={`Plot: ${currentTask.title}`}
                >
                  <LineChart className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {currentPage === 'graph' ? currentTask.title : '3. Plot'}
                  </span>
                </button>
              </>
            )}
          </div>
        )}

        {/* 2. STANDALONE UTILITIES CURVED BADGE (No misleading "1. Ingestion >") */}
        {currentPage === 'tools' && (
          <div className="flex items-center space-x-2.5 py-1 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-transparent border border-amber-300/70 dark:border-amber-800/60 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-s font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
                Standard Utilities
              </span>
            </div>
          </div>
        )}

        {/* 3. PROTOCOL GUIDE CURVED BADGE */}
        {currentPage === 'reference' && (
          <div className="flex items-center space-x-2.5 py-1 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-transparent border border-emerald-300/70 dark:border-emerald-800/60 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-s font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
                Protocol & Sentence Guide
              </span>
            </div>
          </div>
        )}

        {/* 4. DEVELOPER SUITE CURVED BADGE */}
        {currentPage === 'developer' && (
          <div className="flex items-center space-x-2.5 py-1 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-sky-500/5 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-transparent border border-sky-300/70 dark:border-sky-800/60 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-s font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
                Developer Suite
              </span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Telemetry Counter Pill + Curved Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Active Telemetry Dataset Pill (ONLY on workflow pages when datasets exist) */}
        {isWorkflowPage && hasFiles && (
          <button
            onClick={navigateToFilePage}
            type="button"
            className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-semibold hover:bg-emerald-100/70 transition-colors cursor-pointer shadow-xs"
            title="Click to view loaded datasets"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{files.length} Dataset{files.length > 1 ? 's' : ''}</span>
            <span className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px]">
              ({totalSentences.toLocaleString()} sentences)
            </span>
          </button>
        )}

        {/* Curved Back / Forward Capsule */}
        <div className="bg-[#EFEAE1]/70 dark:bg-slate-950/70 p-0.5 rounded-full border border-[#E6E1D6] dark:border-slate-800 flex items-center shadow-xs">
          {/* Back Pill */}
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              canGoBack
                ? 'bg-white dark:bg-slate-800 text-[#24211D] dark:text-slate-100 shadow-xs hover:text-[#E05318] cursor-pointer'
                : 'opacity-30 text-slate-400 cursor-not-allowed'
            }`}
            title={canGoBack ? 'Go to previous step' : 'Already on first step'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Forward Pill (Visible when forwardable) */}
          {canGoForward && (
            <button
              onClick={handleForward}
              type="button"
              className="ml-0.5 px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer"
              title="Proceed to next step"
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Curved Home Button */}
        <button
          onClick={navigateToFilePage}
          type="button"
          className="w-9 h-9 rounded-full bg-[#EFEAE1]/70 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-800 text-[#736E65] dark:text-slate-300 hover:text-[#E05318] dark:hover:text-[#E05318] border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title="Return to Home (File Upload)"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Curved Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme mode"
          className="w-9 h-9 rounded-full bg-[#EFEAE1]/70 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-800 text-[#736E65] dark:text-slate-300 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-[#736E65] transition-transform hover:-rotate-12" />
          )}
        </button>
      </div>
    </header>
  );
};
