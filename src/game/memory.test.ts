import { describe, expect, it } from 'vitest';
import { calibrationLine, dueTrees, judgmentFeedback, judgmentGap, reviewCard } from './memory';

describe('reviewCard (Leitner boxes)', () => {
  it('learns on the first right answer and masters on a right answer in a later session', () => {
    const learned = reviewCard(undefined, true, 1);
    expect(learned.box).toBe(2);
    expect(reviewCard(learned, true, 1).box).toBe(2); // same session: not yet mastered
    expect(reviewCard(learned, true, 2).box).toBe(3);
  });

  it('drops back to the first box on a wrong answer and counts the lapse', () => {
    const mastered = { box: 3 as const, lastSession: 2, lapses: 0 };
    expect(reviewCard(mastered, false, 4)).toEqual({ box: 1, lastSession: 4, lapses: 1 });
  });
});

describe('dueTrees (Memory Quest)', () => {
  it('brings back learned trees after a session, mastered ones after three', () => {
    const cards = {
      learnedToday: { box: 2 as const, lastSession: 3, lapses: 0 },
      learnedYesterday: { box: 2 as const, lastSession: 2, lapses: 0 },
      masteredRecently: { box: 3 as const, lastSession: 1, lapses: 0 },
      masteredLongAgo: { box: 3 as const, lastSession: 0, lapses: 0 },
      stillMissed: { box: 1 as const, lastSession: 1, lapses: 1 },
    };
    expect(dueTrees(cards, 3).sort()).toEqual(['learnedYesterday', 'masteredLongAgo']);
  });
});

describe('calibrationLine', () => {
  it('names being sure and wrong as the moment to slow down', () => {
    expect(calibrationLine('Very sure', false)).toMatch(/slow down/i);
  });
  it('tells an unsure kid who got it right that they knew more than they thought', () => {
    expect(calibrationLine('Not sure', true)).toMatch(/more than you thought/i);
  });
  it('has something to say for every case', () => {
    for (const c of ['Not sure', 'Fairly sure', 'Very sure'] as const) {
      for (const ok of [true, false]) expect(calibrationLine(c, ok).length).toBeGreaterThan(5);
    }
  });
});

describe('judgmentFeedback (reflection)', () => {
  it('flags feeling sure while getting less than 70% right', () => {
    expect(judgmentFeedback(4, 0.55)).toMatch(/55%/);
  });
  it('encourages a kid who doubts themselves but got 70% or more', () => {
    expect(judgmentFeedback(1, 0.8)).toMatch(/more than you think/i);
  });
  it('says nothing extra when feeling and results agree', () => {
    expect(judgmentFeedback(3, 0.9)).toBeNull();
    expect(judgmentFeedback(2, 0.4)).toBeNull();
  });
});

describe('judgmentGap', () => {
  it('names a kid who feels sure but is not, and one who doubts but is', () => {
    expect(judgmentGap(4, 0.4)).toBe('overconfident');
    expect(judgmentGap(1, 1)).toBe('underconfident');
    expect(judgmentGap(3, 0.9)).toBeNull();
    expect(judgmentGap(2, 0.5)).toBeNull();
  });
});
