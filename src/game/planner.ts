// Byte's pick: the "plan" step of the learner model. Gemini predicts; this plain code decides which tree the
// beacon lights next.
import type { MisconceptionData, TreeData, TreePrediction } from '../types/game';
import { canOpenTree } from './progress';

/** The chance of success that makes a good next challenge: stretching, but likely to go well. */
const SWEET_SPOT = 0.7;
/** When chasing a mix-up, a tree the kid might still get wrong tells us the most. */
const MIX_UP_SPOT = 0.6;

export function computeTutorPick(
  trees: TreeData[],
  unlockedConcepts: string[],
  predictions: Record<string, TreePrediction>,
  activeMisconceptionId: string | null,
  worldMisconceptions: MisconceptionData[]
): { beaconId: string | null; reason: string | null } {
  // Only trees the kid can open right now. A missed tree comes back through its sapling, after spacing.
  const open = trees.filter((t) => canOpenTree(t, unlockedConcepts).ok);
  if (open.length === 0) return { beaconId: null, reason: null };

  const memory = open.find((t) => t.isMemorySprout);
  if (memory) return { beaconId: memory.id, reason: 'Do you still remember this one?' };

  const madeForYou = open.find((t) => t.isTargeted);
  if (madeForYou) return { beaconId: madeForYou.id, reason: 'made just for you' };

  const predicted = open.filter((t) => predictions[t.id]);
  if (predicted.length === 0) return { beaconId: open[0].id, reason: 'a good place to start' };

  const closestTo = (target: number) => (a: TreeData, b: TreeData) =>
    Math.abs(predictions[a.id].pCorrect - target) - Math.abs(predictions[b.id].pCorrect - target);

  if (activeMisconceptionId) {
    const showsIt = predicted.filter((t) => predictions[t.id].misconceptionId === activeMisconceptionId);
    if (showsIt.length > 0) return { beaconId: [...showsIt].sort(closestTo(MIX_UP_SPOT))[0].id, reason: "let's check that idea again" };
  }

  // Trees without a prediction wait until Byte has guessed them, rather than winning by default.
  const best = [...predicted].sort(closestTo(SWEET_SPOT))[0];
  const mixUp = worldMisconceptions.find((m) => m.id === predictions[best.id].misconceptionId);
  const reason = mixUp ? `watch out for: ${mixUp.label.length > 28 ? `${mixUp.label.slice(0, 26)}…` : mixUp.label}` : 'just the right challenge';
  return { beaconId: best.id, reason };
}
