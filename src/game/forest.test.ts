import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import type { TreeData } from '../types/game';
import { buildForest, plantExtraTrees } from './forest';
import { LAYOUT, angleAround } from './layout';

const at = (t: TreeData) => ({ x: t.position![0], z: t.position![2] });
const gap = (a: TreeData, b: TreeData) => Math.hypot(a.position![0] - b.position![0], a.position![2] - b.position![2]);

function minGap(trees: TreeData[]) {
  let min = Infinity;
  trees.forEach((a, i) => trees.slice(i + 1).forEach((b) => (min = Math.min(min, gap(a, b)))));
  return min;
}

const base = SAMPLE_WORLD.trees;
const tree = (overrides: Partial<TreeData>): TreeData => ({ ...base[0], ...overrides });

describe('buildForest', () => {
  it('places every sample tree in its own grove, all well apart', () => {
    const { layout, trees } = buildForest(SAMPLE_WORLD, base);

    expect(trees).toHaveLength(base.length);
    for (const t of trees) {
      expect(t.groveIndex).toBe(SAMPLE_WORLD.concepts.findIndex((c) => c.id === t.conceptId));
      expect(t.state).toBeTruthy();
    }
    expect(minGap(trees)).toBeGreaterThanOrEqual(LAYOUT.TREE_GAP);
    expect(layout.groves).toHaveLength(SAMPLE_WORLD.concepts.length);
  });

  it('ignores positions from an old save and lays the forest out afresh', () => {
    const fresh = buildForest(SAMPLE_WORLD, base).trees;
    const stale = base.map((t) => ({ ...t, position: [0, 0, 0] as [number, number, number] }));

    expect(buildForest(SAMPLE_WORLD, stale).trees.map((t) => t.position)).toEqual(fresh.map((t) => t.position));
  });

  it('puts saplings, made-for-you, teacher and memory trees on free spots, saplings beside their parent', () => {
    const parent = base[1];
    const extras: TreeData[] = [
      tree({ id: 'sap', conceptId: parent.conceptId, isSapling: true, sourceTreeId: parent.id, state: 'sapling' }),
      tree({ id: 'made', conceptId: parent.conceptId, isTargeted: true, nearTreeId: parent.id }),
      tree({ id: 'teach', conceptId: parent.conceptId, isTeacherDeployed: true }),
      tree({ id: 'mem', conceptId: parent.conceptId, isMemorySprout: true }),
    ];

    const { layout, trees } = buildForest(SAMPLE_WORLD, [...base, ...extras]);
    const byId = Object.fromEntries(trees.map((t) => [t.id, t]));

    expect(trees).toHaveLength(base.length + extras.length);
    expect(minGap(trees)).toBeGreaterThanOrEqual(LAYOUT.TREE_GAP);
    expect(gap(byId.sap, byId[parent.id])).toBeLessThan(LAYOUT.RING_STEP + LAYOUT.RING_SLOT);
    // The memory tree waits near the entrance, where the kid walks in.
    const grove = layout.groves[byId.mem.groveIndex!];
    const fromEntrance = Math.abs(Math.atan2(Math.sin(angleAround(grove, at(byId.mem)) - grove.entranceAngle), Math.cos(angleAround(grove, at(byId.mem)) - grove.entranceAngle)));
    expect(fromEntrance).toBeLessThan(Math.PI / 2);
  });

  it('drops trees for concepts the world does not have', () => {
    const { trees } = buildForest(SAMPLE_WORLD, [...base, tree({ id: 'stray', conceptId: 'nope' })]);

    expect(trees.find((t) => t.id === 'stray')).toBeUndefined();
  });
});

describe('plantExtraTrees', () => {
  const { layout, trees: standing } = buildForest(SAMPLE_WORLD, base);

  it('keeps a batch of new trees apart from each other and from what already stands', () => {
    const batch = [1, 2, 3].map((i) => tree({ id: `teacher_${i}`, conceptId: 'c2', isTeacherDeployed: true }));

    const planted = plantExtraTrees(layout, standing, batch);

    expect(planted.map((t) => t.id)).toEqual(['teacher_1', 'teacher_2', 'teacher_3']);
    expect(minGap([...standing, ...planted])).toBeGreaterThanOrEqual(LAYOUT.TREE_GAP);
  });

  it('never stacks a second batch on the first (the hackathon build did)', () => {
    const first = plantExtraTrees(layout, standing, [tree({ id: 'a', conceptId: 'c1', isTargeted: true })]);
    const second = plantExtraTrees(layout, [...standing, ...first], [tree({ id: 'b', conceptId: 'c1', isTargeted: true })]);

    expect(gap(first[0], second[0])).toBeGreaterThanOrEqual(LAYOUT.TREE_GAP);
  });

  it('leaves trees as they are when there is no forest yet', () => {
    const t = tree({ id: 'x' });
    expect(plantExtraTrees(null, [], [t])).toEqual([t]);
  });
});
