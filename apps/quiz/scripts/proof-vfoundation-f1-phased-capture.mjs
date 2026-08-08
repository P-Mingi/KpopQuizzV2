// V-FOUNDATION F1 Phase D - capture the create dialog (screen 04) + a stub page, via CDP.
// Logs in as the owner (create is curator-gated).
//   node scripts/proof-vfoundation-f1-phased-capture.mjs <base> <stubSlug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3021';
const STUB = process.argv[3] ?? 'zzz-f1-stub-era';
const OUT = process.argv[4] ?? 'docs/proofs/vfoundation-f1/phase-d';
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,1000', '--user-data-dir=/tmp/vf1d-capture', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const [wp, rp] = [chrome.stdio[3], chrome.stdio[4]];
let nextId = 1; const pending = new Map(); let buf = Buffer.alloc(0);
rp.on('data', (c) => { buf = Buffer.concat([buf, c]); let i; while ((i = buf.indexOf(0)) !== -1) { const m = buf.subarray(0, i).toString('utf8'); buf = buf.subarray(i + 1); if (!m) continue; let o; try { o = JSON.parse(m); } catch { continue; } if (o.id && pending.has(o.id)) { const { resolve, reject } = pending.get(o.id); pending.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result); } } });
const send = (method, params = {}, sessionId) => { const id = nextId++; const p = { id, method, params }; if (sessionId) p.sessionId = sessionId; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); wp.write(JSON.stringify(p) + '\0'); setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 30000); }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await sleep(700);
  const { targetInfos } = await send('Target.getTargets');
  const targetId = targetInfos.find((t) => t.type === 'page').targetId;
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 1000, deviceScaleFactor: 1, mobile: false }, S);
  const goto = async (u) => { await send('Page.navigate', { url: u }, S); await sleep(2200); };
  const evalJs = (e) => send('Runtime.evaluate', { expression: e }, S);
  const setTheme = async (t) => { await evalJs(`(()=>{const r=document.documentElement;r.classList.remove('light','dark');r.classList.add('${t}')})()`); await sleep(350); };
  const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, S); writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64')); console.log(`saved ${OUT}/${name}.png`); };

  await goto(`${BASE}/api/dev/login`);
  // create dialog, prefilled title -> shows type grid + slug preview.
  await goto(`${BASE}/verse/bts/new?title=${encodeURIComponent("Jin's Studio")}`);
  await sleep(800);
  await setTheme('light'); await shot('create-dialog-light');
  await setTheme('dark'); await shot('create-dialog-dark');
  // the honest stub page.
  await goto(`${BASE}/verse/bts/${STUB}`);
  await setTheme('light'); await shot('stub-state-light');

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill(); await sleep(150); console.log('DONE'); process.exit(0);
} catch (e) { console.error('CAPTURE FAILED:', e.message); chrome.kill(); process.exit(1); }
