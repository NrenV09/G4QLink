import React, { Component, forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

export type ECLevel = 'L' | 'M' | 'Q' | 'H';

// Conservative QR Version 40 Byte-mode capacities per Error Correction level
const QR_BYTE_LIMIT: Record<ECLevel, number> = {
  H: 1273,
  Q: 1663,
  M: 2331,
  L: 2953,
};

const ECC_FALLBACK_ORDER: ECLevel[] = ['H', 'Q', 'M', 'L'];

export interface SafeQRCodeProps {
  value: string;
  size?: number;
  level?: ECLevel;
  bgColor?: string;
  fgColor?: string;
  marginSize?: number;
  style?: React.CSSProperties;
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate: boolean;
    x?: number;
    y?: number;
    opacity?: number;
  };
}

interface BoundaryProps {
  resetKey: string;
  fallbackSize: number;
  children?: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class QRErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  declare readonly props: Readonly<BoundaryProps>;
  declare setState: (state: Partial<BoundaryState>) => void;
  state: BoundaryState = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(err: unknown): BoundaryState {
    return {
      hasError: true,
      errorMsg: err instanceof Error ? err.message : 'Unable to encode QR payload',
    };
  }

  componentDidUpdate(prevProps: BoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMsg: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-black/25 bg-black/5 text-black/80"
          style={{ width: this.props.fallbackSize, minHeight: this.props.fallbackSize }}
        >
          <QrCode className="w-8 h-8 opacity-50 mb-2" />
          <p className="text-xs font-bold">QR Capacity Reached</p>
          <p className="text-[11px] opacity-75 mt-1 leading-snug">
            {this.state.errorMsg}. Use <strong>Copy Invite / Token</strong> directly.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SafeQRCode = forwardRef<SVGSVGElement, SafeQRCodeProps>((props, ref) => {
  const {
    value,
    size = 190,
    bgColor,
    fgColor,
    marginSize = 2,
    style,
    imageSettings,
  } = props;
  const requestedLevel: ECLevel = props.level ?? 'L';
  const safeValue = value || ' ';
  const byteLen = new TextEncoder().encode(safeValue).length;

  // Automatically step down ECC if payload exceeds the requested level capacity
  let resolvedLevel: ECLevel = requestedLevel;
  if (byteLen > QR_BYTE_LIMIT[requestedLevel]) {
    const startIdx = ECC_FALLBACK_ORDER.indexOf(requestedLevel);
    const candidate = ECC_FALLBACK_ORDER.slice(startIdx).find(
      (lvl) => byteLen <= QR_BYTE_LIMIT[lvl]
    );
    resolvedLevel = candidate || 'L';
  }

  if (byteLen > QR_BYTE_LIMIT.L) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-black/25 bg-black/5 text-black/85"
        style={{ width: size, minHeight: size }}
      >
        <QrCode className="w-8 h-8 opacity-50 mb-2" />
        <p className="text-xs font-bold">Token Too Dense for QR ({byteLen} B)</p>
        <p className="text-[11px] opacity-75 mt-1 leading-snug">
          Max QR capacity is 2,953 bytes. Tap <strong>Copy Invite / Token</strong> below to pair directly.
        </p>
      </div>
    );
  }

  return (
    <QRErrorBoundary
      resetKey={`${safeValue.length}:${resolvedLevel}:${safeValue.slice(0, 24)}`}
      fallbackSize={size}
    >
      <QRCodeSVG
        ref={ref}
        value={safeValue}
        size={size}
        level={resolvedLevel}
        bgColor={bgColor}
        fgColor={fgColor}
        marginSize={marginSize}
        style={style}
        imageSettings={imageSettings}
      />
    </QRErrorBoundary>
  );
});

SafeQRCode.displayName = 'SafeQRCode';
