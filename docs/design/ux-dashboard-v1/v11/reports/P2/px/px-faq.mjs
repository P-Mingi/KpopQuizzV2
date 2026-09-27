// FAQ accordion: prototype #hub "Questions fans ask" vs /quizzes FAQ (styles + summary / answer boxes).
import { chromium } from '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/node_modules/@playwright/test/index.mjs';
const PROTO = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/prototype.html';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const P = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'min-height', 'gap', 'border-top-width', 'border-top-color', 'border-bottom-width', 'border-bottom-color', 'max-width', 'display', 'justify-content', 'align-items'];
const b = await chromium.launch({ executablePath: EXEC });
for (const w of [1440, 390]) for (const theme of ['light', 'dark']) {
  const vp = { viewport: { width: w, height: w < 500 ? 844 : 900 }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500, reducedMotion: 'reduce' };
  const pc = await b.newContext(vp); const pp = await pc.newPage();
  await pp.goto('file://' + PROTO); await pp.waitForTimeout(400);
  await pp.evaluate(() => { document.body.classList.remove('guest'); closeAll(); openHub('BLACKPINK'); }); await pp.waitForTimeout(500);
  const ic = await b.newContext(vp);
  await ic.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  await ic.route('**/*', (r) => (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : r.fulfill({ status: 204, body: '' })));
  const ip = await ic.newPage(); await ip.goto('http://localhost:3032/quizzes', { timeout: 180000 });
  await ip.locator('.p2-ctl[data-ready]').waitFor({ timeout: 90000 });
  const grab = (page, sels) => page.evaluate(({ sels, P }) => Object.fromEntries(Object.entries(sels).map(([k, s]) => {
    const e = document.querySelector(s); if (!e) return [k, null]; const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return [k, { w: +r.width.toFixed(1), h: +r.height.toFixed(1), s: Object.fromEntries(P.map((p) => [p, c.getPropertyValue(p)])) }];
  })), { sels, P });
  const pr = await grab(pp, { h2: '#hub h2.h2[style*="56px"]', acc: '#hb-faq .acc', acc2: '#hb-faq .acc + .acc', sum: '#hb-faq .acc summary', ico: '#hb-faq .acc summary .ico', ab: '#hb-faq .acc .ab' });
  const im = await grab(ip, { h2: '.p2-faq h2', acc: '.p2-acc', acc2: '.p2-acc + .p2-acc', sum: '.p2-acc summary', ico: '.p2-acc summary .ux-ico', ab: '.p2-acc-a' });
  console.log(`== ${w} ${theme}`);
  for (const k of Object.keys(pr)) {
    if (!pr[k] || !im[k]) { console.log(k, 'missing', !!pr[k], !!im[k]); continue; }
    const d = P.filter((p) => pr[k].s[p] !== im[k].s[p]).map((p) => `${p}: ${pr[k].s[p]} -> ${im[k].s[p]}`);
    console.log(k, `proto ${pr[k].w}x${pr[k].h} impl ${im[k].w}x${im[k].h}`, d.join(' | '));
  }
  await pc.close(); await ic.close();
}
await b.close();
