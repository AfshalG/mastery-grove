import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sounds } from '../../utils/audio';
import { blockWater, clampToBounds, groundHeight } from '../../game/layout';
import { openBridges } from '../../game/missions';
import { damp } from '../../game/motion';
import { liveAvatar } from '../../game/liveAvatar';
import { turnToward } from '../../game/motion';

/** A note about an unfinished bridge at most this often, however long the kid pushes against the water. */
const BLOCKED_NOTE_EVERY = 4;

const SPEED = 7.5;
const ARRIVE_DISTANCE = 0.25;
/** How often the store hears where the avatar is while it walks. The HUD's grove progress needs no more. */
const PUBLISH_EVERY = 0.12;
const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
// Ground marks sit above the trail and stepping stones (ForestTerrain draws those up to y 0.075).
const MARK_Y = 0.09;
const groundMark = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 };

// A storybook explorer: yellow raincoat, red knit hat (easy to spot from behind, where the camera sits).
const COAT = '#f2c14e';
const COAT_SHADE = '#e2ab3a';
const PACK = '#5b8c5a';
const PACK_SHADE = '#4d7a4c';
const SKIN = '#f1cfae';
const HAT = '#d9534f';
const HAT_BAND = '#f6efe0';
const TROUSERS = '#4a4e69';
const BOOTS = '#6b4a2b';

const isTyping = () => {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
};

