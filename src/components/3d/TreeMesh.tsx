import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeData } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';

interface TreeMeshProps {
  tree: TreeData;
  isLocked: boolean;
}

export const TreeMesh: React.FC<TreeMeshProps> = ({ tree, isLocked }) => {
  const groupRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const sparkleRef = useRef<THREE.Group>(null);
  const saplingRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const opacityRef = useRef(1.0);

  const { tutorBeaconTreeId, moveTo, setSaplingNotice, avatarPosition } = useGameStore();
  const isTutorsPick = tutorBeaconTreeId === tree.id;

  const position = tree.position || [0, 0, 0];
  const isSaplingSpacingLocked = tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2;

  useFrame((state, delta) => {
    if (beaconRef.current && isTutorsPick) {
      beaconRef.current.rotation.y += delta * 1.5;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      beaconRef.current.scale.set(pulse, 1, pulse);
    }

    if (sparkleRef.current && (tree.state === 'regrown' || tree.isTargeted || hovered)) {
      sparkleRef.current.rotation.y += delta * 2;
    }

    if (saplingRingRef.current && tree.state === 'sapling') {
      const ringPulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      saplingRingRef.current.scale.set(ringPulse, ringPulse, ringPulse);
    }

    // Check if tree is between camera and avatar
    const camPos = state.camera.position;
    const avPos = new THREE.Vector3(avatarPosition[0], avatarPosition[1] + 1.0, avatarPosition[2]);
    const treeCenter = new THREE.Vector3(position[0], 1.8, position[2]);

    const camToAv = new THREE.Vector3().subVectors(avPos, camPos);
    const segLenSq = camToAv.lengthSq();
    let isBetween = false;

    if (segLenSq > 0.01) {
      const camToTree = new THREE.Vector3().subVectors(treeCenter, camPos);
      const proj = camToTree.dot(camToAv) / segLenSq;
      if (proj > 0.05 && proj < 0.95) {
        const closestPoint = new THREE.Vector3().copy(camPos).addScaledVector(camToAv, proj);
        const dx = treeCenter.x - closestPoint.x;
        const dz = treeCenter.z - closestPoint.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 2.0 * 2.0) {
          isBetween = true;
        }
      }
    }

    const targetOpacity = isBetween ? 0.3 : 1.0;
    if (Math.abs(opacityRef.current - targetOpacity) > 0.01) {
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 10);
      if (groupRef.current) {
        groupRef.current.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child !== beaconRef.current &&
            child !== saplingRingRef.current
          ) {
            const mat = child.material;
            if (mat && !(mat instanceof Array)) {
              mat.transparent = true;
              mat.opacity = opacityRef.current;
            }
          }
        });
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isLocked) return;

    if (isSaplingSpacingLocked) {
      const remaining = 2 - (tree.answersSinceMiss ?? 0);
      setSaplingNotice(`Come back later: Answer ${remaining} more question${remaining > 1 ? 's' : ''} to unlock this review sapling! ⏳`);
      return;
    }

    // Walk close to the tree and open it upon arrival
    const [tx, ty, tz] = position;
    const walkTarget: [number, number, number] = [tx, 0, tz + 1.8];
    moveTo(walkTarget, tree.id);
  };

  // Color & Geometry styling based on state and tags
  let coneColor = '#2d6a4f'; // unanswered: normal green
  let trunkColor = '#5c4033';
  let emissiveColor = '#000000';
  let emissiveIntensity = 0;
  let scale = 1;
  let tiltZ = 0;

  if (isLocked) {
    coneColor = '#6c757d'; // locked: greyed out
    trunkColor = '#495057';
  } else if (tree.isMemorySprout) {
    // "Memory Sprout" retention check question tree (cyan/teal glow)
    coneColor = '#0d9488';
    emissiveColor = '#2dd4bf';
    emissiveIntensity = 0.5;
    scale = 0.85;
  } else if (tree.isTargeted) {
    // "Made for you" targeted question tree (pink glow)
    coneColor = '#db2777';
    emissiveColor = '#f472b6';
    emissiveIntensity = 0.45;
  } else if (tree.isTeacherDeployed) {
    // "From your teacher" focus tree (purple glow)
    coneColor = '#7c3aed';
    emissiveColor = '#c084fc';
    emissiveIntensity = 0.45;
  } else if (tree.state === 'healthy') {
    coneColor = '#40916c'; // bright green
  } else if (tree.state === 'withered') {
    coneColor = '#8c6239'; // withered: brown, bare, drooping
    trunkColor = '#5d4037';
    tiltZ = 0.15; // droop
  } else if (tree.state === 'sapling') {
    coneColor = isSaplingSpacingLocked ? '#64748b' : '#95d5b2'; // small, light green or muted if locked
    scale = 0.55;
  } else if (tree.state === 'regrown') {
    coneColor = '#10b981'; // vivid green
    emissiveColor = '#059669';
    emissiveIntensity = 0.25;
  }

  return (
    <group
      ref={groupRef}
      position={[position[0], 0, position[2]]}
      rotation={[0, 0, tiltZ]}
      scale={scale}
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
      {/* Trunk */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.35, 1.5, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.8} />
      </mesh>

      {/* Foliage - 3 Stacked Cones */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.3, 1.4, 7]} />
        <meshStandardMaterial
          color={hovered ? (tree.isTargeted ? '#f472b6' : '#52b788') : coneColor}
          roughness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.0, 1.3, 7]} />
        <meshStandardMaterial
          color={hovered ? (tree.isTargeted ? '#f472b6' : '#52b788') : coneColor}
          roughness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0, 3.3, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.7, 1.2, 7]} />
        <meshStandardMaterial
          color={hovered ? (tree.isTargeted ? '#f472b6' : '#52b788') : coneColor}
          roughness={0.6}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Sapling Glowing Ring */}
      {tree.state === 'sapling' && (
        <mesh ref={saplingRingRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.2, 24]} />
          <meshBasicMaterial
            color={isSaplingSpacingLocked ? '#94a3b8' : '#a7f3d0'}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Regrown, Targeted, Teacher Deployed, or Memory Sprout Sparkles */}
      {(tree.state === 'regrown' || tree.isTargeted || tree.isTeacherDeployed || tree.isMemorySprout) && (
        <group ref={sparkleRef} position={[0, 2.8, 0]}>
          {[0, 1, 2, 3].map((i) => {
            const angle = (i * Math.PI) / 2;
            const radius = 1.3;
            const sparkleColor = tree.isMemorySprout
              ? '#5eead4'
              : tree.isTargeted
              ? '#f472b6'
              : tree.isTeacherDeployed
              ? '#c084fc'
              : '#fef08a';
            const emissiveSparkle = tree.isMemorySprout
              ? '#14b8a6'
              : tree.isTargeted
              ? '#ec4899'
              : tree.isTeacherDeployed
              ? '#a855f7'
              : '#facc15';
            return (
              <mesh key={i} position={[Math.cos(angle) * radius, (i % 2) * 0.4 - 0.2, Math.sin(angle) * radius]}>
                <octahedronGeometry args={[0.16, 0]} />
                <meshStandardMaterial
                  color={sparkleColor}
                  emissive={emissiveSparkle}
                  emissiveIntensity={0.9}
                  roughness={0.2}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Tutor's Pick Golden Beacon */}
      {isTutorsPick && !isLocked && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[1.4, 1.8, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>

          <mesh ref={beaconRef} position={[0, 10, 0]}>
            <cylinderGeometry args={[0.15, 0.45, 20, 16, 1, true]} />
            <meshBasicMaterial
              color="#fde047"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh position={[0, 4.5, 0]} rotation={[0.4, 0.4, 0]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={0.9}
              roughness={0.1}
            />
          </mesh>
        </group>
      )}

      {/* Hover Ring Indicator */}
      {hovered && !isLocked && !isTutorsPick && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.2, 1.4, 24]} />
          <meshBasicMaterial
            color={tree.isTargeted ? '#ec4899' : '#34d399'}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
