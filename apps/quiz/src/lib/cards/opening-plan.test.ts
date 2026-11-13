// KpopCards (agent C): the pure plan of the opening, against the numbers of the v6 prototype.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EDITION_OF, FADE_MS, MAX_PARTICLES, MULTI, NOTES, OPENING_CHROME, REVEAL, STAMP_MS, SPOTLIGHT_MS, VIBE, boomTones, canSound, canVibrate, flipMs, flipTicks, humSpec, labelAfterMs,
  multiColumns, multiDelays, multiDoneAfter, multiFlipAfter, multiOrder, openingSizes, pileScreenHeight, revealPlan, revealVibe, spotlightHoldMs, stingTones, summaryPlan, waitMs, warnLevel,
} from './opening-plan';
import { RARITIES } from './rules';

import type { Rarity } from './types';

const css = readFileSync(resolve(__dirname, '../../styles/cards/cards-opening.css'), 'utf8');

describe('timings per edition (the prototype wins)', () => {
  it('wait and flip in ms: Standard 0/520, Stage 0/600, Holo 0/700, Era 450/800, Gold 800/1050, Full Art 1100/1300', () => {
    const t = (e: keyof typeof REVEAL): [number, number] => [REVEAL[e].wait, REVEAL[e].flip];
    expect(t('std')).toEqual([0, 520]);
    expect(t('stage')).toEqual([0, 600]);
    expect(t('holo')).toEqual([0, 700]);
    expect(t('era')).toEqual([450, 800]);
    expect(t('gold')).toEqual([800, 1050]);
    expect(t('full')).toEqual([1100, 1300]);
  });
  it('maps every rarity to its edition and the order never shortens as the rarity rises', () => {
    expect(RARITIES.map((r) => EDITION_OF[r])).toEqual(['std', 'stage', 'holo', 'era', 'gold', 'full']);
    const flips = RARITIES.map((r) => flipMs(r, false));
    expect([...flips].sort((a, b) => a - b)).toEqual(flips);
  });
  it('the label comes 55 % of the flip plus 45 % of the label weight after the flip starts', () => {
    expect(labelAfterMs('C', false)).toBe(Math.round(520 * 0.55 + 240 * 0.45));
    expect(labelAfterMs('L', false)).toBe(Math.round(1300 * 0.55 + 900 * 0.45));
  });
  it('reduced motion: no flip (a fade of 200 ms by CSS), the label after 200 ms, the wait is kept as a still pause, never zero animation', () => {
    expect(FADE_MS).toBe(200);
    for (const r of RARITIES) { expect(flipMs(r, true)).toBe(0); expect(labelAfterMs(r, true)).toBe(200); }
    expect(waitMs('L')).toBe(1100);
  });
});

describe('the reveal plan of each rarity', () => {
  const plan = (r: Rarity, o = {}) => revealPlan(r, o);
  it('Standard to Holo do not charge and have no stage', () => {
    for (const r of ['C', 'U', 'R'] as const) { const p = plan(r); expect(p.charge).toBe(false); expect(p.stageOnCharge).toBe(false); expect(p.bang).toBe(false); expect(p.vibrate).toBeNull(); }
  });
  it('Era charges (450 ms), has a sweep and a buzz, but no stage', () => {
    const p = plan('SR');
    expect(p.charge).toBe(true); expect(p.chargeHint).toBe('better'); expect(p.stageOnCharge).toBe(false); expect(p.vibrate).toEqual(VIBE.high);
  });
  it('Gold: dark stage while it charges, golden rings (bang), rain, a hum, no stamp, no boom', () => {
    const p = plan('UR');
    expect(p.stageOnCharge).toBe(true); expect(p.bang).toBe(true); expect(p.stamp).toBe(false); expect(p.boom).toBe(false); expect(p.legend).toBe(false);
    expect(p.hum).toBe(1100); expect(p.rain?.n).toBe(60); expect(p.confetti).toBeNull();
  });
  it('Full Art: stage, hum, stamp, boom, the card pops, a long buzz, confetti and a second burst 180 ms later', () => {
    const p = plan('L');
    expect(p.chargeHint).toBe('full'); expect(p.stamp).toBe(true); expect(p.boom).toBe(true); expect(p.legend).toBe(true);
    expect(p.hum).toBe(1400); expect(p.vibrate).toEqual(VIBE.full);
    expect(p.confetti?.shape).toBe('confetti'); expect(p.afterBurst?.delay).toBe(180); expect(p.rain?.n).toBe(90);
  });
  it('burst sizes grow with the rarity (18, 30, 60, 80, 120 particles)', () => {
    expect(RARITIES.map((r) => plan(r).burst?.n ?? 0)).toEqual([0, 18, 30, 60, 80, 120]);
  });
  it('a jumped animation (a tap) keeps the stage but drops the wait of the label, the burst and the confetti, and halves the rain', () => {
    const p = plan('L', { fast: true });
    expect(p.labelAt).toBe(0); expect(p.burst).toBeNull(); expect(p.confetti).toBeNull(); expect(p.afterBurst).toBeNull(); expect(p.rain?.n).toBe(50); expect(p.stamp).toBe(true);
    expect(plan('UR', { fast: true }).rain?.n).toBe(30);
  });
  it('the sting has one more note per rarity, and the shimmer from Gold', () => {
    expect(stingTones(0)).toHaveLength(1);
    for (let ri = 1; ri <= 3; ri++) expect(stingTones(ri)).toHaveLength(ri + 1);
    expect(stingTones(4)).toHaveLength(5 + 6);
    expect(stingTones(5)).toHaveLength(6 + 6);
    expect(stingTones(5).slice(0, 6).map((t) => t.freq)).toEqual([...NOTES]);
    expect(stingTones(3).every((t) => t.freq < 2000)).toBe(true);
    expect(stingTones(4).filter((t) => t.freq > 2000)).toHaveLength(6);
  });
  it('the notes rise, the last one is the longest', () => {
    const s = stingTones(5).slice(0, 6);
    expect(s.map((t) => t.freq)).toEqual([...s.map((t) => t.freq)].sort((a, b) => a - b));
    expect(s[5]!.dur).toBeGreaterThan(s[0]!.dur);
  });
  it('the flip tick, the boom and the hum', () => {
    expect(flipTicks()).toHaveLength(2);
    expect(boomTones().map((t) => t.freq)).toEqual([70, 140]);
    expect(humSpec(1400)).toEqual({ from: 110, to: 880, sec: 1.4, peak: 0.05 });
  });
  it('vibration: nothing below Era, a short pattern for Era and Gold, a long one for Full Art', () => {
    expect([0, 1, 2].map((ri) => revealVibe(ri))).toEqual([null, null, null]);
    expect(revealVibe(3)).toEqual(VIBE.high); expect(revealVibe(4)).toEqual(VIBE.high); expect(revealVibe(5)).toEqual(VIBE.full);
  });
});

