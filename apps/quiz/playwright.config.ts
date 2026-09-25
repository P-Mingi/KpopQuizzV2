import { defineConfig, devices } from '@playwright/test';

// e2e for the tier-list front. Locally it uses the system Chrome (channel:
// 'chrome') so no browser download is needed. On CI (a GitHub runner has no such
// channel) it uses the Playwright-installed Chromium instead - the workflow runs
// `npx playwright install chromium --with-deps`. Feature specs point at a
// `next start` build on :3021 (never dev); the smoke spec needs no server.
//
// UX v11 run (worker prompt 3b): UX11_CHROMIUM = path of a cached Chromium build
// (the installed Playwright wants one that is not downloaded; no download is
// allowed), used as launchOptions.executablePath and replacing the channel.
// PLAYWRIGHT_BASE_URL targets another host (a dev port, a Vercel preview);
// VERCEL_AUTOMATION_BYPASS_SECRET is sent as x-vercel-protection-bypass when set.
// The `setup` project (e2e/ux-v1/auth.setup.ts) writes the parity test user's
// storage state first; it skips cleanly when that env is missing.
const EXEC = process.env.UX11_CHROMIUM || undefined;
const CHANNEL = process.env.CI || EXEC ? undefined : 'chrome';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3021';
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const LAUNCH = EXEC ? { launchOptions: { executablePath: EXEC } } : {};

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
    baseURL: BASE_URL,
    headless: true,
    // Explicit key (not a conditional spread) so `undefined` on CI overrides any
    // channel a device descriptor might bake in, forcing the bundled Chromium.
    channel: CHANNEL,
    ...LAUNCH,
    ...(BYPASS ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': BYPASS } } : {}),
  },
  projects: [
    { name: 'desktop', testIgnore: /ux-v1\//, use: { ...devices['Desktop Chrome'], channel: CHANNEL, ...LAUNCH } },
    { name: 'mobile', testIgnore: /ux-v1\//, use: { ...devices['Pixel 5'], channel: CHANNEL, ...LAUNCH } },
    // UX v11 specs: the two reference widths of v11/capture-prototype.mjs (1440 x 900
    // desktop; 390 x 844 touch phone, DPR 1), after the signed-in setup.
    { name: 'setup', testMatch: /ux-v1\/auth\.setup\.ts$/, use: { channel: CHANNEL, ...LAUNCH } },
    {
      name: 'ux-1440',
      testMatch: /ux-v1\/.*\.spec\.ts$/,
      testIgnore: /ux-v1\/parity\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, channel: CHANNEL, ...LAUNCH },
    },
    {
      name: 'ux-390',
      testMatch: /ux-v1\/.*\.spec\.ts$/,
      testIgnore: /ux-v1\/parity\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], userAgent: devices['Pixel 5'].userAgent, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, channel: CHANNEL, ...LAUNCH },
    },
    // Existing-account parity visits /profile -> /me, which is NOT read-only (it may
    // grant earned badge tiers and write a passport snapshot for the viewer). It runs
    // only when asked for (UX_V1_PARITY=1), where the owner allows those writes.
    ...(process.env.UX_V1_PARITY === '1'
      ? [{ name: 'ux-parity', testMatch: /ux-v1\/parity\.spec\.ts$/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'], channel: CHANNEL, ...LAUNCH } }]
      : []),
  ],
  // No webServer block: the built app on :3021 is started manually (next build +
  // next start), so the smoke spec runs with no server and feature specs run against
  // the real production-style build rather than dev.
});
