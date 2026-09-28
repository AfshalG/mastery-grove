import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { colourFor, useGameStore } from '../../store/useGameStore';
import { livePlayers } from '../../net/classRoom';
import { approachPoint, groundHeight, groveEntrance, routeTo, type Vec2 } from '../../game/layout';
import { openBridges } from '../../game/missions';
import { canOpenTree } from '../../game/progress';
import { damp, turnToward } from '../../game/motion';
import { FONT_3D } from './fonts';

const SKINS = ['#f1cfae', '#c68a5e', '#8d5a3b', '#e8b98f'];
const TROUSERS = '#4a4e69';
const BOOTS = '#6b4a2b';
const PAPER = '#fffaf0';
const INK = '#2f2a22';

/** Other kids in the class room, walking the same forest; sample classmates fill in while there are fewer than three. */
export const Classmates: React.FC = () => {
  const { room, players } = useGameStore(useShallow((s) => ({ room: s.room, players: s.roomPlayers })));
  if (!room) return null;
  const others = players.filter((p) => p.connected && p.role === 'student' && p.id !== room.playerId);
  // Never two kids with the same name: a sample steps aside for a real classmate called Aisha.
  const taken = new Set([room.name, ...players.map((p) => p.name)].map((n) => n.trim().toLowerCase()));
  const samples = SAMPLES.filter((s) => !taken.has(s.name.toLowerCase())).slice(0, Math.max(0, 2 - others.length));

  return (
    <>
      {others.map((p) => (
        <Classmate key={p.id} id={p.id} name={p.name} />
      ))}
      {samples.map((s) => (
        <SampleClassmate key={s.name} name={s.name} coat={s.coat} skin={s.skin} seed={SAMPLES.indexOf(s) + 1} />
      ))}
    </>
  );
};

const hashOf = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** A real classmate, smoothed toward the last position the server passed on. */
const Classmate: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const layout = useGameStore((s) => s.layout);
  const kid = useRef<KidHandle>(null);
  const pos = useRef<{ x: number; z: number; yaw: number } | null>(null);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const target = livePlayers.get(id);
    if (!target || !kid.current) return;
    if (!pos.current) pos.current = { x: target.x, z: target.z, yaw: target.yaw };
    const p = pos.current;
    p.x = damp(p.x, target.x, 9, dt);
    p.z = damp(p.z, target.z, 9, dt);
    p.yaw = turnToward(p.yaw, target.yaw, 1 - Math.exp(-10 * dt));
    const moving = target.moving || Math.hypot(target.x - p.x, target.z - p.z) > 0.15;
    kid.current.pose(p.x, layout ? groundHeight(layout, p) : 0, p.z, p.yaw, moving, state.clock.elapsedTime);
  });

  const h = hashOf(id);
  return <Kid ref={kid} name={name} coat={colourFor(id)} skin={SKINS[h % SKINS.length]} hat={h % 2 === 0 ? 'cap' : 'beanie'} />;
};

const SAMPLES = [
  { name: 'Aisha', coat: '#5b8fc7', skin: '#8d5a3b' },
  { name: 'Wei Jie', coat: '#3fa59b', skin: '#f1cfae' },
  { name: 'Priya', coat: '#8d75dc', skin: '#c68a5e' },
  { name: 'Leo', coat: '#e46f92', skin: '#e8b98f' },
];

/**
 * A sample classmate (labelled as one), so a class of one or two still feels like a class: wanders between
 * trees in the open groves, crossing streams by their bridges, and stops at each for a while.
 */
