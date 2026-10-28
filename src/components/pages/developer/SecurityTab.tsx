import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, Check, LogOut, ShieldCheck } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { backendService } from "../../../backend";

export const SecurityTab: React.FC = () => {
  const { logoutDeveloper, addLog } = useApp();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedCurrent = currentPassword.trim();

    if (!trimmedNew) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (trimmedNew.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await backendService.updateDevPassword({
        currentPassword: trimmedCurrent || undefined,
        newPassword: trimmedNew,
      });

      if (result.success) {
        setSuccessMessage(result.message || "Developer password updated in backend database.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        addLog("Developer access password was updated in backend database.", "success", "developer");
      } else {
        setErrorMessage(result.message || "Failed to update password in backend database.");
        addLog(`Password update failed: ${result.message}`, "error", "developer");
      }
    } catch (err: any) {
      const msg = err?.message || "Network request failed. Is the backend server running?";
      setErrorMessage(msg);
      addLog(`Password update network failure: ${msg}`, "error", "developer");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Password Update Form Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E1D6] dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[#E05318]" />
              <span>Developer Access Password Update</span>
            </h3>
            <p className="text-xs text-[#736E65] dark:text-slate-400 mt-0.5">
              Updates the scrypt password hash stored in the backend database. No passwords are ever stored locally.
            </p>
          </div>

          <button
            type="button"
            onClick={logoutDeveloper}
            className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs shrink-0 self-start sm:self-auto"
            title="Log out and lock Developer Suite"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Suite</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-mono">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span className="leading-relaxed font-mono">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          {/* Current Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Current Developer Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                disabled={isUpdating}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                disabled={isUpdating}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Developer Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password (min 6 characters)..."
                disabled={isUpdating}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                disabled={isUpdating}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showNew ? "Hide new password" : "Show new password"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirm New Developer Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password..."
                disabled={isUpdating}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isUpdating}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="py-2.5 px-5 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-mono font-bold uppercase transition-all shadow-sm cursor-pointer flex items-center space-x-2 disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <Lock className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Backend Database...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password in Backend DB</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security Protocol Standards Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 uppercase flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Security Architecture & Zero-Storage Guarantees</span>
        </h4>
        <ul className="text-xs text-[#736E65] dark:text-slate-400 space-y-1.5 list-disc list-inside font-mono">
          <li>Passwords are never written to localStorage, cookies, or sessionStorage.</li>
          <li>Authentication is authorized directly against the SQLite/PostgreSQL database via POST /api/dev/auth.</li>
          <li>All diagnostics, telemetry streams, and console log payloads redact sensitive keys and credentials automatically.</li>
        </ul>
      </div>
    </div>
  );
};
