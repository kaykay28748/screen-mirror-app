import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, ICE_SERVERS } from '../config';
import { Navbar, Footer, StatusPill } from './Chrome';

const CHUNK_SIZE = 256 * 1024;
const MAX_INFLIGHT = 6;

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

function isReadable(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'pdf' || ext === 'docx';
}

function FileTransfer({ onExit, onNavigate, onOpenInReader }) {
  const [mode, setMode] = useState('host');
  const [roomCode, setRoomCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [status, setStatus] = useState('Waiting for the other device…');
  const [isConnected, setIsConnected] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sendItems, setSendItems] = useState([]);
  const [recvItems, setRecvItems] = useState([]);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const sendQueueRef = useRef([]);
  const sendRef = useRef(null);
  const rxMapRef = useRef({});
  const pendingChunkRef = useRef(null);
  const lastRecvUpdateRef = useRef(0);
  const urlsRef = useRef(new Set());

  const fileInputRef = useRef(null);

  function setSendItem(id, patch) {
    setSendItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function setRecvItem(id, patch) {
    setRecvItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function resetPeer() {
    if (channelRef.current) {
      try {
        channelRef.current.close();
      } catch {
        /* ignore */
      }
      channelRef.current = null;
    }
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {
        /* ignore */
      }
      peerRef.current = null;
    }
    pendingCandidatesRef.current = [];
    pendingChunkRef.current = null;
    rxMapRef.current = {};
    sendRef.current = null;
    setIsLinked(false);
  }

  function disconnectAll() {
    resetPeer();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }

  function pumpChunks() {
    const state = sendRef.current;
    const channel = channelRef.current;
    if (!state || !channel || channel.readyState !== 'open') return;

    while (state.inflight < MAX_INFLIGHT && state.seq < state.chunks) {
      const seq = state.seq;
      state.seq += 1;
      state.inflight += 1;

      const start = seq * CHUNK_SIZE;
      const end = Math.min(state.entry.size, start + CHUNK_SIZE);

      state.entry.file
        .slice(start, end)
        .arrayBuffer()
        .then((buffer) => {
          if (channelRef.current !== channel || channel.readyState !== 'open') return;
          try {
            channel.send(JSON.stringify({ t: 'chunk', id: state.entry.id, seq }));
            channel.send(buffer);
          } catch (error) {
            console.warn('Failed to send chunk.', error);
          }
        })
        .catch((error) => {
          console.warn('Failed to read file chunk.', error);
          failSend(state.entry.id);
        });
    }
  }

  function startSend(entry) {
    const chunks = Math.max(1, Math.ceil(entry.size / CHUNK_SIZE));
    sendRef.current = { entry, seq: 0, inflight: 0, chunks };
    setSendItem(entry.id, { state: 'sending', progress: 0 });

    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;
    channel.send(
      JSON.stringify({
        t: 'offer',
        id: entry.id,
        name: entry.name,
        size: entry.size,
        mime: entry.mime,
        chunks,
        chunkSize: CHUNK_SIZE,
      }),
    );
    pumpChunks();
  }

  function pumpQueue() {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;
    if (sendRef.current) return;
    const next = sendQueueRef.current.shift();
    if (next) startSend(next);
  }

  function failSend(id) {
    if (sendRef.current && sendRef.current.entry.id === id) {
      sendRef.current = null;
    }
    setSendItem(id, { state: 'error' });
    pumpQueue();
  }

  function onAck(message) {
    const state = sendRef.current;
    if (!state || state.entry.id !== message.id) return;
    state.inflight = Math.max(0, state.inflight - 1);
    setSendItem(message.id, { progress: message.received });

    if (message.received >= state.entry.size) {
      setSendItem(message.id, { state: 'done', progress: state.entry.size });
      sendRef.current = null;
      pumpQueue();
    } else {
      pumpChunks();
    }
  }

  function onOffer(message) {
    rxMapRef.current[message.id] = {
      id: message.id,
      name: message.name,
      size: message.size,
      mime: message.mime || 'application/octet-stream',
      parts: new Array(message.chunks || 1),
      received: 0,
    };
    setRecvItems((prev) => [
      ...prev,
      {
        id: message.id,
        name: message.name,
        size: message.size,
        mime: message.mime,
        progress: 0,
        state: 'receiving',
      },
    ]);
  }

  function onChunk(buffer) {
    const pending = pendingChunkRef.current;
    pendingChunkRef.current = null;
    if (!pending) return;

    const rx = rxMapRef.current[pending.id];
    if (!rx) return;

    rx.parts[pending.seq] = buffer;
    rx.received += buffer.byteLength;

    if (rx.received >= rx.size) {
      const blobParts = rx.parts.filter(Boolean);
      const blob = new Blob(blobParts, { type: rx.mime });
      const url = URL.createObjectURL(blob);
      const file = new File(blobParts, rx.name, { type: rx.mime });
      urlsRef.current.add(url);
      delete rxMapRef.current[pending.id];
      setRecvItem(pending.id, { progress: rx.size, state: 'done', url, file });
      return;
    }

    const now = Date.now();
    if (now - lastRecvUpdateRef.current > 120) {
      lastRecvUpdateRef.current = now;
      setRecvItem(pending.id, { progress: rx.received });
    }
  }

  function onCancel(message) {
    delete rxMapRef.current[message.id];
    setRecvItem(message.id, { state: 'cancelled' });
  }

  function handleMessage(event) {
    if (typeof event.data === 'string') {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || typeof message.t !== 'string') return;
      if (message.t === 'offer') onOffer(message);
      else if (message.t === 'chunk') pendingChunkRef.current = { id: message.id, seq: message.seq };
      else if (message.t === 'ack') onAck(message);
      else if (message.t === 'cancel') onCancel(message);
      return;
    }

    if (event.data instanceof Blob) {
      event.data.arrayBuffer().then(onChunk).catch(console.warn);
      return;
    }

    const buffer = event.data instanceof ArrayBuffer ? event.data : event.data.buffer;
    if (buffer) onChunk(buffer);
  }

  function setupChannel(channel) {
    channelRef.current = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      setStatus('Linked');
      setIsLinked(true);
      pumpQueue();
    };
    channel.onclose = () => {
      if (channelRef.current === channel) {
        channelRef.current = null;
        resetPeer();
        setStatus('Peer disconnected — waiting…');
      }
    };
    channel.onerror = () => {
      /* channel errors surface via close */
    };
    channel.onmessage = handleMessage;
  }

  function connectSocket() {
    if (socketRef.current) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    const deviceType = mode === 'host' ? 'laptop' : 'phone';

    socket.on('error', (error) => {
      setStatus(error?.message || 'Something went wrong');
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Waiting for the other device…');
      socket.emit('join-room', { roomCode, deviceType });
    });

    socket.on('ready', async () => {
      if (peerRef.current) return;
      setStatus('Connecting…');
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = peerConnection;

      if (deviceType === 'phone') {
        setupChannel(peerConnection.createDataChannel('hexdrop'));
      } else {
        peerConnection.ondatachannel = (event) => setupChannel(event.channel);
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            roomCode,
            data: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === 'connected') {
          setStatus('Linked');
          setIsLinked(true);
        } else if (state === 'failed') {
          setStatus('Connection failed — retry');
          resetPeer();
        } else if (state === 'disconnected') {
          setStatus('Peer lost — reconnecting…');
        }
      };

      if (deviceType === 'phone') {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('signal', { roomCode, data: peerConnection.localDescription });
          setStatus('Offer sent — linking…');
        } catch (error) {
          console.warn('Offer failed.', error);
          setStatus('Connection error — retry');
          resetPeer();
        }
      }
    });

    socket.on('signal', async (data) => {
      const peerConnection = peerRef.current;
      if (!peerConnection || !data) return;
      try {
        if (data.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('signal', { roomCode, data: peerConnection.localDescription });
        } else if (data.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
        } else if (data.type === 'candidate') {
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            pendingCandidatesRef.current.push(data.candidate);
          }
        }
      } catch (error) {
        console.warn('Signaling error.', error);
        setStatus('Connection error — retry');
      }
    });

    socket.on('peer-disconnected', () => {
      resetPeer();
      setStatus('Waiting for the other device…');
      if (deviceType === 'phone' && socket.connected) {
        window.setTimeout(() => {
          if (socketRef.current === socket && socket.connected) {
            socket.emit('join-room', { roomCode, deviceType });
          }
        }, 400);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      resetPeer();
      setStatus('Connection lost — retry');
    });
  }

  useEffect(() => {
    if (mode === 'host') {
      connectSocket();
    }
    return () => {
      disconnectAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      disconnectAll();
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enqueueFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    for (const file of files) {
      const id = makeId();
      const entry = {
        id,
        file,
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
      };
      sendQueueRef.current.push(entry);
      setSendItems((prev) => [
        ...prev,
        { ...entry, progress: 0, state: 'queued' },
      ]);
    }
    pumpQueue();
  }

  function cancelSend(id) {
    if (sendRef.current && sendRef.current.entry.id === id) {
      sendRef.current = null;
    }
    sendQueueRef.current = sendQueueRef.current.filter((entry) => entry.id !== id);
    setSendItem(id, { state: 'cancelled' });
    const channel = channelRef.current;
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ t: 'cancel', id }));
    }
    pumpQueue();
  }

  function handleInputChange(event) {
    enqueueFiles(event.target.files);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    enqueueFiles(event.dataTransfer.files);
  }

  function switchMode(next) {
    if (isConnected || isLinked) return;
    setMode(next);
    setStatus(next === 'host' ? 'Waiting for the other device…' : 'Enter the code from the sender.');
    setRoomCode((prev) => (next === 'host' ? prev : ''));
  }

  function handleConnect() {
    if (roomCode.trim().length === 6) {
      setStatus('Waiting for the other device…');
      connectSocket();
    }
  }

  const handleCopy = () => {
    navigator.clipboard
      ?.writeText(roomCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  const stopTransfer = () => {
    disconnectAll();
    setStatus(mode === 'host' ? 'Room closed — start waiting to reopen.' : 'Enter the code from the sender.');
  };

  const percentOf = (size, progress) => (size > 0 ? Math.min(100, Math.round((progress / size) * 100)) : 0);

  return (
    <main className="app view">
      <Navbar onExit={onExit} onNavigate={onNavigate} activeView="transfer" />
      <main className="page">
        <section className="reader">
          <header className="info-header">
            <p className="panel-eyebrow">HexDrop · Built into Hexcast</p>
            <h1 className="info-title">Send any file, peer to peer.</h1>
            <p className="info-lede">
              Pair two devices with a six-digit code and files travel directly between them — no
              uploads, no servers, no size limits. Drop a PDF or DOCX and open it straight in
              HexRead.
            </p>
          </header>

          <section className="panel-wrap">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-eyebrow">HexDrop · Pair</p>
                  <h2 className="panel-title">
                    {mode === 'host' ? 'Share a code' : 'Join a drop'}
                  </h2>
                </div>
                <StatusPill live={isLinked} text={isLinked ? 'Linked' : isConnected ? status : 'Standby'} />
              </div>

              <div className="voice-toggle ft-mode" role="group" aria-label="Choose a role">
                <button
                  type="button"
                  className={`voice-button ${mode === 'host' ? 'active' : ''}`}
                  onClick={() => switchMode('host')}
                  disabled={isConnected || isLinked}
                >
                  I have the file
                </button>
                <button
                  type="button"
                  className={`voice-button ${mode === 'join' ? 'active' : ''}`}
                  onClick={() => switchMode('join')}
                  disabled={isConnected || isLinked}
                >
                  I need the file
                </button>
              </div>

              {mode === 'host' ? (
                <>
                  <div className="code-box">
                    <div>
                      <p className="code-label">Drop code</p>
                      <p className="code-value">{roomCode}</p>
                    </div>
                    <button
                      type="button"
                      className={`copy-btn ${copied ? 'copied' : ''}`}
                      onClick={handleCopy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="prompt">Send this code to the other device.</p>
                  <p className="stage-note">{status}</p>
                  {isConnected ? (
                    <button
                      type="button"
                      className="stop-btn stop-btn-after"
                      onClick={stopTransfer}
                    >
                      Stop waiting
                    </button>
                  ) : (
                    <button type="button" className="big-button" onClick={connectSocket}>
                      Start waiting
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="prompt">Enter the code from the other device.</p>
                  <label className="sr-only" htmlFor="dropRoomCode">
                    Drop code
                  </label>
                  <input
                    id="dropRoomCode"
                    className="code-input"
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value)}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={isConnected}
                  />
                  <button
                    type="button"
                    className="big-button"
                    onClick={handleConnect}
                    disabled={isConnected || roomCode.length !== 6}
                  >
                    {isConnected ? 'Waiting…' : 'Connect'}
                  </button>
                  {isConnected ? (
                    <button
                      type="button"
                      className="stop-btn stop-btn-after"
                      onClick={stopTransfer}
                    >
                      Disconnect
                    </button>
                  ) : null}
                  <p className="stage-note">{status}</p>
                </>
              )}
            </div>
          </section>

          {isLinked ? (
            <section className="panel-wrap ft-panel-wrap">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">HexDrop · Linked</p>
                    <h2 className="panel-title">Drop files anywhere</h2>
                  </div>
                  <StatusPill live text="Linked" />
                </div>

                <div
                  className={`dropzone ft-zone ${dragging ? 'dropzone-dragging' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (fileInputRef.current) fileInputRef.current.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleInputChange}
                  />
                  <span className="dropzone-mark" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
                      <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
                    </svg>
                  </span>
                  <p className="dropzone-main">Drop files here</p>
                  <p className="dropzone-sub">
                    or click to browse — files travel peer to peer, never through a server
                  </p>
                  <span className="dropzone-hint">Any file · No size limit</span>
                </div>

                {sendItems.length ? (
                  <div className="transfer-block">
                    <p className="transfer-block-label">Sending</p>
                    <div className="transfer-list">
                      {sendItems.map((item) => (
                        <div key={item.id} className="transfer-item">
                          <div className="transfer-item-head">
                            <span className="transfer-name">{item.name}</span>
                            <span className="transfer-meta">
                              {item.state === 'done'
                                ? `Sent · ${formatBytes(item.size)}`
                                : item.state === 'error'
                                  ? 'Failed'
                                  : item.state === 'cancelled'
                                    ? 'Cancelled'
                                    : `${percentOf(item.size, item.progress)}% · ${formatBytes(item.size)}`}
                            </span>
                          </div>
                          <div className="transfer-bar">
                            <div
                              className="transfer-fill"
                              style={{ width: `${percentOf(item.size, item.progress)}%` }}
                            />
                          </div>
                          {item.state === 'queued' || item.state === 'sending' ? (
                            <div className="transfer-actions">
                              <button
                                type="button"
                                className="transfer-action"
                                onClick={() => cancelSend(item.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {recvItems.length ? (
                  <div className="transfer-block">
                    <p className="transfer-block-label">Received</p>
                    <div className="transfer-list">
                      {recvItems.map((item) => (
                        <div key={item.id} className="transfer-item">
                          <div className="transfer-item-head">
                            <span className="transfer-name">{item.name}</span>
                            <span className="transfer-meta">
                              {item.state === 'done'
                                ? `Received · ${formatBytes(item.size)}`
                                : item.state === 'cancelled'
                                  ? 'Cancelled'
                                  : `${percentOf(item.size, item.progress)}% · ${formatBytes(item.size)}`}
                            </span>
                          </div>
                          <div className="transfer-bar">
                            <div
                              className="transfer-fill"
                              style={{ width: `${percentOf(item.size, item.progress)}%` }}
                            />
                          </div>
                          {item.state === 'done' ? (
                            <div className="transfer-actions">
                              {isReadable(item.name) && onOpenInReader ? (
                                <button
                                  type="button"
                                  className="transfer-action"
                                  onClick={() => onOpenInReader(item.file)}
                                >
                                  Read in HexRead
                                </button>
                              ) : null}
                              <a
                                className="transfer-action transfer-action-link"
                                href={item.url}
                                download={item.name}
                              >
                                Download
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button type="button" className="stop-btn" onClick={stopTransfer}>
                  Disconnect
                </button>
              </div>
            </section>
          ) : null}
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default FileTransfer;
