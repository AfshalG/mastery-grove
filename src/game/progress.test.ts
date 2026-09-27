import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import type { QuestionAttempt, TreeData } from '../types/game';
import {
  canOpenTree,
  countCompletedGroves,
  currentStreak,
  dedupeTreeIds,
  isGroveComplete,
  rootTreeId,
  unlockedConcepts,
} from './progress';

const tree = (id: string, conceptId: string, state: TreeData['state'], extra: Partial<TreeData> = {}): TreeData => ({
  id,
  conceptId,
  question: 'q',
  choices: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  explanation: '',
  citation: null,
  state,
  ...extra,
});

describe('isGroveComplete', () => {
  it('counts only the worksheet’s own trees, answered right', () => {
    const trees = [tree('a', 'c1', 'healthy'), tree('b', 'c1', 'regrown')];
    expect(isGroveComplete(trees, 'c1')).toBe(true);
  });

  it('ignores saplings, made-for-you, teacher and memory trees either way', () => {
    const trees = [
      tree('a', 'c1', 'healthy'),
      tree('s', 'c1', 'sapling', { isSapling: true }),
      tree('m', 'c1', 'unanswered', { isTargeted: true }),
      tree('t', 'c1', 'withered', { isTeacherDeployed: true }),
      tree('r', 'c1', 'unanswered', { isMemorySprout: true }),
    ];
    expect(isGroveComplete(trees, 'c1')).toBe(true);
  });

  it('is not complete while one of its own trees is open or withered, or when it has none', () => {
    expect(isGroveComplete([tree('a', 'c1', 'healthy'), tree('b', 'c1', 'withered')], 'c1')).toBe(false);
    expect(isGroveComplete([tree('a', 'c1', 'unanswered')], 'c1')).toBe(false);
    expect(isGroveComplete([], 'c1')).toBe(false);
  });
});

describe('unlockedConcepts', () => {
  const world = SAMPLE_WORLD;

  it('opens only groves whose prerequisites are complete', () => {
    const fresh = world.trees.map((t) => ({ ...t, state: 'unanswered' as const }));
    expect(unlockedConcepts(world, fresh)).toEqual(['c1']);

    const c1Done = fresh.map((t) => (t.conceptId === 'c1' ? { ...t, state: 'healthy' as const } : t));
    expect(unlockedConcepts(world, c1Done)).toEqual(['c1', 'c2']);
  });

  it('treats a prerequisite with no trees of its own as done', () => {
    const trees = world.trees.filter((t) => t.conceptId !== 'c1');
    expect(unlockedConcepts(world, trees)).toContain('c2');
  });
});

describe('countCompletedGroves', () => {
  it('uses the same definition as the signs and the unlocks', () => {
    const trees = SAMPLE_WORLD.trees.map((t) => ({ ...t, state: t.conceptId === 'c1' ? ('regrown' as const) : ('unanswered' as const) }));
    expect(countCompletedGroves(SAMPLE_WORLD.concepts, trees)).toBe(1);
  });
});

describe('rootTreeId', () => {
  it('follows a chain of saplings back to the worksheet tree', () => {
    const trees = [
      tree('t1', 'c1', 'withered'),
      tree('s1', 'c1', 'withered', { isSapling: true, sourceTreeId: 't1' }),
      tree('s2', 'c1', 'sapling', { isSapling: true, sourceTreeId: 's1' }),
    ];
    expect(rootTreeId(trees, trees[2])).toBe('t1');
    expect(rootTreeId(trees, trees[0])).toBe('t1');
  });

  it('stops on a loop instead of hanging', () => {
    const trees = [tree('a', 'c1', 'sapling', { sourceTreeId: 'b' }), tree('b', 'c1', 'sapling', { sourceTreeId: 'a' })];
    expect(['a', 'b']).toContain(rootTreeId(trees, trees[0]));
  });
});

describe('canOpenTree', () => {
  it('lets a kid open a tree that is still open', () => {
    expect(canOpenTree(tree('a', 'c1', 'unanswered'), ['c1'])).toEqual({ ok: true });
  });

  it('keeps answered trees closed (a wrong repeat answer used to lock groves again)', () => {
    expect(canOpenTree(tree('a', 'c1', 'healthy'), ['c1'])).toEqual({ ok: false, reason: 'done' });
    expect(canOpenTree(tree('a', 'c1', 'regrown'), ['c1'])).toEqual({ ok: false, reason: 'done' });
  });

  it('keeps a withered tree closed: its sapling brings the question back later', () => {
    expect(canOpenTree(tree('a', 'c1', 'withered'), ['c1'])).toEqual({ ok: false, reason: 'withered' });
  });

  it('keeps locked groves and waiting saplings closed', () => {
    expect(canOpenTree(tree('a', 'c2', 'unanswered'), ['c1'])).toEqual({ ok: false, reason: 'locked' });
    expect(canOpenTree(tree('s', 'c1', 'sapling', { answersSinceMiss: 1 }), ['c1'])).toEqual({ ok: false, reason: 'waiting' });
    expect(canOpenTree(tree('s', 'c1', 'sapling', { answersSinceMiss: 2 }), ['c1'])).toEqual({ ok: true });
  });
});

describe('currentStreak', () => {
  const attempt = (correct: boolean) => ({ correct }) as QuestionAttempt;

  it('counts correct answers in a row, newest first, and can be zero', () => {
    expect(currentStreak([attempt(true), attempt(true), attempt(false), attempt(true)])).toBe(2);
    expect(currentStreak([attempt(false), attempt(true)])).toBe(0);
    expect(currentStreak([])).toBe(0);
  });
});

describe('dedupeTreeIds', () => {
  it('renames repeated ids from Gemini so no two trees share one', () => {
    const trees = [tree('t1', 'c1', 'unanswered'), tree('t1', 'c1', 'unanswered'), tree('t1', 'c2', 'unanswered')];
    const ids = dedupeTreeIds(trees).map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('t1');
  });
});
