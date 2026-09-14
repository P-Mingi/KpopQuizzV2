import { defineConfig, devices } from '@playwright/test';

// e2e for the tier-list front. Locally it uses the system Chrome (channel:
// 'chrome') so no browser download is needed. On CI (a GitHub runner has no such
// channel) it uses the Playwright-installed Chromium instead - the workflow runs
// `npx playwright install chromium --with-deps`. Feature specs point at a
// `next start` build on :3021 (never dev); the smoke spec needs no server.
const CHANNEL = process.env.CI ? undefined : 'chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // These feature specs hit a shared LIVE Supabase (bank reads, the publish gate),
  // so a transient slow round-trip can flake a run; retry twice to absorb that
  // without masking a real failure (a genuine break fails all attempts).
  retries: 2,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : [['line']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3021',
    headless: true,
    // Explicit key (not a conditional spread) so `undefined` on CI overrides any
    // channel a device descriptor might bake in, forcing the bundled Chromium.
    channel: CHANNEL,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 5'], channel: CHANNEL } },
  ],
  // No webServer block: the built app on :3021 is started manually (next build +
  // next start), so the smoke spec runs with no server and feature specs run against
  // the real production-style build rather than dev.
});
