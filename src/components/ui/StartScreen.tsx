import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Camera, FileText, PenLine, Users } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { WorldData } from '../../types/game';
import { SAMPLE_READING_WORLD } from '../../data/readingWorld';
import { Sprout } from './icons';

type Source = 'topic' | 'text' | 'file';

const SOURCES: Array<{ id: Source; label: string; icon: React.ReactNode }> = [
  { id: 'topic', label: 'Topic', icon: <PenLine className="w-4 h-4" /> },
  { id: 'text', label: 'Paste text', icon: <FileText className="w-4 h-4" /> },
  { id: 'file', label: 'Photo or PDF', icon: <Camera className="w-4 h-4" /> },
];
const SUGGESTIONS = ['Primary 5 Fractions', 'Ecosystems & Food Chains', 'Primary 4 English: Reading'];

const field =
  'w-full px-4 py-3 bg-white border-2 border-paper-edge rounded-xl text-base text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-leaf transition-colors';

/** The cover picture: hills, a winding path and the explorer, drawn in the game's own palette. */
const CoverArt: React.FC = () => (
  <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 inset-x-0 w-full h-[42dvh] pointer-events-none" aria-hidden="true">
    <path d="M0 170 C 220 110 420 150 620 120 C 860 85 1080 150 1440 105 V 360 H 0 Z" fill="#bfd394" />
    <path d="M0 225 C 260 170 520 215 760 185 C 1000 155 1220 215 1440 180 V 360 H 0 Z" fill="#a2bc6c" />
    <path d="M0 290 C 300 245 560 290 820 260 C 1060 235 1260 280 1440 255 V 360 H 0 Z" fill="#8ca95b" />
    <path d="M700 360 C 690 320 760 300 735 262 C 712 228 770 205 748 186 C 735 175 745 160 752 150" stroke="#e2c898" strokeWidth="34" fill="none" strokeLinecap="round" />
    {[
      [120, 150, 1.1, '#4f8c50'],
      [210, 140, 0.8, '#5f9f5a'],
      [330, 160, 1.3, '#4f8c50'],
      [1150, 150, 1.2, '#5f9f5a'],
      [1260, 130, 0.9, '#4f8c50'],
      [1360, 145, 1.1, '#70ae62'],
      [520, 190, 0.9, '#70ae62'],
      [960, 180, 1.0, '#4f8c50'],
    ].map(([x, y, s, c], i) => (
      <g key={`pine${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x="-4" y="-6" width="8" height="18" rx="2" fill="#6b4a2b" />
        <path d="M0 -70 L 26 -22 H -26 Z M0 -48 L 32 -2 H -32 Z" fill={c as string} stroke="#2f2a22" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
    ))}
    {[
      [60, 250, 1.2, '#70ae62'],
      [420, 250, 1.0, '#5f9f5a'],
      [610, 275, 0.8, '#4f8c50'],
      [1010, 250, 1.1, '#70ae62'],
      [1320, 265, 1.3, '#5f9f5a'],
    ].map(([x, y, s, c], i) => (
      <g key={`round${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x="-5" y="-8" width="10" height="26" rx="3" fill="#eee6d6" stroke="#2f2a22" strokeWidth="2" />
        <circle cx="0" cy="-34" r="30" fill={c as string} stroke="#2f2a22" strokeWidth="2.5" />
        <circle cx="-9" cy="-44" r="5" fill="#fbe3ea" />
        <circle cx="11" cy="-28" r="4" fill="#fbe3ea" />
      </g>
    ))}
    {/* The explorer, on their way up the path */}
    <g transform="translate(728 300)">
      <ellipse cx="0" cy="14" rx="14" ry="4" fill="#2f2a22" opacity="0.2" />
      <rect x="-6" y="0" width="5" height="12" rx="2" fill="#4a4e69" />
      <rect x="1" y="0" width="5" height="12" rx="2" fill="#4a4e69" />
      <path d="M-11 2 C -11 -18, 11 -18, 11 2 Z" fill="#f2c14e" stroke="#2f2a22" strokeWidth="2" />
      <circle cx="0" cy="-24" r="9" fill="#f1cfae" stroke="#2f2a22" strokeWidth="2" />
      <path d="M-9.5 -25 C -9.5 -38, 9.5 -38, 9.5 -25 Z" fill="#d9534f" stroke="#2f2a22" strokeWidth="2" />
      <circle cx="0" cy="-37" r="3.5" fill="#f6efe0" stroke="#2f2a22" strokeWidth="1.5" />
    </g>
  </svg>
);

/** Join a class: the teacher's code and a first name, and the teacher's forest opens with classmates in it. */
const JoinClass: React.FC<{ onJoining: () => void }> = ({ onJoining }) => {
  const joinClassRoom = useGameStore((s) => s.joinClassRoom);
  const roomError = useGameStore((s) => s.roomError);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const ready = code.replace(/[^a-z0-9]/gi, '').length === 4 && name.trim().length > 0;

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || joining) return;
    onJoining();
    setJoining(true);
    await joinClassRoom(code, name.trim());
    setJoining(false);
  };

  return (
    <form onSubmit={join} className="paper w-full p-4 sm:p-5 space-y-3" data-testid="join-class">
      <div className="flex items-center gap-2.5">
        <Users className="w-5 h-5 text-leaf-deep" />
        <h2 className="text-lg font-black">Join your class</h2>
      </div>
      <div className="grid grid-cols-[7.5rem_1fr] gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="CODE"
          aria-label="Class code"
          autoComplete="off"
          autoCapitalize="characters"
          data-testid="class-code-input"
          className={`${field} text-center font-black tracking-[0.3em] uppercase`}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="Your first name"
          aria-label="Your first name"
          autoComplete="given-name"
          data-testid="class-name-input"
          className={field}
        />
      </div>
      {roomError && (
        <p className="text-sm font-bold text-berry-deep" data-testid="join-error">
          {roomError}
        </p>
      )}
      <button type="submit" disabled={!ready || joining} data-testid="join-class-btn" className="btn btn-leaf w-full py-2.5">
        {joining ? 'Joining…' : 'Join'}
      </button>
    </form>
  );
};

