import { test, expect, type Page } from '@playwright/test';
import { finishOpening, go, TARGET } from './helpers/target';
import { record } from './helpers/results';
import { SCREENS } from './helpers/screens';

// Accessibility: targets of at least 44 px, visible focus, accessible names, reduced motion.
const A11Y_SCREENS = SCREENS.filter((s) => ['lobby', 'collection-binder', 'collection-grid', 'missions', 'ranking-friends', 'help', 'card-view'].includes(s.id));

async function audit(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden],[inert],[aria-hidden="true"]'); };
    const targets = Array.from(document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=tab]')).filter(vis);
    const small: string[] = [], noName: string[] = [];
    const label = (e: Element) => `${e.tagName.toLowerCase()}${(e as HTMLElement).id ? '#' + (e as HTMLElement).id : ''}.${String((e as HTMLElement).className).split(' ')[0] || ''}`;
    const hit = (e: Element) => {
      let r = e.getBoundingClientRect();
      let L = r.left, T = r.top, R = r.right, B = r.bottom;
      for (const ps of ['::before', '::after']) {
        const cs = getComputedStyle(e, ps);
        if (cs.content !== 'none' && cs.position === 'absolute') {
          const t = parseFloat(cs.top), l = parseFloat(cs.left), rr = parseFloat(cs.right), b = parseFloat(cs.bottom);
          if ([t, l, rr, b].every((v) => !Number.isNaN(v))) { L = Math.min(L, r.left + l); T = Math.min(T, r.top + t); R = Math.max(R, r.right - rr); B = Math.max(B, r.bottom - b); }
        }
      }
      const lab = e.closest('label'); if (lab) { const q = lab.getBoundingClientRect(); L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom); }
      return { w: R - L, h: B - T };
    };
    for (const e of targets) {
      if (e.closest('details.proto')) continue; // the prototype's own dev controls
      const r = hit(e);
      // a link inside running text or the footer line may be smaller (WCAG 2.5.8 inline exception)
      const inline = e.tagName === 'A' && !!e.closest('p, li, small, .foot, .credit');
      if (!inline && (r.w < 43.5 || r.h < 43.5)) small.push(`${label(e)} ${Math.round(r.w)}x${Math.round(r.h)} "${(e.textContent || '').trim().slice(0, 24)}"`);
      const el = e as HTMLInputElement;
      let name = e.getAttribute('aria-label') || '';
      if (!name) { const by = e.getAttribute('aria-labelledby'); if (by) name = by.split(' ').map((i) => document.getElementById(i)?.textContent || '').join(' '); }
      if (!name) name = (e.textContent || '').trim();
      if (!name && el.labels && el.labels.length) name = el.labels[0].textContent || '';
      if (!name) name = e.getAttribute('title') || e.getAttribute('placeholder') || (e.querySelector('img[alt]') as HTMLImageElement | null)?.alt || '';
      if (!name.trim()) noName.push(label(e));
    }
    return { count: targets.length, small, noName };
  });
}

async function focusAudit(page: Page, n = 30) {
  const bad: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body || e.closest('details.proto') || e.tagName.toLowerCase() === 'nextjs-portal') return null; // the Next dev overlay is not the app
      const snap = (x: Element | null) => { if (!x) return ''; const c = getComputedStyle(x); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderTopColor, c.backgroundColor, c.textDecorationLine, c.color].join('|'); };
      const owners = [e, e.parentElement, e.closest('label')];
      const on = owners.map(snap);
      const hasOutline = (() => { const c = getComputedStyle(e); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 && !e.matches('input') ; })();
      e.blur();
      const off = owners.map(snap);
      e.focus({ preventScroll: true });
      const changed = on.some((v, i) => v !== off[i]);
      return { ok: hasOutline || changed, who: `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0] || ''}` };
    });
    if (r && !r.ok) bad.push(r.who);
  }
  return [...new Set(bad)];
}

for (const vp of [{ w: 390, h: 664 }, { w: 1366, h: 657 }]) {
  for (const s of A11Y_SCREENS) {
    test(`a11y ${s.id} @ ${vp.w}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await go(page, s.app);
      if (s.steps) await s.steps(page, TARGET);
      await page.waitForSelector(s.ready);
      const a = await audit(page);
      const focus = s.id === 'card-view' ? [] : await focusAudit(page);
      record({ kind: 'a11y', screen: s.id, vp: `${vp.w}`, target: TARGET, targets: a.count, small: a.small.slice(0, 12), smallCount: a.small.length, noName: a.noName, noFocusRing: focus, pass: a.noName.length === 0 && focus.length === 0 && (vp.w > 500 || a.small.length === 0) });
      expect.soft(a.noName, 'interactive elements without an accessible name').toEqual([]);
      expect.soft(focus, 'focusable elements with no visible focus ring').toEqual([]);
      if (vp.w <= 500) expect.soft(a.small, 'targets under 44 px').toEqual([]);
    });
  }
}

test('reduced motion: no flips or flights, short fades only', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 657 });
  await go(page);
  await page.click('#open-btn');
  await page.waitForSelector('#opk');
  await page.click('#opk');
  await page.waitForTimeout(1500);
  const longMotion = await page.evaluate(() =>
    document.getAnimations().filter((a) => {
      const t = a.effect?.getTiming(); const d = Number(t?.duration || 0);
      const kf = (a.effect as KeyframeEffect | null)?.getKeyframes?.() || [];
      return d > 400 && kf.some((k) => 'transform' in k && k.transform && k.transform !== 'none') && (a.effect as KeyframeEffect).target?.closest?.('#ov');
    }).map((a) => ((a.effect as KeyframeEffect).target as HTMLElement).className),
  );
  await page.click('#ov-skip');
  await page.waitForSelector('#ov-add', { timeout: 20_000 });
  await page.click('#ov-add');
  await go(page, '/collection');
  await page.click('#f-view [data-v="grid"]');
  await page.click('#grid .card >> nth=0');
  await page.waitForSelector('#dt:not([hidden]) .d-flip');
  await page.click('.d-flip');
  await page.waitForTimeout(900);
  const flipT = await page.evaluate(() => getComputedStyle(document.querySelector('.d-flip')!).transform);
  record({ kind: 'reduced-motion', target: TARGET, longTransformAnimationsInOpening: longMotion, flipTransform: flipT, pass: longMotion.length === 0 && (flipT === 'none') });
  expect(longMotion, 'transform animations over 400 ms while reduced motion is on').toEqual([]);
  expect(flipT).toBe('none');
});
