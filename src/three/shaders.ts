import * as THREE from 'three';

const NOISE_GLSL = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    float nx00 = mix(n000, n100, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx11 = mix(n011, n111, u.x);
    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);
    return mix(nxy0, nxy1, u.z);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2(p);
      p = p * 2.04 + vec2(13.1, 7.7);
      a *= 0.5;
    }
    return v;
  }

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise3(p);
      p = p * 2.03 + vec3(7.1, 13.7, 5.3);
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * Infinite-Resolution GPU 3D Deep Space Milky Way Sky Dome.
 * Evaluates seamless 3D spherical FBM dust rifts, Sagittarius core bulge,
 * Magellanic dwarf satellite halos, and sub-pixel unresolved stellar clouds.
 */
export function createDeepSpaceSkyShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.96 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vDir;
      ${NOISE_GLSL}

      void main() {
        vec3 dir = normalize(vDir);

        // Gently tilt galactic plane diagonally across sky
        float c = cos(0.46);
        float s = sin(0.46);
        vec3 gDir = vec3(dir.x, dir.y * c - dir.z * s, dir.y * s + dir.z * c);

        float planeDist = abs(gDir.y + sin(gDir.x * 2.4 + 0.5) * 0.08);
        float band = exp(-pow(planeDist * 4.4, 2.0));

        // Sagittarius Galactic Core Bulge
        vec3 bulgeAxis = normalize(vec3(0.56, -0.04, -0.82));
        float bulgeAlign = max(0.0, dot(gDir, bulgeAxis));
        float coreBulge = pow(bulgeAlign, 5.5) * exp(-pow(planeDist * 3.1, 2.0));

        // Multi-octave 3D star-cloud structure & dark Great Rift molecular dust veins
        vec3 warp = vec3(
          fbm3(gDir * 3.2 + vec3(1.4)),
          fbm3(gDir * 3.2 + vec3(6.2)),
          fbm3(gDir * 3.2 + vec3(9.8))
        );
        float clouds = fbm3(gDir * 4.5 + warp * 1.15);
        float riftNoise = fbm3(gDir * 7.8 + warp * 1.6 + vec3(3.1, 7.4, 2.2));
        float greatRift = exp(-pow(planeDist * 13.5, 2.0)) * smoothstep(0.36, 0.72, riftNoise);

        // Two faint off-plane Magellanic dwarf galaxy halos
        float lmc = exp(-pow(length(gDir - normalize(vec3(-0.62, -0.42, -0.66))) * 6.8, 2.0)) * 0.24;
        float smc = exp(-pow(length(gDir - normalize(vec3(-0.42, -0.58, -0.69))) * 10.5, 2.0)) * 0.16;

        // Unresolved distant Milky Way pinpoint dust
        vec3 starCell = floor(gDir * 240.0);
        float starRand = hash31(starCell);
        vec3 starFrac = fract(gDir * 240.0) - 0.5;
        float microStar = step(0.968, starRand) * smoothstep(0.45, 0.05, length(starFrac)) * (0.25 + 0.75 * band);

        vec3 outerTint = vec3(0.035, 0.065, 0.14);
        vec3 armTint = vec3(0.11, 0.19, 0.34);
        vec3 bulgeTint = vec3(0.56, 0.36, 0.19);

        vec3 col = vec3(0.003, 0.005, 0.012);
        col += mix(outerTint, armTint, clouds) * band * (0.28 + 0.85 * clouds) * (1.0 - 0.88 * greatRift);
        col += bulgeTint * coreBulge * (1.0 - 0.62 * greatRift) * 0.64;
        col += vec3(0.16, 0.24, 0.44) * (lmc + smc) * (0.55 + 0.5 * clouds);
        col += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.84, 0.62), hash31(starCell + 7.1)) * microStar * 0.58;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
}

/**
 * Photorealistic Schwarzschild Geodesic Ray-Marched Black Hole Shader.
 * Features adaptive photon-sphere integration steps, background starfield &
 * Milky Way gravitational lensing (Einstein arcs), volumetric accretion plasma
 * with Keplerian shear, gravitational redshift, and relativistic Doppler beaming.
 */
