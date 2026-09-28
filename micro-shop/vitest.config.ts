import { defineConfig } from 'vitest/config';

// Unit tests for the whole workspace. Each test file runs in its own isolated
// environment, so module-level state (stores, the event log on `window`) starts
// fresh in every file.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
  },
});
