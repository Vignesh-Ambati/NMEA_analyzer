import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProgressIndicator } from './components/layout/ProgressIndicator';
import { FilePage } from './components/pages/FilePage';
import { TaskPage } from './components/pages/TaskPage';
import { GraphPage } from './components/pages/GraphPage';
import { ReferencePage } from './components/pages/ReferencePage';
import { ToolsPage } from './components/pages/ToolsPage';
import { DeveloperPage } from './components/pages/DeveloperPage';
import { logger } from './services';
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react';

export const AppContent: React.FC = () => {
  const {
    currentPage,
    navigateToDeveloperPage,
    isFullpage,
    activeToast,
    dismissToast,
    isProcessing,
    activeJobs,
    progressBarVisible,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Global hotkey: Ctrl+Shift+D or Cmd+Shift+D to navigate to Developer Suite
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        logger.developer('Developer suite triggered via keyboard shortcut (Ctrl/Cmd+Shift+D)', 'info');
        navigateToDeveloperPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToDeveloperPage]);

  // Log active notification
  useEffect(() => {
    if (activeToast) {
      logger.system(
        `Active notification: "${activeToast.message}" [${activeToast.type}]`,
        { notification: activeToast }
      );
    }
  }, [activeToast]);

  const hasBottomBar = progressBarVisible && (isProcessing || activeJobs.length > 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F2EB] dark:bg-slate-950 text-[#24211D] dark:text-slate-100 font-sans antialiased">
      {/* Responsive Left Navigation Sidebar (with mobile drawer support) */}
      {!isFullpage && (
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      )}

      {/* Main Content Area (Beside Sidebar) */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Top Header with breadcrumb and Back/Home/Forward controls */}
        {!isFullpage && <Header setMobileOpen={setMobileOpen} />}

        {/* Viewport for Active Section */}
        <main className="flex-1 flex overflow-hidden relative bg-[#F5F2EB] dark:bg-slate-950">
          {currentPage === 'file' && <FilePage />}
          {currentPage === 'task' && <TaskPage />}
          {currentPage === 'graph' && <GraphPage />}
          {currentPage === 'reference' && <ReferencePage />}
          {currentPage === 'tools' && <ToolsPage />}
          {currentPage === 'developer' && <DeveloperPage />}
        </main>

        {/* Discreet bottom progress indicator when parsing */}
        <ProgressIndicator />

        {/* Secret Developer Toast Style: Single clean pill centered beside sidebar with 'x' close button */}
        {activeToast && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-mono font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700/50 dark:border-slate-200/50 flex items-center space-x-2.5 max-w-[92vw] sm:max-w-md ${
              hasBottomBar ? 'bottom-14' : 'bottom-6'
            }`}
            role="status"
            aria-live="polite"
          >
            {activeToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : activeToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : activeToast.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="truncate">{activeToast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(activeToast.id)}
              className="p-1 -mr-1 rounded-md text-slate-400 hover:text-white dark:hover:text-slate-900 hover:bg-white/10 dark:hover:bg-slate-900/10 transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return <AppContent />;
}



