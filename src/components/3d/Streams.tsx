import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { LAYOUT, groundHeight, type ForestLayout, type Stream } from '../../game/layout';
import { bridgeProgress, bridgeTreesToGo, openBridges } from '../../game/missions';
import { skinFor, type Skin } from '../../game/skins';
import { FONT_3D } from './fonts';

const WATER_Y = 0.085;
const BANK_Y = 0.07;
const BANK_WIDTH = 0.7;
const PLANKS = 11;
const GLINTS = 36;
const RAIL_HEIGHT = 0.6;
const decal = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };

/** The streams between groves, each with a bridge whose planks are laid as the kid learns. */
export const Streams: React.FC = () => {
  const { layout, world, trees, moveTo, getUnlockedConcepts } = useGameStore(
    useShallow((s) => ({ layout: s.layout, world: s.world, trees: s.trees, moveTo: s.moveTo, getUnlockedConcepts: s.getUnlockedConcepts }))
  );
  if (!layout || !world || layout.streams.length === 0) return null;
  const skin = skinFor(world.subject);
  const unlocked = getUnlockedConcepts();
  const open = openBridges(layout, unlocked);

  return (
    <>
      {layout.streams.map((s, i) => {
        const past = world.concepts.find((c) => c.id === layout.groves[s.beforeGrove]?.conceptId);
        return (
          <group key={`stream-${i}`}>
            <Water layout={layout} stream={s} skin={skin} onPick={(x, z) => moveTo([x, 0, z])} />
            <Bridge
              layout={layout}
              stream={s}
              skin={skin}
              open={open[i]}
              progress={bridgeProgress(world, layout, trees, unlocked, i)}
              treesToGo={bridgeTreesToGo(world, layout, trees, unlocked, i)}
              leadsTo={past?.questName ?? 'the next grove'}
            />
          </group>
        );
      })}
    </>
  );
};

