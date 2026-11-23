// KpopCards: the /api/cards/* routes against a recording stand-in for Supabase (nothing leaves the process): the guards in their order (404 build and
// flag, 404 private launch, 401, 403 Team, 403 cross-site, 429), the idempotency key, the shapes of the contract and the refusals mapped to their codes.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  user: null as { id: string } | null,
  team: false,
  serviceMade: 0,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcResult: {} as Record<string, { data?: unknown; error?: { message: string } | null }>,
  tables: {} as Record<string, unknown[]>,
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  insertError: null as { code: string; message: string } | null,
  maybe: {} as Record<string, unknown>,
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => h.team }));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  for (const m of ['select', 'eq', 'in', 'order', 'gt', 'limit', 'update']) b[m] = self;
  b.insert = (row: Record<string, unknown>) => {
    h.inserts.push({ table, row });
    return Promise.resolve({ error: h.insertError });
  };
  b.maybeSingle = async () => ({ data: h.maybe[table] ?? null, error: null });
  b.then = (res: (v: unknown) => unknown) => res({ data: h.tables[table] ?? [], error: null });
  b.range = async (from: number, to: number) => ({ data: (h.tables[table] ?? []).slice(from, to + 1), error: null });
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
  createServiceRoleClient: () => {
    h.serviceMade += 1;
    return db;
  },
}));

import { GET as catalog } from './catalog/route';
import { POST as craft } from './craft/route';
import { POST as favorite } from './favorite/route';
import { POST as grant } from './ad/grant/route';
import { POST as ticket } from './ad/ticket/route';
import { POST as open } from './open/route';
import { GET as recycleGet, POST as recycle } from './recycle/route';
import { POST as report } from './report/route';
import { POST as wish } from './wish/route';
import { GET as state } from './state/route';
import { GET as collection } from './collection/route';
import { GET as almost } from './almost/route';
import { GET as missions } from './missions/route';
import { POST as claim } from './missions/claim/route';
import { GET as level } from './level/route';
import { GET as ranking } from './ranking/route';
import { GET as friends } from './friends/route';
import { POST as friendCode } from './friends/code/route';
import { POST as friendRedeem } from './friends/redeem/route';
import { GET as odds } from './odds/route';
import { GET as cardMoment } from './card/[n]/route';
import { GET as help } from './help/route';
import { POST as prefs } from './prefs/route';
import { POST as lock } from './lock/route';
import { POST as seen } from './seen/route';
import { POST as stillThere } from './still-there/route';
import { resetCatalogCache } from '@/lib/cards/catalog';
import { resetReportLimit } from '@/lib/cards/report';
import { resetRateLimits } from '@/lib/kpopcards/rate-limit';
import { resetWorldCache } from '@/lib/kpopcards/server';

