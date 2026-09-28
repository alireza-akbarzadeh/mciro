import { defineConfig } from '@playwright/test';

// End-to-end tests against the REAL composed system: the gateway (:8080), the
// storefront, the shell and all three remotes, each on its own dev server.
//
// `pnpm test:e2e` starts everything with `pnpm dev` (or reuses servers you
// already have running) and drives the locally installed Chrome, so no browser
// download is needed. Set E2E_CHANNEL=msedge to use Edge instead.

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    cwd: '../..',
    // The gateway answers 502 until the storefront is up; Playwright waits for a 2xx.
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
});