/** A stripe of water across the whole forest, deeper in the middle, with sandy banks, reeds and drifting glints. */
const Water: React.FC<{ layout: ForestLayout; stream: Stream; skin: Skin; onPick: (x: number, z: number) => void }> = ({ layout, stream, skin, onPick }) => {
  const b = layout.bounds;
  const width = b.maxX - b.minX + 140;
  const cx = (b.minX + b.maxX) / 2;

  const water = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, stream.halfWidth * 2, 1, 6);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const shallow = new THREE.Color(skin.water);
    const deep = new THREE.Color(skin.waterDeep);
    const c = new THREE.Color();
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const across = Math.abs(pos.getZ(i)) / stream.halfWidth; // 0 in the middle, 1 at the banks
      c.copy(deep).lerp(shallow, across * across);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [width, stream.halfWidth, skin]);
  useEffect(() => () => water.dispose(), [water]);

  // Reeds and pebbles along both banks, seeded so every player sees the same, and clear of the bridge.
  const dressing = useMemo(() => {
    let seed = Math.round(stream.z * 97) >>> 0 || 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out: Array<{ x: number; z: number; kind: 'reed' | 'pebble'; scale: number }> = [];
    for (let x = b.minX - 12; x < b.maxX + 12; x += 1.6) {
      for (const side of [1, -1]) {
        const px = x + rand() * 1.2;
        if (Math.abs(px - stream.bridge.x) < stream.bridge.halfWidth + 1.4 || rand() < 0.45) continue;
        out.push({ x: px, z: stream.z + side * (stream.halfWidth + 0.15 + rand() * 0.45), kind: rand() < 0.6 ? 'reed' : 'pebble', scale: 0.7 + rand() * 0.6 });
      }
    }
    return out;
  }, [stream, b.minX, b.maxX]);

  const glints = useRef<THREE.InstancedMesh>(null);
  const glintSeeds = useMemo(() => Array.from({ length: GLINTS }, (_, i) => ({ x: (i / GLINTS) * width, z: ((i * 7919) % 100) / 100 - 0.5, speed: 0.35 + ((i * 37) % 10) / 25 })), [width]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((state) => {
    const mesh = glints.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    glintSeeds.forEach((g, i) => {
      const x = cx - width / 2 + ((g.x + t * g.speed) % width);
      const sx = 0.5 + 0.35 * Math.sin(t * 1.3 + i);
      m.makeScale(sx, 1, 1).setPosition(x, WATER_Y + 0.006, stream.z + g.z * stream.halfWidth * 1.4);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={water} position={[cx, WATER_Y, stream.z]} onClick={(e) => e.point && onPick(e.point.x, e.point.z)}>
        <meshLambertMaterial vertexColors {...decal} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[cx, BANK_Y, stream.z + side * (stream.halfWidth + BANK_WIDTH / 2 - 0.05)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, BANK_WIDTH]} />
          <meshLambertMaterial color={skin.bank} {...decal} />
        </mesh>
      ))}
      <instancedMesh ref={glints} args={[undefined, undefined, GLINTS]} frustumCulled={false}>
        <circleGeometry args={[0.16, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      {dressing.map((d, i) =>
        d.kind === 'reed' ? (
          <group key={i} position={[d.x, 0, d.z]} scale={d.scale}>
            {[-0.08, 0.06, 0.0].map((dx, k) => (
              <mesh key={k} position={[dx, 0.3 + k * 0.06, (k - 1) * 0.05]} rotation={[0, 0, dx * 1.5]}>
                <cylinderGeometry args={[0.018, 0.028, 0.6 + k * 0.12, 4]} />
                <meshLambertMaterial color="#5e8a3c" />
              </mesh>
            ))}
            <mesh position={[0.06, 0.66, 0]}>
              <capsuleGeometry args={[0.035, 0.12, 2, 6]} />
              <meshLambertMaterial color="#7a5536" />
            </mesh>
          </group>
        ) : (
          <mesh key={i} position={[d.x, 0.08 * d.scale, d.z]} scale={[d.scale, d.scale * 0.6, d.scale]}>
            <dodecahedronGeometry args={[0.18, 0]} />
            <meshLambertMaterial color="#c9bfa8" flatShading />
          </mesh>
        )
      )}
    </group>
  );
};

/** Deck height (top of the planks) along the bridge, from groundHeight, so the kid's feet land on it. */
const deckAt = (layout: ForestLayout, stream: Stream, z: number) => groundHeight(layout, { x: stream.bridge.x, z: stream.z + z });

/**
 * An arched footbridge. Its frame is always there; its planks are laid one by one as the grove before it grows
 * (faint ghost planks show what's left), and it opens once the next grove does.
 */
const Bridge: React.FC<{
  layout: ForestLayout;
  stream: Stream;
  skin: Skin;
  open: boolean;
  progress: number;
  treesToGo: number;
  leadsTo: string;
}> = ({ layout, stream, skin, open, progress, treesToGo, leadsTo }) => {
  const L = stream.bridge.halfLength;
  const W = stream.bridge.halfWidth;
  const laid = open ? PLANKS : Math.min(PLANKS - 1, Math.floor(progress * PLANKS + 1e-9));

  const planks = useMemo(
    () =>
      Array.from({ length: PLANKS }, (_, i) => {
        const z = -L + ((i + 0.5) * 2 * L) / PLANKS;
        const slope = -LAYOUT.BRIDGE_ARCH * (Math.PI / (2 * L)) * Math.sin((z / L) * (Math.PI / 2));
        return { z, y: deckAt(layout, stream, z) - 0.045, tilt: -Math.atan(slope) };
      }),
    [layout, stream, L]
  );
  // Rails and the beams under the deck follow the arch.
  const curve = (x: number, lift: number) =>
    new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => {
      const z = -L + (k / 8) * 2 * L;
      return new THREE.Vector3(x, deckAt(layout, stream, z) + lift, z);
    }));
  const tubes = useMemo(
    () => ({
      rails: [-(W - 0.08), W - 0.08].map((x) => new THREE.TubeGeometry(curve(x, RAIL_HEIGHT), 24, 0.06, 6)),
      beams: [-0.85, 0.85].map((x) => new THREE.TubeGeometry(curve(x, -0.14), 24, 0.08, 6)),
    }),
    [layout, stream]
  );
  useEffect(() => () => [...tubes.rails, ...tubes.beams].forEach((g) => g.dispose()), [tubes]);

  // Planks laid since the last frame drop in from above; the bridge glows for a moment when it opens.
  const plankRefs = useRef<Array<THREE.Mesh | null>>([]);
  const dropStart = useRef<number[]>(Array(PLANKS).fill(-1));
  const prevLaid = useRef(laid);
  const glowUntil = useRef(0);
  const wasOpen = useRef(open);
  const plankMat = useMemo(() => new THREE.MeshLambertMaterial({ color: skin.wood, emissive: '#f2c14e', emissiveIntensity: 0 }), [skin]);
  useEffect(() => () => plankMat.dispose(), [plankMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (laid > prevLaid.current) {
      for (let n = prevLaid.current; n < laid; n++) dropStart.current[PLANKS - 1 - n] = t + (n - prevLaid.current) * 0.12;
    }
    prevLaid.current = laid;
    if (open && !wasOpen.current) glowUntil.current = t + 1.4;
    wasOpen.current = open;

    planks.forEach((p, i) => {
      const mesh = plankRefs.current[i];
      if (!mesh) return;
      const start = dropStart.current[i];
      const k = start < 0 ? 1 : Math.min(1, Math.max(0, (t - start) / 0.5));
      mesh.position.y = p.y + (1 - k) * (1 - k) * 1.6;
    });
    plankMat.emissiveIntensity = t < glowUntil.current ? 0.6 * Math.sin(((glowUntil.current - t) / 1.4) * Math.PI) : 0;
  });

  const post = (x: number, z: number, key: string) => {
    const base = deckAt(layout, stream, z);
    const h = base + RAIL_HEIGHT + 0.12;
    return (
      <mesh key={key} position={[x, h / 2, z]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, h, 8]} />
        <meshLambertMaterial color={skin.woodDark} />
      </mesh>
    );
  };

  return (
    <group position={[stream.bridge.x, 0, stream.z]}>
      {tubes.beams.map((g, i) => (
        <mesh key={`beam-${i}`} geometry={g} castShadow>
          <meshLambertMaterial color={skin.woodDark} />
        </mesh>
      ))}
      {tubes.rails.map((g, i) => (
        <mesh key={`rail-${i}`} geometry={g} castShadow>
          <meshLambertMaterial color={skin.woodDark} />
        </mesh>
      ))}
      {[-(W - 0.08), W - 0.08].flatMap((x) => [-L, 0, L].map((z) => post(x, z, `post-${x}-${z}`)))}

      {planks.map((p, i) => {
        const isLaid = PLANKS - 1 - i < laid; // laid from the near bank (+z) across
        return isLaid ? (
          <mesh key={`plank-${i}`} ref={(m) => (plankRefs.current[i] = m)} position={[0, p.y, p.z]} rotation={[p.tilt, 0, 0]} material={plankMat} castShadow receiveShadow>
            <boxGeometry args={[W * 2 - 0.25, 0.09, ((2 * L) / PLANKS) * 0.84]} />
          </mesh>
        ) : (
          <mesh key={`ghost-${i}`} position={[0, p.y, p.z]} rotation={[p.tilt, 0, 0]}>
            <boxGeometry args={[W * 2 - 0.25, 0.05, ((2 * L) / PLANKS) * 0.84]} />
            <meshBasicMaterial color="#fffaf0" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        );
      })}

      {/* A signpost on the near bank: where the bridge goes, and how many trees until it's finished */}
      <group position={[W + 1.1, 0, L + 0.4]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.4, 8]} />
          <meshLambertMaterial color={skin.woodDark} />
        </mesh>
        <mesh position={[0, 1.35, 0.06]} castShadow>
          <boxGeometry args={[2.3, open ? 0.5 : 0.78, 0.08]} />
          <meshLambertMaterial color="#f5e6c4" />
        </mesh>
        <Suspense fallback={null}>
          <Text font={FONT_3D} position={[0, open ? 1.35 : 1.49, 0.11]} fontSize={0.18} maxWidth={2.1} color="#2f2a22" anchorX="center" anchorY="middle">
            {`To ${leadsTo}`}
          </Text>
          {!open && (
            <Text font={FONT_3D} position={[0, 1.2, 0.11]} fontSize={0.17} color="#943328" anchorX="center" anchorY="middle">
              {treesToGo > 0 ? `Grow ${treesToGo} more tree${treesToGo > 1 ? 's' : ''} to finish it` : 'Not finished yet'}
            </Text>
          )}
        </Suspense>
      </group>
    </group>
  );
};