export function createRayMarchedBlackHoleMaterial(opts: {
  center: [number, number, number];
  scale: number;
  diskBasis: THREE.Matrix3;
  innerColor: string;
  midColor: string;
  outerColor: string;
  ringColor: string;
  spinSpeed?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uSpinSpeed: { value: opts.spinSpeed ?? 1.1 },
      uCenter: { value: new THREE.Vector3(...opts.center) },
      uScale: { value: opts.scale },
      uDiskBasis: { value: opts.diskBasis.clone() },
      uColorInner: { value: new THREE.Color(opts.innerColor) },
      uColorMid: { value: new THREE.Color(opts.midColor) },
      uColorOuter: { value: new THREE.Color(opts.outerColor) },
      uColorRing: { value: new THREE.Color(opts.ringColor) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpinSpeed;
      uniform vec3 uCenter;
      uniform float uScale;
      uniform mat3 uDiskBasis;
      uniform vec3 uColorInner;
      uniform vec3 uColorMid;
      uniform vec3 uColorOuter;
      uniform vec3 uColorRing;
      uniform float uOpacity;
      varying vec3 vWorldPos;
      ${NOISE_GLSL}

      vec3 sampleLensedBackground(vec3 worldDir, float deflect) {
        // Only reveal gravitationally bent background light where spacetime curvature bends rays noticeably
        float lensWeight = smoothstep(0.035, 0.34, deflect);
        if (lensWeight <= 0.001) return vec3(0.0);

        // Background stars stretched along Einstein ring arcs
        vec3 cell = floor(worldDir * 64.0);
        float rnd = hash31(cell);
        vec3 local = fract(worldDir * 64.0) - 0.5;
        float star = step(0.955, rnd) * exp(-dot(local, local) * 32.0);
        vec3 starCol = mix(vec3(0.68, 0.84, 1.0), vec3(1.0, 0.82, 0.62), hash31(cell + 19.3));

        // Faint lensed galactic band glow wrapping around the Einstein ring
        float band = exp(-pow((worldDir.y + 0.12 * worldDir.x) * 5.2, 2.0));
        vec3 lensedGlow = vec3(0.06, 0.10, 0.20) * band * 0.75 + starCol * star * 1.45;
        return lensedGlow * lensWeight;
      }

      vec4 sampleAccretion(vec3 hit, vec3 rayDir) {
        float rDisk = length(hit.xz);
        float rMin = 1.44;
        float rMax = 4.28;
        if (rDisk < rMin || rDisk > rMax) return vec4(0.0);

        float normR = clamp((rDisk - rMin) / (rMax - rMin), 0.0, 1.0);
        float angle = atan(hit.z, hit.x);

        // Differential Keplerian angular velocity omega ~ r^(-1.5)
        float keplerRate = uSpinSpeed * (1.92 / pow(0.30 + normR, 0.88));
        float swirl = angle + (7.6 / (normR + 0.24)) - uTime * keplerRate;

        // Smooth magnetorotational spiral shear wisps (no artificial concentric sine rings)
        vec2 polarWarp = vec2(normR * 12.0 - uTime * 0.14, cos(swirl) * 2.4 + sin(swirl) * 2.4);
        float turb = fbm(polarWarp);
        float wisps = fbm(vec2(normR * 22.0 + turb * 1.4, swirl * 2.2 - uTime * 0.38));
        float spiralShear = 0.72 + 0.28 * sin(angle * 3.0 + normR * 14.0 - uTime * keplerRate + turb * 3.2);

        float radialEnvelope = smoothstep(0.0, 0.075, normR) * pow(1.0 - normR, 1.75);
        float density = radialEnvelope * (0.28 + 0.74 * turb) * (0.55 + 0.55 * wisps) * spiralShear;

        // Inner ISCO superheated corona band
        float isco = exp(-pow((normR - 0.03) * 24.0, 2.0)) * 1.95;

        // Relativistic Doppler beaming + gravitational redshift sqrt(1 - rs/r)
        float gravRedshift = sqrt(clamp(1.0 - 0.85 / max(rDisk, 0.95), 0.16, 1.0));
        vec3 orbVel = normalize(vec3(-hit.z, 0.0, hit.x));
        float vDotR = dot(orbVel, rayDir);
        float doppler = clamp(1.0 - 0.52 * vDotR, 0.36, 1.72);
        float dopplerIntensity = pow(doppler, 1.65) * (0.62 + 0.38 * gravRedshift);

        float tempShift = clamp(normR - vDotR * 0.15 + (1.0 - gravRedshift) * 0.10, 0.0, 1.0);
        vec3 plasma = mix(uColorInner, uColorMid, smoothstep(0.0, 0.32, tempShift));
        plasma = mix(plasma, uColorOuter, smoothstep(0.28, 0.92, tempShift));
        plasma += uColorInner * isco * dopplerIntensity;

        float alpha = clamp((density * 0.82 + isco * 0.52) * dopplerIntensity, 0.0, 0.92);
        return vec4(plasma * (1.02 + dopplerIntensity * 0.48), alpha);
      }

      void main() {
        vec3 roWorld = cameraPosition;
        vec3 rdWorld = normalize(vWorldPos - cameraPosition);

        mat3 invBasis = transpose(uDiskBasis);
        vec3 ro = (invBasis * (roWorld - uCenter)) / max(uScale, 0.001);
        vec3 rd = normalize(invBasis * rdWorld);

        const float R_BOUND = 4.68;
        float b = dot(ro, rd);
        float c = dot(ro, ro) - R_BOUND * R_BOUND;
        float disc = b * b - c;
        if (disc < 0.0) discard;

        float sqrtD = sqrt(disc);
        float tStart = max(0.0, -b - sqrtD);
        float tEnd = -b + sqrtD;
        if (tEnd <= 0.0) discard;

        vec3 p = ro + rd * tStart;
        vec3 d = rd;

        vec3 accumColor = vec3(0.0);
        float accumAlpha = 0.0;
        float photonGlow = 0.0;
        float minR = 99.0;
        bool captured = false;

        // 48 adaptive Schwarzschild geodesic steps with tight photon-sphere resolution
        for (int i = 0; i < 48; i++) {
          float r2 = dot(p, p);
          float r = sqrt(r2);
          minR = min(minR, r);

          if (r < 0.88) {
            captured = true;
            break;
          }

          float dt = r < 1.95 ? clamp(r * 0.082, 0.04, 0.15) : clamp(r * 0.135, 0.085, 0.28);

          vec3 crossPD = cross(p, d);
          float h2 = dot(crossPD, crossPD);
          d = normalize(d - p * (dt * 1.50 * h2 / pow(max(r2, 0.34), 2.5)));

          vec3 pNext = p + d * dt;

          // Grazing photon-sphere glow weighted by angular momentum so radial center rays stay pure #000000
          if (r < 1.48) {
            float grazeWeight = smoothstep(0.92, 1.52, sqrt(h2));
            photonGlow += exp(-pow((r - 0.97) * 14.0, 2.0)) * dt * 1.65 * grazeWeight;
          }

          // Exact continuous equatorial accretion disk plane crossing (zero step-ring slicing)
          if ((p.y > 0.0 && pNext.y <= 0.0) || (p.y < 0.0 && pNext.y >= 0.0)) {
            float frac = clamp(abs(p.y) / max(0.0001, abs(p.y - pNext.y)), 0.0, 1.0);
            vec3 hit = mix(p, pNext, frac);
            vec4 diskSample = sampleAccretion(hit, d);
            if (diskSample.a > 0.005) {
              float w = (1.0 - accumAlpha) * diskSample.a;
              accumColor += diskSample.rgb * w;
              accumAlpha += w;
              if (accumAlpha > 0.96) break;
            }
          }

          p = pNext;
          if (length(p) > 4.95 && dot(p, d) > 0.0) break;
        }

        // Photon ring emission strictly outside the captured event horizon shadow
        if (!captured) {
          float analyticalRing = exp(-pow((minR - 0.94) * 16.0, 2.0)) * 1.35;
          float totalRing = clamp(max(photonGlow, analyticalRing), 0.0, 2.35);
          vec3 ringCol = uColorRing * totalRing;
          accumColor += ringCol * (1.0 - accumAlpha * 0.45);
          photonGlow = totalRing;
        } else {
          photonGlow = 0.0;
        }
        float haloAlpha = clamp(photonGlow * 0.78, 0.0, 0.94);

        // Background Einstein lensing arcs along deflected escaped ray direction
        float deflect = length(d - rd);
        vec3 lensedBg = vec3(0.0);
        float bgAlpha = 0.0;
        if (!captured && accumAlpha < 0.94 && deflect > 0.035) {
          vec3 deflectedWorldDir = normalize(uDiskBasis * d);
          lensedBg = sampleLensedBackground(deflectedWorldDir, deflect);
          bgAlpha = clamp(length(lensedBg) * 0.85, 0.0, 0.72);
          accumColor += lensedBg * (1.0 - accumAlpha);
        }

        float finalAlpha = captured
          ? 1.0
          : clamp(max(accumAlpha, max(haloAlpha, bgAlpha)), 0.0, 1.0);

        finalAlpha *= uOpacity;
        if (finalAlpha < 0.008) discard;

        gl_FragColor = vec4(accumColor * uOpacity, finalAlpha);
      }
    `,
  });
}

/**
 * Rayleigh / Fresnel Atmospheric Limb Scattering Shell for 3D Exoplanets.
 * Illuminated by uSunDir for crisp sunlit crescent scattering & dark night terminator.
 */
export function createAtmosphereRimShaderMaterial(opts: {
  dayColor: string;
  twilightColor: string;
  sunDir: THREE.Vector3;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uDayColor: { value: new THREE.Color(opts.dayColor) },
      uTwilightColor: { value: new THREE.Color(opts.twilightColor) },
      uSunDir: { value: opts.sunDir.clone().normalize() },
      uOpacity: { value: 0.95 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uDayColor;
      uniform vec3 uTwilightColor;
      uniform vec3 uSunDir;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        // BackSide normals point outward; rim peaks toward grazing edge
        float fresnel = pow(clamp(1.0 + dot(vWorldNormal, viewDir), 0.0, 1.0), 3.1);
        float sunDot = dot(vWorldNormal, normalize(uSunDir));
        float dayWeight = smoothstep(-0.28, 0.65, sunDot);
        float terminator = exp(-pow(sunDot * 4.5, 2.0));

        vec3 col = mix(uDayColor, uTwilightColor, terminator * 0.65);
        float alpha = fresnel * (0.04 + 0.96 * dayWeight) * uOpacity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(col * 1.45, alpha);
      }
    `,
  });
}

