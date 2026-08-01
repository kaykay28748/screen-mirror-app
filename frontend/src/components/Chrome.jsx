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
        <span className="brand-word">Hexcast</span>
      </span>
      <div className="nav-group">
        {onExit ? (
          <button type="button" className="back-button" onClick={onExit}>
            ← Back
          </button>
        ) : null}
        <span className="nav-chip">P2P · WebRTC</span>
      </div>
    </header>
  );
}

export function StatusTag({ live, text }) {
  return (
    <span className={`status-tag ${live ? 'status-tag-live' : ''}`}>
      <span className="status-tag-dot" aria-hidden="true" />
      {text}
    </span>
  );
}

export function RollText({ text }) {
  return (
    <span className="roll" aria-live="polite">
      <span className="roll-inner" key={text}>
        {text}
      </span>
    </span>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 Hexcast</span>
      <span>Video never touches the server</span>
    </footer>
  );
}
