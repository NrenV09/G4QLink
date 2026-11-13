import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  ClipboardPaste,
  Flashlight,
  ImageUp,
  RefreshCw,
  SwitchCamera,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

interface CameraOption {
  id: string;
  label: string;
}

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<NativeBarcodeResult[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => NativeBarcodeDetector;

function getNativeBarcodeDetector(): NativeBarcodeDetector | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!ctor) return null;
  try {
    return new ctor({ formats: ['qr_code'] });
  } catch {
    try {
      return new ctor();
    } catch {
      return null;
    }
  }
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16));
}

function runJsQrOnCanvas(
  canvas: HTMLCanvasElement,
  inversionAttempts: 'attemptBoth' | 'dontInvert' | 'onlyInvert' = 'attemptBoth'
): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width < 16 || canvas.height < 16) return null;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const res = jsQR(imgData.data, canvas.width, canvas.height, { inversionAttempts });
  return res?.data ? res.data : null;
}

async function loadImageOffline(file: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  const isSvg = file.type === 'image/svg+xml';
  if (!isSvg && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width || 600,
        height: bitmap.height || 600,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read image file'));
    el.src = url;
  });

  return {
    source: img,
    width: img.naturalWidth || img.width || 600,
    height: img.naturalHeight || img.height || 600,
    cleanup: () => URL.revokeObjectURL(url),
  };
}

