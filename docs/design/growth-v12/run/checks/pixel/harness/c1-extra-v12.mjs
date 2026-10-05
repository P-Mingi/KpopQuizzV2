#!/usr/bin/env node
// C1 (V12 run): hover and keyboard focus on the NEW v12 controls, and reduced motion on the new pages.
// Each control is measured on the prototype (state js, then :hover / :focus-visible) and on the flag-on
// build (the state's own driver from drivers-v12*.mjs, every write answered locally), at 1440, light and
// dark. Writes run/checks/pixel/_extra/verdict-v12.json and element shots.
//   node c1-extra-v12.mjs [--base http://localhost:3071] [--only hover,focus,motion]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { WT, AUTH_FILE } from './drivers-v11.mjs';
import { G3 } from './drivers-v12.mjs';
import { G5, G6, G7 } from './drivers-v12b.mjs';
import { G4, G8 } from './drivers-v12c.mjs';
import { newCtx, guard } from './impl-run.mjs';

const STATES = { ...G3, ...G4, ...G5, ...G6, ...G7, ...G8 };
const { chromium } = createRequire(path.join(WT, 'apps/quiz/package.json'))('@playwright/test');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:3071';
const ONLY = (args.only || 'hover,focus,motion').split(',');
const OUT = path.join(WT, 'docs/design/growth-v12/run/checks/pixel/_extra');
const PROTO = pathToFileURL(path.join(WT, 'docs/design/growth-v12/prototype.html')).href;
fs.mkdirSync(OUT, { recursive: true });
const vfile = path.join(OUT, 'verdict-v12.json');
const V = fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : {};
const save = () => fs.writeFileSync(vfile, JSON.stringify(V, null, 1));
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

// [name, prototype js, prototype selector, implementation state (driver), implementation selector, owner]
const CONTROLS = [
  ['theme card', "go('blindtest')", '#bt-th .thm', 'bthub-playlists', '#bt-th .ux-thm', 'G3'],
  ['language switch link', "LANDL='en';go('btland');setLand('en')", '#btland .langsw button:not(.on)', 'land-en', '.g3-landtop .ux-langsw a:not([aria-current])', 'G3'],
  ['live band ghost button', "go('blindtest')", '.liveband .btn-ghost', 'bthub-live-band', '.g3-liveband .ux-btn-ghost', 'G3'],
  ['personality answer', "openPers('kpdh');persNext()", '.popt', 'kpdh-question', '.ux-pers-opt', 'G5'],
  ['this or that song', "startQuiz();for(let i=G_.i;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}} endQuiz()", '#e-tot .toto', 'quiz-bonus', '.ux-toto', 'G7'],
  ['ways to play tile', "openG('Stray Kids')", '#hb-modes .gtile', 'hub-ways-to-play', '.g8-ways .ux-gtile', 'G8'],
  ['quiz template', "openG('RIIZE')", '.tpl', 'hub-empty-riize', '.g8-tpl', 'G8'],
];
const HPROPS = ['background-color', 'border-top-color', 'color', 'box-shadow', 'transform'];
const FPROPS = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow'];
const n = (v) => String(v ?? '').replace(/\s+/g, ' ').replace(/\s*([,()])\s*/g, '$1').trim().toLowerCase();
function eq(a, b) {
  if (n(a) === n(b)) return true;
  const na = n(a).match(/-?[\d.]+/g); const nb = n(b).match(/-?[\d.]+/g);
  return Boolean(na && nb && na.length === nb.length && n(a).replace(/-?[\d.]+/g, '#') === n(b).replace(/-?[\d.]+/g, '#') && na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) <= 0.5));
}
const diff = (p, i, props) => (!p || !i ? [{ what: 'element', expected: p ? 'present' : 'absent', actual: i ? 'present' : 'absent' }] : props.filter((k) => !eq(p[k], i[k])).map((k) => ({ what: k, expected: p[k], actual: i[k] })));
const styleOf = (loc, P) => loc.evaluate((e, props) => { const cs = getComputedStyle(e); return { fv: e.matches(':focus-visible'), hover: e.matches(':hover'), ...Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])) }; }, P);

