import * as THREE from 'three';

/**
 * Dreamy Frutiger Aero sunlit sky dome:
 * - Light Mode: Iconic Windows Bliss / Vista vibrant cerulean zenith -> luminous turquoise-aqua sky -> sunlit horizon
 * - Dark Mode: Rich deep-cerulean Windows Vista Aurora twilight so Clear Liquid Glass white text pops cleanly
 * Includes sunlit golden-white sun disc, pastel rainbow prism halo, high cirrus wisps, and emerald-cyan aurora curtains.
 */
export function createAeroSkyDomeShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDarkFactor: { value: 0.0 },
      uSunDir: { value: new THREE.Vector3(0.46, 0.42, -0.78).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDarkFactor;
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
          mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = p * 2.03 + vec2(11.3, 5.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, -0.25, 1.0);
        float hPos = clamp(d.y, 0.0, 1.0);

        // Classic bright sunlit Frutiger Aero Bliss / Vista sky palette
        vec3 dayZenith  = vec3(0.01, 0.30, 0.82);
        vec3 dayMid     = vec3(0.04, 0.62, 0.95);
        vec3 dayHorizon = vec3(0.56, 0.94, 1.00);
        vec3 dayBelow   = vec3(0.06, 0.52, 0.66);

        // Deep rich Vista Aurora cerulean-teal sky for crisp white Clear Liquid Glass contrast in Dark Mode
        vec3 darkZenith  = vec3(0.008, 0.065, 0.20);
        vec3 darkMid     = vec3(0.014, 0.17, 0.36);
        vec3 darkHorizon = vec3(0.04, 0.36, 0.48);
        vec3 darkBelow   = vec3(0.01, 0.11, 0.19);

        vec3 zenith  = mix(dayZenith, darkZenith, uDarkFactor);
        vec3 midSky  = mix(dayMid, darkMid, uDarkFactor);
        vec3 horizon = mix(dayHorizon, darkHorizon, uDarkFactor);
        vec3 below   = mix(dayBelow, darkBelow, uDarkFactor);

        vec3 sky = mix(horizon, midSky, smoothstep(0.0, 0.32, hPos));
        sky = mix(sky, zenith, smoothstep(0.24, 0.84, hPos));
        if (h < 0.0) {
          sky = mix(horizon, below, smoothstep(0.0, -0.20, h));
        }

        // Dreamy Windows Vista emerald-aqua sky aurora curtain arching overhead
        float az = atan(d.z, d.x);
        float auroraWave = sin(az * 2.4 + uTime * 0.14) * 0.11 + cos(az * 4.1 - uTime * 0.1) * 0.055;
        float auroraBand = exp(-pow((d.y - (0.31 + auroraWave)) * 6.8, 2.0));
        float auroraShimmer = 0.58 + 0.42 * fbm(vec2(az * 3.0 + uTime * 0.08, d.y * 8.0));
        vec3 auroraCol = mix(vec3(0.08, 0.88, 0.82), vec3(0.32, 0.94, 0.44), sin(az * 1.8 + 0.8) * 0.5 + 0.5);
        sky += auroraCol * auroraBand * auroraShimmer * mix(0.22, 0.36, uDarkFactor);

        // High sunlit wispy cirrus clouds
        if (d.y > 0.03) {
          vec2 cloudUv = d.xz / (d.y + 0.24) * 1.15 + vec2(uTime * 0.012, -uTime * 0.008);
          float c1 = fbm(cloudUv * 1.4);
          float c2 = fbm(cloudUv * 2.8 + vec2(3.1, -2.4));
          float wisps = smoothstep(0.49, 0.82, c1 * 0.68 + c2 * 0.32) * smoothstep(0.03, 0.24, d.y) * smoothstep(0.95, 0.35, d.y);
          vec3 wispCol = mix(vec3(0.96, 0.99, 1.0), vec3(0.28, 0.64, 0.82), uDarkFactor);
          sky = mix(sky, wispCol, wisps * mix(0.48, 0.24, uDarkFactor));
        }

        // Radiant Frutiger Aero sun disc + dreamy pastel rainbow prism halo
        vec3 sDir = normalize(uSunDir);
        float sunDot = max(dot(d, sDir), 0.0);
        float sunCore = smoothstep(0.9974, 0.9995, sunDot);
        float sunHalo = pow(sunDot, 18.0) * 0.58 + pow(sunDot, 4.5) * 0.18;

        // Subtle rainbow lens halo ring around the sun
        float ringAngle = acos(clamp(sunDot, -1.0, 1.0));
        float rRing = exp(-pow((ringAngle - 0.22) * 26.0, 2.0));
        float gRing = exp(-pow((ringAngle - 0.24) * 26.0, 2.0));
        float bRing = exp(-pow((ringAngle - 0.26) * 26.0, 2.0));
        vec3 prismHalo = vec3(rRing * 1.0, gRing * 0.95, bRing * 1.05) * mix(0.20, 0.12, uDarkFactor);

        vec3 sunTint = mix(vec3(1.0, 0.99, 0.88), vec3(0.45, 0.88, 1.0), uDarkFactor * 0.55);
        sky += sunTint * sunHalo * mix(0.82, 0.38, uDarkFactor);
        sky += vec3(1.0, 0.99, 0.95) * sunCore * mix(1.25, 0.72, uDarkFactor);
        sky += prismHalo;

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
}

