import { test, expect } from '@playwright/test';
import { go, TARGET } from './helpers/target';
import { record } from './helpers/results';

// The flip in the card view, run per engine (KC_PROJECT=chromium|firefox|webkit): each face switches visibility at the middle of
// the flip, so at no moment are both faces visible (the back never shows through the front) and, once past the middle, only the back.
test('card view flip: the back never shows through the front', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await go(page, '/collection');
  await page.click('#f-view [data-v="grid"]');
  await page.click('#grid .card >> nth=0');
  await page.waitForSelector('#dt:not([hidden]) .d-flip');
  await page.waitForTimeout(600);
  const raw = await page.evaluate(async () => {
    const flip = document.querySelector('.d-flip') as HTMLElement;
    const fr = flip.querySelector('.fr') as HTMLElement, bk = flip.querySelector('.bk') as HTMLElement;
    const samples: { t: number; fr: string; bk: string; cls: boolean }[] = [];
    const t0 = performance.now();
    flip.click();
    await new Promise<void>((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        samples.push({ t: Math.round(t), fr: getComputedStyle(fr).visibility, bk: getComputedStyle(bk).visibility, cls: flip.classList.contains('flipped') });
        if (t < 1300) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    const both = samples.filter((s) => s.fr === 'visible' && s.bk === 'visible');
    const firstBack = samples.find((s) => s.bk === 'visible');
    const lastFront = [...samples].reverse().find((s) => s.fr === 'visible');
    const backface = [getComputedStyle(fr).backfaceVisibility || (getComputedStyle(fr) as any).webkitBackfaceVisibility, getComputedStyle(bk).backfaceVisibility || (getComputedStyle(bk) as any).webkitBackfaceVisibility];
    return { n: samples.length, both: both.length, firstBack: firstBack?.t ?? null, lastFront: lastFront?.t ?? null, final: samples[samples.length - 1], backface };
  });
  const final = raw.final ?? { t: 0, fr: '', bk: '', cls: false };
  const result = { ...raw, final };
  record({ kind: 'flip', engine: browserName, target: TARGET, ...result, pass: result.both === 0 && result.final.bk === 'visible' && result.final.fr === 'hidden' });
  expect(result.both, 'frames where both faces were visible').toBe(0);
  expect(result.final.bk).toBe('visible');
  expect(result.final.fr).toBe('hidden');
  expect(result.firstBack, 'the back appears at the middle of the flip (about 400 ms)').toBeGreaterThan(250);
  expect(result.backface.join(',')).toContain('hidden');
});
