#!/usr/bin/env node
// Side-by-side "prototype | implementation" element shots for reports (worker
// prompt: "implementation screenshots vs reference"). Each pair renders the pinned
// prototype (docs/design/ux-dashboard-v1/prototype.html) in a v11/capture-prototype
// state and the implementation page, screenshots one element in each, and writes
// one WebP with the prototype on the left and the implementation on the right.
//
//   node e2e/ux-v1/helpers/compare-shots.mjs <pairs.json> <outDir> [baseUrl]
//
// pairs.json: [{ "name": "nav-1440-light", "width": 1440, "theme": "light",
//   "state": "home", "proto": ".nav", "path": "/", "impl": ".ux-nav",
//   "implJs": "optional JS run before the shot" }]
// Browser: UX11_CHROMIUM (no download). Image composition: sharp (root devDependency).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '../../..');
const ROOT = path.resolve(APP, '../..');
const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('@playwright/test');
const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');

const [pairsFile, outDir, base = 'http://localhost:3030'] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsFile, 'utf8'));
const PROTO = path.join(ROOT, 'docs/design/ux-dashboard-v1/prototype.html');

// capture-prototype.mjs launches a browser when imported, so its STATES table is
// read from the source text instead.
function stateJs(id) {
  const src = fs.readFileSync(path.join(ROOT, 'docs/design/ux-dashboard-v1/v11/capture-prototype.mjs'), 'utf8');
  const m = new RegExp(`'${id}':\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(src);
  if (!m) throw new Error(`unknown prototype state ${id}`);
  return m[1].replace(/\\"/g, '"');
}

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });
fs.mkdirSync(outDir, { recursive: true });

async function context(width, theme) {
  const phone = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  return ctx;
}

async function shotEl(page, sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  // hide sticky / fixed chrome that would overlap an element shot further down
  return el.screenshot({ animations: 'disabled' });
}

for (const p of pairs) {
  const ctxP = await context(p.width, p.theme);
  const pp = await ctxP.newPage();
  await pp.goto(pathToFileURL(PROTO).href);
  await pp.waitForTimeout(400);
  await pp.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
  await pp.evaluate((code) => { document.body.classList.remove('guest'); window.closeAll(); eval(code); }, stateJs(p.state));
  await pp.waitForTimeout(700);
  if (p.protoJs) { await pp.evaluate(p.protoJs); await pp.waitForTimeout(300); }
  const a = await shotEl(pp, p.proto);
  await ctxP.close();

  const ctxI = await context(p.width, p.theme);
  const pi = await ctxI.newPage();
  await pi.goto(base + p.path, { waitUntil: 'networkidle', timeout: 120000 });
  await pi.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn')), undefined, { timeout: 30000 }).catch(() => {});
  await pi.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); // the dev-server badge
  if (p.implJs) { await pi.evaluate(p.implJs); await pi.waitForTimeout(500); }
  const b = await shotEl(pi, p.impl);
  await ctxI.close();

  const ma = await sharp(a).metadata();
  const mb = await sharp(b).metadata();
  const gap = 24;
  const label = 28;
  const W = ma.width + mb.width + gap;
  const H = Math.max(ma.height, mb.height) + label;
  const bg = p.theme === 'dark' ? '#141312' : '#FFFFFF';
  const ink = p.theme === 'dark' ? '#A8A198' : '#6B655E';
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${label}"><style>text{font:600 13px sans-serif;fill:${ink}}</style><text x="0" y="18">prototype ${p.state} ${p.width} ${p.theme}</text><text x="${ma.width + gap}" y="18">implementation ${p.path}</text></svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
    .composite([{ input: svg, top: 0, left: 0 }, { input: a, top: label, left: 0 }, { input: b, top: label, left: ma.width + gap }])
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${p.name}.webp`));
  process.stdout.write(`wrote ${p.name}.webp (${ma.width}x${ma.height} | ${mb.width}x${mb.height})\n`);
}
await browser.close();
