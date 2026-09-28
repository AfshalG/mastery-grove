// Connects the world's trees to the layout: every tree gets a spot, and trees added during play get free ones.
import type { TreeData, WorldData } from '../types/game';
import { angleAround, findTreeSpot, placeBaseTrees, planForest, type ForestLayout, type Vec2 } from './layout';

/** Trees the learner loop adds during play, as opposed to the worksheet's own questions. They go on the outer rings. */
export const isExtraTree = (t: TreeData) => !!(t.isSapling || t.isTargeted || t.isTeacherDeployed || t.isMemorySprout);

const toTuple = (p: Vec2): [number, number, number] => [p.x, 0, p.z];
const toVec = (t: TreeData): Vec2 | null => (t.position ? { x: t.position[0], z: t.position[2] } : null);

/** Memory trees stand just inside the entrance, so the kid meets them on the way in. */
const MEMORY_TREE_TURN = Math.PI / 3;

/** Where around its grove a new extra tree should stand: next to the tree it came from, if there is one. */
function preferredAngle(layout: ForestLayout, groveIndex: number, tree: TreeData, standing: TreeData[]) {
  const grove = layout.groves[groveIndex];
  const nearId = tree.nearTreeId ?? tree.sourceTreeId;
  const near = nearId ? standing.find((t) => t.id === nearId) : undefined;
  const nearPos = near ? toVec(near) : null;
  if (nearPos) return angleAround(grove, nearPos);
  if (tree.isMemorySprout) return grove.entranceAngle + MEMORY_TREE_TURN;
  return undefined;
}

/**
 * Plans the forest for a world and gives every tree its spot. Positions are always recomputed here, never
 * taken from a save, so saves made under an older layout come out tidy too. Trees for concepts the world
 * doesn't have are dropped.
 */
export function buildForest(world: WorldData, trees: TreeData[]): { layout: ForestLayout; trees: TreeData[] } {
  const layout = planForest(
    world.concepts.map((c) => ({ id: c.id, trees: trees.filter((t) => t.conceptId === c.id && !isExtraTree(t)).length }))
  );
  const groveOf = new Map(layout.groves.map((g) => [g.conceptId, g.index]));
  const base = placeBaseTrees(layout, trees.filter((t) => !isExtraTree(t) && groveOf.has(t.conceptId)));

  // The worksheet's trees first, so extras can find the tree they belong next to.
  const placed: TreeData[] = trees
    .filter((t) => base[t.id])
    .map((t) => ({ ...t, position: toTuple(base[t.id]), groveIndex: groveOf.get(t.conceptId)!, state: t.state || 'unanswered' }));

  const extras = trees.filter((t) => !base[t.id] && groveOf.has(t.conceptId));
  return { layout, trees: [...placed, ...plantExtraTrees(layout, placed, extras)] };
}

/**
 * Free spots for trees added during play, next to what already stands. Call it with the latest trees
 * (inside a store update), so two batches arriving close together can't land on the same spot.
 */
export function plantExtraTrees(layout: ForestLayout | null, standing: TreeData[], newTrees: TreeData[]): TreeData[] {
  if (!layout) return newTrees;
  const occupied = standing.map(toVec).filter((p): p is Vec2 => p !== null);
  const all = [...standing];

  return newTrees.map((t) => {
    const groveIndex = layout.groves.find((g) => g.conceptId === t.conceptId)?.index ?? t.groveIndex ?? 0;
    const spot = findTreeSpot(layout, groveIndex, occupied, preferredAngle(layout, groveIndex, t, all));
    occupied.push(spot);
    const planted: TreeData = { ...t, position: toTuple(spot), groveIndex, state: t.state || 'unanswered' };
    all.push(planted);
    return planted;
  });
}
