import { test, expect } from '@playwright/test';

import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { hasShell, preparePage, THEMES, waitHydrated } from '../ux-v1/helpers/setup-page';

import type { Page } from '@playwright/test';

// F7b (owner fixes after his Firefox test, 2026-10-04), at the project width
// (ux-1440 / ux-390), light and dark, signed out. Every page is wrapped with
// guardWrites and each test asserts that nothing mutating was attempted.
//  4. The top bar logo is the rabbit mascot (the favicon art), 28 x 28, loaded.
//  5. The home "New quizzes" thumbs are 56 x 56 and never grey: the type icon is in
//     every tile, a picture is loaded over it, and when every picture fails the icon
//     remains (no broken image, no alt text).
//  +  The groups rail photos fill their 80 px circle (no 80 x 120 box cut mid-face).
// The v11 shell is the condition: flag off, nothing here exists and the spec skips.

const env = loadTestEnv();

async function openHome(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await preparePage(page, theme);
  await page.goto('/', { waitUntil: 'load' });
  test.skip(!(await hasShell(page)), 'v11 shell off (NEXT_PUBLIC_UX_V1 unset): nothing to check');
}

const newSection = (page: Page) => page.locator('.p1-two > div').filter({ has: page.locator('#p1-new-h') });

for (const theme of THEMES) {
  test.describe(`F7b home and brand (${theme})`, () => {
    test('top bar logo: the rabbit mascot, 28 x 28, no K tile', async ({ page }) => {
      const writes = await guardWrites(page, env.supabaseUrl);
      await openHome(page, theme);
      const img = page.locator('.ux-nav .ux-brand img').first();
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      expect(decodeURIComponent((await img.getAttribute('src')) ?? '')).toContain('/mascot/mascot-default.png');
      const box = await img.boundingBox();
      expect([Math.round(box?.width ?? 0), Math.round(box?.height ?? 0)]).toEqual([28, 28]);
      expect(await page.locator('.ux-brand-mk').count()).toBe(0);
      await expect(page.locator('.ux-nav .ux-brand')).toHaveText('KpopQuiz');
      expect(writes).toEqual([]);
    });

    test('New quizzes: 56 px thumbs, icon in every tile, pictures loaded', async ({ page }) => {
      const writes = await guardWrites(page, env.supabaseUrl);
      await openHome(page, theme);
      const thumbs = newSection(page).locator('.p1-nthumb');
      await expect(thumbs.first()).toBeVisible();
      await waitHydrated(page);
      for (const t of await thumbs.all()) {
        await t.scrollIntoViewIfNeeded();
        await expect.poll(() => t.evaluate((e) => `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)).toBe('56x56');
        expect(await t.locator('svg').count()).toBe(1);
        const kind = await t.getAttribute('data-thumb');
        if (kind === 'picture') {
          await expect.poll(() => t.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
          expect(await t.locator('img').getAttribute('loading')).toBe('eager');
        } else {
          expect(kind).toBe('icon');
        }
      }
      expect(writes).toEqual([]);
    });

    test('New quizzes: every picture failing leaves the icon, never an empty tile', async ({ page }) => {
      const writes = await guardWrites(page, env.supabaseUrl);
      await page.route(/\/_next\/image\?/, (r) => r.fulfill({ status: 404, body: '' }));
      await openHome(page, theme);
      const thumbs = newSection(page).locator('.p1-nthumb');
      await expect(thumbs.first()).toBeVisible();
      await expect.poll(() => newSection(page).locator('.p1-nthumb img').count(), { timeout: 15_000 }).toBe(0);
      for (const t of await thumbs.all()) {
        expect(await t.getAttribute('data-thumb')).toBe('icon');
        await expect(t.locator('svg')).toBeVisible();
      }
      expect(writes).toEqual([]);
    });

    test('groups rail: every photo fills its 80 px circle', async ({ page }) => {
      const writes = await guardWrites(page, env.supabaseUrl);
      await openHome(page, theme);
      const boxes = await page.locator('.p1-gav img').evaluateAll((is) => is.map((i) => {
        const r = i.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      }));
      expect(boxes.length).toBeGreaterThan(0);
      expect(boxes.every((b) => b === '80x80'), boxes.join(' ')).toBe(true);
      expect(writes).toEqual([]);
    });
  });
}
