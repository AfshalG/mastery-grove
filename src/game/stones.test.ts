import { describe, expect, it } from 'vitest';
import { STONES, startStones, stepStones, stoneSpots } from './stones';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('stoneSpots', () => {
  const tree = { x: 0, z: 0 };
  const stand = { x: 0, z: 1.9 };

  it('lays out one stone per choice, between the kid and the tree, clear of the kid', () => {
    const spots = stoneSpots(tree, stand, 4, []);

    expect(spots).toHaveLength(4);
    spots.forEach((s, i) => {
      spots.slice(i + 1).forEach((o) => expect(dist(s, o)).toBeGreaterThan(2));
      expect(dist(s, tree)).toBeGreaterThan(STONES.TREE_CLEARANCE);
      expect(dist(s, stand)).toBeGreaterThan(STONES.STAND_RADIUS); // nobody starts on a stone
      expect(s.z).toBeGreaterThan(tree.z); // on the kid's side of the tree
    });
  });

  it('reads A to D from left to right on screen, whichever side the kid came from', () => {
    // The camera always looks toward -z, so screen left is world -x.
    for (const kid of [{ x: 0, z: 1.9 }, { x: 0, z: -1.9 }, { x: 1.3, z: 1.3 }]) {
      const spots = stoneSpots(tree, kid, 4, []);
      spots.slice(1).forEach((s, i) => expect(s.x).toBeGreaterThan(spots[i].x));
    }
  });

  it('puts A nearest the camera when the row runs away from it', () => {
    const spots = stoneSpots(tree, { x: 1.9, z: 0 }, 4, []);
    spots.slice(1).forEach((s, i) => expect(s.z).toBeLessThan(spots[i].z));
  });

  it('moves a stone back when it would land on another tree', () => {
    const blocker = stoneSpots(tree, stand, 4, [])[0];
    const spots = stoneSpots(tree, stand, 4, [blocker]);

    for (const s of spots) expect(dist(s, blocker)).toBeGreaterThanOrEqual(STONES.TREE_CLEARANCE);
  });
});

describe('stepStones', () => {
  const stones = [
    { x: -2, z: 3 },
    { x: 2, z: 3 },
  ];
  const off = { x: 0, z: 0 };
  const onFirst = stones[0];
  const run = (state: ReturnType<typeof startStones>, kid: { x: number; z: number }, seconds: number, canFire = true) => {
    for (let t = 0; t < seconds; t += 0.05) state = stepStones(state, stones, kid, 0.05, canFire);
    return state;
  };

  it('answers after standing on a stone long enough, once', () => {
    let s = run(startStones(2), off, 0.1); // step clear first
    s = run(s, onFirst, STONES.FILL_SECONDS + 0.1);

    expect(s.fired).toBe(0);
    expect(run(s, stones[1], 2).fired).toBe(0); // nothing else fires afterwards
  });

  it('never fires for a kid who was already standing on a stone when it rose', () => {
    const s = run(startStones(2), onFirst, 3);

    expect(s.fired).toBeNull();
    expect(s.fills[0]).toBe(0);
  });

  it('drains when the kid steps off before it fills', () => {
    let s = run(startStones(2), off, 0.1);
    s = run(s, onFirst, STONES.FILL_SECONDS / 2);
    const half = s.fills[0];
    s = run(s, off, 1);

    expect(half).toBeGreaterThan(0);
    expect(s.fills[0]).toBe(0);
    expect(s.fired).toBeNull();
  });

  it('does nothing until the kid has said how sure they are', () => {
    let s = run(startStones(2), off, 0.1, false);
    s = run(s, onFirst, 2, false);

    expect(s.fired).toBeNull();
    expect(s.waitingForConfidence).toBe(true);
  });

  it('arms while the stones are still rising, so a quick kid is not locked out', () => {
    let s = stepStones(startStones(2), stones, off, 0.05, true, true); // rising, kid clear
    for (let t = 0; t < STONES.FILL_SECONDS + 0.1; t += 0.05) s = stepStones(s, stones, onFirst, 0.05, true);

    expect(s.fired).toBe(0);
  });

  it('never fills while the stones are still rising', () => {
    let s = stepStones(startStones(2), stones, off, 0.05, true, true);
    for (let t = 0; t < 2; t += 0.05) s = stepStones(s, stones, onFirst, 0.05, true, true);

    expect(s.fills[0]).toBe(0);
    expect(s.fired).toBeNull();
  });
});
