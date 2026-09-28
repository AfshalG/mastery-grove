import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraFocus, liveAvatar } from '../../game/liveAvatar';
import { damp } from '../../game/motion';
import { useGameStore } from '../../store/useGameStore';

// Behind and above the player, looking at their shoulders. Rates are per second, so any frame rate feels the same.
const OFFSET = { y: 5.8, z: 8.2 };
// With a question open the camera eases up and back, so all the answer stones are in view.
const QUESTION_OFFSET = { y: 7.6, z: 10.4 };
const LOOK_HEIGHT = 1.3;
const FOLLOW_RATE = 5;
const LOOK_RATE = 6.3;
/** Wide screens dock cards on the left, 28rem with the margin: centre the picture in the space to their right. */
const CARD_HALF_WIDTH_PX = 224;
/** Phones show cards as a sheet over the bottom ~60%: lift the picture into the space above it. */
const SHEET_LIFT = 0.27;

export const ThirdPersonCamera: React.FC = () => {
  const desired = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3(0, LOOK_HEIGHT, 0));
  const lookGoal = useRef(new THREE.Vector3());
  const lens = useRef({ x: 0, y: 0 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const { answerStones, selectedTree, openTeachSpot, pendingReflection, layout } = useGameStore.getState();
    const offset = answerStones !== null ? QUESTION_OFFSET : OFFSET;

    // Talking to Mia: frame her and the kid together.
    let fx = liveAvatar.x;
    let fz = liveAvatar.z;
    const grove = openTeachSpot ? layout?.groves.find((g) => g.conceptId === openTeachSpot) : undefined;
    if (grove) {
      fx = (fx + grove.centre.x) / 2;
      fz = (fz + grove.centre.z) / 2;
    }
    cameraFocus.x = fx;
    cameraFocus.z = fz;

    desired.current.set(fx, offset.y, fz + offset.z);
    state.camera.position.lerp(desired.current, 1 - Math.exp(-FOLLOW_RATE * dt));
    lookGoal.current.set(fx, LOOK_HEIGHT, fz);
    lookTarget.current.lerp(lookGoal.current, 1 - Math.exp(-LOOK_RATE * dt));
    state.camera.lookAt(lookTarget.current);

    // While a card is up, shift the lens (not the camera) so the kid stays in the part of the screen it doesn't
    // cover. Moving the camera sideways instead changed the angle and put trees in the way.
    const { width: w, height: h } = state.size;
    const docked = selectedTree !== null || openTeachSpot !== null || pendingReflection !== null;
    const goalX = docked && w >= 1024 ? -CARD_HALF_WIDTH_PX / w : 0;
    const goalY = docked && w < 640 ? SHEET_LIFT : 0;
    lens.current.x = damp(lens.current.x, goalX, 5, dt);
    lens.current.y = damp(lens.current.y, goalY, 5, dt);
    const cam = state.camera as THREE.PerspectiveCamera;
    if (Math.abs(lens.current.x) < 1e-4 && Math.abs(lens.current.y) < 1e-4) {
      if (cam.view?.enabled) cam.clearViewOffset();
    } else {
      cam.setViewOffset(w, h, lens.current.x * w, lens.current.y * h, w, h);
    }
  });

  return null;
};
