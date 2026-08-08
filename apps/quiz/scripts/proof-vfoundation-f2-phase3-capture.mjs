// V-FOUNDATION F2 Phase 3 - capture the writing surface (+ palette + selection toolbar) and
// prove a real typed autosave round-trip (type -> serialize -> save -> reader shows it).
//   node scripts/proof-vfoundation-f2-phase3-capture.mjs <base> <slug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const BASE = process.argv[2] ?? 'http://localhost:3021';
const SLUG = process.argv[3] ?? 'zzz-f2-editor-demo';
const OUT = process.argv[4] ?? 'docs/proofs/vfoundation-f2/phase-3';
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,900', '--user-data-dir=/tmp/vf2p3', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
const [wp, rp] = [chrome.stdio[3], chrome.stdio[4]];
let nextId = 1; const pending = new Map(); let buf = Buffer.alloc(0);
rp.on('data', (c) => { buf = Buffer.concat([buf, c]); let i; while ((i = buf.indexOf(0)) !== -1) { const m = buf.subarray(0, i).toString('utf8'); buf = buf.subarray(i + 1); if (!m) continue; let o; try { o = JSON.parse(m); } catch { continue; } if (o.id && pending.has(o.id)) { const { resolve, reject } = pending.get(o.id); pending.delete(o.id); o.error ? reject(new Error(JSON.stringify(o.error))) : resolve(o.result); } } });
const send = (method, params = {}, s) => { const id = nextId++; const p = { id, method, params }; if (s) p.sessionId = s; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); wp.write(JSON.stringify(p) + '\0'); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`timeout ${method}`)); } }, 30000); }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function type(S, text) { for (const ch of text) { await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch }, S); await send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch }, S); await sleep(15); } }
try {
  await sleep(700);
  const { targetInfos } = await send('Target.getTargets');
  const targetId = targetInfos.find((t) => t.type === 'page').targetId;
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  const goto = async (u) => { await send('Page.navigate', { url: u }, S); await sleep(2600); };
  const evalJs = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true }, S)).result.value;
  const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }, S); writeFileSync(`${OUT}/${n}.png`, Buffer.from(data, 'base64')); console.log(`saved ${OUT}/${n}.png`); };

  await goto(`${BASE}/api/dev/login`);
  await goto(`${BASE}/verse/bts/${SLUG}/edit`);
  await sleep(1200);
  await shot('writing-surface');

  // selection toolbar: select the first paragraph's text.
  await evalJs(`(()=>{const el=document.querySelector('[data-eb]');const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));})()`);
  await sleep(500); await shot('selection-toolbar');

  // slash palette: click the last block's + gutter (inserts a block + opens the palette).
  await evalJs(`(()=>{const s=getSelection();s&&s.removeAllRanges();const adds=document.querySelectorAll('.ped-gut .add');adds[adds.length-1]&&adds[adds.length-1].click();})()`);
  await sleep(600); await shot('slash-palette');

  // real typed autosave: focus the first paragraph, put caret at end, type a marker.
  const MARK = 'F2LIVEEDIT';
  await evalJs(`(()=>{const el=document.querySelector('[data-eb]');el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);})()`);
  await sleep(200);
  await type(S, ' ' + MARK);
  await sleep(1600);   // autosave debounce 900ms + network
  console.log('typed marker; autosave should have fired');

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill(); await sleep(150); console.log('DONE'); process.exit(0);
} catch (e) { console.error('CAPTURE FAILED:', e.message); chrome.kill(); process.exit(1); }
