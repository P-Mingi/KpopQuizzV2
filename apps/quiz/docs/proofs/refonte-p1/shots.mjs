// REFONTE P1 proof screenshots, captured against the built app on :3021
// (next build + next start, never dev). Desktop 1440 + mobile 390.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3021';
const OUT = new URL('.', import.meta.url).pathname;

const shots = [
  { name: 'home-desktop-1440', path: '/', width: 1440, height: 1200 },
  { name: 'community-desktop-1440', path: '/leaderboard', width: 1440, height: 1400 },
  { name: 'home-mobile-390', path: '/', width: 390, height: 1400, mobile: true },
  { name: 'community-mobile-390', path: '/leaderboard', width: 390, height: 1500, mobile: true },
  // The mobile nav bars (top bar has no Verse toggle; bottom tab bar has no Games).
  { name: 'nav-mobile-390-top', path: '/quizzes', width: 390, height: 844, mobile: true },
];

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    ...(s.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${s.path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${s.name}.png`, fullPage: !s.name.startsWith('nav-') });
  console.log('captured', s.name);
  await ctx.close();
}
await browser.close();
console.log('done');
