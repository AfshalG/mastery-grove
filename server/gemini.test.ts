import { describe, expect, it } from 'vitest';
import { createGeminiClient } from './gemini';

type Call = { model: string; contents: unknown };

/** A stand-in for ai.models.generateContent that replays a script of results per call. */
function scripted(steps: Array<{ text: string } | Error>) {
  const calls: Call[] = [];
  let i = 0;
  const generateContent = async (args: { model: string; contents: unknown }) => {
    calls.push({ model: args.model, contents: args.contents });
    const step = steps[Math.min(i++, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step;
  };
  return { calls, generateContent };
}

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

describe('createGeminiClient', () => {
  const models = ['model-a', 'model-b'];

  it('returns the parsed JSON from the first model', async () => {
    const { calls, generateContent } = scripted([{ text: '{"ok":true}' }]);
    const client = createGeminiClient({ generateContent, models, sleep: async () => {} });

    await expect(client.generateJson({ endpointName: 'predict-trees', contents: 'p' })).resolves.toEqual({ ok: true });
    expect(calls.map((c) => c.model)).toEqual(['model-a']);
  });

  it('moves straight to the next model on a quota error, without waiting', async () => {
    const waits: number[] = [];
    const { calls, generateContent } = scripted([httpError(429, 'RESOURCE_EXHAUSTED'), { text: '{"n":2}' }]);
    const client = createGeminiClient({ generateContent, models, sleep: async (ms) => void waits.push(ms) });

    await expect(client.generateJson({ endpointName: 'predict-trees', contents: 'p' })).resolves.toEqual({ n: 2 });
    expect(calls.map((c) => c.model)).toEqual(['model-a', 'model-b']);
    expect(waits).toEqual([]);
  });

  it('retries the same model with backoff when it is overloaded', async () => {
    const waits: number[] = [];
    const busy = httpError(503, 'UNAVAILABLE');
    const { calls, generateContent } = scripted([busy, busy, { text: '{"n":3}' }]);
    const client = createGeminiClient({ generateContent, models, sleep: async (ms) => void waits.push(ms) });

    await expect(client.generateJson({ endpointName: 'predict-trees', contents: 'p' })).resolves.toEqual({ n: 3 });
    expect(calls.map((c) => c.model)).toEqual(['model-a', 'model-a', 'model-a']);
    expect(waits).toEqual([1000, 2000]);
  });

  it('throws the last error once every model has failed', async () => {
    const { generateContent } = scripted([httpError(429, 'quota exceeded')]);
    const client = createGeminiClient({ generateContent, models, sleep: async () => {} });

    await expect(client.generateJson({ endpointName: 'predict-trees', contents: 'p' })).rejects.toThrow('quota exceeded');
  });

  it('serves an identical request from the cache', async () => {
    const { calls, generateContent } = scripted([{ text: '{"n":1}' }]);
    const client = createGeminiClient({ generateContent, models, sleep: async () => {} });
    const req = { endpointName: 'predict-trees' as const, contents: 'same prompt' };

    await client.generateJson(req);
    await expect(client.generateJson(req)).resolves.toEqual({ n: 1 });
    expect(calls).toHaveLength(1);
  });

  it('rejects an empty reply instead of returning nothing', async () => {
    const { generateContent } = scripted([{ text: '' }]);
    const client = createGeminiClient({ generateContent, models, sleep: async () => {} });

    await expect(client.generateJson({ endpointName: 'generate-world', contents: 'p' })).rejects.toThrow(/empty/i);
  });
});
