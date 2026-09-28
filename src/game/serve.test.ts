import { describe, expect, it } from 'vitest';
import { diagnoseServe, servesNeeded, simplify } from './serve';

const twoThirds = { targetNumerator: 2, targetDenominator: 3, totalSlices: 6 };
const threeQuarterPlanks = { targetNumerator: 3, targetDenominator: 4, totalSlices: 8, whole: 'bridge' as const };

describe('servesNeeded and simplify', () => {
  it('works out the slices for a fraction of the cake', () => {
    expect(servesNeeded(twoThirds)).toBe(4);
    expect(servesNeeded(threeQuarterPlanks)).toBe(6);
  });

  it('simplifies a fraction', () => {
    expect(simplify(3, 6)).toEqual([1, 2]);
    expect(simplify(4, 6)).toEqual([2, 3]);
    expect(simplify(5, 7)).toEqual([5, 7]);
    expect(simplify(0, 6)).toEqual([0, 1]);
  });
});

describe('diagnoseServe: a wrong serve names the exact mistake', () => {
  it('a right serve says what it came to', () => {
    expect(diagnoseServe(twoThirds, 4)).toMatchObject({ correct: true, mistake: null, line: '4 of 6 slices is 2/3. Just right!' });
  });

  it('serving the top number', () => {
    const d = diagnoseServe(twoThirds, 2);
    expect(d).toMatchObject({ correct: false, mistake: 'top-number' });
    expect(d.line).toBe('You served 2 slices: the top number. But this cake has 6 slices, so 2/3 of it is more than 2 slices.');
  });

  it('serving the bottom number', () => {
    const d = diagnoseServe(twoThirds, 3);
    expect(d.mistake).toBe('bottom-number');
    expect(d.line).toBe('You served 3 slices: the bottom number. The bottom number says how many equal groups to cut the cake into, not how many slices to serve.');
  });

  it('serving the part that should stay behind', () => {
    const d = diagnoseServe({ targetNumerator: 5, targetDenominator: 6, totalSlices: 12 }, 2);
    expect(d.mistake).toBe('leftover');
    expect(d.line).toBe('You served 2 of 12: that’s the part that should stay on the plate. 5/6 is the other part.');
  });

  it('serving the whole cake, or nothing', () => {
    expect(diagnoseServe(twoThirds, 6)).toMatchObject({ mistake: 'whole', line: 'You served the whole cake: 6/6 is 1 whole, not 2/3.' });
    expect(diagnoseServe(twoThirds, 0)).toMatchObject({ mistake: 'nothing', line: 'You didn’t serve any slices yet.' });
  });

  it('too few or too many, with the fraction it came to', () => {
    const few = diagnoseServe({ targetNumerator: 3, targetDenominator: 4, totalSlices: 8 }, 5);
    expect(few).toMatchObject({ mistake: 'too-few', line: 'You served 5 of 8: that’s 5/8, not 3/4. It’s 1 slice too few.' });
    const many = diagnoseServe({ targetNumerator: 1, targetDenominator: 3, totalSlices: 6 }, 3);
    expect(many).toMatchObject({ mistake: 'bottom-number' });
    const over = diagnoseServe({ targetNumerator: 1, targetDenominator: 4, totalSlices: 8 }, 4);
    expect(over.mistake).toBe('bottom-number');
    const way = diagnoseServe({ targetNumerator: 1, targetDenominator: 4, totalSlices: 12 }, 6);
    expect(way).toMatchObject({ mistake: 'too-many', line: 'You served 6 of 12: that’s 6/12 = 1/2, not 1/4. It’s 3 slices too many.' });
  });

  it('asks a question back that points at equal groups', () => {
    expect(diagnoseServe(twoThirds, 2).hint).toBe('6 slices in 3 equal groups: how many slices are in each group?');
  });

  it('talks about planks and the bridge for a build-the-bridge challenge', () => {
    expect(diagnoseServe(threeQuarterPlanks, 6).line).toBe('6 of 8 planks is 3/4. Just right!');
    expect(diagnoseServe(threeQuarterPlanks, 3).line).toBe(
      'You laid 3 planks: the top number. But this bridge has 8 planks, so 3/4 of it is more than 3 planks.'
    );
    expect(diagnoseServe(threeQuarterPlanks, 4).line).toBe(
      'You laid 4 planks: the bottom number. The bottom number says how many equal groups to split the bridge into, not how many planks to lay.'
    );
    expect(diagnoseServe(threeQuarterPlanks, 8).line).toBe('You laid the whole bridge: 8/8 is 1 whole, not 3/4.');
  });
});
