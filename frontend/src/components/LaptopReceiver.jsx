import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, ICE_SERVERS } from '../config';
import { Masthead, Marquee, Footer } from './Chrome';

function LaptopReceiver({ onExit }) {
  const [roomCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [status, setStatus] = useState('Waiting for phone...');
  const [isConnected, setIsConnected] = useState(false);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Waiting for phone...');
      socket.emit('join-room', { roomCode: roomCode, deviceType: 'laptop' });
    });

    socket.on('ready', () => {
      if (peerConnectionRef.current) {
        return;
      }

      setStatus('Connecting...');
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      peerConnection.ontrack = (event) => {
        if (videoRef.current && event.streams && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('Mirroring active!');
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            roomCode: roomCode,
            data: { type: 'candidate', candidate: event.candidate },
          });
        }
      };
    });

    socket.on('signal', (data) => {
      const peerConnection = peerConnectionRef.current;
      if (!data || !peerConnection) {
        return;
      }

      if (data.type === 'offer') {
        peerConnection
          .setRemoteDescription(new RTCSessionDescription(data))
          .then(() => {
            for (const candidate of pendingCandidatesRef.current) {
              peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
            }
            pendingCandidatesRef.current = [];
            return peerConnection.createAnswer();
          })
          .then((answer) => peerConnection.setLocalDescription(answer))
          .then(() => {
            socket.emit('signal', {
              roomCode: roomCode,
              data: peerConnection.localDescription,
            });
          })
          .catch(console.error);
      } else if (data.type === 'candidate') {
        if (peerConnection.remoteDescription) {
          peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
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
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      pendingCandidatesRef.current = [];
      setStatus('Waiting for phone...');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      pendingCandidatesRef.current = [];
      setStatus('Waiting for phone...');
    });

    return () => {
      socket.disconnect();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomCode]);

  const isLive = status === 'Mirroring active!';

  return (
    <main className="app view">
      <Masthead />
      <Marquee />
      <section className="view-grid">
        <div className="stage">
          <div className="stage-top">
            <p className="eyebrow">* Laptop — Receiver</p>
            <span className="stage-code-label">Room code</span>
          </div>
          <div className="code-plate">
            <span className="code-numeral">{roomCode}</span>
          </div>
          <div className={`ticket ${isLive ? 'ticket-live' : ''}`}>
            <span className="ticket-dot" aria-hidden="true" />
            {isConnected ? status : 'Connecting to server...'}
          </div>
          <div className="video-frame">
            <video ref={videoRef} autoPlay playsInline muted className="video" />
            {!isLive ? (
              <div className="video-idle">
                <span>AWAITING SIGNAL</span>
                <span className="video-idle-sub">The sender's stream appears here</span>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="view-aside">
          <div className="plate">
            <p className="plate-title">Session</p>
            <dl className="dl">
              <div>
                <dt>Server</dt>
                <dd className={isConnected ? 'ok' : 'bad'}>{isConnected ? 'Linked' : 'Offline'}</dd>
              </div>
              <div>
                <dt>Peer</dt>
                <dd className={isLive ? 'ok' : 'wait'}>{isLive ? 'Streaming' : 'Waiting'}</dd>
              </div>
              <div>
                <dt>Transport</dt>
                <dd>SRTP</dd>
              </div>
            </dl>
          </div>
          <button type="button" className="back-link" onClick={onExit}>
            ← Back to roles
          </button>
        </aside>
      </section>
      <Footer />
    </main>
  );
}

export default LaptopReceiver;
