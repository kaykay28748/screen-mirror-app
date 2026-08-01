import { useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';
import { AboutPage, FaqPage, PrivacyPage } from './components/InfoPages';
import { Navbar, Footer, LaptopIcon, PhoneIcon } from './components/Chrome';

function App() {
  const [activeView, setActiveView] = useState('home');

  const goHome = () => setActiveView('home');

  if (activeView === 'laptop') {
    return <LaptopReceiver onExit={goHome} onNavigate={setActiveView} />;
  }

  if (activeView === 'phone') {
    return <MobileSender onExit={goHome} onNavigate={setActiveView} />;
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
          <span className="eyebrow">Peer-to-peer screen mirroring</span>
          <h1 className="hero-title">
            Mirror any screen,
            <br />
            anywhere.
          </h1>
          <p className="hero-sub">
            Point a phone at a laptop — or a laptop at a phone. One six-digit code
            connects them over a private, peer-to-peer video link. No accounts, no
            downloads.
          </p>
          <div className="hero-visual" aria-hidden="true">
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
      </main>
      <Footer onNavigate={setActiveView} />
    </main>
  );
}

export default App;
