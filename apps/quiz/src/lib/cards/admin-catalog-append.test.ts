// KpopCards file 114 in the admin: the actions catalog_state, append_preview and append of POST /api/admin/cards/photos. The preview never
// writes (p_dry_run true), the write needs confirm: true, the route is refused for anyone requireAdmin refuses, and a foreign origin is refused.
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  rpc: [] as Array<{ fn: string; args: unknown }>,
  rpcResult: { data: null as unknown, error: null as { message: string } | null },
  owned: [] as unknown[],
  packs: [] as unknown[],
  admin: true,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return 'hub'; } }));
vi.mock('@/lib/admin/guard', async (orig) => ({
  ...(await orig<typeof import('@/lib/admin/guard')>()),
  requireAdmin: async () => (h.admin ? { ok: true } : { ok: false, res: new Response('Not found', { status: 404 }) }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: unknown) => { h.rpc.push({ fn, args }); return h.rpcResult; },
    from: (t: string) => ({ select: () => ({ limit: async () => ({ data: t === 'cards_owned' ? h.owned : h.packs, error: null }) }) }),
  }),
}));

import { POST } from '@/app/api/admin/cards/photos/route';

const req = (body: unknown, origin = 'http://localhost') =>
  new NextRequest('http://localhost/api/admin/cards/photos', {
    method: 'POST', headers: { host: 'localhost', origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
const post = (body: unknown, origin?: string): Promise<NextResponse> => POST(req(body, origin));

const SUMMARY = { dry_run: true, cards: 6, subjects: 3, new_subjects: 1, extended_subjects: 2, waiting: 1, from_no: 183, to_no: 188 };

beforeEach(() => { h.rpc = []; h.rpcResult = { data: SUMMARY, error: null }; h.owned = []; h.packs = []; h.admin = true; });

describe('catalog_state', () => {
  it('is not frozen before the first pack, frozen once a card is owned or a pack opened', async () => {
    expect(await (await post({ action: 'catalog_state' })).json()).toEqual({ ok: true, frozen: false });
    h.packs = [{ id: 'x' }];
    expect(await (await post({ action: 'catalog_state' })).json()).toEqual({ ok: true, frozen: true });
    h.packs = []; h.owned = [{ card_no: 1 }];
    expect(await (await post({ action: 'catalog_state' })).json()).toEqual({ ok: true, frozen: true });
  });
});

describe('append_preview and append', () => {
  it('the preview calls cards_catalog_append with p_dry_run true and answers the summary', async () => {
    const res = await post({ action: 'append_preview' });
    expect(res.status).toBe(200);
    expect(h.rpc).toEqual([{ fn: 'cards_catalog_append', args: { p_dry_run: true } }]);
    expect(await res.json()).toEqual({ ok: true, summary: SUMMARY });
  });
  it('the write needs confirm: true; without it nothing is called', async () => {
    for (const body of [{ action: 'append' }, { action: 'append', confirm: 'true' }, { action: 'append', confirm: 1 }]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(h.rpc).toEqual([]);
    const ok = await post({ action: 'append', confirm: true });
    expect(ok.status).toBe(200);
    expect(h.rpc).toEqual([{ fn: 'cards_catalog_append', args: { p_dry_run: false } }]);
  });
  it('answers 409 not_ready when file 114 is not applied', async () => {
    h.rpcResult = { data: null, error: { message: 'Could not find the function public.cards_catalog_append' } };
    const res = await post({ action: 'append_preview' });
    expect([res.status, (await res.json()).error]).toEqual([409, 'not_ready']);
  });
  it('is refused for a foreign origin and for anyone requireAdmin refuses, calling nothing', async () => {
    expect((await post({ action: 'append', confirm: true }, 'https://evil.example')).status).toBe(403);
    h.admin = false;
    expect((await post({ action: 'append', confirm: true })).status).toBe(404);
    expect((await post({ action: 'catalog_state' })).status).toBe(404);
    expect(h.rpc).toEqual([]);
  });
});
