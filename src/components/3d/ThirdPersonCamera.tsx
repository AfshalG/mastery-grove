import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

export const ThirdPersonCamera: React.FC = () => {
  const { avatarPosition } = useGameStore();
  const currentTarget = useRef(new THREE.Vector3(0, 1.2, 0));

  useFrame((state) => {
    // Desired camera position relative to student
    const targetCamX = avatarPosition[0];
    const targetCamY = avatarPosition[1] + 5.8;
    const targetCamZ = avatarPosition[2] + 8.2;

    state.camera.position.lerp(
      new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
      0.08
    );

    // Look at slightly above student torso
    const lookAtX = avatarPosition[0];
    const lookAtY = avatarPosition[1] + 1.3;
    const lookAtZ = avatarPosition[2];

    currentTarget.current.lerp(new THREE.Vector3(lookAtX, lookAtY, lookAtZ), 0.1);
    state.camera.lookAt(currentTarget.current);
  });

  return null;
};
