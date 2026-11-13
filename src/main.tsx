import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import App from './App.tsx';
import './index.css';

interface RootBoundaryProps {
  children?: React.ReactNode;
}

class RootErrorBoundary extends React.Component<
  RootBoundaryProps,
  { error: Error | null }
> {
  declare readonly props: Readonly<RootBoundaryProps>;
  declare setState: (state: Partial<{ error: Error | null }>) => void;
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] w-full bg-[#05070e] text-[#f4f6fb] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-[24px] border border-white/15 bg-white/5 p-6 space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber-400">
              Quantum Link Recovery
            </div>
            <h1 className="text-xl font-bold tracking-tight">Interface Recovered from Fault</h1>
            <p className="text-xs text-white/70 font-mono break-words leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10">
              {this.state.error.message || 'Unexpected rendering error'}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="w-full py-2.5 px-4 rounded-full bg-white text-black text-xs font-bold cursor-pointer hover:opacity-90"
            >
              Restore Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
