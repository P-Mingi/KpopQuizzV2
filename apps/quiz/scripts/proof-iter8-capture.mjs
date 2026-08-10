// Verse iter-8 (finish micro-fixes) proof capture, headless Chrome over --remote-debugging-pipe.
//   node apps/quiz/scripts/proof-iter8-capture.mjs docs/proofs/iter8-finish
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/proofs/iter8-finish';
const BASE = 'http://localhost:3021';
mkdirSync(OUT, { recursive: true });

const setOpen = `document.cookie='verse_nav=open;path=/;max-age=31536000';document.documentElement.setAttribute('data-verse-nav','open')`;
const openDrawer = `(function(){var c=document.getElementById('v-nav-drawer');if(c){c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))}})()`;

const JOBS = [
  // FIX A (hero title clears the bar) + FIX B (hide button seated inside the header row) - light + dark
  { name: '01-desktop-content-hero-header-light', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 900, full: false, js: setOpen },
  { name: '02-desktop-content-hero-header-dark', url: `${BASE}/verse/bts/members-index`, w: 1280, h: 900, full: false, theme: 'dark', js: setOpen },
  // FIX A on the space home (masthead clears the bar)
  { name: '03-desktop-home-hero-light', url: `${BASE}/verse/bts`, w: 1280, h: 900, full: false, js: setOpen },
  // FIX C - the mobile drawer's global section (Fandoms / Community / theme) at the bottom
  { name: '04-mobile-drawer-global-light', url: `${BASE}/verse/bts/members-index`, w: 390, h: 844, full: false, js: openDrawer },
  { name: '05-mobile-drawer-global-dark', url: `${BASE}/verse/bts/members-index`, w: 390, h: 844, full: false, theme: 'dark', js: openDrawer },
  // FOOTER fix - a short page: footer pinned to the bottom, sidebar reaches it, no double-count band
  { name: '06-footer-short-page-light', url: `${BASE}/verse/bts/bu-index`, w: 1280, full: true, js: setOpen },
];

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,900', '--user-data-dir=/tmp/iter8-prof', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
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
