import React, { Suspense, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { liveAvatar } from '../../game/liveAvatar';
import { STONES, startStones, stepStones, type StoneState } from '../../game/stones';
import { FONT_3D } from './fonts';

const LETTERS = 'ABCDEF';
const RISE_SECONDS = 0.4;
/** Walking this far from the tree puts the question away. */
const WALK_AWAY = 9;
const STONE = '#d6cdb9';
const STONE_EDGE = '#b8ad95';
const FILL = '#f2c14e';

/**
 * The answer stones for the open question. They rise out of the ground, fill while the kid stands on one,
 * and answer with it when full (rules in src/game/stones.ts). Clicking a stone walks onto it.
 */
export const AnswerStones: React.FC = () => {
  const { stones, tree, confidence, answered, moveTo, setConfidenceNudge } = useGameStore(
    useShallow((s) => ({
      stones: s.answerStones,
      tree: s.selectedTree,
      confidence: s.selectedConfidence,
      answered: s.showExplanationModal,
      moveTo: s.moveTo,
      setConfidenceNudge: s.setConfidenceNudge,
    }))
  );

  const state = useRef<StoneState>(startStones(0));
  const submitted = useRef(false);
  const rise = useRef(0);
  const lastNudge = useRef(false);
  const stoneRefs = useRef<Array<THREE.Group | null>>([]);
  const fillRefs = useRef<Array<THREE.Mesh | null>>([]);

  // A new question: fresh stones, starting below the ground.
  useEffect(() => {
    state.current = startStones(stones?.length ?? 0);
    submitted.current = false;
    rise.current = 0;
  }, [stones]);

  useFrame((_, rawDt) => {
    if (!stones || !tree) return;
    const dt = Math.min(rawDt, 0.1);
    rise.current = Math.min(1, Math.max(0, rise.current + (answered ? -dt : dt) / RISE_SECONDS));

    if (!answered) {
      state.current = stepStones(state.current, stones, liveAvatar, dt, confidence !== null, rise.current < 1);
      const fired = state.current.fired;
      if (fired !== null && !submitted.current && confidence) {
        submitted.current = true;
        useGameStore.getState().answerTreeQuestion(tree.id, fired, confidence);
      }
      if (state.current.waitingForConfidence !== lastNudge.current) {
        lastNudge.current = state.current.waitingForConfidence;
        setConfidenceNudge(lastNudge.current);
      }
      if (tree.position && Math.hypot(liveAvatar.x - tree.position[0], liveAvatar.z - tree.position[2]) > WALK_AWAY) {
        useGameStore.getState().closeTree();
      }
    }

    // Stones (letters and all) shrink into the ground as they sink, and are gone once they're down.
    const y = -0.45 + rise.current * 0.45;
    stoneRefs.current.forEach((g) => {
      if (!g) return;
      g.position.y = y;
      g.scale.setScalar(0.5 + 0.5 * rise.current);
      g.visible = rise.current > 0.02;
    });
    fillRefs.current.forEach((m, i) => m && m.scale.setScalar(Math.max(0.001, state.current.fills[i] ?? 0)));
  });

  if (!stones || !tree) return null;

  return (
    <group>
      {stones.map((spot, i) => (
        <group key={`${tree.id}-${i}`} position={[spot.x, 0, spot.z]}>
          <group
            ref={(g) => (stoneRefs.current[i] = g)}
            position={[0, -0.45, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (!answered) moveTo([spot.x, 0, spot.z]);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
          >
            <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.95, 1.08, 0.3, 9]} />
              <meshLambertMaterial color={STONE} flatShading />
            </mesh>
            <mesh receiveShadow position={[0, 0.02, 0]}>
              <cylinderGeometry args={[STONES.RADIUS - 0.04, STONES.RADIUS, 0.12, 9]} />
              <meshLambertMaterial color={STONE_EDGE} flatShading />
            </mesh>
            {/* Fills up while the kid stands here */}
            <mesh ref={(m) => (fillRefs.current[i] = m)} position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.8, 24]} />
              <meshBasicMaterial color={FILL} />
            </mesh>
            <Billboard position={[0, 1.25, 0]}>
              <mesh>
                <circleGeometry args={[0.36, 24]} />
                <meshBasicMaterial color={FILL} />
              </mesh>
              <mesh position={[0, 0, -0.01]}>
                <circleGeometry args={[0.42, 24]} />
                <meshBasicMaterial color="#2f2a22" />
              </mesh>
              <Suspense fallback={null}>
                <Text font={FONT_3D} position={[0, 0.02, 0.01]} fontSize={0.42} color="#2f2a22" anchorX="center" anchorY="middle">
                  {LETTERS[i]}
                </Text>
              </Suspense>
            </Billboard>
          </group>
        </group>
      ))}
    </group>
  );
};
