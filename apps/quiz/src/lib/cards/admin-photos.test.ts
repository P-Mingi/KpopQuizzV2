import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  ops: [] as Array<{ table: string; op: string; arg?: unknown; cols?: string | undefined; filters: Array<[string, unknown]> }>,
  updateError: null as { code: string } | null,
  row: null as unknown,
  list: [{ id: 3 }] as unknown[],
  tables: {} as Record<string, unknown[]>,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const rec = { table, op: 'select', arg: undefined as unknown, cols: undefined as string | undefined, filters: [] as Array<[string, unknown]> };
      h.ops.push(rec);
      const b: Record<string, unknown> = {};
      b.select = (cols?: string) => { rec.cols ??= cols; return b; };
      b.update = (a: unknown) => { rec.op = 'update'; rec.arg = a; return b; };
      for (const m of ['eq', 'gt', 'in']) b[m] = (c: string, v: unknown) => { rec.filters.push([c, v]); return b; };
      b.then = (res: (v: unknown) => void) => res({ data: h.tables[table] ?? [], error: null });
      b.order = () => b;
      b.limit = () => Promise.resolve({ data: h.list, error: null });
      b.maybeSingle = async () => ({ data: rec.op === 'update' && h.updateError ? null : (h.row ?? { id: 1 }), error: rec.op === 'update' ? h.updateError : null });
      return b;
    },
  }),
}));

import { handleAdminPhotos } from './admin-photos';

