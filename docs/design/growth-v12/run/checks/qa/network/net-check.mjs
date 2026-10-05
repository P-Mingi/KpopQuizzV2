import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const exe = process.env.UX11_CHROMIUM;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const sites = { 'feat/v12': 'http://localhost:3073', 'origin/main': 'http://localhost:3074' };
const res = {};
for (const [name, base] of Object.entries(sites)) {
  for (const path of ['/blindtest', '/pt/blindtest']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const reqs = []; const blocked = [];
    await page.route('**/*', (route) => {
      const r = route.request();
      if (r.method() !== 'GET' && r.method() !== 'HEAD') { blocked.push(`${r.method()} ${r.url()}`); return route.fulfill({ status: 204, body: '' }); }
      if (!r.url().startsWith(base)) { reqs.push(`EXT ${r.method()} ${new URL(r.url()).host}`); return route.continue(); }
      return route.continue();
    });
    page.on('request', (r) => { if (r.url().startsWith(base)) reqs.push(`${r.method()} ${r.url().slice(base.length)}`); });
    await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => reqs.push('GOTO-ERR ' + e.message.split('\n')[0]));
    await page.waitForTimeout(4000);
    const btn = page.getByRole('button', { name: /play|start|jogar|come/i }).first();
    let clicked = false;
    if (await btn.count()) { await btn.click({ timeout: 5000 }).then(() => { clicked = true; }).catch(() => {}); await page.waitForTimeout(6000); }
    res[`${name} ${path}`] = { clicked, reqs, blocked };
    await ctx.close();
  }
}
await browser.close();
const norm = (u) => u.replace(/\/_next\/static\/chunks\/[^?]+/, '/_next/static/chunks/<chunk>').replace(/\/_next\/static\/media\/[^?]+/, '/_next/static/media/<file>').replace(/\/_next\/image\?url=[^&]+/, '/_next/image?url=<img>').replace(/[?&](_rsc|dpl)=[^&]+/g, '');
const out = [];
for (const path of ['/blindtest', '/pt/blindtest']) {
  const a = res[`feat/v12 ${path}`], b = res[`origin/main ${path}`];
  const count = (l) => l.reduce((m, x) => (m[norm(x)] = (m[norm(x)] || 0) + 1, m), {});
  const ca = count(a.reqs), cb = count(b.reqs);
  const keys = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].sort();
  out.push(`## ${path}`, `played: feat/v12 ${a.clicked}, origin/main ${b.clicked}`, `requests: feat/v12 ${a.reqs.length}, origin/main ${b.reqs.length}`,
    `non-GET requests: feat/v12 ${a.blocked.length}, origin/main ${b.blocked.length}`, ...a.blocked.map((x) => `  feat/v12 ${x}`), ...b.blocked.map((x) => `  origin/main ${x}`),
    `requests to /api/track: feat/v12 ${a.reqs.filter((x) => x.includes('/api/track')).length}, origin/main ${b.reqs.filter((x) => x.includes('/api/track')).length}`,
    'differences (normalized request, feat/v12 count, origin/main count):');
  for (const k of keys) if ((ca[k] || 0) !== (cb[k] || 0)) out.push(`  ${k} | ${ca[k] || 0} | ${cb[k] || 0}`);
  out.push('');
}
fs.writeFileSync(process.argv[2], out.join('\n'));
console.log(out.join('\n'));
