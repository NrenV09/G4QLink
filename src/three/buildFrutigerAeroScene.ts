import * as THREE from 'three';
import {
  createAeroCloudTexture,
  createAeroEcoTowerTextures,
  createAeroMeadowTextures,
  createTropicalFishTexture,
  createWaterRippleTexture,
} from './frutigerAeroTextures';
import {
  createAeroAuroraRibbonShaderMaterial,
  createAeroBokehParticleShaderMaterial,
  createAeroSkyDomeShaderMaterial,
  createAeroSunbeamShaderMaterial,
  createCrystalWaterShaderMaterial,
  createSoapBubbleShaderMaterial,
} from './frutigerAeroShaders';
import type { CityController } from './buildCyberpunkCityScene';

export type AeroController = CityController;

// Smooth 5-chapter Frutiger Aero camera flight path mapped 0.0 -> 1.0 across scroll sections
const AERO_CAM_WAYPOINTS = [
  new THREE.Vector3(-0.4, 5.4, 16.2),   // 01: Sunlit Aqua Horizon, Crystal Bubble Orb & Bliss Hills
  new THREE.Vector3(6.8, 5.6, 4.2),     // 02: Iridescent Bubble & Tropical Fish Reef Drift
  new THREE.Vector3(0.4, 3.8, -6.5),    // 03: Crystal Lagoon & Glass Pavilion Overlook
  new THREE.Vector3(-10.5, 9.6, -21.5), // 04: Emerald Eco-Utopia Skyline & Wind Spires
  new THREE.Vector3(11.8, 15.8, -28.0), // 05: Aurora Sky Sanctuary & Floating Terrarium Orb
];

const AERO_LOOK_WAYPOINTS = [
  new THREE.Vector3(0.2, 4.3, -6.5),    // Hero Crystal Aqua-Orb, Clownfish & Eco Horizon
  new THREE.Vector3(0.8, 4.4, -7.2),    // Swimming Tropical Fish & Soap Bubbles
  new THREE.Vector3(0.0, 2.2, -23.0),   // Glass Pavilion & Shimmering Turquoise Lagoon
  new THREE.Vector3(-19.5, 9.8, -42.0), // Eco-Futurist Glass Towers & Spinning Turbines
  new THREE.Vector3(18.5, 14.5, -45.0), // Floating Crystal Island Terrarium & Aurora Ribbons
];

