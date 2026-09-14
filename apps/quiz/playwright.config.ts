import { defineConfig, devices } from '@playwright/test';

// e2e for the tier-list front. Uses the system Chrome (channel: 'chrome') so no
// browser download is needed (playwright install is intentionally NOT run). Feature
// specs point at a `next start` build on :3021 (never dev); the smoke spec needs no
// server. Start the built server yourself, or let the webServer block reuse it.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  // These feature specs hit a shared LIVE Supabase (bank reads, the publish gate),
  // so a transient slow round-trip can flake a run; retry twice to absorb that
  // without masking a real failure (a genuine break fails all attempts).
  retries: 2,
  reporter: [['line']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3021',
    headless: true,
    channel: 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 5'], channel: 'chrome' } },
  ],
  // No webServer block: the built app on :3021 is started manually (next build +
  // next start), so the smoke spec runs with no server and feature specs run against
  // the real production-style build rather than dev.
});
