// Bridges and missions: what each grove asks of the kid, and where Byte's beam points next. Plain rules, so the
// mission panel, the beam and the bridges' planks always agree.
import type { TeachBackRecord, TeachSpot, TreeData, WorldData } from '../types/game';
import type { ForestLayout } from './layout';
import { isExtraTree } from './forest';
import { UNLOCK_HEALTH, canOpenTree } from './progress';
import { miaStatus } from './teach';

const isGrown = (t: TreeData) => t.state === 'healthy' || t.state === 'regrown';
const ownTrees = (trees: TreeData[], conceptId: string) => trees.filter((t) => t.conceptId === conceptId && !isExtraTree(t));
/** Grown trees a grove needs before the next one opens (60%, rounded up). */
export const treesNeeded = (count: number) => Math.ceil(count * UNLOCK_HEALTH - 1e-9);

/** A bridge is open once the grove past it, or any grove further along the trail, is unlocked. */
export function openBridges(layout: ForestLayout, unlocked: string[]): boolean[] {
  return layout.streams.map((s) => layout.groves.slice(s.beforeGrove).some((g) => unlocked.includes(g.conceptId)));
}

/** The groves (with trees of their own) whose growth builds a bridge: the prerequisites of the grove past it. */
function builders(world: WorldData, layout: ForestLayout, trees: TreeData[], streamIndex: number) {
  const stream = layout.streams[streamIndex];
  const concept = stream && world.concepts.find((c) => c.id === layout.groves[stream.beforeGrove]?.conceptId);
  return (concept?.prerequisites ?? []).filter((p) => ownTrees(trees, p).length > 0);
}

/** How built a bridge is, 0 to 1: each builder grove counts up to its 60%, and the least-grown one sets the pace. */
export function bridgeProgress(world: WorldData, layout: ForestLayout, trees: TreeData[], unlocked: string[], streamIndex: number) {
  if (openBridges(layout, unlocked)[streamIndex]) return 1;
  const from = builders(world, layout, trees, streamIndex);
  if (from.length === 0) return 1;
  return Math.min(
    ...from.map((p) => {
      const own = ownTrees(trees, p);
      return Math.min(1, own.filter(isGrown).length / treesNeeded(own.length));
    })
  );
}

/** Trees still to grow, across its builder groves, before a bridge is finished. */
export function bridgeTreesToGo(world: WorldData, layout: ForestLayout, trees: TreeData[], unlocked: string[], streamIndex: number) {
  if (openBridges(layout, unlocked)[streamIndex]) return 0;
  return builders(world, layout, trees, streamIndex).reduce((sum, p) => {
    const own = ownTrees(trees, p);
    return sum + Math.max(0, treesNeeded(own.length) - own.filter(isGrown).length);
  }, 0);
}

/** Where the beam points: a tree, Mia, or the way into the next grove (over its bridge). */
export type Objective = { kind: 'tree'; treeId: string } | { kind: 'mia'; conceptId: string } | { kind: 'enter'; groveIndex: number };

export interface Mission {
  id: string;
  kind: 'memory' | 'grow' | 'mia' | 'cross' | 'finish';
  label: string;
  done: boolean;
  /** Shown as "2 of 3". */
  progress?: { value: number; of: number };
  /** Where to go for it right now, if anywhere. */
  objective: Objective | null;
  /** Not needed to move on: the rest of the grove's trees. */
  optional?: boolean;
}

export interface MissionPlan {
  groveIndex: number;
  conceptId: string;
  questName: string;
  missions: Mission[];
  /** The first mission still to do that has somewhere to go: where Byte's beam points. */
  next: Mission | null;
}

interface PlanInput {
  world: WorldData;
  layout: ForestLayout;
  trees: TreeData[];
  unlocked: string[];
  teachSpots: TeachSpot[];
  teachBacks: TeachBackRecord[];
  /** Groves the kid has walked into. */
  visited: string[];
  /** Byte's pick from the planner, used for the grow mission when it's in this grove. */
  pickTreeId: string | null;
}

/**
 * The grove the kid is working on and its missions. A grove is done when enough trees are grown to build the
 * bridge, Mia (if she's there) has been helped, and the kid has crossed into the next grove. The kid works on the
 * first open grove along the trail that isn't done; when every open grove is done, the last one.
 */
