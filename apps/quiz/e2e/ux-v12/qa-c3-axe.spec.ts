// C3 (V12 Phase 3): axe on the WHOLE page (not one component) for every v12 state a visitor can reach on
// a flag-on build without data that does not exist yet, light and dark, at the project width (ux-1440,
// ux-390). 0 serious or critical is the bar. Every mutating request is answered locally (guardWrites).
// Results: docs/design/growth-v12/run/checks/qa/axe/<width>-<theme>-<state>.json.
// States that need a pending SQL file or a signed-in creation (live rooms, quiz-bonus, share-kit,
// hub-fans-picked, theme-hits26, theme-kpdh*, community-team-post, post-team) are covered by their
// owners' component-scoped axe on mocked data and listed as NOT verified on real data in run/REPORT.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { runAxe } from '../ux-v1/helpers/a11y';
import { guardWrites } from '../ux-v1/helpers/guard';
import { horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { Page } from '@playwright/test';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docs/design/growth-v12/run/checks/qa/axe');

async function ntaStart(page: Page): Promise<void> {
  await expect(async () => {
    await page.getByTestId('nta-start').click({ timeout: 2_000 });
    await expect(page.getByTestId('nta')).toHaveAttribute('data-state', 'play', { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  for (const n of ['hyunjin', 'felix']) { await page.locator('#nta-in').fill(n); await page.locator('#nta-in').press('Enter'); }
  await expect(page.getByTestId('nta-count')).toHaveText('2');
}
async function persAll(page: Page, start: string): Promise<void> {
  await page.getByRole('button', { name: start }).click();
  const q = page.getByTestId('pers-question');
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId('pers-result').isVisible()) return;
    const step = await q.getAttribute('data-step');
    await q.locator('.ux-pers-opt').first().click();
    await expect(async () => {
      const done = await page.getByTestId('pers-result').isVisible();
      expect(done || (await q.getAttribute('data-step')) !== step).toBe(true);
    }).toPass({ timeout: 10_000 });
  }
  await expect(page.getByTestId('pers-result')).toBeVisible();
}

type Step = (page: Page) => Promise<void>;
const STATES: [string, string, Step?][] = [
  ['bthub', '/blindtest'],
  ['land-en', '/guess-the-kpop-song'], ['land-fr', '/fr/blind-test-kpop'], ['land-es', '/es/adivina-la-cancion-kpop'], ['land-id', '/id/tebak-lagu-kpop'],
  ['theme-gen5', '/blindtest/5th-gen'], ['theme-hits25', '/blindtest/kpop-hits-2025'], ['theme-viral', '/blindtest/tiktok-viral'],
  ['kpdh-intro', '/kpop-demon-hunters-quiz'],
  ['kpdh-question', '/kpop-demon-hunters-quiz', async (p) => { await p.getByRole('button', { name: 'Find my group' }).click(); await expect(p.getByTestId('pers-question')).toBeVisible(); }],
  ['kpdh-result', '/kpop-demon-hunters-quiz', (p) => persAll(p, 'Find my group')],
  ['wma-intro', '/which-stray-kids-member-are-you'],
  ['wma-question', '/which-stray-kids-member-are-you', async (p) => { await p.getByRole('button', { name: 'Start' }).click(); await expect(p.getByTestId('pers-question')).toBeVisible(); }],
  ['wma-result', '/which-stray-kids-member-are-you', (p) => persAll(p, 'Start')],
  ['nta-intro', '/stray-kids-name-all-members'],
  ['nta-play', '/stray-kids-name-all-members', ntaStart],
  ['nta-result', '/stray-kids-name-all-members', async (p) => { await ntaStart(p); await p.getByTestId('nta').getByRole('button', { name: 'Give up' }).click(); await expect(p.getByTestId('nta')).toHaveAttribute('data-state', 'end'); }],
  ['hub-ways-to-play', '/stray-kids-quiz'], ['hub-thin-katseye', '/katseye-quiz'], ['hub-empty-riize', '/riize-quiz'],
  ['creators', '/creators'], ['leaderboard', '/leaderboard'],
  ['live-setup', '/live'], ['live-join', '/join'],
];

for (const theme of THEMES) {
  test.describe(`C3 axe ${theme}`, () => {
    for (const [state, url, step] of STATES) {
      test(`${state}: whole page, 0 serious or critical`, async ({ page }) => {
        test.setTimeout(120_000);
        const writes = await guardWrites(page);
        await preparePage(page, theme);
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        expect(res?.status(), `GET ${url}`).toBe(200);
        await waitHydrated(page);
        if (step) await step(page);
        await page.waitForTimeout(400);
        const found = await runAxe(page);
        expect(found, 'axe-core resolved').not.toBeNull();
        const overflow = await horizontalOverflow(page);
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, `${widthOf(page)}-${theme}-${state}.json`), `${JSON.stringify({ state, url, width: widthOf(page), theme, overflow, writesStubbed: writes.map((w) => `${w.method} ${new URL(w.url).pathname}`), violations: found }, null, 1)}\n`);
        expect(found, `${state} ${theme}: axe serious / critical`).toEqual([]);
        expect(overflow, `${state}: no sideways scroll`).toBeLessThanOrEqual(0);
      });
    }
  });
}
