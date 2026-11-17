import { describe, expect, it } from 'vitest';

import { ageOk, cardFileRegex, cutPlan, fileAction, filePatch, mergePhotoFiles, panoFileName, partFileName, planRemovals, stemOf } from '../../../scripts/cards/card-files.mjs';
import { MIN_2X, PAIR_RATIO, TRIPLE_RATIO, cardBox, halves, pairBox, panoSizes } from '../../../scripts/cards/card-geometry.mjs';

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

describe('lot 7: thirds and the panorama', () => {
  type P = { part: number; left: number; top: number; width: number; height: number; cropWidth: number; has2x: boolean };
  it('a pair plan is exactly the halves of before, with a panorama of the whole window', () => {
    for (const [w, h] of [[4000, 3000], [1281, 853], [1279, 3000], [900, 2000]] as const) {
      const box = pairBox(w, h, 40, 70);
      const plan = cutPlan(true, w, h, 40, 70);
      expect(plan.window).toEqual(box);
      expect(plan.parts.map((p: P) => ({ part: p.part, left: p.left, top: p.top, width: p.width, height: p.height }))).toEqual(halves(box));
      expect(cutPlan(true, w, h, 40, 70, 2)).toEqual(plan);
      expect(plan.pano).toEqual({ ...box, has2x: plan.parts.every((p: P) => p.has2x) });
    }
  });
  it('a person has no panorama', () => {
    expect(cutPlan(false, 4000, 1000, 50, 50).pano).toBeNull();
    expect(cutPlan(false, 4000, 1000, 50, 50, 3).parts).toHaveLength(1);
  });
  it('thirds: three parts of the 16.5:8.5 window that add up to it, left to right', () => {
    for (const [w, h] of [[4000, 3000], [3000, 1200], [1920, 3000], [1000, 400]] as const) {
      const plan = cutPlan(true, w, h, 30, 60, 3);
      expect(Math.abs(plan.window.width / plan.window.height - TRIPLE_RATIO)).toBeLessThan(0.02);
      expect(plan.parts.map((p: P) => p.part)).toEqual([1, 2, 3]);
      expect(plan.parts.reduce((a: number, p: P) => a + p.width, 0)).toBe(plan.window.width);
      expect(plan.parts[0]!.left).toBe(plan.window.left);
      expect(plan.parts[1]!.left).toBe(plan.parts[0]!.left + plan.parts[0]!.width);
      expect(plan.parts[2]!.left).toBe(plan.parts[1]!.left + plan.parts[1]!.width);
      expect(plan.parts.every((p: P) => p.height === plan.window.height && p.top === plan.window.top)).toBe(true);
      expect(plan.pano).toEqual({ ...plan.window, has2x: plan.parts.every((p: P) => p.has2x) });
    }
  });
  it('the 2x flags at the 640 px boundary: a third of a 1919 wide window has no 2x, of 1920 has', () => {
    // a photo exactly 1920 wide and tall enough that the window is the whole width: thirds of 640
    const ok = cutPlan(true, 1920, 1000, 50, 50, 3);
    expect(ok.window.width).toBe(1920);
    expect(ok.parts.map((p: P) => p.width)).toEqual([640, 640, 640]);
    expect(ok.parts.every((p: P) => p.has2x)).toBe(true);
    expect(ok.pano!.has2x).toBe(true);
    const no = cutPlan(true, 1919, 1000, 50, 50, 3);
    expect(no.window.width).toBe(1919);
    expect(no.parts.map((p: P) => p.width)).toEqual([639, 640, 640]);
    expect(no.parts.map((p: P) => p.has2x)).toEqual([false, true, true]);
    expect(no.pano!.has2x).toBe(false);
    // the panorama 2x is all or nothing, in a pair as well
    expect(cutPlan(true, 1279, 3000, 0, 0).pano!.has2x).toBe(false);
    expect(cutPlan(true, 1280, 3000, 0, 0).pano!.has2x).toBe(true);
    expect(MIN_2X).toBe(640);
  });
  it('panorama sizes follow the parts', () => {
    expect(panoSizes(2)).toEqual({ '1x': [640, 495], '2x': [1280, 989] });
    expect(panoSizes(3)).toEqual({ '1x': [960, 495], '2x': [1920, 989] });
  });
  it('file names: halves, thirds, panoramas', () => {
    expect(partFileName('x-50-30', 2, '1x')).toBe('x-50-30-h2-1x.webp');
    expect(partFileName('x-50-30', 2, '1x', 2)).toBe('x-50-30-h2-1x.webp');
    expect(partFileName('x-50-30', 1, '1x', 3)).toBe('x-50-30-t1-1x.webp');
    expect(partFileName('x-s2-50-30', 3, '2x', 3)).toBe('x-s2-50-30-t3-2x.webp');
    expect(partFileName('x-50-30', 0, '1x', 3)).toBe('x-50-30-1x.webp');
    expect(panoFileName('x-50-30', 2, '1x')).toBe('x-50-30-p2-1x.webp');
    expect(panoFileName('x-50-30', 3, '2x')).toBe('x-50-30-p3-2x.webp');
  });
  it('the regex matches thirds and panoramas, anchored, longest slug first', () => {
    const re = cardFileRegex(['nct', 'nct-wish']);
    for (const n of ['nct-50-30-t1-1x.webp', 'nct-wish-s2-20-40-t3-2x.webp', 'nct-50-30-p2-1x.webp', 'nct-wish-20-40-p3-2x.webp']) expect(re.test(n)).toBe(true);
    expect(re.exec('nct-wish-20-40-p3-2x.webp')![1]).toBe('nct-wish');
    expect(re.exec('nct-wish-s2-20-40-t3-2x.webp')![6]).toBe('2x');
    for (const n of ['nct-50-30-t4-1x.webp', 'nct-50-30-t0-1x.webp', 'nct-50-30-p1-1x.webp', 'nct-50-30-p4-1x.webp', 'nct-50-30-t1-3x.webp', 'nct-50-30-t1-1x.webp.bak', 'x-nct-50-30-t1-1x.webp', 'nct-50-30-t1p2-1x.webp']) expect(re.test(n)).toBe(false);
  });
});

