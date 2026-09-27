import { describe, expect, it } from 'vitest';
import type { TreeData, TreePrediction } from '../types/game';
import { computeTutorPick } from './planner';

const tree = (id: string, extra: Partial<TreeData> = {}): TreeData => ({
  id,
  conceptId: 'c1',
  question: 'q',
  choices: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  explanation: '',
  citation: null,
  state: 'unanswered',
  ...extra,
});
const prediction = (treeId: string, pCorrect: number, misconceptionId: string | null = null): TreePrediction => ({
  treeId,
  pCorrect,
  predictedChoice: 0,
  misconceptionId,
  why: '',
});
const misconceptions = [{ id: 'm1', conceptId: 'c1', label: 'divides only the numerator when simplifying' }];
const pick = (trees: TreeData[], preds: TreePrediction[] = [], active: string | null = null, unlocked = ['c1']) =>
  computeTutorPick(trees, unlocked, Object.fromEntries(preds.map((p) => [p.treeId, p])), active, misconceptions);

describe('computeTutorPick (Byte’s pick)', () => {
  it('checks memory first, then questions made for this kid', () => {
    expect(pick([tree('a'), tree('made', { isTargeted: true }), tree('mem', { isMemorySprout: true })]).beaconId).toBe('mem');
    expect(pick([tree('a'), tree('made', { isTargeted: true })]).beaconId).toBe('made');
  });

  it('never picks a tree that is answered, wilted, waiting as a sapling, or in a locked grove', () => {
    const trees = [
      tree('done', { state: 'healthy' }),
      tree('wilted', { state: 'withered' }),
      tree('waiting', { state: 'sapling', answersSinceMiss: 1 }),
      tree('locked', { conceptId: 'c2' }),
    ];
    expect(pick(trees).beaconId).toBeNull();
  });

  it('starts with the first open tree when there are no predictions yet', () => {
    expect(pick([tree('a'), tree('b')])).toEqual({ beaconId: 'a', reason: 'a good place to start' });
  });

  it('goes after an active mix-up with a tree Byte predicts will show it', () => {
    const trees = [tree('a'), tree('b'), tree('c')];
    const preds = [prediction('a', 0.7), prediction('b', 0.3, 'm1'), prediction('c', 0.55, 'm1')];
    expect(pick(trees, preds, 'm1').beaconId).toBe('c');
  });

  it('otherwise aims for about a 70% chance, and an unpredicted tree does not win just by having no number', () => {
    const trees = [tree('new-sapling'), tree('easy'), tree('right')];
    const preds = [prediction('easy', 0.95), prediction('right', 0.68)];
    expect(pick(trees, preds).beaconId).toBe('right');
  });
});