const ORIGIN = 'http://localhost:3021';
const req = (path: string, body?: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const K = '11111111-2222-3333-4444-555555555555';
const withKey = (path: string, body: unknown, key = K): NextRequest => req(path, body, { 'idempotency-key': key });
const UUID = K;

const CARD_ROWS = [
  { card_no: 1, num: 'BV1-0001', entity_id: 'idol:A', rarity: 'C', edition: 'std', photo_id: null },
  { card_no: 2, num: 'BV1-0002', entity_id: 'idol:A', rarity: 'R', edition: 'holo', photo_id: null },
  { card_no: 3, num: 'BV1-0003', entity_id: 'group:G', rarity: 'C', edition: 'std', photo_id: null },
  { card_no: 4, num: 'BV1-0004', entity_id: 'idol:A', rarity: 'UR', edition: 'gold', photo_id: null },
  { card_no: 5, num: 'BV1-0005', entity_id: 'idol:A', rarity: 'U', edition: 'stage', photo_id: null },
];
const ENTITY_ROWS = [
  { id: 'group:G', kind: 'group', name: 'Group', group_id: null, debut_year: 2015, sort_key: 'g', lock_reasons: {} },
  { id: 'idol:A', kind: 'idol', name: 'Idol A', group_id: 'group:G', debut_year: 2015, sort_key: 'g1', lock_reasons: {} },
];
const PLAYER = {
  wallet: { stock: 3, anchor: '2026-11-12T10:30:00+00:00', paris_day: '2026-11-12', ads_today: 2, timer_today: 4, shards: 12, packs_opened: 7, seen_at: '2026-11-12T10:30:00+00:00', created_at: '2026-11-01T10:00:00+00:00' },
  owned: [{ n: 4, copies: 2, fav: true, locked: false, seen: true, first: '2026-11-12T09:00:00+00:00', last: '2026-11-12T09:00:00+00:00', fpn: 3 }],
  wishlist: [2], gold_count: 3, claimed: [],
  week: { week_start: '2026-11-09', packs_opened: 7, kpopdle_wins: 1, new_cards: 3, claimed: false },
  prefs: { sound: true, vibration: true, theme: 'all', focus: null },
  recent: [{ opened_at: '2026-11-12T09:00:00+00:00', best: 'UR', source: 'stock', new_count: 2 }],
  bonus_earned: 0, bonus_today: 0, daily_used: false, focus_used: false, last: { at: '2026-11-12T09:00:00+00:00', pack_no: 3, cards: [1, 2, 3, 4, 5] },
};
const OPENED = {
  replayed: false, owned_before: 1, owned_after: 5, finished: [],
  packs: [{ id: 'pack-1', pack_no: 8, source: 'stock', theme: 'all', group: null, golden: false, guarantee: false, new_count: 4,
    cards: [1, 2, 3, 4, 5].map((n) => ({ n, isNew: n !== 4, completesPair: false, golden: false, guarantee: false })) }],
};
const MOCKED = ['2026-11-12T10:30:00Z'];
void MOCKED;

beforeEach(() => {
  // The player's rows are of 2026-11-12: freeze the clock (only Date) in the same Paris day.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:30:00Z'));
  h.site = 'hub';
  h.user = { id: 'u1' };
  h.team = false;
  h.serviceMade = 0;
  h.rpcCalls = [];
  h.inserts = [];
  h.insertError = null;
  h.maybe = { profiles: { username: 'tester' } };
  h.tables = { cards_catalog: CARD_ROWS, cards_entities: ENTITY_ROWS, cards_photos: [], cards_group_types: [{ entity_id: 'group:G', gender: 'girl' }] };
  h.rpcResult = {
    cards_player: { data: PLAYER }, cards_open: { data: OPENED }, cards_prefs_get: { data: { sound: true, vibration: true, theme: 'all', focus: null } },
    cards_prefs_set: { data: { sound: false, vibration: true, theme: 'all', focus: null } },
    cards_craft: { data: { replayed: false, card_no: 2, rarity: 'R', cost: 50, shards: 12, finished: [] } },
    cards_wish: { data: { on: true, count: 1 } }, cards_favorite: { data: true },
    cards_recycle: { data: { replayed: false, recycled: 4, shards: 16, shards_total: 28, skipped: { locked: 0, goldAndFullArt: 1 } } },
    cards_claim: { data: { replayed: false, target: 'holo', packs: 3, shards: 0 } },
    cards_ad_grant: { data: { replayed: false, gained: 25, shards: 37, ads_today: 3 } },
    cards_lock: { data: { n: 4, locked: true, locks: 1 } }, cards_seen: { data: 0 }, cards_still_there: { data: { ok: true, was_paused: false } },
    cards_ranking: { data: [] }, cards_friends: { data: { friends: [], code: null } },
    cards_friend_code_new: { data: { code: 'ABCDEFGH', expires_at: '2026-11-13T10:00:00+00:00' } },
    cards_friend_redeem: { data: { ok: false, error: 'code_invalid' } },
    cards_moment: { data: { n: 2, event: { name: 'KCON, Los Angeles', date: '2019-08-17', precision: 'month' }, yours: { first_at: '2026-11-02T10:00:00+00:00', pack_no: 12, how: 'pack', copies: 3 }, quiz_slug: 'idol-a' } },
    cards_issue_ticket: { data: UUID }, cards_daily_group: { data: 'group:G' },
  };
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('NET_CARDS_BRIDGES', '1');
  vi.stubEnv('NET_CARDS_ADS', '1');
  vi.stubEnv('NET_IP_HASH_SALT', 'test-salt');
  resetCatalogCache();
  resetWorldCache();
  resetReportLimit();
  resetRateLimits();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const ROUTES: Array<[string, () => Promise<Response>]> = [
  ['state', () => state(req('/api/cards/state'))],
  ['open', () => open(withKey('/api/cards/open', { source: 'stock' }))],
  ['ad/ticket', () => ticket(req('/api/cards/ad/ticket', {}))],
  ['craft', () => craft(withKey('/api/cards/craft', { n: 2 }))],
  ['wish', () => wish(req('/api/cards/wish', { n: 3, on: true }))],
  ['recycle', () => recycle(withKey('/api/cards/recycle', { confirm: true }))],
  ['recycle preview', () => recycleGet(req('/api/cards/recycle'))],
  ['favorite', () => favorite(req('/api/cards/favorite', { n: 4, on: true }))],
  ['collection', () => collection(req('/api/cards/collection'))],
  ['almost', () => almost(req('/api/cards/almost'))],
  ['missions', () => missions(req('/api/cards/missions'))],
  ['missions/claim', () => claim(withKey('/api/cards/missions/claim', { target: 'holo' }))],
  ['level', () => level(req('/api/cards/level'))],
  ['ranking', () => ranking(req('/api/cards/ranking'))],
  ['friends', () => friends(req('/api/cards/friends'))],
  ['friends/code', () => friendCode(req('/api/cards/friends/code', {}))],
  ['odds', () => odds(req('/api/cards/odds'))],
  ['card', () => cardMoment(req('/api/cards/card/2'), { params: Promise.resolve({ n: '2' }) })],
  ['help', () => help(req('/api/cards/help'))],
  ['prefs', () => prefs(req('/api/cards/prefs', { sound: false }))],
  ['lock', () => lock(req('/api/cards/lock', { n: 4, on: true }))],
  ['seen', () => seen(req('/api/cards/seen', { ns: [4] }))],
  ['still-there', () => stillThere(req('/api/cards/still-there', {}))],
  ['report', () => report(req('/api/cards/report', { n: 4, role: 'person', message: 'x' }))],
  ['catalog', () => catalog()],
];

describe('the build and the flag', () => {
  it.each(ROUTES)('%s is a 404 off the hub, and a 404 with NET_CARDS off, before any read', async (_n, call) => {
    for (const site of ['kpop', 'anime']) {
      h.site = site;
      const res = await call();
      expect(res.status).toBe(404);
    }
    h.site = 'hub';
    vi.stubEnv('NET_CARDS', '0');
    expect((await call()).status).toBe(404);
    vi.stubEnv('NET_CARDS', '');
    expect((await call()).status).toBe(404);
    expect(h.serviceMade).toBe(0);
    expect(h.rpcCalls).toEqual([]);
  });
});

describe('the session', () => {
  const SIGNED: Array<[string, () => Promise<Response>]> = ROUTES.filter(([n]) => n !== 'report' && n !== 'catalog');
  it.each(SIGNED)('%s answers 401 signed out, before any read', async (_n, call) => {
    h.user = null;
    const res = await call();
    expect(res.status).toBe(401);
    expect(h.serviceMade).toBe(0);
  });
  it.each(SIGNED)('%s answers 403 editorial_account to a Team account', async (_n, call) => {
    h.team = true;
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'editorial_account' });
    expect(h.rpcCalls).toEqual([]);
  });
  it('a cross-site POST is refused (403) and spends nothing', async () => {
    const res = await open(req('/api/cards/open', { source: 'stock' }, { origin: 'https://evil.example', 'idempotency-key': K }));
    expect(res.status).toBe(403);
    expect(h.rpcCalls).toEqual([]);
    const noOrigin = new NextRequest(`${ORIGIN}/api/cards/open`, { method: 'POST', headers: { host: 'localhost:3021', 'content-type': 'application/json', 'idempotency-key': K }, body: '{"source":"stock"}' });
    expect((await open(noOrigin)).status).toBe(403);
  });
  it('every signed-in answer is no-store', async () => {
    for (const [n, call] of ROUTES) {
      if (n === 'catalog') continue;
      expect((await call()).headers.get('cache-control'), n).toBe('no-store');
    }
  });
  it('a write that spends needs an idempotency key: 400 idem_missing, nothing read', async () => {
    for (const [path, call] of [
      ['open', () => open(req('/api/cards/open', { source: 'stock' }))],
      ['craft', () => craft(req('/api/cards/craft', { n: 2 }))],
      ['recycle', () => recycle(req('/api/cards/recycle', { confirm: true }))],
      ['claim', () => claim(req('/api/cards/missions/claim', { target: 'holo' }))],
      ['redeem', () => friendRedeem(req('/api/cards/friends/redeem', { code: 'ABCD-EFGH' }))],
    ] as Array<[string, () => Promise<Response>]>) {
      h.rpcCalls = [];
      const res = await call();
      expect([path, res.status, await res.json()]).toEqual([path, 400, { error: 'idem_missing' }]);
      expect(h.rpcCalls).toEqual([]);
    }
    expect((await open(req('/api/cards/open', { source: 'stock' }, { 'idempotency-key': 'x' }))).status).toBe(400);
    expect((await open(req('/api/cards/open', { source: 'stock', key: K }))).status).toBe(200); // the body key works too
  });
  it('a write is rate limited per player (429), the limit of one player is not the limit of another', async () => {
    let last = 200;
    for (let i = 0; i < 125; i++) last = (await lock(req('/api/cards/lock', { n: 4, on: true }))).status;
    expect(last).toBe(429);
    h.user = { id: 'u2' };
    expect((await lock(req('/api/cards/lock', { n: 4, on: true }))).status).toBe(200);
  });
});

describe('review 1 finding 10: the hub private launch', () => {
  const ALLOWED = 'aaaaaaaa-1111-2222-3333-444444444444';
  beforeEach(() => {
    vi.stubEnv('PRIVATE_LAUNCH', '1');
    vi.stubEnv('PRIVATE_LAUNCH_ALLOW', ALLOWED);
    vi.stubEnv('PRIVATE_LAUNCH_KEY', 'ab'.repeat(32));
    h.maybe.cards_catalog = { photo_id: 77 };
  });
  it.each(ROUTES)('%s answers 404 to a guest and to an account the private launch does not allow, before any read', async (_n, call) => {
    for (const user of [null, { id: 'bbbbbbbb-1111-2222-3333-444444444444' }]) {
      h.user = user;
      h.serviceMade = 0;
      expect((await call()).status).toBe(404);
      expect(h.serviceMade).toBe(0);
      expect(h.rpcCalls).toEqual([]);
      expect(h.inserts).toEqual([]);
    }
  });
  it.each(ROUTES)('%s works for an allowed account', async (_n, call) => {
    h.user = { id: ALLOWED };
    expect((await call()).status).toBe(200);
  });
  it('the catalog is never put in a shared cache while the gate is on; off, it is public again', async () => {
    h.user = { id: ALLOWED };
    expect((await catalog()).headers.get('cache-control')).toBe('no-store');
    vi.stubEnv('PRIVATE_LAUNCH', '0');
    h.user = null;
    resetCatalogCache();
    expect((await catalog()).headers.get('cache-control')).toMatch(/^public/);
  });
  it('a gate that fails closed (no key) lets nobody in', async () => {
    vi.stubEnv('PRIVATE_LAUNCH_KEY', '');
    h.user = { id: ALLOWED };
    expect((await state(req('/api/cards/state'))).status).toBe(404);
  });
});

describe('GET /api/cards/state: the lobby', () => {
  it('answers the lobby of the contract from the database rows', async () => {
    const res = await state(req('/api/cards/state'));
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b).toMatchObject({
      cap: 5, shards: 12, timerCap: 40, timerUsed: 4, theme: 'all', nickname: 'tester', wishlist: [2], focusUsed: false,
      golden: { next: false, packsUntil: 3, opened: 7 }, guarantee: { streak: 3, by: 30 }, level: { level: 1, title: 'Rookie' },
      prefs: { sound: true, vibration: true, theme: 'all', focus: null },
      owned: [{ n: 4, copies: 2, fav: true }], daily: { used: false, group: { id: 'group:G', name: 'Group' } },
    });
    expect(b.themes.map((t: { id: string }) => t.id)).toEqual(['all', 'girls', 'boys', 'solo']);
    // The bonus packs of the day are recorded first (cards_player counts the rows that call writes), then the player is read.
    expect(h.rpcCalls.map((c) => c.fn).slice(0, 2)).toEqual(['cards_bonus_sync', 'cards_player']);
    expect(h.rpcCalls.find((c) => c.fn === 'cards_player')).toMatchObject({ args: { p_user: 'u1', p_timer_cap: 40 } });
  });
  it('the settings flow through and adsEnabled follows NET_CARDS_ADS', async () => {
    vi.stubEnv('CARDS_TIMER_PER_DAY', '12');
    vi.stubEnv('CARDS_AD_PACKS_PER_DAY', '4');
    let b = await (await state(req('/api/cards/state'))).json();
    expect(h.rpcCalls.find((c) => c.fn === 'cards_player')?.args).toMatchObject({ p_timer_cap: 12 });
    // ads left = the cap (4) minus the ad packs earned today (cards_ad_events: none here), not the wallet's own counter (2)
    expect([b.timerCap, b.adsLeft, b.adsEnabled]).toEqual([12, 4, true]);
    vi.stubEnv('NET_CARDS_ADS', '');
    b = await (await state(req('/api/cards/state'))).json();
    expect(b.adsEnabled).toBe(false);
  });
  it('a database failure is a 500 with nothing else said', async () => {
    h.rpcResult.cards_player = { error: { message: 'boom secret' } };
    const res = await state(req('/api/cards/state'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server' });
  });
});

describe('POST /api/cards/open', () => {
  it('draws the plans on the server and calls cards_open ONCE with the key; answers packs, summary and state', async () => {
    const res = await open(withKey('/api/cards/open', { source: 'stock', theme: 'all', packs: 1 }));
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b.packs).toHaveLength(1);
    expect(b.packs[0]).toMatchObject({ id: 'pack-1', packNo: 8, golden: false, guarantee: false, best: 'gold' });
    expect(b.packs[0].cards[0]).toMatchObject({ n: 1, edition: 'std', isNew: true, theme: 'all' });
    expect(b.summary).toMatchObject({ newCards: 4, copies: 1, best: 'gold', headline: '4 new cards for your collection', levelUp: null });
    expect(b.replayed).toBe(false);
    const calls = h.rpcCalls.filter((c) => c.fn === 'cards_open');
    expect(calls).toHaveLength(1);
    const a = calls[0]!.args as { p_key: string; p_source: string; p_theme: string; p_draws: Array<{ c: number[]; g: number | null; u: number | null }>; p_timer_cap: number };
    expect(a).toMatchObject({ p_user: 'u1', p_key: K, p_source: 'stock', p_theme: 'all', p_timer_cap: 40 });
    expect(a.p_draws).toHaveLength(1);
    expect(a.p_draws[0]!.c).toHaveLength(5);
    expect(a.p_draws[0]!.g).not.toBeNull();
    expect(a.p_draws[0]!.u).toBe(4);
  });
  it('Open 5 sends five plans in the one call', async () => {
    h.rpcResult.cards_open = { data: { ...OPENED, packs: Array(5).fill(OPENED.packs[0]) } };
    const b = await (await open(withKey('/api/cards/open', { source: 'stock', packs: 5 }))).json();
    expect(b.packs).toHaveLength(5);
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_open')).toHaveLength(1);
    expect((h.rpcCalls.find((c) => c.fn === 'cards_open')!.args.p_draws as unknown[]).length).toBe(5);
  });
  it('a replayed key says so', async () => {
    h.rpcResult.cards_open = { data: { ...OPENED, replayed: true } };
    expect((await (await open(withKey('/api/cards/open', { source: 'stock' }))).json()).replayed).toBe(true);
  });
  it('refuses a bad body (400) before any read: source, packs, theme, focus, 5 packs of a daily pack', async () => {
    const bad: unknown[] = [{ source: 'ad' }, { source: 'gift' }, {}, { source: 5 }, { source: 'stock', packs: 3 }, { source: 'stock', theme: 'idols' }, { source: 'daily', packs: 5 },
      { source: 'focus' }, { source: 'focus', focus: 'idol:Q1' }, { source: 'shards', packs: 5 }];
    for (const b of bad) {
      const res = await open(withKey('/api/cards/open', b));
      expect([JSON.stringify(b), res.status < 500 && res.status >= 400]).toEqual([JSON.stringify(b), true]);
    }
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_open')).toEqual([]);
    expect((await open(req('/api/cards/open', [1], { 'idempotency-key': K }))).status).toBe(400);
  });
  it.each([
    ['cards: empty', 409, 'empty'], ['cards: stack_short', 409, 'stack_short'], ['cards: shards', 409, 'shards'], ['cards: daily_used', 409, 'daily_used'],
    ['cards: focus_used', 409, 'focus_used'], ['cards: idem_conflict', 409, 'idem_conflict'], ['cards: pack', 409, 'pack'],
  ])('a refusal "%s" is %i %s', async (message, status, error) => {
    h.rpcResult.cards_open = { error: { message } };
    const res = await open(withKey('/api/cards/open', { source: 'stock' }));
    expect([res.status, await res.json()]).toEqual([status, { error }]);
  });
  it('an unknown database error is a 500 that does not leak its message', async () => {
    h.rpcResult.cards_open = { error: { message: 'relation "x" does not exist' } };
    const res = await open(withKey('/api/cards/open', { source: 'stock' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/relation/);
  });
  it('the daily pack asks the database for the group of the Paris day; a focus pack carries its group', async () => {
    await open(withKey('/api/cards/open', { source: 'daily' }));
    expect(h.rpcCalls.find((c) => c.fn === 'cards_daily_group')).toBeDefined();
    expect(h.rpcCalls.find((c) => c.fn === 'cards_open')?.args).toMatchObject({ p_source: 'daily', p_theme: null, p_focus: null });
    await open(withKey('/api/cards/open', { source: 'focus', focus: 'group:G' }));
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_open')[1]?.args).toMatchObject({ p_source: 'focus', p_focus: 'group:G' });
  });
  it('a Kpopdle bonus pack: the database re-reads the wins first, then opens with the day cap; bridges off means cap 0', async () => {
    await open(withKey('/api/cards/open', { source: 'bonus' }));
    expect(h.rpcCalls.map((c) => c.fn).filter((f) => f === 'cards_bonus_sync' || f === 'cards_open')).toEqual(['cards_bonus_sync', 'cards_open']);
    expect(h.rpcCalls.find((c) => c.fn === 'cards_open')?.args).toMatchObject({ p_source: 'bonus', p_bonus_cap: 3 });
    vi.stubEnv('CARDS_BONUS_PER_DAY', '2');
    h.rpcCalls = [];
    await open(withKey('/api/cards/open', { source: 'bonus' }));
    expect(h.rpcCalls.find((c) => c.fn === 'cards_open')?.args).toMatchObject({ p_bonus_cap: 2 });
    vi.stubEnv('NET_CARDS_BRIDGES', '');
    h.rpcCalls = [];
    await open(withKey('/api/cards/open', { source: 'bonus' }));
    expect(h.rpcCalls.find((c) => c.fn === 'cards_open')?.args).toMatchObject({ p_bonus_cap: 0 });
    h.rpcResult.cards_open = { error: { message: 'cards: bonus' } };
    const res = await open(withKey('/api/cards/open', { source: 'bonus' }));
    expect([res.status, await res.json()]).toEqual([409, { error: 'bonus' }]);
    expect((await open(withKey('/api/cards/open', { source: 'bonus', packs: 5 }))).status).toBe(400);
  });
  it('the lobby tells the Kpopdle bridge and the quiz of the day bridge: the pack of the quiz is one of the earned bonus packs, inside the same cap', async () => {
    h.rpcResult.cards_player = { data: { ...PLAYER, bonus_earned: 2, bonus_today: 1 } };
    let b = await (await state(req('/api/cards/state'))).json();
    expect(b.bonusLeft).toBe(1);
    expect(b.bridges.kpopdle).toEqual({ enabled: true, earnedToday: 2, left: 1, perDay: 3 });
    expect(b.bridges.quizOfDay).toEqual({ enabled: true, done: false });
    // the database says the quiz of the day's pack is one of the 2 earned: Kpopdle's own count leaves it out, the allowance is shared
    h.rpcResult.cards_bonus_sync = { data: { earned: 2, quiz: true } };
    b = await (await state(req('/api/cards/state'))).json();
    expect(b.bonusLeft).toBe(1);
    expect(b.bridges.kpopdle).toEqual({ enabled: true, earnedToday: 1, left: 1, perDay: 3 });
    expect(b.bridges.quizOfDay).toEqual({ enabled: true, done: true });
    // the server records by itself, for the player of the session and the injected clock, never from a body
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_bonus_sync').at(-1)).toMatchObject({ args: { p_user: 'u1', p_now: '2026-11-12T10:30:00.000Z' } });
    vi.stubEnv('NET_CARDS_BRIDGES', '');
    h.rpcCalls = [];
    b = await (await state(req('/api/cards/state'))).json();
    expect(b.bridges.kpopdle).toMatchObject({ enabled: false, left: 0 });
    expect(b.bridges.quizOfDay).toEqual({ enabled: false, done: false });
    expect(h.rpcCalls.some((c) => c.fn === 'cards_bonus_sync' || c.fn === 'cards_bonus_record')).toBe(false);
  });
  it('the lobby still records the Kpopdle wins when 115 is not applied yet (cards_bonus_sync missing): the quiz is simply not done', async () => {
    h.rpcResult.cards_bonus_sync = { error: { message: 'function public.cards_bonus_sync does not exist' } };
    const b = await (await state(req('/api/cards/state'))).json();
    expect(h.rpcCalls.map((c) => c.fn).slice(0, 3)).toEqual(['cards_bonus_sync', 'cards_bonus_record', 'cards_player']);
    expect(b.bridges.quizOfDay).toEqual({ enabled: true, done: false });
  });
  it('a Team account is refused before anything is recorded; a guest too', async () => {
    h.team = true;
    expect((await state(req('/api/cards/state'))).status).toBe(403);
    h.team = false;
    h.user = null;
    expect((await state(req('/api/cards/state'))).status).toBe(401);
    expect(h.rpcCalls).toEqual([]);
  });
  it('a plain "Open a pack" uses the saved theme', async () => {
    h.rpcResult.cards_prefs_get = { data: { theme: 'girls' } };
    await open(withKey('/api/cards/open', { source: 'stock' }));
    expect(h.rpcCalls.find((c) => c.fn === 'cards_open')?.args).toMatchObject({ p_theme: 'girls' });
  });
});

describe('the rewarded ad', () => {
  it('ticket: disabled with the ad switch off, limit at the limit, a ticket otherwise', async () => {
    vi.stubEnv('NET_CARDS_ADS', '');
    let res = await ticket(req('/api/cards/ad/ticket', {}));
    expect([res.status, await res.json()]).toEqual([409, { error: 'disabled' }]);
    expect(h.rpcCalls).toEqual([]);
    vi.stubEnv('NET_CARDS_ADS', '1');
    h.rpcResult.cards_issue_ticket = { data: null };
    res = await ticket(req('/api/cards/ad/ticket', {}));
    expect([res.status, await res.json()]).toEqual([409, { error: 'limit' }]);
    h.rpcResult.cards_issue_ticket = { data: UUID };
    res = await ticket(req('/api/cards/ad/ticket', {}));
    expect([res.status, await res.json()]).toEqual([200, { ticket: UUID }]);
    expect(h.rpcCalls.at(-1)).toMatchObject({ fn: 'cards_issue_ticket', args: { p_user: 'u1', p_ads_limit: 3 } });
  });
  it('0 ads a day turns the ticket off', async () => {
    vi.stubEnv('CARDS_AD_PACKS_PER_DAY', '0');
    expect((await ticket(req('/api/cards/ad/ticket', {}))).status).toBe(409);
    expect(h.rpcCalls).toEqual([]);
  });
});

describe('the other writes of the contract', () => {
  it('grant is RETIRED (launch polish): a 404 whatever the flags, signed in or not, with or without a key, and it never touches the database', async () => {
    for (const ads of ['1', '', '0']) {
      for (const pub of ['1', '']) {
        vi.stubEnv('NET_CARDS_ADS', ads);
        vi.stubEnv('NEXT_PUBLIC_NET_CARDS_ADS', pub);
        for (const user of [{ id: 'u1' }, null]) {
          h.user = user;
          h.rpcCalls = [];
          for (const r of [withKey('/api/cards/ad/grant', { ticket: UUID }), req('/api/cards/ad/grant', { ticket: UUID })]) {
            const res = await grant(r);
            expect([ads, pub, res.status, await res.json()]).toEqual([ads, pub, 404, { error: 'not_found' }]);
          }
          expect(h.rpcCalls).toEqual([]);
        }
      }
    }
    expect(h.serviceMade).toBe(0);
  });
  it('craft: spends through cards_craft with the key; bad numbers are 400; the refusals are 409', async () => {
    const res = await craft(withKey('/api/cards/craft', { n: 2 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ n: 2, cost: 50, replayed: false, finished: [], state: { cap: 5 } });
    expect(h.rpcCalls.find((c) => c.fn === 'cards_craft')?.args).toMatchObject({ p_user: 'u1', p_key: K, p_card_no: 2, p_timer_cap: 40 });
    for (const n of ['x', 1.5, 0, undefined]) expect((await craft(withKey('/api/cards/craft', { n }))).status).toBe(400);
    for (const [m, e] of [['cards: shards', 'shards'], ['cards: owned', 'owned'], ['cards: card', 'card'], ['cards: no_craft', 'no_craft']] as const) {
      h.rpcResult.cards_craft = { error: { message: m } };
      const r = await craft(withKey('/api/cards/craft', { n: 4 }));
      expect([r.status, (await r.json()).error]).toEqual([e === 'card' ? 404 : 409, e]);
    }
  });
  it('wish and favorite validate and answer the contract shape', async () => {
    expect(await (await wish(req('/api/cards/wish', { n: 3, on: true }))).json()).toEqual({ n: 3, on: true, count: 1 });
    expect((await wish(req('/api/cards/wish', { n: 3 }))).status).toBe(400);
    h.rpcResult.cards_wish = { error: { message: 'cards: wish_limit' } };
    expect((await wish(req('/api/cards/wish', { n: 3, on: true }))).status).toBe(409);
    expect(await (await favorite(req('/api/cards/favorite', { n: 4, on: true }))).json()).toEqual({ n: 4, fav: true });
    h.rpcResult.cards_favorite = { data: false };
    expect((await favorite(req('/api/cards/favorite', { n: 5, on: false }))).status).toBe(409);
    for (const b of [{ n: 0, on: true }, { n: 1.5, on: true }, { n: 'a', on: true }, { n: 1 }, { n: 1, on: 'yes' }]) expect((await favorite(req('/api/cards/favorite', b))).status).toBe(400);
  });
  it('recycle needs confirm:true (400 confirm_required) and a key; the answer tells what was skipped; locked and last copy are refused', async () => {
    let res = await recycle(withKey('/api/cards/recycle', {}));
    expect([res.status, await res.json()]).toEqual([400, { error: 'confirm_required' }]);
    expect(h.rpcCalls.some((c) => c.fn === 'cards_recycle')).toBe(false);
    res = await recycle(withKey('/api/cards/recycle', { confirm: true }));
    expect(await res.json()).toMatchObject({ recycled: 4, shards: 16, skipped: { locked: 0, goldAndFullArt: 1 }, replayed: false });
    expect(h.rpcCalls.find((c) => c.fn === 'cards_recycle')?.args).toMatchObject({ p_key: K, p_n: null });
    await recycle(withKey('/api/cards/recycle', { confirm: true, n: 4 }));
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_recycle')[1]?.args).toMatchObject({ p_n: 4 });
    for (const [m, s, e] of [['cards: locked', 409, 'locked'], ['cards: lastcopy', 409, 'last_copy'], ['cards: nothing', 409, 'nothing_to_recycle'], ['cards: notowned', 409, 'not_owned']] as const) {
      h.rpcResult.cards_recycle = { error: { message: m } };
      const r = await recycle(withKey('/api/cards/recycle', { confirm: true }));
      expect([r.status, (await r.json()).error]).toEqual([s, e]);
    }
    expect((await recycle(withKey('/api/cards/recycle', { confirm: true, n: 'x' }))).status).toBe(400);
  });
  it('recycle preview: counts extras and tells what a bulk recycle leaves out', async () => {
    h.rpcResult.cards_player = { data: { ...PLAYER, owned: [
      { n: 1, copies: 4, fav: false, locked: false, seen: true, first: PLAYER.owned[0]!.first, last: PLAYER.owned[0]!.last, fpn: 1 },
      { n: 5, copies: 3, fav: false, locked: true, seen: true, first: PLAYER.owned[0]!.first, last: PLAYER.owned[0]!.last, fpn: 1 },
      { n: 4, copies: 3, fav: false, locked: false, seen: true, first: PLAYER.owned[0]!.first, last: PLAYER.owned[0]!.last, fpn: 1 },
    ] } };
    const b = await (await recycleGet(req('/api/cards/recycle'))).json();
    expect(b).toMatchObject({ extras: 3, shards: 3, skipped: { locked: 2, goldAndFullArt: 2 }, canRecycle: true });
    expect(b.confirm).toMatch(/One copy of each card stays/);
  });
  it('missions/claim: the target is checked; the refusals map to their codes; the week is its own target', async () => {
    const res = await claim(withKey('/api/cards/missions/claim', { target: 'holo' }));
    expect(await res.json()).toMatchObject({ target: 'holo', packs: 3, replayed: false, missions: { setsTotal: expect.any(Number) }, state: { cap: 5 } });
    expect(h.rpcCalls.find((c) => c.fn === 'cards_claim')?.args).toMatchObject({ p_key: K, p_target: 'holo' });
    for (const t of ['', 'nope', 'group:', 'year:99', 5]) expect((await claim(withKey('/api/cards/missions/claim', { target: t }))).status, String(t)).toBe(400);
    h.rpcResult.cards_claim = { error: { message: 'cards: goal' } };
    expect((await (await claim(withKey('/api/cards/missions/claim', { target: 'week' }))).json()).error).toBe('week_not_done');
    expect((await (await claim(withKey('/api/cards/missions/claim', { target: 'holo' }))).json()).error).toBe('set_not_done');
    h.rpcResult.cards_claim = { error: { message: 'cards: claimed' } };
    expect((await claim(withKey('/api/cards/missions/claim', { target: 'holo' }))).status).toBe(409);
  });
  it('prefs, lock, seen, still-there', async () => {
    expect(await (await prefs(req('/api/cards/prefs', { sound: false }))).json()).toMatchObject({ prefs: { sound: false } });
    expect(h.rpcCalls.find((c) => c.fn === 'cards_prefs_set')?.args).toMatchObject({ p_patch: { sound: false } });
    h.rpcResult.cards_prefs_set = { error: { message: 'cards: pref' } };
    expect((await prefs(req('/api/cards/prefs', { theme: 'x' }))).status).toBe(400);
    expect(await (await lock(req('/api/cards/lock', { n: 4, on: true }))).json()).toEqual({ n: 4, locked: true, locks: 1 });
    expect((await lock(req('/api/cards/lock', { n: 4 }))).status).toBe(400);
    h.rpcResult.cards_lock = { error: { message: 'cards: notowned' } };
    expect((await lock(req('/api/cards/lock', { n: 4, on: true }))).status).toBe(409);
    expect(await (await seen(req('/api/cards/seen', { ns: [1, 2] }))).json()).toEqual({ newCards: 0 });
    expect((await seen(req('/api/cards/seen', { ns: ['a'] }))).status).toBe(400);
    expect(await (await stillThere(req('/api/cards/still-there', {}))).json()).toMatchObject({ ok: true, state: { cap: 5 } });
  });
  it('friends: a code, a failed redeem is a code error with the status of the contract, the list', async () => {
    expect(await (await friendCode(req('/api/cards/friends/code', {}))).json()).toEqual({ code: 'ABCD-EFGH', expiresAt: '2026-11-13T10:00:00.000Z' });
    const code = h.rpcCalls.find((c) => c.fn === 'cards_friend_code_new')!.args.p_code as string;
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    for (const [err, status, e] of [['code_invalid', 404, 'code_invalid'], ['code_used', 409, 'code_used'], ['code_expired', 410, 'code_expired'], ['self', 400, 'self_friend'], ['rate', 429, 'rate_limited']] as const) {
      h.rpcResult.cards_friend_redeem = { data: { ok: false, error: err } };
      const r = await friendRedeem(withKey('/api/cards/friends/redeem', { code: 'ABCD-EFGH' }));
      expect([r.status, (await r.json()).error]).toEqual([status, e]);
    }
    expect((await friendRedeem(withKey('/api/cards/friends/redeem', { code: 5 }))).status).toBe(404);
    expect(await (await friends(req('/api/cards/friends'))).json()).toEqual({ friends: [], code: null, max: 100 });
  });
  it('ranking asks the database for the scope; the odds and the help answer', async () => {
    await ranking(req('/api/cards/ranking?scope=all'));
    expect(h.rpcCalls.find((c) => c.fn === 'cards_ranking')?.args).toMatchObject({ p_scope: 'all' });
    await ranking(req('/api/cards/ranking'));
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_ranking')[1]?.args).toMatchObject({ p_scope: 'friends' });
    const o = await (await odds(req('/api/cards/odds'))).json();
    expect(o.packs.map((p: { id: string }) => p.id)).toContain('golden');
    expect(o.guarantees.map((g: { id: string }) => g.id)).toEqual(['five', 'gold', 'golden', 'pair', 'focus', 'daily']);
    expect((await (await help(req('/api/cards/help'))).json()).rules).toMatchObject({ stackCap: 5, goldByPack: 30 });
  });
  it('the moment of a card: the event with its precision, my first copy, the quiz link; bad numbers are refused', async () => {
    const b = await (await cardMoment(req('/api/cards/card/2'), { params: Promise.resolve({ n: '2' }) })).json();
    expect(b).toEqual({
      n: 2, event: { name: 'KCON, Los Angeles', date: '2019-08-17', precision: 'month' },
      yours: { firstAt: '2026-11-02T10:00:00.000Z', packNo: 12, how: 'pack', copies: 3 }, quiz: { title: 'Idol A quizzes on kpopquiz.org', url: 'https://kpopquiz.org/idol-a' },
    });
    expect(h.rpcCalls.find((c) => c.fn === 'cards_moment')?.args).toMatchObject({ p_user: 'u1', p_card_no: 2 });
    h.rpcResult.cards_moment = { error: { message: 'cards: card' } };
    expect((await cardMoment(req('/api/cards/card/2'), { params: Promise.resolve({ n: '2' }) })).status).toBe(404);
    for (const n of ['x', '0', '-1', '1.5']) expect((await cardMoment(req('/api/cards/card/1'), { params: Promise.resolve({ n }) })).status).toBe(404);
  });
  it('collection parses its filters', async () => {
    const b = await (await collection(req('/api/cards/collection?show=missing&kind=idol&rar=gold,full,bogus&sort=rarity&page=1&per=500'))).json();
    expect(b.items.every((i: { type: string; owned?: boolean }) => i.type === 'not_issued' || i.owned === false)).toBe(true);
    expect(b.groups).toHaveLength(1);
  });
});

describe('POST /api/cards/report', () => {
  it('needs no sign-in, stores the report against the card photo, contact optional', async () => {
    h.user = null;
    h.maybe.cards_catalog = { photo_id: 77 };
    const res = await report(req('/api/cards/report', { n: 4, role: 'photographer', message: '  please credit me  ' }));
    expect(res.status).toBe(200);
    expect(h.inserts).toEqual([{ table: 'cards_reports', row: { photo_id: 77, card_no: 4, role: 'photographer', message: 'please credit me', contact: null } }]);
    await report(req('/api/cards/report', { photoId: 9, role: 'person', message: 'remove', contact: 'me@example.org' }));
    expect(h.inserts[1]?.row).toMatchObject({ photo_id: 9, card_no: null, contact: 'me@example.org' });
  });
  it('validates: role, message, contact length, a well-formed photo or card when one is named', async () => {
    const bad: unknown[] = [
      { n: 4, role: 'x', message: 'm' }, { n: 4, role: 'person', message: '' }, { n: 4, role: 'person', message: 'a'.repeat(2001) },
      { role: 'person', message: '   ' }, { n: -1, role: 'person', message: 'm' }, { n: 4, role: 'person', message: 'm', contact: 'c'.repeat(201) },
      { n: 4, role: 'person', message: 'm', contact: 5 }, [1], { photoId: 'x', role: 'person', message: 'm' }, { photoId: 0, role: 'person', message: 'm' },
    ];
    for (const b of bad) {
      resetReportLimit(); // every attempt counts against the limit, valid or not
      expect((await report(req('/api/cards/report', b))).status, JSON.stringify(b)).toBe(400);
    }
    expect(h.inserts).toEqual([]);
  });
  it('is rate limited per IP hash: 5 an hour, then 429; another address is not affected', async () => {
    const ok = { n: 4, role: 'other', message: 'm' };
    for (let i = 0; i < 5; i++) expect((await report(req('/api/cards/report', ok, { 'x-forwarded-for': '203.0.113.7' }))).status).toBe(200);
    expect((await report(req('/api/cards/report', ok, { 'x-forwarded-for': '203.0.113.7' }))).status).toBe(429);
    expect((await report(req('/api/cards/report', ok, { 'x-forwarded-for': '203.0.113.8' }))).status).toBe(200);
  });
  it('review 1 finding 8: a general report (the footer link: no card, no photo) is accepted; the message is required', async () => {
    h.user = null;
    const res = await report(req('/api/cards/report', { role: 'other', message: 'The credit of a card is wrong.' }));
    expect(res.status).toBe(200);
    expect(h.inserts).toEqual([{ table: 'cards_reports', row: { photo_id: null, card_no: null, role: 'other', message: 'The credit of a card is wrong.', contact: null } }]);
    expect((await report(req('/api/cards/report', { role: 'other' }))).status).toBe(400);
  });
  it('a retired photo (refused or removed: its row stays) is still accepted', async () => {
    h.maybe.cards_catalog = { photo_id: 12 }; // the card of a removed photo keeps its photo_id
    expect((await report(req('/api/cards/report', { photoId: 12, role: 'person', message: 'still there?' }))).status).toBe(200);
    expect((await report(req('/api/cards/report', { n: 40, role: 'person', message: 'still there?' }))).status).toBe(200);
    expect(h.inserts.map((i) => i.row.photo_id)).toEqual([12, 12]);
  });
  it('a report that names no known photo is a 400, not a 500', async () => {
    h.insertError = { code: '23503', message: 'fk' };
    expect((await report(req('/api/cards/report', { photoId: 123456, role: 'person', message: 'm' }))).status).toBe(400);
  });
});

describe('GET /api/cards/catalog', () => {
  it('is public, cached, and built from the three tables', async () => {
    h.user = null;
    h.tables = {
      cards_catalog: [{ card_no: 1, num: 'BV1-0001', entity_id: 'idol:Q1', rarity: 'C', edition: 'std', photo_id: 5 }],
      cards_entities: [
        { id: 'group:Q2', kind: 'group', name: 'GRP', group_id: null, debut_year: 2015, sort_key: 'a', lock_reasons: {} },
        { id: 'idol:Q1', kind: 'idol', name: 'Idol', group_id: 'group:Q2', debut_year: 2015, sort_key: 'a1', lock_reasons: { SR: 'one', L: 'bogus', XX: 'one' } },
      ],
      cards_photos: [{ id: 5, slot: 1, source: 'commons', source_page: 'https://c/x', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'https://l', share_alike: false, modified: 'cropped, frame and text added', focal_x: 40, focal_y: 30, storage_path: 'q1', source_path: 'images/group-photos/idol.jpg', file_focal_x: 40, file_focal_y: 30, small_2x: false }],
    };
    const res = await catalog();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/public.*s-maxage=300/);
    const body = await res.json();
    expect(body.cards).toEqual([{
      n: 1, num: 'BV1-0001', entity: 'idol:Q1', kind: 'idol', rarity: 'C', edition: 'std', name: 'Idol', group: 'GRP', debutYear: 2015,
      photo: { id: 5, slot: 1, author: 'A', authorUrl: null, licence: 'CC BY 4.0', licenceUrl: 'https://l', source: 'commons', sourcePage: 'https://c/x', shareAlike: false, modified: 'cropped, frame and text added' },
      image: { url: expect.stringMatching(/\/public\/cards\/q1-1x\.webp$/), url2x: expect.stringMatching(/\/public\/cards\/q1-2x\.webp$/), css: false, small2x: false, focalX: 40, focalY: 30, fileFocalX: 40, fileFocalY: 30, sourceUrl: expect.stringMatching(/\/public\/images\/group-photos\/idol\.jpg$/) },
    }]);
    expect(body.odds.available).toEqual(['C']);
    expect(body.entities.find((e: { id: string }) => e.id === 'idol:Q1')).toMatchObject({ group: 'GRP', lockReasons: { SR: 'one' } });
    const before = h.serviceMade;
    await catalog();
    expect(h.serviceMade).toBe(before); // served from the 5 minute cache
  });
});

