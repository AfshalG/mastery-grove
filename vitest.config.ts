import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app's build config (which AI Studio relies on) stays untouched.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
  },
});
