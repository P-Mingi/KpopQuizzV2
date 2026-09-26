#!/usr/bin/env node
// C1 extra checks (C1 brief): the nav fits at 1280 and 1440; hover and focus states on
// cards, buttons and tabs; dark (and light) theme tokens; reduced motion. Each check
// measures the prototype and the flag-ON build the same way and writes
// v11/checks/pixel/_extra/verdict.json (+ shots). No write: mutating requests are
// answered locally.
//
//   node c1-extra.mjs [--base http://localhost:3021] [--only nav,hover,focus,tokens,motion]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { WT, AUTH_FILE } from './drivers.mjs';

const require = createRequire(path.join(WT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:3021';
const ONLY = (args.only || 'nav,hover,focus,tokens,motion').split(',');
const OUT = path.join(WT, 'docs/design/ux-dashboard-v1/v11/checks/pixel/_extra');
const PROTO = pathToFileURL(path.join(WT, 'docs/design/ux-dashboard-v1/prototype.html')).href;
fs.mkdirSync(OUT, { recursive: true });
const vfile = path.join(OUT, 'verdict.json');
const V = fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : {};
const save = () => fs.writeFileSync(vfile, JSON.stringify(V, null, 1));

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function proto(width, theme, js, { reduced = false } = {}) {
  const phone = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(PROTO);
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
  await page.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); eval(code); }, js);
  await page.waitForTimeout(700);
  return { ctx, page };
}

async function impl(width, theme, p, { auth = 'user', reduced = false, ready = null } = {}) {
  const phone = width < 500;
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(auth === 'user' && fs.existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {}) });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  const page = await ctx.newPage();
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  if (ready) await page.locator(ready).first().waitFor({ timeout: 45_000 });
  await page.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn')), undefined, { timeout: 30_000 }).catch(() => {});
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(600);
  return { ctx, page };
}

const STYLE = ['background-color', 'border-top-color', 'color', 'box-shadow', 'transform', 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'text-decoration-line'];
async function styleOf(page, sel) {
  return page.evaluate(({ s, P }) => {
    const el = Array.from(document.querySelectorAll(s)).find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p)]));
  }, { s: sel, P: STYLE });
}
const n = (v) => String(v ?? '').replace(/\s+/g, ' ').replace(/\s*([,()])\s*/g, '$1').trim().toLowerCase();
function eq(a, b) {
  if (n(a) === n(b)) return true;
  const na = n(a).match(/-?[\d.]+/g); const nb = n(b).match(/-?[\d.]+/g);
  return Boolean(na && nb && na.length === nb.length && n(a).replace(/-?[\d.]+/g, '#') === n(b).replace(/-?[\d.]+/g, '#') && na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) <= 0.5));
}
function diffStyles(p, i, props) {
  if (!p || !i) return [{ what: 'element', expected: p ? 'present' : 'absent', actual: i ? 'present' : 'absent' }];
  return props.filter((k) => !eq(p[k], i[k])).map((k) => ({ what: k, expected: p[k], actual: i[k] }));
}

