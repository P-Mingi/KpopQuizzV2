import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const [out, ids, w] = [process.argv[2], process.argv[3].split(','), Number(process.argv[4] ?? 1280)];
const PAGES = { home: '/', daily: '/daily', kpopdle: '/kpopdle', otakudle: '/otakudle', 'otakudle-op': '/otakudle/one-piece', 'otakudle-db': '/otakudle/dragon-ball' };
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
await ctx.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
const res = {};
for (const id of ids) {
  const p = await ctx.newPage();
  await p.goto(`http://hub.localhost:3123${PAGES[id]}`, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForTimeout(500);
  res[id] = await p.evaluate(() => ({
    imgs: [...document.querySelectorAll('img')].map((i) => (i.getAttribute('src') ?? '').replace(/^.*fixture\//, '')).filter((s) => /\.webp$/.test(s)),
    icons: [...document.querySelectorAll('[data-slot-icon]')].map((e) => `${e.getAttribute('data-slot-icon')}:${e.getAttribute('data-slot-mode')}`),
    banner: document.querySelector('.hub-dle-banner img')?.getAttribute('src')?.replace(/^.*fixture\//, '') ?? null,
  }));
  if (process.argv[5]) await p.screenshot({ path: `${out}/${id}-${w}.png`, fullPage: true, animations: 'disabled' });
  await p.close();
}
await b.close();
fs.writeFileSync(`${out}/verify-${w}.json`, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k, 'banner=', v.banner, '\n  imgs=', [...new Set(v.imgs.map((s) => s.replace(/-\d+\.webp$/, '')))].join(' '), '\n  icons=', v.icons.join(' '));
