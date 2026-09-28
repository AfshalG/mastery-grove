import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { ReflectionRating } from '../../types/game';
import { ByteFace, Leaf } from './icons';

const OPTIONS: Array<{ rating: ReflectionRating; label: string }> = [
  { rating: 1, label: 'Still confused' },
  { rating: 2, label: 'Getting there' },
  { rating: 3, label: 'I get it' },
  { rating: 4, label: 'I could teach it' },
];

/**
 * After a grove is fully grown: "How well do you know it now?" Thinking about their own learning helps it stick,
 * and when a kid's feeling and results disagree, Byte says so kindly.
 */
export const ReflectionCard: React.FC = () => {
  const { conceptId, world, questionOpen, feedbackOpen, submitReflection, dismissReflection } = useGameStore(
    useShallow((s) => ({
      conceptId: s.pendingReflection,
      world: s.world,
      questionOpen: s.selectedTree !== null || s.openTeachSpot !== null,
      feedbackOpen: s.showExplanationModal,
      submitReflection: s.submitReflection,
      dismissReflection: s.dismissReflection,
    }))
  );
  const [rating, setRating] = useState<ReflectionRating | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<{ feedback: string | null } | null>(null);

  useEffect(() => {
    setRating(null);
    setNote('');
    setSaved(null);
  }, [conceptId]);

  if (!conceptId || questionOpen || feedbackOpen) return null;
  const grove = world?.concepts.find((c) => c.id === conceptId);

  return (
    <div className="fixed z-50 inset-x-0 bottom-0 sm:bottom-auto sm:top-24 lg:right-auto lg:left-4 flex justify-center p-2 sm:px-4 lg:p-0 pointer-events-none">
      <div role="dialog" aria-labelledby="reflect-title" className="paper rise-in pointer-events-auto w-full max-w-lg lg:w-[27rem] p-5 space-y-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            {[0, 1, 2].map((i) => (
              <Leaf key={i} size={26} />
            ))}
          </div>
          <div>
            <h2 id="reflect-title" className="text-lg font-black leading-tight">
              {grove?.questName ?? 'This grove'} is fully grown!
            </h2>
            <p className="text-sm font-semibold text-ink-soft">How well do you know it now?</p>
          </div>
        </div>

        {saved ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-paper-deep px-4 py-3">
              <ByteFace size={36} className="shrink-0" />
              <p className="font-semibold">{saved.feedback ?? 'Thanks! Byte will remember that.'}</p>
            </div>
            <button onClick={dismissReflection} data-testid="reflect-done" className="btn btn-leaf w-full py-2.5">
              Keep going
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.rating}
                  data-testid={`reflect-${o.rating}`}
                  onClick={() => setRating(o.rating)}
                  className={`btn flex-col gap-1 py-2.5 text-sm ${rating === o.rating ? 'btn-sun' : 'btn-paper'}`}
                >
                  <span className="flex">
                    {[1, 2, 3, 4].map((i) => (
                      <Leaf key={i} size={14} hollow={i > o.rating} />
                    ))}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="One thing you learned (you can skip this)"
              aria-label="One thing you learned"
              data-testid="reflect-note"
              className="w-full px-3 py-2 bg-white border-2 border-paper-edge rounded-xl text-base focus:outline-none focus:border-leaf"
            />
            <div className="flex gap-2">
              <button onClick={dismissReflection} className="btn btn-paper flex-1 py-2.5">
                Skip
              </button>
              <button
                onClick={() => rating && setSaved({ feedback: submitReflection(rating, note) })}
                disabled={!rating}
                data-testid="reflect-save"
                className="btn btn-leaf flex-1 py-2.5"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
