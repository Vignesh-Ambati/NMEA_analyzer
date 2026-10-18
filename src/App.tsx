import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProgressIndicator } from './components/layout/ProgressIndicator';
import { DevConsoleModal } from './components/dev/DevConsoleModal';
import { FilePage } from './components/pages/FilePage';
import { TaskPage } from './components/pages/TaskPage';
import { GraphPage } from './components/pages/GraphPage';
import { ReferencePage } from './components/pages/ReferencePage';
import { ToolsPage } from './components/pages/ToolsPage';

export const AppContent: React.FC = () => {
  const { currentPage, openDevModal, isFullpage, devToastMessage } = useApp();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Global hotkey: Ctrl+Shift+D or Cmd+Shift+D to open Engineering Console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        openDevModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openDevModal]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F2EB] dark:bg-slate-950 text-[#24211D] dark:text-slate-100 font-sans antialiased">
      {/* Responsive Left Navigation Sidebar (with mobile drawer support) */}
      {!isFullpage && (
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      )}

      {/* Main Content Area */}
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
        </main>

        {/* Discreet bottom progress indicator when parsing */}
        <ProgressIndicator />
      </div>

      {/* Secret 7-tap Developer Toast */}
      {devToastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-mono font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700/50 dark:border-slate-200/50 pointer-events-none flex items-center space-x-2">
          <span>{devToastMessage}</span>
        </div>
      )}

      {/* Gated Developer Diagnostic Suite Modal */}
      <DevConsoleModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
