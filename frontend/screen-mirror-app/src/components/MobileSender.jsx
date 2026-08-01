import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function MobileSender() {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('Enter the room code to start');
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const getScreenStream = async () => {
    try {
      if (window.navigator.mediaDevices?.getDisplayMedia) {
        return await window.navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
    } catch (error) {
      console.warn('Display media unavailable, falling back to camera.', error);
    }

    // TODO: Bridge with Capacitor native screen projection here.
    return window.navigator.mediaDevices
      ? await window.navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      : null;
  };

  const createPeerConnection = (socket) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          roomCode,
          data: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    return peerConnection;
  };

  const startMirroring = () => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('error', (error) => {
      setStatus(error?.message || 'Something went wrong');
    });

    socket.on('connect', async () => {
      if (!streamRef.current) {
        const stream = await getScreenStream();
        if (!stream) {
          setStatus('Unable to access media');
          return;
        }
        streamRef.current = stream;
      }

      socket.emit('join-room', { roomCode, deviceType: 'phone' });
      setStatus('Waiting for laptop...');
    });

    socket.on('ready', async () => {
      if (peerConnectionRef.current) {
        return;
      }

      const peerConnection = createPeerConnection(socket);
      const stream = streamRef.current;

      if (!stream) {
        setStatus('Unable to access media');
        return;
      }

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('signal', { roomCode, data: offer });
      setStatus('Offer sent');
    });

    socket.on('signal', async (data) => {
      if (!data) {
        return;
      }

      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) {
        return;
      }

      if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
        setStatus('Connected');
      } else if (data.type === 'candidate') {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }
    });

    socket.on('peer-disconnected', () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      pendingCandidatesRef.current = [];
      setStatus('Waiting for laptop...');
    });

    socket.on('disconnect', () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      pendingCandidatesRef.current = [];
      setStatus('Connection lost. Try again.');
    });
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <section className="receiver-shell">
      <div className="panel-card">
        <p className="eyebrow">Phone sender</p>
        <h1>Mirror your screen</h1>
        <p className="room-code">Use the laptop code to connect.</p>
        <label className="input-label" htmlFor="roomCode">
          Room code
        </label>
        <input
          id="roomCode"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
        />
        <button type="button" onClick={() => startMirroring()} className="action-button">
          Start Mirroring
        </button>
        <p className="status-pill">{status}</p>
        <p className="helper-text">The laptop will show your screen once connected.</p>
      </div>
    </section>
  );
}

export default MobileSender;
