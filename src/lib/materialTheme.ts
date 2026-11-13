import React from 'react';
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Circle,
  CloudOff,
  Compass,
  Contrast,
  Cookie,
  Copy,
  Database,
  Droplet,
  EyeOff,
  FileCode2,
  FileText,
  FileUp,
  FlaskConical,
  Flower2,
  Folders,
  FolderDown,
  GitFork,
  Grip,
  HardDrive,
  HeartHandshake,
  HelpCircle,
  History,
  ImagePlus,
  Layers,
  LayoutGrid,
  Link2Off,
  ListChecks,
  MessageSquare,
  MonitorUp,
  Moon,
  Network,
  Palette,
  Phone,
  PhoneCall,
  PhoneOff,
  Pipette,
  QrCode,
  Radio,
  Router,
  Save,
  Scale,
  ScanLine,
  Settings2,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Sun,
  Trash2,
  UserX,
  Vibrate,
  Video,
  Wallpaper,
  X,
  Zap,
  Sparkles,
} from 'lucide-react';

export type ThemeMode = 'light' | 'dark';
export type ContrastLevel = 'standard' | 'high';
export type AppIconPresetId = 'monochrome' | 'dynamic-adaptive' | 'quantum-core' | 'obsidian-pulse' | 'solar-flare' | 'cyber-blueprint';
export type AppIconShape = 'squircle' | 'circle' | 'cookie' | 'teardrop' | 'rounded-square';

export interface WallpaperPreset {
  id: string;
  name: string;
  subtitle: string;
  seedHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  gradientCss: string;
}

export interface MaterialThemeState {
  seedHex: string;
  mode: ThemeMode;
  contrast: ContrastLevel;
  source: 'seed' | 'wallpaper';
  wallpaperId: string;
  customWallpaperUrl?: string;
  extractedColors?: string[];
  appIconPreset: AppIconPresetId;
  appIconShape: AppIconShape;
  hapticsEnabled: boolean;
}

export const MATERIAL_SEED_PRESETS = [
  { id: 'quantum-indigo', name: 'Quantum Indigo', hex: '#4F46E5' },
  { id: 'pixel-blue', name: 'Pixel Cobalt', hex: '#1B6EF3' },
  { id: 'android-teal', name: 'Android Emerald', hex: '#0D9488' },
  { id: 'expressive-plum', name: 'Expressive Violet', hex: '#7C3AED' },
  { id: 'coral-rose', name: 'Sunset Coral', hex: '#E11D48' },
  { id: 'amber-gold', name: 'Solar Amber', hex: '#D97706' },
  { id: 'sage-moss', name: 'Botanical Sage', hex: '#3F6212' },
  { id: 'ocean-cyan', name: 'Pacific Cyan', hex: '#0284C7' },
];

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'quantum-aurora',
    name: 'Quantum Aurora',
    subtitle: 'Indigo & Teal atmospheric mesh',
    seedHex: '#4F46E5',
    secondaryHex: '#0D9488',
    tertiaryHex: '#9333EA',
    gradientCss: 'radial-gradient(circle at 20% 20%, #4f46e5 0%, #0d9488 52%, #0f172a 100%)',
  },
  {
    id: 'pixel-horizon',
    name: 'Pixel Horizon',
    subtitle: 'Android 16 Sky Cobalt & Lavender',
    seedHex: '#1B6EF3',
    secondaryHex: '#6366F1',
    tertiaryHex: '#06B6D4',
    gradientCss: 'linear-gradient(135deg, #1b6ef3 0%, #6366f1 50%, #06b6d4 100%)',
  },
  {
    id: 'sunset-dunes',
    name: 'Crimson Dunes',
    subtitle: 'Warm Terracotta, Rose & Amber',
    seedHex: '#E11D48',
    secondaryHex: '#EA580C',
    tertiaryHex: '#F59E0B',
    gradientCss: 'radial-gradient(circle at 80% 25%, #f59e0b 0%, #e11d48 55%, #4c0519 100%)',
  },
  {
    id: 'botanical-mist',
    name: 'Botanical Mist',
    subtitle: 'Organic Emerald, Mint & Forest',
    seedHex: '#059669',
    secondaryHex: '#10B981',
    tertiaryHex: '#0284C7',
    gradientCss: 'linear-gradient(145deg, #059669 0%, #0d9488 55%, #064e3b 100%)',
  },
];

export const DEFAULT_MATERIAL_THEME: MaterialThemeState = {
  seedHex: '#1B6EF3',
  mode: 'dark',
  contrast: 'standard',
  source: 'seed',
  wallpaperId: 'pixel-horizon',
  appIconPreset: 'dynamic-adaptive',
  appIconShape: 'squircle',
  hapticsEnabled: true,
};

