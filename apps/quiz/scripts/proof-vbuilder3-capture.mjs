// V-BUILDER-3 receipts R-B (members editor) + step-5 (hero editor) SCREENSHOTS,
// light + dark. No new dep: drives the installed Chrome over --remote-debugging-pipe
// (fd3 write / fd4 read, NUL-delimited CDP JSON), the headless-capture-harness pattern
// (the browser pane misrenders desktop emulation; CDP is faithful).
//   node scripts/proof-vbuilder3-capture.mjs <baseUrl> <slug> <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3021';
const SLUG = process.argv[3] ?? 'stray-kids';
const OUT = process.argv[4] ?? 'docs/proofs/vbuilder3-step5';
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1440,900',
  '--user-data-dir=/tmp/vb3-capture-profile', '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });

const writePipe = chrome.stdio[3];
const readPipe = chrome.stdio[4];

let nextId = 1;
const pending = new Map();
const evHandlers = [];
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
    } else if (obj.method) {
      for (const h of evHandlers) h(obj);
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
  // attach to a page target (flatten sessions)
  const { targetInfos } = await send('Target.getTargets');
  let target = targetInfos.find((t) => t.type === 'page');
  const { targetId } = target
    ? { targetId: target.targetId }
    : await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = sessionId;

  await send('Page.enable', {}, S);
  await send('Runtime.enable', {}, S);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);

  const goto = async (url) => {
    await send('Page.navigate', { url }, S);
    await sleep(1500);
  };
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, S);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
    return r.result.value;
  };
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, S);
    const path = `${OUT}/${name}.png`;
    writeFileSync(path, Buffer.from(data, 'base64'));
    console.log(`saved ${path}`);
  };
  const setTheme = async (t) => {
    await evalJs(`(() => { const r=document.documentElement; r.classList.remove('light','dark'); r.classList.add('${t}'); try{localStorage.setItem('theme','${t}')}catch{} })()`);
    await sleep(400);
  };

  // 1) dev-login (sets the session cookies in this browser), then the builder.
  await goto(`${BASE}/api/dev/login`);
  await goto(`${BASE}/verse/${SLUG}/build`);
  await sleep(4000); // first compile + iframe canvas load

  // dismiss the first-build tour
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/^skip$/i.test(x.textContent.trim())); if(b)b.click(); return !!b; })()`);
  await sleep(300);

  // ---- HERO / IDENTITY editor (step 5) ----
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.getAttribute('title')||'').includes('header & identity')); if(b)b.click(); return !!b; })()`);
  await sleep(700);
  await setTheme('light'); await shot('hero-editor-light');
  await setTheme('dark');  await shot('hero-editor-dark');
  await setTheme('light');

  // close the hero panel
  await evalJs(`(() => { const b=[...document.querySelectorAll('button[aria-label="Close panel"]')][0]; if(b)b.click(); return !!b; })()`);
  await sleep(500);

  // ---- MEMBERS editor (R-B): select the members block in the iframe, open the panel ----
  await evalJs(`(() => {
    const f=document.querySelector('iframe'); const d=f&&f.contentDocument; if(!d) return 'no-iframe';
    const el=d.querySelector('[data-block-type="members"]'); if(!el) return 'no-members';
    el.scrollIntoView({block:'center'});
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:f.contentWindow}));
    return 'clicked';
  })()`);
  await sleep(600);
  // open the block panel (Content tab is the default for a schema block)
  await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Style'&&!x.disabled); if(b)b.click(); return !!b; })()`);
  await sleep(1500); // roster fetch
  await setTheme('light'); await shot('members-editor-light');
  await setTheme('dark');  await shot('members-editor-dark');

  await send('Target.closeTarget', { targetId }).catch(() => {});
  chrome.kill();
  await sleep(200);
  console.log('DONE');
  process.exit(0);
}
main().catch((e) => { console.error('CAPTURE FAILED:', e.message); chrome.kill(); process.exit(1); });