// ---- 1. nav fits at 1280 and 1440 ---------------------------------------------------------
if (ONLY.includes('nav')) {
  V.nav = {};
  for (const width of [1280, 1440]) {
    for (const auth of ['user', 'guest']) {
      const { ctx, page } = await impl(width, 'light', '/', { auth, ready: '.p1-home' });
      const r = await page.evaluate(() => {
        const inn = document.querySelector('.ux-nav-in'); const links = Array.from(document.querySelectorAll('.ux-links a')).filter((a) => a.offsetParent);
        const right = document.querySelector('.ux-nav-r');
        const lr = links.map((a) => a.getBoundingClientRect());
        const rr = right.getBoundingClientRect();
        return {
          links: links.map((a) => a.textContent.trim()),
          oneLine: lr.every((b) => Math.abs(b.top - lr[0].top) < 1) && links.every((a) => a.getBoundingClientRect().height < 44),
          linksRight: Math.max(...lr.map((b) => b.right)), rightLeft: rr.left, rightRight: rr.right,
          overflow: inn.scrollWidth - inn.clientWidth, navH: document.querySelector('.ux-nav').getBoundingClientRect().height,
          truncated: links.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => a.textContent.trim()),
        };
      });
      const ok = r.oneLine && r.linksRight <= r.rightLeft && r.overflow <= 0 && r.rightRight <= width - 16 && r.truncated.length === 0 && Math.abs(r.navH - 65) <= 2;
      await page.locator('.ux-nav').screenshot({ path: path.join(OUT, `nav-${width}-${auth}.png`) });
      V.nav[`${width}-${auth}`] = { verdict: ok ? 'pass' : 'fail', ...r, evidence: `_extra/nav-${width}-${auth}.png` };
      await ctx.close();
      save();
    }
    const { ctx, page } = await proto(width, 'light', "go('home')");
    V.nav[`${width}-prototype`] = await page.evaluate(() => { const l = Array.from(document.querySelectorAll('.links a')).filter((a) => a.offsetParent).map((a) => a.textContent.trim()); return { links: l, navH: document.querySelector('.nav').getBoundingClientRect().height }; });
    await ctx.close();
  }
  save();
  console.log('nav', JSON.stringify(Object.fromEntries(Object.entries(V.nav).map(([k, v]) => [k, v.verdict || 'ref']))));
}

// ---- 2. hover ------------------------------------------------------------------------------
// [name, prototype state js, prototype selector, impl path, impl ready, impl selector, sub-selectors compared]
const HOVER = [
  ['quiz card', "go('home')", '#h-trend .qcard', '/', '.p1-home .ux-qcard', '.p1-trend .ux-qcard', [['', ['border-top-color', 'transform', 'box-shadow']], [' h3', ['color']]]],
  ['primary button', "document.body.classList.add('guest');go('home')", '.hcta .btn-primary', '/', '.p1-hcta', '.p1-hcta .ux-btn-primary', [['', ['background-color', 'color', 'box-shadow', 'transform']]], 'guest'],
  ['ghost button', "document.body.classList.add('guest');go('home')", '.hcta .btn-ghost', '/', '.p1-hcta', '.p1-hcta .ux-btn-ghost', [['', ['background-color', 'border-top-color', 'color', 'transform']]], 'guest'],
  ['text card', "go('quiz')", '.tcard', '/q/ultimate-bts-era-quiz-only-real-armys-survive', '.p4-page .ux-tcard', '.ux-tcard', [['', ['border-top-color', 'transform', 'box-shadow', 'background-color']]]],
  ['tab (off)', "go('you')", '#ptabs button:not(.on)', '/u/testtest', '.p10-tabs', '.p10-tabs [aria-selected="false"]', [['', ['background-color', 'color', 'border-top-color']]], 'guest'],
  ['nav link', "go('home')", '.links a:not(.on)', '/', '.p1-home', '.ux-links a:not([aria-current])', [['', ['background-color', 'color']]]],
  ['row', "go('home')", '#h-best .row', '/', '.p1-home .ux-row', '.p1-home .ux-rows .ux-row', [['', ['background-color', 'border-top-color', 'color']]]],
];
if (ONLY.includes('hover')) {
  V.hover = {};
  for (const theme of ['light', 'dark']) {
    for (const [name, js, psel, ipath, iready, isel, subs, auth] of HOVER) {
      const P = await proto(1440, theme, js);
      const pel = P.page.locator(psel).first();
      await pel.scrollIntoViewIfNeeded(); await pel.hover(); await P.page.waitForTimeout(500);
      const pS = {}; for (const [sub] of subs) pS[sub] = await styleOf(P.page, psel + ':hover' + sub);
      await pel.screenshot({ path: path.join(OUT, `hover-${name.replace(/\W+/g, '-')}-${theme}-proto.png`) }).catch(() => {});
      await P.ctx.close();
      const I = await impl(1440, theme, ipath, { auth: auth ?? 'user', ready: iready });
      const iel = I.page.locator(isel).first();
      let iS = {}; let err = null;
      try {
        await iel.scrollIntoViewIfNeeded(); await iel.hover(); await I.page.waitForTimeout(500);
        for (const [sub] of subs) iS[sub] = await styleOf(I.page, isel + ':hover' + sub);
        await iel.screenshot({ path: path.join(OUT, `hover-${name.replace(/\W+/g, '-')}-${theme}-impl.png`) });
      } catch (e) { err = String(e.message).split('\n')[0]; }
      await I.ctx.close();
      const mism = err ? [{ what: 'driver', expected: 'hovered', actual: err }] : subs.flatMap(([sub, props]) => diffStyles(pS[sub], iS[sub], props).map((m) => ({ ...m, what: `${sub.trim() || 'box'} ${m.what}` })));
      V.hover[`${name}-${theme}`] = { verdict: mism.length ? 'fail' : 'pass', proto: psel, impl: isel, mismatches: mism, measured: { proto: pS, impl: iS }, evidence: `_extra/hover-${name.replace(/\W+/g, '-')}-${theme}-{proto,impl}.png` };
      save();
    }
  }
  console.log('hover', JSON.stringify(Object.fromEntries(Object.entries(V.hover).map(([k, v]) => [k, v.verdict]))));
}

