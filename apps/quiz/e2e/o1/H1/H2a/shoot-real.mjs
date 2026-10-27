// Run O1, lot H2c: full-page screenshots of the hub home with the real data of o1-dev (scripts/o1-tools/dev-up.sh), at 1440 and 390,
// signed out and signed in. The signed-in shots use the one-time link of scripts/o1-tools/signin-link.sh, passed in the environment
// variable H2C_LINK (never printed). Nothing is written but the images.
//   node apps/quiz/e2e/o1/H1/H2a/shoot-real.mjs <hubUrl> <outDir>
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const [base, outArg] = process.argv.slice(2);
if (!base || !outArg) { console.error('usage: shoot-real.mjs <hubUrl> <outDir>'); process.exit(2); }
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const link = process.env.H2C_LINK ?? '';
const browser = await chromium.launch();
// The link works once: the first signed-in context opens it and its cookies (in memory only) serve the other widths.
let session = null;
const jobs = [
  { name: 'real-1440-out.png', width: 1440, signedIn: false },
  { name: 'real-390-out.png', width: 390, signedIn: false },
];
if (link) jobs.push({ name: 'real-1440-in.png', width: 1440, signedIn: true }, { name: 'real-390-in.png', width: 390, signedIn: true });
for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.width, height: 900 }, deviceScaleFactor: 1, ...(j.signedIn && session ? { storageState: session } : {}) });
  const page = await ctx.newPage();
  if (j.signedIn && !session) {
    await page.goto(link, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(500);
    session = await ctx.storageState();
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, j.name), fullPage: true });
  console.log(j.name, j.width, 'x', await page.evaluate(() => document.documentElement.scrollHeight), 'signedIn=', j.signedIn, 'level chip=', await page.locator('.hub-h2-me').count());
  await ctx.close();
}
await browser.close();
