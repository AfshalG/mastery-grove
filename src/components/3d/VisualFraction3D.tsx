import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { FractionVisual } from '../../types/game';

interface VisualFraction3DProps {
  visual: FractionVisual;
  position: [number, number, number];
}

// Single 3D cake wedge with optional pink frosting and cherry
const CakeWedge: React.FC<{
  startAngle: number;
  lengthAngle: number;
  isShaded: boolean;
  radius?: number;
  height?: number;
}> = ({ startAngle, lengthAngle, isShaded, radius = 1.0, height = 0.45 }) => {
  const midAngle = startAngle + lengthAngle / 2;
  const cherryDist = radius * 0.65;
  const cherryX = Math.cos(midAngle) * cherryDist;
  const cherryZ = Math.sin(midAngle) * cherryDist;

  return (
    <group>
      {/* Sponge base layer */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[radius, radius, height, Math.max(8, Math.round(lengthAngle * 10)), 1, false, startAngle, lengthAngle]}
        />
        <meshStandardMaterial color={isShaded ? '#fef08a' : '#fef9c3'} roughness={0.7} />
      </mesh>

      {/* Pink Frosting layer on shaded slices */}
      {isShaded && (
        <mesh position={[0, height + 0.05, 0]} castShadow receiveShadow>
          <cylinderGeometry
            args={[
              radius * 1.02,
              radius * 1.02,
              0.1,
              Math.max(8, Math.round(lengthAngle * 10)),
              1,
              false,
              startAngle,
              lengthAngle,
            ]}
          />
          <meshStandardMaterial
            color="#f472b6"
            roughness={0.25}
            metalness={0.1}
            emissive="#fb7185"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}

      {/* Red Cherry on shaded slices */}
      {isShaded && (
        <group position={[cherryX, height + 0.15, cherryZ]}>
          <mesh castShadow>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#dc2626" roughness={0.2} metalness={0.2} emissive="#b91c1c" emissiveIntensity={0.3} />
          </mesh>
          {/* Cherry stem */}
          <mesh position={[0.03, 0.08, 0]} rotation={[0, 0, 0.35]}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Complete round 3D Cake
const SingleCake3D: React.FC<{
  parts: number;
  shaded: number;
  radius?: number;
  label?: string;
  position?: [number, number, number];
}> = ({ parts, shaded, radius = 0.95, label, position = [0, 0, 0] }) => {
  const sliceAngle = (2 * Math.PI) / parts;

  return (
    <group position={position}>
      {/* Platter base */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 1.15, radius * 1.2, 0.06, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Slices */}
      {Array.from({ length: parts }).map((_, i) => (
        <CakeWedge
          key={i}
          startAngle={i * sliceAngle}
          lengthAngle={sliceAngle * 0.98}
          isShaded={i < shaded}
          radius={radius}
        />
      ))}

      {/* Label underneath or above */}
      {label && (
        <Text
          position={[0, -0.28, radius * 0.9]}
          fontSize={0.28}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#ffffff"
          fontWeight="bold"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

// 3D Chocolate Bar
const ChocolateBar3D: React.FC<{
  parts: number;
  shaded: number;
}> = ({ parts, shaded }) => {
  const totalLength = 2.4;
  const pieceLength = totalLength / parts;
  const width = 0.9;
  const height = 0.2;

  return (
    <group position={[0, 0, 0]}>
      {/* Golden foil plate */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[totalLength + 0.15, 0.04, width + 0.15]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
      </mesh>

      {Array.from({ length: parts }).map((_, i) => {
        const isShaded = i < shaded;
        const xPos = -totalLength / 2 + (i + 0.5) * pieceLength;

        return (
          <group key={i} position={[xPos, height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[pieceLength * 0.9, height, width * 0.9]} />
              <meshStandardMaterial
                color={isShaded ? '#78350f' : '#fed7aa'}
                roughness={isShaded ? 0.3 : 0.7}
                metalness={isShaded ? 0.15 : 0}
              />
            </mesh>
            {isShaded && (
              <mesh position={[0, height / 2 + 0.02, 0]}>
                <boxGeometry args={[pieceLength * 0.6, 0.03, width * 0.6]} />
                <meshStandardMaterial color="#92400e" roughness={0.2} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const VisualFraction3D: React.FC<VisualFraction3DProps> = ({ visual, position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Floating 3D rotation
      groupRef.current.rotation.y += delta * 0.65;
    }
  });

  return (
    <group position={[position[0], position[1] + 4.2, position[2]]}>
      {/* Soft halo / floating ring beneath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[1.2, 1.45, 32]} />
        <meshBasicMaterial color="#fbcfe8" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Visual Object */}
      <group ref={groupRef}>
        {visual.kind === 'cake' && (
          <SingleCake3D parts={visual.parts} shaded={visual.shaded} />
        )}

        {visual.kind === 'two-cakes' && (
          <group>
            <SingleCake3D
              parts={visual.left.parts}
              shaded={visual.left.shaded}
              radius={0.7}
              label={`${visual.left.shaded}/${visual.left.parts}`}
              position={[-1.15, 0, 0]}
            />
            <SingleCake3D
              parts={visual.right.parts}
              shaded={visual.right.shaded}
              radius={0.7}
              label={`${visual.right.shaded}/${visual.right.parts}`}
              position={[1.15, 0, 0]}
            />
          </group>
        )}

        {visual.kind === 'bar' && (
          <ChocolateBar3D parts={visual.parts} shaded={visual.shaded} />
        )}
      </group>
    </group>
  );
};
