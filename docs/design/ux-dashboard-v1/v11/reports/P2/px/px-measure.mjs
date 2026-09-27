// P2 pixel pass: measure the prototype's #quizzes view and the implementation's /quizzes
// with the same landmark pairs, boxes (page coordinates) and computed styles.
// Usage: node px-measure.mjs <out.json> [base=http://localhost:3032] [widths=1440,390] [themes=light,dark]
// Read only: every non-GET request of the implementation is answered locally (204).
import fs from 'node:fs';
import { chromium } from '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/node_modules/@playwright/test/index.mjs';

const [,, out = 'px.json', base = 'http://localhost:3032', W = '1440,390', T = 'light,dark', ONLY = ''] = process.argv;
const PROTO = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/prototype.html';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-radius', 'background-color', 'color', 'font-family', 'font-size', 'font-weight',
  'line-height', 'letter-spacing', 'text-align', 'box-shadow', 'gap', 'row-gap', 'column-gap', 'grid-template-columns', 'display',
  'flex-direction', 'align-items', 'justify-content', 'opacity', 'text-transform', 'white-space', 'overflow-x', 'max-width'];

// [label, prototype selector (inside #quizzes unless it starts with '!'), implementation selector, nth]
const L = [
  ['wrap', '.wrap', '.p2-page'],
  ['header', 'header.ph', '.p2-ph'],
  ['h1', 'header.ph h1', '.p2-ph h1'],
  ['intro', 'header.ph p', '.p2-ph p'],
  ['create', '.qz-create', '.p2-create'],
  ['ctl', '!#q-sort|parent', '.p2-ctl'],
  ['seg', '#q-sort', '.p2-sort'],
  ['seg-0', '#q-sort > *:nth-child(1)', '.p2-sort > *:nth-child(1)'],
  ['seg-1', '#q-sort > *:nth-child(2)', '.p2-sort > *:nth-child(2)'],
  ['seg-2', '#q-sort > *:nth-child(3)', '.p2-sort > *:nth-child(3)'],
  ['seg-3', '#q-sort > *:nth-child(4)', '.p2-sort > *:nth-child(4)'],
  ['seg-on', '#q-sort > .on', '.p2-sort > [aria-current="page"]'],
  ['seg-off', '#q-sort > :not(.on)', '.p2-sort > :not([aria-current="page"])'],
  ['dds', '!#q-sort|next', '.p2-dds'],
  ['dd-0', '.dd', '.p2-dd', 0],
  ['dd-1', '.dd', '.p2-dd', 1],
  ['dd-2', '.dd', '.p2-dd', 2],
  ['dd-ico', '.dd .ico', '.p2-dd .ux-ico'],
  ['chips', '#q-chips', '.p2-chips'],
  ['chip-0', '#q-chips .chip', '.p2-chips .p2-chip', 0],
  ['chip-1', '#q-chips .chip', '.p2-chips .p2-chip', 1],
  ['chip-x', '#q-chips .chip .ico', '.p2-chips .p2-chip .ux-ico'],
  ['grid', '#q-grid', '.p2-grid'],
  ['card-0', '.qcard', '.p2-grid .ux-qcard', 0],
  ['card-1', '.qcard', '.p2-grid .ux-qcard', 1],
  ['card-2', '.qcard', '.p2-grid .ux-qcard', 2],
  ['card-3', '.qcard', '.p2-grid .ux-qcard', 3],
  ['card-4', '.qcard', '.p2-grid .ux-qcard', 4],
  ['cov', '.qcard .qcov', '.p2-grid .ux-qcov'],
  ['qb', '.qcard .qb', '.p2-grid .ux-qb'],
  ['qg', '.qcard .qg', '.p2-grid .ux-qg'],
  ['qt', '.qcard h3', '.p2-grid .ux-qt'],
  ['qf', '.qcard .qf', '.p2-grid .ux-qf'],
  ['qlv', '.qcard .qlv', '.p2-grid .ux-qlv'],
  ['qpl', '.qcard .qpl', '.p2-grid .ux-qpl'],
  ['more-wrap', '!#q-more-btn|parent', '.p2-more'],
  ['more', '#q-more-btn', '.p2-more .ux-btn'],
  ['empty', '.empty', '.p2-empty'],
  ['empty-b', '.empty b', '.p2-empty b'],
  ['empty-btn', '.empty .btn', '.p2-empty .ux-btn'],
  ['menu', '!#ddpop', '.p2-dds .ux-ddpop:not([hidden])'],
  ['menu-i0', '!#ddpop .mi', '.p2-dds .ux-ddpop:not([hidden]) .ux-mi', 0],
  ['menu-i1', '!#ddpop .mi', '.p2-dds .ux-ddpop:not([hidden]) .ux-mi', 1],
];

