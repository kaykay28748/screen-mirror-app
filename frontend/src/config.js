export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://hex-cast-backend.onrender.com';

const STUN_URLS = (import.meta.env.VITE_STUN_URLS || 'stun:stun.l.google.com:19302')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const TURN_URLS = (import.meta.env.VITE_TURN_URLS || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || '';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || '';

// Default to the free Open Relay Project TURN servers when no TURN is
// configured. Without a TURN relay, peer-to-peer links only work when both
// devices are directly reachable (same network, permissive NAT). The relay
// only forwards DTLS-encrypted traffic — it cannot read the bytes. Override
// with VITE_TURN_URLS / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL to use your
// own (or a commercial) TURN server; we recommend that for production.
const HAS_CUSTOM_TURN = Boolean(import.meta.env.VITE_TURN_URLS);
const DEFAULT_TURN_URLS = [
  'turn:openrelay.metered.ca:80',
  'turn:openrelay.metered.ca:443',
  'turn:openrelay.metered.ca:443?transport=tcp',
];
const effectiveTurnUrls = TURN_URLS.length ? TURN_URLS : DEFAULT_TURN_URLS;
const effectiveTurnUsername = TURN_USERNAME || (HAS_CUSTOM_TURN ? '' : 'openrelayproject');
const effectiveTurnCredential = TURN_CREDENTIAL || (HAS_CUSTOM_TURN ? '' : 'openrelayproject');

export const ICE_SERVERS = {
  iceServers: [
    ...STUN_URLS.map((urls) => ({ urls })),
    ...effectiveTurnUrls.map((urls) => ({
      urls,
      username: effectiveTurnUsername,
      credential: effectiveTurnCredential,
    })),
  ],
};
