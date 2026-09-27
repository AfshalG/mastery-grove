import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { liveAvatar } from '../../game/liveAvatar';
import { useGameStore } from '../../store/useGameStore';

// Behind and above the player, looking at their shoulders. Rates are per second, so any frame rate feels the same.
const OFFSET = { y: 5.8, z: 8.2 };
// With a question open the camera eases up and back, so all the answer stones are in view.
const QUESTION_OFFSET = { y: 7.6, z: 10.4 };
const LOOK_HEIGHT = 1.3;
const FOLLOW_RATE = 5;
const LOOK_RATE = 6.3;

export const ThirdPersonCamera: React.FC = () => {
  const desired = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(0, LOOK_HEIGHT, 0));
  const lookGoal = useRef(new THREE.Vector3());

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const question = useGameStore.getState().answerStones !== null;
    const offset = question ? QUESTION_OFFSET : OFFSET;
    // On wide screens the question card docks left, so frame the stones in the space to its right.
    const shift = question && state.size.width >= 1024 ? -2.8 : 0;
    desired.current.set(liveAvatar.x + shift, offset.y, liveAvatar.z + offset.z);
    state.camera.position.lerp(desired.current, 1 - Math.exp(-FOLLOW_RATE * dt));

    lookGoal.current.set(liveAvatar.x + shift, LOOK_HEIGHT, liveAvatar.z);
    lookTarget.current.lerp(lookGoal.current, 1 - Math.exp(-LOOK_RATE * dt));
    state.camera.lookAt(lookTarget.current);
  });

  return null;
};
