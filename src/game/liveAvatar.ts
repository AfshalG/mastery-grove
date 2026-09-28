/**
 * Where the avatar is this frame, and which way it faces. The camera, the sun, the fox and tree fading read it
 * every frame. The store only gets a copy a few times a second, for the HUD, because writing the store every
 * frame re-rendered the whole app.
 */
export const liveAvatar = { x: 0, z: 0, heading: Math.PI, moving: false };

/** Where the chase camera is looking this frame: the kid, or the kid and Mia together. Trees in the way fade. */
export const cameraFocus = { x: 0, z: 0 };
