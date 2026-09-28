import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { liveAvatar } from '../../game/liveAvatar';
import { damp, turnToward } from '../../game/motion';
import { groundHeight, teachSpotPlace } from '../../game/layout';
import { useGameStore } from '../../store/useGameStore';

const ORANGE = '#e36f1e';
const CREAM = '#fff1dd';
const DARK = '#2b1d14';

/** The fox companion: trots beside the player, hops when they walk, and sits when they stop. */
export const Fox: React.FC = () => {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pos = useRef({ x: liveAvatar.x + 1.3, z: liveAvatar.z + 0.6 });
  const heading = useRef(Math.PI);

  useFrame((state, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.1);
    const h = liveAvatar.heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    // Beside the player and a little behind them, on whichever side isn't Mia's stump.
    let tx = liveAvatar.x + Math.cos(h) * 1.3 - fx * 0.6;
    let tz = liveAvatar.z - Math.sin(h) * 1.3 - fz * 0.6;
    const { layout, teachSpots } = useGameStore.getState();
    const onMia = (x: number, z: number) =>
      teachSpots.some((s) => {
        const g = layout?.groves.find((gr) => gr.conceptId === s.conceptId);
        if (!g) return false;
        const { mia } = teachSpotPlace(g);
        return Math.hypot(mia.x - x, mia.z - z) < 1.5;
      });
    if (onMia(tx, tz)) {
      tx = liveAvatar.x - Math.cos(h) * 1.3 - fx * 0.6;
      tz = liveAvatar.z + Math.sin(h) * 1.3 - fz * 0.6;
    }

    const px = pos.current.x;
    const pz = pos.current.z;
    pos.current.x = damp(px, tx, 4, dt);
    pos.current.z = damp(pz, tz, 4, dt);
    const vx = (pos.current.x - px) / Math.max(dt, 1e-3);
    const vz = (pos.current.z - pz) / Math.max(dt, 1e-3);
    const speed = Math.hypot(vx, vz);

    heading.current = turnToward(heading.current, speed > 0.4 ? Math.atan2(vx, vz) : h, 1 - Math.exp(-8 * dt));
    g.position.set(pos.current.x, layout ? groundHeight(layout, pos.current) : 0, pos.current.z);
    g.rotation.y = heading.current;
    if (body.current) body.current.position.y = speed > 0.4 ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.12 : 0;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#2f2a22" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={body}>
        {/* Legs */}
        {[
          [-0.1, 0.18],
          [0.1, 0.18],
          [-0.1, -0.16],
          [0.1, -0.16],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.13, z]}>
            <cylinderGeometry args={[0.045, 0.04, 0.26, 6]} />
            <meshLambertMaterial color={DARK} />
          </mesh>
        ))}
        {/* Body and chest */}
        <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.19, 0.36, 4, 10]} />
          <meshLambertMaterial color={ORANGE} />
        </mesh>
        <mesh position={[0, 0.36, 0.26]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          <meshLambertMaterial color={CREAM} />
        </mesh>
        {/* Head, snout, ears */}
        <group position={[0, 0.58, 0.36]}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.19, 1]} />
            <meshLambertMaterial color={ORANGE} flatShading />
          </mesh>
          <mesh position={[0, -0.04, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.09, 0.2, 8]} />
            <meshLambertMaterial color={CREAM} />
          </mesh>
          <mesh position={[0, -0.03, 0.28]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshBasicMaterial color={DARK} />
          </mesh>
          {[-0.08, 0.08].map((x) => (
            <mesh key={`eye${x}`} position={[x, 0.04, 0.16]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshBasicMaterial color={DARK} />
            </mesh>
          ))}
          {[-0.1, 0.1].map((x) => (
            <mesh key={`ear${x}`} position={[x, 0.2, -0.02]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]}>
              <coneGeometry args={[0.07, 0.17, 4]} />
              <meshLambertMaterial color={ORANGE} flatShading />
            </mesh>
          ))}
        </group>
        {/* Bushy tail with a cream tip */}
        <group position={[0, 0.42, -0.32]} rotation={[-0.9, 0, 0]}>
          <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.11, 0.3, 4, 8]} />
            <meshLambertMaterial color={ORANGE} />
          </mesh>
          <mesh position={[0, 0, -0.42]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshLambertMaterial color={CREAM} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
