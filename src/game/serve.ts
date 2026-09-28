// Hands-on fraction challenges: serve a fraction of a cake, or lay a fraction of a bridge's planks. Plain rules,
// so a wrong serve can name the exact mistake rather than just "not quite".
import type { ServeConfig } from '../types/game';

export type ServeMistake = 'nothing' | 'whole' | 'top-number' | 'bottom-number' | 'leftover' | 'too-few' | 'too-many';

export interface ServeResult {
  correct: boolean;
  mistake: ServeMistake | null;
  /** What happened, in one or two short sentences. */
  line: string;
  /** A question back, pointing at equal groups. */
  hint: string;
}

/** Slices (or planks) that make the target fraction. The world's configs use a whole that splits evenly. */
export const servesNeeded = (c: ServeConfig) => Math.round((c.targetNumerator / c.targetDenominator) * c.totalSlices);

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function simplify(n: number, d: number): [number, number] {
  if (n === 0) return [0, 1];
  const g = gcd(Math.abs(n), Math.abs(d));
  return [n / g, d / g];
}

const words = (c: ServeConfig) =>
  c.whole === 'bridge'
    ? { one: 'plank', many: 'planks', whole: 'bridge', did: 'laid', do: 'lay', split: 'split the bridge into', stay: 'the part that’s left over' }
    : { one: 'slice', many: 'slices', whole: 'cake', did: 'served', do: 'serve', split: 'cut the cake into', stay: 'the part that should stay on the plate' };

/** Marks a serve and, when it's wrong, says exactly what went wrong. */
export function diagnoseServe(c: ServeConfig, served: number): ServeResult {
  const w = words(c);
  const { targetNumerator: num, targetDenominator: den, totalSlices: total } = c;
  const needed = servesNeeded(c);
  const target = `${num}/${den}`;
  const count = (n: number) => `${n} ${n === 1 ? w.one : w.many}`;
  const hint = `${total} ${w.many} in ${den} equal groups: how many ${w.many} are in each group?`;
  const wrong = (mistake: ServeMistake, line: string): ServeResult => ({ correct: false, mistake, line, hint });

  if (served === needed) return { correct: true, mistake: null, line: `${served} of ${count(total)} is ${target}. Just right!`, hint };
  if (served === 0) return wrong('nothing', `You didn’t ${w.do} any ${w.many} yet.`);
  if (served === total) return wrong('whole', `You ${w.did} the whole ${w.whole}: ${total}/${total} is 1 whole, not ${target}.`);
  if (served === num) {
    return wrong('top-number', `You ${w.did} ${count(num)}: the top number. But this ${w.whole} has ${count(total)}, so ${target} of it is more than ${count(num)}.`);
  }
  if (served === den) {
    return wrong('bottom-number', `You ${w.did} ${count(den)}: the bottom number. The bottom number says how many equal groups to ${w.split}, not how many ${w.many} to ${w.do}.`);
  }
  if (served === total - needed) return wrong('leftover', `You ${w.did} ${served} of ${total}: that’s ${w.stay}. ${target} is the other part.`);

  const [a, b] = simplify(served, total);
  const came = a === served ? `${served}/${total}` : `${served}/${total} = ${a}/${b}`;
  const off = Math.abs(served - needed);
  return wrong(
    served < needed ? 'too-few' : 'too-many',
    `You ${w.did} ${served} of ${total}: that’s ${came}, not ${target}. It’s ${count(off)} too ${served < needed ? 'few' : 'many'}.`
  );
}
