// Run O1, lot H2a: full-page screenshots of the hub home (a local hub server) at 1440 and 390.
//   node apps/quiz/e2e/o1/H1/H2a/shoot.mjs <baseUrl> <outDir> [signedInCookieName=value ...]
// Signed in: pass the session cookie of the local fake database (fake-supabase.mjs prints it); the name of each shot says which.
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const [base, outArg, ...cookies] = process.argv.slice(2);
if (!base || !outArg) { console.error('usage: shoot.mjs <baseUrl> <outDir> [cookie ...]'); process.exit(2); }
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
// H2A_CSS=<file>: lay the sheet of that file over the built one (to try a style change without a build of the app)
const extraCss = process.env.H2A_CSS ? readFileSync(process.env.H2A_CSS, 'utf8') : '';
const browser = await chromium.launch();
const jobs = [
  { name: 'impl-1440-out.png', width: 1440, signedIn: false },
  { name: 'impl-390-out.png', width: 390, signedIn: false },
];
if (cookies.length) jobs.push({ name: 'impl-1440-in.png', width: 1440, signedIn: true }, { name: 'impl-390-in.png', width: 390, signedIn: true });
for (const j of jobs) {
  const ctx = await browser.newContext({ viewport: { width: j.width, height: 900 }, deviceScaleFactor: 1, isMobile: false });
  if (j.signedIn) {
    const host = new URL(base).hostname;
    await ctx.addCookies(cookies.map((c) => { const i = c.indexOf('='); return { name: c.slice(0, i), value: c.slice(i + 1), domain: host, path: '/' }; }));
  }
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  if (extraCss) await page.addStyleTag({ content: extraCss });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, j.name), fullPage: true });
  console.log(j.name, j.width, 'x', await page.evaluate(() => document.documentElement.scrollHeight));
  await ctx.close();
}
await browser.close();
