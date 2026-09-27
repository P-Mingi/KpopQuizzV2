// Menu placement: prototype ddOpen vs /quizzes UxDropdown menus (x, y, w relative to the trigger).
import { chromium } from '/Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz/node_modules/@playwright/test/index.mjs';
const PROTO = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/prototype.html';
const EXEC = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const url = process.argv[2] ?? 'http://localhost:3032/quizzes';
const b = await chromium.launch({ executablePath: EXEC });
const r1 = (a) => a.map((x) => Math.round(x * 10) / 10);
for (const w of [1440, 390]) {
  const vp = { viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, reducedMotion: 'reduce' };
  const pc = await b.newContext(vp); const pp = await pc.newPage();
  await pp.goto('file://' + PROTO); await pp.waitForTimeout(400);
  await pp.evaluate(() => { document.body.classList.remove('guest'); closeAll(); go('quizzes'); }); await pp.waitForTimeout(400);
  const c = await b.newContext(vp);
  await c.route('**/*', (r) => (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : r.fulfill({ status: 204, body: '' })));
  const p = await c.newPage(); await p.goto(url, { timeout: 180000 });
  await p.locator('.p2-ctl[data-ready]').waitFor({ timeout: 90000 });
  for (const [i, f] of ['type', 'level', 'group'].entries()) {
    await pp.evaluate((i) => { closeAll(); document.querySelectorAll('#quizzes .dd')[i].click(); }, i); await pp.waitForTimeout(300);
    const pr = await pp.evaluate(() => { const e = document.getElementById('ddpop'); const b = e.getBoundingClientRect(); return [b.x, b.y + scrollY, b.width, b.height]; });
    const pt = await pp.evaluate((i) => { const b = document.querySelectorAll('#quizzes .dd')[i].getBoundingClientRect(); return [b.x, b.bottom + scrollY]; }, i);
    await p.locator(`.p2-dd-${f}`).click();
    const m = p.locator(`.p2-dd-${f} + .ux-pop`); await m.waitFor(); await p.waitForTimeout(300);
    const ir = await m.evaluate((e) => { const b = e.getBoundingClientRect(); return [b.x, b.y + scrollY, b.width, b.height]; });
    const it = await p.locator(`.p2-dd-${f}`).evaluate((e) => { const b = e.getBoundingClientRect(); return [b.x, b.bottom + scrollY]; });
    console.log(w, f, 'proto menu x,dy,w', r1([pr[0], pr[1] - pt[1], pr[2]]), 'trigger x', r1([pt[0]]), '| impl menu x,dy,w', r1([ir[0], ir[1] - it[1], ir[2]]), 'trigger x', r1([it[0]]));
    await p.keyboard.press('Escape');
  }
  await pc.close(); await c.close();
}
await b.close();
