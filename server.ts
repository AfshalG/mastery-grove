// Entry point (AI Studio runs `tsx server.ts`). Routes live in server/api.ts, the Gemini client in server/gemini.ts.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createApp } from './server/app';
import { createGeminiClient, type GeminiClient } from './server/gemini';
import { createMockGemini } from './server/mockGemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// GEMINI_MOCK=1 swaps in deterministic replies for tests and offline demos; otherwise the real API if a key is set.
function makeGemini(): GeminiClient | null {
  if (process.env.GEMINI_MOCK === '1') {
    console.log('[Gemini] Using mock replies (GEMINI_MOCK=1).');
    return createMockGemini({ delayMs: Number(process.env.GEMINI_MOCK_DELAY_MS ?? 150) });
  }
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY is not set, so AI features will answer with an error.');
    return null;
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  return createGeminiClient({ generateContent: (params) => ai.models.generateContent(params) });
}

const app = createApp(makeGemini());

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Mastery Grove server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
