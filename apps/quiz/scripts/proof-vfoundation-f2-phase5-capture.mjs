// V-FOUNDATION F2 Phase 5 - capture the reader PREVIEW, the HISTORY panel, and the slash
// PALETTE (frame buttons are reliable JS clicks; the palette opens via the + gutter).
//   node scripts/proof-vfoundation-f2-phase5-capture.mjs <base> <slug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const BASE = process.argv[2], SLUG = process.argv[3], OUT = process.argv[4];
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,900', '--user-data-dir=/tmp/vf2p5', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const [wp, rp] = [chrome.stdio[3], chrome.stdio[4]];
let nextId = 1; const pending = new Map(); let buf = Buffer.alloc(0);
rp.on('data', (c) => { buf = Buffer.concat([buf, c]); let i; while ((i = buf.indexOf(0)) !== -1) { const m = buf.subarray(0, i).toString('utf8'); buf = buf.subarray(i + 1); if (!m) continue; let o; try { o = JSON.parse(m); } catch { continue; } if (o.id && pending.has(o.id)) { const { resolve, reject } = pending.get(o.id); pending.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result); } } });
const send = (method, params = {}, s) => { const id = nextId++; const p = { id, method, params }; if (s) p.sessionId = s; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); wp.write(JSON.stringify(p) + '\0'); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('t')); } }, 30000); }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await sleep(700);
  const { targetInfos } = await send('Target.getTargets');
  const targetId = targetInfos.find((t) => t.type === 'page').targetId;
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  const evalJs = async (e) => (await send('Runtime.evaluate', { expression: e }, S)).result.value;
  const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, S); writeFileSync(`${OUT}/${n}.png`, Buffer.from(data, 'base64')); console.log(`saved ${n}`); };
  await send('Page.navigate', { url: `${BASE}/api/dev/login` }, S); await sleep(1500);
  await send('Page.navigate', { url: `${BASE}/verse/bts/${SLUG}/edit` }, S); await sleep(3200);

  // preview: click the eye button.
  await evalJs(`(()=>{const b=[...document.querySelectorAll('.pfrm-bar .ib')].find(x=>x.title==='Reader preview');b&&b.click();})()`);
  await sleep(700); await shot('reader-preview');
  await evalJs(`(()=>{const b=[...document.querySelectorAll('.pfrm-bar .ib')].find(x=>x.title==='Reader preview');b&&b.click();})()`);
  await sleep(500);
  // history: click the history button.
  await evalJs(`(()=>{const b=[...document.querySelectorAll('.pfrm-bar .ib')].find(x=>x.title==='Revision history');b&&b.click();})()`);
  await sleep(900); await shot('history-panel');
  await evalJs(`(()=>{document.querySelector('.pfrm-scrim')?.click();})()`);
  await sleep(400);
  // slash palette: click the last block's + gutter.
  await evalJs(`(()=>{const a=document.querySelectorAll('.ped-gut .add');a[a.length-1]&&a[a.length-1].click();})()`);
  await sleep(700); await shot('slash-palette');

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill(); await sleep(150); console.log('DONE'); process.exit(0);
} catch (e) { console.error('FAIL', e.message); chrome.kill(); process.exit(1); }
