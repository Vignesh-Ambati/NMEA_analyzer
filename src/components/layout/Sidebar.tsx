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
  Terminal
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
    currentTaskId,
    files,
    theme,
    toggleTheme,
    openDevModal,
    isFullpage,
    sidebarCollapsed,
    toggleSidebar,
    devUnlocked,
    registerDevSecretClick,
  } = useApp();

  if (isFullpage) return null;

  const handleNav = (action: () => void) => {
    action();
    setMobileOpen(false); // Close mobile drawer upon selection
  };

  const fileLoaded = files.length > 0;

  return (
    <>
      {/* Mobile Backdrop Overlay (Active when drawer is open on mobile screens) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Responsive Sidebar Container: Collapsible Icon-Rail or Full Width Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#FAF8F5] dark:bg-slate-900 border-r border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between shrink-0 select-none transition-all duration-200 ease-in-out shadow-xl md:shadow-none ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header with Pure Name & 7-Click Dev Trigger */}
          <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between border-b border-[#E6E1D6] dark:border-slate-800 shrink-0">
            {sidebarCollapsed ? (
              // Collapsed state: Centered Expand toggle button with warm accent (Zero overflow, impossible to break)
              <div className="w-full flex items-center justify-center py-1">
                <button
                  onClick={toggleSidebar}
                  type="button"
                  className="w-10 h-10 rounded-xl bg-[#EFEAE1]/80 hover:bg-[#ECE5D8] dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#E05318] flex items-center justify-center transition-all cursor-pointer shadow-xs group"
                  title="Expand Sidebar"
                  aria-label="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            ) : (
              // Expanded state: Brand Name (Clickable 7-times for Developer Diagnostics) & Collapse Toggle
              <>
                <div
                  onClick={registerDevSecretClick}
                  className="flex items-center space-x-2.5 cursor-pointer group select-none min-w-0"
                  title="Click 7 times to unlock Developer Diagnostics"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FDF3EE] dark:bg-orange-950/60 text-[#E05318] flex items-center justify-center font-bold text-xs tracking-tight border border-orange-200/70 dark:border-orange-900/50 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    NA
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#24211D] dark:text-slate-100 tracking-tight leading-tight truncate flex items-center space-x-1.5">
                      <span className="text-[#E05318]">NMEA</span>
                      <span>Analyzer</span>
                      {devUnlocked && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Developer Mode Active" />
                      )}
                    </div>
                    <div className="text-[10px] text-[#736E65] dark:text-slate-400 font-medium truncate mt-0.5">
                      GNSS Telemetry Suite
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Desktop single collapse toggle */}
                  <button
                    onClick={toggleSidebar}
                    type="button"
                    className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Collapse Sidebar"
                    aria-label="Collapse Sidebar"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>

                  {/* Mobile Drawer Close Button */}
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

          {/* Navigation Items Area */}
          <div className="flex-1 p-2 sm:p-2.5 space-y-4 overflow-y-auto overflow-x-hidden">
            {/* SECTION 1: WORKSPACE (Requires File Upload) */}
            <div>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-2 text-[10px] font-bold tracking-wider text-[#736E65] dark:text-slate-500 uppercase font-mono flex items-center justify-between">
                  <span>Workspace</span>
                  {fileLoaded && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                      file ready
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {/* 1. File Upload (Always Present) */}
                <button
                  onClick={() => handleNav(navigateToFilePage)}
                  type="button"
                  className={`w-full py-2.5 rounded-xl flex items-center transition-all cursor-pointer ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } ${
                    currentPage === 'file'
                      ? 'bg-[#FDF3EE] dark:bg-orange-950/40 text-[#E05318] font-bold border border-orange-200/70 dark:border-orange-900/40 shadow-xs'
                      : 'text-[#736E65] dark:text-slate-300 hover:bg-[#EFEAE1] dark:hover:bg-slate-800 hover:text-[#24211D] dark:hover:text-white'
                  }`}
                  title="Step 1: File Ingestion"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <UploadCloud className="w-4 h-4 text-[#E05318] shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="text-xs truncate">1. File Upload</span>
                    )}
                  </div>
                  {!sidebarCollapsed && fileLoaded && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                      {files.length}
                    </span>
                  )}
                </button>

                {/* 2. Task Matrix - ONLY VISIBLE WHEN FILE IS UPLOADED */}
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
                    title="Step 2: Task Matrix"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <LayoutGrid className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="text-xs truncate">2. Task Matrix</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="text-[9px] text-[#736E65] dark:text-slate-400 font-mono shrink-0">
                        10
                      </span>
                    )}
                  </button>
                )}

                {/* 3. Charts & Analytics - ONLY VISIBLE WHEN FILE IS UPLOADED */}
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
                    title="Step 3: Charts & Analytics"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <LineChart className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="text-xs truncate">3. Charts & Plot</span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 2: STANDALONE UTILITIES (No File Needed) */}
            <div>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-2 text-[10px] font-bold tracking-wider text-[#736E65] dark:text-slate-500 uppercase font-mono">
                  Utilities & Docs
                </div>
              )}

              <div className="space-y-1">
                {/* Sentence Protocol Reference Guide */}
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
                    {!sidebarCollapsed && (
                      <span className="text-xs truncate">Protocol Guide</span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="text-[9px] text-[#736E65] dark:text-slate-400 shrink-0">Docs</span>
                  )}
                </button>

                {/* Standalone Tools Suite (Time Diff, UTC/IST, Line Copy) */}
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
                  title="Standard Utilities (Time Diff, UTC/IST, Line Copy)"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="text-xs truncate">Standard Utilities</span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="text-[9px] text-[#736E65] dark:text-slate-400 shrink-0">Tools</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Footer Section: Developer Diagnostics (Only if 7-clicked) + Theme */}
          <div className="p-2 sm:p-2.5 border-t border-[#E6E1D6] dark:border-slate-800 space-y-1.5 shrink-0">
            {/* Developer Diagnostics: VISIBLE ONLY WHEN UNLOCKED VIA 7 CLICKS */}
            {devUnlocked && (
              <button
                onClick={() => {
                  openDevModal();
                  setMobileOpen(false);
                }}
                type="button"
                className={`w-full py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center transition-colors cursor-pointer animate-in fade-in duration-200 ${
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                }`}
                title="Developer Diagnostics"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">Developer Diagnostics</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                    Active
                  </span>
                )}
              </button>
            )}

            {/* Quick Theme Toggle Button */}
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
                {!sidebarCollapsed && (
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-mono text-[#736E65] dark:text-slate-400">Switch</span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
