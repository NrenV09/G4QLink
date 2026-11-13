import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldCheck,
  Users, 
  Send, 
  RefreshCw, 
  X, 
  GripHorizontal, 
  Monitor, 
  UserPlus, 
  ArrowRight, 
  Hexagon, 
  FileText, 
  Download,
  CheckCircle2,
  Copy,
  Share,
  Moon,
  Sun,
  PhoneCall,
  Maximize2,
  Info,
  HardDrive,
  Trash2,
  Network,
  Lock,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { SafeQRCode } from './components/SafeQRCode';
import { encodeCompactSDP, decodeCompactSDP } from './lib/sdpCodec';

import { cn, formatBytes } from './lib/utils';
import { 
  NodeRole, 
  ConnectionStatus, 
  ChatMessage, 
  FilePayload, 
  TransferProgress, 
  LogEntry,
  UserProfile
} from './types';

import { 
  getOrStoreCache, 
  deleteCachedFile, 
  clearAllCache, 
  getCacheSizeMB, 
  storeFileInSandboxCache, 
  getCachedBlob 
} from './lib/cacheStorage';

import { QRScanner } from './components/QRScanner';
import { QRUtilityNode } from './components/QRUtilityNode';
import { SecureChatNode } from './components/SecureChatNode';
import { Base64ToolNode } from './components/Base64ToolNode';
import { FilePreview, VideoDropZonePreview } from './components/FilePreview';
import { DataStream } from './components/DataStream';
import { PacketTransferAnimation } from './components/PacketTransferAnimation';
import { ProfileModal } from './components/ProfileModal';
import { ViewProfileModal } from './components/ViewProfileModal';
import { NexusFailoverHUD } from './components/NexusFailoverHUD';
import { NexusNetworkMap } from './components/NexusNetworkMap';
import { CallOverlay } from './components/CallOverlay';
import { IncomingCallModal, IncomingCallData } from './components/IncomingCallModal';
import { EasterEggModal, playTapTick } from './components/EasterEggModal';
import { NexusInfoModal } from './components/NexusInfoModal';
import { DirectDownloadPromptModal } from './components/DirectDownloadPromptModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { QuantumAppIcon } from './components/QuantumAppIcon';
import { QuantumWebGLStage, StageChapterId } from './components/QuantumWebGLStage';
import { KineticPreloader } from './components/KineticPreloader';
import { MaterialYouSettingsModal, MaterialYouSettingsContent } from './components/MaterialYouSettingsModal';
import {
  MaterialThemeState,
  DEFAULT_MATERIAL_THEME,
  applyMaterialThemeToDOM,
  triggerHaptic,
  MaterialSymbol,
} from './lib/materialTheme';
import { generateRandomName } from './lib/nameGenerator';
import { createSafeDiskWriter, triggerBrowserFileDownload, purgeAllTempStorage, isIOSorIPad } from './lib/diskStreamer';

const CHUNK_SIZE = 64000; // WebRTC safe chunk size (strictly below 64KB SCTP limit for Firefox, Safari & iOS)
const MAX_BUFFERED_AMOUNT = 512 * 1024; // 512KB safe flow control threshold to prevent SCTP buffer overflows

