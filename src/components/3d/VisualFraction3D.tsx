import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FractionVisual } from '../../types/game';
import { FONT_3D } from './fonts';

interface VisualFraction3DProps {
  visual: FractionVisual;
  position: [number, number, number];
}

// Floats above the treetop and above Byte's crystal (which sits at 4.5).
const FLOAT_HEIGHT = 5.4;
const SPONGE_HEIGHT = 0.45;
const SLICE_GAP = 0.04; // radians between slices, so each one reads as its own piece

/** A solid wedge of a round cake. Open cylinder sectors used to show the cake as hollow from the side. */
function wedgeGeometry(radius: number, height: number, start: number, length: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
  shape.absarc(0, 0, radius, start, start + length, false);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: Math.max(4, Math.round(length * 16)),
  });
  geo.rotateX(-Math.PI / 2); // extrude upward; a shape angle θ ends up at (cos θ, -sin θ) in x/z
  return geo;
}

const Spinner: React.FC<{ speed?: number; children: React.ReactNode }> = ({ speed = 0.65, children }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
};

const SingleCake3D: React.FC<{ parts: number; shaded: number; radius?: number }> = ({ parts, shaded, radius = 0.95 }) => {
  const slices = useMemo(() => {
    const step = (2 * Math.PI) / parts;
    return Array.from({ length: parts }, (_, i) => {
      const start = i * step + SLICE_GAP / 2;
      const length = step - SLICE_GAP;
      const mid = start + length / 2;
      return {
        sponge: wedgeGeometry(radius, SPONGE_HEIGHT, start, length),
        icing: wedgeGeometry(radius * 1.02, 0.1, start, length),
        cherry: [Math.cos(mid) * radius * 0.65, SPONGE_HEIGHT + 0.18, -Math.sin(mid) * radius * 0.65] as [number, number, number],
      };
    });
  }, [parts, radius]);

  useEffect(
    () => () =>
      slices.forEach((s) => {
        s.sponge.dispose();
        s.icing.dispose();
      }),
    [slices]
  );

  return (
    <group>
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 1.15, radius * 1.2, 0.06, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
      </mesh>
      {slices.map((s, i) => {
        const isShaded = i < shaded;
        return (
          <group key={i}>
            <mesh geometry={s.sponge} castShadow receiveShadow>
              <meshStandardMaterial color={isShaded ? '#fef08a' : '#fef9c3'} roughness={0.7} />
            </mesh>
            {isShaded && (
              <>
                <mesh geometry={s.icing} position={[0, SPONGE_HEIGHT, 0]} castShadow>
                  <meshStandardMaterial color="#f472b6" roughness={0.25} metalness={0.1} emissive="#fb7185" emissiveIntensity={0.2} />
                </mesh>
                <mesh position={s.cherry} castShadow>
                  <sphereGeometry args={[0.08, 12, 12]} />
                  <meshStandardMaterial color="#dc2626" roughness={0.2} metalness={0.2} emissive="#b91c1c" emissiveIntensity={0.3} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

const ChocolateBar3D: React.FC<{ parts: number; shaded: number }> = ({ parts, shaded }) => {
  const totalLength = 2.4;
  const pieceLength = totalLength / parts;
  const width = 0.9;
  const height = 0.2;

  return (
    <group>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[totalLength + 0.15, 0.04, width + 0.15]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: parts }).map((_, i) => {
        const isShaded = i < shaded;
        return (
          <group key={i} position={[-totalLength / 2 + (i + 0.5) * pieceLength, height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[pieceLength * 0.9, height, width * 0.9]} />
              <meshStandardMaterial color={isShaded ? '#78350f' : '#fed7aa'} roughness={isShaded ? 0.3 : 0.7} metalness={isShaded ? 0.15 : 0} />
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

/** A label that always faces the camera, so it never reads backwards. */
const Label: React.FC<{ text: string; position: [number, number, number] }> = ({ text, position }) => (
  <Suspense fallback={null}>
    <Billboard position={position}>
      <Text font={FONT_3D} fontSize={0.3} color="#1e293b" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#ffffff">
        {text}
      </Text>
    </Billboard>
  </Suspense>
);

export const VisualFraction3D: React.FC<VisualFraction3DProps> = ({ visual, position }) => (
  <group position={[position[0], position[1] + FLOAT_HEIGHT, position[2]]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
      <ringGeometry args={[1.2, 1.45, 32]} />
      <meshBasicMaterial color="#fbcfe8" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>

    {visual.kind === 'cake' && (
      <Spinner>
        <SingleCake3D parts={visual.parts} shaded={visual.shaded} />
      </Spinner>
    )}

    {visual.kind === 'two-cakes' && (
      <>
        {/* Each cake spins in place; the labels stay put underneath */}
        {[
          { side: visual.left, x: -1.15 },
          { side: visual.right, x: 1.15 },
        ].map(({ side, x }) => (
          <group key={x} position={[x, 0, 0]}>
            <Spinner>
              <SingleCake3D parts={side.parts} shaded={side.shaded} radius={0.7} />
            </Spinner>
            <Label text={`${side.shaded}/${side.parts}`} position={[0, -0.45, 0.8]} />
          </group>
        ))}
      </>
    )}

    {visual.kind === 'bar' && (
      <Spinner speed={0.4}>
        <ChocolateBar3D parts={visual.parts} shaded={visual.shaded} />
      </Spinner>
    )}
  </group>
);
