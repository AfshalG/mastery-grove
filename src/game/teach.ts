// Mia's teach-back: the kid explains a grove's mix-up to Mia, a puzzled classmate. Gemini marks which points of
// the rubric the explanation covered; this plain code decides whether Mia gets it, and marks it with keywords
// when Gemini can't be reached. Shared by the server (which grades) and the game (which shows Mia).
import type { TeachBackRecord, TeachSpot, TreeData, WorldData } from '../types/game';
import { isExtraTree } from './forest';
import { UNLOCK_HEALTH } from './progress';

/** Mia gets it when the explanation covers at least this share of the rubric. */
export const PASS_SHARE = 2 / 3;

export function pointsNeeded(total: number) {
  return Math.ceil(total * PASS_SHARE - 1e-9);
}

export function teachBackPasses(hits: number, total: number) {
  return total > 0 && hits >= pointsNeeded(total);
}

// ---- The offline check -------------------------------------------------------------------------------------

const STOPWORDS = new Set(
  'a an and are as at be because but by can could do does did for from get go got had has have how i if in into is it its just like me my of on or our really so some than that the their them then there they thing this to too was we were what when which why will with would you your'.split(
    ' '
  )
);

/** A crude stem, so "divide", "divides", "dividing" and "divided" all count as one word. */
function stem(word: string) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith('ied')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/** Kid words and textbook words for the same idea count as the same word. */
const SAME_IDEA: Record<string, string> = Object.fromEntries(
  Object.entries({
    numerator: 'top',
    upper: 'top',
    denominator: 'bottom',
    lower: 'bottom',
    part: 'piece',
    slice: 'piece',
    bit: 'piece',
    equal: 'same',
    equivalent: 'same',
    bigger: 'more',
    larger: 'more',
    greater: 'more',
    most: 'more',
    smaller: 'less',
    fewer: 'less',
    lesser: 'less',
    split: 'divide',
    share: 'divide',
    times: 'multiply',
    plus: 'add',
    sum: 'add',
    size: 'amount',
    much: 'amount',
  }).map(([word, idea]) => [stem(word), stem(idea)])
);

/** The words that carry meaning: fractions (spaces or not), numbers, and stemmed content words. */
function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  // "can't", "cannot" and "don't" all mean "not" here.
  const lower = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\b(?:can't|cannot|can not|won't|don't|doesn't|didn't|isn't|aren't|wasn't|shouldn't|mustn't)\b/g, ' not ');
  for (const m of lower.matchAll(/(\d+)\s*\/\s*(\d+)/g)) out.add(`${Number(m[1])}/${Number(m[2])}`);
  const rest = lower.replace(/(\d+)\s*\/\s*(\d+)/g, ' ');
  for (const n of rest.match(/\d+(?:\.\d+)?/g) ?? []) out.add(String(Number(n)));
  for (const w of rest.match(/[a-z]+/g) ?? []) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    const s = stem(w);
    out.add(SAME_IDEA[s] ?? s);
  }
  return out;
}

/**
 * Which rubric points an explanation covers, by shared words: at least half of a point's content words, and
 * at least two of them (one, for a one-word point). Crude, but honest and the same every time; Gemini does
 * the real marking and this only stands in when it can't be reached (and in tests).
 */
export function keywordMarks(rubricPoints: string[], explanation: string): boolean[] {
  const said = contentTokens(explanation);
  return rubricPoints.map((point) => {
    const needed = contentTokens(point);
    if (needed.size === 0) return false;
    const shared = [...needed].filter((t) => said.has(t)).length;
    return shared / needed.size >= 0.5 && shared >= Math.min(2, needed.size);
  });
}

// ---- Spots and status --------------------------------------------------------------------------------------

const MAX_POINTS = 5;

/**
 * The teach spots a world can use: one per grove, each with Mia's words and at least two rubric points.
 * Whatever Gemini sends that doesn't fit is dropped, so that grove simply has no Mia.
 */
export function validTeachSpots(world: Pick<WorldData, 'concepts' | 'misconceptions' | 'teachSpots'>): TeachSpot[] {
  const concepts = new Set(world.concepts.map((c) => c.id));
  const misconceptions = new Set(world.misconceptions.map((m) => m.id));
  const seen = new Set<string>();
  const spots: TeachSpot[] = [];

  for (const raw of world.teachSpots ?? []) {
    if (!raw || typeof raw.conceptId !== 'string' || !concepts.has(raw.conceptId) || seen.has(raw.conceptId)) continue;
    const thought = typeof raw.puzzledThought === 'string' ? raw.puzzledThought.trim().slice(0, 240) : '';
    const points = (Array.isArray(raw.rubricPoints) ? raw.rubricPoints : [])
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim().slice(0, 160))
      .slice(0, MAX_POINTS);
    if (!thought || points.length < 2) continue;

    seen.add(raw.conceptId);
    const board = typeof raw.board === 'string' ? raw.board.trim().slice(0, 18) : '';
    spots.push({
      conceptId: raw.conceptId,
      ...(raw.misconceptionId && misconceptions.has(raw.misconceptionId) ? { misconceptionId: raw.misconceptionId } : {}),
      puzzledThought: thought,
      ...(board ? { board } : {}),
      rubricPoints: points,
    });
  }
  return spots;
}

export type MiaStatus = { kind: 'locked' } | { kind: 'growing'; treesToGo: number } | { kind: 'ready' } | { kind: 'helped' };

const isGrown = (t: TreeData) => t.state === 'healthy' || t.state === 'regrown';

/**
 * Where Mia is up to in a grove. She asks for help once 60% of the grove is grown (the same point the next
 * grove opens), because explaining an idea comes after practising it. Once helped, she stays helped.
 */
export function miaStatus(trees: TreeData[], conceptId: string, unlocked: string[], teachBacks: TeachBackRecord[]): MiaStatus {
  if (!unlocked.includes(conceptId)) return { kind: 'locked' };
  if (teachBacks.some((r) => r.conceptId === conceptId && r.passed)) return { kind: 'helped' };
  const own = trees.filter((t) => t.conceptId === conceptId && !isExtraTree(t));
  const needed = Math.ceil(own.length * UNLOCK_HEALTH - 1e-9);
  const grown = own.filter(isGrown).length;
  return grown >= needed ? { kind: 'ready' } : { kind: 'growing', treesToGo: needed - grown };
}
