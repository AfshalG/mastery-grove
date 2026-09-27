import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);

// End-to-end tests run against the real server with mock Gemini, so they are fast, free and deterministic.
// `bun run test:e2e:headed` shows every step in a visible Chrome window; videos land in test-results/.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // the installed Google Chrome, which has working WebGL for the 3D forest
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    // iPhone 13 screen and touch, driven by Chrome (the device preset defaults to WebKit).
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome' } },
  ],
  webServer: {
    command: 'bun run dev',
    url: `http://localhost:${PORT}`,
    // DISABLE_HMR matches how AI Studio runs the app, and keeps Vite's reload socket out of the tests.
    env: { GEMINI_MOCK: '1', GEMINI_MOCK_DELAY_MS: '100', PORT: String(PORT), DISABLE_HMR: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
