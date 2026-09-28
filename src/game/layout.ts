// Where the groves, trees, signs and trail go. Pure and deterministic: the same world always gives the same
// forest, so it can be unit-tested and every player in a room sees the same thing. Nothing here knows about
// three.js or Gemini. In the scene, x is left/right and the player walks toward negative z.

export interface Vec2 {
  x: number;
  z: number;
}

export interface GroveSpot {
  conceptId: string;
  index: number;
  /** +1: right of the trail (positive x). -1: left. Groves alternate. */
  side: 1 | -1;
  centre: Vec2;
  /** The ring the grove's own questions stand on. */
  ringRadius: number;
  /** The open ground drawn around them. */
  clearingRadius: number;
  /** Direction from the centre toward the trail, in radians (atan2(z, x)). Base trees leave a gap here. */
  entranceAngle: number;
  /** Foot of the sign post. */
  sign: Vec2;
  /** three.js rotation.y that turns the board's front toward the trail and the player walking up it. */
  signRotationY: number;
}

export interface ForestLayout {
  groves: GroveSpot[];
  /** Trail centreline, sampled about every half unit. */
  trail: Vec2[];
  spawn: Vec2;
  /** Walkable area; the ground is drawn a little beyond it. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const DEG = Math.PI / 180;

export const LAYOUT = {
  /** Closest two trees may stand. Canopies are about 1.3 in radius, so this leaves room to walk between. */
  TREE_GAP: 3,
  /** Closest a tree may stand to a sign board, so no canopy ever pokes through a sign. */
  SIGN_GAP: 2.4,
  /** Half the sign board's width, rim included (GroveSign draws a 4.3-wide board). */
  SIGN_HALF_WIDTH: 2.15,
  TRAIL_HALF_WIDTH: 1.3,
  /** Closest a tree may stand to the trail's centreline, so no trunk or canopy sits on the path. */
  TRAIL_GAP: 3,
  /**
   * Base rings start this far out. It leaves the heart of each grove open for Mia's teach spot, with the
   * answer stones for any tree (which rise between the kid and the centre) still clear of her.
   */
  RING_MIN_RADIUS: 6,
  /** Mia's teach spot at the heart of a grove: her stump, her knees and the slate she holds up. */
  HEART_CLEAR: 0.9,
  /** Arc length between neighbours on a ring. */
  RING_SLOT: 3.4,
  /** Distance between the base ring and each outer ring for extra trees. */
  RING_STEP: 3.4,
  /** Outer rings kept free for saplings, made-for-you, teacher and memory trees. */
  EXTRA_RINGS: 4,
  /** Base trees keep out of this angle either side of the entrance, which leaves the grove open to the trail. */
  ENTRANCE_GAP: 45 * DEG,
  /** From the trail centreline to the nearest point of a grove's base ring. */
  TRAIL_TO_RING: 7,
  /** Signs face the player walking up the trail (+z), turned this far toward the trail. */
  SIGN_TURN: 20 * DEG,
  /** How far the trail swings toward each grove as it passes. */
  TRAIL_WIGGLE: 1.5,
  /** The sign stands this far outside the base ring, on the trail side. */
  SIGN_OUTSIDE_RING: 1.5,
  CLEARING_MARGIN: 2,
  GROVE_Z_START: -14,
  GROVE_Z_STEP: 24,
  /** Where the player stops in front of a tree they walk to. */
  APPROACH_DISTANCE: 1.9,
  EDGE_MARGIN: 4,
  TRAIL_START_Z: 12,
  TRAIL_END_BEYOND: 18,
  SPAWN: { x: 0, z: 4 } as Vec2,
} as const;

