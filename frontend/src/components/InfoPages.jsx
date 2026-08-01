import { Navbar, Footer } from './Chrome';

function InfoShell({ onExit, onNavigate, eyebrow, title, lede, children }) {
  return (
    <main className="app view">
      <Navbar onExit={onExit} onNavigate={onNavigate} />
      <main className="page">
        <section className="info-page">
          <header className="info-header">
            <p className="panel-eyebrow">{eyebrow}</p>
            <h1 className="info-title">{title}</h1>
            {lede && <p className="info-lede">{lede}</p>}
          </header>
          {children}
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="info-section">
      <h2 className="info-section-title">{title}</h2>
      {children}
    </section>
  );
}

function InfoNote({ children }) {
  return <div className="info-note">{children}</div>;
}

export function AboutPage({ onExit, onNavigate }) {
  return (
    <InfoShell
      onExit={onExit}
      onNavigate={onNavigate}
      eyebrow="About"
      title="Mirror any screen, anywhere."
      lede="Hexcast is a browser-to-browser screen mirror built on WebRTC. No accounts, no installs — just a six-digit code that pairs two devices over a private peer-to-peer link."
    >
      <InfoSection title="How it works">
        <ul>
          <li>The laptop opens the receiver and prints a random six-digit room code.</li>
          <li>The phone enters the code, and the two devices pair through a tiny signaling relay.</li>
          <li>Video then flows directly between the two devices. The relay coordinates the handshake but never sees your picture.</li>
        </ul>
      </InfoSection>

      <InfoSection title="What you need to know">
        <ul>
          <li>
            <strong>Laptop → phone works.</strong> Desktop browsers support screen sharing, so open the laptop
            view and share a window, tab, or the whole screen.
          </li>
          <li>
            <strong>Phone → laptop on iPhone/iPad doesn&apos;t.</strong> Apple has never enabled screen sharing in
            Safari on iOS — not in any version, including iOS 26. Chrome and Edge on iPhone are Safari underneath,
            so they share the same limitation. A phone sender always uses the camera instead.
          </li>
          <li>
            <strong>Android is not supported for screen sharing either</strong> — browser screen sharing on Android
            is unreliable, so phones fall back to the camera.
          </li>
          <li>
            <strong>To mirror an iPhone to a laptop</strong>, use the iPhone&apos;s built-in Screen Mirroring and an
            AirPlay receiver on the laptop, such as LetsView, ApowerMirror, or AirServer.
          </li>
          <li>
            <strong>Keep the shared window visible.</strong> A shared tab or window freezes if it&apos;s minimized,
            backgrounded, or if the device locks.
          </li>
          <li>
            <strong>Same network is the smoothest.</strong> Peer-to-peer links work best when both devices share a
            Wi-Fi network (see the FAQ).
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Your privacy at a glance">
        <p>
          No accounts, no tracking, no stored video. The relay only sees pairing signals (room code, device type,
          connection hints); your screen and camera stream go straight between the two devices and are never
          recorded. The full policy is on the Privacy page.
        </p>
      </InfoSection>

      <InfoNote>
        Questions? Read the <button type="button" className="nav-link info-link" onClick={() => onNavigate('faq')}>FAQ</button>.
      </InfoNote>
    </InfoShell>
  );
}