describe('nothing before a gesture, two separate switches', () => {
  it('sound needs its switch and a gesture; vibration needs its own switch and a gesture', () => {
    expect(canSound({ sound: true, haptics: true, gesture: false })).toBe(false);
    expect(canVibrate({ sound: true, haptics: true, gesture: false })).toBe(false);
    expect(canSound({ sound: true, haptics: false, gesture: true })).toBe(true);
    expect(canVibrate({ sound: true, haptics: false, gesture: true })).toBe(false);
    expect(canSound({ sound: false, haptics: true, gesture: true })).toBe(false);
    expect(canVibrate({ sound: false, haptics: true, gesture: true })).toBe(true);
  });
});

describe('the spotlight and the summary', () => {
  it('600 ms, longer when the stage rises, 900 under reduced motion', () => {
    expect(SPOTLIGHT_MS).toBe(600);
    expect(spotlightHoldMs('R', false)).toBe(600);
    expect(spotlightHoldMs('UR', false)).toBe(1400);
    expect(spotlightHoldMs('L', false)).toBe(1400);
    expect(spotlightHoldMs('L', true)).toBe(900);
  });
  it('a Gold or Full Art best card raises the stage and rains; a Full Art booms', () => {
    expect(summaryPlan('R', { spot: true, multi: false, reduced: false }).stage).toBe(false);
    const g = summaryPlan('UR', { spot: true, multi: false, reduced: false });
    expect(g.stage).toBe(true); expect(g.boom).toBe(false); expect(g.rain?.n).toBe(60);
    const f = summaryPlan('L', { spot: true, multi: false, reduced: false });
    expect(f.boom).toBe(true); expect(f.rain?.n).toBe(140);
    expect(summaryPlan('L', { spot: true, multi: true, reduced: false }).rain?.n).toBe(90);
    expect(summaryPlan('L', { spot: true, multi: true, reduced: true }).stageOffMs).toBe(400);
  });
  it('the warning at the pack is for a Gold or a Full Art only', () => {
    expect(['C', 'U', 'R', 'SR'].map((r) => warnLevel(r as Rarity))).toEqual([null, null, null, null]);
    expect(warnLevel('UR')).toBe('UR'); expect(warnLevel('L')).toBe('L');
  });
  it('the stamp stays 2.4 s, in the plan and in the style sheet, and sits at top -7%', () => {
    expect(STAMP_MS).toBe(2400);
    expect(css).toMatch(/\.stamp \{[^}]*top: -7%/);
    expect(css).toMatch(/kco-stampout \.5s ease 2\.4s forwards/);
  });
});

