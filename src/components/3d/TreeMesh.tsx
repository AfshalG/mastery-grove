import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeData } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { approachPoint } from '../../game/layout';
import { liveAvatar } from '../../game/liveAvatar';
import { damp } from '../../game/motion';

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

const SPARKLE = {
  memory: { color: '#5eead4', glow: '#14b8a6' },
  targeted: { color: '#f472b6', glow: '#ec4899' },
  teacher: { color: '#c084fc', glow: '#a855f7' },
  regrown: { color: '#fef08a', glow: '#facc15' },
};

/**
 * How a tree looks. Its answer state comes first, so a made-for-you tree that withers looks withered;
 * the colour tags for made-for-you, teacher and memory trees only apply while it's still open or healthy.
 */
function treeLook(tree: TreeData, isLocked: boolean, saplingWaiting: boolean) {
  const look = { cone: '#2d6a4f', trunk: '#5c4033', emissive: '#000000', glow: 0, scale: 1, droop: 0 };
  if (isLocked) return { ...look, cone: '#6c757d', trunk: '#495057' };
  if (tree.state === 'withered') return { ...look, cone: '#8c6239', trunk: '#5d4037', droop: 0.15 };
  if (tree.state === 'sapling') return { ...look, cone: saplingWaiting ? '#64748b' : '#95d5b2', scale: 0.55 };
  if (tree.state === 'regrown') return { ...look, cone: '#10b981', emissive: '#059669', glow: 0.25 };
  if (tree.isMemorySprout) return { ...look, cone: '#0d9488', emissive: '#2dd4bf', glow: 0.5, scale: 0.85 };
  if (tree.isTargeted) return { ...look, cone: '#db2777', emissive: '#f472b6', glow: 0.45 };
  if (tree.isTeacherDeployed) return { ...look, cone: '#7c3aed', emissive: '#c084fc', glow: 0.45 };
  if (tree.state === 'healthy') return { ...look, cone: '#40916c' };
  return look;
}

function sparkleFor(tree: TreeData) {
  if (tree.state === 'withered' || tree.state === 'sapling') return null;
  if (tree.isMemorySprout) return SPARKLE.memory;
  if (tree.isTargeted) return SPARKLE.targeted;
  if (tree.isTeacherDeployed) return SPARKLE.teacher;
  if (tree.state === 'regrown') return SPARKLE.regrown;
  return null;
}

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
  const sparkleRef = useRef<THREE.Group>(null);
  const saplingRingRef = useRef<THREE.Mesh>(null);
  const fade = useRef(1);
  const [hovered, setHovered] = useState(false);

  const isTutorsPick = useGameStore((s) => s.tutorBeaconTreeId === tree.id);
  const moveTo = useGameStore((s) => s.moveTo);
  const setSaplingNotice = useGameStore((s) => s.setSaplingNotice);
  const layout = useGameStore((s) => s.layout);

  const position = tree.position || [0, 0, 0];
  const saplingWaiting = tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2;
  const look = treeLook(tree, isLocked, saplingWaiting);
  const sparkle = sparkleFor(tree);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (beaconRef.current && isTutorsPick) {
      beaconRef.current.rotation.y += dt * 1.5;
      const pulse = 1 + Math.sin(t * 3) * 0.15;
      beaconRef.current.scale.set(pulse, 1, pulse);
    }
    if (sparkleRef.current) sparkleRef.current.rotation.y += dt * 2;
    if (saplingRingRef.current) saplingRingRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.2);

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
      setSaplingNotice(`Come back later: Answer ${remaining} more question${remaining > 1 ? 's' : ''} to unlock this review sapling! ⏳`);
      return;
    }

    // Walk to a spot just inside the clearing, facing the tree, and open it on arrival
    const [tx, , tz] = position;
    const stand = layout ? approachPoint(layout, { x: tx, z: tz }) : { x: tx, z: tz + 1.8 };
    moveTo([stand.x, 0, stand.z], tree.id);
  };

  // Hovering brightens the tree's own colour rather than turning it green.
  const coneMaterial = {
    color: look.cone,
    roughness: 0.6,
    emissive: hovered ? look.cone : look.emissive,
    emissiveIntensity: hovered ? Math.max(look.glow, 0.35) : look.glow,
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
      {/* The tree itself: only this part droops when withered and fades when in the way */}
      <group ref={bodyRef} rotation={[0, 0, look.droop]} scale={look.scale}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.35, 1.5, 6]} />
          <meshStandardMaterial color={look.trunk} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.3, 1.4, 7]} />
          <meshStandardMaterial {...coneMaterial} />
        </mesh>
        <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.0, 1.3, 7]} />
          <meshStandardMaterial {...coneMaterial} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.7, 1.2, 7]} />
          <meshStandardMaterial {...coneMaterial} />
        </mesh>

        {sparkle && (
          <group ref={sparkleRef} position={[0, 2.8, 0]}>
            {[0, 1, 2, 3].map((i) => {
              const angle = (i * Math.PI) / 2;
              return (
                <mesh key={i} position={[Math.cos(angle) * 1.3, (i % 2) * 0.4 - 0.2, Math.sin(angle) * 1.3]}>
                  <octahedronGeometry args={[0.16, 0]} />
                  <meshStandardMaterial color={sparkle.color} emissive={sparkle.glow} emissiveIntensity={0.9} roughness={0.2} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>

      {/* Ground marks stay flat on the ground */}
      {tree.state === 'sapling' && (
        <mesh ref={saplingRingRef} position={[0, MARK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9 * look.scale, 1.2 * look.scale, 24]} />
          <meshBasicMaterial color={saplingWaiting ? '#94a3b8' : '#a7f3d0'} opacity={0.7} {...groundMark} />
        </mesh>
      )}

      {/* Byte's pick: a ring, a soft beam and a crystal */}
      {isTutorsPick && !isLocked && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MARK_Y + 0.01, 0]}>
            <ringGeometry args={[1.4, 1.8, 32]} />
            <meshBasicMaterial color="#fbbf24" opacity={0.6} {...groundMark} />
          </mesh>
          <mesh ref={beaconRef} position={[0, 10, 0]}>
            <cylinderGeometry args={[0.15, 0.45, 20, 16, 1, true]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.35} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, 4.5, 0]} rotation={[0.4, 0.4, 0]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}

      {hovered && !isLocked && !isTutorsPick && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MARK_Y + 0.01, 0]}>
          <ringGeometry args={[1.2, 1.4, 24]} />
          <meshBasicMaterial color={look.cone} opacity={0.6} {...groundMark} />
        </mesh>
      )}
    </group>
  );
});
