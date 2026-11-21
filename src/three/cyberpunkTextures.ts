import * as THREE from 'three';

function applyTexConfig(
  tex: THREE.CanvasTexture,
  maxAnisotropy: number,
  srgb = true,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.min(Math.max(1, maxAnisotropy), 16);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

function hash1(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export interface BuildingFacadeSet {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Procedural Cyberpunk Architectural Facade Sets:
 * 0 = Kowloon / H10 Brutalist Concrete Megablock (recessed lit apartments, grime, AC bays)
 * 1 = Corporate Glass Arcology Tower (dark reflective curtain-wall, structural steel mullions, LED floor bands)
 * 2 = Mid-Rise Neon Shophouse / Alley Tower (corrugated panels, glowing shopfront bands, warm/cyan windows)
 */
export function createBuildingFacadeTextures(
  style: 0 | 1 | 2,
  maxAnisotropy: number
): BuildingFacadeSet {
  const w = 1024;
  const h = 1024;

  const albedoCanvas = document.createElement('canvas');
  const emissiveCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  albedoCanvas.width = emissiveCanvas.width = roughCanvas.width = w;
  albedoCanvas.height = emissiveCanvas.height = roughCanvas.height = h;

  const aCtx = albedoCanvas.getContext('2d');
  const eCtx = emissiveCanvas.getContext('2d');
  const rCtx = roughCanvas.getContext('2d');

  if (aCtx && eCtx && rCtx) {
    // Base structural cladding tone
    if (style === 0) {
      aCtx.fillStyle = '#12161f';
      rCtx.fillStyle = '#cfcfcf'; // weathered poured concrete
    } else if (style === 1) {
      aCtx.fillStyle = '#070e1c';
      rCtx.fillStyle = '#262626'; // dark mirrored curtain-wall glass
    } else {
      aCtx.fillStyle = '#11141c';
      rCtx.fillStyle = '#9a9a9a';
    }
    aCtx.fillRect(0, 0, w, h);
    rCtx.fillRect(0, 0, w, h);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, w, h);

    // Architectural vertical grime, rain streaks & concrete panel joints
    for (let i = 0; i < 420; i++) {
      const rx = hash1(i * 3.1 + style * 19) * w;
      const ry = hash1(i * 7.3 + style * 23) * h;
      const rw = 2 + hash1(i * 5.7) * 16;
      const rh = 24 + hash1(i * 11.1) * 110;
      aCtx.fillStyle =
        i % 3 === 0 ? 'rgba(148,163,184,0.03)' : 'rgba(0,0,0,0.28)';
      aCtx.fillRect(rx, ry, rw, rh);
    }

    const cols = style === 1 ? 26 : style === 0 ? 18 : 16;
    const rows = style === 1 ? 42 : style === 0 ? 32 : 26;
    const cellW = w / cols;
    const cellH = h / rows;

    // Realistic nocturnal architectural palette (warm tungsten, cool office daylight, subtle cyber accents)
    const paletteWarm = ['#f59e0b', '#fbbf24', '#fed7aa', '#fb923c', '#eab308'];
    const paletteCool = ['#38bdf8', '#7dd3fc', '#bae6fd', '#67e8f9', '#818cf8'];
    const paletteCyber = ['#f43f5e', '#ec4899', '#2dd4bf', '#22d3ee', '#fbbf24'];

    for (let r = 0; r < rows; r++) {
      // Horizontal floor spandrel beam
      aCtx.fillStyle = style === 1 ? '#172236' : '#090c12';
      aCtx.fillRect(0, r * cellH, w, style === 1 ? 5 : 7);
      rCtx.fillStyle = '#b4b4b4';
      rCtx.fillRect(0, r * cellH, w, style === 1 ? 5 : 7);

      // Subtle exterior balcony ledges on Kowloon brutalist blocks
      if (style === 0 && r % 2 === 0) {
        aCtx.fillStyle = '#1e2430';
        aCtx.fillRect(0, r * cellH + 5, w, 3);
      }

      // Corporate horizontal LED sky-trim bands every few mechanical floors
      if (style === 1 && (r % 10 === 0 || r === 2)) {
        const stripCol = r % 20 === 0 ? '#06b6d4' : '#6366f1';
        eCtx.fillStyle = stripCol;
        eCtx.fillRect(0, r * cellH + 1, w, 2.5);
        aCtx.fillStyle = stripCol;
        aCtx.fillRect(0, r * cellH + 1, w, 2.5);
      }

      const floorLitBias = hash1(r * 13.7 + style * 41);

      for (let c = 0; c < cols; c++) {
        const seed = r * 131 + c * 37 + style * 701;
        const roll = hash1(seed);

        const padX = style === 1 ? 3 : 5;
        const padTop = style === 1 ? 6 : 9;
        const padBot = style === 1 ? 3 : 5;
        const wx = c * cellW + padX;
        const wy = r * cellH + padTop;
        const ww = cellW - padX * 2;
        const wh = cellH - padTop - padBot;

        // Unlit dark mirrored window pane with slight sky reflection gradient
        const paneGrad = aCtx.createLinearGradient(wx, wy, wx + ww, wy + wh);
        paneGrad.addColorStop(0, style === 1 ? '#122642' : '#0b1019');
        paneGrad.addColorStop(1, '#04060b');
        aCtx.fillStyle = paneGrad;
        aCtx.fillRect(wx, wy, ww, wh);
        rCtx.fillStyle = '#121212';
        rCtx.fillRect(wx, wy, ww, wh);

        // Exterior AC condenser box silhouette on Kowloon/shophouse towers
        if (style !== 1 && hash1(seed + 5) > 0.62) {
          aCtx.fillStyle = '#252b38';
          aCtx.fillRect(wx + ww * 0.56, wy + wh * 0.52, ww * 0.42, wh * 0.46);
        }

        // Lit interior probability (roughly ~32–42% lit windows looks far more realistic than 60%)
        const litThreshold = style === 1 ? 0.62 : style === 0 ? 0.68 : 0.58;
        if (roll + floorLitBias * 0.16 > litThreshold) {
          const tintRoll = hash1(seed + 11);
          let col: string;
          if (style === 1) {
            col = tintRoll < 0.74
              ? paletteCool[Math.floor(hash1(seed + 17) * paletteCool.length)]
              : paletteWarm[Math.floor(hash1(seed + 19) * paletteWarm.length)];
          } else if (style === 0) {
            col = tintRoll < 0.68
              ? paletteWarm[Math.floor(hash1(seed + 17) * paletteWarm.length)]
              : paletteCool[Math.floor(hash1(seed + 19) * paletteCool.length)];
          } else {
            col = tintRoll < 0.36
              ? paletteCyber[Math.floor(hash1(seed + 17) * paletteCyber.length)]
              : tintRoll < 0.76
                ? paletteWarm[Math.floor(hash1(seed + 19) * paletteWarm.length)]
                : paletteCool[Math.floor(hash1(seed + 23) * paletteCool.length)];
          }

          const intensity = 0.28 + hash1(seed + 29) * 0.56;
          eCtx.save();
          eCtx.globalAlpha = intensity;
          eCtx.fillStyle = col;
          eCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);

          // Interior horizontal Venetian blind slats / ceiling shadow for depth
          if (hash1(seed + 37) > 0.38) {
            eCtx.fillStyle = 'rgba(0,0,0,0.52)';
            eCtx.fillRect(wx + 1, wy + 1, ww - 2, wh * 0.36);
            for (let sy = wy + wh * 0.42; sy < wy + wh - 2; sy += 3) {
              eCtx.fillRect(wx + 1, sy, ww - 2, 1);
            }
          }
          eCtx.restore();

          aCtx.save();
          aCtx.globalAlpha = intensity * 0.78;
          aCtx.fillStyle = col;
          aCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
          aCtx.restore();
        }
      }
    }

    // Vertical structural steel mega-columns
    aCtx.fillStyle = '#0d1320';
    rCtx.fillStyle = '#686868';
    const colStep = style === 1 ? 6 : 4;
    for (let c = 0; c < cols; c += colStep) {
      aCtx.fillRect(c * cellW, 0, style === 1 ? 6 : 4, h);
      rCtx.fillRect(c * cellW, 0, style === 1 ? 6 : 4, h);
    }

    // Bright vertical neon edge accent strips along select architectural edges
    const finCol = style === 1 ? '#22d3ee' : style === 2 ? '#ec4899' : '#f59e0b';
    eCtx.fillStyle = finCol;
    eCtx.fillRect(4, 0, 3, h);
    eCtx.fillRect(w - 7, 0, 3, h);
  }

  return {
    map: applyTexConfig(new THREE.CanvasTexture(albedoCanvas), maxAnisotropy, true, 1, 2),
    emissiveMap: applyTexConfig(new THREE.CanvasTexture(emissiveCanvas), maxAnisotropy, true, 1, 2),
    roughnessMap: applyTexConfig(new THREE.CanvasTexture(roughCanvas), maxAnisotropy, false, 1, 2),
  };
}

/**
 * Rain-Slicked Asphalt Road & Puddle Maps (Albedo, Roughness, Bump).
 */
export function createWetAsphaltTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const aCanvas = document.createElement('canvas');
  const rCanvas = document.createElement('canvas');
  const bCanvas = document.createElement('canvas');
  aCanvas.width = rCanvas.width = bCanvas.width = size;
  aCanvas.height = rCanvas.height = bCanvas.height = size;

  const aCtx = aCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');
  const bCtx = bCanvas.getContext('2d');

  if (aCtx && rCtx && bCtx) {
    aCtx.fillStyle = '#0c0f16';
    aCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#787878'; // damp asphalt base
    rCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    // Fine aggregate mineral grit
    for (let i = 0; i < 4500; i++) {
      const px = hash1(i * 1.7) * size;
      const py = hash1(i * 2.9) * size;
      const v = Math.round(14 + hash1(i * 4.3) * 24);
      aCtx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      aCtx.fillRect(px, py, 2, 2);

      const bv = Math.round(105 + hash1(i * 6.1) * 45);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(px, py, 2, 2);
    }

    // Mirror-slick rainwater puddles (low roughness = dark in roughnessMap)
    for (let i = 0; i < 38; i++) {
      const cx = hash1(i * 13.3 + 5) * size;
      const cy = hash1(i * 17.7 + 9) * size;
      const rx = 24 + hash1(i * 21.1) * 58;
      const ry = 16 + hash1(i * 27.9) * 44;

      const grad = rCtx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(rx, ry));
      grad.addColorStop(0.0, 'rgba(14, 14, 14, 0.92)');
      grad.addColorStop(0.6, 'rgba(28, 28, 28, 0.65)');
      grad.addColorStop(1.0, 'rgba(120, 120, 120, 0)');
      rCtx.fillStyle = grad;
      rCtx.beginPath();
      rCtx.ellipse(cx, cy, rx, ry, hash1(i) * Math.PI, 0, Math.PI * 2);
      rCtx.fill();

      // Subtle dark puddle tint on albedo
      const aGrad = aCtx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(rx, ry));
      aGrad.addColorStop(0, 'rgba(4, 6, 12, 0.55)');
      aGrad.addColorStop(1, 'rgba(4, 6, 12, 0)');
      aCtx.fillStyle = aGrad;
      aCtx.beginPath();
      aCtx.ellipse(cx, cy, rx, ry, hash1(i) * Math.PI, 0, Math.PI * 2);
      aCtx.fill();
    }

    // Road lane markings (center double amber line + outer dashed white lanes)
    aCtx.fillStyle = 'rgba(234, 179, 8, 0.52)';
    aCtx.fillRect(size * 0.488, 0, 4, size);
    aCtx.fillRect(size * 0.506, 0, 4, size);

    aCtx.fillStyle = 'rgba(226, 232, 240, 0.42)';
    for (let y = 12; y < size; y += 64) {
      aCtx.fillRect(size * 0.25, y, 4, 34);
      aCtx.fillRect(size * 0.75, y, 4, 34);
    }
  }

  return {
    map: applyTexConfig(new THREE.CanvasTexture(aCanvas), maxAnisotropy, true, 12, 12),
    roughnessMap: applyTexConfig(new THREE.CanvasTexture(rCanvas), maxAnisotropy, false, 12, 12),
    bumpMap: applyTexConfig(new THREE.CanvasTexture(bCanvas), maxAnisotropy, false, 12, 12),
  };
}

