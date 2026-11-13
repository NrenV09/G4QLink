import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  createMilkyWaySkyTexture,
  createNebulaCloudTexture,
  createParticleGlowTexture,
  createStarDiffractionTexture,
} from '../three/proceduralTextures';
import {
  createRayMarchedBlackHoleMaterial,
  createSpiralGalaxyShaderMaterial,
  createStarfieldShaderMaterial,
  createVolumetricBeamShaderMaterial,
} from '../three/shaders';

export type StageChapterId = 0 | 1 | 2 | 3 | 4;

export interface QuantumWebGLStageProps {
  chapter: StageChapterId;
  scrollProgress: number;
  seedHex: string;
  isDark: boolean;
  connectedCount: number;
  isWorkspaceFocused: boolean;
  hoverRole: 'host' | 'join' | null;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0.2, 0.25, -4.5);
const _tmpBgColor = new THREE.Color();
const _tmpSeedColor = new THREE.Color();
const _mouseWorld = new THREE.Vector3();
const _tmpMat4 = new THREE.Matrix4();
const _vX = new THREE.Vector3();
const _vY = new THREE.Vector3();
const _vZ = new THREE.Vector3();

// Smooth cosmic flight path mapped 0.0 -> 1.0 across the scrollable webpage sections
const CAM_POS_WAYPOINTS = [
  new THREE.Vector3(-1.3, 1.45, 9.6),   // 01: Gargantua Singularity Horizon
  new THREE.Vector3(9.4, 3.8, -5.2),    // 02: Ionized Nebula Filament Passage
  new THREE.Vector3(22.5, 11.8, -2.5),  // 03: Spiral Galaxy High Observatory
  new THREE.Vector3(2.4, 2.9, -31.8),   // 04: Binary Black Holes & Polar Jets
  new THREE.Vector3(-24.2, 2.3, -1.2),  // 05: Crimson Quasar Lookout
];

const LOOK_AT_WAYPOINTS = [
  new THREE.Vector3(0.2, 0.25, -4.5),   // Gargantua Core
  new THREE.Vector3(16.0, 0.4, -18.0),  // Emission Nebulae & Inner Arms
  new THREE.Vector3(24.0, -1.6, -22.0), // Barred Spiral Galaxy Bulge
  new THREE.Vector3(0.0, 1.1, -46.0),   // Binary Barycenter
  new THREE.Vector3(-36.0, 0.65, -12.0),// Crimson Quasar Singularity
];

const CAM_SPLINE = new THREE.CatmullRomCurve3(CAM_POS_WAYPOINTS, false, 'catmullrom', 0.45);
const LOOK_SPLINE = new THREE.CatmullRomCurve3(LOOK_AT_WAYPOINTS, false, 'catmullrom', 0.45);

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

interface RayBlackHoleRig {
  anchor: THREE.Group;
  diskFrame: THREE.Object3D;
  lensMesh: THREE.Mesh;
  lensMat: THREE.ShaderMaterial;
  jetMats: THREE.ShaderMaterial[];
  scale: number;
}

