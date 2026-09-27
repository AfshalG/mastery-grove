import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { endSentence, shorten } from '../../game/text';
import { answerComparison, hideServeAnswer } from '../../game/visuals';
import { ConfidenceLevel, TreeData } from '../../types/game';
import { FractionVisualSVG } from './FractionVisualSVG';
import { ByteFace, Lantern, Leaf, Sprout } from './icons';

const CONFIDENCE: Array<{ level: ConfidenceLevel; testId: string }> = [
  { level: 'Not sure', testId: 'confidence-not-sure' },
  { level: 'Fairly sure', testId: 'confidence-fairly-sure' },
  { level: 'Very sure', testId: 'confidence-very-sure' },
];

/** The little tag that says why a tree is here: made for you, from your teacher, a memory check or a second try. */
function TreeTag({ tree }: { tree: TreeData }) {
  const tag = tree.isTargeted
    ? { label: 'Made for you', color: 'var(--color-rose)' }
    : tree.isTeacherDeployed
      ? { label: 'From your teacher', color: 'var(--color-violet)' }
      : tree.isMemorySprout
        ? { label: 'Memory check', color: 'var(--color-teal)' }
        : null;
  if (tag)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs font-bold border-2 border-paper-edge">
        <Lantern size={14} color={tag.color} />
        {tag.label}
      </span>
    );
  if (tree.isSapling)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-bold text-leaf-deep">
        <Sprout size={14} />
        Second try
      </span>
    );
  return null;
}

