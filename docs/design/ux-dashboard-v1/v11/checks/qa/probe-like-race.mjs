#!/usr/bin/env node
// C3 probe (P4 like count): the results Like pill reads GET /api/quiz/<id>/like on mount. If that
// read answers AFTER a click, does it overwrite the optimistic count? The read is delayed by 4 s
// (network latency stand-in); the POST is answered locally (never sent). Guest, 1440, flag on.
// Imports @playwright/test: copy into apps/quiz temporarily to run, never commit it there.
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3021';
const SLUG = 'ultimate-bts-era-quiz-only-real-armys-survive';
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const writes = [];
await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
  const r = route.request();
  if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) {
    if (/\/api\/quiz\/[^/]+\/like$/.test(new URL(r.url()).pathname)) {
      const res = await route.fetch();
      const body = await res.json();
      await new Promise((ok) => setTimeout(ok, 4000));
      writes.push({ read: 'GET like', answered: body });
      return route.fulfill({ response: res, json: body });
    }
    return route.continue();
  }
  writes.push({ method: r.method(), path: new URL(r.url()).pathname, body: r.postData() });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto(`${BASE}/q/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('.p4-act[data-ready]').waitFor({ state: 'attached', timeout: 90000 });
await page.locator('.p4-act .ux-btn-primary').click();
await page.locator('.p4-qq').waitFor({ timeout: 90000 });
const answers = page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');
for (let g = 0; g < 40; g++) {
  await answers.first().waitFor();
  await page.waitForFunction(() => !document.querySelector('.p4-answers .p4-ans[disabled], .p4-igrid .p4-ians[disabled]'), undefined, { timeout: 30000 }).catch(() => {});
  await answers.first().click();
  const next = page.locator('.p4-nextrow .ux-btn-primary');
  await next.waitFor();
  const label = await next.innerText();
  await next.click();
  if (/result/i.test(label)) break;
}
const like = page.locator('.p4-likeb');
await like.waitFor({ timeout: 30000 });
const read = async () => ({ text: (await like.innerText()).trim(), pressed: await like.getAttribute('aria-pressed') });
const t0 = await read();
await like.click();
const t1 = await read();
await page.waitForTimeout(6000);
const t2 = await read();
console.log(JSON.stringify({ beforeClick: t0, rightAfterClick: t1, after6s: t2, calls: writes }, null, 1));
await browser.close();
