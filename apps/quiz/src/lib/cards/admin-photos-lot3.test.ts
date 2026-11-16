// Bunnyverse Cards lot 3: the admin's part of "one edition, one photo". The "rebuild" action runs cards_build_catalog() (file 103) and
// answers 409 when the database refuses (a card owned, a pack opened) or before 103; a new photo with no bucket copy shows Commons' own
// 800 px copy in the admin; the panel reads the original's size from the database, not from that smaller copy.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  rpc: [] as string[],
  rpcResult: { data: null as unknown, error: null as { message: string } | null },
  list: [] as unknown[],
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return 'hub'; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string) => { h.rpc.push(fn); return h.rpcResult; },
    from: () => {
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'gt', 'in', 'order']) b[m] = () => b;
      b.limit = () => Promise.resolve({ data: h.list, error: null });
      b.then = (res: (v: unknown) => void) => res({ data: [], error: null });
      return b;
    },
  }),
}));

import { catalogFailure, dimsOf, halfImgStyle } from '@/components/admin/photos/cards-panel';

import { handleAdminPhotos, reviewCopyUrl } from './admin-photos';

const post = (body: unknown) =>
  handleAdminPhotos(new NextRequest('http://localhost/api/admin/cards/photos', {
    method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));

beforeEach(() => { h.rpc = []; h.rpcResult = { data: null, error: null }; h.list = []; });

describe('admin photos, lot 3', () => {
  it('rebuild runs cards_build_catalog and answers its summary', async () => {
    h.rpcResult = { data: { subjects: 3, waiting: 1, cards: 22, not_shown: 4 }, error: null };
    const res = await post({ action: 'rebuild' });
    expect(res.status).toBe(200);
    expect(h.rpc).toEqual(['cards_build_catalog']);
    expect(await res.json()).toEqual({ ok: true, summary: { subjects: 3, waiting: 1, cards: 22, not_shown: 4 } });
  });
  it('rebuild answers 409 locked once a player owns a card, 409 not_ready before file 103', async () => {
    h.rpcResult = { data: null, error: { message: 'cards_build_catalog: a player owns a card, the catalog numbers cannot change' } };
    const a = await post({ action: 'rebuild' });
    expect([a.status, (await a.json()).error]).toEqual([409, 'locked']);
    h.rpcResult = { data: null, error: { message: 'Could not find the function public.cards_build_catalog' } };
    const b = await post({ action: 'rebuild' });
    expect([b.status, (await b.json()).error]).toEqual([409, 'not_ready']);
  });
  it('sends the database\'s own message with a refusal, and the panel shows it, never a guess (integrator, 2026-11-17)', async () => {
    // safeupdate in production: the API's session refuses a DELETE without WHERE inside cards_build_catalog() (before file 117)
    h.rpcResult = { data: null, error: { message: 'DELETE requires a WHERE clause' } };
    const a = await post({ action: 'rebuild' });
    expect([a.status, await a.json()]).toEqual([409, { error: 'not_ready', message: 'DELETE requires a WHERE clause' }]);
    h.rpcResult = { data: null, error: { message: 'cards_build_catalog: a pack was opened, the catalog numbers cannot change' } };
    expect(await (await post({ action: 'rebuild' })).json()).toEqual({ error: 'locked', message: 'cards_build_catalog: a pack was opened, the catalog numbers cannot change' });
    h.rpcResult = { data: null, error: { message: 'Could not find the function public.cards_catalog_append' } };
    expect(await (await post({ action: 'append_preview' })).json()).toEqual({ error: 'not_ready', message: 'Could not find the function public.cards_catalog_append' });
    expect(catalogFailure('Le catalogue n\'a pas été reconstruit.', 'DELETE requires a WHERE clause'))
      .toBe('Le catalogue n\'a pas été reconstruit. Message de la base : « DELETE requires a WHERE clause »');
    expect(catalogFailure('Le catalogue n\'a pas été reconstruit.', null)).not.toMatch(/fichier 103|possédée/);
  });
  it('the preview of a pair shows each half at twice its width, never shrunk by the img reset (maxWidth none)', () => {
    expect(halfImgStyle(1, [40, 30])).toMatchObject({ width: '200%', maxWidth: 'none', left: 0, objectPosition: '40% 30%' });
    expect(halfImgStyle(2, [40, 30])).toMatchObject({ width: '200%', maxWidth: 'none', left: '-100%' });
  });
  it('lists a new photo with Commons\' 800 px copy, a lot 1 photo with its bucket copy', async () => {
    h.list = [
      { id: 1, entity_id: 'idol:iu', source_path: null, source_page: 'https://commons.wikimedia.org/wiki/File:250914_IU_%22Bye_Summer%22_01.jpg', file_url: 'https://upload.wikimedia.org/x.jpg' },
      { id: 2, entity_id: 'idol:iu', source_path: 'images/group-photos/iu.jpg', source_page: 'https://commons.wikimedia.org/wiki/File:IU.jpg', file_url: 'https://upload.wikimedia.org/y.jpg' },
    ];
    const res = await post({ action: 'list', status: 'pending' });
    const rows = (await res.json()).rows as Array<{ id: number; file_url: string }>;
    expect(rows[0]!.file_url).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/250914_IU_%22Bye_Summer%22_01.jpg?width=800');
    expect(rows[1]!.file_url).toMatch(/\/storage\/v1\/object\/public\/images\/group-photos\/iu\.jpg$/);
  });
  it('reviewCopyUrl keeps a non-Commons address as it is', () => {
    expect(reviewCopyUrl({ source_page: 'https://www.flickr.com/photos/x/1', file_url: 'https://live.staticflickr.com/1.jpg' })).toBe('https://live.staticflickr.com/1.jpg');
    expect(reviewCopyUrl({ source_page: null, file_url: null })).toBeNull();
  });
  it('the panel reads the original size from the database before the loaded copy', () => {
    expect(dimsOf({ source_width: 3822, source_height: 6000 }, [509, 800])).toEqual([3822, 6000]);
    expect(dimsOf({ source_width: null, source_height: null }, [509, 800])).toEqual([509, 800]);
  });
});
