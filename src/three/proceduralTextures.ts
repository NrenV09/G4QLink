import * as THREE from 'three';

function applyTextureQuality(texture: THREE.Texture, maxAnisotropy: number, srgb = true): THREE.Texture {
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.anisotropy = Math.min(maxAnisotropy, 16);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Crisp 4-point optical diffraction star sprite texture (100% offline procedural canvas).
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

    // Core spherical bloom
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.85);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.14, 'rgba(255, 255, 255, 0.92)');
    grad.addColorStop(0.36, 'rgba(220, 236, 255, 0.35)');
    grad.addColorStop(0.7, 'rgba(180, 210, 255, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle 4-ray diffraction cross flare
    ctx.save();
    ctx.translate(c, c);
    for (let rot = 0; rot < 2; rot++) {
      const flare = ctx.createLinearGradient(-c, 0, c, 0);
      flare.addColorStop(0, 'rgba(255,255,255,0)');
      flare.addColorStop(0.45, 'rgba(255,255,255,0.22)');
      flare.addColorStop(0.5, 'rgba(255,255,255,0.75)');
      flare.addColorStop(0.55, 'rgba(255,255,255,0.22)');
      flare.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = flare;
      ctx.fillRect(-c, -1.2, size, 2.4);
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
 * Soft smooth radial glow sprite for spiral galaxy & nebula dust particles.
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
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.24, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.55, 'rgba(215, 230, 255, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates multi-layered wispy deep-space nebula cloud billboards completely offline.
 */
export function createNebulaCloudTexture(
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    // Layered asymmetric nebula wisps
    const puffs = [
      { x: 0.48, y: 0.52, r: 0.44, c: primaryHex, a: 0.34 },
      { x: 0.56, y: 0.45, r: 0.36, c: secondaryHex, a: 0.30 },
      { x: 0.42, y: 0.42, r: 0.30, c: primaryHex, a: 0.24 },
      { x: 0.52, y: 0.58, r: 0.26, c: '#ffffff', a: 0.10 },
    ];
    puffs.forEach((p) => {
      const cx = p.x * size;
      const cy = p.y * size;
      const rad = p.r * size;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, p.c);
      g.addColorStop(0.45, p.c);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = p.a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  return applyTextureQuality(tex, maxAnisotropy, true) as THREE.CanvasTexture;
}
