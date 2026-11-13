import React, { useState, useRef, useMemo, useEffect } from 'react';
import { SafeQRCode } from './SafeQRCode';
import { motion } from 'motion/react';
import {
  Type,
  Maximize2,
  RefreshCw,
  Copy,
  Check,
  Download,
  X,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ECLevel = 'L' | 'M' | 'Q' | 'H';
type EmblemId = 'none' | 'quantum' | 'singularity' | 'grid';
type FrameStyleId = 'minimal' | 'exhibition' | 'cosmos';

interface QRStylePreset {
  id: string;
  name: string;
  fg: string;
  bg: string;
  accent: string;
  frame: FrameStyleId;
}

const QR_PRESETS: QRStylePreset[] = [
  {
    id: 'obsidian-ice',
    name: 'Obsidian Ice',
    fg: '#e2ecff',
    bg: '#070a12',
    accent: '#38bdf8',
    frame: 'cosmos',
  },
  {
    id: 'classic-print',
    name: 'Archival Print',
    fg: '#0b0f19',
    bg: '#ffffff',
    accent: '#1d4ed8',
    frame: 'exhibition',
  },
  {
    id: 'gargantua-gold',
    name: 'Singularity Gold',
    fg: '#fef3c7',
    bg: '#090604',
    accent: '#f59e0b',
    frame: 'cosmos',
  },
  {
    id: 'crimson-quasar',
    name: 'Crimson Quasar',
    fg: '#ffe4e6',
    bg: '#130508',
    accent: '#fb7185',
    frame: 'cosmos',
  },
  {
    id: 'emerald-node',
    name: 'Emerald Mesh',
    fg: '#ccfbe9',
    bg: '#04120e',
    accent: '#34d399',
    frame: 'exhibition',
  },
];

function buildOfflineEmblemDataUri(emblem: EmblemId, fgColor: string, bgColor: string): string | undefined {
  if (emblem === 'none' || typeof document === 'undefined') return undefined;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return undefined;

  // Rounded backdrop plate
  const r = 28;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(128 - r, 0);
  ctx.quadraticCurveTo(128, 0, 128, r);
  ctx.lineTo(128, 128 - r);
  ctx.quadraticCurveTo(128, 128, 128 - r, 128);
  ctx.lineTo(r, 128);
  ctx.quadraticCurveTo(0, 128, 0, 128 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = fgColor;
  ctx.fillStyle = fgColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (emblem === 'quantum') {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(64, 64, 22, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64, 64, 22, Math.PI * 1.15, Math.PI * 2.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(64, 64, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (emblem === 'singularity') {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-0.32);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(64, 64, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(64, 64, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 80, 80);
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 5;
    ctx.strokeRect(44, 44, 40, 40);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(64, 64, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  return c.toDataURL('image/png');
}

export const QRUtilityNode: React.FC = () => {
  const [data, setData] = useState("https://quantum.link/mesh");
  const [caption, setCaption] = useState("QUANTUM LINK // OPTICAL KEY");
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(288);
  const [marginSize, setMarginSize] = useState(2);
  const [ecLevel, setEcLevel] = useState<ECLevel>('H');
  const [fgColor, setFgColor] = useState('#e2ecff');
  const [bgColor, setBgColor] = useState('#070a12');
  const [accentColor, setAccentColor] = useState('#38bdf8');
  const [frameStyle, setFrameStyle] = useState<FrameStyleId>('cosmos');
  const [emblem, setEmblem] = useState<EmblemId>('quantum');
  const [activePresetId, setActivePresetId] = useState<string>('obsidian-ice');
  const qrRef = useRef<SVGSVGElement>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; filename: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const emblemUri = useMemo(
    () => buildOfflineEmblemDataUri(emblem, fgColor, bgColor),
    [emblem, fgColor, bgColor]
  );

  const applyPreset = (p: QRStylePreset) => {
    setActivePresetId(p.id);
    setFgColor(p.fg);
    setBgColor(p.bg);
    setAccentColor(p.accent);
    setFrameStyle(p.frame);
  };

  const generatePreview = (type: 'png' | 'svg') => {
    setExportError(null);
    const svg = qrRef.current;
    if (!svg) {
      setExportError('No QR matrix currently rendered to export.');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const fileName = `quantum_qr_${Date.now()}.${type}`;

      if (type === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setPreview({ url, type: 'svg', filename: fileName });
      } else {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = size;
          canvas.height = size;
          if (ctx) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setPreview({ url, type: 'png', filename: fileName });
            } else {
              setExportError('Failed to encode PNG output.');
            }
          });
        };
        img.onerror = () => {
          setExportError('Unable to rasterize SVG to PNG. Try exporting SVG instead.');
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-7xl mx-auto w-full flex flex-col gap-5 relative"
    >
      {/* Exhibition Header Row */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="text-[11px] font-mono tracking-[0.18em] uppercase text-[color:var(--md-sys-color-primary)]">
            03 · Optical Handshake &amp; Matrix Styling
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text leading-tight mt-0.5">
            QR Code Customisation Studio
          </h2>
        </div>
        <div className="text-[11px] font-mono text-muted flex items-center gap-2 tabular-nums">
          <span>{size}×{size}px</span>
          <span>·</span>
          <span>ECC-{ecLevel}</span>
          <span>·</span>
          <span className="uppercase">{fgColor}</span>
        </div>
      </div>

      {/* Main 12-Col Exhibition Split */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Payload & Customisation Controls */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          {/* Card 01: Payload Input */}
          <div className="ql-stage-card rounded-[24px] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-text">
                <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">01. Payload & Label</h3>
                  <p className="text-[11px] text-muted">Encode URL, invite token, or secret note</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setData("")}
                className="text-[11px] text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-1 font-semibold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            </div>

            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Type or paste a website link, invite token, or text..."
              className="w-full m3-surface-low border border-[var(--md-sys-color-outline-variant)] text-text p-3.5 rounded-2xl min-h-[86px] outline-none focus:border-[var(--md-sys-color-primary)] resize-none placeholder:text-muted/60 text-xs sm:text-sm font-mono leading-relaxed transition-colors"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Exhibition frame caption..."
                className="flex-1 m3-surface-low border border-[var(--md-sys-color-outline-variant)] text-text px-3.5 py-2 rounded-full text-xs font-mono outline-none focus:border-[var(--md-sys-color-primary)]"
              />
              <span className="text-[11px] font-mono text-muted tabular-nums px-2.5">
                {data.length} ch
              </span>
            </div>
          </div>

          {/* Card 02: Palette, Colors & Frame Customisation */}
          <div className="ql-stage-card rounded-[24px] p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-text">
              <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">02. Aesthetic & Colors</h3>
                <p className="text-[11px] text-muted">Curated dark/light themes & custom ink</p>
              </div>
            </div>

            {/* Preset Swatches */}
            <div className="grid grid-cols-5 gap-2">
              {QR_PRESETS.map((p) => {
                const selected = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95',
                      selected
                        ? 'border-[var(--md-sys-color-primary)] bg-white/10'
                        : 'border-[var(--md-sys-color-outline-variant)] hover:bg-white/5'
                    )}
                    title={p.name}
                  >
                    <div
                      className="w-7 h-7 rounded-lg border border-white/25 flex items-center justify-center"
                      style={{ backgroundColor: p.bg }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-xs"
                        style={{ backgroundColor: p.fg }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-text truncate w-full text-center">
                      {p.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Pickers */}
            <div className="grid grid-cols-3 gap-2.5">
              <label className="m3-surface-low border border-[var(--md-sys-color-outline-variant)] rounded-2xl p-2.5 flex items-center gap-2 cursor-pointer">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setFgColor(e.target.value);
                  }}
                  className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted">Ink</div>
                  <div className="text-[10px] font-mono text-text uppercase truncate">{fgColor}</div>
                </div>
              </label>

              <label className="m3-surface-low border border-[var(--md-sys-color-outline-variant)] rounded-2xl p-2.5 flex items-center gap-2 cursor-pointer">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setBgColor(e.target.value);
                  }}
                  className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted">Canvas</div>
                  <div className="text-[10px] font-mono text-text uppercase truncate">{bgColor}</div>
                </div>
              </label>

              <label className="m3-surface-low border border-[var(--md-sys-color-outline-variant)] rounded-2xl p-2.5 flex items-center gap-2 cursor-pointer">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setAccentColor(e.target.value);
                  }}
                  className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted">Rim</div>
                  <div className="text-[10px] font-mono text-text uppercase truncate">{accentColor}</div>
                </div>
              </label>
            </div>

            {/* Frame Style & Center Emblem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-medium text-muted mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Center Emblem
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'none', label: 'None' },
                    { id: 'quantum', label: 'Quantum' },
                    { id: 'singularity', label: 'Orbit' },
                    { id: 'grid', label: 'Matrix' },
                  ] as { id: EmblemId; label: string }[]).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setEmblem(item.id);
                        if (item.id !== 'none' && (ecLevel === 'L' || ecLevel === 'M')) {
                          setEcLevel('H');
                        }
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer',
                        emblem === item.id ? 'm3-tonal-active' : 'm3-surface-interactive'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-muted mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Error Correction
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['L', 'M', 'Q', 'H'] as ECLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEcLevel(lvl)}
                      className={cn(
                        'py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer',
                        ecLevel === lvl ? 'm3-tonal-active' : 'm3-surface-interactive'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 03: Geometry & Export */}
          <div className="ql-stage-card rounded-[24px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-text">
                <div className="w-8 h-8 rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">03. Scale & Export</h3>
                  <p className="text-[11px] text-muted">Resolution, quiet margin & offline download</p>
                </div>
              </div>
              <div className="flex gap-1 p-0.5 rounded-full border border-[var(--md-sys-color-outline-variant)]">
                {(['cosmos', 'exhibition', 'minimal'] as FrameStyleId[]).map((fs) => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setFrameStyle(fs)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-mono capitalize cursor-pointer transition-all',
                      frameStyle === fs ? 'm3-btn-filled' : 'text-muted hover:text-text'
                    )}
                  >
                    {fs}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[11px] text-muted mb-1.5">
                  <span>Export Size</span>
                  <span className="font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums">{size}px</span>
                </div>
                <input
                  type="range"
                  min="160"
                  max="1024"
                  step="32"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--md-sys-color-primary)] m3-surface-high h-1.5 rounded-full cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted mb-1.5">
                  <span>Quiet Margin</span>
                  <span className="font-mono font-bold text-[var(--md-sys-color-primary)] tabular-nums">{marginSize} mod</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={marginSize}
                  onChange={(e) => setMarginSize(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--md-sys-color-primary)] m3-surface-high h-1.5 rounded-full cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full m3-btn-tonal transition-all text-xs font-semibold cursor-pointer active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
              <button
                type="button"
                onClick={() => generatePreview('png')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full m3-btn-filled transition-all text-xs font-semibold cursor-pointer shadow-2xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PNG</span>
              </button>
              <button
                type="button"
                onClick={() => generatePreview('svg')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full m3-btn-tertiary transition-all text-xs font-semibold cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export SVG</span>
              </button>
            </div>
            {exportError && (
              <p className="text-[11px] font-mono text-red-400 px-1">{exportError}</p>
            )}
          </div>
        </div>

        {/* Right Column: Monolithic Spatial QR Exhibition Stage */}
        <div className="col-span-12 lg:col-span-7 ql-stage-card rounded-[28px] relative flex flex-col items-center justify-center overflow-hidden p-6 sm:p-10 min-h-[380px]">
          {/* Architectural Corner Reticles */}
          <span className="absolute top-4 left-4 text-[10px] font-mono text-white/35">+ OPTICAL MATRIX</span>
          <span className="absolute top-4 right-4 text-[10px] font-mono text-white/35 uppercase tabular-nums">
            ECC-{ecLevel} · {marginSize}M
          </span>
          <span className="absolute bottom-4 left-4 text-[10px] font-mono text-white/30">
            OFFLINE VECTOR RENDER
          </span>

          {/* Ambient Rim Halo behind QR Stage */}
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-300"
            style={{ backgroundColor: accentColor }}
          />

          <div
            className={cn(
              'relative z-10 transition-all duration-200 flex flex-col items-center',
              frameStyle === 'cosmos' && 'p-5 sm:p-7 rounded-[28px] border shadow-2xl',
              frameStyle === 'exhibition' && 'p-5 sm:p-7 rounded-2xl border shadow-2xl',
              frameStyle === 'minimal' && 'p-4 rounded-[22px] shadow-xl'
            )}
            style={{
              backgroundColor: bgColor,
              borderColor:
                frameStyle === 'cosmos'
                  ? accentColor
                  : frameStyle === 'exhibition'
                    ? 'rgba(255,255,255,0.22)'
                    : 'transparent',
              boxShadow:
                frameStyle === 'cosmos'
                  ? `0 25px 70px -15px ${accentColor}55`
                  : undefined,
            }}
          >
            <div className="w-[220px] sm:w-[270px] md:w-[300px] aspect-square flex items-center justify-center">
              <SafeQRCode
                ref={qrRef}
                value={data || " "}
                size={size}
                level={ecLevel}
                bgColor={bgColor}
                fgColor={fgColor}
                marginSize={marginSize}
                imageSettings={
                  emblemUri
                    ? {
                        src: emblemUri,
                        height: Math.round(size * 0.2),
                        width: Math.round(size * 0.2),
                        excavate: true,
                      }
                    : undefined
                }
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {frameStyle !== 'minimal' && caption.trim() && (
              <div
                className="w-full pt-3.5 mt-3.5 border-t flex items-center justify-between gap-3 text-[10px] font-mono tracking-[0.18em] uppercase"
                style={{
                  borderColor: `${fgColor}26`,
                  color: fgColor,
                }}
              >
                <span className="truncate font-bold">{caption}</span>
                <span className="shrink-0 opacity-70" style={{ color: accentColor }}>
                  ● LINK
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Overlay */}
      {preview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
        >
          <div className="w-full max-w-3xl max-h-[90vh] m3-card-xl rounded-[28px] flex flex-col p-5 sm:p-8 shadow-2xl overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 border-b border-[var(--md-sys-color-outline-variant)] pb-4">
              <div className="flex flex-col">
                <h2 className="text-lg sm:text-xl font-bold text-text">Download Custom QR Image</h2>
                <p className="text-xs text-muted mt-0.5 font-mono">
                  Format: {preview.type.toUpperCase()} ({size} × {size} px)
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full sm:w-auto">
                <a
                  href={preview.url}
                  download={preview.filename}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-2 py-2.5 px-5 rounded-full m3-btn-filled font-semibold text-xs transition-all shadow-2xs"
                >
                  <Download className="w-4 h-4" /> Save Image
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-2 py-2.5 px-5 rounded-full m3-btn-tonal font-semibold text-xs transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" /> Back
                </button>
              </div>
            </div>

            <div className="flex-1 border border-[var(--md-sys-color-outline-variant)] m3-surface-low rounded-2xl flex items-center justify-center relative overflow-hidden group p-6 min-h-[260px]">
              <img
                src={preview.url}
                alt="QR Preview"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("DownloadURL", `image/${preview.type}:${preview.filename}:${preview.url}`);
                }}
                className="max-w-full max-h-[55vh] object-contain cursor-grab active:cursor-grabbing rounded-2xl p-4 shadow-md border border-[var(--md-sys-color-outline-variant)]"
                style={{ backgroundColor: bgColor }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
