import { useState } from 'react';
import './App.css';
import LaptopReceiver from './components/LaptopReceiver';
import MobileSender from './components/MobileSender';

function App() {
  const [activeView, setActiveView] = useState('home');

  return (
    <main className="app-shell">
      {activeView === 'home' ? (
        <section className="home-screen">
          <div className="home-card">
            <p className="eyebrow">Screen mirror app</p>
            <h1>Choose your device role</h1>
            <p className="home-copy">Mirror a phone display to a laptop or send a laptop view from your phone.</p>
            <div className="button-row">
              <button type="button" className="action-button" onClick={() => setActiveView('laptop')}>
                I am a Laptop (Receive)
              </button>
              <button type="button" className="action-button secondary" onClick={() => setActiveView('phone')}>
                I am a Phone (Send)
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === 'laptop' ? <LaptopReceiver /> : null}
      {activeView === 'phone' ? <MobileSender /> : null}
    </main>
  );
}

export default App;
