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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#343842] flex items-center justify-between bg-gray-50 dark:bg-[#1e2026]">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-white shadow-2xs", profile.avatarColor || "bg-accent")}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Contact Info</h2>
              <p className="text-xs text-muted">Connected Person</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-[#343842] rounded-lg text-muted hover:text-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto bg-white dark:bg-[#22242a]">
          {/* Avatar Display */}
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-md border-4 border-white dark:border-[#2a2d35] overflow-hidden relative",
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
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-text flex items-center justify-center gap-2">
                {profile.username}
              </h3>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted justify-center bg-gray-100 dark:bg-[#2a2d35] border border-gray-200 dark:border-[#343842] px-3 py-1 rounded-md">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(profile.joinedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-[#343842]">
            <label className="text-xs font-bold text-text block">
              Status / Note
            </label>
            <div className="bg-gray-50 dark:bg-[#18191c] border border-gray-200 dark:border-[#343842] rounded-lg px-4 py-3 text-sm text-text leading-relaxed min-h-[70px]">
              {profile.bio || "No status note added."}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-[#1e2026] border-t border-gray-200 dark:border-[#343842] flex flex-wrap gap-2">
          {onStartCall && (
            <>
              <button 
                onClick={() => { onClose(); onStartCall('audio'); }}
                className="flex-1 min-w-[90px] px-3 py-2.5 text-xs font-semibold bg-success hover:bg-green-700 text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                Voice Call
              </button>
              <button 
                onClick={() => { onClose(); onStartCall('video'); }}
                className="flex-1 min-w-[90px] px-3 py-2.5 text-xs font-semibold bg-accent hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Video className="w-3.5 h-3.5" />
                Video Call
              </button>
              <button 
                onClick={() => { onClose(); onStartCall('screen'); }}
                className="flex-1 min-w-[110px] px-3 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="Share your screen with this person"
              >
                <MonitorUp className="w-3.5 h-3.5" />
                Share Screen
              </button>
            </>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold bg-white dark:bg-[#2a2d35] border border-gray-300 dark:border-[#3c404d] text-text hover:bg-gray-100 dark:hover:bg-[#343842] rounded-lg transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
