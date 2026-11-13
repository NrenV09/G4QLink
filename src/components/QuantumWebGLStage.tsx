import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createNebulaCloudTexture,
  createParticleGlowTexture,
  createStarDiffractionTexture,
} from '../three/proceduralTextures';
import {
  createAccretionDiskShaderMaterial,
  createPhotonLensingHaloShaderMaterial,
  createSpiralGalaxyShaderMaterial,
  createStarfieldShaderMaterial,
  createVolumetricBeamShaderMaterial,
} from '../three/shaders';

export type StageChapterId = 0 | 1 | 2 | 3;

export interface QuantumWebGLStageProps {
  chapter: StageChapterId;
  seedHex: string;
  isDark: boolean;
  connectedCount: number;
  isWorkspaceFocused: boolean;
  hoverRole: 'host' | 'join' | null;
  autoTour: boolean;
  onChapterChange?: (ch: StageChapterId) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 0.3, -4);
const _tmpBgColor = new THREE.Color();
const _tmpSeedColor = new THREE.Color();
const _mouseWorld = new THREE.Vector3();

const CHAPTER_PRESETS: Record<
  StageChapterId,
  {
    camPos: [number, number, number];
    lookAt: [number, number, number];
    bgDark: string;
    bgLight: string;
    fogDensity: number;
  }
