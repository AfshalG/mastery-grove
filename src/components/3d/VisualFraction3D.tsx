import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { FractionVisual, ServeConfig } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { damp } from '../../game/motion';
import { FONT_3D } from './fonts';

interface VisualFraction3DProps {
  visual: FractionVisual;
  position: [number, number, number];
}

// Floats just above the treetop. Byte's crystal and the lantern hide while the question is open.
const FLOAT_HEIGHT = 4.7;
const SPONGE_HEIGHT = 0.45;
const SLICE_GAP = 0.04; // radians between slices, so each one reads as its own piece

// The storybook palette (see src/index.css), so the picture over the tree matches the card below it.
const SPONGE = '#f3dca6';
const ICING = '#e46f92';
const CHERRY = '#c2493d';
const PLATE = '#fffaf0';
const PLATE_RIM = '#e3d2ad';
const CHOCOLATE = '#6b4a2b';
const CHOCOLATE_TOP = '#553a22';
const WOOD = '#c79a62';
const WOOD_DARK = '#8a6440';
const INK = '#2f2a22';
const HOVER = '#f2c14e';

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

function useSlices(parts: number, radius: number) {
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
        out: [Math.cos(mid), -Math.sin(mid)] as [number, number],
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
  return slices;
}

const Plate: React.FC<{ radius: number }> = ({ radius }) => (
  <>
    <mesh position={[0, -0.04, 0]} receiveShadow>
      <cylinderGeometry args={[radius * 1.18, radius * 1.22, 0.07, 32]} />
      <meshLambertMaterial color={PLATE} />
    </mesh>
    <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 1.08, radius * 1.18, 40]} />
      <meshBasicMaterial color={PLATE_RIM} />
    </mesh>
  </>
);

const Spinner: React.FC<{ speed?: number; children: React.ReactNode }> = ({ speed = 0.65, children }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
};

