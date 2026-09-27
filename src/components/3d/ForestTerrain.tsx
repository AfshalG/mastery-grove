import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { LAYOUT, scatterDecorations, type Vec2 } from '../../game/layout';

// Flat layers sit a little apart and use polygonOffset, so far-away ground never flickers (z-fighting).
const Y = { clearing: 0.03, clearingEdge: 0.045, trail: 0.06, stones: 0.075 };
const decal = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
const FLOWER_COLOURS = ['#f43f5e', '#fbbf24', '#a855f7', '#38bdf8', '#ffffff'];

/** One continuous ribbon along the trail's centreline. */
function trailGeometry(points: Vec2[], halfWidth: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    positions.push(p.x + nx * halfWidth, Y.trail, p.z + nz * halfWidth, p.x - nx * halfWidth, Y.trail, p.z - nz * halfWidth);
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
  const moveTo = useGameStore((s) => s.moveTo);

  const trail = useMemo(() => (layout ? trailGeometry(layout.trail, LAYOUT.TRAIL_HALF_WIDTH) : null), [layout]);
  // Free the GPU buffer when the trail is rebuilt for a new world.
  React.useEffect(() => () => trail?.dispose(), [trail]);

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

  if (!layout) return null;

  const b = layout.bounds;
  const ground = { width: b.maxX - b.minX + 140, depth: b.maxZ - b.minZ + 140, x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };

  return (
    <group>
      {/* Ground, drawn well past the walkable area so its edge stays hidden in the fog */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ground.x, 0, ground.z]}
        receiveShadow
        onClick={(e) => e.point && moveTo([e.point.x, 0, e.point.z])}
      >
        <planeGeometry args={[ground.width, ground.depth]} />
        <meshStandardMaterial color="#38a169" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Grove clearings */}
      {layout.groves.map((g) => (
        <group key={`clearing-${g.conceptId}`} position={[g.centre.x, 0, g.centre.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.clearing, 0]} receiveShadow>
            <circleGeometry args={[g.clearingRadius, 40]} />
            <meshStandardMaterial color="#b38f58" roughness={0.95} {...decal} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y.clearingEdge, 0]} receiveShadow>
            <ringGeometry args={[g.clearingRadius - 0.35, g.clearingRadius, 48]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} {...decal} />
          </mesh>
        </group>
      ))}

      {/* Trail */}
      {trail && (
        <mesh geometry={trail} receiveShadow>
          <meshStandardMaterial color="#c29b62" roughness={0.9} {...decal} polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
        </mesh>
      )}

      {stones.map((s, i) => (
        <mesh key={`stone-${i}`} position={[s.x, Y.stones, s.z]} rotation={[-Math.PI / 2, 0, s.rot]} receiveShadow>
          <circleGeometry args={[0.35 * s.scale, 7]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.7} {...decal} polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}

      {/* Flowers, mushrooms and rocks, kept off the trail, the trees, the signs and the clearings */}
      {decorations.map((d, i) =>
        d.kind === 'flower' ? (
          <group key={`deco-${i}`} position={[d.x, 0, d.z]} scale={d.scale}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.4, 4]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <sphereGeometry args={[0.15, 6, 6]} />
              <meshStandardMaterial color={FLOWER_COLOURS[d.variant % FLOWER_COLOURS.length]} />
            </mesh>
          </group>
        ) : d.kind === 'mushroom' ? (
          <group key={`deco-${i}`} position={[d.x, 0, d.z]} scale={d.scale}>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.3, 5]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.26, 0.2, 7]} />
              <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>
          </group>
        ) : (
          <mesh key={`deco-${i}`} position={[d.x, 0.2 * d.scale, d.z]} scale={d.scale}>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        )
      )}
    </group>
  );
};
