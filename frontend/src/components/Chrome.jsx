export function Navbar({ onExit }) {
  return (
    <header className="navbar">
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
        Screen Mirror
      </span>
      <div className="nav-group">
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

export function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 Screen Mirror</span>
      <span>Video never touches the server.</span>
    </footer>
  );
}
