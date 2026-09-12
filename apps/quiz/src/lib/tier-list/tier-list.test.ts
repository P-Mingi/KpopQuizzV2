import { describe, it, expect } from 'vitest';

import { fandomAgrees } from './aggregate';
import { defaultTiers, UNRANKED } from './defaults';
import { buildInitialPlacements, normalizePlacements, isValidPlacements, rankedCount } from './serialization';
import { slugify, makeUniqueSlug } from './slug';
import type { TierListItem } from './types';

const items: TierListItem[] = [
  { id: 'jm', kind: 'member', name: 'Jimin', image_url: null },
  { id: 'v', kind: 'member', name: 'V', image_url: null },
  { id: 'jk', kind: 'member', name: 'Jung Kook', image_url: null },
  { id: 'rm', kind: 'member', name: 'RM', image_url: null },
];
const tiers = defaultTiers();

describe('serialization', () => {
  it('starts every item unranked', () => {
    const init = buildInitialPlacements(items, tiers);
    expect(init[UNRANKED]).toEqual(['jm', 'v', 'jk', 'rm']);
    expect(init['S']).toEqual([]);
    expect(isValidPlacements(init, tiers, items)).toBe(true);
  });

  it('normalize enforces exactly-once: drops dupes/unknowns, unplaced -> unranked', () => {
    const raw = { S: ['jm', 'jm', 'ghost'], A: ['v'], [UNRANKED]: ['jk'] }; // rm missing
    const norm = normalizePlacements(raw, tiers, items);
    expect(norm['S']).toEqual(['jm']);
    expect(norm['A']).toEqual(['v']);
    expect(norm[UNRANKED]).toContain('jk');
    expect(norm[UNRANKED]).toContain('rm');
    expect(isValidPlacements(norm, tiers, items)).toBe(true);
    expect(rankedCount(norm)).toBe(2);
  });

  it('folds a removed tier back into unranked', () => {
    const raw = { Z: ['jm'], S: ['v'], A: ['jk'], [UNRANKED]: ['rm'] };
    const norm = normalizePlacements(raw, tiers, items);
    expect(norm[UNRANKED]).toContain('jm');
    expect(isValidPlacements(norm, tiers, items)).toBe(true);
  });
});

describe('slug', () => {
  it('slugifies', () => {
    expect(slugify('My BTS Ranking!')).toBe('my-bts-ranking');
    expect(slugify('  ---  ')).toBe('tier-list');
    expect(slugify('Cafe deja vu')).toBe('cafe-deja-vu');
  });
  it('makes unique slugs past collisions', () => {
    const taken = new Set(['my-list', 'my-list-2']);
    expect(makeUniqueSlug('My List', taken)).toBe('my-list-3');
    expect(makeUniqueSlug('Fresh One', taken)).toBe('fresh-one');
  });
});

describe('fandom agrees aggregate', () => {
  const order = tiers.map((t) => t.label);
  it('computes modal tier + agreement, ignores unranked', () => {
    const lists = [
      { S: ['jm'], A: ['v'], [UNRANKED]: ['jk', 'rm'] },
      { S: ['jm'], A: ['v'], [UNRANKED]: [] },
      { A: ['jm', 'v'], [UNRANKED]: ['jk'] },
    ];
    const agg = fandomAgrees(lists, order);
    const byId = Object.fromEntries(agg.map((c) => [c.itemId, c]));
    expect(byId['jm']!.tier).toBe('S');
    expect(byId['jm']!.agreement).toBeCloseTo(2 / 3);
    expect(byId['v']!.tier).toBe('A');
    expect(byId['v']!.agreement).toBeCloseTo(1);
    expect(byId['v']!.votes).toBe(3);
    expect(byId['jk']).toBeUndefined();
    expect(agg[0]!.itemId).toBe('jm'); // S before A
  });
  it('breaks a modal tie to the higher tier', () => {
    const agg = fandomAgrees([{ S: ['x'] }, { A: ['x'] }], ['S', 'A', 'B']);
    expect(agg[0]!.tier).toBe('S');
  });
});
