/**
 * Where the avatar is this frame. The camera, the sun and tree fading read it every frame. The store only gets
 * a copy a few times a second, for the HUD, because writing the store every frame re-rendered the whole app.
 */
export const liveAvatar = { x: 0, z: 0 };
