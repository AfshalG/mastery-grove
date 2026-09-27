import { describe, expect, it } from 'vitest';
import { damp, turnToward } from './motion';
import { endSentence, shorten } from './text';
import { answerComparison, hideServeAnswer, sanitizeVisual } from './visuals';

describe('shorten', () => {
  it('leaves a short question alone, question mark and all', () => {
    const hint = 'What happens if you do the same thing to the top and the bottom?';
    expect(shorten(hint, 15)).toBe(hint);
  });

  it('keeps whole sentences that fit', () => {
    expect(shorten('You compared the top numbers. Then you added them up.', 5)).toBe('You compared the top numbers.');
  });

  it('cuts one long sentence at a word, with a single ellipsis', () => {
    expect(shorten('one two three four five six seven', 3)).toBe('one two three…');
  });

  it('never leaves a double full stop', () => {
    const out = shorten('You picked 1/8. I think you changed one part but not the other.', 9);
    expect(out).not.toMatch(/\.\./);
    expect(out).toBe('You picked 1/8.');
  });

  it('copes with empty or missing text', () => {
    expect(shorten('', 5)).toBe('');
    expect(shorten(undefined, 5)).toBe('');
  });
});

describe('endSentence', () => {
  it('adds a full stop only when the sentence has no ending', () => {
    expect(endSentence('You halved the top')).toBe('You halved the top.');
    expect(endSentence('You halved the top.')).toBe('You halved the top.');
    expect(endSentence('Did you halve the top?')).toBe('Did you halve the top?');
    expect(endSentence('  spaced out  ')).toBe('spaced out.');
  });
});

describe('sanitizeVisual', () => {
  it('passes a valid cake, bar and pair of cakes', () => {
    expect(sanitizeVisual({ kind: 'cake', parts: 8, shaded: 4 })).toEqual({ kind: 'cake', parts: 8, shaded: 4 });
    expect(sanitizeVisual({ kind: 'bar', parts: 10, shaded: 3 })).toEqual({ kind: 'bar', parts: 10, shaded: 3 });
    expect(sanitizeVisual({ kind: 'two-cakes', left: { parts: 4, shaded: 3 }, right: { parts: 8, shaded: 5 } })).toEqual({
      kind: 'two-cakes',
      left: { parts: 4, shaded: 3 },
      right: { parts: 8, shaded: 5 },
    });
  });

  it('keeps shading within the cake', () => {
    expect(sanitizeVisual({ kind: 'cake', parts: 6, shaded: 9 })).toEqual({ kind: 'cake', parts: 6, shaded: 6 });
    expect(sanitizeVisual({ kind: 'cake', parts: 6, shaded: -2 })).toEqual({ kind: 'cake', parts: 6, shaded: 0 });
  });

  it('drops pictures that would crash the scene', () => {
    for (const bad of [
      null,
      'cake',
      { kind: 'pie', parts: 4, shaded: 1 },
      { kind: 'cake', parts: 0, shaded: 0 },
      { kind: 'cake', parts: 500, shaded: 1 },
      { kind: 'cake', parts: 'eight', shaded: 1 },
      { kind: 'two-cakes', left: { parts: 4, shaded: 1 } },
    ]) {
      expect(sanitizeVisual(bad)).toBeUndefined();
    }
  });

  it('rounds fractional counts', () => {
    expect(sanitizeVisual({ kind: 'bar', parts: 7.6, shaded: 2.2 })).toEqual({ kind: 'bar', parts: 8, shaded: 2 });
  });
});

describe('hideServeAnswer', () => {
  it('shows a serve-the-cake question with no slices shaded', () => {
    expect(hideServeAnswer({ kind: 'cake', parts: 6, shaded: 4 }, 'serve')).toEqual({ kind: 'cake', parts: 6, shaded: 0 });
  });

  it('leaves ordinary questions as they are', () => {
    const v = { kind: 'cake' as const, parts: 8, shaded: 4 };
    expect(hideServeAnswer(v, 'mcq')).toBe(v);
    expect(hideServeAnswer(undefined, 'serve')).toBeUndefined();
  });
});

describe('motion', () => {
  it('smooths the same amount per second at any frame rate', () => {
    const at30 = damp(0, 10, 5, 1 / 30);
    const at60 = damp(damp(0, 10, 5, 1 / 60), 10, 5, 1 / 60);
    expect(at60).toBeCloseTo(at30, 10);
  });

  it('turns the short way round', () => {
    // From just under +π to just over -π is a small step through π, not most of a circle.
    const next = turnToward(3.0, -3.0, 1);
    const diff = Math.atan2(Math.sin(next - -3.0), Math.cos(next - -3.0));
    expect(Math.abs(diff)).toBeLessThan(1e-9);
    const half = turnToward(3.0, -3.0, 0.5);
    expect(Math.abs(half - 3.0)).toBeLessThan(0.2);
  });
});

describe('answerComparison', () => {
  it('pictures the kid’s answer next to the question’s fraction', () => {
    expect(answerComparison('Simplify the fraction 4/8 to its simplest form.', '1/8')).toEqual({
      kid: { parts: 8, shaded: 1 },
      target: { parts: 8, shaded: 4 },
      targetLabel: '4/8',
    });
  });

  it('draws the same fraction it names, even on two-cake questions', () => {
    const visual = { kind: 'two-cakes' as const, left: { parts: 4, shaded: 3 }, right: { parts: 8, shaded: 5 } };
    const c = answerComparison('Which is larger: 3/4 or 5/8?', '5/8', visual);
    expect(c?.targetLabel).toBe('3/4');
    expect(c?.target).toEqual({ parts: 4, shaded: 3 });
  });

  it('uses the serve target for serve-the-cake questions', () => {
    const c = answerComparison('Serve 2/3 of the cake.', '4/6 slices', undefined, { targetNumerator: 2, targetDenominator: 3, totalSlices: 6 });
    expect(c).toEqual({ kid: { parts: 6, shaded: 4 }, target: { parts: 6, shaded: 4 }, targetLabel: '2/3' });
  });

  it('shows nothing when the answer is a sentence rather than a number it can draw', () => {
    expect(answerComparison('Simplify 4/8.', 'It becomes a smaller quantity than 4/8')).toBeNull();
    expect(answerComparison('Why does 4/8 equal 1/2?', 'Because it is smaller')).toBeNull();
    expect(answerComparison('Simplify 30/100.', '3/10')).toBeNull();
  });
});
