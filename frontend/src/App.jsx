import { useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';
import { Navbar, Footer, LaptopIcon, PhoneIcon } from './components/Chrome';

function App() {
  const [activeView, setActiveView] = useState('home');

  if (activeView === 'laptop') {
    return <LaptopReceiver onExit={() => setActiveView('home')} />;
  }

  if (activeView === 'phone') {
    return <MobileSender onExit={() => setActiveView('home')} />;
  }

  return (
    <main className="app">
      <Navbar />
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
        <div className="how-grid">
          <div className="how-card">
            <span className="step-num">1</span>
            <p className="step-title">Laptop prints a code</p>
            <p className="step-text">Six random digits, refreshed per session.</p>
          </div>
          <div className="how-card">
            <span className="step-num">2</span>
            <p className="step-title">Phone dials the code</p>
            <p className="step-text">They pair over a private signaling channel.</p>
          </div>
          <div className="how-card">
            <span className="step-num">3</span>
            <p className="step-title">Video flows direct</p>
            <p className="step-text">Peer-to-peer WebRTC — the server never sees it.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default App;