// --- Color Math Helpers ---
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;

  if (hNorm < 60) { r = c; g = x; b = 0; }
  else if (hNorm < 120) { r = x; g = c; b = 0; }
  else if (hNorm < 180) { r = 0; g = c; b = x; }
  else if (hNorm < 240) { r = 0; g = x; b = c; }
  else if (hNorm < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Extract dominant vibrant color palette from an uploaded image DataURL
export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(['#1B6EF3', '#4F46E5', '#0D9488']);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets: Record<number, { count: number; r: number; g: number; b: number; sat: number }> = {};

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const { h, s, l } = rgbToHsl(r, g, b);
          if (l < 12 || l > 90 || s < 15) continue;
          const bucketKey = Math.floor(h / 30);
          if (!buckets[bucketKey]) {
            buckets[bucketKey] = { count: 0, r: 0, g: 0, b: 0, sat: 0 };
          }
          buckets[bucketKey].count += 1;
          buckets[bucketKey].r += r;
          buckets[bucketKey].g += g;
          buckets[bucketKey].b += b;
          buckets[bucketKey].sat += s;
        }

        const sorted = Object.values(buckets)
          .sort((a, b) => (b.count * (b.sat / b.count)) - (a.count * (a.sat / a.count)))
          .slice(0, 4)
          .map(b => rgbToHex(b.r / b.count, b.g / b.count, b.b / b.count));

        if (sorted.length === 0) {
          resolve(['#1B6EF3', '#6366F1', '#0D9488']);
        } else {
          resolve(sorted);
        }
      } catch {
        resolve(['#1B6EF3', '#6366F1', '#0D9488']);
      }
    };
    img.onerror = () => resolve(['#1B6EF3', '#6366F1', '#0D9488']);
    img.src = imageUrl;
  });
}

// Compute full Android 16 Material You (M3 Expressive) tokens from seedHex, mode, and contrast
export function computeM3Tokens(seedHex: string, mode: ThemeMode, contrast: ContrastLevel) {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);
  const sat = Math.max(48, Math.min(92, s));
  const secH = (h + 24) % 360;
  const tertH = (h + 68) % 360;
  const isHigh = contrast === 'high';

  if (mode === 'light') {
    const primary = hslToHex(h, sat, isHigh ? 30 : 42);
    const onPrimary = '#FFFFFF';
    const primaryContainer = hslToHex(h, Math.min(90, sat + 5), isHigh ? 84 : 90);
    const onPrimaryContainer = hslToHex(h, sat, isHigh ? 10 : 18);

    const secondary = hslToHex(secH, Math.max(25, sat * 0.45), isHigh ? 32 : 42);
    const onSecondary = '#FFFFFF';
    const secondaryContainer = hslToHex(secH, Math.max(30, sat * 0.5), isHigh ? 84 : 90);
    const onSecondaryContainer = hslToHex(secH, Math.max(35, sat * 0.55), 18);

    const tertiary = hslToHex(tertH, Math.max(40, sat * 0.7), isHigh ? 32 : 42);
    const onTertiary = '#FFFFFF';
    const tertiaryContainer = hslToHex(tertH, Math.max(45, sat * 0.75), isHigh ? 85 : 91);
    const onTertiaryContainer = hslToHex(tertH, Math.max(45, sat * 0.75), 18);

    const surface = hslToHex(h, 18, 98);
    const surfaceContainerLowest = '#FFFFFF';
    const surfaceContainerLow = hslToHex(h, 20, 96);
    const surfaceContainer = hslToHex(h, 22, 93);
    const surfaceContainerHigh = hslToHex(h, 22, 90);
    const surfaceContainerHighest = hslToHex(h, 24, 86);

    const onSurface = isHigh ? '#000000' : hslToHex(h, 18, 11);
    const onSurfaceVariant = isHigh ? hslToHex(h, 18, 20) : hslToHex(h, 14, 34);
    const outlineHex = hslToHex(h, 14, isHigh ? 35 : 52);
    const outlineVariantHex = hslToHex(h, 18, isHigh ? 45 : 72);

    return {
      primary,
      onPrimary,
      primaryContainer,
      onPrimaryContainer,
      secondary,
      onSecondary,
      secondaryContainer,
      onSecondaryContainer,
      tertiary,
      onTertiary,
      tertiaryContainer,
      onTertiaryContainer,
      surface,
      surfaceContainerLowest,
      surfaceContainerLow,
      surfaceContainer,
      surfaceContainerHigh,
      surfaceContainerHighest,
      onSurface,
      onSurfaceVariant,
      outline: outlineHex,
      outlineVariant: hexToRgba(outlineVariantHex, isHigh ? 0.75 : 0.42),
      outlineVariantSolid: outlineVariantHex,
      success: isHigh ? '#0F7638' : '#15803D',
    };
  } else {
    // Dark Mode M3 Expressive
    const primary = hslToHex(h, Math.min(95, sat + 10), isHigh ? 82 : 74);
    const onPrimary = hslToHex(h, sat, 14);
    const primaryContainer = hslToHex(h, Math.max(45, sat * 0.8), isHigh ? 32 : 25);
    const onPrimaryContainer = hslToHex(h, Math.min(96, sat + 12), 90);

    const secondary = hslToHex(secH, Math.max(28, sat * 0.45), 76);
    const onSecondary = hslToHex(secH, Math.max(30, sat * 0.5), 16);
    const secondaryContainer = hslToHex(secH, Math.max(30, sat * 0.45), isHigh ? 30 : 23);
    const onSecondaryContainer = hslToHex(secH, Math.max(35, sat * 0.55), 89);

    const tertiary = hslToHex(tertH, Math.max(45, sat * 0.75), 76);
    const onTertiary = hslToHex(tertH, Math.max(45, sat * 0.75), 16);
    const tertiaryContainer = hslToHex(tertH, Math.max(45, sat * 0.7), isHigh ? 30 : 24);
    const onTertiaryContainer = hslToHex(tertH, Math.max(50, sat * 0.8), 90);

    const surface = hslToHex(h, 16, 6);
    const surfaceContainerLowest = hslToHex(h, 18, 4);
    const surfaceContainerLow = hslToHex(h, 16, 10);
    const surfaceContainer = hslToHex(h, 16, 13);
    const surfaceContainerHigh = hslToHex(h, 16, 17);
    const surfaceContainerHighest = hslToHex(h, 16, 22);

    const onSurface = isHigh ? '#FFFFFF' : hslToHex(h, 15, 93);
    const onSurfaceVariant = isHigh ? hslToHex(h, 15, 86) : hslToHex(h, 12, 72);
    const outlineHex = hslToHex(h, 12, isHigh ? 72 : 54);
    const outlineVariantHex = hslToHex(h, 16, isHigh ? 58 : 34);

    return {
      primary,
      onPrimary,
      primaryContainer,
      onPrimaryContainer,
      secondary,
      onSecondary,
      secondaryContainer,
      onSecondaryContainer,
      tertiary,
      onTertiary,
      tertiaryContainer,
      onTertiaryContainer,
      surface,
      surfaceContainerLowest,
      surfaceContainerLow,
      surfaceContainer,
      surfaceContainerHigh,
      surfaceContainerHighest,
      onSurface,
      onSurfaceVariant,
      outline: outlineHex,
      outlineVariant: hexToRgba(outlineVariantHex, isHigh ? 0.75 : 0.42),
      outlineVariantSolid: outlineVariantHex,
      success: isHigh ? '#4ADE80' : '#22C55E',
    };
  }
}

