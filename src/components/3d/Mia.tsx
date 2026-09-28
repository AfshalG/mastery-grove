import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { teachSpotPlace, type Vec2 } from '../../game/layout';
import { miaStatus } from '../../game/teach';
import { liveAvatar } from '../../game/liveAvatar';
import { damp, turnToward } from '../../game/motion';
import { FONT_3D } from './fonts';
import { applyFade } from './fade';

const SKIN = '#b9784f';
const HAIR = '#3b2a20';
const SWEATER = '#5b8fc7';
const SWEATER_SHADE = '#4b7bb0';
const RIBBON = '#c2493d';
const TROUSERS = '#3d4a63';
const SHOES = '#6b4a2b';
const BARK = '#7a5536';
const STUMP_TOP = '#d8b27e';
const STUMP_RING = '#b98d5a';
const SLATE = '#2f3b36';
const FRAME = '#b08653';
const CHALK = '#f3efe2';
const SUN = '#f2c14e';
const INK = '#2f2a22';
const PAPER = '#fffaf0';

/** Walking this far from Mia ends the conversation. */
const WALK_AWAY = 7;
/** She looks up at the kid once they are this close. */
const NOTICE = 9;
const groundMark = {
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
};

/** Mia in every open grove that has a teach spot (src/game/teach.ts decides when she asks for help). */
export const MiaSpots: React.FC = () => {
  const { layout, spots, trees, teachBacks, openSpot, questionGrove, walkToMia, getUnlockedConcepts } = useGameStore(
    useShallow((s) => ({
      layout: s.layout,
      spots: s.teachSpots,
      trees: s.trees,
      teachBacks: s.teachBacks,
      openSpot: s.openTeachSpot,
      questionGrove: s.selectedTree?.conceptId ?? null,
      walkToMia: s.walkToMia,
      getUnlockedConcepts: s.getUnlockedConcepts,
    })),
  );
  if (!layout) return null;
  const unlocked = getUnlockedConcepts();

  return (
    <>
      {spots.map((spot) => {
        const grove = layout.groves.find((g) => g.conceptId === spot.conceptId);
        const status = miaStatus(trees, spot.conceptId, unlocked, teachBacks);
        if (!grove || status.kind === 'locked') return null;
        return (
          <Mia
            key={spot.conceptId}
            at={teachSpotPlace(grove).mia}
            board={spot.board ?? '?'}
            status={status.kind}
            talking={openSpot === spot.conceptId}
            quiet={questionGrove === spot.conceptId}
            onPick={() => walkToMia(spot.conceptId)}
          />
        );
      })}
    </>
  );
};

/** A small heart for the thought bubble once she gets it (the 3D font has no heart glyph). */
function useHeart() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.15);
    s.bezierCurveTo(-0.32, 0.06, -0.13, 0.27, 0, 0.1);
    s.bezierCurveTo(0.13, 0.27, 0.32, 0.06, 0, -0.15);
    return new THREE.ShapeGeometry(s, 12);
  }, []);
}

