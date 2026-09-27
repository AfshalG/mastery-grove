import type { FractionVisual } from '../types/game';

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
