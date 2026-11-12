import { describe, expect, it } from 'vitest';

import { ageOk, cardFileRegex, cutPlan, partFileName, planRemovals } from '../../../scripts/cards/card-files.mjs';
import { MIN_2X, PAIR_RATIO, cardBox, halves, pairBox } from '../../../scripts/cards/card-geometry.mjs';

describe('card geometry, pair window and halves', () => {
  it('the pair window is 11:8.5 and its halves add up to it', () => {
    for (const [w, h] of [[4000, 3000], [1500, 3000], [1281, 853], [900, 2000]] as const) {
      const box = pairBox(w, h, 40, 70);
      expect(Math.abs(box.width / box.height - PAIR_RATIO)).toBeLessThan(0.01);
      expect(box.left + box.width).toBeLessThanOrEqual(w);
      expect(box.top + box.height).toBeLessThanOrEqual(h);
      const [a, b] = halves(box);
      expect(a!.part).toBe(1);
      expect(b!.part).toBe(2);
      expect(a!.width + b!.width).toBe(box.width);
      expect(a!.left).toBe(box.left);
      expect(b!.left).toBe(box.left + a!.width);
      expect(a!.height).toBe(box.height);
    }
  });
  it('focal 0 and 100 put the window on the edges', () => {
    const w = 4000, h = 1500;
    const lo = pairBox(w, h, 0, 0);
    const hi = pairBox(w, h, 100, 100);
    expect(lo.left).toBe(0);
    expect(lo.top).toBe(0);
    expect(hi.left + hi.width).toBe(w);
    expect(hi.top + hi.height).toBe(h);
    const c = cardBox(1000, 3000, 100, 100);
    expect(c.left + c.width).toBe(1000);
    expect(c.top + c.height).toBe(3000);
  });
  it('a half under 640 px has no 2x, a person card follows the same rule', () => {
    const narrow = cutPlan(true, 1200, 3000, 50, 50); // window 1200 wide: halves of 600
    expect(narrow.parts.map((p: { part: number }) => p.part)).toEqual([1, 2]);
    expect(narrow.parts.every((p: { has2x: boolean }) => !p.has2x)).toBe(true);
    const wide = cutPlan(true, 1280, 3000, 50, 50);
    expect(wide.parts.every((p: { has2x: boolean; cropWidth: number }) => p.has2x && p.cropWidth >= MIN_2X)).toBe(true);
    const mixed = cutPlan(true, 1281, 3000, 0, 0); // halves 640 and 641
    expect(mixed.parts.map((p: { has2x: boolean }) => p.has2x)).toEqual([true, true]);
    const odd = cutPlan(true, 1279, 3000, 0, 0); // halves 639 and 640
    expect(odd.parts.map((p: { has2x: boolean }) => p.has2x)).toEqual([false, true]);
    const person = cutPlan(false, 4000, 1000, 50, 50);
    expect(person.parts).toHaveLength(1);
    expect(person.parts[0]!.part).toBe(0);
  });
  it('file names: a half has -h1 / -h2, a whole card none', () => {
    expect(partFileName('x-50-30', 0, '1x')).toBe('x-50-30-1x.webp');
    expect(partFileName('x-50-30', 2, '2x')).toBe('x-50-30-h2-2x.webp');
  });
  it('the age rule: a missing age is ok, only ok false leaves', () => {
    expect(ageOk({})).toBe(true);
    expect(ageOk({ age: { ok: true, reason: null } })).toBe(true);
    expect(ageOk({ age: { ok: false, reason: 'under 18' } })).toBe(false);
  });
});

describe('the exact-name matcher of the bucket cleanup', () => {
  const known = ['nct', 'nct-wish', 'blackpink', 'old-group', 'idolx'];
  const current = new Map([
    ['nct', { group: true, fx: 50, fy: 30 }],
    ['nct-wish', { group: true, fx: 20, fy: 40 }],
    ['blackpink', { group: true, fx: 50, fy: 50 }],
    ['idolx', { group: false, fx: 10, fy: 90 }],
  ]);
  const plan = (names: string[], extra: object = {}) => planRemovals(names, { known, current, ...extra });
  const removed = (names: string[], extra: object = {}) => plan(names, extra).remove.map((r: { name: string }) => r.name);

  it('nct and nct-wish are told apart', () => {
    const names = ['nct-50-30-h1-1x.webp', 'nct-wish-20-40-h2-2x.webp', 'nct-wish-50-30-h1-1x.webp', 'nct-20-40-h1-1x.webp'];
    expect(plan(names).keep).toEqual(['nct-50-30-h1-1x.webp', 'nct-wish-20-40-h2-2x.webp']);
    expect(removed(names)).toEqual(['nct-wish-50-30-h1-1x.webp', 'nct-20-40-h1-1x.webp']);
    expect(cardFileRegex(known).exec('nct-wish-20-40-h2-2x.webp')![1]).toBe('nct-wish');
    expect(cardFileRegex(known).exec('nct-50-30-1x.webp')![1]).toBe('nct');
  });
  it('a file at an old focal point goes, the current one stays', () => {
    expect(removed(['idolx-10-90-1x.webp', 'idolx-10-90-2x.webp', 'idolx-10-80-1x.webp'])).toEqual(['idolx-10-80-1x.webp']);
  });
  it('the old whole-card file of a group goes, a half of a person goes', () => {
    expect(removed(['blackpink-50-50-1x.webp', 'blackpink-50-50-2x.webp', 'blackpink-50-50-h1-1x.webp', 'idolx-10-90-h1-1x.webp']))
      .toEqual(['blackpink-50-50-1x.webp', 'blackpink-50-50-2x.webp', 'idolx-10-90-h1-1x.webp']);
  });
  it('the files of an excluded subject (known, not current) go; unknown names go too', () => {
    expect(removed(['old-group-50-50-h1-1x.webp', 'readme.txt', 'zzz-1-1-1x.webp', 'nct-50-30-h1-1x.webp.bak']))
      .toEqual(['old-group-50-50-h1-1x.webp', 'readme.txt', 'zzz-1-1-1x.webp', 'nct-50-30-h1-1x.webp.bak']);
  });
  it('with --only only those slugs are looked at; skipped slugs are never touched', () => {
    const names = ['old-group-50-50-h1-1x.webp', 'nct-20-40-h1-1x.webp', 'readme.txt'];
    expect(removed(names, { only: new Set(['old-group']) })).toEqual(['old-group-50-50-h1-1x.webp']);
    expect(removed(names, { skip: new Set(['nct']) })).toEqual(['old-group-50-50-h1-1x.webp', 'readme.txt']);
  });
});
