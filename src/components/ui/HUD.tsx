import React, { useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { sounds } from '../../utils/audio';
import { approachPoint } from '../../game/layout';
import { TreeData } from '../../types/game';
import { Apple, ByteFace, Lantern, Leaf, PadArrow, Sprout, TrailMap } from './icons';

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/** The first few words of a question, so a kid can tell trees apart without opening them. */
function snippet(question: string, words = 6) {
  const all = question.trim().split(/\s+/);
  return all.length > words ? `${all.slice(0, words).join(' ')}…` : question.trim();
}

/** What a tree shows in the list: its answer state first, then whether it was added for this kid. */
function treeStatus(tree: TreeData) {
  const waiting = tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2;
  if (tree.memoryDue) return { label: 'Memory check', icon: <Lantern size={16} color="var(--color-teal)" /> };
  if (tree.state === 'healthy') return { label: 'Grown', icon: <Leaf size={16} /> };
  if (tree.state === 'regrown') return { label: 'Regrown', icon: <Leaf size={16} color="#6fae62" /> };
  if (tree.state === 'withered') return { label: 'Wilted', icon: <Leaf size={16} color="#a08c68" /> };
  if (tree.state === 'sapling')
    return waiting ? { label: 'Back soon', icon: <Sprout size={16} color="#c9c1ae" /> } : { label: 'Try again', icon: <Sprout size={16} /> };
  if (tree.isTargeted) return { label: 'Made for you', icon: <Lantern size={16} color="var(--color-rose)" /> };
  if (tree.isTeacherDeployed) return { label: 'From your teacher', icon: <Lantern size={16} color="var(--color-violet)" /> };
  if (tree.isMemorySprout) return { label: 'Memory check', icon: <Lantern size={16} color="var(--color-teal)" /> };
  return { label: 'New', icon: <Leaf size={16} hollow /> };
}

/** Press and hold to walk: the pad sends the same keys the keyboard does. */
function holdKey(key: string) {
  const press = () => window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  const release = () => window.dispatchEvent(new KeyboardEvent('keyup', { key }));
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      press();
    },
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
  };
}