export const StartScreen: React.FC = () => {
  const loadWorld = useGameStore((s) => s.loadWorld);
  const loadSampleWorld = useGameStore((s) => s.loadSampleWorld);

  const [source, setSource] = useState<Source>('topic');
  const [topicInput, setTopicInput] = useState('Primary 5 Fractions');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; mimeType: string; base64: string; size: string } | null>(null);
  const [isGrowing, setIsGrowing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Each grow gets a number. A reply for an older number is ignored, so a slow Gemini answer can't
  // replace the sample forest after the kid has already walked into it.
  const growRequest = useRef(0);

  useEffect(() => {
    if (!isGrowing) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isGrowing]);

  const playSample = () => {
    growRequest.current++;
    setIsGrowing(false);
    loadSampleWorld();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] || '';
      setUploadedFile({ name: file.name, mimeType: file.type || 'application/octet-stream', base64, size: `${(file.size / 1024).toFixed(1)} KB` });
      setErrorMsg(null);
    };
    reader.onerror = () => setErrorMsg("We couldn't read that file. Try another photo or PDF.");
    reader.readAsDataURL(file);
  };

  const handleGrowWorld = async () => {
    const payload: { topic?: string; text?: string; fileData?: { mimeType: string; base64: string } } = {};
    if (source === 'topic') {
      if (!topicInput.trim()) return setErrorMsg('Type a topic first.');
      payload.topic = topicInput.trim();
    } else if (source === 'text') {
      if (!textInput.trim()) return setErrorMsg('Paste some worksheet questions first.');
      payload.text = textInput.trim();
    } else {
      if (!uploadedFile) return setErrorMsg('Choose a photo or PDF first.');
      payload.fileData = { mimeType: uploadedFile.mimeType, base64: uploadedFile.base64 };
    }

    const request = ++growRequest.current;
    setIsGrowing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/generate-world', {
        method: 'POST',
        // A stuck request gives up and shows the retry, instead of spinning.
        signal: AbortSignal.timeout(150_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `The server said no (${res.status}).`);
      }
      const worldData: WorldData = await res.json();
      if (!worldData.concepts?.length || !worldData.trees?.length) throw new Error('The forest came back empty.');
      if (request !== growRequest.current) return; // the kid already chose something else
      setIsGrowing(false);
      loadWorld(worldData);
    } catch (err: any) {
      if (request !== growRequest.current) return;
      console.error('Failed to grow world:', err);
      setIsGrowing(false);
      setErrorMsg(err?.message || "Gemini couldn't grow this forest right now.");
    }
  };

  return (
    <div
      className="min-h-dvh w-full relative overflow-hidden text-ink"
      style={{ background: 'linear-gradient(180deg, #8cc7df 0%, #cfe6e8 42%, #f6e8c8 72%)' }}
    >
      <CoverArt />

      <main className="relative z-10 w-full max-w-xl mx-auto px-4 pt-10 sm:pt-14 pb-[34dvh] flex flex-col items-center gap-5">
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Mastery Grove</h1>
          <p className="text-base sm:text-lg font-semibold text-ink-soft">Every question is a tree. Answer them and the forest grows.</p>
        </div>

        <div className="w-full flex flex-col items-center gap-2">
          <button onClick={playSample} data-testid="play-sample-btn" className="btn btn-sun w-full sm:w-auto px-7 py-3.5 text-lg">
            Walk the fractions forest
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              growRequest.current++;
              setIsGrowing(false);
              loadWorld(SAMPLE_READING_WORLD);
            }}
            data-testid="play-reading-btn"
            className="text-sm font-bold text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
          >
            or the autumn reading forest
          </button>
        </div>

        <JoinClass onJoining={() => growRequest.current++} />

        <section className="paper w-full p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black">Or grow one from your worksheet</h2>
            <p className="text-sm text-ink-soft">Type a topic, paste the questions, or snap a photo.</p>
          </div>

          <div role="tablist" className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-paper-deep">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={source === s.id}
                data-testid={`tab-${s.id}`}
                onClick={() => setSource(s.id)}
                disabled={isGrowing}
                className={`py-2 px-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  source === s.id ? 'bg-paper shadow-[0_2px_0_var(--color-paper-edge)] text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {source === 'topic' && (
            <div className="space-y-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Primary 5 Fractions"
                aria-label="Topic"
                disabled={isGrowing}
                className={field}
              />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setTopicInput(s)} className="px-2.5 py-1 rounded-full text-xs font-bold bg-leaf-soft text-leaf-deep hover:brightness-95">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {source === 'text' && (
            <textarea
              rows={5}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the worksheet questions here"
              aria-label="Worksheet text"
              disabled={isGrowing}
              className={`${field} text-sm leading-relaxed`}
            />
          )}

          {source === 'file' && (
            <label
              htmlFor="worksheet-file"
              className="block cursor-pointer rounded-2xl border-2 border-dashed border-paper-edge bg-white/70 p-5 text-center hover:border-leaf transition-colors"
            >
              <input type="file" id="worksheet-file" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={isGrowing} className="hidden" />
              <Camera className="w-7 h-7 mx-auto text-leaf" />
              {uploadedFile ? (
                <p className="mt-2 text-sm font-bold">
                  {uploadedFile.name} <span className="font-semibold text-ink-soft">({uploadedFile.size})</span>
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-bold">Choose a photo or PDF of the worksheet</p>
                  <p className="text-xs text-ink-soft">A clear phone photo works fine.</p>
                </>
              )}
            </label>
          )}

          {isGrowing && (
            <div className="rise-in flex items-center gap-3 rounded-2xl bg-leaf-soft px-4 py-3">
              <Sprout size={28} className="animate-bounce" />
              <div className="flex-1">
                <p className="font-bold">Planting your forest…</p>
                <p className="text-xs text-ink-soft">{elapsedSeconds}s · usually about 15 seconds</p>
              </div>
              {elapsedSeconds >= 60 && (
                <button onClick={playSample} data-testid="offer-sample-btn" className="text-sm font-bold underline">
                  Walk the fractions forest instead
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="rise-in rounded-2xl bg-berry-soft px-4 py-3 space-y-2.5">
              <p className="flex items-center gap-2 font-bold text-berry-deep">
                <AlertCircle className="w-4 h-4 shrink-0" />
                That didn't work
              </p>
              <p className="text-sm text-ink-soft">{errorMsg}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleGrowWorld} data-testid="retry-grow-btn" className="btn btn-berry px-3.5 py-1.5 text-sm">
                  Try again
                </button>
                <button onClick={playSample} data-testid="play-sample-world-btn" className="btn btn-paper px-3.5 py-1.5 text-sm">
                  Walk the fractions forest
                </button>
              </div>
            </div>
          )}

          <button onClick={handleGrowWorld} data-testid="grow-world-btn" disabled={isGrowing} className="btn btn-leaf w-full py-3 text-base">
            Grow my forest
          </button>
        </section>

        <p className="text-sm font-bold text-ink-soft text-center">Wrong answers tell us why. Right answers grow trees.</p>
        <footer className="text-xs text-ink-soft/80 text-center">Made by Afshal, Roshan and Sophie at the Berkeley x DeepMind hackathon.</footer>
      </main>
    </div>
  );
};
