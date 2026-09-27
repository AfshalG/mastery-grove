import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../src/data/sampleWorld';
import { createMockGemini, MOCK_ENDPOINTS } from './mockGemini';
import type { EndpointName } from './gemini';

const gemini = createMockGemini({ delayMs: 0 });
const ask = (endpointName: EndpointName, input: unknown) => gemini.generateJson({ endpointName, contents: '', input }) as Promise<any>;

describe('mock Gemini', () => {
  it('answers every endpoint the server calls', async () => {
    for (const name of MOCK_ENDPOINTS) {
      await expect(ask(name, {})).resolves.toBeTruthy();
    }
  });

  it('grows a playable world named after the topic', async () => {
    const world = await ask('generate-world', { topic: 'Primary 4 Decimals' });

    expect(world.subject).toContain('Primary 4 Decimals');
    expect(world.concepts.length).toBeGreaterThanOrEqual(3);
    for (const t of world.trees) {
      if (t.kind === 'serve') continue;
      expect(t.choices).toHaveLength(4);
      expect(t.answerIndex).toBeGreaterThanOrEqual(0);
      expect(t.answerIndex).toBeLessThan(4);
    }
  });

  it('predicts every open tree, the same way every time', async () => {
    const openTrees = SAMPLE_WORLD.trees.slice(0, 5);
    const input = { misconceptions: SAMPLE_WORLD.misconceptions, openTrees, recentAttempts: [], memory: [] };

    const first = await ask('predict-trees', input);
    const second = await ask('predict-trees', input);

    expect(first).toEqual(second);
    expect(first.predictions.map((p: any) => p.treeId)).toEqual(openTrees.map((t) => t.id));
    for (const p of first.predictions) {
      expect(p.pCorrect).toBeGreaterThanOrEqual(0);
      expect(p.pCorrect).toBeLessThanOrEqual(1);
      expect(p.predictedChoice).toBeGreaterThanOrEqual(0);
      expect(p.predictedChoice).toBeLessThan(4);
    }
  });

  it('diagnoses with a misconception from the list and asks a question back', async () => {
    const d = await ask('diagnose-thought-process', {
      question: 'Simplify 4/8',
      studentChoice: '1/8',
      correctAnswer: '1/2',
      confidence: 'Very sure',
      misconceptions: SAMPLE_WORLD.misconceptions,
    });

    expect(SAMPLE_WORLD.misconceptions.map((m) => m.id)).toContain(d.misconceptionId);
    expect(d.thoughtProcess).toBeTruthy();
    expect(d.scaffoldHint.trim().endsWith('?')).toBe(true);
  });
});