/** A cake with some slices iced: the picture for "what fraction is this?" questions. */
const SingleCake3D: React.FC<{ parts: number; shaded: number; radius?: number }> = ({ parts, shaded, radius = 0.95 }) => {
  const slices = useSlices(parts, radius);
  return (
    <group>
      <Plate radius={radius} />
      {slices.map((s, i) => {
        const iced = i < shaded;
        return (
          <group key={i}>
            <mesh geometry={s.sponge} castShadow receiveShadow>
              <meshLambertMaterial color={SPONGE} />
            </mesh>
            {iced && (
              <>
                <mesh geometry={s.icing} position={[0, SPONGE_HEIGHT, 0]} castShadow>
                  <meshLambertMaterial color={ICING} />
                </mesh>
                <mesh position={s.cherry} castShadow>
                  <sphereGeometry args={[0.08, 12, 10]} />
                  <meshLambertMaterial color={CHERRY} />
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
        <meshLambertMaterial color={PLATE_RIM} />
      </mesh>
      {Array.from({ length: parts }).map((_, i) => {
        const isShaded = i < shaded;
        return (
          <group key={i} position={[-totalLength / 2 + (i + 0.5) * pieceLength, height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[pieceLength * 0.9, height, width * 0.9]} />
              <meshLambertMaterial color={isShaded ? CHOCOLATE : SPONGE} />
            </mesh>
            {isShaded && (
              <mesh position={[0, height / 2 + 0.02, 0]}>
                <boxGeometry args={[pieceLength * 0.6, 0.03, width * 0.6]} />
                <meshLambertMaterial color={CHOCOLATE_TOP} />
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
      <Text font={FONT_3D} fontSize={0.3} color={INK} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor={PLATE}>
        {text}
      </Text>
    </Billboard>
  </Suspense>
);

const Halo: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
    <ringGeometry args={[1.2, 1.45, 32]} />
    <meshBasicMaterial color="#fdf0cc" transparent opacity={0.7} side={THREE.DoubleSide} />
  </mesh>
);

export const VisualFraction3D: React.FC<VisualFraction3DProps> = ({ visual, position }) => (
  <group position={[position[0], position[1] + FLOAT_HEIGHT, position[2]]}>
    <Halo />

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

// ---- Hands-on: serve slices of a cake, or lay planks on a bridge, right on the picture over the tree ----------

const pointer = {
  over: (e: ThreeEvent<PointerEvent>, set: () => void) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    set();
  },
  out: (set: () => void) => {
    document.body.style.cursor = 'auto';
    set();
  },
};

/** A cake the kid serves from: tapping a slice lifts it out onto the plate's edge, iced; tapping again puts it back. */
const ServeCake3D: React.FC<{ parts: number; served: number[]; onToggle: (i: number) => void; locked: boolean }> = ({ parts, served, onToggle, locked }) => {
  const radius = 0.95;
  const slices = useSlices(parts, radius);
  const refs = useRef<Array<THREE.Group | null>>([]);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame((_, dt) => {
    slices.forEach((s, i) => {
      const g = refs.current[i];
      if (!g) return;
      const out = served.includes(i) ? 1 : 0;
      g.position.x = damp(g.position.x, s.out[0] * 0.32 * out, 12, dt);
      g.position.z = damp(g.position.z, s.out[1] * 0.32 * out, 12, dt);
      g.position.y = damp(g.position.y, 0.2 * out + (hovered === i && !locked ? 0.06 : 0), 12, dt);
    });
  });

  return (
    <group>
      <Plate radius={radius} />
      {slices.map((s, i) => {
        const isServed = served.includes(i);
        return (
          <group
            key={i}
            ref={(g) => (refs.current[i] = g)}
            onClick={(e) => {
              e.stopPropagation();
              if (!locked) onToggle(i);
            }}
            onPointerOver={(e) => pointer.over(e, () => setHovered(i))}
            onPointerOut={() => pointer.out(() => setHovered((h) => (h === i ? null : h)))}
          >
            <mesh geometry={s.sponge} castShadow receiveShadow>
              <meshLambertMaterial color={SPONGE} emissive={HOVER} emissiveIntensity={hovered === i && !locked ? 0.25 : 0} />
            </mesh>
            {isServed && (
              <>
                <mesh geometry={s.icing} position={[0, SPONGE_HEIGHT, 0]} castShadow>
                  <meshLambertMaterial color={ICING} />
                </mesh>
                <mesh position={s.cherry} castShadow>
                  <sphereGeometry args={[0.08, 12, 10]} />
                  <meshLambertMaterial color={CHERRY} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

/**
 * A little arched footbridge, like the ones between groves, with a slot for every plank. Tapping a slot lays a plank
 * (it drops in); tapping a plank lifts it off again.
 */
const BuildBridge3D: React.FC<{ parts: number; laid: number[]; onToggle: (i: number) => void; locked: boolean }> = ({ parts, laid, onToggle, locked }) => {
  const half = 1.55;
  const width = 1.05;
  const arch = 0.32;
  const deck = (x: number) => arch * Math.cos((x / half) * (Math.PI / 2));
  const slots = useMemo(
    () =>
      Array.from({ length: parts }, (_, i) => {
        const x = -half + ((i + 0.5) * 2 * half) / parts;
        const slope = -arch * (Math.PI / (2 * half)) * Math.sin((x / half) * (Math.PI / 2));
        return { x, y: deck(x), tilt: Math.atan(slope) };
      }),
    [parts]
  );
  const rails = useMemo(
    () =>
      [-width / 2, width / 2].map(
        (z) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => new THREE.Vector3(-half + (k / 8) * 2 * half, deck(-half + (k / 8) * 2 * half) + 0.32, z))),
            20,
            0.035,
            6
          )
      ),
    []
  );
  useEffect(() => () => rails.forEach((g) => g.dispose()), [rails]);

  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const wasLaid = useRef<number[]>(laid);
  useFrame((_, dt) => {
    slots.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      // A plank laid since the last frame starts above its slot and drops in.
      if (laid.includes(i) && !wasLaid.current.includes(i)) m.position.y = s.y + 0.6;
      const goal = s.y + (laid.includes(i) ? 0 : 0.02) + (hovered === i && !locked ? 0.07 : 0);
      m.position.y = damp(m.position.y, goal, 14, dt);
    });
    wasLaid.current = laid;
  });

  const plankLength = ((2 * half) / parts) * 0.84;
  return (
    <group>
      {rails.map((g, i) => (
        <mesh key={`rail-${i}`} geometry={g}>
          <meshLambertMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      {[-half, half].flatMap((x) =>
        [-width / 2, width / 2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.02, z]}>
            <cylinderGeometry args={[0.045, 0.05, 0.7, 8]} />
            <meshLambertMaterial color={WOOD_DARK} />
          </mesh>
        ))
      )}
      {slots.map((s, i) => {
        const isLaid = laid.includes(i);
        return (
          <mesh
            key={i}
            ref={(m) => (refs.current[i] = m)}
            position={[s.x, s.y, 0]}
            rotation={[0, 0, s.tilt]}
            onClick={(e) => {
              e.stopPropagation();
              if (!locked) onToggle(i);
            }}
            onPointerOver={(e) => pointer.over(e, () => setHovered(i))}
            onPointerOut={() => pointer.out(() => setHovered((h) => (h === i ? null : h)))}
          >
            <boxGeometry args={[plankLength, isLaid ? 0.08 : 0.04, width - 0.1]} />
            {isLaid ? (
              <meshLambertMaterial color={WOOD} emissive={HOVER} emissiveIntensity={hovered === i && !locked ? 0.25 : 0} />
            ) : (
              <meshBasicMaterial color={hovered === i && !locked ? HOVER : PLATE} transparent opacity={hovered === i && !locked ? 0.7 : 0.4} depthWrite={false} />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * The hands-on challenge over a serve tree: the kid picks slices (or planks) here or on the card, and both show the
 * same pick. It holds still, with a gentle bob, so a slice is easy to tap.
 */
export const ServeChallenge3D: React.FC<{ config: ServeConfig; position: [number, number, number] }> = ({ config, position }) => {
  const { served, toggle, locked } = useGameStore(
    useShallow((s) => ({ served: s.servedSlices, toggle: s.toggleServeSlice, locked: s.showExplanationModal }))
  );
  const bob = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (bob.current) bob.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.05;
  });
  const unit = config.whole === 'bridge' ? 'planks' : 'slices';

  return (
    <group position={[position[0], position[1] + FLOAT_HEIGHT, position[2]]}>
      <Halo />
      <group ref={bob} rotation={[0.25, 0, 0]}>
        {config.whole === 'bridge' ? (
          <BuildBridge3D parts={config.totalSlices} laid={served} onToggle={toggle} locked={locked} />
        ) : (
          <ServeCake3D parts={config.totalSlices} served={served} onToggle={toggle} locked={locked} />
        )}
      </group>
      <Label text={`${served.length} of ${config.totalSlices} ${unit}`} position={[0, -0.75, 1.2]} />
    </group>
  );
};
