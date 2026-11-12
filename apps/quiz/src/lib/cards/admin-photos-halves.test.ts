import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  ops: [] as Array<{ table: string; cols?: string | undefined; filters: Array<[string, unknown]> }>,
  photos: [] as unknown[],
  catalog: [] as unknown[],
  catalogError: false,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), SITE_ID: 'hub' }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const rec = { table, cols: undefined as string | undefined, filters: [] as Array<[string, unknown]> };
      h.ops.push(rec);
      const b: Record<string, unknown> = {};
      b.select = (cols?: string) => { rec.cols ??= cols; return b; };
      for (const m of ['eq', 'gt', 'in']) b[m] = (c: string, v: unknown) => { rec.filters.push([c, v]); return b; };
      b.then = (res: (v: unknown) => void) => res(h.catalogError ? { data: null, error: { code: '42703' } } : { data: h.catalog, error: null });
      b.order = () => b;
      b.limit = () => Promise.resolve({ data: h.photos, error: null });
      return b;
    },
  }),
}));

import { halvesTooSmall, isGroupPhoto } from '@/components/admin/photos/cards-panel';

import { handleAdminPhotos } from './admin-photos';

const list = async () => (await handleAdminPhotos(new NextRequest('http://localhost/api/admin/cards/photos', {
  method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'list', status: 'approved' }),
}))).json();

beforeEach(() => { h.ops = []; h.catalogError = false; h.catalog = []; h.photos = []; });

describe('admin list: the per half small_2x flags of a group photo', () => {
  it('each half answers its own flag from the cards_catalog rows, selected with *', async () => {
    h.photos = [{ id: 5, entity_id: 'group:nct', small_2x: false, cards_entities: { kind: 'group' } }, { id: 6, entity_id: 'idol:jennie', small_2x: true, cards_entities: { kind: 'idol' } }];
    h.catalog = [
      { photo_id: 5, part: 1, small_2x: true }, { photo_id: 5, part: 1, small_2x: true },
      { photo_id: 5, part: 2, small_2x: false }, { photo_id: 6, part: 0, small_2x: true },
    ];
    const j = await list();
    expect(j.rows[0].halves).toEqual([{ part: 1, small_2x: true }, { part: 2, small_2x: false }]);
    expect(j.rows[1].halves).toBeUndefined();
    const cat = h.ops.find((o) => o.table === 'cards_catalog')!;
    expect(cat.cols).toBe('*');
    expect(cat.filters).toEqual([['photo_id', [5]]]);
  });
  it('without file 102 (no part, no small_2x, or a failed read) the photo small_2x answers for both halves', async () => {
    h.photos = [{ id: 5, entity_id: 'group:nct', small_2x: true, cards_entities: { kind: 'group' } }];
    h.catalog = [{ photo_id: 5 }];
    expect((await list()).rows[0].halves).toEqual([{ part: 1, small_2x: true }, { part: 2, small_2x: true }]);
    h.catalogError = true;
    expect((await list()).rows[0].halves).toEqual([{ part: 1, small_2x: true }, { part: 2, small_2x: true }]);
  });
  it('a list of persons reads no cards_catalog', async () => {
    h.photos = [{ id: 6, entity_id: 'idol:jennie', small_2x: false, cards_entities: { kind: 'idol' } }];
    await list();
    expect(h.ops.map((o) => o.table)).toEqual(['cards_photos']);
  });
});

describe('the tab helpers', () => {
  it('a group photo is told by its entity; the flags per half come from the row, else from the picture', () => {
    expect(isGroupPhoto({ entity_id: 'group:nct', cards_entities: null })).toBe(true);
    expect(isGroupPhoto({ entity_id: 'idol:jennie', cards_entities: { name: 'J', kind: 'idol' } })).toBe(false);
    expect(halvesTooSmall({ halves: [{ part: 1, small_2x: true }, { part: 2, small_2x: false }] }, undefined)).toEqual([true, false]);
    expect(halvesTooSmall({}, [1200, 3000])).toEqual([true, true]);
    expect(halvesTooSmall({}, [1400, 3000])).toEqual([false, false]);
  });
});
