# Hexcast — Architecture Guide

Everything that is actually running, explained in the order you'd meet it while
building. Read it top to bottom once, then keep it as a map.

**The app in one line:** two devices join a room using a shared 6-digit code,
the signaling server hands them each other's addresses, and then video flows
directly between them over WebRTC — the server never touches the video.

```
Laptop (receiver)        Signal server (Node)          Phone (sender)
    │                          │                            │
    │  socket 'join-room'  ────►│◄──── socket 'join-room'    │
    │                          │ (stores both socket ids)   │
    │          ◄───── 'ready' ──┼──── 'ready' ────────────►  │
    │                          │                            │
    │   ◄── WebRTC offer (SDP) ─┼── offer relayed ────────── │
    │  answer (SDP) ───────────►│─────────────►             │
    │  ICE candidates ◄───────► │ ◄────────────────────►    │
    │                          │                            │
    │        ◄════════════ direct media, server never sees it ════════════► │
```

Two moving parts exist in the repo:

| Part       | Where            | What it does                                  |
| ---------- | ---------------- | --------------------------------------------- |
| Backend    | `backend/index.js` | Socket.io signaling server — rooms, pairing, relay |
| Frontend   | `frontend/`      | React app — three views, WebRTC on both roles |

There is no database, no auth, no cloud relay for media. That is the whole
product.

---

## 1. The big idea: signaling vs. media

WebRTC is confusing until you separate two very different jobs:

1. **Signaling** — "I exist, here's my room, please connect me to whoever else
   is here." Slow, tiny messages (a few hundred bytes). This goes through your
   server (Socket.io over a WebSocket).
2. **Media** — actual video frames. Heavy, constant, real-time. This goes
   *directly* between the two browsers over a peer-to-peer connection, after
   the signaling server has brokered the introduction.

Why not just send video through the server? Latency, bandwidth cost, and privacy
— the server would have to copy every frame. P2P means the server only ever
sees "two sockets were in a room and passed some small JSON around."

---

## 2. The signaling server (`backend/index.js`)

A tiny Express app that mounts a Socket.io server on port 5000.

```js
const app = express();
app.get('/health', ...);                      // handy health check
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
```

That `/health` endpoint is why you can open `http://localhost:5000/health` to
confirm the server is up. CORS is wide open (`*`) because in dev the web app
runs on a different port than the server.

### The room map — the entire "database"

```js
const roomDevices = {};
// { '482913': { laptopSocketId: 'abc...', phoneSocketId: 'xyz...' } }
```

A Socket.io *socket id* is a random per-connection token. `roomDevices` maps a
6-digit code → the socket ids of whoever claimed the two slots. `getRoom(code)`
lazily creates an empty room object so the code can be written defensively.

### `join-room` — how pairing works (`index.js:61`)

Every device runs this when it connects:

1. **Validate** — room code must be a 6-digit string (`/^\d{6}$/`), device type
   must be `laptop` or `phone`. Bad input → `'error'` event, socket never joins.
2. **Claim a slot** — the room keeps `laptopSocketId` and `phoneSocketId`.
   If a slot is already taken by a *different* socket, the previous socket is
   told to `leave()` the room ("last device in wins a slot").
3. **Join + check** — the socket joins the Socket.io room named by the code.
   Once **both** slots are filled, the server broadcasts `'ready'` to the room.

That `'ready'` is the lynchpin of the whole flow: neither side starts building
its WebRTC connection until the server confirms both devices are present.

### `signal` — the dumb relay (`index.js:103`)

```js
socket.on('signal', ({ roomCode, data }) => {
  socket.to(roomCode).emit('signal', data);
});
```

`socket.to(roomCode)` = "send to everyone in this room *except me*." The server
has zero understanding of what `data` is (an offer? an answer? an ICE
candidate?) — it just forwards the JSON. That's the correct amount of
intelligence for a signaling server to have.

### `disconnect` — cleanup (`index.js:120`)

When a socket drops (page closed, network cut), `removeSocketFromRooms`
walks every room, deletes the matching slot, and if the room is now empty it
deletes the room. If a peer was left behind, it emits `'peer-disconnected'` so
the survivor can tear down its WebRTC connection and show "Waiting…" again.

**What the server never does:** hold video, store media, or run WebRTC. It's a
matchmaker, not a courier.

### Keepalive — staying alive on Render

Render free-tier web services sleep after ~15 min without inbound traffic, and
take ~50s to cold-start when woken. The backend fights this by pinging its own
`/health` endpoint every 4 minutes:

