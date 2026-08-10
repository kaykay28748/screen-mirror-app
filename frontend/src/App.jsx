import { Suspense, lazy, useEffect, useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';
import FileTransfer from './components/FileTransfer';
import { AboutPage, FaqPage, PrivacyPage } from './components/InfoPages';
import { Navbar, Footer, LaptopIcon, PhoneIcon } from './components/Chrome';

const Reader = lazy(() => import('./components/Reader'));

const READ_DEMO_TEXT = 'HexRead reads your documents page by page, just like a human.';

function ReadDemo() {
  const words = READ_DEMO_TEXT.split(' ');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((index) => (index + 1) % words.length);
    }, 220);
    return () => window.clearInterval(id);
  }, [words.length]);

  return (
    <div className="read-demo" aria-hidden="true">
      <div className="card-head">
        <span className="card-head-mark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18 6a9 9 0 0 1 0 12" />
          </svg>
        </span>
        <span className="micro">HexRead · reading now</span>
      </div>
      <p className="read-demo-text">
        {words.map((word, index) => {
          let cls = 'rd-word';
          if (index < active) cls += ' rd-word-done';
          if (index === active) cls += ' rd-word-active';
          return (
            <span key={`${word}-${index}`} className={cls}>
              {word}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState('home');
  const [readerFile, setReaderFile] = useState(null);

  const goHome = () => setActiveView('home');

  const openInReader = (file) => {
    setReaderFile(file);
    setActiveView('reader');
  };

  if (activeView === 'laptop') {
    return <LaptopReceiver onExit={goHome} onNavigate={setActiveView} />;
  }

  if (activeView === 'phone') {
    return <MobileSender onExit={goHome} onNavigate={setActiveView} />;
  }

  if (activeView === 'transfer') {
    return (
      <FileTransfer onExit={goHome} onNavigate={setActiveView} onOpenInReader={openInReader} />
    );
  }

  if (activeView === 'reader') {
    return (
      <Suspense fallback={<div className="app view view-loading">Loading reader…</div>}>
        <Reader
          onExit={goHome}
          onNavigate={setActiveView}
          initialFile={readerFile}
          onClearFile={() => setReaderFile(null)}
        />
      </Suspense>
    );
  }

  if (activeView === 'about') {
    return <AboutPage onExit={goHome} onNavigate={setActiveView} />;
  }

  if (activeView === 'faq') {
    return <FaqPage onExit={goHome} onNavigate={setActiveView} />;
  }

  if (activeView === 'privacy') {
    return <PrivacyPage onExit={goHome} onNavigate={setActiveView} />;
  }

  return (
    <main className="app">
      <Navbar onNavigate={setActiveView} />
      <main className="page">
        <section className="hero">
          <span className="eyebrow">Screen mirroring · File drop · Audio reader</span>
          <h1 className="hero-title">
            Mirror any screen,
            <br />
            send any file,
            <br />
            read any document.
          </h1>
          <p className="hero-sub">
            Point a phone at a laptop — or a laptop at a phone — and pair them with a
            six-digit code over a private, peer-to-peer link. Mirror a screen, drop a file
            between devices, or let HexRead turn any PDF or DOCX into a narrated read: page
            by page, male or female voice. No accounts, no uploads — nothing ever leaves
            your devices.
          </p>
          <div className="hero-chips" aria-label="What Hexcast does">
            <span className="hero-chip">P2P screen mirroring</span>
            <span className="hero-chip">HexDrop file drop</span>
            <span className="hero-chip">HexRead audio reader</span>
            <span className="hero-chip">No accounts · No uploads</span>
          </div>
          <div className="hero-showcase">
            <div className="hero-visual" aria-hidden="true">
              <div className="card-head">
                <span className="card-head-mark">
                  <LaptopIcon />
                </span>
                <span className="micro">Hexcast · mirroring</span>
              </div>
              <div className="hv-track">
                <span className="hv-line" />
                <span className="hv-packet" />
                <span className="hv-node hv-node-laptop">
                  <LaptopIcon />
                </span>
                <span className="hv-node hv-node-phone">
                  <PhoneIcon />
                </span>
              </div>
              <div className="hv-meta">
                <span className="hv-tag">Laptop</span>
                <span className="hv-tag hv-tag-accent">P2P · Linked</span>
                <span className="hv-tag">Phone</span>
              </div>
            </div>
            <ReadDemo />
          </div>
        </section>
        <section className="role-section">
          <div className="role-grid">
            <button type="button" className="role-card" onClick={() => setActiveView('laptop')}>
              <span className="role-card-icon">
                <LaptopIcon />
              </span>
              <span className="role-card-body">
                <span className="role-card-title">I&apos;m a laptop</span>
                <span className="role-card-sub">Receive a screen</span>
              </span>
              <span className="role-card-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <button type="button" className="role-card" onClick={() => setActiveView('phone')}>
              <span className="role-card-icon">
                <PhoneIcon />
              </span>
              <span className="role-card-body">
                <span className="role-card-title">I&apos;m a phone</span>
                <span className="role-card-sub">Send a screen</span>
              </span>
              <span className="role-card-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </section>
        <section className="how">
          <span className="micro section-label">How it works</span>
          <div className="how-grid">
            <div className="how-card">
              <span className="step-num">01</span>
              <p className="step-title">Laptop prints a code</p>
              <p className="step-text">Six random digits, refreshed per session.</p>
            </div>
            <div className="how-card">
              <span className="step-num">02</span>
              <p className="step-title">Phone dials the code</p>
              <p className="step-text">They pair over a private signaling channel.</p>
            </div>
            <div className="how-card">
              <span className="step-num">03</span>
              <p className="step-title">Video flows direct</p>
              <p className="step-text">Peer-to-peer WebRTC — the server never sees it.</p>
            </div>
          </div>
        </section>
        <section className="hexread">
          <div className="hexread-card">
            <span className="hexread-mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18 6a9 9 0 0 1 0 12" />
              </svg>
            </span>
            <div className="hexread-body">
              <p className="panel-eyebrow">HexRead · Built into Hexcast</p>
              <h2 className="hexread-title">Reads your documents out loud.</h2>
              <p className="hexread-text">
                Upload a PDF or DOCX and HexRead walks through it page by page — in a male or
                female voice, at your pace. Just like a human turning the pages. Your files never
                leave your device.
              </p>
            </div>
            <div className="hexread-meta">
              <button
                type="button"
                className="hexread-button"
                onClick={() => setActiveView('reader')}
              >
                Open HexRead
              </button>
              <span className="hv-tag">PDF · DOCX</span>
              <span className="hv-tag hv-tag-accent">Page by page</span>
              <span className="hv-tag">Male · Female voices</span>
            </div>
          </div>
        </section>
        <section className="hexread hexdrop">
          <div className="hexread-card">
            <span className="hexread-mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
              </svg>
            </span>
            <div className="hexread-body">
              <p className="panel-eyebrow">HexDrop · Built into Hexcast</p>
              <h2 className="hexread-title">Sends any file, device to device.</h2>
              <p className="hexread-text">
                Pair two devices with a six-digit code and files travel directly between them
                over WebRTC — no uploads, no servers, no size limits. Drop a PDF or DOCX and
                open it straight in HexRead.
              </p>
            </div>
            <div className="hexread-meta">
              <button
                type="button"
                className="hexread-button"
                onClick={() => setActiveView('transfer')}
              >
                Open HexDrop
              </button>
              <span className="hv-tag">Any file</span>
              <span className="hv-tag hv-tag-accent">Peer to peer</span>
              <span className="hv-tag">No size limit</span>
            </div>
          </div>
        </section>
      </main>
      <Footer onNavigate={setActiveView} />
    </main>
  );
}

export default App;
