import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { liveAvatar } from '../../game/liveAvatar';

// Behind and above the player, looking at their shoulders. Rates are per second, so any frame rate feels the same.
const OFFSET = { y: 5.8, z: 8.2 };
const LOOK_HEIGHT = 1.3;
const FOLLOW_RATE = 5;
const LOOK_RATE = 6.3;

export const ThirdPersonCamera: React.FC = () => {
  const desired = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(0, LOOK_HEIGHT, 0));
  const lookGoal = useRef(new THREE.Vector3());

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    desired.current.set(liveAvatar.x, OFFSET.y, liveAvatar.z + OFFSET.z);
    state.camera.position.lerp(desired.current, 1 - Math.exp(-FOLLOW_RATE * dt));

    lookGoal.current.set(liveAvatar.x, LOOK_HEIGHT, liveAvatar.z);
    lookTarget.current.lerp(lookGoal.current, 1 - Math.exp(-LOOK_RATE * dt));
    state.camera.lookAt(lookTarget.current);
  });

  return null;
};
