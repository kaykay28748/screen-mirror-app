function NavLinks({ onNavigate }) {
  if (!onNavigate) {
    return null;
  }
  return (
    <div className="nav-links">
      <button type="button" className="nav-link" onClick={() => onNavigate('about')}>
        About
      </button>
      <button type="button" className="nav-link" onClick={() => onNavigate('faq')}>
        FAQ
      </button>
      <button type="button" className="nav-link" onClick={() => onNavigate('privacy')}>
        Privacy
      </button>
    </div>
  );
}

export function Navbar({ onExit, onNavigate }) {
  return (
    <header className="navbar">
      <div className="shell">
        <span className="brand">
          <span className="brand-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3.5" y="4.5" width="17" height="11" rx="2" />
              <path d="M12 15.5v4M8.5 19.5h7" />
            </svg>
          </span>
          Hexcast
        </span>
        <div className="nav-group">
          <NavLinks onNavigate={onNavigate} />
          {onExit ? (
            <button type="button" className="back-button" onClick={onExit}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          ) : null}
          <span className="nav-chip">P2P · WebRTC</span>
        </div>
      </div>
    </header>
  );
}

export function StatusPill({ live, text }) {
  return (
    <span className={`status ${live ? 'status-live' : ''}`}>
      <span className="status-dot" aria-hidden="true" />
      {text}
    </span>
  );
}

export function LaptopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="11" rx="2" />
      <path d="M2.5 19.5h19" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

export function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div className="shell">
        <span>
          © 2026 Hexcast — built by <span className="footer-name">Prince Kay</span>
        </span>
        <div className="footer-links">
          <NavLinks onNavigate={onNavigate} />
          <a
            className="nav-link footer-link-anchor"
            href="https://github.com/kaykay28748/screen-mirror-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            ★ GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