export function planMissions({ world, layout, trees, unlocked, teachSpots, teachBacks, visited, pickTreeId }: PlanInput): MissionPlan | null {
  const groves = layout.groves;
  if (groves.length === 0) return null;
  const hasMia = (conceptId: string) => teachSpots.some((t) => t.conceptId === conceptId);

  const isDone = (i: number) => {
    const g = groves[i];
    const own = ownTrees(trees, g.conceptId);
    const next = groves[i + 1];
    // A built bridge stays built: once the next grove is open, a tree wilting here doesn't undo the grow mission.
    const grown = own.filter(isGrown).length >= treesNeeded(own.length) || (!!next && unlocked.includes(next.conceptId));
    const mia = !hasMia(g.conceptId) || miaStatus(trees, g.conceptId, unlocked, teachBacks).kind === 'helped';
    // A next grove that's still locked (it needs another grove too) can't be crossed into yet, so it doesn't hold this one up.
    const crossed = !next || visited.includes(next.conceptId) || !unlocked.includes(next.conceptId);
    return grown && mia && crossed;
  };

  const open = groves.filter((g) => unlocked.includes(g.conceptId)).map((g) => g.index);
  if (open.length === 0) return null;
  const groveIndex = open.find((i) => !isDone(i)) ?? open[open.length - 1];
  const grove = groves[groveIndex];
  const conceptId = grove.conceptId;
  const questName = world.concepts.find((c) => c.id === conceptId)?.questName ?? 'This grove';
  const next = groves[groveIndex + 1];
  const nextName = next ? world.concepts.find((c) => c.id === next.conceptId)?.questName ?? 'the next grove' : null;

  const own = ownTrees(trees, conceptId);
  const grown = own.filter(isGrown).length;
  const needed = treesNeeded(own.length);
  const openHere = trees.filter((t) => t.conceptId === conceptId && canOpenTree(t, unlocked).ok);
  const growTarget = openHere.find((t) => t.id === pickTreeId) ?? openHere[0] ?? null;

  const missions: Mission[] = [];

  // Memory checks come first, wherever they are: remembering is the point of coming back.
  const due = trees.filter((t) => t.memoryDue && canOpenTree(t, unlocked).ok);
  if (due.length > 0) {
    missions.push({
      id: 'memory',
      kind: 'memory',
      label: `Remember ${due.length} tree${due.length > 1 ? 's' : ''} from last time`,
      done: false,
      objective: { kind: 'tree', treeId: due[0].id },
    });
  }

  const built = grown >= needed || (!!next && unlocked.includes(next.conceptId));
  missions.push({
    id: `grow-${conceptId}`,
    kind: 'grow',
    label: next ? `Grow ${needed} trees to build the bridge` : `Grow ${needed} trees`,
    done: built,
    progress: { value: built ? needed : grown, of: needed },
    objective: !built && growTarget ? { kind: 'tree', treeId: growTarget.id } : null,
  });

  if (hasMia(conceptId)) {
    const status = miaStatus(trees, conceptId, unlocked, teachBacks);
    missions.push({
      id: `mia-${conceptId}`,
      kind: 'mia',
      label: 'Explain it to Mia',
      done: status.kind === 'helped',
      objective: status.kind === 'ready' ? { kind: 'mia', conceptId } : null,
    });
  }

  if (next) {
    missions.push({
      id: `cross-${next.conceptId}`,
      kind: 'cross',
      label: `Cross the bridge to ${nextName}`,
      done: visited.includes(next.conceptId),
      objective: unlocked.includes(next.conceptId) ? { kind: 'enter', groveIndex: next.index } : null,
    });
  }

  missions.push({
    id: `finish-${conceptId}`,
    kind: 'finish',
    label: `Grow all ${own.length} trees`,
    done: grown >= own.length,
    progress: { value: grown, of: own.length },
    objective: grown < own.length && growTarget ? { kind: 'tree', treeId: growTarget.id } : null,
    optional: true,
  });

  const todo = (m: Mission) => !m.done && m.objective !== null;
  const nextMission = missions.find((m) => todo(m) && !m.optional) ?? missions.find(todo) ?? null;
  return { groveIndex, conceptId, questName, missions, next: nextMission };
}
