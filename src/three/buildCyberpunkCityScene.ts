import * as THREE from 'three';
import {
  createBuildingFacadeTextures,
  createCyberBillboardTexture,
  createNeonPoolTexture,
  createWetAsphaltTextures,
} from './cyberpunkTextures';
import {
  createCyberSkyDomeShaderMaterial,
  createHologramAdShaderMaterial,
  createRainStreakShaderMaterial,
  createSearchlightConeShaderMaterial,
  createSteamVentShaderMaterial,
} from './cyberpunkShaders';

export interface CityController {
  camSpline: THREE.CatmullRomCurve3;
  lookSpline: THREE.CatmullRomCurve3;
  update: (params: {
    elapsed: number;
    delta: number;
    shaderTime: number;
    prefersReducedMotion: boolean;
    seedHex: string;
    isDark: boolean;
    connectedCount: number;
    isWorkspaceFocused: boolean;
    camera: THREE.PerspectiveCamera;
  }) => void;
  setPixelRatio: (pr: number) => void;
}

const CYBER_CAM_WAYPOINTS = [
  new THREE.Vector3(-1.4, 13.8, 25.0),   // 01: Skyline Overlook & Megacorp Plaza
  new THREE.Vector3(1.2, 3.8, 3.5),      // 02: Kabuki / Kowloon Neon Rain Alley
  new THREE.Vector3(2.2, 16.5, -18.0),   // 03: Elevated Expressway & Holo-Transit Hub
  new THREE.Vector3(-2.0, 23.0, -32.0),  // 04: Twin Corporate Spires & Skybridge
  new THREE.Vector3(-15.5, 13.5, -24.0), // 05: Crimson Industrial Harbor Horizon
];

const CYBER_LOOK_WAYPOINTS = [
  new THREE.Vector3(0.4, 11.4, -18.0),
  new THREE.Vector3(-0.6, 5.8, -22.0),
  new THREE.Vector3(-1.0, 14.2, -48.0),
  new THREE.Vector3(0.0, 22.8, -56.0),
  new THREE.Vector3(-34.0, 10.5, -42.0),
];

