import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { miaStatus } from '../../game/teach';
import type { TeachBackResult, TeachSpot } from '../../types/game';
import { canRecordVoice, MAX_VOICE_SECONDS, startVoiceNote, type Recording } from '../../utils/voiceNote';
import { Leaf, MiaFace } from './icons';

/** Mia's words, in a speech bubble pointing up at her face. */
const Says: React.FC<{ children: React.ReactNode; testId?: string }> = ({ children, testId }) => (
  <div data-testid={testId} className="relative rounded-2xl bg-white border-2 border-paper-edge px-4 py-3 font-semibold leading-snug">
    <span aria-hidden="true" className="absolute -top-[9px] left-7 w-4 h-4 rotate-45 bg-white border-l-2 border-t-2 border-paper-edge" />
    <span className="relative">{children}</span>
  </div>
);

/** The slate Mia holds up with her wrong working, as chalk on a board. */
const Slate: React.FC<{ text: string }> = ({ text }) => (
  <div className="inline-flex items-center rounded-lg border-4 border-[#b08653] bg-[#2f3b36] px-3 py-1.5 font-black tracking-wide text-[#f3efe2] shadow-[0_2px_0_#7d5d3a]">
    {text}
  </div>
);

const Ticks: React.FC<{ title: string; points: string[]; done: boolean }> = ({ title, points, done }) =>
  points.length === 0 ? null : (
    <div className="space-y-1.5">
      <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{title}</div>
      <ul className="space-y-1">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm font-semibold">
            <span className="mt-0.5 shrink-0">{done ? <Leaf size={16} /> : <Leaf size={16} hollow />}</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );

const fmt = (s: number) => `0:${String(s).padStart(2, '0')}`;

/**
 * Talking to Mia: she shows the mix-up she's stuck on, and the kid explains it by typing or talking.
 * Docks like the question card: left on wide screens, a bottom sheet on phones.
 */
export const TeachCard: React.FC = () => {
  const conceptId = useGameStore((s) => s.openTeachSpot);
  if (!conceptId) return null;
  // A fresh card (and fresh text box) for each Mia.
  return <MiaConversation key={conceptId} conceptId={conceptId} />;
};

const MiaConversation: React.FC<{ conceptId: string }> = ({ conceptId }) => {
  const { spots, world, trees, teachBacks, pending, result, error, submitTeachBack, closeMia, getUnlockedConcepts } = useGameStore(
    useShallow((s) => ({
      spots: s.teachSpots,
      world: s.world,
      trees: s.trees,
      teachBacks: s.teachBacks,
      pending: s.teachBackPending,
      result: s.teachBackResult,
      error: s.teachBackError,
      submitTeachBack: s.submitTeachBack,
      closeMia: s.closeMia,
      getUnlockedConcepts: s.getUnlockedConcepts,
    }))
  );
  const spot = spots.find((t) => t.conceptId === conceptId);
  const concept = world?.concepts.find((c) => c.id === conceptId);
  if (!spot) return null;

  const status = miaStatus(trees, conceptId, getUnlockedConcepts(), teachBacks);
  const happy = !!result?.passed || (status.kind === 'helped' && !result);
  const lastHelp = teachBacks.find((r) => r.conceptId === conceptId && r.passed);

  let body: React.ReactNode;
  if (result) body = <Answered result={result} />;
  else if (status.kind === 'growing')
    body = (
      <>
        <Says testId="mia-says">
          I’m stuck on something in here. Grow {status.treesToGo} more tree{status.treesToGo > 1 ? 's' : ''} in this grove, then come and explain it to me?
        </Says>
        {spot.board && <Slate text={spot.board} />}
        <button onClick={closeMia} className="btn btn-leaf w-full py-2.5">
          OK, I’ll be back
        </button>
      </>
    );
  else if (status.kind === 'helped')
    body = (
      <>
        <Says testId="mia-says">I get it now, thanks to you!</Says>
        {lastHelp?.words && (
          <p className="text-sm text-ink-soft">
            What you told her: <span className="font-semibold text-ink">“{lastHelp.words}”</span>
          </p>
        )}
        <button onClick={closeMia} className="btn btn-leaf w-full py-2.5">
          Bye, Mia
        </button>
      </>
    );
  else body = <Explain spot={spot} pending={pending} error={error} onSubmit={submitTeachBack} />;

  return (
    <div className="fixed z-40 inset-x-0 bottom-0 sm:bottom-auto sm:top-24 lg:right-auto lg:left-4 flex justify-center p-2 sm:px-4 lg:p-0 pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="mia-title"
        data-testid="mia-card"
        className="paper rise-in pointer-events-auto relative w-full max-w-xl lg:w-[27rem] max-h-[62dvh] sm:max-h-[calc(100dvh-7.5rem)] overflow-hidden flex flex-col rounded-3xl"
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b-2 border-paper-edge/70 bg-paper-deep/60">
          <MiaFace size={42} mood={happy ? 'happy' : 'puzzled'} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 id="mia-title" className="font-black leading-tight">
              Mia
            </h2>
            <p className="text-xs font-bold text-ink-soft truncate">{concept?.questName ?? 'Your classmate'}</p>
          </div>
          <button onClick={closeMia} className="btn btn-paper w-9 h-9 p-0 shrink-0" aria-label="Close" data-testid="close-mia-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{body}</div>
      </div>
    </div>
  );
};

