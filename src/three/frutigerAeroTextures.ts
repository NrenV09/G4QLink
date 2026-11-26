import * as THREE from 'three';

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

/**
 * Lush sunlit emerald-and-spring-lime meadow grass textures (Bliss / Frutiger Aero rolling hills).
 */
export function createAeroMeadowTextures(maxAniso: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base sunlit meadow gradient
  const baseGrad = cCtx.createLinearGradient(0, 0, size, size);
  baseGrad.addColorStop(0, '#38c849');
  baseGrad.addColorStop(0.5, '#5ce03c');
  baseGrad.addColorStop(1, '#1fb854');
  cCtx.fillStyle = baseGrad;
  cCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#a8a8a8';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Soft sunlit dappled patches across the grass
  for (let i = 0; i < 65; i++) {
    const px = hash2D(i * 3.1, 1.7) * size;
    const py = hash2D(i * 7.3, 4.2) * size;
    const rad = 28 + hash2D(i * 2.9, 9.1) * 85;
    const warm = hash2D(i, 12.5) > 0.45;
    const g = cCtx.createRadialGradient(px, py, 2, px, py, rad);
    if (warm) {
      g.addColorStop(0, 'rgba(170, 248, 72, 0.34)');
      g.addColorStop(1, 'rgba(120, 230, 60, 0)');
    } else {
      g.addColorStop(0, 'rgba(14, 158, 92, 0.30)');
      g.addColorStop(1, 'rgba(14, 158, 92, 0)');
    }
    cCtx.fillStyle = g;
    cCtx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }

  // Fine wind-swept meadow blade micro-strokes & morning dew sheen
  for (let i = 0; i < 4200; i++) {
    const x = hash2D(i * 1.13, 2.71) * size;
    const y = hash2D(i * 4.19, 8.37) * size;
    const len = 5 + hash2D(i * 2.3, 5.1) * 11;
    const tilt = (hash2D(i * 6.7, 3.3) - 0.3) * 4.5;
    const n = fbm2D((x / size) * 6, (y / size) * 6, 3);

    const r = Math.round(42 + n * 105);
    const g = Math.round(172 + n * 75);
    const b = Math.round(42 + (1 - n) * 46);
    cCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.42)`;
    cCtx.lineWidth = 1.1;
    cCtx.beginPath();
    cCtx.moveTo(x, y);
    cCtx.lineTo(x + tilt, y - len);
    cCtx.stroke();

    const bv = Math.round(118 + n * 48);
    bCtx.strokeStyle = `rgba(${bv}, ${bv}, ${bv}, 0.35)`;
    bCtx.lineWidth = 1;
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x + tilt, y - len);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(14, 14);
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(14, 14);
  roughnessMap.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(14, 14);
  bumpMap.anisotropy = maxAniso;

  return { map, roughnessMap, bumpMap };
}

/**
 * Glossy tropical fish textures (Clownfish & Aqua Blue Tang) iconic to Frutiger Aero desktop art.
 */
export function createTropicalFishTexture(
  variant: 'clownfish' | 'bluetang' | 'goldkoi',
  maxAniso: number
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'clownfish') {
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, h);
    bodyGrad.addColorStop(0, '#ff5400');
    bodyGrad.addColorStop(0.45, '#ff7d1a');
    bodyGrad.addColorStop(0.85, '#ff9f1c');
    bodyGrad.addColorStop(1, '#ffd166');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 0, w, h);

    // Three signature pearlescent white vertical bands with crisp dark outlines
    const drawBand = (cx: number, width: number, curve: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.5, 0);
      ctx.quadraticCurveTo(cx + curve, h * 0.5, cx - width * 0.45, h);
      ctx.lineTo(cx + width * 0.45, h);
      ctx.quadraticCurveTo(cx + curve + width * 0.65, h * 0.5, cx + width * 0.5, 0);
      ctx.closePath();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#18110c';
      ctx.stroke();
      const whiteGrad = ctx.createLinearGradient(cx - width, 0, cx + width, h);
      whiteGrad.addColorStop(0, '#ffffff');
      whiteGrad.addColorStop(0.55, '#eef9ff');
      whiteGrad.addColorStop(1, '#d6f0ff');
      ctx.fillStyle = whiteGrad;
      ctx.fill();
      ctx.restore();
    };

    drawBand(w * 0.24, 42, -16);
    drawBand(w * 0.54, 54, 18);
    drawBand(w * 0.83, 30, 8);
  } else if (variant === 'bluetang') {
    const bodyGrad = ctx.createLinearGradient(0, 0, w, h);
    bodyGrad.addColorStop(0, '#0056d6');
    bodyGrad.addColorStop(0.42, '#009dff');
    bodyGrad.addColorStop(0.78, '#00d8f5');
    bodyGrad.addColorStop(1, '#ffe629');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 0, w, h);

    // Classic Regal Tang dark navy palette mark along upper flank
    ctx.fillStyle = 'rgba(6, 20, 56, 0.82)';
    ctx.beginPath();
    ctx.ellipse(w * 0.48, h * 0.34, w * 0.30, h * 0.16, -0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00b4ff';
    ctx.beginPath();
    ctx.ellipse(w * 0.50, h * 0.36, w * 0.14, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sunny yellow tail wedge
    const tailGrad = ctx.createLinearGradient(w * 0.72, 0, w, 0);
    tailGrad.addColorStop(0, 'rgba(255, 232, 40, 0)');
    tailGrad.addColorStop(0.35, '#ffe828');
    tailGrad.addColorStop(1, '#ffcf00');
    ctx.fillStyle = tailGrad;
    ctx.fillRect(w * 0.72, 0, w * 0.28, h);
  } else {
    // Luminous pearl-and-aqua koi / butterfly fish
    const bodyGrad = ctx.createLinearGradient(0, 0, w, h);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.45, '#d2f8ff');
    bodyGrad.addColorStop(0.8, '#5eead4');
    bodyGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 0, w, h);

    // Coral-gold koi marbling patches
    const patches = [
      [0.26, 0.38, 72, 46, '#ff6b35'],
      [0.58, 0.48, 86, 52, '#ff9e00'],
      [0.74, 0.32, 48, 36, '#ff595e'],
    ] as const;
    for (const [px, py, rx, ry, col] of patches) {
      const g = ctx.createRadialGradient(px * w, py * h, 6, px * w, py * h, rx);
      g.addColorStop(0, col);
      g.addColorStop(0.75, col);
      g.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px * w, py * h, rx, ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle shimmering wet scale highlights across body
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 28; col++) {
      const sx = (col + (row % 2) * 0.5) * (w / 26);
      const sy = row * (h / 15);
      ctx.beginPath();
      ctx.arc(sx, sy, 8, -0.8, 0.8);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/**
 * Sleek eco-futurist curved white & aqua glass skyscraper facade texture
 * inspired by classic 2000s Frutiger Aero utopian eco-city wallpapers.
 */
export function createAeroEcoTowerTextures(maxAniso: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;

  // Reflective aqua sky-curtain glass base
  const glassGrad = ctx.createLinearGradient(0, 0, w, h);
  glassGrad.addColorStop(0, '#d8fbff');
  glassGrad.addColorStop(0.28, '#52d6f4');
  glassGrad.addColorStop(0.55, '#0ea5e9');
  glassGrad.addColorStop(0.82, '#38d9c0');
  glassGrad.addColorStop(1, '#c4f7ff');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, w, h);

  // Smooth glass low roughness
  rCtx.fillStyle = '#1c1c1c';
  rCtx.fillRect(0, 0, w, h);

  // Diagonal glossy glass sky-reflection sheen
  const sheenGrad = ctx.createLinearGradient(0, 0, w * 0.9, h * 0.45);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.08)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, w, h);

  // Clean horizontal white ceramic floor slab bands & subtle sunlit sky-gardens
  const floors = 24;
  const floorH = h / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH;
    // White sleek Aero spandrel
    ctx.fillStyle = '#f2fbff';
    ctx.fillRect(0, y, w, floorH * 0.24);
    rCtx.fillStyle = '#626262';
    rCtx.fillRect(0, y, w, floorH * 0.24);

    // Subtle interior aqua tint variation per window bay
    const bays = 8;
    const bayW = w / bays;
    for (let b = 0; b < bays; b++) {
      const n = hash2D(b * 3.7, f * 5.3);
      ctx.fillStyle =
        n > 0.72
          ? 'rgba(255, 255, 255, 0.34)'
          : n > 0.35
            ? 'rgba(14, 165, 233, 0.26)'
            : 'rgba(16, 185, 129, 0.22)';
      ctx.fillRect(b * bayW + 3, y + floorH * 0.26, bayW - 6, floorH * 0.7);
    }

    // Every 6th floor has a lush emerald sky-garden terrace strip
    if (f % 6 === 3) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, y + floorH * 0.12, w, floorH * 0.22);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, y + floorH * 0.12, w, floorH * 0.07);
      rCtx.fillStyle = '#b4b4b4';
      rCtx.fillRect(0, y + floorH * 0.12, w, floorH * 0.22);
    }
  }

  // Sleek vertical white mullion fins
  for (let b = 0; b < 8; b++) {
    const x = b * (w / 8);
    ctx.fillStyle = 'rgba(240, 252, 255, 0.75)';
    ctx.fillRect(x, 0, 5, h);
    rCtx.fillStyle = '#555555';
    rCtx.fillRect(x, 0, 5, h);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAniso;

  return { map, roughnessMap };
}

/**
 * Dreamy billowing sunlit cumulus cloud puff sprite texture.
 */
export function createAeroCloudTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Layered fluffy sunlit cumulus lobes (warm pearl-white tops, cool sky-blue undersides)
  const puffs = [
    { x: 0.50, y: 0.54, r: 0.30, top: 'rgba(255,255,255,0.94)', bot: 'rgba(186,236,255,0.45)' },
    { x: 0.33, y: 0.58, r: 0.24, top: 'rgba(255,255,255,0.90)', bot: 'rgba(176,230,255,0.42)' },
    { x: 0.68, y: 0.58, r: 0.25, top: 'rgba(255,255,255,0.88)', bot: 'rgba(176,230,255,0.40)' },
    { x: 0.44, y: 0.41, r: 0.23, top: 'rgba(255,255,255,0.96)', bot: 'rgba(218,246,255,0.38)' },
    { x: 0.60, y: 0.44, r: 0.21, top: 'rgba(255,255,255,0.92)', bot: 'rgba(210,242,255,0.36)' },
    { x: 0.22, y: 0.64, r: 0.17, top: 'rgba(255,255,255,0.78)', bot: 'rgba(165,226,255,0.30)' },
    { x: 0.79, y: 0.64, r: 0.16, top: 'rgba(255,255,255,0.75)', bot: 'rgba(165,226,255,0.28)' },
  ];

  for (const p of puffs) {
    const cx = p.x * size;
    const cy = p.y * size;
    const r = p.r * size;
    const grad = ctx.createRadialGradient(cx - r * 0.16, cy - r * 0.22, r * 0.05, cx, cy, r);
    grad.addColorStop(0, p.top);
    grad.addColorStop(0.55, p.bot);
    grad.addColorStop(1, 'rgba(220, 248, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft glossy water ripple ring decal texture for fountains & lagoon splash accents.
 */
export function createWaterRippleTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < 4; i++) {
    const rad = 26 + i * 26;
    const grad = ctx.createRadialGradient(cx, cy, rad - 8, cx, cy, rad + 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, `rgba(224, 252, 255, ${0.42 - i * 0.08})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad + 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
