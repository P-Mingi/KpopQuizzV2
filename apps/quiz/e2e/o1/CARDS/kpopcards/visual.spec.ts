import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { BOX_TOLERANCE, IMG_DIR, MAX_DIFF_RATIO, VIEWPORTS } from './helpers/env';
import { compareBoxes, diffPngs, measure } from './helpers/diff';
import { injectMask, MASK_DESCRIPTION } from './helpers/freeze';
import { openProto } from './helpers/proto';
import { openApp, warmUp } from './helpers/app';
import { record } from './helpers/results';
import { SCREENS } from './helpers/screens';

// Visual comparison: every screen of the v6 prototype against the app, same seed, same frozen clock, three viewports.
// Filter with KC_SCREENS=lobby,help and KC_VPS=390x664.
const only = (process.env.KC_SCREENS || '').split(',').filter(Boolean);
const onlyVp = (process.env.KC_VPS || '').split(',').filter(Boolean);

test.beforeAll(async ({ playwright }) => {
  test.setTimeout(600_000);
  if (!process.env.KC_SELF) await warmUp(await playwright.request.newContext());
});

for (const vp of VIEWPORTS) {
  if (onlyVp.length && !onlyVp.includes(vp.name)) continue;
  for (const s of SCREENS) {
    if (only.length && !only.includes(s.id)) continue;
    test(`visual ${s.id} @ ${vp.name}`, async ({ browser }) => {
      const dir = path.join(IMG_DIR, s.id);
      fs.mkdirSync(dir, { recursive: true });
      const ctxOpts = { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, timezoneId: 'Europe/Paris', locale: 'en-GB' };

      const pctx = await browser.newContext(ctxOpts);
      const proto = await pctx.newPage();
      await openProto(proto, s.hash);
      if (s.steps) await s.steps(proto, 'proto');
      await proto.waitForSelector(s.ready);
      await injectMask(proto);
      await proto.waitForTimeout(s.settle ?? 400);
      const protoBoxes = await measure(proto, s.boxes);
      const protoPng = await proto.screenshot({ fullPage: !!s.full, animations: 'disabled', caret: 'hide' });
      fs.writeFileSync(path.join(dir, `${vp.name}-proto.png`), protoPng);
      await pctx.close();

      const actx = await browser.newContext(ctxOpts);
      const app = await actx.newPage();
      const row: Record<string, unknown> = { kind: 'visual', screen: s.id, vp: vp.name, mask: MASK_DESCRIPTION };
      try {
        if (process.env.KC_SELF) await openProto(app, s.hash); // harness self-check: the prototype against itself
        else await openApp(app, s.app, { state: s.needs });
        if (s.steps) await s.steps(app, process.env.KC_SELF ? 'proto' : 'app');
        await app.waitForSelector(s.ready, { timeout: 45_000 });
        await injectMask(app);
        await app.waitForTimeout(s.settle ?? 400);
        const appBoxes = await measure(app, s.boxes);
        const appPng = await app.screenshot({ fullPage: !!s.full, animations: 'disabled', caret: 'hide' });
        fs.writeFileSync(path.join(dir, `${vp.name}-app.png`), appPng);
        const d = await diffPngs(browser, protoPng, appPng);
        fs.writeFileSync(path.join(dir, `${vp.name}-diff.png`), d.diffPng);
        const boxes = compareBoxes(protoBoxes, appBoxes);
        const bad = boxes.filter((b) => b.off > BOX_TOLERANCE);
        Object.assign(row, { diffPct: +(d.ratio * 100).toFixed(3), sizeProto: d.sizeA, sizeApp: d.sizeB, boxesChecked: boxes.length, boxesOff: bad, pass: d.ratio <= MAX_DIFF_RATIO && bad.length === 0 });
        record(row);
        expect.soft(d.ratio, `${s.id}@${vp.name} pixels different`).toBeLessThanOrEqual(MAX_DIFF_RATIO);
        expect.soft(bad.length, `${s.id}@${vp.name} boxes off by more than ${BOX_TOLERANCE}px`).toBe(0);
      } catch (e) {
        Object.assign(row, { pass: false, error: String((e as Error).message).split('\n')[0].slice(0, 240) });
        record(row);
        throw e;
      } finally {
        await actx.close();
      }
    });
  }
}
