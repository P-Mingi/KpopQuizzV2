// Bunnyverse Cards lot 7: the rule of a group photo in 2 or 3 cards (parts-rule.ts) and the geometry it shares with the owner's script
// (card-geometry.mjs): the 16.5:8.5 window, its thirds, the pair kept exactly as lots 2 to 6 cut it, the file suffixes, the panorama sizes.
import { describe, expect, it } from 'vitest';

import { PAIR_RATIO, TRIPLE_RATIO, groupBox, groupRatio, halves, pairBox, panoSizes, panoSuffix, partSuffix, splitParts } from '../../../scripts/cards/card-geometry.mjs';

import { decideParts, keepsEveryone, neededArea, partsByRatio, placeWindow, windowPct } from './parts-rule';

import type { HeadsBox, PartsVerdict } from './parts-rule';

const verdict = (box: HeadsBox | null, people = 5, unclear = false): PartsVerdict => ({ people, cutByPhoto: 0, box, unclear });

describe('lot 7 geometry', () => {
  it('a photo in 3 cards has a 16.5:8.5 window, three thirds that add up to it', () => {
    expect(groupRatio(2)).toBe(PAIR_RATIO);
    expect(groupRatio(3)).toBe(TRIPLE_RATIO);
    for (const [w, h] of [[4000, 2000], [3000, 2000], [1281, 853], [6000, 2200]] as const) {
      const box = groupBox(w, h, 3, 40, 60);
      expect(Math.abs(box.width / box.height - TRIPLE_RATIO)).toBeLessThan(0.01);
      expect(box.left + box.width).toBeLessThanOrEqual(w);
      expect(box.top + box.height).toBeLessThanOrEqual(h);
      const t = splitParts(box, 3);
      expect(t.map((p) => p.part)).toEqual([1, 2, 3]);
      expect(t.reduce((s, p) => s + p.width, 0)).toBe(box.width);
      expect(t[0]!.left).toBe(box.left);
      expect(t[1]!.left).toBe(t[0]!.left + t[0]!.width);
      expect(t[2]!.left).toBe(t[1]!.left + t[1]!.width);
      for (const p of t) expect(Math.abs(p.width - box.width / 3)).toBeLessThanOrEqual(1);
    }
  });

  it('a photo in 2 cards is cut exactly as before lot 7 (its published files stay valid)', () => {
    for (const [w, h, fx, fy] of [[4000, 3000, 40, 70], [1281, 853, 50, 30], [999, 2000, 0, 100]] as const) {
      expect(groupBox(w, h, 2, fx, fy)).toEqual(pairBox(w, h, fx, fy));
      const box = pairBox(w, h, fx, fy);
      expect(splitParts(box, 2)).toEqual(halves(box));
    }
  });

  it('the file suffixes: halves keep -h1/-h2, thirds are -t1 to -t3, a whole card has none; the panorama is -p2 or -p3', () => {
    expect(partSuffix(0)).toBe('');
    expect(partSuffix(1)).toBe('-h1');
    expect(partSuffix(2)).toBe('-h2');
    expect(partSuffix(3)).toBe('');
    expect(partSuffix(1, 2)).toBe('-h1');
    expect(partSuffix(1, 3)).toBe('-t1');
    expect(partSuffix(3, 3)).toBe('-t3');
    expect(panoSuffix(2)).toBe('-p2');
    expect(panoSuffix(3)).toBe('-p3');
    expect(panoSizes(2)).toEqual({ '1x': [640, 495], '2x': [1280, 989] });
    expect(panoSizes(3)).toEqual({ '1x': [960, 495], '2x': [1920, 989] });
  });
});

