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
 * Relativistic swirling black hole accretion disk shader with spiral shear & Doppler beaming.
 */
export function createAccretionDiskShaderMaterial(
  innerColor: string,
  midColor: string,
  outerColor: string,
  spinSpeed = 1.15
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSpinSpeed: { value: spinSpeed },
      uInnerRadius: { value: 0.30 },
      uColorInner: { value: new THREE.Color(innerColor) },
      uColorMid: { value: new THREE.Color(midColor) },
      uColorOuter: { value: new THREE.Color(outerColor) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpinSpeed;
      uniform float uInnerRadius;
      uniform vec3 uColorInner;
      uniform vec3 uColorMid;
      uniform vec3 uColorOuter;
      uniform float uOpacity;
      varying vec2 vPos;
      ${NOISE_GLSL}

      void main() {
        float r = length(vPos);
        if (r < uInnerRadius || r > 1.0) discard;

        float normR = clamp((r - uInnerRadius) / (1.0 - uInnerRadius), 0.0, 1.0);
        float angle = atan(vPos.y, vPos.x);

        // Keplerian differential swirl: inner orbits whip faster than outer edge
        float swirl = angle + (5.2 / (normR + 0.18)) - uTime * uSpinSpeed * (1.7 - normR * 0.9);
        float rings = fbm(vec2(normR * 12.0 - uTime * 0.22, cos(swirl) * 2.1 + sin(swirl) * 2.1));
        float fineStreaks = 0.5 + 0.5 * sin(normR * 36.0 + fbm(vec2(cos(swirl), sin(swirl)) * 3.0) * 6.0);

        float density = smoothstep(0.0, 0.09, normR) * pow(1.0 - normR, 1.55);
        density *= (0.42 + 0.78 * rings) * (0.68 + 0.38 * fineStreaks);

        // Relativistic Doppler beaming (left/approaching side glows hotter & brighter)
        float doppler = 1.0 + 0.42 * cos(angle + 0.45);
        density *= doppler;

        // Sharp inner ISCO photon ring surge
        float iscoGlow = exp(-pow((normR - 0.03) * 22.0, 2.0)) * 1.45;

        vec3 plasma = mix(uColorInner, uColorMid, smoothstep(0.0, 0.38, normR));
        plasma = mix(plasma, uColorOuter, smoothstep(0.32, 0.95, normR));
        plasma += uColorInner * iscoGlow;

        float alpha = clamp((density + iscoGlow * 0.65) * uOpacity, 0.0, 0.96);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(plasma * (1.2 + doppler * 0.35), alpha);
      }
    `,
  });
}

/**
 * Billboarded Gravitational Lensing Halo + Einstein Photon Ring + Gargantua Bent Arcs.
 */
export function createPhotonLensingHaloShaderMaterial(
  ringColor: string,
  haloColor: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorRing: { value: new THREE.Color(ringColor) },
      uColorHalo: { value: new THREE.Color(haloColor) },
      uOpacity: { value: 1.0 },
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
      uniform vec3 uColorRing;
      uniform vec3 uColorHalo;
      uniform float uOpacity;
      varying vec2 vUv;
      ${NOISE_GLSL}

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);

        // Pitch-black shadow core interior
        if (r < 0.305 || r > 1.0) discard;

        // Razor-sharp glowing Einstein photon ring at event horizon boundary
        float photonRing = exp(-pow((r - 0.34) * 34.0, 2.0)) * 1.65;

        // Secondary lensed upper/lower plasma arc (Interstellar light bending)
        float verticalBias = pow(abs(sin(angle)), 1.35);
        float bentArc = exp(-pow((r - 0.42) * 12.0, 2.0)) * (0.45 + 0.85 * verticalBias);

        // Swirling subtle plasma distortion around the bent arc
        float turbulence = fbm(vec2(angle * 3.0 + uTime * 0.4, r * 9.0 - uTime * 0.3));
        float outerAura = exp(-pow((r - 0.35) * 3.6, 2.0)) * (0.28 + 0.35 * turbulence);

        // Asymmetric Doppler brightening
        float doppler = 0.88 + 0.28 * cos(angle + 0.5);

        vec3 col = uColorRing * photonRing + mix(uColorRing, uColorHalo, 0.55) * (bentArc + outerAura);
        float alpha = (photonRing + bentArc * 0.8 + outerAura * 0.55) * doppler * uOpacity;

        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col * 1.15, clamp(alpha, 0.0, 0.96));
      }
    `,
  });
}

/**
 * Multi-Spectral Twinkling Deep Space Starfield Shader.
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
        float pulse = 0.62 + 0.38 * sin(uTime * (1.2 + fract(aPhase) * 2.4) + aPhase * 6.2831);
        vTwinkle = pulse;
        float size = aScale * uPixelRatio * (210.0 / max(8.0, -mvPosition.z)) * (0.85 + 0.25 * pulse);
        gl_PointSize = clamp(size, 1.2, 34.0);
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
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(vColor * (1.05 + 0.3 * vTwinkle), alpha);
      }
    `,
  });
}

/**
 * GPU-Orbital Logarithmic Spiral Galaxy & Ionized Nebula Dust Shader.
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
      uOpacity: { value: 0.94 },
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
        // Keplerian differential rotation around galactic center (XZ plane)
        float angle = uTime * aOrbitSpeed;
        float s = sin(angle);
        float c = cos(angle);
        vec3 pos = position;
        pos.x = position.x * c - position.z * s;
        pos.z = position.x * s + position.z * c;

        // Subtle vertical orbital wave
        pos.y += sin(uTime * 0.6 + aPhase * 6.28) * 0.28;

        // Subtle pointer gravity distortion
        vec3 toMouse = pos - uMouse;
        float md = length(toMouse);
        pos -= normalize(toMouse + vec3(0.0001)) * smoothstep(12.0, 0.0, md) * 0.9;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = aScale * uPixelRatio * (165.0 / max(4.0, -mvPosition.z));
        gl_PointSize = clamp(size, 1.4, 48.0);
        gl_Position = projectionMatrix * mvPosition;

        vColor = mix(aColor, uSeedTint, 0.14);
        float shimmer = 0.72 + 0.28 * sin(uTime * 1.4 + aPhase * 5.0);
        vAlpha = shimmer * smoothstep(140.0, 6.0, -mvPosition.z);
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
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(vColor * 1.18, alpha);
      }
    `,
  });
}

/**
 * Relativistic polar jet beam shader emerging from spinning black hole magnetic poles.
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
      uIntensity: { value: 0.85 },
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

      void main() {
        // Taper brightly near the core (y=0.5) and spread outward cleanly
        float distFromCenter = abs(vUv.y - 0.5) * 2.0;
        float corePinch = mix(5.5, 1.6, distFromCenter);
        float xFade = exp(-pow((vUv.x - 0.5) * corePinch, 2.0));
        float yFade = smoothstep(1.0, 0.06, distFromCenter) * smoothstep(0.0, 0.08, distFromCenter);
        float pulse = 0.75 + 0.25 * sin(distFromCenter * 22.0 - uTime * 5.5);
        float alpha = xFade * yFade * pulse * uIntensity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(uColor * 1.45, clamp(alpha, 0.0, 0.85));
      }
    `,
  });
}
