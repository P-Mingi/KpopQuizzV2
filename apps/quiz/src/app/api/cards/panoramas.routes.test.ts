// KpopCards lot 7: the panoramas through the routes (open, craft, state, collection) against a recording stand-in for Supabase. A database without file 118
// (no cards_panoramas table) answers no panorama and never an error page.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  missing: new Set<string>(),
  rpcResult: {} as Record<string, { data?: unknown; error?: { message: string } | null }>,
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), SITE_ID: 'hub' }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => false }));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  for (const m of ['select', 'eq', 'in', 'order', 'gt', 'limit']) b[m] = self;
  b.maybeSingle = async () => ({ data: table === 'profiles' ? { username: 'tester' } : null, error: null });
  b.then = (res: (v: unknown) => unknown) => res({ data: h.tables[table] ?? [], error: null });
  b.range = async (from: number, to: number) => (h.missing.has(table)
    ? { data: null, error: { message: `relation "public.${table}" does not exist` } }
    : { data: (h.tables[table] ?? []).slice(from, to + 1), error: null });
  return b;
}
const db = {
  from: (t: string) => builder(t),
  rpc: async (fn: string) => ({ data: h.rpcResult[fn]?.data ?? null, error: h.rpcResult[fn]?.error ?? null }),
};
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }),
  createServiceRoleClient: () => db,
}));

import { POST as craft } from './craft/route';
import { POST as open } from './open/route';
import { GET as state } from './state/route';
import { GET as collection } from './collection/route';
import { GET as catalog } from './catalog/route';
import { resetCatalogCache } from '@/lib/cards/catalog';
import { resetRateLimits } from '@/lib/kpopcards/rate-limit';
import { resetWorldCache } from '@/lib/kpopcards/server';

const ORIGIN = 'http://localhost:3021';
const K = '11111111-2222-3333-4444-555555555555';
const req = (path: string, body?: unknown): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', 'idempotency-key': K },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

