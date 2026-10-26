import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EntityImageRow } from './types';

const state = vi.hoisted(() => ({
  row: null as unknown,
  error: null as { message: string } | null,
  eqs: [] as Array<[string, unknown]>,
  caches: [] as Array<{ keys: string[]; tags: string[]; revalidate: number }>,
  throwCreate: false,
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>, keys: string[], opts: { tags: string[]; revalidate: number }) => { state.caches.push({ keys, tags: opts.tags, revalidate: opts.revalidate }); return fn; },
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    if (state.throwCreate) throw new Error('supabaseUrl is required.');
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => { state.eqs.push([c, v]); return q; },
      maybeSingle: async () => ({ data: state.row, error: state.error }),
    };
    return { from: () => q };
  },
}));
vi.mock('@/lib/anime/series-images', () => ({
  seriesImageOf: (slug: string) => {
    if (slug === 'one-piece') return { file: '/series/one-piece.webp', alt: 'A ship on the sea', attribution: null };
    if (slug === 'bleach') return { file: '/series/bleach.webp', alt: 'A butterfly', attribution: { author: 'Ann', license: 'CC BY 4.0', licenseUrl: 'https://l', sourceUrl: 'https://s' } };
    return null;
  },
}));

import { bundledSeriesImage, displayFromRow, getCharacterImage, getSeriesImage } from './display';

const row = (over: Partial<EntityImageRow> = {}): EntityImageRow => ({
  site_id: 'anime', kind: 'series', slug: 'one-piece', path: 'anime/series/one-piece/abc.webp', width: 736, height: 981,
  focal_x: '20.00', focal_y: '70.50', license: 'cc0', author: 'Jane', source_url: 'https://src.test/p', license_note: null, updated_at: '2026-10-26T00:00:00Z', ...over,
});

beforeEach(() => { state.row = null; state.error = null; state.eqs = []; state.caches = []; state.throwCreate = false; });

describe('the series image: owner image, else bundled photo, else null', () => {
  it('the owner image comes first, with its focal point as numbers', async () => {
    state.row = row();
    const img = await getSeriesImage('one-piece');
    expect(img).toMatchObject({ source: 'upload', width: 736, height: 981, focalX: 20, focalY: 70.5, license: 'cc0', author: 'Jane', sourceUrl: 'https://src.test/p', attribution: null });
    expect(img!.url).toContain('/storage/v1/object/public/entity-images/anime/series/one-piece/abc.webp');
    expect(img!.url2x).toContain('/anime/series/one-piece/abc-2x.webp');
  });

  it('without a row, the bundled photo (series only), with the focal point of the photo box today', async () => {
    const img = await getSeriesImage('one-piece');
    expect(img).toMatchObject({ source: 'bundled', url: '/series/one-piece.webp', url2x: null, alt: 'A ship on the sea', focalX: 50, focalY: 35, width: 736, height: 981 });
  });

  it('a bundled photo under CC BY keeps its attribution', async () => {
    expect((await getSeriesImage('bleach'))!.attribution).toEqual({ author: 'Ann', license: 'CC BY 4.0', sourceUrl: 'https://s' });
  });

  it('with neither, null (the neutral placeholder)', async () => {
    expect(await getSeriesImage('no-photo-here')).toBeNull();
  });

  it('a database error never fails the page: it falls back to the bundled photo, then to null', async () => {
    state.error = { message: 'down' };
    expect((await getSeriesImage('one-piece'))!.source).toBe('bundled');
    expect(await getSeriesImage('no-photo-here')).toBeNull();
    state.error = null;
    state.throwCreate = true;
    expect((await getSeriesImage('one-piece'))!.source).toBe('bundled');
  });

  it('reads only the anime site, the kind and the slug', async () => {
    await getSeriesImage('one-piece');
    expect(state.eqs).toEqual([['site_id', 'anime'], ['kind', 'series'], ['slug', 'one-piece']]);
  });
});

describe('the character image: owner image, else null', () => {
  it('the owner portrait, then null (no bundled portrait exists)', async () => {
    state.row = row({ kind: 'character', slug: 'one-piece/luffy', path: 'anime/character/one-piece/luffy/h.webp', width: 360, height: 480 });
    expect(await getCharacterImage('one-piece/luffy')).toMatchObject({ source: 'upload', width: 360, height: 480 });
    state.row = null;
    expect(await getCharacterImage('one-piece/luffy')).toBeNull();
    expect(state.eqs.slice(-3)).toEqual([['site_id', 'anime'], ['kind', 'character'], ['slug', 'one-piece/luffy']]);
  });
});

describe('the cache', () => {
  it('has one tag per image, and the key names the image', async () => {
    await getSeriesImage('one-piece');
    await getCharacterImage('one-piece/luffy');
    expect(state.caches.map((c) => c.tags)).toEqual([['entity-image:anime:series:one-piece'], ['entity-image:anime:character:one-piece/luffy']]);
    expect(state.caches[0]!.keys).toEqual(['entity-image', 'anime', 'series', 'one-piece']);
    expect(state.caches[0]!.revalidate).toBeGreaterThan(0);
  });
});

describe('attribution', () => {
  it('only CC BY and CC BY-SA uploads print a credit line', () => {
    expect(displayFromRow(row({ license: 'cc_by' })).attribution).toEqual({ author: 'Jane', license: 'CC BY', sourceUrl: 'https://src.test/p' });
    expect(displayFromRow(row({ license: 'cc_by_sa' })).attribution?.license).toBe('CC BY-SA');
    for (const license of ['cc0', 'public_domain', 'own_photo', 'licensed', 'other'] as const) expect(displayFromRow(row({ license })).attribution).toBeNull();
  });

  it('bundledSeriesImage is null for a series with no photo', () => {
    expect(bundledSeriesImage('nothing')).toBeNull();
  });
});
