import React, { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { ConfidenceLevel } from '../../types/game';
import { FONT_3D } from './fonts';

interface StoneProps {
  index: number;
  letter: string;
  choiceText: string;
  position: [number, number, number];
  isActive: boolean;
  onSelect: (index: number) => void;
  isConfirming: boolean;
  confirmProgress: number; // 0 to 1
}

const AnswerStone: React.FC<StoneProps> = ({
  index,
  letter,
  choiceText,
  position,
  isActive,
  onSelect,
  isConfirming,
  confirmProgress,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const currentY = useRef(-0.6);
  const targetY = isActive ? 0.12 : -0.6;
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    // Smooth rise and sink animation
    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 8, delta);
    if (meshRef.current) {
      meshRef.current.position.y = currentY.current;
    }
  });

  const displayText = choiceText.length > 28 ? choiceText.slice(0, 26) + '…' : choiceText;

  return (
    <group position={[position[0], 0, position[2]]}>
      <group
        ref={meshRef}
        position={[0, currentY.current, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(index);
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
        {/* Stepping stone base */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.15, 0.24, 24]} />
          <meshStandardMaterial
            color={hovered || isConfirming ? '#475569' : '#334155'}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Stone top carving / rim */}
        <mesh position={[0, 0.125, 0]} receiveShadow>
          <cylinderGeometry args={[0.95, 0.95, 0.02, 24]} />
          <meshStandardMaterial
            color={isConfirming ? '#10b981' : hovered ? '#f59e0b' : '#1e293b'}
            roughness={0.6}
            emissive={isConfirming ? '#059669' : hovered ? '#d97706' : '#000000'}
            emissiveIntensity={isConfirming ? 0.6 : hovered ? 0.3 : 0}
          />
        </mesh>

        {/* 0.6s Confirmation Ring (Fills up when stepped on or tapped) */}
        {isConfirming && (
          <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.85, 1.05, 32, 1, 0, confirmProgress * Math.PI * 2]} />
            <meshBasicMaterial color="#34d399" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Hover / Active glow ring on ground */}
        {(hovered || isConfirming) && (
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.35, 32]} />
            <meshBasicMaterial color={isConfirming ? '#10b981' : '#fbbf24'} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Letter Badge (A, B, C, D) floating above stone */}
        <group position={[0, 0.75, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial
              color={isConfirming ? '#10b981' : '#f59e0b'}
              emissive={isConfirming ? '#059669' : '#d97706'}
              emissiveIntensity={0.6}
            />
          </mesh>
          <Suspense fallback={null}>
            <Text font={FONT_3D} position={[0, 0, 0.28]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="middle">
              {letter}
            </Text>
          </Suspense>
        </group>

        {/* Floating Choice Text snippet */}
        <Suspense fallback={null}>
          <Text
            font={FONT_3D}
            position={[0, 1.25, 0]}
            fontSize={0.22}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.4}
            textAlign="center"
            outlineWidth={0.03}
            outlineColor="#0f172a"
          >
            {displayText}
          </Text>
        </Suspense>
      </group>
    </group>
  );
};

export const AnswerStones: React.FC = () => {
  const {
    selectedTree,
    avatarPosition,
    answerTreeQuestion,
    selectedConfidence,
    setSaplingNotice,
  } = useGameStore();

  const [activeStoneIndex, setActiveStoneIndex] = useState<number | null>(null);
  const confirmTimerRef = useRef<number>(0);
  const [confirmProgress, setConfirmProgress] = useState(0);

  const isOpen = !!selectedTree && (!selectedTree.kind || selectedTree.kind === 'mcq') && selectedTree.choices.length > 0;
  const treePos = selectedTree?.position || [0, 0, 0];

  // 4 stone positions around the tree at radius 2.8
  const stonePositions: [number, number, number][] = [
    [treePos[0] - 2.2, 0, treePos[2] + 1.6], // A: West-South
    [treePos[0] + 2.2, 0, treePos[2] + 1.6], // B: East-South
    [treePos[0] - 2.4, 0, treePos[2] - 1.4], // C: West-North
    [treePos[0] + 2.4, 0, treePos[2] - 1.4], // D: East-North
  ];

  const letters = ['A', 'B', 'C', 'D'];

  const handleStoneClickOrStep = (index: number) => {
    if (!isOpen || !selectedTree) return;

    if (!selectedConfidence) {
      setSaplingNotice('Pick your confidence first in the question card! (Not sure / Fairly sure / Very sure)');
      return;
    }

    if (activeStoneIndex === index) return;
    setActiveStoneIndex(index);
    confirmTimerRef.current = 0;
    setConfirmProgress(0);
  };

  useFrame((_, delta) => {
    if (!isOpen || !selectedTree) {
      if (activeStoneIndex !== null) {
        setActiveStoneIndex(null);
        setConfirmProgress(0);
      }
      return;
    }

    // Check proximity of avatar to stones (walking onto a stone)
    let closestStone = -1;
    let minDistance = 1.05; // Trigger radius

    stonePositions.forEach((pos, idx) => {
      const dist = Math.hypot(avatarPosition[0] - pos[0], avatarPosition[2] - pos[2]);
      if (dist < minDistance) {
        closestStone = idx;
      }
    });

    if (closestStone !== -1) {
      if (!selectedConfidence) {
        setSaplingNotice('Pick your confidence first in the question card!');
      } else if (activeStoneIndex !== closestStone) {
        setActiveStoneIndex(closestStone);
        confirmTimerRef.current = 0;
        setConfirmProgress(0);
      }
    } else if (activeStoneIndex !== null && closestStone === -1) {
      // Walked away from stone
      // If triggered by click, we keep it, but if walked off, reset
    }

    // 0.6s Confirmation Ring fill
    if (activeStoneIndex !== null) {
      confirmTimerRef.current += delta;
      const progress = Math.min(1, confirmTimerRef.current / 0.6);
      setConfirmProgress(progress);

      if (progress >= 1) {
        // Complete confirmation!
        const choiceIdx = activeStoneIndex;
        setActiveStoneIndex(null);
        setConfirmProgress(0);
        answerTreeQuestion(selectedTree.id, choiceIdx, selectedConfidence as ConfidenceLevel);
      }
    }
  });

  if (!isOpen) return null;

  return (
    <group>
      {selectedTree.choices.map((choice, i) => {
        if (i >= 4) return null;
        return (
          <AnswerStone
            key={i}
            index={i}
            letter={letters[i]}
            choiceText={choice}
            position={stonePositions[i]}
            isActive={isOpen}
            onSelect={handleStoneClickOrStep}
            isConfirming={activeStoneIndex === i}
            confirmProgress={activeStoneIndex === i ? confirmProgress : 0}
          />
        );
      })}
    </group>
  );
};
