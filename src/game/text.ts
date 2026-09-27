// Kid-facing text stays short and whole. Gemini is asked for short lines; this keeps them tidy when it isn't.

/** Adds a full stop when a sentence has no ending of its own. */
export function endSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?…]["')\]]*$/.test(t) ? t : `${t}.`;
}

/**
 * Whole sentences, up to `maxWords` in total. If even the first sentence is longer, it's cut at a word
 * with a single "…". Never leaves "..", and never splits a decimal like 0.5.
 */
export function shorten(text: string | null | undefined, maxWords: number): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';

  // A sentence ends at . ! ? or … followed by a space, so "0.5" and "1/8" stay whole.
  const sentences = t.split(/(?<=[.!?…]["')\]]*)\s+/).filter(Boolean);
  const kept: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const n = s.split(' ').length;
    if (words + n > maxWords) break;
    kept.push(s);
    words += n;
  }
  if (kept.length) return kept.join(' ');

  const cut = sentences[0].split(' ').slice(0, maxWords).join(' ').replace(/[\s,;:.!?…-]+$/, '');
  return `${cut}…`;
}
