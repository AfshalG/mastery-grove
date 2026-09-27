import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { sounds } from '../../utils/audio';

export const StudentAvatar: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Group>(null);

  const {
    avatarPosition,
    setAvatarPosition,
    targetPosition,
    targetTreeToOpen,
    trees,
    openTree,
    moveTo,
    selectedTree,
  } = useGameStore();

  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const lastStepSound = useRef<number>(0);
  const hopStartTime = useRef<number>(-1);
  const bodyRef = useRef<THREE.Group>(null);

  const triggerHop = () => {
    hopStartTime.current = -2; // flag to initialize clock time on next frame
    sounds.playStep();
  };

  // Keyboard and hop listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in an input or modal is active
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        selectedTree !== null
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        triggerHop();
        return;
      }

      const key = e.key.toLowerCase();
      if (
        [
          'w', 'a', 's', 'd',
          'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        ].includes(key)
      ) {
        setKeys((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeys((prev) => ({ ...prev, [key]: false }));
    };

    const handleCustomHop = () => {
      if (selectedTree === null) {
        triggerHop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('avatar-hop', handleCustomHop);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('avatar-hop', handleCustomHop);
    };
  }, [selectedTree]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Handle hop animation (~0.5s bounce)
    if (hopStartTime.current === -2) {
      hopStartTime.current = state.clock.elapsedTime;
    }
    let hopY = 0;
    if (hopStartTime.current >= 0) {
      const elapsed = state.clock.elapsedTime - hopStartTime.current;
      const hopDuration = 0.5;
      if (elapsed < hopDuration) {
        hopY = Math.sin((elapsed / hopDuration) * Math.PI) * 0.85;
      } else {
        hopStartTime.current = -1;
      }
    }
    if (bodyRef.current) {
      bodyRef.current.position.y = hopY;
    }

    let moveX = 0;
    let moveZ = 0;

    // Check keyboard input first
    const forward = keys['w'] || keys['arrowup'];
    const backward = keys['s'] || keys['arrowdown'];
    const left = keys['a'] || keys['arrowleft'];
    const right = keys['d'] || keys['arrowright'];

    if (forward) moveZ -= 1;
    if (backward) moveZ += 1;
    if (left) moveX -= 1;
    if (right) moveX += 1;

    const isKeyboardMoving = moveX !== 0 || moveZ !== 0;

    let currentPos = new THREE.Vector3(avatarPosition[0], avatarPosition[1], avatarPosition[2]);
    let isMoving = false;
    const speed = 7.5;

    if (isKeyboardMoving && !selectedTree) {
      // Manual keyboard navigation overrides targetPosition
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      currentPos.addScaledVector(dir, speed * delta);
      isMoving = true;

      // Rotate avatar towards keyboard direction
      const targetRotation = Math.atan2(dir.x, dir.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        0.2
      );

      setAvatarPosition([currentPos.x, currentPos.y, currentPos.z]);
    } else if (targetPosition && !selectedTree) {
      // Tap-to-move / Click-to-move interpolation
      const targetVec = new THREE.Vector3(targetPosition[0], 0, targetPosition[2]);
      const diff = new THREE.Vector3().subVectors(targetVec, currentPos);
      diff.y = 0;
      const distance = diff.length();

      if (distance > 0.25) {
        isMoving = true;
        const moveDist = Math.min(speed * delta, distance);
        const dir = diff.normalize();
        currentPos.addScaledVector(dir, moveDist);

        const targetRotation = Math.atan2(dir.x, dir.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          targetRotation,
          0.25
        );

        setAvatarPosition([currentPos.x, currentPos.y, currentPos.z]);
      } else {
        // Arrived at target
        setAvatarPosition([targetPosition[0], 0, targetPosition[2]]);
        if (targetTreeToOpen) {
          const tree = trees.find((t) => t.id === targetTreeToOpen);
          if (tree) {
            openTree(tree);
          }
        }
        moveTo([targetPosition[0], 0, targetPosition[2]], undefined);
      }
    }

    // Update avatar root position
    groupRef.current.position.set(avatarPosition[0], 0, avatarPosition[2]);

    // Footstep audio cues
    if (isMoving && state.clock.elapsedTime - lastStepSound.current > 0.32) {
      sounds.playStep();
      lastStepSound.current = state.clock.elapsedTime;
    }

    // Walking limbs animation
    if (isMoving) {
      const walkCycle = state.clock.elapsedTime * 12;
      const swing = Math.sin(walkCycle) * 0.55;

      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing;

      if (torsoRef.current) {
        torsoRef.current.position.y = 0.95 + Math.abs(Math.sin(walkCycle)) * 0.08;
      }
    } else {
      // Idle pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.95 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
    }
  });

  return (
    <group ref={groupRef} position={[avatarPosition[0], 0, avatarPosition[2]]}>
      {/* Target Marker on ground if moving */}
      {targetPosition && (
        <mesh position={[targetPosition[0] - avatarPosition[0], 0.05, targetPosition[2] - avatarPosition[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.45, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Ground Shadow - Stays firmly on the ground when hopping */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#0b1712" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Hopping Body Group */}
      <group ref={bodyRef}>
        {/* Torso & Head Hierarchy */}
        <group ref={torsoRef} position={[0, 0.95, 0]}>
          {/* Sweater Torso */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.65, 0.7, 0.38]} />
            <meshStandardMaterial color="#2563eb" roughness={0.7} />
          </mesh>

          {/* School Backpack */}
          <mesh castShadow position={[0, 0.02, -0.25]}>
            <boxGeometry args={[0.48, 0.52, 0.22]} />
            <meshStandardMaterial color="#dc2626" roughness={0.8} />
          </mesh>
          {/* Backpack pocket */}
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

            {/* Student Cap */}
            <mesh position={[0, 0.28, 0]}>
              <boxGeometry args={[0.56, 0.12, 0.52]} />
              <meshStandardMaterial color="#1e40af" roughness={0.6} />
            </mesh>
            {/* Cap Visor */}
            <mesh position={[0, 0.24, 0.32]}>
              <boxGeometry args={[0.52, 0.05, 0.25]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
            </mesh>

            {/* Eyes */}
            <mesh position={[-0.14, 0.04, 0.25]}>
              <boxGeometry args={[0.08, 0.09, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} />
            </mesh>
            <mesh position={[0.14, 0.04, 0.25]}>
              <boxGeometry args={[0.08, 0.09, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} />
            </mesh>
          </group>

          {/* Left Arm */}
          <mesh ref={leftArmRef} castShadow position={[-0.43, 0.05, 0]}>
            <boxGeometry args={[0.18, 0.6, 0.22]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.7} />
          </mesh>

          {/* Right Arm */}
          <mesh ref={rightArmRef} castShadow position={[0.43, 0.05, 0]}>
            <boxGeometry args={[0.18, 0.6, 0.22]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.7} />
          </mesh>
        </group>

        {/* Left Leg */}
        <mesh ref={leftLegRef} castShadow position={[-0.18, 0.3, 0]}>
          <boxGeometry args={[0.22, 0.6, 0.26]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>

        {/* Right Leg */}
        <mesh ref={rightLegRef} castShadow position={[0.18, 0.3, 0]}>
          <boxGeometry args={[0.22, 0.6, 0.26]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};
