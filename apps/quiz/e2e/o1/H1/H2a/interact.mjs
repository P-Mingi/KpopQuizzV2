// Run O1, lot H2a: the interactions of the design's script, driven in the design and in the page with the same clicks, then compared block by block.
//   node apps/quiz/e2e/o1/H1/H2a/interact.mjs <hubBaseUrl> <outDir>
// Math.random is fixed (0.5) in both so Surprise me picks the same quiz; clocks are driven by real time, so the player is looked at after a pause
// (one tick) and after the ten seconds.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { diff, shotBlocks } from './cmp-lib.mjs';
import { startDesignServer } from './design-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const [base, outArg] = process.argv.slice(2);
if (!base || !outArg) { console.error('usage: interact.mjs <hubBaseUrl> <outDir>'); process.exit(2); }
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const { server, port } = await startDesignServer();
const browser = await chromium.launch();

// each step runs on both pages: `act(page, w)` with the width, then the block is compared
const cases = [
  { id: 'hot-filter-kpop', width: 1440, block: 'hot', act: (p) => p.getByRole('button', { name: 'KpopQuiz', exact: true }).click() },
  { id: 'hot-filter-anime', width: 1440, block: 'hot', act: (p) => p.getByRole('button', { name: 'OtakuQuiz', exact: true }).click() },
  { id: 'hot-filter-kpop-phone', width: 390, block: 'hot', act: (p) => p.getByRole('button', { name: 'K-pop', exact: true }).click() },
  { id: 'hot-filter-anime-phone', width: 390, block: 'hot', act: (p) => p.getByRole('button', { name: 'Anime', exact: true }).click() },
  { id: 'question-right', width: 1440, block: 'quick', act: (p) => p.getByRole('button', { name: 'Alice in Wonderland' }).click() },
  { id: 'question-wrong', width: 1440, block: 'quick', act: (p) => p.getByRole('button', { name: 'The Jungle Book' }).click() },
  { id: 'question-again', width: 1440, block: 'quick', act: async (p) => { await p.getByRole('button', { name: 'The Jungle Book' }).click(); await p.getByRole('button', { name: 'Try again' }).click(); } },
  { id: 'question-wrong-phone', width: 390, block: 'quick', act: (p) => p.getByRole('button', { name: 'The Jungle Book' }).click() },
  { id: 'question-right-phone', width: 390, block: 'quick', act: (p) => p.getByRole('button', { name: 'Alice in Wonderland' }).click() },
  { id: 'surprise', width: 1440, block: 'hero', act: (p) => p.getByRole('button', { name: 'Surprise me' }).click() },
  { id: 'surprise-another', width: 1440, block: 'hero', act: async (p) => { await p.getByRole('button', { name: 'Surprise me' }).click(); await p.getByRole('button', { name: 'Another' }).click(); } },
  { id: 'player-paused', width: 1440, block: 'today', act: async (p) => { await p.getByRole('button', { name: 'Play a 10 second preview' }).click(); await p.waitForTimeout(1500); await p.getByRole('button', { name: 'Pause the preview' }).click(); } },
  { id: 'player-done', width: 1440, block: 'today', act: async (p) => { await p.getByRole('button', { name: 'Play a 10 second preview' }).click(); await p.waitForTimeout(11500); } },
];

const rows = [];
for (const c of cases) {
  const dir = join(out, c.id);
  mkdirSync(dir, { recursive: true });
  const prep = async (page) => {
    await page.addInitScript(() => { Math.random = () => 0.5; });
  };
  const dctx = await browser.newContext({ viewport: { width: c.width, height: 900 } });
  const dpage = await dctx.newPage();
  await prep(dpage);
  await dpage.goto(`http://127.0.0.1:${port}/${c.width > 500 ? 'Main' : 'Mobile'}.dc.html?signedIn=0`);
  await dpage.waitForSelector('html[data-dc-ready]');
  await dpage.evaluate(() => document.fonts.ready);
  await c.act(dpage);
  await dpage.waitForTimeout(300);
  const dfiles = await shotBlocks(dpage, dir, 'design', true);
  const ictx = await browser.newContext({ viewport: { width: c.width, height: 900 } });
  const ipage = await ictx.newPage();
  await prep(ipage);
  await ipage.goto(base, { waitUntil: 'networkidle' });
  await ipage.evaluate(() => document.fonts.ready);
  await ipage.waitForTimeout(500);
  await c.act(ipage);
  await ipage.waitForTimeout(300);
  const ifiles = await shotBlocks(ipage, dir, 'impl', false);
  const r = await diff(dfiles[c.block], ifiles[c.block], join(dir, `diff-${c.block}.png`));
  rows.push(`${c.id}\t${c.block}\tdesign ${r.da}\tpage ${r.db}\tdiffering pixels ${((r.bad / r.total) * 100).toFixed(2)}%`);
  console.log(rows.at(-1));
  await dctx.close(); await ictx.close();
}
await browser.close(); server.close();
writeFileSync(join(out, 'interact.txt'), rows.join('\n') + '\n');
