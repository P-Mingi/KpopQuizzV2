// Run O1, lot H2a: full-page screenshots of the design itself (Main.dc.html at 1440 signed out and signed in, Mobile.dc.html at 390).
//   node apps/quiz/e2e/o1/H1/H2a/design-shots.mjs <outDir>
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { startDesignServer } from './design-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const out = resolve(process.argv[2] ?? 'design-shots');
mkdirSync(out, { recursive: true });
const { server, port } = await startDesignServer();
const browser = await chromium.launch();
const jobs = [
  { file: 'Main.dc.html', query: '?signedIn=0', width: 1440, name: 'design-1440-out.png' },
  { file: 'Main.dc.html', query: '?signedIn=1', width: 1440, name: 'design-1440-in.png' },
  { file: 'Mobile.dc.html', query: '', width: 390, name: 'design-390.png' },
];
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/${j.file}${j.query}`);
  await page.waitForSelector('html[data-dc-ready]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, j.name), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(j.name, j.width, 'x', h);
  await page.close();
}
await browser.close();
server.close();
