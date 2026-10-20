import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Send, Video, Phone, Mic, Square, Trash2, AlertCircle, X, Gauge } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatMessage, NodeRole } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface SecureChatNodeProps {
  messages: ChatMessage[];
  sendMessage: (text: string, audioData?: string) => void;
  connectedPeers: number;
  role: NodeRole;
  onClickProfile?: (senderId: string) => void;
  startCall?: (type: 'audio' | 'video' | 'screen') => void;
  bandwidthOptimized?: boolean;
  onToggleBandwidthOptimized?: () => void;
  isCallActive?: boolean;
}

// Find best supported audio mime type across browsers
function getSupportedAudioMime(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', extension: 'webm' };
  }
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'mp4' },
    { mimeType: 'audio/aac', extension: 'aac' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/wav', extension: 'wav' }
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', extension: 'webm' };
}

export const SecureChatNode: React.FC<SecureChatNodeProps> = ({ 
  messages, 
  sendMessage, 
  connectedPeers, 
  role,
  onClickProfile,
  startCall,
  bandwidthOptimized = false,
  onToggleBandwidthOptimized,
  isCallActive = false,
}) => {
  const [text, setText] = useState("");
  const isConnected = connectedPeers > 0;
  
  // Voice message recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setLiveVolume(0);
  };

  // Start recording when user presses the mic button
  const startRecording = async () => {
    if (!isConnected) return;
    setMicError(null);
    isCancelledRef.current = false;
    audioChunksRef.current = [];

    try {
      // High-fidelity studio audio capture for voice messaging
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true, // Prevents acoustic feedback & clipping
          noiseSuppression: false, // Disabling aggressive spectral gating preserves natural warm voice frequencies and eliminates metallic tinny sound
          autoGainControl: true // AGC maintains full dynamic vocal loudness without distortion
        }
      });
      streamRef.current = stream;

      // Audio analysis for live visual wave
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setLiveVolume(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (audioCtxErr) {
        console.warn("Visualizer audio context init failed:", audioCtxErr);
      }

      const { mimeType } = getSupportedAudioMime();
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 128000 // Studio-grade 128 kbps Opus audio
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isCancelledRef.current) {
          cleanupRecording();
          return;
        }

        setIsProcessing(true);
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });

        if (audioBlob.size < 300) {
          setMicError("Voice note was too short to send.");
          setIsProcessing(false);
          cleanupRecording();
          return;
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            sendMessage("🎤 Voice Message", base64Audio);
            setIsProcessing(false);
            cleanupRecording();
          };
          reader.onerror = () => {
            setMicError("Error processing recorded audio.");
            setIsProcessing(false);
            cleanupRecording();
          };
        } catch (err) {
          console.error("Audio encoding error:", err);
          setMicError("Failed to encode voice message.");
          setIsProcessing(false);
          cleanupRecording();
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setMicError("Recording encountered a hardware error.");
        cleanupRecording();
      };

      // Continuous, unbroken high-fidelity audio stream with clean container headers
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 120) {
            // Auto stop at 2 minutes
            stopAndSend();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      let message = "Microphone access failed.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No microphone device found.";
      }
      setMicError(message);
      cleanupRecording();
    }
  };

  // Stop recording and send the voice message
  const stopAndSend = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping mediaRecorder:", e);
        cleanupRecording();
      }
    } else {
      cleanupRecording();
    }
  };

  // Cancel recording and discard audio
  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    cleanupRecording();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isConnected) return;
    sendMessage(text);
    setText("");
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col w-full max-w-none mx-auto glass-panel shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.07] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-text tracking-tight">
            Secure Group Chat
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <div className="flex items-center gap-1.5 mr-1 sm:mr-2 border-r border-slate-200/80 dark:border-white/[0.08] pr-2 sm:pr-3">
              <button 
                onClick={() => startCall?.('audio')} 
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-white/[0.08] active:scale-95 group"
                title="Start Group Audio Call"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white transition-colors" />
                <span className="hidden sm:inline text-[11px]">Group Audio</span>
              </button>
              
              <button 
                onClick={() => startCall?.('video')} 
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-accent hover:text-white hover:border-accent transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-white/[0.08] active:scale-95 group"
                title="Start Group Video Call"
              >
                <Video className="w-3.5 h-3.5 text-accent group-hover:text-white transition-colors" />
                <span className="hidden sm:inline text-[11px]">Group Video</span>
              </button>

              <button 
                onClick={onToggleBandwidthOptimized} 
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer border transition-all active:scale-95",
                  bandwidthOptimized 
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                    : "bg-slate-100 dark:bg-white/[0.04] text-muted hover:text-text border-slate-200/80 dark:border-white/[0.08]"
                )}
                title={bandwidthOptimized ? "Bandwidth Saver ACTIVE (360p / 15fps capped)" : "Bandwidth Saver: Caps bitrate & fps when >=3 participants connect"}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">
                  {bandwidthOptimized ? "Saver: ON" : "Bandwidth Saver"}
                </span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0f1219] px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.07]">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected ? "bg-success animate-pulse" : "bg-red-500"
            )} />
            <span className="text-[10px] text-text font-mono font-semibold uppercase tracking-wider">
              {isConnected ? "P2P DIRECT LINK" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Role Banner */}
      <div className={cn(
        "border-b border-slate-200/80 dark:border-white/[0.06] px-4 py-2 flex gap-2.5 text-[11px] font-medium items-center justify-center transition-colors",
        role === 'host' ? "bg-accent/[0.07] text-accent" : "bg-success/[0.07] text-success"
      )}>
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span>
          {role === 'host' 
            ? `Host Node: Relaying secure messages between ${connectedPeers} active peer(s).` 
            : role === 'join' && isConnected
              ? "Join Node: Connected to Host. Messages are relayed to the group."
              : "No active connections. Please establish a tunnel in the Transceiver tab."}
        </span>
      </div>

      {/* Mic Error Notification */}
      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/25 px-4 py-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{micError}</span>
            </div>
            <button
              onClick={() => setMicError(null)}
              className="p-1 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 flex flex-col bg-slate-50/30 dark:bg-[#0a0c12]/40">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-muted/60"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-muted" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text/70">End-to-End Encrypted Channel</span>
              <span className="text-[11px] mt-1 text-muted">Awaiting secure peer messages...</span>
            </motion.div>
          )}

          {messages.map((msg) => {
            const colorClass = msg.senderColor || (msg.sender === 'me' ? 'bg-accent' : 'bg-success');
            const isVoiceOnly = Boolean(msg.audioData && (msg.text === "🎤 Voice Message" || !msg.text));
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "max-w-[88%] sm:max-w-[76%] px-3.5 py-2.5 text-sm shadow-xs",
                  msg.sender === "system" 
                    ? "max-w-full text-center bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] text-muted w-full my-1.5 text-xs font-medium rounded-xl" 
                    : cn(
                        "text-white", 
                        colorClass, 
                        msg.sender === "me" ? "self-end rounded-2xl rounded-tr-xs" : "self-start rounded-2xl rounded-tl-xs"
                      )
                )}
              >
                {msg.sender !== "system" && (
                  <div 
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5",
                      "text-white/90",
                      msg.sender !== "me" && msg.senderId && "cursor-pointer hover:opacity-80 transition-opacity"
                    )}
                    onClick={() => msg.sender !== "me" && msg.senderId && onClickProfile?.(msg.senderId)}
                  >
                    {msg.senderAvatar ? (
                      <div className="w-4 h-4 rounded-full overflow-hidden border border-white/40 flex-shrink-0 shadow-xs">
                        <img src={msg.senderAvatar} alt={msg.senderName || 'Avatar'} className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <span>{msg.senderName || (msg.sender === "me" ? "LOCAL" : "PEER")}</span>
                    <span className="opacity-60">•</span>
                    <span className="opacity-75 font-mono tabular-nums">{msg.timestamp.toLocaleTimeString([], { hour12: false })}</span>
                  </div>
                )}

                {/* Message text (hidden if it's purely a voice message placeholder) */}
                {!isVoiceOnly && msg.text && (
                  <div className="whitespace-pre-wrap break-words leading-relaxed font-normal">
                    {msg.text}
                  </div>
                )}

                {/* Voice Message Player */}
                {msg.audioData && (
                  <div className={cn(isVoiceOnly ? "mt-0" : "mt-2.5")}>
                    <VoiceMessagePlayer 
                      id={msg.id}
                      audioData={msg.audioData}
                      isMe={msg.sender === 'me'}
                      senderColor={colorClass}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Voice Recording Bar */}
      <div className="p-3 sm:p-3.5 bg-slate-50/80 dark:bg-[#0f1219]/90 border-t border-slate-200/80 dark:border-white/[0.07]">
        {isRecording ? (
          /* Press to Speak Active Recording Bar */
          <div className="flex items-center gap-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
            {/* Live recording indicator & timer */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono font-semibold tabular-nums text-red-600 dark:text-red-400">
                {formatRecTime(recordingSeconds)}
              </span>
            </div>

            {/* Live audio volume wave bars */}
            <div className="flex-1 flex items-center justify-center gap-1 h-6 px-2 overflow-hidden">
              {[0.3, 0.6, 0.9, 0.5, 0.8, 1, 0.7, 0.4, 0.85, 0.6].map((multiplier, idx) => {
                const height = Math.max(15, Math.min(100, Math.round(liveVolume * multiplier + 10)));
                return (
                  <div 
                    key={idx}
                    style={{ height: `${height}%` }}
                    className="w-1 bg-red-500/80 rounded-full transition-all duration-75"
                  />
                );
              })}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Discard recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Stop and Send Button (Press again to stop) */}
              <button
                type="button"
                onClick={stopAndSend}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                title="Press again to stop and send"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{isProcessing ? "Sending..." : "Stop & Send"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Bar */
          <form className="flex gap-2" onSubmit={handleSubmit}>
            {/* Press to Speak Mic Button (Click once to start recording) */}
            <button 
              type="button"
              disabled={!isConnected}
              onClick={startRecording}
              className={cn(
                "p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 select-none",
                "bg-white dark:bg-[#161a24] border-slate-200/80 dark:border-white/[0.08] text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/10 active:scale-95"
              )}
              title="Press to speak (click again to stop & send)"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isConnected}
              className="flex-1 bg-white dark:bg-[#161a24] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/60 disabled:opacity-50 transition-all placeholder:text-muted/60 text-text"
              placeholder={isConnected ? "Type message or press mic to speak..." : "Tunnel unavailable. Connect in Transceiver."}
            />

            <button 
              disabled={!isConnected || !text.trim()}
              className="px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:hover:bg-accent transition-all flex items-center justify-center shadow-xs font-semibold gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Send</span>
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};