/**
 * Iconic Windows Vista / PlayStation XMB / Frutiger Aero glossy flowing silk-glass aurora ribbon.
 */
export function createAeroAuroraRibbonShaderMaterial(
  colorA: string,
  colorB: string,
  phaseOffset = 0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: phaseOffset },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: 0.42 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPhase;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave1 = sin(uv.x * 8.5 + uTime * 0.65 + uPhase) * 0.62;
        float wave2 = cos(uv.x * 4.2 - uTime * 0.42 + uPhase * 1.7) * 0.45;
        pos.y += (wave1 + wave2) * (0.45 + 0.55 * sin(uv.y * 3.14159));
        pos.z += sin(uv.x * 5.0 + uv.y * 3.0 + uTime * 0.5 + uPhase) * 0.32;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPhase;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        float along = sin(vUv.x * 3.14159265);
        float across = sin(vUv.y * 3.14159265);
        float edgeGlow = pow(across, 0.65) * smoothstep(0.0, 0.14, along);

        float streak1 = 0.5 + 0.5 * sin(vUv.y * 14.0 + sin(vUv.x * 7.0 + uTime * 0.55 + uPhase) * 2.2);
        float streak2 = 0.5 + 0.5 * cos(vUv.y * 22.0 - uTime * 0.8 + vUv.x * 11.0);
        float silk = pow(streak1, 2.2) * 0.65 + pow(streak2, 3.0) * 0.45;

        float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float specularEdge = pow(clamp(rim, 0.0, 1.0), 1.8) * 0.65;

        vec3 col = mix(uColorA, uColorB, vUv.x * 0.7 + streak1 * 0.3);
        col += vec3(0.85, 0.98, 1.0) * (silk * 0.40 + specularEdge * 0.32);

        float alpha = edgeGlow * (0.24 + silk * 0.54 + specularEdge * 0.28) * uOpacity;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.82));
      }
    `,
  });
}

/**
 * Glossy iridescent Frutiger Aero soap/water bubble shader:
 * Thin-film rainbow interference, Fresnel crystal rim, emerald meadow bounce,
 * and iconic crisp curved white studio-window gloss highlight.
 */
export function createSoapBubbleShaderMaterial(tintHex = '#7ce8ff'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(tintHex) },
      uLightDir: { value: new THREE.Vector3(0.45, 0.68, 0.58).normalize() },
      uOpacity: { value: 0.94 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      void main() {
        vLocalPos = position;
        vec3 pos = position;
        float wobble = sin(position.x * 3.8 + uTime * 1.4) * cos(position.y * 3.4 - uTime * 1.1) * 0.008;
        pos += normal * wobble;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec3 uLightDir;
      uniform float uOpacity;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      vec3 thinFilmIridescence(float phase) {
        return 0.5 + 0.5 * cos(6.28318 * (phase + vec3(0.0, 0.33, 0.67)));
      }

      void main() {
        vec3 N = normalize(vNormalWorld);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);

        float ndotv = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 2.25);

        // Swirling thin-film rainbow interference
        float swirl = sin(vLocalPos.y * 4.5 + uTime * 0.55) * 0.16 + cos(vLocalPos.x * 3.8 - uTime * 0.4) * 0.14;
        vec3 irid = thinFilmIridescence((1.0 - ndotv) * 1.55 + swirl + uTime * 0.04);

        // Iconic glossy Frutiger Aero dual curved sun-window specular highlights (bloom-safe smoothness)
        float specMain = pow(max(dot(N, H), 0.0), 46.0);
        // Classic Aero top-left glossy curved crescent reflection
        vec3 Lwin = normalize(vec3(-0.36, 0.72, 0.60));
        vec3 Hwin = normalize(Lwin + V);
        float specWindow = smoothstep(0.89, 0.965, max(dot(N, Hwin), 0.0)) * 0.72;

        vec3 L2 = normalize(vec3(-0.62, -0.35, 0.70));
        vec3 H2 = normalize(L2 + V);
        float specRimBounce = pow(max(dot(N, H2), 0.0), 22.0) * 0.40;

        // Soft upper-hemisphere glossy glass dome highlight
        float topGloss = smoothstep(0.56, 0.90, N.y) * smoothstep(0.18, 0.65, ndotv) * 0.28;

        // Bottom emerald meadow bounce inside the water sphere
        float groundBounce = smoothstep(-0.12, -0.85, N.y) * 0.36;

        vec3 col = mix(uTint, irid, 0.64) * (0.45 + 0.80 * fresnel);
        col += vec3(0.20, 0.92, 0.52) * groundBounce * (0.35 + 0.65 * fresnel);
        col += vec3(0.90, 0.99, 1.0) * (topGloss + specWindow * 0.82);
        col += vec3(0.60, 0.95, 1.0) * specRimBounce;
        col += vec3(1.0, 1.0, 1.0) * specMain * 0.95;

        float alpha = clamp(
          0.09 + fresnel * 0.78 + specMain * 0.75 + specWindow * 0.68 + topGloss * 0.45 + specRimBounce * 0.30,
          0.0,
          0.95
        ) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Crystal-clear tropical turquoise lagoon water shader with luminous animated sunlit caustics,
 * sky reflection Fresnel, and soft emerald shoreline fade.
 */
export function createCrystalWaterShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: {
      uTime: { value: 0 },
      uDarkFactor: { value: 0.0 },
      uSunDir: { value: new THREE.Vector3(0.46, 0.42, -0.78).normalize() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float r = length(pos.xy);
        float edgeDamp = 1.0 - smoothstep(18.0, 34.0, r);
        float w1 = sin(pos.x * 0.28 + uTime * 1.05) * 0.05;
        float w2 = cos(pos.y * 0.34 - uTime * 0.85) * 0.04;
        pos.z += (w1 + w2) * edgeDamp;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDarkFactor;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      float causticPattern(vec2 p, float t) {
        vec2 i = p;
        float c = 0.0;
        float inten = 0.062;
        for (int n = 0; n < 4; n++) {
          float fn = float(n + 1);
          float tt = t * (0.44 - 0.06 * fn);
          i = p + vec2(
            cos(tt - i.x) + sin(tt + i.y),
            sin(tt - i.y) + cos(tt + i.x)
          );
          c += 1.0 / max(length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))), 0.008);
        }
        c /= 4.0;
        c = 1.18 - pow(c, 1.38);
        return clamp(pow(abs(c), 4.0), 0.0, 1.0);
      }

      void main() {
        vec2 p = vWorldPos.xz * 0.16;
        float camDist = length(cameraPosition - vWorldPos);
        float distFade = 1.0 - smoothstep(20.0, 52.0, camDist);

        float cA = causticPattern(p, uTime * 0.65);
        float cB = causticPattern(p * 1.35 + vec2(2.4, -1.7), -uTime * 0.50);
        float caustics = clamp((cA * 0.62 + cB * 0.38) * distFade, 0.0, 0.85);

        float nx = (cos(vWorldPos.x * 0.44 + uTime * 1.15) * 0.06 + sin(vWorldPos.z * 0.54 - uTime * 0.95) * 0.05) * distFade;
        float nz = (sin(vWorldPos.z * 0.48 + uTime * 1.05) * 0.06 + cos(vWorldPos.x * 0.40 + uTime * 0.85) * 0.05) * distFade;
        vec3 N = normalize(vec3(nx, 1.0, nz));
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);
        vec3 H = normalize(L + V);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        float spec = pow(max(dot(N, H), 0.0), 42.0) * distFade;

        vec3 shallowDay = vec3(0.03, 0.82, 0.90);
        vec3 deepDay    = vec3(0.00, 0.42, 0.78);
        vec3 shallowDk  = vec3(0.02, 0.34, 0.48);
        vec3 deepDk     = vec3(0.008, 0.12, 0.28);

        vec3 shallow = mix(shallowDay, shallowDk, uDarkFactor);
        vec3 deep    = mix(deepDay, deepDk, uDarkFactor);
        vec3 skyRefl = mix(vec3(0.55, 0.94, 1.0), vec3(0.08, 0.44, 0.66), uDarkFactor);

        float distCenter = length(vWorldPos.xz - vec2(0.0, -18.0));
        float depthMix = smoothstep(4.0, 22.0, distCenter);
        vec3 waterCol = mix(shallow, deep, depthMix * 0.68);

        // Shimmering aqua pool caustics & bloom-safe sunlit water specular
        waterCol += vec3(0.45, 0.98, 1.0) * caustics * mix(0.46, 0.34, uDarkFactor);
        waterCol = mix(waterCol, skyRefl, clamp(fresnel * 0.64, 0.0, 0.72));
        waterCol += vec3(1.0, 1.0, 0.96) * spec * mix(0.75, 0.48, uDarkFactor);

        float edgeFade = 1.0 - smoothstep(23.0, 36.0, distCenter);
        gl_FragColor = vec4(waterCol, clamp(0.88 * edgeFade, 0.0, 0.92));
      }
    `,
  });
}

