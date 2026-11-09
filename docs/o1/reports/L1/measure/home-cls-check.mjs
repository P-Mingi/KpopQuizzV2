import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-measure/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const extraCss = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : '';
const EMU = Boolean(process.argv[2]);
const tag = process.argv[3] || 'before';
const today = new Date().toISOString().slice(0, 10);
const me = { id: 'x', profile: { username: 'mingi', display_name: 'Mingi', avatar_url: null, avatar_bg: '#eee', avatar_text: '#000', xp: 10, level: 1, progress: 0.2, daily_streak: 3, last_daily_date: today } };
const cont = [{ quizId: 'q1', slug: 'are-you-a-real-coer', title: 'Are you a real coer', groupName: 'X', groupSlug: 'blackpink', quizType: 'multiple_choice', difficulty: 'easy', total: 10, answered: 4, savedAt: Date.now(), run: { questionIndex: 4, score: 3, answers: [], questions: [], settings: {}, quizType: 'multiple_choice', clueResults: [], elapsedMs: 1 }, perQuestionTimes: [], relaxed: false }];
const browser = await chromium.launch();
const res = [];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const mode of ['guest', 'member', 'member+continue']) {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; kpq-o1-measure-check)', viewport: { width: w, height: h } });
    await ctx.route('**/_vercel/**', (r) => r.abort());
    if (mode !== 'guest') {
      await ctx.addCookies([{ name: 'sb-test-auth-token', value: 'x', url: 'https://kpopquiz.org/' }]);
      await ctx.route('**/api/auth/me', async (r) => { await new Promise((s) => setTimeout(s, 700)); r.fulfill({ json: me }); });
    }
    const page = await ctx.newPage();
    await page.addInitScript((emu) => { window.__emulate = emu; }, EMU ? extraCss : '');
    await page.addInitScript((c) => {
      if (c) localStorage.setItem('ux:continue:v1', JSON.stringify(c));
      window.__ls = [];
      if (window.__emulate) {
        const css = window.__emulate;
        let ctaHtml = null;
        new MutationObserver(() => {
          if (document.head && !document.getElementById('emu-css')) { const st = document.createElement('style'); st.id = 'emu-css'; st.textContent = css; document.head.appendChild(st); }
          const cont = document.querySelector('section[aria-labelledby="p1-cont-h"]');
          const grp = document.querySelector('section[aria-labelledby="p1-groups-h"]');
          
          const qt = document.querySelector('.p1-qtop');
          if (qt && !qt.hasAttribute('data-replay')) qt.setAttribute('data-replay', '1');
          const guest = document.querySelector('.p1-hhead[data-auth="out"] .p1-hcta');
          if (guest && !ctaHtml) ctaHtml = guest.cloneNode(true);
          const mem = document.querySelector('.p1-hhead[data-auth="in"]');
          if (mem && ctaHtml && !mem.querySelector('.p1-hcta')) { const c = ctaHtml.cloneNode(true); c.style.visibility = 'hidden'; c.setAttribute('aria-hidden', 'true'); mem.appendChild(c); }
        }).observe(document, { childList: true, subtree: true });
      }
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ v: e.value, t: Math.round(e.startTime), hadInput: e.hadRecentInput, src: (e.sources || []).map((s) => (s.node && (s.node.className || s.node.nodeName)) + '').map((x) => String(x).slice(0, 40)) }); }).observe({ type: 'layout-shift', buffered: true });
    }, mode === 'member+continue' ? cont : null);
    await page.goto('https://kpopquiz.org/', { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const r = await page.evaluate(() => {
      const hh = document.querySelector('.p1-hhead');
      const rc = hh?.getBoundingClientRect();
      const ls = window.__ls.filter((e) => !e.hadInput);
      return { headH: rc ? Math.round(rc.height) : null, auth: hh?.getAttribute('data-auth'), cls: +ls.reduce((a, e) => a + e.v, 0).toFixed(4), shifts: ls.filter((e) => e.v > 0.001) };
    });
    res.push({ tag, w, mode, ...r });
    if (tag.endsWith('shot') ) await page.screenshot({ path: `home-${tag}-${w}-${mode}.png` });
    await ctx.close();
  }
}
await browser.close();
for (const r of res) console.log(JSON.stringify(r));