describe('lot 7 rule: the smallest window that keeps everyone', () => {
  // a 3:2 photo, 3000 x 2000: the 11:8.5 window is 2588 px wide (86 % of the width), the 16.5:8.5 window spans the width (77 % of the height)
  const W = 3000;
  const H = 2000;

  it('the window in percent of the photo follows the focal point', () => {
    const a = windowPct(W, H, 2, 0, 50);
    const b = windowPct(W, H, 2, 100, 50);
    expect(a.l).toBe(0);
    expect(b.r).toBeCloseTo(100, 5);
    expect(a.r - a.l).toBeCloseTo((Math.floor(H * PAIR_RATIO) / W) * 100, 5);
    const c = windowPct(W, H, 3, 50, 0);
    expect(c.l).toBe(0);
    expect(c.r).toBe(100);
    expect(c.t).toBe(0);
  });

  it('the needed area is the heads plus half a head on the sides, a quarter above and half below the chin', () => {
    const n = neededArea(W, H, { x0: 20, x1: 80, y0: 20, y1: 40, hw: 6 });
    expect(n.l).toBe(17);
    expect(n.r).toBe(83);
    expect(n.t).toBeCloseTo(20 - (6 * 1.5) / 4, 5);
    expect(n.b).toBeCloseTo(40 + (6 * 1.5) / 2, 5);
    expect(neededArea(W, H, { x0: 1, x1: 99, y0: 1, y1: 99, hw: 6 })).toEqual({ l: 0, r: 100, t: 0, b: 100 });
  });

  it('a group in the middle stays in 2 cards at the current focal point', () => {
    const d = decideParts(W, H, 50, 30, verdict({ x0: 25, x1: 75, y0: 20, y1: 45, hw: 6 }));
    expect(d).toMatchObject({ parts: 2, fx: 50, fy: 30, moved: false, review: false, by: 'thumbnail' });
    expect(d.note).toMatch(/^2 cards/);
  });

  it('a group off to one side stays in 2 cards once the focal point moves, as little as needed', () => {
    const b = { x0: 4, x1: 80, y0: 20, y1: 45, hw: 5 };
    expect(keepsEveryone(W, H, 2, 50, 30, b)).toBe(false);
    const at = placeWindow(W, H, 2, b, 50, 30);
    expect(at).not.toBeNull();
    expect(at!.moved).toBe(true);
    expect(keepsEveryone(W, H, 2, at!.fx, at!.fy, b)).toBe(true);
    expect(at!.fx).toBeLessThan(50);
    const d = decideParts(W, H, 50, 30, verdict(b));
    expect(d).toMatchObject({ parts: 2, moved: true, review: false });
    expect(d.note).toMatch(/focal point moves/);
  });

  it('a lineup from edge to edge goes to 3 cards', () => {
    const d = decideParts(W, H, 50, 30, verdict({ x0: 3, x1: 97, y0: 25, y1: 50, hw: 5 }));
    expect(d).toMatchObject({ parts: 3, review: false, by: 'thumbnail' });
    expect(d.note).toMatch(/^3 cards: the 11:8.5 window would cut someone/);
    expect(keepsEveryone(W, H, 3, d.fx, d.fy, { x0: 3, x1: 97, y0: 25, y1: 50, hw: 5 })).toBe(true);
  });

  it('heads from top to bottom of a wide photo cannot fit even 3 cards: To review, 3 proposed', () => {
    const d = decideParts(W, H, 50, 30, verdict({ x0: 3, x1: 97, y0: 2, y1: 95, hw: 5 }));
    expect(d).toMatchObject({ parts: 3, review: true, moved: false, fx: 50, fy: 30 });
    expect(d.note).toMatch(/^To review: someone would be cut even in 3 cards/);
  });

  it('a very wide photo with its lineup across the whole width: To review', () => {
    // 6000 x 2000 (3:1): the 16.5:8.5 window keeps 65 % of the width
    const d = decideParts(6000, 2000, 50, 30, verdict({ x0: 5, x1: 95, y0: 30, y1: 55, hw: 3 }));
    expect(d.review).toBe(true);
  });

  it('without a usable verdict the ratio decides', () => {
    expect(partsByRatio(1000, 1000)).toMatchObject({ parts: 2, review: false });
    expect(partsByRatio(1100, 850)).toMatchObject({ parts: 2, review: false });
    expect(partsByRatio(3000, 2000)).toMatchObject({ parts: 3, review: false });
    expect(partsByRatio(1650, 850)).toMatchObject({ parts: 3, review: false });
    expect(partsByRatio(4000, 1500)).toMatchObject({ parts: 3, review: true });
    for (const v of [null, verdict(null, 5, true), verdict({ x0: 1, x1: 2, y0: 1, y1: 2, hw: 1 }, 0)]) {
      const d = decideParts(3000, 2000, 50, 30, v);
      expect(d).toMatchObject({ parts: 3, review: false, by: 'ratio', moved: false });
    }
  });

  it('every decision that does not go to review keeps everyone at its focal point', () => {
    const boxes: HeadsBox[] = [];
    for (let x0 = 0; x0 <= 40; x0 += 8) for (let x1 = 60; x1 <= 100; x1 += 8) for (const y of [5, 20, 40]) boxes.push({ x0, x1, y0: y, y1: y + 25, hw: 6 });
    for (const [w, h] of [[3000, 2000], [2000, 2000], [4000, 2250], [1600, 1200]] as const) {
      for (const b of boxes) {
        for (const [fx, fy] of [[50, 30], [0, 0], [100, 100]] as const) {
          const d = decideParts(w, h, fx, fy, verdict(b));
          if (d.review) continue;
          expect(keepsEveryone(w, h, d.parts, d.fx, d.fy, b)).toBe(true);
          if (d.parts === 3) expect(placeWindow(w, h, 2, b, fx, fy)).toBeNull();
        }
      }
    }
  });
});