async function proto(theme, js, reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(PROTO); await page.waitForTimeout(500);
  await page.addStyleTag({ content: '.notes-t,.tour-t,.guestbar,.notes,.dnote{display:none!important}' });
  await page.evaluate(js); await page.waitForTimeout(800);
  return { ctx, page };
}
async function impl(theme, stateId, reduced = false) {
  const st = STATES[stateId];
  const ctx = await newCtx(browser, { BASE, AUTH_FILE, width: 1440, theme, auth: st.auth, reduced });
  const page = await ctx.newPage(); page.setDefaultTimeout(45_000);
  await guard(page);
  await st.open(page, {});
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(600);
  return { ctx, page };
}

for (const kind of ['hover', 'focus'].filter((k) => ONLY.includes(k))) {
  V[kind] = V[kind] ?? {};
  for (const theme of ['light', 'dark']) {
    for (const [name, js, psel, sid, isel, owner] of CONTROLS) {
      const slug = `${kind}-${name.replace(/\W+/g, '-')}-${theme}`;
      const props = kind === 'hover' ? HPROPS : ['fv', ...FPROPS];
      let pS = null; let iS = null; let err = null;
      try {
        const P = await proto(theme, js);
        const pl = P.page.locator(psel).first();
        await pl.scrollIntoViewIfNeeded();
        if (kind === 'hover') { await pl.hover(); } else { await P.page.keyboard.press('Tab'); await pl.evaluate((e) => { if (!e.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT)$/.test(e.tagName)) e.setAttribute('tabindex', '0'); e.focus(); }); }
        await P.page.waitForTimeout(500);
        pS = await styleOf(pl, kind === 'hover' ? HPROPS : FPROPS);
        await P.ctx.close();
      } catch (e) { err = `prototype: ${String(e.message).split('\n')[0]}`; }
      try {
        const I = await impl(theme, sid);
        const il = I.page.locator(isel).first();
        await il.scrollIntoViewIfNeeded();
        if (kind === 'hover') { await il.hover(); } else { await I.page.keyboard.press('Tab'); await il.focus(); }
        await I.page.waitForTimeout(500);
        iS = await styleOf(il, kind === 'hover' ? HPROPS : FPROPS);
        await il.screenshot({ path: path.join(OUT, `${slug}.png`) }).catch(() => {});
        await I.ctx.close();
      } catch (e) { err = `${err ? err + '; ' : ''}implementation: ${String(e.message).split('\n')[0]}`; }
      const mism = err ? [{ what: 'driver', expected: 'measured', actual: err }] : diff(pS, iS, props);
      V[kind][`${name}-${theme}`] = { verdict: mism.length ? 'fail' : 'pass', owner, proto: psel, impl: isel, state: sid, mismatches: mism, measured: { proto: pS, impl: iS }, evidence: `_extra/${slug}.png` };
      save();
      console.log(kind, name, theme, V[kind][`${name}-${theme}`].verdict, mism.length ? JSON.stringify(mism).slice(0, 300) : '');
    }
  }
}

if (ONLY.includes('motion')) {
  V.motion = {};
  const probe = () => {
    const running = document.getAnimations().filter((a) => a.playState === 'running').map((a) => { const t = a.effect?.getTiming?.() ?? {}; const el = a.effect?.target; return { name: a.animationName || a.constructor.name, dur: t.duration, iter: t.iterations, el: el ? String(el.className).slice(0, 50) : '' }; });
    const longTransitions = Array.from(document.querySelectorAll('.ux-app *, .ux-layer *')).filter((e) => getComputedStyle(e).transitionDuration.split(',').some((x) => parseFloat(x) > 0.01)).length;
    return { running: running.filter((a) => a.iter === Infinity || (typeof a.dur === 'number' && a.dur > 10)), longTransitions };
  };
  for (const sid of ['land-en', 'theme-gen5', 'bthub-live-band', 'kpdh-question', 'nta-play', 'hub-ways-to-play', 'live-setup']) {
    let r; try { const I = await impl('light', sid, true); await I.page.waitForTimeout(800); r = await I.page.evaluate(probe); await I.ctx.close(); } catch (e) { r = { error: String(e.message).split('\n')[0] }; }
    V.motion[sid] = { verdict: !r.error && r.running.length === 0 && r.longTransitions === 0 ? 'pass' : 'fail', ...r };
    save(); console.log('motion', sid, V.motion[sid].verdict, JSON.stringify(r).slice(0, 300));
  }
}
await browser.close();