describe('lot 7: the cleanup knows the parts', () => {
  const known = ['trio', 'duo', 'solo'];
  const current = new Map<string, unknown>([
    ['trio', [{ slot: 1, group: true, fx: 50, fy: 50, parts: 3 }]],
    ['duo', [{ slot: 1, group: true, fx: 40, fy: 50, parts: 2 }, { slot: 2, group: true, fx: 40, fy: 50 }]],
    ['solo', [{ slot: 1, group: false, fx: 10, fy: 20 }]],
  ]);
  const run = (names: string[]) => planRemovals(names, { known, current: current as never });
  const why = (names: string[]) => run(names).remove.map((r: { name: string; why: string }) => [r.name, r.why]);
  it('a photo in 3 keeps its thirds and -p3 at its focal point', () => {
    const names = ['trio-50-50-t1-1x.webp', 'trio-50-50-t2-2x.webp', 'trio-50-50-t3-1x.webp', 'trio-50-50-p3-1x.webp', 'trio-50-50-p3-2x.webp'];
    expect(run(names).keep).toEqual(names);
    expect(run(names).remove).toEqual([]);
  });
  it('a photo in 3 proposes its old halves and -p2 with a plain reason', () => {
    expect(why(['trio-50-50-h1-1x.webp', 'trio-50-50-h2-2x.webp', 'trio-50-50-p2-1x.webp', 'trio-50-50-1x.webp'])).toEqual([
      ['trio-50-50-h1-1x.webp', 'half file of a photo now in 3 cards'],
      ['trio-50-50-h2-2x.webp', 'half file of a photo now in 3 cards'],
      ['trio-50-50-p2-1x.webp', 'panorama file for 2 cards of a photo now in 3'],
      ['trio-50-50-1x.webp', 'old whole-card file of a group'],
    ]);
  });
  it('a photo in 2 (explicit or default) keeps its halves and -p2, proposes thirds and -p3', () => {
    const keepNames = ['duo-40-50-h1-1x.webp', 'duo-40-50-h2-2x.webp', 'duo-40-50-p2-1x.webp', 'duo-40-50-p2-2x.webp', 'duo-s2-40-50-h1-1x.webp', 'duo-s2-40-50-p2-1x.webp'];
    expect(run(keepNames).keep).toEqual(keepNames);
    expect(why(['duo-40-50-t1-1x.webp', 'duo-40-50-p3-1x.webp', 'duo-s2-40-50-t3-2x.webp'])).toEqual([
      ['duo-40-50-t1-1x.webp', 'third file of a photo now in 2 cards'],
      ['duo-40-50-p3-1x.webp', 'panorama file for 3 cards of a photo now in 2'],
      ['duo-s2-40-50-t3-2x.webp', 'third file of a photo now in 2 cards'],
    ]);
  });
  it('an old focal point still goes for parts and panoramas', () => {
    expect(why(['trio-50-40-t1-1x.webp', 'trio-50-40-p3-1x.webp', 'duo-40-60-p2-1x.webp'])).toEqual([
      ['trio-50-40-t1-1x.webp', 'old focal point (now 50/50)'],
      ['trio-50-40-p3-1x.webp', 'old focal point (now 50/50)'],
      ['duo-40-60-p2-1x.webp', 'old focal point (now 40/50)'],
    ]);
  });
  it('a person never keeps a part or a panorama file, even with parts set', () => {
    expect(why(['solo-10-20-1x.webp', 'solo-10-20-h1-1x.webp', 'solo-10-20-t2-1x.webp', 'solo-10-20-p2-1x.webp', 'solo-10-20-p3-2x.webp']).map((x: unknown[]) => x[1])).toEqual([
      'half file of a person', 'part file of a person', 'panorama file of a person', 'panorama file of a person']);
    expect(run(['solo-10-20-1x.webp']).keep).toEqual(['solo-10-20-1x.webp']);
    const withParts = planRemovals(['solo-10-20-p3-1x.webp'], { known, current: new Map([['solo', { group: false, fx: 10, fy: 20, parts: 3 }]]) });
    expect(withParts.keep).toEqual([]);
  });
  it('the lot 2 object form still means slot 1 with parts 2', () => {
    const r = planRemovals(['duo-40-50-h1-1x.webp', 'duo-40-50-p2-1x.webp', 'duo-40-50-t1-1x.webp'], { known, current: new Map([['duo', { group: true, fx: 40, fy: 50 }]]) });
    expect(r.keep).toEqual(['duo-40-50-h1-1x.webp', 'duo-40-50-p2-1x.webp']);
    expect(r.remove.map((x: { name: string }) => x.name)).toEqual(['duo-40-50-t1-1x.webp']);
  });
});

