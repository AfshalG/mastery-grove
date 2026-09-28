import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { liveAvatar } from '../../game/liveAvatar';
import { ForestTerrain } from './ForestTerrain';
import { StudentAvatar } from './StudentAvatar';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { TreeMesh } from './TreeMesh';
import { GroveSign } from './GroveSign';
import { AnswerStones } from './AnswerStones';
import { ServeChallenge3D, VisualFraction3D } from './VisualFraction3D';
import { hideServeAnswer } from '../../game/visuals';
import { skinFor } from '../../game/skins';
import { Sky } from './Sky';
import { BackgroundForest } from './BackgroundForest';
import { Fox } from './Fox';
import { ProfessorByte } from './ProfessorByte';
import { MiaSpots } from './Mia';
import { Streams } from './Streams';
import { ObjectiveBeacon } from './ObjectiveBeacon';

/**
 * The sun rides along with the player, so every grove gets shadows however long the trail is
 * (a fixed shadow box only covered the first two groves).
 */
const SunLight: React.FC<{ color: string }> = ({ color }) => {
  const light = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.position.set(liveAvatar.x + 22, 28, liveAvatar.z + 18); // low, warm, late-afternoon sun
    l.target.position.set(liveAvatar.x, 0, liveAvatar.z);
    l.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={light}
      position={[22, 28, 18]}
      intensity={2.2}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={0.5}
      shadow-camera-far={100}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-bias={-0.0005}
      shadow-normalBias={0.04}
      color={color}
    />
  );
};

/**
 * With ?debug=1, tests can reach the camera and screen size, to tap things in the 3D scene (a cake slice, say)
 * by projecting their positions onto the screen.
 */
const DebugHandle: React.FC = () => {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const debug = (window as Window & { __mg?: Record<string, unknown> }).__mg;
  if (debug) debug.three = { camera, size };
  return null;
};

export const ForestScene: React.FC = () => {
  const world = useGameStore((s) => s.world);
  const layout = useGameStore((s) => s.layout);
  const trees = useGameStore((s) => s.trees);
  const selectedTree = useGameStore((s) => s.selectedTree);
  const getUnlockedConcepts = useGameStore((s) => s.getUnlockedConcepts);

  if (!world || !layout) return null;

  const unlockedConcepts = getUnlockedConcepts();
  const skin = skinFor(world.subject);

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        flat // no tone mapping: the storybook palette shows exactly as designed
        shadows="percentage"
        camera={{ position: [0, 6, 12], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        <color attach="background" args={[skin.skyHorizon]} />
        <fog attach="fog" args={[skin.fog, 28, 115]} />
        <Sky top={skin.skyTop} horizon={skin.skyHorizon} />

        {/* Warm sky light from above, the meadow's green bounced from below, and a golden sun */}
        <hemisphereLight args={[skin.hemiSky, skin.hemiGround, 1.5]} />
        <SunLight color={skin.sunLight} />

        <Suspense fallback={null}>
          {/* Ground Terrain & Paths */}
          <ForestTerrain />
          <BackgroundForest />
          {/* Streams between groves, bridged as the kid learns */}
          <Streams />
          <ObjectiveBeacon />

          {/* Student Avatar and the fox */}
          <StudentAvatar />
          <Fox />
          <ProfessorByte />
          {/* Mia, at the heart of each open grove, waiting for someone to explain her mix-up */}
          <MiaSpots />

          {/* Smooth Chase Camera */}
          <ThirdPersonCamera />
          <DebugHandle />

          {/* Grove signs stand at each grove's entrance, beside the trail */}
          {layout.groves.map((grove) => {
            const concept = world.concepts[grove.index];
            if (!concept) return null;
            const isLocked = !unlockedConcepts.includes(concept.id);
            const conceptTrees = trees.filter((t) => t.conceptId === concept.id && !t.isSapling);
            const isComplete =
              conceptTrees.length > 0 &&
              conceptTrees.every((t) => t.state === 'healthy' || t.state === 'regrown');

            return (
              <GroveSign
                key={`sign-${concept.id}`}
                concept={concept}
                position={[grove.sign.x, 0, grove.sign.z]}
                rotationY={grove.signRotationY}
                isLocked={isLocked}
                isComplete={isComplete}
              />
            );
          })}

          {/* All Trees */}
          {trees.map((tree) => {
            const isLocked = !unlockedConcepts.includes(tree.conceptId);
            return <TreeMesh key={tree.id} tree={tree} isLocked={isLocked} />;
          })}

          {/* 3D Answer Stones rising around active tree */}
          <AnswerStones />

          {/* Over the open tree: the hands-on cake or bridge for a serve challenge, or the question's picture */}
          {selectedTree?.position && selectedTree.kind === 'serve' && selectedTree.serveConfig ? (
            <ServeChallenge3D config={selectedTree.serveConfig} position={selectedTree.position} />
          ) : (
            selectedTree?.visual &&
            selectedTree.position && <VisualFraction3D visual={hideServeAnswer(selectedTree.visual, selectedTree.kind)!} position={selectedTree.position} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
