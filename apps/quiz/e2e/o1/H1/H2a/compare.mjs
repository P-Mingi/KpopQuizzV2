// Run O1, lot H2a: the block by block comparison of the home with the design, at 1440 and 390.
//   node apps/quiz/e2e/o1/H1/H2a/compare.mjs <hubBaseUrl> <outDir> [sessionCookie NAME=VALUE]
// For each block (top bar, hero, Today, 60 seconds, Hot right now, For you or Start easy, Crossover, Top fans and passport, footer) it
// screenshots the block of the design (Main.dc.html or Mobile.dc.html through the stand-in support.js) and the block of the page, and
// counts the pixels that differ (any channel by more than 24 of 255). The two diff images are written next to the screenshots.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { startDesignServer } from './design-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const [base, outArg, cookie] = process.argv.slice(2);
if (!base || !outArg) { console.error('usage: compare.mjs <hubBaseUrl> <outDir> [cookie]'); process.exit(2); }
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const { server, port } = await startDesignServer();
// H2A_CSS=<file>: lay the sheet of that file over the built one (to try a style change without a build of the app)
const extraCss = process.env.H2A_CSS ? readFileSync(process.env.H2A_CSS, 'utf8') : '';
const browser = await chromium.launch();

import { diff, shotBlocks } from './cmp-lib.mjs';

const rows = [];
const cases = [
  { id: '1440-out', width: 1440, design: 'Main.dc.html?signedIn=0', signed: false },
  { id: '1440-in', width: 1440, design: 'Main.dc.html?signedIn=1', signed: true },
  { id: '390-out', width: 390, design: 'Mobile.dc.html', signed: false },
];
for (const c of cases) {
  if (c.signed && !cookie) continue;
  const dir = join(out, c.id);
  mkdirSync(dir, { recursive: true });
  const dctx = await browser.newContext({ viewport: { width: c.width, height: 900 } });
  const dpage = await dctx.newPage();
  await dpage.goto(`http://127.0.0.1:${port}/${c.design}`);
  await dpage.waitForSelector('html[data-dc-ready]');
  await dpage.evaluate(() => document.fonts.ready);
  await dpage.waitForTimeout(400);
  const dfiles = await shotBlocks(dpage, dir, 'design', true);
  const ictx = await browser.newContext({ viewport: { width: c.width, height: 900 } });
  if (c.signed) { const i = cookie.indexOf('='); await ictx.addCookies([{ name: cookie.slice(0, i), value: cookie.slice(i + 1), domain: new URL(base).hostname, path: '/' }]); }
  const ipage = await ictx.newPage();
  await ipage.goto(base, { waitUntil: 'networkidle' });
  if (extraCss) await ipage.addStyleTag({ content: extraCss });
  await ipage.evaluate(() => document.fonts.ready);
  await ipage.waitForTimeout(600);
  const ifiles = await shotBlocks(ipage, dir, 'impl', false);
  for (const n of Object.keys(dfiles)) {
    if (!ifiles[n]) { rows.push({ id: c.id, block: n, note: 'missing in the page' }); continue; }
    const r = await diff(dfiles[n], ifiles[n], join(dir, `diff-${n}.png`));
    rows.push({ id: c.id, block: n, ...r, pct: ((r.bad / r.total) * 100).toFixed(2) });
  }
  await dctx.close(); await ictx.close();
}
await browser.close(); server.close();
const lines = rows.map((r) => (r.note ? `${r.id}\t${r.block}\t${r.note}` : `${r.id}\t${r.block}\tdesign ${r.da}\tpage ${r.db}\tdiffering pixels ${r.pct}%`));
writeFileSync(join(out, 'compare.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
