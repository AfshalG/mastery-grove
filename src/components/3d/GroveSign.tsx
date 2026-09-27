import React, { Suspense } from 'react';
import { Text } from '@react-three/drei';
import { ConceptData } from '../../types/game';
import { FONT_3D } from './fonts';

interface GroveSignProps {
  concept: ConceptData;
  position: [number, number, number];
  /** Turns the board's front toward the trail (see GroveSpot.signRotationY). */
  rotationY?: number;
  isLocked: boolean;
  isComplete: boolean;
}

const BOARD = { width: 4.2, height: 1.15, depth: 0.22, y: 3.3 };
const TEXT_WIDTH = 3.7;
// Legs stand just outside the text and end inside the board, so nothing ever crosses the grove's name.
const LEG_X = 1.95;
const LEG_TOP = BOARD.y - BOARD.height / 2 + 0.05;

export const GroveSign: React.FC<GroveSignProps> = ({ concept, position, rotationY = 0, isLocked, isComplete }) => {
  const textColor = isLocked ? '#e2e8f0' : isComplete ? '#a7f3d0' : '#fef3c7';
  const boardColor = isLocked ? '#475569' : isComplete ? '#065f46' : '#854d0e';
  const outlineColor = isLocked ? '#0f172a' : isComplete ? '#022c22' : '#291305';
  const woodColor = isLocked ? '#334155' : '#5c3214';
  const status = isLocked ? 'LOCKED' : isComplete ? 'DONE' : null;

  // Readable from both sides: the back copy is the front copy turned half a circle.
  const faces = [0, Math.PI];
  const faceZ = BOARD.depth / 2 + 0.01;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * LEG_X, LEG_TOP / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.11, LEG_TOP, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, BOARD.y, 0]} castShadow>
        <boxGeometry args={[BOARD.width, BOARD.height, BOARD.depth]} />
        <meshStandardMaterial color={boardColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, BOARD.y, 0]}>
        <boxGeometry args={[BOARD.width + 0.1, BOARD.height + 0.1, BOARD.depth - 0.04]} />
        <meshStandardMaterial color={isLocked ? '#1e293b' : '#451a03'} roughness={0.9} />
      </mesh>

      {/* A small plaque hangs under the board for locked and finished groves */}
      {status && (
        <group position={[0, BOARD.y - BOARD.height / 2 - 0.42, 0]}>
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 0.24, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 4]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.4, 0.1]} />
            <meshStandardMaterial color={isLocked ? '#1e293b' : '#14532d'} roughness={0.8} />
          </mesh>
        </group>
      )}

      <Suspense fallback={null}>
        {faces.map((turn) => (
          <group key={turn} rotation={[0, turn, 0]}>
            <Text
              font={FONT_3D}
              position={[0, BOARD.y, faceZ]}
              fontSize={0.34}
              color={textColor}
              anchorX="center"
              anchorY="middle"
              maxWidth={TEXT_WIDTH}
              textAlign="center"
              outlineWidth={0.02}
              outlineColor={outlineColor}
            >
              {concept.questName}
            </Text>
            {status && (
              <Text
                font={FONT_3D}
                position={[0, BOARD.y - BOARD.height / 2 - 0.42, 0.06]}
                fontSize={0.2}
                letterSpacing={0.12}
                color={isLocked ? '#cbd5e1' : '#bbf7d0'}
                anchorX="center"
                anchorY="middle"
              >
                {status}
              </Text>
            )}
          </group>
        ))}
      </Suspense>
    </group>
  );
};