/**
 * Procedural Neon & Holographic Megacity Billboards (Katakana/Kanji + Cyber Typography).
 */
export function createCyberBillboardTexture(
  variant: 0 | 1 | 2 | 3,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const vertical = variant === 1 || variant === 3;
  const w = vertical ? 256 : 512;
  const h = vertical ? 512 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const palettes = [
      { bg: '#060c1a', primary: '#22d3ee', secondary: '#f43f5e', title: '電脳都市', sub: 'KOWLOON · SECTOR 09' },
      { bg: '#130514', primary: '#ec4899', secondary: '#22d3ee', title: 'ネオン', sub: 'SHINJUKU SYNAPSE' },
      { bg: '#140c04', primary: '#f59e0b', secondary: '#fb7185', title: 'ARASAKA', sub: 'ORBITAL TRANSIT · 2099' },
      { bg: '#041214', primary: '#2dd4bf', secondary: '#a855f7', title: '夜明け', sub: 'CYBERNETICS LABS' },
    ];
    const pal = palettes[variant];

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    // Outer neon frame border
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = 6;
    ctx.shadowColor = pal.primary;
    ctx.shadowBlur = 18;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Secondary corner brackets
    ctx.strokeStyle = pal.secondary;
    ctx.lineWidth = 3;
    ctx.shadowColor = pal.secondary;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Geometric emblem / cyber-sunburst motif
    ctx.save();
    ctx.translate(w / 2, vertical ? h * 0.28 : h * 0.42);
    ctx.strokeStyle = pal.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Glowing typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = pal.primary;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';

    if (vertical) {
      ctx.font = 'bold 54px sans-serif';
      const chars = pal.title.split('');
      chars.forEach((ch, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : pal.primary;
        ctx.fillText(ch, w / 2, h * 0.48 + idx * 58);
      });
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = pal.secondary;
      ctx.fillText(pal.sub, w / 2, h - 42);
    } else {
      ctx.font = 'bold 68px sans-serif';
      ctx.fillText(pal.title, w / 2, h * 0.56);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = pal.primary;
      ctx.fillText(pal.sub, w / 2, h * 0.80);
    }

    // Subtle CRT horizontal scanlines
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(Math.max(1, maxAnisotropy), 16);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft radial gradient falloff texture for diffused neon reflections on wet asphalt.
 */
export function createNeonPoolTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.10)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
