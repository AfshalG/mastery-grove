// The storybook palettes. Each subject gets its own season, so a reading forest never looks like a maths one.
// Colours are used as-is: the canvas renders without tone mapping, so these hex values are what kids see.

export interface Skin {
  name: 'meadow' | 'autumn';
  skyTop: string;
  skyHorizon: string;
  fog: string;
  sunLight: string;
  hemiSky: string;
  hemiGround: string;
  ground: string;
  groundDark: string;
  groundLight: string;
  trail: string;
  trailEdge: string;
  stone: string;
  clearing: string;
  clearingEdge: string;
  trunk: string;
  foliage: string[];
  withered: string;
  blossom: string;
  flowers: string[];
  /** Streams between groves: shallow water at the edges, deeper in the middle, and the sandy banks. */
  water: string;
  waterDeep: string;
  bank: string;
  /** Bridge planks and rails. */
  wood: string;
  woodDark: string;
}

export const MEADOW: Skin = {
  name: 'meadow',
  skyTop: '#8cc7df',
  skyHorizon: '#f6e8c8',
  fog: '#eae4cb',
  sunLight: '#ffe6b8',
  hemiSky: '#fff5dc',
  hemiGround: '#7a9850',
  ground: '#a2bc6c',
  groundDark: '#8ca95b',
  groundLight: '#bad083',
  trail: '#dcc496',
  trailEdge: '#b9995f',
  stone: '#d6cdb9',
  clearing: '#cad59b',
  clearingEdge: '#bba77f',
  trunk: '#eee6d6',
  foliage: ['#5f9f5a', '#70ae62', '#4f8c50'],
  withered: '#a08c68',
  blossom: '#fbe3ea',
  flowers: ['#f2a7b8', '#f6d57a', '#b9a2e0', '#fffaf0', '#f4a261'],
  water: '#8fd0d8',
  waterDeep: '#5fb0c2',
  bank: '#d9c99a',
  wood: '#c79a62',
  woodDark: '#8a6440',
};

export const AUTUMN: Skin = {
  name: 'autumn',
  skyTop: '#e9b98e',
  skyHorizon: '#fbe7c6',
  fog: '#f2e0c0',
  sunLight: '#ffd9a0',
  hemiSky: '#fff0d8',
  hemiGround: '#8c7a45',
  ground: '#b4a45f',
  groundDark: '#a08f4f',
  groundLight: '#c8b973',
  trail: '#d9ba82',
  trailEdge: '#a8834f',
  stone: '#d8c9ad',
  clearing: '#d7c68c',
  clearingEdge: '#b3915f',
  trunk: '#6b4a2b',
  foliage: ['#d98b2b', '#e0a43a', '#c4692a'],
  withered: '#8f7456',
  blossom: '#fff1c9',
  flowers: ['#e76f51', '#f4a261', '#e9c46a', '#fffaf0', '#c9744d'],
  water: '#9cc9c9',
  waterDeep: '#6aa3a8',
  bank: '#d8c08c',
  wood: '#b07b45',
  woodDark: '#7a5230',
};

/** Reading and language subjects, which get the autumn wood (and reading questions with passages). */
export const isReadingSubject = (subject: string | undefined) =>
  /english|reading|literacy|story|stories|poem|poetry|grammar|spelling|vocabulary|comprehension|writing/i.test(subject ?? '');

/** Reading and language worlds get the autumn wood; everything else gets the spring meadow. */
export function skinFor(subject: string | undefined): Skin {
  return isReadingSubject(subject) ? AUTUMN : MEADOW;
}

/** A stable small number from an id, so each tree keeps its own shade and size on every screen. */
export function idHash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
