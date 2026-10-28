import React, { useState } from "react";
import {
  Code2,
  LogOut,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Sliders,
  Terminal,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  EngineTuningTab,
  MiscTab,
  SecurityTab,
  LogsTab,
} from "./developer";

type DevTabKey = "engine" | "misc" | "security" | "logs";

export const DeveloperPage: React.FC = () => {
  const {
    isDevAuthenticated,
    authenticateDev,
    logoutDeveloper,
    navigateToFilePage,
  } = useApp();

  // Authentication Screen State
  const [authPasswordInput, setAuthPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(false);

  // Authenticated Workspace State (4 tabs)
  const [activeTab, setActiveTab] = useState<DevTabKey>("engine");

  // Handle Authentication Submission directly with backend DB
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = authPasswordInput.trim();
    if (!trimmed) {
      setAuthError("Please enter the developer password.");
      return;
    }

    setIsVerifyingAuth(true);
    setAuthError(null);

    try {
      const result = await authenticateDev(trimmed);
      if (!result.success) {
        setAuthError(result.message || "Invalid credentials.");
      } else {
        setAuthPasswordInput("");
        setAuthError(null);
      }
    } catch (err: any) {
      setAuthError(err?.message || "Authentication request failed.");
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // SCREEN 1: DEVELOPER AUTHENTICATION / SECURE PASSWORD SCREEN (When !isDevAuthenticated)
  if (!isDevAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#F5F2EB] dark:bg-slate-950 select-none">
        <div className="w-full max-w-md bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Lock Icon & Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#E05318] flex items-center justify-center border border-orange-300/60 dark:border-orange-800/60 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#24211D] dark:text-slate-100 tracking-tight">
              Developer Suite Access
            </h2>
            <p className="text-xs text-[#736E65] dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Database authentication via Core API. Enter your developer account password.
            </p>
          </div>

          {/* Secure Password Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Developer Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="Enter developer password..."
                  disabled={isVerifyingAuth}
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isVerifyingAuth}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-mono">{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingAuth}
              className="w-full py-3 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-bold font-mono uppercase shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifyingAuth ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Backend Database...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate with Backend</span>
                </>
              )}
            </button>
          </form>

          {/* Return Navigation */}
          <div className="pt-2 border-t border-[#E6E1D6] dark:border-slate-800 flex justify-center">
            <button
              onClick={navigateToFilePage}
              type="button"
              className="py-2 px-4 rounded-xl text-xs font-mono text-[#736E65] dark:text-slate-400 hover:text-[#24211D] dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: AUTHENTICATED DEVELOPER SUITE WORKSPACE (4 TABS)
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-5 max-w-6xl mx-auto w-full select-none">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E6E1D6] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
            <Code2 className="w-4 h-4" />
            <span>Developer Suite</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#24211D] dark:text-slate-100 mt-0.5">
            Database & Engineering Console
          </h2>
          <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
            Synchronized with backend database service. Zero local password storage.
          </p>
        </div>

        {/* Log Out & Lock Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={logoutDeveloper}
            type="button"
            className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
            title="Log out and lock Developer Suite"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* 4 Dedicated Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Tab 1: Engine Tuning */}
        <button
          onClick={() => setActiveTab("engine")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "engine"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Engine Tuning</span>
        </button>

        {/* Tab 2: Miscellaneous */}
        <button
          onClick={() => setActiveTab("misc")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "misc"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Miscellaneous</span>
        </button>

        {/* Tab 3: Security & Access Key */}
        <button
          onClick={() => setActiveTab("security")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "security"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Developer Access Key</span>
        </button>

        {/* Tab 4: Logs Console & Diagnostics */}
        <button
          onClick={() => setActiveTab("logs")}
          type="button"
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === "logs"
              ? "bg-[#E05318] text-white shadow-xs font-bold"
              : "bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Local Console & Logs</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "engine" && <EngineTuningTab />}
      {activeTab === "misc" && <MiscTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "logs" && <LogsTab />}
    </div>
  );
};

export default DeveloperPage;
