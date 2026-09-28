import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { GeminiClient, GeminiRequest } from './gemini';
import { createMockGemini } from './mockGemini';

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

async function grade(gemini: GeminiClient | null, body: unknown) {
  server = createApp(gemini).listen(0);
  await new Promise((r) => server!.once('listening', r));
  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}/api/grade-teach-back`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const rubricPoints = [
  'Divide the top and the bottom by the same number',
  '2/8 is less than 4/8, so it is not the same amount',
  '4/8 simplifies to 1/2',
];
const typed = {
  conceptName: 'Equivalent fractions',
  puzzledThought: 'To simplify 4/8, I halved the top and got 2/8. Why is that wrong?',
  rubricPoints,
  explanation: 'You have to halve the bottom too, so it is 2/4, which is 1/2.',
};
const reply = (covered: unknown, extra: Record<string, unknown> = {}) => ({
  transcript: '',
  covered,
  thanks: 'Oh! I change the top and the bottom together. Thanks!',
  followUp: 'But why is 2/8 not the same as 4/8?',
  ...extra,
});

describe('POST /api/grade-teach-back', () => {
  it('lets Gemini mark the rubric, and decides the pass in code: 2 of 3 is enough', async () => {
    const { client, requests } = fakeGemini(reply([true, false, true]));

    const res = await grade(client, typed);

    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      passed: true,
      hit: [rubricPoints[0], rubricPoints[2]],
      missing: [rubricPoints[1]],
      miaReply: 'Oh! I change the top and the bottom together. Thanks!',
      transcript: null,
      gradedBy: 'gemini',
    });
    expect(requests[0].endpointName).toBe('grade-teach-back');
    const prompt = JSON.stringify(requests[0].contents);
    for (const point of rubricPoints) expect(prompt).toContain(point);
    expect(prompt).toContain('halve the bottom too');
  });

  it('keeps Mia stuck at 1 of 3, and she asks her follow-up question', async () => {
    const res = await grade(fakeGemini(reply([false, false, true])).client, typed);

    expect(res.json).toMatchObject({ passed: false, hit: [rubricPoints[2]], miaReply: 'But why is 2/8 not the same as 4/8?' });
  });

  it('counts only a real true: a short or odd reply never passes by accident', async () => {
    const res = await grade(fakeGemini(reply(['yes', 1, true, true, true], { thanks: '', followUp: '' })).client, typed);

    expect(res.json.passed).toBe(false);
    expect(res.json.hit).toEqual([rubricPoints[2]]);
    expect(res.json.miaReply).toBeTruthy();
  });

  it('marks a typed explanation by keywords when Gemini fails or there is no key', async () => {
    const good = { ...typed, explanation: 'Divide the top and the bottom by 4. 4/8 is 1/2, and 2/8 is less than 4/8.' };

    for (const client of [fakeGemini(new Error('model overloaded')).client, null]) {
      const res = await grade(client, good);
      expect(res.status).toBe(200);
      expect(res.json).toMatchObject({ passed: true, gradedBy: 'keywords', missing: [] });
      server?.close();
    }
  });

  it('sends a spoken explanation to Gemini as audio, and returns what it heard', async () => {
    const { client, requests } = fakeGemini(reply([true, true, false], { transcript: 'you divide the top and the bottom' }));

    const res = await grade(client, { ...typed, explanation: undefined, audio: { base64: 'GkXfo59ChoEBQveBAULygQ==', mimeType: 'audio/webm;codecs=opus' } });

    expect(res.json).toMatchObject({ passed: true, transcript: 'you divide the top and the bottom', gradedBy: 'gemini' });
    const parts = (requests[0].contents as { parts: Array<Record<string, any>> }).parts;
    expect(parts.find((p) => p.inlineData)?.inlineData).toEqual({ mimeType: 'audio/webm', data: 'GkXfo59ChoEBQveBAULygQ==' });
  });

  it('asks the kid to type when it cannot listen to a voice note', async () => {
    const res = await grade(null, { ...typed, explanation: undefined, audio: { base64: 'GkXfo59ChoEBQveBAULygQ==', mimeType: 'audio/webm' } });

    expect(res.status).toBe(503);
    expect(res.json.error).toMatch(/type/i);
  });

  it.each([
    ['no explanation or audio', { ...typed, explanation: '  ' }],
    ['no rubric', { ...typed, rubricPoints: [] }],
    ['a rubric that is not text', { ...typed, rubricPoints: [1, 2] }],
    ['an explanation that is far too long', { ...typed, explanation: 'x'.repeat(5000) }],
    ['audio of a kind Gemini cannot hear', { ...typed, explanation: undefined, audio: { base64: 'AAAA', mimeType: 'video/avi' } }],
    ['audio that is not base64', { ...typed, explanation: undefined, audio: { base64: 'not base64!', mimeType: 'audio/webm' } }],
  ])('refuses %s', async (_why, body) => {
    const { client, requests } = fakeGemini(reply([true, true, true]));

    const res = await grade(client, body);

    expect(res.status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  it('with the mock, a good explanation helps Mia and a shrug does not', async () => {
    const mock = createMockGemini({ delayMs: 0 });
    const good = await grade(mock, { ...typed, explanation: 'Do the same to the numerator and denominator: 4/8 is 1/2, and 2/8 is smaller than 4/8.' });
    server?.close();
    const shrug = await grade(mock, { ...typed, explanation: 'I dunno, it looks fine to me' });

    expect(good.json).toMatchObject({ passed: true, gradedBy: 'gemini' });
    expect(shrug.json).toMatchObject({ passed: false, hit: [] });
    expect(shrug.json.miaReply).toMatch(/\?$/);
  });
});
