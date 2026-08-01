export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://hex-cast-backend.onrender.com';

export const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};