const Explain: React.FC<{
  spot: TeachSpot;
  pending: boolean;
  error: string | null;
  onSubmit: (said: { text: string } | { audio: { base64: string; mimeType: string } }) => Promise<void>;
}> = ({ spot, pending, error, onSubmit }) => {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState<Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [micNote, setMicNote] = useState<string | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  recordingRef.current = recording;
  const voice = canRecordVoice();

  const send = () => {
    if (text.trim() && !pending) onSubmit({ text: text.trim() });
  };

  const startTalking = async () => {
    setMicNote(null);
    try {
      const r = await startVoiceNote();
      setSeconds(0);
      setRecording(r);
    } catch {
      setMicNote('Mia can’t hear you: the microphone is off. You can type it instead.');
    }
  };

  const stopAndSend = useCallback(async () => {
    const r = recordingRef.current;
    if (!r) return;
    setRecording(null);
    const note = await r.finish().catch(() => null);
    if (!note) {
      setMicNote('That recording came out empty. Try again, or type it.');
      return;
    }
    onSubmit({ audio: note });
  }, [onSubmit]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= MAX_VOICE_SECONDS) stopAndSend();
  }, [recording, seconds, stopAndSend]);

  // Walking away (or closing the card) mid-recording throws the note away and lets go of the microphone.
  useEffect(() => () => recordingRef.current?.cancel(), []);

  return (
    <>
      <Says testId="mia-says">{spot.puzzledThought}</Says>
      {spot.board && <Slate text={spot.board} />}

      {pending ? (
        <div data-testid="mia-thinking" className="flex items-center gap-3 rounded-2xl bg-paper-deep px-4 py-3 font-semibold">
          <MiaFace size={30} className="shrink-0" />
          <span>
            Mia is thinking about what you said
            <span className="thinking-dots" aria-hidden="true" />
          </span>
        </div>
      ) : recording ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-berry-soft px-4 py-3 font-bold" data-testid="mia-listening">
            <span className="w-3 h-3 rounded-full bg-berry animate-pulse" aria-hidden="true" />
            Mia is listening… {fmt(seconds)}
            <span className="ml-auto text-xs font-semibold text-ink-soft">up to {MAX_VOICE_SECONDS}s</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                recording.cancel();
                setRecording(null);
              }}
              className="btn btn-paper flex-1 py-2.5"
            >
              Cancel
            </button>
            <button onClick={stopAndSend} data-testid="mia-stop" className="btn btn-leaf flex-1 py-2.5">
              <Square className="w-4 h-4" fill="currentColor" />
              Done talking
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <label htmlFor="mia-text" className="block text-sm font-extrabold">
            Explain it to Mia. Why doesn’t her way work, and what should she do instead?
          </label>
          <textarea
            id="mia-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
            }}
            maxLength={1200}
            placeholder="Mia, the thing is…"
            data-testid="mia-text"
            className="w-full px-3 py-2 bg-white border-2 border-paper-edge rounded-xl text-base focus:outline-none focus:border-leaf"
          />
          <div className="flex gap-2">
            {voice && (
              <button onClick={startTalking} data-testid="mia-record" className="btn btn-paper flex-1 py-2.5" title="Say it out loud instead">
                <Mic className="w-4 h-4" />
                Say it
              </button>
            )}
            <button onClick={send} disabled={!text.trim()} data-testid="mia-send" className="btn btn-leaf flex-1 py-2.5">
              Explain
            </button>
          </div>
          {(micNote || error) && <p className="text-sm font-bold text-berry-deep">{micNote ?? error}</p>}
        </div>
      )}
    </>
  );
};

const Answered: React.FC<{ result: TeachBackResult }> = ({ result }) => {
  const closeMia = useGameStore((s) => s.closeMia);
  const tryAgain = () => useGameStore.setState({ teachBackResult: null });

  return (
    <>
      {result.passed ? (
        <div className="flex items-center gap-2 text-lg font-black text-leaf-deep" data-testid="mia-got-it">
          <Leaf size={22} /> Mia gets it now!
        </div>
      ) : (
        <div className="text-lg font-black" data-testid="mia-still-stuck">
          Mia’s still a bit stuck
        </div>
      )}
      <Says testId="mia-says">{result.miaReply}</Says>
      {result.transcript !== null && (
        <p className="text-sm text-ink-soft">
          Mia heard: <span className="font-semibold text-ink">{result.transcript ? `“${result.transcript}”` : 'nothing she could make out'}</span>
        </p>
      )}
      <Ticks title={result.passed ? 'You explained' : 'You got this part across'} points={result.hit} done />
      {result.passed && <Ticks title="Also good to say" points={result.missing} done={false} />}
      {result.passed ? (
        <button onClick={closeMia} data-testid="mia-done" className="btn btn-leaf w-full py-2.5">
          Keep going
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={closeMia} className="btn btn-paper flex-1 py-2.5">
            Later
          </button>
          <button onClick={tryAgain} data-testid="mia-try-again" className="btn btn-sun flex-1 py-2.5">
            Try again
          </button>
        </div>
      )}
    </>
  );
};
