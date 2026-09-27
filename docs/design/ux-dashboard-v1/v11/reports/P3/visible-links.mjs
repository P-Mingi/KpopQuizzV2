// Visible-link parity (C3-001): every /q/ link that the flag-OFF hub shows as a
// visible anchor (outside <noscript>, JS off or on) must be a VISIBLE anchor on the flag-ON hub,
// with JavaScript off and with JavaScript on. GET only, guest, every non-GET
// request aborted.
// usage: UX11_CHROMIUM=... node visible-links.mjs <flag-off base> <flag-on base> <path> [<path> ...]
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../apps/quiz/package.json'));
const { chromium } = require('@playwright/test');

const [A, B, ...paths] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM });

async function visibleQ(base, path, js) {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (r.request().method() === 'GET' || r.request().method() === 'HEAD' ? r.continue() : r.abort()));
  let ok = false;
  for (let i = 0; i < 6 && !ok; i++) {
    try {
      const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 180_000 });
      ok = Boolean(res && res.status() === 200);
    } catch { ok = false; }
    if (!ok) await page.waitForTimeout(3000);
  }
  if (!ok) throw new Error(`${base}${path} never answered 200`);
  // JS on: wait for hydration (the hub's quiz island marks itself data-live).
  if (js) await page.waitForFunction(() => document.readyState === 'complete' && (!document.querySelector('.p3-qs') || document.querySelector('.p3-qs[data-live]')), null, { timeout: 180_000 }).catch(() => {});
  const out = await page.evaluate(() => {
    const vis = new Set();
    for (const a of document.querySelectorAll('a[href^="/q/"]')) {
      if (a.closest('noscript')) continue;
      if (a.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && a.getClientRects().length > 0) vis.add(a.getAttribute('href'));
    }
    return [...vis];
  });
  await ctx.close();
  return new Set(out);
}

let bad = 0;
for (const p of paths) {
  const off = new Set([...(await visibleQ(A, p, false)), ...(await visibleQ(A, p, true))]);
  for (const js of [false, true]) {
    const on = await visibleQ(B, p, js);
    const missing = [...off].filter((h) => !on.has(h)).sort();
    bad += missing.length;
    console.log(`${p}  JS ${js ? 'on ' : 'off'}  flag-off visible /q/ ${off.size}  flag-on visible /q/ ${on.size}  missing ${missing.length}${missing.length ? ': ' + missing.join(' ') : ''}`);
  }
}
await browser.close();
console.log(bad ? `FAIL: ${bad} flag-off visible quiz link(s) not visible flag on` : 'OK: every flag-off visible quiz link is visible flag on (JS off and on)');
process.exit(bad ? 1 : 0);
