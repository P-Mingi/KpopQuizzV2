import { test, expect } from '@playwright/test';
import { openApp } from './helpers/app';
import { openProto } from './helpers/proto';
import { openControls } from './helpers/screens';
import { record } from './helpers/results';

// Frames per second of the Full Art opening with the CPU slowed 4x (CDP Emulation.setCPUThrottlingRate), chromium only,
// on the prototype (reference) and on the app, at 390x664 and 1366x657. rAF deltas from the first tap on the pack to
// 3 s after the third card (the Full Art one) is turned.
const RATE = Number(process.env.KC_CPU || 4);
const MIN_FPS = 45;

for (const target of ['proto', 'app'] as const) {
  for (const vp of [{ w: 390, h: 664 }, { w: 1366, h: 657 }]) {
    test(`fps full art opening ${target} @ ${vp.w}x${vp.h}, CPU ${RATE}x slower`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'CDP throttling is chromium only');
      test.setTimeout(300_000);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      if (target === 'proto') await openProto(page, 'lobby'); else await openApp(page, '');
      await page.waitForSelector('#pack');
      await openControls(page);
      await page.click('#force-l');
      await page.evaluate(() => scrollTo(0, 0));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
      await page.click('#open-btn');
      await page.waitForSelector('#opk');
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        (window as any).__f = [] as number[];
        const loop = (t: number) => { (window as any).__f.push(t); (window as any).__run && requestAnimationFrame(loop); };
        (window as any).__run = true; requestAnimationFrame(loop);
      });
      await page.click('#opk');
      await page.waitForSelector('.pile', { timeout: 30_000 });
      await page.waitForTimeout(2800);
      for (let i = 0; i < 3; i++) { await page.click('.pile', { timeout: 15_000 }).catch(() => {}); await page.waitForTimeout(1400); }
      await page.waitForTimeout(3000);
      const frames: number[] = await page.evaluate(() => { (window as any).__run = false; return (window as any).__f; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const t = (i: number): number => frames[i] ?? 0;
      const last = t(frames.length - 1);
      const span = (last - t(0)) / 1000;
      const fps = (frames.length - 1) / span;
      let worst = Infinity;
      for (let i = 0; i < frames.length; i++) { let j = i; while (j < frames.length && t(j) - t(i) < 1000) j++; if (last - t(i) >= 1000) worst = Math.min(worst, j - i); }
      const deltas = frames.slice(1).map((x, i) => x - t(i)).sort((a, b) => a - b);
      const p95 = deltas[Math.floor(deltas.length * 0.95)] ?? 0;
      const row = { kind: 'fps', target, vp: `${vp.w}x${vp.h}`, cpu: RATE, seconds: +span.toFixed(1), fps: +fps.toFixed(1), worstSecondFrames: worst === Infinity ? null : worst, p95FrameMs: +p95.toFixed(1), pass: fps >= MIN_FPS };
      record(row);
      console.log(JSON.stringify(row));
      if (target === 'app') expect(fps, 'average fps').toBeGreaterThanOrEqual(MIN_FPS);
    });
  }
}