const ARC = 2 * Math.PI - 2 * LAYOUT.ENTRANCE_GAP;

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Smallest difference between two angles, 0..π. */
function angleGap(a: number, b: number) {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

const onCircle = (c: Vec2, r: number, angle: number): Vec2 => ({ x: c.x + Math.cos(angle) * r, z: c.z + Math.sin(angle) * r });

/** Uniform Catmull-Rom through the points, sampled about every `step` units. */
function smoothPath(points: Vec2[], step = 0.5): Vec2[] {
  const p = [points[0], ...points, points[points.length - 1]];
  const out: Vec2[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const n = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Radius of a base ring that fits `count` trees RING_SLOT apart around the open arc. */
function ringRadiusFor(count: number) {
  return Math.max(LAYOUT.RING_MIN_RADIUS, (Math.max(1, count) * LAYOUT.RING_SLOT) / ARC);
}

/** Both ends of a grove's sign board (the board runs along the group's local x axis). */
export function signBoard(g: GroveSpot): [Vec2, Vec2] {
  const ax = Math.cos(g.signRotationY) * LAYOUT.SIGN_HALF_WIDTH;
  const az = -Math.sin(g.signRotationY) * LAYOUT.SIGN_HALF_WIDTH;
  return [
    { x: g.sign.x - ax, z: g.sign.z - az },
    { x: g.sign.x + ax, z: g.sign.z + az },
  ];
}

/** Lays out one grove per concept, in order, alternating sides of a winding trail. */
export function planForest(concepts: Array<{ id: string; trees: number }>): ForestLayout {
  const groves: GroveSpot[] = concepts.map((c, index) => {
    const side: 1 | -1 = index % 2 === 0 ? 1 : -1;
    const ringRadius = ringRadiusFor(c.trees);
    const centre = { x: side * (LAYOUT.TRAIL_TO_RING + ringRadius), z: LAYOUT.GROVE_Z_START - index * LAYOUT.GROVE_Z_STEP };
    const entranceAngle = side === 1 ? Math.PI : 0;
    // Face the player walking up the trail (the camera looks toward -z), turned a little toward the trail.
    const signRotationY = -side * LAYOUT.SIGN_TURN;
    return {
      conceptId: c.id,
      index,
      side,
      centre,
      ringRadius,
      clearingRadius: ringRadius + LAYOUT.CLEARING_MARGIN,
      entranceAngle,
      sign: onCircle(centre, ringRadius + LAYOUT.SIGN_OUTSIDE_RING, entranceAngle),
      signRotationY,
    };
  });

  const lastZ = groves.length ? groves[groves.length - 1].centre.z : LAYOUT.GROVE_Z_START;
  const trail = smoothPath([
    { x: 0, z: LAYOUT.TRAIL_START_Z },
    LAYOUT.SPAWN,
    ...groves.map((g) => ({ x: g.side * LAYOUT.TRAIL_WIGGLE, z: g.centre.z })),
    { x: 0, z: lastZ - LAYOUT.TRAIL_END_BEYOND },
  ]);

  const reach = (g: GroveSpot) => g.ringRadius + LAYOUT.RING_STEP * LAYOUT.EXTRA_RINGS + 1.5;
  const xs = [...groves.flatMap((g) => [g.centre.x - reach(g), g.centre.x + reach(g)]), ...trail.map((p) => p.x)];
  const zs = [...groves.flatMap((g) => [g.centre.z - reach(g), g.centre.z + reach(g)]), ...trail.map((p) => p.z)];
  const bounds = {
    minX: Math.min(...xs) - LAYOUT.EDGE_MARGIN,
    maxX: Math.max(...xs) + LAYOUT.EDGE_MARGIN,
    minZ: Math.min(...zs) - LAYOUT.EDGE_MARGIN,
    maxZ: Math.max(...zs) + LAYOUT.EDGE_MARGIN,
  };

  return { groves, trail, spawn: { ...LAYOUT.SPAWN }, bounds };
}

export function distanceToTrail(layout: ForestLayout, p: Vec2) {
  let best = Infinity;
  for (let i = 0; i < layout.trail.length - 1; i++) {
    best = Math.min(best, distToSegment(p, layout.trail[i], layout.trail[i + 1]));
  }
  return best;
}

export function nearestGroveIndex(layout: ForestLayout, p: Vec2) {
  let best = 0;
  layout.groves.forEach((g, i) => {
    if (dist(p, g.centre) < dist(p, layout.groves[best].centre)) best = i;
  });
  return best;
}

/** Angle of a point around a grove's centre, for asking findTreeSpot to plant near an existing tree. */
export function angleAround(g: GroveSpot, p: Vec2) {
  return Math.atan2(p.z - g.centre.z, p.x - g.centre.x);
}

/** Whether a tree could stand at p without breaking a placement rule. */
function isFree(layout: ForestLayout, groveIndex: number, p: Vec2, occupied: Vec2[]) {
  const b = layout.bounds;
  if (p.x <= b.minX + 1 || p.x >= b.maxX - 1 || p.z <= b.minZ + 1 || p.z >= b.maxZ - 1) return false;
  if (distanceToTrail(layout, p) < LAYOUT.TRAIL_GAP) return false;
  if (dist(p, layout.spawn) < LAYOUT.TREE_GAP) return false;
  for (const g of layout.groves) {
    const [a, c] = signBoard(g);
    if (distToSegment(p, a, c) < LAYOUT.SIGN_GAP) return false;
    // Keep out of other groves' clearings so each grove reads as its own place.
    if (g.index !== groveIndex && dist(p, g.centre) < g.clearingRadius + 1.3) return false;
  }
  return occupied.every((o) => dist(p, o) >= LAYOUT.TREE_GAP);
}

/**
 * First free spot for an extra tree (sapling, made-for-you, teacher, memory) on the grove's outer rings:
 * inner rings first, then the spot closest to `preferAngle` (default: the far side of the grove).
 * Always returns a spot; if the grove is packed it returns the roomiest one it found.
 */
export function findTreeSpot(layout: ForestLayout, groveIndex: number, occupied: Vec2[], preferAngle?: number): Vec2 {
  const g = layout.groves[groveIndex] ?? layout.groves[0];
  const prefer = preferAngle ?? g.entranceAngle + Math.PI;
  let roomiest: { p: Vec2; room: number } | null = null;

  for (let ring = 1; ring <= LAYOUT.EXTRA_RINGS; ring++) {
    const r = g.ringRadius + ring * LAYOUT.RING_STEP;
    const slots = Math.floor((2 * Math.PI * r) / LAYOUT.RING_SLOT);
    const candidates = Array.from({ length: slots }, (_, k) => (k / slots) * 2 * Math.PI)
      .sort((a, b) => angleGap(a, prefer) - angleGap(b, prefer) || a - b)
      .map((angle) => onCircle(g.centre, r, angle));

    for (const p of candidates) {
      if (isFree(layout, g.index, p, occupied)) return p;
      if (isFree(layout, g.index, p, [])) {
        const room = Math.min(...occupied.map((o) => dist(p, o)));
        if (!roomiest || room > roomiest.room) roomiest = { p, room };
      }
    }
  }
  return roomiest?.p ?? onCircle(g.centre, g.ringRadius + LAYOUT.RING_STEP, prefer);
}

/**
 * Positions for a world's own trees: an even spread around each grove's ring, leaving the entrance open.
 * Trees whose concept isn't in the layout are left out. If a grove has more trees than its ring holds,
 * the rest go to the outer rings.
 */
export function placeBaseTrees(layout: ForestLayout, trees: Array<{ id: string; conceptId: string }>): Record<string, Vec2> {
  const placed: Record<string, Vec2> = {};
  const overflow: Array<{ id: string; grove: number }> = [];

  for (const g of layout.groves) {
    const mine = trees.filter((t) => t.conceptId === g.conceptId);
    const capacity = Math.max(1, Math.floor((ARC * g.ringRadius) / LAYOUT.RING_SLOT));
    const onRing = mine.slice(0, capacity);
    const step = ARC / Math.max(1, onRing.length);
    onRing.forEach((t, k) => {
      placed[t.id] = onCircle(g.centre, g.ringRadius, g.entranceAngle + LAYOUT.ENTRANCE_GAP + step / 2 + k * step);
    });
    mine.slice(capacity).forEach((t) => overflow.push({ id: t.id, grove: g.index }));
  }

  for (const t of overflow) placed[t.id] = findTreeSpot(layout, t.grove, Object.values(placed));
  return placed;
}

/** Where the player should stand to face a tree: a step in from the tree, toward its grove's centre. */
export function approachPoint(layout: ForestLayout, tree: Vec2): Vec2 {
  const g = layout.groves[nearestGroveIndex(layout, tree)];
  if (!g) return tree;
  let dx = g.centre.x - tree.x;
  let dz = g.centre.z - tree.z;
  let len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    dx = Math.cos(g.entranceAngle);
    dz = Math.sin(g.entranceAngle);
    len = 1;
  }
  return { x: tree.x + (dx / len) * LAYOUT.APPROACH_DISTANCE, z: tree.z + (dz / len) * LAYOUT.APPROACH_DISTANCE };
}

/**
 * Mia sits at the heart of her grove, facing the camera (which always looks toward -z). The kid talks to her
 * from in front and a little to her right, so the chase camera frames both of them.
 */
export function teachSpotPlace(g: GroveSpot): { mia: Vec2; stand: Vec2 } {
  return {
    mia: { x: g.centre.x, z: g.centre.z },
    stand: { x: g.centre.x + 1.2, z: g.centre.z + 1.7 },
  };
}

/** Keeps a point inside the walkable area. */
export function clampToBounds(layout: ForestLayout, p: Vec2): Vec2 {
  const b = layout.bounds;
  return { x: Math.min(b.maxX, Math.max(b.minX, p.x)), z: Math.min(b.maxZ, Math.max(b.minZ, p.z)) };
}

export type DecorationKind = 'flower' | 'mushroom' | 'rock';

export interface Decoration {
  kind: DecorationKind;
  x: number;
  z: number;
  scale: number;
  /** Picks a colour or shape variation; 0..4. */
  variant: number;
}

const DRESSING_PER_GROVE = 22;

/**
 * Flowers, mushrooms and rocks: a loose ring just outside each clearing, and flowers along the trail's edges.
 * Kept off the trail, the trees, the signs and the clearings, and seeded so every player sees the same scenery.
 * Pass the trees standing now; anything a new tree would cover drops out when the scenery is recomputed.
 */
export function scatterDecorations(layout: ForestLayout, trees: Vec2[], seed = 1337): Decoration[] {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const kinds: DecorationKind[] = ['flower', 'mushroom', 'rock'];
  const candidates: Array<{ p: Vec2; kind: DecorationKind }> = [];

  for (const g of layout.groves) {
    for (let j = 0; j < DRESSING_PER_GROVE; j++) {
      const angle = j * 2.39996 + rand() * 0.3; // golden angle, so the ring never looks gridded
      candidates.push({ p: onCircle(g.centre, g.clearingRadius + 0.8 + rand() * 7, angle), kind: kinds[j % 3] });
    }
  }
  for (let i = 0; i < layout.trail.length - 1; i += 7) {
    const a = layout.trail[i];
    const b = layout.trail[i + 1];
    const len = dist(a, b) || 1;
    const side = (i / 7) % 2 === 0 ? 1 : -1;
    const off = (LAYOUT.TRAIL_HALF_WIDTH + 0.7 + rand() * 1.2) * side;
    candidates.push({ p: { x: a.x - ((b.z - a.z) / len) * off, z: a.z + ((b.x - a.x) / len) * off }, kind: 'flower' });
  }

  const b = layout.bounds;
  const out: Decoration[] = [];
  for (const { p, kind } of candidates) {
    const clear =
      p.x > b.minX + 1 && p.x < b.maxX - 1 && p.z > b.minZ + 1 && p.z < b.maxZ - 1 &&
      distanceToTrail(layout, p) > LAYOUT.TRAIL_HALF_WIDTH + 0.4 &&
      dist(p, layout.spawn) > 1.5 &&
      trees.every((t) => dist(p, t) > 1.6) &&
      layout.groves.every((g) => {
        const [e1, e2] = signBoard(g);
        return distToSegment(p, e1, e2) > 1 && dist(p, g.centre) > g.clearingRadius + 0.1;
      }) &&
      out.every((o) => dist(p, o) > 0.8);
    if (clear) out.push({ kind, x: p.x, z: p.z, scale: 0.6 + rand() * 0.6, variant: Math.floor(rand() * 5) });
  }
  return out;
}

export interface ForestTree extends Vec2 {
  kind: 'round' | 'pine';
  scale: number;
  /** 0..2: which of the skin's foliage shades to use. */
  shade: number;
  rotation: number;
}

/**
 * The scenery forest: a thick ring of trees around the play area, and a light sprinkle in the open meadow
 * between groves. Kept off the trail, the clearings, the signs, the spawn point and the question trees.
 * Seeded, so every player sees the same forest; pass the trees standing now so no question tree ever
 * grows inside a scenery tree.
 */
export function scatterForest(layout: ForestLayout, trees: Vec2[], seed = 4242): ForestTree[] {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const b = layout.bounds;
  const RING = 30; // how deep the surrounding forest goes
  const OUTSIDE_STEP = 5.5;
  const INSIDE_STEP = 9;
  const out: ForestTree[] = [];

  const isClear = (p: Vec2) =>
    distanceToTrail(layout, p) > LAYOUT.TRAIL_HALF_WIDTH + 2.5 &&
    dist(p, layout.spawn) > 5 &&
    trees.every((t) => dist(p, t) > LAYOUT.TREE_GAP) &&
    layout.groves.every((g) => {
      const [e1, e2] = signBoard(g);
      return dist(p, g.centre) > g.clearingRadius + 1 && distToSegment(p, e1, e2) > 3;
    });
  const isInside = (p: Vec2) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
  const plant = (p: Vec2, big: boolean) =>
    out.push({
      ...p,
      kind: rand() < 0.6 ? 'round' : 'pine',
      scale: (big ? 1.1 : 0.9) + rand() * 0.5,
      shade: Math.floor(rand() * 3),
      rotation: rand() * Math.PI * 2,
    });

  // The surrounding forest, just past the walkable edge.
  for (let x = b.minX - RING; x <= b.maxX + RING; x += OUTSIDE_STEP) {
    for (let z = b.minZ - RING; z <= b.maxZ + RING; z += OUTSIDE_STEP) {
      const p = { x: x + (rand() - 0.5) * OUTSIDE_STEP * 0.8, z: z + (rand() - 0.5) * OUTSIDE_STEP * 0.8 };
      if (!isInside(p) && isClear(p)) plant(p, true);
    }
  }
  // A few trees in the open meadow, so the walk between groves still feels like a forest.
  for (let x = b.minX + INSIDE_STEP / 2; x < b.maxX; x += INSIDE_STEP) {
    for (let z = b.minZ + INSIDE_STEP / 2; z < b.maxZ; z += INSIDE_STEP) {
      const p = { x: x + (rand() - 0.5) * INSIDE_STEP * 0.6, z: z + (rand() - 0.5) * INSIDE_STEP * 0.6 };
      if (rand() < 0.55 && isInside(p) && isClear(p)) plant(p, false);
    }
  }
  return out;
}
