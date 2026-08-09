// V3 HOME proof screenshots - the editorial center + white ground + 1120 width, at
// 1440 / 1024 / 390, light + dark. Drives installed Chrome over --remote-debugging-pipe
// (the headless-capture-harness pattern; the browser pane misrenders desktop emulation).
//   node scripts/proof-v3home-capture.mjs <baseUrl> <slug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3021';
const SLUG = process.argv[3] ?? 'bts';
const OUT = process.argv[4] ?? 'docs/proofs/v3home';
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1440,900',
  '--user-data-dir=/tmp/v3home-capture-profile', '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });

const writePipe = chrome.stdio[3];
const readPipe = chrome.stdio[4];
let nextId = 1;
const pending = new Map();
let buf = Buffer.alloc(0);
readPipe.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  let i;
  while ((i = buf.indexOf(0)) !== -1) {
    const msg = buf.subarray(0, i).toString('utf8');
    buf = buf.subarray(i + 1);
    if (!msg) continue;
    let obj; try { obj = JSON.parse(msg); } catch { continue; }
    if (obj.id && pending.has(obj.id)) {
      const { resolve, reject } = pending.get(obj.id);
      pending.delete(obj.id);
      obj.error ? reject(new Error(JSON.stringify(obj.error))) : resolve(obj.result);
    }
  }
});
function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    writePipe.write(JSON.stringify(payload) + '\0');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 30000);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(700);
  const { targetInfos } = await send('Target.getTargets');
  const target = targetInfos.find((t) => t.type === 'page');
  const targetId = target ? target.targetId : (await send('Target.createTarget', { url: 'about:blank' })).targetId;
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S);
  await send('Runtime.enable', {}, S);

  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, S);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
    return r.result.value;
  };
  const setTheme = async (t) => {
    await evalJs(`(() => { const r=document.documentElement; r.classList.remove('light','dark'); r.classList.add('${t}'); try{localStorage.setItem('theme','${t}')}catch{} })()`);
    await sleep(350);
  };
  const capture = async (width, theme, name) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 560 }, S);
    await send('Page.navigate', { url: `${BASE}/verse/${SLUG}` }, S);
    await sleep(1800);
    await setTheme(theme);
    const h = await evalJs('Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)');
    const { data } = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: Math.min(h, 6000), scale: 1 },
    }, S);
    const path = `${OUT}/${name}.png`;
    writeFileSync(path, Buffer.from(data, 'base64'));
    console.log(`saved ${path}  (${width}w x ${Math.min(h, 6000)}h, ${theme})`);
  };

  for (const [w, tag] of [[1440, '1440'], [1024, '1024'], [390, '390']]) {
    await capture(w, 'light', `home-${tag}-light`);
    await capture(w, 'dark', `home-${tag}-dark`);
  }

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill();
  await sleep(200);
  console.log('DONE');
  process.exit(0);
}
main().catch((e) => { console.error('CAPTURE FAILED:', e.message); chrome.kill(); process.exit(1); });
