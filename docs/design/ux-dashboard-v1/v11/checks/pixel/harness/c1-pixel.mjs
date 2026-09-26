#!/usr/bin/env node
// C1 pixel checker (UX v11.2, Phase 3). For each state of v11/capture-prototype.mjs at
// 1440 x 900 and 390 x 844, light and dark: drives the flag-ON build (default
// http://localhost:3021) to the state, takes the same screenshot kind as the reference
// (full page, except overlays and in-game states), and compares with the prototype:
//   1. landmark boxes within 2px (drivers.mjs lists the pairs per state),
//   2. computed styles equal to styles.json (the 27 captured landmarks) or, for the other
//      landmarks, to the prototype measured live in the same state (px within 0.5),
//   3. a masked pixel diff (photos and text masked on both sides), information only,
//   4. no horizontal scroll.
// Writes v11/checks/pixel/<state>/<w>-<theme>-side.webp, -diff.webp and verdict.json.
//
//   node c1-pixel.mjs [--states a,b] [--widths 1440,390] [--themes light,dark] [--base URL]
// Needs UX11_CHROMIUM; resolves @playwright/test from apps/quiz and sharp from the root.
// No production write: every mutating request to /api/** or Supabase is answered
// locally (the payload is recorded in verdict.json).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { STATES, WT, AUTH_FILE, authReady } from './drivers.mjs';