export function applyMaterialThemeToDOM(state: MaterialThemeState) {
  const root = document.documentElement;
  if (state.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const tokens = computeM3Tokens(state.seedHex, state.mode, state.contrast);

  // Set official M3 CSS custom properties
  root.style.setProperty('--md-sys-color-primary', tokens.primary);
  root.style.setProperty('--md-sys-color-on-primary', tokens.onPrimary);
  root.style.setProperty('--md-sys-color-primary-container', tokens.primaryContainer);
  root.style.setProperty('--md-sys-color-on-primary-container', tokens.onPrimaryContainer);

  root.style.setProperty('--md-sys-color-secondary', tokens.secondary);
  root.style.setProperty('--md-sys-color-on-secondary', tokens.onSecondary);
  root.style.setProperty('--md-sys-color-secondary-container', tokens.secondaryContainer);
  root.style.setProperty('--md-sys-color-on-secondary-container', tokens.onSecondaryContainer);

  root.style.setProperty('--md-sys-color-tertiary', tokens.tertiary);
  root.style.setProperty('--md-sys-color-on-tertiary', tokens.onTertiary);
  root.style.setProperty('--md-sys-color-tertiary-container', tokens.tertiaryContainer);
  root.style.setProperty('--md-sys-color-on-tertiary-container', tokens.onTertiaryContainer);

  root.style.setProperty('--md-sys-color-surface', tokens.surface);
  root.style.setProperty('--md-sys-color-surface-container-lowest', tokens.surfaceContainerLowest);
  root.style.setProperty('--md-sys-color-surface-container-low', tokens.surfaceContainerLow);
  root.style.setProperty('--md-sys-color-surface-container', tokens.surfaceContainer);
  root.style.setProperty('--md-sys-color-surface-container-high', tokens.surfaceContainerHigh);
  root.style.setProperty('--md-sys-color-surface-container-highest', tokens.surfaceContainerHighest);

  root.style.setProperty('--md-sys-color-on-surface', tokens.onSurface);
  root.style.setProperty('--md-sys-color-on-surface-variant', tokens.onSurfaceVariant);
  root.style.setProperty('--md-sys-color-outline', tokens.outline);
  root.style.setProperty('--md-sys-color-outline-variant', tokens.outlineVariant);
  root.style.setProperty('--md-sys-color-outline-variant-solid', tokens.outlineVariantSolid);

  // Bridge existing semantic app tokens so all child views inherit M3 Expressive colors
  root.style.setProperty('--color-bg-val', tokens.surface);
  root.style.setProperty('--bg-color', tokens.surface);
  root.style.setProperty('--color-surface-val', tokens.surfaceContainerLow);
  root.style.setProperty('--color-surface-brighter-val', tokens.surfaceContainerHigh);
  root.style.setProperty('--color-card-val', tokens.surfaceContainer);
  root.style.setProperty('--color-accent-val', tokens.primary);
  root.style.setProperty('--color-success-val', tokens.success);
  root.style.setProperty('--color-border-val', tokens.outlineVariant);
  root.style.setProperty('--color-text-val', tokens.onSurface);
  root.style.setProperty('--color-muted-val', tokens.onSurfaceVariant);
}

// Haptic Feedback Engine (Android 16 M3 Expressive tactile response)
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' = 'light',
  enabled: boolean = true
) {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(8);
      else if (type === 'medium') navigator.vibrate(15);
      else if (type === 'heavy') navigator.vibrate([18, 25, 18]);
      else if (type === 'success') navigator.vibrate([10, 30, 16]);
    }
  } catch {
    // Ignore on unsupported desktop browsers
  }
}

