# Hexcast

> Cast a screen, anywhere, in seconds.

**Hexcast** is a peer-to-peer screen mirroring system. Point a phone at a laptop
(or a laptop at a phone), enter one six-digit code, and video starts flowing
directly between the two devices — no accounts, no cloud, no cables, no apps
to install.

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
- **True peer-to-peer** — direct WebRTC `RTCPeerConnection`; media never touches
  the signaling server.
- **Works in any modern browser** — no install needed to receive or send.
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

## Tech Stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Frontend   | React 19 + Vite 8                       |
| Signaling  | Node.js + Express + Socket.io           |
| Media      | WebRTC (getUserMedia / getDisplayMedia) |
| Mobile     | Capacitor 8 (Android + iOS wrappers)    |
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

ICE servers (TURN/STUN) are configured in `frontend/src/config.js`.

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
├── backend/
│   └── index.js              # Express + Socket.io signaling server
└── frontend/
    ├── src/
    │   ├── App.jsx           # Role selection / landing
    │   ├── config.js         # SOCKET_URL + ICE_SERVERS
    │   ├── keepalive.js      # Frontend-side keepalive ping to the backend
    │   └── components/
    │       ├── Chrome.jsx    # Navbar, StatusPill, Footer, icons
    │       ├── LaptopReceiver.jsx   # WebRTC answerer
    │       └── MobileSender.jsx     # WebRTC offerer
    ├── android/              # Capacitor Android shell
    ├── ios/                  # Capacitor iOS shell
    ├── vite.config.js        # Vite + PWA plugin
    └── capacitor.config.json
```

## Roadmap

- [ ] **Native screen projection** — the browser blocks `getDisplayMedia` inside
  the Capacitor webview, so the mobile app currently mirrors the camera. A
  native bridge (Android `MediaProjection`, iOS `ReplayKit`) sits behind the
  `getScreenStream()` seam in `MobileSender.jsx` and will unlock true screen
  capture on device builds.
- [ ] Room expiry + presence (auto-close empty codes).
- [ ] Optional low-latency relay fallback for hostile NATs.

## Design

The UI follows a strict anti-"AI-slop" system — charcoal monochrome, Geist Mono,
hairline 1px borders, and a physics-based motion engine (a single cinematic
curve: `cubic-bezier(0.16, 1, 0.3, 1)`).

---

Built by **[Prince Kay](https://github.com/kaykay28748)**.

If Hexcast solved a real problem for you, **[★ star the repo](https://github.com/kaykay28748/screen-mirror-app)** —
it directly keeps this project moving.