const SampleClassmate: React.FC<{ name: string; coat: string; skin: string; seed: number }> = ({ name, coat, skin, seed }) => {
  const { layout, trees, getUnlockedConcepts } = useGameStore(useShallow((s) => ({ layout: s.layout, trees: s.trees, getUnlockedConcepts: s.getUnlockedConcepts })));
  const kid = useRef<KidHandle>(null);
  const walk = useRef<{ x: number; z: number; yaw: number; path: Vec2[]; waitUntil: number; n: number } | null>(null);

  // Places worth walking to: in front of each open tree, and each open grove's way in.
  const spots = useMemo(() => {
    if (!layout) return [];
    const unlocked = getUnlockedConcepts();
    const at = trees
      .filter((t) => t.position && canOpenTree(t, unlocked).ok)
      .map((t) => approachPoint(layout, { x: t.position![0], z: t.position![2] }));
    const doors = layout.groves.filter((g) => unlocked.includes(g.conceptId)).map((g) => groveEntrance(g));
    return [...at, ...doors];
  }, [layout, trees, getUnlockedConcepts]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    if (!layout || spots.length === 0 || !kid.current) return;
    const t = state.clock.elapsedTime;
    if (!walk.current) {
      const start = spots[(seed * 3) % spots.length];
      walk.current = { x: start.x, z: start.z, yaw: Math.PI, path: [], waitUntil: t + seed * 1.5, n: seed * 7 };
    }
    const w = walk.current;
    let moving = false;
    if (w.path.length === 0 && t >= w.waitUntil) {
      w.n += 1;
      const to = spots[(w.n * 5 + seed) % spots.length];
      w.path = routeTo(layout, openBridges(layout, getUnlockedConcepts()), w, to).path;
    }
    if (w.path.length > 0) {
      const next = w.path[0];
      const dx = next.x - w.x;
      const dz = next.z - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        w.path.shift();
        if (w.path.length === 0) w.waitUntil = t + 2.5 + ((w.n * 13) % 5);
      } else {
        const step = Math.min(3.2 * dt, d);
        w.x += (dx / d) * step;
        w.z += (dz / d) * step;
        w.yaw = turnToward(w.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
        moving = true;
      }
    }
    kid.current.pose(w.x, groundHeight(layout, w), w.z, w.yaw, moving, t);
  });

  return <Kid ref={kid} name={name} note="sample" coat={coat} skin={skin} hat="beanie" />;
};

interface KidHandle {
  pose: (x: number, y: number, z: number, yaw: number, moving: boolean, t: number) => void;
}

/** A kid in the storybook style, with a name tag. Posed each frame by whoever drives it. */
const Kid = React.forwardRef<KidHandle, { name: string; note?: string; coat: string; skin: string; hat: 'beanie' | 'cap' }>(({ name, note, coat, skin, hat }, ref) => {
  const root = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Group | null>>([]);
  const arms = useRef<Array<THREE.Group | null>>([]);

  React.useImperativeHandle(ref, () => ({
    pose(x, y, z, yaw, moving, t) {
      const g = root.current;
      if (!g) return;
      g.position.set(x, y, z);
      g.rotation.y = yaw;
      const swing = moving ? Math.sin(t * 11) * 0.5 : 0;
      legs.current.forEach((l, i) => l && (l.rotation.x = i === 0 ? swing : -swing));
      arms.current.forEach((a, i) => a && (a.rotation.x = i === 0 ? -swing : swing));
    },
  }));

  return (
    <group ref={root}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 20]} />
        <meshBasicMaterial color={INK} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {[-0.13, 0.13].map((x, i) => (
        <group key={x} ref={(l) => (legs.current[i] = l)} position={[x, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.3, 4, 10]} />
            <meshLambertMaterial color={TROUSERS} />
          </mesh>
          <mesh position={[0, -0.55, 0.04]} castShadow>
            <boxGeometry args={[0.2, 0.12, 0.3]} />
            <meshLambertMaterial color={BOOTS} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.36, 6, 14]} />
        <meshLambertMaterial color={coat} />
      </mesh>
      {[-0.36, 0.36].map((x, i) => (
        <group key={x} ref={(a) => (arms.current[i] = a)} position={[x, 1.25, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.32, 4, 10]} />
            <meshLambertMaterial color={coat} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.085, 10, 8]} />
            <meshLambertMaterial color={skin} />
          </mesh>
        </group>
      ))}
      <group position={[0, 1.67, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.33, 20, 16]} />
          <meshLambertMaterial color={skin} />
        </mesh>
        {hat === 'beanie' ? (
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.345, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={PAPER} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0.08, 0]}>
              <sphereGeometry args={[0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshLambertMaterial color={coat} />
            </mesh>
            <mesh position={[0, 0.1, 0.3]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.4, 0.04, 0.25]} />
              <meshLambertMaterial color={coat} />
            </mesh>
          </>
        )}
        {[-0.11, 0.11].map((x) => (
          <mesh key={x} position={[x, -0.02, 0.3]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        ))}
      </group>
      <Billboard position={[0, 2.45, 0]}>
        <Suspense fallback={null}>
          <Text font={FONT_3D} fontSize={0.26} color={INK} anchorX="center" anchorY="middle" outlineWidth={0.035} outlineColor={PAPER}>
            {note ? `${name} · ${note}` : name}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  );
});
Kid.displayName = 'Kid';