function hashC(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

const _carDummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export function buildCyberpunkCityScene(opts: {
  scene: THREE.Scene;
  fog: THREE.FogExp2;
  maxAniso: number;
  pixelRatio: number;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}): CityController {
  const { scene, fog, maxAniso, pixelRatio, geometries, materials, textures } = opts;

  scene.background = new THREE.Color('#040711');
  fog.color.set('#050916');
  fog.density = 0.0086;

  // ===========================================================================
  // 1. URBAN LIGHT-POLLUTION SKY DOME & RAINY NOCTURNAL LIGHTING
  // ===========================================================================
  const skyGeo = new THREE.SphereGeometry(260, 48, 32);
  const skyMat = createCyberSkyDomeShaderMaterial();
  geometries.push(skyGeo);
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -5;
  scene.add(skyDome);

  const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e0b2b', 0.42);
  scene.add(hemiLight);

  const moonKeyLight = new THREE.DirectionalLight('#93c5fd', 0.85);
  moonKeyLight.position.set(-22, 38, 18);
  scene.add(moonKeyLight);

  const cyanStreetGlow = new THREE.PointLight('#22d3ee', 28, 38, 1.4);
  cyanStreetGlow.position.set(2.5, 5.5, -8.0);
  scene.add(cyanStreetGlow);

  const magentaStreetGlow = new THREE.PointLight('#ec4899', 24, 34, 1.4);
  magentaStreetGlow.position.set(-3.2, 6.2, -16.0);
  scene.add(magentaStreetGlow);

  const crimsonHarborGlow = new THREE.PointLight('#f43f5e', 30, 45, 1.35);
  crimsonHarborGlow.position.set(-28.0, 12.0, -38.0);
  scene.add(crimsonHarborGlow);

  // ===========================================================================
  // 2. RAIN-SLICKED WET ASPHALT GROUND, BOULEVARD & ELEVATED INFRASTRUCTURE
  // ===========================================================================
  const asphaltTex = createWetAsphaltTextures(maxAniso);
  textures.push(asphaltTex.map, asphaltTex.roughnessMap, asphaltTex.bumpMap);

  const roadGeo = new THREE.PlaneGeometry(240, 240);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex.map,
    roughnessMap: asphaltTex.roughnessMap,
    bumpMap: asphaltTex.bumpMap,
    bumpScale: 0.03,
    roughness: 0.72,
    metalness: 0.18,
    envMapIntensity: 0.85,
  });
  geometries.push(roadGeo);
  materials.push(roadMat);

  const roadFloor = new THREE.Mesh(roadGeo, roadMat);
  roadFloor.rotation.x = -Math.PI / 2;
  roadFloor.position.set(0, 0, -30);
  scene.add(roadFloor);

  // Concrete structural material for sidewalks, viaducts, and bridge pylons
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#111622',
    roughness: 0.86,
    metalness: 0.16,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.42,
    metalness: 0.82,
  });
  materials.push(concreteMat, darkMetalMat);

  // Canyon Sidewalk Curbs along x = +-7.4 & Wet Neon Puddle Reflection Pools
  const curbGeo = new THREE.BoxGeometry(2.8, 0.35, 150);
  geometries.push(curbGeo);
  const curbL = new THREE.Mesh(curbGeo, concreteMat);
  curbL.position.set(-7.6, 0.17, -25);
  const curbR = new THREE.Mesh(curbGeo, concreteMat);
  curbR.position.set(7.6, 0.17, -25);
  scene.add(curbL, curbR);

  // Additive wet-puddle specular neon reflection pools on the boulevard asphalt
  const neonPoolTex = createNeonPoolTexture();
  textures.push(neonPoolTex);
  const puddleGeo = new THREE.PlaneGeometry(7.4, 7.4);
  geometries.push(puddleGeo);
  const puddleMatCyan = new THREE.MeshBasicMaterial({
    map: neonPoolTex,
    color: '#22d3ee',
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const puddleMatMagenta = new THREE.MeshBasicMaterial({
    map: neonPoolTex,
    color: '#ec4899',
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const puddleMatAmber = new THREE.MeshBasicMaterial({
    map: neonPoolTex,
    color: '#f59e0b',
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(puddleMatCyan, puddleMatMagenta, puddleMatAmber);

  [
    [-3.2, -3.5, 1.4, 2.2, puddleMatMagenta],
    [3.0, -7.0, 1.5, 2.5, puddleMatCyan],
    [-2.4, -14.0, 1.6, 2.8, puddleMatAmber],
    [2.8, -19.5, 1.4, 2.4, puddleMatMagenta],
    [-1.8, -28.0, 1.8, 3.0, puddleMatCyan],
    [1.6, -38.0, 1.7, 2.8, puddleMatAmber],
  ].forEach(([px, pz, sx, sz, mat]) => {
    const p = new THREE.Mesh(puddleGeo, mat as THREE.Material);
    p.rotation.x = -Math.PI / 2;
    p.position.set(px as number, 0.05, pz as number);
    p.scale.set(sx as number, sz as number, 1);
    p.renderOrder = 1;
    scene.add(p);
  });

  // Elevated Expressway Viaducts crossing the canyon (Chongqing / Night City tiers)
  const viaductGeo = new THREE.BoxGeometry(110, 1.35, 5.8);
  const pylonGeo = new THREE.BoxGeometry(1.4, 14.0, 2.2);
  const railEdgeGeo = new THREE.BoxGeometry(110, 0.14, 0.16);
  const neonEdgeCyanMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  const neonEdgeAmberMat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
  const neonEdgeMagentaMat = new THREE.MeshBasicMaterial({ color: '#ec4899' });
  const neonEdgeRedMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
  geometries.push(viaductGeo, pylonGeo, railEdgeGeo);
  materials.push(neonEdgeCyanMat, neonEdgeAmberMat, neonEdgeMagentaMat, neonEdgeRedMat);

  const viaductHeights = [
    { z: -10.5, y: 7.4, stripMat: neonEdgeCyanMat },
    { z: -36.0, y: 12.6, stripMat: neonEdgeMagentaMat },
  ];
  viaductHeights.forEach((v) => {
    const deck = new THREE.Mesh(viaductGeo, concreteMat);
    deck.position.set(0, v.y, v.z);
    scene.add(deck);

    const stripF = new THREE.Mesh(railEdgeGeo, v.stripMat);
    stripF.position.set(0, v.y + 0.52, v.z + 2.92);
    const stripB = new THREE.Mesh(railEdgeGeo, neonEdgeAmberMat);
    stripB.position.set(0, v.y + 0.52, v.z - 2.92);
    scene.add(stripF, stripB);

    [-22, -7.2, 7.2, 22].forEach((px) => {
      const pylon = new THREE.Mesh(pylonGeo, concreteMat);
      pylon.position.set(px, v.y * 0.5 - 0.5, v.z);
      pylon.scale.y = v.y / 13.0;
      scene.add(pylon);
    });
  });

  // Elevated Monorail Beam & Animated Cyber-Train gliding along x = 6.2, y = 10.6
  const monorailBeamGeo = new THREE.BoxGeometry(1.1, 1.2, 160);
  geometries.push(monorailBeamGeo);
  const monorailBeam = new THREE.Mesh(monorailBeamGeo, darkMetalMat);
  monorailBeam.position.set(6.2, 10.6, -28);
  scene.add(monorailBeam);

  const trainGroup = new THREE.Group();
  trainGroup.position.set(6.2, 11.75, -20);
  const carBodyGeo = new THREE.BoxGeometry(1.55, 1.3, 6.2);
  const carStripeGeo = new THREE.BoxGeometry(1.62, 0.16, 5.8);
  geometries.push(carBodyGeo, carStripeGeo);
  for (let c = 0; c < 4; c++) {
    const car = new THREE.Mesh(carBodyGeo, darkMetalMat);
    car.position.z = c * 6.7;
    const stripe = new THREE.Mesh(carStripeGeo, neonEdgeCyanMat);
    stripe.position.set(0, 0.12, c * 6.7);
    trainGroup.add(car, stripe);
  }
  scene.add(trainGroup);

  // ===========================================================================
  // 3. ARCHITECTURAL SKYSCRAPERS, MEGABLOCKS & TWIN CORPORATE SPIRES
  // ===========================================================================
  const facadeSets = [
    createBuildingFacadeTextures(0, maxAniso),
    createBuildingFacadeTextures(1, maxAniso),
    createBuildingFacadeTextures(2, maxAniso),
  ];
  const facadeMats: THREE.MeshStandardMaterial[] = facadeSets.map((set, idx) => {
    textures.push(set.map, set.emissiveMap, set.roughnessMap);
    const mat = new THREE.MeshStandardMaterial({
      map: set.map,
      emissiveMap: set.emissiveMap,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: idx === 1 ? 1.35 : 1.15,
      roughnessMap: set.roughnessMap,
      roughness: 0.85,
      metalness: idx === 1 ? 0.65 : 0.25,
    });
    materials.push(mat);
    return mat;
  });

  const roofGeo = new THREE.BoxGeometry(1, 1, 1);
  const spireGeo = new THREE.CylinderGeometry(0.06, 0.14, 1, 8);
  const beaconGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const rooftopBeaconMat = new THREE.MeshBasicMaterial({ color: '#ff1e42' });
  geometries.push(roofGeo, spireGeo, beaconGeo);
  materials.push(rooftopBeaconMat);

  const rooftopBeacons: THREE.Mesh[] = [];

  function addSkyscraper(cfg: {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    style: 0 | 1 | 2;
    hasSpire?: boolean;
    stepped?: boolean;
    accentMat?: THREE.Material;
  }) {
    const baseGeo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
    geometries.push(baseGeo);
    const tower = new THREE.Mesh(baseGeo, facadeMats[cfg.style]);
    tower.position.set(cfg.x, cfg.h * 0.5, cfg.z);
    scene.add(tower);

    let topY = cfg.h;
    if (cfg.stepped) {
      const upperH = cfg.h * 0.34;
      const upperGeo = new THREE.BoxGeometry(cfg.w * 0.68, upperH, cfg.d * 0.68);
      geometries.push(upperGeo);
      const upper = new THREE.Mesh(upperGeo, facadeMats[cfg.style]);
      upper.position.set(cfg.x, cfg.h + upperH * 0.5 - 0.08, cfg.z);
      scene.add(upper);
      topY += upperH - 0.08;
    }

    // Rooftop HVAC penthouses & mechanical trim (separated vertically from crown cap)
    const hvac = new THREE.Mesh(roofGeo, darkMetalMat);
    hvac.scale.set(cfg.w * 0.42, 1.3, cfg.d * 0.42);
    hvac.position.set(cfg.x + cfg.w * 0.12, topY + 0.80, cfg.z);
    scene.add(hvac);

    // Architectural glowing crown rim
    if (cfg.accentMat) {
      const crown = new THREE.Mesh(roofGeo, cfg.accentMat);
      crown.scale.set(cfg.w * 0.74, 0.22, cfg.d * 0.74);
      crown.position.set(cfg.x, topY + 0.14, cfg.z);
      scene.add(crown);
    }

    if (cfg.hasSpire) {
      const spireH = 6.5 + hashC(cfg.x * 3.1 + cfg.z) * 7.0;
      const spire = new THREE.Mesh(spireGeo, darkMetalMat);
      spire.scale.y = spireH;
      spire.position.set(cfg.x, topY + spireH * 0.5, cfg.z);
      scene.add(spire);

      const beacon = new THREE.Mesh(beaconGeo, rooftopBeaconMat);
      beacon.position.set(cfg.x, topY + spireH + 0.1, cfg.z);
      scene.add(beacon);
      rooftopBeacons.push(beacon);
    }
  }

  // Twin Braced Corporate Arasaka-Style Spires framing Chapter 04 (with Skybridge)
  addSkyscraper({ x: -10.5, z: -56, w: 7.4, d: 7.4, h: 46, style: 1, stepped: true, hasSpire: true, accentMat: neonEdgeCyanMat });
  addSkyscraper({ x: 10.5, z: -56, w: 7.4, d: 7.4, h: 46, style: 1, stepped: true, hasSpire: true, accentMat: neonEdgeMagentaMat });

  const skybridgeGeo = new THREE.BoxGeometry(16.0, 2.2, 3.2);
  const skybridgeTrimGeo = new THREE.BoxGeometry(16.0, 0.18, 3.35);
  geometries.push(skybridgeGeo, skybridgeTrimGeo);
  const skybridge = new THREE.Mesh(skybridgeGeo, facadeMats[1]);
  skybridge.position.set(0, 22.0, -56);
  const skybridgeTrim = new THREE.Mesh(skybridgeTrimGeo, neonEdgeCyanMat);
  skybridgeTrim.position.set(0, 20.78, -56);
  scene.add(skybridge, skybridgeTrim);

  // Flanking Megacity Canyon Buildings (widened canyon +-12m for dramatic depth & skyline vistas)
  const buildingCoords: Array<[number, number, number, number, number, 0 | 1 | 2, boolean]> = [
    // Left canyon wall
    [-12.2, 13, 6.8, 7.6, 28, 2, false],
    [-12.8, 1, 7.4, 8.2, 34, 0, true],
    [-12.2, -18, 7.0, 7.8, 39, 1, true],
    [-13.0, -30, 8.0, 8.4, 32, 0, false],
    // Right canyon wall
    [12.2, 14, 6.8, 7.6, 30, 1, true],
    [12.8, 2, 7.4, 8.0, 27, 2, false],
    [12.4, -16, 7.0, 7.6, 40, 0, true],
    [13.0, -28, 7.6, 8.4, 35, 1, false],
    [12.4, -42, 7.2, 7.8, 42, 2, true],
    // Second & third skyline rings
    [-21, 16, 9, 9, 34, 0, false],
    [-22, 0, 10, 10, 44, 1, true],
    [-24, -15, 9, 9, 36, 2, false],
    [22, 18, 9, 9, 39, 1, true],
    [23, 0, 10, 9, 42, 0, false],
    [22, -20, 10, 10, 48, 1, true],
    [23, -38, 9, 9, 37, 2, false],
    [24, -55, 11, 10, 52, 1, true],
    // Crimson Industrial Harbor Sector (Chapter 05 vista: x = -28..-52, z = -34..-68)
    [-34, -46, 11, 11, 32, 0, true],
    [-44, -34, 10, 9, 28, 2, false],
    [-42, -56, 12, 12, 42, 0, true],
    [-24, -64, 10, 10, 46, 1, true],
    // Distant horizon silhouette ring
    [-48, 10, 14, 14, 54, 1, false],
    [-46, -12, 13, 13, 48, 0, true],
    [42, 8, 14, 14, 56, 1, true],
    [44, -18, 15, 14, 62, 0, false],
    [38, -48, 14, 14, 58, 1, true],
    [-6, -82, 16, 14, 68, 1, true],
    [16, -84, 14, 14, 60, 0, false],
    [-32, -84, 15, 15, 55, 2, true],
  ];

  buildingCoords.forEach(([x, z, w, d, h, style, spire], idx) => {
    const accent =
      x < -26 ? neonEdgeRedMat : idx % 3 === 0 ? neonEdgeCyanMat : idx % 3 === 1 ? neonEdgeMagentaMat : neonEdgeAmberMat;
    addSkyscraper({
      x,
      z,
      w,
      d,
      h,
      style,
      hasSpire: spire,
      stepped: idx % 2 === 0,
      accentMat: accent,
    });
  });

  // ===========================================================================
  // 4. HANGING NEON SIGNBOARDS & GIANT TRANSLUCENT SKYSCRAPER HOLOGRAMS
  // ===========================================================================
  const billboardTextures = [
    createCyberBillboardTexture(0, maxAniso),
    createCyberBillboardTexture(1, maxAniso),
    createCyberBillboardTexture(2, maxAniso),
    createCyberBillboardTexture(3, maxAniso),
  ];
  billboardTextures.forEach((t) => textures.push(t));

  const holoMats = [
    createHologramAdShaderMaterial(billboardTextures[0], '#22d3ee'),
    createHologramAdShaderMaterial(billboardTextures[1], '#ec4899'),
    createHologramAdShaderMaterial(billboardTextures[2], '#f59e0b'),
    createHologramAdShaderMaterial(billboardTextures[3], '#2dd4bf'),
  ];
  holoMats.forEach((m) => materials.push(m));

  const neonBoardMats = billboardTextures.map((tex) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    materials.push(mat);
    return mat;
  });

  const signVertGeo = new THREE.PlaneGeometry(1.9, 4.4);
  const signHorizGeo = new THREE.PlaneGeometry(4.6, 2.2);
  const holoBigGeo = new THREE.PlaneGeometry(8.5, 16.0);
  const holoWideGeo = new THREE.PlaneGeometry(11.0, 5.5);
  geometries.push(signVertGeo, signHorizGeo, holoBigGeo, holoWideGeo);

  // Dense Kabuki/Shinjuku Overhanging Alley Signs
  const alleySigns: Array<{ pos: [number, number, number]; rotY: number; matIdx: number; horiz?: boolean }> = [
    { pos: [-6.4, 5.2, 4.0], rotY: Math.PI * 0.35, matIdx: 1 },
    { pos: [6.4, 6.0, 1.5], rotY: -Math.PI * 0.35, matIdx: 3 },
    { pos: [-6.2, 4.5, -5.0], rotY: Math.PI * 0.42, matIdx: 0, horiz: true },
    { pos: [6.3, 5.4, -7.0], rotY: -Math.PI * 0.42, matIdx: 2, horiz: true },
    { pos: [-6.3, 6.4, -14.0], rotY: Math.PI * 0.38, matIdx: 3 },
    { pos: [6.5, 4.8, -19.0], rotY: -Math.PI * 0.38, matIdx: 1 },
    { pos: [-6.5, 8.2, -25.0], rotY: Math.PI * 0.4, matIdx: 0, horiz: true },
    { pos: [-26.0, 11.5, -42.0], rotY: Math.PI * 0.25, matIdx: 2, horiz: true },
  ];
  alleySigns.forEach((s) => {
    const mesh = new THREE.Mesh(s.horiz ? signHorizGeo : signVertGeo, neonBoardMats[s.matIdx]);
    mesh.position.set(...s.pos);
    mesh.rotation.y = s.rotY;
    scene.add(mesh);
  });

  // Giant Floating Translucent Holograms along Corporate Facades & Plaza
  const holoPanels: Array<{ pos: [number, number, number]; rotY: number; matIdx: number; wide?: boolean }> = [
    { pos: [-6.2, 17.5, -16.0], rotY: Math.PI * 0.46, matIdx: 1 },
    { pos: [6.2, 19.0, -27.0], rotY: -Math.PI * 0.46, matIdx: 3 },
    { pos: [0.0, 13.5, -14.0], rotY: 0, matIdx: 0, wide: true },
    { pos: [0.0, 27.5, -52.5], rotY: 0, matIdx: 2, wide: true },
    { pos: [-27.5, 16.5, -45.0], rotY: Math.PI * 0.28, matIdx: 2 },
  ];
  holoPanels.forEach((hp) => {
    const m = new THREE.Mesh(hp.wide ? holoWideGeo : holoBigGeo, holoMats[hp.matIdx]);
    m.position.set(...hp.pos);
    m.rotation.y = hp.rotY;
    m.renderOrder = 6;
    scene.add(m);
  });

  // Centerpiece 3D Holographic Cyber-Orbital Gyro hovering over the Grand Canyon Plaza
  const holoGyroGroup = new THREE.Group();
  holoGyroGroup.position.set(0.0, 10.6, -18.5);
  const gyroRingGeoA = new THREE.TorusGeometry(2.6, 0.045, 10, 64);
  const gyroRingGeoB = new THREE.TorusGeometry(1.9, 0.035, 10, 56);
  const gyroCoreGeo = new THREE.OctahedronGeometry(0.65, 0);
  const gyroCyanMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.72, wireframe: false });
  const gyroMagentaMat = new THREE.MeshBasicMaterial({ color: '#ec4899', transparent: true, opacity: 0.65 });
  geometries.push(gyroRingGeoA, gyroRingGeoB, gyroCoreGeo);
  materials.push(gyroCyanMat, gyroMagentaMat);

  const gyroRingA = new THREE.Mesh(gyroRingGeoA, gyroCyanMat);
  const gyroRingB = new THREE.Mesh(gyroRingGeoB, gyroMagentaMat);
  const gyroCore = new THREE.Mesh(gyroCoreGeo, gyroCyanMat);
  holoGyroGroup.add(gyroRingA, gyroRingB, gyroCore);
  scene.add(holoGyroGroup);

  // ===========================================================================
  // 5. FLYING AV TRAFFIC LANES ("SPINNERS") & LIVE PEER HOVER-DRONES
  // ===========================================================================
  const carCount = 110;
  const carHullGeo = new THREE.BoxGeometry(0.88, 0.28, 2.35);
  const carLightGeo = new THREE.BoxGeometry(0.82, 0.11, 0.16);
  const carThrusterGeo = new THREE.BoxGeometry(0.98, 0.08, 0.55);
  const carHullMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.88, roughness: 0.22 });
  const carGlowMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const carThrusterMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  geometries.push(carHullGeo, carLightGeo, carThrusterGeo);
  materials.push(carHullMat, carGlowMat, carThrusterMat);

  const carHulls = new THREE.InstancedMesh(carHullGeo, carHullMat, carCount);
  const carTaillights = new THREE.InstancedMesh(carLightGeo, carGlowMat, carCount);
  const carThrusters = new THREE.InstancedMesh(carThrusterGeo, carThrusterMat, carCount);
  carHulls.frustumCulled = false;
  carTaillights.frustumCulled = false;
  carThrusters.frustumCulled = false;
  scene.add(carHulls, carTaillights, carThrusters);

  interface TrafficLaneCar {
    axis: 'z' | 'x';
    laneCoord: number;
    y: number;
    offset: number;
    speed: number;
    dir: 1 | -1;
  }
  const trafficCars: TrafficLaneCar[] = [];
  for (let i = 0; i < carCount; i++) {
    const isZAxis = i % 3 !== 0;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const altitudeTier = 4.5 + (i % 6) * 3.6 + hashC(i * 5.3) * 1.4;
    const laneCoord = isZAxis
      ? (dir > 0 ? 2.0 : -2.0) + (hashC(i * 11.7) - 0.5) * 2.2
      : -10.5 + (i % 3 === 1 ? 0 : -25.5) + (hashC(i * 9.1) - 0.5) * 3.0;
    trafficCars.push({
      axis: isZAxis ? 'z' : 'x',
      laneCoord,
      y: altitudeTier,
      offset: (hashC(i * 17.3) - 0.5) * 130,
      speed: (10.0 + hashC(i * 23.1) * 14.0) * dir,
      dir,
    });

    // Amber/Cyan headlights vs Red/Magenta taillights
    _tmpColor.set(dir > 0 ? '#22d3ee' : '#f43f5e');
    carTaillights.setColorAt(i, _tmpColor);
  }
  if (carTaillights.instanceColor) carTaillights.instanceColor.needsUpdate = true;

  // Connected Peer Autonomous Security Drones circling central Hologram Plaza
  const droneBodyGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.16, 6);
  const droneRotorGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 16);
  const droneVisorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);
  const droneVisorMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  geometries.push(droneBodyGeo, droneRotorGeo, droneVisorGeo);
  materials.push(droneVisorMat);

  const peerDrones: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const drone = new THREE.Group();
    const body = new THREE.Mesh(droneBodyGeo, darkMetalMat);
    const rotorL = new THREE.Mesh(droneRotorGeo, darkMetalMat);
    rotorL.rotation.x = Math.PI / 2;
    rotorL.position.set(-0.38, 0.05, 0);
    const rotorR = new THREE.Mesh(droneRotorGeo, darkMetalMat);
    rotorR.rotation.x = Math.PI / 2;
    rotorR.position.set(0.38, 0.05, 0);
    const visor = new THREE.Mesh(droneVisorGeo, droneVisorMat);
    visor.position.set(0, 0.02, 0.32);
    drone.add(body, rotorL, rotorR, visor);
    drone.visible = false;
    scene.add(drone);
    peerDrones.push(drone);
  }

  // ===========================================================================
  // 6. FALLING NEON RAIN STREAKS, BACKLIT STREET STEAM & AERIAL SEARCHLIGHTS
  // ===========================================================================
  const rainCount = 3200;
  const rPos = new Float32Array(rainCount * 3);
  const rCol = new Float32Array(rainCount * 3);
  const rSpeed = new Float32Array(rainCount);
  const rPhase = new Float32Array(rainCount);

  const rainPalette = [
    new THREE.Color('#67e8f9'),
    new THREE.Color('#a5f3fc'),
    new THREE.Color('#f9a8d4'),
    new THREE.Color('#fde68a'),
  ];
  for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    rPos[i3] = (hashC(i * 3.1) - 0.5) * 90;
    rPos[i3 + 1] = hashC(i * 7.7) * 38;
    rPos[i3 + 2] = (hashC(i * 11.3) - 0.5) * 110 - 18;
    const c = rainPalette[i % rainPalette.length];
    rCol[i3] = c.r;
    rCol[i3 + 1] = c.g;
    rCol[i3 + 2] = c.b;
    rSpeed[i] = 22.0 + hashC(i * 13.9) * 14.0;
    rPhase[i] = hashC(i * 19.1);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  rainGeo.setAttribute('aColor', new THREE.BufferAttribute(rCol, 3));
  rainGeo.setAttribute('aSpeed', new THREE.BufferAttribute(rSpeed, 1));
  rainGeo.setAttribute('aPhase', new THREE.BufferAttribute(rPhase, 1));
  geometries.push(rainGeo);

  const rainMat = createRainStreakShaderMaterial();
  rainMat.uniforms.uPixelRatio.value = pixelRatio;
  materials.push(rainMat);
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.frustumCulled = false;
  rainPoints.renderOrder = 8;
  scene.add(rainPoints);

  // Street-level steam plumes
  const steamGeo = new THREE.PlaneGeometry(5.5, 8.5);
  const steamCyanMat = createSteamVentShaderMaterial('#22d3ee');
  const steamAmberMat = createSteamVentShaderMaterial('#fb923c');
  geometries.push(steamGeo);
  materials.push(steamCyanMat, steamAmberMat);

  const steamLocs: Array<[number, number, number, boolean]> = [
    [-4.2, 4.0, 0.5, true],
    [4.4, 4.0, -7.5, false],
    [-3.8, 4.0, -16.5, false],
    [3.5, 4.0, -24.0, true],
    [-22.0, 4.0, -35.0, false],
  ];
  const steamMeshes: THREE.Mesh[] = [];
  steamLocs.forEach(([x, y, z, isCyan], i) => {
    const m = new THREE.Mesh(steamGeo, isCyan ? steamCyanMat : steamAmberMat);
    m.position.set(x, y, z);
    m.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.35;
    m.renderOrder = 4;
    scene.add(m);
    steamMeshes.push(m);
  });

  // Sweeping Aerial Searchlights rising from Corporate Megatowers
  const beamGeo = new THREE.PlaneGeometry(7.5, 58.0);
  beamGeo.translate(0, 29.0, 0);
  const beamCyanMat = createSearchlightConeShaderMaterial('#38bdf8');
  const beamMagentaMat = createSearchlightConeShaderMaterial('#ec4899');
  geometries.push(beamGeo);
  materials.push(beamCyanMat, beamMagentaMat);

  const searchlights: Array<{ mesh: THREE.Mesh; baseZ: number; phase: number }> = [];
  const beamConfigs: Array<[number, number, number, boolean]> = [
    [-10.5, 36, -56, true],
    [10.5, 36, -56, false],
    [-22.0, 42, 0, true],
    [22.0, 40, -20, false],
  ];
  beamConfigs.forEach(([x, y, z, isCyan], idx) => {
    const m = new THREE.Mesh(beamGeo, isCyan ? beamCyanMat : beamMagentaMat);
    m.position.set(x, y, z);
    m.renderOrder = 5;
    scene.add(m);
    searchlights.push({ mesh: m, baseZ: 0.14 * (idx % 2 === 0 ? 1 : -1), phase: idx * 1.7 });
  });

  const camSpline = new THREE.CatmullRomCurve3(CYBER_CAM_WAYPOINTS, false, 'catmullrom', 0.45);
  const lookSpline = new THREE.CatmullRomCurve3(CYBER_LOOK_WAYPOINTS, false, 'catmullrom', 0.45);

  return {
    camSpline,
    lookSpline,
    setPixelRatio(pr: number) {
      rainMat.uniforms.uPixelRatio.value = pr;
    },
    update({
      elapsed,
      delta,
      shaderTime,
      prefersReducedMotion,
      seedHex,
      isDark,
      connectedCount,
      isWorkspaceFocused,
      camera,
    }) {
      _tmpColor.set(isDark ? '#040711' : '#080e1f');
      (scene.background as THREE.Color).lerp(_tmpColor, 1 - Math.exp(-3 * delta));
      fog.color.copy(scene.background as THREE.Color);

      _tmpColor.set(seedHex);
      skyMat.uniforms.uTime.value = shaderTime;
      skyMat.uniforms.uSeedTint.value.lerp(_tmpColor, 1 - Math.exp(-3 * delta));
      skyMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        skyMat.uniforms.uOpacity.value,
        isWorkspaceFocused ? 0.72 : 0.96,
        3.2,
        delta
      );

      rainMat.uniforms.uTime.value = shaderTime;
      rainMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        rainMat.uniforms.uOpacity.value,
        isWorkspaceFocused ? 0.24 : 0.44,
        3.5,
        delta
      );

      steamCyanMat.uniforms.uTime.value = shaderTime;
      steamAmberMat.uniforms.uTime.value = shaderTime;
      beamCyanMat.uniforms.uTime.value = shaderTime;
      beamMagentaMat.uniforms.uTime.value = shaderTime;
      holoMats.forEach((hm) => {
        hm.uniforms.uTime.value = shaderTime;
        hm.uniforms.uOpacity.value = isWorkspaceFocused ? 0.56 : 0.8;
      });

      if (!prefersReducedMotion) {
        // Elevated monorail loop along canyon
        const trainZ = ((elapsed * 9.5) % 130) - 75;
        trainGroup.position.z = trainZ;

        // Holographic orbital gyro animation
        gyroRingA.rotation.x = elapsed * 0.35;
        gyroRingA.rotation.y = elapsed * 0.48;
        gyroRingB.rotation.y = -elapsed * 0.62;
        gyroRingB.rotation.z = elapsed * 0.28;
        gyroCore.rotation.y = elapsed * 0.9;

        // Sweeping searchlight cones
        for (let i = 0; i < searchlights.length; i++) {
          const sl = searchlights[i];
          sl.mesh.rotation.z = sl.baseZ + Math.sin(elapsed * 0.45 + sl.phase) * 0.22;
          sl.mesh.rotation.y = Math.cos(elapsed * 0.3 + sl.phase) * 0.4;
        }

        // Smooth aviation rooftop beacon glow pulse (no jarring binary strobe)
        const beaconPulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(elapsed * 2.8));
        rooftopBeaconMat.color.setRGB(beaconPulse, 0.11 * beaconPulse, 0.25 * beaconPulse);

        // Steam panels gently face camera Y
        for (let i = 0; i < steamMeshes.length; i++) {
          steamMeshes[i].lookAt(camera.position.x, steamMeshes[i].position.y, camera.position.z);
        }
      }

      // Update flying AV traffic lanes
      const tAnim = prefersReducedMotion ? 0 : elapsed;
      for (let i = 0; i < carCount; i++) {
        const c = trafficCars[i];
        if (c.axis === 'z') {
          const span = 130;
          const z = ((((c.offset + tAnim * c.speed) % span) + span) % span) - 85;
          _carDummy.position.set(c.laneCoord, c.y, z);
          _carDummy.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
        } else {
          const span = 120;
          const x = ((((c.offset + tAnim * c.speed) % span) + span) % span) - 60;
          _carDummy.position.set(x, c.y, c.laneCoord);
          _carDummy.rotation.set(0, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        }
        _carDummy.updateMatrix();
        carHulls.setMatrixAt(i, _carDummy.matrix);

        // Offset taillight bar to rear & thruster hover pod slightly below hull
        _carDummy.translateY(-0.14);
        _carDummy.updateMatrix();
        carThrusters.setMatrixAt(i, _carDummy.matrix);

        _carDummy.translateY(0.14);
        _carDummy.translateZ(-1.18);
        _carDummy.updateMatrix();
        carTaillights.setMatrixAt(i, _carDummy.matrix);
      }
      carHulls.instanceMatrix.needsUpdate = true;
      carTaillights.instanceMatrix.needsUpdate = true;
      carThrusters.instanceMatrix.needsUpdate = true;

      // Connected peer security drones circling the Hologram Plaza
      const activeCount = Math.min(peerDrones.length, connectedCount);
      for (let i = 0; i < peerDrones.length; i++) {
        const d = peerDrones[i];
        if (i < activeCount) {
          d.visible = true;
          const a = elapsed * 0.72 + (i / Math.max(1, activeCount)) * Math.PI * 2;
          d.position.set(Math.cos(a) * 3.8, 10.6 + Math.sin(a * 2.0) * 0.5, -18.5 + Math.sin(a) * 3.8);
          d.rotation.y = -a + Math.PI * 0.5;
        } else {
          d.visible = false;
        }
      }
    },
  };
}