export function PrivacyPage({ onExit, onNavigate }) {
  return (
    <InfoShell
      onExit={onExit}
      onNavigate={onNavigate}
      eyebrow="Privacy"
      title="Privacy policy"
      lede="Hexcast is designed so that your screen and camera are never seen by the server. Here is what that means in practice."
    >
      <InfoSection title="We don&apos;t ask for anything">
        <p>
          There are no accounts, no sign-ups, no email addresses, and no personal data required to use Hexcast.
          A room code is all you need.
        </p>
      </InfoSection>

      <InfoSection title="What the relay sees">
        <p>
          To pair two devices, a small signaling server coordinates the handshake. It briefly sees:
        </p>
        <ul>
          <li>the room code you entered,</li>
          <li>the device type (phone or laptop),</li>
          <li>and the connection hints (ICE candidates, including IP addresses) used to establish the peer-to-peer link.</li>
        </ul>
        <p>None of this content is your screen, camera, or microphone feed.</p>
      </InfoSection>

      <InfoSection title="Media is peer-to-peer">
        <p>
          Your video and audio stream directly between your two devices over WebRTC, which encrypts it with
          DTLS-SRTP. The relay never touches it, we never record it, and we never store it.
        </p>
      </InfoSection>

      <InfoSection title="Permissions stay with you">
        <p>
          Your browser asks you to grant screen or camera access every time, and you choose exactly what to
          share. Sharing stops the moment you stop it, leave, or the devices disconnect.
        </p>
      </InfoSection>

      <InfoSection title="No tracking">
        <p>
          Hexcast uses no analytics, no advertising, and no tracking cookies. There is nothing to opt out of.
        </p>
      </InfoSection>

      <InfoSection title="Local storage">
        <p>
          As a progressive web app, Hexcast caches its own code on your device so it loads quickly and can open
          like an app. That cache contains the app itself — never your screen or camera content.
        </p>
      </InfoSection>

      <InfoSection title="Hosting">
        <p>
          The signaling relay runs on a standard hosting platform. As with any hosted service, the host&apos;s
          server logs may transiently record connection metadata. Media content is never sent there.
        </p>
      </InfoSection>

      <InfoSection title="Open source">
        <p>
          Hexcast is open source — you can read the full implementation on GitHub and verify these claims for
          yourself.
        </p>
      </InfoSection>
    </InfoShell>
  );
}

export function FaqPage({ onExit, onNavigate }) {
  return (
    <InfoShell
      onExit={onExit}
      onNavigate={onNavigate}
      eyebrow="FAQ"
      title="Frequently asked questions"
      lede="The honest answers about what Hexcast can and can&apos;t do."
    >
      <section className="info-section">
        <div className="faq-item">
          <details>
            <summary>Why does my iPhone only show the camera?</summary>
            <p className="faq-body">
              Apple has never enabled screen sharing in Safari on iOS — not in iOS 26 or any other version.
              Chrome and Edge on iPhone are Safari underneath, so they can&apos;t do it either. On an iPhone,
              Hexcast uses your camera instead. This is a platform limitation, not an app bug.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>How do I mirror my iPhone screen to my laptop?</summary>
            <p className="faq-body">
              Use the iPhone&apos;s built-in Screen Mirroring: install a free AirPlay receiver on the laptop
              (LetsView, ApowerMirror, or AirServer), keep both devices on the same Wi-Fi, then swipe open
              Control Center on the iPhone, tap Screen Mirroring, and choose your laptop.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Does the server see my video?</summary>
            <p className="faq-body">
              No. Hexcast connects devices peer-to-peer with WebRTC. A small relay only coordinates the initial
              handshake — it never receives, records, or stores your screen or camera stream.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Do both devices need the same Wi-Fi?</summary>
            <p className="faq-body">
              Not necessarily — the link can cross networks over the internet. But because the relay provides
              STUN only (no TURN server), connections work most reliably when both devices are on the same
              network. Strict corporate or carrier firewalls may block the peer-to-peer link.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Which browsers can share a screen?</summary>
            <p className="faq-body">
              Desktop Chrome, Edge, Firefox, and Safari all support screen sharing and make great laptop
              senders. No mobile browser can share a screen — phones always fall back to the camera.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Is audio shared too?</summary>
            <p className="faq-body">
              No. Hexcast currently shares video only — screen or camera — with no audio track.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Why is the shared screen frozen or black?</summary>
            <p className="faq-body">
              The streamed window only updates while it is visible. Minimizing the window, switching to another
              tab or app, or locking the device pauses the stream. Keep the shared window on screen and the
              device awake.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Is my connection secure?</summary>
            <p className="faq-body">
              Yes. Media travels over WebRTC with DTLS-SRTP encryption, and pairing is scoped to a random
              six-digit room code that changes every session.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Why did the stream stop when I left the page?</summary>
            <p className="faq-body">
              Leaving the sender or receiver view ends the session cleanly — sockets close and the camera or
              shared window stops. Re-open the view and use a fresh room code to restart.
            </p>
          </details>
        </div>
      </section>
    </InfoShell>
  );
}
