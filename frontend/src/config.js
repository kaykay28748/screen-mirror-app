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

export const ICE_SERVERS = {
  iceServers: [
    ...STUN_URLS.map((urls) => ({ urls })),
    ...TURN_URLS.map((urls) => ({ urls, username: TURN_USERNAME, credential: TURN_CREDENTIAL })),
  ],
};
