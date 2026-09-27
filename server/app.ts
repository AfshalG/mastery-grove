import express from 'express';
import { createApiRouter } from './api';
import type { GeminiClient } from './gemini';

/** The Express app without the Vite/static layer or listen(), so tests can run it on a spare port. */
export function createApp(gemini: GeminiClient | null) {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/api', createApiRouter(gemini));
  return app;
}
