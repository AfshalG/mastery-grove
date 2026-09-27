import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import {
  LAYOUT,
  approachPoint,
  distanceToTrail,
  findTreeSpot,
  nearestGroveIndex,
  placeBaseTrees,
  planForest,
  scatterDecorations,
  signBoard,
  type ForestLayout,
  type Vec2,
} from './layout';

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

function distToSegment(p: Vec2, [a, b]: [Vec2, Vec2]) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return dist(p, { x: a.x + t * dx, z: a.z + t * dz });
}

/** n concepts in a prerequisite chain, m trees each. */
function makeWorld(n: number, m: number) {
  const concepts = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, trees: m }));
  const trees = concepts.flatMap((c) => Array.from({ length: m }, (_, k) => ({ id: `${c.id}_t${k}`, conceptId: c.id })));
  return { concepts, trees };
}

function inBounds(layout: ForestLayout, p: Vec2) {
  const b = layout.bounds;
  return p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
}

/** Checks every placement rule for a set of tree positions. Returns the broken rules, empty if all hold. */
function brokenRules(layout: ForestLayout, positions: Vec2[]) {
  const broken: string[] = [];
  positions.forEach((p, i) => {
    positions.slice(i + 1).forEach((q) => {
      if (dist(p, q) < LAYOUT.TREE_GAP - 1e-6) broken.push(`trees ${dist(p, q).toFixed(2)} apart`);
    });
    layout.groves.forEach((g) => {
      if (distToSegment(p, signBoard(g)) < LAYOUT.SIGN_GAP - 1e-6) broken.push(`tree too close to sign ${g.index}`);
    });
    if (distanceToTrail(layout, p) < LAYOUT.TRAIL_GAP - 1e-6) broken.push(`tree ${distanceToTrail(layout, p).toFixed(2)} from trail`);
    if (!inBounds(layout, p)) broken.push('tree out of bounds');
  });
  return broken;
}

const SIZES: Array<[groves: number, trees: number]> = [
  [1, 1], [1, 5], [2, 3], [3, 5], [4, 4], [5, 8], [6, 12], [8, 5], [12, 15],
];

describe('planForest + placeBaseTrees', () => {
  it.each(SIZES)('%i groves of %i trees keep every placement rule', (n, m) => {
    const { concepts, trees } = makeWorld(n, m);
    const layout = planForest(concepts);
    const positions = Object.values(placeBaseTrees(layout, trees));

    expect(positions).toHaveLength(n * m);
    expect(brokenRules(layout, positions)).toEqual([]);
  });

  it.each(SIZES)('%i groves of %i trees: groves stay apart and signs sit beside the trail', (n) => {
    const layout = planForest(makeWorld(n, 5).concepts);

    layout.groves.forEach((a, i) =>
      layout.groves.slice(i + 1).forEach((b) => {
        expect(dist(a.centre, b.centre)).toBeGreaterThanOrEqual(a.clearingRadius + b.clearingRadius);
      })
    );
    for (const g of layout.groves) {
      const [end1, end2] = signBoard(g);
      // Readable from the trail, but never hanging over it.
      expect(distanceToTrail(layout, g.sign)).toBeLessThan(5);
      expect(distanceToTrail(layout, end1)).toBeGreaterThan(LAYOUT.TRAIL_HALF_WIDTH + 0.3);
      expect(distanceToTrail(layout, end2)).toBeGreaterThan(LAYOUT.TRAIL_HALF_WIDTH + 0.3);
      // The board's front faces the trail.
      const facing = { x: Math.sin(g.signRotationY), z: Math.cos(g.signRotationY) };
      expect(facing.x * -g.side).toBeGreaterThan(0);
      expect(inBounds(layout, g.sign)).toBe(true);
    }
  });

  it('starts the player on the trail, outside every grove', () => {
    const layout = planForest(makeWorld(3, 5).concepts);

    expect(distanceToTrail(layout, layout.spawn)).toBeLessThan(LAYOUT.TRAIL_HALF_WIDTH);
    for (const g of layout.groves) expect(dist(layout.spawn, g.centre)).toBeGreaterThan(g.clearingRadius);
  });

  it('gives the same forest every time', () => {
    const { concepts, trees } = makeWorld(4, 6);
    const a = planForest(concepts);
    const b = planForest(concepts);

    expect(b).toEqual(a);
    expect(placeBaseTrees(b, trees)).toEqual(placeBaseTrees(a, trees));
  });

  it('keeps every sample-world tree clear of the signs (the hackathon build put one through each sign)', () => {
    const layout = planForest(SAMPLE_WORLD.concepts.map((c) => ({ id: c.id, trees: 5 })));
    const placed = placeBaseTrees(layout, SAMPLE_WORLD.trees);

    expect(Object.keys(placed)).toHaveLength(SAMPLE_WORLD.trees.length);
    expect(brokenRules(layout, Object.values(placed))).toEqual([]);
    // Every tree stands in its own concept's grove.
    for (const t of SAMPLE_WORLD.trees) {
      const home = layout.groves.findIndex((g) => g.conceptId === t.conceptId);
      expect(nearestGroveIndex(layout, placed[t.id])).toBe(home);
    }
  });
});

