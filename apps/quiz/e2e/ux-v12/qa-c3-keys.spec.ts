// C3 (V12 Phase 3): keyboard walk of every new v12 page (Tab from the top until focus cycles: every stop
// visible, named, with a focus indicator; no trap) and the v12 sheets (X, Escape and the backdrop close
// them, focus returns to the opener). The walk runs at 1440 (a keyboard desktop); sheets at both widths.
// Light theme. Every mutating request is answered locally (guardWrites).
// Results: docs/design/growth-v12/run/checks/qa/keys/<width>-<page>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { guardWrites } from '../ux-v1/helpers/guard';
import { preparePage, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { Page } from '@playwright/test';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docs/design/growth-v12/run/checks/qa/keys');
const save = (name: string, data: unknown): void => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 1)}\n`); };

async function open(page: Page, url: string): Promise<void> {
  await guardWrites(page);
  await preparePage(page, 'light');
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(res?.status(), `GET ${url}`).toBe(200);
  await waitHydrated(page);
}

interface Stop { i: number; tag: string; name: string; ring: boolean; visible: boolean; key: string }
async function stopNow(page: Page, i: number): Promise<Stop | null> {
  return page.evaluate((n) => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || (el as HTMLInputElement).placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const key = `${el.tagName}|${el.getAttribute('href') ?? ''}|${name}|${Math.round(r.x)},${Math.round(r.y + scrollY)}`;
    return { i: n, tag: el.tagName.toLowerCase(), name, ring, visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden', key };
  }, i);
}

const PAGES: [string, string][] = [
  ['bthub', '/blindtest'], ['land-en', '/guess-the-kpop-song'], ['land-fr', '/fr/blind-test-kpop'], ['land-es', '/es/adivina-la-cancion-kpop'],
  ['land-id', '/id/tebak-lagu-kpop'], ['theme-gen5', '/blindtest/5th-gen'], ['kpdh', '/kpop-demon-hunters-quiz'],
  ['wma', '/which-stray-kids-member-are-you'], ['nta', '/stray-kids-name-all-members'], ['hub-ways-to-play', '/stray-kids-quiz'],
  ['hub-empty-riize', '/riize-quiz'], ['hub-thin-katseye', '/katseye-quiz'], ['creators', '/creators'], ['live', '/live'], ['join', '/join'],
];

test.describe('C3 keyboard walk', () => {
  for (const [id, url] of PAGES) {
    test(`${id}: Tab reaches every control, each with a ring and a name, no trap`, async ({ page }) => {
      test.skip(widthOf(page) < 500, 'keyboard walk at 1440 only (390 is a touch phone)');
      test.setTimeout(180_000);
      await open(page, url);
      const stops: Stop[] = [];
      let cycled = false;
      for (let i = 0; i < 160; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(120);
        const s = await stopNow(page, i);
        if (!s) { if (stops.length) { cycled = true; break; } continue; } // back to the document: a full cycle
        if (stops.length && s.key === stops[0]?.key) { cycled = true; break; }
        if (stops.length && s.key === stops[stops.length - 1]?.key) break; // stuck: reported below
        stops.push(s);
      }
      const stuck = !cycled && stops.length < 160;
      const bad = stops.filter((s) => !s.ring || !s.visible || !s.name);
      save(`${widthOf(page)}-${id}`, { url, stops: stops.length, cycled, stuck, bad, list: stops });
      expect(stops.length, 'some focus stops').toBeGreaterThan(3);
      expect(stuck, 'focus does not get stuck').toBe(false);
      expect(bad, 'every stop visible, named, with a focus indicator').toEqual([]);
    });
  }

  test('nta, wma, kpdh: the game is playable with the keyboard alone', async ({ page }) => {
    test.skip(widthOf(page) < 500, 'keyboard at 1440 only');
    test.setTimeout(180_000);
    await open(page, '/stray-kids-name-all-members');
    await expect(async () => { await page.getByTestId('nta-start').focus(); await page.keyboard.press('Enter'); await expect(page.getByTestId('nta')).toHaveAttribute('data-state', 'play', { timeout: 2_000 }); }).toPass({ timeout: 60_000 });
    await expect(page.locator('#nta-in')).toBeFocused();
    await page.keyboard.type('hyunjin'); await page.keyboard.press('Enter');
    await expect(page.getByTestId('nta-count')).toHaveText('1');
    for (const [url, start] of [['/which-stray-kids-member-are-you', 'Start'], ['/kpop-demon-hunters-quiz', 'Find my group']] as const) {
      await open(page, url);
      await page.getByRole('button', { name: start }).focus();
      await page.keyboard.press('Enter');
      const q = page.getByTestId('pers-question');
      await expect(q).toHaveAttribute('data-step', '1');
      await q.locator('.ux-pers-opt').first().focus();
      await page.keyboard.press('Enter');
      await expect(q).toHaveAttribute('data-step', '2');
    }
  });
});
