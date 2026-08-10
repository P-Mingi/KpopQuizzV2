// Verse iter-7 (Notion-style nav) proof capture. Headless Chrome over --remote-debugging-pipe
// (the browser pane misrenders fixed elements + 1280 emulation; real Chrome is faithful). Points
// at the running dev server on :3021 and writes PNGs to docs/proofs/iter7-notion-nav/.
//   node apps/quiz/scripts/proof-iter7-capture.mjs docs/proofs/iter7-notion-nav
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/proofs/iter7-notion-nav';
const BASE = 'http://localhost:3021';
mkdirSync(OUT, { recursive: true });

// Nav-fold helpers: stamp the same attribute + cookie the VerseNavToggle writes, so a captured
// state matches a real user's persisted choice. Omit `js` to prove the per-route CSS default.
const setOpen = `document.cookie='verse_nav=open;path=/;max-age=31536000';document.documentElement.setAttribute('data-verse-nav','open')`;
const setHidden = `document.cookie='verse_nav=hidden;path=/;max-age=31536000';document.documentElement.setAttribute('data-verse-nav','hidden')`;
const openDrawer = `(()=>{var c=document.getElementById('v-nav-drawer');if(c){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))}})()`;

const JOBS = [
  // 1 - desktop content page: top bar + space sidebar (accordion auto-opens the current section)
  { name: '01-desktop-content-open-light', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 820, full: false, js: setOpen },
  // 2 - FULL HIDE: sidebar collapses to width 0, floating reopen tab appears, content centered
  { name: '02-desktop-content-hidden-light', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 820, full: false, js: setHidden },
  // 3 - no-cookie DEFAULTS: space home opens; a deeper content page hides (per-route CSS default)
  { name: '03-desktop-home-default-open-light', url: `${BASE}/verse/bts`, w: 1280, h: 820, full: false },
  { name: '04-desktop-content-default-hidden-light', url: `${BASE}/verse/bts/discography-index`, w: 1280, h: 820, full: false },
  // 4 - FIX1 intact: on a SHORT page the grey sidebar runs full height down to the white footer
  { name: '05-desktop-short-fix1-footer-light', url: `${BASE}/verse/bts/tv-index`, w: 1280, full: true, js: setOpen },
  // dark - the same content page, sidebar open + hidden, no cream on any surface
  { name: '06-desktop-content-open-dark', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 820, full: false, theme: 'dark', js: setOpen },
  { name: '07-desktop-content-hidden-dark', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 820, full: false, theme: 'dark', js: setHidden },
  // 5 - mobile 390: condensed top bar (logo + search icon + Play + hamburger + Sign in), white footer
  { name: '08-mobile-topbar-light', url: `${BASE}/verse/bts/members-index`, w: 390, h: 844, full: false },
  { name: '09-mobile-drawer-open-light', url: `${BASE}/verse/bts/members-index`, w: 390, h: 844, full: false, js: openDrawer },
  { name: '10-mobile-topbar-dark', url: `${BASE}/verse/bts/members-index`, w: 390, h: 844, full: false, theme: 'dark' },
];

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,900', '--user-data-dir=/tmp/iter7-prof', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const wp = chrome.stdio[3], rp = chrome.stdio[4]; let id = 1; const pend = new Map(); let buf = Buffer.alloc(0);
rp.on('data', c => { buf = Buffer.concat([buf, c]); let i; while ((i = buf.indexOf(0)) !== -1) { const m = buf.subarray(0, i).toString(); buf = buf.subarray(i + 1); if (!m) continue; let o; try { o = JSON.parse(m) } catch { continue } if (o.id && pend.has(o.id)) { const { resolve, reject } = pend.get(o.id); pend.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result) } } });
const send = (method, params = {}, s) => { const i = id++; const p = { id: i, method, params }; if (s) p.sessionId = s; return new Promise((res, rej) => { pend.set(i, { resolve: res, reject: rej }); wp.write(JSON.stringify(p) + '\0'); setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('t ' + method)) } }, 30000) }) };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(700);
const { targetInfos } = await send('Target.getTargets'); const t = targetInfos.find(x => x.type === 'page');
const { sessionId: S } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
const evalJs = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, S); return r.result?.value };
for (const j of JOBS) {
  await send('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h || 900, deviceScaleFactor: 1, mobile: j.w < 560 }, S);
  await send('Page.navigate', { url: j.url }, S); await sleep(2200);
  if (j.theme) { await evalJs(`(()=>{const r=document.documentElement;r.classList.remove('light','dark');r.classList.add('${j.theme}')})()`); await sleep(300); }
  if (j.js) { await evalJs(j.js); await sleep(450); }
  const full = j.full !== false;
  const h = full ? Math.min(await evalJs('Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)'), 3000) : (j.h || 900);
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip: { x: 0, y: 0, width: j.w, height: h, scale: 1 } }, S);
  writeFileSync(`${OUT}/${j.name}.png`, Buffer.from(data, 'base64')); console.log('saved ' + j.name + ' (' + j.w + 'x' + h + ')');
}
chrome.kill(); await sleep(150); process.exit(0);
