// W2 (battle trigger) proof capture, headless Chrome over --remote-debugging-pipe.
// Plays a real quiz to the result screen and shoots the challenge block.
//   node apps/quiz/scripts/proof-w2-battle-capture.mjs docs/proofs/w2-battle
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/proofs/w2-battle';
const BASE = 'http://localhost:3021';
const QUIZ = '/q/blackpink-world-records-and-achievements';
mkdirSync(OUT, { recursive: true });

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,900', '--user-data-dir=/tmp/w2-prof', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const wp = chrome.stdio[3], rp = chrome.stdio[4]; let id = 1; const pend = new Map(); let buf = Buffer.alloc(0);
rp.on('data', c => { buf = Buffer.concat([buf, c]); let i; while ((i = buf.indexOf(0)) !== -1) { const m = buf.subarray(0, i).toString(); buf = buf.subarray(i + 1); if (!m) continue; let o; try { o = JSON.parse(m) } catch { continue } if (o.id && pend.has(o.id)) { const { resolve, reject } = pend.get(o.id); pend.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result) } } });
const send = (method, params = {}, s) => { const i = id++; const p = { id: i, method, params }; if (s) p.sessionId = s; return new Promise((res, rej) => { pend.set(i, { resolve: res, reject: rej }); wp.write(JSON.stringify(p) + '\0'); setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('t ' + method)) } }, 60000) }) };
const sleep = ms => new Promise(r => setTimeout(r, ms));

await sleep(700);
const { targetInfos } = await send('Target.getTargets'); const t = targetInfos.find(x => x.type === 'page');
const { sessionId: S } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
const evalJs = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, S); return r.result?.value };

/** Play the quiz from the intro through to the result screen, for real. */
const PLAY = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const start = [...document.querySelectorAll('button')].find(b => /START QUIZ/i.test(b.textContent||''));
  if (start) { start.click(); await sleep(1500); }
  for (let i = 0; i < 24; i++) {
    if (document.querySelector('.result-share-card')) return 'result';
    const ans = [...document.querySelectorAll('button.ans-btn')].filter(b => !b.className.includes('disabled'));
    if (ans.length) { ans[0].click(); await sleep(650); continue; }
    const next = document.querySelector('button.next-btn.show');
    if (next) { next.click(); await sleep(650); continue; }
    await sleep(650);
  }
  return 'timeout';
})()`;

/** Scroll the challenge block into view and report its box for a tight clip. */
const BOX = `(() => {
  const el = [...document.querySelectorAll('p')].find(p => /Want to battle someone on this\\?/.test(p.textContent||''));
  if (!el) return null;
  const card = el.closest('div');
  card.scrollIntoView({ block: 'center' });
  const r = card.getBoundingClientRect();
  // ABSOLUTE page coordinates: Page.captureScreenshot clips against the page, not
  // the viewport, so a viewport-relative y lands on the wrong block once scrolled.
  return JSON.stringify({ x: Math.max(0, r.x - 12), y: Math.max(0, r.y + window.scrollY - 12), w: r.width + 24, h: r.height + 24 });
})()`;

/**
 * Force the empty-pool branch. The SERVER path is unreachable today (863 real open
 * runs), so this stubs the client's fetch to return the empty response the route
 * emits when nothing is open. It proves the COPY and the branch, not a fake pool.
 */
const FORCE_EMPTY = `(() => {
  const orig = window.fetch;
  window.fetch = (u, o) => {
    if (typeof u === 'string' && u.startsWith('/api/battle/random')) {
      return Promise.resolve(new Response(JSON.stringify({ battle: null, reason: 'no_open_runs' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return orig(u, o);
  };
  const btn = [...document.querySelectorAll('button')].find(b => /Random opponent/i.test(b.textContent||''));
  if (btn) btn.click();
  return !!btn;
})()`;

const shots = [
  { name: 'p1-result-challenge-desktop', w: 1280, h: 900 },
  { name: 'p2-result-challenge-mobile-390', w: 390, h: 844 },
];

for (const s of shots) {
  await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: s.w < 560 }, S);
  await send('Page.navigate', { url: BASE + QUIZ }, S);
  await sleep(2500);
  const phase = await evalJs(PLAY);
  await sleep(800);
  const box = JSON.parse((await evalJs(BOX)) || 'null');
  await sleep(300);
  const clip = box
    ? { x: 0, y: Math.max(0, box.y - 24), width: s.w, height: box.h + 48, scale: 1 }
    : { x: 0, y: 0, width: s.w, height: s.h, scale: 1 };
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip }, S);
  writeFileSync(`${OUT}/${s.name}.png`, Buffer.from(data, 'base64'));
  console.log(`saved ${s.name} (${s.w}x${Math.round(clip.height)}) phase=${phase} block=${box ? 'found' : 'MISSING'}`);
}

// The honest empty state, at phone width.
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, S);
await send('Page.navigate', { url: BASE + QUIZ }, S);
await sleep(2500);
await evalJs(PLAY);
await sleep(800);
const clicked = await evalJs(FORCE_EMPTY);
await sleep(1500);
const box2 = JSON.parse((await evalJs(BOX)) || 'null');
const clip2 = box2 ? { x: 0, y: Math.max(0, box2.y - 24), width: 390, height: box2.h + 48, scale: 1 } : { x: 0, y: 0, width: 390, height: 844, scale: 1 };
const { data: d2 } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: clip2 }, S);
writeFileSync(`${OUT}/p3-empty-pool-mobile-390.png`, Buffer.from(d2, 'base64'));
console.log(`saved p3-empty-pool-mobile-390 (clicked=${clicked})`);

// The accept screen the shared link lands on. ACCEPT_URL is passed in because the
// battle id only exists once a challenge has been created.
const ACCEPT_URL = process.env.W2_ACCEPT_URL;
if (ACCEPT_URL) {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, S);
  await send('Page.navigate', { url: ACCEPT_URL }, S);
  await sleep(3000);
  const { data: d3 } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: 520, scale: 1 } }, S);
  writeFileSync(`${OUT}/p4-accept-screen-mobile-390.png`, Buffer.from(d3, 'base64'));
  console.log('saved p4-accept-screen-mobile-390');
}

chrome.kill(); await sleep(150); process.exit(0);
