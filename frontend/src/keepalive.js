import { SOCKET_URL } from './config';

const PING_INTERVAL_MS = 4 * 60 * 1000;

function ping() {
  fetch(`${SOCKET_URL}/health`, { cache: 'no-store' })
    .catch(() => {})
    .finally(() => setTimeout(ping, PING_INTERVAL_MS));
}

export function startKeepAlive() {
  setTimeout(ping, 0);
}
