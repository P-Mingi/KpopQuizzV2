import { describe, expect, it } from 'vitest';

import { ageOk, cardFileRegex, cutPlan, mergePhotoFiles, partFileName, planRemovals, stemOf } from '../../../scripts/cards/card-files.mjs';
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
  it('the age rule: only a passed verdict is kept, no verdict fails closed', () => {
    expect(ageOk({})).toBe(false);
    expect(ageOk({ age: null })).toBe(false);
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

describe('lot 3: several photos a subject (one edition, one photo)', () => {
  it('slot 1 keeps the stem of lots 1 and 2, a lot 3 photo carries its slot', () => {
    expect(stemOf('iu', 1, 50, 30)).toBe('iu-50-30');
    expect(stemOf('iu', 4, 50, 22)).toBe('iu-s4-50-22');
    const m = cardFileRegex(['nct', 'nct-wish', 'iu']).exec('nct-s3-50-50-h2-2x.webp')!;
    expect([m[1], m[2], m[3], m[4], m[5], m[6]]).toEqual(['nct', '3', '50', '50', '2', '2x']);
    expect(cardFileRegex(['nct', 'nct-wish']).exec('nct-wish-s2-20-40-h1-1x.webp')![1]).toBe('nct-wish');
  });
  it('keeps the files of every live photo at its focal point, proposes the rest', () => {
    const current = new Map<string, unknown>([
      ['iu', [{ slot: 1, group: false, fx: 50, fy: 30 }, { slot: 2, group: false, fx: 50, fy: 22 }]],
      ['btob', [{ slot: 1, group: true, fx: 40, fy: 50 }, { slot: 3, group: true, fx: 50, fy: 50 }]],
    ]);
    const names = ['iu-50-30-1x.webp', 'iu-s2-50-22-2x.webp', 'iu-s2-50-30-1x.webp', 'iu-s3-50-30-1x.webp',
      'btob-40-50-h1-1x.webp', 'btob-s3-50-50-h2-2x.webp', 'btob-s2-50-50-h1-1x.webp', 'btob-s3-50-50-1x.webp'];
    const { keep, remove } = planRemovals(names, { known: ['iu', 'btob'], current });
    expect(keep).toEqual(['iu-50-30-1x.webp', 'iu-s2-50-22-2x.webp', 'btob-40-50-h1-1x.webp', 'btob-s3-50-50-h2-2x.webp']);
    expect(remove.map((r: { name: string; why: string }) => [r.name, r.why])).toEqual([
      ['iu-s2-50-30-1x.webp', 'old focal point (now 50/22)'],
      ['iu-s3-50-30-1x.webp', 'photo 3 of this subject is no longer live (refused, removed or dropped)'],
      ['btob-s2-50-50-h1-1x.webp', 'photo 2 of this subject is no longer live (refused, removed or dropped)'],
      ['btob-s3-50-50-1x.webp', 'old whole-card file of a group'],
    ]);
  });
});

describe('lot 6: the owner script reads lot 3 and lot 6 photos as one, with no other change', () => {
  const photo = (slot: number, page: string, status = 'auto') => ({ slot, status, page, url: `https://upload.example/${page}.jpg`, sha1: `sha-${page}`, focal: { x: 50, y: 30 } });
  const lot3 = { checked_on: 'a', subjects: [{ slug: 'jimin', name: 'Jimin', kind: 'idol', end_year: null, photos: [photo(1, 'j1', 'approved'), photo(2, 'j2')] }], left_out: [{ slug: 'tws', reason: 'no photo found' }] };
  const lot6 = {
    checked_on: 'b',
    subjects: [
      { slug: 'jimin', name: 'Jimin', kind: 'idol', end_year: null, photos: [photo(3, 'j3'), photo(4, 'j4', 'pending')] },
      { slug: 'ada-trio', name: 'Ada', kind: 'idol', end_year: null, photos: [photo(1, 'a1'), photo(2, 'a2')] },
      { slug: 'cleo-trio', name: 'Cleo', kind: 'idol', end_year: null, photos: [] },
    ],
    left_out: [{ slug: 'cleo-trio', reason: 'locked' }, { slug: 'tws', reason: 'again' }],
  };
  it('adds the new photos of a known subject after its old ones, a new subject whole, and nothing for a locked one', () => {
    const m = mergePhotoFiles(lot3, lot6);
    expect(m.subjects.map((s: { slug: string }) => s.slug)).toEqual(['jimin', 'ada-trio']);
    expect(m.subjects[0].photos.map((p: { slot: number }) => p.slot)).toEqual([1, 2, 3, 4]);
    expect(m.subjects[1]).toMatchObject({ slug: 'ada-trio', kind: 'idol', photos: [{ slot: 1 }, { slot: 2 }] });
    expect(m.left_out).toEqual([{ slug: 'tws', reason: 'no photo found' }, { slug: 'cleo-trio', reason: 'locked' }]);
    // lot 3's own object is not touched, and no lot 6 file means lot 3 as it was
    expect(lot3.subjects[0]!.photos).toHaveLength(2);
    expect(mergePhotoFiles(lot3, null)).toBe(lot3);
  });
  it('cuts, keeps and cleans the files of a lot 6 subject like any other: stems, halves, the pocket of a locked subject proposes its strays', () => {
    const known = ['jimin', 'ada-trio', 'cleo-trio', 'trio'];
    const current = new Map([
      ['ada-trio', [{ slot: 1, group: false, fx: 50, fy: 30 }, { slot: 2, group: false, fx: 50, fy: 30 }]],
      ['trio', [{ slot: 1, group: true, fx: 50, fy: 50 }]],
    ]);
    const names = ['ada-trio-50-30-1x.webp', 'ada-trio-s2-50-30-1x.webp', 'ada-trio-s2-50-30-2x.webp', 'trio-50-50-h1-1x.webp', 'trio-50-50-h2-1x.webp', 'cleo-trio-50-30-1x.webp', 'ada-trio-s3-50-30-1x.webp'];
    const { keep, remove } = planRemovals(names, { known, current });
    expect(keep).toEqual(names.slice(0, 5));
    expect(remove.map((r) => r.name)).toEqual(['cleo-trio-50-30-1x.webp', 'ada-trio-s3-50-30-1x.webp']);
    expect(stemOf('ada-trio', 2, 50, 30)).toBe('ada-trio-s2-50-30');
    const plan = cutPlan(false, 2000, 3000, 50, 30);
    expect(plan.parts).toHaveLength(1);
  });
  it('the owner script and its wrapper read lot 6 only through mergePhotoFiles and the data directory: nothing else changed', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../../scripts/cards/publish-card-files.mjs', import.meta.url), 'utf8');
    expect(src).toContain('mergePhotoFiles(JSON.parse(readFileSync(dataFile(\'photos.json\'), \'utf8\')), lot6Photos)');
    expect(src).toContain("docs/design/cards/data/lot6");
    // a locked subject has no photo: nothing is cut or uploaded for it
    expect(src).toContain("for (const s of chosen) for (const p of s.photos) if (CUT.has(p.status)");
  });
});
