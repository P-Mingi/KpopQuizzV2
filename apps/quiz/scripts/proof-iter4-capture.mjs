// Iteration 4 proofs: the OPEN sidebar reformatted (global block = one system) with the NAVIGATE
// accordion collapsed by default, an accordion section auto-expanded on a sub-page, and the icon
// rail (unchanged). CDP over --remote-debugging-pipe.
//   node scripts/proof-iter4-capture.mjs <baseUrl> <slug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3021';
const SLUG = process.argv[3] ?? 'bts';
const OUT = process.argv[4] ?? 'docs/proofs/v3nav-iter4';
mkdirSync(OUT, { recursive: true });

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1440,900',
  '--user-data-dir=/tmp/iter4-capture-profile', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const wp = chrome.stdio[3], rp = chrome.stdio[4];
let nextId = 1; const pending = new Map(); let buf = Buffer.alloc(0);
rp.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]); let i;
  while ((i = buf.indexOf(0)) !== -1) {
    const msg = buf.subarray(0, i).toString('utf8'); buf = buf.subarray(i + 1);
    if (!msg) continue; let o; try { o = JSON.parse(msg); } catch { continue; }
    if (o.id && pending.has(o.id)) { const { resolve, reject } = pending.get(o.id); pending.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result); }
  }
});
function send(method, params = {}, sessionId) {
  const id = nextId++; const payload = { id, method, params }; if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); wp.write(JSON.stringify(payload) + '\0'); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); } }, 30000); });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(700);
  const { targetInfos } = await send('Target.getTargets');
  const t = targetInfos.find((x) => x.type === 'page');
  const targetId = t ? t.targetId : (await send('Target.createTarget', { url: 'about:blank' })).targetId;
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  const evalJs = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, S); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval'); return r.result.value; };
  const shot = async (name, full) => {
    const h = full ? Math.min(await evalJs('Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)'), 2400) : 900;
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full, clip: { x: 0, y: 0, width: 1440, height: h, scale: 1 } }, S);
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64')); console.log('saved ' + name);
  };
  const goto = async (url) => { await send('Page.navigate', { url }, S); await sleep(1900); };

  // 1) home: reformatted global block + NAVIGATE accordion COLLAPSED by default
  await goto(`${BASE}/verse/${SLUG}`); await shot('open-accordion-collapsed', false);
  // 2) a Music sub-page: Music auto-EXPANDED, Discography active
  await goto(`${BASE}/verse/${SLUG}/discography-index`); await shot('open-accordion-expanded', false);
  // 3) collapsed icon rail unchanged (iteration 3)
  await goto(`${BASE}/verse/${SLUG}`); await evalJs("document.getElementById('v-nav-collapse').checked=true"); await sleep(300); await shot('icon-rail', false);

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill(); await sleep(200); console.log('DONE'); process.exit(0);
}
main().catch((e) => { console.error('FAILED:', e.message); chrome.kill(); process.exit(1); });
