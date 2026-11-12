import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  ops: [] as Array<{ table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> }>,
  updateError: null as { code: string } | null,
  row: null as unknown,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const rec = { table, op: 'select', arg: undefined as unknown, filters: [] as Array<[string, unknown]> };
      h.ops.push(rec);
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.update = (a: unknown) => { rec.op = 'update'; rec.arg = a; return b; };
      for (const m of ['eq', 'gt']) b[m] = (c: string, v: unknown) => { rec.filters.push([c, v]); return b; };
      b.order = () => b;
      b.limit = () => Promise.resolve({ data: [{ id: 3 }], error: null });
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

beforeEach(() => { h.site = 'hub'; h.ops = []; h.updateError = null; h.row = null; });

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
