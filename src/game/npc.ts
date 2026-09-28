// Where characters stand when they come to talk: beside the tree, a little toward the kid, never inside
// another tree or on top of the kid.
import type { Vec2 } from './layout';

const OUT_TO_SIDE = 1.9;
const TOWARD_KID = 0.8;
const CLEARANCE = 1.5;

export function besideTree(tree: Vec2, kid: Vec2, trees: Vec2[]): Vec2 {
  let dx = kid.x - tree.x;
  let dz = kid.z - tree.z;
  let len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    dx = 0;
    dz = 1;
    len = 1;
  }
  const fx = dx / len;
  const fz = dz / len;
  const spotOn = (side: 1 | -1) => ({
    x: tree.x + -fz * side * OUT_TO_SIDE + fx * TOWARD_KID,
    z: tree.z + fx * side * OUT_TO_SIDE + fz * TOWARD_KID,
  });
  const room = (p: Vec2) => Math.min(Infinity, ...trees.map((t) => Math.hypot(t.x - p.x, t.z - p.z)));
  const [a, b] = [spotOn(1), spotOn(-1)];
  // Prefer the first side; take the other only when it has clearly more room.
  return room(a) >= CLEARANCE || room(a) >= room(b) ? a : b;
}
