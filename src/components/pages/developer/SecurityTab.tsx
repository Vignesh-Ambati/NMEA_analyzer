import React, { useState } from "react";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { backendService } from "../../../backend";

export const SecurityTab: React.FC = () => {
  const { logoutDeveloper, addLog, showToast } = useApp();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedCurrent = currentPassword.trim();

    if (!trimmedNew) {
      showToast("Please enter a new password.", "error");
      return;
    }

    if (trimmedNew.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await backendService.updateDevPassword({
        currentPassword: trimmedCurrent || undefined,
        newPassword: trimmedNew,
      });

      if (result.success) {
        showToast(
          result.message || "Developer password updated in backend database.",
          "success",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        addLog(
          "Developer access password was updated in backend database.",
          "success",
          "developer",
        );
      } else {
        showToast(
          result.message || "Failed to update password in backend database.",
          "error",
        );
        addLog(
          `Password update failed: ${result.message}`,
          "error",
          "developer",
        );
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        "Network request failed. Is the backend server running?";
      showToast(msg, "error");
      addLog(`Password update network failure: ${msg}`, "error", "developer");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F5F2EE] p-4 dark:bg-slate-950">
      <div className="w-full max-w-[760px] rounded-[28px] border border-[#E6E1D6] bg-[#FAF8F5] p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mx-auto w-full max-w-[620px]">
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* 1. Password Update Form Card */}
            <div className="rounded-2xl p-5 sm:p-6 space-y-6">
              <div className="flex flex-col items-center justify-center gap-3 pb-4 border-b border-[#E6E1D6] dark:border-slate-800 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <KeyRound className="w-4 h-4 text-[#E05318]" />
                  <h3 className="text-l font-bold text-[#24211D] dark:text-slate-100">
                    Developer Access Password Update
                  </h3>
                </div>
                <p className="text-xs text-[#736E65] dark:text-slate-400">
                  Update the password
                </p>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                className="mx-auto w-full max-w-xl space-y-4"
              >
                {/* Current Password Field */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      disabled={isUpdating}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      disabled={isUpdating}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={
                        showCurrent
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >
                      {showCurrent ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      disabled={isUpdating}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      disabled={isUpdating}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={
                        showNew ? "Hide new password" : "Show new password"
                      }
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={isUpdating}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#E05318]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      disabled={isUpdating}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={
                        showConfirm
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                    >
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="py-2.5 px-5 rounded-xl bg-[#E05318] hover:bg-[#C94713] text-white text-xs font-mono font-bold uppercase transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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
          </div>
        </div>
      </div>
    </div>
  );
};
