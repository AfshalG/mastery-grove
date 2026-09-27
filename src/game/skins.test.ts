import { describe, expect, it } from 'vitest';
import { AUTUMN, MEADOW, idHash, skinFor } from './skins';

describe('skinFor', () => {
  it('gives reading and language worlds the autumn wood', () => {
    for (const s of ['Primary 4 English: Reading comprehension', 'Poetry for Year 5', 'Grammar basics']) {
      expect(skinFor(s)).toBe(AUTUMN);
    }
  });

  it('gives maths and everything else the spring meadow', () => {
    for (const s of ['Primary 5 Mathematics — Fractions', 'Ecosystems', '', undefined]) {
      expect(skinFor(s)).toBe(MEADOW);
    }
  });
});

describe('idHash', () => {
  it('is stable and spreads neighbouring ids apart', () => {
    expect(idHash('t1_1')).toBe(idHash('t1_1'));
    const shades = new Set(['t1_1', 't1_2', 't1_3', 't1_4', 't1_5', 't1_6'].map((id) => idHash(id) % 3));
    expect(shades.size).toBeGreaterThan(1);
  });
});
