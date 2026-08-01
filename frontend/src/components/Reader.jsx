import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser.js';
import { Navbar, Footer } from './Chrome';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const FEMALE_HINTS = [
  'female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'moira', 'tessa',
  'veena', 'zira', 'hazel', 'aria', 'jenny', 'jennifer', 'fiona', 'serena',
  'tracy', 'zuzana', 'linda', 'sharon', 'alli', 'allison', 'ellen', 'kate',
  'katherine', 'susan', 'emma', 'olivia', 'sophie', 'amy', 'tina', 'maria',
  'julia', 'ava', 'joanna', 'salli', 'kimberly', 'ivy', 'kendra', 'celia',
  'isabella', 'naja', 'freda', 'kathleen', 'milena', 'xinyi', 'yu-shu',
  'ting-ting', 'meijia', 'xiaoxiao', 'xiaoqiu', 'yan', 'hilda', 'nina', 'naomi',
  'dilara', 'elsa', 'melina', 'helena', 'greta', 'zofia', 'maja', 'kajsa',
  'cora', 'celine', 'clara', 'aura', 'ruth', 'lili', 'sarah', 'nicole', 'dee',
  'doreen', 'libby', 'sonia', 'natalie', 'elena', 'mae', 'amelie', 'charlotte',
  'colette', 'michelle',
];

const MALE_HINTS = [
  'male', 'man', 'guy', 'boy', 'david', 'daniel', 'alex', 'fred', 'george',
  'gordon', 'reid', 'lee', 'thomas', 'ryan', 'tony', 'arthur', 'aaron',
  'justin', 'matt', 'matthew', 'andrew', 'mark', 'markus', 'oliver', 'harry',
  'max', 'james', 'john', 'jacob', 'raul', 'ricardo', 'miguel', 'jorge',
  'jeff', 'joey', 'eric', 'johnathan', 'paul', 'francis', 'ralph', 'julius',
  'kevin', 'cole', 'brian', 'arnaud', 'nathan', 'yannick', 'roger', 'eitan',
  'viktor', 'tomas', 'eddie', 'christopher', 'jordan', 'peter', 'steven',
  'stephen', 'michael', 'dan', 'danny', 'jose', 'gonzalo', 'diego', 'hugo',
  'carles', 'enrique', 'ravi',
];

function genderOfVoice(voice) {
  const gender = voice && voice.gender;
  if (gender === 'female') return 'female';
  if (gender === 'male') return 'male';
  const name = ((voice && voice.name) || '').toLowerCase();
  if (FEMALE_HINTS.some((hint) => name.includes(hint))) return 'female';
  if (MALE_HINTS.some((hint) => name.includes(hint))) return 'male';
  return null;
}