// ---- 3. focus (keyboard) ------------------------------------------------------------------------
const FOCUS = [
  ['quiz card', "go('home')", '#h-trend .qcard', '/', '.p1-home .ux-qcard', '.p1-trend .ux-qcard'],
  ['primary button', "document.body.classList.add('guest');go('home')", '.hcta .btn-primary', '/', '.p1-hcta', '.p1-hcta .ux-btn-primary', 'guest'],
  ['tab', "go('you')", '#ptabs button.on', '/u/testtest', '.p10-tabs', '.p10-tabs [aria-selected="true"]', 'guest'],
  ['nav link', "go('home')", '.links a.on', '/', '.p1-home', '.ux-links a[aria-current="page"]'],
];
const FPROPS = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow'];
if (ONLY.includes('focus')) {
  V.focus = {};
  for (const theme of ['light', 'dark']) {
    for (const [name, js, psel, ipath, iready, isel, auth] of FOCUS) {
      const P = await proto(1440, theme, js);
      await P.page.keyboard.press('Tab');
      await P.page.locator(psel).first().evaluate((e) => { e.setAttribute('tabindex', e.getAttribute('tabindex') ?? '0'); e.focus(); });
      await P.page.waitForTimeout(300);
      const pS = await P.page.evaluate(({ s, F }) => { const e = document.activeElement; const cs = getComputedStyle(e); return { fv: e.matches(':focus-visible'), ...Object.fromEntries(F.map((p) => [p, cs.getPropertyValue(p)])) }; }, { s: psel, F: FPROPS });
      await P.ctx.close();
      const I = await impl(1440, theme, ipath, { auth: auth ?? 'user', ready: iready });
      await I.page.keyboard.press('Tab');
      await I.page.locator(isel).first().focus();
      await I.page.waitForTimeout(300);
      const iS = await I.page.evaluate(({ F }) => { const e = document.activeElement; const cs = getComputedStyle(e); return { fv: e.matches(':focus-visible'), tag: e.tagName, ...Object.fromEntries(F.map((p) => [p, cs.getPropertyValue(p)])) }; }, { F: FPROPS });
      await I.page.locator(isel).first().screenshot({ path: path.join(OUT, `focus-${name.replace(/\W+/g, '-')}-${theme}-impl.png`) }).catch(() => {});
      await I.ctx.close();
      const mism = diffStyles(pS, iS, ['fv', ...FPROPS]);
      V.focus[`${name}-${theme}`] = { verdict: mism.length ? 'fail' : 'pass', proto: psel, impl: isel, mismatches: mism, measured: { proto: pS, impl: iS }, evidence: `_extra/focus-${name.replace(/\W+/g, '-')}-${theme}-impl.png` };
      save();
    }
  }
  console.log('focus', JSON.stringify(Object.fromEntries(Object.entries(V.focus).map(([k, v]) => [k, v.verdict]))));
}

