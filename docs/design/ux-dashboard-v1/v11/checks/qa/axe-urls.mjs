// C3: serious/critical axe on a URL list of one server (whole document). Imports @playwright/test: copy it into apps/quiz temporarily to run, never commit it there.
// node c3-axe-urls.mjs <base> <width> <theme> <path>...
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const [, , base, width, theme, ...paths] = process.argv;
const cfg = fs.realpathSync(path.join(process.cwd(), 'node_modules/eslint-config-next'));
const plugin = createRequire(path.join(cfg, 'index.js')).resolve('eslint-plugin-jsx-a11y');
const axePath = createRequire(plugin).resolve('axe-core');
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM });
const w = Number(width);
const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500 });
await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
const page = await ctx.newPage();
await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (r) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method())) return r.continue();
  return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.addScriptTag({ path: axePath });
  const v = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, nodes: x.nodes.slice(0, 6).map((n) => ({ t: n.target.join(' '), html: n.html.slice(0, 160), s: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 200) })) }));
  });
  console.log(JSON.stringify({ base, p, width: w, theme, violations: v }));
}
await browser.close();
