import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import {
  X,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const MiaTeachModal: React.FC = () => {
  const {
    activeTeachSpot,
    closeMiaTeachModal,
    submitMiaExplanation,
    isGradingTeachBack,
    teachBackResult,
    teachBackCompletedGroves,
  } = useGameStore();

  const [explanation, setExplanation] = useState('');
  const [errorPrompt, setErrorPrompt] = useState(false);

  if (!activeTeachSpot) return null;

  const isCompleted = teachBackCompletedGroves.includes(activeTeachSpot.groveIndex);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setErrorPrompt(true);
      return;
    }
    setErrorPrompt(false);
    await submitMiaExplanation(explanation.trim());

    // Trigger confetti if passed
    setTimeout(() => {
      const state = useGameStore.getState();
      if (state.teachBackResult?.passed) {
        try {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#a855f7', '#34d399', '#f59e0b', '#ec4899'],
          });
        } catch (e) {}
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-labelledby="mia-teach-title"
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md font-bold text-base">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                  Teach-Back Challenge • {activeTeachSpot.questName}
                </span>
                {isCompleted && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Mastered ✓
                  </span>
                )}
              </div>
              <h2 id="mia-teach-title" className="text-base font-extrabold text-slate-900">
                Help Mia understand
              </h2>
            </div>
          </div>

          <button
            onClick={closeMiaTeachModal}
            data-testid="close-mia-teach-btn"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Close teach card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Mia's Speech Bubble */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Mia says:
              </span>
              <span className="text-[11px] text-amber-800/80 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-amber-200">
                Classmate in need of help
              </span>
            </div>

            <p className="text-sm sm:text-base font-bold text-amber-950 italic leading-snug">
              “{activeTeachSpot.puzzledThought}”
            </p>
          </div>

          {/* Teach-Back Explanation Form */}
          {!teachBackResult || !teachBackResult.passed ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>How would you explain this to Mia?</span>
                  <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Explain why, don't just state the answer!
                  </span>
                </label>

                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  disabled={isGradingTeachBack}
                  data-testid="mia-explain-input"
                  rows={4}
                  placeholder="e.g. When comparing 5/8 and 3/4, you can't just look at 5 and 3 because the pieces are different sizes. 3/4 converted to eighths is 6/8, and 6/8 is bigger than 5/8!"
                  className={`w-full p-3.5 rounded-2xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    errorPrompt
                      ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-300'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                />

                {errorPrompt && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please write an explanation for Mia before submitting.
                  </p>
                )}
              </div>

              {/* Rubric hints (collapsible/subtle) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Key ideas to help Mia master:
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600 text-[11px]">
                  {activeTeachSpot.rubricPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGradingTeachBack}
                data-testid="mia-submit-btn"
                className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {isGradingTeachBack ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mia is listening to your explanation…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Explain to Mia</span>
                  </>
                )}
              </button>
            </form>
          ) : null}

          {/* Feedback from Mia (Result) */}
          {teachBackResult && (
            <div
              className={`p-5 rounded-2xl border space-y-4 animate-in fade-in duration-200 ${
                teachBackResult.passed
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {teachBackResult.passed ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold">
                    {teachBackResult.passed ? 'Mia understood! 🎉' : 'Mia has a follow-up question:'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {teachBackResult.passed
                      ? 'You hit the core mathematical reasoning points!'
                      : 'Teach-back needs a bit more explanation on the core reasoning.'}
                  </p>
                </div>
              </div>

              {/* Mia's In-Character Speech */}
              <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs">
                <p className="text-sm font-semibold italic text-slate-800 leading-relaxed">
                  “{teachBackResult.miaReply}”
                </p>
              </div>

              {/* Rubric Breakdown */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 block">Rubric Check:</span>
                <div className="space-y-1">
                  {teachBackResult.hit.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                  {teachBackResult.missing.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 text-amber-800 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {teachBackResult.passed ? (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={closeMiaTeachModal}
                    data-testid="mia-continue-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>Continue Forest Adventure</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      // Reset to allow revision
                      useGameStore.setState({ teachBackResult: null });
                    }}
                    data-testid="mia-try-again-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Revise Explanation</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