const post = (body: unknown) =>
  handleAdminPhotos(new NextRequest('http://localhost/api/admin/cards/photos', {
    method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));

beforeEach(() => { h.site = 'hub'; h.ops = []; h.updateError = null; h.row = null; h.list = [{ id: 3 }]; h.tables = {}; });

describe('admin photo review', () => {
  it('404 off the hub', async () => {
    h.site = 'kpop';
    expect((await post({ action: 'list' })).status).toBe(404);
    expect(h.ops).toEqual([]);
  });
  it('setting the focal point writes focal_x and focal_y and nothing else', async () => {
    const res = await post({ action: 'focal', id: 4, x: 60, y: 20 });
    expect(res.status).toBe(200);
    expect(h.ops[0]).toMatchObject({ op: 'update', arg: { focal_x: 60, focal_y: 20 } });
    expect(Object.keys(h.ops[0]!.arg as object).sort()).toEqual(['focal_x', 'focal_y']);
    for (const b of [{ x: 101, y: 0 }, { x: -1, y: 0 }, { x: 1.5, y: 0 }, { x: 'a', y: 0 }]) expect((await post({ action: 'focal', id: 4, ...b })).status).toBe(400);
  });
  it('lists pending photos by default and filters small_2x on request', async () => {
    await post({ action: 'list' });
    expect(h.ops[0]!.filters).toContainEqual(['status', 'pending']);
    expect(h.ops[0]!.filters).not.toContainEqual(['small_2x', true]);
    await post({ action: 'list', small2x: true });
    expect(h.ops[1]!.filters).toContainEqual(['small_2x', true]);
    expect((await post({ action: 'list', small2x: 'yes' })).status).toBe(400);
  });
  it('list answers file_url as the public address of the source photo, and keeps the stored one without a source_path', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co/');
    h.list = [{ id: 1, file_url: 'https://commons.example/a.jpg', source_path: 'images/group-photos/jennie.jpg' }, { id: 2, file_url: 'https://commons.example/b.jpg', source_path: null }];
    const j = await (await post({ action: 'list' })).json();
    expect(j.rows[0].file_url).toBe('https://x.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg');
    expect(j.rows[1].file_url).toBe('https://commons.example/b.jpg');
    vi.unstubAllEnvs();
  });
  it('approve, reject and remove set the status; a second live photo in the slot is 409', async () => {
    await post({ action: 'approve', id: 2, note: 'ok' });
    expect(h.ops[0]).toMatchObject({ op: 'update', arg: { status: 'approved', review_note: 'ok' } });
    await post({ action: 'remove', id: 2 });
    expect(h.ops[1]!.arg).toEqual({ status: 'removed' });
    h.updateError = { code: '23505' };
    expect((await post({ action: 'approve', id: 3 })).status).toBe(409);
  });
  it('lock sets and clears a reason, hiatus included, and refuses unknown ones', async () => {
    h.row = { id: 'idol:rami', lock_reasons: { SR: 'one' } };
    const res = await post({ action: 'lock', entity: 'idol:rami', rarity: 'L', reason: 'hiatus' });
    expect(await res.json()).toMatchObject({ lock_reasons: { SR: 'one', L: 'hiatus' } });
    const clear = await post({ action: 'lock', entity: 'idol:rami', rarity: 'SR', reason: null });
    expect(await clear.json()).toMatchObject({ lock_reasons: {} });
    expect((await post({ action: 'lock', entity: 'idol:rami', rarity: 'L', reason: 'because' })).status).toBe(400);
    expect((await post({ action: 'lock', entity: 'event:x', rarity: 'L', reason: 'one' })).status).toBe(400);
  });
  it('a cross-site write and an unknown action are refused', async () => {
    const r = await handleAdminPhotos(new NextRequest('http://localhost/x', { method: 'POST', headers: { host: 'localhost', origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"action":"list"}' }));
    expect(r.status).toBe(403);
    expect((await post({ action: 'nope' })).status).toBe(400);
  });
});

describe('review 1 finding 6: the Cartes tab works on the anime build (the photos admin is bunnyverse.org/anime)', () => {
  beforeEach(() => { h.site = 'anime'; });
  it('the anime build answers every action; kpopquiz.org stays a 404', async () => {
    expect((await post({ action: 'list', status: 'approved' })).status).toBe(200);
    expect((await post({ action: 'focal', id: 4, x: 50, y: 30 })).status).toBe(200);
    expect((await post({ action: 'remove', id: 2 })).status).toBe(200);
    expect((await post({ action: 'reports' })).status).toBe(200);
    expect((await post({ action: 'close_report', id: 1 })).status).toBe(200);
    h.site = 'kpop';
    h.ops = [];
    expect((await post({ action: 'list' })).status).toBe(404);
    expect(h.ops).toEqual([]);
  });
  it('the list carries the entity kind and lock reasons for the lock editor', async () => {
    await post({ action: 'list', status: 'approved' });
    expect(h.ops[0]).toMatchObject({ table: 'cards_photos' });
    expect(h.ops[0]!.cols).toContain('cards_entities(name, kind, group_id, lock_reasons)');
  });
  it('the reports inbox: open reports by default, each with its card and its photo', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    h.list = [
      { id: 7, photo_id: 12, card_no: 42, role: 'person', message: 'Please remove', contact: 'a@b.c', created_at: '2026-11-12T08:00:00Z', status: 'open' },
      { id: 8, photo_id: null, card_no: null, role: 'other', message: 'General', contact: null, created_at: '2026-11-12T09:00:00Z', status: 'open' },
    ];
    h.tables = {
      cards_catalog: [{ card_no: 42, num: 'BV1-0042', entity_id: 'idol:jennie', cards_entities: { name: 'Jennie' } }],
      cards_photos: [{ id: 12, entity_id: 'idol:jennie', source_path: 'images/group-photos/jennie.jpg', file_url: 'https://c/x.jpg', author: 'A', licence: 'CC BY 4.0', status: 'removed' }],
    };
    const j = await (await post({ action: 'reports' })).json();
    expect(h.ops[0]!.filters).toContainEqual(['status', 'open']);
    expect(j.rows).toEqual([
      { ...(h.list[0] as object), card: { n: 42, num: 'BV1-0042', entity: 'idol:jennie', name: 'Jennie' },
        photo: { id: 12, entity: 'idol:jennie', url: 'https://x.supabase.co/storage/v1/object/public/images/group-photos/jennie.jpg', author: 'A', licence: 'CC BY 4.0', status: 'removed' } },
      { ...(h.list[1] as object), card: null, photo: null },
    ]);
    expect(h.ops.filter((o) => o.table !== 'cards_reports').map((o) => [o.table, o.filters])).toEqual([
      ['cards_catalog', [['card_no', [42]]]], ['cards_photos', [['id', [12]]]]]);
    vi.unstubAllEnvs();
  });
  it('remove retires the photo (status removed), close_report closes, lock takes a group too', async () => {
    await post({ action: 'remove', id: 5, note: 'report 7' });
    expect(h.ops[0]).toMatchObject({ table: 'cards_photos', op: 'update', arg: { status: 'removed', review_note: 'report 7' }, filters: [['id', 5]] });
    await post({ action: 'close_report', id: 7 });
    expect(h.ops[1]).toMatchObject({ table: 'cards_reports', op: 'update', arg: { status: 'closed' }, filters: [['id', 7]] });
    h.row = { id: 'group:btob', lock_reasons: {} };
    const r = await post({ action: 'lock', entity: 'group:btob', rarity: 'SR', reason: 'hiatus' });
    expect(await r.json()).toMatchObject({ ok: true, entity: 'group:btob', lock_reasons: { SR: 'hiatus' } });
  });
});
