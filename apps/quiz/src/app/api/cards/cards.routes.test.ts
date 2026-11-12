// Bunnyverse Cards: the /api/cards/* routes against a recording stand-in for Supabase (nothing leaves the process).
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
vi.mock('@/lib/cards/draw', () => ({
  drawServerPack: async () => [1, 7, 9, 3, 2],
  resetPoolCache: () => undefined,
  loadPool: async () => (await import('@/lib/cards/rules')).indexPool([
    { n: 1, kind: 'idol', rarity: 'C' }, { n: 2, kind: 'idol', rarity: 'U' }, { n: 3, kind: 'idol', rarity: 'R' }, { n: 4, kind: 'idol', rarity: 'UR' },
  ]),
}));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  for (const m of ['select', 'eq', 'in', 'order', 'gt', 'limit', 'update']) b[m] = self;
  b.insert = (row: Record<string, unknown>) => {
    h.inserts.push({ table, row });
    return Promise.resolve({ error: h.insertError });
  };
  b.maybeSingle = async () => ({ data: h.maybe[table] ?? null, error: null });
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
import { POST as favorite } from './favorite/route';
import { POST as grant } from './ad/grant/route';
import { POST as ticket } from './ad/ticket/route';
import { POST as open } from './open/route';
import { POST as recycle } from './recycle/route';
import { POST as report } from './report/route';
import { GET as state } from './state/route';
import { resetCatalogCache } from '@/lib/cards/catalog';
import { resetReportLimit } from '@/lib/cards/report';

const ORIGIN = 'http://localhost:3021';
const req = (path: string, body?: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const WALLET = {
  stock: 3, anchor: '2026-11-12T10:00:00+00:00', paris_day: '2026-11-12', ads_today: 2, bonus_today: 0, shards: 12, ads_left: 8, bonus_left: 1,
  next_at: '2026-11-12T10:10:00+00:00', midnight_at: '2026-11-12T23:00:00+00:00',
};
const PACK = { id: 'pack-1', source: 'stock', cards: [1, 7, 9, 3, 2].map((n, i) => ({ n, isNew: i !== 1 })) };
const UUID = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  h.site = 'hub';
  h.user = { id: 'u1' };
  h.team = false;
  h.serviceMade = 0;
  h.rpcCalls = [];
  h.inserts = [];
  h.insertError = null;
  h.maybe = {};
  h.tables = { cards_owned: [{ card_no: 4, copies: 2, favorite: true, last_at: '2026-11-12T09:00:00Z' }] };
  h.rpcResult = { cards_wallet: { data: WALLET }, cards_apply_pack: { data: PACK } };
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('NET_CARDS_BRIDGES', '1');
  vi.stubEnv('NET_CARDS_ADS', '1');
  vi.stubEnv('NET_IP_HASH_SALT', 'test-salt');
  resetCatalogCache();
  resetReportLimit();
});
afterEach(() => vi.unstubAllEnvs());

