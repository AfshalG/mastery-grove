// The retention loop: Leitner boxes that decide when a tree comes back, and the small honest lines about
// confidence and self-judgment. Plain code decides all of it; Gemini is never asked.
import type { ConfidenceLevel } from '../types/game';

/** Box 1: not learned yet (or slipped). Box 2: learned once. Box 3: remembered in a later session. */
export interface Card {
  box: 1 | 2 | 3;
  lastSession: number;
  lapses: number;
}

/** A card after an answer: right moves it up (to box 3 only in a later session), wrong sends it back to box 1. */
export function reviewCard(card: Card | undefined, correct: boolean, session: number): Card {
  if (!correct) return { box: 1, lastSession: session, lapses: (card?.lapses ?? 0) + 1 };
  const box = card && card.box >= 2 && session > card.lastSession ? 3 : Math.max(card?.box ?? 1, 2);
  return { box: box as Card['box'], lastSession: session, lapses: card?.lapses ?? 0 };
}

/** Sessions to wait before a learned (box 2) or mastered (box 3) tree comes back for a memory check. */
const WAIT = { 2: 1, 3: 3 } as const;

/** Trees due for this session's Memory Quest. Box 1 trees come back through their saplings instead. */
export function dueTrees(cards: Record<string, Card>, session: number): string[] {
  return Object.entries(cards)
    .filter(([, c]) => c.box >= 2 && session - c.lastSession >= WAIT[c.box as 2 | 3])
    .map(([id]) => id);
}

/** One line after each answer, comparing how sure the kid was with how it went. */
export function calibrationLine(confidence: ConfidenceLevel, correct: boolean): string {
  if (confidence === 'Very sure') return correct ? 'You were sure, and you were right.' : "Very sure, but it slipped. That's the moment to slow down and check.";
  if (confidence === 'Not sure') return correct ? 'You knew more than you thought.' : 'Good call being unsure. Let’s look at it again.';
  return correct ? 'Nice. You can be surer next time.' : 'Close. Let’s look at it again.';
}

/** Reflection feedback: only when how the kid feels and how they did disagree. */
export function judgmentFeedback(rating: 1 | 2 | 3 | 4, accuracy: number): string | null {
  const pct = Math.round(accuracy * 100);
  if (rating >= 3 && accuracy < 0.7) return `You felt sure, but got ${pct}% right. Worth one more look before a test.`;
  if (rating <= 2 && accuracy >= 0.7) return `You got ${pct}% right. You know more than you think.`;
  return null;
}