const Mia: React.FC<{
  at: Vec2;
  board: string;
  status: 'growing' | 'ready' | 'helped';
  talking: boolean;
  /** A question is open in her grove: she steps back (fades, bubble hidden) so the answer stones stay clear. */
  quiet: boolean;
  onPick: () => void;
}> = ({ at, board, status, talking, quiet, onPick }) => {
  const body = useRef<THREE.Group>(null);
  const figure = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const bubble = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const look = useRef(0);
  const cheer = useRef(0);
  const was = useRef(status);
  const fade = useRef(1);
  const heart = useHeart();

  // A happy bounce the moment she gets it.
  useEffect(() => {
    if (was.current !== 'helped' && status === 'helped') cheer.current = 2.2;
    was.current = status;
  }, [status]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const dx = liveAvatar.x - at.x;
    const dz = liveAvatar.z - at.z;
    const d = Math.hypot(dx, dz);

    // She sits facing the camera and turns her head to the kid when they come near.
    const want = d < NOTICE ? Math.max(-1, Math.min(1, Math.atan2(dx, dz))) : 0;
    look.current = turnToward(look.current, want, 1 - Math.exp(-5 * dt));
    if (head.current) {
      head.current.rotation.y = look.current;
      // Puzzled: a slow head tilt. Helped: a happy little sway.
      head.current.rotation.z = status === 'helped' ? Math.sin(t * 3) * 0.07 : 0.12 + Math.sin(t * 1.3) * 0.08;
    }
    if (body.current) {
      cheer.current = Math.max(0, cheer.current - dt);
      body.current.position.y = cheer.current > 0 ? Math.abs(Math.sin(cheer.current * 7)) * 0.22 : 0;
      body.current.scale.y = 1 + Math.sin(t * 2) * 0.012; // breathing
    }
    if (bubble.current)
      bubble.current.position.y = 2.35 + (status === 'ready' ? Math.abs(Math.sin(t * 3)) * 0.12 : Math.sin(t * 1.5) * 0.04);
    if (ring.current) ring.current.scale.setScalar(1 + (Math.sin(t * 3) * 0.5 + 0.5) * 0.14);

    const goal = quiet ? 0.3 : 1;
    if (fade.current !== goal && figure.current) {
      fade.current = Math.abs(fade.current - goal) < 0.01 ? goal : damp(fade.current, goal, 8, dt);
      applyFade(figure.current, fade.current);
    }

    if (talking && d > WALK_AWAY) useGameStore.getState().closeMia();
  });

  const chalkSize = Math.min(0.12, 0.52 / Math.max(1, board.length * 0.56));

  return (
    <group
      position={[at.x, 0, at.z]}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* A sunny ring on the ground while she's waiting for help */}
      {status === 'ready' && !quiet && (
        <mesh ref={ring} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.12, 40]} />
          <meshBasicMaterial color={SUN} opacity={0.85} {...groundMark} />
        </mesh>
      )}

      <group ref={figure}>
        {/* Tree stump seat */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.48, 0.5, 12]} />
          <meshLambertMaterial color={BARK} flatShading />
        </mesh>
        <mesh position={[0, 0.505, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.4, 18]} />
          <meshLambertMaterial color={STUMP_TOP} />
        </mesh>
        <mesh position={[0, 0.507, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.235, 18]} />
          <meshBasicMaterial color={STUMP_RING} />
        </mesh>

        <group ref={body}>
          {/* Legs: thighs forward on the stump, shins down */}
          {[-0.12, 0.12].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.6, 0.27]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[0.1, 0.3, 4, 10]} />
                <meshLambertMaterial color={TROUSERS} />
              </mesh>
              <mesh position={[x, 0.33, 0.52]} castShadow>
                <capsuleGeometry args={[0.09, 0.3, 4, 10]} />
                <meshLambertMaterial color={TROUSERS} />
              </mesh>
              <mesh position={[x, 0.07, 0.58]} castShadow>
                <boxGeometry args={[0.18, 0.12, 0.28]} />
                <meshLambertMaterial color={SHOES} />
              </mesh>
            </group>
          ))}

          {/* Sweater */}
          <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.27, 0.32, 6, 14]} />
            <meshLambertMaterial color={SWEATER} />
          </mesh>
          <mesh position={[0, 0.64, 0]} castShadow>
            <cylinderGeometry args={[0.29, 0.33, 0.14, 14]} />
            <meshLambertMaterial color={SWEATER_SHADE} />
          </mesh>

          {/* Arms reaching forward to hold up the slate */}
          {[-0.31, 0.31].map((x) => (
            <group key={x}>
              <mesh position={[x, 1.06, 0.17]} rotation={[-0.95, 0, 0]} castShadow>
                <capsuleGeometry args={[0.085, 0.28, 4, 10]} />
                <meshLambertMaterial color={SWEATER} />
              </mesh>
              <mesh position={[x * 0.97, 0.97, 0.36]}>
                <sphereGeometry args={[0.08, 10, 8]} />
                <meshLambertMaterial color={SKIN} />
              </mesh>
            </group>
          ))}

          {/* The slate with her wrong working, in chalk */}
          <group position={[0, 1.0, 0.4]} rotation={[-0.2, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.46, 0.04]} />
              <meshLambertMaterial color={FRAME} />
            </mesh>
            <mesh position={[0, 0, 0.021]}>
              <planeGeometry args={[0.6, 0.36]} />
              <meshBasicMaterial color={SLATE} />
            </mesh>
            <Suspense fallback={null}>
              <Text
                font={FONT_3D}
                position={[0, 0, 0.026]}
                fontSize={chalkSize}
                color={CHALK}
                anchorX="center"
                anchorY="middle"
                maxWidth={0.56}
              >
                {board}
              </Text>
            </Suspense>
          </group>

          {/* Head: two hair puffs with berry ribbons, dot eyes, rosy cheeks */}
          <group ref={head} position={[0, 1.62, 0]}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.3, 20, 16]} />
              <meshLambertMaterial color={SKIN} />
            </mesh>
            <mesh position={[0, 0.03, -0.01]}>
              <sphereGeometry args={[0.315, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshLambertMaterial color={HAIR} />
            </mesh>
            {[-0.26, 0.26].map((x) => (
              <group key={x}>
                <mesh position={[x, 0.25, -0.03]} castShadow>
                  <sphereGeometry args={[0.14, 14, 12]} />
                  <meshLambertMaterial color={HAIR} />
                </mesh>
                <mesh position={[x * 0.78, 0.18, 0.05]} scale={[1, 0.6, 0.6]}>
                  <sphereGeometry args={[0.07, 10, 8]} />
                  <meshLambertMaterial color={RIBBON} />
                </mesh>
              </group>
            ))}
            {[-0.1, 0.1].map((x) => (
              <mesh key={`eye${x}`} position={[x, -0.02, 0.27]}>
                <sphereGeometry args={[0.04, 10, 8]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            ))}
            {[-0.18, 0.18].map((x) => (
              <mesh key={`cheek${x}`} position={[x, -0.1, 0.24]} scale={[1, 0.6, 0.4]}>
                <sphereGeometry args={[0.055, 10, 8]} />
                <meshBasicMaterial color="#e58f7e" />
              </mesh>
            ))}
            {status === 'helped' ? (
              <mesh position={[0, -0.12, 0.28]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.07, 0.016, 6, 16, Math.PI]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            ) : (
              <mesh position={[0.03, -0.13, 0.285]}>
                <sphereGeometry args={[0.028, 8, 6]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            )}
          </group>
        </group>
      </group>

      {/* Thought bubble: "…" while the grove grows, "?" when she needs help, a heart once she gets it */}
      <Billboard visible={!quiet}>
        <group ref={bubble} position={[0.35, 2.35, 0]}>
          <mesh>
            <circleGeometry args={[0.32, 24]} />
            <meshBasicMaterial color={PAPER} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[0.36, 24]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          {[
            [-0.3, -0.42, 0.075],
            [-0.42, -0.6, 0.05],
          ].map(([x, y, r]) => (
            <group key={x} position={[x, y, 0]}>
              <mesh>
                <circleGeometry args={[r, 14]} />
                <meshBasicMaterial color={PAPER} />
              </mesh>
              <mesh position={[0, 0, -0.01]}>
                <circleGeometry args={[r + 0.03, 14]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            </group>
          ))}
          {status === 'helped' ? (
            <mesh geometry={heart} position={[0, 0.01, 0.01]}>
              <meshBasicMaterial color={RIBBON} />
            </mesh>
          ) : (
            <Suspense fallback={null}>
              <Text
                font={FONT_3D}
                position={[0, status === 'growing' ? 0.05 : 0.02, 0.01]}
                fontSize={status === 'growing' ? 0.3 : 0.38}
                color={INK}
                anchorX="center"
                anchorY="middle"
              >
                {status === 'growing' ? '…' : '?'}
              </Text>
            </Suspense>
          )}
        </group>
      </Billboard>
    </group>
  );
};
