// The teacher's end-of-session rundown when Gemini is unavailable: built from the class data in plain code.

export interface CompactMisconception {
  id?: string;
  misconceptionId?: string;
  label?: string;
  count?: number;
  affectedStudents?: string[];
  quotes?: string[];
}

/**
 * Per-misconception counts, affected students and up to 3 of their thought-process quotes.
 * The teacher screen sends `misconceptionSummaries` it has already worked out; raw `allStudentData` is
 * also accepted. (The server used to read only the raw form, so every rundown saw a class of nobody.)
 */
export function buildCompactList(body: {
  compactSummary?: unknown;
  misconceptionSummaries?: unknown;
  misconceptions?: any[];
  allStudentData?: any[];
}): CompactMisconception[] {
  if (Array.isArray(body.misconceptionSummaries) && body.misconceptionSummaries.length > 0) {
    return body.misconceptionSummaries.map((m: any) => ({
      id: m.misconceptionId ?? m.id,
      label: m.label,
      count: m.affectedCount ?? m.affectedStudents?.length ?? 0,
      affectedStudents: Array.isArray(m.affectedStudents) ? m.affectedStudents : [],
      quotes: Array.isArray(m.quotes) ? m.quotes.slice(0, 3) : [],
    }));
  }
  if (Array.isArray(body.compactSummary) && body.compactSummary.length > 0) return body.compactSummary as CompactMisconception[];
  if (!Array.isArray(body.misconceptions)) return [];

  return body.misconceptions.map((m: any) => {
    const affected = new Set<string>();
    const quotes: string[] = [];
    for (const st of body.allStudentData ?? []) {
      // Only this mix-up's evidence: a flag or a wrong attempt diagnosed as it, or it being their active one.
      const evidence = [...(st.flags ?? []), ...(st.recentAttempts ?? []).filter((a: any) => !a.correct)].filter(
        (f: any) => f.misconceptionId === m.id
      );
      if (st.activeMisconception === m.id || evidence.length > 0) affected.add(st.name || 'Student');
      for (const f of evidence) if (f.thoughtProcess && quotes.length < 3) quotes.push(f.thoughtProcess);
    }
    return { id: m.id, label: m.label, count: affected.size, affectedStudents: [...affected], quotes };
  });
}

export function buildPlainCodeRundown(worldSubject: string, compactList: CompactMisconception[]) {
  const sorted = [...compactList].sort(
    (a, b) => (b.count || b.affectedStudents?.length || 0) - (a.count || a.affectedStudents?.length || 0)
  );
  const top3 = sorted.slice(0, 3).map((item) => {
    const quotes: string[] = item.quotes || [];
    const typical = quotes.length > 0
      ? quotes[0]
      : `Students exhibit confusion regarding ${item.label?.toLowerCase() || 'this concept'}.`;

    // Most specific first: "compares ... by numerator" is about comparing, "adds numerators" about adding.
    let activity = 'Use visual fraction bars or paper-folding strips to model equivalent proportions concretely.';
    const lbl = (item.label || '').toLowerCase();
    if (/compar|larger|bigger|greater|smaller/.test(lbl)) {
      activity = '5-Minute Denominator Duel: Compare 1/3 and 1/6 using real cake diagrams so students see fewer cuts = bigger slices.';
    } else if (/\badd|plus|sum|unlike/.test(lbl)) {
      activity = '5-Minute Common Ground Grid: Color 1/2 on a 6-grid (3 blocks) and 1/3 (2 blocks) to visually add 3/6 + 2/6 = 5/6.';
    } else if (/numerator|denominator|simplif/.test(lbl)) {
      activity = '5-Minute Slicing Demo: Fold a paper strip in half, then fourths, then eighths to prove the shaded amount remains identical.';
    }

    const students = Array.isArray(item.affectedStudents) && item.affectedStudents.length > 0
      ? item.affectedStudents
      : ['Students needing review'];

    return {
      misconceptionId: item.id || item.misconceptionId || 'm1',
      label: item.label || 'Fraction Concept Rule',
      affectedStudents: students,
      typicalReasoning: typical,
      whyReteach: `Students holding this view confuse foundational fraction properties, which blocks progression.`,
      fiveMinuteActivity: activity,
    };
  });

  const priorityOrder = top3
    .map(
      (t, i) =>
        `${i + 1}. Address "${t.label}" (${t.affectedStudents.length} student${t.affectedStudents.length === 1 ? '' : 's'} flagged)`
    )
    .join('; ');

  let md = `# End of Session Pedagogical Rundown\n**Subject:** ${worldSubject || 'Mathematics'}\n\n`;
  md += `## Executive Priority Summary\n${priorityOrder}\n\n`;
  md += `## Top 3 Targeted Misconceptions\n`;
  top3.forEach((t, i) => {
    md += `### ${i + 1}. ${t.label}\n`;
    md += `- **Affected Students:** ${t.affectedStudents.join(', ')}\n`;
    md += `- **Typical Student Reasoning:** "${t.typicalReasoning}"\n`;
    md += `- **Why Address First:** ${t.whyReteach}\n`;
    md += `- **5-Minute Reteach Activity:** ${t.fiveMinuteActivity}\n\n`;
  });

  return {
    topMisconceptions: top3,
    priorityOrderSummary: priorityOrder,
    fullReportMarkdown: md,
  };
}
