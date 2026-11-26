import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  createAsteroidTextures,
  createDustAbsorptionTexture,
  createGasGiantTextures,
  createNebulaCloudTexture,
  createParticleGlowTexture,
  createPlanetaryRingTexture,
  createSolarArrayTexture,
  createStarDiffractionTexture,
} from '../three/proceduralTextures';
import {
  createAtmosphereRimShaderMaterial,
  createDeepSpaceSkyShaderMaterial,
  createGalaxyDustShaderMaterial,
  createPlanetaryRingShaderMaterial,
  createRayMarchedBlackHoleMaterial,
  createSpiralGalaxyShaderMaterial,
  createStarfieldShaderMaterial,
  createTidalStreamShaderMaterial,
  createVolumetricBeamShaderMaterial,
} from '../three/shaders';
import type { BackgroundSceneTheme } from '../lib/materialTheme';
import { buildCyberpunkCityScene, type CityController } from '../three/buildCyberpunkCityScene';
import { buildFrutigerAeroScene } from '../three/buildFrutigerAeroScene';

export type StageChapterId = 0 | 1 | 2 | 3 | 4;

export interface QuantumWebGLStageProps {
  chapter: StageChapterId;
  scrollProgress?: number;
  scrollProgressRef?: React.MutableRefObject<number>;
  seedHex: string;
  isDark: boolean;
  connectedCount: number;
  isWorkspaceFocused: boolean;
  hoverRole: 'host' | 'join' | null;
  backgroundScene?: BackgroundSceneTheme;
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
const _astDummy = new THREE.Object3D();

// Primary distant stellar key direction illuminating planet crescent, rings, and rocky asteroid belt
const STELLAR_SUN_DIR = new THREE.Vector3(-14.0, 5.5, -2.5).normalize();

// Smooth cosmic flight path mapped 0.0 -> 1.0 across the scrollable webpage sections
const CAM_POS_WAYPOINTS = [
  new THREE.Vector3(-1.3, 1.45, 9.6),   // 01: Gargantua Singularity & Aurelia-IX Horizon
  new THREE.Vector3(9.4, 3.8, -5.2),    // 02: Ionized Nebula & Dark Dust Filament Passage
  new THREE.Vector3(22.5, 11.8, -2.5),  // 03: Barred Spiral Galaxy High Observatory
  new THREE.Vector3(2.4, 2.9, -31.8),   // 04: Binary Black Holes & Tidal Plasma Bridge
  new THREE.Vector3(-24.2, 2.3, -1.2),  // 05: Crimson Quasar & Rogue Moon Lookout
];

const LOOK_AT_WAYPOINTS = [
  new THREE.Vector3(0.4, 0.15, -4.6),   // Gargantua Core & Ringed Gas Giant Sightline
  new THREE.Vector3(16.0, 0.4, -18.0),  // Emission Nebulae & Bok Globules
  new THREE.Vector3(24.0, -1.6, -22.0), // Barred Spiral Galaxy Bulge
  new THREE.Vector3(0.0, 1.1, -46.0),   // Binary Barycenter
  new THREE.Vector3(-35.6, 0.55, -12.0),// Crimson Quasar Singularity
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

function hash3JS(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3JS(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const n000 = hash3JS(ix, iy, iz);
  const n100 = hash3JS(ix + 1, iy, iz);
  const n010 = hash3JS(ix, iy + 1, iz);
  const n110 = hash3JS(ix + 1, iy + 1, iz);
  const n001 = hash3JS(ix, iy, iz + 1);
  const n101 = hash3JS(ix + 1, iy, iz + 1);
  const n011 = hash3JS(ix, iy + 1, iz + 1);
  const n111 = hash3JS(ix + 1, iy + 1, iz + 1);
  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function createSculptedAsteroidGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.16, 2);
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const nz = vz / len;

    // Multi-frequency rocky crag + oblong triaxial ellipsoid distortion
    const crag =
      noise3JS(nx * 3.1 + 2.4, ny * 3.1 + 1.1, nz * 3.1 + 5.7) * 0.42 +
      noise3JS(nx * 7.2 + 8.3, ny * 7.2 + 4.9, nz * 7.2 + 2.1) * 0.16;
    const disp = 0.72 + crag;
    posAttr.setXYZ(i, nx * 0.19 * disp, ny * 0.14 * disp, nz * 0.16 * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

interface RayBlackHoleRig {
  anchor: THREE.Group;
  diskFrame: THREE.Object3D;
  lensMesh: THREE.Mesh;
  lensMat: THREE.ShaderMaterial;
  jetMats: THREE.ShaderMaterial[];
  scale: number;
}

interface AsteroidOrbitData {
  angle: number;
  radius: number;
  yOffset: number;
  orbitSpeed: number;
  rotX: number;
  rotY: number;
  rotSpeedX: number;
  rotSpeedY: number;
  scale: number;
}

export const QuantumWebGLStage: React.FC<QuantumWebGLStageProps> = ({
  chapter,
  scrollProgress = 0,
  scrollProgressRef,
  seedHex,
  isDark,
  connectedCount,
  isWorkspaceFocused,
  hoverRole,
  backgroundScene = 'space',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [contextLost, setContextLost] = useState(false);

  const liveStateRef = useRef({
    chapter,
    scrollProgress,
    scrollProgressRef,
    seedHex,
    isDark,
    connectedCount,
    isWorkspaceFocused,
    hoverRole,
  });
  liveStateRef.current = {
    chapter,
    scrollProgress,
    scrollProgressRef,
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
    renderer.domElement.style.transform = 'translate3d(0, 0, 0)';
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
    const fog = new THREE.FogExp2('#020307', 0.0024);
    scene.fog = fog;

    // PMREM environment reflection for PBR spacecraft probes, rocky asteroids & planetshine
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(52, initW / initH, 0.5, 560);
    const getLiveScroll = () =>
      Math.min(
        1,
        Math.max(0, liveStateRef.current.scrollProgressRef?.current ?? liveStateRef.current.scrollProgress)
      );
    const initialScroll = getLiveScroll();

    // Optical HDR Bloom on GPU WebGL for nocturnal Space & Cyberpunk scenes.
    // Frutiger Aero is a bright daylight scene that renders directly through native hardware MSAA
    // to eliminate bloom luminance pumping and edge shimmer on thin turbine blades & glass towers.
    let composer: EffectComposer | null = null;
    let composerRT: THREE.WebGLRenderTarget | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl && backgroundScene !== 'frutiger-aero') {
      const pr = renderer.getPixelRatio();
      composerRT = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(initW * pr)),
        Math.max(1, Math.floor(initH * pr)),
        {
          type: THREE.HalfFloatType,
          samples: renderer.capabilities.isWebGL2 ? 4 : 0,
        }
      );
      composer = new EffectComposer(renderer, composerRT);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(initW, initH),
        backgroundScene === 'cyberpunk' ? 0.48 : 0.40,
        backgroundScene === 'cyberpunk' ? 0.50 : 0.48,
        backgroundScene === 'cyberpunk' ? 0.78 : 0.82
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    let cityCtrl: CityController | null = null;
    let activeCamSpline = CAM_SPLINE;
    let activeLookSpline = LOOK_SPLINE;
    let spaceUpdateFn: ((elapsed: number, delta: number, shaderTime: number) => void) | null = null;
    let spaceSetPixelRatioFn: ((pr: number) => void) | null = null;

    if (backgroundScene === 'cyberpunk') {
      cityCtrl = buildCyberpunkCityScene({
        scene,
        fog,
        maxAniso,
        pixelRatio: renderer.getPixelRatio(),
        geometries,
        materials,
        textures,
      });
      activeCamSpline = cityCtrl.camSpline;
      activeLookSpline = cityCtrl.lookSpline;
      activeCamSpline.getPointAt(initialScroll, camera.position);
      activeLookSpline.getPointAt(initialScroll, _currentLook);
      camera.lookAt(_currentLook);
    } else if (backgroundScene === 'frutiger-aero') {
      cityCtrl = buildFrutigerAeroScene({
        scene,
        fog,
        maxAniso,
        pixelRatio: renderer.getPixelRatio(),
        isSoftwareGl,
        initialIsDark: liveStateRef.current.isDark,
        geometries,
        materials,
        textures,
      });
      activeCamSpline = cityCtrl.camSpline;
      activeLookSpline = cityCtrl.lookSpline;
      activeCamSpline.getPointAt(initialScroll, camera.position);
      activeLookSpline.getPointAt(initialScroll, _currentLook);
      camera.lookAt(_currentLook);
    } else {
      activeCamSpline.getPointAt(initialScroll, camera.position);
      activeLookSpline.getPointAt(initialScroll, _currentLook);
      camera.lookAt(_currentLook);

      // Cosmic lighting rig: distant stellar key + deep-space chiaroscuro fill + accretion bounce
      const hemiLight = new THREE.HemisphereLight('#5272a8', '#020308', 0.18);
      scene.add(hemiLight);

      const stellarSunLight = new THREE.DirectionalLight('#fff5e6', 3.1);
      stellarSunLight.position.copy(STELLAR_SUN_DIR).multiplyScalar(40);
      scene.add(stellarSunLight);

      const primeLight = new THREE.PointLight('#fbbf24', 18, 42, 1.35);
      primeLight.position.set(0.2, 0.8, -4.5);
      scene.add(primeLight);

      const quasarLight = new THREE.PointLight('#fb7185', 22, 34, 1.4);
      quasarLight.position.set(-36.0, 0.9, -12.0);
      scene.add(quasarLight);

    // =========================================================================
    // 1. INFINITE-RESOLUTION 360° GPU MILKY WAY SKY DOME
    // =========================================================================
    const skyGeo = new THREE.SphereGeometry(260, 48, 32);
    const skyMat = createDeepSpaceSkyShaderMaterial();
    geometries.push(skyGeo);
    materials.push(skyMat);
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.rotation.set(0.28, 0.55, -0.38);
    skyDome.renderOrder = -5;
    scene.add(skyDome);

    // =========================================================================
    // 2. SCHWARZSCHILD RAY-MARCHED BLACK HOLE SYSTEMS
    // =========================================================================
    const lensQuadGeo = new THREE.PlaneGeometry(10.4, 10.4);
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
      position: [-0.2, 0.35, -4.5],
      scale: 1.08,
      tiltX: 0.11,
      tiltZ: -0.14,
      innerColor: '#fffdf2',
      midColor: '#f59e0b',
      outerColor: '#7c2d12',
      ringColor: '#fef3c7',
      spinSpeed: 1.08,
    });

    // =========================================================================
    // 2B. COMPOSITE 5-PART PBR TELEMETRY PROBES ORBITING GARGANTUA
    // =========================================================================
    const solarTex = createSolarArrayTexture(maxAniso);
    textures.push(solarTex);

    const probeBusGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.14, 8);
    const probeCollarGeo = new THREE.TorusGeometry(0.068, 0.011, 8, 16);
    const probeWingGeo = new THREE.BoxGeometry(0.38, 0.008, 0.11);
    const probeDishGeo = new THREE.SphereGeometry(0.056, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.46);
    const probeBeaconGeo = new THREE.SphereGeometry(0.022, 8, 8);
    geometries.push(probeBusGeo, probeCollarGeo, probeWingGeo, probeDishGeo, probeBeaconGeo);

    const probeFoilMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      metalness: 0.88,
      roughness: 0.26,
    });
    const probeAlloyMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.9,
      roughness: 0.22,
    });
    const probeSolarMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.65,
      roughness: 0.2,
    });
    const probeBeaconMat = new THREE.MeshStandardMaterial({
      color: '#67e8f9',
      emissive: '#38bdf8',
      emissiveIntensity: 2.6,
      metalness: 0.3,
      roughness: 0.15,
    });
    materials.push(probeFoilMat, probeAlloyMat, probeSolarMat, probeBeaconMat);

    const peerOrbiters: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const probe = new THREE.Group();
      const bus = new THREE.Mesh(probeBusGeo, probeFoilMat);
      const collar = new THREE.Mesh(probeCollarGeo, probeAlloyMat);
      collar.rotation.x = Math.PI / 2;
      const wingL = new THREE.Mesh(probeWingGeo, probeSolarMat);
      wingL.position.x = -0.25;
      const wingR = new THREE.Mesh(probeWingGeo, probeSolarMat);
      wingR.position.x = 0.25;
      const dish = new THREE.Mesh(probeDishGeo, probeAlloyMat);
      dish.position.y = 0.095;
      dish.rotation.x = Math.PI;
      const beacon = new THREE.Mesh(probeBeaconGeo, probeBeaconMat);
      beacon.position.y = -0.09;
      probe.add(bus, collar, wingL, wingR, dish, beacon);
      probe.visible = false;
      primeBH.anchor.add(probe);
      peerOrbiters.push(probe);
    }

    // =========================================================================
    // 2C. 3D RINGED GAS GIANT EXOPLANET ("AURELIA-IX") & RAYLEIGH ATMOSPHERE
    // =========================================================================
    const gasGiantTex = createGasGiantTextures(maxAniso);
    const ringTex = createPlanetaryRingTexture(maxAniso);
    textures.push(gasGiantTex.albedoMap, gasGiantTex.bumpMap, ringTex);

    const planetCenter = new THREE.Vector3(6.6, -0.55, -5.2);
    const planetRadius = 1.25;
    const planetGroup = new THREE.Group();
    planetGroup.position.copy(planetCenter);
    planetGroup.rotation.set(0.44, 0.28, -0.34);
    scene.add(planetGroup);

    const planetGeo = new THREE.SphereGeometry(planetRadius, 56, 40);
    const planetMat = new THREE.MeshStandardMaterial({
      map: gasGiantTex.albedoMap,
      bumpMap: gasGiantTex.bumpMap,
      bumpScale: 0.028,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.0,
    });
    geometries.push(planetGeo);
    materials.push(planetMat);
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.renderOrder = 3;
    planetGroup.add(planetMesh);

    const atmoGeo = new THREE.SphereGeometry(planetRadius * 1.045, 48, 32);
    const atmoMat = createAtmosphereRimShaderMaterial({
      dayColor: '#60a5fa',
      twilightColor: '#f59e0b',
      sunDir: STELLAR_SUN_DIR,
    });
    geometries.push(atmoGeo);
    materials.push(atmoMat);
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.renderOrder = 4;
    planetGroup.add(atmoMesh);

    const ringInner = 1.65;
    const ringOuter = 3.18;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 96, 2);
    const ringMat = createPlanetaryRingShaderMaterial({
      ringTex,
      planetCenter,
      planetRadius,
      sunDir: STELLAR_SUN_DIR,
      innerRadius: ringInner,
      outerRadius: ringOuter,
    });
    geometries.push(ringGeo);
    materials.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.renderOrder = 5;
    planetGroup.add(ringMesh);

    // =========================================================================
    // 2D. 3D SCULPTED CRATERED ASTEROID / KUIPER DEBRIS BELT (InstancedMesh)
    // =========================================================================
    const asteroidTex = createAsteroidTextures(maxAniso);
    textures.push(asteroidTex.albedoMap, asteroidTex.bumpMap, asteroidTex.roughnessMap);

    const asteroidGeo = createSculptedAsteroidGeometry();
    const asteroidMat = new THREE.MeshStandardMaterial({
      map: asteroidTex.albedoMap,
      bumpMap: asteroidTex.bumpMap,
      bumpScale: 0.035,
      roughnessMap: asteroidTex.roughnessMap,
      roughness: 0.9,
      metalness: 0.1,
      envMapIntensity: 0.16,
    });
    geometries.push(asteroidGeo);
    materials.push(asteroidMat);

    const asteroidCount = 240;
    const asteroidBeltGroup = new THREE.Group();
    asteroidBeltGroup.position.set(1.8, -1.65, -3.8);
    asteroidBeltGroup.rotation.set(0.32, 0.16, -0.22);
    scene.add(asteroidBeltGroup);

    const asteroidInst = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    asteroidInst.frustumCulled = false;
    asteroidInst.renderOrder = 3;

    const asteroidOrbits: AsteroidOrbitData[] = [];
    const astTintA = new THREE.Color('#9ca3af');
    const astTintB = new THREE.Color('#78716c');
    const astTintC = new THREE.Color('#b4a28f');
    const astColorTmp = new THREE.Color();

    for (let i = 0; i < asteroidCount; i++) {
      const radius = 5.4 + Math.random() * 7.2;
      const angle = Math.random() * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 2.1;
      const scale = 0.28 + Math.pow(Math.random(), 2.2) * 1.15;

      asteroidOrbits.push({
        angle,
        radius,
        yOffset,
        orbitSpeed: 0.025 + (1.0 / radius) * 0.14,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.45,
        rotSpeedY: (Math.random() - 0.5) * 0.52,
        scale,
      });

      const roll = Math.random();
      if (roll < 0.4) astColorTmp.copy(astTintA);
      else if (roll < 0.78) astColorTmp.copy(astTintB);
      else astColorTmp.copy(astTintC);
      astColorTmp.multiplyScalar(0.65 + Math.random() * 0.55);
      asteroidInst.setColorAt(i, astColorTmp);

      _astDummy.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
      _astDummy.rotation.set(asteroidOrbits[i].rotX, asteroidOrbits[i].rotY, 0);
      _astDummy.scale.setScalar(scale);
      _astDummy.updateMatrix();
      asteroidInst.setMatrixAt(i, _astDummy.matrix);
    }
    asteroidInst.instanceMatrix.needsUpdate = true;
    if (asteroidInst.instanceColor) asteroidInst.instanceColor.needsUpdate = true;
    asteroidBeltGroup.add(asteroidInst);

    // =========================================================================
    // 2E. BINARY BLACK HOLES WITH RELATIVISTIC JETS & TIDAL PLASMA BRIDGE
    // =========================================================================
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

    // S-Curve Luminous Tidal Plasma Accretion Stream through the Binary L1 Bridge
    const tidalCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, 0.22, 0.65),
      new THREE.Vector3(-1.1, 0.42, -0.55),
      new THREE.Vector3(0.0, 0.0, 0.0),
      new THREE.Vector3(1.1, -0.35, 0.55),
      new THREE.Vector3(2.8, -0.22, -0.65),
    ]);
    const tidalGeo = new THREE.TubeGeometry(tidalCurve, 44, 0.34, 12, false);
    const tidalMat = createTidalStreamShaderMaterial('#38bdf8', '#c084fc');
    geometries.push(tidalGeo);
    materials.push(tidalMat);
    const tidalStream = new THREE.Mesh(tidalGeo, tidalMat);
    tidalStream.renderOrder = 3;
    binaryBarycenter.add(tidalStream);

    // =========================================================================
    // 2F. CRIMSON QUASAR HORIZON & ILLUMINATED ROGUE MOON "NYX-IV" (Chapter 05)
    // =========================================================================
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

    const rogueMoonGeo = new THREE.SphereGeometry(1.15, 36, 24);
    const rogueMoonMat = new THREE.MeshStandardMaterial({
      map: asteroidTex.albedoMap,
      bumpMap: asteroidTex.bumpMap,
      bumpScale: 0.055,
      roughnessMap: asteroidTex.roughnessMap,
      roughness: 0.92,
      metalness: 0.08,
      color: '#cbd5e1',
      envMapIntensity: 0.0,
    });
    geometries.push(rogueMoonGeo);
    materials.push(rogueMoonMat);
    const rogueMoon = new THREE.Mesh(rogueMoonGeo, rogueMoonMat);
    rogueMoon.position.set(-30.8, -1.25, -9.2);
    rogueMoon.renderOrder = 3;
    scene.add(rogueMoon);

    // =========================================================================
    // 3. 26,000-STAR BARRED SPIRAL GALAXY + DARK DUST LANES + GLOBULAR CLUSTERS
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

      const bulgeHeight = rNorm < 0.18 ? 1.85 * (1 - rNorm / 0.18) : 0;
      const diskThickness = 0.42 + (1 - rNorm) * 0.65;
      const y =
        (Math.random() - 0.5) *
        (bulgeHeight + diskThickness) *
        (Math.random() < 0.75 ? 0.55 : 1.35);

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
    const dustTex = createDustAbsorptionTexture(maxAniso, 61);
    textures.push(glowTex, dustTex);

    const galaxyMat = createSpiralGalaxyShaderMaterial(glowTex);
    galaxyMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    materials.push(galaxyMat);

    const spiralGalaxy = new THREE.Points(galaxyGeo, galaxyMat);
    spiralGalaxy.frustumCulled = false;
    spiralGalaxy.renderOrder = 2;
    galaxyGroup.add(spiralGalaxy);

    // Dark Interstellar Molecular Dust-Lane Ribbons hugging inner spiral arm edges
    const dustCount = 2800;
    const dPos = new Float32Array(dustCount * 3);
    const dScale = new Float32Array(dustCount);
    const dSpeed = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const rNorm = 0.12 + Math.pow(Math.random(), 1.15) * 0.82;
      const radius = 0.25 + rNorm * maxRadius;
      const armIndex = i % arms;
      const armOffset = armIndex % 2 === 0 ? 0 : 0.18;
      // Trail along the inner concave edge (-0.22 rad) of each luminous spiral arm
      const angle = (armIndex / arms) * Math.PI * 2 + armOffset + radius * 0.34 - 0.22 + (Math.random() - 0.5) * 0.24;

      dPos[i3] = Math.cos(angle) * radius;
      dPos[i3 + 1] = (Math.random() - 0.5) * 0.38;
      dPos[i3 + 2] = Math.sin(angle) * radius;
      dScale[i] = 1.6 + Math.random() * 2.8;
      dSpeed[i] = 0.068 / (0.42 + Math.sqrt(radius) * 0.58);
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dustGeo.setAttribute('aScale', new THREE.BufferAttribute(dScale, 1));
    dustGeo.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(dSpeed, 1));
    geometries.push(dustGeo);

    const galaxyDustMat = createGalaxyDustShaderMaterial(dustTex);
    galaxyDustMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    materials.push(galaxyDustMat);

    const galaxyDust = new THREE.Points(dustGeo, galaxyDustMat);
    galaxyDust.frustumCulled = false;
    galaxyDust.renderOrder = 1;
    galaxyGroup.add(galaxyDust);

    // Halo Globular Star Clusters hovering above/below the galactic bulge
    const globCount = 720;
    const gcPos = new Float32Array(globCount * 3);
    const gcCol = new Float32Array(globCount * 3);
    const gcScale = new Float32Array(globCount);
    const gcPhase = new Float32Array(globCount);
    const gcSpeed = new Float32Array(globCount);
    const clusterCenters = 14;
    for (let c = 0; c < clusterCenters; c++) {
      const ca = (c / clusterCenters) * Math.PI * 2 + 0.4;
      const cr = 4.5 + (c % 5) * 3.1;
      const cy = (c % 2 === 0 ? 1 : -1) * (2.6 + (c % 4) * 1.4);
      const cx = Math.cos(ca) * cr;
      const cz = Math.sin(ca) * cr;
      const perCluster = globCount / clusterCenters;
      for (let k = 0; k < perCluster; k++) {
        const idx = Math.floor(c * perCluster + k);
        if (idx >= globCount) break;
        const i3 = idx * 3;
        const rad = Math.pow(Math.random(), 2.2) * 0.95;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        gcPos[i3] = cx + rad * Math.sin(ph) * Math.cos(th);
        gcPos[i3 + 1] = cy + rad * Math.sin(ph) * Math.sin(th);
        gcPos[i3 + 2] = cz + rad * Math.cos(ph);
        gcCol[i3] = 1.0;
        gcCol[i3 + 1] = 0.9;
        gcCol[i3 + 2] = 0.72;
        gcScale[idx] = k === 0 ? 2.4 : 0.45 + Math.random() * 0.7;
        gcPhase[idx] = Math.random();
        gcSpeed[idx] = 0.012;
      }
    }
    const globGeo = new THREE.BufferGeometry();
    globGeo.setAttribute('position', new THREE.BufferAttribute(gcPos, 3));
    globGeo.setAttribute('aColor', new THREE.BufferAttribute(gcCol, 3));
    globGeo.setAttribute('aScale', new THREE.BufferAttribute(gcScale, 1));
    globGeo.setAttribute('aPhase', new THREE.BufferAttribute(gcPhase, 1));
    globGeo.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(gcSpeed, 1));
    geometries.push(globGeo);
    const globPoints = new THREE.Points(globGeo, galaxyMat);
    globPoints.renderOrder = 2;
    galaxyGroup.add(globPoints);

    // Distant Secondary Inclined Galaxy
    const farGalaxy = new THREE.Points(galaxyGeo, galaxyMat);
    farGalaxy.position.set(-58, 22, -108);
    farGalaxy.rotation.set(1.12, 0.35, 0.72);
    farGalaxy.scale.setScalar(0.88);
    farGalaxy.renderOrder = 1;
    scene.add(farGalaxy);

    // =========================================================================
    // 4. MULTI-LAYERED 3D PARALLAX EMISSION NEBULAE & DARK BOK GLOBULE CLOUDS
    // =========================================================================
    const nebTexBlue = createNebulaCloudTexture('#2563eb', '#6366f1', maxAniso, 17);
    const nebTexTeal = createNebulaCloudTexture('#0891b2', '#0d9488', maxAniso, 41);
    const nebTexCrimson = createNebulaCloudTexture('#e11d48', '#d97706', maxAniso, 73);
    textures.push(nebTexBlue, nebTexTeal, nebTexCrimson);

    const nebPlaneGeo = new THREE.PlaneGeometry(34, 34);
    const dustPlaneGeo = new THREE.PlaneGeometry(18, 18);
    geometries.push(nebPlaneGeo, dustPlaneGeo);

    // True 3D oriented volumetric layers (angled intersecting sheets instead of flat screen-locked billboards)
    const nebulaSpecs = [
      { pos: [14.0, -0.8, -22.5], tex: nebTexBlue, rot: [0.18, -0.45, 0.35], scale: 1.24, opacity: 0.22 },
      { pos: [18.5, 1.4, -17.5], tex: nebTexTeal, rot: [-0.24, -0.78, -0.55], scale: 1.12, opacity: 0.19 },
      { pos: [24.0, 2.2, -25.0], tex: nebTexBlue, rot: [0.32, -0.25, 0.95], scale: 1.30, opacity: 0.16 },
      { pos: [-38.0, 2.0, -18.5], tex: nebTexCrimson, rot: [0.12, 0.62, 0.85], scale: 1.38, opacity: 0.26 },
      { pos: [-34.5, -1.5, -15.5], tex: nebTexCrimson, rot: [-0.28, 0.38, -0.4], scale: 1.02, opacity: 0.18 },
      { pos: [1.0, 3.2, -56.0], tex: nebTexBlue, rot: [0.14, 0.15, -0.25], scale: 1.36, opacity: 0.18 },
      { pos: [-12.0, -5.0, -36.0], tex: nebTexTeal, rot: [0.22, 0.55, 1.15], scale: 1.14, opacity: 0.15 },
    ];
    const nebulaLayers: Array<{ mesh: THREE.Mesh; baseRotY: number; speed: number }> = [];
    nebulaSpecs.forEach((spec, idx) => {
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
      m.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
      m.renderOrder = 2;
      scene.add(m);
      nebulaLayers.push({ mesh: m, baseRotY: spec.rot[1], speed: (idx % 2 === 0 ? 1 : -1) * 0.008 });
    });

    // Dark Silhouetted Molecular Bok Globules floating in front of emission gas for 3D depth
    const bokSpecs = [
      { pos: [13.8, 0.9, -14.2], rot: [0.1, -0.5, 0.4], scale: 0.72, opacity: 0.48 },
      { pos: [17.4, -0.6, -15.8], rot: [-0.2, -0.7, -0.8], scale: 0.88, opacity: 0.42 },
      { pos: [-33.6, 1.4, -11.4], rot: [0.15, 0.55, 0.6], scale: 0.65, opacity: 0.46 },
    ];
    bokSpecs.forEach((spec) => {
      const mat = new THREE.MeshBasicMaterial({
        map: dustTex,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
      });
      materials.push(mat);
      const m = new THREE.Mesh(dustPlaneGeo, mat);
      m.position.set(...(spec.pos as [number, number, number]));
      m.scale.setScalar(spec.scale);
      m.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
      m.renderOrder = 3;
      scene.add(m);
    });

    // =========================================================================
    // 5. 9,500 HARVARD BLACKBODY MULTI-MAGNITUDE STARS
    // =========================================================================
    const starCount = 9500;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);
    const sScale = new Float32Array(starCount);
    const sPhase = new Float32Array(starCount);

    const stellarPalette = [
      new THREE.Color('#9bb8ff'),
      new THREE.Color('#cad7ff'),
      new THREE.Color('#f8f7ff'),
      new THREE.Color('#fff4ea'),
      new THREE.Color('#ffd2a1'),
      new THREE.Color('#ffcc6f'),
      new THREE.Color('#ffad75'),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 46 + Math.random() * 185;

      sPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      sPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      sPos[i3 + 2] = r * Math.cos(phi) - 20;

      const c = stellarPalette[Math.floor(Math.random() * stellarPalette.length)];
      sCol[i3] = c.r;
      sCol[i3 + 1] = c.g;
      sCol[i3 + 2] = c.b;

      const magRoll = Math.random();
      sScale[i] =
        magRoll < 0.014
          ? 2.9 + Math.random() * 2.1
          : magRoll < 0.08
            ? 1.25 + Math.random() * 1.05
            : 0.32 + Math.random() * 0.68;
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

      spaceSetPixelRatioFn = (pr: number) => {
        starMat.uniforms.uPixelRatio.value = pr;
        galaxyMat.uniforms.uPixelRatio.value = pr;
        galaxyDustMat.uniforms.uPixelRatio.value = pr;
      };

      spaceUpdateFn = (elapsed: number, delta: number, shaderTime: number) => {
        const st = liveStateRef.current;

        _tmpBgColor.set(st.isDark ? '#020307' : '#050814');
        (scene.background as THREE.Color).lerp(_tmpBgColor, 1 - Math.exp(-3 * delta));
        fog.color.copy(scene.background as THREE.Color);

        const focusDim = st.isWorkspaceFocused ? 0.72 : 0.96;
        skyMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
          skyMat.uniforms.uOpacity.value,
          focusDim,
          3.2,
          delta
        );

        skyMat.uniforms.uTime.value = shaderTime;
        tidalMat.uniforms.uTime.value = shaderTime;

        if (!prefersReducedMotion) {
          binaryBarycenter.rotation.y = elapsed * 0.28;
          binaryBarycenter.rotation.z = Math.sin(elapsed * 0.22) * 0.1;
          starfield.rotation.y = elapsed * 0.004;
          skyDome.rotation.y = 0.55 + elapsed * 0.002;
          planetMesh.rotation.y = elapsed * 0.045;
          rogueMoon.rotation.y = elapsed * 0.08;

          // Keplerian asteroid debris belt evolution
          for (let i = 0; i < asteroidCount; i++) {
            const orb = asteroidOrbits[i];
            const a = orb.angle + elapsed * orb.orbitSpeed * 0.32;
            _astDummy.position.set(
              Math.cos(a) * orb.radius,
              orb.yOffset,
              Math.sin(a) * orb.radius
            );
            _astDummy.rotation.set(
              orb.rotX + elapsed * orb.rotSpeedX,
              orb.rotY + elapsed * orb.rotSpeedY,
              0
            );
            _astDummy.scale.setScalar(orb.scale);
            _astDummy.updateMatrix();
            asteroidInst.setMatrixAt(i, _astDummy.matrix);
          }
          asteroidInst.instanceMatrix.needsUpdate = true;

          for (let i = 0; i < nebulaLayers.length; i++) {
            const nl = nebulaLayers[i];
            nl.mesh.rotation.y = nl.baseRotY + Math.sin(elapsed * 0.08 + i) * 0.06;
          }
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

        // Live Connected Peer PBR Telemetry Probes Orbiting Gargantua Prime
        const activeOrbCount = Math.min(peerOrbiters.length, st.connectedCount);
        for (let i = 0; i < peerOrbiters.length; i++) {
          const orb = peerOrbiters[i];
          if (i < activeOrbCount) {
            orb.visible = true;
            const a = elapsed * 0.65 + (i / Math.max(1, activeOrbCount)) * Math.PI * 2;
            orb.position.set(Math.cos(a) * 2.35, Math.sin(a * 1.4) * 0.44, Math.sin(a) * 2.35);
            orb.rotation.y = -a + Math.PI * 0.5;
            orb.rotation.z = Math.sin(elapsed * 0.8 + i) * 0.14;
          } else {
            orb.visible = false;
          }
        }

        // Starfield & Spiral Galaxy + Dust Lane Uniforms
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

        galaxyDustMat.uniforms.uTime.value = shaderTime;
        galaxyDustMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
          galaxyDustMat.uniforms.uOpacity.value,
          st.isWorkspaceFocused ? 0.18 : 0.28,
          3.5,
          delta
        );
      };
    }

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
      composer?.setPixelRatio(pr);
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
      spaceSetPixelRatioFn?.(pr);
      cityCtrl?.setPixelRatio(pr);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let smoothScroll = initialScroll;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl.fenceSync) {
        timerId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (st === gl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const st = liveStateRef.current;

      const motionMul = prefersReducedMotion ? 0.12 : 1.0;

      smoothScroll = THREE.MathUtils.damp(
        smoothScroll,
        getLiveScroll(),
        4.0,
        delta
      );

      mouseNdc.smoothX = THREE.MathUtils.damp(mouseNdc.smoothX, mouseNdc.x * motionMul, 4.0, delta);
      mouseNdc.smoothY = THREE.MathUtils.damp(mouseNdc.smoothY, mouseNdc.y * motionMul, 4.0, delta);

      activeCamSpline.getPointAt(smoothScroll, _camTargetPos);
      activeLookSpline.getPointAt(smoothScroll, _camTargetLook);

      const roleShiftX = st.hoverRole === 'host' ? -0.95 : st.hoverRole === 'join' ? 0.95 : 0;
      const gentleBreath = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.35) * 0.16;
      const parallaxMul =
        backgroundScene === 'cyberpunk'
          ? 0.72
          : backgroundScene === 'frutiger-aero'
            ? 0.82
            : 1.0;

      _camTargetPos.x += mouseNdc.smoothX * 1.9 * parallaxMul + roleShiftX * parallaxMul;
      _camTargetPos.y += mouseNdc.smoothY * 1.0 * parallaxMul + gentleBreath;
      _camTargetLook.x += mouseNdc.smoothX * 0.75 + roleShiftX * 0.35;
      _camTargetLook.y += mouseNdc.smoothY * 0.4;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 3.6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 3.6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 3.6, delta);

      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _camTargetLook.x, 4.0, delta);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _camTargetLook.y, 4.0, delta);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _camTargetLook.z, 4.0, delta);
      camera.lookAt(_currentLook);

      const targetExp = st.isWorkspaceFocused
        ? 0.86
        : backgroundScene === 'cyberpunk'
          ? 1.18
          : backgroundScene === 'frutiger-aero'
            ? 1.05
            : 1.14;
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        targetExp,
        3.5,
        delta
      );

      const shaderTime = prefersReducedMotion ? 0 : elapsed;

      if (cityCtrl) {
        cityCtrl.update({
          elapsed,
          delta,
          shaderTime,
          prefersReducedMotion,
          seedHex: st.seedHex,
          isDark: st.isDark,
          connectedCount: st.connectedCount,
          isWorkspaceFocused: st.isWorkspaceFocused,
          camera,
        });
      } else {
        spaceUpdateFn?.(elapsed, delta, shaderTime);
      }

      if (composer && !isSoftwareGl) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      composer?.dispose();
      composerRT?.dispose();
      envRT.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [backgroundScene]);

  if (contextLost) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            backgroundScene === 'cyberpunk'
              ? 'radial-gradient(circle at 50% 42%, rgba(34,211,238,0.18), rgba(236,72,153,0.12) 34%, rgba(4,7,17,0.99) 70%)'
              : backgroundScene === 'frutiger-aero'
                ? 'linear-gradient(180deg, #0284c7 0%, #38bdf8 48%, #34d399 100%)'
                : 'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.18), rgba(2,3,8,0.99) 62%)',
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
      aria-hidden="true"
    />
  );
};