> = {
  // 01: Gargantua-Class Supermassive Black Hole + Spiral Galaxy backdrop
  0: {
    camPos: [-1.2, 1.35, 11.4],
    lookAt: [0.4, 0.25, -4.5],
    bgDark: '#020308',
    bgLight: '#070b18',
    fogDensity: 0.0045,
  },
  // 02: Sweeping Logarithmic Spiral Galaxy & Volumetric Nebulae
  1: {
    camPos: [14.5, 11.5, 6.0],
    lookAt: [24.0, -1.2, -20.0],
    bgDark: '#03040b',
    bgLight: '#080d1c',
    fogDensity: 0.0038,
  },
  // 03: Twin Binary Black Holes & Relativistic Polar Jets
  2: {
    camPos: [1.5, 3.2, -28.0],
    lookAt: [0.0, 1.2, -46.0],
    bgDark: '#02040a',
    bgLight: '#070c18',
    fogDensity: 0.0052,
  },
  // 04: Crimson Quasar Singularity Horizon
  3: {
    camPos: [-25.5, 2.2, -1.5],
    lookAt: [-36.0, 0.6, -12.0],
    bgDark: '#070204',
    bgLight: '#13060a',
    fogDensity: 0.0058,
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface BlackHoleRig {
  group: THREE.Group;
  haloMesh: THREE.Mesh;
  diskMat: THREE.ShaderMaterial;
  haloMat: THREE.ShaderMaterial;
  jetMats: THREE.ShaderMaterial[];
}

export const QuantumWebGLStage: React.FC<QuantumWebGLStageProps> = ({
  chapter,
  seedHex,
  isDark,
  connectedCount,
  isWorkspaceFocused,
  hoverRole,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [contextLost, setContextLost] = useState(false);

  const liveStateRef = useRef({
    chapter,
    seedHex,
    isDark,
    connectedCount,
    isWorkspaceFocused,
    hoverRole,
  });
  liveStateRef.current = {
    chapter,
    seedHex,
    isDark,
    connectedCount,
    isWorkspaceFocused,
    hoverRole,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      Math.max(1, container.clientHeight || window.innerHeight)
    );
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020308');
    const fog = new THREE.FogExp2('#020308', 0.0045);
    scene.fog = fog;

    // Studio reflection environment for subtle metallic peer orbiters
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      54,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.1,
      400
    );
    camera.position.set(-1.2, 1.35, 11.4);

    // Subtle cosmic point & rim illumination
    const hemiLight = new THREE.HemisphereLight('#a8c7fa', '#070910', 0.85);
    scene.add(hemiLight);

    const primeLight = new THREE.PointLight('#fbbf24', 28, 45, 1.4);
    primeLight.position.set(0, 1.5, -4);
    scene.add(primeLight);

    const quasarLight = new THREE.PointLight('#ff3b1f', 36, 52, 1.3);
    quasarLight.position.set(-36, 1.0, -12);
    scene.add(quasarLight);

    const binaryLight = new THREE.PointLight('#38bdf8', 28, 48, 1.4);
    binaryLight.position.set(0, 2.0, -46);
    scene.add(binaryLight);

    // Shared black-hole geometries
    const shadowSphereGeo = new THREE.SphereGeometry(1, 48, 48);
    const diskPlaneGeo = new THREE.PlaneGeometry(6.6, 6.6);
    // Remap diskPlaneGeo vertex positions to [-1, 1] so shader polar math aligns seamlessly
    const posAttr = diskPlaneGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setX(i, posAttr.getX(i) / 3.3);
      posAttr.setY(i, posAttr.getY(i) / 3.3);
    }
    const unitDiskGeo = new THREE.PlaneGeometry(2, 2);
    const unitHaloGeo = new THREE.PlaneGeometry(2, 2);
    const jetBladeGeo = new THREE.PlaneGeometry(1.5, 18.0);
    geometries.push(shadowSphereGeo, diskPlaneGeo, unitDiskGeo, unitHaloGeo, jetBladeGeo);

    const eventHorizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    materials.push(eventHorizonMat);

    const blackHoles: BlackHoleRig[] = [];

    function createBlackHole(opts: {
      position: [number, number, number];
      scale: number;
      tiltX: number;
      tiltZ: number;
      innerColor: string;
      midColor: string;
      outerColor: string;
      ringColor: string;
      haloColor: string;
      spinSpeed: number;
      withJets?: boolean;
      jetColor?: string;
    }): BlackHoleRig {
      const group = new THREE.Group();
      group.position.set(...opts.position);
      group.scale.setScalar(opts.scale);
      scene.add(group);

      // 1. Pitch-black Event Horizon Sphere (radius = 0.88 relative to unit disk 1.0 -> matches r=0.305*3.0)
      const horizonRadius = 0.91;
      const horizonMesh = new THREE.Mesh(shadowSphereGeo, eventHorizonMat);
      horizonMesh.scale.setScalar(horizonRadius);
      horizonMesh.renderOrder = 1;
      group.add(horizonMesh);

      // 2. Swirling Relativistic Accretion Disk (normalized [-1, 1] * 3.0 scale)
      const diskMat = createAccretionDiskShaderMaterial(
        opts.innerColor,
        opts.midColor,
        opts.outerColor,
        opts.spinSpeed
      );
      materials.push(diskMat);
      const diskMesh = new THREE.Mesh(unitDiskGeo, diskMat);
      diskMesh.scale.setScalar(3.05);
      diskMesh.rotation.x = -Math.PI / 2 + opts.tiltX;
      diskMesh.rotation.y = opts.tiltZ;
      diskMesh.renderOrder = 2;
      group.add(diskMesh);

      // 3. Secondary Faint Outer Matter Dust Disk
      const outerDustMesh = new THREE.Mesh(unitDiskGeo, diskMat);
      outerDustMesh.scale.setScalar(3.85);
      outerDustMesh.rotation.x = -Math.PI / 2 + opts.tiltX + 0.05;
      outerDustMesh.rotation.y = opts.tiltZ - 0.12;
      outerDustMesh.rotation.z = 1.7;
      outerDustMesh.renderOrder = 2;
      group.add(outerDustMesh);

      // 4. Billboarded Gravitational Lensing Halo + Einstein Photon Ring
      const haloMat = createPhotonLensingHaloShaderMaterial(opts.ringColor, opts.haloColor);
      materials.push(haloMat);
      const haloMesh = new THREE.Mesh(unitHaloGeo, haloMat);
      haloMesh.scale.setScalar(2.98);
      haloMesh.renderOrder = 3;
      group.add(haloMesh);

      // 5. Optional Relativistic Polar Jets along black hole spin axis
      const jetMats: THREE.ShaderMaterial[] = [];
      if (opts.withJets) {
        const jetGroup = new THREE.Group();
        jetGroup.rotation.x = opts.tiltX;
        jetGroup.rotation.z = -opts.tiltZ;
        const jMat = createVolumetricBeamShaderMaterial(opts.jetColor || opts.ringColor);
        materials.push(jMat);
        jetMats.push(jMat);

        const bladeA = new THREE.Mesh(jetBladeGeo, jMat);
        const bladeB = new THREE.Mesh(jetBladeGeo, jMat);
        bladeB.rotation.y = Math.PI / 2;
        jetGroup.add(bladeA, bladeB);
        group.add(jetGroup);
      }

      const rig = { group, haloMesh, diskMat, haloMat, jetMats };
      blackHoles.push(rig);
      return rig;
    }

    // 1. SINGULARITY PRIME (Gargantua Gold / Molten Amber / Cosmic Ice)
    const primeBH = createBlackHole({
      position: [0, 0.25, -4.5],
      scale: 2.35,
      tiltX: 0.24,
      tiltZ: -0.14,
      innerColor: '#fffbeb',
      midColor: '#f59e0b',
      outerColor: '#991b1b',
      ringColor: '#fef3c7',
      haloColor: '#fb923c',
      spinSpeed: 1.05,
      withJets: false,
    });

    // Connected WebRTC Peer Stars Orbiting Singularity Prime
    const peerOrbitGroup = new THREE.Group();
    primeBH.group.add(peerOrbitGroup);
    const orbiterGeo = new THREE.OctahedronGeometry(0.09, 0);
    const orbiterMat = new THREE.MeshStandardMaterial({
      color: '#5eead4',
      emissive: '#38bdf8',
      emissiveIntensity: 2.8,
      metalness: 0.85,
      roughness: 0.15,
    });
    geometries.push(orbiterGeo);
    materials.push(orbiterMat);

    const peerOrbiters: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const orb = new THREE.Mesh(orbiterGeo, orbiterMat);
      orb.visible = false;
      peerOrbitGroup.add(orb);
      peerOrbiters.push(orb);
    }

    // 2. BINARY BLACK HOLE SYSTEM (Rotating twin singularities with Cyan & Violet-Amber Polar Jets)
    const binaryBarycenter = new THREE.Group();
    binaryBarycenter.position.set(0, 1.1, -46);
    scene.add(binaryBarycenter);

    const binaryAlpha = createBlackHole({
      position: [-3.4, 0.2, 0],
      scale: 1.35,
      tiltX: 0.3,
      tiltZ: 0.22,
      innerColor: '#ecfeff',
      midColor: '#38bdf8',
      outerColor: '#312e81',
      ringColor: '#bae6fd',
      haloColor: '#6366f1',
      spinSpeed: 1.5,
      withJets: true,
      jetColor: '#7dd3fc',
    });
    binaryBarycenter.add(binaryAlpha.group);

    const binaryBeta = createBlackHole({
      position: [3.4, -0.2, 0],
      scale: 1.05,
      tiltX: -0.25,
      tiltZ: -0.18,
      innerColor: '#fdf4ff',
      midColor: '#a855f7',
      outerColor: '#7f1d1d',
      ringColor: '#f5d0fe',
      haloColor: '#f43f5e',
      spinSpeed: 1.85,
      withJets: true,
      jetColor: '#c084fc',
    });
    binaryBarycenter.add(binaryBeta.group);

    // 3. CRIMSON QUASAR HORIZON (Chapter 04 active volcanic singularity)
    createBlackHole({
      position: [-36, 0.55, -12],
      scale: 2.25,
      tiltX: 0.2,
      tiltZ: 0.18,
      innerColor: '#fff7ed',
      midColor: '#ff4500',
      outerColor: '#4c0519',
      ringColor: '#fed7aa',
      haloColor: '#ef4444',
      spinSpeed: 1.45,
      withJets: true,
      jetColor: '#fb7185',
    });

    // =========================================================================
    // 12,000-PARTICLE ROTATING LOGARITHMIC SPIRAL GALAXY & NEBULA BELT
    // =========================================================================
    const galaxyGroup = new THREE.Group();
    galaxyGroup.position.set(24, -1.6, -21);
    galaxyGroup.rotation.x = 0.48;
    galaxyGroup.rotation.z = -0.22;
    scene.add(galaxyGroup);

    const galaxyCount = 12000;
    const gPos = new Float32Array(galaxyCount * 3);
    const gCol = new Float32Array(galaxyCount * 3);
    const gScale = new Float32Array(galaxyCount);
    const gPhase = new Float32Array(galaxyCount);
    const gSpeed = new Float32Array(galaxyCount);

    const colCore = new THREE.Color('#fff1d0');
    const colArmInner = new THREE.Color('#60a5fa');
    const colArmOuter = new THREE.Color('#a855f7');
    const colTealKnot = new THREE.Color('#2dd4bf');
    const colCrimsonDust = new THREE.Color('#fb7185');
    const tmpCol = new THREE.Color();

    const arms = 4;
    const maxRadius = 26;

    for (let i = 0; i < galaxyCount; i++) {
      const i3 = i * 3;
      const rNorm = Math.pow(Math.random(), 1.35);
      const radius = 0.35 + rNorm * maxRadius;
      const armIndex = i % arms;
      const armBaseAngle = (armIndex / arms) * Math.PI * 2;
      const spiralTwist = radius * 0.36;

      // Gaussian-like spread wider near outer edge
      const spread = (Math.random() - 0.5) * (0.42 + rNorm * 1.45) * (Math.random() < 0.75 ? 0.65 : 1.5);
      const angle = armBaseAngle + spiralTwist + spread;

      const thickness = (1.15 - rNorm * 0.75) * 1.15;
      const y = (Math.random() - 0.5) * thickness * (Math.random() < 0.7 ? 0.55 : 1.6);

      gPos[i3] = Math.cos(angle) * radius;
      gPos[i3 + 1] = y;
      gPos[i3 + 2] = Math.sin(angle) * radius;

      // Spectral radial + knot coloring
      if (rNorm < 0.16) {
        tmpCol.copy(colCore).lerp(colArmInner, rNorm / 0.16 * 0.4);
      } else {
        tmpCol.copy(colArmInner).lerp(colArmOuter, (rNorm - 0.16) / 0.84);
        const knotRoll = Math.random();
        if (knotRoll < 0.14) tmpCol.lerp(colTealKnot, 0.75);
        else if (knotRoll < 0.22) tmpCol.lerp(colCrimsonDust, 0.68);
      }

      gCol[i3] = tmpCol.r;
      gCol[i3 + 1] = tmpCol.g;
      gCol[i3 + 2] = tmpCol.b;

      gScale[i] = (0.35 + Math.random() * 1.65) * (rNorm < 0.2 ? 1.4 : 1.0);
      gPhase[i] = Math.random();
      gSpeed[i] = 0.085 / (0.45 + Math.sqrt(radius) * 0.55);
    }

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    galaxyGeo.setAttribute('aColor', new THREE.BufferAttribute(gCol, 3));
    galaxyGeo.setAttribute('aScale', new THREE.BufferAttribute(gScale, 1));
    galaxyGeo.setAttribute('aPhase', new THREE.BufferAttribute(gPhase, 1));
    galaxyGeo.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(gSpeed, 1));
    geometries.push(galaxyGeo);

    const glowTex = createParticleGlowTexture();
    textures.push(glowTex);
    const galaxyMat = createSpiralGalaxyShaderMaterial(glowTex);
    galaxyMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    materials.push(galaxyMat);

    const spiralGalaxy = new THREE.Points(galaxyGeo, galaxyMat);
    spiralGalaxy.frustumCulled = false;
    galaxyGroup.add(spiralGalaxy);

    // Distant Secondary Inclined Galaxy visible in background sky
    const farGalaxy = new THREE.Points(galaxyGeo, galaxyMat);
    farGalaxy.position.set(-55, 24, -95);
    farGalaxy.rotation.set(1.1, 0.4, 0.7);
    farGalaxy.scale.setScalar(0.85);
    scene.add(farGalaxy);

    // Wispy Volumetric Nebula Clouds (100% offline CanvasTextures)
    const nebTexBlue = createNebulaCloudTexture('#3b82f6', '#7c3aed', maxAniso);
    const nebTexTeal = createNebulaCloudTexture('#06b6d4', '#10b981', maxAniso);
    const nebTexCrimson = createNebulaCloudTexture('#e11d48', '#f59e0b', maxAniso);
    textures.push(nebTexBlue, nebTexTeal, nebTexCrimson);

    const nebPlaneGeo = new THREE.PlaneGeometry(34, 34);
    geometries.push(nebPlaneGeo);

    const nebulaSpecs = [
      { pos: [20, -2, -26], tex: nebTexBlue, rot: 0.4, scale: 1.4, opacity: 0.42 },
      { pos: [30, 1, -18], tex: nebTexTeal, rot: -0.6, scale: 1.15, opacity: 0.34 },
      { pos: [-38, 2, -16], tex: nebTexCrimson, rot: 0.9, scale: 1.35, opacity: 0.46 },
      { pos: [2, 3, -58], tex: nebTexBlue, rot: -0.3, scale: 1.5, opacity: 0.38 },
      { pos: [-14, -8, -42], tex: nebTexTeal, rot: 1.2, scale: 1.25, opacity: 0.28 },
    ];
    const nebulaBillboards: THREE.Mesh[] = [];
    nebulaSpecs.forEach((spec) => {
      const mat = new THREE.MeshBasicMaterial({
        map: spec.tex,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      materials.push(mat);
      const m = new THREE.Mesh(nebPlaneGeo, mat);
      m.position.set(...(spec.pos as [number, number, number]));
      m.scale.setScalar(spec.scale);
      m.rotation.z = spec.rot;
      scene.add(m);
      nebulaBillboards.push(m);
    });

    // =========================================================================
    // 8,500 MULTI-SPECTRAL DEEP-SPACE TWINKLING STARS
    // =========================================================================
    const starCount = 8500;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);
    const sScale = new Float32Array(starCount);
    const sPhase = new Float32Array(starCount);

    const stellarPalette = [
      new THREE.Color('#9bbcff'), // Hot Blue O/B
      new THREE.Color('#e2ecff'), // Blue-white A
      new THREE.Color('#ffffff'), // Pure white F
      new THREE.Color('#fef3c7'), // Warm Solar G
      new THREE.Color('#fdba74'), // Amber K
      new THREE.Color('#fca5a5'), // Red giant M
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 38 + Math.random() * 145;

      sPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      sPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sPos[i3 + 2] = r * Math.cos(phi) - 18;

      const c = stellarPalette[Math.floor(Math.pow(Math.random(), 0.85) * stellarPalette.length)];
      sCol[i3] = c.r;
      sCol[i3 + 1] = c.g;
      sCol[i3 + 2] = c.b;

      // Occasional super-bright hero stars with diffraction flares
      const isHeroStar = Math.random() < 0.045;
      sScale[i] = isHeroStar ? 2.6 + Math.random() * 2.4 : 0.45 + Math.random() * 1.15;
      sPhase[i] = Math.random();
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    starGeo.setAttribute('aScale', new THREE.BufferAttribute(sScale, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
    geometries.push(starGeo);

    const starTex = createStarDiffractionTexture();
    textures.push(starTex);
    const starMat = createStarfieldShaderMaterial(starTex);
    starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    materials.push(starMat);

    const starfield = new THREE.Points(starGeo, starMat);
    starfield.frustumCulled = false;
    scene.add(starfield);

    // Pre-warm shaders when GPU-backed
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer Parallax Tracking
    const mouseNdc = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      mouseNdc.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      mouseNdc.y = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const pr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h);
      starMat.uniforms.uPixelRatio.value = pr;
      galaxyMat.uniforms.uPixelRatio.value = pr;
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop (paced for software WebGL via afterDraw)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const st = liveStateRef.current;

      const preset = CHAPTER_PRESETS[st.chapter];
      const motionMul = prefersReducedMotion ? 0.15 : 1.0;

      mouseNdc.smoothX = THREE.MathUtils.damp(mouseNdc.smoothX, mouseNdc.x * motionMul, 4.2, delta);
      mouseNdc.smoothY = THREE.MathUtils.damp(mouseNdc.smoothY, mouseNdc.y * motionMul, 4.2, delta);

      const [px, py, pz] = preset.camPos;
      const [lx, ly, lz] = preset.lookAt;
      const zoomOut = st.isWorkspaceFocused ? 3.2 : 0;
      const roleShiftX = st.hoverRole === 'host' ? -1.1 : st.hoverRole === 'join' ? 1.1 : 0;

      _camTargetPos.set(
        px + mouseNdc.smoothX * 2.1 + roleShiftX,
        py + mouseNdc.smoothY * 1.1,
        pz + zoomOut
      );
      _camTargetLook.set(
        lx + mouseNdc.smoothX * 0.8 + roleShiftX * 0.35,
        ly + mouseNdc.smoothY * 0.45,
        lz
      );

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 2.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 2.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 2.5, delta);

      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _camTargetLook.x, 3.0, delta);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _camTargetLook.y, 3.0, delta);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _camTargetLook.z, 3.0, delta);
      camera.lookAt(_currentLook);

      // Deep Space Background & Fog
      _tmpBgColor.set(st.isDark ? preset.bgDark : preset.bgLight);
      (scene.background as THREE.Color).lerp(_tmpBgColor, 1 - Math.exp(-3 * delta));
      fog.color.copy(scene.background as THREE.Color);
      fog.density = THREE.MathUtils.damp(fog.density, preset.fogDensity, 3.0, delta);

      // Dim gently when dense P2P forms/chats are open
      const targetExp = st.isWorkspaceFocused ? 0.68 : 1.18;
      renderer.toneMappingExposure = THREE.MathUtils.damp(renderer.toneMappingExposure, targetExp, 3.5, delta);

      const shaderTime = prefersReducedMotion ? 0 : elapsed;

      // Update Black Holes (Billboard lensing rings + Accretion Plasma + Jets)
      for (let i = 0; i < blackHoles.length; i++) {
        const bh = blackHoles[i];
        bh.haloMesh.quaternion.copy(camera.quaternion);
        bh.diskMat.uniforms.uTime.value = shaderTime;
        bh.haloMat.uniforms.uTime.value = shaderTime;
        bh.diskMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
          bh.diskMat.uniforms.uOpacity.value,
          st.isWorkspaceFocused ? 0.62 : 1.0,
          3.5,
          delta
        );
        bh.haloMat.uniforms.uOpacity.value = bh.diskMat.uniforms.uOpacity.value;
        for (let j = 0; j < bh.jetMats.length; j++) {
          bh.jetMats[j].uniforms.uTime.value = shaderTime;
        }
      }

      // Binary Black Hole Mutual Orbital Dance
      if (!prefersReducedMotion) {
        binaryBarycenter.rotation.y = elapsed * 0.34;
        binaryBarycenter.rotation.z = Math.sin(elapsed * 0.25) * 0.12;
        starfield.rotation.y = elapsed * 0.008;
      }

      // Live Peer Satellites Orbiting Singularity Prime
      const activeOrbCount = Math.min(peerOrbiters.length, st.connectedCount);
      for (let i = 0; i < peerOrbiters.length; i++) {
        const orb = peerOrbiters[i];
        if (i < activeOrbCount) {
          orb.visible = true;
          const a = elapsed * 0.85 + (i / Math.max(1, activeOrbCount)) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 1.45, Math.sin(a * 1.3) * 0.32, Math.sin(a) * 1.45);
          orb.rotation.y = elapsed * 1.8;
        } else {
          orb.visible = false;
        }
      }

      // Nebula Billboards face camera gently
      for (let i = 0; i < nebulaBillboards.length; i++) {
        nebulaBillboards[i].quaternion.copy(camera.quaternion);
      }

      // Update Starfield & Spiral Galaxy Uniforms
      starMat.uniforms.uTime.value = shaderTime;
      starMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        starMat.uniforms.uOpacity.value,
        st.isWorkspaceFocused ? 0.55 : 1.0,
        3.5,
        delta
      );

      _tmpSeedColor.set(st.seedHex);
      _mouseWorld.set(mouseNdc.smoothX * 14.0, mouseNdc.smoothY * 8.0, 0);
      galaxyMat.uniforms.uTime.value = shaderTime;
      galaxyMat.uniforms.uMouse.value.copy(_mouseWorld);
      galaxyMat.uniforms.uSeedTint.value.lerp(_tmpSeedColor, 1 - Math.exp(-3 * delta));
      galaxyMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        galaxyMat.uniforms.uOpacity.value,
        st.isWorkspaceFocused ? 0.45 : 0.94,
        3.5,
        delta
      );

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  if (contextLost) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.16), rgba(2,3,8,0.99) 62%)',
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    />
  );
};
