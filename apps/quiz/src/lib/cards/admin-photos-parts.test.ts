// Bunnyverse Cards lot 7: the admin's number of cards of a group photo (action parts) and the list's parts fields with the rule's warning.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; patch: Record<string, unknown>; filters: Array<[string, unknown]> }>,
  tables: {} as Record<string, unknown[]>,
  updateResult: { data: { id: 5, parts: 3 } as unknown, error: null as { message: string } | null },
  photos: [] as unknown[],
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return 'hub'; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const rec: { table: string; patch: Record<string, unknown>; filters: Array<[string, unknown]> } = { table, patch: {}, filters: [] };
      let isUpdate = false;
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.update = (patch: Record<string, unknown>) => { isUpdate = true; rec.patch = patch; h.updates.push(rec); return b; };
      for (const m of ['eq', 'gt', 'in']) b[m] = (c: string, v: unknown) => { rec.filters.push([c, v]); return b; };
      b.order = () => b;
      b.maybeSingle = async () => h.updateResult;
      b.limit = () => Promise.resolve({ data: table === 'cards_photos' ? h.photos : (h.tables[table] ?? []), error: null });
      b.then = (res: (v: unknown) => void) => res(isUpdate ? h.updateResult : { data: h.tables[table] ?? [], error: null });
      return b;
    },
  }),
}));

import { handleAdminPhotos, partsFieldsOf, partsWarningOf } from './admin-photos';

const post = (body: unknown) =>
  handleAdminPhotos(new NextRequest('http://localhost/api/admin/cards/photos', {
    method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));

beforeEach(() => { h.updates = []; h.tables = { cards_packs: [], cards_catalog: [] }; h.updateResult = { data: { id: 5, parts: 3 }, error: null }; h.photos = []; });

describe('admin photos, lot 7: the parts action', () => {
  it('sets parts with a WHERE on the id', async () => {
    const res = await post({ action: 'parts', photo: 5, parts: 3 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, photo: { id: 5, parts: 3 } });
    expect(h.updates).toEqual([{ table: 'cards_photos', patch: { parts: 3 }, filters: [['id', 5]] }]);
  });
  it('refuses a bad photo or a number of cards other than 2 or 3 (400), and writes nothing', async () => {
    for (const b of [{ photo: 5, parts: 4 }, { photo: 5, parts: 1 }, { photo: 5 }, { photo: 0, parts: 2 }, { photo: '5', parts: 2 }, { parts: 2 }]) {
      expect((await post({ action: 'parts', ...b })).status).toBe(400);
    }
    expect(h.updates).toEqual([]);
  });
  it('409 once a pack was opened and the photo is on a catalog card, before any write', async () => {
    h.tables = { cards_packs: [{ id: 'p' }], cards_catalog: [{ card_no: 7 }] };
    const res = await post({ action: 'parts', photo: 5, parts: 3 });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'locked' });
    expect(h.updates).toEqual([]);
  });
  it('a pack opened with the photo on no catalog card is allowed (it gives no card)', async () => {
    h.tables = { cards_packs: [{ id: 'p' }], cards_catalog: [] };
    expect((await post({ action: 'parts', photo: 5, parts: 2 })).status).toBe(200);
  });
  it('409 with the database\'s own message when the database refuses, and not_ready before file 118', async () => {
    h.updateResult = { data: null, error: { message: 'cards_photos: a pack was opened, the parts of a photo on a card cannot change' } };
    const a = await post({ action: 'parts', photo: 5, parts: 3 });
    expect([a.status, await a.json()]).toEqual([409, { error: 'locked', message: 'cards_photos: a pack was opened, the parts of a photo on a card cannot change' }]);
    h.updateResult = { data: null, error: { message: 'column "parts" of relation "cards_photos" does not exist' } };
    const b = await post({ action: 'parts', photo: 5, parts: 3 });
    expect([b.status, await b.json()]).toEqual([409, { error: 'not_ready', message: 'column "parts" of relation "cards_photos" does not exist' }]);
  });
  it('404 for a photo that does not exist', async () => {
    h.updateResult = { data: null, error: null };
    expect((await post({ action: 'parts', photo: 99, parts: 2 })).status).toBe(404);
  });
});

