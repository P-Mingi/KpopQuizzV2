import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { openProto } from './helpers/proto';

// Writes fixtures/proto-first-pack.json: the first pack the prototype opens under the harness seed (rarity and new or copy of each of the 5 cards).
// The app side forces the same pattern through the mock's forcePack control so the opening screens compare the same content.
// Run on its own: KC_EXTRACT=1 playwright test -c ... extract-proto-pack
test('extract the prototype first pack', async ({ page }) => {
  test.skip(!process.env.KC_EXTRACT, 'run with KC_EXTRACT=1');
  await page.setViewportSize({ width: 1366, height: 657 });
  await openProto(page, 'lobby');
  await page.click('#open-btn');
  await page.click('#opk');
  await page.waitForSelector('#ov-skip:not([hidden])');
  await page.waitForTimeout(1200);
  await page.click('#ov-skip');
  await page.waitForSelector('#ov-add', { timeout: 20_000 });
  await page.waitForTimeout(2500);
  const cards = await page.$$eval('.fan .fc', (els) =>
    els.map((e) => ({
      rarity: (e.querySelector('.card')?.className.match(/\br-(C|U|R|SR|UR|L)\b/) || [])[1] ?? null,
      isNew: /new/i.test(e.querySelector('.rtag')?.textContent || ''),
      tag: (e.querySelector('.rtag')?.textContent || '').trim(),
    })),
  );
  const out = { seed: process.env.KC_SEED || '20261113', note: 'first pack of the v6 prototype example player, in draw order', cards };
  fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'proto-first-pack.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
});
