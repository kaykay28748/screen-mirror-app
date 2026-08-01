import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { SOCKET_URL, ICE_SERVERS } from '../config';
import { Navbar, Footer, StatusPill } from './Chrome';

function MobileSender({ onExit }) {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('Enter the room code to start');
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const getScreenStream = async () => {
    if (Capacitor.isNativePlatform()) {
      // TODO: Bridge with Capacitor native screen projection here.
      // The native WebView has no getDisplayMedia, so mirror the camera until a
      // MediaProjection plugin streams real screen frames via canvas.captureStream().
      try {
        return await window.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (error) {
        console.warn('Camera unavailable in native app.', error);
        return null;
      }
    }

    try {
      if (window.navigator.mediaDevices?.getDisplayMedia) {
        return await window.navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
    } catch (error) {
      console.warn('Display media unavailable, falling back to camera.', error);
    }

    try {
      return await window.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (error) {
      console.warn('Unable to access any media source.', error);
      return null;
    }
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

  const isLive = status === 'Connected';

  return (
    <main className="app view">
      <Navbar onExit={onExit} />
      <section className="panel-wrap">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Sender</p>
              <h2 className="panel-title">Join a room</h2>
            </div>
            <StatusPill live={isLive} text={isLive ? 'Live' : 'Standby'} />
          </div>
          <p className="prompt">Enter the six-digit code from the laptop.</p>
          <label className="sr-only" htmlFor="roomCode">
            Room code
          </label>
          <input
            id="roomCode"
            className="code-input"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
          />
          <button
            type="button"
            className="big-button"
            onClick={() => startMirroring()}
            disabled={roomCode.length !== 6}
          >
            Start mirroring
          </button>
          <div className="ticket-row">
            <StatusPill text={status} />
          </div>
          <p className="stage-note">You'll be asked to share a window or camera to begin.</p>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default MobileSender;
