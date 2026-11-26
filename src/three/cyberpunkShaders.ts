import * as THREE from 'three';

const CYBER_NOISE_GLSL = `
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
      p = p * 2.04 + vec2(11.3, 5.7);
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * Rain-soaked nocturnal megacity sky dome with urban neon smog glow & drifting cloud strata.
 */
export function createCyberSkyDomeShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uSeedTint: { value: new THREE.Color('#22d3ee') },
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
      uniform vec3 uSeedTint;
      uniform float uOpacity;
      varying vec3 vDir;
      ${CYBER_NOISE_GLSL}

      void main() {
        vec3 dir = normalize(vDir);
        float elev = clamp(dir.y, -0.2, 1.0);

        // Deep stormy night zenith fading into warm/cyan/magenta urban light pollution horizon
        vec3 zenith = vec3(0.008, 0.014, 0.032);
        vec3 horizonCyan = mix(vec3(0.025, 0.095, 0.16), uSeedTint * 0.22, 0.25);
        vec3 horizonMagenta = vec3(0.16, 0.035, 0.11);
        vec3 horizonAmber = vec3(0.18, 0.075, 0.025);

        float azim = atan(dir.z, dir.x);
        float sectorMix = sin(azim * 2.0 + 0.6) * 0.5 + 0.5;
        float amberMix = smoothstep(0.3, 0.95, sin(azim * 1.5 - 1.2) * 0.5 + 0.5);
        vec3 horizonCol = mix(horizonCyan, horizonMagenta, sectorMix * 0.65);
        horizonCol = mix(horizonCol, horizonAmber, amberMix * 0.38);

        float horizonGlow = exp(-max(0.0, elev) * 5.2);
        vec3 sky = mix(zenith, horizonCol, horizonGlow);

        // Volumetric low rain-cloud strata lit from below by neon streets
        vec2 cloudUv = dir.xz / (max(0.12, abs(dir.y) + 0.18)) * 1.8 + vec2(uTime * 0.012, uTime * 0.006);
        float cloud = fbm(cloudUv);
        float cloudMask = smoothstep(0.36, 0.78, cloud) * smoothstep(-0.05, 0.25, elev) * exp(-max(0.0, elev) * 1.8);
        sky += horizonCol * cloudMask * 0.92;

        // Gentle high-altitude atmospheric light diffusion in smog clouds
        float cityBounce = 0.94 + 0.06 * sin(uTime * 0.55 + azim * 2.5);
        sky *= cityBounce;

        gl_FragColor = vec4(sky, uOpacity);
      }
    `,
  });
}

/**
 * Translucent Skyscraper Holographic Projection Shader with CRT scanlines & shimmer.
 */
export function createHologramAdShaderMaterial(
  tex: THREE.Texture,
  tintHex = '#22d3ee'
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: tex },
      uTint: { value: new THREE.Color(tintHex) },
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
      uniform sampler2D uTex;
      uniform vec3 uTint;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        // Gentle holographic phase drift (zero discontinuous step flicker)
        float drift = sin(uTime * 1.6 + vUv.y * 6.0) * 0.002;
        vec2 uv = vec2(vUv.x + drift, vUv.y);
        vec4 tex = texture2D(uTex, uv);

        float scan = 0.86 + 0.14 * sin(vUv.y * 92.0 - uTime * 3.2);
        float pulse = 0.94 + 0.06 * sin(uTime * 1.8 + vUv.y * 3.0);
        float edgeFade = smoothstep(0.0, 0.05, vUv.x) * (1.0 - smoothstep(0.95, 1.0, vUv.x))
                       * smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));

        vec3 col = mix(tex.rgb, tex.rgb * uTint * 1.35, 0.28) * scan * pulse;
        float alpha = (0.25 + 0.75 * max(tex.r, max(tex.g, tex.b))) * edgeFade * uOpacity;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col * 1.04, alpha);
      }
    `,
  });
}

/**
 * GPU-Animated Diagonal Falling Neon Rain Streaks.
 */
export function createRainStreakShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.42 },
    },
    vertexShader: `
      attribute float aSpeed;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vec3 pos = position;
        float fallSpan = 38.0;
        float yLoop = mod(pos.y - uTime * aSpeed + aPhase * fallSpan, fallSpan);
        pos.y = yLoop - 2.0;
        // Subtle wind slant
        pos.x += (fallSpan - yLoop) * 0.06;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float size = uPixelRatio * (180.0 / max(4.0, -mvPosition.z));
        gl_PointSize = clamp(size, 6.0, 26.0);
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = smoothstep(75.0, 6.0, -mvPosition.z) * smoothstep(0.0, 4.0, yLoop) * (1.0 - smoothstep(32.0, 38.0, yLoop));
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Thin diagonal raindrop streak inside point sprite
        vec2 uv = gl_PointCoord - 0.5;
        float dx = abs(uv.x + uv.y * 0.14);
        float streak = exp(-pow(dx * 24.0, 2.0)) * smoothstep(0.5, 0.05, abs(uv.y));
        float alpha = streak * vAlpha * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * 1.25, alpha);
      }
    `,
  });
}

/**
 * Rising Backlit Urban Steam & Mist Plume Shader.
 */
export function createSteamVentShaderMaterial(colorHex = '#38bdf8'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 0.24 },
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
      uniform float uOpacity;
      varying vec2 vUv;
      ${CYBER_NOISE_GLSL}

      void main() {
        float xFade = exp(-pow((vUv.x - 0.5) * 3.4, 2.0));
        float yFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        float billow = fbm(vec2(vUv.x * 3.8, vUv.y * 3.2 - uTime * 0.42));
        float alpha = xFade * yFade * billow * uOpacity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

/**
 * Volumetric Aerial Megatower Searchlight Beam Shader.
 */
export function createSearchlightConeShaderMaterial(colorHex = '#38bdf8'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 0.26 },
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
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float xFade = exp(-pow((vUv.x - 0.5) * 4.2, 2.0));
        float yFade = smoothstep(0.0, 0.08, vUv.y) * pow(1.0 - vUv.y, 1.45);
        float haze = 0.8 + 0.2 * sin(vUv.y * 12.0 - uTime * 1.4);
        float alpha = xFade * yFade * haze * uOpacity;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor * 1.35, alpha);
      }
    `,
  });
}
