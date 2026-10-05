// C3 (V12 Phase 3): the v12 sheets a visitor can open without pending data (Name them all share, Which member
// share, KPop Demon Hunters share): X, Escape and a click on the backdrop each close the sheet, and focus
// returns to the button that opened it. Both widths (centred card at 1440, bottom sheet at 390), light.
// The share kit (signed-in create) and the live Players sheet (a room) are covered by G8 and G4 specs.
// Results: docs/design/growth-v12/run/checks/qa/sheets/<width>-<sheet>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { guardWrites } from '../ux-v1/helpers/guard';
import { preparePage, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { Locator, Page } from '@playwright/test';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docs/design/growth-v12/run/checks/qa/sheets');

async function open(page: Page, url: string): Promise<void> {
  await guardWrites(page);
  await preparePage(page, 'light');
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(res?.status(), `GET ${url}`).toBe(200);
  await waitHydrated(page);
}
async function persResult(page: Page, start: string): Promise<void> {
  await page.getByRole('button', { name: start }).click();
  const q = page.getByTestId('pers-question');
  for (let i = 0; i < 12 && !(await page.getByTestId('pers-result').isVisible()); i++) {
    const step = await q.getAttribute('data-step');
    await q.locator('.ux-pers-opt').first().click();
    await expect(async () => { expect((await page.getByTestId('pers-result').isVisible()) || (await q.getAttribute('data-step')) !== step).toBe(true); }).toPass({ timeout: 10_000 });
  }
  await expect(page.getByTestId('pers-result')).toBeVisible();
}

/** Opens the sheet from `opener`, closes it three ways, checks focus comes back each time. */
async function threeWays(page: Page, opener: Locator, name: string): Promise<void> {
  const log: Record<string, unknown> = {};
  const dialog = page.getByRole('dialog');
  const ways: [string, () => Promise<void>][] = [
    ['x', () => dialog.getByRole('button', { name: 'Close' }).click()],
    ['escape', () => page.keyboard.press('Escape')],
    ['backdrop', () => page.mouse.click(4, 4)],
  ];
  for (const [way, close] of ways) {
    await opener.scrollIntoViewIfNeeded();
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await page.waitForTimeout(100);
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
    await close();
    await expect(dialog).toHaveCount(0);
    const back = await opener.evaluate((el) => el === document.activeElement);
    log[way] = { focusInsideWhenOpen: inside, closed: true, focusBackOnOpener: back };
    expect(inside, `${name}: focus moves into the sheet`).toBe(true);
    expect(back, `${name} ${way}: focus returns to the opener`).toBe(true);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${widthOf(page)}-${name}.json`), `${JSON.stringify(log, null, 1)}\n`);
}

test.describe('C3 sheets', () => {
  test('nta share sheet', async ({ page }) => {
    test.setTimeout(150_000);
    await open(page, '/stray-kids-name-all-members');
    await expect(async () => { await page.getByTestId('nta-start').click({ timeout: 2_000 }); await expect(page.getByTestId('nta')).toHaveAttribute('data-state', 'play', { timeout: 2_000 }); }).toPass({ timeout: 60_000 });
    await page.getByTestId('nta').getByRole('button', { name: 'Give up' }).click();
    await expect(page.getByTestId('nta')).toHaveAttribute('data-state', 'end');
    await threeWays(page, page.getByTestId('nta').getByRole('button', { name: 'Share', exact: true }), 'nta-share');
  });
  for (const [id, url, start] of [['wma-share', '/which-stray-kids-member-are-you', 'Start'], ['kpdh-share', '/kpop-demon-hunters-quiz', 'Find my group']] as const) {
    test(`${id} sheet`, async ({ page }) => {
      test.setTimeout(150_000);
      await open(page, url);
      await persResult(page, start);
      await threeWays(page, page.getByTestId('pers-result').getByRole('button', { name: 'Share my result' }), id);
    });
  }
});
