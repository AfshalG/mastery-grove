// Small maths for movement and cameras, kept frame-rate independent so a 30 fps phone feels like a 120 fps laptop.

/** Moves `from` toward `to`, covering the same share per second at any frame rate. `rate` is per second. */
export function damp(from: number, to: number, rate: number, dt: number) {
  return to + (from - to) * Math.exp(-rate * dt);
}

/** An angle wrapped to (-π, π]. */
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Turns from one heading toward another the short way round, by share `t` (0..1). */
export function turnToward(from: number, to: number, t: number) {
  return from + wrapAngle(to - from) * t;
}