export const StudentAvatar: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  // Only the walk target re-renders this component; position changes never do.
  const targetPosition = useGameStore((s) => s.targetPosition);

  const keys = useRef(new Set<string>());
  const heading = useRef(Math.PI); // facing up the trail, away from the camera
  const lastWritten = useRef<[number, number, number] | null>(null);
  const lastPublish = useRef(0);
  const wasMoving = useRef(false);
  const lastStep = useRef(0);
  const lastBlockedNote = useRef(-Infinity);
  const groundY = useRef(0);
  const hopStart = useRef(-1); // -1: not hopping. -2: start on the next frame.

  useEffect(() => {
    // Keys walk the avatar even with a question open (to reach the answer stones), but not over the feedback card.
    const blocked = () => isTyping() || useGameStore.getState().showExplanationModal;
    const hop = () => {
      hopStart.current = -2;
      sounds.playStep();
    };
    const onDown = (e: KeyboardEvent) => {
      if (blocked()) return;
      if (e.code === 'Space') {
        e.preventDefault();
        hop();
        return;
      }
      const key = e.key.toLowerCase();
      if (MOVE_KEYS.has(key)) keys.current.add(key);
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    // Switching windows mid-press never delivers a keyup, which used to leave the avatar walking forever.
    const onBlur = () => keys.current.clear();
    const onHop = () => {
      if (!useGameStore.getState().showExplanationModal) hop();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('avatar-hop', onHop);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('avatar-hop', onHop);
    };
  }, []);

  useFrame((state, rawDt) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(rawDt, 0.1); // a background tab can hand us one huge step
    const store = useGameStore.getState();

    // Adopt moves made elsewhere: a new world's spawn point, or a teleport from a test.
    if (store.avatarPosition !== lastWritten.current) {
      liveAvatar.x = store.avatarPosition[0];
      liveAvatar.z = store.avatarPosition[2];
      lastWritten.current = store.avatarPosition;
    }

    let dx = 0;
    let dz = 0;
    const k = keys.current;
    if (k.has('w') || k.has('arrowup')) dz -= 1;
    if (k.has('s') || k.has('arrowdown')) dz += 1;
    if (k.has('a') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('arrowright')) dx += 1;

    // Free to move unless feedback is showing, or a question without stones (serve-the-cake) is open.
    const free = !store.showExplanationModal && (store.selectedTree === null || store.answerStones !== null);
    const turnShare = 1 - Math.exp(-14 * dt);
    let moving = false;

    // Water can only be crossed on a finished bridge.
    const layout = store.layout;
    const open = layout ? openBridges(layout, store.getUnlockedConcepts()) : [];
    const stayDry = (next: { x: number; z: number }) => {
      if (!layout) return next;
      const { p, blockedBy } = blockWater(layout, open, { x: liveAvatar.x, z: liveAvatar.z }, clampToBounds(layout, next));
      if (blockedBy !== null && !open[blockedBy] && state.clock.elapsedTime - lastBlockedNote.current > BLOCKED_NOTE_EVERY) {
        lastBlockedNote.current = state.clock.elapsedTime;
        store.setSaplingNotice(store.bridgeNotice(blockedBy));
      }
      return p;
    };

    if (free && (dx !== 0 || dz !== 0)) {
      const len = Math.hypot(dx, dz);
      const next = stayDry({ x: liveAvatar.x + (dx / len) * SPEED * dt, z: liveAvatar.z + (dz / len) * SPEED * dt });
      liveAvatar.x = next.x;
      liveAvatar.z = next.z;
      heading.current = turnToward(heading.current, Math.atan2(dx, dz), turnShare);
      moving = true;
      // The keys take over from a click-to-walk target, so the avatar doesn't walk back to it afterwards.
      if (store.targetPosition) store.cancelWalk();
    } else if (free && store.targetPosition) {
      const tx = store.targetPosition[0] - liveAvatar.x;
      const tz = store.targetPosition[2] - liveAvatar.z;
      const dist = Math.hypot(tx, tz);
      if (dist > ARRIVE_DISTANCE) {
        const step = Math.min(SPEED * dt, dist);
        const next = stayDry({ x: liveAvatar.x + (tx / dist) * step, z: liveAvatar.z + (tz / dist) * step });
        // A walk that the water stops (a bridge closed under it, say) ends where it is, rather than pushing forever.
        if (Math.hypot(next.x - liveAvatar.x, next.z - liveAvatar.z) < step * 0.25) store.cancelWalk();
        liveAvatar.x = next.x;
        liveAvatar.z = next.z;
        heading.current = turnToward(heading.current, Math.atan2(tx, tz), turnShare);
        moving = true;
      } else {
        liveAvatar.x = store.targetPosition[0];
        liveAvatar.z = store.targetPosition[2];
        store.arriveAtTarget();
      }
    }

    // Talking to Mia: turn to face her.
    if (!moving && store.openTeachSpot && store.layout) {
      const g = store.layout.groves.find((gr) => gr.conceptId === store.openTeachSpot);
      if (g) heading.current = turnToward(heading.current, Math.atan2(g.centre.x - liveAvatar.x, g.centre.z - liveAvatar.z), turnShare);
    }

    // The store hears where we are a few times a second while walking, and once more when we stop.
    const now = state.clock.elapsedTime;
    if ((moving && now - lastPublish.current > PUBLISH_EVERY) || (!moving && wasMoving.current)) {
      const p: [number, number, number] = [liveAvatar.x, 0, liveAvatar.z];
      lastWritten.current = p;
      lastPublish.current = now;
      store.setAvatarPosition(p);
    }
    wasMoving.current = moving;

    // Up and over a bridge's arch.
    groundY.current = damp(groundY.current, layout ? groundHeight(layout, liveAvatar) : 0, 18, dt);
    group.position.set(liveAvatar.x, groundY.current, liveAvatar.z);
    group.rotation.y = heading.current;
    liveAvatar.heading = heading.current;
    liveAvatar.moving = moving;

    // Hop: a half-second bounce
    if (hopStart.current === -2) hopStart.current = now;
    let hopY = 0;
    if (hopStart.current >= 0) {
      const t = (now - hopStart.current) / 0.5;
      if (t < 1) hopY = Math.sin(t * Math.PI) * 0.85;
      else hopStart.current = -1;
    }
    if (bodyRef.current) bodyRef.current.position.y = hopY;

    if (moving && now - lastStep.current > 0.32) {
      sounds.playStep();
      lastStep.current = now;
    }

    // Legs swing from the hips and arms from the shoulders
    const swing = moving ? Math.sin(now * 12) * 0.55 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
    if (torsoRef.current) {
      torsoRef.current.position.y = 0.95 + (moving ? Math.abs(Math.sin(now * 12)) * 0.03 : Math.sin(now * 2) * 0.015);
    }
  });

  return (
    <>
      {/* Where a click-to-walk is heading, drawn on the ground in world space until the avatar arrives */}
      {targetPosition && (
        <mesh position={[targetPosition[0], MARK_Y, targetPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.45, 20]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.6} {...groundMark} />
        </mesh>
      )}

      <group ref={groupRef}>
        {/* Ground shadow, which stays on the ground when hopping */}
        <mesh position={[0, MARK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 24]} />
          <meshBasicMaterial color="#0b1712" opacity={0.35} {...groundMark} />
        </mesh>

        <group ref={bodyRef}>
          <group ref={torsoRef} position={[0, 0.95, 0]}>
            {/* Yellow raincoat, flaring a little at the hem */}
            <mesh castShadow receiveShadow>
              <capsuleGeometry args={[0.3, 0.36, 6, 14]} />
              <meshLambertMaterial color={COAT} />
            </mesh>
            <mesh castShadow position={[0, -0.33, 0]}>
              <cylinderGeometry args={[0.32, 0.37, 0.18, 14]} />
              <meshLambertMaterial color={COAT_SHADE} />
            </mesh>
            {[0.12, -0.08].map((y) => (
              <mesh key={y} position={[0, y, 0.3]}>
                <sphereGeometry args={[0.035, 8, 6]} />
                <meshLambertMaterial color="#6b4a2b" />
              </mesh>
            ))}

            {/* Backpack */}
            <mesh castShadow position={[0, 0.05, -0.3]}>
              <boxGeometry args={[0.44, 0.5, 0.2]} />
              <meshLambertMaterial color={PACK} />
            </mesh>
            <mesh position={[0, 0.22, -0.31]}>
              <boxGeometry args={[0.46, 0.16, 0.23]} />
              <meshLambertMaterial color={PACK_SHADE} />
            </mesh>

            {/* Head, knit hat with a pompom, dot eyes and rosy cheeks */}
            <group position={[0, 0.72, 0]}>
              <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.33, 20, 16]} />
                <meshLambertMaterial color={SKIN} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <sphereGeometry args={[0.345, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshLambertMaterial color={HAT} />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.352, 0.352, 0.09, 20]} />
                <meshLambertMaterial color={HAT_BAND} />
              </mesh>
              <mesh position={[0, 0.42, 0]}>
                <sphereGeometry args={[0.1, 10, 8]} />
                <meshLambertMaterial color={HAT_BAND} />
              </mesh>
              {[-0.11, 0.11].map((x) => (
                <mesh key={`eye${x}`} position={[x, -0.02, 0.3]}>
                  <sphereGeometry args={[0.045, 10, 8]} />
                  <meshBasicMaterial color="#2b2a24" />
                </mesh>
              ))}
              {[-0.19, 0.19].map((x) => (
                <mesh key={`cheek${x}`} position={[x, -0.11, 0.26]} scale={[1, 0.6, 0.4]}>
                  <sphereGeometry args={[0.06, 10, 8]} />
                  <meshBasicMaterial color="#f4a7a0" />
                </mesh>
              ))}
            </group>

            {/* Arms, pivoting at the shoulders */}
            {[
              { ref: leftArmRef, x: -0.36 },
              { ref: rightArmRef, x: 0.36 },
            ].map(({ ref, x }) => (
              <group key={x} ref={ref} position={[x, 0.3, 0]}>
                <mesh castShadow position={[0, -0.24, 0]}>
                  <capsuleGeometry args={[0.09, 0.32, 4, 10]} />
                  <meshLambertMaterial color={COAT} />
                </mesh>
                <mesh position={[0, -0.5, 0]}>
                  <sphereGeometry args={[0.085, 10, 8]} />
                  <meshLambertMaterial color={SKIN} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Legs and boots, pivoting at the hips */}
          {[
            { ref: leftLegRef, x: -0.13 },
            { ref: rightLegRef, x: 0.13 },
          ].map(({ ref, x }) => (
            <group key={x} ref={ref} position={[x, 0.62, 0]}>
              <mesh castShadow position={[0, -0.28, 0]}>
                <capsuleGeometry args={[0.1, 0.3, 4, 10]} />
                <meshLambertMaterial color={TROUSERS} />
              </mesh>
              <mesh castShadow position={[0, -0.55, 0.04]}>
                <boxGeometry args={[0.2, 0.12, 0.3]} />
                <meshLambertMaterial color={BOOTS} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </>
  );
};
