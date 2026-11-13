import { defineConfig, devices } from '@playwright/test';

// Harness of agent D (KpopCards QA). Run from apps/quiz: see e2e/o1/CARDS/kpopcards/README.md.
// One browser project at a time: KC_PROJECT=chromium|firefox|webkit (default chromium).
const project = process.env.KC_PROJECT || 'chromium';
const map = { chromium: devices['Desktop Chrome'], firefox: devices['Desktop Firefox'], webkit: devices['Desktop Safari'] } as const;

export default defineConfig({
  testDir: './kpopcards',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['line']],
  use: {
    headless: true,
    deviceScaleFactor: 1,
    viewport: { width: 1440, height: 860 },
    timezoneId: 'Europe/Paris',
    locale: 'en-GB',
    ...map[project as keyof typeof map],
    deviceScaleFactor: 1,
  },
  projects: [{ name: project }],
});
