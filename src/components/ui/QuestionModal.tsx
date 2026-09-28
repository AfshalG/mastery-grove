import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { endSentence, shorten } from '../../game/text';
import { calibrationLine } from '../../game/memory';
import { answerComparison, hideServeAnswer } from '../../game/visuals';
import { diagnoseServe } from '../../game/serve';
import { ConfidenceLevel, TreeData } from '../../types/game';
import { FractionVisualSVG } from './FractionVisualSVG';
import { ByteFace, FoxFace, Lantern, Leaf, Sprout } from './icons';

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
      : tree.isMemorySprout || tree.memoryDue
        ? { label: 'From memory', color: 'var(--color-teal)' }
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
    confidenceNudge,
    hasStones,
    choicesHidden,
    revealChoices,
    servedList,
    toggleServeSlice,
  } = useGameStore(
    useShallow((s) => ({
      servedList: s.servedSlices,
      toggleServeSlice: s.toggleServeSlice,
      choicesHidden: s.choicesHidden,
      revealChoices: s.revealChoices,
      confidenceNudge: s.confidenceNudge,
      hasStones: s.answerStones !== null,
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
  }, [selectedTree?.id]);

  useEffect(() => {
    if (!selectedTree || showExplanationModal || hasSubmitted) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const pick = CONFIDENCE[Number(e.key) - 1];
      if (pick) {
        setSelectedConfidence(pick.level);
        setConfidencePromptWarning(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTree, showExplanationModal, hasSubmitted, setSelectedConfidence]);

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

  // Slices (or planks) can be picked here or on the 3D cake above the tree; the store keeps one list for both.
  const servedSlices = new Set(servedList);
  const handleServeToggleSlice = (sliceIndex: number) => {
    if (!hasSubmitted) toggleServeSlice(sliceIndex);
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

  // The feedback card docks like the question card (left on wide screens, a bottom sheet on phones) with no dim,
  // so the kid sees their tree blossom or wilt, and Professor Byte arrive beside it.
  const overlay = 'fixed z-50 inset-x-0 bottom-0 sm:bottom-auto sm:top-24 lg:right-auto lg:left-4 flex justify-center p-2 sm:px-4 lg:p-0 pointer-events-none';
  const card =
    'paper rise-in pointer-events-auto relative w-full max-w-lg lg:w-[27rem] max-h-[70dvh] sm:max-h-[calc(100dvh-7.5rem)] overflow-hidden flex flex-col rounded-3xl';

  // After an answer
  if (showExplanationModal && lastAnswerResult) {
    const isCorrect = lastAnswerResult.isCorrect;
    const exactServe = lastAnswerResult.served !== undefined;

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
                {lastAnswerResult.served !== undefined && lastAnswerResult.tree.serveConfig && (
                  <p className="text-base font-extrabold" data-testid="serve-result">
                    {diagnoseServe(lastAnswerResult.tree.serveConfig, lastAnswerResult.served).line}
                  </p>
                )}
                <p className="text-sm font-bold text-leaf-deep">{calibrationLine(lastAnswerResult.confidence, true)}</p>
                <p className="text-base text-ink-soft max-w-xs">
                  {shorten(lastAnswerResult.tree.explanation || 'Dividing top and bottom keeps the portion equal.', 24)}
                </p>
                <button onClick={dismissFeedback} data-testid="continue-btn" className="btn btn-leaf w-full py-3 text-base mt-2">
                  Keep going
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="pr-10">
                  <h2 id="feedback-title" className="text-2xl font-black">
                    Not quite.
                  </h2>
                  <p className="text-sm font-bold text-ink-soft">{calibrationLine(lastAnswerResult.confidence, false)}</p>
                </div>

                {lastAnswerResult.tree.visual &&
                  (() => {
                    const comp = answerComparison(
                      lastAnswerResult.tree.question,
                      lastAnswerResult.chosenChoice,
                      lastAnswerResult.tree.visual,
                      lastAnswerResult.tree.serveConfig
                    );
                    if (!comp) return null;
                    // A bridge challenge compares rows of planks; everything else compares cakes.
                    const pictureKind = lastAnswerResult.tree.serveConfig?.whole === 'bridge' ? 'bar' : 'cake';
                    return (
                      <div className="flex items-start justify-center gap-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-ink-soft">You made</span>
                          <FractionVisualSVG visual={{ kind: pictureKind, ...comp.kid }} size={88} hideLabel />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-ink-soft">{comp.targetLabel} looks like</span>
                          <FractionVisualSVG visual={{ kind: pictureKind, ...comp.target }} size={88} hideLabel />
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
                          // A hands-on serve is marked by plain rules, so Byte says exactly what happened rather than guessing.
                          if (exactServe) {
                            return (
                              <p className="text-base font-semibold leading-snug" data-testid="serve-mistake">
                                {raw}
                              </p>
                            );
                          }
                          const guess = endSentence(shorten(raw, 18)).replace(/^You\b/, 'you');
                          const asking = currentThoughtRecord?.confirmed === 'unanswered' && !showRevisionInput;
                          return (
                            <p className="text-base font-semibold leading-snug">
                              My guess: {guess}
                              {asking && ' Right?'}
                            </p>
                          );
                        })()}

                        {!exactServe && currentThoughtRecord?.confirmed === 'unanswered' && !showRevisionInput && (
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
  const bridge = selectedTree.serveConfig?.whole === 'bridge';
  const guessPct = currentPrediction ? Math.round(currentPrediction.pCorrect * 100) : null;

  return (
    // Phones: a sheet at the bottom. Tablets: under the top bar. Wide screens: docked left, so the explorer
    // and the answer stones stay in view in the middle.
    <div className="fixed z-40 inset-x-0 bottom-0 sm:bottom-auto sm:top-24 lg:right-auto lg:left-4 flex justify-center p-2 sm:px-4 lg:p-0 pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="question-modal-title"
        className="paper rise-in pointer-events-auto relative w-full max-w-xl lg:w-[27rem] max-h-[58dvh] sm:max-h-[calc(100dvh-7.5rem)] overflow-hidden flex flex-col rounded-3xl"
      >
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
              <FractionVisualSVG visual={hideServeAnswer(selectedTree.visual, selectedTree.kind)!} size={160} hideLabel className="w-full max-w-xs" />
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

          <div className={`rounded-2xl p-3.5 transition-colors ${confidencePromptWarning || confidenceNudge ? 'bg-sun-soft ring-2 ring-sun' : 'bg-paper-deep/70'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-2 font-extrabold">
                <FoxFace size={30} />
                How sure are you?
              </span>
              {confidencePromptWarning || confidenceNudge ? (
                <span className="text-sm font-bold text-sun-deep">Pick one first</span>
              ) : (
                <span className="hidden sm:inline text-xs font-semibold text-ink-soft">keys 1 · 2 · 3</span>
              )}
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
                <span className="font-black">{bridge ? 'Build the bridge' : 'Serve the cake'}</span>
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-sm font-bold border-2 border-paper-edge">
                  {servedSlices.size} of {selectedTree.serveConfig.totalSlices}
                </span>
              </div>
              <p className="text-sm font-semibold text-ink-soft">
                {bridge
                  ? `Tap planks to lay ${selectedTree.serveConfig.targetNumerator}/${selectedTree.serveConfig.targetDenominator} of the bridge. Tap the bridge above the tree, or here.`
                  : `Tap slices to serve ${selectedTree.serveConfig.targetNumerator}/${selectedTree.serveConfig.targetDenominator} of the cake. Tap the cake above the tree, or here.`}
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
                      {served ? (bridge ? 'Laid' : 'Served') : i + 1}
                    </button>
                  );
                })}
              </div>
              <button type="button" data-testid="serve-submit-btn" disabled={hasSubmitted} onClick={handleServeSubmit} className="btn btn-leaf w-full py-2.5">
                {bridge ? `Lay ${servedSlices.size} plank${servedSlices.size === 1 ? '' : 's'}` : `Serve ${servedSlices.size} slice${servedSlices.size === 1 ? '' : 's'}`}
              </button>
            </div>
          ) : (
            choicesHidden ? (
            <div className="rounded-2xl bg-paper-deep/70 p-4 text-center space-y-3">
              <p className="font-bold">From memory: think of your answer before you look.</p>
              <button type="button" data-testid="reveal-choices-btn" onClick={revealChoices} className="btn btn-sun px-5 py-2.5">
                I've got it in my head
              </button>
            </div>
            ) : (
            <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
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
            {hasStones && !hasSubmitted && (
              <p className="text-center text-sm font-semibold text-ink-soft">Step onto a stone to answer, or tap one here.</p>
            )}
            </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
