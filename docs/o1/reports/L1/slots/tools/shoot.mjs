// usage: node shoot.mjs <outdir> <pageIds comma> [widths]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const ids = (process.argv[3] ?? '').split(',').filter(Boolean);
const widths = (process.argv[4] ?? '1280,375').split(',').map(Number);
const PAGES = {
  home: '/', daily: '/daily', kpopdle: '/kpopdle', 'kpopdle-group': '/kpopdle/group', 'kpopdle-song': '/kpopdle/song',
  otakudle: '/otakudle', 'otakudle-op': '/otakudle/one-piece', 'otakudle-db': '/otakudle/dragon-ball',
};
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const sums = {};
for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: w > 600 ? 900 : 812 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  for (const id of ids) {
    const p = await ctx.newPage();
    const url = `http://hub.localhost:3123${PAGES[id]}`;
    try {
      const res = await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
      await p.waitForTimeout(600);
      const file = `${out}/${id}-${w}.png`;
      await p.screenshot({ path: file, fullPage: true, animations: 'disabled' });
      const html = await p.content(); fs.writeFileSync(`${out}/${id}-${w}.html`, html);
      sums[`${id}-${w}`] = { status: res?.status(), png: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12),
        slots: [...html.matchAll(/data-slot-icon="([^"]+)" data-slot-mode="([^"]+)"/g)].map((m) => `${m[1]}:${m[2]}`) };
    } catch (e) { sums[`${id}-${w}`] = { error: String(e).slice(0, 120) }; }
    await p.close();
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/sums.json`, JSON.stringify(sums, null, 1));
console.log(JSON.stringify(sums));