// Photo 1: 3 cards (1, 2, 3) with panorama 1. Card 4: a whole idol card.
const CARDS = [
  { card_no: 1, num: 'BV1-0001', entity_id: 'group:G', rarity: 'C', edition: 'std', photo_id: 1, part: 1 },
  { card_no: 2, num: 'BV1-0002', entity_id: 'group:G', rarity: 'C', edition: 'std', photo_id: 1, part: 2 },
  { card_no: 3, num: 'BV1-0003', entity_id: 'group:G', rarity: 'C', edition: 'std', photo_id: 1, part: 3 },
  { card_no: 4, num: 'BV1-0004', entity_id: 'idol:A', rarity: 'C', edition: 'std', photo_id: null, part: 0 },
  { card_no: 5, num: 'BV1-0005', entity_id: 'idol:A', rarity: 'R', edition: 'holo', photo_id: null, part: 0 },
  { card_no: 6, num: 'BV1-0006', entity_id: 'idol:A', rarity: 'UR', edition: 'gold', photo_id: null, part: 0 },
];
const ENTITIES = [
  { id: 'group:G', kind: 'group', name: 'Group', group_id: null, debut_year: 2015, sort_key: 'g', lock_reasons: {} },
  { id: 'idol:A', kind: 'idol', name: 'Idol A', group_id: 'group:G', debut_year: 2015, sort_key: 'g1', lock_reasons: {} },
];
const PHOTO = {
  id: 1, slot: 1, source: 'commons', source_page: 'p', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l', share_alike: false, modified: 'm', focal_x: 50, focal_y: 30,
  storage_path: 'g', source_path: 'images/group-photos/g.jpg', file_focal_x: 50, file_focal_y: 30, small_2x: false, parts: 3, file_parts: 3, file_pano: true,
};
const PANO = { pano_no: 1, num: 'P-0001', entity_id: 'group:G', rarity: 'C', edition: 'std', photo_id: 1, parts: 3, first_card: 1 };
const PLAYER = {
  wallet: { stock: 3, anchor: '2026-11-12T10:30:00+00:00', paris_day: '2026-11-12', ads_today: 0, timer_today: 4, shards: 12, packs_opened: 7, seen_at: '2026-11-12T10:30:00+00:00', created_at: '2026-11-01T10:00:00+00:00' },
  owned: [1, 2, 3].map((n) => ({ n, copies: 1, fav: false, locked: false, seen: true, first: '2026-11-12T09:00:00+00:00', last: '2026-11-12T09:00:00+00:00', fpn: 3 })),
  wishlist: [], gold_count: 3, claimed: [], bonus_earned: 0, bonus_today: 0, daily_used: false, focus_used: false,
  week: { week_start: '2026-11-09', packs_opened: 7, kpopdle_wins: 1, new_cards: 3, claimed: false },
  prefs: { sound: true, vibration: true, theme: 'all', focus: null }, recent: [], last: null,
};
const pack = (cards: Array<{ n: number; pano?: number }>, panoramas?: number[]) => ({
  replayed: false, owned_before: 2, owned_after: 3, finished: [],
  packs: [{ id: 'pack-1', pack_no: 8, source: 'stock', theme: 'all', group: null, golden: false, guarantee: false, new_count: 1, ...(panoramas ? { panoramas } : {}),
    cards: cards.map((c) => ({ n: c.n, isNew: true, completesPair: c.pano !== undefined, golden: false, guarantee: false, ...(c.pano !== undefined ? { pano: c.pano } : {}) })) }],
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:30:00Z'));
  h.missing = new Set();
  h.tables = {
    cards_catalog: CARDS, cards_entities: ENTITIES, cards_photos: [PHOTO], cards_group_types: [{ entity_id: 'group:G', gender: 'girl' }],
    cards_panoramas: [PANO], cards_panoramas_owned: [{ pano_no: 1, granted_at: '2026-11-12T10:00:00+00:00', source: 'pack', seen: false }],
  };
  h.rpcResult = {
    cards_player: { data: PLAYER }, cards_prefs_get: { data: { sound: true, vibration: true, theme: 'all', focus: null } },
    cards_open: { data: pack([{ n: 4 }, { n: 1 }, { n: 2 }, { n: 3, pano: 1 }, { n: 4 }], [1]) },
    cards_craft: { data: { replayed: false, card_no: 3, rarity: 'C', cost: 10, shards: 2, finished: [], pano: 1 } },
  };
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('NET_IP_HASH_SALT', 'test-salt');
  resetCatalogCache();
  resetWorldCache();
  resetRateLimits();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('lot 7: panoramas through the routes', () => {
  it('open maps the answer\'s pano and panoramas (pano_no) to references, on the card, the pack and the summary', async () => {
    const res = await open(req('/api/cards/open', { source: 'stock' }));
    expect(res.status).toBe(200);
    const j = await res.json();
    const ref = { p: 1, num: 'P-0001', name: 'Group', edition: 'std', parts: 3, cards: [1, 2, 3] };
    expect(j.packs[0].cards[3].pano).toEqual(ref);
    expect(j.packs[0].cards.filter((c: { pano?: unknown }) => c.pano)).toHaveLength(1);
    expect(j.packs[0].panoramas).toEqual([ref]);
    expect(j.summary.panoramas).toEqual([ref]);
    expect(j.state.panoramas).toEqual([1]);
  });
  it('open on an answer without pano fields (118 not applied in the answer) carries none on the cards', async () => {
    h.rpcResult.cards_open = { data: pack([{ n: 1 }, { n: 2 }, { n: 4 }, { n: 4 }, { n: 4 }]) };
    const j = await (await open(req('/api/cards/open', { source: 'stock' }))).json();
    expect(j.packs[0].cards.some((c: { pano?: unknown }) => 'pano' in c)).toBe(false);
    expect(j.packs[0].panoramas).toEqual([]);
  });
  it('craft answers the panorama as a reference, or null when the craft completed no set', async () => {
    const j = await (await craft(req('/api/cards/craft', { n: 3 }))).json();
    expect(j.pano).toEqual({ p: 1, num: 'P-0001', name: 'Group', edition: 'std', parts: 3, cards: [1, 2, 3] });
    expect(j.state.panoramas).toEqual([1]);
    resetWorldCache();
    h.rpcResult.cards_craft = { data: { replayed: false, card_no: 4, rarity: 'C', cost: 10, shards: 2, finished: [], pano: null } };
    expect((await (await craft(req('/api/cards/craft', { n: 4 }))).json()).pano).toBeNull();
  });
  it('state lists the pano_no the player holds', async () => {
    const j = await (await state(req('/api/cards/state'))).json();
    expect(j.panoramas).toEqual([1]);
  });
  it('the catalog carries the panorama with its picture and the parts with setNs, parts and pano', async () => {
    const j = await (await catalog()).json();
    expect(j.panoramas).toHaveLength(1);
    expect(j.panoramas[0]).toMatchObject({ p: 1, num: 'P-0001', parts: 3, cards: [1, 2, 3], image: { url: expect.stringMatching(/g-p3-1x\.webp$/), url2x: expect.stringMatching(/g-p3-2x\.webp$/) } });
    expect(j.cards.find((c: { n: number }) => c.n === 2)).toMatchObject({ part: 2, parts: 3, setNs: [1, 2, 3], pano: 1, pairN: null });
  });
  it('collection has the Panoramas section with its own completion and the parts with parts and pano', async () => {
    const j = await (await collection(req('/api/cards/collection'))).json();
    expect(j.panoramas).toMatchObject({ owned: 1, total: 1, pct: 100 });
    expect(j.panoramas.items[0]).toMatchObject({ p: 1, num: 'P-0001', owned: true, section: 'group', grantedAt: '2026-11-12T10:00:00.000Z' });
    expect(j.totals.total).toBe(6);
    const parts = j.items.filter((i: { type: string; part?: number }) => i.type === 'card' && i.part);
    expect(parts.map((i: { n: number; parts: number; pano: number }) => [i.n, i.parts, i.pano])).toEqual([[1, 3, 1], [2, 3, 1], [3, 3, 1]]);
  });
  it('a database without file 118 (no cards_panoramas, no cards_panoramas_owned) answers no panorama and no error', async () => {
    h.missing = new Set(['cards_panoramas', 'cards_panoramas_owned']);
    h.tables.cards_photos = [{ ...PHOTO, parts: undefined, file_parts: undefined, file_pano: undefined }];
    h.tables.cards_catalog = CARDS.map(({ part, ...c }) => ({ ...c, ...(part === 1 || part === 2 ? { part } : {}) })).filter((c) => c.card_no !== 3);
    h.rpcResult.cards_open = { data: pack([{ n: 4 }, { n: 1 }, { n: 2 }, { n: 4 }, { n: 4 }]) };
    for (const call of [() => state(req('/api/cards/state')), () => collection(req('/api/cards/collection')), () => open(req('/api/cards/open', { source: 'stock' }))]) {
      const res = await call();
      expect(res.status).toBe(200);
      const j = await res.json();
      expect(JSON.stringify(j)).not.toMatch(/panoram|"pano"/);
    }
  });
});
