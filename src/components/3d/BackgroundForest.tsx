import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { scatterForest, type ForestTree } from '../../game/layout';
import { skinFor } from '../../game/skins';

// Shared geometry: round trees are a low-poly ball on a trunk, pines are two stacked cones.
const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6).translate(0, 1.1, 0);
const roundGeo = new THREE.IcosahedronGeometry(1.45, 0).translate(0, 2.9, 0);
const pineGeo = (() => {
  const low = new THREE.ConeGeometry(1.35, 2.2, 7).translate(0, 2.4, 0);
  const high = new THREE.ConeGeometry(0.95, 1.8, 7).translate(0, 3.5, 0);
  const merged = new THREE.BufferGeometry();
  // Two cones in one geometry, so a pine is still one draw call per forest.
  const pos = [...low.toNonIndexed().attributes.position.array, ...high.toNonIndexed().attributes.position.array];
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.computeVertexNormals();
  return merged;
})();

const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** One instanced layer of the forest (trunks, round canopies or pines). */
const Layer: React.FC<{ trees: ForestTree[]; geometry: THREE.BufferGeometry; colorOf: (t: ForestTree) => string }> = ({
  trees,
  geometry,
  colorOf,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    trees.forEach((t, i) => {
      tmp.position.set(t.x, 0, t.z);
      tmp.rotation.set(0, t.rotation, 0);
      tmp.scale.setScalar(t.scale);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, tmpColor.set(colorOf(t)));
    });
    mesh.count = trees.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [trees, colorOf]);

  if (trees.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, trees.length]} castShadow receiveShadow>
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
};

/** Hundreds of scenery trees in three draw calls, placed by scatterForest so they never crowd the game. */
export const BackgroundForest: React.FC = () => {
  const layout = useGameStore((s) => s.layout);
  const subject = useGameStore((s) => s.world?.subject);
  const trees = useGameStore((s) => s.trees);
  const skin = skinFor(subject);

  const treeKey = trees.map((t) => `${t.position?.[0]?.toFixed(1)},${t.position?.[2]?.toFixed(1)}`).join('|');
  const forest = useMemo(() => {
    if (!layout) return { round: [], pine: [] };
    const spots = trees.filter((t) => t.position).map((t) => ({ x: t.position![0], z: t.position![2] }));
    const all = scatterForest(layout, spots);
    return { round: all.filter((t) => t.kind === 'round'), pine: all.filter((t) => t.kind === 'pine') };
  }, [layout, treeKey]); // keyed on positions: a tree changing state moves nothing

  const trunkColor = React.useCallback(() => skin.trunk, [skin]);
  const leafColor = React.useCallback((t: ForestTree) => skin.foliage[t.shade % skin.foliage.length], [skin]);
  const allTrees = useMemo(() => [...forest.round, ...forest.pine], [forest]);

  return (
    <group>
      <Layer trees={allTrees} geometry={trunkGeo} colorOf={trunkColor} />
      <Layer trees={forest.round} geometry={roundGeo} colorOf={leafColor} />
      <Layer trees={forest.pine} geometry={pineGeo} colorOf={leafColor} />
    </group>
  );
};