function normalizeText(raw) {
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parsePdf(file) {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (typeof item.str === 'string') {
          text += item.str;
          if (item.hasEOL) text += '\n';
        }
      }
      pages.push(normalizeText(text));
      page.cleanup();
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

async function parseDocx(file) {
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  const paragraphs = (result.value || '')
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  const pages = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n${paragraph}` : paragraph;
    if (current && candidate.length > 2200) {
      pages.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) pages.push(current);
  return pages;
}

function splitIntoChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+[\s'")\]]*|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';

  const push = (candidate) => {
    if ((current + ' ' + candidate).trim().length <= 260) {
      current = current ? `${current} ${candidate}` : candidate;
      return false;
    }
    if (current) chunks.push(current);
    current = candidate;
    return true;
  };

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    let rest = trimmed;
    while (rest.length > 260) {
      let cut = rest.lastIndexOf(' ', 260);
      if (cut <= 0) cut = 260;
      const part = rest.slice(0, cut).trim();
      rest = rest.slice(cut).trim();
      push(part);
    }
    if (rest) push(rest);
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function formatChars(n) {
  return n.toLocaleString('en-US');
}

export default function Reader({ onExit, onNavigate }) {
  const [doc, setDoc] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [gender, setGender] = useState(null);
  const [rate, setRate] = useState(1);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [speechSupported] = useState(() => Boolean(window.speechSynthesis));

  const fileInputRef = useRef(null);
  const pageTextRef = useRef(null);

  const pagesRef = useRef([]);
  const pageChunksRef = useRef({});
  const pageRef = useRef(0);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const voiceRef = useRef(null);
  const autoRef = useRef(true);
  const rateRef = useRef(1);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return undefined;
    }
    const load = () => {
      const list = synth.getVoices();
      if (!list || !list.length) return;
      setVoices(list);
      if (!voiceRef.current) {
        const female = list.find((voice) => genderOfVoice(voice) === 'female');
        const male = list.find((voice) => genderOfVoice(voice) === 'male');
        const chosen = female || male || list[0];
        if (chosen) {
          voiceRef.current = chosen;
          setVoiceURI(chosen.voiceURI);
          setGender(genderOfVoice(chosen));
        }
      }
    };
    const timer = window.setTimeout(load, 0);
    synth.addEventListener('voiceschanged', load);
    return () => {
      window.clearTimeout(timer);
      synth.removeEventListener('voiceschanged', load);
      synth.cancel();
    };
  }, []);

  function finishSession() {
    playingRef.current = false;
    pausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
  }

  function speakFrom(pageIdx, pos) {
    const allPages = pagesRef.current;
    if (!allPages.length || pageIdx >= allPages.length) {
      finishSession();
      return;
    }

    pageRef.current = pageIdx;
    setCurrentPage(pageIdx);

    if (!pageChunksRef.current[pageIdx]) {
      pageChunksRef.current[pageIdx] = splitIntoChunks(allPages[pageIdx] || '');
    }
    const chunks = pageChunksRef.current[pageIdx];

    if (pos >= (allPages[pageIdx] || '').length) {
      advanceOrStop(pageIdx);
      return;
    }

    let acc = 0;
    let startChunk = 0;
    let startInChunk = 0;
    for (let k = 0; k < chunks.length; k += 1) {
      if (acc + chunks[k].length > pos) {
        startChunk = k;
        startInChunk = pos - acc;
        break;
      }
      acc += chunks[k].length;
    }
    posRef.current = pos;
    speakChunkChain(pageIdx, startChunk, startInChunk, acc);
  }

  function advanceOrStop(pageIdx) {
    const allPages = pagesRef.current;
    if (!playingRef.current) return;
    if (autoRef.current && pageIdx < allPages.length - 1) {
      setTimeout(() => {
        if (playingRef.current && !pausedRef.current) speakFrom(pageIdx + 1, 0);
      }, 1600);
    } else {
      finishSession();
    }
  }

  function speakChunkChain(pageIdx, chunkIndex, startInChunk, baseOffset) {
    const synth = window.speechSynthesis;
    const chunks = pageChunksRef.current[pageIdx];
    if (!synth || !playingRef.current) return;

    if (!chunks || chunkIndex >= chunks.length) {
      advanceOrStop(pageIdx);
      return;
    }

    const fullChunk = chunks[chunkIndex];
    const chunkText = startInChunk > 0 ? fullChunk.slice(startInChunk) : fullChunk;
    const offsetBefore = baseOffset + (fullChunk.length - chunkText.length);

    const utterance = new SpeechSynthesisUtterance(chunkText);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = rateRef.current;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onboundary = (event) => {
      if (typeof event.charIndex === 'number') {
        posRef.current = offsetBefore + event.charIndex;
      }
    };
    utterance.onend = () => {
      if (!playingRef.current) return;
      posRef.current = offsetBefore + chunkText.length;
      speakChunkChain(pageIdx, chunkIndex + 1, 0, baseOffset + fullChunk.length);
    };
    utterance.onerror = (event) => {
      if (event && (event.error === 'interrupted' || event.error === 'canceled')) return;
      finishSession();
    };

    synth.cancel();
    synth.speak(utterance);
  }

  function applyVoice(voice, selectedGender) {
    voiceRef.current = voice || null;
    setVoiceURI(voice ? voice.voiceURI : '');
    setGender(selectedGender || null);
    if (playingRef.current && !pausedRef.current) {
      speakFrom(pageRef.current, posRef.current);
    }
  }

  function handlePlay() {
    const synth = window.speechSynthesis;
    if (!synth) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }
    if (!pagesRef.current.length) return;
    if (pausedRef.current) {
      pausedRef.current = false;
      playingRef.current = true;
      setIsPaused(false);
      setIsPlaying(true);
      speakFrom(pageRef.current, posRef.current);
      return;
    }
    playingRef.current = true;
    pausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    speakFrom(pageRef.current, posRef.current);
  }

  function handlePause() {
    if (!playingRef.current || pausedRef.current) return;
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    pausedRef.current = true;
    setIsPaused(true);
  }

  function handleStop() {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    playingRef.current = false;
    pausedRef.current = false;
    posRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
  }

  function goToPage(idx) {
    const allPages = pagesRef.current;
    if (!allPages.length) return;
    const clamped = Math.max(0, Math.min(allPages.length - 1, idx));
    const wasActive = playingRef.current;
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    playingRef.current = false;
    pausedRef.current = false;
    posRef.current = 0;
    pageRef.current = clamped;
    setCurrentPage(clamped);
    setIsPlaying(false);
    setIsPaused(false);
    if (wasActive) {
      playingRef.current = true;
      setIsPlaying(true);
      speakFrom(clamped, 0);
    }
  }

  function pickVoiceForGender(wanted) {
    if (!voices.length) return;
    const matches = voices.filter((voice) => genderOfVoice(voice) === wanted);
    let chosen;
    if (matches.length) {
      chosen =
        matches.find((voice) => (voice.lang || '').toLowerCase().startsWith('en')) || matches[0];
    } else {
      chosen = voices[0];
    }
    applyVoice(chosen, wanted);
  }

  function changeRate(nextRate) {
    rateRef.current = nextRate;
    setRate(nextRate);
    if (playingRef.current && !pausedRef.current) {
      speakFrom(pageRef.current, posRef.current);
    }
  }

  function toggleAuto() {
    autoRef.current = !autoRef.current;
    setAuto(autoRef.current);
  }

  function reset() {
    handleStop();
    pagesRef.current = [];
    pageChunksRef.current = {};
    setPages([]);
    setDoc(null);
    setCurrentPage(0);
    setError('');
  }

  async function handleFile(file) {
    if (!file) return;
    handleStop();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Please upload a .pdf or .docx file.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const rawPages = ext === 'pdf' ? await parsePdf(file) : await parseDocx(file);
      const cleanPages = rawPages.map((page) => (page || '').trim());
      const total = cleanPages.reduce((sum, page) => sum + page.length, 0);
      if (total === 0) {
        setError(
          `No readable text found in "${file.name}". Scanned or image-only documents can't be read aloud.`,
        );
        return;
      }
      pagesRef.current = cleanPages;
      pageChunksRef.current = {};
      pageRef.current = 0;
      posRef.current = 0;
      setPages(cleanPages);
      setDoc({ fileName: file.name, pageCount: cleanPages.length, totalChars: total });
      setCurrentPage(0);
    } catch (err) {
      console.error(err);
      setError(`Could not read "${file.name}". Try a different file.`);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(event) {
    const file = event.target.files && event.target.files[0];
    if (file) handleFile(file);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  useEffect(() => {
    if (pageTextRef.current) pageTextRef.current.scrollTop = 0;
  }, [currentPage]);

  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI) || null;
  const pageCount = doc ? doc.pageCount : 0;

  return (
    <main className="app view">
      <Navbar onExit={onExit} onNavigate={onNavigate} activeView="reader" />
      <main className="page">
        <section className="reader">
          <header className="info-header">
            <p className="panel-eyebrow">HexRead · Built into Hexcast</p>
            <h1 className="info-title">Listen to a document.</h1>
            <p className="info-lede">
              Upload a PDF or DOCX and HexRead reads it to you, page by page, in a male or female
              voice. Your file never leaves this device.
            </p>
          </header>

          {!doc ? (
            <div
              className={`dropzone ${dragging ? 'dropzone-dragging' : ''} ${loading ? 'dropzone-loading' : ''}`}
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
                accept=".pdf,.docx"
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
                  <path d="M12 16V4m0 0L7 9m5-5l5 5" />
                  <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
                </svg>
              </span>
              <p className="dropzone-main">
                {loading ? 'Reading your file…' : 'Drop a PDF or DOCX here'}
              </p>
              <p className="dropzone-sub">
                {loading
                  ? 'Extracting the text, page by page.'
                  : 'or click to browse — everything stays on your device'}
              </p>
              <span className="dropzone-hint">PDF · DOCX</span>
            </div>
          ) : null}

          {!doc && !speechSupported ? (
            <div className="reader-note">
              Your browser does not support the Web Speech API, so it can&apos;t read documents
              aloud. Try the latest Chrome, Edge, or Safari.
            </div>
          ) : null}

          {error ? <div className="reader-error">{error}</div> : null}

          {doc ? (
            <>
              <div className="reader-toolbar">
                <div className="reader-file">
                  <span className="micro">Document</span>
                  <span className="reader-filename">{doc.fileName}</span>
                  <span className="reader-meta">
                    {doc.pageCount} pages · {formatChars(doc.totalChars)} characters
                  </span>
                </div>
                <button type="button" className="stop-btn reader-newfile" onClick={reset}>
                  New file
                </button>
              </div>

              <div className="reader-controls">
                <div className="reader-control">
                  <span className="micro">Voice</span>
                  <div className="voice-toggle" role="group" aria-label="Choose a voice">
                    <button
                      type="button"
                      className={`voice-button ${gender === 'female' ? 'active' : ''}`}
                      onClick={() => pickVoiceForGender('female')}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      className={`voice-button ${gender === 'male' ? 'active' : ''}`}
                      onClick={() => pickVoiceForGender('male')}
                    >
                      Male
                    </button>
                  </div>
                  <select
                    className="reader-select"
                    value={voiceURI}
                    onChange={(event) => {
                      const voice = voices.find((v) => v.voiceURI === event.target.value);
                      if (voice) applyVoice(voice, genderOfVoice(voice));
                    }}
                    aria-label="Available voices"
                  >
                    {!voiceURI ? <option value="">Choose a voice</option> : null}
                    {voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} · {voice.lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="reader-control">
                  <span className="micro">Speed</span>
                  <div className="voice-toggle" role="group" aria-label="Choose reading speed">
                    {[0.75, 1, 1.25, 1.5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`voice-button ${rate === value ? 'active' : ''}`}
                        onClick={() => changeRate(value)}
                      >
                        {value}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="reader-stage">
                <div className="reader-page">
                  <div className="reader-page-head">
                    <span className="micro">
                      Page {currentPage + 1} of {pageCount}
                    </span>
                    <span className={`reader-live ${isPlaying ? 'reader-live-on' : ''}`}>
                      {isPaused ? 'Paused' : isPlaying ? 'Reading…' : 'Ready'}
                    </span>
                  </div>
                  <div ref={pageTextRef} className="reader-text">
                    {pages[currentPage] || (
                      <span className="reader-empty">No readable text on this page.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="reader-transport">
                <button
                  type="button"
                  className="transport-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {isPlaying && !isPaused ? (
                  <button
                    type="button"
                    className="transport-btn transport-btn-primary"
                    onClick={handlePause}
                    aria-label="Pause"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" />
                      <rect x="14" y="5" width="4" height="14" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="transport-btn transport-btn-primary"
                    onClick={handlePlay}
                    aria-label="Play"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 5l12 7-12 7z" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  className="transport-btn"
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  aria-label="Stop"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="transport-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount - 1}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>

                <label className="reader-auto">
                  <input type="checkbox" checked={auto} onChange={toggleAuto} />
                  <span>Continue through the document</span>
                </label>
              </div>

              {selectedVoice ? (
                <p className="reader-voice-note">
                  Voice: <span className="reader-voice-name">{selectedVoice.name}</span> ·{' '}
                  {selectedVoice.lang}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}