describe('Open 5', () => {
  const rows = [
    { rarity: 'C' as Rarity, isNew: false }, { rarity: 'L' as Rarity, isNew: false }, { rarity: 'R' as Rarity, isNew: true }, { rarity: 'R' as Rarity, isNew: false }, { rarity: 'UR' as Rarity, isNew: true },
  ];
  it('orders the cards best first, new before copy, then draw order', () => {
    expect(multiOrder(rows).map((o) => o.i)).toEqual([1, 4, 2, 3, 0]);
  });
  it('the best card turns last, a Gold or better waits 260 ms more, the deal staggers by 26 ms', () => {
    expect(multiDelays(0, 25, 'L')).toEqual({ d: 0, fd: 24 * 45 + 260 });
    expect(multiDelays(24, 25, 'C')).toEqual({ d: 24 * 26, fd: 0 });
    expect(multiDelays(3, 25, 'R').fd).toBe(21 * 45);
  });
  it('the steps and the columns', () => {
    expect(MULTI.ripAfter).toBe(450); expect(MULTI.gridAfter).toBe(650); expect(MULTI.ripAfterReduced).toBe(60); expect(MULTI.gridAfterReduced).toBe(150);
    expect(multiFlipAfter(25, false)).toBe(25 * 26 + 380); expect(multiFlipAfter(25, true)).toBe(120);
    expect(multiDoneAfter(25, false)).toBe(24 * 45 + 700); expect(multiDoneAfter(25, true)).toBe(250);
    expect(multiColumns(390)).toBe(5); expect(multiColumns(759)).toBe(5); expect(multiColumns(760)).toBe(10);
  });
});

describe('sizes from the screen height: the row of slots always has room', () => {
  it('the pile screen never needs more than the screen, from 480 to 1400 px high on phones and laptops', () => {
    for (const vw of [360, 390, 430, 768, 1280, 1366, 1440]) {
      for (let h = 480; h <= 1400; h += 8) expect(pileScreenHeight(vw, h)).toBeLessThanOrEqual(h + 0.001);
    }
  });
  it('the centre card is min(340px, 72vw, (100svh - 300px) * .647)', () => {
    expect(openingSizes(390, 664).pile).toBeCloseTo(Math.min(340, 390 * 0.72, 364 * 0.647), 5);
    expect(openingSizes(1366, 657).pile).toBeCloseTo(357 * 0.647, 5);
    expect(openingSizes(1440, 1200).pile).toBe(340);
  });
  it('the pack, the fan and the mini packs follow the same rule', () => {
    const s = openingSizes(1366, 657);
    expect(s.pack).toBeCloseTo((657 - 310) * 0.625, 5);
    expect(s.fanH).toBeCloseTo(Math.min(320, 657 * 0.48, 657 - 340), 5);
    expect(s.mpack).toBeCloseTo(Math.min(130, (657 - 330) * 0.5), 5);
    expect(OPENING_CHROME.slots).toBe(86);
  });
  it('the style sheet holds the same formulas', () => {
    for (const f of ['calc((100svh - 300px) * .647)', 'calc((100svh - 310px) * .625)', 'calc(100svh - 340px)', 'calc((100svh - 360px) * .647)', 'calc((100svh - 330px) * .5)', 'min(340px, 72vw,']) expect(css).toContain(f);
  });
  it('an empty .ov-actions has height 0', () => { expect(css).toMatch(/\.ov-actions:empty \{[^}]*height: 0/); });
});

describe('the flip never shows the back through the front (Chrome, Safari, Firefox)', () => {
  it('each face switches visibility at the middle of the flip', () => {
    expect(css).toMatch(/\.rc\.flipped \.side\.back \{ visibility: hidden; transition: visibility 0s linear calc\(var\(--flip, \.75s\) \* \.5\)/);
    expect(css).toMatch(/\.rc\.flipped \.side\.front \{ visibility: visible; transition: visibility 0s linear calc\(var\(--flip, \.75s\) \* \.5\)/);
    expect(css).toMatch(/\.rc \.side\.front \{[^}]*visibility: hidden/);
  });
});

describe('Full Art and Gold, in the style sheet', () => {
  it('the flash is at most 0.7 and only for Full Art; the shake lasts 0.5 s and only for Full Art; three rings', () => {
    expect(css).toMatch(/kco-flashw \{[\s\S]*?12% \{ opacity: \.7/);
    expect(css).toMatch(/\.ov\.bang\.tone-L \.stagefx \.flash/);
    expect(css).toMatch(/\.ov\.bang\.tone-L \.ov-mid \{ animation: kco-shake \.5s/);
    expect(css).not.toMatch(/tone-UR \.stagefx \.flash/);
    expect(css).toMatch(/\.r2/); expect(css).toMatch(/\.r3/);
  });
  it('the card goes to 113 % and back', () => { expect(css).toMatch(/kco-legendpop \{[\s\S]*?55% \{ transform: scale\(1\.13\)/); });
  it('lot 5: the rays have no mask and are smaller, the rim is not repainted, a ceiling of 260 particles', () => {
    expect(css).not.toMatch(/mask:/);
    expect(css).toMatch(/\.rays \{[^}]*width: 90vmax/);
    expect(MAX_PARTICLES).toBe(260);
  });
  it('reduced motion: fixed rays, no flash, no shake, fades of .2s, never zero animation', () => {
    expect(css).toMatch(/\.ov\.rm \.stagefx \.rays[^{]*\{ animation: none/);
    expect(css).toMatch(/\.ov\.rm \.stagefx \.ring, \.bvc \.ov\.rm \.stagefx \.flash \{ display: none/);
    expect(css).toMatch(/\.ov\.rm \*[^{]*\{ animation-duration: \.2s !important/);
    expect(css).toMatch(/transition-duration: \.2s !important/);
  });
});
