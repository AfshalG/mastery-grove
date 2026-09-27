import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeData } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { approachPoint } from '../../game/layout';
import { liveAvatar } from '../../game/liveAvatar';
import { damp } from '../../game/motion';
import { idHash, skinFor } from '../../game/skins';

interface TreeMeshProps {
  tree: TreeData;
  isLocked: boolean;
}

// Ground marks sit above the trail and stepping stones (ForestTerrain draws those up to y 0.075).
const MARK_Y = 0.09;
const groundMark = {
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -5,
  polygonOffsetUnits: -5,
};

// Trees added for a kid carry a small lantern instead of being painted a loud colour.
const LANTERN = {
  targeted: '#ef7fa0', // made for you
  teacher: '#9b84e8', // from the teacher
  memory: '#57c4b8', // memory check
};
const LOCKED_GREY = new THREE.Color('#9aa3a6');
const WHITE = new THREE.Color('#ffffff');

// A round storybook canopy: a few low-poly balls, bunched.
const CANOPY: Array<{ r: number; at: [number, number, number] }> = [
  { r: 1.25, at: [0, 2.55, 0] },
  { r: 0.85, at: [0.72, 2.2, 0.22] },
  { r: 0.8, at: [-0.62, 2.3, -0.3] },
  { r: 0.7, at: [0.1, 3.25, 0.05] },
];
// Blossoms dotted over the canopy of a tree answered right.
const BLOSSOMS: Array<[number, number, number]> = [
  [0.7, 3.0, 0.8],
  [-0.9, 2.7, 0.55],
  [0.2, 3.7, 0.5],
  [1.2, 2.35, -0.35],
  [-0.4, 2.2, 1.1],
  [0.05, 2.9, -1.15],
];

const shade = (hex: string, toward: THREE.Color, amount: number) => `#${new THREE.Color(hex).lerp(toward, amount).getHexString()}`;

/** Fades a tree's own meshes, keeping each material's original opacity as the full value. */
function applyFade(root: THREE.Object3D, amount: number) {
  const faded = amount < 0.999;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
    const mat = child.material as THREE.Material;
    if (mat.userData.baseOpacity === undefined) {
      mat.userData.baseOpacity = mat.opacity;
      mat.userData.baseTransparent = mat.transparent;
    }
    mat.opacity = mat.userData.baseOpacity * amount;
    mat.depthWrite = !faded; // a see-through tree shouldn't hide what's behind it
    const transparent = faded || mat.userData.baseTransparent;
    if (mat.transparent !== transparent) {
      mat.transparent = transparent;
      mat.needsUpdate = true;
    }
  });
}

