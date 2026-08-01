# Hexcast

> Mirror any screen, read any document.

**Hexcast** is a peer-to-peer screen mirroring system. Point a phone at a laptop
(or a laptop at a phone), enter one six-digit code, and video starts flowing
directly between the two devices — no accounts, no cloud, no cables, no apps
to install.

**HexRead** is its sibling, built into the same app: a document reader that
parses PDFs and DOCX entirely in your browser and reads them aloud using your
device's own voices. Drag a file in, press play — your document never leaves
the device.

---

## The Problem

Getting a screen from one device onto another is absurdly hard for something so
common. Ask anyone who's tried:

- **Platform lock-in.** AirPlay only works within Apple. Cast is Android-native.
  Miracast needs matching Wi-Fi Direct support on both ends. If the other
  person's device is "the wrong brand," you're done before you start.
- **Accounts, everywhere.** Most screen-sharing tools demand sign-ups, OAuth,
  or a corporate workspace. You shouldn't need to create a profile to show
  someone a screen.
- **Downloads and installs.** "Just install this app" is a cold open that kills
  most spontaneous shares — and it's a non-starter on a borrowed or work-locked
  device.
- **The cloud as a middleman.** Many services bounce your video through a
  server, adding latency, cost, and a copy of your screen on infrastructure you
  don't control.
- **Cables and adapters.** Dongles, HDMI, permissions, driver fights. In 2026,
  the tethering should have been the punchline, not the feature.

The core tension: *people want to share a screen as casually as they share a
thought — but every existing tool turns it into a setup ritual.*

## The Solution

Hexcast collapses the entire flow into three moves:

1. **The laptop prints a six-digit code.**
2. **The phone dials it.**
3. **Video flows peer-to-peer.**

That's it. The code is the handshake — there are no accounts, no downloads, no
brand check at the door. Any device with a modern browser is welcome:

- **Peer-to-peer by design.** WebRTC streams run directly between devices. The
  signal server only brokers the initial connection — it never sees your video.
- **Installable, everywhere.** The web app is a PWA — install it to a home
  screen on iOS or Android — and ships native wrappers via Capacitor for the
  app-store path.
- **Private by default.** A six-digit, per-session code. No login, no cloud
  relay, no stored media.

## Key Features

- **One-code pairing** — 6-digit room codes, regenerated per session, validated
  server-side.
- **HexRead document reader** — drop in a PDF or DOCX and it's parsed locally
  (PDF.js / Mammoth) and read aloud page by page via the Web Speech API, with
  male/female voice choice, speed control, and pause/jump. No uploads — parsing
  and speech happen entirely in the browser.
- **True peer-to-peer** — direct WebRTC `RTCPeerConnection`; media never touches
  the signaling server.
- **Works in any modern browser** — no install needed to receive or send.
- **True iPhone screen mirroring** — the iOS app ships a native ReplayKit +
  WebRTC bridge (`frontend/plugins/hexcast-screen-share`), so an iPhone can
  mirror its real screen to the laptop even though browsers and WebViews can't
  capture a screen.
- **PWA + native shells** — installable on desktop, Android, and iOS
  (Capacitor), with a service worker and offline-first app shell.
- **Automatic reconnection** — the socket layer reconnects and resets gracefully
  on peer drop or disconnect.
- **Configurable deployment** — signaling URL and ICE servers are set at build
  time via environment variables.

## How It Works

```
Laptop (receiver)          Signal server               Phone (sender)
    │  joins room ────────────► │ ◄────────────── joins room
    │                           │  (last device in wins a slot)
    │        ◄──── ready ───────│────── ready ──────►
    │                           │                     getDisplayMedia()
    │   ◄──── WebRTC offer ─────│───── offer ────────►
    │ ───── answer/ICE ─────────│───── ICE ──────────►
    │  ◄══════ peer-to-peer media (never touches server) ══════►
```

Roles are explicit and mirrored: **Laptop = Receiver**, **Phone = Sender**.
The phone captures its screen, the laptop renders it in a full 16:9 stage with
live session status. Pairing is gated on a `ready` handshake so the offer is
only ever sent once both sides are live.

### Capturing the phone's screen

No browser (or WebView) can capture an iPhone screen — `getDisplayMedia` doesn't
exist there. So the phone side works in two modes:

