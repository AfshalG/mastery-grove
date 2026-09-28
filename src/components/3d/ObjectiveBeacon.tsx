import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { groveEntrance, teachSpotPlace, type ForestLayout, type Vec2 } from '../../game/layout';
import type { Objective } from '../../game/missions';

const groundMark = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 };

function spotFor(layout: ForestLayout, objective: Objective | null): Vec2 | null {
  if (!objective) return null;
  if (objective.kind === 'mia') {
    const g = layout.groves.find((gr) => gr.conceptId === objective.conceptId);
    return g ? teachSpotPlace(g).mia : null;
  }
  if (objective.kind === 'enter') return layout.groves[objective.groveIndex] ? groveEntrance(layout.groves[objective.groveIndex]) : null;
  return null; // trees draw their own beam
}

/**
 * Byte's beam when the next mission isn't a tree: over Mia when she's ready for help, or at the way into the next
 * grove once its bridge is built. The same warm ring, beam and crystal a tree gets.
 */
export const ObjectiveBeacon: React.FC = () => {
  const { layout, objective, busy } = useGameStore(
    useShallow((s) => ({
      layout: s.layout,
      objective: s.objective,
      busy: s.selectedTree !== null || s.openTeachSpot !== null || s.showExplanationModal,
    }))
  );
  const beam = useRef<THREE.Mesh>(null);
  const crystal = useRef<THREE.Mesh>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (beam.current) {
      beam.current.rotation.y += dt * 1.2;
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      beam.current.scale.set(pulse, 1, pulse);
    }
    if (crystal.current) {
      crystal.current.rotation.y += dt * 1.5;
      crystal.current.position.y = (objective?.kind === 'mia' ? 3.35 : 3.0) + Math.sin(t * 2) * 0.15;
    }
  });

  const at = layout && !busy ? spotFor(layout, objective) : null;
  if (!at) return null;

  return (
    <group position={[at.x, 0, at.z]}>
      {objective?.kind === 'enter' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[1.2, 1.55, 40]} />
          <meshBasicMaterial color="#f2c14e" opacity={0.75} {...groundMark} />
        </mesh>
      )}
      <mesh ref={beam} position={[0, 10, 0]}>
        <cylinderGeometry args={[0.15, 0.45, 20, 16, 1, true]} />
        <meshBasicMaterial color="#ffe08a" transparent opacity={0.22} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={crystal} position={[0, 3.2, 0]} rotation={[0.4, 0.4, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshLambertMaterial color="#ffe08a" emissive="#f2a93b" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};
