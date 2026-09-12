import { describe, it, expect } from 'vitest';

import { encodeBoard, decodeBoard } from './share-state';
import { defaultTiers } from './defaults';
import type { TierListItem } from './types';

const items: TierListItem[] = [
  { id: 'idol:1', kind: 'member', name: 'Jimin', image_url: 'https://x/jm.jpg' },
  { id: 'idol:2', kind: 'member', name: 'V', image_url: null },
  { id: 'idol:3', kind: 'member', name: 'RM', image_url: null },
];
const tiers = defaultTiers();

describe('share-state encode/decode (URL state, no DB)', () => {
  it('round-trips a board, carrying only ranked items by default', () => {
    const enc = encodeBoard({ title: 'BTS members', tiers, placements: { S: ['idol:1'], A: ['idol:2'], unranked: ['idol:3'] }, items });
    const dec = decodeBoard(enc)!;
    expect(dec.title).toBe('BTS members');
    expect(dec.tiers[0]!.label).toBe('S');
    expect(dec.placements['S']).toEqual(['idol:1']);
    // idol:3 was unranked -> not carried in the default (short) link.
    expect(dec.items.map((i) => i.id).sort()).toEqual(['idol:1', 'idol:2']);
    expect(dec.items.find((i) => i.id === 'idol:1')!.image_url).toBe('https://x/jm.jpg');
  });
  it('allItems carries the whole set on an empty board (challenge link)', () => {
    const enc = encodeBoard({ title: 'BTS members', tiers, placements: {}, items }, { allItems: true });
    const dec = decodeBoard(enc)!;
    expect(dec.items.map((i) => i.id).sort()).toEqual(['idol:1', 'idol:2', 'idol:3']);
    expect(Object.keys(dec.placements)).toHaveLength(0);
  });
  it('returns null on garbage', () => {
    expect(decodeBoard('not-valid-base64!!')).toBeNull();
    expect(decodeBoard('')).toBeNull();
  });
});