- **Web / PWA**: falls back to camera when a screen source isn't available.
- **iOS native app**: the `hexcast-screen-share` Capacitor plugin runs a real
  screen capture via ReplayKit (`RPScreenRecorder.startCapture`), feeds the
  frames into the Google WebRTC iOS SDK, and runs the `RTCPeerConnection`
  natively. The React layer keeps owning the Socket.io signaling — it only
  relays offers/answers/ICE candidates between the plugin and the server, so
  the existing backend and laptop receiver are untouched.

The plugin ships as a local Swift Package (`frontend/plugins/hexcast-screen-share`)
and is wired into the Xcode project automatically by `npx cap sync ios`
(WebRTC comes from `github.com/stasel/WebRTC` via Swift Package Manager).

## Building the iOS app without a Mac

There's no Mac required to *code* this repo, and a GitHub Actions macOS runner
can compile it for you. The workflow is `.github/workflows/build-ios.yml`.

1. **Push** the repo to GitHub.
2. Open **Actions → Build iOS app → Run workflow**. With no Apple secrets it
   runs an unsigned compile check (proves the native code builds) and uploads
   the raw `.app`.
3. To get an **installable `.ipa`**, the workflow needs Apple signing secrets:

   | Secret                         | What it is                                              |
   | ------------------------------ | ------------------------------------------------------- |
   | `APPLE_CERTIFICATE_P12`        | Your signing certificate + private key, base64-encoded  |
   | `APPLE_CERTIFICATE_PASSWORD`   | Password for that `.p12`                                |
   | `KEYCHAIN_PASSWORD`            | Any strong password (used for the throwaway keychain)   |
   | `DEVELOPMENT_TEAM`             | Your 10-char Apple team ID                              |
   | `APPLE_PROVISIONING_PROFILE`   | *(optional)* base64 of your `.mobileprovision`          |

   Certificates and profiles come from the Apple Developer portal
   (`developer.apple.com/account`). A **paid** membership lets you create a
   certificate and an Ad Hoc / App Store profile entirely from the web portal
   (export the cert as a `.p12`), then run the workflow with
   `export_method: ad-hoc` and sideload the resulting `.ipa`
   (AltStore / Sideloadly / TestFlight). A free Apple ID can only provision
   through Xcode, which needs a Mac at least once.

After the first signed build, every `npm run ios:sync`/push that touches the
iOS or native-plugin files can re-run the workflow and pull a fresh `.ipa` from
the **Actions → Build iOS app → Artifacts** tab.

## Tech Stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Frontend   | React 19 + Vite 8                       |
| Signaling  | Node.js + Express + Socket.io           |
| Media      | WebRTC (getUserMedia / getDisplayMedia) |
| Mobile     | Capacitor 8 (Android + iOS wrappers)    |
| iOS media  | ReplayKit + Google WebRTC iOS SDK (SPM) |
| Documents  | PDF.js + Mammoth (in-browser parsing)   |
| Speech     | Web Speech API (local synthesis)        |
| Install    | PWA (vite-plugin-pwa, auto-update)      |
| Fonts/UI   | Geist Mono + Playfair Display, charcoal monochrome editorial system |

## Getting Started

Requirements: Node.js 18+ (Node 20+ recommended).

### 1. Run the signaling server

```bash
cd backend
npm install
npm run dev        # or: npm start
```

Server listens on `http://localhost:5000` and exposes `GET /health`.

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server
```

Open the printed URL. The default points at the hosted backend
(`https://hex-cast-backend.onrender.com`); to run against a local server,
create `frontend/.env`:

```
VITE_SOCKET_URL=http://localhost:5000
```

### ICE servers (STUN / TURN)

ICE servers are configured with build-time env vars in `frontend/.env`
(consumed by `frontend/src/config.js`):

- `VITE_STUN_URLS` — comma-separated STUN servers. Defaults to Google's public
  server: `stun:stun.l.google.com:19302`.