const require = createRequire(path.join(WT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const sharp = createRequire(path.join(WT, 'package.json'))('sharp');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:3021';
const WIDTHS = (args.widths || '1440,390').split(',').map(Number);
const THEMES = (args.themes || 'light,dark').split(',');
const ONLY = args.states ? args.states.split(',') : Object.keys(STATES);
const OUT = path.join(WT, 'docs/design/ux-dashboard-v1/v11/checks/pixel');
const REF_DIR = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference';
const STYLES = JSON.parse(fs.readFileSync(path.join(WT, 'docs/design/ux-dashboard-v1/v11/checks/reference/styles.json'), 'utf8'));
const PROTO = path.join(WT, 'docs/design/ux-dashboard-v1/prototype.html');
const CAPTURE_SRC = fs.readFileSync(path.join(WT, 'docs/design/ux-dashboard-v1/v11/capture-prototype.mjs'), 'utf8');
const STYLE_LANDMARKS = ['.nav', '.links a.on', '.qcard', '.qotd', '.hhead h1', '.sec-h h2', '.post', '.rail>section', '.btn-primary', '.utabs button.on', '.tcard', '.stats3', '.aboutbox', '.tring', '.bthero', '.orb', '.medal2', '.personprev', '.pband', '.lrow', '.pin', '.qlab', '.qline', '.gsearch', '.bpt', '.gi', '.bmed'];
const PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'];
const TOL_BOX = 2;
const TOL_STYLE = 0.5;

function stateJs(id) {
  const m = new RegExp(`'${id}':\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(CAPTURE_SRC);
  if (!m) throw new Error(`unknown prototype state ${id}`);
  return m[1].replace(/\\"/g, '"');
}
const isOverlay = (id) => /^search|share|signin|bell|editor|header-sheet|playlist-open/.test(id);
const isGame = (id) => /^play|^btplay/.test(id);

// ---- in-page measurement -------------------------------------------------------------

/** Runs in the page. scope: '.view.on' for the prototype (fallback to the document). */
function measureInPage({ lms, props, scope }) {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return (e.offsetParent !== null || cs.position === 'fixed' || cs.position === 'sticky') && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
  const find = (sel, all) => {
    let list = [];
    try {
      if (scope) list = Array.from(document.querySelectorAll(`${scope} ${sel.split(',').join(`, ${scope} `)}`)).filter(vis);
      if (!list.length) list = Array.from(document.querySelectorAll(sel)).filter(vis);
    } catch { return []; }
    return all ? list : list.slice(0, 1);
  };
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, vx: r.x, vy: r.y }; };
  const out = {};
  for (const l of lms) {
    const side = l.side;
    const els = find(side, Boolean(l.seq));
    if (!els.length) { out[l.name] = null; continue; }
    const cs = getComputedStyle(els[0]);
    const val = (p) => cs.getPropertyValue(p).replace(/url\((["']?)(data:[^;,]{0,40})[^)]*\1\)/g, 'url($2...)').replace(/url\((["']?)([^)]{0,80})[^)]*\1\)/g, 'url($2)');
    const after = getComputedStyle(els[0], '::after');
    out[l.name] = { n: els.length, boxes: els.slice(0, 24).map(box), style: Object.fromEntries(props.map((p) => [p, val(p)])), afterShadow: after.content !== 'none' ? after.boxShadow : 'none' };
  }
  return out;
}

/** Runs in the page: rectangles of photos and text, document coordinates (for the diff masks). */
function masksInPage() {
  const rects = [];
  const add = (r) => { if (r.width > 1 && r.height > 1) rects.push([Math.floor(r.x + scrollX), Math.floor(r.y + scrollY), Math.ceil(r.width), Math.ceil(r.height)]); };
  for (const e of document.querySelectorAll('img, picture, video, canvas, iframe')) add(e.getBoundingClientRect());
  for (const e of document.querySelectorAll('*')) {
    const bi = getComputedStyle(e).backgroundImage;
    if (bi && bi.includes('url(')) add(e.getBoundingClientRect());
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) add(r);
  }
  return rects;
}

// ---- comparison ------------------------------------------------------------------------

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
function styleEqual(a, b, prop) {
  if (norm(a) === norm(b)) return true;
  // two photos (any url) are the same kind of fill; the photo itself is real data
  if (prop === 'background-image' && /url\(/.test(a) && /url\(/.test(b)) return true;
  const px = /^-?[\d.]+px$/;
  if (px.test(norm(a)) && px.test(norm(b))) return Math.abs(parseFloat(a) - parseFloat(b)) <= TOL_STYLE;
  // same numbers in a compound value (shadows, gradients) within 0.5
  const na = norm(a).match(/-?[\d.]+/g); const nb = norm(b).match(/-?[\d.]+/g);
  if (na && nb && na.length === nb.length && norm(a).replace(/-?[\d.]+/g, '#') === norm(b).replace(/-?[\d.]+/g, '#')) return na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) <= TOL_STYLE);
  return false;
}

function compare(key, lms, proto, impl) {
  const rows = [];
  for (const l of lms) {
    const p = proto[l.name]; const i = impl[l.name];
    if (!p && !i) { rows.push({ name: l.name, status: 'absent', note: 'in neither' }); continue; }
    if (!p) { rows.push({ name: l.name, status: 'extra', note: 'not in the reference state (implementation only)' }); continue; }
    if (!i) { rows.push({ name: l.name, status: 'missing', proto: l.proto, impl: l.impl, note: 'in the reference, not found in the implementation' }); continue; }
    const mism = [];
    if (l.seq) {
      const n = Math.min(p.boxes.length, i.boxes.length);
      if (p.n !== i.n) mism.push({ what: 'count', expected: p.n, actual: i.n, info: true });
      for (let k = 0; k < n; k++) {
        for (const part of l.parts ?? (l.seq === 'row' ? ['w'] : ['x', 'w'])) {
          const d = i.boxes[k][part] - p.boxes[k][part];
          if (Math.abs(d) > TOL_BOX) mism.push({ what: `#${k + 1} ${part}`, expected: +p.boxes[k][part].toFixed(1), actual: +i.boxes[k][part].toFixed(1) });
        }
        if (k > 0) {
          const gp = l.seq === 'row' ? p.boxes[k].x - (p.boxes[k - 1].x + p.boxes[k - 1].w) : p.boxes[k].y - (p.boxes[k - 1].y + p.boxes[k - 1].h);
          const gi = l.seq === 'row' ? i.boxes[k].x - (i.boxes[k - 1].x + i.boxes[k - 1].w) : i.boxes[k].y - (i.boxes[k - 1].y + i.boxes[k - 1].h);
          if (Math.abs(gp - gi) > TOL_BOX) mism.push({ what: `gap before #${k + 1}`, expected: +gp.toFixed(1), actual: +gi.toFixed(1), ...(l.gapInfo ? { info: true } : {}) });
        }
      }
    } else {
      // relTo: y / vy measured from another landmark's top (the content above it is SEO-locked
      // copy or real data of another height), on both sides
      const rel = key.startsWith('390-') && 'phoneRelTo' in l ? l.phoneRelTo : l.relTo;
      const a = rel ? { p: proto[rel]?.boxes[0], i: impl[rel]?.boxes[0] } : null;
      for (const part of (key.startsWith('390-') && l.phoneBox) ? l.phoneBox : (l.box ?? [])) {
        const off = a && (part === 'y' || part === 'vy') && a.p && a.i ? { p: a.p[part], i: a.i[part] } : { p: 0, i: 0 };
        const ev = p.boxes[0][part] - off.p; const av = i.boxes[0][part] - off.i;
        if (Math.abs(av - ev) > TOL_BOX) mism.push({ what: `box ${part}${off.p || off.i ? ` (from ${rel})` : ''}`, expected: +ev.toFixed(1), actual: +av.toFixed(1) });
      }
    }
    let styleRef = 'live prototype';
    if (l.styles !== false) {
      const json = STYLE_LANDMARKS.includes(l.proto) ? STYLES[key]?.[l.proto] : null;
      const ref = json ?? p.style;
      if (json) styleRef = 'styles.json';
      for (const prop of PROPS) {
        if (l.skip?.includes(prop)) continue;
        if (ref[prop] === undefined || i.style[prop] === undefined) continue;
        if (prop === 'gap' && ref[prop] === 'normal') continue;
        // an invisible radius (no fill, no border, no shadow on either side: the prototype's
        // H1 radius is its focus style) is not a visual difference
        const bare = (st) => /rgba\(0, 0, 0, 0\)|transparent/.test(st['background-color']) && (st['background-image'] ?? 'none') === 'none' && parseFloat(st['border-top-width']) === 0 && (st['box-shadow'] ?? 'none') === 'none';
        if (prop === 'border-radius' && bare(ref) && bare(i.style)) continue;
        // a photo edge drawn by an ::after overlay (over the <img>) is the same paint as the
        // prototype's inset shadow on the background-image box
        if (prop === 'box-shadow' && i.style[prop] === 'none' && i.afterShadow && styleEqual(String(ref[prop]), i.afterShadow, prop)) continue;
        if (!styleEqual(String(ref[prop]), String(i.style[prop]), prop)) mism.push({ what: prop, expected: String(ref[prop]).slice(0, 200), actual: String(i.style[prop]).slice(0, 200) });
      }
    }
    const hard = mism.filter((m) => !m.info);
    rows.push({ name: l.name, proto: l.proto, impl: l.impl, status: hard.length ? 'fail' : 'pass', styleRef, mismatches: mism, ...(l.why ? { skipped: l.skip, why: l.why } : {}) });
  }
  return rows;
}

