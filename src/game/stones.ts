// Answer stones: a row of stones rises between the kid and the tree, one per choice. Standing on one for a
// moment answers with it. Pure rules, so they can be tested; the 3D component only draws them.
import type { Vec2 } from './layout';

export const STONES = {
  /** How close to a stone's centre counts as standing on it. */
  STAND_RADIUS: 1.0,
  /** Standing this long answers. */
  FILL_SECONDS: 0.6,
  /** Stepping off empties a stone this fast. */
  DRAIN_SECONDS: 0.4,
  /** Centre to centre, side by side. */
  GAP: 2.3,
  /** How far from the tree the row sits (the kid stands 1.9 from the tree, so the row is just behind them). */
  FROM_TREE: 3.2,
  /** Closest a stone may sit to any tree. */
  TREE_CLEARANCE: 1.6,
  /** The drawn stone's outer radius, rim included. */
  RADIUS: 1.16,
};

/**
 * Where the stones rise: a gently curved row behind the kid, facing the tree, moved back from any tree in the
 * way. They read A to D from left to right on screen (the camera always looks toward -z, so screen left is
 * world -x); if the row runs away from the camera, A is the nearest.
 */
export function stoneSpots(tree: Vec2, stand: Vec2, count: number, trees: Vec2[]): Vec2[] {
  const spots = rowOfStones(tree, stand, count, trees);
  if (spots.length < 2) return spots;
  const dx = spots[spots.length - 1].x - spots[0].x;
  const dz = spots[spots.length - 1].z - spots[0].z;
  const runsAcross = Math.abs(dx) > Math.abs(dz) * 0.3;
  return (runsAcross ? dx < 0 : dz > 0) ? spots.reverse() : spots;
}

function rowOfStones(tree: Vec2, stand: Vec2, count: number, trees: Vec2[]): Vec2[] {
  let dx = stand.x - tree.x;
  let dz = stand.z - tree.z;
  let len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    dx = 0;
    dz = 1;
    len = 1;
  }
  const fx = dx / len; // from the tree toward the kid
  const fz = dz / len;
  const sx = -fz; // sideways
  const sz = fx;
  const blocked = (p: Vec2) => trees.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < STONES.TREE_CLEARANCE);

  return Array.from({ length: count }, (_, i) => {
    const offset = (i - (count - 1) / 2) * STONES.GAP;
    let out = STONES.FROM_TREE - Math.abs(offset) * 0.15; // outer stones curve round toward the tree
    const at = () => ({ x: tree.x + fx * out + sx * offset, z: tree.z + fz * out + sz * offset });
    let p = at();
    for (let k = 0; k < 6 && blocked(p); k++) {
      out += 0.6;
      p = at();
    }
    return p;
  });
}

export interface StoneState {
  fills: number[];
  /** Stones only answer once the kid has stood clear of all of them. */
  armed: boolean;
  /** The choice that answered, once one has. */
  fired: number | null;
  /** The kid is standing on a stone but hasn't said how sure they are yet. */
  waitingForConfidence: boolean;
}

export const startStones = (count: number): StoneState => ({
  fills: Array(count).fill(0),
  armed: false,
  fired: null,
  waitingForConfidence: false,
});

/**
 * One frame. A stone fills while the kid stands on it and answers once, when full. Stones start unarmed:
 * the kid must step clear of every stone first, so a stone rising under their feet never answers by itself.
 * While the stones are still `rising` nothing fills, but a kid who is clear already arms them, so a quick kid
 * who reaches a stone before it has fully risen isn't locked out.
 */
export function stepStones(state: StoneState, stones: Vec2[], kid: Vec2, dt: number, canAnswer: boolean, rising = false): StoneState {
  if (state.fired !== null) return state;
  const on = stones.findIndex((s) => Math.hypot(s.x - kid.x, s.z - kid.z) <= STONES.STAND_RADIUS);
  const armed = state.armed || on === -1;
  if (rising) return { ...state, armed, waitingForConfidence: false };
  const fills = state.fills.map((f, i) => {
    const filling = armed && canAnswer && i === on;
    return Math.min(1, Math.max(0, f + (filling ? dt / STONES.FILL_SECONDS : -dt / STONES.DRAIN_SECONDS)));
  });
  const full = fills.findIndex((f) => f >= 1);
  return { fills, armed, fired: full >= 0 ? full : null, waitingForConfidence: armed && on !== -1 && !canAnswer };
}