describe('findTreeSpot', () => {
  const { concepts, trees } = makeWorld(3, 5);
  const layout = planForest(concepts);
  const base = placeBaseTrees(layout, trees);

  it('fits 24 extra trees into one grove without breaking a rule', () => {
    const occupied = Object.values(base);
    for (let i = 0; i < 24; i++) occupied.push(findTreeSpot(layout, 0, occupied));

    expect(brokenRules(layout, occupied)).toEqual([]);
    for (const p of occupied.slice(-24)) expect(nearestGroveIndex(layout, p)).toBe(0);
  });

  it('never lands two trees on the same spot when asked twice in a row', () => {
    const occupied = Object.values(base);
    const first = findTreeSpot(layout, 1, occupied);
    const second = findTreeSpot(layout, 1, [...occupied, first]);

    expect(dist(first, second)).toBeGreaterThanOrEqual(LAYOUT.TREE_GAP);
  });

  it('plants next to the tree it came from when there is room', () => {
    const parent = base['c1_t2'];
    const g = layout.groves[1];
    const parentAngle = Math.atan2(parent.z - g.centre.z, parent.x - g.centre.x);

    const spot = findTreeSpot(layout, 1, Object.values(base), parentAngle);

    expect(dist(spot, parent)).toBeLessThan(LAYOUT.RING_STEP + LAYOUT.RING_SLOT);
  });

  it('is deterministic', () => {
    const occupied = Object.values(base);
    expect(findTreeSpot(layout, 2, occupied, 1)).toEqual(findTreeSpot(layout, 2, occupied, 1));
  });
});

describe('approachPoint', () => {
  it('stands the player just inside the clearing, clear of other trees', () => {
    const { concepts, trees } = makeWorld(3, 5);
    const layout = planForest(concepts);
    const placed = placeBaseTrees(layout, trees);
    const all = Object.values(placed);

    for (const p of all) {
      const stand = approachPoint(layout, p);
      expect(dist(stand, p)).toBeCloseTo(LAYOUT.APPROACH_DISTANCE, 5);
      for (const other of all) if (other !== p) expect(dist(stand, other)).toBeGreaterThan(1.2);
    }
  });
});

describe('scatterDecorations', () => {
  const { concepts, trees } = makeWorld(3, 5);
  const layout = planForest(concepts);
  const treeSpots = Object.values(placeBaseTrees(layout, trees));
  const items = scatterDecorations(layout, treeSpots);

  it('dresses the forest without covering the trail, trees, signs or clearings', () => {
    expect(items.length).toBeGreaterThan(40);
    for (const d of items) {
      const p = { x: d.x, z: d.z };
      expect(distanceToTrail(layout, p)).toBeGreaterThan(LAYOUT.TRAIL_HALF_WIDTH + 0.3);
      for (const t of treeSpots) expect(dist(p, t)).toBeGreaterThan(1.5);
      for (const g of layout.groves) {
        expect(distToSegment(p, signBoard(g))).toBeGreaterThan(0.9);
        expect(dist(p, g.centre)).toBeGreaterThan(g.clearingRadius);
      }
      expect(inBounds(layout, p)).toBe(true);
    }
  });

  it('gives the same scenery every time', () => {
    expect(scatterDecorations(layout, treeSpots)).toEqual(items);
  });
});
