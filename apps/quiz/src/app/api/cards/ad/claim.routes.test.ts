// Launch polish, lane ADS: POST /api/cards/ad/claim (the web path of a rewarded ad: +1 pack) and the pack cap of POST /api/cards/ad/ticket, against a
// recording stand-in for Supabase. The rules proved here: off gives a 404; the ticket's owner only; not before AD_MIN_SECONDS after it was issued; once per
// ticket (the transaction id 'web:<ticket>'); the daily cap; the provider path (AppLixir is the signed-callback path, not this one).
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  user: null as { id: string } | null,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcResult: {} as Record<string, { data?: unknown; error?: { message: string } | null }>,
  ticketRow: null as { user_id: string; issued_at: string; used_at: string | null } | null,
  events: [] as unknown[],
  selected: [] as string[],
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => false }));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  b.select = (cols: string) => { h.selected.push(`${table}:${cols}`); return b; };
  b.eq = self;
  b.maybeSingle = async () => ({ data: table === 'cards_ad_tickets' ? h.ticketRow : null, error: null });
  b.then = (res: (v: unknown) => unknown) => res({ data: table === 'cards_ad_events' ? h.events : [], error: null });
  return b;
}
const db = {
  from: (t: string) => builder(t),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    h.rpcCalls.push({ fn, args });
    const r = h.rpcResult[fn];
    return { data: r?.data ?? null, error: r?.error ?? null };
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
  createServiceRoleClient: () => db,
}));

import { POST as claim } from './claim/route';
import { POST as ticket } from './ticket/route';

