import { createRequire } from 'node:module';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-measure/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const urls = ['https://kpopquiz.org/', 'https://kpopquiz.org/q/are-you-a-real-coer', 'https://kpopquiz.org/blindtest'];
const out = [];
const browser = await chromium.launch();
for (const theme of ['dark', 'none']) {
  for (const url of urls) {
    const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; kpq-o1-measure-check)', viewport: { width: 1280, height: 800 } });
    await ctx.route('**/_vercel/insights/**', (r) => r.abort());
    await ctx.route('**/_vercel/speed-insights/**', (r) => r.abort());
    const page = await ctx.newPage();
    const log = [];
    page.on('console', (m) => log.push(`console.${m.type()}: ${m.text().slice(0, 300)}`));
    page.on('pageerror', (e) => log.push(`pageerror: ${String(e).slice(0, 300)}`));
    await page.addInitScript((theme) => {
      if (theme !== 'none') { try { localStorage.setItem('theme', theme); } catch {} }
      window.__cls = [];
      new MutationObserver((recs) => { for (const r of recs) if (r.target === document.documentElement) window.__cls.push(`${Math.round(performance.now())}ms:${(r.oldValue||'').split(' ').slice(-2).join(' ')} -> ${document.documentElement.className.split(' ').slice(-2).join(' ')}`); })
        .observe(document, { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['class'] });
    }, theme);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const s = [...document.querySelectorAll('script')].find((x) => x.textContent.includes("localStorage.getItem('theme')"));
      return {
        classChanges: window.__cls,
        finalClass: document.documentElement.className,
        themeScriptParent: s ? s.parentElement.tagName : null,
        hydrationAttr: document.documentElement.hasAttribute('data-reactroot'),
      };
    });
    out.push({ url, theme, info, log });
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