export const QuestionModal: React.FC = () => {
  const {
    selectedTree,
    selectedConfidence,
    setSelectedConfidence,
    closeTree,
    answerTreeQuestion,
    answerServeQuestion,
    isDiagnosing,
    diagnosisResult,
    diagnosisError,
    currentThoughtRecord,
    confirmThoughtProcess,
    isRevising,
    retryDiagnosis,
    lastAnswerResult,
    showExplanationModal,
    dismissFeedback,
    world,
    predictions,
    toggleShowPredictions,
  } = useGameStore(
    useShallow((s) => ({
      selectedTree: s.selectedTree,
      selectedConfidence: s.selectedConfidence,
      setSelectedConfidence: s.setSelectedConfidence,
      closeTree: s.closeTree,
      answerTreeQuestion: s.answerTreeQuestion,
      answerServeQuestion: s.answerServeQuestion,
      isDiagnosing: s.isDiagnosing,
      diagnosisResult: s.diagnosisResult,
      diagnosisError: s.diagnosisError,
      currentThoughtRecord: s.currentThoughtRecord,
      confirmThoughtProcess: s.confirmThoughtProcess,
      isRevising: s.isRevising,
      retryDiagnosis: s.retryDiagnosis,
      lastAnswerResult: s.lastAnswerResult,
      showExplanationModal: s.showExplanationModal,
      dismissFeedback: s.dismissFeedback,
      world: s.world,
      predictions: s.predictions,
      toggleShowPredictions: s.toggleShowPredictions,
    }))
  );

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [confidencePromptWarning, setConfidencePromptWarning] = useState(false);
  const [showByteWhy, setShowByteWhy] = useState(false);
  const [servedSlices, setServedSlices] = useState<Set<number>>(new Set());
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [studentWords, setStudentWords] = useState('');

  useEffect(() => {
    setSelectedConfidence(null);
    setSelectedChoiceIdx(null);
    setHasSubmitted(false);
    setConfidencePromptWarning(false);
    setShowRevisionInput(false);
    setShowByteWhy(false);
    setStudentWords('');
    setServedSlices(new Set());
  }, [selectedTree?.id]);

  useEffect(() => {
    if (showExplanationModal && lastAnswerResult?.isCorrect) {
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#3f7d4e', '#6fae62', '#f2c14e', '#fbe3ea'] });
      } catch {
        // Confetti is decoration; a failure here should never block the game.
      }
    }
  }, [showExplanationModal, lastAnswerResult]);

  if (!selectedTree) return null;

  const currentPrediction = predictions[selectedTree.id] || null;

  const handleChoiceClick = async (idx: number) => {
    if (hasSubmitted) return;
    if (!selectedConfidence) {
      setConfidencePromptWarning(true);
      return;
    }
    setConfidencePromptWarning(false);
    setSelectedChoiceIdx(idx);
    setHasSubmitted(true);
    await answerTreeQuestion(selectedTree.id, idx, selectedConfidence);
  };

  const handleServeToggleSlice = (sliceIndex: number) => {
    if (hasSubmitted) return;
    setServedSlices((prev) => {
      const next = new Set(prev);
      if (next.has(sliceIndex)) next.delete(sliceIndex);
      else next.add(sliceIndex);
      return next;
    });
  };

  const handleServeSubmit = async () => {
    if (hasSubmitted || !selectedTree) return;
    if (!selectedConfidence) {
      setConfidencePromptWarning(true);
      return;
    }
    setConfidencePromptWarning(false);
    setHasSubmitted(true);
    await answerServeQuestion(selectedTree.id, servedSlices.size, selectedConfidence);
  };

  const handleConfirmThought = (confirmed: 'yes' | 'no') => {
    if (confirmed === 'no') setShowRevisionInput(true);
    else confirmThoughtProcess('yes');
  };

  const handleSendRevision = async () => {
    if (!studentWords.trim()) return;
    await confirmThoughtProcess('no', studentWords.trim());
    setShowRevisionInput(false);
  };

  const overlay = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-[#2f2a22]/35';
  const card = 'paper rise-in relative w-full max-w-lg max-h-[92dvh] overflow-hidden flex flex-col rounded-3xl';

  // After an answer
  if (showExplanationModal && lastAnswerResult) {
    const isCorrect = lastAnswerResult.isCorrect;

    return (
      <div className={overlay}>
        <div role="dialog" aria-labelledby="feedback-title" className={card}>
          <button
            onClick={dismissFeedback}
            className="absolute top-3 right-3 btn btn-paper w-9 h-9 p-0"
            aria-label="Close"
            data-testid="close-feedback-btn"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="overflow-y-auto p-5 sm:p-6">
            {isCorrect ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-20 h-20 rounded-full bg-leaf-soft flex items-center justify-center">
                  <Leaf size={46} />
                </div>
                <h2 id="feedback-title" className="text-2xl font-black">
                  Yes! That's it.
                </h2>
                <p className="text-base text-ink-soft max-w-xs">
                  {shorten(lastAnswerResult.tree.explanation || 'Dividing top and bottom keeps the portion equal.', 24)}
                </p>
                <button onClick={dismissFeedback} data-testid="continue-btn" className="btn btn-leaf w-full py-3 text-base mt-2">
                  Keep going
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 id="feedback-title" className="text-2xl font-black pr-10">
                  Not quite.
                </h2>

                {lastAnswerResult.tree.visual &&
                  (() => {
                    const comp = answerComparison(
                      lastAnswerResult.tree.question,
                      lastAnswerResult.chosenChoice,
                      lastAnswerResult.tree.visual,
                      lastAnswerResult.tree.serveConfig
                    );
                    if (!comp) return null;
                    return (
                      <div className="flex items-start justify-center gap-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-ink-soft">You made</span>
                          <FractionVisualSVG visual={{ kind: 'cake', ...comp.kid }} size={88} hideLabel />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-ink-soft">{comp.targetLabel} looks like</span>
                          <FractionVisualSVG visual={{ kind: 'cake', ...comp.target }} size={88} hideLabel />
                        </div>
                      </div>
                    );
                  })()}

                {/* Byte's guess at the thinking, as a speech bubble */}
                <div className="flex items-start gap-3">
                  <ByteFace size={44} mood={isDiagnosing ? 'thinking' : 'happy'} className="shrink-0" />
                  <div className="flex-1 min-w-0 rounded-2xl rounded-tl-md bg-paper-deep px-4 py-3 space-y-3">
                    {isDiagnosing ? (
                      <p className="font-semibold text-ink-soft">Byte is working out how you got that…</p>
                    ) : diagnosisError ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">Byte couldn't check this one just now.</span>
                        <button onClick={retryDiagnosis} data-testid="retry-diagnosis-btn" className="btn btn-paper px-3 py-1 text-sm">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const raw = diagnosisResult?.thoughtProcess || currentThoughtRecord?.thoughtProcess || 'You used whole-number rules.';
                          const guess = endSentence(shorten(raw, 18)).replace(/^You\b/, 'you');
                          const asking = currentThoughtRecord?.confirmed === 'unanswered' && !showRevisionInput;
                          return (
                            <p className="text-base font-semibold leading-snug">
                              My guess: {guess}
                              {asking && ' Right?'}
                            </p>
                          );
                        })()}

                        {currentThoughtRecord?.confirmed === 'unanswered' && !showRevisionInput && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleConfirmThought('yes')} data-testid="confirm-thought-yes" className="btn btn-leaf flex-1 py-2.5">
                              Yes
                            </button>
                            <button type="button" onClick={() => handleConfirmThought('no')} data-testid="confirm-thought-no" className="btn btn-paper flex-1 py-2.5">
                              Not quite
                            </button>
                          </div>
                        )}

                        {showRevisionInput && (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={studentWords}
                              onChange={(e) => setStudentWords(e.target.value)}
                              placeholder="How did you work it out?"
                              aria-label="How you worked it out"
                              className="w-full px-3 py-2 bg-white border-2 border-paper-edge rounded-xl text-base focus:outline-none focus:border-leaf"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleSendRevision}
                                disabled={isRevising || !studentWords.trim()}
                                data-testid="submit-revision-btn"
                                className="btn btn-sun px-4 py-1.5 text-sm"
                              >
                                {isRevising ? 'Sending…' : 'Tell Byte'}
                              </button>
                            </div>
                          </div>
                        )}

                        {currentThoughtRecord?.confirmed === 'yes' && (
                          <p className="text-sm font-bold text-leaf-deep">Thanks! Byte will remember that.</p>
                        )}

                        {diagnosisResult?.scaffoldHint && (
                          <p className="text-base font-semibold italic text-leaf-deep">{shorten(diagnosisResult.scaffoldHint, 20)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                  <Sprout size={18} />
                  This one comes back later as a sapling.
                </p>

                <button onClick={dismissFeedback} data-testid="continue-btn" className="btn btn-paper w-full py-3 text-base">
                  Keep going
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // The question
  const concept = world?.concepts.find((c) => c.id === selectedTree.conceptId);
  const guessPct = currentPrediction ? Math.round(currentPrediction.pCorrect * 100) : null;

  return (
    <div className={overlay}>
      <div role="dialog" aria-labelledby="question-modal-title" className={card}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-paper-edge/70 bg-paper-deep/60">
          <h2 id="question-modal-title" className="flex flex-wrap items-center gap-2 font-black">
            <span>{concept?.questName || 'Grove tree'}</span>
            <TreeTag tree={selectedTree} />
          </h2>
          <button onClick={closeTree} className="btn btn-paper w-9 h-9 p-0 shrink-0" aria-label="Close question" data-testid="close-tree-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {selectedTree.visual && (
            <div className="flex justify-center">
              {/* No label on the picture: "4/8 shaded" would answer "what fraction is shaded?" */}
              <FractionVisualSVG visual={hideServeAnswer(selectedTree.visual, selectedTree.kind)!} size={200} hideLabel className="w-full max-w-sm" />
            </div>
          )}

          <h3 className="text-xl font-extrabold leading-snug">{selectedTree.question}</h3>

          {guessPct !== null && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowByteWhy((prev) => !prev);
                  toggleShowPredictions();
                }}
                data-testid="toggle-predictions-visibility-btn"
                className="inline-flex items-center gap-2 rounded-full bg-paper-deep pl-1 pr-3 py-1 text-sm font-bold hover:brightness-95"
              >
                <ByteFace size={26} />
                Byte thinks {guessPct}% you've got this
              </button>
              {showByteWhy && (
                <p className="rise-in text-sm font-semibold text-ink-soft pl-2">{shorten(currentPrediction?.why || 'You understand this topic well.', 12)}</p>
              )}
            </div>
          )}

          <div className={`rounded-2xl p-3.5 transition-colors ${confidencePromptWarning ? 'bg-sun-soft ring-2 ring-sun' : 'bg-paper-deep/70'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold">How sure are you?</span>
              {confidencePromptWarning && <span className="text-sm font-bold text-sun-deep">Pick one first</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CONFIDENCE.map(({ level, testId }) => (
                <button
                  key={level}
                  type="button"
                  data-testid={testId}
                  onClick={() => {
                    setSelectedConfidence(level);
                    setConfidencePromptWarning(false);
                  }}
                  className={`btn py-2 px-1 text-sm ${selectedConfidence === level ? 'btn-sun' : 'btn-paper'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {selectedTree.kind === 'serve' && selectedTree.serveConfig ? (
            <div className="space-y-3 rounded-2xl border-2 border-sun bg-sun-soft p-4">
              <div className="flex items-center justify-between">
                <span className="font-black">Serve the cake</span>
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-sm font-bold border-2 border-paper-edge">
                  {servedSlices.size} of {selectedTree.serveConfig.totalSlices}
                </span>
              </div>
              <p className="text-sm font-semibold text-ink-soft">
                Tap slices to serve {selectedTree.serveConfig.targetNumerator}/{selectedTree.serveConfig.targetDenominator} of the cake.
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: selectedTree.serveConfig.totalSlices }).map((_, i) => {
                  const served = servedSlices.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid={`serve-slice-${i}`}
                      disabled={hasSubmitted}
                      onClick={() => handleServeToggleSlice(i)}
                      aria-pressed={served}
                      className={`btn py-2.5 text-sm ${served ? 'btn-berry' : 'btn-paper'}`}
                    >
                      {served ? 'Served' : i + 1}
                    </button>
                  );
                })}
              </div>
              <button type="button" data-testid="serve-submit-btn" disabled={hasSubmitted} onClick={handleServeSubmit} className="btn btn-leaf w-full py-2.5">
                Serve {servedSlices.size} slice{servedSlices.size === 1 ? '' : 's'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {selectedTree.choices.map((choice, idx) => {
                const isSelected = selectedChoiceIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`choice-${idx}`}
                    disabled={hasSubmitted}
                    onClick={() => handleChoiceClick(idx)}
                    className={`btn w-full justify-start text-left px-3 py-3 text-base ${isSelected ? 'btn-sun' : 'btn-paper'}`}
                  >
                    <span className="w-7 h-7 shrink-0 rounded-full bg-sun border-2 border-sun-deep flex items-center justify-center text-sm font-black">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-bold leading-snug">{choice}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
