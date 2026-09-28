import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { liveAvatar } from '../../game/liveAvatar';
import { besideTree } from '../../game/npc';
import { turnToward } from '../../game/motion';
import { FONT_3D } from './fonts';

const CREAM = '#f6efe0';
const SCREEN = '#2f3b3a';
const GLOW = '#8fe3c5';
const LEAF = '#6fae62';
const SUN = '#f2c14e';
const ARRIVE_SECONDS = 0.8;

/**
 * Professor Byte, the AI tutor, as a character: after a wrong answer he glides up beside the tree, turns to
 * the kid and shows "…" while Gemini works out their thinking, then "?" when his question is ready. The AI
 * made visible as someone in the forest, not a chat box.
 */
export const ProfessorByte: React.FC = () => {
  const { visible, tree, thinking } = useGameStore(
    useShallow((s) => ({
      visible: s.showExplanationModal && !!s.lastAnswerResult && !s.lastAnswerResult.isCorrect,
      tree: s.lastAnswerResult?.tree ?? null,
      thinking: s.isDiagnosing,
    }))
  );
  const trees = useGameStore((s) => s.trees);

  const root = useRef<THREE.Group>(null);
  const arrival = useRef(0);
  const heading = useRef(0);

  // Where he stands, worked out once per visit (the kid can't move while the feedback card is up).
  const spot = useMemo(() => {
    if (!visible || !tree?.position) return null;
    const at = { x: tree.position[0], z: tree.position[2] };
    const others = trees.filter((t) => t.id !== tree.id && t.position).map((t) => ({ x: t.position![0], z: t.position![2] }));
    const stand = besideTree(at, { x: liveAvatar.x, z: liveAvatar.z }, others);
    // He glides in from further out along the same side.
    return { stand, from: { x: stand.x + (stand.x - at.x) * 1.4, z: stand.z + (stand.z - at.z) * 1.4 } };
  }, [visible, tree?.id]); // not `trees`: new saplings appearing mid-visit shouldn't move him

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    arrival.current = Math.min(1, Math.max(0, arrival.current + (spot ? dt : -dt * 2) / ARRIVE_SECONDS));
    g.visible = arrival.current > 0.001;
    if (!spot) return;
    const t = 1 - Math.pow(1 - arrival.current, 3); // ease out
    const x = spot.from.x + (spot.stand.x - spot.from.x) * t;
    const z = spot.from.z + (spot.stand.z - spot.from.z) * t;
    g.position.set(x, 0.35 + Math.sin(state.clock.elapsedTime * 2.2) * 0.08, z);
    g.scale.setScalar(0.3 + 0.7 * t);
    heading.current = turnToward(heading.current, Math.atan2(liveAvatar.x - x, liveAvatar.z - z), 1 - Math.exp(-6 * dt));
    g.rotation.y = heading.current;
  });

  return (
    <group ref={root} visible={false}>
      {/* A soft glow under him, where a hover-jet would be */}
      <mesh position={[0, -0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 20]} />
        <meshBasicMaterial color={GLOW} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.3, 6, 14]} />
        <meshLambertMaterial color={CREAM} />
      </mesh>
      {/* Head with a screen face */}
      <group position={[0, 1.05, 0]}>
        <mesh scale={[1.2, 0.9, 0.85]} castShadow>
          <sphereGeometry args={[0.4, 24, 18]} />
          <meshLambertMaterial color={CREAM} />
        </mesh>
        <mesh position={[0, 0, 0.3]} scale={[1.05, 0.7, 1]}>
          <circleGeometry args={[0.3, 28]} />
          <meshBasicMaterial color={SCREEN} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.31]}>
            <circleGeometry args={[0.045, 14]} />
            <meshBasicMaterial color={GLOW} />
          </mesh>
        ))}
        <mesh position={[0, -0.07, 0.31]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.08, 0.016, 6, 16, Math.PI]} />
          <meshBasicMaterial color={GLOW} />
        </mesh>
        {[-0.49, 0.49].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshLambertMaterial color={SUN} />
          </mesh>
        ))}
        {/* Leaf antenna */}
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
          <meshLambertMaterial color="#5b4636" />
        </mesh>
        <mesh position={[0.07, 0.53, 0]} rotation={[0, 0, -0.6]} scale={[1, 0.35, 0.55]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshLambertMaterial color={LEAF} flatShading />
        </mesh>
      </group>
      {/* What he's doing: thinking, then asking */}
      <Billboard position={[0, 1.95, 0]}>
        <mesh>
          <circleGeometry args={[0.3, 24]} />
          <meshBasicMaterial color="#fffaf0" />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[0.34, 24]} />
          <meshBasicMaterial color="#2f2a22" />
        </mesh>
        <Suspense fallback={null}>
          <Text font={FONT_3D} position={[0, 0.02, 0.01]} fontSize={thinking ? 0.3 : 0.36} color="#2f2a22" anchorX="center" anchorY="middle">
            {thinking ? '…' : '?'}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  );
};
