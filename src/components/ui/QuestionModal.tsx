import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  BrainCircuit,
  Cake,
  Utensils,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { ConfidenceLevel } from '../../types/game';
import { FractionVisualSVG } from './FractionVisualSVG';

function limitWords(str: string, maxWords: number): string {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length <= maxWords) return str.trim();
  const res = words.slice(0, maxWords).join(' ');
  return res.endsWith('.') ? res : res + '.';
}

function extractFractionsForComparison(
  question: string,
  studentChoice: string,
  visual?: any,
  serveConfig?: any
) {
  let targetParts = 8;
  let targetShaded = 4;
  let targetFractionStr = '4/8';

  if (serveConfig) {
    targetParts = serveConfig.totalSlices || 8;
    targetShaded = Math.round((serveConfig.targetNumerator / serveConfig.targetDenominator) * targetParts);
    targetFractionStr = `${serveConfig.targetNumerator}/${serveConfig.targetDenominator}`;
  } else if (visual) {
    if (visual.kind === 'cake') {
      targetParts = visual.parts;
      targetShaded = visual.shaded;
      targetFractionStr = `${targetShaded}/${targetParts}`;
    } else if (visual.kind === 'two-cakes') {
      targetParts = visual.right?.parts || visual.left?.parts || 8;
      targetShaded = visual.right?.shaded || visual.left?.shaded || 4;
      targetFractionStr = `${targetShaded}/${targetParts}`;
    }
  }

  const qMatch = question.match(/(\d+)\s*\/\s*(\d+)/);
  if (qMatch) {
    targetFractionStr = `${qMatch[1]}/${qMatch[2]}`;
  }

  let kidParts = targetParts;
  let kidShaded = 1;

  const choiceMatch = studentChoice.match(/(\d+)\s*\/\s*(\d+)/);
  if (choiceMatch) {
    const num = parseInt(choiceMatch[1], 10);
    const den = parseInt(choiceMatch[2], 10);
    if (!isNaN(num) && !isNaN(den) && den > 0) {
      kidParts = den;
      kidShaded = Math.min(num, den);
    }
  } else {
    const numMatch = studentChoice.match(/\d+/);
    if (numMatch) {
      kidShaded = Math.min(parseInt(numMatch[0], 10), targetParts);
    } else {
      kidShaded = 1;
    }
  }

  return {
    targetParts,
    targetShaded,
    targetFractionStr,
    kidParts,
    kidShaded,
  };
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
  } = useGameStore();

  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [confidencePromptWarning, setConfidencePromptWarning] = useState(false);
  const [showByteWhy, setShowByteWhy] = useState(false);

  // Hands-on "serve" cake states
  const [servedSlices, setServedSlices] = useState<Set<number>>(new Set());

  // Thought process interactive revision states
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
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fef08a'],
        });
      } catch (e) {}
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
    if (confirmed === 'no') {
      setShowRevisionInput(true);
    } else {
      confirmThoughtProcess('yes');
    }
  };

  const handleSendRevision = async () => {
    if (!studentWords.trim()) return;
    await confirmThoughtProcess('no', studentWords.trim());
    setShowRevisionInput(false);
  };

  // Feedback modal
  if (showExplanationModal && lastAnswerResult) {
    const isCorrect = lastAnswerResult.isCorrect;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
        <div
          role="dialog"
          aria-labelledby="feedback-title"
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative p-6"
        >
          {/* Close button */}
          <button
            onClick={dismissFeedback}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
            data-testid="close-feedback-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Correct Feedback: Big tick, "Yes! That's it.", <=20 words explanation, "Keep going" button */}
          {isCorrect && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
              <CheckCircle className="w-16 h-16 text-emerald-500 stroke-[2.2]" />
              <h2 id="feedback-title" className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Yes! That's it.
              </h2>
              <p className="text-sm text-slate-700 font-medium leading-relaxed max-w-xs">
                {limitWords(lastAnswerResult.tree.explanation || "Dividing top and bottom keeps the portion equal.", 20)}
              </p>
              <button
                onClick={dismissFeedback}
                data-testid="continue-btn"
                className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Keep going</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Wrong Feedback: One simple card instead of four boxes. Hide prediction-verdict box from kids. */}
          {!isCorrect && (
            <div className="space-y-4 py-1">
              <h2 id="feedback-title" className="text-lg font-bold text-slate-900">
                Not quite.
              </h2>

              {/* If question has fraction picture: Two small cakes side by side */}
              {lastAnswerResult.tree.visual && (() => {
                const comp = extractFractionsForComparison(
                  lastAnswerResult.tree.question,
                  lastAnswerResult.chosenChoice,
                  lastAnswerResult.tree.visual,
                  lastAnswerResult.tree.serveConfig
                );
                return (
                  <div className="flex items-center justify-center gap-6 py-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">You made</span>
                      <FractionVisualSVG
                        visual={{ kind: 'cake', parts: comp.kidParts, shaded: comp.kidShaded }}
                        size={84}
                        hideLabel={true}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">{comp.targetFractionStr} looks like</span>
                      <FractionVisualSVG
                        visual={{ kind: 'cake', parts: comp.targetParts, shaded: comp.targetShaded }}
                        size={84}
                        hideLabel={true}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Byte Diagnosis */}
              {isDiagnosing ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-600">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Byte is checking your thinking…</span>
                </div>
              ) : diagnosisError ? (
                <div className="text-xs text-rose-700 flex items-center justify-between">
                  <span>Byte couldn't check this right now.</span>
                  <button
                    onClick={retryDiagnosis}
                    data-testid="retry-diagnosis-btn"
                    className="underline font-bold"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* One line: "My guess: <short>. Right?" */}
                  {(() => {
                    const raw = diagnosisResult?.thoughtProcess || currentThoughtRecord?.thoughtProcess || 'you used whole-number rules';
                    const shortGuess = limitWords(raw.replace(/^You\s+/i, 'you ').replace(/\.$/, ''), 9);
                    return (
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                        My guess: {shortGuess}. Right?
                      </p>
                    );
                  })()}

                  {/* Big 👍 Yes and 🤔 Not quite buttons */}
                  {currentThoughtRecord?.confirmed === 'unanswered' && !showRevisionInput && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleConfirmThought('yes')}
                        data-testid="confirm-thought-yes"
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>👍 Yes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmThought('no')}
                        data-testid="confirm-thought-no"
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>🤔 Not quite</span>
                      </button>
                    </div>
                  )}

                  {/* Short revision input if "Not quite" was clicked */}
                  {showRevisionInput && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        value={studentWords}
                        onChange={(e) => setStudentWords(e.target.value)}
                        placeholder="How did you think about it?"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSendRevision}
                          disabled={isRevising || !studentWords.trim()}
                          data-testid="submit-revision-btn"
                          className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                  {currentThoughtRecord?.confirmed === 'yes' && (
                    <div className="text-xs text-emerald-700 font-semibold">
                      Got it! Byte noted your thinking.
                    </div>
                  )}

                  {/* Hint question in one line */}
                  {diagnosisResult?.scaffoldHint && (
                    <p className="text-xs text-indigo-900 font-medium italic">
                      {limitWords(diagnosisResult.scaffoldHint, 12)}
                    </p>
                  )}

                  {/* Small 🌱 "Back soon" */}
                  <div className="text-xs text-slate-500 font-medium pt-0.5">
                    🌱 Back soon
                  </div>
                </div>
              )}

              {/* Continue button */}
              <div className="pt-2">
                <button
                  onClick={dismissFeedback}
                  data-testid="continue-btn"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Keep going</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active question modal
  const concept = world?.concepts.find((c) => c.id === selectedTree.conceptId);
  const guessPct = currentPrediction ? Math.round(currentPrediction.pCorrect * 100) : 75;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-labelledby="question-modal-title"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 id="question-modal-title" className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{concept?.questName || 'Grove Tree'}</span>
              {selectedTree.isMemorySprout && (
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                  Memory Sprout
                </span>
              )}
              {selectedTree.isSapling && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  Review
                </span>
              )}
              {selectedTree.isTargeted && (
                <span className="text-[10px] bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full font-bold">
                  Made for you
                </span>
              )}
              {selectedTree.isTeacherDeployed && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  From teacher
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeTree}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="Close question"
            data-testid="close-tree-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Cake picture first and bigger */}
          {selectedTree.visual && (
            <div className="flex justify-center">
              <FractionVisualSVG visual={selectedTree.visual} size={220} className="w-full max-w-sm" />
            </div>
          )}

          {/* Large question text */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {selectedTree.question}
          </h3>

          {/* Byte's guess becomes a small chip ("Byte's guess: 75% right"), tapping it shows short why */}
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => {
                setShowByteWhy((prev) => !prev);
                toggleShowPredictions();
              }}
              data-testid="toggle-predictions-visibility-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200 cursor-pointer transition-colors"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              <span>Byte's guess: {guessPct}% right</span>
            </button>
            {showByteWhy && (
              <div className="text-xs text-indigo-950 bg-indigo-50/90 border border-indigo-200 rounded-xl px-3 py-1.5 animate-in fade-in duration-150 leading-snug">
                {limitWords(currentPrediction?.why || "You understand this topic well.", 8)}
              </div>
            )}
          </div>

          {/* Confidence Selector ("How sure are you?") */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              confidencePromptWarning
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                How sure are you?
              </span>
              {confidencePromptWarning && (
                <span className="text-[11px] text-amber-700 font-bold animate-pulse">
                  Pick confidence first!
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['Not sure', 'Fairly sure', 'Very sure'] as ConfidenceLevel[]).map((level) => {
                const isSelected = selectedConfidence === level;
                const testIdMap = {
                  'Not sure': 'confidence-not-sure',
                  'Fairly sure': 'confidence-fairly-sure',
                  'Very sure': 'confidence-very-sure',
                };
                return (
                  <button
                    key={level}
                    type="button"
                    data-testid={testIdMap[level]}
                    onClick={() => {
                      setSelectedConfidence(level);
                      setConfidencePromptWarning(false);
                    }}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hands-on "serve" section OR Choices list */}
          {selectedTree.kind === 'serve' && selectedTree.serveConfig ? (
            <div className="space-y-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Cake className="w-4 h-4 text-amber-700" />
                  Serve the cake
                </span>
                <span className="text-xs font-bold text-amber-900 bg-white px-2.5 py-0.5 rounded-full border border-amber-300">
                  Served: {servedSlices.size} of {selectedTree.serveConfig.totalSlices}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-snug">
                Serve {selectedTree.serveConfig.targetNumerator}/{selectedTree.serveConfig.targetDenominator} of the cake.
              </p>

              {/* Slices selector grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: selectedTree.serveConfig.totalSlices }).map((_, i) => {
                  const isServed = servedSlices.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      data-testid={`serve-slice-${i}`}
                      disabled={hasSubmitted}
                      onClick={() => handleServeToggleSlice(i)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isServed
                          ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      <Cake className={`w-4 h-4 ${isServed ? 'text-white' : 'text-amber-600'}`} />
                      <span className="text-[10px] font-bold">
                        {isServed ? 'Served' : `${i + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                data-testid="serve-submit-btn"
                disabled={hasSubmitted}
                onClick={handleServeSubmit}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Utensils className="w-4 h-4" />
                <span>Serve {servedSlices.size} Slices</span>
              </button>
            </div>
          ) : (
            /* Choices list */
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Your answer:</label>
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
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug pt-0.5">{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