- `VITE_TURN_URLS`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` — optional
  TURN relay, used when peers are behind strict firewalls/NATs that STUN can't
  get through (e.g. cross-network mobile → desktop). Provide the username and
  credential issued by your TURN provider.

```
VITE_STUN_URLS=stun:stun.l.google.com:19302
VITE_TURN_URLS=turn:your-relay.example.com:3478
VITE_TURN_USERNAME=user
VITE_TURN_CREDENTIAL=pass
```

Because these are `VITE_*` variables, they are baked into the bundle at build
time — rebuild (`npm run build`) after changing them.

### 3. Try it

1. Open the app on your laptop → **I'm a laptop** → note the six-digit code.
2. Open the app on a phone (same Wi-Fi or LAN) → **I'm a phone** → dial the code.
3. Share a window or camera. Video appears on the laptop.

## Live Deployment

The app is live on Render:

| Service  | URL                                          |
| -------- | -------------------------------------------- |
| Frontend | <https://hex-cast.onrender.com>              |
| Backend  | <https://hex-cast-backend.onrender.com>      |

Notes:

- `VITE_SOCKET_URL` is baked into the bundle at **build time**, so the
  frontend's `dist/` must be rebuilt with it set to
  `https://hex-cast-backend.onrender.com` (either via a Render env var or the
  default in `frontend/src/config.js`). `npm run build` then deploy `dist/`.
- The backend's CORS is open (`origin: '*'`), which is what allows the
  cross-origin socket connection from the hosted frontend.
- Render free-tier services sleep after ~15 minutes of inactivity. Two
  keepalives keep the backend warm: the backend self-pings its `/health`
  endpoint every 4 minutes using Render's automatic `RENDER_EXTERNAL_URL`
  (override with `SELF_URL`), and every open tab of the frontend pings the same
  endpoint every 4 minutes (`src/keepalive.js`). Tune with the
  `KEEPALIVE_INTERVAL_MS` env var.

## Project Structure

```
screen-mirror-app/
├── .github/workflows/
│   └── build-ios.yml          # macOS CI: build + sign the iOS app (no local Mac needed)
├── backend/
│   └── index.js              # Express + Socket.io signaling server
└── frontend/
    ├── plugins/
    │   └── hexcast-screen-share/   # Native Capacitor iOS plugin:
    │       ├── Package.swift       #   SPM manifest (Capacitor + WebRTC)
    │       └── ios/Sources/.../HexcastScreenSharePlugin.swift  # ReplayKit + RTCPeerConnection
    ├── src/
    │   ├── App.jsx           # View state machine + landing (home/laptop/phone/reader/info pages)
    │   ├── config.js         # SOCKET_URL + ICE_SERVERS
    │   ├── keepalive.js      # Frontend-side keepalive ping to the backend
    │   ├── native/screenShare.js  # JS handle to the native ScreenShare plugin
    │   └── components/
    │       ├── Chrome.jsx    # Navbar, StatusPill, Footer, icons
    │       ├── Reader.jsx    # HexRead: PDF/DOCX parsing + text-to-speech
    │       ├── InfoPages.jsx # About / FAQ / Privacy
    │       ├── LaptopReceiver.jsx   # WebRTC answerer
    │       └── MobileSender.jsx     # WebRTC offerer (native iOS path included)
    ├── android/              # Capacitor Android shell
    ├── ios/                  # Capacitor iOS shell (SPM-based)
    ├── vite.config.js        # Vite + PWA plugin
    └── capacitor.config.json
```

## Roadmap

- [x] **Native iPhone screen projection (iOS)** — the `hexcast-screen-share`
  plugin mirrors the real iPhone screen via ReplayKit + WebRTC. Build it with
  the GitHub Actions workflow (see "Building the iOS app without a Mac").
- [x] **HexRead document reader** — in-browser PDF/DOCX parsing and local
  text-to-speech, shipped as a first-class "sibling" feature of the app.
- [ ] **Android screen projection** — the Android WebView also blocks
  `getDisplayMedia`; the same seam is ready for a `MediaProjection` plugin
  (the Android app currently mirrors the camera).
- [x] **TURN relay support** — optional TURN is now configurable at build time
  via `VITE_TURN_URLS` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`
  (see "ICE servers" above) for reliable cross-network mirroring behind strict
  NATs.
- [ ] Room expiry + presence (auto-close empty codes).

## Design

The UI follows a strict anti-"AI-slop" system — charcoal monochrome, Geist Mono,
hairline 1px borders, and a physics-based motion engine (a single cinematic
curve: `cubic-bezier(0.16, 1, 0.3, 1)`).

---

Built by **[Prince Kay](https://github.com/kaykay28748)**.

If Hexcast solved a real problem for you, **[★ star the repo](https://github.com/kaykay28748/screen-mirror-app)** —
it directly keeps this project moving.
