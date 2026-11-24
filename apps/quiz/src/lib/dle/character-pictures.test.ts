// Otakudle result card (owner, 2026-11-24: Mikasa's card showed the series photo): a character whose 96 px tile is the thumb of a verified anime character
// row of entity_images_public gets that row's large picture and focal point on the result; any other character keeps the series card. No network.
import { describe, expect, it } from 'vitest';

import { characterPicturesOf } from './read';

import type { PublicPicture } from '@/lib/photos/public-read';

const BASE = 'https://proj.supabase.co/storage/v1/object/public/entity-images';
const pic = (slug: string, file: string, over: Partial<PublicPicture> = {}): PublicPicture => ({
  site: 'anime', kind: 'character', slug, url: `${BASE}/${file}.webp`, thumb: `${BASE}/${file}-96.webp`, position: '40% 25%', name: null,
  needsCredit: false, sourceUrl: null, author: null, license: null, licenseNote: null, updatedAt: '', ...over,
});
const ent = (id: string, thumb: string | null) => ({ id, name: `Character ${id}`, attrs: {}, thumb, search: [] });

describe('characterPicturesOf: the result picture of an Otakudle character', () => {
  const pictures = [
    pic('attack-on-titan/mikasa-ackerman', 'anime/character/aot-mikasa', { position: '50% 20%' }),
    pic('attack-on-titan/eren-yeager', 'anime/character/aot-eren'),
  ];

  it('gives the large picture and its focal point to the character whose tile is that picture\'s 96 px file', () => {
    const out = characterPicturesOf({ entities: [ent('101', `${BASE}/anime/character/aot-mikasa-96.webp`)] }, pictures);
    expect(out).toEqual({ '101': { url: `${BASE}/anime/character/aot-mikasa.webp`, position: '50% 20%' } });
  });

  it('every character with a matching tile gets one, keyed by the entity id of the pool', () => {
    const out = characterPicturesOf({
      entities: [ent('101', `${BASE}/anime/character/aot-mikasa-96.webp`), ent('102', `${BASE}/anime/character/aot-eren-96.webp`)],
    }, pictures);
    expect(Object.keys(out).sort()).toEqual(['101', '102']);
    expect(out['102']?.url).toBe(`${BASE}/anime/character/aot-eren.webp`);
  });

  it('a character with no tile, or a tile no verified row has, keeps the series card', () => {
    const out = characterPicturesOf({ entities: [ent('103', null), ent('104', `${BASE}/anime/character/unknown-96.webp`)] }, pictures);
    expect(out).toEqual({});
  });

  it('reads only anime character rows: an idol, a series or a kpop row with the same file never shows', () => {
    const tile = `${BASE}/anime/character/x-96.webp`;
    const others = [
      pic('x', 'anime/character/x', { kind: 'series' }),
      pic('x', 'anime/character/x', { kind: 'idol', site: 'kpop' }),
      pic('x', 'anime/character/x', { site: 'kpop' }),
      pic('x', 'anime/character/x', { thumb: null }),
    ];
    expect(characterPicturesOf({ entities: [ent('105', tile)] }, others)).toEqual({});
  });

  it('no pool: nothing', () => {
    expect(characterPicturesOf(null, pictures)).toEqual({});
  });
});
