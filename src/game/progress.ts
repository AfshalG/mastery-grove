// The rules for progress through the forest, in one place. The hackathon build had four different ideas of
// "grove complete" (signs, unlocks, the welcome-back card and the HUD), which disagreed with each other.
import type { ConceptData, QuestionAttempt, TreeData, WorldData } from '../types/game';
import { isExtraTree } from './forest';

/** Other questions a kid must answer before a sapling (the missed question coming back) opens. */
export const SAPLING_SPACING = 2;

const isAnswered = (t: TreeData) => t.state === 'healthy' || t.state === 'regrown';

/** A grove is complete when all of the worksheet's own trees in it are answered right. Extra trees never count. */
export function isGroveComplete(trees: TreeData[], conceptId: string) {
  const own = trees.filter((t) => t.conceptId === conceptId && !isExtraTree(t));
  return own.length > 0 && own.every(isAnswered);
}

export function countCompletedGroves(concepts: ConceptData[], trees: TreeData[]) {
  return concepts.filter((c) => isGroveComplete(trees, c.id)).length;
}

/**
 * Groves the kid can enter: every prerequisite is complete. A prerequisite with no trees of its own
 * (or one Gemini named but never made) counts as done, so a grove can never be locked for good.
 */
export function unlockedConcepts(world: Pick<WorldData, 'concepts'>, trees: TreeData[]) {
  return world.concepts
    .filter((c) =>
      c.prerequisites.every((p) => {
        const hasOwnTrees = trees.some((t) => t.conceptId === p && !isExtraTree(t));
        return !hasOwnTrees || isGroveComplete(trees, p);
      })
    )
    .map((c) => c.id);
}

/** Follows saplings back to the worksheet tree they came from, so fixing the sapling regrows the original. */
export function rootTreeId(trees: TreeData[], tree: TreeData): string {
  const byId = new Map(trees.map((t) => [t.id, t]));
  const seen = new Set<string>();
  let current = tree;
  while (current.sourceTreeId && !seen.has(current.id)) {
    seen.add(current.id);
    const next = byId.get(current.sourceTreeId);
    if (!next) break;
    current = next;
  }
  return current.id;
}

export type OpenCheck = { ok: true } | { ok: false; reason: 'locked' | 'done' | 'withered' | 'waiting' };

/**
 * Whether a tree's question can be opened now. Answered trees stay closed (answering one again, wrongly,
 * used to lock later groves again), and a withered tree comes back only through its sapling, after spacing.
 */
export function canOpenTree(tree: TreeData, unlocked: string[]): OpenCheck {
  if (!unlocked.includes(tree.conceptId)) return { ok: false, reason: 'locked' };
  if (isAnswered(tree)) return { ok: false, reason: 'done' };
  if (tree.state === 'withered') return { ok: false, reason: 'withered' };
  if (tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < SAPLING_SPACING) return { ok: false, reason: 'waiting' };
  return { ok: true };
}

/** Correct answers in a row, newest first. Zero is a real answer: the old card always claimed at least 1. */
export function currentStreak(attempts: Array<Pick<QuestionAttempt, 'correct'>>) {
  let streak = 0;
  for (const a of attempts) {
    if (!a.correct) break;
    streak++;
  }
  return streak;
}

/** Gemini sometimes repeats a tree id. Later copies get a suffix, so every tree stays addressable. */
export function dedupeTreeIds<T extends { id: string }>(trees: T[]): T[] {
  const seen = new Set<string>();
  return trees.map((t) => {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      return t;
    }
    let k = 2;
    while (seen.has(`${t.id}_${k}`)) k++;
    const id = `${t.id}_${k}`;
    seen.add(id);
    return { ...t, id };
  });
}

/** A mix-up counts as active once its strength passes this. */
const ACTIVE_THRESHOLD = 0.3;
/** Below this a mix-up is treated as gone. */
const FADED = 0.05;

/** The mix-up Byte is chasing: the strongest one above the threshold that the kid hasn't already fixed. */
export function activeMisconception(strengths: Record<string, number>, overcome: string[]): string | null {
  let best: string | null = null;
  let bestValue = ACTIVE_THRESHOLD;
  for (const [id, value] of Object.entries(strengths)) {
    if (value > bestValue && !overcome.includes(id)) {
      best = id;
      bestValue = value;
    }
  }
  return best;
}

/** A right answer halves a mix-up's strength; a faint one drops to zero instead of lingering as "1%". */
export function weakenMisconception(value: number) {
  const next = value * 0.5;
  return next < FADED ? 0 : next;
}

/** A short fingerprint of a world's questions, so saves for two worlds with the same title never mix. */
export function worldFingerprint(world: Pick<WorldData, 'concepts' | 'trees'>) {
  const text = [...world.concepts.map((c) => c.id), ...world.trees.map((t) => `${t.id}:${t.question}`)].join('|');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
