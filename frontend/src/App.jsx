import { useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';
import { Navbar, Footer } from './components/Chrome';

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
        <div className="hero-main">
          <p className="micro hero-micro">Peer-to-peer casting</p>
          <h1 className="hero-title">
            Cast a screen,
            <br />
            <em>anywhere</em>,
            <br />
            in seconds.
          </h1>
          <p className="hero-sub">
            One six-digit code links a phone and a laptop over a direct, private
            WebRTC channel. No accounts, no cloud, no middleman.
          </p>
        </div>
        <aside className="hero-rail">
          <p className="micro">Direct P2P</p>
          <p className="micro">No accounts</p>
          <p className="micro">Six-digit pairing</p>
        </aside>
      </section>
      <section className="role-section">
        <div className="role-list">
          <button type="button" className="role-row" onClick={() => setActiveView('laptop')}>
            <span className="role-idx">01</span>
            <span className="role-main">
              <span className="role-title">Laptop</span>
              <span className="role-sub">Receive a screen</span>
            </span>
            <span className="role-arrow" aria-hidden="true">
              →
            </span>
          </button>
          <button type="button" className="role-row" onClick={() => setActiveView('phone')}>
            <span className="role-idx">02</span>
            <span className="role-main">
              <span className="role-title">Phone</span>
              <span className="role-sub">Send a screen</span>
            </span>
            <span className="role-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
        <aside className="how-col">
          <p className="micro">How it works</p>
          <ol className="steps">
            <li className="step">
              <span className="step-no">01</span>
              <p className="step-body">Laptop prints a six-digit code.</p>
            </li>
            <li className="step">
              <span className="step-no">02</span>
              <p className="step-body">Phone dials the code to pair.</p>
            </li>
            <li className="step">
              <span className="step-no">03</span>
              <p className="step-body">Video flows device-to-device.</p>
            </li>
          </ol>
        </aside>
      </section>
      <Footer />
    </main>
  );
}

export default App;