```js
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || '';
if (SELF_URL) {
  const ping = () =>
    fetch(`${SELF_URL}/health`)
      .catch(() => {})
      .finally(() => setTimeout(ping, KEEPALIVE_INTERVAL_MS));
  setTimeout(ping, KEEPALIVE_INTERVAL_MS);
}
```

`RENDER_EXTERNAL_URL` is set automatically by Render (it's the service's own
public URL), so this runs on the hosted backend and is a no-op locally. The
frontend has a second keepalive (`src/keepalive.js`): every open tab pings the
same `/health` endpoint every 4 minutes. Together, the backend can't fall
asleep — and a recursive `setTimeout` (rather than `setInterval`) guarantees a
new ping is never scheduled while the previous one is still in flight.

---

## 3. Frontend entry point

```
index.html      → mounts #root, loads fonts + PWA meta
main.jsx        → imports the three stylesheets, renders <App/>
```

### The CSS load order (a real gotcha — see §11.5)

```jsx
// main.jsx
import './index.css'   // design tokens + reset
import App from './App.jsx'   // App.jsx itself imports './App.css'
import './mobile.css'  // mobile overrides, MUST be last
```

CSS rules aren't scoped per-component here; they cascade file-by-file, and
later files win on equal specificity. `mobile.css` has to be imported **after**
`App.jsx` resolves, or the base desktop styles override every mobile rule
(this actually happened and produced a broken phone layout — see §11.5).

---

## 4. `config.js` — the two things WebRTC needs

```js
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://hex-cast-backend.onrender.com';
export const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
```

- `SOCKET_URL` — where the app dials for signaling. `import.meta.env.VITE_*`
  is Vite's way of reading env vars at **build time** (set in `frontend/.env`).
  The fallback default is the **hosted** backend on Render
  (`hex-cast-backend.onrender.com`), so even a build without env vars talks to
  production. Point it back at `http://localhost:5000` for local development.
- `ICE_SERVERS` — a public Google **STUN** server. STUN answers "what's my
  public IP address and port?" so two devices behind their home routers can find
  each other. No STUN, and peers on different networks can't connect.

---

## 5. `App.jsx` — the view state machine

```jsx
const [activeView, setActiveView] = useState('home');
if (activeView === 'laptop') return <LaptopReceiver onExit={...} />;
if (activeView === 'phone')  return <MobileSender onExit={...} />;
return ( /* home: navbar + hero + role cards + how-it-works + footer */ );
```

The whole navigation model is one `useState` string. Clicking a role card swaps
the view; `onExit` flips it back to `'home'`.

Two consequences worth internalizing:

- **Conditional returns unmount/remount.** Going laptop → home → laptop creates
  a *brand-new* `LaptopReceiver`. That's why a fresh room code is generated each
  visit (a new `useState` initializer runs on mount).
- **There's no router.** No `react-router`, no URLs for the views. For two
  screens this is deliberately simple, and it keeps the mental model clean.

The home view also contains the marketing hero — including the animated
P2P "laptop ↔ phone" graphic that's pure CSS (see §11.4).

---

## 6. `Chrome.jsx` — shared chrome

Small presentational pieces reused by all three views:

| Export        | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `Navbar`      | Sticky top bar, brand mark + "Hexcast", optional `onExit` Back button, live `P2P · WebRTC` chip |
| `Footer`      | `© 2026 Hexcast — built by Prince Kay` + GitHub star link |
| `StatusPill`  | Status badge with a blinking dot, turns live (`status-live`) when a `live` prop is true |
| `LaptopIcon` / `PhoneIcon` | Inline SVG line icons used all over |

Note the `Navbar` takes an optional `onExit`: when you're inside a
receiver/sender view it renders a Back button; on the home view there's nothing
to go back to, so it's `null`.

---

## 7. `LaptopReceiver.jsx` — the answerer

The laptop is the **passive** side: it prints a code, waits for a phone, and
*answers* the WebRTC call.

### Setup

```jsx
const [roomCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
```

A 6-digit code, generated **once per mount** (lazy initializer). Then a single
`useEffect` (depends on `roomCode`) sets up the socket and the whole event
wiring. Everything lives in refs (`socketRef`, `peerConnectionRef`,
`pendingCandidatesRef`) so handlers can be attached once and never stale-closed.

### The event handlers

