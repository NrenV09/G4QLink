import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowDown, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const Base64ToolNode: React.FC = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const processData = () => {
    if (!input) {
      setOutput("");
      return;
    }

    try {
      if (mode === 'encode') {
        const encoded = btoa(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
        }));
        setOutput(encoded);
      } else {
        const decoded = decodeURIComponent(Array.prototype.map.call(atob(input), (c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setOutput(decoded);
      }
    } catch (err) {
      setOutput("ERROR: FAILED TO PROCESS STRING. PLEASE MAKE SURE THE INPUT IS VALID BASE64.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col gap-6 w-full max-w-5xl mx-auto overflow-y-auto pb-20 lg:pb-0"
    >
      <div className="glass-panel p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.07] pb-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-text tracking-tight">
              Base64 Encoder / Decoder
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Encode and decode strings instantly to and from Base64 in your local workspace.
            </p>
          </div>

          <div className="flex gap-1.5 bg-slate-100 dark:bg-[#0a0c12] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.07] self-start sm:self-auto">
            <button 
              type="button"
              onClick={() => { setMode('encode'); setOutput(""); }}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                mode === 'encode' 
                  ? "bg-white dark:bg-[#181c26] text-accent border border-slate-200/80 dark:border-white/[0.1] shadow-xs" 
                  : "text-muted hover:text-text border border-transparent"
              )}
            >
              Encode Mode
            </button>
            <button 
              type="button"
              onClick={() => { setMode('decode'); setOutput(""); }}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                mode === 'decode' 
                  ? "bg-white dark:bg-[#181c26] text-success border border-slate-200/80 dark:border-white/[0.1] shadow-xs" 
                  : "text-muted hover:text-text border border-transparent"
              )}
            >
              Decode Mode
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-auto lg:h-96 relative gap-5">
          <div className="flex flex-col gap-2.5 flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted pl-1">Input String</label>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? "Paste raw text to encode..." : "Paste Base64 encoded payload to decode..."}
              className="flex-1 bg-slate-50 dark:bg-[#0a0c12] border border-slate-200/80 dark:border-white/[0.08] rounded-xl resize-none p-4 text-xs sm:text-sm text-text font-mono focus:border-accent/60 focus:outline-none transition-colors min-h-[200px] placeholder:text-muted/50"
            />
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <button 
              type="button"
              onClick={processData}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-[#161a24] shadow-sm border hover:scale-105 active:scale-95 transition-all flex-shrink-0 mt-6 cursor-pointer",
                mode === 'encode' ? "border-accent/40 text-accent hover:bg-accent hover:text-white" : "border-success/40 text-success hover:bg-success hover:text-white"
              )}
              title="Process Data"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex lg:hidden items-center justify-center my-1">
            <button 
              type="button"
              onClick={processData}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-[#161a24] shadow-sm border hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer",
                mode === 'encode' ? "border-accent/40 text-accent" : "border-success/40 text-success"
              )}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5 flex-1 relative">
            <div className="flex items-center justify-between pl-1 pr-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">Output String</label>
              <button 
                type="button"
                onClick={handleCopy}
                className={cn(
                  "px-3 py-1 rounded-lg border text-xs font-medium transition-colors bg-slate-100 dark:bg-white/[0.04] cursor-pointer flex items-center gap-1.5",
                  copied ? "text-success border-success/40 bg-success/10" : "border-slate-200/80 dark:border-white/[0.08] text-text hover:text-accent hover:border-accent/40"
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Output"}
              </button>
            </div>
            <textarea 
              readOnly
              value={output}
              placeholder="Output will appear here..."
              className="flex-1 bg-slate-50 dark:bg-[#0a0c12] border border-slate-200/80 dark:border-white/[0.08] rounded-xl resize-none p-4 text-xs sm:text-sm text-text font-mono focus:outline-none min-h-[200px] placeholder:text-muted/50"
            />
          </div>
        </div>

        <button 
          type="button"
          onClick={processData}
          className={cn(
            "lg:hidden mt-2 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer",
            mode === 'encode' ? "bg-accent text-white hover:bg-accent/90" : "bg-success text-white hover:bg-emerald-600"
          )}
        >
          Process Data
        </button>
      </div>
    </motion.div>
  );
};
