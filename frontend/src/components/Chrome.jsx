const MARQUEE_ITEMS = [
  'Phone → Laptop',
  'No app stores',
  'Installable PWA',
  'Peer-to-peer',
  'One code. Anywhere.',
];

export function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <span className="masthead-star" aria-hidden="true">
          ✳
        </span>
        <span className="masthead-title">Screen Mirror</span>
      </div>
      <div className="masthead-meta">Vol. 01 — Est. 2026</div>
      <div className="masthead-meta masthead-meta-right">P2P / WebRTC</div>
    </header>
  );
}

export function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-inner">
        {items.map((item, index) => (
          <span className="marquee-item" key={index}>
            <span>{item}</span>
            <span className="marquee-sep">*</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <p>© 2026 Screen Mirror — a peer-to-peer mirroring experiment.</p>
      <p>Video travels device-to-device. The signal server never sees the stream.</p>
    </footer>
  );
}