| Event                | What the laptop does                                              |
| -------------------- | ---------------------------------------------------------------- |
| `connect`            | emits `join-room { roomCode, deviceType: 'laptop' }`              |
| `ready`              | creates `RTCPeerConnection`, wires `ontrack` + `onicecandidate`   |
| `signal: offer`      | sets remote description → **flushes buffered ICE** → creates answer → emits it |
| `signal: candidate`  | adds the ICE candidate — or buffers it if the offer hasn't arrived yet |
| `peer-disconnected`  | closes the peer connection, clears video, back to "Waiting…"      |
| `disconnect`         | same teardown, plus marks the server link lost                    |

**`ontrack` is the money moment:** when the phone's video track arrives,
`videoRef.current.srcObject = event.streams[0]` and the status flips to
`'Mirroring active!'`. A `<video autoplay muted playsInline>` element is already
in the DOM; assigning `srcObject` is all it takes to start rendering.

**The pending-candidate buffer (a classic WebRTC footgun).** ICE candidates
(small "I'm reachable at address X" messages) can arrive **before** the offer
does. Calling `addIceCandidate` before the remote description is set throws. So
candidates are pushed into `pendingCandidatesRef` and flushed immediately after
`setRemoteDescription()` resolves. Both sides implement this; remember it — you
will need it in every WebRTC project.

---

## 8. `MobileSender.jsx` — the offerer

The phone is the **active** side: it captures media and *offers* the call.

### `getScreenStream()` — a deliberate fallback chain

```jsx
if (Capacitor.isNativePlatform()) {
  return getUserMedia({ video: true });   // camera, for now
}
if (getDisplayMedia) { return getDisplayMedia(...); }  // real screen on the web
return getUserMedia({ video: true });     // last resort
```

The `Capacitor` import is the native-app check. Inside the Android/iOS webview,
`getDisplayMedia` doesn't exist, so the native app currently mirrors the
**camera** instead. The `// TODO` marks the seam where a native bridge
(Android `MediaProjection`, iOS `ReplayKit`) will plug in later for true screen
capture. On the open web, `getDisplayMedia` gives the OS "choose what to share"
picker.

### `startMirroring()` — the full phone flow

1. Opens a socket (`transports: ['websocket']` forces a pure WebSocket, no
   polling fallback; `reconnection: true` retries on drops).
2. On `connect`: grabs the screen/camera stream once (cached in `streamRef`),
   then emits `join-room { roomCode, deviceType: 'phone' }`.
3. On `ready` (server confirmed the laptop is there): creates the
   `RTCPeerConnection`, **adds the stream's tracks**, creates an **offer**, sets
   it local, and emits it via `signal`.
4. On `signal: answer`: sets the laptop's answer as remote description, flushes
   buffered candidates, status → `'Connected'`.
5. On `signal: candidate`: same add-or-buffer dance as the laptop.

### The unmount cleanup

```jsx
useEffect(() => () => {
  socketRef.current?.disconnect();
  peerConnectionRef.current?.close();
  streamRef.current?.getTracks().forEach(t => t.stop());
}, []);
```

Leaving the view must also **stop the camera/screen track** — otherwise the
camera light stays on and the OS keeps treating the page as "actively
capturing". This cleanup-return pattern is what makes the conditional-return
view switching in §5 safe.

---

## 9. One room, second by second

Putting the server (§2), laptop (§7), and phone (§8) together:

1. Laptop mounts → generates `482913` → socket connects → `join-room` as laptop.
2. Phone mounts → user types `482913` → taps Start → socket connects →
   captures stream → `join-room` as phone.
3. Server now has both slots → broadcasts `'ready'`.
4. **Phone** (offerer): creates peer connection, adds tracks, sends an **SDP
   offer** through `signal`.
5. **Laptop** (answerer): receives offer, sets it remote, creates an **SDP
   answer**, sends it back through `signal`.
6. Both fire `onicecandidate`; every candidate is relayed through `signal` and
   added (or buffered) by the other side. STUN from §4 tells each side its
   public address so they can reach each other.
7. The peer-to-peer connection establishes. The phone's tracks flow **directly**
   to the laptop; `ontrack` fires; the laptop's `<video>` plays. The server
   went back to being silent.
8. If either device closes the tab, `disconnect` fires on the server →
   `'peer-disconnected'` → the survivor tears down and waits again.

Offer always comes from the phone, answer always from the laptop. Either side
*can* offer in WebRTC, but here the roles are explicit and mirrored, which keeps
the pairing logic simple to reason about.

---

## 10. The CSS architecture

Three files, three jobs:

```
index.css   design tokens + global reset      (every page)
App.css     all component + layout styles     (the design system)
mobile.css  responsive/media-query overrides  (last, wins)
```

### 10.1 Design tokens (`index.css`)

Everything tunable lives in `:root` as CSS custom properties:

