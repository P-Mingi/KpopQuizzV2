#!/usr/bin/env node
// C1 pixel checker (V12 run): the 40 v12 states of docs/design/growth-v12/capture-v12.mjs at 1440 x 900 and
// 390 x 844, light and dark, on the flag-on build (default :3071) against run/checks/reference:
//   1. landmark boxes within 2px of the prototype measured live in the same state (capture order replayed),
//   2. computed styles equal to styles.json (owner deviations applied) for its landmarks, else to the live
//      prototype (px within 0.5),
//   3. no horizontal scroll at 390, 4. a masked pixel diff vs the reference PNG (information only).
// Framing as the reference: viewport shot, anchor at the top with 80px above it.
// Writes run/checks/pixel/<state>/<w>-<theme>-side.webp, -diff.webp and verdict.json.
//   node c1-pixel-v12.mjs [--states a,b] [--widths 1440,390] [--themes light,dark] [--base URL]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { WT, AUTH_FILE, authReady } from './drivers-v11.mjs';
import { G3 } from './drivers-v12.mjs';
import { G5, G6, G7 } from './drivers-v12b.mjs';
import { G4, G8, G9 } from './drivers-v12c.mjs';
import { measureInPage, masksInPage, images } from './lib.mjs';
import { compareV12 } from './compare-v12.mjs';
import { implRun } from './impl-run.mjs';

const STATES = { ...G3, ...G4, ...G5, ...G6, ...G7, ...G8, ...G9 };
const { chromium } = createRequire(path.join(WT, 'apps/quiz/package.json'))('@playwright/test');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:3071';
const WIDTHS = (args.widths || '1440,390').split(',').map(Number);
const THEMES = (args.themes || 'light,dark').split(',');
const G = path.join(WT, 'docs/design/growth-v12');
const OUT = path.join(G, 'run/checks/pixel');
const REF_DIR = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/growth-v12/run/checks/reference';
const PROTO = path.join(G, 'prototype.html');
const CAP = fs.readFileSync(path.join(G, 'capture-v12.mjs'), 'utf8');
// [name, js, scroll selector, wait] in capture order, parsed from capture-v12.mjs (the file runs a capture on import)
const ORDER = [...CAP.matchAll(/^\s*\['([a-z0-9-]+)',\s*"((?:[^"\\]|\\.)*)",\s*(null|'[^']*'),\s*(\d+)/gm)].map((m) => ({ id: m[1], js: m[2].replace(/\\"/g, '"'), sel: m[3] === 'null' ? null : m[3].slice(1, -1), wait: Number(m[4]) }));
if (ORDER.length !== 40) throw new Error(`parsed ${ORDER.length} states from capture-v12.mjs, expected 40`);
const ONLY = args.states ? args.states.split(',') : ORDER.map((s) => s.id);
const PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'];
const tagOf = (w, theme) => `${w > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}`;

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

// The references were captured on ONE prototype page per width and theme, every state in capture order;
// the live measurement replays that sequence once per combo and caches each state's landmarks and masks.
const protoCache = new Map();
async function protoAll(width, theme) {
  const key = `${width}-${theme}`;
  if (protoCache.has(key)) return protoCache.get(key);
  const phone = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(PROTO).href);
  await page.waitForTimeout(500);
  await page.addStyleTag({ content: '.notes-t,.tour-t,.guestbar,.notes,.dnote{display:none!important}' });
  const out = {};
  for (const s of ORDER) {
    await page.evaluate(s.js);
    await page.waitForTimeout(s.wait || 350);
    await page.evaluate((sel) => { const e = sel && document.querySelector(sel); if (e) { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); } else window.scrollTo(0, 0); }, s.sel);
    await page.waitForTimeout(150);
    const lms = (STATES[s.id]?.lm ?? []).map((l) => ({ ...l, side: l.proto }));
    const m = await page.evaluate(measureInPage, { lms, props: PROPS, scope: '.view.on' });
    const sm = await page.evaluate(measureInPage, { lms, props: PROPS, scope: '.sheet.on' });
    for (const k of Object.keys(m)) if (!m[k] && sm[k]) m[k] = sm[k];
    const sy = await page.evaluate(() => scrollY);
    const masks = (await page.evaluate(masksInPage)).map(([x, y, w, h]) => [x, y - sy, w, h]);
    out[s.id] = { m, masks };
  }
  await ctx.close();
  protoCache.set(key, out);
  return out;
}