// ---- images ------------------------------------------------------------------------------

async function raw(buf) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }

async function images(refPng, implPng, masks, dir, stem, theme, width) {
  const A = await raw(refPng); const B = await raw(implPng);
  const W = Math.max(A.w, B.w); const Hh = Math.max(A.h, B.h);
  const mask = new Uint8Array(W * Hh);
  for (const [x, y, w, h] of masks) {
    for (let yy = Math.max(0, y); yy < Math.min(Hh, y + h); yy++) mask.fill(1, yy * W + Math.max(0, x), yy * W + Math.min(W, x + w));
  }
  const out = Buffer.alloc(W * Hh * 4);
  let diff = 0; let unmasked = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const inA = x < A.w && y < A.h; const inB = x < B.w && y < B.h;
      const ia = (y * A.w + x) * 4; const ib = (y * B.w + x) * 4;
      const gray = inB ? Math.round((B.data[ib] + B.data[ib + 1] + B.data[ib + 2]) / 3) : 255;
      const g = 200 + Math.round(gray * 55 / 255);
      if (mask[y * W + x]) { out[o] = g - 40; out[o + 1] = g - 20; out[o + 2] = 255; out[o + 3] = 255; continue; }
      unmasked++;
      const d = inA && inB ? Math.max(Math.abs(A.data[ia] - B.data[ib]), Math.abs(A.data[ia + 1] - B.data[ib + 1]), Math.abs(A.data[ia + 2] - B.data[ib + 2])) : 255;
      if (d > 24) { diff++; out[o] = 230; out[o + 1] = 30; out[o + 2] = 60; out[o + 3] = 255; } else { out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = 255; }
    }
  }
  const scale = width > 500 ? 0.4 : 0.8;
  const dW = Math.round(W * scale);
  // WebP caps at 16383 px: very long pages keep their top 16000 px (after scaling) in the images
  const maxRows = Math.min(Hh, Math.floor(16000 / scale));
  await sharp(out, { raw: { width: W, height: Hh, channels: 4 } }).extract({ left: 0, top: 0, width: W, height: maxRows }).resize({ width: dW }).webp({ quality: 50 }).toFile(path.join(dir, `${stem}-diff.webp`));
  // side by side: reference | implementation
  const top = async (png, h) => (h > maxRows ? sharp(png).extract({ left: 0, top: 0, width: (await sharp(png).metadata()).width, height: maxRows }).png().toBuffer() : png);
  const sa = await sharp(await top(refPng, A.h)).resize({ width: dW }).png().toBuffer(); const sb = await sharp(await top(implPng, B.h)).resize({ width: dW }).png().toBuffer();
  const ma = await sharp(sa).metadata(); const mb = await sharp(sb).metadata();
  const gap = 16; const label = 24;
  const SW = ma.width + mb.width + gap; const SH = Math.min(16000, Math.max(ma.height, mb.height) + label);
  const bg = theme === 'dark' ? '#141312' : '#FFFFFF'; const ink = theme === 'dark' ? '#A8A198' : '#6B655E';
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${label}"><style>text{font:600 12px sans-serif;fill:${ink}}</style><text x="0" y="16">reference ${stem}</text><text x="${ma.width + gap}" y="16">implementation ${stem}</text></svg>`);
  const crop = async (b, m) => (m.height > SH - label ? sharp(b).extract({ left: 0, top: 0, width: m.width, height: SH - label }).png().toBuffer() : b);
  await sharp({ create: { width: SW, height: SH, channels: 3, background: bg } })
    .composite([{ input: svg, top: 0, left: 0 }, { input: await crop(sa, ma), top: label, left: 0 }, { input: await crop(sb, mb), top: label, left: ma.width + gap }])
    .webp({ quality: 55 }).toFile(path.join(dir, `${stem}-side.webp`));
  return { refSize: [A.w, A.h], implSize: [B.w, B.h], diffPct: +(100 * diff / Math.max(1, unmasked)).toFixed(2), maskedPct: +(100 * (1 - unmasked / (W * Hh))).toFixed(1) };
}

