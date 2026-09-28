import { describe, expect, it } from 'vitest';
import type { TeachBackRecord, TreeData } from '../types/game';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import { keywordMarks, miaStatus, pointsNeeded, teachBackPasses, validTeachSpots } from './teach';

const tree = (id: string, state: TreeData['state'] = 'unanswered', extra: Partial<TreeData> = {}): TreeData => ({
  id,
  conceptId: 'c1',
  question: 'q',
  choices: ['a', 'b'],
  answerIndex: 0,
  explanation: '',
  citation: null,
  state,
  ...extra,
});
const record = (conceptId: string, passed: boolean): TeachBackRecord => ({
  conceptId,
  passed,
  hit: [],
  missing: [],
  words: '',
  spoken: false,
  session: 1,
  at: 0,
});

describe('teachBackPasses (Mia gets it)', () => {
  it('needs two thirds of the rubric points or more', () => {
    expect(pointsNeeded(3)).toBe(2);
    expect(pointsNeeded(4)).toBe(3);
    expect(pointsNeeded(2)).toBe(2);
    expect(teachBackPasses(2, 3)).toBe(true);
    expect(teachBackPasses(1, 3)).toBe(false);
    expect(teachBackPasses(2, 4)).toBe(false);
    expect(teachBackPasses(3, 4)).toBe(true);
  });

  it('never passes an empty rubric', () => {
    expect(teachBackPasses(0, 0)).toBe(false);
  });
});

describe('keywordMarks (the offline check)', () => {
  const rubric = [
    'Divide the top and the bottom by the same number',
    '2/8 is less than 4/8, so it is not the same amount',
    '4/8 simplifies to 1/2',
  ];

  it('marks the points a clear explanation covers, in kid words or textbook words', () => {
    expect(keywordMarks(rubric, 'You have to divide the top AND the bottom by 4, not just the top. 4/8 is really 1/2.')).toEqual([true, false, true]);
    expect(keywordMarks(rubric, 'Do the same thing to the numerator and the denominator! 2/8 is smaller than 4/8.')).toEqual([true, true, false]);
  });

  it('gives nothing for a shrug, or for repeating Mia’s own working back to her', () => {
    expect(keywordMarks(rubric, "I don't know, maybe it's fine")).toEqual([false, false, false]);
    expect(keywordMarks(rubric, 'You halved the top and got 2/8.')).toEqual([false, false, false]);
    expect(keywordMarks(rubric, '')).toEqual([false, false, false]);
  });

  it('lets a good explanation help every sample Mia, offline too', () => {
    const good: Record<string, string> = {
      c1: 'You have to divide the top and the bottom by the same number. 4/8 is 1/2, and 2/8 is less than 4/8.',
      c2: 'Eighths are smaller pieces than quarters. 3/4 is the same as 6/8, and 6/8 is more than 5/8, so 3/4 is bigger.',
      c3: "You can't add the bottoms. 1/2 is 3/6 and 1/3 is 2/6, so it's 3/6 + 2/6 = 5/6.",
    };
    for (const spot of SAMPLE_WORLD.teachSpots ?? []) {
      const marks = keywordMarks(spot.rubricPoints, good[spot.conceptId]);
      expect(teachBackPasses(marks.filter(Boolean).length, marks.length), spot.conceptId).toBe(true);
    }
  });

  it('hears "can\'t" and "cannot" as the same word', () => {
    expect(keywordMarks(['You cannot add the bottoms'], "you can't add bottoms")).toEqual([true]);
  });

  it('reads fractions written with spaces the same as without', () => {
    expect(keywordMarks(['3/6 + 2/6 = 5/6'], 'three sixths plus two sixths: 3 / 6 + 2 / 6 = 5 / 6')).toEqual([true]);
  });
});

describe('validTeachSpots', () => {
  const world = { concepts: SAMPLE_WORLD.concepts, misconceptions: SAMPLE_WORLD.misconceptions };

  it('keeps one good spot per grove and drops broken ones', () => {
    const spots = validTeachSpots({
      ...world,
      teachSpots: [
        { conceptId: 'c1', misconceptionId: 'm2', puzzledThought: '  I halved the top.  ', board: '4/8 = 2/8 ?', rubricPoints: ['a', ' b ', ''] },
        { conceptId: 'c1', puzzledThought: 'second spot for the same grove', rubricPoints: ['a', 'b'] },
        { conceptId: 'nope', puzzledThought: 'no such grove', rubricPoints: ['a', 'b'] },
        { conceptId: 'c2', puzzledThought: '', rubricPoints: ['a', 'b'] },
        { conceptId: 'c3', puzzledThought: 'only one point', rubricPoints: ['a'] },
        null as never,
      ],
    });
    expect(spots).toEqual([{ conceptId: 'c1', misconceptionId: 'm2', puzzledThought: 'I halved the top.', board: '4/8 = 2/8 ?', rubricPoints: ['a', 'b'] }]);
  });

  it('forgets a misconception the world does not have, and a world with no spots has no Mia', () => {
    const [spot] = validTeachSpots({ ...world, teachSpots: [{ conceptId: 'c2', misconceptionId: 'm99', puzzledThought: 'hm', rubricPoints: ['a', 'b'] }] });
    expect(spot.misconceptionId).toBeUndefined();
    expect(validTeachSpots(world)).toEqual([]);
  });

  it('accepts the sample world’s spots as they are', () => {
    expect(validTeachSpots(SAMPLE_WORLD)).toEqual(SAMPLE_WORLD.teachSpots);
    expect(SAMPLE_WORLD.teachSpots?.map((s) => s.conceptId)).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('miaStatus', () => {
  const grove = [tree('a'), tree('b'), tree('c'), tree('d'), tree('e')];

  it('waits until 60% of the grove is grown, and says how many trees are left', () => {
    expect(miaStatus(grove, 'c1', ['c1'], [])).toEqual({ kind: 'growing', treesToGo: 3 });
    const two = [tree('a', 'healthy'), tree('b', 'regrown'), tree('c'), tree('d'), tree('e')];
    expect(miaStatus(two, 'c1', ['c1'], [])).toEqual({ kind: 'growing', treesToGo: 1 });
  });

  it('is ready once 3 of 5 are grown; saplings and made-for-you trees do not count', () => {
    const three = [tree('a', 'healthy'), tree('b', 'healthy'), tree('c', 'healthy'), tree('d'), tree('e')];
    expect(miaStatus(three, 'c1', ['c1'], [])).toEqual({ kind: 'ready' });
    const extras = [...grove.slice(0, 3).map((t) => ({ ...t, state: 'healthy' as const, isTargeted: true })), ...grove.slice(3)];
    expect(miaStatus([...grove, ...extras], 'c1', ['c1'], []).kind).toBe('growing');
  });

  it('is helped after a passed teach-back, even if a tree wilts later, and locked with the grove', () => {
    expect(miaStatus(grove, 'c1', ['c1'], [record('c1', false), record('c1', true)])).toEqual({ kind: 'helped' });
    expect(miaStatus(grove, 'c1', ['c1'], [record('c1', false), record('c2', true)]).kind).toBe('growing');
    expect(miaStatus(grove, 'c1', [], [])).toEqual({ kind: 'locked' });
  });
});