// state -> [prototype JS, implementation path, implementation action]
const STATES = {
  default: ["go('quizzes');qClear()", '/quizzes?sort=trending', null],
  mostplayed: ["go('quizzes');qClear()", '/quizzes', null],
  chips: ["go('quizzes');qClear();QF.Type='True/false';QF.Level='Hard';renderQ2()", '/quizzes?sort=trending&type=tf&level=hard', null],
  empty: ["go('quizzes');qClear();QF.Group='BTS';QF.Type='Find the intruder';renderQ2()", '/quizzes?sort=trending&group=bts&type=intruder', null],
  short: ["go('quizzes');qClear();window.__ql=window.__ql||QLIST.map(function(x){return x.slice()});QLIST.forEach(function(x,i){x[1]=i<4?'BTS basics':window.__ql[i][1]});renderQ2()", '/quizzes?sort=trending', null],
  menu: ["go('quizzes');qClear();if(window.__ql)QLIST.forEach(function(x,i){x[1]=window.__ql[i][1]});renderQ2();ddOpen(document.querySelector('#quizzes .dd'),'Type',['Classic','True/false','Guess from clues','Image','Find the intruder'],{stopPropagation(){}})", '/quizzes?sort=trending', 'menu'],
};

async function collect(page, proto) {
  return page.evaluate(({ L, P, proto }) => {
    const view = proto ? document.querySelector('#quizzes') : document;
    const pick = (sel, nth) => {
      if (proto && sel.startsWith('!')) {
        const [s, rel] = sel.slice(1).split('|');
        const el = (s.startsWith('#q') ? document.querySelector(s) : document.querySelectorAll(s)[nth ?? 0]) ?? null;
        if (!el) return null;
        return rel === 'parent' ? el.parentElement : rel === 'next' ? el.nextElementSibling : el;
      }
      return view.querySelectorAll(sel)[nth ?? 0] ?? null;
    };
    const o = {};
    for (const [label, ps, is, nth] of L) {
      const el = pick(proto ? ps : is, nth);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(el);
      o[label] = {
        box: { x: +r.x.toFixed(2), y: +(r.y + scrollY).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) },
        s: Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p)])),
        text: (el.textContent ?? '').trim().slice(0, 60),
      };
    }
    o._doc = { h: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    return o;
  }, { L, P: PROPS, proto });
}

const browser = await chromium.launch({ executablePath: EXEC });
const result = {};
for (const w of W.split(',').map(Number)) {
  const h = w < 500 ? 844 : 900;
  for (const theme of T.split(',')) {
    // prototype
    const pctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500, reducedMotion: 'reduce' });
    const pp = await pctx.newPage();
    await pp.goto('file://' + PROTO);
    await pp.waitForTimeout(400);
    await pp.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
    // implementation
    const ictx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500, reducedMotion: 'reduce' });
    await ictx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* */ } }, theme);
    await ictx.route('**/*', (route) => (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.fulfill({ status: 204, body: '' })));
    const ip = await ictx.newPage();
    for (const [state, [js, path, act]] of Object.entries(STATES)) {
      if (ONLY && !ONLY.split(',').includes(state)) continue;
      await pp.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); eval(code); }, js);
      await pp.waitForTimeout(500);
      const pv = await collect(pp, true);
      await ip.goto(base + path, { waitUntil: 'load', timeout: 180000 });
      await ip.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await ip.locator('.p2-ctl[data-ready]').waitFor({ timeout: 90000 });
      if (act === 'menu') {
        await ip.locator('.p2-dd-type').click();
        await ip.locator('.p2-dd-type + .ux-pop').waitFor({ state: 'visible' });
      }
      await ip.waitForTimeout(400);
      const iv = await collect(ip, false);
      result[`${w}-${theme}-${state}`] = { proto: pv, impl: iv };
      console.log('measured', w, theme, state);
    }
    await pctx.close();
    await ictx.close();
  }
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
