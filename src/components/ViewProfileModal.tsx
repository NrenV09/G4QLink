import React from 'react';
import { motion } from 'motion/react';
import { X, User, Calendar, Info, Phone, Video, MonitorUp } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ViewProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onStartCall?: (type: 'audio' | 'video' | 'screen') => void;
}

export function ViewProfileModal({ profile, onClose, onStartCall }: ViewProfileModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="relative w-full max-w-md bg-white dark:bg-[#12151e] rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08]"
      >
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl text-white shadow-xs", profile.avatarColor || "bg-accent")}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text tracking-tight">Node Details</h2>
              <p className="text-xs text-muted">Quantum Node Identity</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] rounded-lg text-muted hover:text-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Avatar Display */}
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-xl border-4 border-white dark:border-[#1a1f2e] overflow-hidden relative",
              profile.avatarColor || "bg-accent"
            )}>
              {profile.avatarImage ? (
                <img 
                  src={profile.avatarImage} 
                  alt={profile.username} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                profile.username.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-bold text-text flex items-center justify-center gap-2 tracking-tight">
                {profile.username}
                {profile.avatarImage && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Custom Avatar
                  </span>
                )}
              </h3>
              <p className="text-xs font-mono text-muted">NODE_ID: {profile.id}</p>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted justify-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.07] px-3 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(profile.joinedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200/80 dark:border-white/[0.07]">
            <label className="text-xs font-semibold text-muted flex items-center gap-1.5 ml-1">
              <Info className="w-3.5 h-3.5" />
              COMM TRANSMISSION BIO
            </label>
            <div className="bg-slate-50 dark:bg-[#0a0c12] border border-slate-200/80 dark:border-white/[0.07] rounded-xl px-4 py-3.5 text-sm text-text leading-relaxed min-h-[80px]">
              {profile.bio || "No bio information provided by this node."}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.07] flex flex-wrap gap-2">
          {onStartCall && (
            <>
              <button 
                onClick={() => { onClose(); onStartCall('audio'); }}
                className="flex-1 min-w-[90px] px-3 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                Voice
              </button>
              <button 
                onClick={() => { onClose(); onStartCall('video'); }}
                className="flex-1 min-w-[90px] px-3 py-2.5 text-xs font-semibold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Video className="w-3.5 h-3.5" />
                Video
              </button>
              <button 
                onClick={() => { onClose(); onStartCall('screen'); }}
                className="flex-1 min-w-[110px] px-3 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Mirror your screen directly to this peer"
              >
                <MonitorUp className="w-3.5 h-3.5" />
                Mirror Screen
              </button>
            </>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] text-text hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
