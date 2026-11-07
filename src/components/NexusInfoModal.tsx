import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { LegalComplianceView } from './LegalComplianceView';
import { MaterialSymbol } from '../lib/materialTheme';

interface NexusInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'guide' | 'dictionary' | 'offline' | 'legal';
}

export const NexusInfoModal: React.FC<NexusInfoModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTab = 'guide' 
}) => {
  const getNormalizedTab = (tab: string): 'guide' | 'features' | 'privacy' => {
    if (tab === 'legal') return 'privacy';
    if (tab === 'dictionary' || tab === 'offline') return 'features';
    return 'guide';
  };

  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'privacy'>(() => 
    getNormalizedTab(initialTab)
  );
  const [showFullLegalAudit, setShowFullLegalAudit] = useState(initialTab === 'legal');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 12, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col m3-card-xl rounded-[28px] shadow-2xl overflow-hidden text-text border"
          style={{
            backgroundColor: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                }}
              >
                <MaterialSymbol name="explore" size={22} filled />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-text flex items-center gap-2 flex-wrap">
                  <span>Quantum Link Guide & Legal Hub</span>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--md-sys-color-tertiary-container)',
                      color: 'var(--md-sys-color-on-tertiary-container)',
                    }}
                  >
                    Material You
                  </span>
                </h2>
                <p className="text-xs text-muted">
                  Direct WebRTC mesh guide, capabilities, and regulatory compliance
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-text m3-surface-interactive transition-colors border cursor-pointer"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
              aria-label="Close dialog"
            >
              <MaterialSymbol name="close" size={18} />
            </button>
          </div>

          {/* Segmented Pill Navigation */}
          <div
            className="grid grid-cols-3 gap-1.5 px-6 py-3 border-b flex-shrink-0"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <button
              onClick={() => setActiveTab('guide')}
              className={cn(
                "py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'guide'
                  ? "m3-btn-filled shadow-xs"
                  : "m3-surface-interactive text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="bolt" size={16} filled={activeTab === 'guide'} />
              <span className="truncate">How to Connect</span>
            </button>

            <button
              onClick={() => setActiveTab('features')}
              className={cn(
                "py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'features'
                  ? "m3-btn-filled shadow-xs"
                  : "m3-surface-interactive text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="widgets" size={16} filled={activeTab === 'features'} />
              <span className="truncate">Capabilities</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={cn(
                "py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'privacy'
                  ? "m3-btn-tertiary shadow-xs"
                  : "m3-surface-interactive text-muted hover:text-text"
              )}
            >
              <MaterialSymbol name="policy" size={16} filled={activeTab === 'privacy'} />
              <span className="truncate">Legal & Regulatory</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* TAB 1: HOW IT WORKS */}
            {activeTab === 'guide' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {[
                    {
                      step: '01',
                      icon: 'wifi_tethering',
                      title: 'Create a Mesh Room',
                      desc: 'On Device 1, tap Create a Mesh Room to generate an encrypted Offer QR code or token.',
                      tone: 'primary',
                    },
                    {
                      step: '02',
                      icon: 'qr_code_scanner',
                      title: 'Join & Reply',
                      desc: 'On Device 2, tap Join a Mesh Room, scan or paste the Offer, and present your Answer QR.',
                      tone: 'secondary',
                    },
                    {
                      step: '03',
                      icon: 'verified',
                      title: 'Instant P2P Tunnel',
                      desc: 'Device 1 scans the Answer QR. Both devices establish a direct DTLS-SRTP encrypted link.',
                      tone: 'tertiary',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="m3-card p-4 sm:p-5 rounded-2xl border flex flex-col justify-between"
                      style={{
                        backgroundColor: 'var(--md-sys-color-surface-container)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{
                              backgroundColor:
                                item.tone === 'primary'
                                  ? 'var(--md-sys-color-primary-container)'
                                  : item.tone === 'secondary'
                                    ? 'var(--md-sys-color-secondary-container)'
                                    : 'var(--md-sys-color-tertiary-container)',
                              color:
                                item.tone === 'primary'
                                  ? 'var(--md-sys-color-on-primary-container)'
                                  : item.tone === 'secondary'
                                    ? 'var(--md-sys-color-on-secondary-container)'
                                    : 'var(--md-sys-color-on-tertiary-container)',
                            }}
                          >
                            <MaterialSymbol name={item.icon} size={20} filled />
                          </div>
                          <span className="text-xs font-mono font-semibold text-muted">
                            {item.step}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-text mb-1.5">{item.title}</h4>
                        <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Direct Disk Stream Highlight */}
                <div
                  className="m3-card p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-low)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }}
                  >
                    <MaterialSymbol name="hard_drive" size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-bold text-text">
                      Multi-Gigabyte Direct Disk Streaming
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Enable <strong>Direct Save</strong> to stream incoming payloads straight to disk via the File System Access API or OPFS, bypassing browser RAM limits.
                    </p>
                  </div>
                </div>

                {/* Local Wi-Fi Mesh Highlight */}
                <div
                  className="m3-card p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-low)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--md-sys-color-tertiary-container)',
                      color: 'var(--md-sys-color-on-tertiary-container)',
                    }}
                  >
                    <MaterialSymbol name="router" size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-bold text-text">
                      Works Over Local LAN & Hotspot Without Internet
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      When devices share a Wi-Fi router or mobile hotspot, WebRTC ICE host candidates route packets directly over the local radio link at maximum hardware speed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CAPABILITIES */}
            {activeTab === 'features' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    icon: 'upload_file',
                    title: '64KB Chunked File Streaming',
                    desc: 'High-throughput WebRTC DataChannel streaming with backpressure control and SHA-verified integrity.',
                  },
                  {
                    icon: 'videocam',
                    title: 'Expressive Voice & Video Calls',
                    desc: 'Full HD camera, voice, and 1080p screen mirroring with Spotlight, Theater mode, and draggable Picture-in-Picture.',
                  },
                  {
                    icon: 'hub',
                    title: 'Quantum Link Mesh & Failover',
                    desc: 'Interactive multi-node mesh topology with deterministic host election, heartbeat watchdogs, and quorum protection.',
                  },
                  {
                    icon: 'chat',
                    title: 'E2EE Chat & Voice Notes',
                    desc: 'Instant peer-to-peer messaging with replies, reactions, inline file attachments, and waveform voice notes.',
                  },
                  {
                    icon: 'palette',
                    title: 'Android 16 Material You Studio',
                    desc: 'Dynamic HCT tonal palettes extracted from your wallpaper or custom seed hex, plus adaptive app icon presets.',
                  },
                  {
                    icon: 'delete_sweep',
                    title: 'Instant Sandbox Purge',
                    desc: 'Wipe all local CacheStorage buckets, OPFS streams, and session profiles anytime with a single tap.',
                  },
                ].map((feat) => (
                  <div
                    key={feat.title}
                    className="m3-card p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: 'var(--md-sys-color-surface-container)',
                      borderColor: 'var(--md-sys-color-outline-variant)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-text">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                        }}
                      >
                        <MaterialSymbol name={feat.icon} size={18} />
                      </div>
                      <span>{feat.title}</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: PRIVACY & LEGAL */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                {/* 4 Expressive Guarantees */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      icon: 'visibility_off',
                      title: 'Zero Tracking or Analytics',
                      desc: 'No telemetry beacons, no advertising pixels, and zero behavioral fingerprinting.',
                    },
                    {
                      icon: 'cloud_off',
                      title: 'Zero Cloud Storage',
                      desc: 'Payloads travel directly between peer browsers and never touch a central server.',
                    },
                    {
                      icon: 'no_accounts',
                      title: 'No Accounts or Sign-Up',
                      desc: 'No phone numbers, emails, or centralized credentials required to link devices.',
                    },
                    {
                      icon: 'workspace_premium',
                      title: '100% Free & MIT Open Source',
                      desc: 'Auditable client-side source code with zero subscriptions or hidden fees.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="m3-card p-4 rounded-2xl border flex items-start gap-3"
                      style={{
                        backgroundColor: 'var(--md-sys-color-surface-container)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: 'var(--md-sys-color-tertiary-container)',
                          color: 'var(--md-sys-color-on-tertiary-container)',
                        }}
                      >
                        <MaterialSymbol name={item.icon} size={18} />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-text">{item.title}</h4>
                        <p className="text-[11px] text-muted leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Collapsible Full Legal & Regulatory Explorer */}
                <div
                  className="pt-3 border-t"
                  style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                >
                  <button
                    onClick={() => setShowFullLegalAudit(prev => !prev)}
                    className="w-full py-3 px-4 rounded-full m3-surface-interactive border text-xs font-semibold text-text flex items-center justify-between transition-all cursor-pointer"
                    style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                  >
                    <span className="flex items-center gap-2">
                      <MaterialSymbol
                        name="verified_user"
                        size={18}
                        className="text-[color:var(--md-sys-color-primary)]"
                      />
                      <span>
                        {showFullLegalAudit
                          ? 'Hide Interactive Legal & Regulatory Explorer'
                          : 'Open Full Legal, Privacy & Regulatory Explorer (14 Point Audit)'}
                      </span>
                    </span>
                    <MaterialSymbol
                      name={showFullLegalAudit ? 'expand_less' : 'expand_more'}
                      size={18}
                    />
                  </button>

                  {showFullLegalAudit && (
                    <div className="mt-4">
                      <LegalComplianceView />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-t text-xs text-muted flex-shrink-0"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Quantum Link • Direct P2P WebRTC • Zero Servers</span>
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full m3-btn-filled text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
