import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.TOUR_PORT ?? 3300);

// The feature tour (tour/feature-tour.spec.ts): drives the whole game against the real Gemini and records it.
// Needs GEMINI_API_KEY in .env. Run: bun run tour. Clips land in tour-out/.
export default defineConfig({
  testDir: './tour',
  timeout: 45 * 60_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    // A missing element fails the step in a minute instead of hanging the whole recording.
    actionTimeout: 60_000,
  },
  // A production build: no dev server watching files, so nothing can reload the page mid-take.
  webServer: {
    command: 'bun run build && bun run start',
    url: `http://localhost:${PORT}`,
    env: { PORT: String(PORT), NODE_ENV: 'production' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
