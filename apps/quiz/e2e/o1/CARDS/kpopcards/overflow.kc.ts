import { test, expect, type Page } from '@playwright/test';
import { control, go, TARGET } from './helpers/target';
import { record } from './helpers/results';
import { SCREENS } from './helpers/screens';

// 1. No horizontal scroll and no clipped element from 360 to 1920 px, on every screen.
// 2. The opening scene fits the screen at 13 sizes.
const WIDTHS = [360, 375, 390, 412, 480, 600, 768, 820, 1024, 1180, 1280, 1366, 1440, 1536, 1680, 1920];
const PAGES = SCREENS.filter((s) => ['lobby', 'collection-binder', 'collection-grid', 'missions', 'ranking-friends', 'help'].includes(s.id));

export const OPENING_SIZES = [
  [320, 568], [360, 640], [375, 667], [390, 664], [390, 844], [430, 932], [768, 1024],
  [1024, 1366], [1024, 768], [1280, 600], [1366, 657], [1440, 860], [1920, 1080],
] as const;

/** Elements poking out of the viewport on the x axis that are not inside an intentional horizontal scroller. */
async function offenders(page: Page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const scrollsX = (el: Element | null) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth) return true;
        if (cs.overflowX === 'hidden' && e !== document.documentElement && e.getBoundingClientRect().width <= W + 1) return true; // clipped by a box that fits: decorative
      }
      return false;
    };
    const out: string[] = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') return;
      if ((r.right > W + 1 || r.left < -1) && !scrollsX(el.parentElement)) {
        const id = (el as HTMLElement).id ? '#' + (el as HTMLElement).id : '';
        out.push(`${el.tagName.toLowerCase()}${id}.${String((el as HTMLElement).className).split(' ').filter(Boolean).slice(0, 2).join('.')} [${Math.round(r.left)}..${Math.round(r.right)}] of ${W}`);
      }
    });
    return { scrollW: document.documentElement.scrollWidth, W, out: out.slice(0, 8) };
  });
}

for (const s of PAGES) {
  test(`overflow ${s.id}, 360 to 1920 px`, async ({ page }) => {
    const bad: string[] = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 800 });
      await go(page, s.app, {});
      if (s.steps) await s.steps(page, TARGET);
      await page.waitForSelector(s.ready);
      await page.waitForTimeout(300);
      const r = await offenders(page);
      if (r.scrollW > r.W) bad.push(`${w}px: horizontal scroll (scrollWidth ${r.scrollW} > ${r.W})`);
      for (const o of r.out) bad.push(`${w}px: ${o}`);
    }
    record({ kind: 'overflow', screen: s.id, target: TARGET, pass: bad.length === 0, bad: bad.slice(0, 20) });
    expect(bad, bad.join('\n')).toEqual([]);
  });
}

/** Everything of the opening scene that must stay inside the screen. */
async function fit(page: Page) {
  return page.evaluate(() => {
    const W = innerWidth, H = innerHeight, bad: string[] = [];
    const ov = document.getElementById('ov');
    if (!ov || ov.hidden) return ['opening not shown'];
    const check = (sel: string) => document.querySelectorAll(sel).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) bad.push(`${sel}[${i}] ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} on ${W}x${H}`);
    });
    ['.ov-top', '.ov-top button', '#opk', '.pile', '.pile .card', '.pulled', '.pulled .slot', '.fan .fc .card', '.ov-actions button', '.ov-hint'].forEach(check);
    if (document.documentElement.scrollWidth > W) bad.push('horizontal scroll ' + document.documentElement.scrollWidth);
    return bad;
  });
}

for (const [w, h] of OPENING_SIZES) {
  test(`the opening scene fits the screen at ${w}x${h}`, async ({ page }) => {
    const bad: string[] = [];
    await page.setViewportSize({ width: w, height: h });
    await go(page);
    await control(page, 'force-l');
    await page.click('#open-btn');
    await page.waitForSelector('#opk');
    await page.waitForTimeout(700);
    for (const f of await fit(page)) bad.push(`pack: ${f}`);
    await page.click('#opk');
    await page.waitForSelector('.pile', { timeout: 15_000 });
    await page.waitForTimeout(2600);
    for (const f of await fit(page)) bad.push(`first card: ${f}`);
    await page.click('#ov-skip');
    await page.waitForSelector('#ov-add', { timeout: 20_000 });
    await page.waitForTimeout(3200);
    for (const f of await fit(page)) bad.push(`summary: ${f}`);
    record({ kind: 'opening-fit', name: `${w}x${h}`, screen: 'open', vp: `${w}x${h}`, target: TARGET, pass: bad.length === 0, bad: bad.slice(0, 10) });
    expect(bad, bad.join('\n')).toEqual([]);
  });
}