const Note: React.FC<{ accent: string; children: React.ReactNode }> = ({ accent, children }) => (
  <div className="paper rise-in pointer-events-auto flex gap-3 px-3.5 py-3 text-sm leading-snug" style={{ borderLeft: `6px solid ${accent}` }}>
    {children}
  </div>
);

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
    layout,
    tutorBeaconTreeId,
    tutorBeaconReason,
    predictionStats,
    welcomeBackInfo,
    dismissWelcomeBack,
    saplingNotice,
    teacherToast,
    setSaplingNotice,
  } = useGameStore();

  // Start from the real setting, so the button can't drift out of sync after the HUD remounts.
  const [soundOn, setSoundOn] = useState(sounds.enabled);
  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundOn(sounds.enabled);
  };

  const progress = getCurrentGroveProgress();
  const unlocked = getUnlockedConcepts();
  const activeConcept = world?.concepts.find((c) => c.questName === progress.questName);
  const groveLeaves = trees.filter(
    (t) => t.conceptId === activeConcept?.id && !t.isSapling && !t.isTargeted && !t.isTeacherDeployed && !t.isMemorySprout
  );

  const guessesScored = predictionStats.exact + predictionStats.direction + predictionStats.miss;
  const guessesRight = predictionStats.exact + predictionStats.direction;

  const walkToTree = (tree: TreeData) => {
    if (!tree.position) return;
    if (tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2) {
      const remaining = 2 - (tree.answersSinceMiss ?? 0);
      setSaplingNotice(`This one comes back after ${remaining} more question${remaining > 1 ? 's' : ''}.`);
      return;
    }
    const [tx, , tz] = tree.position;
    const stand = layout ? approachPoint(layout, { x: tx, z: tz }) : { x: tx, z: tz + 1.8 };
    moveTo([stand.x, 0, stand.z], tree.id);
  };

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 pointer-events-none p-2.5 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-2">
          <div className="paper pointer-events-auto flex items-center gap-2.5 px-3 py-2 min-w-0">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="shrink-0">
              <path d="M12 3 L 19 14 H 5 Z" fill="#5f9f5a" stroke="#2f2a22" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 8 L 20 19 H 4 Z" fill="#4f8c50" stroke="#2f2a22" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 19 V 22" stroke="#6b4a2b" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <div className="min-w-0">
              <div className="text-[15px] font-black leading-tight tracking-tight">Mastery Grove</div>
              <div className="text-xs font-semibold text-ink-soft truncate max-w-[9.5rem] sm:max-w-xs">{world?.subject}</div>
            </div>
          </div>

          {/* The grove you're in, and its trees as leaves */}
          {progress.total > 0 && (
            <div className="paper pointer-events-auto hidden md:flex items-center gap-3 px-4 py-2.5">
              <span className="text-sm font-extrabold">{progress.questName}</span>
              <span className="flex items-center gap-1" aria-label={`${progress.current} of ${progress.total} trees grown`}>
                {groveLeaves.map((t) =>
                  t.state === 'healthy' || t.state === 'regrown' ? (
                    <Leaf key={t.id} size={18} />
                  ) : t.state === 'withered' ? (
                    <Leaf key={t.id} size={18} color="#a08c68" />
                  ) : (
                    <Leaf key={t.id} size={18} hollow />
                  )
                )}
              </span>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2">
            {guessesScored > 0 && (
              <div className="paper hidden lg:flex items-center gap-2 pl-1.5 pr-3 py-1" title="How often Byte guessed your answer right">
                <ByteFace size={30} />
                <span className="text-xs font-bold">
                  Byte guessed {guessesRight} of {guessesScored}
                </span>
              </div>
            )}
            <button
              onClick={toggleSound}
              data-testid="toggle-sound-btn"
              className="btn btn-paper w-10 h-10 p-0"
              title={soundOn ? 'Sound off' : 'Sound on'}
              aria-label={soundOn ? 'Sound off' : 'Sound on'}
            >
              {soundOn ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
            </button>
            <button onClick={() => setScreen('teacher')} data-testid="teacher-btn" className="btn btn-paper h-10 px-3 text-sm">
              <Apple size={18} />
              <span className="hidden sm:inline">Teacher</span>
            </button>
            <button onClick={() => setScreen('start')} data-testid="new-world-btn" className="btn btn-paper h-10 px-3 text-sm" title="Grow a new forest">
              <Sprout size={18} />
              <span className="hidden sm:inline">New forest</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notes stack under the title, so one never covers another */}
      <div className="fixed z-40 top-[4.5rem] sm:top-24 left-2.5 sm:left-4 right-2.5 sm:right-auto sm:w-[22rem] flex flex-col gap-2 pointer-events-none">
        {welcomeBackInfo && (
          <Note accent="var(--color-sun)">
            <ByteFace size={36} className="shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="font-extrabold">Welcome back!</div>
              <p className="text-ink-soft">{welcomeBackInfo.thoughtPatternToWatch}</p>
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {welcomeBackInfo.streak > 0 && <span className="px-2 py-0.5 rounded-full bg-sun-soft">{welcomeBackInfo.streak} right in a row</span>}
                <span className="px-2 py-0.5 rounded-full bg-leaf-soft">
                  {welcomeBackInfo.completedGrovesCount} of {welcomeBackInfo.unlockedGrovesCount} groves grown
                </span>
              </div>
            </div>
            <button onClick={dismissWelcomeBack} data-testid="dismiss-welcome-back" className="self-start text-ink-soft hover:text-ink" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </Note>
        )}
        {saplingNotice && (
          <Note accent="var(--color-leaf)">
            <Sprout size={22} className="shrink-0" />
            <span className="font-semibold">{saplingNotice}</span>
          </Note>
        )}
        {teacherToast && (
          <Note accent="var(--color-violet)">
            <Lantern size={22} color="var(--color-violet)" className="shrink-0" />
            <span className="font-semibold">{teacherToast}</span>
          </Note>
        )}
      </div>

      {/* The tree list: a little field journal */}
      <div className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-30 pointer-events-auto flex flex-col items-start gap-2">
        {questListOpen && (
          <div className="paper rise-in w-[min(23rem,calc(100vw-1.5rem))] max-h-[min(60dvh,34rem)] flex flex-col overflow-hidden">
            <div className="flex items-baseline justify-between px-4 pt-3 pb-2 border-b-2 border-paper-edge/70">
              <h3 className="font-black">Your trees</h3>
              <span className="text-xs text-ink-soft">{isTouch ? 'Tap one to walk there' : 'Click one to walk there'}</span>
            </div>
            <div className="overflow-y-auto px-3 py-2 space-y-3">
              {world?.concepts
                .filter((c) => unlocked.includes(c.id))
                .map((concept) => (
                  <section key={concept.id} className="space-y-1.5">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-leaf-deep px-1">{concept.questName}</div>
                    {trees
                      .filter((t) => t.conceptId === concept.id)
                      .map((tree) => {
                        const isPick = tutorBeaconTreeId === tree.id;
                        const status = treeStatus(tree);
                        return (
                          <button
                            key={tree.id}
                            data-testid={`quest-tree-${tree.id}`}
                            onClick={() => walkToTree(tree)}
                            className={`w-full text-left rounded-xl px-2.5 py-2 border-2 transition-colors flex flex-col gap-1 ${
                              isPick ? 'bg-sun-soft border-sun' : 'bg-paper border-transparent hover:bg-paper-deep'
                            }`}
                          >
                            <span className="flex items-center gap-2 w-full">
                              <span className="shrink-0">{status.icon}</span>
                              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{snippet(tree.question)}</span>
                              <span className="shrink-0 text-[11px] font-bold text-ink-soft">{status.label}</span>
                            </span>
                            {isPick && (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-sun-deep pl-6">
                                <ByteFace size={16} />
                                Byte's pick{tutorBeaconReason ? `: ${tutorBeaconReason}` : ''}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </section>
                ))}
            </div>
          </div>
        )}
        <button onClick={toggleQuestList} data-testid="toggle-quest-list-btn" className="btn btn-sun h-11 px-4 text-sm">
          <TrailMap size={20} />
          <span>{questListOpen ? 'Close list' : 'Trees'}</span>
        </button>
      </div>

      {/* How to move */}
      {!isTouch && (
        <div className="fixed bottom-4 right-4 z-30 paper px-3 py-1.5 text-xs font-semibold text-ink-soft select-none">
          Click a tree to walk there · arrow keys to roam · space to hop
        </div>
      )}

      {/* Phones: press and hold the pad to walk, tap Hop to jump. Hidden while the tree list is open. */}
      {!questListOpen && (
        <div className="fixed bottom-3 right-3 z-30 pointer-events-auto flex items-end gap-2 sm:hidden select-none touch-none">
          <div className="paper grid grid-cols-3 gap-1 p-1.5">
            <div />
            <button data-testid="dpad-up" aria-label="Walk forward" className="btn btn-paper w-12 h-12 p-0" {...holdKey('arrowup')}>
              <PadArrow direction="up" />
            </button>
            <div />
            <button data-testid="dpad-left" aria-label="Walk left" className="btn btn-paper w-12 h-12 p-0" {...holdKey('arrowleft')}>
              <PadArrow direction="left" />
            </button>
            <button data-testid="dpad-down" aria-label="Walk back" className="btn btn-paper w-12 h-12 p-0" {...holdKey('arrowdown')}>
              <PadArrow direction="down" />
            </button>
            <button data-testid="dpad-right" aria-label="Walk right" className="btn btn-paper w-12 h-12 p-0" {...holdKey('arrowright')}>
              <PadArrow direction="right" />
            </button>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('avatar-hop'))}
            data-testid="jump-btn"
            aria-label="Hop"
            className="btn btn-leaf w-14 h-14 rounded-full text-sm"
          >
            Hop
          </button>
        </div>
      )}
    </>
  );
};