// ---- runner ------------------------------------------------------------------------------

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function newCtx(width, theme, auth) {
  const phone = width < 500;
  const ctx = await browser.newContext({
    baseURL: BASE, viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1,
    ...(auth === 'user' ? { storageState: AUTH_FILE } : {}),
    ...(phone ? { userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' } : {}),
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  return ctx;
}

// The reference PNGs were captured on ONE prototype page per width and theme, every state in
// the capture order (capture-prototype.mjs), so a state carries what earlier states left (a
// finished quiz saves the streak, and so on). The live prototype measurement replays that
// same sequence, once per width and theme, and caches every state's landmarks and masks.
const CAPTURE_ORDER = [...CAPTURE_SRC.matchAll(/^\s*'([a-z0-9-]+)':\s*"/gm)].map((m) => m[1]);
const protoCache = new Map();
async function protoMeasureAll(width, theme) {
  const key = `${width}-${theme}`;
  if (protoCache.has(key)) return protoCache.get(key);
  const phone = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(PROTO).href);
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
  const out = {};
  for (const id of CAPTURE_ORDER) {
    await page.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); if (window.btgFilter) { BTG_OPEN = false; $('btg-q').value = ''; btgFilter(''); } eval(code); }, stateJs(id));
    await page.waitForTimeout(700);
    const lms = STATES[id]?.lm ?? [];
    const full = !isOverlay(id) && !isGame(id);
    const scrollY = await page.evaluate(() => scrollY);
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate(measureInPage, { lms: lms.map((l) => ({ ...l, side: l.proto })), props: PROPS, scope: '.view.on' });
    // masks in screenshot coordinates: a full-page shot starts at the top; a viewport shot at the current scroll
    const masks = full ? await page.evaluate(masksInPage) : null;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    const vmasks = full ? masks : (await page.evaluate(masksInPage)).map(([x, y, w, h]) => [x, y - scrollY, w, h]);
    out[id] = { m, masks: vmasks };
  }
  await ctx.close();
  protoCache.set(key, out);
  return out;
}
async function protoMeasure(width, theme, id) {
  return (await protoMeasureAll(width, theme))[id];
}

async function implRun(width, theme, id, st) {
  const ctx = await newCtx(width, theme, st.auth);
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  const writes = [];
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { await route.continue(); return; }
    writes.push({ method: req.method(), path: new URL(req.url()).pathname, body: (req.postData() || '').slice(0, 300) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  const s = {};
  try {
    if (st.setup) await st.setup(page, s);
    await st.open(page, s);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.fonts.ready);
    const full = st.shot === 'full';
    if (full) {
      // bring lazy images in, one screen at a time, then back to the top
      const hgt = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < hgt; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), undefined, { timeout: 15_000 }).catch(() => {});
    }
    await page.waitForTimeout(700);
    const m = await page.evaluate(measureInPage, { lms: st.lm.map((l) => ({ ...l, side: l.impl })), props: PROPS, scope: null });
    const masks = await page.evaluate(masksInPage);
    const sy = full ? 0 : await page.evaluate(() => scrollY);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const png = await page.screenshot({ fullPage: full, timeout: 60_000 });
    const url = new URL(page.url()).pathname + new URL(page.url()).search;
    const incomplete = page.__c1Incomplete || null;
    const signedIn = await page.evaluate(() => Boolean(document.querySelector('.ux-avabtn, .ux-nav-r button[aria-label^="Notifications"]')));
    await ctx.close();
    if (st.auth === 'user' && !signedIn && !['play', 'play-answered', 'play-qotd', 'btplay', 'btplay-answered', 'share', 'signin', 'editor', 'header-sheet', 'search', 'bell', 'create-1', 'create-2', 'create-3'].includes(id)) {
      return { error: 'signed-in state expected, the page rendered as a guest (session not resolved)', png, writes };
    }
    return { m, masks: masks.map(([x, y, w, h]) => [x, y - sy, w, h]), png, overflowX, writes, url, incomplete, signedIn };
  } catch (e) {
    let png = null;
    try { png = await page.screenshot({ fullPage: false }); } catch { /* closed */ }
    await ctx.close();
    return { error: String(e && e.message || e).split('\n')[0].slice(0, 300), png, writes };
  }
}

for (const id of ONLY) {
  const st = STATES[id];
  if (!st) { console.error('unknown state', id); continue; }
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const vfile = path.join(dir, 'verdict.json');
  const verdict = fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : { state: id, owner: st.owner, combos: {} };
  verdict.owner = st.owner; verdict.auth = st.auth; verdict.shot = st.shot;
  if (st.note) verdict.note = st.note;
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const key = `${width}-${theme}-${id}`; const stem = `${width}-${theme}`;
      const t0 = Date.now();
      if (st.auth === 'user' && !authReady()) { verdict.combos[stem] = { verdict: 'not verified', reason: 'no signed-in storage state' }; continue; }
      const proto = await protoMeasure(width, theme, id, st.lm);
      let impl = await implRun(width, theme, id, st);
      if (impl.error) impl = await implRun(width, theme, id, st); // one retry (shared DB / cold server)
      const refPng = fs.readFileSync(path.join(REF_DIR, `${key}.png`));
      const c = { at: new Date().toISOString(), base: BASE };
      if (impl.error) {
        Object.assign(c, { verdict: st.pending ? 'not verified' : 'fail', reason: `driver: ${impl.error}`, writes: impl.writes });
        if (impl.png) Object.assign(c, { pixel: await images(refPng, impl.png, proto.masks, dir, stem, theme, width).catch((e) => ({ error: String(e.message) })) });
      } else {
        const rows = compare(key, st.lm, proto.m, impl.m);
        const failRows = rows.filter((r) => r.status === 'fail' || r.status === 'missing');
        const pixel = await images(refPng, impl.png, [...proto.masks, ...impl.masks], dir, stem, theme, width).catch((e) => ({ error: String(e.message) }));
        const overflow = width < 500 && impl.overflowX > 0;
        Object.assign(c, {
          verdict: st.pending ? 'not verified' : (failRows.length || overflow ? 'fail' : 'pass'),
          ...(st.pending ? { reason: st.pending } : {}),
          url: impl.url, signedIn: impl.signedIn,
          ...(impl.incomplete ? { incomplete: `served without ${impl.incomplete} after 4 loads (shared DB read timed out; fail-soft section hidden)` } : {}),
          counts: { landmarks: rows.length, pass: rows.filter((r) => r.status === 'pass').length, fail: rows.filter((r) => r.status === 'fail').length, missing: rows.filter((r) => r.status === 'missing').length, extra: rows.filter((r) => r.status === 'extra').length, absent: rows.filter((r) => r.status === 'absent').length },
          overflowX: impl.overflowX, pixel, writes: impl.writes, landmarks: rows,
        });
      }
      c.seconds = Math.round((Date.now() - t0) / 1000);
      verdict.combos[stem] = c;
      console.log(`${key}: ${c.verdict}${c.reason ? ' (' + c.reason.slice(0, 120) + ')' : ''}${c.counts ? ` lm ${c.counts.pass}/${c.counts.landmarks} fail ${c.counts.fail} missing ${c.counts.missing}` : ''}${c.pixel ? ` diff ${c.pixel.diffPct}%` : ''} ${c.seconds}s`);
      fs.writeFileSync(vfile, JSON.stringify(verdict, null, 1));
    }
  }
  const vs = Object.values(verdict.combos).map((c) => c.verdict);
  verdict.verdict = vs.includes('fail') ? 'fail' : vs.every((v) => v === 'pass') && vs.length === 4 ? 'pass' : 'not verified';
  if (st.pending) verdict.verdict = 'not verified';
  fs.writeFileSync(vfile, JSON.stringify(verdict, null, 1));
}
await browser.close();
