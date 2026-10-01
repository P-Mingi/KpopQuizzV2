#!/usr/bin/env node
// P10 report images: "prototype reference | implementation" (and "before | after |
// prototype" for the PR), full page, per width and theme. Read only: every
// mutating request of the implementation page is answered locally (same rule as
// e2e/ux-v1/helpers/guard.ts) and counted; the script fails if one was attempted.
// Signed-in shots use the Playwright setup's storage state (never printed).
//
//   UX11_CHROMIUM=... node make-shots.mjs <jobs.json> <outDir>
//   jobs: [{ "name", "state", "width", "theme", "after": "http://localhost:3040/u/testtest",
//            "before": "http://localhost:4102/u/testtest" (optional), "auth": true|false,
//            "js": "optional JS run on the implementation page", "overlay": true|false }]
// References: docs/design/ux-dashboard-v1/v11/checks/reference/<w>-<theme>-<state>.png
// (local, from v11/capture-prototype.mjs; the reference PNGs are not committed).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const APP = path.join(ROOT, 'apps/quiz');
const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('@playwright/test');
const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
const REF = process.env.UX11_REF_DIR || '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference';
const AUTH = path.join(APP, 'e2e/.auth/test-user.json');

const [jobsFile, outDir] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function shoot(url, j) {
  const phone = j.width < 500;
  const ctx = await browser.newContext({
    viewport: { width: j.width, height: phone ? 844 : 900 }, colorScheme: j.theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1, reducedMotion: 'reduce',
    ...(j.auth && fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, j.theme);
  const page = await ctx.newPage();
  let writes = 0;
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
    writes++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn, header, nav')), undefined, { timeout: 30000 }).catch(() => {});
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  if (j.waitFor) await page.waitForSelector(j.waitFor, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(900);
  if (j.js) { await page.evaluate(j.js); await page.waitForTimeout(900); }
  const buf = await page.screenshot({ fullPage: !j.overlay, animations: 'disabled' });
  await ctx.close();
  if (writes) throw new Error(`${url}: ${writes} write attempt(s)`);
  return buf;
}

const scale = async (buf, w) => sharp(buf).resize({ width: w }).png().toBuffer();

for (const j of jobs) {
  const col = j.width < 500 ? j.width : 720;
  const panels = [];
  if (j.before) panels.push(['before (flag off)', await scale(await shoot(j.before, j), col)]);
  panels.push([`after (flag on) ${new URL(j.after).pathname}`, await scale(await shoot(j.after, j), col)]);
  const refFile = path.join(REF, `${j.width}-${j.theme}-${j.state}.png`);
  panels.push([`prototype ${j.state} ${j.width} ${j.theme}`, await scale(fs.readFileSync(refFile), col)]);
  if (j.order === 'proto-first') panels.unshift(panels.pop());
  const metas = await Promise.all(panels.map(([, b]) => sharp(b).metadata()));
  const gap = 24; const label = 28;
  const W = metas.reduce((s, m) => s + m.width, 0) + gap * (panels.length - 1);
  const H = Math.max(...metas.map((m) => m.height)) + label;
  const bg = j.theme === 'dark' ? '#141312' : '#FFFFFF';
  const ink = j.theme === 'dark' ? '#A8A198' : '#6B655E';
  let x = 0;
  const comps = [];
  const texts = [];
  panels.forEach(([name, b], i) => { comps.push({ input: b, top: label, left: x }); texts.push(`<text x="${x}" y="18">${name}</text>`); x += metas[i].width + gap; });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${label}"><style>text{font:600 13px sans-serif;fill:${ink}}</style>${texts.join('')}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
    .composite([{ input: svg, top: 0, left: 0 }, ...comps])
    .webp({ quality: 72 })
    .toFile(path.join(outDir, `${j.name}.webp`));
  process.stdout.write(`wrote ${j.name}.webp (${W}x${H})\n`);
}
await browser.close();