// ---- 4. theme tokens ----------------------------------------------------------------------------
if (ONLY.includes('tokens')) {
  V.tokens = {};
  for (const theme of ['light', 'dark']) {
    const P = await proto(1440, theme, "go('home')");
    const pt = await P.page.evaluate(() => {
      const names = new Set();
      for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } const walk = (rs) => { for (const r of rs) { if (r.style) for (const p of r.style) if (p.startsWith('--')) names.add(p); if (r.cssRules) walk(r.cssRules); } }; walk(rules); }
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries([...names].map((k) => [k, cs.getPropertyValue(k).trim()]).filter(([, v]) => v));
    });
    P.ctx.close();
    const I = await impl(1440, theme, '/', { auth: 'guest', ready: '.p1-home' });
    const it = await I.page.evaluate((names) => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(names.map((k) => [k, cs.getPropertyValue('--ux-' + k.slice(2)).trim()])); }, Object.keys(pt));
    const bodyBg = await I.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await I.ctx.close();
    const compared = []; const mism = []; const noCounterpart = [];
    // --theme-band is the viewer's passport theme colour (the prototype sets it from its
    // sample user's settings at run time); its :root default is compared by the landmarks
    const DATA = ['--theme-band'];
    for (const [k, v] of Object.entries(pt)) {
      if (DATA.includes(k)) continue;
      if (!it[k]) { noCounterpart.push(k); continue; }
      compared.push(k);
      if (!eq(v.toLowerCase(), it[k].toLowerCase())) mism.push({ what: k, expected: v, actual: it[k] });
    }
    V.tokens[theme] = { verdict: mism.length ? 'fail' : 'pass', compared: compared.length, mismatches: mism, noCounterpart, noCounterpartNote: 'prototype --plum* feed only the base .band / .bthero rules, which later v11 rules override (their computed styles are compared as landmarks: pass)', skippedAsData: DATA, bodyBackground: bodyBg };
    save();
  }
  console.log('tokens', JSON.stringify(Object.fromEntries(Object.entries(V.tokens).map(([k, v]) => [k, `${v.verdict} ${v.compared} compared, ${v.mismatches.length} differ`]))));
}

// ---- 5. reduced motion ---------------------------------------------------------------------------
if (ONLY.includes('motion')) {
  V.motion = {};
  const probe = () => {
    const anims = document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      const el = a.effect && a.effect.target; return { name: a.animationName || a.constructor.name, dur: t.duration, iter: t.iterations, el: el ? (el.className && String(el.className).slice(0, 40)) : '' };
    });
    const longTransitions = Array.from(document.querySelectorAll('.ux-app *, .ux-layer *')).map((e) => getComputedStyle(e).transitionDuration).filter((d) => d.split(',').some((x) => parseFloat(x) > 0.01)).length;
    return { running: anims.filter((a) => a.iter === Infinity || (typeof a.dur === 'number' && a.dur > 10)), longTransitions };
  };
  for (const [name, p, ready, act] of [['home', '/', '.p1-home', null], ['blindtest game', '/blindtest', '.p6-setup[data-live]', 'bt'], ['quiz game', '/q/ultimate-bts-era-quiz-only-real-armys-survive', '.p4-act[data-ready]', 'quiz']]) {
    const I = await impl(1440, 'light', p, { auth: 'guest', reduced: true, ready });
    if (act === 'bt') {
      await I.page.route((u) => u.pathname === '/api/blind-test/generate', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) }));
    }
    if (act === 'quiz') { await I.page.locator('.p4-act .ux-btn-primary').click(); await I.page.locator('.p4-qq').waitFor({ timeout: 60_000 }); }
    await I.page.waitForTimeout(800);
    const r = await I.page.evaluate(probe);
    await I.ctx.close();
    V.motion[name] = { verdict: r.running.length === 0 && r.longTransitions === 0 ? 'pass' : 'fail', ...r };
    save();
  }
  const P = await proto(1440, 'light', "go('home')", { reduced: true });
  V.motion.prototype = await P.page.evaluate(() => ({ running: document.getAnimations().filter((a) => a.playState === 'running').length }));
  await P.ctx.close();
  save();
  console.log('motion', JSON.stringify(Object.fromEntries(Object.entries(V.motion).map(([k, v]) => [k, v.verdict || JSON.stringify(v)]))));
}
await browser.close();