const ROUTES: Array<[string, () => Promise<Response>]> = [
  ['state', () => state(req('/api/cards/state'))],
  ['open', () => open(req('/api/cards/open', { source: 'stock' }))],
  ['ad/ticket', () => ticket(req('/api/cards/ad/ticket', {}))],
  ['ad/grant', () => grant(req('/api/cards/ad/grant', { ticket: UUID }))],
  ['recycle', () => recycle(req('/api/cards/recycle', {}))],
  ['favorite', () => favorite(req('/api/cards/favorite', { n: 4, on: true }))],
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
    const res = await open(req('/api/cards/open', { source: 'stock' }, { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(h.rpcCalls).toEqual([]);
    const noOrigin = new NextRequest(`${ORIGIN}/api/cards/open`, { method: 'POST', headers: { host: 'localhost:3021', 'content-type': 'application/json' }, body: '{"source":"stock"}' });
    expect((await open(noOrigin)).status).toBe(403);
  });
  it('every signed-in answer is no-store', async () => {
    for (const [n, call] of ROUTES) {
      if (n === 'catalog') continue;
      expect((await call()).headers.get('cache-control'), n).toBe('no-store');
    }
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
    h.rpcResult.cards_issue_ticket = { data: UUID };
    h.rpcResult.cards_recycle = { data: { recycled: 0, shards_gained: 0, shards: 12 } };
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

describe('GET /api/cards/state', () => {
  it('returns the wallet from the database and the binder', async () => {
    const res = await state(req('/api/cards/state'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      stock: 3, cap: 5, nextAt: '2026-11-12T10:10:00.000Z', midnightAt: '2026-11-12T23:00:00.000Z', adsLeft: 8, adsEnabled: true,
      shards: 12, bonusLeft: 1, owned: [{ n: 4, copies: 2, fav: true, at: '2026-11-12T09:00:00.000Z' }],
      odds: expect.objectContaining({ available: ['C', 'U', 'R', 'UR'] }),
    });
    const odds = (await (await state(req('/api/cards/state'))).json()).odds;
    expect(odds.card.C).toBeCloseTo((60 / 95.2) * 100, 9);
    expect(odds.fifth.U).toBeCloseTo((84 / 95.2) * 100, 9);
    expect(h.rpcCalls[0]).toMatchObject({ fn: 'cards_wallet', args: { p_user: 'u1', p_ads_limit: 10, p_bonus_cap: 3 } });
  });
  it('the settings flow through, bonus packs are 0 while the bridges are off, adsEnabled follows NET_CARDS_ADS', async () => {
    vi.stubEnv('CARDS_ADS_PER_DAY', '4');
    vi.stubEnv('CARDS_BONUS_PER_DAY', '2');
    await state(req('/api/cards/state'));
    expect(h.rpcCalls[0]?.args).toMatchObject({ p_ads_limit: 4, p_bonus_cap: 2 });
    vi.stubEnv('NET_CARDS_BRIDGES', '');
    vi.stubEnv('NET_CARDS_ADS', '');
    h.rpcCalls = [];
    const body = await (await state(req('/api/cards/state'))).json();
    expect(h.rpcCalls[0]?.args).toMatchObject({ p_bonus_cap: 0 });
    expect(body.adsEnabled).toBe(false);
  });
  it('a database failure is a 500 with nothing else said', async () => {
    h.rpcResult.cards_wallet = { error: { message: 'boom secret' } };
    const res = await state(req('/api/cards/state'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server' });
  });
});

describe('POST /api/cards/open', () => {
  it('draws on the server, stores through cards_apply_pack, answers pack and state', async () => {
    const res = await open(req('/api/cards/open', { source: 'stock' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pack).toEqual({ id: 'pack-1', cards: [{ n: 1, isNew: true }, { n: 7, isNew: false }, { n: 9, isNew: true }, { n: 3, isNew: true }, { n: 2, isNew: true }] });
    expect(body.state.stock).toBe(3);
    expect(h.rpcCalls[0]).toMatchObject({ fn: 'cards_apply_pack', args: { p_user: 'u1', p_source: 'stock', p_cards: [1, 7, 9, 3, 2], p_ticket: null } });
  });
  it('refuses a bad source (400), the ad source included, and a non-object body', async () => {
    for (const body of [{ source: 'ad' }, { source: 'gift' }, {}, { source: 5 }]) expect((await open(req('/api/cards/open', body))).status).toBe(400);
    expect((await open(req('/api/cards/open', [1]))).status).toBe(400);
    expect(h.rpcCalls).toEqual([]);
  });
  it.each([
    ['cards: empty', 'empty'],
    ['cards: shards', 'shards'],
    ['cards: bonus', 'bonus'],
  ])('a refusal "%s" is 409 %s', async (message, error) => {
    h.rpcResult.cards_apply_pack = { error: { message } };
    const res = await open(req('/api/cards/open', { source: 'stock' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error });
  });
  it('an unknown database error is a 500 that does not leak its message', async () => {
    h.rpcResult.cards_apply_pack = { error: { message: 'relation "x" does not exist' } };
    const res = await open(req('/api/cards/open', { source: 'stock' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/relation/);
  });
  it('a card that left the packs triggers one fresh draw, then gives up', async () => {
    h.rpcResult.cards_apply_pack = { error: { message: 'cards: pack' } };
    expect((await open(req('/api/cards/open', { source: 'stock' }))).status).toBe(500);
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_apply_pack')).toHaveLength(2);
  });
  it('the bonus source is refused while the bridges are off', async () => {
    vi.stubEnv('NET_CARDS_BRIDGES', '');
    await open(req('/api/cards/open', { source: 'bonus' }));
    expect(h.rpcCalls[0]?.args).toMatchObject({ p_source: 'bonus', p_bonus_cap: 0 });
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
    expect(h.rpcCalls.at(-1)).toMatchObject({ fn: 'cards_issue_ticket', args: { p_user: 'u1', p_ads_limit: 10 } });
  });
  it('0 ads a day turns the ticket off', async () => {
    vi.stubEnv('CARDS_ADS_PER_DAY', '0');
    expect((await ticket(req('/api/cards/ad/ticket', {}))).status).toBe(409);
    expect(h.rpcCalls).toEqual([]);
  });
  it('grant: spends the ticket through cards_apply_pack (source ad) and answers like open', async () => {
    h.rpcResult.cards_apply_pack = { data: { ...PACK, source: 'ad' } };
    const res = await grant(req('/api/cards/ad/grant', { ticket: UUID.toUpperCase() }));
    expect(res.status).toBe(200);
    expect((await res.json()).pack.id).toBe('pack-1');
    expect(h.rpcCalls[0]).toMatchObject({ fn: 'cards_apply_pack', args: { p_source: 'ad', p_ticket: UUID } });
  });
  it('grant: a replayed, foreign or unknown ticket is 409, a malformed one too, and the limit is 409 limit', async () => {
    h.rpcResult.cards_apply_pack = { error: { message: 'cards: ticket' } };
    let res = await grant(req('/api/cards/ad/grant', { ticket: UUID }));
    expect([res.status, await res.json()]).toEqual([409, { error: 'ticket' }]);
    for (const t of ['nope', 5, undefined, '']) {
      res = await grant(req('/api/cards/ad/grant', { ticket: t }));
      expect(res.status).toBe(409);
    }
    h.rpcResult.cards_apply_pack = { error: { message: 'cards: ad_limit' } };
    res = await grant(req('/api/cards/ad/grant', { ticket: UUID }));
    expect([res.status, await res.json()]).toEqual([409, { error: 'limit' }]);
  });
  it('grant with ads off is 409 disabled and spends nothing', async () => {
    vi.stubEnv('NET_CARDS_ADS', '');
    const res = await grant(req('/api/cards/ad/grant', { ticket: UUID }));
    expect([res.status, await res.json()]).toEqual([409, { error: 'disabled' }]);
    expect(h.rpcCalls).toEqual([]);
  });
});

describe('recycle and favorite', () => {
  it('recycle answers the copies, the shards gained and the state', async () => {
    h.rpcResult.cards_recycle = { data: { recycled: 4, shards_gained: 16, shards: 28 } };
    const body = await (await recycle(req('/api/cards/recycle', {}))).json();
    expect(body).toMatchObject({ recycled: 4, shards: 16, state: { shards: 12 } });
  });
  it('favorite validates and reports ok from the database', async () => {
    h.rpcResult.cards_favorite = { data: true };
    expect(await (await favorite(req('/api/cards/favorite', { n: 4, on: true }))).json()).toEqual({ ok: true });
    h.rpcResult.cards_favorite = { data: false };
    expect(await (await favorite(req('/api/cards/favorite', { n: 5, on: false }))).json()).toEqual({ ok: false });
    for (const b of [{ n: 0, on: true }, { n: 1.5, on: true }, { n: 'a', on: true }, { n: 1 }, { n: 1, on: 'yes' }]) {
      expect((await favorite(req('/api/cards/favorite', b))).status).toBe(400);
    }
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
