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
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#343842] bg-gray-50 dark:bg-[#1e2026] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-text">
            Chat & Calls
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <div className="flex items-center gap-1.5 mr-1 sm:mr-2 border-r border-gray-300 dark:border-[#343842] pr-2 sm:pr-3">
              <button 
                onClick={() => startCall?.('audio')} 
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#2a2d35] hover:bg-success hover:text-white hover:border-success transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-gray-300 dark:border-[#3c404d] shadow-2xs active:scale-95 group"
                title="Start an Audio Call"
              >
                <Phone className="w-3.5 h-3.5 text-success group-hover:text-white transition-colors" />
                <span className="hidden sm:inline text-xs">Voice Call</span>
              </button>
              
              <button 
                onClick={() => startCall?.('video')} 
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#2a2d35] hover:bg-accent hover:text-white hover:border-accent transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-gray-300 dark:border-[#3c404d] shadow-2xs active:scale-95 group"
                title="Start a Video Call"
              >
                <Video className="w-3.5 h-3.5 text-accent group-hover:text-white transition-colors" />
                <span className="hidden sm:inline text-xs">Video Call</span>
              </button>

              <button 
                onClick={onToggleBandwidthOptimized} 
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer border transition-all active:scale-95 shadow-2xs",
                  bandwidthOptimized 
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold" 
                    : "bg-white dark:bg-[#2a2d35] text-muted hover:text-text border-gray-300 dark:border-[#3c404d]"
                )}
                title={bandwidthOptimized ? "Data Saver is ON (uses less internet data during group calls)" : "Turn on Data Saver for slower internet connections"}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-xs">
                  {bandwidthOptimized ? "Data Saver: ON" : "Data Saver"}
                </span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white dark:bg-[#2a2d35] px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#3c404d]">
            <span className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-success" : "bg-gray-400"
            )} />
            <span className="text-xs text-text font-semibold">
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Role Banner */}
      <div className={cn(
        "border-b border-gray-200 dark:border-[#343842] px-4 py-2 flex gap-2 text-xs font-medium items-center justify-center transition-colors",
        role === 'host' ? "bg-accent/10 text-accent" : "bg-success/10 text-success"
      )}>
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span>
          {role === 'host' 
            ? `Hosting Room: Connected with ${connectedPeers} ${connectedPeers === 1 ? 'person' : 'people'}.` 
            : role === 'join' && isConnected
              ? "Connected to room. Your messages are shared directly with everyone in the room."
              : "Not connected yet. Go to the 'Share & Connect' tab to connect with someone first."}
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 flex flex-col bg-gray-50/60 dark:bg-[#18191c]">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-muted"
            >
              <div className="w-12 h-12 rounded-full bg-white dark:bg-[#22242a] border border-gray-200 dark:border-[#343842] flex items-center justify-center mb-3 shadow-2xs">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <span className="text-sm font-bold text-text">No messages yet</span>
              <span className="text-xs mt-1 text-muted">
                {isConnected ? "Say hello or record a voice note below!" : "Connect with a friend in 'Share & Connect' to start chatting."}
              </span>
            </motion.div>
          )}

          {messages.map((msg) => {
            const colorClass = msg.senderColor || (msg.sender === 'me' ? 'bg-accent' : 'bg-success');
            const isVoiceOnly = Boolean(msg.audioData && (msg.text === "🎤 Voice Message" || !msg.text));
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "max-w-[88%] sm:max-w-[75%] px-4 py-2.5 text-sm shadow-2xs",
                  msg.sender === "system" 
                    ? "max-w-full text-center bg-white dark:bg-[#22242a] border border-gray-200 dark:border-[#343842] text-muted w-full my-1.5 text-xs font-medium rounded-lg" 
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
                      "text-[11px] font-semibold mb-1 flex items-center gap-1.5",
                      "text-white/90",
                      msg.sender !== "me" && msg.senderId && "cursor-pointer hover:underline"
                    )}
                    onClick={() => msg.sender !== "me" && msg.senderId && onClickProfile?.(msg.senderId)}
                  >
                    {msg.senderAvatar ? (
                      <div className="w-4 h-4 rounded-full overflow-hidden border border-white/40 flex-shrink-0">
                        <img src={msg.senderAvatar} alt={msg.senderName || 'Avatar'} className="w-full h-full object-cover" />
                      </div>
                    ) : null}
                    <span>{msg.sender === "me" ? "You" : (msg.senderName || "Friend")}</span>
                    <span className="opacity-60">•</span>
                    <span className="opacity-80 text-[10px] font-mono tabular-nums">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
      <div className="p-3 sm:p-3.5 bg-white dark:bg-[#22242a] border-t border-gray-200 dark:border-[#343842]">
        {isRecording ? (
          /* Press to Speak Active Recording Bar */
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 animate-in fade-in duration-200">
            {/* Live recording indicator & timer */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono font-bold tabular-nums text-red-600 dark:text-red-400">
                Recording {formatRecTime(recordingSeconds)}
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
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Cancel recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={stopAndSend}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                title="Send Voice Note"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{isProcessing ? "Sending..." : "Send Voice Note"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Bar */
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <button 
              type="button"
              disabled={!isConnected}
              onClick={startRecording}
              className={cn(
                "px-3 py-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 select-none text-xs font-medium",
                "bg-gray-50 dark:bg-[#2a2d35] border-gray-300 dark:border-[#3c404d] text-text hover:border-accent hover:text-accent"
              )}
              title="Record a voice message"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Voice Note</span>
            </button>

            <input 
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isConnected}
              className="flex-1 bg-gray-50 dark:bg-[#18191c] border border-gray-300 dark:border-[#343842] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-50 transition-all placeholder:text-muted/70 text-text"
              placeholder={isConnected ? "Write a message..." : "Connect with someone first to chat..."}
            />

            <button 
              disabled={!isConnected || !text.trim()}
              className="px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center justify-center shadow-2xs font-semibold gap-1.5 cursor-pointer text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};
