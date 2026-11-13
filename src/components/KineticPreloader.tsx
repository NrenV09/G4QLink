import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface KineticPreloaderProps {
  visible: boolean;
  onComplete: () => void;
}

export const KineticPreloader: React.FC<KineticPreloaderProps> = ({ visible, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setProgress(0);
    const start = performance.now();
    const duration = 1150;
    let raf = 0;

    const step = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      // Crisp exponential ease-out feel
      const eased = 1 - Math.pow(1 - ratio, 2.4);
      setProgress(Math.round(eased * 100));
      if (ratio < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setTimeout(onComplete, 140);
      }
    };

    raf = requestAnimationFrame(step);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKey);
    };
  }, [visible, onComplete]);

  const totalBars = 18;
  const activeBars = Math.round((progress / 100) * totalBars);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="kinetic-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          onClick={onComplete}
          className="fixed inset-0 z-[300] bg-[#030407] text-[#eef2fa] flex flex-col items-center justify-center p-6 cursor-pointer select-none"
        >
          {/* Subtle Architectural Corner Crosshairs */}
          <div className="absolute top-6 left-6 text-[10px] font-mono tracking-[0.22em] text-white/40 uppercase">
            QUANTUM LINK · MESH KERNEL
          </div>
          <div className="absolute top-6 right-6 text-[10px] font-mono tracking-[0.22em] text-white/40 uppercase tabular-nums">
            OFFLINE EDITION
          </div>
          <div className="absolute bottom-6 left-6 text-[10px] font-mono tracking-[0.2em] text-white/35">
            + WEBRTC // DTLS-SRTP
          </div>
          <div className="absolute bottom-6 right-6 text-[10px] font-mono tracking-[0.2em] text-white/45 uppercase">
            CLICK TO ENTER
          </div>

          {/* Center Brutalist LOADING Display */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-[11px] font-mono tracking-[0.42em] text-white/80 uppercase">
              LOADING
            </div>

            <div className="flex items-center gap-[5px] px-3 py-2 border border-white/20 bg-white/[0.03]">
              {Array.from({ length: totalBars }).map((_, idx) => (
                <span
                  key={idx}
                  className="w-[4px] h-3.5 transition-all duration-75"
                  style={{
                    backgroundColor: idx < activeBars ? '#e2ecff' : 'rgba(255,255,255,0.12)',
                    boxShadow: idx < activeBars ? '0 0 8px rgba(168, 199, 250, 0.55)' : 'none',
                  }}
                />
              ))}
            </div>

            <div className="text-[11px] font-mono text-white/50 tabular-nums tracking-widest">
              {String(progress).padStart(3, '0')}%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
