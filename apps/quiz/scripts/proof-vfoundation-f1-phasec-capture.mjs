// V-FOUNDATION F1 Phase C - capture the DOCUMENT canvas (light + dark) via CDP pipe
// (the browser pane misrenders desktop emulation). No login: VERSE_PUBLIC=true locally.
//   node scripts/proof-vfoundation-f1-phasec-capture.mjs <url> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL_ = process.argv[2];
const OUT = process.argv[3] ?? 'docs/proofs/vfoundation-f1/phase-c';
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,1400', '--user-data-dir=/tmp/vf1-capture', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
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
  await send('Page.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false }, S);
  const evalJs = (expression) => send('Runtime.evaluate', { expression }, S);
  const setTheme = async (t) => { await send('Runtime.enable', {}, S); await evalJs(`(()=>{const r=document.documentElement;r.classList.remove('light','dark');r.classList.add('${t}')})()`); await sleep(400); };
  const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, S); writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64')); console.log(`saved ${OUT}/${name}.png`); };
  await send('Page.navigate', { url: URL_ }, S);
  await sleep(3500);
  await setTheme('light'); await shot('document-light');
  await setTheme('dark'); await shot('document-dark');
  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill(); await sleep(150); console.log('DONE'); process.exit(0);
} catch (e) { console.error('CAPTURE FAILED:', e.message); chrome.kill(); process.exit(1); }
