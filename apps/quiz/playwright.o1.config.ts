import { defineConfig, devices } from '@playwright/test';

// Run O1 (lane Q0a): the Playwright config of the O1 suites, separate from playwright.config.ts (never edited).
// Only files named *.o1.ts under e2e/o1/ are collected, so the default config's desktop and mobile projects (which
// collect *.spec.ts) never run an O1 spec, and this config never runs a kpop spec.
//   leak       e2e/o1/leak/      route, string, link, canonical and OG, content, JSON-LD spoiler, NetMe leaks
//   dev-multi  e2e/o1/dev-multi/ three hosts, three sessions (scripts/o1/dev-multi.sh)
//   lanes      e2e/o1/<LANE>/    a lane's own specs, listed in docs/o1/lanes.json ("specs"), run by gate-checks.sh
// No webServer: the suites test the servers they are given (gate-checks.sh, dev-multi.sh or a person), through
// O1_LEAK_<SITE>_URL and the other variables of e2e/o1/helpers/leak.ts. Browser: the Chromium build of the installed
// Playwright from ~/Library/Caches/ms-playwright (no download, no system channel), or O1_CHROMIUM when set.
// Deterministic by design: one worker, no retry (a leak is never flaky; a flaky server is a finding).
const EXEC = process.env.O1_CHROMIUM || undefined;
const LAUNCH = EXEC ? { launchOptions: { executablePath: EXEC } } : {};

export default defineConfig({
  testDir: './e2e/o1',
  testMatch: /\.o1\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: process.env.O1_PW_REPORT ? [['line'], ['json', { outputFile: process.env.O1_PW_REPORT }]] : [['line']],
  outputDir: process.env.O1_PW_OUT || 'test-results/o1',
  use: { headless: true, ...LAUNCH },
  projects: [
    { name: 'leak', testMatch: /leak\/.*\.o1\.ts$/, use: { ...devices['Desktop Chrome'], ...LAUNCH } },
    { name: 'dev-multi', testMatch: /dev-multi\/.*\.o1\.ts$/, use: { ...devices['Desktop Chrome'], ...LAUNCH } },
    { name: 'lanes', testIgnore: /(leak|dev-multi|parity)\//, use: { ...devices['Desktop Chrome'], ...LAUNCH } },
  ],
});
