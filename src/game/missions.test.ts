import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import type { TeachBackRecord, TreeData } from '../types/game';
import { planForest } from './layout';
import { bridgeProgress, bridgeTreesToGo, openBridges, planMissions } from './missions';
import { unlockedConcepts } from './progress';

const world = SAMPLE_WORLD;
const layout = planForest(world.concepts.map((c) => ({ id: c.id, trees: world.trees.filter((t) => t.conceptId === c.id).length })));
const grow = (ids: string[], trees: TreeData[] = world.trees) => trees.map((t) => (ids.includes(t.id) ? { ...t, state: 'healthy' as const } : t));
const helped = (conceptId: string): TeachBackRecord => ({ conceptId, passed: true, hit: [], missing: [], words: '', spoken: false, session: 1, at: 0 });
const plan = (trees: TreeData[], extra: { teachBacks?: TeachBackRecord[]; visited?: string[]; pick?: string | null } = {}) =>
  planMissions({
    world,
    layout,
    trees,
    unlocked: unlockedConcepts(world, trees),
    teachSpots: world.teachSpots ?? [],
    teachBacks: extra.teachBacks ?? [],
    visited: extra.visited ?? [],
    pickTreeId: extra.pick ?? null,
  })!;

describe('bridges', () => {
  it('build plank by plank as the grove before them grows, and open when the next grove does', () => {
    const none = world.trees;
    expect(openBridges(layout, unlockedConcepts(world, none))).toEqual([false, false]);
    expect(bridgeProgress(world, layout, none, unlockedConcepts(world, none), 0)).toBe(0);
    expect(bridgeTreesToGo(world, layout, none, unlockedConcepts(world, none), 0)).toBe(3);

    const two = grow(['t1_1', 't1_2']);
    expect(bridgeProgress(world, layout, two, unlockedConcepts(world, two), 0)).toBeCloseTo(2 / 3, 5);
    expect(bridgeTreesToGo(world, layout, two, unlockedConcepts(world, two), 0)).toBe(1);

    const three = grow(['t1_1', 't1_2', 't1_3']);
    expect(openBridges(layout, unlockedConcepts(world, three))).toEqual([true, false]);
    expect(bridgeProgress(world, layout, three, unlockedConcepts(world, three), 0)).toBe(1);
    expect(bridgeTreesToGo(world, layout, three, unlockedConcepts(world, three), 0)).toBe(0);
  });

  it('the second bridge waits on both groves the third one needs', () => {
    const trees = grow(['t1_1', 't1_2', 't1_3', 't2_1']);
    const unlocked = unlockedConcepts(world, trees);
    expect(bridgeTreesToGo(world, layout, trees, unlocked, 1)).toBe(2);
    expect(bridgeProgress(world, layout, trees, unlocked, 1)).toBeCloseTo(1 / 3, 5);
  });
});

describe('planMissions', () => {
  it('starts in the first grove: grow 3 trees, pointing at Byte’s pick', () => {
    const p = plan(world.trees, { pick: 't1_2' });
    expect(p.conceptId).toBe('c1');
    expect(p.missions.map((m) => [m.kind, m.done])).toEqual([
      ['grow', false],
      ['mia', false],
      ['cross', false],
      ['finish', false],
    ]);
    expect(p.missions[0]).toMatchObject({ label: 'Grow 3 trees to build the bridge', progress: { value: 0, of: 3 } });
    expect(p.next?.objective).toEqual({ kind: 'tree', treeId: 't1_2' });
  });

  it('falls back to the first open tree in the grove when Byte’s pick is somewhere else', () => {
    expect(plan(world.trees, { pick: 't2_1' }).next?.objective).toEqual({ kind: 'tree', treeId: 't1_1' });
  });

  it('sends the kid to Mia once the bridge is built, then over the bridge', () => {
    const trees = grow(['t1_1', 't1_2', 't1_3']);
    const toMia = plan(trees);
    expect(toMia.missions[0]).toMatchObject({ kind: 'grow', done: true });
    expect(toMia.next?.objective).toEqual({ kind: 'mia', conceptId: 'c1' });

    const toCross = plan(trees, { teachBacks: [helped('c1')] });
    expect(toCross.next).toMatchObject({ kind: 'cross', label: 'Cross the bridge to The Fraction Bridge' });
    expect(toCross.next?.objective).toEqual({ kind: 'enter', groveIndex: 1 });
  });

  it('moves on to the next grove once the kid has crossed', () => {
    const trees = grow(['t1_1', 't1_2', 't1_3']);
    const p = plan(trees, { teachBacks: [helped('c1')], visited: ['c2'] });
    expect(p.conceptId).toBe('c2');
    expect(p.missions[0]).toMatchObject({ kind: 'grow', progress: { value: 0, of: 3 } });
  });

  it('keeps a built bridge built when a tree wilts after the next grove opened', () => {
    const wilted = grow(['t1_2', 't1_3']).map((t) => (t.id === 't1_1' ? { ...t, state: 'withered' as const } : t));
    const p = planMissions({
      world,
      layout,
      trees: wilted,
      unlocked: ['c1', 'c2'], // c2 opened earlier and stays open
      teachSpots: world.teachSpots ?? [],
      teachBacks: [],
      visited: [],
      pickTreeId: null,
    })!;
    expect(p.missions.find((m) => m.kind === 'grow')).toMatchObject({ done: true, progress: { value: 3, of: 3 } });
    expect(openBridges(layout, ['c1', 'c2'])).toEqual([true, false]);
  });

  it('puts a memory check first, wherever it is', () => {
    const trees = grow(['t1_1', 't1_2', 't1_3']).map((t) => (t.id === 't1_1' ? { ...t, memoryDue: true } : t));
    const p = plan(trees);
    expect(p.missions[0]).toMatchObject({ kind: 'memory', label: 'Remember 1 tree from last time' });
    expect(p.next?.objective).toEqual({ kind: 'tree', treeId: 't1_1' });
  });

  it('in the last grove there is no bridge to build, and a finished forest has nothing left to point at', () => {
    const all = world.trees.map((t) => ({ ...t, state: 'healthy' as const }));
    const p = plan(all, { teachBacks: [helped('c1'), helped('c2'), helped('c3')], visited: ['c2', 'c3'] });
    expect(p.conceptId).toBe('c3');
    expect(p.missions.find((m) => m.kind === 'grow')?.label).toBe('Grow 3 trees');
    expect(p.missions.some((m) => m.kind === 'cross')).toBe(false);
    expect(p.missions.every((m) => m.done)).toBe(true);
    expect(p.next).toBeNull();
  });
});
