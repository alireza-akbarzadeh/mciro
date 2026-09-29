import { defineConfig } from 'vitest/config';

// Unit tests for the whole workspace. Each test file runs in its own isolated
// environment, so module-level state (stores, the event log on `window`) starts
// fresh in every file.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    // The storefront follows Next.js layout (app/, lib/), not src/.
    include: [
      'apps/*/src/**/*.test.ts',
      'apps/storefront/lib/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
    ],
  },
});
