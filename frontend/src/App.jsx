import { useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';
import { Masthead, Marquee, Footer } from './components/Chrome';

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
      <Masthead />
      <Marquee />
      <section className="home-grid">
        <div className="home-main">
          <p className="eyebrow">* Choose your role to begin</p>
          <h1 className="display">
            Mirror,<br />
            any screen,<br />
            <em>anywhere.</em>
          </h1>
          <p className="lede">
            Point a phone at a laptop, or a laptop at a phone. One six-digit code,
            one live peer-to-peer link — no accounts, no downloads.
          </p>
          <div className="role-list">
            <button type="button" className="role-button" onClick={() => setActiveView('laptop')}>
              <span className="role-index">01</span>
              <span className="role-label">
                I am a laptop
                <em>Receive a screen</em>
              </span>
              <span className="role-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <button type="button" className="role-button" onClick={() => setActiveView('phone')}>
              <span className="role-index">02</span>
              <span className="role-label">
                I am a phone
                <em>Send a screen</em>
              </span>
              <span className="role-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </div>
        <aside className="home-aside">
          <div className="plate">
            <p className="plate-title">How it works</p>
            <ol className="steps">
              <li>
                <span className="step-no">1</span>
                <span className="step-text">The laptop prints a six-digit code.</span>
              </li>
              <li>
                <span className="step-no">2</span>
                <span className="step-text">The phone dials the code.</span>
              </li>
              <li>
                <span className="step-no">3</span>
                <span className="step-text">Video flows straight between devices.</span>
              </li>
            </ol>
            <p className="plate-note">Works in any modern browser. Installable on iOS &amp; Android.</p>
          </div>
        </aside>
      </section>
      <Footer />
    </main>
  );
}

export default App;
