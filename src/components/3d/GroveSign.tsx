import React from 'react';
import { Text } from '@react-three/drei';
import { ConceptData } from '../../types/game';

interface GroveSignProps {
  concept: ConceptData;
  position: [number, number, number];
  /** Turns the board's front toward the trail (see GroveSpot.signRotationY). */
  rotationY?: number;
  isLocked: boolean;
  isComplete: boolean;
}

export const GroveSign: React.FC<GroveSignProps> = ({
  concept,
  position,
  rotationY = 0,
  isLocked,
  isComplete,
}) => {
  const titleText = isLocked
    ? `🔒 ${concept.questName}`
    : isComplete
    ? `✓ ${concept.questName}`
    : concept.questName;

  const textColor = isLocked ? '#e2e8f0' : isComplete ? '#a7f3d0' : '#fef3c7';
  const boardColor = isLocked ? '#475569' : isComplete ? '#065f46' : '#854d0e';
  const outlineColor = isLocked ? '#0f172a' : isComplete ? '#022c22' : '#291305';

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Wooden Sign Post */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 3.6, 8]} />
        <meshStandardMaterial color={isLocked ? '#334155' : '#5c3214'} roughness={0.9} />
      </mesh>

      {/* Main Sign Board */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <boxGeometry args={[4.2, 1.15, 0.22]} />
        <meshStandardMaterial color={boardColor} roughness={0.7} />
      </mesh>

      {/* Sign Board Border Rim */}
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[4.3, 1.25, 0.18]} />
        <meshStandardMaterial color={isLocked ? '#1e293b' : '#451a03'} roughness={0.9} />
      </mesh>

      {/* Metal Bolts */}
      <mesh position={[-1.85, 3.3, 0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>
      <mesh position={[1.85, 3.3, 0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>
      <mesh position={[-1.85, 3.3, -0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>
      <mesh position={[1.85, 3.3, -0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>

      {/* Front Face Text (large readable drei Text) */}
      <Text
        position={[0, 3.3, 0.125]}
        fontSize={0.34}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={3.8}
        textAlign="center"
        fontWeight="bold"
        outlineWidth={0.02}
        outlineColor={outlineColor}
      >
        {titleText}
      </Text>

      {/* Back Face Text (Rotated 180 degrees so it reads properly from the other side) */}
      <Text
        position={[0, 3.3, -0.125]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.34}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={3.8}
        textAlign="center"
        fontWeight="bold"
        outlineWidth={0.02}
        outlineColor={outlineColor}
      >
        {titleText}
      </Text>

    </group>
  );
};