```css
--bg: #080809;            --surface: #121214;
--border: rgba(255,255,255,0.06);
--ink: #f3f4f6;           --ink-muted: #71717a;
--ease-hard: cubic-bezier(0.16, 1, 0.3, 1);   /* the one motion curve */
--radius: 2px;            --font-mono: 'Geist Mono', ...monospace;
```

One mono typeface, near-black surfaces, hairline borders, 2px radius. That
single token file is why the theme is consistent everywhere and why `mobile.css`
can rely on `var(--border)` etc. without repeating values. The reset also sets
`overflow-x: hidden` on `html/body/#root` — the app's first line of defense
against horizontal scroll.

### 10.2 Layout backbone (`App.css`)

```css
.app                  flex column, min-height: 100dvh, blueprint-grid bg
.shell, .page         100% / max-width 1280px / clamp(16px,4vw,32px) gutters
.page                 flex: 1 0 auto        → pushes footer to the bottom
.navbar, .footer      flex-shrink: 0
```

The `.shell`/`.page` pair is the envelope trick: navbar, content, and footer all
share the *same* max-width and gutters, so their edges align perfectly at any
viewport. `.page` growing (`flex: 1 0 auto`) inside a min-height flex column is
what pins the footer to the bottom of tall screens.

### 10.3 The motion engine

One easing curve (`--ease-hard` = `cubic-bezier(0.16, 1, 0.3, 1)`) is used for
practically every transition, plus a handful of keyframes:

- `mount-in` — fade + `translateY(8px)`; `.page > section` and hero children run
  it with staggered delays (0/80/160/240ms) for that cascade feel.
- `blink` — the square status dots blink in hard `steps(1)` (no smooth fade).
- `packet` / `sheen` — the animated hero graphic (§10.4).
- Press feedback: `:active { transform: scale(0.97); opacity: 0.85 }` on every
  button.
- `prefers-reduced-motion` in `index.css` kills all animation for users who ask.

### 10.4 The hero visual — graphics in pure CSS

The "laptop ↔ phone" panel on the home view is divs + CSS, not an image:

- `.hv-track` defines `--hv-node: 48px`, used by three children.
- `.hv-line` — a dashed line drawn between the nodes via `left/right:
  calc(var(--hv-node) + 12px)`.
- `.hv-packet` — an 8px square animating `left` between the nodes (`packet`
  keyframes), reading the same `--hv-node` variable so it stays inside the
  track at any node size.
- `.hv-node` — the laptop/phone icon boxes.
- The light sheen sweeping across the panel is **not** an animated element: it's
  a `background-image` gradient on `.hero-visual` with `background-size: 300%
  100%` and animated `background-position`. That choice was deliberate — see the
  overflow lesson in §10.6.

Mobile scales the whole graphic by setting one variable: `.hv-track
{ --hv-node: 42px }` plus smaller node boxes in `mobile.css`. One knob, whole
diagram resizes.

### 10.5 `mobile.css` — dedicated mobile file + the import-order gotcha

`mobile.css` holds every responsive rule, in two breakpoints:

- `@media (max-width: 820px)` — tablet tweaks (tighter hero spacing).
- `@media (max-width: 640px)` — phone: navbar padding, single-column role &
  how grids, centered/wrapped meta row, stacked panel header and code box,
  `--hv-node: 42px`.

**The gotcha we hit while building:** `main.jsx` originally imported `mobile.css`
*before* `import App from './App.jsx'`. Vite injects CSS in import order, so
`App.css` loaded *after* `mobile.css` and its desktop rules won the cascade —
the phone still rendered the two-column role grid and overflowed horizontally.
Fix: import `mobile.css` last, after the `App` import. **Rule of thumb: in this
project, the last CSS import wins; mobile overrides must be imported last.**

### 10.6 The zero-overflow discipline (lessons learned the hard way)

The design spec forbids horizontal scrolling at any width. Three real bugs that
shaped the current code:

1. **Grid min-content blowout.** `grid-template-columns: 1fr 1fr` can't shrink a
   track below its content's minimum width. At ~390px the role cards overflowed.
   Fix: `repeat(2, minmax(0, 1fr))` — `minmax(0, 1fr)` lets tracks shrink below
   their content. Used everywhere grids must be resilient.
2. **Animated pseudo-elements inflate `scrollWidth`.** The sheen used to be a
   `::before` with `inset: -60%` and a translateX animation. Even with
   `overflow: hidden` clipping it visually, the element's `scrollWidth`
   ballooned (measuring "internal overflow"), which broke the overflow audit.
   Fix: move the effect into the element's own `background-image` +
   animated `background-position` — backgrounds never contribute to
   `scrollWidth`. Rule: **prefer background animation over oversized children.**