export const QuantumWebGLStage: React.FC<QuantumWebGLStageProps> = ({
  chapter,
  scrollProgress,
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
    scrollProgress,
    seedHex,
    isDark,
    connectedCount,
    isWorkspaceFocused,
    hoverRole,
  });
  liveStateRef.current = {
    chapter,
    scrollProgress,
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

    const initW = container.clientWidth || window.innerWidth;
    const initH = Math.max(1, container.clientHeight || window.innerHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(initW, initH);
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
    scene.background = new THREE.Color('#020307');
    const fog = new THREE.FogExp2('#020307', 0.0028);
    scene.fog = fog;

    // PMREM environment reflection for physical orbital satellites
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(52, initW / initH, 0.1, 520);
    camera.position.copy(CAM_POS_WAYPOINTS[0]);

    // Post-processing optical bloom on GPU-accelerated WebGL
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.56, 0.52, 0.72);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Cosmic lighting
    const hemiLight = new THREE.HemisphereLight('#b8d0ff', '#05070e', 0.8);
    scene.add(hemiLight);
    const primeLight = new THREE.PointLight('#fbbf24', 28, 48, 1.35);
    primeLight.position.set(0.2, 0.8, -4.5);
    scene.add(primeLight);

    // =========================================================================
    // 1. 360° MILKY WAY PANORAMA DOME (Deep-Space Dust & Barnard Rifts)
    // =========================================================================
    const skyTex = createMilkyWaySkyTexture(maxAniso);
    textures.push(skyTex);
    const skyGeo = new THREE.SphereGeometry(240, 48, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      transparent: true,
      opacity: 0.92,
    });
    geometries.push(skyGeo);
    materials.push(skyMat);
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.rotation.set(0.32, 0.55, -0.42);
    skyDome.renderOrder = -5;
    scene.add(skyDome);

    // =========================================================================
    // 2. SCHWARZSCHILD RAY-MARCHED BLACK HOLE SYSTEMS
    // =========================================================================
    const lensQuadGeo = new THREE.PlaneGeometry(10.2, 10.2);
    const jetBladeGeo = new THREE.PlaneGeometry(1.5, 19.0);
    geometries.push(lensQuadGeo, jetBladeGeo);

    const blackHoles: RayBlackHoleRig[] = [];

    function createRayBlackHole(opts: {
      parent?: THREE.Object3D;
      position: [number, number, number];
      scale: number;
      tiltX: number;
      tiltZ: number;
      innerColor: string;
      midColor: string;
      outerColor: string;
      ringColor: string;
      spinSpeed: number;
      withJets?: boolean;
      jetColor?: string;
    }): RayBlackHoleRig {
      const anchor = new THREE.Group();
      anchor.position.set(...opts.position);
      (opts.parent ?? scene).add(anchor);

      const diskFrame = new THREE.Object3D();
      diskFrame.rotation.set(opts.tiltX, 0, opts.tiltZ);
      anchor.add(diskFrame);

      anchor.updateWorldMatrix(true, true);
      const worldCenter = new THREE.Vector3().setFromMatrixPosition(anchor.matrixWorld);
      const basisMat = new THREE.Matrix3();
      _tmpMat4.copy(diskFrame.matrixWorld);
      _vX.setFromMatrixColumn(_tmpMat4, 0).normalize();
      _vY.setFromMatrixColumn(_tmpMat4, 1).normalize();
      _vZ.setFromMatrixColumn(_tmpMat4, 2).normalize();
      basisMat.set(
        _vX.x, _vY.x, _vZ.x,
        _vX.y, _vY.y, _vZ.y,
        _vX.z, _vY.z, _vZ.z
      );

      const lensMat = createRayMarchedBlackHoleMaterial({
        center: [worldCenter.x, worldCenter.y, worldCenter.z],
        scale: opts.scale,
        diskBasis: basisMat,
        innerColor: opts.innerColor,
        midColor: opts.midColor,
        outerColor: opts.outerColor,
        ringColor: opts.ringColor,
        spinSpeed: opts.spinSpeed,
      });
      materials.push(lensMat);

      // Mounted at scene root so billboard faces camera without parent scale distortion
      const lensMesh = new THREE.Mesh(lensQuadGeo, lensMat);
      lensMesh.position.copy(worldCenter);
      lensMesh.scale.setScalar(opts.scale);
      lensMesh.renderOrder = 10;
      lensMesh.frustumCulled = false;
      scene.add(lensMesh);

      const jetMats: THREE.ShaderMaterial[] = [];
      if (opts.withJets) {
        const jetHolder = new THREE.Group();
        jetHolder.scale.setScalar(opts.scale);
        diskFrame.add(jetHolder);

        const jMat = createVolumetricBeamShaderMaterial(opts.jetColor || opts.ringColor);
        materials.push(jMat);
        jetMats.push(jMat);

        const bladeA = new THREE.Mesh(jetBladeGeo, jMat);
        const bladeB = new THREE.Mesh(jetBladeGeo, jMat);
        bladeB.rotation.y = Math.PI / 2;
        bladeA.renderOrder = 4;
        bladeB.renderOrder = 4;
        jetHolder.add(bladeA, bladeB);
      }

      const rig: RayBlackHoleRig = {
        anchor,
        diskFrame,
        lensMesh,
        lensMat,
        jetMats,
        scale: opts.scale,
      };
      blackHoles.push(rig);
      return rig;
    }

    // Gargantua Prime (Hero Horizon)
    const primeBH = createRayBlackHole({
      position: [0.2, 0.25, -4.5],
      scale: 1.52,
      tiltX: 0.22,
      tiltZ: -0.15,
      innerColor: '#fffdf2',
      midColor: '#f59e0b',
      outerColor: '#7c2d12',
      ringColor: '#fef3c7',
      spinSpeed: 1.08,
    });

    // Live WebRTC Peer Satellites Orbiting Gargantua Prime
    const orbiterGeo = new THREE.OctahedronGeometry(0.11, 0);
    const orbiterMat = new THREE.MeshStandardMaterial({
      color: '#67e8f9',
      emissive: '#38bdf8',
      emissiveIntensity: 2.4,
      metalness: 0.88,
      roughness: 0.14,
    });
    geometries.push(orbiterGeo);
    materials.push(orbiterMat);

    const peerOrbiters: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const orb = new THREE.Mesh(orbiterGeo, orbiterMat);
      orb.visible = false;
      primeBH.anchor.add(orb);
      peerOrbiters.push(orb);
    }

    // Twin Orbiting Binary Black Holes with Relativistic Jets
    const binaryBarycenter = new THREE.Group();
    binaryBarycenter.position.set(0.0, 1.1, -46.0);
    scene.add(binaryBarycenter);

    createRayBlackHole({
      parent: binaryBarycenter,
      position: [-3.8, 0.25, 0],
      scale: 0.92,
      tiltX: 0.28,
      tiltZ: 0.2,
      innerColor: '#ecfeff',
      midColor: '#38bdf8',
      outerColor: '#1e1b4b',
      ringColor: '#bae6fd',
      spinSpeed: 1.45,
      withJets: true,
      jetColor: '#7dd3fc',
    });

    createRayBlackHole({
      parent: binaryBarycenter,
      position: [3.8, -0.25, 0],
      scale: 0.74,
      tiltX: -0.24,
      tiltZ: -0.18,
      innerColor: '#fdf4ff',
      midColor: '#a855f7',
      outerColor: '#7f1d1d',
      ringColor: '#f5d0fe',
      spinSpeed: 1.75,
      withJets: true,
      jetColor: '#c084fc',
    });

    // Crimson Quasar Horizon (Chapter 05)
    createRayBlackHole({
      position: [-36.0, 0.65, -12.0],
      scale: 1.48,
      tiltX: 0.19,
      tiltZ: 0.22,
      innerColor: '#fff7ed',
      midColor: '#ea580c',
      outerColor: '#450a0a',
      ringColor: '#fed7aa',
      spinSpeed: 1.38,
      withJets: true,
      jetColor: '#fb7185',
    });

    // =========================================================================
    // 3. 26,000-STAR LOGARITHMIC BARRED SPIRAL GALAXY & H-II KNOTS
    // =========================================================================
    const galaxyGroup = new THREE.Group();
    galaxyGroup.position.set(24.0, -1.6, -22.0);
    galaxyGroup.rotation.set(0.46, 0.1, -0.24);
    scene.add(galaxyGroup);

    const galaxyCount = 26000;
    const gPos = new Float32Array(galaxyCount * 3);
    const gCol = new Float32Array(galaxyCount * 3);
    const gScale = new Float32Array(galaxyCount);
    const gPhase = new Float32Array(galaxyCount);
    const gSpeed = new Float32Array(galaxyCount);

    const colBulge = new THREE.Color('#fff1d6');
    const colArmOB = new THREE.Color('#7cb3ff');
    const colArmMid = new THREE.Color('#a78bfa');
    const colHII = new THREE.Color('#f43f5e');
    const colReflect = new THREE.Color('#22d3ee');
    const tmpCol = new THREE.Color();

    const arms = 4;
    const maxRadius = 29;

    for (let i = 0; i < galaxyCount; i++) {
      const i3 = i * 3;
      const rNorm = Math.pow(Math.random(), 1.48);
      const radius = 0.25 + rNorm * maxRadius;
      const armIndex = i % arms;
      const armOffset = armIndex % 2 === 0 ? 0 : 0.18;
      const armBaseAngle = (armIndex / arms) * Math.PI * 2 + armOffset;
      const spiralTwist = radius * 0.34;

      const spread =
        (Math.random() - 0.5) *
        (0.32 + rNorm * 1.38) *
        (Math.random() < 0.78 ? 0.58 : 1.55);
      const angle = armBaseAngle + spiralTwist + spread;

      // Central ellipsoidal bulge transitions to thin disk plane
      const bulgeHeight = rNorm < 0.18 ? 1.85 * (1 - rNorm / 0.18) : 0;
      const diskThickness = 0.42 + (1 - rNorm) * 0.65;
      const y = (Math.random() - 0.5) * (bulgeHeight + diskThickness) * (Math.random() < 0.75 ? 0.55 : 1.35);

      gPos[i3] = Math.cos(angle) * radius;
      gPos[i3 + 1] = y;
      gPos[i3 + 2] = Math.sin(angle) * radius;

      if (rNorm < 0.18) {
        tmpCol.copy(colBulge).lerp(colArmOB, (rNorm / 0.18) * 0.3);
      } else {
        tmpCol.copy(colArmOB).lerp(colArmMid, (rNorm - 0.18) / 0.82);
        const knotRoll = Math.random();
        if (knotRoll < 0.11) tmpCol.lerp(colHII, 0.78);
        else if (knotRoll < 0.21) tmpCol.lerp(colReflect, 0.65);
      }

      gCol[i3] = tmpCol.r;
      gCol[i3 + 1] = tmpCol.g;
      gCol[i3 + 2] = tmpCol.b;

      const isBrightStar = Math.random() < 0.05;
      gScale[i] = isBrightStar
        ? 1.65 + Math.random() * 1.5
        : (0.28 + Math.random() * 0.95) * (rNorm < 0.18 ? 1.25 : 1.0);
      gPhase[i] = Math.random();
      gSpeed[i] = 0.068 / (0.42 + Math.sqrt(radius) * 0.58);
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
    spiralGalaxy.renderOrder = 1;
    galaxyGroup.add(spiralGalaxy);

    // Distant Secondary Inclined Galaxy
    const farGalaxy = new THREE.Points(galaxyGeo, galaxyMat);
    farGalaxy.position.set(-58, 22, -108);
    farGalaxy.rotation.set(1.12, 0.35, 0.72);
    farGalaxy.scale.setScalar(0.88);
    farGalaxy.renderOrder = 1;
    scene.add(farGalaxy);

    // =========================================================================
    // 4. REALISTIC FBM FILAMENT EMISSION & REFLECTION NEBULAE
    // =========================================================================
    const nebTexBlue = createNebulaCloudTexture('#2563eb', '#6366f1', maxAniso, 17);
    const nebTexTeal = createNebulaCloudTexture('#0891b2', '#0d9488', maxAniso, 41);
    const nebTexCrimson = createNebulaCloudTexture('#e11d48', '#d97706', maxAniso, 73);
    textures.push(nebTexBlue, nebTexTeal, nebTexCrimson);

    const nebPlaneGeo = new THREE.PlaneGeometry(36, 36);
    geometries.push(nebPlaneGeo);

    const nebulaSpecs = [
      { pos: [14, -1, -24], tex: nebTexBlue, rot: 0.35, scale: 1.35, opacity: 0.42 },
      { pos: [26, 2, -20], tex: nebTexTeal, rot: -0.55, scale: 1.25, opacity: 0.36 },
      { pos: [-38, 2, -18], tex: nebTexCrimson, rot: 0.85, scale: 1.45, opacity: 0.48 },
      { pos: [1, 3.2, -56], tex: nebTexBlue, rot: -0.25, scale: 1.45, opacity: 0.4 },
      { pos: [-12, -5, -36], tex: nebTexTeal, rot: 1.15, scale: 1.18, opacity: 0.3 },
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
      m.renderOrder = 2;
      scene.add(m);
      nebulaBillboards.push(m);
    });

    // =========================================================================
    // 5. 9,500 HARVARD BLACKBODY MULTI-MAGNITUDE STARS
    // =========================================================================
    const starCount = 9500;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);
    const sScale = new Float32Array(starCount);
    const sScaleOrig = new Float32Array(starCount);
    const sPhase = new Float32Array(starCount);

    const stellarPalette = [
      new THREE.Color('#9bb8ff'), // O/B blue-white
      new THREE.Color('#cad7ff'), // B/A ice white
      new THREE.Color('#f8f7ff'), // A white
      new THREE.Color('#fff4ea'), // F warm white
      new THREE.Color('#ffd2a1'), // G solar amber
      new THREE.Color('#ffcc6f'), // K orange
      new THREE.Color('#ffad75'), // M ember red
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 46 + Math.random() * 175;

      sPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      sPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sPos[i3 + 2] = r * Math.cos(phi) - 20;

      const c = stellarPalette[Math.floor(Math.random() * stellarPalette.length)];
      sCol[i3] = c.r;
      sCol[i3 + 1] = c.g;
      sCol[i3 + 2] = c.b;

      // Astronomical power-law magnitude distribution: mostly pinpoint background + rare hero magnitude-0 stars
      const magRoll = Math.random();
      const magSize =
        magRoll < 0.015
          ? 3.1 + Math.random() * 2.2
          : magRoll < 0.08
            ? 1.3 + Math.random() * 1.1
            : 0.35 + Math.random() * 0.72;
      sScale[i] = magSize;
      sScaleOrig[i] = magSize;
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
    starfield.renderOrder = 0;
    scene.add(starfield);

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
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
      starMat.uniforms.uPixelRatio.value = pr;
      galaxyMat.uniforms.uPixelRatio.value = pr;
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let smoothScroll = liveStateRef.current.scrollProgress;

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
        const st = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (st === gl.UNSIGNALED) {
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

      const motionMul = prefersReducedMotion ? 0.12 : 1.0;

      // Silky scroll-spline camera progression
      smoothScroll = THREE.MathUtils.damp(
        smoothScroll,
        Math.min(1, Math.max(0, st.scrollProgress)),
        4.0,
        delta
      );

      mouseNdc.smoothX = THREE.MathUtils.damp(mouseNdc.smoothX, mouseNdc.x * motionMul, 4.0, delta);
      mouseNdc.smoothY = THREE.MathUtils.damp(mouseNdc.smoothY, mouseNdc.y * motionMul, 4.0, delta);

      CAM_SPLINE.getPointAt(smoothScroll, _camTargetPos);
      LOOK_SPLINE.getPointAt(smoothScroll, _camTargetLook);

      const roleShiftX = st.hoverRole === 'host' ? -0.95 : st.hoverRole === 'join' ? 0.95 : 0;
      const gentleBreath = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.35) * 0.16;

      _camTargetPos.x += mouseNdc.smoothX * 1.9 + roleShiftX;
      _camTargetPos.y += mouseNdc.smoothY * 1.0 + gentleBreath;
      _camTargetLook.x += mouseNdc.smoothX * 0.75 + roleShiftX * 0.35;
      _camTargetLook.y += mouseNdc.smoothY * 0.4;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 3.6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 3.6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 3.6, delta);

      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _camTargetLook.x, 4.0, delta);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _camTargetLook.y, 4.0, delta);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _camTargetLook.z, 4.0, delta);
      camera.lookAt(_currentLook);

      // Deep space color & skybox dim tuning
      _tmpBgColor.set(st.isDark ? '#020307' : '#050814');
      (scene.background as THREE.Color).lerp(_tmpBgColor, 1 - Math.exp(-3 * delta));
      fog.color.copy(scene.background as THREE.Color);
      skyMat.opacity = THREE.MathUtils.damp(
        skyMat.opacity,
        st.isWorkspaceFocused ? 0.72 : 0.94,
        3.2,
        delta
      );

      const targetExp = st.isWorkspaceFocused ? 0.86 : 1.15;
      renderer.toneMappingExposure = THREE.MathUtils.damp(renderer.toneMappingExposure, targetExp, 3.5, delta);

      const shaderTime = prefersReducedMotion ? 0 : elapsed;

      // Binary orbital revolution & celestial sky drift
      if (!prefersReducedMotion) {
        binaryBarycenter.rotation.y = elapsed * 0.28;
        binaryBarycenter.rotation.z = Math.sin(elapsed * 0.22) * 0.1;
        starfield.rotation.y = elapsed * 0.005;
        skyDome.rotation.y = 0.55 + elapsed * 0.0025;
      }

      // Sync ray-marched Schwarzschild black holes to world transforms & camera billboard
      scene.updateMatrixWorld(false);
      for (let i = 0; i < blackHoles.length; i++) {
        const bh = blackHoles[i];
        bh.lensMesh.position.setFromMatrixPosition(bh.anchor.matrixWorld);
        bh.lensMesh.quaternion.copy(camera.quaternion);
        bh.lensMat.uniforms.uCenter.value.copy(bh.lensMesh.position);
        bh.lensMat.uniforms.uTime.value = shaderTime;

        _tmpMat4.copy(bh.diskFrame.matrixWorld);
        _vX.setFromMatrixColumn(_tmpMat4, 0).normalize();
        _vY.setFromMatrixColumn(_tmpMat4, 1).normalize();
        _vZ.setFromMatrixColumn(_tmpMat4, 2).normalize();
        bh.lensMat.uniforms.uDiskBasis.value.set(
          _vX.x, _vY.x, _vZ.x,
          _vX.y, _vY.y, _vZ.y,
          _vX.z, _vY.z, _vZ.z
        );

        bh.lensMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
          bh.lensMat.uniforms.uOpacity.value,
          st.isWorkspaceFocused ? 0.85 : 1.0,
          3.5,
          delta
        );

        for (let j = 0; j < bh.jetMats.length; j++) {
          bh.jetMats[j].uniforms.uTime.value = shaderTime;
        }
      }

      // Live Connected Peer Satellites Orbiting Gargantua Prime
      const activeOrbCount = Math.min(peerOrbiters.length, st.connectedCount);
      for (let i = 0; i < peerOrbiters.length; i++) {
        const orb = peerOrbiters[i];
        if (i < activeOrbCount) {
          orb.visible = true;
          const a = elapsed * 0.75 + (i / Math.max(1, activeOrbCount)) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 2.25, Math.sin(a * 1.4) * 0.42, Math.sin(a) * 2.25);
          orb.rotation.y = elapsed * 1.6;
        } else {
          orb.visible = false;
        }
      }

      // Nebula alignment
      for (let i = 0; i < nebulaBillboards.length; i++) {
        nebulaBillboards[i].quaternion.copy(camera.quaternion);
      }

      // Starfield & Spiral Galaxy Uniforms
      starMat.uniforms.uTime.value = shaderTime;
      starMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        starMat.uniforms.uOpacity.value,
        st.isWorkspaceFocused ? 0.65 : 1.0,
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
        st.isWorkspaceFocused ? 0.58 : 0.96,
        3.5,
        delta
      );

      if (composer && !isSoftwareGl) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

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
      composer?.dispose();
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
            'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.18), rgba(2,3,8,0.99) 62%)',
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
