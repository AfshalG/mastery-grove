import * as THREE from 'three';

/**
 * Fades an object's own meshes (a tree in the way, or Mia stepping back), keeping each material's original
 * opacity as the full value.
 */
export function applyFade(root: THREE.Object3D, amount: number) {
  const faded = amount < 0.999;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
    const mat = child.material as THREE.Material;
    if (mat.userData.baseOpacity === undefined) {
      mat.userData.baseOpacity = mat.opacity;
      mat.userData.baseTransparent = mat.transparent;
      mat.userData.baseDepthWrite = mat.depthWrite;
    }
    mat.opacity = mat.userData.baseOpacity * amount;
    // Something see-through shouldn't hide what's behind it.
    mat.depthWrite = faded ? false : mat.userData.baseDepthWrite;
    const transparent = faded || mat.userData.baseTransparent;
    if (mat.transparent !== transparent) {
      mat.transparent = transparent;
      mat.needsUpdate = true;
    }
  });
}
