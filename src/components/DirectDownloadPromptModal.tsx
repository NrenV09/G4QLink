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
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative w-full max-w-md bg-white dark:bg-[#22242a] border border-gray-300 dark:border-[#343842] rounded-xl p-6 shadow-xl overflow-hidden text-text flex flex-col gap-4"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Direct File Save</span>
              </div>

              <button
                onClick={onDecline}
                className="p-1.5 rounded-md text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-[#2b2e37] transition-colors cursor-pointer"
                title="Decline download"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Content */}
            <div className="space-y-3">
              <div className="text-base sm:text-lg font-bold text-text leading-snug tracking-tight">
                Incoming File Ready to Save
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#18191d] border border-gray-200 dark:border-[#343842] space-y-2">
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
              <div className="p-3 rounded-lg bg-accent/[0.06] border border-accent/20 flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                {streamSupport.isIOS ? (
                  <Smartphone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                ) : (
                  <Monitor className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-text text-xs flex items-center gap-1.5">
                    <span>Large File Support</span>
                    <span className="px-1.5 py-0.5 bg-accent/15 text-accent rounded text-[10px] uppercase font-bold">Ready</span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    This file will save directly to your device storage so even very large files download smoothly.
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                <strong className="text-text">{senderName}</strong> is waiting for you to accept this file. Click the download button below to start saving it.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 dark:border-[#343842] bg-gray-100 dark:bg-[#2b2e37] hover:bg-gray-200 dark:hover:bg-[#343842] text-xs font-semibold text-text transition-colors cursor-pointer"
              >
                Decline
              </button>

              <button
                onClick={onAccept}
                className="flex-2 py-2.5 px-4 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{streamSupport.isIOS ? "Save to Device" : "Save to Computer"}</span>
              </button>
            </div>

            <div className="text-[11px] text-muted text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Private Device-to-Device File Transfer</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
