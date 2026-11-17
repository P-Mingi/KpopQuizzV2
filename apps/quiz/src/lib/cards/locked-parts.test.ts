// KpopCards lot 7 (integrator, 2026-11-17): the pockets of a group edition that cannot exist yet follow the group's issued editions: a group
// in 3 cards shows "1/3", "2/3", "3/3", a group in 2 keeps "1/2", "2/2".
import { describe, expect, it } from 'vitest';

import { buildSlim, lockedPartLabels } from './ui-model';

import type { UiCard, UiCatalog } from './ui-types';

const set = (n: number) => Array.from({ length: n }, (_, k) => ({ part: (k + 1) as 1 | 2 | 3 }));

describe('the locked pockets of a group edition', () => {
  it('follow the parts of the issued editions: most in 3 (or a tie) gives 3, else 2', () => {
    expect(lockedPartLabels([])).toEqual([' 1/2', ' 2/2']);
    expect(lockedPartLabels([set(2), set(2)])).toEqual([' 1/2', ' 2/2']);
    expect(lockedPartLabels([set(3)])).toEqual([' 1/3', ' 2/3', ' 3/3']);
    expect(lockedPartLabels([set(3), set(2)])).toEqual([' 1/3', ' 2/3', ' 3/3']);
    expect(lockedPartLabels([set(3), set(2), set(2)])).toEqual([' 1/2', ' 2/2']);
    expect(lockedPartLabels([set(3), set(3), set(2)])).toEqual([' 1/3', ' 2/3', ' 3/3']);
  });

  it('a group whose two issued editions are in 3 cards shows three pockets for each locked edition', () => {
    const card = (n: number, rarity: 'C' | 'U', part: 1 | 2 | 3): UiCard => ({
      n, num: `BV1-${String(n).padStart(4, '0')}`, entity: 'group:zz', kind: 'group', rarity, edition: rarity === 'C' ? 'std' : 'stage', name: 'ZZ', group: 'ZZ',
      debutYear: 2020, photo: null, part, parts: 3, setNs: rarity === 'C' ? [1, 2, 3] : [4, 5, 6], pairN: null,
    });
    const cat: UiCatalog = {
      odds: null,
      entities: [{ id: 'group:zz', kind: 'group', name: 'ZZ', group: null, debutYear: 2020, sortKey: 'zz|1|zz', lockReasons: {} }],
      cards: [card(1, 'C', 1), card(2, 'C', 2), card(3, 'C', 3), card(4, 'U', 1), card(5, 'U', 2), card(6, 'U', 3)],
    };
    const locked = buildSlim(cat).items.filter((it) => it.locked && it.entity === 'group:zz' && it.rarity === 'R');
    expect(locked.map((it) => (it.locked ? it.name : ''))).toEqual(['ZZ 1/3', 'ZZ 2/3', 'ZZ 3/3']);
  });
});
