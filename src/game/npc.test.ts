import { describe, expect, it } from 'vitest';
import { besideTree } from './npc';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('besideTree', () => {
  const tree = { x: 0, z: 0 };
  const kid = { x: 0, z: 1.9 };

  it('stands beside the tree, a little toward the kid, clear of them', () => {
    const spot = besideTree(tree, kid, []);
    expect(dist(spot, tree)).toBeGreaterThan(1.5);
    expect(dist(spot, tree)).toBeLessThan(3);
    expect(dist(spot, kid)).toBeGreaterThan(1.2);
  });

  it('picks the side with room when another tree is in the way', () => {
    const left = besideTree(tree, kid, []);
    const mirrored = { x: -left.x, z: left.z };
    const spot = besideTree(tree, kid, [left]);
    expect(dist(spot, left)).toBeGreaterThan(1.5);
    expect(spot.x).toBeCloseTo(mirrored.x, 5);
  });

  it('is the same spot every time', () => {
    expect(besideTree(tree, kid, [])).toEqual(besideTree(tree, kid, []));
  });
});
