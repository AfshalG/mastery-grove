import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore, getGroveCenter } from '../../store/useGameStore';

export const ForestTerrain: React.FC = () => {
  const { world, moveTo } = useGameStore();

  const conceptsCount = world?.concepts.length || 3;

  // Path spline points linking grove centers in prerequisite order
  const pathPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    pts.push(new THREE.Vector3(0, 0.02, 5)); // Trail start
    for (let i = 0; i < conceptsCount; i++) {
      const center = getGroveCenter(i);
      pts.push(new THREE.Vector3(center[0], 0.02, center[2]));
    }
    // Final scenic overlook
    const last = getGroveCenter(conceptsCount - 1);
    pts.push(new THREE.Vector3(last[0] + 5, 0.02, last[2] - 12));

    const curve = new THREE.CatmullRomCurve3(pts);
    return curve.getPoints(80);
  }, [conceptsCount]);

  // Stepping stones along the path
  const steppingStones = useMemo(() => {
    return pathPoints.filter((_, idx) => idx % 2 === 0).map((pt, i) => {
      const scale = 0.5 + ((i * 17) % 5) * 0.1;
      const rot = ((i * 31) % 10) * 0.3;
      return {
        pos: [pt.x + (Math.sin(i) * 0.3), 0.03, pt.z + (Math.cos(i) * 0.3)] as [number, number, number],
        scale,
        rot,
      };
    });
  }, [pathPoints]);

  // Decorative low-poly flowers and mushrooms
  const foliageDecorations = useMemo(() => {
    const items: Array<{
      type: 'flower' | 'mushroom' | 'rock';
      pos: [number, number, number];
      color?: string;
      scale: number;
    }> = [];

    // Seeded pseudo-random placement around groves
    for (let g = 0; g < conceptsCount; g++) {
      const center = getGroveCenter(g);
      for (let j = 0; j < 18; j++) {
        const angle = (j * 137.5 * Math.PI) / 180;
        const dist = 7 + (j % 5) * 1.8;
        const x = center[0] + Math.cos(angle) * dist;
        const z = center[2] + Math.sin(angle) * dist;

        if (j % 3 === 0) {
          const colors = ['#f43f5e', '#fbbf24', '#a855f7', '#38bdf8', '#ffffff'];
          items.push({
            type: 'flower',
            pos: [x, 0, z],
            color: colors[j % colors.length],
            scale: 0.6 + (j % 3) * 0.2,
          });
        } else if (j % 3 === 1) {
          items.push({
            type: 'mushroom',
            pos: [x, 0, z],
            scale: 0.5 + (j % 4) * 0.15,
          });
        } else {
          items.push({
            type: 'rock',
            pos: [x, 0, z],
            scale: 0.7 + (j % 3) * 0.3,
          });
        }
      }
    }

    return items;
  }, [conceptsCount]);

  const handleGroundClick = (e: any) => {
    // Only handle if directly clicking ground plane
    if (e.point) {
      moveTo([e.point.x, 0, e.point.z]);
    }
  };

  return (
    <group>
      {/* Interactive Main Grass Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -40]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[180, 220, 32, 32]} />
        <meshStandardMaterial
          color="#38a169"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Dirt Path Geometry Ribbons */}
      {pathPoints.map((pt, idx) => {
        if (idx === pathPoints.length - 1) return null;
        const next = pathPoints[idx + 1];
        const midX = (pt.x + next.x) / 2;
        const midZ = (pt.z + next.z) / 2;
        const length = pt.distanceTo(next);
        const angle = Math.atan2(next.x - pt.x, next.z - pt.z);

        return (
          <mesh
            key={`path-seg-${idx}`}
            position={[midX, 0.015, midZ]}
            rotation={[-Math.PI / 2, 0, -angle + Math.PI / 2]}
            receiveShadow
          >
            <planeGeometry args={[length + 0.1, 2.4]} />
            <meshStandardMaterial color="#c29b62" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Stepping Stones on Path */}
      {steppingStones.map((stone, idx) => (
        <mesh
          key={`stone-${idx}`}
          position={stone.pos}
          rotation={[-Math.PI / 2, 0, stone.rot]}
          receiveShadow
        >
          <circleGeometry args={[0.35 * stone.scale, 7]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </mesh>
      ))}

      {/* Grove Ground Clearing Circles */}
      {Array.from({ length: conceptsCount }).map((_, idx) => {
        const center = getGroveCenter(idx);
        return (
          <group key={`clearing-${idx}`} position={[center[0], 0.02, center[2]]}>
            {/* Soft dirt ring inside grove */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[5.8, 24]} />
              <meshStandardMaterial color="#b38f58" roughness={0.95} />
            </mesh>
            {/* Surrounding cobblestone ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <ringGeometry args={[5.6, 6.0, 32]} />
              <meshStandardMaterial color="#64748b" roughness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Foliage Decorations */}
      {foliageDecorations.map((item, idx) => {
        if (item.type === 'flower') {
          return (
            <group key={`foliage-${idx}`} position={item.pos} scale={item.scale}>
              {/* Stem */}
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.4, 4]} />
                <meshStandardMaterial color="#15803d" />
              </mesh>
              {/* Petal Head */}
              <mesh position={[0, 0.42, 0]}>
                <sphereGeometry args={[0.15, 6, 6]} />
                <meshStandardMaterial color={item.color || '#f43f5e'} />
              </mesh>
            </group>
          );
        } else if (item.type === 'mushroom') {
          return (
            <group key={`foliage-${idx}`} position={item.pos} scale={item.scale}>
              {/* Stem */}
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 0.3, 5]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.6} />
              </mesh>
              {/* Cap */}
              <mesh position={[0, 0.3, 0]}>
                <coneGeometry args={[0.26, 0.2, 7]} />
                <meshStandardMaterial color="#ef4444" roughness={0.4} />
              </mesh>
            </group>
          );
        } else {
          return (
            <mesh
              key={`foliage-${idx}`}
              position={[item.pos[0], 0.2 * item.scale, item.pos[2]]}
              scale={item.scale}
            >
              <dodecahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#64748b" roughness={0.9} />
            </mesh>
          );
        }
      })}
    </group>
  );
};
