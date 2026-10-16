import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  ArrowLeft,
  ArrowRight,
  Home,
  Sun,
  Moon,
  ChevronRight,
  UploadCloud,
  LayoutGrid,
  LineChart,
  BookOpen,
  Wrench
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
  const hasFile = files.length > 0;

  // Smart Back navigation
  const handleBack = () => {
    if (currentPage === 'graph') {
      navigateToTaskPage();
    } else if (currentPage === 'task') {
      navigateToFilePage();
    } else if (currentPage === 'reference' || currentPage === 'tools') {
      navigateToFilePage();
    }
  };

  // Smart Forward navigation
  const handleForward = () => {
    if (currentPage === 'file' && hasFile) {
      navigateToTaskPage();
    } else if (currentPage === 'task' && hasFile) {
      navigateToGraphPage(currentTaskId);
    }
  };

  const canGoBack = currentPage !== 'file';
  const canGoForward = hasFile && (currentPage === 'file' || currentPage === 'task');

  return (
    <header className="h-12 sm:h-14 px-3 sm:px-5 bg-[#FAFBFD] dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 select-none z-20 transition-colors">
      {/* Left: Mobile Drawer Trigger + Clean Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Mobile menu hamburger (only on mobile screens < 768px) */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800 md:hidden cursor-pointer transition-colors shrink-0"
          title="Open Menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Workflow Breadcrumbs - DYNAMICALLY HIDES Task Matrix & Charts UNTIL FILE IS UPLOADED */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-medium overflow-hidden">
          {/* Step 1: File Upload */}
          <button
            onClick={navigateToFilePage}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              currentPage === 'file'
                ? 'bg-orange-100/60 dark:bg-orange-950/40 text-[#E05318] font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Upload</span>
          </button>

          {/* Steps 2 & 3: ONLY DISPLAYED ONCE FILE UPLOAD IS COMPLETED */}
          {hasFile && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />

              {/* Step 2: Task Matrix */}
              <button
                onClick={navigateToTaskPage}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                  currentPage === 'task'
                    ? 'bg-orange-100/60 dark:bg-orange-950/40 text-[#E05318] font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Select Analysis Task"
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Task Matrix</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />

              {/* Step 3: Analysis Plot */}
              <button
                onClick={() => navigateToGraphPage(currentTaskId)}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1.5 truncate max-w-32 sm:max-w-48 cursor-pointer ${
                  currentPage === 'graph'
                    ? 'bg-orange-100/60 dark:bg-orange-950/40 text-[#E05318] font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={currentTask.title}
              >
                <LineChart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentPage === 'graph' ? currentTask.title : 'Analytics'}</span>
              </button>
            </>
          )}

          {/* Standalone Breadcrumbs when on Reference or Utilities */}
          {currentPage === 'reference' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="truncate">Protocol Guide</span>
              </span>
            </>
          )}

          {currentPage === 'tools' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1 shrink-0">
                <Wrench className="w-3.5 h-3.5" />
                <span className="truncate">Standard Utilities</span>
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Placed Appropriate Navigation Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Home Button */}
        <button
          onClick={navigateToFilePage}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Return to Home (File Upload)"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Back Button */}
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition-colors ${
            canGoBack
              ? 'bg-[#FAFBFD] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-xs'
              : 'opacity-30 text-slate-400 border-transparent cursor-not-allowed'
          }`}
          title={canGoBack ? 'Back to previous step' : 'Already on first step'}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Forward / Next Button */}
        <button
          onClick={handleForward}
          disabled={!canGoForward}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition-colors ${
            canGoForward
              ? 'bg-[#E05318] hover:bg-[#C94713] text-white border-[#E05318] cursor-pointer shadow-xs'
              : 'opacity-30 text-slate-400 border-transparent cursor-not-allowed hidden xs:flex'
          }`}
          title={canGoForward ? 'Proceed to next step' : 'Requires file upload to advance'}
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Instant Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme mode"
          className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#FAFBFD] dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs flex items-center space-x-1"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
