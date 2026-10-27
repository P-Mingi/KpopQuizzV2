import { describe, expect, it, vi } from 'vitest';

import { listImages } from './list';
import { processImage } from './process';
import { saveImage } from './store';
import { GOOD_META, animeSeed, fakeDb, makeImage } from './test-support';

import type { ImageMeta } from './types';

vi.mock('@/lib/anime/series-images', () => ({
  seriesImageOf: (slug: string) => (slug === 'one-piece' ? { file: '/series/one-piece.webp', alt: 'A ship', attribution: null } : null),
}));

describe('listImages', () => {
  it('lists the series of the anime site only, sorted by name, with characters, state and counts', async () => {
    const db = fakeDb(animeSeed());
    const image = await processImage(await makeImage(1000, 1400, 'png'), 'character');
    await saveImage(db, { kind: 'character', slug: 'death-note/l', image, meta: GOOD_META as unknown as ImageMeta, userId: 'u' }, vi.fn());
    const out = await listImages(db);
    expect(out.site).toBe('anime');
    expect(out.series.map((s) => s.slug)).toEqual(['death-note', 'one-piece']);
    const dn = out.series[0]!;
    expect(dn.characters.map((c) => c.slug)).toEqual(['death-note/light-yagami', 'death-note/l']);
    expect(dn.characters[1]!.image).toMatchObject({ kind: 'character', slug: 'death-note/l', width: 360 });
    expect(dn.characters[0]!.image).toBeNull();
    expect([dn.characterCount, dn.characterImageCount, dn.source, dn.image, dn.bundled]).toEqual([2, 1, 'none', null, null]);
    const op = out.series[1]!;
    expect([op.source, op.bundled]).toEqual(['bundled', { url: '/series/one-piece.webp', alt: 'A ship' }]);
    expect(out.counts).toEqual({ series: 2, seriesWithImage: 1, seriesWithUpload: 0, characters: 2, charactersWithImage: 1 });
  });

  it('an uploaded cover wins over the bundled photo in the counts', async () => {
    const db = fakeDb(animeSeed());
    const image = await processImage(await makeImage(1000, 1400, 'png'), 'series');
    await saveImage(db, { kind: 'series', slug: 'one-piece', image, meta: GOOD_META as unknown as ImageMeta, userId: 'u' }, vi.fn());
    const out = await listImages(db);
    expect(out.series[1]!.source).toBe('upload');
    expect(out.counts).toMatchObject({ seriesWithImage: 1, seriesWithUpload: 1 });
  });

  it('reads past the 1000-row cap (characters are paged)', async () => {
    const seed = animeSeed();
    seed.characters = Array.from({ length: 2300 }, (_, i) => ({ id: i + 1, group_id: 1, slug: `c-${i}`, name: `C ${i}`, role: 'other', status: 'published', ord: i }));
    const out = await listImages(fakeDb(seed));
    expect(out.counts.characters).toBe(2300);
  });
});
