// Deterministic stand-in for Gemini (GEMINI_MOCK=1). Tests and offline demos get the same replies every time,
// built from the structured request, so the whole learner loop can run without an API key or any cost.
import { SAMPLE_WORLD } from '../src/data/sampleWorld';
import type { EndpointName, GeminiClient } from './gemini';
import { buildPlainCodeRundown } from './rundown';
import { keywordMarks } from '../src/game/teach';

type Input = Record<string, any>;

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const pick = <T>(items: T[], key: string): T | undefined => (items.length ? items[hash(key) % items.length] : undefined);

// A fixed spread of P(correct) so the planner has easy, middling and hard trees to choose from.
const P_CORRECT = [0.82, 0.64, 0.38, 0.71, 0.45];

let serial = 0; // Keeps generated question ids unique across calls within one server run.
const nextId = (prefix: string) => `${prefix}-${++serial}`;

const replies: Record<EndpointName, (input: Input) => unknown> = {
  'generate-world': ({ topic }) => ({
    ...structuredClone(SAMPLE_WORLD),
    subject: topic ? String(topic) : SAMPLE_WORLD.subject,
  }),

  'predict-trees': ({ openTrees = [], misconceptions = [] }) => ({
    predictions: openTrees.map((t: Input) => {
      const pCorrect = P_CORRECT[hash(String(t.id)) % P_CORRECT.length];
      const choices = Array.isArray(t.choices) ? t.choices.length : 0;
      const answer = Math.min(Number(t.answerIndex) || 0, Math.max(0, choices - 1));
      const likelyWrong = pCorrect < 0.5 && choices > 1;
      const misconception = misconceptions.find((m: Input) => m.conceptId === t.conceptId);
      return {
        treeId: t.id,
        pCorrect,
        predictedChoice: likelyWrong ? (answer + 1) % choices : answer,
        misconceptionId: likelyWrong ? misconception?.id ?? null : null,
        why: likelyWrong ? 'Might change only one part' : 'Steady on this so far',
      };
    }),
  }),

  'diagnose-thought-process': ({ question = '', studentChoice = '', misconceptions = [] }) => ({
    misconceptionId: pick<Input>(misconceptions, `${question}|${studentChoice}`)?.id ?? 'unclassified',
    confidence: 0.8,
    thoughtProcess: `You picked ${studentChoice || 'that one'}. I think you changed one part but not the other.`,
    scaffoldHint: 'What happens if you do the same thing to the top and the bottom?',
  }),

  'revise-thought-process': ({ studentWords = '', misconceptions = [] }) => ({
    misconceptionId: pick<Input>(misconceptions, String(studentWords))?.id ?? 'unclassified',
    confidence: 0.7,
    thoughtProcess: `Thanks. You said: "${String(studentWords).slice(0, 60)}".`,
    scaffoldHint: 'Can you check it with a drawing?',
  }),

  'generate-targeted-sapling': () => ({
    question: 'Simplify 6/12.',
    choices: ['1/2', '1/12', '6/2', '3/12'],
    answerIndex: 0,
    explanation: 'Divide the top and the bottom by 6.',
    visual: { kind: 'cake', parts: 12, shaded: 6 },
  }),

  'generate-retention-check': () => ({
    question: 'Which fraction is the same as 3/9?',
    choices: ['1/3', '3/3', '1/9', '9/3'],
    answerIndex: 0,
    explanation: 'Divide the top and the bottom by 3.',
  }),

  'generate-intervention': ({ misconceptionLabel }) => ({
    title: `Same cake, different cuts${misconceptionLabel ? `: ${misconceptionLabel}` : ''}`,
    miniLessonBullets: [
      'Draw 1/2 and 4/8 on two same-size cakes.',
      'Ask what changed and what stayed the same.',
      'Have them simplify 6/12 out loud, top and bottom together.',
    ],
    fiveMinuteActivity: 'Fold a paper strip into halves, then quarters, then eighths, and shade the same amount each time.',
    pedagogicalInsight: 'Kids who change only the top number are treating the fraction as two separate numbers.',
  }),

  'generate-targeted-questions': () => ({
    questions: [
      {
        id: nextId('mock-tq'),
        question: 'Simplify 10/20.',
        choices: ['1/2', '1/20', '10/2', '5/20'],
        answerIndex: 0,
        explanation: 'Divide the top and the bottom by 10.',
        visual: { kind: 'bar', parts: 20, shaded: 10 },
      },
      {
        id: nextId('mock-tq'),
        question: 'Which is the same as 2/4?',
        choices: ['1/4', '1/2', '2/2', '4/2'],
        answerIndex: 1,
        explanation: 'Divide the top and the bottom by 2.',
        visual: { kind: 'cake', parts: 4, shaded: 2 },
      },
    ],
  }),

  'deploy-teacher-quest': () => ({
    questions: [
      { id: nextId('mock-dq'), question: 'Simplify 3/6.', choices: ['1/2', '1/6', '3/2', '1/3'], answerIndex: 0, explanation: 'Divide both by 3.', visual: { kind: 'cake', parts: 6, shaded: 3 } },
      { id: nextId('mock-dq'), question: 'Simplify 5/10.', choices: ['1/10', '1/2', '5/2', '1/5'], answerIndex: 1, explanation: 'Divide both by 5.', visual: { kind: 'bar', parts: 10, shaded: 5 } },
      { id: nextId('mock-dq'), question: 'Which equals 4/12?', choices: ['1/12', '4/3', '1/3', '1/4'], answerIndex: 2, explanation: 'Divide both by 4.' },
    ],
  }),

  'generate-rundown': ({ worldSubject = '', compactList = [] }) => buildPlainCodeRundown(worldSubject, compactList),

  // Marks typed explanations by keywords. It can't listen, so a voice note is heard as silence.
  'grade-teach-back': ({ rubricPoints = [], explanation = null }) => ({
    transcript: '',
    covered: explanation ? keywordMarks(rubricPoints, String(explanation)) : rubricPoints.map(() => false),
    thanks: 'Oh! So the top and the bottom have to change together. Thank you!',
    followUp: explanation ? 'But why is my way wrong? Can you say it another way?' : 'I couldn’t hear that. Can you type it for me?',
  }),
};

export const MOCK_ENDPOINTS = Object.keys(replies) as EndpointName[];

export function createMockGemini({ delayMs = 150 }: { delayMs?: number } = {}): GeminiClient {
  return {
    async generateJson({ endpointName, input }) {
      const reply = replies[endpointName];
      if (!reply) throw new Error(`Mock Gemini has no reply for "${endpointName}".`);
      // A short pause so loading states render the way they do with the real API.
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return reply((input ?? {}) as Input);
    },
  };
}
