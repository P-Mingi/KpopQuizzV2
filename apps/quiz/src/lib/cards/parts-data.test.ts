// Bunnyverse Cards lot 7: from the two looks at a thumbnail to the public entry of parts.json (parts-data.ts).
import { describe, expect, it } from 'vitest';

import { REJECTED_NOTE, countsOf, partsEntry, verdictOf, windowsToCheck } from './parts-data';
import { keepsEveryone } from './parts-rule';

import type { PartsItem, PrivateVerdict } from './parts-data';

const it3x2: PartsItem = { page: 'https://commons.wikimedia.org/wiki/File:A.jpg', w: 3000, h: 2000, fx: 50, fy: 30 };
const middle: PrivateVerdict = { people: 4, cut_by_photo: 0, x0: 25, x1: 75, y0: 20, y1: 45, hw: 6, unclear: false, seems_minor: false };
const wide: PrivateVerdict = { people: 9, cut_by_photo: 1, x0: 3, x1: 97, y0: 25, y1: 50, hw: 5, unclear: false, seems_minor: false };

describe('lot 7 parts data', () => {
  it('a thumbnail that seems to show a person under 18 rejects the photo, with no geometry kept', () => {
    const e = partsEntry(it3x2, { seems_minor: true });
    expect(e).toMatchObject({ rejected: true, review: false, heads_box: null, note: REJECTED_NOTE });
    expect(e.focal).toEqual(e.focal_from);
  });

  it('the first look alone: 2 cards for a group in the middle, 3 for a lineup across the photo', () => {
    expect(partsEntry(it3x2, middle)).toMatchObject({ parts: 2, review: false, by: 'thumbnail', heads_box: { x0: 25, x1: 75 } });
    expect(partsEntry(it3x2, wide)).toMatchObject({ parts: 3, review: false, by: 'thumbnail' });
  });

  it('the second look overrules the geometry: 2 that cuts goes to 3, 3 that cuts goes to To review; unclear changes nothing', () => {
    const a = partsEntry(it3x2, middle, [{ parts: 2, cuts: true }, { parts: 3, cuts: false }]);
    expect(a).toMatchObject({ parts: 3, review: false, checked: true });
    expect(keepsEveryone(3000, 2000, 3, a.focal.x, a.focal.y, a.heads_box!)).toBe(true);
    expect(partsEntry(it3x2, middle, [{ parts: 2, cuts: true }, { parts: 3, cuts: true }])).toMatchObject({ parts: 3, review: true, checked: true });
    expect(partsEntry(it3x2, wide, [{ parts: 3, cuts: true }])).toMatchObject({ parts: 3, review: true });
    expect(partsEntry(it3x2, middle, [{ parts: 2, cuts: true, unclear: true }])).toMatchObject({ parts: 2, review: false });
    expect(partsEntry(it3x2, middle, [{ parts: 2, cuts: false }])).toMatchObject({ parts: 2, review: false });
    expect(partsEntry(it3x2, middle, [{ parts: 2, cuts: false }]).checked).toBeUndefined();
  });

  it('no usable first look: the ratio decides and no heads box is written', () => {
    for (const v of [undefined, { unclear: true }, { people: 3, x0: 50, x1: 40, y0: 1, y1: 2, hw: 3 }] as Array<PrivateVerdict | undefined>) {
      expect(partsEntry(it3x2, v)).toMatchObject({ parts: 3, review: false, by: 'ratio', heads_box: null });
    }
    expect(verdictOf(undefined)).toBeNull();
    expect(windowsToCheck(it3x2, verdictOf({ unclear: true }))).toEqual([]);
  });

  it('the second look is asked only about the windows the geometry can place', () => {
    expect(windowsToCheck(it3x2, verdictOf(middle)).map((w) => w.parts)).toEqual([2, 3]);
    expect(windowsToCheck(it3x2, verdictOf(wide)).map((w) => w.parts)).toEqual([3]);
  });

  it('the counts', () => {
    const es = [partsEntry(it3x2, middle), partsEntry(it3x2, wide), partsEntry(it3x2, { seems_minor: true }), partsEntry(it3x2, { ...wide, y0: 2, y1: 95 })];
    expect(countsOf(es)).toMatchObject({ photos: 4, two: 1, three: 1, review: 1, rejected: 1 });
  });
});
