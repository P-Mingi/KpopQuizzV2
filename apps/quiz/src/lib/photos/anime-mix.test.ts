// o1/adminpics: the picture of the general anime quizzes (Anime Mix, the Tokyo night photo of public/series/anime-mix.webp) can be replaced from
// the admin as a series picture: it is listed in the Séries anime tab, the upload is accepted for it, and the display reads it by its slug first.
import { describe, expect, it } from 'vitest';

import { seriesPhotoOf } from '@/lib/anime/series-images';
import { setOwnerSeriesPictures } from '@/lib/anime/entity-images-store';
import { ImageError } from '@/lib/entity-images/errors';
import { assertEntity } from '@/lib/entity-images/store';
import { animeSeed, fakeDb } from '@/lib/entity-images/test-support';

import { withAnimeMixRow } from './admin-data';

import type { AdminRow } from './admin-data';

const code = async (p: Promise<unknown>): Promise<string> => { try { await p; } catch (e) { return e instanceof ImageError ? e.code : 'other'; } return 'none'; };
const seed = () => {
  const s = animeSeed();
  return { ...s, groups: [...s.groups, { id: 9, slug: 'anime-mix', name: 'Anime Mix', site_id: 'anime' }] };
};
const rowOf = (slug: string, name: string): AdminRow => ({ kind: 'series', slug, name, context: '', legacy: null, review: false, fresh: false, image: null });

describe('the admin list of the series', () => {
  it('adds Anime Mix, with its bundled photo as the current picture, in name order', () => {
    const rows = withAnimeMixRow([rowOf('death-note', 'Death Note'), rowOf('one-piece', 'One Piece')], [{ name: 'Anime Mix', slug: 'anime-mix' }], () => null);
    expect(rows.map((r) => r.slug)).toEqual(['anime-mix', 'death-note', 'one-piece']);
    const mix = rows[0]!;
    expect(mix.kind).toBe('series');
    expect(mix.legacy?.url).toMatch(/\/series\/anime-mix\.webp$/);
    expect(mix.image).toBeNull();
  });

  it('keeps the owner picture of the slot when there is one, adds nothing without the group, and never twice', () => {
    const image = { url: 'https://x.test/a.webp', thumbUrl: null, focalX: 50, focalY: 50, sourceUrl: null, author: 'Me', license: 'own_photo', licenseNote: null, verified: true } as never;
    expect(withAnimeMixRow([], [{ name: 'Anime Mix', slug: 'anime-mix' }], () => image)[0]!.image).toBe(image);
    expect(withAnimeMixRow([rowOf('death-note', 'Death Note')], [{ name: 'Death Note', slug: 'death-note' }], () => null)).toHaveLength(1);
    const listed = [rowOf('anime-mix', 'Anime Mix')];
    expect(withAnimeMixRow(listed, [{ name: 'Anime Mix', slug: 'anime-mix' }], () => null)).toHaveLength(1);
  });
});

describe('the upload', () => {
  it('accepts the series picture of Anime Mix though the group has no series row, and still refuses any other group without one', async () => {
    const db = fakeDb(seed());
    await expect(assertEntity(db, 'series', 'anime-mix')).resolves.toBeUndefined();
    expect(await code(assertEntity(db, 'series', 'bts'))).toBe('unknown_entity');
    const bare = fakeDb(animeSeed());
    expect(await code(assertEntity(bare, 'series', 'anime-mix'))).toBe('unknown_entity');
    expect(await code(assertEntity(db, 'character', 'anime-mix/nobody'))).toBe('unknown_entity');
  });
});

describe('the display', () => {
  it('shows the bundled Tokyo night photo until the owner sets one, then the owner picture', () => {
    setOwnerSeriesPictures({});
    expect(seriesPhotoOf('anime-mix', 'Anime Mix')?.file).toMatch(/\/series\/anime-mix\.webp$/);
    setOwnerSeriesPictures({ 'anime-mix': { src: 'https://cdn.test/mix.webp', position: '50% 50%', width: 736, height: 981, credit: null } as never });
    expect(seriesPhotoOf('anime-mix', 'Anime Mix')?.file).toBe('https://cdn.test/mix.webp');
    setOwnerSeriesPictures({});
  });
});