/**
 * Volumetric sunlit Frutiger Aero god-ray / sunbeam shaft shader.
 */
export function createAeroSunbeamShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.14 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float horiz = sin(vUv.x * 3.14159265);
        float vert = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.12, vUv.y);
        float rays = 0.55 + 0.45 * sin(vUv.x * 16.0 + uTime * 0.32) * cos(vUv.x * 9.0 - uTime * 0.21);
        vec3 col = mix(vec3(0.55, 0.97, 1.0), vec3(1.0, 0.98, 0.84), vUv.y);
        float alpha = pow(horiz, 1.5) * vert * rays * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Dreamy floating Frutiger Aero bokeh light-orbs & glistening dewdrop sparkles.
 */
export function createAeroBokehParticleShaderMaterial(pixelRatio: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0.72 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aScale;
      attribute float aPhase;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vPhase;

      void main() {
        vColor = aColor;
        vPhase = aPhase;
        vec3 pos = position;
        pos.y += mod(uTime * (0.28 + aScale * 0.08) + aPhase * 6.0, 26.0) - 13.0;
        pos.x += sin(uTime * 0.45 + aPhase * 5.0) * 0.65;
        pos.z += cos(uTime * 0.38 + aPhase * 4.2) * 0.55;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        float pulse = 0.82 + 0.26 * sin(uTime * 1.4 + aPhase * 12.0);
        gl_PointSize = clamp((aScale * 140.0 * pulse * uPixelRatio) / max(-mvPos.z, 1.5), 3.0, 62.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vPhase;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;

        float softDisc = smoothstep(0.5, 0.14, r) * 0.44;
        float ring = smoothstep(0.49, 0.41, r) * smoothstep(0.30, 0.40, r) * 0.72;
        float glint = smoothstep(0.16, 0.0, length(uv - vec2(-0.14, -0.14))) * 0.85;
        float alpha = clamp(softDisc + ring + glint, 0.0, 1.0) * uOpacity;

        vec3 col = vColor + vec3(0.45, 0.55, 0.6) * (ring + glint);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}
