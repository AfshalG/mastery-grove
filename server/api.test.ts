import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { GeminiClient, GeminiRequest } from './gemini';

/** A fake Gemini client that records every request and answers with a fixed reply (or error). */
function fakeGemini(reply: unknown | Error) {
  const requests: GeminiRequest[] = [];
  const client: GeminiClient = {
    async generateJson(req) {
      requests.push(req);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return { client, requests };
}

let server: Server | undefined;
afterEach(() => server?.close());

async function post(gemini: GeminiClient | null, path: string, body: unknown) {
  server = createApp(gemini).listen(0);
  await new Promise((r) => server!.once('listening', r));
  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const tree = { id: 't1', conceptId: 'c1', question: 'Simplify 4/8', choices: ['1/2', '2/8', 'less', '1/8'], answerIndex: 0 };

// Every Gemini-backed endpoint, with a request body shaped like the one the client sends.
const endpoints: Array<[path: string, name: GeminiRequest['endpointName'], body: Record<string, unknown>]> = [
  ['/api/generate-world', 'generate-world', { topic: 'Fractions' }],
  ['/api/predict-trees', 'predict-trees', { misconceptions: [], openTrees: [tree], recentAttempts: [], memory: [] }],
  ['/api/diagnose-thought-process', 'diagnose-thought-process', { question: 'Simplify 4/8', studentChoice: '1/8', correctAnswer: '1/2', confidence: 'Very sure', misconceptions: [] }],
  ['/api/revise-thought-process', 'revise-thought-process', { question: 'q', studentChoice: 'a', correctAnswer: 'b', studentWords: 'I halved it', misconceptions: [], initialThoughtProcess: 'x' }],
  ['/api/generate-targeted-sapling', 'generate-targeted-sapling', { originalQuestion: 'q', originalChoices: [], thoughtProcess: 't', misconception: { id: 'm1', label: 'l' } }],
  ['/api/generate-retention-check', 'generate-retention-check', { conceptName: 'c', misconception: { label: 'l' }, worldSubject: 's' }],
  ['/api/generate-intervention', 'generate-intervention', { targetType: 'misconception', misconceptionLabel: 'l', worldSubject: 's' }],
  ['/api/generate-targeted-questions', 'generate-targeted-questions', { misconception: { id: 'm1', label: 'l' }, thoughtProcess: 't', conceptId: 'c1' }],
  ['/api/deploy-teacher-quest', 'deploy-teacher-quest', { misconception: { id: 'm1', label: 'l' }, conceptId: 'c1', worldSubject: 's' }],
  ['/api/generate-rundown', 'generate-rundown', { worldSubject: 's', misconceptions: [{ id: 'm1', label: 'l' }], allStudentData: [] }],
];

describe('API routes', () => {
  it.each(endpoints)('%s passes its name and request to Gemini and returns the JSON', async (path, name, body) => {
    const { client, requests } = fakeGemini({ fromGemini: true });

    const res = await post(client, path, body);

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ fromGemini: true });
    expect(requests).toHaveLength(1);
    expect(requests[0].endpointName).toBe(name);
  });

  it.each(endpoints.filter(([p]) => p !== '/api/generate-rundown'))('%s returns 500 with the reason when Gemini fails', async (path, _name, body) => {
    const { client } = fakeGemini(new Error('model overloaded'));

    const res = await post(client, path, body);

    expect(res.status).toBe(500);
    expect(res.json.error).toContain('model overloaded');
  });

  it('says the key is missing when no Gemini client is configured', async () => {
    const res = await post(null, '/api/diagnose-thought-process', endpoints[2][2]);

    expect(res.status).toBe(500);
    expect(res.json.error).toMatch(/GEMINI_API_KEY/);
  });

  it('skips Gemini when there are no open trees to predict', async () => {
    const { client, requests } = fakeGemini({ predictions: ['should not be used'] });

    const res = await post(client, '/api/predict-trees', { openTrees: [] });

    expect(res.json).toEqual({ predictions: [] });
    expect(requests).toHaveLength(0);
  });

  it.each([
    ['Gemini fails', fakeGemini(new Error('down')).client],
    ['there is no key', null],
  ])('falls back to the plain-code rundown when %s', async (_why, client) => {
    const res = await post(client, '/api/generate-rundown', {
      worldSubject: 'Fractions',
      misconceptions: [{ id: 'm2', label: 'divides only the numerator when simplifying' }],
      allStudentData: [{ name: 'Aisha', activeMisconception: 'm2', flags: [{ thoughtProcess: 'You halved only the top.' }] }],
    });

    expect(res.status).toBe(200);
    expect(res.json.topMisconceptions[0]).toMatchObject({ misconceptionId: 'm2', affectedStudents: ['Aisha'] });
    expect(res.json.fullReportMarkdown).toContain('divides only the numerator');
  });
});
