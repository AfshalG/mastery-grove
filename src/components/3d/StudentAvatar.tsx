import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sounds } from '../../utils/audio';
import { clampToBounds } from '../../game/layout';
import { liveAvatar } from '../../game/liveAvatar';
import { turnToward } from '../../game/motion';

const SPEED = 7.5;
const ARRIVE_DISTANCE = 0.25;
/** How often the store hears where the avatar is while it walks. The HUD's grove progress needs no more. */
const PUBLISH_EVERY = 0.12;
const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
// Ground marks sit above the trail and stepping stones (ForestTerrain draws those up to y 0.075).
const MARK_Y = 0.09;
const groundMark = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 };

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
  const heading = useRef(0);
  const lastWritten = useRef<[number, number, number] | null>(null);
  const lastPublish = useRef(0);
  const wasMoving = useRef(false);
  const lastStep = useRef(0);
  const hopStart = useRef(-1); // -1: not hopping. -2: start on the next frame.

  useEffect(() => {
    const blocked = () => isTyping() || useGameStore.getState().selectedTree !== null;
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
      if (useGameStore.getState().selectedTree === null) hop();
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

    const free = store.selectedTree === null;
    const turnShare = 1 - Math.exp(-14 * dt);
    let moving = false;

    if (free && (dx !== 0 || dz !== 0)) {
      const len = Math.hypot(dx, dz);
      let next = { x: liveAvatar.x + (dx / len) * SPEED * dt, z: liveAvatar.z + (dz / len) * SPEED * dt };
      if (store.layout) next = clampToBounds(store.layout, next);
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
        liveAvatar.x += (tx / dist) * step;
        liveAvatar.z += (tz / dist) * step;
        heading.current = turnToward(heading.current, Math.atan2(tx, tz), turnShare);
        moving = true;
      } else {
        liveAvatar.x = store.targetPosition[0];
        liveAvatar.z = store.targetPosition[2];
        store.arriveAtTarget();
      }
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

    group.position.set(liveAvatar.x, 0, liveAvatar.z);
    group.rotation.y = heading.current;

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
            {/* Sweater */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.65, 0.74, 0.38]} />
              <meshStandardMaterial color="#2563eb" roughness={0.7} />
            </mesh>

            {/* School backpack */}
            <mesh castShadow position={[0, 0.02, -0.25]}>
              <boxGeometry args={[0.48, 0.52, 0.22]} />
              <meshStandardMaterial color="#dc2626" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.08, -0.37]}>
              <boxGeometry args={[0.36, 0.24, 0.08]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.8} />
            </mesh>

            {/* Head */}
            <group position={[0, 0.65, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.52, 0.52, 0.48]} />
                <meshStandardMaterial color="#fcd34d" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <boxGeometry args={[0.56, 0.12, 0.52]} />
                <meshStandardMaterial color="#1e40af" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.24, 0.32]}>
                <boxGeometry args={[0.52, 0.05, 0.25]} />
                <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
              </mesh>
              <mesh position={[-0.14, 0.04, 0.25]}>
                <boxGeometry args={[0.08, 0.09, 0.04]} />
                <meshStandardMaterial color="#0f172a" roughness={0.2} />
              </mesh>
              <mesh position={[0.14, 0.04, 0.25]}>
                <boxGeometry args={[0.08, 0.09, 0.04]} />
                <meshStandardMaterial color="#0f172a" roughness={0.2} />
              </mesh>
            </group>

            {/* Arms, pivoting at the shoulders */}
            <group ref={leftArmRef} position={[-0.43, 0.32, 0]}>
              <mesh castShadow position={[0, -0.27, 0]}>
                <boxGeometry args={[0.18, 0.6, 0.22]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.7} />
              </mesh>
            </group>
            <group ref={rightArmRef} position={[0.43, 0.32, 0]}>
              <mesh castShadow position={[0, -0.27, 0]}>
                <boxGeometry args={[0.18, 0.6, 0.22]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.7} />
              </mesh>
            </group>
          </group>

          {/* Legs, pivoting at the hips */}
          <group ref={leftLegRef} position={[-0.18, 0.6, 0]}>
            <mesh castShadow position={[0, -0.3, 0]}>
              <boxGeometry args={[0.22, 0.6, 0.26]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.18, 0.6, 0]}>
            <mesh castShadow position={[0, -0.3, 0]}>
              <boxGeometry args={[0.22, 0.6, 0.26]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
};
