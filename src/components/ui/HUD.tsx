import React from 'react';
import {
  Compass,
  GraduationCap,
  Sparkles,
  TreePine,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Footprints,
  Flame,
  BrainCircuit,
  Clock,
  HeartHandshake,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { sounds } from '../../utils/audio';

export const HUD: React.FC = () => {
  const {
    world,
    trees,
    setScreen,
    questListOpen,
    toggleQuestList,
    getCurrentGroveProgress,
    getUnlockedConcepts,
    moveTo,
    tutorBeaconTreeId,
    tutorBeaconReason,
    predictionStats,
    avatarPosition,
    welcomeBackInfo,
    dismissWelcomeBack,
    saplingNotice,
    teacherToast,
  } = useGameStore();

  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const currentProgress = getCurrentGroveProgress();
  const unlockedConcepts = getUnlockedConcepts();

  const totalScored = predictionStats.exact + predictionStats.direction + predictionStats.miss;
  const rightPredictions = predictionStats.exact + predictionStats.direction;
  const accuracyPct = totalScored > 0 ? Math.round((rightPredictions / totalScored) * 100) : 100;

  const handleQuestTreeClick = (treeId: string) => {
    const tree = trees.find((t) => t.id === treeId);
    if (!tree || !tree.position) return;

    if (tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2) {
      const remaining = 2 - (tree.answersSinceMiss ?? 0);
      useGameStore.getState().setSaplingNotice(`Come back later: Answer ${remaining} more question${remaining > 1 ? 's' : ''} to unlock this review sapling! ⏳`);
      return;
    }

    const [tx, ty, tz] = tree.position;
    moveTo([tx, 0, tz + 1.8], tree.id);
  };

  const handleMobileDpad = (dx: number, dz: number) => {
    moveTo([avatarPosition[0] + dx * 3.5, 0, avatarPosition[2] + dz * 3.5]);
  };

  return (
    <>
      {/* Top Bar HUD */}
      <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & World Title */}
          <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 text-white shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <TreePine className="w-4 h-4" />
            </div>
            <div className="truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Mastery Grove
              </div>
              <h1 className="text-xs sm:text-sm font-semibold truncate text-slate-100">
                {world?.subject || 'Fractions Exploration'}
              </h1>
            </div>
          </div>

          {/* Current Grove Progress Bar */}
          <div className="pointer-events-auto hidden md:flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 text-white shadow-lg">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-slate-100">
                {currentProgress.questName} · {currentProgress.current}/{currentProgress.total}
              </span>
            </div>
            {/* Progress Pill Bar */}
            <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    currentProgress.total > 0
                      ? (currentProgress.current / currentProgress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Tutor Predictions Mini Pill (Desktop) */}
          <div className="pointer-events-auto hidden lg:flex items-center gap-2 bg-indigo-950/80 backdrop-blur-md border border-indigo-700/60 rounded-2xl px-3 py-2 text-white shadow-lg text-xs">
            <BrainCircuit className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-bold text-indigo-100">
              Byte's guesses: {rightPredictions}/{totalScored}
            </span>
          </div>

          {/* Top Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              data-testid="toggle-sound-btn"
              className="w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
              title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              aria-label={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Teacher View Button */}
            <button
              onClick={() => setScreen('teacher')}
              data-testid="teacher-btn"
              className="px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Teacher</span>
            </button>

            {/* New World Button */}
            <button
              onClick={() => setScreen('start')}
              data-testid="new-world-btn"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New World</span>
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Back Card Banner (if resumed from localStorage) */}
      {welcomeBackInfo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-md w-[92%] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/60 rounded-3xl p-4 shadow-2xl text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Welcome back to Mastery Grove!
                </span>
              </div>
              <button
                onClick={dismissWelcomeBack}
                data-testid="dismiss-welcome-back"
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold"
              >
                Got it
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {welcomeBackInfo.thoughtPatternToWatch}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Streak: {welcomeBackInfo.streak || 1}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Completed: {welcomeBackInfo.completedGrovesCount} / {welcomeBackInfo.unlockedGrovesCount} Groves
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sapling Spacing Notice Toast */}
      {saplingNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-md w-[92%] animate-in fade-in duration-200">
          <div className="bg-amber-950/95 backdrop-blur-md border border-amber-600 rounded-2xl px-4 py-3 shadow-2xl text-amber-100 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs font-bold leading-snug">{saplingNotice}</span>
          </div>
        </div>
      )}

      {/* Teacher Quest Deployed Toast */}
      {teacherToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-md w-[92%] animate-in fade-in duration-200">
          <div className="bg-purple-950/95 backdrop-blur-md border border-purple-500 rounded-2xl px-4 py-3 shadow-2xl text-purple-100 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-xs font-bold leading-snug">{teacherToast}</span>
          </div>
        </div>
      )}

      {/* Floating Bottom Left: Quest List Button & Collapsible Drawer */}
      <div className="fixed bottom-4 left-4 z-30 pointer-events-auto flex flex-col items-start gap-2">
        {questListOpen && (
          <div className="w-80 sm:w-96 max-h-[60vh] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white overflow-hidden flex flex-col animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Trees
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Tap tree to walk</span>
            </div>

            <div className="overflow-y-auto py-2 space-y-3 pr-1">
              {world?.concepts.map((concept) => {
                const isUnlocked = unlockedConcepts.includes(concept.id);
                if (!isUnlocked) return null;

                const conceptTrees = trees.filter((t) => t.conceptId === concept.id);

                return (
                  <div key={concept.id} className="space-y-1.5">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>{concept.questName}</span>
                    </div>

                    <div className="space-y-1.5">
                      {conceptTrees.map((tree, idx) => {
                        const isBeacon = tutorBeaconTreeId === tree.id;
                        const isSaplingLocked = tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2;

                        let stateBadge = 'Unanswered';
                        let stateColor = 'text-slate-400 bg-slate-800';

                        if (tree.isMemorySprout) {
                          stateBadge = 'Memory Sprout 🌿';
                          stateColor = 'text-teal-300 bg-teal-950/80 border-teal-600 font-bold';
                        } else if (tree.isTargeted) {
                          stateBadge = 'Made for you';
                          stateColor = 'text-pink-300 bg-pink-950/80 border-pink-700';
                        } else if (tree.isTeacherDeployed) {
                          stateBadge = 'From teacher';
                          stateColor = 'text-purple-300 bg-purple-950/80 border-purple-700';
                        } else if (tree.state === 'healthy') {
                          stateBadge = 'Healthy';
                          stateColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
                        } else if (tree.state === 'regrown') {
                          stateBadge = 'Regrown ★';
                          stateColor = 'text-emerald-300 bg-emerald-900/70 border-emerald-600';
                        } else if (tree.state === 'withered') {
                          stateBadge = 'Withered';
                          stateColor = 'text-rose-400 bg-rose-950/60 border-rose-800';
                        } else if (tree.state === 'sapling') {
                          if (isSaplingLocked) {
                            stateBadge = 'Back soon';
                            stateColor = 'text-amber-300 bg-amber-950/80 border-amber-700';
                          } else {
                            stateBadge = 'Review 🌱';
                            stateColor = 'text-teal-300 bg-teal-950/70 border-teal-700 font-bold';
                          }
                        }

                        return (
                          <button
                            key={tree.id}
                            data-testid={`quest-tree-${tree.id}`}
                            onClick={() => handleQuestTreeClick(tree.id)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 border ${
                              isBeacon
                                ? 'bg-amber-950/50 border-amber-500/80 text-amber-100 hover:bg-amber-900/60 ring-1 ring-amber-500/40'
                                : 'bg-slate-800/60 border-slate-700/50 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div className="w-full flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate mr-2">
                                {isBeacon ? (
                                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
                                ) : tree.state === 'healthy' || tree.state === 'regrown' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : tree.state === 'withered' ? (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : (
                                  <TreePine className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate font-semibold flex items-center gap-1.5">
                                  <span>
                                    {tree.isTargeted
                                      ? 'Made for you'
                                      : tree.isTeacherDeployed
                                      ? 'From teacher'
                                      : `Tree ${idx + 1}`}
                                  </span>
                                  {isBeacon && (
                                    <span className="text-[10px] text-amber-300 font-bold">
                                      ★ Byte's pick
                                    </span>
                                  )}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${stateColor} shrink-0`}
                              >
                                {stateBadge}
                              </span>
                            </div>

                            {/* "Why this one?" reason on beacon tree */}
                            {isBeacon && tutorBeaconReason && (
                              <div className="text-[11px] text-amber-200/90 bg-amber-900/40 px-2 py-1 rounded-lg border border-amber-700/40 flex items-center gap-1.5 mt-0.5">
                                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                                <span>
                                  <strong>Why this one?</strong> {tutorBeaconReason}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toggle Quest List Button */}
        <button
          onClick={toggleQuestList}
          data-testid="toggle-quest-list-btn"
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-white text-xs font-bold flex items-center gap-2 shadow-xl transition-all"
        >
          <Compass className="w-4 h-4 text-amber-400" />
          <span>Trees</span>
          {questListOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {/* Mobile Touch Navigation Guide & D-Pad */}
      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto flex flex-col items-end gap-2">
        <div className="bg-slate-900/80 backdrop-blur-xs text-[11px] text-slate-300 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md flex items-center gap-1.5 select-none">
          <Footprints className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click ground or tree to walk</span>
        </div>

        <div className="sm:hidden flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-2 rounded-2xl border border-slate-700/60 backdrop-blur-md shadow-xl">
            <div />
            <button
              onClick={() => handleMobileDpad(0, -1)}
              data-testid="dpad-up"
              className="w-10 h-10 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center text-xs"
            >
              W
            </button>
            <div />
            <button
              onClick={() => handleMobileDpad(-1, 0)}
              data-testid="dpad-left"
              className="w-10 h-10 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center text-xs"
            >
              A
            </button>
            <button
              onClick={() => handleMobileDpad(0, 1)}
              data-testid="dpad-down"
              className="w-10 h-10 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center text-xs"
            >
              S
            </button>
            <button
              onClick={() => handleMobileDpad(1, 0)}
              data-testid="dpad-right"
              className="w-10 h-10 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center text-xs"
            >
              D
            </button>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('avatar-hop'))}
            data-testid="jump-btn"
            className="w-12 h-12 rounded-full bg-emerald-600 active:bg-emerald-500 text-white font-bold shadow-xl border-2 border-emerald-400 flex items-center justify-center text-xs cursor-pointer select-none"
            title="Hop"
            aria-label="Hop"
          >
            Hop
          </button>
        </div>
      </div>
    </>
  );
};