/**
 * Illuminated Planetary Ring Shader with Cassini/Encke radial gaps,
 * Mie-style sunlight scattering, and accurate planet umbra shadow casting.
 */
export function createPlanetaryRingShaderMaterial(opts: {
  ringTex: THREE.Texture;
  planetCenter: THREE.Vector3;
  planetRadius: number;
  sunDir: THREE.Vector3;
  innerRadius: number;
  outerRadius: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uRingTex: { value: opts.ringTex },
      uPlanetCenter: { value: opts.planetCenter.clone() },
      uPlanetRadius: { value: opts.planetRadius },
      uSunDir: { value: opts.sunDir.clone().normalize() },
      uInnerRadius: { value: opts.innerRadius },
      uOuterRadius: { value: opts.outerRadius },
      uOpacity: { value: 0.92 },
    },
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      void main() {
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uRingTex;
      uniform vec3 uPlanetCenter;
      uniform float uPlanetRadius;
      uniform vec3 uSunDir;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      uniform float uOpacity;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;

      void main() {
        float r = length(vLocalPos.xy);
        float radialU = clamp((r - uInnerRadius) / max(0.001, uOuterRadius - uInnerRadius), 0.0, 1.0);
        vec4 tex = texture2D(uRingTex, vec2(radialU, 0.5));
        if (tex.a < 0.01) discard;

        // Ray-sphere shadow check from ring point toward sun
        vec3 sun = normalize(uSunDir);
        vec3 oc = vWorldPos - uPlanetCenter;
        float tClosest = dot(oc, sun);
        float shadow = 1.0;
        if (tClosest < 0.0) {
          float perpDistSq = dot(oc, oc) - tClosest * tClosest;
          float rSq = uPlanetRadius * uPlanetRadius;
          shadow = smoothstep(rSq * 0.88, rSq * 1.12, perpDistSq);
        }

        // Subtle phase scatter boost + faint planetshine on shadowed ice grains
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float forwardScatter = pow(max(0.0, dot(-viewDir, sun)), 2.5) * 0.35;
        vec3 litColor = tex.rgb * (0.10 + 0.95 * shadow + forwardScatter * shadow);

        gl_FragColor = vec4(litColor, tex.a * uOpacity);
      }
    `,
  });
}

/**
 * Multi-Spectral Blackbody Twinkling Deep Space Starfield Shader.
 */
export function createStarfieldShaderMaterial(starTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSprite: { value: starTexture },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float scintillation = 0.78 + 0.22 * sin(uTime * (0.85 + fract(aPhase) * 1.9) + aPhase * 6.2831);
        vTwinkle = scintillation;
        float size = aScale * uPixelRatio * (215.0 / max(10.0, -mvPosition.z)) * (0.92 + 0.14 * scintillation);
        gl_PointSize = clamp(size, 1.0, 36.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uSprite;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        float alpha = tex.a * vTwinkle * uOpacity;
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(vColor * (1.06 + 0.22 * vTwinkle), alpha);
      }
    `,
  });
}

