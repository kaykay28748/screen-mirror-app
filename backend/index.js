const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();

app.use(cors({ origin: '*' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomDevices = {};

function getRoom(roomCode) {
  if (!roomDevices[roomCode]) {
    roomDevices[roomCode] = {};
  }

  return roomDevices[roomCode];
}

function removeSocketFromRooms(socketId) {
  Object.entries(roomDevices).forEach(([roomCode, devices]) => {
    let removed = false;

    if (devices.laptopSocketId === socketId) {
      delete devices.laptopSocketId;
      removed = true;
    }

    if (devices.phoneSocketId === socketId) {
      delete devices.phoneSocketId;
      removed = true;
    }

    if (!devices.laptopSocketId && !devices.phoneSocketId) {
      delete roomDevices[roomCode];
      return;
    }

    if (removed) {
      const remainingSocketId = devices.laptopSocketId || devices.phoneSocketId;
      io.to(remainingSocketId).emit('peer-disconnected', { roomCode });
    }
  });
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', ({ roomCode, deviceType }) => {
    try {
      if (typeof roomCode !== 'string') {
        socket.emit('error', { message: 'Invalid room code' });
        return;
      }

      const normalizedCode = roomCode.trim();

      if (!/^\d{6}$/.test(normalizedCode)) {
        socket.emit('error', { message: 'Room code must be 6 digits' });
        return;
      }

      if (deviceType !== 'laptop' && deviceType !== 'phone') {
        socket.emit('error', { message: 'Invalid device type' });
        return;
      }

      const room = getRoom(normalizedCode);
      const slotKey = deviceType === 'laptop' ? 'laptopSocketId' : 'phoneSocketId';
      const previousSocketId = room[slotKey];

      if (previousSocketId && previousSocketId !== socket.id) {
        const previousSocket = io.sockets.sockets.get(previousSocketId);
        if (previousSocket) {
          previousSocket.leave(normalizedCode);
        }
      }

      room[slotKey] = socket.id;
      socket.join(normalizedCode);
      console.log(`Socket ${socket.id} joined ${normalizedCode} as ${deviceType}`);

      if (room.laptopSocketId && room.phoneSocketId) {
        io.to(normalizedCode).emit('ready', { roomCode: normalizedCode });
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('signal', ({ roomCode, data }) => {
    try {
      if (!roomCode || !data) {
        return;
      }

      const room = roomDevices[roomCode];
      if (!room) {
        return;
      }

      socket.to(roomCode).emit('signal', data);
    } catch (error) {
      console.error('Error relaying signal:', error);
    }
  });

  socket.on('disconnect', () => {
    removeSocketFromRooms(socket.id);
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});

// Keepalive: Render free-tier web services spin down after ~15 min without
// inbound traffic. Ping our own /health every few minutes so the instance
// never sleeps. RENDER_EXTERNAL_URL is set automatically by Render; SELF_URL
// is a manual override for other hosts. No-op locally.
const KEEPALIVE_INTERVAL_MS = parseInt(process.env.KEEPALIVE_INTERVAL_MS, 10) || 4 * 60 * 1000;
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || '';

if (SELF_URL) {
  console.log(`[keepalive] pinging ${SELF_URL}/health every ${KEEPALIVE_INTERVAL_MS}ms`);
  const ping = () => {
    fetch(`${SELF_URL}/health`)
      .then((res) => {
        if (res.ok) {
          console.log(`[keepalive] ping ok @ ${new Date().toISOString()}`);
        }
      })
      .catch((err) => console.warn(`[keepalive] ping failed: ${err.message}`))
      .finally(() => setTimeout(ping, KEEPALIVE_INTERVAL_MS));
  };
  setTimeout(ping, KEEPALIVE_INTERVAL_MS);
}
