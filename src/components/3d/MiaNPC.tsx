import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { MiaTeachSpot } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface MiaNPCProps {
  spot: MiaTeachSpot;
  isUnlocked: boolean;
}

export const MiaNPC: React.FC<MiaNPCProps> = ({ spot, isUnlocked }) => {
  const { openMiaTeachModal, teachBackCompletedGroves } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isCompleted = teachBackCompletedGroves.includes(spot.groveIndex);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    if (isCompleted) {
      // Mia hops happily!
      const hop = Math.abs(Math.sin(time * 6)) * 0.45;
      groupRef.current.position.y = spot.position[1] + hop;
      groupRef.current.rotation.y = Math.sin(time * 3) * 0.35;
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(time * 4) * 0.15;
      }
    } else {
      // Puzzled idle: gentle sway with tilted head
      groupRef.current.position.y = spot.position[1] + Math.sin(time * 1.8) * 0.04;
      if (headRef.current) {
        headRef.current.rotation.z = 0.22 + Math.sin(time * 2) * 0.08; // Puzzled tilt
      }
    }
  });

  if (!isUnlocked) return null;

  return (
    <group
      ref={groupRef}
      position={spot.position}
      onClick={(e) => {
        e.stopPropagation();
        openMiaTeachModal(spot.groveIndex);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Stone Pedestal / Classroom Desk spot */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[0.9, 1.05, 0.16, 24]} />
        <meshStandardMaterial
          color={isCompleted ? '#065f46' : hovered ? '#4338ca' : '#1e1b4b'}
          roughness={0.7}
        />
      </mesh>

      {/* Glowing ring on ground */}
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 24]} />
        <meshBasicMaterial
          color={isCompleted ? '#10b981' : hovered ? '#a855f7' : '#818cf8'}
          transparent
          opacity={hovered ? 0.9 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mia Character Model */}
      <group position={[0, 0.16, 0]}>
        {/* Legs / Shoes */}
        <mesh position={[-0.14, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.5, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.14, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.5, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Yellow boots */}
        <mesh position={[-0.14, 0.08, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.16, 0.22]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} />
        </mesh>
        <mesh position={[0.14, 0.08, 0.04]} castShadow>
          <boxGeometry args={[0.16, 0.16, 0.22]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} />
        </mesh>

        {/* Torso / Lavender Hoodie */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.28, 0.65, 16]} />
          <meshStandardMaterial color={isCompleted ? '#10b981' : '#8b5cf6'} roughness={0.5} />
        </mesh>

        {/* Backpack on back */}
        <mesh position={[0, 0.82, -0.22]} castShadow>
          <boxGeometry args={[0.32, 0.4, 0.18]} />
          <meshStandardMaterial color="#ec4899" roughness={0.6} />
        </mesh>

        {/* Scarf / Collar */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <torusGeometry args={[0.2, 0.07, 12, 16]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.5} />
        </mesh>

        {/* Head with Puzzled Tilt */}
        <group ref={headRef} position={[0, 1.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 20, 20]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.5} />
          </mesh>

          {/* Hair: Bob style with bangs */}
          <mesh position={[0, 0.08, -0.05]} castShadow>
            <sphereGeometry args={[0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.8} />
          </mesh>

          {/* Hair Bun / Tuft */}
          <mesh position={[0, 0.32, -0.08]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.8} />
          </mesh>

          {/* Eyes (big friendly eyes) */}
          <mesh position={[-0.09, 0.02, 0.23]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.09, 0.02, 0.23]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>

          {/* Question mark or Confetti sparkler above head */}
          {isCompleted ? (
            <group position={[0, 0.55, 0]}>
              <mesh>
                <octahedronGeometry args={[0.14]} />
                <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.8} />
              </mesh>
            </group>
          ) : (
            <group position={[0, 0.58, 0]}>
              <Text
                fontSize={0.4}
                color="#f59e0b"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                outlineWidth={0.04}
                outlineColor="#78350f"
              >
                ?
              </Text>
            </group>
          )}
        </group>
      </group>

      {/* Floating 3D Name Tag */}
      <Text
        position={[0, 2.35, 0]}
        fontSize={0.24}
        color={isCompleted ? '#a7f3d0' : '#e0e7ff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#0f172a"
        fontWeight="bold"
      >
        {isCompleted ? 'Mia (Helped! ✓)' : 'Mia (Classmate)'}
      </Text>

      {/* Interactive Speech Bubble using Html */}
      <Html
        position={[0, 2.85, 0]}
        center
        distanceFactor={14}
        zIndexRange={[10, 20]}
        className="pointer-events-auto select-none"
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            openMiaTeachModal(spot.groveIndex);
          }}
          className={`cursor-pointer transition-transform duration-200 hover:scale-105 px-3 py-2 rounded-2xl shadow-xl border backdrop-blur-md max-w-[220px] text-center ${
            isCompleted
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100'
              : hovered
              ? 'bg-indigo-950/95 border-amber-400 text-amber-200 ring-2 ring-amber-400/50'
              : 'bg-slate-900/90 border-slate-700 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
              {isCompleted ? 'Mia Understood!' : 'Help Mia Understand'}
            </span>
          </div>
          <p className="text-[11px] italic font-medium leading-tight">
            {isCompleted
              ? '“Thank you for explaining this so clearly to me!”'
              : `“${spot.puzzledThought}”`}
          </p>
          {!isCompleted && (
            <span className="mt-1.5 inline-block text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700/80">
              Tap to teach Mia →
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};