/**
 * GPU-Orbital Logarithmic Barred Spiral Galaxy Shader (Bulge + OB Arms + H-II Knots).
 */
export function createSpiralGalaxyShaderMaterial(glowTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uSprite: { value: glowTexture },
      uSeedTint: { value: new THREE.Color('#38bdf8') },
      uOpacity: { value: 0.96 },
    },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      attribute float aOrbitSpeed;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec3 uMouse;
      uniform vec3 uSeedTint;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float angle = uTime * aOrbitSpeed;
        float s = sin(angle);
        float c = cos(angle);
        vec3 pos = position;
        pos.x = position.x * c - position.z * s;
        pos.z = position.x * s + position.z * c;

        pos.y += sin(uTime * 0.42 + aPhase * 6.2831) * 0.18;

        vec3 toMouse = pos - uMouse;
        float md = length(toMouse);
        pos -= normalize(toMouse + vec3(0.0001)) * smoothstep(14.0, 0.0, md) * 0.65;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = aScale * uPixelRatio * (76.0 / max(5.0, -mvPosition.z));
        gl_PointSize = clamp(size, 1.0, 14.0);
        gl_Position = projectionMatrix * mvPosition;

        vColor = mix(aColor, uSeedTint, 0.08);
        float shimmer = 0.82 + 0.18 * sin(uTime * 1.1 + aPhase * 5.0);
        vAlpha = shimmer * smoothstep(165.0, 6.0, -mvPosition.z);
      }
    `,
    fragmentShader: `
      uniform sampler2D uSprite;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        float alpha = tex.a * vAlpha * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * 0.62, alpha);
      }
    `,
  });
}

/**
 * Dark Interstellar Molecular Dust-Lane Ribbon Shader for Spiral Galaxy Arms.
 * Uses NormalBlending to carve realistic dark absorption veins along inner spiral edges.
 */
export function createGalaxyDustShaderMaterial(dustTexture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSprite: { value: dustTexture },
      uOpacity: { value: 0.28 },
    },
    vertexShader: `
      attribute float aScale;
      attribute float aOrbitSpeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        float angle = uTime * aOrbitSpeed;
        float s = sin(angle);
        float c = cos(angle);
        vec3 pos = position;
        pos.x = position.x * c - position.z * s;
        pos.z = position.x * s + position.z * c;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = aScale * uPixelRatio * (135.0 / max(6.0, -mvPosition.z));
        gl_PointSize = clamp(size, 6.0, 44.0);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = smoothstep(130.0, 8.0, -mvPosition.z);
      }
    `,
    fragmentShader: `
      uniform sampler2D uSprite;
      uniform float uOpacity;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        float alpha = tex.a * vAlpha * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(tex.rgb, alpha);
      }
    `,
  });
}

/**
 * Relativistic polar synchrotron jet shader emerging from spinning black hole poles.
 */
export function createVolumetricBeamShaderMaterial(colorHex = '#7dd3fc'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: 0.92 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      ${NOISE_GLSL}

      void main() {
        float distFromCenter = abs(vUv.y - 0.5) * 2.0;
        float corePinch = mix(7.0, 1.6, distFromCenter);
        float xFade = exp(-pow((vUv.x - 0.5) * corePinch, 2.0));
        float yFade = smoothstep(1.0, 0.04, distFromCenter) * smoothstep(0.0, 0.06, distFromCenter);
        float helix = 0.68 + 0.32 * sin(distFromCenter * 24.0 - uTime * 3.8 + (vUv.x - 0.5) * 9.0);
        float plasmaKnot = 0.58 + 0.42 * fbm(vec2(vUv.x * 4.5, distFromCenter * 11.0 - uTime * 2.6));
        float alpha = xFade * yFade * plasmaKnot * helix * uIntensity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(uColor * 1.6, clamp(alpha, 0.0, 0.85));
      }
    `,
  });
}

/**
 * Luminous Tidal Plasma Accretion Stream connecting the Binary Black Holes.
 */
export function createTidalStreamShaderMaterial(colorA = '#38bdf8', colorB = '#c084fc'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: 0.78 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      varying vec2 vUv;
      ${NOISE_GLSL}

      void main() {
        float stream = fbm(vec2(vUv.x * 6.0 - uTime * 0.85, vUv.y * 4.0));
        float radialFade = sin(vUv.y * 3.14159265);
        float endFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
        float alpha = pow(radialFade, 1.8) * endFade * (0.35 + 0.85 * stream) * uOpacity;
        if (alpha < 0.005) discard;
        vec3 col = mix(uColorA, uColorB, vUv.x);
        gl_FragColor = vec4(col * 1.45, clamp(alpha, 0.0, 0.88));
      }
    `,
  });
}
