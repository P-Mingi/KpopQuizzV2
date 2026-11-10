import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const [out, specFile] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));  // [{file, path, sel, w}]
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const byW = {};
for (const s of spec) (byW[s.w ?? 1280] ??= []).push(s);
for (const [w, list] of Object.entries(byW)) {
  const ctx = await b.newContext({ viewport: { width: Number(w), height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  for (const s of list) {
    const p = await ctx.newPage();
    try {
      await p.goto(`http://hub.localhost:3123${s.path}`, { waitUntil: 'networkidle', timeout: 120000 });
      const el = p.locator(s.sel).first();
      await el.scrollIntoViewIfNeeded({ timeout: 8000 });
      await el.screenshot({ path: `${out}/${s.file}`, animations: 'disabled', timeout: 8000 });
      console.log('ok', s.file);
    } catch (e) { console.log('FAIL', s.file, String(e).slice(0, 80)); }
    await p.close();
  }
  await ctx.close();
}
await b.close();