export default function App() {
  // --- Material You (Android 16 M3 Expressive) Theme State ---
  const [materialTheme, setMaterialTheme] = useState<MaterialThemeState>(() => {
    try {
      const saved = localStorage.getItem('quantum_m3_theme');
      if (saved) {
        return { ...DEFAULT_MATERIAL_THEME, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_MATERIAL_THEME;
  });
  const [showThemeModal, setShowThemeModal] = useState(false);

  // --- Offline 3D Spatial Stage & Kinetic Intro State ---
  const [showPreloader, setShowPreloader] = useState(true);
  const [stageChapter, setStageChapter] = useState<StageChapterId>(0);
  const [autoTour, setAutoTour] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [hoverRole, setHoverRole] = useState<'host' | 'join' | null>(null);

  useEffect(() => {
    applyMaterialThemeToDOM(materialTheme);
    try {
      localStorage.setItem('quantum_m3_theme', JSON.stringify(materialTheme));
    } catch {}
  }, [materialTheme]);

  // --- State ---
  const [profile, setProfile] = useState<UserProfile>(() => {
    let saved = null;
    try {
      saved = localStorage.getItem('quantum_profile');
    } catch(e) {}
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.username || parsed.username.trim() === "") {
          parsed.username = generateRandomName();
        }
        return parsed;
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
    return {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      username: generateRandomName(),
      avatarColor: 'bg-accent',
      bio: 'Quantum data node activated.',
      joinedAt: new Date().toISOString(),
    };
  });
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState<'guide' | 'dictionary' | 'offline' | 'legal'>('guide');
  const [selectedPeerProfile, setSelectedPeerProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTabState] = useState<string>("p2p");
  const activeTabRef = useRef<string>("p2p");

  const setActiveTab = useCallback((tab: string) => {
    triggerHaptic('light', materialTheme.hapticsEnabled);
    setActiveTabState(tab);
    activeTabRef.current = tab;
    // Choreograph the 3D Galaxy & Black Hole camera smoothly per dedicated tab
    if (tab === 'p2p' || tab === 'appearance') setStageChapter(0);
    else if (tab === 'qr') setStageChapter(1);
    else if (tab === 'base64') setStageChapter(2);
    else if (tab === 'chat') setStageChapter(3);
  }, [materialTheme.hapticsEnabled]);
  const [role, setRole] = useState<NodeRole>(null);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [isTransferring, setIsTransferring] = useState(false);

  // Smooth automated visual chapter tour on the idle spatial stage
  useEffect(() => {
    if (!autoTour || role !== null || activeTab !== 'p2p' || showPreloader) return;
    const timer = window.setInterval(() => {
      setStageChapter((prev) => (((prev + 1) % 4) as StageChapterId));
    }, 6800);
    return () => clearInterval(timer);
  }, [autoTour, role, activeTab, showPreloader]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [peerTrackStates, setPeerTrackStates] = useState<Record<string, { video?: boolean; audio?: boolean }>>({});
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const ringtoneCtxRef = useRef<AudioContext | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const endCallRef = useRef<(notifyPeers?: boolean) => void>(() => {});

  const playRingChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') {
        ringtoneCtxRef.current = new AudioCtx();
      }
      const ctx = ringtoneCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playTone = () => {
        if (!ctx || ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      };

      playTone();
      if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = setInterval(playTone, 2000);
    } catch (e) {
      console.warn("Could not play ringtone:", e);
    }
  }, []);

  const stopRingChime = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneCtxRef.current) {
      ringtoneCtxRef.current.close().catch(() => {});
      ringtoneCtxRef.current = null;
    }
  }, []);
  const [files, setFiles] = useState<FilePayload[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState<number>(0);

  // Rehydrate sandbox files from CacheStorage / persistent storage on mount
  useEffect(() => {
    let active = true;
    const initSandbox = async () => {
      try {
        const size = await getCacheSizeMB();
        if (active) setCacheSizeMB(size);

        const saved = localStorage.getItem('nexus_sandbox_files');
        if (saved) {
          const list: any[] = JSON.parse(saved);
          const loaded: FilePayload[] = [];
          for (const item of list) {
            let blob: Blob | undefined;
            if (item.cacheUrl) {
              blob = (await getCachedBlob(item.cacheUrl)) || undefined;
            }
            loaded.push({
              ...item,
              timestamp: new Date(item.timestamp),
              blob
            });
          }
          if (active && loaded.length > 0) {
            setFiles(loaded);
          }
        }
      } catch (e) {
        console.warn("Failed to initialize sandbox from cache:", e);
      }
    };
    initSandbox();
    return () => { active = false; };
  }, []);

  const [transfer, setTransfer] = useState<TransferProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const [qrPayload, setQrPayload] = useState("");
  const [pasteBuffer, setPasteBuffer] = useState("");
  const [scannerType, setScannerType] = useState<'offer' | 'answer' | null>(null);
  const [selectedFile, setSelectedFile] = useState<FilePayload | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [showSimWarning, setShowSimWarning] = useState(false);
  const [showFailoverMenu, setShowFailoverMenu] = useState(false);
  const [showNetworkMapModal, setShowNetworkMapModal] = useState(false);
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [screenSharingPeers, setScreenSharingPeers] = useState<Record<string, boolean>>({});
  const isCallActiveRef = useRef(false);
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const isSimulationRef = useRef(false);
  useEffect(() => {
    isSimulationRef.current = isSimulation;
  }, [isSimulation]);

  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitleClick = useCallback(() => {
    setTitleTapCount(prev => {
      const next = prev + 1;
      if (next >= 10) {
        setShowCreatorPopup(true);
        return 0;
      } else {
        playTapTick(next);
        return next;
      }
    });
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTitleTapCount(0), 1500);
  }, []);

  // --- Refs ---
  const cancelTransferRef = useRef(false);
  const roleRef = useRef<NodeRole>(null);
  const usernameRef = useRef("");
  
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { 
    usernameRef.current = profile.username;
    try {
      localStorage.setItem('quantum_profile', JSON.stringify(profile));
    } catch(e) {}
  }, [profile]);
  
  // --- Helpers ---
  const addLog = useCallback((text: string, type: 'info' | 'ok' | 'err' = 'info') => {
    setLogs(prev => [...prev.slice(-20), { text, type, timestamp: new Date() }]);
  }, []);

  const localConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const chatChunkBuffers = useRef<Record<string, { chunks: (string | null)[]; count: number; total: number }>>({});
  const [peerProfiles, setPeerProfiles] = useState<Record<string, UserProfile>>({});
  const peerIdToProfileId = useRef<Map<string, string>>(new Map());
  const [connectedCount, setConnectedPeers] = useState(0);
  const fileBuffers = useRef<Map<string, any>>(new Map());
  const lastUpdateRef = useRef<number>(Date.now());
  const createHostOfferRef = useRef<(() => Promise<void>) | null>(null);
  const createPeerRef = useRef<((id: string, useStun?: boolean) => RTCPeerConnection) | null>(null);
  const waitForIceRef = useRef<((pc: RTCPeerConnection) => Promise<void>) | null>(null);

  const getDcForPeer = useCallback((targetId?: string): RTCDataChannel | undefined => {
    if (!targetId) return undefined;
    if (dataChannels.current.has(targetId)) return dataChannels.current.get(targetId);
    if (dataChannels.current.has(`mesh_${targetId}`)) return dataChannels.current.get(`mesh_${targetId}`);
    for (const [cId, profId] of peerIdToProfileId.current.entries()) {
      if (profId === targetId || profId === targetId.replace(/^mesh_/, '')) {
        return dataChannels.current.get(cId);
      }
    }
    return undefined;
  }, []);

  const getPcForPeer = useCallback((targetId?: string): RTCPeerConnection | undefined => {
    if (!targetId) return undefined;
    if (peerConnections.current.has(targetId)) return peerConnections.current.get(targetId);
    if (peerConnections.current.has(`mesh_${targetId}`)) return peerConnections.current.get(`mesh_${targetId}`);
    for (const [cId, profId] of peerIdToProfileId.current.entries()) {
      if (profId === targetId || profId === targetId.replace(/^mesh_/, '')) {
        return peerConnections.current.get(cId);
      }
    }
    return undefined;
  }, []);

  const transferRef = useRef<TransferProgress | null>(null);
  useEffect(() => {
    transferRef.current = transfer;
  }, [transfer]);

  // Immediately removes any half-transferred or orphaned file chunks from memory, OPFS, IndexedDB, and CacheStorage
  const cleanupBuffersAndCache = useCallback(async (targetFileName?: string, targetPeerId?: string) => {
    if (targetPeerId && fileBuffers.current.has(targetPeerId)) {
      const buf = fileBuffers.current.get(targetPeerId);
      try {
        if (buf.writer && typeof buf.writer.abort === 'function') {
          await buf.writer.abort();
        }
        if (buf.writable && typeof buf.writable.abort === 'function') {
          try { await buf.writable.abort(); } catch (_) {}
        }
        if (buf.fileHandle && typeof buf.fileHandle.remove === 'function') {
          try { await buf.fileHandle.remove(); } catch (_) {}
        }
        if (Array.isArray(buf.chunks)) {
          buf.chunks.length = 0;
        }
        buf.isFinished = true;
      } catch (e) {
        console.warn("Failed to abort file buffer for peer:", e);
      }
      fileBuffers.current.delete(targetPeerId);
    } else {
      for (const [, buf] of fileBuffers.current.entries()) {
        try {
          if (buf.writer && typeof buf.writer.abort === 'function') {
            await buf.writer.abort();
          }
          if (buf.writable && typeof buf.writable.abort === 'function') {
            try { await buf.writable.abort(); } catch (_) {}
          }
          if (buf.fileHandle && typeof buf.fileHandle.remove === 'function') {
            try { await buf.fileHandle.remove(); } catch (_) {}
          }
          if (Array.isArray(buf.chunks)) {
            buf.chunks.length = 0;
          }
          buf.isFinished = true;
        } catch (e) {
          console.warn("Failed to abort file buffer:", e);
        }
      }
      fileBuffers.current.clear();
    }

    try {
      await purgeAllTempStorage(targetFileName);
    } catch (e) {
      console.warn("purgeAllTempStorage error:", e);
    }
  }, []);

  // Universal transfer failure handler: notifies remote peer, displays prominent error log, and purges partial cache
  const handleTransferFailure = useCallback(async (
    reason: string,
    peerId?: string,
    fileName?: string,
    notifyRemote = true
  ) => {
    const currentTransfer = transferRef.current;
    const targetFileName = fileName || currentTransfer?.name || 'File';
    const roleType = currentTransfer?.type || (peerId ? 'receiver' : 'sender');

    cancelTransferRef.current = true;
    pendingDirectSendRef.current = null;
    setIncomingDirectPrompt(null);
    setTransfer(null);

    if (notifyRemote) {
      const errorPayload = JSON.stringify({
        type: 'transfer-failed',
        fileName: targetFileName,
        reason,
        failedBy: roleType
      });

      if (peerId && dataChannels.current.has(peerId)) {
        const dc = dataChannels.current.get(peerId);
        if (dc && dc.readyState === 'open') {
          try { dc.send(errorPayload); } catch (_) {}
        }
      } else {
        dataChannels.current.forEach(dc => {
          if (dc.readyState === 'open') {
            try { dc.send(errorPayload); } catch (_) {}
          }
        });
      }
    }

    addLog(`Transfer failed for "${targetFileName}": ${reason}`, "err");
    await cleanupBuffersAndCache(targetFileName, peerId);
  }, [addLog, cleanupBuffersAndCache]);

  const handleCancelTransfer = useCallback(async () => {
    const currentTransfer = transferRef.current;
    const targetFileName = currentTransfer?.name || 'File';

    cancelTransferRef.current = true;
    pendingDirectSendRef.current = null;
    setIncomingDirectPrompt(null);
    setTransfer(null);

    const cancelMsg = JSON.stringify({
      type: 'transfer-failed',
      fileName: targetFileName,
      reason: 'Cancelled by user',
      failedBy: currentTransfer?.type || 'user'
    });

    dataChannels.current.forEach(dc => {
      if (dc.readyState === 'open') {
        try { dc.send(cancelMsg); } catch(e) {}
      }
    });

    addLog(`Transfer stopped / discarded for "${targetFileName}" - cached data cleared`, "err");
    await cleanupBuffersAndCache(targetFileName);
  }, [addLog, cleanupBuffersAndCache]);

  const [directDownloads, setDirectDownloadsState] = useState(false);
  const directDownloadsRef = useRef(false);
  const [incomingDirectPrompt, setIncomingDirectPrompt] = useState<{ peerId: string; meta: any; } | null>(null);
  const pendingDirectSendRef = useRef<{ file: File; startSend: () => void; } | null>(null);

  const setDirectDownloads = (val: boolean) => {
    setDirectDownloadsState(val);
    directDownloadsRef.current = val;
    if (val) {
      addLog("Direct Downloads enabled: Instant prompt on receiver browser & direct disk streaming (RAM & sandbox bypassed)", "ok");
    } else {
      addLog("Direct Downloads disabled: Standard browser buffering active", "info");
    }
  };

  const handleAcceptDirectDownload = useCallback(async () => {
    if (!incomingDirectPrompt) return;
    const { peerId, meta } = incomingDirectPrompt;

    try {
      const { writer, mode, warning } = await createSafeDiskWriter(meta.name, meta.size, meta.mimeType);
      if (warning) {
        addLog(warning, "info");
      }

      const bufferRef: any = {
        metadata: meta,
        receivedSize: 0,
        chunks: [],
        writer: writer,
        isWriting: false,
        isDirectDisk: true
      };

      fileBuffers.current.set(peerId, bufferRef);

      setTransfer({
        name: meta.name,
        progress: 0,
        type: 'receiving',
        peerUsername: meta.senderName || peerProfiles[peerId]?.username || 'Peer',
        transferredBytes: 0,
        totalBytes: meta.size,
        isDirectDisk: true
      });

      const dc = dataChannels.current.get(peerId);
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'file-download-accepted', name: meta.name }));
      }

      addLog(`Direct download accepted for ${meta.name} [${mode.toUpperCase()} Disk Pipeline]. RAM bypassed.`, "ok");
      setIncomingDirectPrompt(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        addLog("Transfer Aborted: User cancelled direct disk save prompt", "err");
        const dc = dataChannels.current.get(peerId);
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({ type: 'file-download-declined', name: meta.name }));
        }
        setIncomingDirectPrompt(null);
        return;
      }
      addLog(`Direct download initiation failed: ${err?.message || err}`, "err");
      setIncomingDirectPrompt(null);
    }
  }, [incomingDirectPrompt, addLog, peerProfiles]);

  const handleDeclineDirectDownload = useCallback(() => {
    if (!incomingDirectPrompt) return;
    const { peerId, meta } = incomingDirectPrompt;
    const dc = dataChannels.current.get(peerId);
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({ type: 'file-download-declined', name: meta.name }));
    }
    addLog(`Direct download of ${meta.name} declined by user`, "err");
    setIncomingDirectPrompt(null);
  }, [incomingDirectPrompt, addLog]);

  const [bandwidthOptimized, setBandwidthOptimized] = useState(false);

  const handleDeleteSandboxFile = useCallback(async (file: FilePayload, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (file.cacheUrl) {
        await deleteCachedFile(file.cacheUrl);
      }
      setFiles(prev => {
        const next = prev.filter(f => f.id !== file.id);
        try {
          localStorage.setItem('nexus_sandbox_files', JSON.stringify(
            next.map(({ blob: _, ...rest }) => rest)
          ));
        } catch (_) {}
        return next;
      });
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
      const mb = await getCacheSizeMB();
      setCacheSizeMB(mb);
      addLog(`Deleted ${file.name} from cache (disk space freed)`, "ok");
    } catch (err: any) {
      addLog(`Failed to delete file from cache: ${err?.message || err}`, "err");
    }
  }, [selectedFile, addLog]);

  const handleClearCache = useCallback(async () => {
    try {
      fileBuffers.current.forEach(async (buffer) => {
        try {
          if (buffer.writable) await buffer.writable.close();
        } catch(e) {}
      });
      fileBuffers.current.clear();
      chatChunkBuffers.current = {};
      setTransfer(null);

      // Purge entire app-cache-v1 bucket using CacheStorage API
      await clearAllCache();

      if (window.caches) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }

      if (navigator.storage && navigator.storage.getDirectory) {
        try {
          const root = await navigator.storage.getDirectory();
          // @ts-ignore
          if (root.values) {
            // @ts-ignore
            for await (const entry of root.values()) {
              try {
                await root.removeEntry(entry.name, { recursive: true });
              } catch(e) {}
            }
          }
        } catch(e) {}
      }

      setFiles([]);
      setSelectedFile(null);
      try {
        localStorage.removeItem('nexus_sandbox_files');
      } catch (_) {}

      const size = await getCacheSizeMB();
      setCacheSizeMB(size);

      addLog("App cache cleared: Entire cache bucket (app-cache-v1) and sandbox files purged from disk", "ok");
    } catch (e: any) {
      addLog("Failed to clear cache: " + (e?.message || e), "err");
    }
  }, [addLog]);

  const handleTransferHostControl = useCallback((targetPeerId: string) => {
    const targetPeer = peerProfiles[targetPeerId];
    const targetName = targetPeer?.username || targetPeerId.substring(0, 8);
    
    // Broadcast handoff message to all peers
    const msg = JSON.stringify({
      type: 'host-handoff',
      newHostId: targetPeerId,
      newHostName: targetName,
      oldHostId: profile.id,
      oldHostName: profile.username
    });
    dataChannels.current.forEach(dc => {
      if (dc.readyState === 'open') {
        try { dc.send(msg); } catch(e) {}
      }
    });

    // Step down to join role and become 1st heir
    setRole('join');
    roleRef.current = 'join';
    setQrPayload("");
    setPasteBuffer("");
    setShowFailoverMenu(false);
    addLog(`👑 Host authority transferred to ${targetName}. You are now designated 1st Heir.`, "ok");
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: `👑 Host authority handed over to ${targetName}. This node is now a Peer (1st Heir).`,
      sender: 'system',
      timestamp: new Date()
    }]);
  }, [peerProfiles, profile, addLog]);

  const handleGracefulHostDrop = useCallback(() => {
    const peerEntries = Object.entries(peerProfiles);
    if (peerEntries.length === 0) {
      addLog("No connected peers to hand over host access to.", "err");
      return;
    }
    const [firstPeerId, firstPeer] = peerEntries[0];
    const targetName = (firstPeer as UserProfile)?.username || firstPeerId.substring(0, 8);

    const msg = JSON.stringify({
      type: 'host-handoff',
      newHostId: firstPeerId,
      newHostName: targetName,
      oldHostId: profile.id,
      oldHostName: profile.username,
      graceful: true
    });
    dataChannels.current.forEach(dc => {
      if (dc.readyState === 'open') {
        try { dc.send(msg); } catch(e) {}
      }
    });

    setRole('join');
    roleRef.current = 'join';
    setQrPayload("");
    setPasteBuffer("");
    setShowFailoverMenu(false);
    addLog(`🛡️ Graceful Host Drop: Stepped down and gave host authority to 1st joiner (${targetName}).`, "ok");
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: `🛡️ Graceful Host Drop: ${profile.username} gracefully stepped down. ${targetName} is now Authoritative Host.`,
      sender: 'system',
      timestamp: new Date()
    }]);
  }, [peerProfiles, profile, addLog]);

  const handleNetworkSplit = useCallback(() => {
    addLog("⚡ Network Partition Split test initiated", "info");
    addLog("Nexus Failover Quorum: Commits quarantined until majority consensus (>50%) re-establishes.", "ok");
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: "⚡ Network Split Test: Quorum consensus active. Sub-partition split handled safely.",
      sender: 'system',
      timestamp: new Date()
    }]);
  }, [addLog]);

  const [autoDownload, setAutoDownloadState] = useState(true);
  const autoDownloadRef = useRef(true);
  const setAutoDownload = (val: boolean) => {
    setAutoDownloadState(val);
    autoDownloadRef.current = val;
  };

  const [iosDownloadPrompt, setIosDownloadPrompt] = useState<{ blob: Blob | File; name: string; url: string } | null>(null);

  useEffect(() => {
    const handleIosDownload = (e: any) => {
      if (!e.detail || !e.detail.blob) return;
      const url = URL.createObjectURL(e.detail.blob);
      setIosDownloadPrompt({
        blob: e.detail.blob,
        name: e.detail.name,
        url
      });
      addLog(`File received: ${e.detail.name}. On iPadOS Safari, tap to save to Files.`, "ok");
    };

    window.addEventListener('nexus-ios-download-ready' as any, handleIosDownload);
    return () => {
      window.removeEventListener('nexus-ios-download-ready' as any, handleIosDownload);
    };
  }, [addLog]);
  
  const triggerTransferAnimation = useCallback(() => {
    setIsTransferring(true);
    setTimeout(() => setIsTransferring(false), 800);
  }, []);

  const resetAll = useCallback(() => {
    // Automatically turn off active call and clean up all media streams
    if (endCallRef.current) {
      endCallRef.current();
    }
    localConnectionRef.current?.close();
    localConnectionRef.current = null;
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    dataChannels.current.clear();
    setPeerProfiles({});
    setConnectedPeers(0);
    setStatus("offline");
    setQrPayload("");
    setPasteBuffer("");
    setTransfer(null);
    setFiles([]);
    setMessages([]);
    setLogs([]);
    setScannerType(null);
    setIsSimulation(false);
    addLog("All connections reset", "info");
  }, [addLog]);

  const toggleSimulation = useCallback((force = false) => {
    if (!isSimulation && status === "connected" && !force) {
      setShowSimWarning(true);
      return;
    }
    if (isSimulation) {
      // Automatically turn off active call and tear down simulation
      endCallRef.current?.();
      resetAll();
      addLog("Simulation ended: Call automatically turned off", "info");
    } else {
      setShowSimWarning(false);
      resetAll();
      setIsSimulation(true);
      setStatus("connected");
      setConnectedPeers(2);
      setRole("host");
      setPeerProfiles({
        "sim_peer_1": {
          id: "sim_peer_1",
          username: "Alpha (Sim)",
          avatarColor: "bg-blue-500",
          bio: "Simulation Node 1",
          joinedAt: new Date().toISOString()
        },
        "sim_peer_2": {
          id: "sim_peer_2",
          username: "Beta (Sim)",
          avatarColor: "bg-purple-500",
          bio: "Simulation Node 2",
          joinedAt: new Date().toISOString()
        }
      });
      addLog("Simulation Mode Enabled", "ok");
      
      setMessages([
        {
          id: "sim_msg_1",
          text: "Welcome to Simulation Mode! UI features are mocked.",
          sender: "system",
          timestamp: new Date()
        },
        {
          id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
          text: "Hello from the simulated network!",
          sender: "sim_peer_1",
          senderName: "Alpha (Sim)",
          senderColor: "bg-blue-500",
          timestamp: new Date()
        }
      ]);
      
      setFiles([
        {
           id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
           name: "Simulation_Report.txt",
           size: 1024 * 3,
           mimeType: 'text/plain',
           timestamp: new Date(),
           direction: 'in',
           senderName: "Beta (Sim)",
           senderColor: "bg-purple-500",
           senderId: "sim_peer_2",
           blob: new Blob(['=== QUANTUM LINK SIMULATION REPORT ===\n\nNetwork Status: SECURED\nNodes Connected: 4\nLatency: 12ms\nPacket Loss: 0.00%\nChannel Isolations: [nexus-chat], [nexus-file-transfer]\nDynamic Renegotiation: STABLE\n\nSimulation metrics indicate optimal multiplexing performance.'], { type: 'text/plain' })
        },
        {
           id: (Math.random().toString(36).substring(2) + (Date.now() + 1).toString(36)),
           name: "network_mesh_topology.svg",
           size: 1024 * 2,
           mimeType: 'image/svg+xml',
           timestamp: new Date(Date.now() - 30000),
           direction: 'in',
           senderName: "Alpha (Sim)",
           senderColor: "bg-blue-500",
           senderId: "sim_peer_1",
           blob: new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#grad)" rx="16"/>
  <line x1="200" y1="150" x2="100" y2="80" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4"/>
  <line x1="200" y1="150" x2="300" y2="80" stroke="#10b981" stroke-width="3"/>
  <line x1="200" y1="150" x2="200" y2="240" stroke="#f43f5e" stroke-width="2.5"/>
  <circle cx="200" cy="150" r="28" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
  <text x="200" y="155" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">YOU</text>
  <circle cx="100" cy="80" r="20" fill="#6366f1" stroke="#818cf8" stroke-width="2"/>
  <text x="100" y="84" fill="#ffffff" font-family="monospace" font-size="10" text-anchor="middle">HOST</text>
  <circle cx="300" cy="80" r="20" fill="#059669" stroke="#34d399" stroke-width="2"/>
  <text x="300" y="84" fill="#ffffff" font-family="monospace" font-size="10" text-anchor="middle">PEER</text>
  <circle cx="200" cy="240" r="20" fill="#e11d48" stroke="#fb7185" stroke-width="2"/>
  <text x="200" y="244" fill="#ffffff" font-family="monospace" font-size="10" text-anchor="middle">EDGE</text>
</svg>`], { type: 'image/svg+xml' })
        },
        {
           id: (Math.random().toString(36).substring(2) + (Date.now() + 2).toString(36)),
           name: "telemetry_matrix.json",
           size: 1024 * 1,
           mimeType: 'application/json',
           timestamp: new Date(Date.now() - 60000),
           direction: 'in',
           senderName: "Beta (Sim)",
           senderColor: "bg-purple-500",
           senderId: "sim_peer_2",
           blob: new Blob([JSON.stringify({
             nexusProtocol: "2.0-MULTIPLEXED",
             meshTopology: "DYNAMIC_P2P_BYPASS",
             channels: {
               chat: { label: "nexus-chat", ordered: true, status: "OPEN" },
               fileTransfer: { label: "nexus-file-transfer", backpressure: "SCTP_DRAIN", status: "OPEN" },
               mediaAV: { renegotiation: "PERFECT_NEGOTIATION", dynamicTracks: true }
             },
             virtualPeers: ["Atlas-Prime", "Vortex-9", "Cyber-Echo", "Nova-Core"],
             timestamp: new Date().toISOString()
           }, null, 2)], { type: 'application/json' })
        }
      ]);

      const dummyDc = {
         readyState: 'open',
         bufferedAmount: 0,
         bufferedAmountLowThreshold: 0,
         send: (data: any) => {
           console.log("[Simulation Send]:", data);
         },
         close: () => {}
      } as unknown as RTCDataChannel;

      dataChannels.current.set("sim_peer_1", dummyDc);
      peerIdToProfileId.current.set("sim_peer_1", "sim_peer_1");
    }
  }, [isSimulation, resetAll, addLog]);

  const disconnectPeer = useCallback((profileId: string) => {
    let peerIdToClose = profileId;
    // Find the peerId associated with this profileId if it's a direct connection
    for (const [pId, profId] of peerIdToProfileId.current.entries()) {
      if (profId === profileId) {
        peerIdToClose = pId;
        break;
      }
    }

    const pc = peerConnections.current.get(peerIdToClose);
    if (pc) pc.close();

    // Clean up remote stream and track state for this peer
    setRemoteStreams(prev => {
      const stream = prev[peerIdToClose];
      if (stream) {
        if ((stream as any)._simTimer) clearInterval((stream as any)._simTimer);
        if ((stream as any)._simAudioCtx) {
          try { (stream as any)._simAudioCtx.close().catch(() => {}); } catch (_) {}
        }
        stream.getTracks?.().forEach(t => t.stop());
        const next = { ...prev };
        delete next[peerIdToClose];
        return next;
      }
      return prev;
    });
    delete remoteStreamsRef.current[peerIdToClose];
    setPeerTrackStates(prev => {
      const next = { ...prev };
      delete next[peerIdToClose];
      return next;
    });

    setIncomingCall(curr => {
      if (curr && (curr.peerId === peerIdToClose || curr.callerId === profileId)) {
        stopRingChime();
        return null;
      }
      return curr;
    });
    
    setPeerProfiles(prev => {
      const p = prev[profileId];
      if (p) {
        setMessages(msgs => [...msgs, {
          id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
          text: `PEER KICKED: ${p.username}`,
          sender: 'system',
          timestamp: new Date()
        }]);
        addLog(`Tunnel force-closed [${p.username}]`, "err");
        
        // Notify others if host
        if (roleRef.current === 'host') {
          dataChannels.current.forEach((dc, pid) => {
            if (pid !== peerIdToClose && dc.readyState === 'open') {
              dc.send(JSON.stringify({ type: 'peer-left', name: p.username, id: profileId }));
            }
          });
        }
      }
      
      const next = { ...prev };
      delete next[profileId];
      return next;
    });
    
    dataChannels.current.delete(peerIdToClose);
    peerConnections.current.delete(peerIdToClose);
    peerIdToProfileId.current.delete(peerIdToClose);
    
    setConnectedPeers(dataChannels.current.size);
    if (dataChannels.current.size === 0) {
      setStatus("offline");
      if (isCallActiveRef.current || localStreamRef.current) {
        endCallRef.current?.();
        addLog("Call automatically ended: Disconnected from peer", "info");
      }
    }
  }, [addLog, stopRingChime]);

  const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      dataChannels.current.set(peerId, channel);
      setConnectedPeers(dataChannels.current.size);
      setStatus("connected");
      // Clear one-time handshake QR code and buffer upon successful connection
      setQrPayload("");
      setPasteBuffer("");
      channel.send(JSON.stringify({ 
        type: 'identity', 
        profile: profile
      }));
    };

    channel.onerror = (err) => {
      console.warn("RTCDataChannel transport error:", err);
      if (transferRef.current) {
        handleTransferFailure("WebRTC transport error", peerId, transferRef.current.name, false);
      }
    };

    channel.onclose = () => {
      if (transferRef.current) {
        handleTransferFailure("Peer connection lost during active transfer", peerId, transferRef.current.name, false);
      }
      dataChannels.current.delete(peerId);
      const profId = peerIdToProfileId.current.get(peerId);
      peerIdToProfileId.current.delete(peerId);

      // Clean up remote stream and track state for this leaving peer
      setRemoteStreams(prev => {
        const stream = prev[peerId];
        if (stream) {
          if ((stream as any)._simTimer) clearInterval((stream as any)._simTimer);
          if ((stream as any)._simAudioCtx) {
            try { (stream as any)._simAudioCtx.close().catch(() => {}); } catch (_) {}
          }
          stream.getTracks?.().forEach(t => t.stop());
          const next = { ...prev };
          delete next[peerId];
          return next;
        }
        return prev;
      });
      delete remoteStreamsRef.current[peerId];
      setPeerTrackStates(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });

      // Clear ringing incoming call if it was from this peer
      setIncomingCall(curr => {
        if (curr && curr.peerId === peerId) {
          stopRingChime();
          return null;
        }
        return curr;
      });
      
      setConnectedPeers(dataChannels.current.size);
      if (dataChannels.current.size === 0) {
        setStatus("offline");
        // Automatically turn off call when all live peers disconnect
        if (isCallActiveRef.current || localStreamRef.current) {
          endCallRef.current?.(false);
          addLog("Call automatically ended: All peers disconnected", "info");
        }
      }
      
      setPeerProfiles(prev => {
        const idToRemove = profId || peerId;
        const p = prev[idToRemove];
        if (p) {
          addLog(`Tunnel closed [${p.username}]`, "err");
          
          if (roleRef.current === 'host') {
            dataChannels.current.forEach((dc, otherId) => {
              if (otherId !== peerId && dc.readyState === 'open') {
                dc.send(JSON.stringify({ type: 'peer-left', name: p.username, id: idToRemove }));
              }
            });
          }
        }
        
        const next = { ...prev };
        delete next[idToRemove];
        return next;
      });
      peerConnections.current.delete(peerId);

      // Automated Heir Succession when host disconnects:
      if (dataChannels.current.size === 0) {
        // No remaining live peer connections left on this node
        if (roleRef.current === 'join') {
          addLog("⚠️ Nexus Failover: All connections closed. Reverting to Host node...", "info");
          setRole('host');
          roleRef.current = 'host';
          setQrPayload("");
          setPasteBuffer("");
          setTimeout(() => {
            createHostOfferRef.current?.();
          }, 150);
        }
      } else {
        // Direct mesh data channels to remaining peer(s) ARE STILL ALIVE!
        // Deterministically elect one host among the surviving peers so that surviving peers stay connected
        const remainingProfIds = Array.from(peerIdToProfileId.current.values());
        const allSurviving = [profile.id, ...remainingProfIds].filter((id, i, arr) => arr.indexOf(id) === i).sort();
        
        if (roleRef.current === 'join') {
          if (allSurviving[0] === profile.id) {
            // This node is deterministically elected the new Authoritative Host
            setRole('host');
            roleRef.current = 'host';
            addLog("👑 Nexus Failover: Host disconnected abruptly. You have assumed Host authority! Direct mesh link with remaining peer(s) maintained.", "ok");
            setMessages(msgs => [...msgs, {
              id: Date.now().toString(),
              text: "🛡️ Nexus Failover: Host disconnected abruptly. You have assumed Authoritative Host status! Direct mesh connection with remaining peer(s) preserved.",
              sender: 'system',
              timestamp: new Date()
            }]);
            dataChannels.current.forEach((dc) => {
              if (dc.readyState === 'open') {
                dc.send(JSON.stringify({ type: 'host-handoff', newHostId: profile.id, newHostName: profile.username }));
              }
            });
            setTimeout(() => {
              createHostOfferRef.current?.();
            }, 150);
          } else {
            // Another surviving peer is the new Host; this node remains a joiner connected to them!
            addLog("🛡️ Nexus Failover: Host disconnected abruptly. Connection with peer maintained via direct mesh.", "info");
            setMessages(msgs => [...msgs, {
              id: Date.now().toString(),
              text: "🛡️ Nexus Failover: Host disconnected abruptly. Direct peer-to-peer connection with remaining peer(s) maintained!",
              sender: 'system',
              timestamp: new Date()
            }]);
          }
        }
      }
    };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'identity') {
            setPeerProfiles(prev => {
              const peerProfile = data.profile as UserProfile;
              let actualName = peerProfile.username;
              const existingProfiles = Object.values(prev) as UserProfile[];
              
              // Only apply name conflict resolution if it's a DIFFERENT person with the same name
              let postfix = 1;
              while (existingProfiles.some((p: UserProfile) => p.username === actualName && p.id !== peerProfile.id)) {
                actualName = `${peerProfile.username} (${postfix})`;
                postfix++;
              }
              
              const finalProfile = { ...peerProfile, username: actualName };
              peerIdToProfileId.current.set(peerId, finalProfile.id);

              try {
                const list = JSON.parse(localStorage.getItem('quantum_saved_peers') || '[]');
                const existingIdx = list.findIndex((p: any) => p.id === finalProfile.id);
                if (existingIdx !== -1) {
                  list[existingIdx] = finalProfile;
                } else {
                  list.push(finalProfile);
                }
                localStorage.setItem('quantum_saved_peers', JSON.stringify(list));
              } catch(e) {}

              setMessages(msgs => [...msgs, {
                id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
                text: `PEER CONNECTED: ${actualName}`,
                sender: 'system',
                timestamp: new Date()
              }]);
              addLog(`Tunnel established [${actualName}]`, "ok");
              
              const updatedProfiles = { ...prev, [finalProfile.id]: finalProfile };
              
              // Host relays new peer to existing peers and triggers mesh peer-to-peer connection
              if (roleRef.current === 'host') {
                dataChannels.current.forEach((dc, otherId) => {
                  if (otherId !== peerId && dc.readyState === 'open') {
                    dc.send(JSON.stringify({ type: 'peer-joined', profile: finalProfile }));
                    // Prompt existing peer to initiate direct mesh connection to the newly joined peer!
                    dc.send(JSON.stringify({ 
                      type: 'mesh-initiate', 
                      targetProfile: finalProfile,
                      targetProfileId: finalProfile.id
                    }));
                  }
                });
                // Send existing profiles to new peer
                Object.values(updatedProfiles).forEach((otherProf: any) => {
                  if (otherProf.id !== finalProfile.id) {
                    channel.send(JSON.stringify({ type: 'peer-joined', profile: otherProf }));
                  }
                });
              }

              return updatedProfiles;
            });
          } else if (data.type === 'peer-joined') {
            const joinedProfile = data.profile as UserProfile;
            let actualName = joinedProfile.username;
            let postfix = 1;
            setPeerProfiles(prev => {
              const prevVals = Object.values(prev);
              while (prevVals.some((p: UserProfile) => p.username === actualName && p.id !== joinedProfile.id)) {
                actualName = `${joinedProfile.username} (${postfix})`;
                postfix++;
              }
              joinedProfile.username = actualName;
              
              try {
                const list = JSON.parse(localStorage.getItem('quantum_saved_peers') || '[]');
                const existingIdx = list.findIndex((p: any) => p.id === joinedProfile.id);
                if (existingIdx !== -1) {
                  list[existingIdx] = joinedProfile;
                } else {
                  list.push(joinedProfile);
                }
                localStorage.setItem('quantum_saved_peers', JSON.stringify(list));
              } catch(e) {}
              
              return { ...prev, [joinedProfile.id]: joinedProfile };
            });
            setMessages(prev => [...prev, {
              id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
              text: `PEER CONNECTED: ${actualName}`,
              sender: 'system',
              timestamp: new Date()
            }]);
          } else if (data.type === 'peer-left') {
            setMessages(prev => [...prev, {
              id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
              text: `PEER DISCONNECTED: ${data.name}`,
              sender: 'system',
              timestamp: new Date()
            }]);
            setPeerProfiles(prev => {
              const next = { ...prev };
              delete next[data.id];
              return next;
            });
          } else if (data.type === 'host-handoff') {
            if (data.newHostId === profile.id) {
              setRole('host');
              roleRef.current = 'host';
              // Immediately clear old joiner answer QR payload so it's never displayed as an invalid host offer
              setQrPayload("");
              setPasteBuffer("");
              addLog(`👑 Host Authority Transferred: You are now the Authoritative Host!`, "ok");
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `👑 Nexus Failover: Host authority handed over to you by ${data.oldHostName}!`,
                sender: 'system',
                timestamp: new Date()
              }]);
              // Automatically generate fresh, valid Host Offer QR code for new joiners
              setTimeout(() => {
                createHostOfferRef.current?.();
              }, 150);
            } else {
              addLog(`👑 Host authority transferred to ${data.newHostName}`, "info");
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `👑 Nexus Failover: Host authority transferred to ${data.newHostName}.`,
                sender: 'system',
                timestamp: new Date()
              }]);
            }
          } else if (data.type === 'profile-update') {
            const updatedProfile = data.profile;
            setPeerProfiles(prev => ({ ...prev, [updatedProfile.id]: updatedProfile }));
            try {
              const list = JSON.parse(localStorage.getItem('quantum_saved_peers') || '[]');
              const existingIdx = list.findIndex((p: any) => p.id === updatedProfile.id);
              if (existingIdx !== -1) {
                list[existingIdx] = updatedProfile;
              } else {
                list.push(updatedProfile);
              }
              localStorage.setItem('quantum_saved_peers', JSON.stringify(list));
            } catch(e) {}
            if (roleRef.current === 'host') {
              dataChannels.current.forEach((dc, otherId) => {
                if (otherId !== peerId && dc.readyState === 'open') {
                  dc.send(JSON.stringify({ type: 'profile-update', profile: updatedProfile }));
                }
              });
            }
          } else if (data.type === 'chat') {
            setMessages(prev => {
              if (data.id && prev.some(m => m.id === data.id)) return prev;
              return [...prev, {
                id: data.id || (Math.random().toString(36).substring(2) + Date.now().toString(36)),
                text: data.text,
                audioData: data.audioData,
                sender: 'them',
                senderName: data.senderName,
                senderColor: data.senderColor,
                senderAvatar: data.senderAvatar || (data.senderId ? peerProfiles[data.senderId]?.avatarImage : undefined),
                senderId: data.senderId,
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
              }];
            });
            
            setUnreadChatCount(prev => activeTabRef.current !== 'chat' ? prev + 1 : 0);
            if (roleRef.current === 'host') {
              dataChannels.current.forEach((dc, otherId) => {
                if (otherId !== peerId && dc.readyState === 'open') {
                  dc.send(event.data);
                }
              });
            }
          } else if (data.type === 'chat-chunk') {
            if (roleRef.current === 'host') {
              dataChannels.current.forEach((dc, otherId) => {
                if (otherId !== peerId && dc.readyState === 'open') {
                  dc.send(event.data);
                }
              });
            }
            const { msgId, index, total, chunk } = data;
            if (!chatChunkBuffers.current[msgId]) {
              chatChunkBuffers.current[msgId] = {
                chunks: new Array(total).fill(null),
                count: 0,
                total
              };
            }
            const buffer = chatChunkBuffers.current[msgId];
            if (buffer.chunks[index] === null) {
              buffer.chunks[index] = chunk;
              buffer.count++;
            }
            if (buffer.count === buffer.total) {
              const fullJson = buffer.chunks.join('');
              delete chatChunkBuffers.current[msgId];
              try {
                const fullData = JSON.parse(fullJson);
                setMessages(prev => [...prev, {
                  id: fullData.id || (Math.random().toString(36).substring(2) + Date.now().toString(36)),
                  text: fullData.text,
                  audioData: fullData.audioData,
                  sender: 'them',
                  senderName: fullData.senderName,
                  senderColor: fullData.senderColor,
                  senderAvatar: fullData.senderAvatar || (fullData.senderId ? peerProfiles[fullData.senderId]?.avatarImage : undefined),
                  senderId: fullData.senderId,
                  timestamp: fullData.timestamp ? new Date(fullData.timestamp) : new Date()
                }]);
                setUnreadChatCount(prev => activeTabRef.current !== 'chat' ? prev + 1 : 0);
              } catch (e) {
                console.error("Failed to parse reconstructed chat JSON", e);
              }
            }
          } else if (data.type === 'file-meta') {
            // Direct Downloads: Prompts receiver's browser immediately to download to disk (bypasses RAM & drop zone sandbox)
            if (data.bypassRam) {
              addLog(`Direct download requested for ${data.name}. Prompting browser to download...`, "info");
              setIncomingDirectPrompt({
                peerId,
                meta: data
              });
              if (roleRef.current === 'host') {
                dataChannels.current.forEach((dc, otherId) => {
                  if (otherId !== peerId && dc.readyState === 'open') {
                    try { dc.send(event.data); } catch (_) {}
                  }
                });
              }
              return;
            }

            const bufferRef: any = { 
              metadata: data, 
              receivedSize: 0, 
              chunks: [],
              fileHandle: null,
              writable: null,
              isWriting: false,
              isDirectDisk: false
            };
            
            if (navigator.storage && navigator.storage.getDirectory) {
              navigator.storage.getDirectory().then(async root => {
                try {
                  const safeName = data.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                  const fh = await root.getFileHandle(`transfer-${Date.now()}-${safeName}`, { create: true });
                  bufferRef.fileHandle = fh;
                  bufferRef.writable = await fh.createWritable();
                } catch(e) {
                  console.warn("OPFS setup failed:", e);
                }
              }).catch(() => {});
            }

            fileBuffers.current.set(peerId, bufferRef);
            setTransfer({ 
              name: data.name, 
              progress: 0, 
              type: 'receiving',
              peerUsername: data.senderName || peerProfiles[peerId]?.username || 'Unknown',
              transferredBytes: 0,
              totalBytes: data.size
            });
            addLog(`Incoming payload: ${data.name}`, "info");
            if (roleRef.current === 'host') {
              dataChannels.current.forEach((dc, otherId) => {
                if (otherId !== peerId && dc.readyState === 'open') {
                  dc.send(event.data);
                }
              });
            }
          } else if (data.type === 'file-download-accepted') {
            addLog(`Receiver clicked download for ${data.name}! Transmitting direct disk stream...`, "ok");
            if (pendingDirectSendRef.current && pendingDirectSendRef.current.file.name === data.name) {
              setTransfer(prev => prev ? { ...prev, isWaitingForReceiver: false, statusMessage: undefined } : null);
              pendingDirectSendRef.current.startSend();
              pendingDirectSendRef.current = null;
            }
          } else if (data.type === 'file-download-declined') {
            addLog(`Transfer cancelled: Receiver declined download prompt for ${data.name}`, "err");
            cancelTransferRef.current = true;
            setTransfer(null);
            pendingDirectSendRef.current = null;
            await cleanupBuffersAndCache(data.name, peerId);
          } else if (data.type === 'transfer-failed') {
            const failReason = data.reason || 'Remote peer encountered an error';
            const who = data.failedBy === 'sender' ? 'Sender' : data.failedBy === 'receiver' ? 'Receiver' : 'Peer';
            addLog(`Transfer failed for "${data.fileName || 'file'}": ${failReason} (${who})`, "err");
            cancelTransferRef.current = true;
            pendingDirectSendRef.current = null;
            setIncomingDirectPrompt(null);
            setTransfer(null);
            await cleanupBuffersAndCache(data.fileName, peerId);
          } else if (data.type === 'transfer-cancel') {
            addLog("Transfer cancelled by peer - temporary cache purged", "err");
            cancelTransferRef.current = true;
            pendingDirectSendRef.current = null;
            setIncomingDirectPrompt(null);
            setTransfer(null);
            await cleanupBuffersAndCache(undefined, peerId);
          } else if (data.type === 'call-invite') {
            addLog(data.isScreenMirror ? `Incoming screen broadcast from ${data.callerName || 'peer'}` : `Incoming ${data.callType} call from ${data.callerName || 'peer'}`, "info");
            setIncomingCall({
              peerId,
              callerName: data.callerName || peerProfiles[peerId]?.username || 'Peer',
              callerAvatar: data.callerAvatar || peerProfiles[peerId]?.avatarImage,
              callerColor: data.callerColor || peerProfiles[peerId]?.avatarColor,
              callType: data.callType || 'video',
              isScreenMirror: data.isScreenMirror,
              sdp: data.sdp
            });
            playRingChime();
          } else if (data.type === 'call-answer') {
            const pc = peerConnections.current.get(peerId);
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                addLog("Direct encrypted media tunnel connected!", "ok");
              } catch (e) {
                console.error("Error setting remote description on call-answer:", e);
              }
            }
          } else if (data.type === 'call-decline') {
            addLog(`Call declined by ${data.by || 'peer'}`, "err");
            const pc = peerConnections.current.get(peerId);
            if (pc) {
              if (data.sdp) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } catch (e) {
                  console.warn("Setting decline remote answer failed:", e);
                }
              }
              if (pc.signalingState === 'have-local-offer' && pc.localDescription?.sdp) {
                try {
                  const rejectSdp = createRejectAnswerSdp(pc.localDescription.sdp);
                  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: rejectSdp }));
                } catch (e) {
                  console.warn("Fallback reject answer on decline failed:", e);
                }
              }
            }
            endCallRef.current?.(false);
          } else if (data.type === 'screen-share-state') {
            setCallType('video');
            if (data.sharing) {
              setScreenSharingPeers(prev => ({ 
                ...prev, 
                [peerId]: true,
                ...(data.peerId ? { [data.peerId]: true } : {})
              }));
              setPeerTrackStates(prev => ({
                ...prev,
                [peerId]: { ...prev[peerId], video: true },
                ...(data.peerId ? { [data.peerId]: { ...prev[data.peerId], video: true } } : {})
              }));
              setIsCallActive(true);
              setIsCallMinimized(false);
              setRemoteStreams(prev => {
                if (prev[peerId]) {
                  return { ...prev, [peerId]: new MediaStream(prev[peerId].getTracks()) };
                }
                return prev;
              });
              addLog(`${data.username || 'Peer'} started sharing their screen`, "ok");
            } else {
              setScreenSharingPeers(prev => {
                const next = { ...prev };
                delete next[peerId];
                if (data.peerId) delete next[data.peerId];
                return next;
              });
              addLog(`${data.username || 'Peer'} stopped sharing their screen`, "info");
            }
          } else if (data.type === 'call-track-state') {
            setPeerTrackStates(prev => ({
              ...prev,
              [peerId]: {
                ...prev[peerId],
                [data.kind]: data.enabled
              }
            }));
          } else if (data.type === 'call-end') {
            addLog("Call ended by peer", "info");
            endCallRef.current?.(false);
          } else if (data.type === 'ice-candidate') {
            const pc = peerConnections.current.get(peerId);
            if (pc && data.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.warn("ICE candidate error:", e);
              }
            }
          } else if (data.type === 'media-offer') {
            setCallType('video');
            const pc = peerConnections.current.get(peerId);
            if (pc) {
              try {
                if (pc.signalingState !== 'stable') {
                  try { await pc.setLocalDescription({ type: 'rollback' }); } catch (_) {}
                }
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await waitForIce(pc);
                const dc = dataChannels.current.get(peerId);
                if (dc && dc.readyState === 'open') {
                  dc.send(JSON.stringify({ type: 'media-answer', sdp: pc.localDescription }));
                }
              } catch (e) {
                console.error("media-offer error:", e);
              }
            }
          } else if (data.type === 'media-answer') {
            const pc = peerConnections.current.get(peerId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
          } else if (data.type === 'mesh-initiate') {
            const targetProf = data.targetProfile;
            const targetId = data.targetProfileId || targetProf?.id;
            if (!targetId || targetId === profile.id) return;
            const meshConnId = `mesh_${targetId}`;
            if (peerConnections.current.has(meshConnId)) return;

            addLog(`Establishing direct mesh link to ${targetProf?.username || 'peer'}...`, "info");
            const createPeerFn = createPeerRef.current;
            const waitForIceFn = waitForIceRef.current;
            if (!createPeerFn || !waitForIceFn) return;

            const pc = createPeerFn(meshConnId, false);
            const dc = pc.createDataChannel('nexus-transfer');
            setupDataChannel(dc, meshConnId);

            pc.onicecandidate = (event) => {
              if (event.candidate && channel.readyState === 'open') {
                channel.send(JSON.stringify({
                  type: 'mesh-signal',
                  targetProfileId: targetId,
                  senderProfileId: profile.id,
                  candidate: event.candidate
                }));
              }
            };

            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await waitForIceFn(pc);
              if (channel.readyState === 'open' && pc.localDescription) {
                channel.send(JSON.stringify({
                  type: 'mesh-signal',
                  targetProfileId: targetId,
                  senderProfileId: profile.id,
                  senderProfile: profile,
                  sdp: pc.localDescription
                }));
              }
            } catch (err) {
              console.error("Failed to initiate mesh offer:", err);
            }
          } else if (data.type === 'mesh-signal') {
            if (roleRef.current === 'host') {
              // Host routes signal to target peer's data channel
              const targetProfId = data.targetProfileId;
              for (const [pId, dc] of dataChannels.current.entries()) {
                const profId = peerIdToProfileId.current.get(pId);
                if (profId === targetProfId && dc.readyState === 'open') {
                  dc.send(event.data);
                  break;
                }
              }
            } else {
              // Joiner processes mesh signal
              const senderProfId = data.senderProfileId;
              if (!senderProfId || senderProfId === profile.id) return;
              const meshConnId = `mesh_${senderProfId}`;
              const createPeerFn = createPeerRef.current;
              const waitForIceFn = waitForIceRef.current;

              if (data.sdp) {
                if (data.sdp.type === 'offer') {
                  let pc = peerConnections.current.get(meshConnId);
                  if (!pc && createPeerFn) {
                    pc = createPeerFn(meshConnId, false);
                  }
                  if (pc) {
                    pc.onicecandidate = (event) => {
                      if (event.candidate && channel.readyState === 'open') {
                        channel.send(JSON.stringify({
                          type: 'mesh-signal',
                          targetProfileId: senderProfId,
                          senderProfileId: profile.id,
                          candidate: event.candidate
                        }));
                      }
                    };
                    try {
                      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                      const answer = await pc.createAnswer();
                      await pc.setLocalDescription(answer);
                      if (waitForIceFn) await waitForIceFn(pc);
                      if (channel.readyState === 'open' && pc.localDescription) {
                        channel.send(JSON.stringify({
                          type: 'mesh-signal',
                          targetProfileId: senderProfId,
                          senderProfileId: profile.id,
                          senderProfile: profile,
                          sdp: pc.localDescription
                        }));
                      }
                      addLog(`Direct mesh link established to ${data.senderProfile?.username || 'peer'}!`, "ok");
                    } catch (err) {
                      console.error("Failed to answer mesh offer:", err);
                    }
                  }
                } else if (data.sdp.type === 'answer') {
                  const pc = peerConnections.current.get(meshConnId);
                  if (pc) {
                    try {
                      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                      addLog(`Direct mesh link established to peer!`, "ok");
                    } catch (err) {
                      console.error("Failed to apply mesh answer:", err);
                    }
                  }
                }
              } else if (data.candidate) {
                const pc = peerConnections.current.get(meshConnId);
                if (pc) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                  } catch (err) {
                    console.warn("Mesh ICE candidate error:", err);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse message", e);
        }
      } else {
        const buffer = fileBuffers.current.get(peerId);
        if (buffer) {
          buffer.receivedSize += event.data.byteLength;

          if (buffer.isDirectDisk) {
            // Direct disk streaming without keeping in RAM
            if (buffer.writer) {
              buffer.chunks.push(event.data);
              if (!buffer.isWriting) {
                buffer.isWriting = true;
                (async () => {
                  try {
                    while (buffer.chunks.length > 0) {
                      const chunk = buffer.chunks.shift();
                      if (chunk) {
                        await buffer.writer.write(chunk);
                      }
                    }
                    if (buffer.receivedSize >= buffer.metadata.size && buffer.chunks.length === 0) {
                      const finalFileOrBlob = await buffer.writer.close();
                      triggerTransferAnimation();
                      addLog(`Direct download complete: ${buffer.metadata.name} (${buffer.writer.mode.toUpperCase()} disk stream complete)`, "ok");
                      finishFileReceive(buffer, finalFileOrBlob);
                    }
                  } catch (streamErr: any) {
                    await handleTransferFailure(`Direct disk stream failed: ${streamErr?.message || streamErr}`, peerId, buffer.metadata?.name, true);
                  } finally {
                    buffer.isWriting = false;
                  }
                })();
              }
            } else if (buffer.writable) {
              buffer.chunks.push(event.data);
              if (!buffer.isWriting) {
                buffer.isWriting = true;
                (async () => {
                  try {
                    while (buffer.chunks.length > 0) {
                      const chunk = buffer.chunks.shift();
                      await buffer.writable.write(chunk);
                    }
                    if (buffer.receivedSize >= buffer.metadata.size && buffer.chunks.length === 0) {
                      await buffer.writable.close();
                      triggerTransferAnimation();
                      addLog(`Direct download complete: ${buffer.metadata.name} saved directly to disk (RAM & drop zone sandbox bypassed)`, "ok");
                      finishFileReceive(buffer, null);
                    }
                  } catch (diskErr: any) {
                    await handleTransferFailure(`Direct disk write failed: ${diskErr?.message || diskErr}`, peerId, buffer.metadata?.name, true);
                  } finally {
                    buffer.isWriting = false;
                  }
                })();
              }
            } else {
              // Fallback on browsers without showSaveFilePicker or OPFS: assemble for immediate direct download without sandboxing in drop zone
              buffer.chunks.push(event.data);
              if (buffer.receivedSize >= buffer.metadata.size) {
                try {
                  triggerTransferAnimation();
                  const blob = new Blob(buffer.chunks, { type: buffer.metadata.mimeType });
                  buffer.chunks = [];
                  finishFileReceive(buffer, blob);
                } catch (memErr: any) {
                  await handleTransferFailure(`Memory assembly failed: ${memErr?.message || memErr}`, peerId, buffer.metadata?.name, true);
                }
              }
            }
          } else {
            buffer.chunks.push(event.data);

            if (buffer.writable && !buffer.isWriting) {
              buffer.isWriting = true;
              (async () => {
                try {
                  while(buffer.chunks.length > 0) {
                    const chunk = buffer.chunks.shift();
                    await buffer.writable.write(chunk);
                  }
                  
                  if (buffer.receivedSize >= buffer.metadata.size && buffer.chunks.length === 0) {
                    await buffer.writable.close();
                    const blob = await buffer.fileHandle.getFile();
                    finishFileReceive(buffer, blob);
                  }
                } catch (writeErr: any) {
                  await handleTransferFailure(`Storage write failed: ${writeErr?.message || writeErr}`, peerId, buffer.metadata?.name, true);
                } finally {
                  buffer.isWriting = false;
                }
              })();
            }
          }

          const now = Date.now();
          if (now - lastUpdateRef.current > 150 || buffer.receivedSize >= buffer.metadata.size) {
            const progress = Math.round((buffer.receivedSize / buffer.metadata.size) * 100);
            setTransfer(prev => prev ? { ...prev, progress, transferredBytes: buffer.receivedSize } : null);
            lastUpdateRef.current = now;
          }
          
          if (roleRef.current === 'host') {
            dataChannels.current.forEach((dc, otherId) => {
              if (otherId !== peerId && dc.readyState === 'open') {
                try {
                  dc.send(event.data);
                } catch (_) {}
              }
            });
          }

          if (!buffer.isDirectDisk && !buffer.writable && buffer.receivedSize >= buffer.metadata.size && !buffer.isFinished) {
            buffer.isFinished = true;
            try {
              triggerTransferAnimation();
              const blob = new Blob(buffer.chunks, { type: buffer.metadata.mimeType });
              buffer.chunks = [];
              finishFileReceive(buffer, blob);
            } catch (blobErr: any) {
              await handleTransferFailure(`Payload assembly failed: ${blobErr?.message || blobErr}`, peerId, buffer.metadata?.name, true);
            }
          }
        }
      }
    };

    const finishFileReceive = (buffer: any, blob: Blob | null) => {
      const name = buffer.metadata.name;
      const size = buffer.metadata.size;
      const senderName = buffer.metadata.senderName || "Unknown Node";
      const senderColor = buffer.metadata.senderColor || "bg-muted";
      const senderId = buffer.metadata.senderId;
      const isDirectDisk = buffer.isDirectDisk;
      const mimeType = buffer.metadata.mimeType || 'application/octet-stream';
      const finalBlob = blob || new Blob([], { type: mimeType });
      
      // Bypass RAM / Direct disk downloads do NOT sandbox the file in the file drop zone!
      if (!isDirectDisk) {
        const fileId = (Math.random().toString(36).substring(2) + Date.now().toString(36));
        storeFileInSandboxCache(
          fileId,
          name,
          finalBlob,
          mimeType,
          { senderName, senderId: senderId || '', direction: 'in' }
        ).then(({ cacheUrl }) => {
          setFiles(prev => {
            const next: FilePayload[] = [{
              id: fileId,
              name,
              blob: finalBlob,
              size,
              senderName,
              senderColor,
              senderId,
              timestamp: new Date(),
              direction: 'in',
              cacheUrl,
              mimeType
            }, ...prev];
            try {
              localStorage.setItem('nexus_sandbox_files', JSON.stringify(
                next.map(({ blob: _, ...rest }) => rest)
              ));
            } catch (_) {}
            return next;
          });
          getCacheSizeMB().then(setCacheSizeMB);
        }).catch(err => {
          console.warn("Failed to cache incoming sandbox file:", err);
          setFiles(prev => [{
            id: fileId,
            name,
            blob: finalBlob,
            size,
            senderName,
            senderColor,
            senderId,
            timestamp: new Date(),
            direction: 'in',
            mimeType
          }, ...prev]);
        });
      }
      
      setMessages(prev => [...prev, {
        id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
        text: `📁 Received: ${name}${isDirectDisk ? ' (Downloaded directly to disk — Bypassed RAM & drop zone sandbox)' : ''}`,
        sender: 'system',
        timestamp: new Date()
      }]);
      
      setTransfer(null);
      fileBuffers.current.delete(peerId);
      addLog(`Payload received: ${name}${isDirectDisk ? ' (Saved directly to disk — Not sandboxed in drop zone)' : ''}`, "ok");
      
      // Auto-download to browser folder
      if (isDirectDisk && blob) {
        triggerBrowserFileDownload(blob, name);
      } else if (!isDirectDisk && autoDownloadRef.current && blob) {
        triggerBrowserFileDownload(blob, name);
      }
    };
  }, [addLog]);

  const createPeer = useCallback((id: string, useStun: boolean = true) => {
    const pc = new RTCPeerConnection({
      iceServers: useStun ? [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ] : [],
      iceCandidatePoolSize: useStun ? 2 : 0,
    });
    peerConnections.current.set(id, pc);
    
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        pc.close();
        if (transferRef.current) {
          handleTransferFailure("WebRTC peer connection lost", id, transferRef.current.name, false);
        }
        if (dataChannels.current.size === 0 && (isCallActiveRef.current || localStreamRef.current)) {
          endCallRef.current?.(false);
          addLog("Call automatically ended: Peer connection lost", "info");
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const dc = dataChannels.current.get(id);
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
        }
      }
    };

    pc.ondatachannel = (event) => setupDataChannel(event.channel, id);

    pc.ontrack = (event) => {
      const track = event.track;
      addLog(`Received incoming media stream track (${track.kind})`, "ok");
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        setRemoteStreams(prev => {
          return { ...prev, [id]: new MediaStream(stream.getTracks()) };
        });
      } else {
        setRemoteStreams(prev => {
          const currentStream = prev[id];
          if (currentStream) {
            if (!currentStream.getTracks().some(t => t.id === track.id)) {
              currentStream.addTrack(track);
            }
            return { ...prev, [id]: new MediaStream(currentStream.getTracks()) };
          }
          return { ...prev, [id]: new MediaStream([track]) };
        });
      }
    };

    if (!id.startsWith('mesh_')) {
      localConnectionRef.current = pc;
    }
    return pc;
  }, [setupDataChannel, addLog]);

  useEffect(() => {
    createPeerRef.current = createPeer;
  }, [createPeer]);

  const waitForIce = useCallback((pc: RTCPeerConnection) => new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    // When offline or on local LAN airgap, host candidates gather in <600ms; resolve promptly without blocking on unreachable STUN servers
    const timeout = typeof navigator !== 'undefined' && !navigator.onLine ? 800 : 2500;
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, timeout);
  }), []);

  useEffect(() => {
    waitForIceRef.current = waitForIce;
  }, [waitForIce]);

  const createHostOffer = useCallback(async () => {
    const id = (Math.random().toString(36).substring(2) + Date.now().toString(36));
    setQrPayload("");
    setPasteBuffer("");

    if (connectedCount === 0) setStatus("handshaking");

    try {
      // QR code generation by host does not connect to STUN servers
      const pc = createPeer(id, false);
      const dc = pc.createDataChannel('nexus-transfer');
      setupDataChannel(dc, id);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      addLog("Generating matrix offer...", "info");
      await waitForIce(pc);

      if (!pc.localDescription) {
        addLog("Failed to gather ICE candidates for offer", "err");
        return;
      }

      const compressed = await encodeCompactSDP(pc.localDescription);
      setQrPayload(compressed);
      addLog("Offer ready. Peer sync required.", "ok");
    } catch (err: any) {
      addLog(`Failed to create host offer: ${err?.message || err}`, "err");
    }
  }, [createPeer, setupDataChannel, connectedCount, addLog]);

  useEffect(() => {
    createHostOfferRef.current = createHostOffer;
  }, [createHostOffer]);

  const handleReceivedOffer = async (input: string) => {
    if (!input) return;
    try {
      const sdpString = await decodeCompactSDP(input);
      const parsedSdp = JSON.parse(sdpString);

      if (!parsedSdp || typeof parsedSdp !== 'object') {
        throw new Error("Malformed protocol descriptor object");
      }

      if (parsedSdp.type !== 'offer') {
        addLog(`Invalid offer: Received descriptor of type "${parsedSdp.type}". Scan a Host Offer QR code.`, "err");
        return;
      }

      const id = (Math.random().toString(36).substring(2) + Date.now().toString(36));
      // Joiner does not connect to STUN servers in offline/airgapped or LAN scenarios
      const pc = createPeer(id, false);
      
      await pc.setRemoteDescription(parsedSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      setStatus("handshaking");
      addLog("Offer synced, generating response matrix...", "info");
      await waitForIce(pc);
      
      if (!pc.localDescription) {
        throw new Error("Failed to produce answer local description");
      }

      const compressed = await encodeCompactSDP(pc.localDescription);
      setQrPayload(compressed);
      addLog("Response generated. Finalize handshake at host.", "ok");
    } catch (e: any) {
      addLog(`Corrupt or invalid offer payload: ${e?.message || e}`, "err");
    }
  };

  const handleReceivedAnswer = async (input?: string) => {
    const sdp = input || pasteBuffer;
    if (!sdp || !localConnectionRef.current) return;
    
    try {
      const sdpString = await decodeCompactSDP(sdp);
      const parsedSdp = JSON.parse(sdpString);

      if (!parsedSdp || typeof parsedSdp !== 'object') {
        throw new Error("Malformed protocol descriptor object");
      }

      if (parsedSdp.type !== 'answer') {
        addLog(`Invalid answer: Received descriptor of type "${parsedSdp.type}". Scan a Joiner Answer QR code.`, "err");
        return;
      }

      await localConnectionRef.current.setRemoteDescription(parsedSdp);
      addLog("Synchronizing ICE protocols...", "info");
      setTimeout(() => {
        setQrPayload("");
        setPasteBuffer("");
      }, 500);
    } catch (e: any) {
      addLog(`Corrupt or invalid answer payload: ${e?.message || e}`, "err");
    }
  };

  const createSimStream = (label: string, color: string, withAudio: boolean = true) => {
    const isScreen = label.toLowerCase().includes('screen') || label.toLowerCase().includes('mirror') || label.toLowerCase().includes('display');
    const canvas = document.createElement('canvas');
    canvas.width = isScreen ? 1280 : 640; 
    canvas.height = isScreen ? 720 : 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    const timer = setInterval(() => {
      if (!ctx) return;
      frame++;
      if (isScreen) {
        // High-fidelity Simulated Desktop Display
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 1280, 720);
        // Top system bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 1280, 36);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('QUANTUM OS - DIRECT SCREEN MIRROR', 20, 23);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText(new Date().toLocaleTimeString(), 1180, 23);
        // Simulated application window
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.roundRect(140, 75, 1000, 570, 16);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Window title bar
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(140, 75, 1000, 48, [16, 16, 0, 0]);
        ctx.fill();
        // Window dots
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(170, 99, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(190, 99, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(210, 99, 6, 0, Math.PI * 2); ctx.fill();
        // Window text
        ctx.fillStyle = color;
        ctx.font = 'bold 28px monospace';
        ctx.fillText(label, 280, 300);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px monospace';
        ctx.fillText(`Frame #${frame} | Realtime P2P Tunnel | 60 FPS | Aspect 16:9`, 280, 350);
        // Animated activity bar
        const pulse = Math.sin(frame / 5) * 80;
        ctx.fillStyle = color;
        ctx.fillRect(280, 390, 450 + pulse, 8);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = color;
        ctx.font = 'bold 24px monospace';
        ctx.fillText(label, 160, 220);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px monospace';
        ctx.fillText(new Date().toLocaleTimeString(), 250, 260);
        const pulse = Math.sin(frame / 6) * 30;
        ctx.fillStyle = color;
        ctx.fillRect(190, 290, 260 + pulse, 6);
      }
    }, 100);
    const s = (canvas as any).captureStream(30);
    (s as any)._simTimer = timer;

    if (withAudio) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.005, audioCtx.currentTime);
          osc.connect(gain);
          const dest = audioCtx.createMediaStreamDestination();
          gain.connect(dest);
          osc.start();
          dest.stream.getAudioTracks().forEach(t => s.addTrack(t));
          (s as any)._simAudioCtx = audioCtx;
        }
      } catch (e) {}
    }
    return s;
  };

  const createRejectAnswerSdp = (offerSdp: string): string => {
    const lines = offerSdp.split(/\r?\n/);
    const result: string[] = [];
    let inMedia = false;
    for (const line of lines) {
      if (line.startsWith('m=')) {
        inMedia = true;
        const parts = line.split(' ');
        if (parts.length >= 4) {
          result.push(`${parts[0]} 0 ${parts[2]} ${parts[3]}`);
        } else if (parts.length >= 2) {
          parts[1] = '0';
          result.push(parts.join(' '));
        } else {
          result.push(line);
        }
      } else if (inMedia) {
        if (line.startsWith('a=mid:') || line.startsWith('c=')) {
          result.push(line);
        }
      } else {
        if (!line.startsWith('a=group:BUNDLE')) {
          result.push(line);
        }
      }
    }
    return result.join('\r\n') + '\r\n';
  };

  const startCall = async (type: 'audio' | 'video' | 'screen') => {
    let stream: MediaStream;
    const isRestricted = bandwidthOptimized || connectedCount >= 3;
    const isScreen = type === 'screen';
    const videoConstraint = (type === 'video' || isScreen)
      ? (isRestricted ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 15 } } : true)
      : false;

    try {
      if (isScreen) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("Display capture not supported");
        }
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          (vTrack as any).contentHint = 'detail';
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: videoConstraint
        });
      }
    } catch (e: any) {
      if (isSimulation || isScreen) {
        addLog(isScreen ? "Screen capture preview: generating simulated screen mirror stream" : "Permission denied or preview mode, using simulated live stream", "info");
        stream = createSimStream(isScreen ? 'MIRRORED DISPLAY 1080p' : 'SIMULATED LOCAL STREAM', '#38bdf8', true);
      } else if (type === 'video') {
        addLog("Camera access restricted, attempting audio-only fallback", "info");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          addLog("Hardware media access restricted, generating preview stream", "info");
          stream = createSimStream('TEST LOCAL STREAM', '#38bdf8', true);
        }
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          addLog("Microphone access restricted, generating preview stream", "info");
          stream = createSimStream('TEST LOCAL AUDIO', '#38bdf8', true);
        }
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setCallType('video');
    setIsCallActive(true);
    setIsCallMinimized(false);
    addLog(isScreen ? "Started direct screen mirroring" : `Started ${type} call`, "ok");
    
    if (isSimulation) {
      const fakeStreams: Record<string, MediaStream> = {};
      if (isScreen) {
        fakeStreams['sim_peer_1'] = createSimStream('Remote Mirror Stream', '#38bdf8', true);
        setScreenSharingPeers(prev => ({ ...prev, sim_peer_1: true }));
      } else if (type === 'video') {
        fakeStreams['sim_peer_1'] = createSimStream('Simulated Peer Video', '#34d399', true);
      } else {
        fakeStreams['sim_peer_1'] = createSimStream('Simulated Peer Audio', '#34d399', true);
      }
      setRemoteStreams(fakeStreams);
      return;
    }

    if (isScreen) {
      handleToggleScreenShare(true);
    }

    // Attach local tracks and notify all peers via call-invite with offer SDP
    peerConnections.current.forEach(async (pc, peerId) => {
      if (pc.signalingState === 'have-local-offer' && pc.localDescription?.sdp) {
        try {
          const rejectSdp = createRejectAnswerSdp(pc.localDescription.sdp);
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: rejectSdp }));
        } catch (e) {
          console.warn("Reset offer before call invite:", e);
        }
      } else if (pc.signalingState !== 'stable') {
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (e) {
          console.warn("Rollback before call invite:", e);
        }
      }

      const senders = pc.getSenders();
      for (const track of stream.getTracks()) {
        const sender = senders.find(s => s.track === track || (!s.track && (s as any).track?.kind === track.kind));
        if (sender && !sender.track) {
          try {
            await sender.replaceTrack(track);
          } catch {
            pc.addTrack(track, stream);
          }
        } else if (!senders.find(s => s.track === track)) {
          pc.addTrack(track, stream);
        }
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIce(pc);
        const dc = dataChannels.current.get(peerId);
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({
            type: 'call-invite',
            callType: isScreen ? 'video' : type,
            isScreenMirror: isScreen,
            callerName: profile.username,
            callerId: profile.id,
            callerAvatar: profile.avatarImage,
            callerColor: profile.avatarColor,
            sdp: pc.localDescription
          }));
          addLog(`Call invite sent to ${peerProfiles[peerId]?.username || 'peer'}`, "info");
        } else {
          addLog("Cannot place call: Data tunnel not ready", "err");
        }
      } catch (err: any) {
        console.error("Error creating call offer for peer " + peerId, err);
        addLog(`Call offer failed: ${err?.message || err}`, "err");
      }
    });
  };

  const acceptCall = async (incoming: IncomingCallData) => {
    stopRingChime();
    setIncomingCall(null);
    let stream: MediaStream;
    const isRestricted = bandwidthOptimized || connectedCount >= 3;
    const videoConstraint = incoming.callType === 'video' 
      ? (isRestricted ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 15 } } : true)
      : false;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoConstraint
      });
    } catch (e) {
      addLog("Camera access restricted, attempting audio-only", "info");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        stream = createSimStream('Joined Stream', '#38bdf8', true);
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setCallType(incoming.callType);
    setIsCallActive(true);
    setIsCallMinimized(false);
    if (incoming.isScreenMirror) {
      setScreenSharingPeers(prev => ({ ...prev, [incoming.peerId]: true }));
    }
    addLog(`Joined ${incoming.isScreenMirror ? 'screen mirror broadcast' : incoming.callType + ' call'} with ${incoming.callerName}`, "ok");

    const pc = peerConnections.current.get(incoming.peerId);
    if (pc) {
      try {
        if (pc.signalingState !== 'stable') {
          try { await pc.setLocalDescription({ type: 'rollback' }); } catch (_) {}
        }
        await pc.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
        const senders = pc.getSenders();
        for (const track of stream.getTracks()) {
          const sender = senders.find(s => s.track === track || (!s.track && (s as any).track?.kind === track.kind));
          if (sender && !sender.track) {
            try {
              await sender.replaceTrack(track);
            } catch {
              pc.addTrack(track, stream);
            }
          } else if (!senders.find(s => s.track === track)) {
            pc.addTrack(track, stream);
          }
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIce(pc);
        const dc = dataChannels.current.get(incoming.peerId);
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({
            type: 'call-answer',
            sdp: pc.localDescription
          }));
        }
      } catch (err) {
        console.error("Error setting answer on incoming call:", err);
      }
    }
  };

  const declineCall = async (incoming: IncomingCallData) => {
    stopRingChime();
    setIncomingCall(null);
    const pc = peerConnections.current.get(incoming.peerId);
    let declineSdp: RTCSessionDescriptionInit | undefined;
    if (pc && incoming.sdp) {
      try {
        if (pc.signalingState !== 'stable') {
          try { await pc.setRemoteDescription({ type: 'rollback' }); } catch (_) {}
        }
        await pc.setRemoteDescription(new RTCSessionDescription(incoming.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        declineSdp = pc.localDescription || answer;
      } catch (e) {
        console.warn("Callee formal decline answer generation:", e);
      }
    }
    const dc = dataChannels.current.get(incoming.peerId);
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({
        type: 'call-decline',
        by: profile.username,
        sdp: declineSdp
      }));
    }
    addLog(`Declined call from ${incoming.callerName}`, "info");
  };

  const endCall = useCallback((notifyPeers: boolean = true) => {
    stopRingChime();
    setIncomingCall(null);

    if (notifyPeers) {
      dataChannels.current.forEach(dc => {
        if (dc.readyState === 'open') {
          try {
            dc.send(JSON.stringify({ type: 'call-end' }));
          } catch (e) {}
        }
      });
    }

    if (localStreamRef.current) {
      if ((localStreamRef.current as any)._simTimer) {
        clearInterval((localStreamRef.current as any)._simTimer);
      }
      if ((localStreamRef.current as any)._simAudioCtx) {
        try {
          (localStreamRef.current as any)._simAudioCtx.close().catch(() => {});
        } catch (_) {}
      }
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    const streamsToStop = { ...remoteStreams, ...remoteStreamsRef.current };
    Object.values(streamsToStop).forEach((st: any) => {
      if (st._simTimer) clearInterval(st._simTimer);
      if (st._simAudioCtx) {
        try {
          st._simAudioCtx.close().catch(() => {});
        } catch (_) {}
      }
      st.getTracks?.().forEach((t: any) => t.stop());
    });
    remoteStreamsRef.current = {};

    peerConnections.current.forEach(async (pc) => {
      if (pc.signalingState === 'have-local-offer' && pc.localDescription?.sdp) {
        try {
          const rejectSdp = createRejectAnswerSdp(pc.localDescription.sdp);
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: rejectSdp }));
        } catch (e) {}
      } else if (pc.signalingState !== 'stable') {
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (e) {}
      }
      pc.getSenders().forEach(sender => {
        try {
          if (sender.track) {
            sender.track.stop();
          }
          pc.removeTrack(sender);
        } catch (e) {}
      });
    });

    const hadActiveCall = isCallActiveRef.current || isCallActive;
    setIsCallActive(false);
    setIsCallMinimized(false);
    setScreenSharingPeers({});
    setCallType(null);
    setRemoteStreams({});
    setPeerTrackStates({});
    if (hadActiveCall) {
      addLog("Call ended", "info");
    }
  }, [addLog, stopRingChime, remoteStreams, isCallActive]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Monitor simulation mode and live connection lifecycle to ensure active calls automatically terminate
  const prevIsSimRef = useRef(isSimulation);
  const prevStatusRef = useRef(status);
  const prevConnectedPeersRef = useRef(connectedCount);
  const prevRoleRef = useRef(role);

  useEffect(() => {
    // 1. When ending simulation mode: call automatically turns off
    if (prevIsSimRef.current && !isSimulation) {
      if (isCallActive || localStreamRef.current || incomingCall || Object.keys(remoteStreams).length > 0) {
        endCallRef.current?.();
        addLog("Simulation ended: Call automatically turned off", "info");
      }
    }

    // 2. Similar for live connections: when live connection drops, all peers disconnect, or session closes
    if (!isSimulation) {
      const liveConnectionDropped =
        (prevStatusRef.current === "connected" && status === "offline") ||
        (prevConnectedPeersRef.current > 0 && connectedCount === 0) ||
        (prevRoleRef.current !== null && role === null);

      if (liveConnectionDropped && (isCallActive || localStreamRef.current || incomingCall || Object.keys(remoteStreams).length > 0)) {
        endCallRef.current?.();
        addLog("Live connection ended: Call automatically turned off", "info");
      }
    }

    prevIsSimRef.current = isSimulation;
    prevStatusRef.current = status;
    prevConnectedPeersRef.current = connectedCount;
    prevRoleRef.current = role;
  }, [isSimulation, status, connectedCount, role, isCallActive, incomingCall, remoteStreams, addLog]);

  const handleToggleTrack = (kind: 'audio' | 'video', enabled: boolean) => {
    dataChannels.current.forEach(dc => {
      if (dc.readyState === 'open') {
        try {
          dc.send(JSON.stringify({
            type: 'call-track-state',
            kind,
            enabled,
            from: profile.username
          }));
        } catch (e) {}
      }
    });
  };

  const handleToggleScreenShare = (sharing: boolean) => {
    setCallType('video');
    setScreenSharingPeers(prev => {
      if (sharing) return { ...prev, [profile.id]: true };
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
    dataChannels.current.forEach(dc => {
      if (dc.readyState === 'open') {
        try {
          dc.send(JSON.stringify({
            type: 'screen-share-state',
            peerId: profile.id,
            username: profile.username,
            sharing
          }));
        } catch (e) {}
      }
    });
  };

  const handleAddTrack = async (track: MediaStreamTrack | null) => {
    setCallType('video');
    if (!track) {
      peerConnections.current.forEach(async (pc) => {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          try {
            await videoSender.replaceTrack(null);
          } catch (_) {}
        }
      });
      return;
    }

    if (track.kind === 'video') {
      try {
        (track as any).contentHint = 'detail';
      } catch (_) {}
    }

    if (!localStreamRef.current) {
      localStreamRef.current = new MediaStream([track]);
      setLocalStream(localStreamRef.current);
    } else if (!localStreamRef.current.getTracks().includes(track)) {
      localStreamRef.current.addTrack(track);
    }

    peerConnections.current.forEach(async (pc, peerId) => {
      // If a video sender already exists, replace track directly for seamless transition
      const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        try {
          await videoSender.replaceTrack(track);
          return;
        } catch (e) {
          console.warn("replaceTrack fallback to renegotiation:", e);
        }
      }

      if (localStreamRef.current) {
        if (!pc.getSenders().find(s => s.track === track)) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      try {
        if (pc.signalingState !== 'stable') {
          try { await pc.setLocalDescription({ type: 'rollback' }); } catch (_) {}
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIce(pc);
        const dc = dataChannels.current.get(peerId);
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({ type: 'media-offer', sdp: pc.localDescription }));
        }
      } catch (e) {
        console.error("Renegotiation failed:", e);
      }
    });
  };

  const sendMessage = (text: string, audioData?: string) => {
    if ((!text && !audioData) || dataChannels.current.size === 0) return;
    
    const messageId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const msgObj = { 
      type: 'chat', 
      id: messageId,
      text,
      audioData,
      senderName: profile.username,
      senderColor: profile.avatarColor,
      senderAvatar: profile.avatarImage,
      senderId: profile.id,
      timestamp: new Date().toISOString()
    };
    const fullMsg = JSON.stringify(msgObj);
    
    // WebRTC safe chunking threshold (32KB chunks prevent SCTP buffer overflow)
    const CHUNK_SIZE_LIMIT = 32000;
    if (fullMsg.length > CHUNK_SIZE_LIMIT) {
      const total = Math.ceil(fullMsg.length / CHUNK_SIZE_LIMIT);
      for (let i = 0; i < total; i++) {
        const slice = fullMsg.slice(i * CHUNK_SIZE_LIMIT, (i + 1) * CHUNK_SIZE_LIMIT);
        const chunkPayload = JSON.stringify({
          type: 'chat-chunk',
          msgId: messageId,
          index: i,
          total,
          chunk: slice
        });
        dataChannels.current.forEach(dc => {
          if (dc.readyState === 'open') {
            try { dc.send(chunkPayload); } catch (e) { console.error("DC chunk send error:", e); }
          }
        });
      }
    } else {
      dataChannels.current.forEach(dc => {
        if (dc.readyState === 'open') {
          try { dc.send(fullMsg); } catch (e) { console.error("DC send error:", e); }
        }
      });
    }
    
    setMessages(prev => [...prev, {
      id: messageId,
      text,
      audioData,
      sender: 'me',
      senderName: profile.username,
      senderColor: profile.avatarColor,
      senderAvatar: profile.avatarImage,
      senderId: profile.id,
      timestamp: new Date()
    }]);

    if (isSimulation) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Math.random().toString(36).substring(2) + Date.now().toString(36)),
          text: audioData ? "🎙️ [Simulated Voice Note Received]" : "Simulated reply to: " + text,
          audioData: audioData ? audioData : undefined,
          sender: 'them',
          senderName: 'Alpha (Sim)',
          senderColor: 'bg-blue-500',
          senderId: 'sim_peer_1',
          timestamp: new Date()
        }]);
        setUnreadChatCount(prev => activeTabRef.current !== 'chat' ? prev + 1 : 0);
      }, 1200);
    }
  };

  const sendFile = async (file: File, targetPeerId?: string) => {
    if (dataChannels.current.size === 0 && !isSimulation) return;
    const isDirect = directDownloadsRef.current;
    const targetPeerName = targetPeerId ? (peerProfiles[targetPeerId]?.username || 'peer') : undefined;
    addLog(`Initiating transfer: ${file.name}${targetPeerName ? ` to ${targetPeerName}` : ''}${isDirect ? ' (Bypass RAM Limits)' : ''}`, "info");
    
    const meta = JSON.stringify({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      mimeType: file.type,
      senderName: profile.username,
      senderColor: profile.avatarColor,
      senderId: profile.id,
      bypassRam: isDirect,
      targetPeerId
    });

    if (targetPeerId) {
      const targetDc = getDcForPeer(targetPeerId);
      if (targetDc && targetDc.readyState === 'open') {
        targetDc.send(meta);
      }
    } else {
      dataChannels.current.forEach(dc => {
        if (dc.readyState === 'open') dc.send(meta);
      });
    }

    // Bypass RAM / Direct Downloads: Do not sandbox the file in the drop zone
    if (!isDirect) {
      const fileId = (Math.random().toString(36).substring(2) + Date.now().toString(36));
      const mimeType = file.type || 'application/octet-stream';

      storeFileInSandboxCache(
        fileId,
        file.name,
        file,
        mimeType,
        { senderName: profile.username, direction: 'out' }
      ).then(({ cacheUrl }) => {
        setFiles(prev => {
          const next: FilePayload[] = [{
            id: fileId,
            name: file.name,
            blob: file,
            size: file.size,
            senderName: profile.username,
            senderColor: profile.avatarColor,
            timestamp: new Date(),
            direction: 'out',
            cacheUrl,
            mimeType
          }, ...prev];
          try {
            localStorage.setItem('nexus_sandbox_files', JSON.stringify(
              next.map(({ blob: _, ...rest }) => rest)
            ));
          } catch (_) {}
          return next;
        });
        getCacheSizeMB().then(setCacheSizeMB);
      }).catch(err => {
        console.warn("Failed to cache outgoing sandbox file:", err);
        setFiles(prev => [{
          id: fileId,
          name: file.name,
          blob: file,
          size: file.size,
          senderName: profile.username,
          senderColor: profile.avatarColor,
          timestamp: new Date(),
          direction: 'out',
          mimeType
        }, ...prev]);
      });
    }

    const peerTarget = dataChannels.current.size === 1 ? (Object.values(peerProfiles) as any[])[0]?.username || 'Peer' : 'Group';

    let offset = 0;
    cancelTransferRef.current = false;
    let lastActiveChunkTime = Date.now();

    const startStreaming = () => {
      const sendNextChunk = async () => {
        if (cancelTransferRef.current) {
          addLog(`Transfer aborted for ${file.name}`, "info");
          setTransfer(null);
          await cleanupBuffersAndCache(file.name);
          return;
        }

        if (offset >= file.size) {
          triggerTransferAnimation();
          addLog(`Sent payload: ${file.name}${isDirect ? ' (Streamed directly to receiver disk)' : ''}`, "ok");
          setTimeout(() => setTransfer(null), 1000);
          return;
        }

        let openCount = 0;
        let maxBuffer = 0;
        if (targetPeerId) {
          const targetDc = getDcForPeer(targetPeerId);
          if (targetDc && targetDc.readyState === 'open') {
            openCount = 1;
            if (typeof targetDc.bufferedAmount === 'number') {
              maxBuffer = targetDc.bufferedAmount;
            }
          }
        } else {
          dataChannels.current.forEach(dc => {
            if (dc.readyState === 'open') {
              openCount++;
              if (typeof dc.bufferedAmount === 'number') {
                maxBuffer = Math.max(maxBuffer, dc.bufferedAmount);
              }
            }
          });
        }

        if (openCount === 0 && !isSimulation) {
          await handleTransferFailure("All peer connections disconnected during transfer", undefined, file.name, false);
          return;
        }

        if (maxBuffer > MAX_BUFFERED_AMOUNT) {
          // Detect stalled connection if buffer doesn't drain for 15 seconds
          if (Date.now() - lastActiveChunkTime > 15000) {
            await handleTransferFailure("Network stalled: peer buffer did not drain for >15s", undefined, file.name, true);
            return;
          }
          // SCTP buffer backpressure: pause and wait for buffer to drain
          setTimeout(sendNextChunk, 25);
          return;
        }

        const nextChunkEnd = Math.min(offset + CHUNK_SIZE, file.size);
        const slice = file.slice(offset, nextChunkEnd);

        try {
          const chunkData = await slice.arrayBuffer();
          if (cancelTransferRef.current) {
            await cleanupBuffersAndCache(file.name);
            return;
          }

          let anySent = false;
          if (targetPeerId) {
            const targetDc = getDcForPeer(targetPeerId);
            if (targetDc && targetDc.readyState === 'open') {
              try {
                targetDc.send(chunkData);
                anySent = true;
              } catch (sendErr) {
                console.warn("RTCDataChannel send chunk error:", sendErr);
              }
            }
          } else {
            dataChannels.current.forEach(dc => {
              if (dc.readyState === 'open') {
                try {
                  dc.send(chunkData);
                  anySent = true;
                } catch (sendErr) {
                  console.warn("RTCDataChannel send chunk error:", sendErr);
                }
              }
            });
          }

          if (anySent || isSimulation) {
            offset += chunkData.byteLength;
            lastActiveChunkTime = Date.now();
            const now = Date.now();
            if (now - lastUpdateRef.current > 150 || offset >= file.size) {
              const progress = Math.round((offset / file.size) * 100);
              setTransfer(prev => prev ? { ...prev, progress, transferredBytes: offset } : null);
              lastUpdateRef.current = now;
            }
          }

          if (offset < file.size) {
            // High throughput dispatch with event loop yielding
            if (maxBuffer > MAX_BUFFERED_AMOUNT / 2) {
              setTimeout(sendNextChunk, 10);
            } else {
              setTimeout(sendNextChunk, 0);
            }
          } else {
            triggerTransferAnimation();
            addLog(`Sent payload: ${file.name}${isDirect ? ' (Streamed directly to receiver disk)' : ''}`, "ok");
            setTimeout(() => setTransfer(null), 1000);
          }
        } catch (sliceErr: any) {
          await handleTransferFailure(`File read error during transfer: ${sliceErr?.message || sliceErr}`, undefined, file.name, true);
        }
      };

      sendNextChunk();
    };

    if (isDirect) {
      pendingDirectSendRef.current = {
        file,
        startSend: () => {
          startStreaming();
        }
      };

      setTransfer({ 
        name: file.name, 
        progress: 0, 
        type: 'sending',
        peerUsername: peerTarget,
        transferredBytes: 0,
        totalBytes: file.size,
        isWaitingForReceiver: true,
        statusMessage: "Waiting for receiver to click download...",
        isDirectDisk: true
      });
      addLog(`Waiting for receiver to click download on their browser for ${file.name}...`, "info");
    } else {
      setTransfer({ 
        name: file.name, 
        progress: 0, 
        type: 'sending',
        peerUsername: peerTarget,
        transferredBytes: 0,
        totalBytes: file.size,
        isWaitingForReceiver: false
      });
      startStreaming();
    }
  };

  const fileQueueRef = useRef<File[]>([]);
  const isProcessingQueueRef = useRef(false);

  const processFileQueue = async () => {
    if (isProcessingQueueRef.current || fileQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    try {
      while (fileQueueRef.current.length > 0) {
        const nextFile = fileQueueRef.current.shift();
        if (nextFile) {
          await sendFile(nextFile);
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  const handleFilesSelected = (files: File[]) => {
    fileQueueRef.current.push(...files);
    processFileQueue();
  };

  const isPeerConnectedToHost = role === 'join' && (status === 'connected' || connectedCount > 0);

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col relative text-[14px] bg-transparent text-text antialiased">
      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal 
            profile={profile} 
            onSave={(newProfile) => {
              setProfile(newProfile);
              if (status === 'connected') {
                dataChannels.current.forEach(dc => {
                  if(dc.readyState === 'open') dc.send(JSON.stringify({ type: 'profile-update', profile: newProfile }));
                });
              }
            }} 
            onClose={() => setShowProfileModal(false)} 
          />
        )}
        {selectedPeerProfile && (
          <ViewProfileModal
            profile={selectedPeerProfile}
            onClose={() => setSelectedPeerProfile(null)}
          />
        )}
        {showInfoModal && (
          <NexusInfoModal
            isOpen={showInfoModal}
            initialTab={infoModalTab}
            onClose={() => setShowInfoModal(false)}
          />
        )}
        <CookieConsentBanner
          onOpenLegal={() => {
            setInfoModalTab('legal');
            setShowInfoModal(true);
          }}
        />
        {incomingDirectPrompt && (
          <DirectDownloadPromptModal
            isOpen={!!incomingDirectPrompt}
            fileName={incomingDirectPrompt.meta.name}
            fileSize={incomingDirectPrompt.meta.size}
            senderName={incomingDirectPrompt.meta.senderName || 'Peer'}
            onAccept={handleAcceptDirectDownload}
            onDecline={handleDeclineDirectDownload}
          />
        )}
      </AnimatePresence>

      <MaterialYouSettingsModal
        themeState={materialTheme}
        onUpdateTheme={setMaterialTheme}
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />

      <KineticPreloader
        visible={showPreloader}
        onComplete={() => setShowPreloader(false)}
      />

      <QuantumWebGLStage
        chapter={stageChapter}
        seedHex={materialTheme.seedHex}
        isDark={materialTheme.mode === 'dark'}
        connectedCount={connectedCount}
        isWorkspaceFocused={Boolean(role) || activeTab !== 'p2p'}
        hoverRole={hoverRole}
        autoTour={autoTour}
      />
      
      {/* Android 16 Material You (M3 Expressive) Top App Bar - Hidden smoothly during pure 3D Cinema Mode */}
      {!(cinemaMode && !role && activeTab === 'p2p') && (
      <header
        className="z-20 w-full h-auto lg:h-18 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:py-0 border-b grid grid-cols-[minmax(0,1fr)_auto] lg:flex lg:items-center lg:justify-between px-3 sm:px-4 lg:px-6 flex-shrink-0 relative gap-x-2 gap-y-2 lg:gap-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface-container-low) 78%, transparent)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        {/* Row 1 Col 1 (Mobile) / Left (Desktop): Brand Cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 lg:order-1">
          <div 
            className="min-w-0 cursor-pointer select-none relative group flex items-center gap-2 sm:gap-2.5" 
            onClick={handleTitleClick}
            title={titleTapCount > 0 ? `${10 - titleTapCount} taps left to unlock easter egg` : "Quantum Link"}
          >
            <div className="shrink-0 scale-90 sm:scale-100 origin-left">
              <QuantumAppIcon
                preset={materialTheme.appIconPreset}
                shape={materialTheme.appIconShape}
                size="sm"
              />
            </div>
            <motion.div
              className="min-w-0"
              animate={titleTapCount > 0 ? { scale: [1, 0.96, 1] } : {}}
              transition={{ duration: 0.12 }}
            >
              <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-text leading-tight flex items-center gap-1.5 min-w-0">
                <span className="truncate">Quantum Link</span>
                {titleTapCount >= 3 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums shrink-0"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }}
                  >
                    {10 - titleTapCount}
                  </motion.span>
                )}
              </h1>
              <div className="text-[10px] sm:text-[11px] text-muted flex items-center gap-1.5 leading-tight mt-0.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    status === "connected" ? "bg-success" : status === "handshaking" ? "bg-amber-500 animate-pulse" : "bg-[var(--md-sys-color-primary)]"
                  )}
                />
                <span className="truncate font-medium">
                  {status === "connected"
                    ? (isSimulation ? "Demo Active" : `${connectedCount} ${connectedCount === 1 ? 'peer' : 'peers'} linked`)
                    : status === "handshaking"
                      ? "Handshaking..."
                      : "P2P Ready"}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Row 1 Col 2 (Mobile) / Right (Desktop): Action Cluster - Strictly Non-Wrapping */}
        <div className="flex gap-1 sm:gap-1.5 items-center justify-end flex-shrink-0 lg:order-3">
          {/* Simulation / Demo Mode Toggle */}
          <button 
            id="simulation-toggle-btn"
            onClick={() => {
              triggerHaptic('medium', materialTheme.hapticsEnabled);
              toggleSimulation();
            }}
            className={cn(
              "w-8.5 h-8.5 sm:w-auto sm:h-9 sm:px-3 rounded-full flex items-center justify-center gap-1.5 font-semibold text-xs flex-shrink-0 transition-all cursor-pointer active:scale-[0.97]",
              isSimulation ? "m3-btn-filled shadow-xs" : "m3-btn-tonal"
            )}
            title={isSimulation ? "Demo Mode is ON (Click to turn off)" : "Try Demo Mode with simulated peers"}
            aria-label="Toggle simulation mode"
          >
            <MaterialSymbol name="science" size={17} filled={isSimulation} />
            <span className="hidden sm:inline whitespace-nowrap">{isSimulation ? "Demo: ON" : "Try Demo"}</span>
          </button>

          {/* Active Call Background Indicator (PiP mode indicator) */}
          {isCallActive && isCallMinimized && (
            <button
              onClick={() => setIsCallMinimized(false)}
              className="w-8.5 h-8.5 sm:w-auto sm:h-9 sm:px-3 flex items-center justify-center gap-1.5 rounded-full bg-success text-white hover:opacity-95 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 shadow-xs active:scale-[0.97]"
              title="Return to active call"
            >
              <MaterialSymbol name="call" size={16} filled />
              <span className="hidden sm:inline">Call</span>
            </button>
          )}

          {/* Profile Avatar Circle Button (Perfect circle on Mobile/Tablet, Pill on XL) */}
          <button
            onClick={() => {
              triggerHaptic('light', materialTheme.hapticsEnabled);
              setShowProfileModal(true);
            }}
            className="m3-surface-interactive w-8.5 h-8.5 sm:w-9 sm:h-9 xl:w-auto xl:h-9 xl:pl-1 xl:pr-3 p-0 flex items-center justify-center gap-2 rounded-full border transition-all cursor-pointer shrink-0 active:scale-[0.97]"
            title="Edit Your Profile"
            aria-label="Edit Your Profile"
          >
            <div className={cn(
              "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden relative shrink-0",
              profile.avatarColor
            )}>
              {profile.avatarImage ? (
                <img src={profile.avatarImage} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-text max-w-[96px] truncate">
              {profile.username}
            </span>
          </button>

          {/* Theme & Custom App Icon Quick Sheet Trigger */}
          <button
            onClick={() => {
              triggerHaptic('light', materialTheme.hapticsEnabled);
              setShowThemeModal(true);
            }}
            className="m3-btn-tonal w-8.5 h-8.5 sm:w-9 sm:h-9 xl:w-auto xl:px-3 flex items-center justify-center gap-1.5 rounded-full cursor-pointer flex-shrink-0 text-xs font-semibold active:scale-[0.97]"
            title="Material You Theme, Seed Color & App Icon Settings"
            aria-label="Material You Theme Settings"
          >
            <MaterialSymbol name="colors" size={17} />
            <span className="hidden xl:inline whitespace-nowrap">Theme</span>
          </button>

          {/* Help / Guide Button */}
          <button
            onClick={() => {
              triggerHaptic('light', materialTheme.hapticsEnabled);
              setInfoModalTab('guide');
              setShowInfoModal(true);
            }}
            className="m3-surface-interactive w-8.5 h-8.5 sm:w-9 sm:h-9 flex items-center justify-center border rounded-full cursor-pointer flex-shrink-0 active:scale-[0.97]"
            title="How to Use & Help Guide"
            aria-label="Help and User Guide"
          >
            <MaterialSymbol name="help" size={17} />
          </button>
          
          {/* Light / Dark Mode Switch */}
          <button
            onClick={() => {
              triggerHaptic('light', materialTheme.hapticsEnabled);
              setMaterialTheme(prev => ({
                ...prev,
                mode: prev.mode === 'dark' ? 'light' : 'dark',
              }));
            }}
            className="m3-surface-interactive w-8.5 h-8.5 sm:w-9 sm:h-9 flex items-center justify-center border rounded-full cursor-pointer flex-shrink-0 active:scale-[0.97]"
            title="Switch Light / Dark Mode"
            aria-label="Switch Light or Dark Mode"
          >
            <MaterialSymbol name={materialTheme.mode === 'dark' ? 'light_mode' : 'dark_mode'} size={17} />
          </button>
        </div>

        {/* Row 2 (Mobile col-span-2) / Center (Desktop): Full-Width 5-Column Segmented Navigation Bar */}
        <div className="col-span-2 w-full lg:w-auto lg:flex-1 flex justify-center min-w-0 lg:order-2">
          <nav
            className="grid grid-cols-5 lg:flex w-full lg:w-max items-center gap-1 p-1 lg:p-1.5 rounded-2xl lg:rounded-full z-[20] mx-auto border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface-container) 82%, transparent)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <button 
              onClick={() => setActiveTab("p2p")}
              className={cn(
                "nav-tab px-1 sm:px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] sm:text-xs font-semibold transition-all rounded-xl lg:rounded-full whitespace-nowrap cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 active:scale-[0.97] min-w-0",
                activeTab === "p2p" ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="hub" size={17} filled={activeTab === "p2p"} />
              <span className="sm:hidden truncate">Trx</span>
              <span className="hidden sm:inline truncate">Transceiver</span>
            </button>
            <button 
              onClick={() => { setActiveTab("chat"); setUnreadChatCount(0); }}
              className={cn(
                "nav-tab px-1 sm:px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] sm:text-xs font-semibold transition-all rounded-xl lg:rounded-full whitespace-nowrap relative cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 active:scale-[0.97] min-w-0",
                activeTab === "chat" ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="forum" size={17} filled={activeTab === "chat"} />
              <span className="xl:hidden truncate">Chat</span>
              <span className="hidden xl:inline">Chat & Calls</span>
              {unreadChatCount > 0 && activeTab !== "chat" && (
                <span className="absolute top-0.5 right-1 sm:static sm:ml-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full tabular-nums">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab("qr"); addLog("Entering QR Customisation Studio", "info"); }}
              className={cn(
                "nav-tab px-1 sm:px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] sm:text-xs font-semibold transition-all rounded-xl lg:rounded-full whitespace-nowrap cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 active:scale-[0.97] min-w-0",
                activeTab === "qr" ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="qr_code_2" size={17} filled={activeTab === "qr"} />
              <span className="xl:hidden truncate">QR</span>
              <span className="hidden xl:inline">QR Custom</span>
            </button>
            <button 
              onClick={() => setActiveTab("base64")}
              className={cn(
                "nav-tab px-1 sm:px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] sm:text-xs font-semibold transition-all rounded-xl lg:rounded-full whitespace-nowrap cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 active:scale-[0.97] min-w-0",
                activeTab === "base64" ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="data_object" size={17} filled={activeTab === "base64"} />
              <span className="truncate">Encoder</span>
            </button>
            <button 
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "nav-tab px-1 sm:px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] sm:text-xs font-semibold transition-all rounded-xl lg:rounded-full whitespace-nowrap cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 active:scale-[0.97] min-w-0",
                activeTab === "appearance" ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="palette" size={17} filled={activeTab === "appearance"} />
              <span className="xl:hidden truncate">Theme</span>
              <span className="hidden xl:inline">Customise</span>
            </button>
          </nav>
        </div>
      </header>
      )}

      {/* Edge-to-Edge Main Surface Canvas with Dynamic Paddings */}
      <main className="z-10 flex-1 min-h-0 p-2.5 sm:p-5 md:p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "appearance" ? (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="h-full w-full overflow-hidden rounded-[28px] ql-stage-card"
            >
              <MaterialYouSettingsContent
                themeState={materialTheme}
                onUpdateTheme={setMaterialTheme}
              />
            </motion.div>
          ) : activeTab === "qr" ? (
            <motion.div 
              key="qr" 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -6 }} 
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <QRUtilityNode />
            </motion.div>
          ) : activeTab === "chat" ? (
            <motion.div 
              key="chat" 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -6 }} 
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <SecureChatNode 
                messages={messages} 
                sendMessage={sendMessage} 
                connectedPeers={connectedCount} 
                role={role} 
                onClickProfile={(senderId) => {
                  const p = peerProfiles[senderId];
                  if (p) setSelectedPeerProfile(p);
                }}
                startCall={startCall}
                bandwidthOptimized={bandwidthOptimized}
                onToggleBandwidthOptimized={() => setBandwidthOptimized(prev => !prev)}
                isCallActive={isCallActive}
              />
            </motion.div>
          ) : activeTab === "base64" ? (
            <motion.div 
              key="base64" 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -6 }} 
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <Base64ToolNode />
            </motion.div>
          ) : activeTab === "registry" ? (
            <motion.div 
              key="nexus-registry" 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -6 }} 
              transition={{ duration: 0.15 }}
              className="h-full w-full overflow-hidden"
            >
              <NexusFailoverHUD 
                localUsername={profile.username}
                localAvatarColor={profile.avatarColor}
                localAvatarImage={profile.avatarImage}
                localPeerId={profile.id}
                realConnectedCount={connectedCount}
                peerProfiles={peerProfiles}
                role={role}
                networkStatus={status}
                isSimulation={isSimulation}
                onToggleSimulation={toggleSimulation}
                onNavigateToConnect={() => setActiveTab(role ? "chat" : "qr")}
                onTransferHostControl={handleTransferHostControl}
                onGracefulHostDrop={handleGracefulHostDrop}
                onNetworkSplit={handleNetworkSplit}
              />
            </motion.div>
          ) : role ? (
            <motion.div 
              key="p2p-active"
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -6 }} 
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr_auto] gap-5 h-full lg:overflow-hidden overflow-y-auto pb-20 lg:pb-0"
            >
              {/* Left Column: M3 Expressive Transceiver Connection Setup */}
              <section className="col-span-1 lg:col-span-4 flex flex-col gap-4 flex-shrink-0 lg:overflow-y-auto scrollbar-hide">
                {/* Mode Switcher Card (Corner Large 16dp) */}
                <div className="ql-stage-card rounded-[24px] p-4 sm:p-5 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <MaterialSymbol name="settings_ethernet" size={18} className="text-[color:var(--md-sys-color-primary)]" />
                      <h3 className="text-sm font-bold text-text">WebRTC Transceiver</h3>
                    </div>
                    <button
                      onClick={() => {
                        triggerHaptic('light', materialTheme.hapticsEnabled);
                        setRole(null);
                        resetAll();
                        setQrPayload("");
                        setPasteBuffer("");
                      }}
                      className="text-xs font-semibold text-[color:var(--md-sys-color-primary)] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <MaterialSymbol name="arrow_back" size={15} />
                      <span>Overview</span>
                    </button>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-1.5 p-1.5 rounded-full border"
                    style={{
                      backgroundColor: 'var(--md-sys-color-surface-container-low)',
                      borderColor: 'var(--md-sys-color-outline-variant)',
                    }}
                  >
                    <button 
                      type="button"
                      disabled={isPeerConnectedToHost}
                      onClick={() => { 
                        if (isPeerConnectedToHost) return;
                        triggerHaptic('light', materialTheme.hapticsEnabled);
                        setRole("host"); 
                        resetAll(); 
                      }}
                      title={isPeerConnectedToHost ? "Disconnect first before hosting a room" : undefined}
                      className={cn(
                        "py-2.5 px-3 text-xs font-semibold transition-all rounded-full flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.97]",
                        role === "host" 
                          ? "m3-btn-filled shadow-2xs" 
                          : (
                            isPeerConnectedToHost
                              ? "text-muted/40 cursor-not-allowed"
                              : "text-muted hover:text-text cursor-pointer"
                          )
                      )}
                    >
                      {isPeerConnectedToHost ? (
                        <Lock className="w-3.5 h-3.5 text-muted/60 flex-shrink-0" />
                      ) : (
                        <MaterialSymbol name="wifi_tethering" size={16} />
                      )}
                      <span>Host Room</span>
                    </button>
                    <button 
                      onClick={() => {
                        triggerHaptic('light', materialTheme.hapticsEnabled);
                        setRole("join");
                        resetAll();
                      }}
                      className={cn(
                        "py-2.5 px-3 text-xs font-semibold transition-all rounded-full flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.97]",
                        role === "join" 
                          ? "m3-btn-tertiary shadow-2xs" 
                          : "text-muted hover:text-text"
                      )}
                    >
                      <MaterialSymbol name="qr_code_scanner" size={16} />
                      <span>Join Room</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step Handshake Card (Corner Large 16dp) */}
                <div className="m3-card flex-1 flex flex-col relative overflow-hidden lg:min-h-0 min-h-[420px]">
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col w-full">
                    {status === "connected" && role === "join" ? (
                      <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
                        <div
                          className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-4 border"
                          style={{
                            backgroundColor: 'var(--md-sys-color-tertiary-container)',
                            color: 'var(--md-sys-color-on-tertiary-container)',
                            borderColor: 'var(--md-sys-color-outline-variant)',
                          }}
                        >
                          <MaterialSymbol name="verified" size={34} filled />
                        </div>
                        <p className="text-text font-bold text-lg">Quantum Link Active</p>
                        <p className="text-muted text-xs mt-1 max-w-xs leading-relaxed">
                          Direct encrypted tunnel established. Drop files in the workspace or open <strong>Chat & Calls</strong>.
                        </p>
                        <div className="flex gap-2.5 mt-6">
                          <button 
                            onClick={() => setActiveTab("chat")}
                            className="m3-btn-filled text-xs rounded-full px-5 py-2.5 font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.97] flex items-center gap-1.5"
                          >
                            <MaterialSymbol name="forum" size={16} />
                            <span>Chat & Calls</span>
                          </button>
                          <button 
                            onClick={() => {
                              triggerHaptic('medium', materialTheme.hapticsEnabled);
                              setRole(null);
                              resetAll();
                              setQrPayload("");
                              setPasteBuffer("");
                              setMessages([]);
                              setLogs([]);
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2.5 flex items-center gap-1.5 font-semibold transition-all cursor-pointer active:scale-[0.97]"
                          >
                            <MaterialSymbol name="link_off" size={16} />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col">
                        {role === 'host' ? (
                          <div className="w-full flex flex-col">
                            {/* Connected Peers List when Hosting */}
                            {connectedCount > 0 && (
                              <div className="mb-5 w-full">
                                <div
                                  className="p-4 mb-3 rounded-2xl border flex items-center justify-between gap-2"
                                  style={{
                                    backgroundColor: 'var(--md-sys-color-tertiary-container)',
                                    color: 'var(--md-sys-color-on-tertiary-container)',
                                    borderColor: 'var(--md-sys-color-outline-variant)',
                                  }}
                                >
                                  <div>
                                    <p className="font-bold text-xs">Mesh Room Live ({connectedCount} connected)</p>
                                    <p className="text-[11px] opacity-80 mt-0.5">Share files or invite additional peers below.</p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      triggerHaptic('medium', materialTheme.hapticsEnabled);
                                      setRole(null);
                                      resetAll();
                                      setQrPayload("");
                                      setPasteBuffer("");
                                      setMessages([]);
                                      setLogs([]);
                                      setConnectedPeers(0);
                                    }}
                                    className="text-xs bg-red-600 text-white hover:bg-red-700 rounded-full px-3.5 py-1.5 flex items-center gap-1 font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
                                  >
                                    <MaterialSymbol name="close" size={14} />
                                    <span>Close</span>
                                  </button>
                                </div>
                                <div className="text-left w-full m3-surface-low p-3 max-h-44 overflow-y-auto rounded-2xl">
                                  <p className="text-xs font-bold text-text mb-2 pb-1.5 border-b" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}>
                                    Connected Peers
                                  </p>
                                  {(Object.entries(peerProfiles) as [string, UserProfile][]).map(([id, p]) => (
                                    <div
                                      key={id}
                                      className="flex justify-between items-center mb-2 last:mb-0 p-2.5 rounded-xl border"
                                      style={{
                                        backgroundColor: 'var(--md-sys-color-surface-container)',
                                        borderColor: 'var(--md-sys-color-outline-variant)',
                                      }}
                                    >
                                      <button 
                                        className="flex gap-2.5 items-center hover:opacity-85 transition-opacity text-left cursor-pointer outline-none min-w-0"
                                        onClick={() => setSelectedPeerProfile(p)}
                                        title="View profile or start call"
                                      >
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden", p.avatarColor)}>
                                          {p.avatarImage ? (
                                            <img src={p.avatarImage} alt={p.username} className="w-full h-full object-cover" />
                                          ) : (
                                            p.username.charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-text text-xs font-semibold truncate max-w-[120px]">{p.username}</span>
                                          <span className="text-muted text-[11px] truncate max-w-[110px]">{p.bio || "Connected"}</span>
                                        </div>
                                      </button>
                                      <button 
                                        onClick={() => disconnectPeer(id)}
                                        className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-1 transition-colors font-medium rounded-full cursor-pointer shrink-0"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Step 1 for Host */}
                            <div className="mb-2">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: 'var(--md-sys-color-primary-container)',
                                    color: 'var(--md-sys-color-on-primary-container)',
                                  }}
                                >
                                  1
                                </span>
                                <h4 className="text-xs font-bold text-text">Share Invite QR or Token</h4>
                              </div>
                              <p className="text-xs text-muted mb-3 leading-relaxed">
                                Have your peer scan this QR code or copy the invite token to send directly.
                              </p>
                            </div>

                            {qrPayload ? (
                              <div className="flex flex-col items-center m3-surface-low p-4 rounded-2xl">
                                <div 
                                  className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-200 cursor-pointer"
                                  onClick={() => {
                                    triggerHaptic('light', materialTheme.hapticsEnabled);
                                    navigator.clipboard.writeText(qrPayload);
                                    addLog("Invite code copied to clipboard", "ok");
                                  }}
                                  title="Click to copy Invite Code"
                                >
                                  <SafeQRCode value={qrPayload} size={190} level="L" marginSize={2} />
                                </div>
                                <div className="flex gap-2 mt-3.5 w-full">
                                  <button 
                                    onClick={() => {
                                      triggerHaptic('light', materialTheme.hapticsEnabled);
                                      navigator.clipboard.writeText(qrPayload);
                                      addLog("Invite code copied to clipboard", "ok");
                                    }}
                                    className="m3-btn-filled flex-1 py-2.5 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.97]"
                                  >
                                    <MaterialSymbol name="content_copy" size={16} />
                                    <span>Copy Invite</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      triggerHaptic('light', materialTheme.hapticsEnabled);
                                      createHostOffer();
                                    }}
                                    className="m3-btn-tonal py-2.5 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.97]"
                                    title="Generate a fresh Invite Code"
                                  >
                                    Refresh
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  triggerHaptic('medium', materialTheme.hapticsEnabled);
                                  createHostOffer();
                                }}
                                className="m3-btn-filled w-full py-3.5 px-5 rounded-full transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.97]"
                              >
                                <MaterialSymbol name={connectedCount > 0 ? "person_add" : "qr_code_2"} size={18} />
                                <span>{connectedCount > 0 ? "Invite Another Peer" : "Generate Room QR & Token"}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Guest / Join Flow */
                          <div className="w-full flex flex-col">
                            {qrPayload ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor: 'var(--md-sys-color-tertiary-container)',
                                      color: 'var(--md-sys-color-on-tertiary-container)',
                                    }}
                                  >
                                    2
                                  </span>
                                  <h4 className="text-xs font-bold text-text">Return Reply Token to Host</h4>
                                </div>
                                <p className="text-xs text-muted mb-3 leading-relaxed">
                                  Have the Host scan this QR code, or copy your Reply Token and send it back to them.
                                </p>
                                <div className="flex flex-col items-center m3-surface-low p-4 rounded-2xl">
                                  <div 
                                    className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-200 cursor-pointer"
                                    onClick={() => {
                                      triggerHaptic('light', materialTheme.hapticsEnabled);
                                      navigator.clipboard.writeText(qrPayload);
                                      addLog("Reply code copied to clipboard", "ok");
                                    }}
                                    title="Click to copy Reply Code"
                                  >
                                    <SafeQRCode value={qrPayload} size={190} level="L" marginSize={2} />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      triggerHaptic('light', materialTheme.hapticsEnabled);
                                      navigator.clipboard.writeText(qrPayload);
                                      addLog("Reply code copied to clipboard", "ok");
                                    }}
                                    className="m3-btn-filled w-full mt-3.5 py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
                                  >
                                    <MaterialSymbol name="content_copy" size={16} />
                                    <span>Copy Reply Token</span>
                                  </button>
                                </div>
                                <div
                                  className="mt-3 text-xs font-medium rounded-2xl p-3 text-center border"
                                  style={{
                                    backgroundColor: 'var(--md-sys-color-tertiary-container)',
                                    color: 'var(--md-sys-color-on-tertiary-container)',
                                    borderColor: 'var(--md-sys-color-outline-variant)',
                                  }}
                                >
                                  Waiting for Host to confirm your Reply Token...
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor: 'var(--md-sys-color-primary-container)',
                                      color: 'var(--md-sys-color-on-primary-container)',
                                    }}
                                  >
                                    1
                                  </span>
                                  <h4 className="text-xs font-bold text-text">Scan or Paste Host Invite</h4>
                                </div>
                                <p className="text-xs text-muted mb-3 leading-relaxed">
                                  Scan the QR code displayed on the Host device, or paste their Invite Token below.
                                </p>
                                <button 
                                  onClick={() => {
                                    triggerHaptic('medium', materialTheme.hapticsEnabled);
                                    setScannerType('offer');
                                  }}
                                  className="m3-btn-tonal w-full py-3.5 px-4 rounded-full transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
                                >
                                  <MaterialSymbol name="photo_camera" size={18} />
                                  <span>Scan Host QR with Camera</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 2 / Code Input Box */}
                        <div
                          className="w-full mt-5 pt-5 border-t space-y-3 pb-8 lg:pb-2 flex-shrink-0"
                          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                        >
                          {role === 'host' && (
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: 'var(--md-sys-color-secondary-container)',
                                  color: 'var(--md-sys-color-on-secondary-container)',
                                }}
                              >
                                2
                              </span>
                              <h4 className="text-xs font-bold text-text">Verify Peer Reply Token</h4>
                            </div>
                          )}
                          {role === 'host' && (
                            <p className="text-xs text-muted leading-relaxed">
                              Paste your peer's Reply Token below (or scan their QR) to complete the handshake:
                            </p>
                          )}

                          <textarea 
                            placeholder={role === 'host' ? "Paste Peer Reply Token here..." : "Or paste Host Invite Token here..."}
                            value={pasteBuffer}
                            onChange={(e) => setPasteBuffer(e.target.value)}
                            className="w-full m3-surface-low text-text text-xs font-mono p-3.5 rounded-2xl min-h-20 outline-none focus:ring-2 focus:ring-[color:var(--md-sys-color-primary)] resize-none placeholder:text-muted/70 transition-all"
                          />
                          
                          {role === 'host' && (
                            <div className="flex gap-2 w-full">
                              <button 
                                onClick={() => {
                                  triggerHaptic('light', materialTheme.hapticsEnabled);
                                  setScannerType('answer');
                                }}
                                className="m3-btn-tonal flex-shrink-0 px-4 py-2.5 flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97]"
                                title="Scan Peer Reply QR Code"
                              >
                                <MaterialSymbol name="qr_code_scanner" size={16} />
                                <span>Scan QR</span>
                              </button>
                              <button 
                                disabled={!pasteBuffer}
                                onClick={() => {
                                  triggerHaptic('success', materialTheme.hapticsEnabled);
                                  handleReceivedAnswer();
                                }}
                                className="m3-btn-filled flex-1 py-2.5 px-4 rounded-full text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.97]"
                              >
                                <span>Link Peer</span>
                                <MaterialSymbol name="arrow_forward" size={16} />
                              </button>
                            </div>
                          )}

                          {role === 'join' && !qrPayload && (
                            <button 
                              disabled={!pasteBuffer}
                              onClick={() => {
                                triggerHaptic('success', materialTheme.hapticsEnabled);
                                handleReceivedOffer(pasteBuffer);
                              }}
                              className="m3-btn-filled w-full py-3 px-4 rounded-full text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.97]"
                            >
                              <span>Accept Invite Token</span>
                              <MaterialSymbol name="arrow_forward" size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Right Column: File Sharing & Activity History */}
              <section className="col-span-1 lg:col-span-8 flex flex-col lg:flex-row gap-5 lg:overflow-hidden min-h-[720px] lg:min-h-0">
                <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:overflow-hidden">
                  {/* Shared Files Panel (Corner Large 16dp) */}
                  <div className="flex-1 m3-card flex flex-col lg:overflow-y-auto scrollbar-hide min-h-[400px] lg:min-h-0 relative">
                    <div
                      className="px-5 py-4 border-b flex justify-between items-center sticky top-0 z-10 rounded-t-2xl"
                      style={{
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <MaterialSymbol name="folder_Copy" size={18} className="text-[color:var(--md-sys-color-primary)]" />
                        <span className="text-sm font-bold text-text">Quantum File Stream</span>
                      </div>
                      <span className="text-xs font-medium text-muted">
                        {status === "connected" ? "Tunnel Ready" : "Awaiting Link"}
                      </span>
                    </div>

                    <div className="flex-1 p-5 overflow-hidden flex flex-col">
                      {/* M3 Expressive File Options Bar */}
                      <div
                        className="flex flex-wrap items-center justify-between mb-4 gap-2 pb-3.5 border-b"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="m3-surface-interactive flex items-center gap-2 text-xs font-medium cursor-pointer select-none px-3.5 py-2 rounded-full border">
                            <input 
                              type="checkbox" 
                              checked={autoDownload} 
                              onChange={(e) => {
                                triggerHaptic('light', materialTheme.hapticsEnabled);
                                setAutoDownload(e.target.checked);
                              }} 
                              className="rounded border-gray-300 dark:border-gray-600 text-accent focus:ring-accent"
                            />
                            <span>Auto-save incoming</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light', materialTheme.hapticsEnabled);
                              setDirectDownloads(!directDownloads);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.97]",
                              directDownloads ? "m3-tonal-active" : "m3-surface-interactive"
                            )}
                            title="Streams large files directly to disk without buffering in browser memory"
                          >
                            <MaterialSymbol name="hard_drive" size={16} />
                            <span>Direct Disk: {directDownloads ? "ON" : "OFF"}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted font-mono tabular-nums">
                            Cache · {cacheSizeMB} MB
                          </span>
                          {files.length > 0 && (
                            <button 
                              onClick={() => {
                                triggerHaptic('medium', materialTheme.hapticsEnabled);
                                handleClearCache();
                              }} 
                              className="m3-surface-interactive px-3 py-1.5 rounded-full border hover:text-red-500 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 active:scale-95"
                              title="Clear shared file list and temporary storage"
                            >
                              <MaterialSymbol name="delete_sweep" size={16} />
                              <span>Purge</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* M3 Expressive Drag & Drop Upload Box (Squircle 24dp) */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); if (e.dataTransfer.files) handleFilesSelected(Array.from(e.dataTransfer.files)); }}
                        className={cn(
                          "relative border border-dashed rounded-[24px] h-40 flex flex-col items-center justify-center transition-all cursor-pointer mb-4 overflow-hidden group px-4 text-center",
                          status !== 'connected'
                            ? "m3-surface-low opacity-75"
                            : isDraggingOver 
                              ? "m3-tonal-active" 
                              : "m3-surface-interactive"
                        )}
                      >
                        <DataStream active={isTransferring} />
                        <input 
                          type="file" 
                          multiple 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          disabled={status !== 'connected'}
                          onChange={(e) => { if (e.target.files) handleFilesSelected(Array.from(e.target.files)); }}
                        />
                        <div
                          className="w-12 h-12 rounded-[18px] flex items-center justify-center mb-2.5 border transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: 'var(--md-sys-color-primary-container)',
                            color: 'var(--md-sys-color-on-primary-container)',
                            borderColor: 'var(--md-sys-color-outline-variant)',
                          }}
                        >
                          <MaterialSymbol name="upload_file" size={24} />
                        </div>
                        <div className="text-sm font-bold text-text mb-0.5">
                          {status !== 'connected'
                            ? "Link a peer on the left to begin streaming files"
                            : isDraggingOver
                              ? "Release to stream payload immediately"
                              : "Tap to Choose Files or Drag & Drop"}
                        </div>
                        <div className="text-xs text-muted">
                          {status === 'connected' ? "Zero-cloud WebRTC DataChannel with DTLS encryption" : "End-to-end encrypted device-to-device transfer"}
                        </div>
                      </div>

                      {/* Shared Files List */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                        {transfer && (
                          <PacketTransferAnimation transfer={transfer} myUsername={profile.username} onCancel={handleCancelTransfer} />
                        )}

                        {files.map((file) => {
                          const mime = (file.mimeType || file.blob?.type || '').toLowerCase();
                          const name = file.name.toLowerCase();
                          const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
                          const isHtml = mime === 'text/html' || name.endsWith('.html') || name.endsWith('.htm');
                          const isVideo = mime.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i);

                          return (
                            <div 
                              key={file.id}
                              onClick={async () => {
                                if (file.blob) {
                                  setSelectedFile(file);
                                } else if (file.cacheUrl) {
                                  const b = await getCachedBlob(file.cacheUrl);
                                  if (b) {
                                    setSelectedFile({ ...file, blob: b });
                                  } else {
                                    try {
                                      const bUrl = await getOrStoreCache(file.cacheUrl, file.mimeType || 'application/octet-stream');
                                      const res = await fetch(bUrl);
                                      const fetchedBlob = await res.blob();
                                      setSelectedFile({ ...file, blob: fetchedBlob });
                                    } catch (err) {
                                      addLog(`Could not load cached file: ${file.name}`, "err");
                                    }
                                  }
                                }
                              }}
                              className="m3-surface-interactive border p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                            >
                              {/* Left: Thumbnail / File Icon */}
                              <div className="shrink-0" onClick={(e) => { if (isVideo) e.stopPropagation(); }}>
                                {isVideo ? (
                                  <VideoDropZonePreview file={file} />
                                ) : (
                                  <div
                                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                                    style={{
                                      backgroundColor: isPdf
                                        ? 'rgba(239, 68, 68, 0.12)'
                                        : isHtml
                                          ? 'rgba(245, 158, 11, 0.12)'
                                          : 'var(--md-sys-color-primary-container)',
                                      color: isPdf
                                        ? '#ef4444'
                                        : isHtml
                                          ? '#f59e0b'
                                          : 'var(--md-sys-color-on-primary-container)',
                                      borderColor: 'var(--md-sys-color-outline-variant)',
                                    }}
                                  >
                                    <MaterialSymbol
                                      name={
                                        isPdf
                                          ? 'picture_as_pdf'
                                          : isHtml
                                            ? 'html'
                                            : file.direction === 'in'
                                              ? 'download'
                                              : 'North_East'
                                      }
                                      size={20}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Center: File Title & Meta (Unboxed metadata with · separator) */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-semibold truncate text-text" title={file.name}>
                                    {file.name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5 text-nowrap truncate">
                                  <span className="shrink-0 font-mono tabular-nums text-text/80">{formatBytes(file.size)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">{file.direction === 'in' ? `From ${file.senderName}` : "Sent by you"}</span>
                                </div>
                              </div>

                              {/* Right: Pill Actions */}
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    triggerHaptic('light', materialTheme.hapticsEnabled);
                                    let downloadBlob = file.blob;
                                    if (!downloadBlob && file.cacheUrl) {
                                      downloadBlob = (await getCachedBlob(file.cacheUrl)) || undefined;
                                    }
                                    if (downloadBlob) {
                                      const u = URL.createObjectURL(downloadBlob);
                                      const a = document.createElement('a');
                                      a.href = u;
                                      a.download = file.name;
                                      document.body.appendChild(a);
                                      a.click();
                                      setTimeout(() => {
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(u);
                                      }, 5000);
                                    }
                                  }}
                                  className="m3-btn-tonal px-3.5 py-1.5 rounded-full transition-all cursor-pointer text-xs font-semibold flex items-center gap-1 active:scale-95"
                                  title="Save file to device"
                                >
                                  <MaterialSymbol name="download" size={15} />
                                  <span className="hidden sm:inline">Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSandboxFile(file, e)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Remove from list"
                                >
                                  <MaterialSymbol name="delete" size={17} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {files.length === 0 && !transfer && (
                          <div className="h-full flex flex-col items-center justify-center text-muted py-12">
                            <MaterialSymbol name="cloud_off" size={38} className="opacity-40 mb-2" />
                            <span className="text-xs font-semibold">No payloads transferred yet</span>
                            <span className="text-[11px] text-muted/70 mt-0.5">Files streamed across Quantum Link appear here</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connection History Sidebar (Corner Large 16dp) */}
                  <div className="w-full lg:w-72 flex-shrink-0 m3-card flex flex-col min-h-[300px] lg:min-h-0">
                    <div
                      className="px-4 py-4 border-b sticky top-0 z-10 flex-shrink-0 rounded-t-2xl flex justify-between items-center"
                      style={{
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      <span className="text-sm font-bold text-text flex items-center gap-1.5">
                        <MaterialSymbol name="history" size={18} className="text-[color:var(--md-sys-color-primary)]" />
                        <span>Activity Feed</span>
                      </span>
                      <button
                        onClick={() => {
                          triggerHaptic('light', materialTheme.hapticsEnabled);
                          setShowFailoverMenu(true);
                        }}
                        className="m3-btn-tonal px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer text-xs font-semibold active:scale-95"
                        title="Open Mesh Topology & Failover Controls"
                      >
                        <MaterialSymbol name="hub" size={14} />
                        <span className="text-[11px]">Mesh</span>
                      </button>
                    </div>
                    <div className="flex-1 p-3 text-xs overflow-y-auto flex flex-col gap-2 relative">
                      {[...logs, ...messages.filter(m => m.sender !== 'system').map(m => ({ 
                        text: m.text, 
                        type: m.sender === 'me' ? 'me_msg' : 'peer_msg', 
                        timestamp: m.timestamp,
                        name: m.senderName
                      } as any))].sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()).map((entry: any, i) => (
                        <div key={i} className="flex gap-2 items-start m3-surface-low p-2.5 rounded-2xl">
                          <span className="text-muted text-[10px] shrink-0 mt-0.5 font-mono tabular-nums">
                            {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {entry.type === 'me_msg' || entry.type === 'peer_msg' ? (
                            <div className="flex flex-col min-w-0">
                              <span className={cn("text-[11px] font-bold mb-0.5", entry.type === 'me_msg' ? "text-accent" : "text-success")}>
                                {entry.name ? (entry.name as string).substring(0, 14) : entry.type === 'me_msg' ? 'You' : 'Peer'}
                              </span>
                              <span className="text-text break-words">{entry.text}</span>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 items-baseline min-w-0">
                              <span className="text-text leading-relaxed break-words">{entry.text}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {logs.length === 0 && messages.length === 0 && (
                        <div
                          className="text-muted text-xs flex items-center justify-center p-6 border border-dashed my-auto rounded-2xl text-center"
                          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                        >
                          Handshake events and payload transfers will appear here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            /* Brutalist-Cinematic 3D Spatial Home Stage */
            <motion.section 
              key="role-select"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="flex flex-col h-full overflow-y-auto pb-28 lg:pb-24 z-20 relative"
            >
              {/* Unobstructed 3D Centerpiece + Editorial Architectural Overlay */}
              <div className="flex-1 flex flex-col justify-between w-full max-w-6xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4">
                {/* Top Editorial Telemetry Row */}
                <div className="flex items-start justify-between gap-4 pointer-events-none">
                  <div className="space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-[color:var(--md-sys-color-primary)]">
                      {[
                        '01 · Event Horizon Singularity',
                        '02 · Spiral Galaxy Core',
                        '03 · Binary Black Holes',
                        '04 · Crimson Quasar Jet',
                      ][stageChapter]}
                    </div>
                    {!cinemaMode && (
                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-text leading-[1.03] max-w-2xl text-balance drop-shadow-[0_6px_28px_rgba(0,0,0,0.65)]">
                        Direct peer sharing, sculpted in real time.
                      </h2>
                    )}
                  </div>

                  {!cinemaMode && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light', materialTheme.hapticsEnabled);
                        setShowThemeModal(true);
                      }}
                      className="pointer-events-auto ql-stage-card p-3 sm:p-3.5 rounded-[22px] border flex items-center gap-3 shrink-0 cursor-pointer active:scale-[0.98] transition-all hover:border-[color:var(--md-sys-color-primary)]"
                      title="Customize Material You Dynamic Colors & App Icon"
                    >
                      <QuantumAppIcon
                        preset={materialTheme.appIconPreset}
                        shape={materialTheme.appIconShape}
                        size="md"
                      />
                      <div className="hidden sm:block text-left pr-1">
                        <div className="text-xs font-bold text-text flex items-center gap-1">
                          <span>Theme Studio</span>
                          <MaterialSymbol name="tune" size={14} className="text-[color:var(--md-sys-color-primary)]" />
                        </div>
                        <div className="text-[10px] font-mono text-muted mt-0.5 uppercase">
                          {materialTheme.seedHex}
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Middle Breathing Space: Leaves the 3D WebGL Hologram / Gallery / Corridor 100% Unobstructed */}
                <div className="min-h-[140px] sm:min-h-[210px] lg:min-h-[250px] flex-1 pointer-events-none" />

                {/* Lower Spatial Action Monoliths & Quick Controls */}
                {!cinemaMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 pb-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <RoleCard 
                        num="01 · Host Node"
                        icon={<MaterialSymbol name="wifi_tethering" size={26} />}
                        title="Create a Mesh Room"
                        desc="Generate a cryptographic room QR & invite key to stream multi-gigabyte files, encrypted chat, or HD calls."
                        actionLabel="Host Room"
                        onClick={() => {
                          triggerHaptic('medium', materialTheme.hapticsEnabled);
                          setRole("host");
                        }}
                        onHoverChange={(h) => setHoverRole(h ? 'host' : null)}
                        color="accent"
                      />
                      <RoleCard 
                        num="02 · Peer Node"
                        icon={<MaterialSymbol name="qr_code_scanner" size={26} />}
                        title="Join an Existing Room"
                        desc="Scan a Host QR handshake or paste an invite token to establish a zero-server direct WebRTC tunnel."
                        actionLabel="Join Room"
                        onClick={() => {
                          triggerHaptic('medium', materialTheme.hapticsEnabled);
                          setRole("join");
                        }}
                        onHoverChange={(h) => setHoverRole(h ? 'join' : null)}
                        color="success"
                      />
                    </div>

                    {/* Streamlined Quick-Launch Bar */}
                    <div className="ql-stage-card rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-[11px] font-mono">
                        <span className="text-text font-medium">Direct WebRTC Mesh</span>
                        <span aria-hidden="true">·</span>
                        <span>DTLS-SRTP Encrypted</span>
                        <span aria-hidden="true">·</span>
                        <span>100% Offline Bundle</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            triggerHaptic('light', materialTheme.hapticsEnabled);
                            setActiveTab("appearance");
                          }}
                          className="m3-btn-tonal flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]"
                        >
                          <MaterialSymbol name="palette" size={15} />
                          <span>Material You</span>
                        </button>
                        <button
                          onClick={() => {
                            triggerHaptic('light', materialTheme.hapticsEnabled);
                            setShowNetworkMapModal(true);
                          }}
                          className="m3-btn-tertiary flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]"
                          title="Open Interactive Quantum Link Mesh Map"
                        >
                          <MaterialSymbol name="account_tree" size={15} />
                          <span>Mesh Map</span>
                        </button>
                        <button
                          onClick={() => {
                            triggerHaptic('light', materialTheme.hapticsEnabled);
                            setShowFailoverMenu(true);
                          }}
                          className="m3-surface-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]"
                          title="Open Mesh Failover & Election Controls"
                        >
                          <MaterialSymbol name="hub" size={15} className="text-[color:var(--md-sys-color-primary)]" />
                          <span>Failover HUD</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Unified Bottom-Center 3D Chapter & Cinema Dock */}
              <div className="fixed bottom-11 sm:bottom-10 left-1/2 -translate-x-1/2 z-40 max-w-[95vw]">
                <div className="ql-cinema-hud rounded-full px-2 py-1.5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
                  {([
                    { id: 0 as StageChapterId, label: '01 Singularity' },
                    { id: 1 as StageChapterId, label: '02 Galaxy' },
                    { id: 2 as StageChapterId, label: '03 Binary' },
                    { id: 3 as StageChapterId, label: '04 Quasar' },
                  ]).map((ch) => {
                    const active = stageChapter === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light', materialTheme.hapticsEnabled);
                          setAutoTour(false);
                          setStageChapter(ch.id);
                        }}
                        className={cn(
                          'px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all active:scale-95',
                          active
                            ? 'm3-btn-filled shadow-xs'
                            : 'text-muted hover:text-text hover:bg-white/5'
                        )}
                      >
                        {ch.label}
                      </button>
                    );
                  })}

                  <span className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light', materialTheme.hapticsEnabled);
                      setAutoTour((prev) => !prev);
                    }}
                    className="px-2.5 py-1.5 rounded-full text-[11px] font-mono text-muted hover:text-text flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title={autoTour ? 'Pause 3D Chapter Tour' : 'Resume 3D Chapter Tour'}
                  >
                    {autoTour ? <Pause size={13} /> : <Play size={13} />}
                    <span className="hidden md:inline">{autoTour ? 'Tour' : 'Paused'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light', materialTheme.hapticsEnabled);
                      setShowPreloader(true);
                    }}
                    className="px-2.5 py-1.5 rounded-full text-[11px] font-mono text-muted hover:text-text flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Replay Kinetic Boot Intro"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden lg:inline">Intro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium', materialTheme.hapticsEnabled);
                      setCinemaMode((prev) => !prev);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all',
                      cinemaMode ? 'm3-btn-tertiary' : 'text-text hover:bg-white/10'
                    )}
                    title={cinemaMode ? 'Show Workspace Controls' : 'Pure 3D Cinema View'}
                  >
                    {cinemaMode ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{cinemaMode ? 'Show UI' : 'Cinema'}</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Quiet Footer Bar */}
      <footer
        className="z-10 min-h-8 py-1.5 border-t flex flex-wrap sm:flex-nowrap items-center px-4 md:px-6 justify-center sm:justify-between text-xs text-muted flex-shrink-0 gap-2 sm:gap-4"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="hidden md:flex items-center gap-2">
          <span>Quantum Link</span>
          <span aria-hidden="true">·</span>
          <span className="text-text font-medium">{status === "connected" ? "Direct Tunnel Active" : "Ready"}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-center text-center items-center text-[11px]">
          <span>Peer-to-Peer WebRTC</span>
          <span aria-hidden="true">·</span>
          <span>DTLS-SRTP Encrypted</span>
          <span aria-hidden="true">·</span>
          <span>Material You (M3 Expressive)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
          <span>{materialTheme.seedHex.toUpperCase()}</span>
        </div>
      </footer>
      

      {/* Overlays & Corner Extra Large (28dp) Modals */}
      <QRScanner 
        isOpen={scannerType !== null} 
        onClose={() => setScannerType(null)} 
        onScan={(data) => {
          if (scannerType === 'offer') handleReceivedOffer(data);
          else if (scannerType === 'answer') handleReceivedAnswer(data);
          setScannerType(null);
        }} 
      />

      <AnimatePresence>
        {selectedFile && (
          <FilePreview 
            file={selectedFile} 
            onClose={() => setSelectedFile(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFailoverMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 lg:p-8 bg-black/60 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.98, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-6xl h-full md:h-[90vh] flex flex-col m3-card-xl rounded-[28px] text-text shadow-2xl overflow-hidden relative border"
              style={{
                backgroundColor: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <div
                className="flex flex-wrap justify-between items-center gap-2 px-5 sm:px-6 py-4 border-b"
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container-low)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                      borderColor: 'var(--md-sys-color-outline-variant)',
                    }}
                  >
                    <MaterialSymbol name="hub" size={20} filled />
                  </div>
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2 text-text">
                      <span>Quantum Link Mesh & Failover HUD</span>
                    </h2>
                    <p className="text-xs text-muted">
                      Deterministic host election, heartbeat watchdogs & quorum protection
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowFailoverMenu(false);
                      setShowNetworkMapModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full m3-btn-tonal text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Switch to Interactive Mesh Topology Map"
                  >
                    <MaterialSymbol name="account_tree" size={16} />
                    <span>Topology Map</span>
                  </button>
                  <button
                    onClick={() => setShowFailoverMenu(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center m3-surface-interactive border cursor-pointer text-text"
                    style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                    title="Close"
                  >
                    <MaterialSymbol name="close" size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
                <NexusFailoverHUD 
                  localUsername={profile.username}
                  localAvatarColor={profile.avatarColor}
                  localAvatarImage={profile.avatarImage}
                  localPeerId={profile.id}
                  realConnectedCount={connectedCount}
                  peerProfiles={peerProfiles}
                  role={role}
                  networkStatus={status}
                  isSimulation={isSimulation}
                  onToggleSimulation={toggleSimulation}
                  onNavigateToConnect={() => { setShowFailoverMenu(false); setActiveTab(role ? "chat" : "qr"); }}
                  onTransferHostControl={handleTransferHostControl}
                  onGracefulHostDrop={handleGracefulHostDrop}
                  onNetworkSplit={handleNetworkSplit}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showNetworkMapModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 lg:p-8 bg-black/60 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.98, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 8 }}
              className="w-full max-w-5xl h-full md:h-[90vh] flex flex-col m3-card-xl rounded-[28px] shadow-2xl overflow-hidden relative"
            >
              <NexusNetworkMap 
                localProfile={profile}
                role={role}
                peerProfiles={peerProfiles}
                connectedCount={connectedCount}
                dataChannels={dataChannels.current}
                activeTransfer={transfer}
                isCallActive={isCallActive}
                callType={callType}
                messages={messages}
                logs={logs}
                onSendFileToPeer={sendFile}
                onStartCall={(type) => startCall(type)}
                onEndCall={endCall}
                onSendMessage={(text) => sendMessage(text)}
                onAddReceivedFile={(file) => {
                  setFiles(prev => [{
                    id: Math.random().toString(36).substring(2) + Date.now().toString(36),
                    name: file.name,
                    size: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    senderName: 'Network Peer',
                    senderColor: 'bg-accent',
                    timestamp: Date.now(),
                    status: 'completed',
                    isOutgoing: false,
                    blob: file
                  }, ...prev]);
                }}
                onNavigateToConnect={() => { setShowNetworkMapModal(false); setActiveTab(role ? "chat" : "qr"); }}
                onClose={() => setShowNetworkMapModal(false)}
                isModal={true}
              />
            </motion.div>
          </motion.div>
        )}

        {showSimWarning && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <div className="m3-card-xl max-w-md p-6 sm:p-7 shadow-2xl">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-text">
                <MaterialSymbol name="science" className="text-[color:var(--md-sys-color-primary)]" />
                <span>Start Demo Mesh?</span>
              </h3>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                Starting Demo Mode will disconnect your current session and create a simulated multi-peer room so you can test file streaming and encrypted chat.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setShowSimWarning(false)}
                  className="m3-surface-interactive border px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => toggleSimulation(true)}
                  className="m3-btn-filled px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
                >
                  Launch Demo
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <EasterEggModal 
          isOpen={showCreatorPopup} 
          onClose={() => setShowCreatorPopup(false)} 
        />
      </AnimatePresence>

      <CallOverlay 
        active={isCallActive}
        type={callType}
        localStream={localStream || localStreamRef.current}
        remoteStreams={remoteStreams}
        localProfile={profile}
        peerProfiles={peerProfiles}
        peerTrackStates={peerTrackStates}
        screenSharingPeers={screenSharingPeers}
        getPeerName={(peerId) => {
          const profId = peerIdToProfileId.current.get(peerId);
          if (profId && peerProfiles[profId]?.username) return peerProfiles[profId].username;
          if (peerProfiles[peerId]?.username) return peerProfiles[peerId].username;
          const cleanId = peerId.replace(/^mesh_/, '');
          if (peerProfiles[cleanId]?.username) return peerProfiles[cleanId].username;
          const matched = (Object.values(peerProfiles) as UserProfile[]).find(p => p.id === peerId || p.id === profId || p.id === cleanId);
          if (matched?.username) return matched.username;
          return 'Connected Peer';
        }}
        onEndCall={endCall}
        onToggleTrack={handleToggleTrack}
        onRequestAddTrack={handleAddTrack}
        onToggleScreenShare={handleToggleScreenShare}
        isMinimized={isCallMinimized}
        onToggleMinimize={() => setIsCallMinimized(prev => !prev)}
      />

      <AnimatePresence>
        {selectedPeerProfile && (
          <ViewProfileModal 
            profile={selectedPeerProfile}
            onClose={() => setSelectedPeerProfile(null)}
            onStartCall={startCall}
          />
        )}
      </AnimatePresence>

      <IncomingCallModal 
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onDecline={declineCall}
      />

      {/* Safe iPadOS / iOS 1-Tap Download Sheet (Corner Extra Large 28dp) */}
      {iosDownloadPrompt && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] p-5 m3-card-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text font-bold text-sm">
              <MaterialSymbol name="download_done" className="text-success" />
              <span>Payload Ready to Save</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                URL.revokeObjectURL(iosDownloadPrompt.url);
                setIosDownloadPrompt(null);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-text cursor-pointer"
            >
              <MaterialSymbol name="close" size={18} />
            </button>
          </div>
          <div className="text-xs text-text font-medium truncate">
            {iosDownloadPrompt.name}
          </div>
          <p className="text-[11px] text-muted">
            Tap below to save this payload directly to your device storage.
          </p>
          <a
            href={iosDownloadPrompt.url}
            download={iosDownloadPrompt.name}
            onClick={() => {
              setTimeout(() => {
                if (iosDownloadPrompt) {
                  URL.revokeObjectURL(iosDownloadPrompt.url);
                  setIosDownloadPrompt(null);
                }
              }, 1500);
            }}
            className="m3-btn-filled w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <MaterialSymbol name="download" size={16} />
            <span>Save File ({formatBytes(iosDownloadPrompt.blob.size)})</span>
          </a>
        </div>
      )}
    </div>
  );
}

function RoleCard({ num, icon, title, desc, actionLabel, onClick, onHoverChange, color }: { 
  num: string, 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  actionLabel?: string,
  onClick: () => void,
  onHoverChange?: (hovering: boolean) => void,
  color: 'accent' | 'success'
}) {
  return (
    <button 
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="ql-stage-card rounded-[24px] flex-1 p-5 sm:p-6 text-left transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between active:scale-[0.985] hover:border-[color:var(--md-sys-color-primary)]"
    >
      <div>
        <div className="flex justify-between items-center mb-3.5">
          <div
            className="w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105 border"
            style={{
              backgroundColor:
                color === 'accent'
                  ? 'var(--md-sys-color-primary-container)'
                  : 'var(--md-sys-color-tertiary-container)',
              color:
                color === 'accent'
                  ? 'var(--md-sys-color-on-primary-container)'
                  : 'var(--md-sys-color-on-tertiary-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            {icon}
          </div>
          <span className="text-[11px] font-mono font-medium text-muted">{num}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold mb-1.5 tracking-tight text-text">{title}</h3>
        <p className="text-xs sm:text-sm font-normal text-muted leading-relaxed mb-5">{desc}</p>
      </div>
      {actionLabel && (
        <div
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-full w-fit transition-all",
            color === 'accent' ? "m3-btn-filled" : "m3-btn-tertiary"
          )}
        >
          <span>{actionLabel}</span>
          <MaterialSymbol name="arrow_forward" size={16} />
        </div>
      )}
    </button>
  );
}

