import { describe, expect, it } from 'vitest';
import { buildCompactList, buildPlainCodeRundown } from './rundown';

describe('buildCompactList', () => {
  it('reads the summaries the teacher screen actually sends', () => {
    const list = buildCompactList({
      misconceptions: [{ id: 'm2', label: 'divides only the numerator when simplifying' }],
      misconceptionSummaries: [
        { misconceptionId: 'm2', label: 'divides only the numerator when simplifying', affectedCount: 2, affectedStudents: ['You', 'Alex'], quotes: ['You halved only the top.'] },
      ],
    });

    expect(list).toEqual([
      { id: 'm2', label: 'divides only the numerator when simplifying', count: 2, affectedStudents: ['You', 'Alex'], quotes: ['You halved only the top.'] },
    ]);
  });

  it('only counts a student for the mix-ups they actually showed, and only quotes them there', () => {
    const list = buildCompactList({
      misconceptions: [
        { id: 'm1', label: 'thinks a fraction changes value when simplified' },
        { id: 'm2', label: 'divides only the numerator when simplifying' },
      ],
      allStudentData: [{ name: 'Aisha', flags: [{ misconceptionId: 'm2', thoughtProcess: 'You halved only the top.' }] }],
    });

    expect(list.find((m) => m.id === 'm1')).toMatchObject({ count: 0, affectedStudents: [], quotes: [] });
    expect(list.find((m) => m.id === 'm2')).toMatchObject({ count: 1, affectedStudents: ['Aisha'], quotes: ['You halved only the top.'] });
  });
});

describe('buildPlainCodeRundown', () => {
  it('suggests an activity that fits each mix-up', () => {
    const report = buildPlainCodeRundown('Fractions', [
      { id: 'm3', label: 'compares fractions by numerator alone, so thinks 5/8 > 3/4', count: 3, affectedStudents: ['A'], quotes: [] },
      { id: 'm5', label: 'adds numerators and denominators separately, so 1/2 + 1/3 = 2/5', count: 2, affectedStudents: ['B'], quotes: [] },
      { id: 'm2', label: 'divides only the numerator when simplifying', count: 1, affectedStudents: ['C'], quotes: [] },
    ]);
    const activity = (id: string) => report.topMisconceptions.find((t) => t.misconceptionId === id)!.fiveMinuteActivity;

    expect(activity('m3')).toMatch(/Denominator Duel/);
    expect(activity('m5')).toMatch(/Common Ground/);
    expect(activity('m2')).toMatch(/Slicing Demo/);
  });
});
