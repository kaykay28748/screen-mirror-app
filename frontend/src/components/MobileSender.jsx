import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { SOCKET_URL, ICE_SERVERS } from '../config';
import { Navbar, Footer, StatusPill } from './Chrome';
import { ScreenShare } from '../native/screenShare';

function MobileSender({ onExit }) {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('Enter the room code to start');
  const [isActive, setIsActive] = useState(false);
  const [sourceNote, setSourceNote] = useState('');
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const nativeListenersRef = useRef([]);
  const nativePeerRef = useRef(false);
  const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const isStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosVersion = (() => {
    const match = /iPhone OS (\d+)[_.](\d+)/.exec(navigator.userAgent);
    return match ? `${match[1]}.${match[2]}` : null;
  })();
  const hasDisplayMedia = Boolean(window.navigator?.mediaDevices?.getDisplayMedia);
  const shareCapability =
    Capacitor.isNativePlatform()
      ? null
      : !hasDisplayMedia
        ? `Screen sharing is unavailable here${iosVersion ? ` (iOS ${iosVersion})` : ''} \u2014 open in Safari, iOS 26+.`
        : isStandalone
          ? 'Standalone mode may block screen sharing \u2014 open this app in a Safari tab instead.'
          : null;

  const getScreenStream = async () => {
    if (Capacitor.isNativePlatform()) {
      // Android native WebView: no getDisplayMedia. Screen sharing on Android
      // would need a MediaProjection plugin; mirror the camera until then.
      // (iOS is handled by the native ReplayKit + WebRTC plugin instead.)
      setSourceNote('Native app — camera preview');
      try {
        return await window.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (error) {
        console.warn('Camera unavailable in native app.', error);
        setSourceNote('No camera available');
        return null;
      }
    }

    if (hasDisplayMedia) {
      try {
        const stream = await window.navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        setSourceNote('Sharing screen');
        return stream;
      } catch (error) {
        console.warn('Display media unavailable, falling back to camera.', error);
        const reason =
          error && error.name === 'NotAllowedError'
            ? 'you cancelled the picker'
            : error && error.name
              ? error.name
              : 'it failed';
        setSourceNote(`Fell back to camera (${reason})`);
      }
    } else {
      const osNote = iosVersion ? `iOS ${iosVersion}` : 'this browser';
      const modeNote = isStandalone
        ? '; open in Safari tab, not the home-screen icon'
        : '';
      setSourceNote(`Can\u2019t share screen on ${osNote}${modeNote} \u2014 using camera`);
    }

    try {
      return await window.navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (error) {
      console.warn('Unable to access any media source.', error);
      setSourceNote('No camera available');
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

  const resetNativeSession = async () => {
    nativePeerRef.current = false;
    for (const listener of nativeListenersRef.current) {
      try {
        await listener.remove();
      } catch (error) {
        console.warn('Unable to remove native listener.', error);
      }
    }
    nativeListenersRef.current = [];
    try {
      await ScreenShare.cleanup();
    } catch (error) {
      console.warn('Native cleanup failed.', error);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSourceNote('');
  };

  const startNativeMirroring = async () => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('error', (error) => {
      setStatus(error?.message || 'Something went wrong');
    });

    socket.on('connect', async () => {
      try {
        const support = await ScreenShare.isSupported();
        if (!support.supported) {
          setStatus('This iPhone can\u2019t record its screen');
          return;
        }
        await ScreenShare.startCapture();
        setSourceNote('Sharing the iPhone screen via ReplayKit');
        socket.emit('join-room', { roomCode, deviceType: 'phone' });
        setStatus('Waiting for laptop...');
        setIsActive(true);
      } catch (error) {
        console.warn('Native screen capture failed.', error);
        setStatus(error?.message || 'Screen capture failed');
      }
    });

    socket.on('ready', async () => {
      if (nativePeerRef.current) {
        return;
      }
      nativePeerRef.current = true;
      try {
        const { offer } = await ScreenShare.createOffer({ iceServers: ICE_SERVERS.iceServers });
        socket.emit('signal', { roomCode, data: offer });
        setStatus('Offer sent');
      } catch (error) {
        console.warn('Native offer failed.', error);
        setStatus(error?.message || 'Failed to start the session');
        nativePeerRef.current = false;
      }
    });

    socket.on('signal', async (data) => {
      if (!data) {
        return;
      }
      try {
        if (data.type === 'answer') {
          await ScreenShare.setRemoteDescription(data);
          setStatus('Connected');
        } else if (data.type === 'candidate') {
          await ScreenShare.addIceCandidate(data.candidate);
        }
      } catch (error) {
        console.warn('Native signaling error.', error);
      }
    });

    try {
      nativeListenersRef.current.push(
        await ScreenShare.addListener('icecandidate', ({ candidate }) => {
          if (candidate && socketRef.current) {
            socketRef.current.emit('signal', {
              roomCode,
              data: { type: 'candidate', candidate },
            });
          }
        })
      );
      nativeListenersRef.current.push(
        await ScreenShare.addListener('connectionstate', ({ state }) => {
          if (state === 'connected') {
            setStatus('Connected');
          }
          if (state === 'failed' || state === 'disconnected') {
            setStatus('Connection lost. Try again.');
          }
        })
      );
      nativeListenersRef.current.push(
        await ScreenShare.addListener('capturestate', ({ state }) => {
          if (state === 'error') {
            setStatus('Screen capture was interrupted');
          }
        })
      );
    } catch (error) {
      console.warn('Unable to attach native listeners.', error);
    }

    socket.on('peer-disconnected', () => {
      resetNativeSession();
      setStatus('Enter the room code to start');
      setIsActive(false);
    });

    socket.on('disconnect', () => {
      resetNativeSession();
      setStatus('Connection lost. Try again.');
      setIsActive(false);
    });
  };

  const startMirroring = () => {
    if (isIOSNative) {
      startNativeMirroring();
      return;
    }

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
      setIsActive(true);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      pendingCandidatesRef.current = [];
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setStatus('Enter the room code to start');
      setIsActive(false);
    });

    socket.on('disconnect', () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      pendingCandidatesRef.current = [];
      setStatus('Connection lost. Try again.');
      setIsActive(false);
    });
  };

  const stopMirroring = () => {
    if (isIOSNative) {
      resetNativeSession();
      setStatus('Enter the room code to start');
      setIsActive(false);
      return;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    pendingCandidatesRef.current = [];
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('Enter the room code to start');
    setIsActive(false);
    setSourceNote('');
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (isIOSNative) {
        for (const listener of nativeListenersRef.current) {
          try {
            listener.remove();
          } catch (error) {
            console.warn('Unable to remove native listener.', error);
          }
        }
        try {
          ScreenShare.cleanup();
        } catch (error) {
          console.warn('Native cleanup failed.', error);
        }
        return;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isIOSNative]);

  const isLive = status === 'Connected';

  return (
    <main className="app view">
      <Navbar onExit={onExit} />
      <main className="page">
        {shareCapability && <div className="stage-note">{shareCapability}</div>}
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
              disabled={isActive}
            />
            <button
              type="button"
              className={`big-button ${isActive ? 'stop-variant' : ''}`}
              onClick={() => (isActive ? stopMirroring() : startMirroring())}
              disabled={!isActive && roomCode.length !== 6}
            >
              {isActive ? 'Stop mirroring' : 'Start mirroring'}
            </button>
            <div className="ticket-row">
              <StatusPill text={status} />
            </div>
            <p className="stage-note">
              {isActive && sourceNote
                ? sourceNote
                : 'You\u2019ll be asked to share a window or camera to begin.'}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </main>
  );
}

export default MobileSender;
