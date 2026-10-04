// F6b (AU3-002): sideways scroll probe on the empty hubs, 390 and 1440, light and dark.
// Every request that is not GET/HEAD/OPTIONS is answered locally (no production write).
// Usage (from the repo root of a worktree, dev server running with both flags):
//   BASE=http://localhost:3068 PW_CHROMIUM=<headless shell> node docs/design/growth-v12/run/reports/F6/F6b-hub-probe.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(path.resolve('apps/quiz/package.json'));
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE ?? 'http://localhost:3068';
const OUT = path.resolve('docs/design/growth-v12/run/reports/F6/F6b');
const HUBS = ['zerobaseone', 'boynextdoor', 'riize', 'nct-dream', 'rescene', 'nct-wish'];
const SIZES = [[390, 844], [1440, 900]];
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const rows = [];
let stubbed = 0;
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    await ctx.route('**/*', (r) => {
      if (SAFE.has(r.request().method())) return r.continue();
      stubbed++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    const page = await ctx.newPage();
    for (const g of HUBS) {
      await page.goto(`${BASE}/${g}-quiz`, { waitUntil: 'networkidle', timeout: 120_000 });
      const m = await page.evaluate(() => {
        const b = document.querySelector('[data-testid="hub-first"] .g8-fcreate-a .ux-btn');
        const r = b?.getBoundingClientRect();
        return {
          hasFirst: !!b,
          label: b?.textContent?.trim() ?? null,
          btnRight: r ? Math.round(r.right) : null,
          btnHeight: r ? Math.round(r.height) : null,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        };
      });
      const row = { hub: g, width: w, scheme, ...m, sideways: m.scrollW > m.clientW };
      rows.push(row);
      if (scheme === 'light' || w === 390) {
        const el = page.locator('[data-testid="hub-first"]');
        if (m.hasFirst) await el.screenshot({ path: path.join(OUT, `${g}-${w}-${scheme}.png`) });
      }
      console.log(JSON.stringify(row));
    }
    await ctx.close();
  }
}
await browser.close();
const bad = rows.filter((r) => r.sideways || (r.btnRight !== null && r.btnRight > r.clientW) || !r.hasFirst);
writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify({ base: BASE, stubbedWrites: stubbed, rows, bad }, null, 2) + '\n');
console.log(`rows=${rows.length} bad=${bad.length} stubbedWrites=${stubbed}`);
process.exit(bad.length ? 1 : 0);