describe('lot 7: what the script does with a row, and the PATCH body', () => {
  const stem = 'g-50-30';
  const base = { storage_path: stem, focal_x: 50, focal_y: 30, file_focal_x: 50, file_focal_y: 30 };
  it('a database before 118: behaves exactly as today, no panorama', () => {
    expect(fileAction({ ...base }, stem, true)).toEqual({ parts: 2, action: 'skip' });
    expect(fileAction({ ...base, file_focal_x: 40 }, stem, true)).toEqual({ parts: 2, action: 'full' });
    expect(fileAction({ ...base, storage_path: null }, stem, false)).toEqual({ parts: 2, action: 'full' });
    expect(fileAction({ ...base }, stem, false)).toEqual({ parts: 2, action: 'skip' });
  });
  it('after 118: a photo with matching files and a panorama is skipped', () => {
    expect(fileAction({ ...base, parts: 3, file_parts: 3, file_pano: true }, stem, true)).toEqual({ parts: 3, action: 'skip' });
    expect(fileAction({ ...base, parts: null, file_parts: null, file_pano: true }, stem, true)).toEqual({ parts: 2, action: 'skip' });
  });
  it('a pair cut before lot 7 at its focal point only gains its panorama', () => {
    expect(fileAction({ ...base, parts: null, file_parts: null, file_pano: false }, stem, true)).toEqual({ parts: 2, action: 'pano' });
    expect(fileAction({ ...base, parts: 2, file_parts: 2, file_pano: false }, stem, true)).toEqual({ parts: 2, action: 'pano' });
  });
  it('a change of parts or of focal point cuts everything again', () => {
    expect(fileAction({ ...base, parts: 3, file_parts: null, file_pano: true }, stem, true)).toEqual({ parts: 3, action: 'full' });
    expect(fileAction({ ...base, parts: 2, file_parts: 3, file_pano: true }, stem, true)).toEqual({ parts: 2, action: 'full' });
    expect(fileAction({ ...base, parts: 2, file_parts: 2, file_pano: true, file_focal_y: 31 }, stem, true)).toEqual({ parts: 2, action: 'full' });
  });
  it('a person is skipped when its files match and never gets a panorama or parts', () => {
    expect(fileAction({ ...base, parts: 3, file_parts: null, file_pano: false }, stem, false)).toEqual({ parts: 2, action: 'skip' });
  });
  it('the PATCH body carries only the columns the database has', () => {
    const plan = { stem, fx: 50, fy: 30, parts: 3, pano: true };
    expect(filePatch(plan, { fileParts: false, filePano: false })).toEqual({ storage_path: stem, file_focal_x: 50, file_focal_y: 30 });
    expect(filePatch(plan, { fileParts: true, filePano: false })).toEqual({ storage_path: stem, file_focal_x: 50, file_focal_y: 30, file_parts: 3 });
    expect(filePatch(plan)).toEqual({ storage_path: stem, file_focal_x: 50, file_focal_y: 30, file_parts: 3, file_pano: true });
    expect(filePatch({ ...plan, parts: 2, pano: false })).toMatchObject({ file_parts: 2, file_pano: false });
    expect(Object.keys(filePatch({ ...plan, parts: 7 }))).toContain('file_parts');
    expect((filePatch({ ...plan, parts: 7 }) as { file_parts?: number }).file_parts).toBe(2);
  });
});

describe('lot 7: the owner script wiring (source checks, nothing is run)', () => {
  it('reads every column, patches once with the helper, keeps the confirmations', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../../scripts/cards/publish-card-files.mjs', import.meta.url), 'utf8');
    expect(src).toContain('cards_photos?select=*&status=in.(auto,approved)');
    expect(src.match(/method: 'PATCH'/g)).toHaveLength(1);
    expect(src).toContain('JSON.stringify(body)');
    expect(src).toContain("'file_parts' in row");
    expect(src).toContain("'file_pano' in row");
    expect(src).toContain("go !== 'delete'");
    expect(src).toContain("if (typed !== host) throw new Error('refused: the host typed does not match");
  });
});
