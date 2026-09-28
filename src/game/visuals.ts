import type { FractionVisual, Passage } from '../types/game';

/** More slices than this can't be drawn or counted on a phone. */
const MAX_PARTS = 24;

function slices(v: unknown): { parts: number; shaded: number } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const { parts, shaded } = v as Record<string, unknown>;
  if (typeof parts !== 'number' || !Number.isFinite(parts)) return undefined;
  const p = Math.round(parts);
  if (p < 1 || p > MAX_PARTS) return undefined;
  const s = typeof shaded === 'number' && Number.isFinite(shaded) ? Math.round(shaded) : 0;
  return { parts: p, shaded: Math.min(p, Math.max(0, s)) };
}

/**
 * A fraction picture from Gemini, checked before anything draws it. Pictures that can't be drawn safely
 * come back undefined, and the question shows without one (a bad picture used to crash the scene).
 */
export function sanitizeVisual(v: unknown): FractionVisual | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const kind = (v as { kind?: unknown }).kind;
  if (kind === 'cake' || kind === 'bar') {
    const s = slices(v);
    return s ? { kind, ...s } : undefined;
  }
  if (kind === 'two-cakes') {
    const left = slices((v as { left?: unknown }).left);
    const right = slices((v as { right?: unknown }).right);
    return left && right ? { kind, left, right } : undefined;
  }
  return undefined;
}

/** A serve-the-cake question shows an uncut cake. Its shaded picture gave the answer away. */
export function hideServeAnswer(v: FractionVisual | undefined, kind: string | undefined): FractionVisual | undefined {
  if (!v || kind !== 'serve') return v;
  if (v.kind === 'two-cakes') return { ...v, left: { ...v.left, shaded: 0 }, right: { ...v.right, shaded: 0 } };
  return { ...v, shaded: 0 };
}

type Slices = { parts: number; shaded: number };

const drawable = (parts: number, shaded: number): Slices | null =>
  parts >= 1 && parts <= MAX_PARTS && shaded >= 0 && shaded <= parts ? { parts, shaded } : null;

/**
 * The "You made / 3/4 looks like" pictures after a wrong answer. The target is drawn from the same fraction
 * its label names. The kid's side is drawn only when their answer is itself a fraction or a count; a sentence
 * answer gets no picture rather than a made-up one.
 */
export function answerComparison(
  question: string,
  choice: string,
  visual?: FractionVisual,
  serveConfig?: { targetNumerator: number; targetDenominator: number; totalSlices: number }
): { kid: Slices; target: Slices; targetLabel: string } | null {
  let target: Slices | null = null;
  let targetLabel = '';

  const inQuestion = question.match(/(\d+)\s*\/\s*(\d+)/);
  if (serveConfig && serveConfig.targetDenominator > 0) {
    const parts = serveConfig.totalSlices;
    target = drawable(parts, Math.round((serveConfig.targetNumerator / serveConfig.targetDenominator) * parts));
    targetLabel = `${serveConfig.targetNumerator}/${serveConfig.targetDenominator}`;
  } else if (inQuestion) {
    target = drawable(Number(inQuestion[2]), Number(inQuestion[1]));
    targetLabel = `${inQuestion[1]}/${inQuestion[2]}`;
  } else if (visual && visual.kind !== 'two-cakes') {
    target = drawable(visual.parts, visual.shaded);
    targetLabel = `${visual.shaded}/${visual.parts}`;
  }
  if (!target) return null;

  const fraction = choice.match(/^\s*(\d+)\s*\/\s*(\d+)\s*(slices?|pieces?|of the (cake|bar))?\s*\.?\s*$/i);
  const count = choice.match(/^\s*(\d+)\s*(slices?|pieces?)?\s*\.?\s*$/i);
  const kid = fraction
    ? drawable(Number(fraction[2]), Number(fraction[1]))
    : count
      ? drawable(target.parts, Number(count[1]))
      : null;

  return kid ? { kid, target, targetLabel } : null;
}

/** A passage from Gemini (or a save), checked before it's shown: text only, and not too long for a card. */
export function sanitizePassage(p: unknown): Passage | undefined {
  if (!p || typeof p !== 'object') return undefined;
  const { title, text } = p as { title?: unknown; text?: unknown };
  if (typeof text !== 'string' || !text.trim()) return undefined;
  return { title: typeof title === 'string' ? title.trim().slice(0, 80) : '', text: text.trim().slice(0, 1200) };
}
