// The teacher's end-of-session rundown when Gemini is unavailable: built from the class data in plain code.

export interface CompactMisconception {
  id?: string;
  misconceptionId?: string;
  label?: string;
  count?: number;
  affectedStudents?: string[];
  quotes?: string[];
}

/** Per-misconception counts, affected students and up to 3 thought-process quotes, from the raw class data. */
export function buildCompactList(body: { compactSummary?: unknown; misconceptions?: any[]; allStudentData?: any[] }): CompactMisconception[] {
  if (Array.isArray(body.compactSummary) && body.compactSummary.length > 0) return body.compactSummary;
  if (!Array.isArray(body.misconceptions)) return [];

  return body.misconceptions.map((m: any) => {
    const affectedStudents: string[] = [];
    const quotes: string[] = [];

    if (Array.isArray(body.allStudentData)) {
      body.allStudentData.forEach((st: any) => {
        const isAffected =
          st.activeMisconception === m.id ||
          st.recentAttempts?.some((a: any) => a.thoughtProcess && !a.correct) ||
          st.flags?.some((f: any) => f.thoughtProcess);

        if (isAffected) affectedStudents.push(st.name || 'Student');

        if (Array.isArray(st.flags)) {
          st.flags.forEach((f: any) => {
            if (f.thoughtProcess && quotes.length < 3) quotes.push(f.thoughtProcess);
          });
        }
      });
    }

    return {
      id: m.id,
      label: m.label,
      count: affectedStudents.length,
      affectedStudents: Array.from(new Set(affectedStudents)),
      quotes: quotes.slice(0, 3),
    };
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

    let activity = 'Use visual fraction bars or paper-folding strips to model equivalent proportions concretely.';
    const lbl = (item.label || '').toLowerCase();
    if (lbl.includes('numerator') || lbl.includes('simplif')) {
      activity = '5-Minute Slicing Demo: Fold a paper strip in half, then fourths, then eighths to prove the shaded amount remains identical.';
    } else if (lbl.includes('compare') || lbl.includes('denominator')) {
      activity = '5-Minute Denominator Duel: Compare 1/3 and 1/6 using real cake diagrams so students see fewer cuts = bigger slices.';
    } else if (lbl.includes('add') || lbl.includes('plus') || lbl.includes('unlike')) {
      activity = '5-Minute Common Ground Grid: Color 1/2 on a 6-grid (3 blocks) and 1/3 (2 blocks) to visually add 3/6 + 2/6 = 5/6.';
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
