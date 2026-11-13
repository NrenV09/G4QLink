import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowDown,
  ArrowLeftRight,
  Copy,
  Check,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';

type CodecFormat = 'base64' | 'hex' | 'uri' | 'binary';

export const Base64ToolNode: React.FC = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [codec, setCodec] = useState<CodecFormat>('base64');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwap = () => {
    if (!output) return;
    setInput(output);
    setOutput("");
    setMode((prev) => (prev === 'encode' ? 'decode' : 'encode'));
  };

  const handleDownloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_${codec}_${mode}_${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const processData = (targetMode = mode, targetCodec = codec, rawInput = input) => {
    if (!rawInput) {
      setOutput("");
      return;
    }

    try {
      if (targetCodec === 'base64') {
        if (targetMode === 'encode') {
          const encoded = btoa(
            encodeURIComponent(rawInput).replace(/%([0-9A-F]{2})/g, (_m, p1) =>
              String.fromCharCode(parseInt(p1, 16))
            )
          );
          setOutput(encoded);
        } else {
          const decoded = decodeURIComponent(
            Array.prototype.map
              .call(atob(rawInput.trim()), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          setOutput(decoded);
        }
      } else if (targetCodec === 'hex') {
        if (targetMode === 'encode') {
          const bytes = new TextEncoder().encode(rawInput);
          setOutput(
            Array.from(bytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ')
          );
        } else {
          const clean = rawInput.replace(/[^0-9a-fA-F]/g, '');
          if (clean.length % 2 !== 0) throw new Error('Odd hex length');
          const bytes = new Uint8Array(clean.length / 2);
          for (let i = 0; i < clean.length; i += 2) {
            bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
          }
          setOutput(new TextDecoder().decode(bytes));
        }
      } else if (targetCodec === 'uri') {
        setOutput(
          targetMode === 'encode'
            ? encodeURIComponent(rawInput)
            : decodeURIComponent(rawInput)
        );
      } else if (targetCodec === 'binary') {
        if (targetMode === 'encode') {
          const bytes = new TextEncoder().encode(rawInput);
          setOutput(
            Array.from(bytes)
              .map((b) => b.toString(2).padStart(8, '0'))
              .join(' ')
          );
        } else {
          const tokens = rawInput.trim().split(/\s+/);
          const bytes = new Uint8Array(
            tokens.map((t) => {
              if (!/^[01]{1,8}$/.test(t)) throw new Error('Invalid binary byte');
              return parseInt(t, 2);
            })
          );
          setOutput(new TextDecoder().decode(bytes));
        }
      }
    } catch {
      setOutput(
        `ERROR: FAILED TO ${targetMode.toUpperCase()} INPUT AS ${targetCodec.toUpperCase()}. VERIFY FORMAT.`
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col gap-4 w-full max-w-6xl mx-auto overflow-y-auto pb-24 lg:pb-4"
    >
      {/* Top Brutalist Exhibition Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-[color:var(--md-sys-color-primary)]">
            MODULE 04 · SIGNAL CODEC & PAYLOAD ENCODER
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text leading-tight mt-0.5">
            Offline Multi-Codec Encoder
          </h2>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-muted tabular-nums">
          <span>IN: {input.length} CH</span>
          <span>·</span>
          <span>OUT: {output.length} CH</span>
        </div>
      </div>

      {/* Main Translucent Obsidian Stage Card */}
      <div className="ql-stage-card rounded-[28px] p-5 sm:p-7 flex flex-col gap-5 flex-1 min-h-0">
        {/* Codec Format & Direction Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] pb-4">
          {/* Format Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full m3-surface-low border border-[var(--md-sys-color-outline-variant)] self-start">
            {([
              { id: 'base64', label: 'Base64' },
              { id: 'hex', label: 'Hexadecimal' },
              { id: 'uri', label: 'URL Safe' },
              { id: 'binary', label: 'Binary 8-Bit' },
            ] as { id: CodecFormat; label: string }[]).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCodec(c.id);
                  if (input) processData(mode, c.id, input);
                }}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-mono font-semibold rounded-full transition-all cursor-pointer',
                  codec === c.id ? 'm3-btn-filled shadow-2xs' : 'text-muted hover:text-text'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Encode / Decode Switcher */}
          <div className="flex gap-1 m3-surface-low p-1 rounded-full border border-[var(--md-sys-color-outline-variant)] self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setMode('encode');
                setOutput("");
              }}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer",
                mode === 'encode' ? "m3-tonal-active shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              Encode Text
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('decode');
                setOutput("");
              }}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer",
                mode === 'decode' ? "m3-btn-tertiary shadow-2xs" : "text-muted hover:text-text"
              )}
            >
              Decode Payload
            </button>
          </div>
        </div>

        {/* Dual Signal I/O Deck */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-[340px] relative gap-4">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text font-mono">
                {mode === 'encode'
                  ? "01. SOURCE TEXT INPUT"
                  : `01. ${codec.toUpperCase()} ENCODED INPUT`}
              </label>
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setOutput("");
                }}
                className="text-[11px] font-mono text-muted hover:text-text flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'encode'
                  ? "Type or paste plain text payload here..."
                  : `Paste ${codec.toUpperCase()} string here to decode...`
              }
              className="flex-1 m3-surface-low border border-[var(--md-sys-color-outline-variant)] rounded-2xl resize-none p-4 text-sm text-text font-mono focus:border-[var(--md-sys-color-primary)] focus:outline-none transition-colors min-h-[180px] placeholder:text-muted/60"
            />
          </div>

          {/* Center Convert & Swap Column */}
          <div className="flex lg:flex-col items-center justify-center gap-2.5 py-1">
            <button
              type="button"
              onClick={() => processData()}
              className={cn(
                "px-5 py-3 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-all flex-shrink-0 cursor-pointer text-xs font-semibold active:scale-95",
                mode === 'encode' ? "m3-btn-filled" : "m3-btn-tertiary"
              )}
              title="Run Codec Transform"
            >
              <span>{mode === 'encode' ? 'Encode' : 'Decode'}</span>
              <ArrowRight className="w-4 h-4 hidden lg:inline" />
              <ArrowDown className="w-4 h-4 lg:hidden" />
            </button>

            <button
              type="button"
              onClick={handleSwap}
              disabled={!output}
              className="p-2.5 rounded-full m3-surface-interactive border text-xs cursor-pointer disabled:opacity-35 active:scale-95"
              title="Swap output back to input & flip direction"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 flex-1 min-h-0 relative">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-text font-mono">
                {mode === 'encode'
                  ? `02. ${codec.toUpperCase()} OUTPUT`
                  : "02. DECODED TEXT OUTPUT"}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadOutput}
                  disabled={!output}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold m3-surface-interactive border transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.TXT</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95",
                    copied ? "bg-success/15 text-success border border-success/30" : "m3-btn-tonal"
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={output}
              placeholder="Converted signal output will appear here..."
              className="flex-1 m3-surface-low border border-[var(--md-sys-color-outline-variant)] rounded-2xl resize-none p-4 text-sm text-text font-mono focus:outline-none min-h-[180px] placeholder:text-muted/60"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
