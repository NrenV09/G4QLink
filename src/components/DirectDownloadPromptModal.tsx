import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, Download, X, ShieldCheck, User, Smartphone, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';
import { getDiskStreamSupport } from '../lib/diskStreamer';

interface DirectDownloadPromptModalProps {
  isOpen: boolean;
  fileName: string;
  fileSize: number;
  senderName: string;
  onAccept: () => void;
  onDecline: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const DirectDownloadPromptModal: React.FC<DirectDownloadPromptModalProps> = ({
  isOpen,
  fileName,
  fileSize,
  senderName,
  onAccept,
  onDecline
}) => {
  const streamSupport = getDiskStreamSupport();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative w-full max-w-md bg-white dark:bg-[#12151e] border border-slate-200/80 dark:border-white/[0.1] rounded-2xl p-6 shadow-2xl overflow-hidden text-text flex flex-col gap-4"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Bypass RAM • Direct Streaming</span>
              </div>

              <button
                onClick={onDecline}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Decline download"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Content */}
            <div className="space-y-3">
              <div className="text-base sm:text-lg font-bold text-text leading-snug tracking-tight">
                Incoming Direct Disk Transfer
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0c12] border border-slate-200/80 dark:border-white/[0.07] space-y-2">
                <div className="font-semibold text-sm text-text break-all">
                  {fileName}
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Size: <strong className="text-text font-mono tabular-nums">{formatBytes(fileSize)}</strong></span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-accent" />
                    <span>From: <strong className="text-text">{senderName}</strong></span>
                  </span>
                </div>
              </div>

              {/* Platform Engine Status */}
              <div className="p-3 rounded-xl bg-accent/[0.07] border border-accent/20 flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                {streamSupport.isIOS ? (
                  <Smartphone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                ) : (
                  <Monitor className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-text text-xs flex items-center gap-1.5">
                    <span>{streamSupport.label}</span>
                    <span className="px-1.5 py-0.5 bg-accent/15 text-accent rounded text-[10px] uppercase font-bold">Active</span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {streamSupport.hasNativePicker
                      ? "Direct streaming to selected local file. Browser RAM heap bypassed."
                      : streamSupport.hasOPFS
                      ? "Origin Private File System (OPFS) direct disk pipeline active. Protects iOS/mobile tabs from memory crashes."
                      : "Memory-guarded stream active. Protected against mobile memory termination."}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                The sender is currently <strong className="text-accent">waiting for you to accept</strong> this transfer. Click download below to initiate the direct stream.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-xs font-semibold text-text transition-colors cursor-pointer"
              >
                Decline
              </button>

              <button
                onClick={onAccept}
                className="flex-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{streamSupport.isIOS ? "Download to Device" : "Download to Computer"}</span>
              </button>
            </div>

            <div className="text-[11px] text-muted text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Zero-RAM Disk Pipeline • Anti-Crash Guard Engaged</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
