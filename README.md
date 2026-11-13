# Quantum Link

[![Deploy to GitHub Pages](https://github.com/namanv2703/quantum-link/actions/workflows/deploy.yml/badge.svg)](https://github.com/namanv2703/quantum-link/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_Raymarching-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-DTLS_%2F_SCTP_E2EE-FF6B6B?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Quantum Link** is a 100% offline-capable, zero-server Peer-to-Peer (P2P) file streaming station, encrypted messaging & HD calling suite, and decentralized mesh node built exclusively on modern web standards.

It enables direct, end-to-end encrypted device-to-device communication over **WebRTC** without intermediary cloud databases, analytics telemetry, centralized storage, or mandatory external signaling servers.

Quantum Link runs seamlessly as:
1. **A GitHub Pages Web App**: Built cleanly to `dist/` with automated GitHub Actions continuous deployment.
2. **A Portable Single-File HTML Artifact**: Packaged via `vite-plugin-singlefile` into self-contained, zero-dependency HTML builds (`dist/index.html` and `build/index.html`) that execute offline from local storage or a USB drive over air-gapped local networks.
3. **A Full-Stack Node.js / Express & Go Service**: Supported by the bundled Express server (`server.ts`) and optional standalone Go WebSocket signaling engine (`server/nexussignaling/`).

---

## Table of Contents

- [Architectural Highlights](#architectural-highlights)
- [Vertical Scroll Experience & 3D Cosmic Stage](#vertical-scroll-experience--3d-cosmic-stage)
- [Material You & Clear Liquid Glass UI](#material-you--clear-liquid-glass-ui)
- [Core Feature Matrix](#core-feature-matrix)
- [Dual Signaling Engines](#dual-signaling-engines)
- [Bypass RAM Limits: Native Disk Streaming](#bypass-ram-limits-native-disk-streaming)
- [Offline Single-File Distribution](#offline-single-file-distribution)
- [Project File Structure](#project-file-structure)
- [Quick Start & Local Development](#quick-start--local-development)
- [Production Deployment](#production-deployment)
- [Privacy, Threat Model & Legal Compliance](#privacy-threat-model--legal-compliance)
- [Browser Compatibility](#browser-compatibility)
- [License](#license)

---

## Architectural Highlights

- **Air-Gapped Optical QR Handshaking**: Encodes compressed WebRTC SDP offers and answers (`src/lib/sdpCodec.ts`) into resilient QR codes rendered locally via `<SafeQRCode />`. Devices pair by scanning screens camera-to-camera or pasting compact tokens with zero internet packets required.
- **WebSocket Mesh Signaling Fallback**: Optional `/ws/nexus` signaling path for multi-peer room discovery and rapid session setup across local or remote hosts.
- **Zero Memory Bloat Disk Streaming**: Slices large payloads (tested 5GB+) into 64KB WebRTC SCTP-safe chunks with flow-control backpressure (`bufferedAmount < 512KB`) and streams directly to disk via `window.showSaveFilePicker()` (`FileSystemWritableFileStream`), keeping browser heap overhead minimal.
- **Encrypted Chat, Voice Notes & HD Calling**: Peer-to-peer SRTP audio/video calling with camera flipping, mic/camera track toggles, live spectrum feedback, draggable Picture-in-Picture (PiP), screen sharing, and push-to-talk waveform voice memos.
- **Decentralized Mesh Topology & Failover HUD**: Interactive canvas topology map, heartbeat latency tracking, automated host migration/election, and simulated network-split drills.
- **Zero External Runtime Assets**: Fonts (`@fontsource/*`), icons (`lucide-react`), QR canvas emblems, procedural sky/nebula textures, and GLSL shaders are completely bundled offline.

---

## Vertical Scroll Experience & 3D Cosmic Stage

Quantum Link uses a continuous vertical scrolling multi-section layout synchronized to an interactive 100% offline **Three.js WebGL** backdrop (`src/components/QuantumWebGLStage.tsx`):

1. **01 · Event Horizon Singularity (`#section-transceiver`)**: Role selection (`Host Room` / `Join Room`) and live WebRTC file streaming workbench.
2. **02 · Ionized Nebula Passage (`#section-chat`)**: Encrypted mesh chat channel, voice notes, and HD voice/video calls.
3. **03 · Barred Spiral Galaxy Core (`#section-qr`)**: Standalone QR Customisation Studio with color presets, corner styling, and offline canvas PNG emblem badges.
4. **04 · Binary Black Hole Jets (`#section-encoder`)**: Base64 and AES-256-GCM payload encoder/decoder utility.
5. **05 · Crimson Quasar Horizon (`#section-appearance`)**: Material You appearance customizer and launcher icon studio.

Scrolling through the page drives camera flight smoothly along a 5-waypoint `CatmullRomCurve3` spline through:
- **Schwarzschild Geodesic Ray-Marched Black Holes** (`src/three/shaders.ts`): Adaptive null-geodesic light bending producing gravitationally lensed upper and lower accretion arches, pitch-black event horizon shadows, ISCO photon rings, Keplerian plasma turbulence, and Doppler beaming.
- **Procedural 360° Milky Way Sky Dome & Nebulae** (`src/three/proceduralTextures.ts`): Offline pixel-synthesized galactic band with dark molecular dust lanes, domain-warped ridged-FBM nebulae, 26,000-star barred spiral galaxy, and 9,500 Harvard spectral-class stars with four-spike Newtonian diffraction sprites.
- **HDR Post-Processing**: GPU-accelerated `EffectComposer` with `UnrealBloomPass` and `OutputPass` (with automatic fallback on software WebGL renderers).

---

## Material You & Clear Liquid Glass UI

- **Android 16 Material You (M3 Expressive)**: Dynamic color generation from custom hex seeds or extracted uploaded wallpaper palettes (`src/lib/materialTheme.ts`).
- **Clear Liquid Glass (Dark Mode)**: Untinted refractive crystal surfaces (`backdrop-filter: blur(22px) saturate(165%)`, subtle specular diagonal highlights, and crisp rim outlines) so foreground panels float clearly over the 3D galaxy and black holes.
- **Accessibility & Micro-Interactions**: Light, Dark, and High-Contrast modes, squircle/pill geometry tokens (`16dp` / `28dp` / `9999px`), tabular numeric telemetry, and Web Vibration API haptic hooks.
- **Custom App Icon Presets**: Adaptive icon presets (`Dynamic Adaptive`, `Monochrome`, `Quantum Core`, `Obsidian Pulse`, `Solar Horizon`, `Blueprint Grid`) and launcher mask shapes (`Squircle`, `Circle`, `Teardrop`, `Soft Clover`, `Rounded 16dp`).

---

## Core Feature Matrix

| Module | Key Capabilities |
| :--- | :--- |
| **P2P Transceiver** | 64KB chunk streaming, live throughput metrics, cancel/retry support, and persistent Activity Feed. |
| **Direct Disk Streaming** | Streams payloads directly to disk via the File System Access API (`showSaveFilePicker()`), bypassing browser RAM limits. |
| **Persistent Sandbox Cache** | Uses `CacheStorage` for offline file staging, video/image/PDF/HTML inspection (`FilePreview.tsx`), and re-downloads. |
| **Encrypted Chat & Calls** | End-to-end encrypted messaging, waveform voice messages, HD voice/video calls, screen sharing, and PiP overlay. |
| **QR Customisation Studio** | Standalone QR generator and camera optical scanner (`html5-qrcode`) with custom eye styles, gradients, and offline emblems. |
| **Base64 & AES Codec** | Standalone UTF-8 / binary Base64 converter with authenticated cipher tooling. |
| **Mesh Map & Failover HUD** | Live interactive node graph, latency monitoring, host migration election, and simulation drills. |
| **Legal & Guide Hub** | Built-in 4-tab handbook covering setup guides, terminology glossary, offline workflows, and legal compliance. |

---

## Dual Signaling Engines

### 1. Zero-Server Optical Air-Gapped Handshaking
1. **Host Node** generates a WebRTC SDP offer compressed into a QR code and compact invite token.
2. **Joiner Node** scans the Host QR with their camera (or pastes the token) and outputs a Reply QR / token.
3. **Host Node** scans or pastes the Reply token to establish the direct **DTLS/SCTP** tunnel with zero external network dependencies.

### 2. WebSocket Mesh Signaling (`/ws/nexus`)
When peers connect via the hosted Express or Go signaling server, SDP offers/answers and ICE candidates exchange automatically over `/ws/nexus` before transitioning media and file streams directly peer-to-peer.

---

## Bypass RAM Limits: Native Disk Streaming

1. Sender enables **Direct Disk: ON** before queuing files.
2. Receiver approves the incoming transfer prompt (`DirectDownloadPromptModal.tsx`) and picks a save location with `window.showSaveFilePicker()`.
3. Incoming 64KB chunks pipe directly into `FileSystemWritableFileStream` to maintain low memory usage across multi-gigabyte files (with automatic blob fallback on unsupported browsers).

---

## Offline Single-File Distribution

`vite-plugin-singlefile` bundles all JavaScript, Tailwind CSS, offline fonts, shaders, and procedural textures into single standalone HTML files during `npm run build`:

- `dist/index.html` — Primary production static distribution & GitHub Pages entry point.
- `build/index.html` / `build/finalwork.html` — Portable standalone single-file HTML artifact.
- `private/finalwork.html` — Internal portable archive build.

Open `build/index.html` directly in any modern browser with zero Node.js server or internet connection required to use QR handshaking, QR Customisation Studio, Encoder, and Material You Customiser offline.

---

## Project File Structure

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml                  # Automated GitHub Pages CI/CD workflow
├── public/                             # Static public assets & offline icons
├── server/
│   └── nexussignaling/                 # Optional Go WebSocket signaling server package
│       ├── README.md
│       ├── client.go
│       ├── room.go
│       ├── signaling.go
│       └── types.go
├── src/
│   ├── components/
│   │   ├── Base64ToolNode.tsx          # Base64 & AES-256-GCM encoder/decoder utility
│   │   ├── CallOverlay.tsx             # M3 Expressive voice/video/screen-share overlay
│   │   ├── CookieConsentBanner.tsx     # Local-only storage disclosure banner
│   │   ├── DataStream.tsx              # Real-time packet transfer visual indicator
│   │   ├── DirectDownloadPromptModal.tsx # Direct-to-disk receiver confirmation modal
│   │   ├── EasterEggModal.tsx          # Diagnostic terminal & audio synth modal
│   │   ├── FilePreview.tsx             # Media, document & payload previewer
│   │   ├── IncomingCallModal.tsx       # Incoming call sheet with synthesized ringtone
│   │   ├── KineticPreloader.tsx        # Boot intro overlay
│   │   ├── LegalComplianceView.tsx     # Terms, privacy & air-gapped compliance view
│   │   ├── MaterialYouSettingsModal.tsx # Theme palette, wallpaper & app icon studio
│   │   ├── NetworkBackground.tsx       # Secondary particle canvas helper
│   │   ├── NexusFailoverHUD.tsx        # Mesh failover, host election & split drills
│   │   ├── NexusInfoModal.tsx          # Multi-tab user guide, glossary & legal hub
│   │   ├── NexusNetworkMap.tsx         # Interactive peer topology visualization
│   │   ├── PacketTransferAnimation.tsx # Live chunk transfer progress visualizer
│   │   ├── ProfileModal.tsx            # Local username, avatar color & bio editor
│   │   ├── QRScanner.tsx               # Camera QR code scanner (html5-qrcode)
│   │   ├── QRUtilityNode.tsx           # QR Customisation Studio & PNG badge renderer
│   │   ├── QuantumAppIcon.tsx          # Adaptive launcher icon renderer
│   │   ├── QuantumWebGLStage.tsx       # 3D galaxy, black holes, bloom & scroll spline
│   │   ├── SafeQRCode.tsx              # Resilient error-guarded QR SVG component
│   │   ├── SecureChatNode.tsx          # Encrypted chat, voice notes & call controls
│   │   ├── ViewProfileModal.tsx        # Connected peer profile inspector
│   │   └── VoiceMessagePlayer.tsx      # Audio note waveform player
│   ├── data/
│   │   └── legalPolicies.ts            # Offline legal, privacy & compliance documents
│   ├── lib/
│   │   ├── NexusNetworkNode.ts         # P2P mesh & WebSocket client coordinator
│   │   ├── cacheStorage.ts             # Browser CacheStorage payload staging
│   │   ├── diskStreamer.ts             # File System Access API streaming helper
│   │   ├── materialTheme.ts            # Material You token & Clear Liquid Glass engine
│   │   ├── nameGenerator.ts            # Procedural station callsign generator
│   │   ├── nexusFailover.ts            # Failover & host priority election logic
│   │   ├── sdpCodec.ts                 # Compact SDP compression & token codec
│   │   └── utils.ts                    # Shared class & byte formatting helpers
│   ├── nexus/                          # Multi-peer swarm coordination hooks & state
│   ├── three/
│   │   ├── proceduralTextures.ts       # Offline Milky Way, nebula & diffraction textures
│   │   └── shaders.ts                  # Schwarzschild ray-marched black hole & galaxy GLSL
│   ├── transfer/                       # Dedicated lightweight transfer client entry
│   ├── App.tsx                         # Vertical multi-section coordinator & WebRTC core
│   ├── index.css                       # Tailwind CSS v4 & Clear Liquid Glass tokens
│   ├── main.tsx                        # React mount & RootErrorBoundary
│   └── types.ts                        # Shared TypeScript interfaces
├── index.html                          # Root HTML entry point
├── metadata.json                       # Applet manifest & hardware permissions
├── package.json                        # Scripts & dependencies
├── server.ts                           # Express + Vite dev/production server
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Single-file Vite build configuration
└── vite.transfer.config.ts             # Transfer bundle Vite config
```

---

## Quick Start & Local Development

### Prerequisites
- **Node.js** `v18+` (Node 22 recommended)
- Modern WebRTC-capable browser

### Installation & Local Dev
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) across two tabs or devices on the same network.

### Type Checking
```bash
npm run lint
```

---

## Production Deployment

```bash
npm run build
npm start
```
`npm run build` compiles the Vite single-file client bundles into `dist/`, `build/`, and `private/`, and bundles `server.ts` into `dist/server.cjs`. `npm start` serves the app on `0.0.0.0:3000` (or `$PORT`) with WebSocket signaling at `/ws/nexus`.

---

## Privacy, Threat Model & Legal Compliance

- **Zero Cloud Storage**: Files and messages flow directly peer-to-peer and are never uploaded to third-party storage servers.
- **End-to-End Transport Encryption**: WebRTC DataChannels use **DTLS / SCTP** and media streams use **SRTP**.
- **No Telemetry**: Zero analytics scripts, tracking cookies, or external CDN calls.
- **Local Data Sovereignty**: Themes, profiles, and staged payloads stay locally inside `localStorage`, `CacheStorage`, and user-selected disk targets.

---

## Browser Compatibility

| Browser | WebRTC DataChannels | Optical QR Scanning | Direct Disk Streaming | Audio / Video Calling |
| :--- | :---: | :---: | :---: | :---: |
| **Google Chrome (v88+)** | Full | Full | Native File System Access API | Full |
| **Microsoft Edge (v88+)** | Full | Full | Native File System Access API | Full |
| **Brave / Chromium** | Full | Full | Native File System Access API | Full |
| **Mozilla Firefox (v90+)** | Full | Full | Blob Download Fallback | Full |
| **Apple Safari (macOS / iOS)** | Full | Full | Blob Download Fallback | Full |

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