function hashA(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Continuous rolling emerald Bliss hills with a natural recessed turquoise lagoon basin
 * centered around (0, -18), kept gracefully low in the foreground camera corridor (z > -2)
 * so foreground slopes never clip or wash out the hero viewport.
 */
function meadowHeightAt(x: number, z: number): number {
  const dx = x - 0.0;
  const dz = z - -18.0;
  const lagoonDist = Math.sqrt((dx * dx) / (25 * 25) + (dz * dz) / (22 * 22));

  // Smooth rolling sinusoidal pasture hills (classic Windows Bliss contours)
  const rolling =
    Math.sin(x * 0.048 + 0.5) * Math.cos(z * 0.042 - 0.3) * 2.8 +
    Math.sin(x * 0.092 - z * 0.064) * 0.95 +
    Math.cos((x + z) * 0.025) * 1.45;

  // Crisp basin carve for central crystal turquoise lagoon so seabed stays deeply submerged and banks rise cleanly
  const basinCarve = -5.6 * Math.exp(-Math.pow(lagoonDist / 0.74, 2.4));
  const shoreLift = 1.1 * Math.exp(-Math.pow((lagoonDist - 1.06) / 0.36, 2.0));

  // Foreground corridor gentle downward sweep only well south of lagoon bank so meadow stays cleanly above water
  const foregroundEase = z > 8 ? -Math.min(1, (z - 8) / 20) * 1.4 : 0;

  // Scenic distant left/back eco-city ridge & right meadow slope
  const ecoRidge =
    5.4 * Math.exp(-(((x + 22) * (x + 22)) / 520 + ((z + 44) * (z + 44)) / 420)) +
    4.0 * Math.exp(-(((x - 28) * (x - 28)) / 480 + ((z + 36) * (z + 36)) / 460));

  return 0.95 + rolling + basinCarve + shoreLift + foregroundEase + ecoRidge;
}

const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _dayFogColor = new THREE.Color('#7de4ff');
const _darkFogColor = new THREE.Color('#062a48');
const _dayBgColor = new THREE.Color('#1ea9ef');
const _darkBgColor = new THREE.Color('#041c3c');
const _dayMeadowTint = new THREE.Color('#ffffff');
const _darkMeadowTint = new THREE.Color('#4a8d7a');

interface FishRig {
  group: THREE.Group;
  tailPivot: THREE.Group;
  leftFin: THREE.Mesh;
  rightFin: THREE.Mesh;
  center: THREE.Vector3;
  rx: number;
  ry: number;
  rz: number;
  speed: number;
  phase: number;
  tailFreq: number;
  figure8: boolean;
}

interface FloatingBubbleRig {
  mesh: THREE.Mesh;
  basePos: THREE.Vector3;
  bobAmp: number;
  bobSpeed: number;
  driftSpeed: number;
  phase: number;
  baseScale: number;
}

export function buildFrutigerAeroScene(opts: {
  scene: THREE.Scene;
  fog: THREE.FogExp2;
  maxAniso: number;
  pixelRatio: number;
  isSoftwareGl: boolean;
  initialIsDark?: boolean;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}): AeroController {
  const {
    scene,
    fog,
    maxAniso,
    pixelRatio,
    isSoftwareGl,
    initialIsDark = false,
    geometries,
    materials,
    textures,
  } = opts;

  const initDark = initialIsDark ? 1.0 : 0.0;
  scene.background = new THREE.Color().copy(_dayBgColor).lerp(_darkBgColor, initDark);
  fog.color.copy(_dayFogColor).lerp(_darkFogColor, initDark);
  fog.density = 0.005;

  const sunDir = new THREE.Vector3(0.46, 0.42, -0.78).normalize();

  // ===========================================================================
  // 1. SUNLIT CERULEAN SKY DOME & LUMINOUS FRUTIGER AERO LIGHTING RIG
  // ===========================================================================
  const skyGeo = new THREE.SphereGeometry(265, 48, 32);
  const skyMat = createAeroSkyDomeShaderMaterial();
  skyMat.uniforms.uSunDir.value.copy(sunDir);
  skyMat.uniforms.uDarkFactor.value = initDark;
  geometries.push(skyGeo);
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -6;
  scene.add(skyDome);

  // Warm golden-white sunlight paired with cool sky/meadow hemisphere fill
  const hemiLight = new THREE.HemisphereLight('#a8efff', '#15803d', THREE.MathUtils.lerp(0.88, 0.42, initDark));
  scene.add(hemiLight);

  const sunKeyLight = new THREE.DirectionalLight('#fff8e6', THREE.MathUtils.lerp(1.85, 0.95, initDark));
  sunKeyLight.position.copy(sunDir).multiplyScalar(65);
  scene.add(sunKeyLight);

  const aquaRimLight = new THREE.DirectionalLight('#38bdf8', THREE.MathUtils.lerp(0.85, 0.65, initDark));
  aquaRimLight.position.set(-28, 18, 22);
  scene.add(aquaRimLight);

  const lagoonBounceLight = new THREE.PointLight('#22d3ee', 18, 48, 1.35);
  lagoonBounceLight.position.set(0.0, 2.2, -16.0);
  scene.add(lagoonBounceLight);

  // ===========================================================================
  // 2. SUNLIT ROLLING EMERALD BLISS HILLS & CRYSTAL TURQUOISE LAGOON
  // ===========================================================================
  const meadowTex = createAeroMeadowTextures(maxAniso);
  textures.push(meadowTex.map, meadowTex.roughnessMap, meadowTex.bumpMap);

  const terrainGeo = new THREE.PlaneGeometry(250, 250, 112, 112);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const tColors = new Float32Array(tPos.count * 3);

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i) - 24;
    tPos.setZ(i, z);
    const y = meadowHeightAt(x, z);
    tPos.setY(i, y);

    // Rich chlorophyll Bliss emerald mid-slopes, warm sunlit spring-lime hill crests, pale aqua lagoon bed
    if (y < -0.35) {
      _tmpColor.set('#2cd4d9').lerp(new THREE.Color('#7eeef5'), Math.min(1, (-y - 0.35) / 3.2));
    } else if (y < 0.75) {
      _tmpColor.set('#16a34a').lerp(new THREE.Color('#34c759'), (y + 0.35) / 1.1);
    } else {
      const crest = Math.min(1, (y - 0.75) / 5.5);
      _tmpColor.set('#22b846').lerp(new THREE.Color('#7ce030'), crest * 0.72);
    }
    tColors[i * 3] = _tmpColor.r;
    tColors[i * 3 + 1] = _tmpColor.g;
    tColors[i * 3 + 2] = _tmpColor.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: meadowTex.map,
    roughnessMap: meadowTex.roughnessMap,
    bumpMap: meadowTex.bumpMap,
    bumpScale: 0.025,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.10,
  });
  terrainMat.color.copy(_dayMeadowTint).lerp(_darkMeadowTint, initDark);
  geometries.push(terrainGeo);
  materials.push(terrainMat);

  const meadowTerrain = new THREE.Mesh(terrainGeo, terrainMat);
  scene.add(meadowTerrain);

  // Crystal-clear turquoise lagoon surface strictly bounded to the carved basin at y = 0.02
  const waterGeo = new THREE.PlaneGeometry(52, 46, 48, 48);
  const waterMat = createCrystalWaterShaderMaterial();
  waterMat.uniforms.uSunDir.value.copy(sunDir);
  waterMat.uniforms.uDarkFactor.value = initDark;
  geometries.push(waterGeo);
  materials.push(waterMat);

  const waterSurface = new THREE.Mesh(waterGeo, waterMat);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.set(0, 0.02, -18.0);
  waterSurface.renderOrder = 2;
  scene.add(waterSurface);

  // Shared glossy Frutiger Aero materials (varied roughness/metalness for crisp readability)
  const glossyWhiteMat = new THREE.MeshPhysicalMaterial({
    color: '#eefaff',
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.0,
  });
  const aeroChromeMat = new THREE.MeshStandardMaterial({
    color: '#d8f4ff',
    roughness: 0.14,
    metalness: 0.90,
    envMapIntensity: 1.25,
  });
  const aquaGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#38d8f8',
    roughness: 0.06,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    envMapIntensity: 1.25,
  });
  const lushFoliageMat = new THREE.MeshStandardMaterial({
    color: '#1eb84c',
    roughness: 0.62,
    metalness: 0.03,
    emissive: '#0c3b20',
    emissiveIntensity: 0.14,
  });
  const treeTrunkMat = new THREE.MeshStandardMaterial({
    color: '#6b4f3a',
    roughness: 0.88,
    metalness: 0.02,
  });
  materials.push(glossyWhiteMat, aeroChromeMat, aquaGlassMat, lushFoliageMat, treeTrunkMat);

  // ===========================================================================
  // 3. COMPOSITE 7-PART ARTICULATED 3D TROPICAL FISH (CLOWNFISH, BLUE TANG, KOI)
  // ===========================================================================
  const clownTex = createTropicalFishTexture('clownfish', maxAniso);
  const tangTex = createTropicalFishTexture('bluetang', maxAniso);
  const koiTex = createTropicalFishTexture('goldkoi', maxAniso);
  textures.push(clownTex, tangTex, koiTex);

  const fishBodyGeo = new THREE.SphereGeometry(0.42, 24, 18);
  fishBodyGeo.scale(1.55, 0.78, 0.44);
  geometries.push(fishBodyGeo);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.quadraticCurveTo(0.28, 0.34, 0.56, 0.42);
  tailShape.quadraticCurveTo(0.36, 0.08, 0.34, 0);
  tailShape.quadraticCurveTo(0.36, -0.08, 0.56, -0.42);
  tailShape.quadraticCurveTo(0.28, -0.34, 0, 0);
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  tailGeo.center();
  tailGeo.translate(0.24, 0, 0);
  geometries.push(tailGeo);

  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-0.34, 0);
  dorsalShape.quadraticCurveTo(-0.08, 0.32, 0.30, 0.20);
  dorsalShape.quadraticCurveTo(0.36, 0.05, 0.24, 0);
  dorsalShape.closePath();
  const dorsalGeo = new THREE.ExtrudeGeometry(dorsalShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  dorsalGeo.center();
  geometries.push(dorsalGeo);

  const pecShape = new THREE.Shape();
  pecShape.moveTo(0, 0);
  pecShape.quadraticCurveTo(0.18, 0.14, 0.34, -0.02);
  pecShape.quadraticCurveTo(0.16, -0.18, 0, 0);
  const pecGeo = new THREE.ShapeGeometry(pecShape);
  geometries.push(pecGeo);

  const eyeWhiteGeo = new THREE.SphereGeometry(0.068, 12, 10);
  const eyePupilGeo = new THREE.SphereGeometry(0.038, 10, 8);
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.0 });
  const eyePupilMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.08, metalness: 0.1 });
  geometries.push(eyeWhiteGeo, eyePupilGeo);
  materials.push(eyeWhiteMat, eyePupilMat);

  const fishBodyMats = {
    clownfish: new THREE.MeshPhysicalMaterial({
      map: clownTex,
      roughness: 0.18,
      metalness: 0.04,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    }),
    bluetang: new THREE.MeshPhysicalMaterial({
      map: tangTex,
      roughness: 0.18,
      metalness: 0.06,
      clearcoat: 0.92,
      clearcoatRoughness: 0.1,
    }),
    goldkoi: new THREE.MeshPhysicalMaterial({
      map: koiTex,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    }),
  };
  const fishFinMats = {
    clownfish: new THREE.MeshPhysicalMaterial({
      color: '#ff922b',
      roughness: 0.24,
      clearcoat: 0.7,
      side: THREE.DoubleSide,
    }),
    bluetang: new THREE.MeshPhysicalMaterial({
      color: '#ffe033',
      roughness: 0.24,
      clearcoat: 0.75,
      side: THREE.DoubleSide,
    }),
    goldkoi: new THREE.MeshPhysicalMaterial({
      color: '#a5f3fc',
      roughness: 0.20,
      clearcoat: 0.8,
      side: THREE.DoubleSide,
    }),
  };
  materials.push(
    fishBodyMats.clownfish,
    fishBodyMats.bluetang,
    fishBodyMats.goldkoi,
    fishFinMats.clownfish,
    fishFinMats.bluetang,
    fishFinMats.goldkoi
  );

  const fishRigs: FishRig[] = [];

  function spawnTropicalFish(config: {
    variant: 'clownfish' | 'bluetang' | 'goldkoi';
    scale: number;
    center: [number, number, number];
    rx: number;
    ry: number;
    rz: number;
    speed: number;
    phase: number;
    figure8?: boolean;
  }) {
    const group = new THREE.Group();
    group.scale.setScalar(config.scale);

    const body = new THREE.Mesh(fishBodyGeo, fishBodyMats[config.variant]);
    group.add(body);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.56, 0, 0);
    const tailMesh = new THREE.Mesh(tailGeo, fishFinMats[config.variant]);
    tailPivot.add(tailMesh);
    group.add(tailPivot);

    const dorsal = new THREE.Mesh(dorsalGeo, fishFinMats[config.variant]);
    dorsal.position.set(0.04, 0.34, 0);
    group.add(dorsal);

    const ventral = new THREE.Mesh(dorsalGeo, fishFinMats[config.variant]);
    ventral.scale.set(0.62, -0.58, 0.8);
    ventral.position.set(0.10, -0.28, 0);
    group.add(ventral);

    const leftFin = new THREE.Mesh(pecGeo, fishFinMats[config.variant]);
    leftFin.position.set(-0.14, -0.06, 0.17);
    leftFin.rotation.y = -0.55;
    group.add(leftFin);

    const rightFin = new THREE.Mesh(pecGeo, fishFinMats[config.variant]);
    rightFin.position.set(-0.14, -0.06, -0.17);
    rightFin.rotation.y = 0.55;
    group.add(rightFin);

    for (const side of [1, -1]) {
      const sclera = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      sclera.position.set(-0.42, 0.08, side * 0.13);
      const pupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      pupil.position.set(-0.45, 0.08, side * 0.165);
      group.add(sclera, pupil);
    }

    scene.add(group);
    fishRigs.push({
      group,
      tailPivot,
      leftFin,
      rightFin,
      center: new THREE.Vector3(...config.center),
      rx: config.rx,
      ry: config.ry,
      rz: config.rz,
      speed: config.speed,
      phase: config.phase,
      tailFreq: 6.5 + hashA(config.phase * 13.7) * 3.0,
      figure8: Boolean(config.figure8),
    });
  }

  // Hero fish swimming clearly inside the centerpiece Crystal Water-Orb (Chapter 01 & 02)
  spawnTropicalFish({ variant: 'clownfish', scale: 0.78, center: [0.5, 4.75, 0.4], rx: 1.05, ry: 0.34, rz: 0.95, speed: 0.62, phase: 0.35, figure8: false });
  spawnTropicalFish({ variant: 'bluetang', scale: 0.72, center: [0.5, 4.45, 0.4], rx: 1.15, ry: 0.32, rz: 1.05, speed: -0.54, phase: 2.9, figure8: false });

  // Open-air dreamy reef shoal gliding around bubbles between Chapter 01, 02 & 03
  spawnTropicalFish({ variant: 'clownfish', scale: 0.98, center: [3.4, 5.2, -3.5], rx: 3.4, ry: 0.75, rz: 2.8, speed: 0.44, phase: 0.9, figure8: true });
  spawnTropicalFish({ variant: 'bluetang', scale: 0.90, center: [-3.4, 5.1, -3.8], rx: 3.1, ry: 0.85, rz: 2.6, speed: 0.48, phase: 2.1, figure8: true });
  spawnTropicalFish({ variant: 'goldkoi', scale: 1.04, center: [1.5, 4.4, -9.5], rx: 4.2, ry: 0.9, rz: 3.2, speed: 0.38, phase: 4.1, figure8: true });
  spawnTropicalFish({ variant: 'clownfish', scale: 0.82, center: [5.4, 4.8, -1.2], rx: 2.2, ry: 0.65, rz: 2.0, speed: 0.56, phase: 5.2, figure8: false });
  spawnTropicalFish({ variant: 'bluetang', scale: 0.84, center: [-1.2, 3.4, -16.5], rx: 4.8, ry: 0.7, rz: 3.8, speed: 0.42, phase: 1.5, figure8: true });
  spawnTropicalFish({ variant: 'goldkoi', scale: 0.92, center: [2.4, 2.9, -18.2], rx: 4.5, ry: 0.6, rz: 3.4, speed: -0.39, phase: 3.6, figure8: false });

  // ===========================================================================
  // 4. HERO FLOATING CRYSTAL AQUA-ORB & CONSTELLATION OF IRIDESCENT BUBBLES
  // ===========================================================================
  const heroBubbleMat = createSoapBubbleShaderMaterial('#6ae9ff');
  const mintBubbleMat = createSoapBubbleShaderMaterial('#6ef7c8');
  const skyBubbleMat = createSoapBubbleShaderMaterial('#9be4ff');
  materials.push(heroBubbleMat, mintBubbleMat, skyBubbleMat);

  const heroOrbGroup = new THREE.Group();
  heroOrbGroup.position.set(0.5, 4.65, 0.4);

  const heroSphereGeo = new THREE.SphereGeometry(2.15, 48, 36);
  const heroSphereMesh = new THREE.Mesh(heroSphereGeo, heroBubbleMat);
  heroSphereMesh.renderOrder = 8;
  heroOrbGroup.add(heroSphereMesh);

  const innerRingGeo = new THREE.TorusGeometry(2.48, 0.042, 16, 96);
  const innerRing = new THREE.Mesh(innerRingGeo, aeroChromeMat);
  innerRing.rotation.set(1.18, 0.28, 0.22);
  heroOrbGroup.add(innerRing);

  const outerRingGeo = new THREE.TorusGeometry(2.82, 0.068, 16, 96);
  const outerRing = new THREE.Mesh(outerRingGeo, aquaGlassMat);
  outerRing.rotation.set(1.38, -0.35, -0.18);
  outerRing.renderOrder = 8;
  heroOrbGroup.add(outerRing);

  const satOrbGeo = new THREE.SphereGeometry(0.28, 24, 18);
  const heroOrbitBeads = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const bead = new THREE.Mesh(satOrbGeo, i % 2 === 0 ? mintBubbleMat : skyBubbleMat);
    bead.position.set(Math.cos(ang) * 2.82, Math.sin(ang * 2) * 0.48, Math.sin(ang) * 2.82);
    bead.scale.setScalar(0.75 + (i % 3) * 0.28);
    bead.renderOrder = 8;
    heroOrbitBeads.add(bead);
  }
  heroOrbGroup.add(heroOrbitBeads);
  geometries.push(heroSphereGeo, innerRingGeo, outerRingGeo, satOrbGeo);
  scene.add(heroOrbGroup);

  // Dreamy field of 42 floating iridescent soap bubbles across all 5 chapters
  const bubbleGeo = new THREE.SphereGeometry(1.0, 28, 22);
  geometries.push(bubbleGeo);
  const floatingBubbles: FloatingBubbleRig[] = [];

  const curatedBubbleSpots: [number, number, number, number][] = [
    [-4.6, 5.4, 4.8, 0.78],
    [-2.8, 6.8, 2.2, 0.42],
    [4.4, 6.1, 3.6, 0.92],
    [5.6, 4.2, 5.5, 0.48],
    [-5.8, 3.6, 1.5, 0.62],
    [2.9, 2.6, 4.4, 0.36],
    [-1.9, 2.8, 6.2, 0.30],
    [3.8, 7.6, -1.8, 0.64],
    [-4.2, 7.8, -3.5, 0.85],
    [8.2, 5.4, -1.4, 1.15],
    [4.8, 4.0, -5.8, 0.82],
    [1.6, 6.6, -6.5, 0.70],
    [-2.6, 5.2, -8.5, 1.05],
    [6.4, 7.2, -8.2, 0.54],
    [-4.2, 3.4, -14.5, 0.88],
    [4.6, 4.1, -15.2, 0.96],
    [0.8, 5.6, -17.8, 0.72],
    [-5.8, 5.8, -21.0, 1.10],
    [-12.5, 10.2, -28.0, 1.05],
    [-7.2, 12.4, -31.5, 0.82],
    [-15.8, 8.6, -33.0, 0.68],
    [14.2, 15.6, -34.5, 1.24],
    [9.4, 17.8, -37.0, 0.86],
    [19.5, 13.8, -38.5, 0.94],
  ];

  const placedBubbles: [number, number, number, number][] = [
    [0.5, 4.65, 0.4, 3.2],       // Reserve space around Hero Crystal Orb
    [0.0, 3.45, -24.0, 2.2],     // Reserve space around Lagoon Pavilion Orb
    [18.5, 14.5, -45.0, 5.8],    // Reserve space around Floating Terrarium Orb
  ];

  const overlapsExisting = (bx: number, by: number, bz: number, sc: number) => {
    for (let k = 0; k < placedBubbles.length; k++) {
      const [ox, oy, oz, or] = placedBubbles[k];
      const dx = bx - ox;
      const dy = by - oy;
      const dz = bz - oz;
      const minDist = sc + or + 0.65;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) return true;
    }
    return false;
  };

  for (let i = 0; i < 46 && floatingBubbles.length < 36; i++) {
    let bx: number;
    let by: number;
    let bz: number;
    let sc: number;
    if (i < curatedBubbleSpots.length) {
      [bx, by, bz, sc] = curatedBubbleSpots[i];
    } else {
      bx = (hashA(i * 3.7 + 1) - 0.5) * 44;
      by = 2.8 + hashA(i * 5.1 + 2) * 14.5;
      bz = 6.0 - hashA(i * 7.3 + 3) * 52.0;
      sc = 0.24 + hashA(i * 9.7 + 4) * 0.68;
    }

    if (overlapsExisting(bx, by, bz, sc)) continue;
    placedBubbles.push([bx, by, bz, sc]);

    const mat = i % 3 === 0 ? heroBubbleMat : i % 3 === 1 ? mintBubbleMat : skyBubbleMat;
    const mesh = new THREE.Mesh(bubbleGeo, mat);
    mesh.position.set(bx, by, bz);
    mesh.scale.setScalar(sc);
    mesh.renderOrder = 7;
    scene.add(mesh);

    floatingBubbles.push({
      mesh,
      basePos: new THREE.Vector3(bx, by, bz),
      bobAmp: 0.20 + hashA(i * 11.3) * 0.28,
      bobSpeed: 0.36 + hashA(i * 13.1) * 0.36,
      driftSpeed: 0.16 + hashA(i * 17.7) * 0.24,
      phase: hashA(i * 19.3) * Math.PI * 2,
      baseScale: sc,
    });
  }

  // ===========================================================================
  // 5. WINDOWS VISTA / PS3 XMB SWEEPING TRANSLUCENT SILK AURORA RIBBONS
  // ===========================================================================
  const ribbonMats: THREE.ShaderMaterial[] = [];

  function createAuroraRibbon(optsR: {
    points: [number, number, number][];
    width: number;
    colorA: string;
    colorB: string;
    phase: number;
    opacity: number;
  }) {
    const curve = new THREE.CatmullRomCurve3(
      optsR.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    );
    const segs = 96;
    const widthSegs = 6;
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const binorm = new THREE.Vector3().crossVectors(side, tan).normalize();
      const tiltAngle = Math.sin(t * Math.PI * 2.0 + optsR.phase) * 0.52;

      for (let j = 0; j <= widthSegs; j++) {
        const v = j / widthSegs;
        const offset = (v - 0.5) * optsR.width;
        const px = pt.x + (side.x * Math.cos(tiltAngle) + binorm.x * Math.sin(tiltAngle)) * offset;
        const py = pt.y + (side.y * Math.cos(tiltAngle) + binorm.y * Math.sin(tiltAngle)) * offset;
        const pz = pt.z + (side.z * Math.cos(tiltAngle) + binorm.z * Math.sin(tiltAngle)) * offset;
        verts.push(px, py, pz);
        uvs.push(t, v);
      }
    }

    const row = widthSegs + 1;
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < widthSegs; j++) {
        const a = i * row + j;
        const b = (i + 1) * row + j;
        const c = (i + 1) * row + (j + 1);
        const d = i * row + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = createAeroAuroraRibbonShaderMaterial(optsR.colorA, optsR.colorB, optsR.phase);
    mat.uniforms.uOpacity.value = optsR.opacity;
    geometries.push(geo);
    materials.push(mat);
    ribbonMats.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 4;
    scene.add(mesh);
  }

  createAuroraRibbon({
    points: [
      [-34, 9.8, -14],
      [-14, 12.6, -16],
      [2, 10.4, -19],
      [18, 13.8, -24],
      [38, 11.4, -32],
    ],
    width: 5.4,
    colorA: '#06e8ff',
    colorB: '#34f57b',
    phase: 0.4,
    opacity: 0.44,
  });

  createAuroraRibbon({
    points: [
      [-28, 15.4, -28],
      [-6, 17.8, -33],
      [12, 15.6, -39],
      [28, 19.4, -46],
      [44, 16.2, -54],
    ],
    width: 6.2,
    colorA: '#38bdf8',
    colorB: '#a3f73a',
    phase: 2.1,
    opacity: 0.38,
  });

  createAuroraRibbon({
    points: [
      [-24, 6.4, -26],
      [-12, 9.0, -32],
      [0, 6.6, -36],
      [14, 9.8, -40],
      [26, 7.4, -45],
    ],
    width: 3.8,
    colorA: '#7ce8ff',
    colorB: '#2dd4bf',
    phase: 3.9,
    opacity: 0.34,
  });

  // ===========================================================================
  // 6. CHAPTER 03: CURVED WHITE-GLASS AERO LAGOON PAVILION & FOUNTAIN ARCS
  // ===========================================================================
  const pavilionGroup = new THREE.Group();
  pavilionGroup.position.set(0.0, 0.05, -24.0);

  const deckBaseGeo = new THREE.CylinderGeometry(5.6, 4.9, 0.48, 40);
  const deckBase = new THREE.Mesh(deckBaseGeo, glossyWhiteMat);
  deckBase.position.y = 0.45;
  pavilionGroup.add(deckBase);

  const deckGlassGeo = new THREE.CylinderGeometry(3.8, 3.8, 0.46, 36);
  const deckGlass = new THREE.Mesh(deckGlassGeo, aquaGlassMat);
  deckGlass.position.y = 0.52;
  deckGlass.renderOrder = 3;
  pavilionGroup.add(deckGlass);

  const trimRingGeo = new THREE.TorusGeometry(5.55, 0.12, 14, 64);
  const trimRing = new THREE.Mesh(trimRingGeo, aeroChromeMat);
  trimRing.rotation.x = Math.PI / 2;
  trimRing.position.y = 0.72;
  pavilionGroup.add(trimRing);

  const archGeo = new THREE.TorusGeometry(5.2, 0.22, 16, 56, Math.PI);
  const archA = new THREE.Mesh(archGeo, glossyWhiteMat);
  archA.position.y = 0.65;
  archA.rotation.y = 0.35;
  const archB = new THREE.Mesh(archGeo, glossyWhiteMat);
  archB.position.y = 0.65;
  archB.rotation.y = -0.35;
  pavilionGroup.add(archA, archB);

  const pavOrbGeo = new THREE.SphereGeometry(1.18, 32, 24);
  const pavOrb = new THREE.Mesh(pavOrbGeo, mintBubbleMat);
  pavOrb.position.set(0, 3.4, 0);
  pavOrb.renderOrder = 8;
  pavilionGroup.add(pavOrb);

  const rippleTex = createWaterRippleTexture();
  textures.push(rippleTex);
  const rippleGeo = new THREE.PlaneGeometry(17.5, 17.5);
  const rippleMat = new THREE.MeshBasicMaterial({
    map: rippleTex,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
  rippleMesh.rotation.x = -Math.PI / 2;
  rippleMesh.position.y = 0.19;
  rippleMesh.renderOrder = 3;
  pavilionGroup.add(rippleMesh);

  geometries.push(deckBaseGeo, deckGlassGeo, trimRingGeo, archGeo, pavOrbGeo, rippleGeo);
  materials.push(rippleMat);
  scene.add(pavilionGroup);

  // ===========================================================================
  // 7. CHAPTER 04: ECO-FUTURIST WHITE & AQUA GLASS UTOPIA SKYLINE + WIND TURBINES
  // ===========================================================================
  const ecoTowerTex = createAeroEcoTowerTextures(maxAniso);
  textures.push(ecoTowerTex.map, ecoTowerTex.roughnessMap);

  const ecoCurtainMat = new THREE.MeshPhysicalMaterial({
    map: ecoTowerTex.map,
    roughnessMap: ecoTowerTex.roughnessMap,
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
    envMapIntensity: 0.75,
  });
  materials.push(ecoCurtainMat);

  const spireDomeGeo = new THREE.SphereGeometry(1.0, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const terraceRingGeo = new THREE.TorusGeometry(1.0, 0.16, 12, 32);
  const foliageRingGeo = new THREE.TorusGeometry(0.92, 0.14, 10, 28);
  const finSpineGeo = new THREE.BoxGeometry(0.24, 1.0, 0.55);
  const spireRodGeo = new THREE.CylinderGeometry(0.05, 0.14, 4.4, 12);
  geometries.push(spireDomeGeo, terraceRingGeo, foliageRingGeo, finSpineGeo, spireRodGeo);

  function createEcoUtopiaTower(x: number, z: number, radius: number, height: number) {
    const groundY = meadowHeightAt(x, z) - 0.8;
    const tower = new THREE.Group();
    tower.position.set(x, groundY, z);

    const coreGeo = new THREE.CylinderGeometry(radius * 0.72, radius, height, 28, 1);
    geometries.push(coreGeo);
    const core = new THREE.Mesh(coreGeo, ecoCurtainMat);
    core.position.y = height * 0.5;
    tower.add(core);

    for (let r = 0; r < 3; r++) {
      const ang = (r / 3) * Math.PI * 2 + 0.4;
      const rib = new THREE.Mesh(finSpineGeo, glossyWhiteMat);
      rib.scale.set(1, height * 0.96, 1);
      rib.position.set(Math.cos(ang) * radius * 0.88, height * 0.49, Math.sin(ang) * radius * 0.88);
      rib.rotation.y = -ang;
      tower.add(rib);
    }

    const tiers = height > 14 ? 3 : 2;
    for (let t = 1; t <= tiers; t++) {
      const frac = t / (tiers + 0.35);
      const tierY = height * frac;
      const tierR = THREE.MathUtils.lerp(radius, radius * 0.72, frac) * 1.08;

      const slab = new THREE.Mesh(terraceRingGeo, glossyWhiteMat);
      slab.scale.set(tierR, tierR, 1);
      slab.rotation.x = Math.PI / 2;
      slab.position.y = tierY;
      tower.add(slab);

      const garden = new THREE.Mesh(foliageRingGeo, lushFoliageMat);
      garden.scale.set(tierR * 1.04, tierR * 1.04, 1);
      garden.rotation.x = Math.PI / 2;
      garden.position.y = tierY + 0.16;
      tower.add(garden);
    }

    const dome = new THREE.Mesh(spireDomeGeo, aquaGlassMat);
    dome.scale.setScalar(radius * 0.72);
    dome.position.y = height;
    tower.add(dome);

    const rod = new THREE.Mesh(spireRodGeo, aeroChromeMat);
    rod.position.y = height + radius * 0.55 + 1.8;
    tower.add(rod);

    scene.add(tower);
  }

  const ecoCitySpecs: [number, number, number, number][] = [
    [-21.0, -44.0, 2.6, 19.5],
    [-14.5, -47.5, 2.2, 16.0],
    [-27.5, -41.0, 2.1, 14.5],
    [-18.0, -37.5, 1.8, 12.2],
    [-25.0, -50.0, 2.8, 22.0],
    [-9.5, -51.0, 2.0, 14.2],
    [24.5, -44.0, 2.1, 15.8],
    [30.5, -40.0, 1.8, 12.4],
  ];
  for (const [tx, tz, tr, th] of ecoCitySpecs) {
    createEcoUtopiaTower(tx, tz, tr, th);
  }

  // Sleek Animated 6-Part White Eco Wind Turbines perched strictly on elevated emerald hills
  const turbineRotors: THREE.Group[] = [];
  const plinthGeo = new THREE.CylinderGeometry(0.52, 0.72, 0.8, 16);
  const mastGeo = new THREE.CylinderGeometry(0.11, 0.24, 7.6, 14);
  const nacelleGeo = new THREE.CapsuleGeometry(0.24, 0.72, 8, 14);
  nacelleGeo.rotateX(Math.PI / 2);
  const hubConeGeo = new THREE.ConeGeometry(0.22, 0.45, 14);
  hubConeGeo.rotateX(Math.PI / 2);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.quadraticCurveTo(0.24, 0.65, 0.12, 2.95);
  bladeShape.lineTo(-0.04, 2.95);
  bladeShape.quadraticCurveTo(-0.08, 0.9, -0.05, 0);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geometries.push(plinthGeo, mastGeo, nacelleGeo, hubConeGeo, bladeGeo);

  function createWindTurbine(x: number, z: number, scale = 1.0, yaw = 0.25) {
    const gy = meadowHeightAt(x, z);
    // Guarantee turbine sits strictly on solid dry meadow hilltop
    const safeY = Math.max(gy, 0.85) - 0.25;
    const grp = new THREE.Group();
    grp.position.set(x, safeY, z);
    grp.rotation.y = yaw;
    grp.scale.setScalar(scale);

    // 1. Anchored white Aero plinth
    const plinth = new THREE.Mesh(plinthGeo, aeroChromeMat);
    plinth.position.y = 0.25;
    grp.add(plinth);

    // 2. Tapered glossy white mast
    const mast = new THREE.Mesh(mastGeo, glossyWhiteMat);
    mast.position.y = 3.9;
    grp.add(mast);

    // 3. Aerodynamic nacelle
    const nacelle = new THREE.Mesh(nacelleGeo, glossyWhiteMat);
    nacelle.position.set(0, 7.75, -0.1);
    grp.add(nacelle);

    // 4-6. Rotating rotor hub + nose cone + 3 aerodynamic blades
    const rotor = new THREE.Group();
    rotor.position.set(0, 7.75, 0.45);
    const nose = new THREE.Mesh(hubConeGeo, aeroChromeMat);
    nose.position.z = 0.16;
    rotor.add(nose);

    for (let b = 0; b < 3; b++) {
      const bHolder = new THREE.Group();
      bHolder.rotation.z = (b / 3) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, glossyWhiteMat);
      blade.rotation.y = 0.16;
      bHolder.add(blade);
      rotor.add(bHolder);
    }
    grp.add(rotor);
    scene.add(grp);
    turbineRotors.push(rotor);
  }

  // Placed strictly on elevated sunlit ridges well above the turquoise lagoon
  createWindTurbine(-20.5, -18.5, 0.96, 0.35);
  createWindTurbine(-26.0, -28.0, 1.12, 0.22);
  createWindTurbine(19.5, -18.0, 1.02, -0.32);
  createWindTurbine(24.5, -29.0, 1.18, -0.20);
  createWindTurbine(-12.5, -39.5, 1.15, 0.15);

  // Stylized Frutiger Aero Multi-Canopy Eco-Trees grounded cleanly on dry meadow hills
  const treeCount = 36;
  const trunkGeo = new THREE.CylinderGeometry(0.10, 0.18, 1.35, 8);
  const canopyBotGeo = new THREE.DodecahedronGeometry(0.78, 1);
  const canopyTopGeo = new THREE.DodecahedronGeometry(0.56, 1);
  geometries.push(trunkGeo, canopyBotGeo, canopyTopGeo);

  const trunkInst = new THREE.InstancedMesh(trunkGeo, treeTrunkMat, treeCount);
  const canopyBotInst = new THREE.InstancedMesh(canopyBotGeo, lushFoliageMat, treeCount);
  const canopyTopInst = new THREE.InstancedMesh(canopyTopGeo, lushFoliageMat, treeCount);

  let tIdx = 0;
  for (let i = 0; i < 140 && tIdx < treeCount; i++) {
    const sx = (hashA(i * 4.3 + 7) - 0.5) * 76;
    const sz = -6.0 - hashA(i * 6.7 + 11) * 48;
    const sy = meadowHeightAt(sx, sz);
    if (sy < 0.85) continue; // Strictly on dry elevated green hills
    const sc = 0.72 + hashA(i * 8.1 + 3) * 0.88;
    const yaw = hashA(i * 2.9) * Math.PI * 2;

    // Trunk grounded at sy
    _dummy.position.set(sx, sy + sc * 0.55, sz);
    _dummy.scale.set(sc, sc, sc);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.updateMatrix();
    trunkInst.setMatrixAt(tIdx, _dummy.matrix);

    // Lower billowing foliage crown
    _dummy.position.set(sx, sy + sc * 1.48, sz);
    _dummy.scale.set(sc * 1.15, sc * 0.92, sc * 1.12);
    _dummy.rotation.set(0.1, yaw, 0.08);
    _dummy.updateMatrix();
    canopyBotInst.setMatrixAt(tIdx, _dummy.matrix);

    // Upper sunlit lime crown puff
    _dummy.position.set(sx + sc * 0.14, sy + sc * 2.1, sz - sc * 0.08);
    _dummy.scale.set(sc * 0.92, sc * 0.84, sc * 0.92);
    _dummy.rotation.set(-0.08, yaw + 1.1, 0.06);
    _dummy.updateMatrix();
    canopyTopInst.setMatrixAt(tIdx, _dummy.matrix);

    const tint = hashA(i * 9.3);
    _tmpColor.set('#16a34a').lerp(new THREE.Color('#4ade38'), tint * 0.65);
    canopyBotInst.setColorAt(tIdx, _tmpColor);
    _tmpColor.set('#22c55e').lerp(new THREE.Color('#a3e635'), 0.4 + tint * 0.5);
    canopyTopInst.setColorAt(tIdx, _tmpColor);
    tIdx++;
  }
  trunkInst.count = tIdx;
  canopyBotInst.count = tIdx;
  canopyTopInst.count = tIdx;
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyBotInst.instanceMatrix.needsUpdate = true;
  canopyTopInst.instanceMatrix.needsUpdate = true;
  if (canopyBotInst.instanceColor) canopyBotInst.instanceColor.needsUpdate = true;
  if (canopyTopInst.instanceColor) canopyTopInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyBotInst.computeBoundingSphere();
  canopyTopInst.computeBoundingSphere();
  scene.add(trunkInst, canopyBotInst, canopyTopInst);

  // ===========================================================================
  // 8. CHAPTER 05: FLOATING CRYSTAL SKY-ISLAND TERRARIUM ORB
  // ===========================================================================
  const terrariumGroup = new THREE.Group();
  terrariumGroup.position.set(18.5, 14.5, -45.0);

  const terOrbGeo = new THREE.SphereGeometry(4.6, 40, 32);
  const terOrb = new THREE.Mesh(terOrbGeo, heroBubbleMat);
  terOrb.renderOrder = 8;
  terrariumGroup.add(terOrb);

  const islandGrassMat = new THREE.MeshStandardMaterial({
    map: meadowTex.map,
    roughnessMap: meadowTex.roughnessMap,
    bumpMap: meadowTex.bumpMap,
    bumpScale: 0.05,
    color: '#28c758',
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.25,
  });
  materials.push(islandGrassMat);

  const islandTopGeo = new THREE.SphereGeometry(3.15, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.46);
  const islandTop = new THREE.Mesh(islandTopGeo, islandGrassMat);
  islandTop.scale.set(1.0, 0.50, 1.0);
  islandTop.position.y = -0.82;
  terrariumGroup.add(islandTop);

  const islandKeelGeo = new THREE.ConeGeometry(3.12, 2.35, 28);
  islandKeelGeo.rotateX(Math.PI);
  const islandKeel = new THREE.Mesh(islandKeelGeo, glossyWhiteMat);
  islandKeel.position.y = -1.78;
  terrariumGroup.add(islandKeel);

  const miniSpireGeo = new THREE.ConeGeometry(0.65, 2.4, 16);
  const miniSpire = new THREE.Mesh(miniSpireGeo, aquaGlassMat);
  miniSpire.position.set(0, 1.45, 0);
  miniSpire.renderOrder = 7;
  terrariumGroup.add(miniSpire);

  const terRingGeo = new THREE.TorusGeometry(5.5, 0.11, 14, 80);
  const terRing = new THREE.Mesh(terRingGeo, aeroChromeMat);
  terRing.rotation.set(1.25, 0.4, -0.22);
  terrariumGroup.add(terRing);

  geometries.push(terOrbGeo, islandTopGeo, islandKeelGeo, miniSpireGeo, terRingGeo);
  scene.add(terrariumGroup);

  // ===========================================================================
  // 9. BILLOWING SUNLIT CUMULUS CLOUDS, GOD RAYS & DREAMY BOKEH SPARKLES
  // ===========================================================================
  const cloudTex = createAeroCloudTexture();
  textures.push(cloudTex);
  const cloudMat = new THREE.SpriteMaterial({
    map: cloudTex,
    color: '#ffffff',
    transparent: true,
    opacity: THREE.MathUtils.lerp(0.86, 0.34, initDark),
    depthWrite: false,
  });
  materials.push(cloudMat);

  const cloudSprites: { sprite: THREE.Sprite; baseX: number; speed: number }[] = [];
  const cloudSpots: [number, number, number, number][] = [
    [-26, 20, -42, 26],
    [-8, 24, -56, 32],
    [16, 21, -46, 28],
    [34, 19, -38, 25],
    [-38, 16, -24, 22],
    [28, 25, -62, 34],
    [2, 18, -68, 36],
    [-22, 27, -64, 30],
    [12, 16, -24, 18],
    [-14, 15, -20, 16],
  ];
  for (let i = 0; i < cloudSpots.length; i++) {
    const [cx, cy, cz, sc] = cloudSpots[i];
    const sp = new THREE.Sprite(cloudMat);
    sp.position.set(cx, cy, cz);
    sp.scale.set(sc * 1.45, sc * 0.85, 1);
    sp.renderOrder = 1;
    scene.add(sp);
    cloudSprites.push({
      sprite: sp,
      baseX: cx,
      speed: 0.18 + hashA(i * 5.9) * 0.22,
    });
  }

  const beamGeo = new THREE.PlaneGeometry(14.0, 42.0);
  const beamMat = createAeroSunbeamShaderMaterial();
  geometries.push(beamGeo);
  materials.push(beamMat);

  const beamConfigs: [number, number, number, number][] = [
    [10, 14, -14, -0.38],
    [-4, 15, -26, -0.34],
    [18, 18, -36, -0.40],
  ];
  for (const [bx, by, bz, rz] of beamConfigs) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(bx, by, bz);
    beam.rotation.set(0.08, 0.22, rz);
    beam.renderOrder = 5;
    scene.add(beam);
  }

  const bokehCount = 260;
  const bokehPos = new Float32Array(bokehCount * 3);
  const bokehScales = new Float32Array(bokehCount);
  const bokehPhases = new Float32Array(bokehCount);
  const bokehColors = new Float32Array(bokehCount * 3);
  const bokehPalette = [
    new THREE.Color('#7ce8ff'),
    new THREE.Color('#5efce8'),
    new THREE.Color('#a3f754'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#fef08a'),
  ];

  for (let i = 0; i < bokehCount; i++) {
    bokehPos[i * 3] = (hashA(i * 2.1 + 1) - 0.5) * 62;
    bokehPos[i * 3 + 1] = 1.0 + hashA(i * 3.7 + 2) * 22.0;
    bokehPos[i * 3 + 2] = 12.0 - hashA(i * 5.3 + 3) * 66.0;
    bokehScales[i] = 0.55 + hashA(i * 7.9 + 4) * 1.45;
    bokehPhases[i] = hashA(i * 9.1 + 5);

    const col = bokehPalette[i % bokehPalette.length];
    bokehColors[i * 3] = col.r;
    bokehColors[i * 3 + 1] = col.g;
    bokehColors[i * 3 + 2] = col.b;
  }

  const bokehGeo = new THREE.BufferGeometry();
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPos, 3));
  bokehGeo.setAttribute('aScale', new THREE.BufferAttribute(bokehScales, 1));
  bokehGeo.setAttribute('aPhase', new THREE.BufferAttribute(bokehPhases, 1));
  bokehGeo.setAttribute('aColor', new THREE.BufferAttribute(bokehColors, 3));

  const bokehMat = createAeroBokehParticleShaderMaterial(pixelRatio);
  geometries.push(bokehGeo);
  materials.push(bokehMat);
  const bokehPoints = new THREE.Points(bokehGeo, bokehMat);
  bokehPoints.renderOrder = 6;
  scene.add(bokehPoints);

  // ===========================================================================
  // 10. SPLINES & FRAME UPDATE CONTROLLER
  // ===========================================================================
  const camSpline = new THREE.CatmullRomCurve3(AERO_CAM_WAYPOINTS, false, 'catmullrom', 0.48);
  const lookSpline = new THREE.CatmullRomCurve3(AERO_LOOK_WAYPOINTS, false, 'catmullrom', 0.48);

  let smoothDarkFactor = initDark;

  return {
    camSpline,
    lookSpline,
    setPixelRatio(pr: number) {
      bokehMat.uniforms.uPixelRatio.value = pr;
    },
    update({ delta, shaderTime, prefersReducedMotion, isDark, isWorkspaceFocused }) {
      const targetDark = isDark ? 1.0 : 0.0;
      smoothDarkFactor = THREE.MathUtils.damp(smoothDarkFactor, targetDark, 7.5, delta);

      // Sync sky, water, meadow, fog & clouds crisply with Light/Dark theme
      skyMat.uniforms.uTime.value = shaderTime;
      skyMat.uniforms.uDarkFactor.value = smoothDarkFactor;

      waterMat.uniforms.uTime.value = shaderTime;
      waterMat.uniforms.uDarkFactor.value = smoothDarkFactor;

      fog.color.copy(_dayFogColor).lerp(_darkFogColor, smoothDarkFactor);
      if (scene.background instanceof THREE.Color) {
        scene.background.copy(_dayBgColor).lerp(_darkBgColor, smoothDarkFactor);
      }

      terrainMat.color.copy(_dayMeadowTint).lerp(_darkMeadowTint, smoothDarkFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(0.88, 0.42, smoothDarkFactor);
      sunKeyLight.intensity = THREE.MathUtils.lerp(1.85, 0.95, smoothDarkFactor);
      cloudMat.opacity = THREE.MathUtils.lerp(0.86, 0.32, smoothDarkFactor);
      cloudMat.color.setRGB(
        THREE.MathUtils.lerp(1.0, 0.48, smoothDarkFactor),
        THREE.MathUtils.lerp(1.0, 0.78, smoothDarkFactor),
        THREE.MathUtils.lerp(1.0, 0.92, smoothDarkFactor)
      );

      heroBubbleMat.uniforms.uTime.value = shaderTime;
      mintBubbleMat.uniforms.uTime.value = shaderTime * 0.92 + 1.4;
      skyBubbleMat.uniforms.uTime.value = shaderTime * 1.08 + 2.8;

      beamMat.uniforms.uTime.value = shaderTime;
      beamMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        beamMat.uniforms.uOpacity.value,
        isWorkspaceFocused ? 0.06 : THREE.MathUtils.lerp(0.15, 0.11, smoothDarkFactor),
        4.0,
        delta
      );

      bokehMat.uniforms.uTime.value = shaderTime;
      bokehMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        bokehMat.uniforms.uOpacity.value,
        isWorkspaceFocused ? 0.38 : 0.76,
        4.0,
        delta
      );

      for (let i = 0; i < ribbonMats.length; i++) {
        ribbonMats[i].uniforms.uTime.value = shaderTime;
      }

      if (!prefersReducedMotion) {
        heroOrbGroup.position.y = 4.65 + Math.sin(shaderTime * 0.65) * 0.24;
        innerRing.rotation.z = 0.22 + shaderTime * 0.22;
        outerRing.rotation.z = -0.18 - shaderTime * 0.16;
        heroOrbitBeads.rotation.y = shaderTime * 0.34;

        pavOrb.position.y = 3.4 + Math.sin(shaderTime * 0.85 + 1.1) * 0.22;
        rippleMesh.rotation.z = shaderTime * 0.12;

        terrariumGroup.position.y = 14.5 + Math.sin(shaderTime * 0.52 + 0.7) * 0.35;
        terrariumGroup.rotation.y = shaderTime * 0.10;
        terRing.rotation.z = -0.22 + shaderTime * 0.18;

        for (let i = 0; i < turbineRotors.length; i++) {
          turbineRotors[i].rotation.z -= delta * (0.85 + (i % 3) * 0.18);
        }

        for (let i = 0; i < floatingBubbles.length; i++) {
          const b = floatingBubbles[i];
          b.mesh.position.y =
            b.basePos.y + Math.sin(shaderTime * b.bobSpeed + b.phase) * b.bobAmp;
          b.mesh.position.x =
            b.basePos.x + Math.cos(shaderTime * b.driftSpeed + b.phase) * 0.26;
        }

        for (let i = 0; i < cloudSprites.length; i++) {
          const c = cloudSprites[i];
          c.sprite.position.x = c.baseX + Math.sin(shaderTime * 0.04 * c.speed + i) * 3.8;
        }

        for (let i = 0; i < fishRigs.length; i++) {
          const f = fishRigs[i];
          const t = shaderTime * f.speed + f.phase;
          const dt = 0.06;

          const x0 = f.center.x + Math.cos(t) * f.rx;
          const y0 = f.center.y + Math.sin(t * 1.45) * f.ry;
          const z0 = f.center.z + (f.figure8 ? Math.sin(t * 2.0) * 0.65 : Math.sin(t)) * f.rz;

          const tNext = t + (f.speed >= 0 ? dt : -dt);
          const x1 = f.center.x + Math.cos(tNext) * f.rx;
          const y1 = f.center.y + Math.sin(tNext * 1.45) * f.ry;
          const z1 = f.center.z + (f.figure8 ? Math.sin(tNext * 2.0) * 0.65 : Math.sin(tNext)) * f.rz;

          f.group.position.set(x0, y0, z0);

          const vx = x1 - x0;
          const vy = y1 - y0;
          const vz = z1 - z0;
          const yaw = Math.atan2(-vz, -vx);
          const horizLen = Math.sqrt(vx * vx + vz * vz) || 0.001;
          const pitch = Math.atan2(vy, horizLen);
          f.group.rotation.set(0, yaw, -pitch * 0.55);

          f.tailPivot.rotation.y = Math.sin(shaderTime * f.tailFreq + f.phase) * 0.42;
          f.leftFin.rotation.y = -0.55 + Math.sin(shaderTime * f.tailFreq * 1.1 + f.phase) * 0.24;
          f.rightFin.rotation.y = 0.55 - Math.sin(shaderTime * f.tailFreq * 1.1 + f.phase) * 0.24;
        }
      }
    },
  };
}