async function decodeFileOffline(file: File, fallbackSlotId: string): Promise<string> {
  const detector = getNativeBarcodeDetector();
  const loaded = await loadImageOffline(file);

  try {
    const srcW = Math.max(1, loaded.width);
    const srcH = Math.max(1, loaded.height);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Pass 1: Native offline BarcodeDetector if available in browser
    if (detector) {
      try {
        const hits = await detector.detect(loaded.source as ImageBitmapSource);
        const match = hits.find((h) => Boolean(h.rawValue));
        if (match?.rawValue) return match.rawValue;
      } catch {
        // Continue to jsQR offline passes
      }
    }

    // Pass 2: Pure-JS synchronous offline jsQR across clean target sizes + white quiet-zone padding
    const maxSrc = Math.max(srcW, srcH);
    const targetMaxDims = Array.from(
      new Set([
        Math.min(1200, Math.max(480, maxSrc)),
        Math.min(840, maxSrc),
        Math.min(1600, maxSrc),
      ])
    );

    for (const maxDim of targetMaxDims) {
      const scale = maxDim / maxSrc;
      const drawW = Math.max(64, Math.round(srcW * scale));
      const drawH = Math.max(64, Math.round(srcH * scale));
      const pad = Math.max(24, Math.round(Math.min(drawW, drawH) * 0.06));

      canvas.width = drawW + pad * 2;
      canvas.height = drawH + pad * 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.drawImage(loaded.source, pad, pad, drawW, drawH);

      const hit = runJsQrOnCanvas(canvas, 'attemptBoth');
      if (hit) return hit;
      await yieldToUI();
    }

    // Pass 3: Adaptive threshold high-contrast binarization (handles low-contrast camera photos / tinted screens)
    const binMax = Math.min(960, Math.max(480, maxSrc));
    const binScale = binMax / maxSrc;
    const bw = Math.max(64, Math.round(srcW * binScale));
    const bh = Math.max(64, Math.round(srcH * binScale));
    const bpad = 32;

    canvas.width = bw + bpad * 2;
    canvas.height = bh + bpad * 2;

    for (const invert of [false, true]) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(loaded.source, bpad, bpad, bw, bh);

      const frame = ctx.getImageData(bpad, bpad, bw, bh);
      const d = frame.data;
      let lumSum = 0;
      for (let i = 0; i < d.length; i += 4) {
        lumSum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
      const threshold = Math.max(60, Math.min(195, lumSum / (d.length / 4)));

      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const isDark = invert ? lum >= threshold : lum < threshold;
        const v = isDark ? 0 : 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(frame, bpad, bpad);

      const hit = runJsQrOnCanvas(canvas, 'dontInvert');
      if (hit) return hit;
      await yieldToUI();
    }
  } finally {
    loaded.cleanup();
  }

  // Pass 4: Bounded Html5Qrcode fallback (timeout-protected so ZXing can never stall the UI)
  try {
    const slot = document.getElementById(fallbackSlotId);
    if (slot) {
      const zxingScanner = new Html5Qrcode(fallbackSlotId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('QR decode timeout')), 3000)
      );
      try {
        const res = await Promise.race([zxingScanner.scanFileV2(file, false), timeoutPromise]);
        if (res?.decodedText) return res.decodedText;
      } finally {
        try {
          zxingScanner.clear();
        } catch {
          // Ignore DOM cleanup noise
        }
      }
    }
  } catch {
    // Fall through to helpful user-facing error
  }

  throw new Error(
    'No readable QR matrix found in this image. Ensure the code is sharp and uncropped, or paste the token.'
  );
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string>('Initializing offline scanner...');
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannedOnceRef = useRef(false);
  const decodingFileRef = useRef(false);
  const mountedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fallbackSlotId = 'qr-file-decoder-slot';

  const stopStreamAndLoop = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore already-stopped track errors
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {
        // Ignore DOM teardown state
      }
    }

    if (mountedRef.current) {
      setCameraActive(false);
      setTorchSupported(false);
      setTorchOn(false);
    }
  }, []);

  const deliverDecoded = useCallback(
    (decodedText: string) => {
      if (!decodedText || scannedOnceRef.current) return;
      scannedOnceRef.current = true;
      stopStreamAndLoop();
      onScan(decodedText);
    },
    [onScan, stopStreamAndLoop]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      scannedOnceRef.current = false;
      setError(null);
      setManualOpen(false);
      setManualText('');
      stopStreamAndLoop();
      return;
    }

    scannedOnceRef.current = false;
    let cancelled = false;

    const startCamera = async () => {
      stopStreamAndLoop();
      setError(null);

      const hasMediaDevices =
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices) &&
        typeof navigator.mediaDevices.getUserMedia === 'function';

      if (!hasMediaDevices) {
        setStatusNote('Camera API unavailable here');
        setError(
          'Live camera requires HTTPS or localhost. Scan offline using "Scan Photo / QR Image" or paste a token below.'
        );
        return;
      }

      setStatusNote('Starting local camera...');

      let discovered: CameraOption[] = [];
      try {
        if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
          const all = await navigator.mediaDevices.enumerateDevices();
          discovered = all
            .filter((d) => d.kind === 'videoinput' && d.deviceId)
            .map((d, idx) => ({
              id: d.deviceId,
              label: d.label || `Camera ${idx + 1}`,
            }));
          discovered.sort((a, b) => {
            const aBack = /back|rear|environment/i.test(a.label) ? 0 : 1;
            const bBack = /back|rear|environment/i.test(b.label) ? 0 : 1;
            return aBack - bBack;
          });
          if (!cancelled && discovered.length > 0) {
            setCameras(discovered);
          }
        }
      } catch {
        // enumerateDevices may require permission first
      }

      if (cancelled) return;

      const constraintCandidates: MediaStreamConstraints[] = [];
      if (discovered.length > 0) {
        const idx = Math.min(cameraIndex, discovered.length - 1);
        constraintCandidates.push({
          video: {
            deviceId: { exact: discovered[idx].id },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      }
      constraintCandidates.push(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false }
      );

      let acquired: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraints of constraintCandidates) {
        if (cancelled) break;
        try {
          acquired = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (cancelled) {
        acquired?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!acquired) {
        const msg = lastErr instanceof Error ? lastErr.message : String(lastErr || '');
        const denied = /Permission|NotAllowed/i.test(msg);
        setStatusNote('Camera unavailable');
        setError(
          denied
            ? 'Camera permission denied. Allow camera access or use "Scan Photo / QR Image" offline below.'
            : 'No live camera detected. Use "Scan Photo / QR Image" or paste a token below (100% offline).'
        );
        return;
      }

      streamRef.current = acquired;
      const videoEl = videoRef.current;
      if (!videoEl) {
        acquired.getTracks().forEach((t) => t.stop());
        return;
      }

      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.playsInline = true;
      videoEl.autoplay = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.srcObject = acquired;

      const tryPlay = async () => {
        try {
          if (videoEl.paused) {
            await videoEl.play();
          }
        } catch {
          // Ignore autoplay restriction; retried on frame tick
        }
      };

      videoEl.onloadedmetadata = () => {
        void tryPlay();
      };
      void tryPlay();

      if (cancelled) {
        stopStreamAndLoop();
        return;
      }

      setCameraActive(true);
      setStatusNote('Aim at QR payload (100% offline)');

      // Refresh labeled cameras and check torch / continuous focus capabilities
      try {
        if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
          const all = await navigator.mediaDevices.enumerateDevices();
          const list = all
            .filter((d) => d.kind === 'videoinput' && d.deviceId)
            .map((d, idx) => ({
              id: d.deviceId,
              label: d.label || `Camera ${idx + 1}`,
            }));
          if (!cancelled && list.length > 0) {
            setCameras(list);
          }
        }
        const [videoTrack] = acquired.getVideoTracks();
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const caps = videoTrack.getCapabilities() as Record<string, unknown>;
          if (!cancelled && Boolean(caps.torch)) {
            setTorchSupported(true);
          }
          if (
            Array.isArray(caps.focusMode) &&
            caps.focusMode.includes('continuous') &&
            typeof videoTrack.applyConstraints === 'function'
          ) {
            void videoTrack
              .applyConstraints({
                advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
              })
              .catch(() => {});
          }
        }
      } catch {
        // Optional capabilities check
      }

      const detector = getNativeBarcodeDetector();
      if (!scanCanvasRef.current) {
        scanCanvasRef.current = document.createElement('canvas');
      }
      let frameTick = 0;

      const scanFrame = async () => {
        if (cancelled || scannedOnceRef.current) return;
        const vid = videoRef.current;
        const canvas = scanCanvasRef.current;

        if (vid && vid.paused) {
          void vid.play().catch(() => {});
        }

        if (
          !decodingFileRef.current &&
          vid &&
          canvas &&
          vid.readyState >= 2 &&
          vid.videoWidth > 0 &&
          vid.videoHeight > 0
        ) {
          try {
            const vw = vid.videoWidth;
            const vh = vid.videoHeight;
            const useFullFrame = frameTick % 4 === 3;
            frameTick++;

            const srcSize = useFullFrame ? Math.min(vw, vh) : Math.round(Math.min(vw, vh) * 0.78);
            const sx = Math.max(0, Math.round((vw - srcSize) / 2));
            const sy = Math.max(0, Math.round((vh - srcSize) / 2));
            const targetSize = useFullFrame
              ? Math.min(640, Math.max(320, srcSize))
              : Math.min(540, Math.max(320, srcSize));

            if (canvas.width !== targetSize || canvas.height !== targetSize) {
              canvas.width = targetSize;
              canvas.height = targetSize;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(vid, sx, sy, srcSize, srcSize, 0, 0, targetSize, targetSize);

              if (detector) {
                try {
                  const nativeHits = await detector.detect(canvas);
                  const raw = nativeHits.find((h) => Boolean(h.rawValue))?.rawValue;
                  if (raw) {
                    deliverDecoded(raw);
                    return;
                  }
                } catch {
                  // Continue to jsQR
                }
              }

              const hit = runJsQrOnCanvas(canvas, 'attemptBoth');
              if (hit) {
                deliverDecoded(hit);
                return;
              }
            }
          } catch {
            // Keep scanning next frame
          }
        }

        if (!cancelled && !scannedOnceRef.current) {
          scanTimerRef.current = window.setTimeout(() => {
            void scanFrame();
          }, 200);
        }
      };

      scanTimerRef.current = window.setTimeout(() => {
        void scanFrame();
      }, 160);
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopStreamAndLoop();
    };
  }, [isOpen, cameraIndex, retryNonce, deliverDecoded, stopStreamAndLoop]);

  const handleToggleTorch = async () => {
    const [videoTrack] = streamRef.current?.getVideoTracks() || [];
    if (!videoTrack || !torchSupported) return;
    try {
      const next = !torchOn;
      await videoTrack.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleDecodeFile = async (file: File) => {
    setError(null);
    decodingFileRef.current = true;
    setIsDecodingImage(true);
    setStatusNote(`Decoding ${file.name} offline...`);
    await yieldToUI();
    try {
      const decoded = await decodeFileOffline(file, fallbackSlotId);
      deliverDecoded(decoded);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not decode a QR code from this image.'
      );
      setStatusNote(cameraActive ? 'Aim at QR payload (100% offline)' : 'Ready for offline image scan');
    } finally {
      decodingFileRef.current = false;
      if (mountedRef.current) {
        setIsDecodingImage(false);
      }
    }
  };

  const handleModalPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            void handleDecodeFile(blob);
            return;
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Offline QR Code Scanner"
      onPaste={handleModalPaste}
    >
      <div className="m3-card-xl w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl flex flex-col">
        {/* Top Modal Bar */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text leading-tight">
                Offline QR Scanner
              </h3>
              <p className="text-[11px] text-muted truncate">{statusNote}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {torchSupported && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer',
                  torchOn ? 'm3-btn-filled' : 'm3-surface-interactive'
                )}
                title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                aria-label="Toggle Flashlight"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={() => setCameraIndex((i) => (i + 1) % cameras.length)}
                className="m3-surface-interactive w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer"
                title="Switch Camera"
                aria-label="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="m3-surface-interactive w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer"
              title="Close Scanner"
              aria-label="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewport + Drag/Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) void handleDecodeFile(dropped);
          }}
          className={cn(
            'relative w-full aspect-square bg-black/90 overflow-hidden flex items-center justify-center',
            isDraggingFile && 'ring-2 ring-[color:var(--md-sys-color-primary)]'
          )}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              'w-full h-full object-cover transition-opacity duration-200',
              cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          />
          <div
            id={fallbackSlotId}
            className="fixed -left-[9999px] top-0 w-[600px] h-[600px] opacity-0 pointer-events-none"
            aria-hidden="true"
          />

          {/* Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div
              className={cn(
                'w-56 h-56 sm:w-60 sm:h-60 border-2 rounded-3xl transition-colors',
                cameraActive
                  ? 'border-[color:var(--md-sys-color-primary)] shadow-[0_0_28px_rgba(168,199,250,0.28)]'
                  : 'border-white/25'
              )}
            />
            {!cameraActive && !isDecodingImage && (
              <div className="mt-4 px-4 py-1.5 rounded-full bg-black/70 border border-white/15 text-[11px] font-medium text-white/85">
                {error ? 'Camera inactive — pick photo or paste token' : statusNote}
              </div>
            )}
            {isDecodingImage && (
              <div className="mt-4 px-4 py-1.5 rounded-full bg-black/80 border border-white/20 text-[11px] font-semibold text-white">
                Decoding QR image offline...
              </div>
            )}
          </div>

          {error && (
            <div className="absolute bottom-3 inset-x-3 bg-red-950/85 border border-red-400/35 backdrop-blur-md text-red-100 font-medium p-3 rounded-2xl text-center text-xs shadow-lg flex items-center justify-between gap-2">
              <span className="text-left leading-snug">{error}</span>
              <button
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
                className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                title="Retry Camera"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Offline Decoding Actions (Photo / Image Upload + Manual Token Paste) */}
        <div
          className="p-4 space-y-3 border-t"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleDecodeFile(file);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecodingImage}
              className="m3-btn-filled flex-1 py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              <ImageUp className="w-4 h-4" />
              <span>Scan Photo / QR Image</span>
            </button>

            <button
              type="button"
              onClick={() => setManualOpen((prev) => !prev)}
              className={cn(
                'py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border active:scale-[0.98]',
                manualOpen ? 'm3-tonal-active' : 'm3-btn-tonal'
              )}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste Token</span>
            </button>
          </div>

          {manualOpen && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste QLZ1: or handshake token..."
                className="flex-1 m3-surface-low rounded-full px-3.5 py-2 text-xs font-mono text-text outline-none focus:ring-2 focus:ring-[color:var(--md-sys-color-primary)]"
              />
              <button
                type="button"
                disabled={!manualText.trim()}
                onClick={() => deliverDecoded(manualText.trim())}
                className="m3-btn-filled px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
