import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Type, Maximize2, RefreshCw, Copy, Check, Eye, Download, X, GripHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export const QRUtilityNode: React.FC = () => {
  const [data, setData] = useState("https://nexus.p2p");
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(256);
  const qrRef = useRef<SVGSVGElement>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; filename: string } | null>(null);

  const generatePreview = (type: 'png' | 'svg') => {
    const svg = qrRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const fileName = `nexus_qr_${Date.now()}.${type}`;

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
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPreview({ url, type: 'png', filename: fileName });
          }
        });
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid grid-cols-12 gap-6 h-full overflow-y-auto pb-20 lg:pb-0 relative"
    >
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        {/* Source Data Input */}
        <div className="glass-panel p-6 flex flex-col shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 text-text">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Type className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">Source Data</h3>
          </div>
          
          <textarea 
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder="Enter URL or text to encode..."
            className="w-full bg-slate-50 dark:bg-[#0a0c12] border border-slate-200/80 dark:border-white/[0.08] text-text p-4 rounded-xl min-h-[120px] outline-none focus:border-accent/60 resize-none placeholder:text-muted/60 mb-4 font-mono text-xs leading-relaxed transition-colors"
          />

          <div className="flex justify-between items-center bg-slate-100/70 dark:bg-white/[0.03] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.07]">
            <span className="text-xs text-muted font-mono tabular-nums">Length: {data.length} chars</span>
            <button 
              onClick={() => setData("")}
              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-1.5 font-medium bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        {/* Config Panel */}
        <div className="glass-panel p-6 flex-1 flex flex-col shadow-sm">
          <div className="flex items-center gap-2.5 mb-6 text-text">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-muted">
              <Maximize2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">Configuration</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-medium text-muted mb-3">
                <span>Output Dimension</span>
                <span className="text-accent font-mono tabular-nums">{size}px</span>
              </div>
              <input 
                type="range"
                min="128"
                max="1024"
                step="32"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="w-full accent-accent bg-slate-200 dark:bg-white/10 h-1.5 rounded-full cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={copyToClipboard}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-accent/40 hover:text-accent transition-all text-xs font-medium text-text cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                Copy Raw
              </button>
              <button 
                onClick={() => generatePreview('png')}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-accent/40 transition-all text-xs font-medium text-text cursor-pointer"
              >
                <Eye className="w-4 h-4 text-accent" />
                PNG Export
              </button>
              <button 
                onClick={() => generatePreview('svg')}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-success/40 transition-all text-xs font-medium text-text cursor-pointer"
              >
                <Eye className="w-4 h-4 text-success" />
                SVG Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="col-span-12 lg:col-span-7 glass-panel relative flex items-center justify-center overflow-hidden p-12 min-h-[400px] shadow-sm">
        <div className="absolute top-5 left-5 text-xs text-muted flex items-center gap-2 font-medium bg-slate-100 dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/[0.07]">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live Matrix Preview
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl relative shadow-xl ring-1 ring-slate-900/5 group transition-transform hover:scale-[1.01] w-fit max-w-full flex items-center justify-center aspect-square mx-auto">
          <QRCodeSVG 
            ref={qrRef}
            value={data || " "}
            size={size}
            level="H"
            bgColor="#ffffff"
            fgColor="#090a0f"
            includeMargin={false}
            style={{ width: '100%', height: '100%', maxWidth: `${size}px`, maxHeight: `${size}px` }}
          />
        </div>
      </div>

      {/* Preview Overlay */}
      {preview && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 bg-white dark:bg-[#0f1219] flex flex-col p-4 sm:p-8 border border-slate-200/80 dark:border-white/[0.08] shadow-2xl rounded-2xl overflow-y-auto"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-bold text-text tracking-tight">QR Export Preview</h2>
              <p className="text-xs text-muted mt-1 font-mono">
                Drag image to save • Format: {preview.type.toUpperCase()}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full sm:w-auto">
              <a 
                href={preview.url} 
                download={preview.filename}
                className="flex-1 sm:flex-none justify-center flex items-center gap-2 py-2 px-4 sm:py-2.5 sm:px-5 rounded-xl bg-success text-white font-semibold text-xs hover:bg-emerald-600 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button 
                onClick={() => setPreview(null)}
                className="flex-1 sm:flex-none justify-center flex items-center gap-2 py-2 px-4 sm:py-2.5 sm:px-5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-text font-semibold text-xs hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </div>

          <div className="flex-1 border border-slate-200/80 dark:border-white/[0.07] bg-slate-50 dark:bg-[#090a0f] rounded-2xl flex items-center justify-center relative overflow-hidden group p-6">
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#161a24]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.1] px-4 py-2 rounded-xl flex gap-2 items-center text-xs text-text font-medium shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripHorizontal className="w-4 h-4 text-accent" /> Drag to Desktop
            </div>
            <img 
              src={preview.url} 
              alt="QR Preview" 
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData("DownloadURL", `image/${preview.type}:${preview.filename}:${preview.url}`);
              }}
              className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing rounded-xl bg-white p-4 shadow-xl"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