3. **Overflow audits.** A headless-Chrome script walks every element checking
   `getBoundingClientRect().right <= viewport` and `scrollWidth <= clientWidth`,
   run at multiple viewports (360→2560). That's how the above bugs were caught.
   Keep it as a habit: assert no horizontal overflow after every layout change.
   (One legit exception the audit flags: `.sr-only` — a 1px accessibility label
   whose text overflows its own box, but it's clipped and invisible.)

---

## 11. Build & packaging

```
frontend/package.json  scripts:
  dev            vite               → http://localhost:5173
  build          vite build         → dist/ (production bundle + PWA)
  lint           eslint .
  android:sync   npm run build && cap sync android
  android:open   cap open android
```

### PWA

`vite-plugin-pwa` (config in `vite.config.js`) turns the built site into an
installable PWA: `registerType: 'autoUpdate'` (installed apps update themselves),
a web manifest (name/theme/icons), and a service worker generated at build time
(`dist/sw.js`). That's why `npm run build` prints "PWA v1.3.0 / precache 8
entries" — the app shell is cached for offline-ish startup.

### Capacitor native shells

`capacitor.config.json` says `webDir: dist` — the built web app is copied into
the `android/` and `ios/` native projects, which are plain Capacitor wrappers.
`android:sync` = build then copy. The `MobileSender`'s `Capacitor.isNativePlatform()`
branch is what behaves differently inside those shells (camera fallback, §8).

### Environment

`frontend/.env` holds `VITE_SOCKET_URL=http://localhost:5000`. Change it to
point the app at a deployed signaling server, then rebuild. ICE/STUN servers
live in `frontend/src/config.js`.

---

## 12. Running it locally

```bash
# terminal 1 — signaling server
cd backend && npm install && npm run dev        # :5000

# terminal 2 — frontend
cd frontend && npm install && npm run dev       # :5173
```

Open `http://localhost:5173` on the laptop, pick **I'm a laptop**, then open the
same URL on a phone on the same Wi-Fi, pick **I'm a phone**, and dial the code.
Check `http://localhost:5000/health` if anything seems dead.

### Production (Render)

The live deployment is:

| Service  | URL                                      |
| -------- | ---------------------------------------- |
| Frontend | `https://hex-cast.onrender.com`          |
| Backend  | `https://hex-cast-backend.onrender.com`  |

Because `VITE_SOCKET_URL` is baked in at build time, the frontend must be
**rebuilt** (`npm run build`) before deploying, with the env var pointing at
`https://hex-cast-backend.onrender.com` (the default in `config.js` already
does). The backend's CORS is open (`origin: '*'`), which is what permits the
cross-origin socket connection from the hosted frontend. See §2 for the
keepalives that stop the free-tier backend from sleeping.

---

## 13. Mental models worth remembering

- **Signaling server = matchmaker, not courier.** It stores two socket ids per
  room and relays small JSON. It must never hold media.
- **`ready` is the gate.** Nobody builds a peer connection until the server says
  both slots are full. That's the app's entire anti-race strategy.
- **Buffer ICE until you have a remote description.** `addIceCandidate` before
  `setRemoteDescription` throws. The `pendingCandidatesRef` pattern on both
  sides is the canonical fix.
- **Refs for the connection, state for the UI.** Peer connections, sockets, and
  streams live in `useRef`; only status strings live in `useState`.
- **Mount → unmount is your lifecycle.** The conditional-return "router" means
  every view change tears everything down and rebuilds it. Cleanup functions
  must stop tracks and close connections, or cameras stay on.
- **CSS cascade is global here.** File order matters; `mobile.css` must load
  last. No CSS modules, no Tailwind — plain classes and `var()` tokens.
- **Overflow is a design requirement.** `minmax(0, 1fr)`, `overflow-x: hidden`,
  `clamp()` type sizes, `background-position` animations — each exists because a
  real overflow bug was found and fixed.

---

## 14. Note: `DESIGN.md` vs. what's actually in action

`DESIGN.md` at the repo root documents the *earlier* design spec (Playfair
Display serif pairing, film-grain/noise texture, hard offset shadows). The code
in action today is its refined successor: **Geist Mono only** (weight 300–500),
a subtle blueprint-grid background instead of noise, 2px radius with hairline
borders, and one cinematic curve (`--ease-hard`). If the two files ever
disagree, **the CSS in `frontend/src/` is the source of truth** — and this
architecture guide, not `DESIGN.md`, describes what's actually running.