const ORIGIN = 'http://localhost:3021';
const post = (path: string, body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, { method: 'POST', headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const T = '4c1f3e0a-6a5b-4d0f-9d79-0a8c2f1e7b11';
const ME = 'u1';
const NOW = Date.parse('2026-11-20T12:00:00Z');
const ago = (s: number): string => new Date(NOW - s * 1000).toISOString();
const call = (t: unknown = T, headers: Record<string, string> = {}): Promise<Response> => claim(post('/api/cards/ad/claim', { ticket: t }, headers));
const KEYS = ['NET_CARDS', 'NET_CARDS_ADS', 'CARDS_ADS_PER_DAY', 'NEXT_PUBLIC_ADSENSE_PUB_ID', 'NEXT_PUBLIC_CARDS_AD_PROVIDER', 'CARDS_AD_PACKS_PER_DAY', 'CARDS_AD_MIN_SECONDS', 'PRIVATE_LAUNCH'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  process.env.NET_CARDS = '1';
  process.env.NET_CARDS_ADS = '1';
  process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'ca-pub-1234567890123456';
  h.site = 'hub';
  h.user = { id: ME };
  h.rpcCalls.length = 0;
  h.selected.length = 0;
  h.events = [];
  h.rpcResult = { cards_ad_pack_grant: { data: { granted: true, replayed: false, stock: 4, ads_today: 1 } }, cards_issue_ticket: { data: T } };
  h.ticketRow = { user_id: ME, issued_at: ago(20), used_at: null };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
});

describe('POST /api/cards/ad/claim: off gives a 404 and touches nothing', () => {
  it.each([
    ['NET_CARDS_ADS off', () => { process.env.NET_CARDS_ADS = '0'; }],
    ['NET_CARDS off', () => { process.env.NET_CARDS = '0'; }],
    ['no publisher id', () => { delete process.env.NEXT_PUBLIC_ADSENSE_PUB_ID; }],
    ['a malformed publisher id', () => { process.env.NEXT_PUBLIC_ADSENSE_PUB_ID = 'pub-1234567890123456'; }],
    ['the provider is AppLixir (its path is the signed callback)', () => { process.env.NEXT_PUBLIC_CARDS_AD_PROVIDER = 'applixir'; }],
    ['no ad pack allowed a day', () => { process.env.CARDS_AD_PACKS_PER_DAY = '0'; }],
    ['not the hub build', () => { h.site = 'kpop'; }],
  ])('%s', async (_n, off) => {
    off();
    const res = await call();
    expect(res.status).toBe(404);
    expect(h.rpcCalls).toEqual([]);
    expect(h.selected).toEqual([]);
  });
  it('signed out: 401; a write from another site: 403; neither reaches the database', async () => {
    h.user = null;
    expect((await call()).status).toBe(401);
    h.user = { id: ME };
    expect((await call(T, { origin: 'https://evil.example' })).status).toBe(403);
    expect(h.rpcCalls).toEqual([]);
  });
});

describe('POST /api/cards/ad/claim: the rules', () => {
  it('a ticket that is not a uuid is refused before any read', async () => {
    for (const t of ['nope', 5, undefined, '', null]) expect((await claim(post('/api/cards/ad/claim', { ticket: t }))).status, String(t)).toBe(409);
    expect(h.selected).toEqual([]);
    expect(h.rpcCalls).toEqual([]);
  });
  it('a ticket of someone else, or an unknown ticket: refused, the database is not asked to grant', async () => {
    h.ticketRow = { user_id: 'someone-else', issued_at: ago(60), used_at: null };
    let res = await call();
    expect([res.status, await res.json()]).toEqual([409, { error: 'ticket' }]);
    h.ticketRow = null;
    res = await call();
    expect([res.status, await res.json()]).toEqual([409, { error: 'ticket' }]);
    expect(h.rpcCalls).toEqual([]);
  });
  it('not before 15 seconds after the ticket was issued (the ad cannot have played): too_soon, nothing is spent', async () => {
    h.ticketRow = { user_id: ME, issued_at: ago(14), used_at: null };
    const res = await call();
    expect([res.status, await res.json()]).toEqual([409, { error: 'too_soon', min_seconds: 15 }]);
    expect(h.rpcCalls).toEqual([]);
    h.ticketRow = { user_id: ME, issued_at: ago(15), used_at: null };
    expect((await call()).status).toBe(200);
    expect(h.rpcCalls).toHaveLength(1);
  });
  it('CARDS_AD_MIN_SECONDS sets the delay, between 5 and 120, and a bad value falls back to 15', async () => {
    h.ticketRow = { user_id: ME, issued_at: ago(29), used_at: null };
    process.env.CARDS_AD_MIN_SECONDS = '30';
    expect(((await (await call()).json()) as { min_seconds: number }).min_seconds).toBe(30);
    process.env.CARDS_AD_MIN_SECONDS = '1';
    h.ticketRow = { user_id: ME, issued_at: ago(4), used_at: null };
    expect(((await (await call()).json()) as { min_seconds: number }).min_seconds).toBe(5);
    process.env.CARDS_AD_MIN_SECONDS = '999';
    h.ticketRow = { user_id: ME, issued_at: ago(100), used_at: null };
    expect(((await (await call()).json()) as { min_seconds: number }).min_seconds).toBe(120);
    process.env.CARDS_AD_MIN_SECONDS = 'x';
    h.ticketRow = { user_id: ME, issued_at: ago(10), used_at: null };
    expect(((await (await call()).json()) as { min_seconds: number }).min_seconds).toBe(15);
  });
  it('a good claim grants through cards_ad_pack_grant: transaction id web:<ticket>, the web ad unit, the daily cap of 3, the ticket in lower case', async () => {
    const res = await call(T.toUpperCase());
    expect([res.status, await res.json()]).toEqual([200, { granted: true, replayed: false, stock: 4 }]);
    expect(h.rpcCalls).toEqual([{ fn: 'cards_ad_pack_grant', args: { p_ticket: T, p_tx: `web:${T}`, p_ad_unit: 'adsense-web', p_now: new Date(NOW).toISOString(), p_daily_cap: 3, p_timer_cap: 40 } }]);
  });
  it('CARDS_AD_PACKS_PER_DAY flows through to the database', async () => {
    process.env.CARDS_AD_PACKS_PER_DAY = '5';
    await call();
    expect(h.rpcCalls[0]!.args.p_daily_cap).toBe(5);
  });
  it('past the daily cap the answer is granted false with the reason, and no pack', async () => {
    h.rpcResult.cards_ad_pack_grant = { data: { granted: false, replayed: false, reason: 'daily_cap', ads_today: 3 } };
    const res = await call();
    expect([res.status, await res.json()]).toEqual([200, { granted: false, replayed: false, reason: 'daily_cap' }]);
  });
  it('a retry of the same claim: the spent ticket still reaches the database, which answers with the first answer (replayed), never a second pack', async () => {
    h.ticketRow = { user_id: ME, issued_at: ago(60), used_at: ago(30) };
    h.rpcResult.cards_ad_pack_grant = { data: { granted: false, replayed: true, was_granted: true } };
    const res = await call();
    expect([res.status, await res.json()]).toEqual([200, { granted: false, replayed: true }]);
    expect(h.rpcCalls[0]!.args.p_tx).toBe(`web:${T}`);
  });
  it('a spent ticket with a new transaction id, or one older than 2 hours: the database refuses it (409 ticket)', async () => {
    h.rpcResult.cards_ad_pack_grant = { error: { message: 'cards: ticket' } };
    const res = await call();
    expect([res.status, await res.json()]).toEqual([409, { error: 'ticket' }]);
  });
  it('any other database error is a 500 and says nothing of it', async () => {
    h.rpcResult.cards_ad_pack_grant = { error: { message: 'boom: secret detail' } };
    const res = await call();
    expect([res.status, await res.json()]).toEqual([500, { error: 'server' }]);
  });
});

describe('POST /api/cards/ad/ticket: no ad is shown once the day\'s ad packs are in', () => {
  it('with 2 ad packs today and a cap of 3 it issues a ticket; with 3 it answers limit and issues none', async () => {
    h.events = [{ transaction_id: 'a' }, { transaction_id: 'b' }];
    let res = await ticket(post('/api/cards/ad/ticket', {}));
    expect([res.status, await res.json()]).toEqual([200, { ticket: T }]);
    h.rpcCalls.length = 0;
    h.events = [{ transaction_id: 'a' }, { transaction_id: 'b' }, { transaction_id: 'c' }];
    res = await ticket(post('/api/cards/ad/ticket', {}));
    expect([res.status, await res.json()]).toEqual([409, { error: 'limit' }]);
    expect(h.rpcCalls).toEqual([]);
  });
  it('the cap follows CARDS_AD_PACKS_PER_DAY', async () => {
    process.env.CARDS_AD_PACKS_PER_DAY = '1';
    h.events = [{ transaction_id: 'a' }];
    expect((await ticket(post('/api/cards/ad/ticket', {}))).status).toBe(409);
  });
});
