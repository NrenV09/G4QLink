import * as THREE from 'three';

function applyTextureQuality(
  texture: THREE.Texture,
  maxAnisotropy: number,
  srgb = true
): THREE.Texture {
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = Math.min(Math.max(1, maxAnisotropy), 16);
  texture.needsUpdate = true;
  return texture;
}

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 19.3);
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

/**
 * Crisp Newtonian optical diffraction star sprite with tight Airy core & thin 4-point rays.
 */
export function createStarDiffractionTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const c = size / 2;
    ctx.clearRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.88);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.06, 'rgba(255, 255, 255, 0.96)');
    grad.addColorStop(0.18, 'rgba(224, 238, 255, 0.44)');
    grad.addColorStop(0.45, 'rgba(180, 210, 255, 0.09)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(c, c);
    for (let rot = 0; rot < 2; rot++) {
      const flare = ctx.createLinearGradient(-c, 0, c, 0);
      flare.addColorStop(0.0, 'rgba(255,255,255,0)');
      flare.addColorStop(0.44, 'rgba(255,255,255,0.12)');
      flare.addColorStop(0.5, 'rgba(255,255,255,0.92)');
      flare.addColorStop(0.56, 'rgba(255,255,255,0.12)');
      flare.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = flare;
      ctx.fillRect(-c, -0.75, size, 1.5);
      ctx.rotate(Math.PI / 2);
    }

    ctx.rotate(Math.PI / 4);
    for (let rot = 0; rot < 2; rot++) {
      const diag = ctx.createLinearGradient(-c * 0.62, 0, c * 0.62, 0);
      diag.addColorStop(0.0, 'rgba(255,255,255,0)');
      diag.addColorStop(0.5, 'rgba(255,255,255,0.24)');
      diag.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = diag;
      ctx.fillRect(-c * 0.62, -0.5, c * 1.24, 1.0);
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Smooth Gaussian point sprite for multi-spectral galactic stars & emission knots.
 */
export function createParticleGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.09, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.24, 'rgba(218, 232, 255, 0.22)');
    grad.addColorStop(0.55, 'rgba(180, 210, 255, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Organic dark molecular dust cloud / Bok globule sprite for interstellar light absorption.
 */
export function createDustAbsorptionTexture(
  maxAnisotropy: number,
  seed = 53
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      const ny = (py / size) * 2 - 1;
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 2 - 1;
        const rad = Math.sqrt(nx * nx + ny * ny);
        const falloff = Math.max(0, 1 - rad);
        if (falloff <= 0) continue;

        const u = nx * 2.4 + 4.1;
        const v = ny * 2.4 + 2.3;
        const wx = fbm2D(u + 1.1, v + 3.2, seed, 3);
        const wy = fbm2D(u + 4.4, v + 1.9, seed + 5, 3);
        const clump = fbm2D(u + wx * 1.3, v + wy * 1.3, seed + 11, 4);
        const density = Math.pow(falloff, 1.55) * smoothstepJS(0.28, 0.80, clump);

        const idx = (py * size + px) * 4;
        // Deep interstellar molecular carbon dust tint
        data[idx] = 4;
        data[idx + 1] = 3;
        data[idx + 2] = 6;
        data[idx + 3] = Math.min(235, Math.round(density * 230));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}

/**
 * Photorealistic Domain-Warped Filament Emission & Dust Nebula Texture.
 */
export function createNebulaCloudTexture(
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy: number,
  seed = 11
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const [r1, g1, b1] = hexToRgbTuple(primaryHex);
    const [r2, g2, b2] = hexToRgbTuple(secondaryHex);

    for (let py = 0; py < size; py++) {
      const ny = (py / size) * 2 - 1;
      for (let px = 0; px < size; px++) {
        const nx = (px / size) * 2 - 1;
        const rad = Math.sqrt(nx * nx + ny * ny);
        const falloff = Math.max(0, 1 - rad);
        if (falloff <= 0) continue;

        const u = nx * 2.2 + 3.7;
        const v = ny * 2.2 + 1.9;
        const wx = fbm2D(u + 1.3, v + 4.1, seed, 3);
        const wy = fbm2D(u + 5.2, v + 2.6, seed + 7, 3);

        const baseGas = fbm2D(u + wx * 1.5, v + wy * 1.5, seed + 3, 4);
        const filamentRaw = fbm2D(u * 2.1 + wx * 2.2, v * 2.1 - wy * 1.9, seed + 17, 4);
        const ridgedFilament = Math.pow(1.0 - Math.abs(filamentRaw * 2.0 - 1.0), 2.5);

        const dustAbsorb = smoothstepJS(
          0.45,
          0.74,
          fbm2D(u * 2.5 - wy, v * 2.5 + wx, seed + 31, 3)
        );
        const density =
          Math.pow(falloff, 1.55) *
          (0.38 * baseGas + 0.85 * ridgedFilament) *
          (1.0 - 0.62 * dustAbsorb);

        const colorMix = Math.min(1, Math.max(0, baseGas * 0.78 + ridgedFilament * 0.42));
        const coreWhite = Math.pow(ridgedFilament, 2.3) * 0.36;

        const r = Math.min(255, r1 * (1 - colorMix) + r2 * colorMix + 255 * coreWhite);
        const g = Math.min(255, g1 * (1 - colorMix) + g2 * colorMix + 245 * coreWhite);
        const b = Math.min(255, b1 * (1 - colorMix) + b2 * colorMix + 255 * coreWhite);

        const idx = (py * size + px) * 4;
        data[idx] = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
        data[idx + 3] = Math.min(255, Math.round(density * 240));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}

/**
 * Gas Giant Exoplanet paired Albedo + Bump maps with zonal jet streams,
 * Kelvin-Helmholtz eddies, and an anticyclonic Great Storm oval.
 */
export function createGasGiantTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 256;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;

  const aCtx = albedoCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');

  if (aCtx && bCtx) {
    const aImg = aCtx.createImageData(width, height);
    const bImg = bCtx.createImageData(width, height);
    const aData = aImg.data;
    const bData = bImg.data;

    // Seamless horizontal tiling using sin/cos longitude projection
    for (let y = 0; y < height; y++) {
      const v = y / height;
      const lat = (v - 0.5) * Math.PI; // -pi/2 .. pi/2
      const polarDarken = Math.pow(Math.cos(lat), 0.35);

      for (let x = 0; x < width; x++) {
        const u = x / width;
        const lon = u * Math.PI * 2.0;
        const cx = Math.cos(lon) * 2.2 + 5.0;
        const cy = Math.sin(lon) * 2.2 + 5.0;

        // Zonal jet shear & turbulence
        const shear = fbm2D(cx * 1.4, v * 10.5, 29, 3);
        const eddy = fbm2D(cx * 3.1 + shear * 1.8, v * 18.0 - shear * 1.2, 67, 4);
        const bandCoord = v * 15.0 + shear * 1.35 + (eddy - 0.5) * 0.65;

        const zoneWave = Math.sin(bandCoord * Math.PI * 2.0) * 0.5 + 0.5;
        const fineBelt = Math.sin(bandCoord * Math.PI * 4.5 + eddy * 3.0) * 0.5 + 0.5;

        // Anticyclonic Great Storm Oval centered near u=0.35, v=0.62
        let du = u - 0.35;
        if (du > 0.5) du -= 1.0;
        if (du < -0.5) du += 1.0;
        const dv = (v - 0.62) * 2.2;
        const stormDist = Math.sqrt(du * du * 24.0 + dv * dv * 34.0);
        const stormMask = 1.0 - smoothstepJS(0.35, 1.15, stormDist);
        const stormSwirl = Math.sin(stormDist * 14.0 + Math.atan2(dv, du) * 2.0) * 0.5 + 0.5;

        // Palette: cream ammonia clouds, ochre silicate haze, deep cobalt/slate belts, rust storm
        const bandMix = zoneWave * 0.72 + fineBelt * 0.28;
        let r = 34 + bandMix * 168 + eddy * 28;
        let g = 46 + bandMix * 142 + eddy * 24;
        let b = 68 + bandMix * 102 + (1 - bandMix) * 32;

        // Polar aurora/haze tint (cold slate-indigo at high latitudes)
        const polarBlend = 1.0 - polarDarken;
        r = r * (1 - polarBlend * 0.55) + 46 * (polarBlend * 0.55);
        g = g * (1 - polarBlend * 0.5) + 74 * (polarBlend * 0.5);
        b = b * (1 - polarBlend * 0.4) + 112 * (polarBlend * 0.4);

        // Blend storm eye
        if (stormMask > 0.01) {
          const sr = 212 - stormSwirl * 38;
          const sg = 122 - stormSwirl * 32;
          const sb = 72 - stormSwirl * 18;
          r = r * (1 - stormMask) + sr * stormMask;
          g = g * (1 - stormMask) + sg * stormMask;
          b = b * (1 - stormMask) + sb * stormMask;
        }

        const heightVal = Math.min(255, Math.max(0, Math.round((bandMix * 0.6 + eddy * 0.4 + stormMask * 0.25) * 220)));

        const idx = (y * width + x) * 4;
        aData[idx] = Math.min(255, Math.round(r));
        aData[idx + 1] = Math.min(255, Math.round(g));
        aData[idx + 2] = Math.min(255, Math.round(b));
        aData[idx + 3] = 255;

        bData[idx] = heightVal;
        bData[idx + 1] = heightVal;
        bData[idx + 2] = heightVal;
        bData[idx + 3] = 255;
      }
    }

    aCtx.putImageData(aImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.ClampToEdgeWrapping;
  applyTextureQuality(albedoMap, maxAnisotropy, true);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  applyTextureQuality(bumpMap, maxAnisotropy, false);

  return { albedoMap, bumpMap };
}

/**
 * High-Frequency Concentric Planetary Ring LUT Texture (Cassini & Encke Divisions).
 */
export function createPlanetaryRingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 512;
  const height = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let x = 0; x < width; x++) {
      const r = x / (width - 1); // 0 = inner edge, 1 = outer edge

      // Smooth entry/exit fade
      const edgeFade = smoothstepJS(0.0, 0.08, r) * (1.0 - smoothstepJS(0.92, 1.0, r));

      // C-ring (faint inner crepe), dense B-ring, sharp Cassini Division, outer A-ring + Encke gap
      const cRing = smoothstepJS(0.04, 0.22, r) * (1.0 - smoothstepJS(0.24, 0.28, r)) * 0.28;
      const bRing = smoothstepJS(0.24, 0.3, r) * (1.0 - smoothstepJS(0.58, 0.61, r)) * 0.92;
      const cassiniGap = 1.0 - Math.exp(-Math.pow((r - 0.635) * 34.0, 2.0));
      const aRing = smoothstepJS(0.65, 0.68, r) * (1.0 - smoothstepJS(0.91, 0.96, r)) * 0.64;
      const enckeGap = 1.0 - Math.exp(-Math.pow((r - 0.84) * 75.0, 2.0));

      // Micro-ringlet resonance ripples
      const ringlets =
        0.72 +
        0.18 * Math.sin(r * 195.0) +
        0.1 * Math.sin(r * 410.0 + 1.2) +
        0.06 * Math.cos(r * 730.0);

      const alpha = Math.min(
        1,
        Math.max(0, edgeFade * (cRing + bRing + aRing) * cassiniGap * enckeGap * ringlets)
      );

      // Warm silicate/icy tint variation across rings
      const warmth = 0.45 + 0.55 * Math.sin(r * 22.0 + 0.7);
      const red = Math.round(178 + warmth * 44);
      const green = Math.round(168 + warmth * 36);
      const blue = Math.round(158 + (1 - warmth) * 52);

      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = red;
        data[idx + 1] = green;
        data[idx + 2] = blue;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}

/**
 * Cratered Carbonaceous & Silicate Asteroid Regolith Textures (Albedo, Bump, Roughness).
 */
export function createAsteroidTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  const bCanvas = document.createElement('canvas');
  const rCanvas = document.createElement('canvas');
  aCanvas.width = bCanvas.width = rCanvas.width = size;
  aCanvas.height = bCanvas.height = rCanvas.height = size;

  const aCtx = aCanvas.getContext('2d');
  const bCtx = bCanvas.getContext('2d');
  const rCtx = rCanvas.getContext('2d');

  // Generate deterministic impact craters
  const craters: Array<{ x: number; y: number; rad: number }> = [];
  for (let i = 0; i < 28; i++) {
    craters.push({
      x: hash2(i, 1, 91),
      y: hash2(i, 2, 91),
      rad: 0.03 + Math.pow(hash2(i, 3, 91), 2.1) * 0.13,
    });
  }

  if (aCtx && bCtx && rCtx) {
    const aImg = aCtx.createImageData(size, size);
    const bImg = bCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    for (let py = 0; py < size; py++) {
      const v = py / size;
      for (let px = 0; px < size; px++) {
        const u = px / size;
        const nBase = fbm2D(u * 8.0, v * 8.0, 101, 4);
        const grit = smoothNoise(u * 38.0, v * 38.0, 137);

        let craterOffset = 0;
        for (let c = 0; c < craters.length; c++) {
          const cr = craters[c];
          let dx = Math.abs(u - cr.x);
          let dy = Math.abs(v - cr.y);
          if (dx > 0.5) dx = 1 - dx;
          if (dy > 0.5) dy = 1 - dy;
          const dist = Math.sqrt(dx * dx + dy * dy) / cr.rad;
          if (dist < 1.35) {
            const bowl = -Math.max(0, 1 - dist * dist) * 0.42;
            const rim = Math.exp(-Math.pow((dist - 1.0) * 5.2, 2.0)) * 0.24;
            craterOffset += bowl + rim;
          }
        }

        const heightNorm = Math.min(1, Math.max(0, 0.52 + (nBase - 0.5) * 0.65 + (grit - 0.5) * 0.18 + craterOffset));
        const albedoBase = 76 + heightNorm * 92 + grit * 18;
        const roughByte = Math.min(255, Math.max(125, Math.round((0.68 + (1 - heightNorm) * 0.26) * 255)));
        const bumpByte = Math.round(heightNorm * 255);

        const idx = (py * size + px) * 4;
        aImg.data[idx] = Math.min(255, Math.round(albedoBase * 1.04));
        aImg.data[idx + 1] = Math.min(255, Math.round(albedoBase * 0.98));
        aImg.data[idx + 2] = Math.min(255, Math.round(albedoBase * 0.93));
        aImg.data[idx + 3] = 255;

        bImg.data[idx] = bumpByte;
        bImg.data[idx + 1] = bumpByte;
        bImg.data[idx + 2] = bumpByte;
        bImg.data[idx + 3] = 255;

        rImg.data[idx] = roughByte;
        rImg.data[idx + 1] = roughByte;
        rImg.data[idx + 2] = roughByte;
        rImg.data[idx + 3] = 255;
      }
    }

    aCtx.putImageData(aImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const albedoMap = applyTextureQuality(new THREE.CanvasTexture(aCanvas), maxAnisotropy, true) as THREE.CanvasTexture;
  const bumpMap = applyTextureQuality(new THREE.CanvasTexture(bCanvas), maxAnisotropy, false) as THREE.CanvasTexture;
  const roughnessMap = applyTextureQuality(new THREE.CanvasTexture(rCanvas), maxAnisotropy, false) as THREE.CanvasTexture;
  albedoMap.wrapS = albedoMap.wrapT = THREE.RepeatWrapping;
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;

  return { albedoMap, bumpMap, roughnessMap };
}

/**
 * Photovoltaic Solar Wing Texture for Deep-Space Telemetry Probe Orbiters.
 */
export function createSolarArrayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#0c1d3d';
    ctx.fillRect(0, 0, size, size);

    // Individual silicon wafer cells + metallic silver busbars
    const cols = 4;
    const rows = 8;
    const cw = size / cols;
    const ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#112957' : '#143166';
        ctx.fillRect(c * cw + 2, r * ch + 1.5, cw - 4, ch - 3);
        ctx.fillStyle = 'rgba(148, 197, 255, 0.25)';
        ctx.fillRect(c * cw + 2, r * ch + ch * 0.5, cw - 4, 0.8);
      }
    }
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}
