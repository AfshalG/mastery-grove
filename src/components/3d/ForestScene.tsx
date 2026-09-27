import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { liveAvatar } from '../../game/liveAvatar';
import { ForestTerrain } from './ForestTerrain';
import { StudentAvatar } from './StudentAvatar';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { TreeMesh } from './TreeMesh';
import { GroveSign } from './GroveSign';
import { AnswerStones } from './AnswerStones';
import { VisualFraction3D } from './VisualFraction3D';
import { hideServeAnswer } from '../../game/visuals';
import { skinFor } from '../../game/skins';
import { Sky } from './Sky';
import { BackgroundForest } from './BackgroundForest';
import { Fox } from './Fox';

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

          {/* Student Avatar and the fox */}
          <StudentAvatar />
          <Fox />

          {/* Smooth Chase Camera */}
          <ThirdPersonCamera />

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

          {/* Floating 3D fraction cake/bar above opened tree */}
          {selectedTree && selectedTree.visual && selectedTree.position && (
            <VisualFraction3D visual={hideServeAnswer(selectedTree.visual, selectedTree.kind)!} position={selectedTree.position} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
