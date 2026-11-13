import * as THREE from 'three';

const NOISE_GLSL = `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
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
`;

/**
 * Photorealistic Schwarzschild Geodesic Ray-Marched Black Hole Shader.
 * Bends light trajectories around the event horizon in real 3D, producing
 * gravitationally warped upper & lower accretion disk arches, ISCO photon ring,
 * blackbody plasma shear turbulence, and relativistic Doppler beaming.
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

      vec4 sampleAccretion(vec3 hit, vec3 rayDir) {
        float rDisk = length(hit.xz);
        float rMin = 1.24;
        float rMax = 4.38;
        if (rDisk < rMin || rDisk > rMax) return vec4(0.0);

        float normR = clamp((rDisk - rMin) / (rMax - rMin), 0.0, 1.0);
        float angle = atan(hit.z, hit.x);

        // Differential Keplerian orbital shear
        float keplerRate = uSpinSpeed * (1.85 / pow(0.32 + normR, 0.85));
        float swirl = angle + (7.5 / (normR + 0.24)) - uTime * keplerRate;

        // Multi-scale turbulent gas rings + magnetic shear wisps
        vec2 polarWarp = vec2(normR * 15.0 - uTime * 0.14, cos(swirl) * 2.4 + sin(swirl) * 2.4);
        float turb = fbm(polarWarp);
        float wisps = fbm(vec2(normR * 28.0, swirl * 2.2 - uTime * 0.4));
        float rings = 0.55 + 0.45 * sin(normR * 44.0 + turb * 5.2);

        float radialEnvelope = smoothstep(0.0, 0.075, normR) * pow(1.0 - normR, 1.48);
        float density = radialEnvelope * (0.34 + 0.72 * turb) * (0.62 + 0.48 * wisps) * rings;

        // Inner ISCO superheated corona band
        float isco = exp(-pow((normR - 0.035) * 24.0, 2.0)) * 1.85;

        // Relativistic Doppler beaming + gravitational redshift
        vec3 orbVel = normalize(vec3(-hit.z, 0.0, hit.x));
        float vDotR = dot(orbVel, rayDir);
        float dopplerBoost = clamp(1.0 - 0.56 * vDotR, 0.34, 1.88);
        float tempShift = clamp(normR - vDotR * 0.14, 0.0, 1.0);

        vec3 plasma = mix(uColorInner, uColorMid, smoothstep(0.0, 0.34, tempShift));
        plasma = mix(plasma, uColorOuter, smoothstep(0.28, 0.92, tempShift));
        plasma += uColorInner * isco * dopplerBoost;

        float alpha = clamp((density + isco * 0.55) * dopplerBoost * 0.92, 0.0, 0.96);
        return vec4(plasma * (1.12 + dopplerBoost * 0.48), alpha);
      }

      void main() {
        vec3 roWorld = cameraPosition;
        vec3 rdWorld = normalize(vWorldPos - cameraPosition);

        mat3 invBasis = transpose(uDiskBasis);
        vec3 ro = (invBasis * (roWorld - uCenter)) / max(uScale, 0.001);
        vec3 rd = normalize(invBasis * rdWorld);

        // Intersect ray cleanly with outer gravitational well sphere (R = 4.65)
        const float R_BOUND = 4.65;
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
        bool captured = false;

        for (int i = 0; i < 30; i++) {
          float r2 = dot(p, p);
          float r = sqrt(r2);

          if (r < 0.88) {
            captured = true;
            break;
          }

          float dt = clamp(r * 0.155, 0.075, 0.38);

          // Exact Schwarzschild null geodesic curvature a = -1.5 * h^2 * p / r^5
          vec3 crossPD = cross(p, d);
          float h2 = dot(crossPD, crossPD);
          d = normalize(d - p * (dt * 1.48 * h2 / pow(max(r2, 0.36), 2.5)));

          vec3 pNext = p + d * dt;

          // Accumulate crisp Einstein photon-ring grazing emission near r ~ 0.96..1.18
          if (r < 1.65) {
            photonGlow += exp(-pow((r - 0.98) * 9.5, 2.0)) * dt * 1.25;
          }

          // Cross accretion disk plane (y = 0)
          if ((p.y > 0.0 && pNext.y <= 0.0) || (p.y < 0.0 && pNext.y >= 0.0)) {
            float frac = clamp(abs(p.y) / max(0.0001, abs(p.y - pNext.y)), 0.0, 1.0);
            vec3 hit = mix(p, pNext, frac);
            vec4 diskSample = sampleAccretion(hit, d);
            if (diskSample.a > 0.005) {
              float w = (1.0 - accumAlpha) * diskSample.a;
              accumColor += diskSample.rgb * w;
              accumAlpha += w;
              if (accumAlpha > 0.97) break;
            }
          } else if (abs(pNext.y) < 0.045) {
            // Grazing equatorial plasma thickness
            vec4 diskSample = sampleAccretion(pNext, d);
            if (diskSample.a > 0.005) {
              float w = (1.0 - accumAlpha) * diskSample.a * 0.28;
              accumColor += diskSample.rgb * w;
              accumAlpha += w;
            }
          }

          p = pNext;
          if (length(p) > 4.95 && dot(p, d) > 0.0) break;
        }

        // Photon ring corona
        vec3 ringCol = uColorRing * clamp(photonGlow, 0.0, 2.4);
        accumColor += ringCol * (1.0 - accumAlpha * 0.45);
        float haloAlpha = clamp(photonGlow * 0.72, 0.0, 0.9);

        float finalAlpha = captured
          ? max(accumAlpha, 1.0)
          : clamp(max(accumAlpha, haloAlpha), 0.0, 1.0);

        finalAlpha *= uOpacity;
        if (finalAlpha < 0.008) discard;

        // Premultiply cleanly inside NormalBlending so captured core is pure abyssal shadow (#000000)
        gl_FragColor = vec4(accumColor * uOpacity, finalAlpha);
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
        float scintillation = 0.74 + 0.26 * sin(uTime * (0.9 + fract(aPhase) * 2.1) + aPhase * 6.2831);
        vTwinkle = scintillation;
        float size = aScale * uPixelRatio * (225.0 / max(10.0, -mvPosition.z)) * (0.9 + 0.16 * scintillation);
        gl_PointSize = clamp(size, 1.0, 38.0);
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
        gl_FragColor = vec4(vColor * (1.08 + 0.25 * vTwinkle), alpha);
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

        // Gentle vertical density wave
        pos.y += sin(uTime * 0.45 + aPhase * 6.2831) * 0.22;

        // Subtle pointer gravity attraction
        vec3 toMouse = pos - uMouse;
        float md = length(toMouse);
        pos -= normalize(toMouse + vec3(0.0001)) * smoothstep(14.0, 0.0, md) * 0.75;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = aScale * uPixelRatio * (180.0 / max(4.5, -mvPosition.z));
        gl_PointSize = clamp(size, 1.2, 42.0);
        gl_Position = projectionMatrix * mvPosition;

        vColor = mix(aColor, uSeedTint, 0.11);
        float shimmer = 0.78 + 0.22 * sin(uTime * 1.1 + aPhase * 5.0);
        vAlpha = shimmer * smoothstep(160.0, 6.0, -mvPosition.z);
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
        gl_FragColor = vec4(vColor * 1.2, alpha);
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
      uIntensity: { value: 0.9 },
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
        float corePinch = mix(6.5, 1.7, distFromCenter);
        float xFade = exp(-pow((vUv.x - 0.5) * corePinch, 2.0));
        float yFade = smoothstep(1.0, 0.05, distFromCenter) * smoothstep(0.0, 0.07, distFromCenter);
        float plasmaKnot = 0.65 + 0.35 * fbm(vec2(vUv.x * 4.0, distFromCenter * 10.0 - uTime * 2.4));
        float alpha = xFade * yFade * plasmaKnot * uIntensity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(uColor * 1.55, clamp(alpha, 0.0, 0.85));
      }
    `,
  });
}
