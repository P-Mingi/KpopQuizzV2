import { test, expect } from '@playwright/test';

import { guardWrites } from '../ux-v1/helpers/guard';

// F3 for G4, issue C2-003: /join tells a phone the live mode is not open BEFORE it
// types a code (the page asks GET /api/live once, like the host screen). Reads
// only: every mutating request is answered locally by guardWrites and must not
// happen at all. GET /api/live is the real route of the server under test while
// v12-g4-live.sql is not applied (503 not_live); the "open" case answers it locally.

async function openJoin(page: import('@playwright/test').Page, url: string): Promise<number> {
  const res = await page.goto(url);
  const status = res?.status() ?? 0;
  if (status === 200) {
    await expect(page.locator('.ux-live-join .ux-live-pbody')).toHaveAttribute('data-ready', '1', { timeout: 20_000 });
  }
  return status;
}

test.describe('C2-003: the join page and a closed live mode', () => {
  test('closed: the notice is there before anything is typed, nothing is sent', async ({ page }) => {
    const writes = await guardWrites(page);
    await page.route((u) => u.pathname === '/api/live', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"not_live"}' }));
    test.skip((await openJoin(page, '/join')) !== 200, 'v12 is off here (/join answers 404)');
    const body = page.locator('.ux-live-join .ux-live-pbody');
    await expect(body).toHaveAttribute('data-open', 'no');
    await expect(body.locator('.ux-live-pmsg b')).toHaveText('Not open yet');
    await expect(body.locator('.ux-live-pmsg span')).toHaveText('Live blindtest is not open yet. Come back soon.');
    // the form stays (fail soft), under the notice
    await expect(page.getByLabel('Nickname')).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('the real server today (SQL not applied) says the same', async ({ page, request }) => {
    const writes = await guardWrites(page);
    const live = await request.get('/api/live');
    test.skip(live.status() === 404, 'v12 is off here');
    test.skip(live.status() === 200, 'the live mode is open on this server');
    expect(await openJoin(page, '/join/K7Q2PX')).toBe(200);
    await expect(page.locator('.ux-live-join .ux-live-pmsg b')).toHaveText('Not open yet');
    expect(writes).toEqual([]);
  });

  test('open: no notice', async ({ page }) => {
    const writes = await guardWrites(page);
    await page.route((u) => u.pathname === '/api/live', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"max":50}' }));
    test.skip((await openJoin(page, '/join')) !== 200, 'v12 is off here (/join answers 404)');
    await expect(page.getByLabel('Nickname')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('.ux-live-join .ux-live-pmsg')).toHaveCount(0);
    await expect(page.locator('.ux-live-join .ux-live-pbody')).not.toHaveAttribute('data-open', 'no');
    expect(writes).toEqual([]);
  });
});
