import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Inside the camera's far plane (200), and centred on the camera so the dome is never clipped.
const RADIUS = 180;

/** A painted-looking sky: a dome that fades from the skin's sky colour down to a warm horizon. */
export const Sky: React.FC<{ top: string; horizon: string }> = ({ top, horizon }) => {
  const mesh = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 horizon;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [top, horizon]
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 32, 16]} />
    </mesh>
  );
};
