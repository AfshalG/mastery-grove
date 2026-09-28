import type { GenerateContentParameters } from '@google/genai';

/** Every Gemini call is named, so the cache, the logs and the mock can tell them apart. */
export type EndpointName =
  | 'generate-world'
  | 'predict-trees'
  | 'diagnose-thought-process'
  | 'revise-thought-process'
  | 'generate-targeted-sapling'
  | 'generate-retention-check'
  | 'generate-intervention'
  | 'generate-targeted-questions'
  | 'deploy-teacher-quest'
  | 'generate-rundown'
  | 'grade-teach-back';

export interface GeminiRequest {
  endpointName: EndpointName;
  contents: GenerateContentParameters['contents'];
  config?: GenerateContentParameters['config'];
  /** The structured request behind the prompt. The real client ignores it; the mock builds its reply from it. */
  input?: unknown;
}

export interface GeminiClient {
  /** Calls Gemini and returns the parsed JSON reply. Throws if every model fails or the reply is empty or not JSON. */
  generateJson(req: GeminiRequest): Promise<unknown>;
}

/**
 * Model rotation order. On a quota error (429 / RESOURCE_EXHAUSTED) we move to the next model at once;
 * on 503 / overloaded we back off 1s, 2s, 4s on the same model before moving on.
 */
export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

const CACHE_TTL_MS = 10 * 60 * 1000;
const BACKOFF_MS = [1000, 2000, 4000];

/**
 * How long one model gets to answer before we cancel and ask the next. Without a limit, one stuck request left
 * the teacher's "Byte is writing a lesson plan…" spinning forever. Building a world (from a photo, say) is slower.
 */
export function timeLimitFor(endpoint: EndpointName) {
  return endpoint === 'generate-world' ? 120_000 : endpoint === 'grade-teach-back' ? 45_000 : 40_000;
}

class TimedOut extends Error {}

type GenerateContent = (params: GenerateContentParameters) => Promise<{ text?: string }>;

export function createGeminiClient(deps: {
  generateContent: GenerateContent;
  models?: string[];
  sleep?: (ms: number) => Promise<void>;
  /** Per-attempt time limit; tests pass a short one. */
  timeoutMs?: (endpoint: EndpointName) => number;
}): GeminiClient {
  const models = deps.models ?? GEMINI_MODELS;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const limit = deps.timeoutMs ?? timeLimitFor;

  /** One attempt, cancelled (abortSignal) and given up on if it takes longer than the limit. */
  async function tryModel(model: string, req: GeminiRequest) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new TimedOut(`${model} didn’t answer in time for ${req.endpointName}.`));
      }, limit(req.endpointName));
    });
    try {
      return await Promise.race([
        deps.generateContent({ model, contents: req.contents, config: { ...req.config, abortSignal: controller.signal } }),
        expired,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  const cache = new Map<string, { data: unknown; expiresAt: number }>();

  async function callWithFallback(req: GeminiRequest) {
    let lastError: unknown = null;

    for (const model of models) {
      for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
        try {
          return await tryModel(model, req);
        } catch (error: any) {
          lastError = error;
          if (error instanceof TimedOut) {
            console.warn(`[Gemini] ${error.message} Trying the next model.`);
            break;
          }
          const msg = String(error?.message || '');
          const status = error?.status || error?.statusCode;

          const isQuota =
            status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('Resource has been exhausted') || msg.includes('quota');
          if (isQuota) {
            console.warn(`[Gemini] ${req.endpointName}: quota on ${model}, trying the next model`);
            break;
          }

          const isBusy =
            status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') ||
            msg.includes('high demand') || msg.includes('overloaded');
          if (isBusy && attempt < BACKOFF_MS.length) {
            console.warn(`[Gemini] ${req.endpointName}: ${model} busy (attempt ${attempt + 1}), waiting ${BACKOFF_MS[attempt]}ms`);
            await sleep(BACKOFF_MS[attempt]);
            continue;
          }
          break;
        }
      }
    }

    throw lastError || new Error('All Gemini model fallbacks exhausted.');
  }

  return {
    async generateJson(req) {
      const key = JSON.stringify({ ep: req.endpointName, contents: req.contents, config: req.config });
      const hit = cache.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.data;

      const response = await callWithFallback(req);
      const text = response.text;
      if (!text) throw new Error(`Gemini returned an empty response for ${req.endpointName}.`);

      // Parse before caching so a malformed reply is never served again from the cache.
      const data = JSON.parse(text);
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    },
  };
}
