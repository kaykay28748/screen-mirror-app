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
      title="Mirror any screen, send any file, read any document."
      lede="Hexcast is a browser-to-browser screen mirror built on WebRTC, with a built-in audio reader called HexRead and a peer-to-peer file drop called HexDrop. No accounts, no installs — just a six-digit code that pairs two devices over a private peer-to-peer link, or a PDF or DOCX you want read aloud."
    >
      <InfoSection title="How it works">
        <ul>
          <li>The laptop opens the receiver and prints a random six-digit room code.</li>
          <li>The phone enters the code, and the two devices pair through a tiny signaling relay.</li>
          <li>Video then flows directly between the two devices. The relay coordinates the handshake but never sees your picture.</li>
        </ul>
      </InfoSection>

      <InfoSection title="HexDrop — send files peer to peer">
        <p>
          Hexcast also ships with <strong>HexDrop</strong>, a direct file drop between two paired
          devices:
        </p>
        <ul>
          <li>
            <strong>Pair with the same six-digit code.</strong> One device shares a code, the
            other dials it, and a private WebRTC data channel opens between them.
          </li>
          <li>
            <strong>Drop any file, in either direction.</strong> Both devices can send, at the
            same time, with live progress bars and cancel — any size, any type.
          </li>
          <li>
            <strong>Files travel directly between devices.</strong> They are chunked and streamed
            over the peer-to-peer link; the relay only brokers the connection and never sees the
            bytes.
          </li>
          <li>
            <strong>Open received PDFs and DOCX straight in HexRead.</strong> Received documents
            show a Read button that hands the file directly to the reader.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="HexRead — read documents aloud">
        <p>
          Hexcast also ships with <strong>HexRead</strong>, a built-in audio reader. It reads
          documents to you the way a person would:
        </p>
        <ul>
          <li>
            <strong>Upload a PDF or DOCX</strong> by dragging and dropping it or browsing from
            your device.
          </li>
          <li>
            <strong>HexRead walks through it page by page</strong>, extracting the text right in
            your browser.
          </li>
          <li>
            <strong>Pick a male or female voice</strong>, set the pace, and let it read
            continuously from page to page with natural pauses — pause, resume, jump ahead, or
            stop at any time.
          </li>
          <li>
            <strong>Your files never leave your device.</strong> Parsing and speech both happen
            locally in the browser.
          </li>
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
          <li>
            <strong>HexRead needs text-based documents.</strong> Scanned or image-only PDFs contain no selectable
            text, so there is nothing to read aloud. Choose a document with real text.
          </li>
          <li>
            <strong>HexRead uses your device&apos;s own voices.</strong> The male and female voices available are the
            ones installed on your operating system and browser — on a fresh browser it may take a moment to load
            them.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Your privacy at a glance">
        <p>
          No accounts, no tracking, no stored video — and no uploaded documents or files. The relay only sees pairing
          signals (room code, device type, connection hints); your screen, camera, and HexDrop files go straight
          between the two devices, and HexRead files are read entirely on your device. The full policy is on the
          Privacy page.
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
      lede="Hexcast is designed so that your screen, camera, documents, and files are never seen by the server. Here is what that means in practice."
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

      <InfoSection title="HexDrop files are peer-to-peer too">
        <p>
          Files sent with HexDrop travel over the same encrypted WebRTC link as media, over a data channel rather
          than a video track. In practice:
        </p>
        <ul>
          <li>
            <strong>The relay never sees the bytes.</strong> It brokers the connection only;
            files are chunked and streamed directly between the two devices.
          </li>
          <li>
            <strong>Nothing is stored or logged.</strong> We never receive, keep, or copy the
            files you send. Their bytes live in the sending and receiving browsers&apos; memory
            and are discarded when the page closes.
          </li>
          <li>
            <strong>You choose what to send.</strong> A file only leaves your device after you
            drop it into HexDrop while connected, and you can cancel a transfer at any time.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="HexRead documents">
        <p>
          HexRead turns a PDF or DOCX into a spoken reading entirely on your device. In practice:
        </p>
        <ul>
          <li>
            <strong>Parsing happens in the browser.</strong> Your file is opened with open-source
            extractors (PDF.js for PDFs, Mammoth for DOCX) running in the page itself — no file is
            ever sent to a server.
          </li>
          <li>
            <strong>Speech is synthesized on your device.</strong> HexRead uses your
            browser&apos;s built-in text-to-speech engine, so the voices are local and the audio
            is never transmitted.
          </li>
          <li>
            <strong>Nothing is stored or logged.</strong> We never see, keep, or copy your
            document. Its text lives only in the browser&apos;s memory and is discarded when you
            leave the page or load a new file.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Permissions stay with you">
        <p>
          Your browser asks you to grant screen or camera access every time, and you choose exactly what to
          share. Sending a file also only happens when you drop it in yourself. Sharing and transfers stop the
          moment you stop them, leave, or the devices disconnect.
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
          like an app. That cache contains the app itself — never your screen, camera, or HexRead documents.
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
          Hexcast, HexDrop, and HexRead are open source — you can read the full implementation on GitHub and
          verify these claims for yourself. HexDrop uses your browser&apos;s built-in WebRTC data channel, and
          HexRead&apos;s document parsing relies on the open-source PDF.js and Mammoth libraries.
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
        <div className="faq-item">
          <details>
            <summary>Can I listen to a PDF or DOCX instead of reading it?</summary>
            <p className="faq-body">
              Yes — open <strong>HexRead</strong> from the nav, footer, or the landing page. Upload a PDF or
              DOCX and it reads the document to you page by page, in a male or female voice, with pause, page
              skip, and speed controls. The file is processed entirely in your browser and never leaves your
              device.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>How do I send a file to another device?</summary>
            <p className="faq-body">
              Open <strong>HexDrop</strong> from the nav, footer, or the landing page. One device chooses
              &ldquo;I have the file&rdquo; and shares the six-digit code; the other chooses &ldquo;I need the
              file&rdquo; and dials it. Once the devices are linked, either side can drop files — drag and drop
              or browse from your device.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Does the server see the files I send?</summary>
            <p className="faq-body">
              No. HexDrop streams files over the same peer-to-peer WebRTC link as video, using a data channel
              instead of a camera track. The relay only brokers the initial connection — the file bytes travel
              directly between your two devices and are never stored or logged anywhere.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Is there a file size limit in HexDrop?</summary>
            <p className="faq-body">
              No. Files are split into chunks and streamed continuously, so there is no fixed size cap. Very
              large transfers use the memory of the sending and receiving browsers and take longer — but they
              work.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Can I open a received document in HexRead?</summary>
            <p className="faq-body">
              Yes. When you receive a PDF or DOCX, it shows a <strong>Read in HexRead</strong> button that
              hands the file straight to the reader — listen to it out loud without ever uploading it.
            </p>
          </details>
        </div>
        <div className="faq-item">
          <details>
            <summary>Does HexDrop work between a phone and a laptop?</summary>
            <p className="faq-body">
              Yes. Unlike screen sharing, file transfer doesn&apos;t need any special permission — any browser
              that supports WebRTC data channels can send and receive. That includes iPhone and Android
              browsers, the installed app, and desktop.
            </p>
          </details>
        </div>
      </section>
    </InfoShell>
  );
}