// Get CSS border-radius / clip style for Android 16 Adaptive Icon Shapes
export function getIconShapeRadiusClass(shape: AppIconShape): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'squircle':
      return 'rounded-[30%]';
    case 'teardrop':
      return 'rounded-tl-[50%] rounded-tr-[50%] rounded-bl-[50%] rounded-br-[16%]';
    case 'cookie':
      return 'rounded-[38%] rotate-0';
    case 'rounded-square':
    default:
      return 'rounded-2xl';
  }
}

// Offline Vector Icon Map (Zero external font dependencies)
const SYMBOL_ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  accessibility_new: Accessibility,
  account_tree: GitFork,
  add_photo_alternate: ImagePlus,
  apps: LayoutGrid,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  bolt: Zap,
  call: Phone,
  call_end: PhoneOff,
  category: Shapes,
  chat: MessageSquare,
  check: Check,
  check_box_outline_blank: Square,
  check_circle: CheckCircle2,
  circle: Circle,
  close: X,
  cloud_off: CloudOff,
  colorize: Pipette,
  colors: Palette,
  content_copy: Copy,
  contrast: Contrast,
  cookie: Cookie,
  crop_square: Square,
  dark_mode: Moon,
  data_object: FileCode2,
  database: Database,
  delete: Trash2,
  delete_sweep: Trash2,
  description: FileText,
  domain: Building2,
  download: FolderDown,
  download_done: CheckCircle2,
  explore: Compass,
  fact_check: ListChecks,
  filter_vintage: Flower2,
  folder_copy: Folders,
  forum: MessageSquare,
  gavel: Scale,
  gpp_maybe: ShieldAlert,
  hard_drive: HardDrive,
  help: HelpCircle,
  history: History,
  hub: Network,
  layers: Layers,
  light_mode: Sun,
  link_off: Link2Off,
  no_accounts: UserX,
  palette: Palette,
  photo_camera: Camera,
  policy: Scale,
  present_to_all: MonitorUp,
  qr_code_2: QrCode,
  qr_code_scanner: ScanLine,
  record_voice_over: PhoneCall,
  router: Router,
  save: Save,
  science: FlaskConical,
  screen_share: MonitorUp,
  settings_ethernet: Settings2,
  tune: SlidersHorizontal,
  upload_file: FileUp,
  verified: ShieldCheck,
  verified_user: ShieldCheck,
  vibration: Vibrate,
  video_call: Video,
  videocam: Video,
  visibility_off: EyeOff,
  volunteer_activism: HeartHandshake,
  wallpaper: Wallpaper,
  water_drop: Droplet,
  widgets: Grip,
  wifi_tethering: Radio,
  workspace_premium: Award,
};

// Material Symbols Rounded offline vector component
export const MaterialSymbol: React.FC<{
  name: string;
  filled?: boolean;
  className?: string;
  size?: number;
}> = ({ name, filled = false, className = '', size = 18 }) => {
  const key = name.toLowerCase();
  const IconComp = SYMBOL_ICON_MAP[key] || Sparkles;
  return React.createElement(IconComp, {
    size,
    strokeWidth: filled ? 2.35 : 1.9,
    className: `inline-flex shrink-0 select-none ${className}`,
    'aria-hidden': 'true',
  } as Record<string, unknown>);
};