describe('admin photos, lot 7: the rule\'s warning', () => {
  // A 2000 x 1000 photo (ratio 2): the 11:8.5 window is 1294 px wide (64.7%), the 16.5:8.5 window 1941 px (97.1%).
  const wide = { source_width: 2000, source_height: 1000, focal_x: 50, focal_y: 50 };
  const heads = { x0: 5, x1: 95, y0: 20, y1: 60, hw: 4 };
  it('null without a heads_box or without the photo\'s size', () => {
    expect(partsWarningOf({ ...wide, parts: 2 })).toBeNull();
    expect(partsWarningOf({ parts: 2, heads_box: heads, focal_x: 50, focal_y: 50 })).toBeNull();
    expect(partsWarningOf({ ...wide, parts: 2, heads_box: { x0: 1 } })).toBeNull();
  });
  it('warns in 2 cards when the heads span more than the 11:8.5 window, and offers 3 cards', () => {
    const w = partsWarningOf({ ...wide, parts: null, heads_box: heads });
    expect(w).toMatch(/^The 11:8.5 window of 2 cards would cut someone at the focal point 50\/50/);
    expect(w).toMatch(/3 cards/);
    expect(w).not.toMatch(/[–—]/);
  });
  it('is null in 3 cards when the 16.5:8.5 window keeps everyone, and warns again when it does not', () => {
    expect(partsWarningOf({ ...wide, parts: 3, heads_box: heads })).toBeNull();
    const w = partsWarningOf({ ...wide, parts: 3, heads_box: { ...heads, x0: 0, x1: 100, hw: 8 } });
    expect(w).toMatch(/^The 16.5:8.5 window of 3 cards would cut someone/);
    expect(w).not.toMatch(/or give this photo 3 cards/);
  });
  it('is read at the CURRENT focal point: moving it fixes a narrow group', () => {
    const narrow = { x0: 60, x1: 90, y0: 20, y1: 60, hw: 4 };
    expect(partsWarningOf({ ...wide, parts: 2, heads_box: narrow, focal_x: 0 })).not.toBeNull();
    expect(partsWarningOf({ ...wide, parts: 2, heads_box: narrow, focal_x: 100 })).toBeNull();
  });
  it('partsFieldsOf reads a row of a database without file 118 as nulls', () => {
    expect(partsFieldsOf({ id: 1, focal_x: 50 })).toEqual({ parts: null, heads_box: null, parts_note: null, file_parts: null, file_pano: false, partsWarning: null });
    expect(partsFieldsOf({ parts: 3, file_parts: 2, file_pano: true, parts_note: '3 cards', heads_box: heads })).toMatchObject({ parts: 3, file_parts: 2, file_pano: true, parts_note: '3 cards', heads_box: heads });
  });
  it('the list answers the fields on every photo row', async () => {
    h.photos = [{ id: 5, entity_id: 'idol:a', cards_entities: { kind: 'idol' }, ...wide, parts: 2, heads_box: heads, parts_note: 'n', file_parts: 2, file_pano: true }, { id: 6, entity_id: 'idol:b', cards_entities: { kind: 'idol' } }];
    const j = await (await post({ action: 'list', status: 'approved' })).json();
    expect(j.rows[0]).toMatchObject({ parts: 2, heads_box: heads, parts_note: 'n', file_parts: 2, file_pano: true });
    expect(j.rows[0].partsWarning).toMatch(/would cut someone/);
    expect(j.rows[1]).toMatchObject({ parts: null, heads_box: null, parts_note: null, file_parts: null, file_pano: false, partsWarning: null });
  });
});