export const TreeMesh: React.FC<TreeMeshProps> = React.memo(({ tree, isLocked }) => {
  const bodyRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const lanternRef = useRef<THREE.Group>(null);
  const saplingRingRef = useRef<THREE.Mesh>(null);
  const fade = useRef(1);
  const pop = useRef(1); // 0..1 through the grow-pop; 1 = finished
  const [hovered, setHovered] = useState(false);

  const isTutorsPick = useGameStore((s) => s.tutorBeaconTreeId === tree.id);
  // While this tree's question is open, its floating picture takes the space above it.
  const isOpen = useGameStore((s) => s.selectedTree?.id === tree.id);
  const moveTo = useGameStore((s) => s.moveTo);
  const setSaplingNotice = useGameStore((s) => s.setSaplingNotice);
  const layout = useGameStore((s) => s.layout);
  const subject = useGameStore((s) => s.world?.subject);

  const position = tree.position || [0, 0, 0];
  const saplingWaiting = tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2;
  const answered = tree.state === 'healthy' || tree.state === 'regrown';

  // Each tree keeps its own shade, size and turn on every screen.
  const hash = idHash(tree.id);
  const size = 0.92 + (hash % 21) / 100;
  const turn = ((hash >>> 5) % 628) / 100;

  const look = useMemo(() => {
    const skin = skinFor(subject);
    let leaves = skin.foliage[hash % skin.foliage.length];
    let trunk = skin.trunk;
    let scale = 1;
    let droop = 0;
    let canopyScale = 1;
    if (tree.state === 'withered') {
      leaves = skin.withered;
      droop = 0.18;
      canopyScale = 0.82;
    } else if (tree.state === 'sapling') {
      leaves = shade(leaves, WHITE, saplingWaiting ? 0.15 : 0.3);
      scale = 0.55;
    }
    if (isLocked) {
      leaves = shade(leaves, LOCKED_GREY, 0.55);
      trunk = shade(trunk, LOCKED_GREY, 0.4);
    }
    return { leaves, trunk, scale, droop, canopyScale, blossom: skin.blossom };
  }, [subject, hash, tree.state, isLocked, saplingWaiting]);

  // A lantern marks a tree waiting for this kid: a memory check (even on a grown tree), made for you, or from the teacher.
  const lantern = (() => {
    if (isLocked || isOpen || tree.state === 'withered') return null;
    if (tree.memoryDue) return LANTERN.memory;
    if (answered) return null;
    if (tree.isTargeted) return LANTERN.targeted;
    if (tree.isTeacherDeployed) return LANTERN.teacher;
    if (tree.isMemorySprout) return LANTERN.memory;
    return null;
  })();

  // A little pop when a tree turns healthy or regrows.
  const prevState = useRef(tree.state);
  useEffect(() => {
    const wasAnswered = prevState.current === 'healthy' || prevState.current === 'regrown';
    if (answered && !wasAnswered) pop.current = 0;
    prevState.current = tree.state;
  }, [tree.state, answered]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (beaconRef.current && isTutorsPick) {
      beaconRef.current.rotation.y += dt * 1.2;
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      beaconRef.current.scale.set(pulse, 1, pulse);
    }
    if (lanternRef.current) lanternRef.current.position.y = 4.35 + Math.sin(t * 2 + turn) * 0.12;
    if (saplingRingRef.current) saplingRingRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.15);

    if (bodyRef.current) {
      if (pop.current < 1) pop.current = Math.min(1, pop.current + dt / 0.7);
      const popScale = 1 + Math.sin(pop.current * Math.PI) * 0.18;
      bodyRef.current.scale.setScalar(look.scale * size * popScale);
    }

    // Fade this tree while it stands between the camera and the player, so it never hides them.
    const cam = state.camera.position;
    const sx = liveAvatar.x - cam.x;
    const sy = 1 - cam.y;
    const sz = liveAvatar.z - cam.z;
    const lenSq = sx * sx + sy * sy + sz * sz;
    let between = false;
    if (lenSq > 0.01) {
      const proj = ((position[0] - cam.x) * sx + (1.8 - cam.y) * sy + (position[2] - cam.z) * sz) / lenSq;
      if (proj > 0.05 && proj < 0.95) {
        const ox = position[0] - (cam.x + sx * proj);
        const oz = position[2] - (cam.z + sz * proj);
        between = ox * ox + oz * oz < 4;
      }
    }
    const goal = between ? 0.3 : 1;
    if (fade.current !== goal && bodyRef.current) {
      fade.current = Math.abs(fade.current - goal) < 0.01 ? goal : damp(fade.current, goal, 10, dt);
      applyFade(bodyRef.current, fade.current);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isLocked) return;

    if (saplingWaiting) {
      const remaining = 2 - (tree.answersSinceMiss ?? 0);
      setSaplingNotice(`This one comes back after ${remaining} more question${remaining > 1 ? 's' : ''}.`);
      return;
    }

    // Walk to a spot just inside the clearing, facing the tree, and open it on arrival
    const [tx, , tz] = position;
    const stand = layout ? approachPoint(layout, { x: tx, z: tz }) : { x: tx, z: tz + 1.8 };
    moveTo([stand.x, 0, stand.z], tree.id);
  };

  // Hovering warms the tree's own colour rather than recolouring it.
  const leafMaterial = {
    color: look.leaves,
    flatShading: true,
    emissive: hovered ? look.leaves : '#000000',
    emissiveIntensity: hovered ? 0.35 : 0,
  };

  return (
    <group
      position={[position[0], 0, position[2]]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isLocked) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* The tree itself: only this part droops when withered, pops when it grows, and fades when in the way */}
      <group ref={bodyRef} rotation={[0, turn, look.droop]} scale={look.scale * size}>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.2, 0.32, 1.7, 7]} />
          <meshLambertMaterial color={look.trunk} />
        </mesh>
        <group scale={look.canopyScale} position={[0, (1 - look.canopyScale) * 1.4, 0]}>
          {CANOPY.map((c, i) => (
            <mesh key={i} position={c.at} castShadow receiveShadow>
              <icosahedronGeometry args={[c.r, 0]} />
              <meshLambertMaterial {...leafMaterial} />
            </mesh>
          ))}
        </group>
        {answered &&
          BLOSSOMS.map((at, i) => (
            <mesh key={i} position={at}>
              <icosahedronGeometry args={[0.13, 0]} />
              <meshLambertMaterial color={look.blossom} flatShading emissive={look.blossom} emissiveIntensity={tree.state === 'regrown' ? 0.35 : 0.15} />
            </mesh>
          ))}
      </group>

      {/* A lantern over trees added for this kid: made for you, from the teacher, or a memory check */}
      {lantern && (
        <group ref={lanternRef} position={[0, 4.35, 0]}>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.1, 0.16, 0.1, 8]} />
            <meshLambertMaterial color="#5b4636" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshLambertMaterial color={lantern} emissive={lantern} emissiveIntensity={0.9} />
          </mesh>
        </group>
      )}

      {/* Ground marks stay flat on the ground */}
      {tree.state === 'sapling' && (
        <mesh ref={saplingRingRef} position={[0, MARK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshBasicMaterial color={saplingWaiting ? '#b9b3a3' : '#e8f2c8'} opacity={0.8} {...groundMark} />
        </mesh>
      )}

      {/* Byte's pick: a warm ring, a soft beam and a crystal */}
      {isTutorsPick && !isLocked && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MARK_Y + 0.01, 0]}>
            <ringGeometry args={[1.5, 1.85, 40]} />
            <meshBasicMaterial color="#f2c14e" opacity={0.75} {...groundMark} />
          </mesh>
          <mesh ref={beaconRef} position={[0, 10, 0]}>
            <cylinderGeometry args={[0.15, 0.45, 20, 16, 1, true]} />
            <meshBasicMaterial color="#ffe08a" transparent opacity={0.22} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {!isOpen && (
            <mesh position={[0, 5.0, 0]} rotation={[0.4, 0.4, 0]}>
              <octahedronGeometry args={[0.28, 0]} />
              <meshLambertMaterial color="#ffe08a" emissive="#f2a93b" emissiveIntensity={0.8} />
            </mesh>
          )}
        </group>
      )}

      {hovered && !isLocked && !isTutorsPick && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MARK_Y + 0.01, 0]}>
          <ringGeometry args={[1.3, 1.5, 32]} />
          <meshBasicMaterial color="#fff6dc" opacity={0.75} {...groundMark} />
        </mesh>
      )}
    </group>
  );
});
