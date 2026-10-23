import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  FileCode2,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const FilePage: React.FC = () => {
  const {
    files,
    processFile,
    removeFile,
    isProcessing,
    processingProgress,
    processingStatus,
    navigateToTaskPage,
  } = useApp();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        processFile(e.dataTransfer.files[i]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        processFile(e.target.files[i]);
      }
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full select-none">
      {/* Loading Modal Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in duration-150">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-[#E6E1D6] dark:border-slate-800">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-3 border-t-[#E05318] border-r-transparent border-b-[#E05318]/40 border-l-transparent animate-spin" />
              <div className="text-sm font-bold font-mono text-[#24211D] dark:text-slate-100">
                {processingProgress}%
              </div>
            </div>
            <h3 className="text-sm font-semibold text-[#24211D] dark:text-slate-100 mb-1">
              {processingStatus}
            </h3>
            <p className="text-xs text-[#736E65] dark:text-slate-400 font-mono">
              Reading GNSS sentences...
            </p>
          </div>
        </div>
      )}

      {/* Main Upload / File Ingestion Card */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 shadow-xs p-5 sm:p-7 md:p-8 space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#E05318] uppercase tracking-wider font-mono">
              <UploadCloud className="w-4 h-4" />
              <span>File Ingestion Workspace</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#24211D] dark:text-slate-100 tracking-tight mt-0.5">
              NMEA & UBX Receiver Log Parser
            </h2>
            <p className="text-xs sm:text-sm text-[#736E65] dark:text-slate-400 mt-0.5">
              Select or drop raw GNSS receiver captures (.log, .txt, .nmea, .ubx) to extract satellite fixes, SNR, and altitude profiles.
            </p>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            dragOver
              ? 'border-[#E05318] bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-[#D8D2C5] dark:border-slate-800 hover:border-[#E05318] hover:bg-[#EFEAE1]/60 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".log,.txt,.nmea,.ubx,*"
            className="hidden"
          />

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FDF3EE] dark:bg-orange-950/40 flex items-center justify-center text-[#E05318] border border-orange-200/60 dark:border-orange-900/40 shadow-xs">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#24211D] dark:text-slate-100">
              Drop your NMEA log file here or click to browse
            </p>
            <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1">
              Supports .log, .nmea, .txt, and .ubx formats up to 500 MB
            </p>
          </div>

          <button
            type="button"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E05318] hover:bg-[#C94713] text-white shadow-xs transition-all cursor-pointer"
          >
            Browse Files from Device
          </button>
        </div>

        {/* Uploaded Files Table / List */}
        {hasFiles && (
          <div className="space-y-3 pt-3 border-t border-[#E6E1D6] dark:border-slate-800">
            <div className="text-xs font-bold text-[#24211D] dark:text-slate-100 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Loaded Datasets ({files.length})</span>
            </div>

            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-[#F5F2EB]/80 dark:bg-slate-950 border border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: file.color }}
                    />
                    <FileCode2 className="w-5 h-5 text-[#736E65] dark:text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#24211D] dark:text-slate-100 truncate">
                        {file.filename}
                      </div>
                      <div className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono mt-0.5 truncate">
                        {file.totalSentences.toLocaleString()} sentences · {file.epochs.length} epochs · {(file.fileSize / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(file.id)}
                    type="button"
                    className="p-2 text-[#736E65] hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove File"
                    aria-label="Remove dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Launch Task Matrix Button */}
            <div className="pt-3 flex justify-end">
              <button
                onClick={navigateToTaskPage}
                type="button"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E05318] hover:bg-[#C94713] text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Proceed to Task Matrix (Step 2)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
