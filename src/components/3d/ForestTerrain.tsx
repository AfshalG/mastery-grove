import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { LAYOUT, scatterDecorations, type ForestLayout, type Vec2 } from '../../game/layout';
import { skinFor, type Skin } from '../../game/skins';

// Flat layers sit a little apart and use polygonOffset, so far-away ground never flickers (z-fighting).
const Y = { clearing: 0.03, clearingEdge: 0.045, trailEdge: 0.055, trail: 0.06, stones: 0.075 };
const decal = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
const ROCK = '#b9ae9a';

/** A meadow with soft patches of lighter and darker grass, painted into the vertices (no texture to load). */
function groundGeometry(layout: ForestLayout, skin: Skin) {
  const b = layout.bounds;
  const width = b.maxX - b.minX + 140;
  const depth = b.maxZ - b.minZ + 140;
  const geo = new THREE.PlaneGeometry(width, depth, Math.ceil(width / 3), Math.ceil(depth / 3));
  geo.rotateX(-Math.PI / 2);
  geo.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(skin.ground);
  const light = new THREE.Color(skin.groundLight);
  const dark = new THREE.Color(skin.groundDark);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 0.09 + Math.sin(z * 0.05) * 2) * 0.5 + Math.sin(z * 0.11 + x * 0.03) * 0.35 + Math.sin((x + z) * 0.21) * 0.15;
    c.copy(base).lerp(n > 0 ? light : dark, Math.min(1, Math.abs(n)) * 0.8);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** One continuous ribbon along the trail's centreline. */
function trailGeometry(points: Vec2[], halfWidth: number, y: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    positions.push(p.x + nx * halfWidth, y, p.z + nz * halfWidth, p.x - nx * halfWidth, y, p.z - nz * halfWidth);
    if (i > 0) {
      const k = i * 2;
      indices.push(k - 2, k, k - 1, k - 1, k, k + 1); // wound so the ribbon faces up
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export const ForestTerrain: React.FC = () => {
  const layout = useGameStore((s) => s.layout);
  const trees = useGameStore((s) => s.trees);
  const subject = useGameStore((s) => s.world?.subject);
  const moveTo = useGameStore((s) => s.moveTo);
  const skin = skinFor(subject);

  const ground = useMemo(() => (layout ? groundGeometry(layout, skin) : null), [layout, skin]);
  const trail = useMemo(() => (layout ? trailGeometry(layout.trail, LAYOUT.TRAIL_HALF_WIDTH, Y.trail) : null), [layout]);
  const trailEdge = useMemo(() => (layout ? trailGeometry(layout.trail, LAYOUT.TRAIL_HALF_WIDTH + 0.22, Y.trailEdge) : null), [layout]);
  // Free the GPU buffers when a new world replaces them.
  useEffect(() => () => ground?.dispose(), [ground]);
  useEffect(() => () => trail?.dispose(), [trail]);
  useEffect(() => () => trailEdge?.dispose(), [trailEdge]);

  // Stepping stones every few steps, nudged a little left and right.
  const stones = useMemo(() => {
    if (!layout) return [];
    return layout.trail
      .filter((_, i) => i % 5 === 0)
      .map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * 0.35, z: p.z + Math.cos(i * 2.3) * 0.3, scale: 0.5 + ((i * 17) % 5) * 0.1, rot: ((i * 31) % 10) * 0.3 }));
  }, [layout]);

  // Recomputed when trees are added, so a new tree never grows through a flower or a rock.
  const treeKey = trees.map((t) => `${t.id}:${t.position?.[0]?.toFixed(1)},${t.position?.[2]?.toFixed(1)}`).join('|');
  const decorations = useMemo(() => {
    if (!layout) return [];
    const spots = trees.filter((t) => t.position).map((t) => ({ x: t.position![0], z: t.position![2] }));
    return scatterDecorations(layout, spots);
  }, [layout, treeKey]); // keyed on positions: a tree changing state (withered, regrown) moves nothing

  if (!layout || !ground) return null;

  return (
    <group>
      <mesh geometry={ground} receiveShadow onClick={(e) => e.point && moveTo([e.point.x, 0, e.point.z])}>
        <meshLambertMaterial vertexColors />
      </mesh>

      {layout.groves.map((g) => (
        <group key={`clearing-${g.conceptId}`} position={[g.centre.x, 0, g.centre.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.clearing, 0]} receiveShadow>
            <circleGeometry args={[g.clearingRadius, 48]} />
            <meshLambertMaterial color={skin.clearing} {...decal} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.clearingEdge, 0]} receiveShadow>
            <ringGeometry args={[g.clearingRadius - 0.3, g.clearingRadius, 64]} />
            <meshLambertMaterial color={skin.clearingEdge} {...decal} />
          </mesh>
        </group>
      ))}

      {trailEdge && (
        <mesh geometry={trailEdge} receiveShadow>
          <meshLambertMaterial color={skin.trailEdge} {...decal} polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>
      )}
      {trail && (
        <mesh geometry={trail} receiveShadow>
          <meshLambertMaterial color={skin.trail} {...decal} polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      )}

      {stones.map((s, i) => (
        <mesh key={`stone-${i}`} position={[s.x, Y.stones, s.z]} rotation={[-Math.PI / 2, 0, s.rot]} receiveShadow>
          <circleGeometry args={[0.35 * s.scale, 7]} />
          <meshLambertMaterial color={skin.stone} {...decal} polygonOffsetFactor={-5} polygonOffsetUnits={-5} />
        </mesh>
      ))}

      {/* Flowers, mushrooms and rocks, kept off the trail, the trees, the signs and the clearings */}
      {decorations.map((d, i) =>
        d.kind === 'flower' ? (
          <group key={`deco-${i}`} position={[d.x, 0, d.z]} scale={d.scale}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.4, 4]} />
              <meshLambertMaterial color="#4f7f3a" />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <icosahedronGeometry args={[0.15, 0]} />
              <meshLambertMaterial color={skin.flowers[d.variant % skin.flowers.length]} flatShading />
            </mesh>
          </group>
        ) : d.kind === 'mushroom' ? (
          <group key={`deco-${i}`} position={[d.x, 0, d.z]} scale={d.scale}>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.3, 6]} />
              <meshLambertMaterial color="#f6efe0" />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.26, 0.2, 8]} />
              <meshLambertMaterial color="#d9534f" flatShading />
            </mesh>
          </group>
        ) : (
          <mesh key={`deco-${i}`} position={[d.x, 0.18 * d.scale, d.z]} scale={d.scale}>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshLambertMaterial color={ROCK} flatShading />
          </mesh>
        )
      )}
    </group>
  );
};
