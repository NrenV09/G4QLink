import * as THREE from 'three';

function applyTextureQuality(texture: THREE.Texture, maxAnisotropy: number, srgb = true): THREE.Texture {
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.anisotropy = Math.min(maxAnisotropy, 16);
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

function fbm2D(x: number, y: number, seed: number, octaves = 5): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq, seed + i * 19.3);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
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

    // Tight Airy optical disk + soft atmospheric halo
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.88);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.08, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.22, 'rgba(224, 238, 255, 0.42)');
    grad.addColorStop(0.48, 'rgba(180, 210, 255, 0.11)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Primary sharp 4-ray cross spikes
    ctx.save();
    ctx.translate(c, c);
    for (let rot = 0; rot < 2; rot++) {
      const flare = ctx.createLinearGradient(-c, 0, c, 0);
      flare.addColorStop(0.0, 'rgba(255,255,255,0)');
      flare.addColorStop(0.43, 'rgba(255,255,255,0.12)');
      flare.addColorStop(0.5, 'rgba(255,255,255,0.88)');
      flare.addColorStop(0.57, 'rgba(255,255,255,0.12)');
      flare.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = flare;
      ctx.fillRect(-c, -0.85, size, 1.7);
      ctx.rotate(Math.PI / 2);
    }

    // Subtle secondary diagonal optical spikes
    ctx.rotate(Math.PI / 4);
    for (let rot = 0; rot < 2; rot++) {
      const diag = ctx.createLinearGradient(-c * 0.65, 0, c * 0.65, 0);
      diag.addColorStop(0.0, 'rgba(255,255,255,0)');
      diag.addColorStop(0.5, 'rgba(255,255,255,0.28)');
      diag.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = diag;
      ctx.fillRect(-c * 0.65, -0.55, c * 1.3, 1.1);
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
 * Smooth Gaussian point sprite for multi-spectral galactic stars & dust knots.
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
    grad.addColorStop(0.16, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.42, 'rgba(218, 232, 255, 0.25)');
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
 * Photorealistic Domain-Warped Filament Emission & Dust Nebula Texture (100% offline pixel synthesis).
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

        // Domain warping for authentic interstellar gas shock-fronts & pillars
        const u = nx * 2.1 + 3.7;
        const v = ny * 2.1 + 1.9;
        const wx = fbm2D(u + 1.3, v + 4.1, seed, 4);
        const wy = fbm2D(u + 5.2, v + 2.6, seed + 7, 4);

        const baseGas = fbm2D(u + wx * 1.45, v + wy * 1.45, seed + 3, 5);
        const filamentRaw = fbm2D(u * 1.9 + wx * 2.1, v * 1.9 - wy * 1.8, seed + 17, 4);
        const ridgedFilament = Math.pow(1.0 - Math.abs(filamentRaw * 2.0 - 1.0), 2.4);

        // Dark molecular dust lane absorption
        const dustAbsorb = smoothstepJS(0.46, 0.72, fbm2D(u * 2.4 - wy, v * 2.4 + wx, seed + 31, 4));
        const density = Math.pow(falloff, 1.65) * (0.45 * baseGas + 0.78 * ridgedFilament) * (1.0 - 0.52 * dustAbsorb);

        const colorMix = Math.min(1, Math.max(0, baseGas * 0.8 + ridgedFilament * 0.4));
        const coreWhite = Math.pow(ridgedFilament, 2.2) * 0.35;

        const r = Math.min(255, (r1 * (1 - colorMix) + r2 * colorMix) + 255 * coreWhite);
        const g = Math.min(255, (g1 * (1 - colorMix) + g2 * colorMix) + 245 * coreWhite);
        const b = Math.min(255, (b1 * (1 - colorMix) + b2 * colorMix) + 255 * coreWhite);

        const idx = (py * size + px) * 4;
        data[idx] = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
        data[idx + 3] = Math.min(255, Math.round(density * 235));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}

/**
 * 360° Procedural Milky Way Panoramic Sky Texture with dark Barnard dust lanes & unresolved star clouds.
 */
export function createMilkyWaySkyTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      const v = y / height; // 0..1
      for (let x = 0; x < width; x++) {
        const u = x / width; // 0..1

        // Diagonal galactic plane curving gently across the celestial sphere
        const angle = u * Math.PI * 2.0;
        const planeOffset = Math.sin(angle + 0.55) * 0.16;
        const distFromPlane = Math.abs(v - 0.5 - planeOffset);
        const galacticBand = Math.exp(-Math.pow(distFromPlane * 5.8, 2.0));

        // Central galactic bulge concentration near u ~ 0.38
        const coreLon = Math.cos((u - 0.38) * Math.PI * 2.0) * 0.5 + 0.5;
        const coreBulge = Math.pow(coreLon, 4.0) * Math.exp(-Math.pow(distFromPlane * 4.2, 2.0));

        // Domain-warped star cloud filaments & dark Barnard molecular dust rift splitting the plane
        const sx = u * 9.0;
        const sy = v * 4.5;
        const warp = fbm2D(sx * 1.4, sy * 1.4, 42, 4);
        const cloudDensity = fbm2D(sx + warp * 1.2, sy - warp * 0.8, 19, 5);
        const dustRiftNoise = fbm2D(sx * 2.2 + warp * 1.5, sy * 3.1, 88, 5);
        const dustRift = Math.exp(-Math.pow(distFromPlane * 16.0, 2.0)) * smoothstepJS(0.36, 0.72, dustRiftNoise);

        const light =
          galacticBand * (0.28 + 0.92 * cloudDensity) * (1.0 - 0.84 * dustRift) +
          coreBulge * 0.85 * (1.0 - 0.55 * dustRift);

        // Realistic deep-space starlight tint: cold outer indigo + dusty cerulean + warm core gold
        const rBase = 2 + light * 48 + coreBulge * 62;
        const gBase = 3 + light * 58 + coreBulge * 46;
        const bBase = 9 + light * 86 + coreBulge * 26;

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.round(rBase));
        data[idx + 1] = Math.min(255, Math.round(gBase));
        data[idx + 2] = Math.min(255, Math.round(bBase));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle unresolved Milky Way star-dust sprinkle along the band
    for (let i = 0; i < 4200; i++) {
      const px = hash2(i, 1, 7) * width;
      const pySpread = (hash2(i, 2, 13) + hash2(i, 3, 19) - 1.0) * 0.22;
      const planeY = 0.5 + Math.sin((px / width) * Math.PI * 2.0 + 0.55) * 0.16;
      const py = (planeY + pySpread) * height;
      const alpha = 0.08 + hash2(i, 4, 29) * 0.32;
      const r = hash2(i, 5, 31) > 0.7 ? 1.2 : 0.7;
      ctx.fillStyle =
        hash2(i, 6, 37) > 0.45
          ? `rgba(218, 232, 255, ${alpha})`
          : `rgba(255, 224, 185, ${alpha})`;
      ctx.fillRect(px, py, r, r);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