for (const id of ONLY) {
  const st = STATES[id];
  if (!st) { console.error('unknown state', id); continue; }
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const vfile = path.join(dir, 'verdict.json');
  const verdict = fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : { state: id, combos: {} };
  Object.assign(verdict, { owner: st.owner, auth: st.auth, anchor: st.anchor, ...(st.note ? { note: st.note } : {}), ...(st.pending ? { pending: st.pending } : {}) });
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const stem = `${width}-${theme}`; const tag = tagOf(width, theme); const t0 = Date.now();
      if (st.auth === 'user' && !authReady()) { verdict.combos[stem] = { verdict: 'not verified', reason: 'no signed-in storage state' }; continue; }
      const proto = (await protoAll(width, theme))[id];
      let impl = await implRun(browser, { BASE, AUTH_FILE, width, theme, st, props: PROPS });
      if (impl.error) impl = await implRun(browser, { BASE, AUTH_FILE, width, theme, st, props: PROPS });
      const refPng = fs.readFileSync(path.join(REF_DIR, `${tag}-${id}.png`));
      const c = { at: new Date().toISOString(), base: BASE };
      if (impl.error) {
        Object.assign(c, { verdict: st.pending ? 'not verified' : 'fail', reason: `${st.pending ? st.pending + '; ' : ''}driver: ${impl.error}`, writes: impl.writes });
        if (impl.png) c.pixel = await images(refPng, impl.png, proto.masks, dir, stem, theme, width).catch((e) => ({ error: String(e.message) }));
      } else {
        const rows = compareV12(`${tag}-${id}`, tag[0], theme, st.lm, proto.m, impl.m, PROPS);
        const bad = rows.filter((r) => r.status === 'fail' || r.status === 'missing');
        const overflow = width < 500 && impl.overflowX > 0;
        const pixel = await images(refPng, impl.png, [...proto.masks, ...impl.masks], dir, stem, theme, width).catch((e) => ({ error: String(e.message) }));
        Object.assign(c, { verdict: st.pending ? 'not verified' : (bad.length || overflow ? 'fail' : 'pass'), ...(st.pending ? { reason: st.pending } : {}),
          url: impl.url, signedIn: impl.signedIn, ...(impl.hidden ? { hiddenForm: impl.hidden } : {}),
          counts: Object.fromEntries(['pass', 'fail', 'missing', 'extra', 'absent'].map((k) => [k, rows.filter((r) => r.status === k).length]).concat([['landmarks', rows.length]])),
          overflowX: impl.overflowX, pixel, writes: impl.writes, landmarks: rows });
      }
      c.seconds = Math.round((Date.now() - t0) / 1000);
      verdict.combos[stem] = c;
      console.log(`${tag}-${id}: ${c.verdict}${c.reason ? ' (' + c.reason.slice(0, 100) + ')' : ''}${c.counts ? ` lm ${c.counts.pass}/${c.counts.landmarks} fail ${c.counts.fail} missing ${c.counts.missing}` : ''}${c.overflowX > 0 ? ` overflowX ${c.overflowX}` : ''}${c.pixel?.diffPct !== undefined ? ` diff ${c.pixel.diffPct}%` : ''} ${c.seconds}s`);
      fs.writeFileSync(vfile, JSON.stringify(verdict, null, 1));
    }
  }
  const vs = Object.values(verdict.combos).map((c) => c.verdict);
  verdict.verdict = st.pending ? 'not verified' : vs.includes('fail') ? 'fail' : vs.length === 4 && vs.every((v) => v === 'pass') ? 'pass' : 'not verified';
  fs.writeFileSync(vfile, JSON.stringify(verdict, null, 1));
}
await browser.close();
