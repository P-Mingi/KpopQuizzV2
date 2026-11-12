// Bunnyverse Cards lot 2 (owner decision 2026-11-12): a disbanded group kept in the game says so on its card, with the year it disbanded,
// and its card page lists the year as a fact. A group that is still active is unchanged.
import { describe, expect, it } from 'vitest';

import { metaLine } from './card-art';

import type { SlimCard } from '@/lib/cards/ui-types';

const group = (extra: Partial<SlimCard> = {}): SlimCard => ({
  n: 1, num: 'BV1-0001', entity: 'group:sistar', kind: 'group', rarity: 'C', edition: 'std', name: 'SISTAR', group: 'SISTAR', debutYear: 2010,
  img: null, fx: 50, fy: 50, sub: null, part: 1, pairN: 2, ...extra,
});

describe('a disbanded group on its card', () => {
  it('prints the debut and the year it disbanded', () => {
    expect(metaLine(group({ endYear: 2017 }))).toBe('2010 · Disbanded 2017');
    expect(metaLine(group({ endYear: 2017, debutYear: null }))).toBe('Disbanded 2017');
  });
  it('leaves an active group as it was', () => {
    expect(metaLine(group())).toBe('Debut 2010');
    expect(metaLine(group({ endYear: null }))).toBe('Debut 2010');
  });
  it('never prints a long or medium dash', () => {
    expect(metaLine(group({ endYear: 2017 }))).not.toMatch(/[–—]/);
  });
});
