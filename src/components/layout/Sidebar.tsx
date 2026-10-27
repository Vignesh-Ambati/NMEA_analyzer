import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  LayoutGrid,
  LineChart,
  BookOpen,
  Wrench,
  Moon,
  Sun,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const {
    currentPage,
    navigateToFilePage,
    navigateToTaskPage,
    navigateToGraphPage,
    navigateToReferencePage,
    navigateToToolsPage,
    navigateToDeveloperPage,
    currentTaskId,
    files,
    theme,
    toggleTheme,
    isFullpage,
    sidebarCollapsed,
    toggleSidebar,
    devUnlocked,
    registerDevSecretClick,
    backendStatus,
  } = useApp();

  if (isFullpage) return null;

  const handleNav = (action: () => void) => {
    action();
    setMobileOpen(false);
  };

  const fileLoaded = files.length > 0;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#FAF8F5] dark:bg-slate-900 border-r border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between shrink-0 select-none transition-all duration-200 ease-in-out shadow-xl md:shadow-none ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#E6E1D6] dark:border-slate-800 shrink-0">
            {sidebarCollapsed ? (
              <div className="w-full flex items-center justify-center py-1">
                <button
                  onClick={toggleSidebar}
                  type="button"
                  className="relative w-10 h-10 rounded-xl bg-[#EFEAE1]/80 hover:bg-[#ECE5D8] dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#E05318] flex items-center justify-center transition-all cursor-pointer shadow-xs group"
                  title="Expand Sidebar"
                  aria-label="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#FAF8F5] dark:ring-slate-900 ${
                      backendStatus?.reachable
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse'
                        : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                    }`}
                    title={backendStatus?.reachable ? 'Backend Synced' : 'Backend Offline'}
                  />
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={registerDevSecretClick}
                  className="flex items-center space-x-2.5 cursor-pointer group select-none min-w-0"
                  title={devUnlocked ? 'Developer Suite Unlocked' : 'Click 7 times to unlock Developer Suite'}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FDF3EE] dark:bg-orange-950/60 text-[#E05318] flex items-center justify-center font-bold text-xs tracking-tight border border-orange-200/70 dark:border-orange-900/50 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    NA
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#24211D] dark:text-slate-100 tracking-tight leading-tight truncate">
                      <span className="text-[#E05318]">NMEA</span>{' '}
                      <span>Analyzer</span>
                    </div>
                    <div className="text-[10px] text-[#736E65] dark:text-slate-400 font-medium truncate mt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshBackendStatus();
                        }}
                        className="flex items-center space-x-1.5 hover:text-[#24211D] dark:hover:text-slate-200 cursor-pointer transition-colors"
                        title={
                          backendStatus?.reachable
                            ? 'Backend Synced (Connected) · Click to re-check'
                            : 'Backend Offline · Click to retry'
                        }
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            backendStatus?.reachable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        <span className="truncate">
                          {backendStatus?.reachable ? 'Backend Synced' : 'Backend Offline'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={toggleSidebar}
                    type="button"
                    className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Collapse Sidebar"
                    aria-label="Collapse Sidebar"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setMobileOpen(false)}
                    type="button"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#24211D] dark:hover:text-white md:hidden cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 p-2 sm:p-2.5 space-y-4 overflow-y-auto overflow-x-hidden">
            <div>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-2 text-[10px] font-bold tracking-wider text-[#736E65] dark:text-slate-500 uppercase font-mono flex items-center justify-between">
                  <span>Workspace</span>
                </div>
              )}

              <div className="space-y-1">
                  <button
                    onClick={() => handleNav(navigateToFilePage)}
                    type="button"
                    className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer ${
                      currentPage === 'file'
                        ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                    } justify-between px-3`}
                    title="File Ingestion"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <UploadCloud className="w-4 h-4 text-[#E05318] shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="text-xs truncate">File Upload</span>
                    )}
                    </div>
                    {!sidebarCollapsed && fileLoaded && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                      {files.length}
                    </span>
                  )}
                  </button>

                {fileLoaded && (
                  <button
                    onClick={() => handleNav(navigateToTaskPage)}
                    type="button"
                    className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer animate-in fade-in slide-in-from-left-2 duration-150 ${
                      sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                    } ${
                      currentPage === 'task'
                        ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                    }`}
                    title="Task Matrix"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <LayoutGrid className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      {!sidebarCollapsed && <span className="text-xs truncate">Task Matrix</span>}
                    </div>
                  </button>
                )}

                {fileLoaded && (
                  <button
                    onClick={() => handleNav(() => navigateToGraphPage(currentTaskId))}
                    type="button"
                    className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer animate-in fade-in slide-in-from-left-2 duration-150 ${
                      sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                    } ${
                      currentPage === 'graph'
                        ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                    }`}
                    title="Charts & Plot"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <LineChart className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      {!sidebarCollapsed && <span className="text-xs truncate">Charts & Plot</span>}
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-2 text-[10px] font-bold tracking-wider text-[#736E65] dark:text-slate-500 uppercase font-mono">
                  Utilities & Docs
                </div>
              )}

              <div className="space-y-1">
                <button
                  onClick={() => handleNav(navigateToReferencePage)}
                  type="button"
                  className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    currentPage === 'reference'
                      ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                      : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                  }`}
                  title="Sentence Protocol Guide"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {!sidebarCollapsed && <span className="text-xs truncate">Protocol Guide</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleNav(navigateToToolsPage)}
                  type="button"
                  className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    currentPage === 'tools'
                      ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                      : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                  }`}
                  title="Standard Utilities"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    {!sidebarCollapsed && <span className="text-xs truncate">Standard Utilities</span>}
                  </div>
                </button>

                {devUnlocked && (
                  <button
                    onClick={() => handleNav(navigateToDeveloperPage)}
                    type="button"
                    className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer ${
                      sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                    } ${
                      currentPage === 'developer'
                        ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                        : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                    }`}
                    title="Developer Suite"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Code2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      {!sidebarCollapsed && <span className="text-xs truncate">Developer Suite</span>}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 border-t border-[#E6E1D6] dark:border-slate-800 space-y-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              type="button"
              className={`w-full py-2 rounded-xl text-xs font-medium text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white flex items-center transition-colors cursor-pointer ${
                sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <div className="flex items-center space-x-2">
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                {!sidebarCollapsed && <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
              </div>
              {!sidebarCollapsed && <span className="text-[10px] font-mono text-[#736E65] dark:text-slate-400">Switch</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
