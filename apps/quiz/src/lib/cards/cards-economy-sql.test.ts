// Bunnyverse Cards lot 3 (lane ECON): the proofs of docs/pending-migrations/cards/104-economy.sql on PGlite: the Ultra Rare guarantee (B10),
// the timer cap (B12), crafting (C1), the wishlist and the focus pack (C4), the idempotence, the one-function-per-name rule and the rollback.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { CARDS_SQL, SCHEMA_FILES, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';
import { WISHLIST_MAX } from './economy';
import { CRAFT_COST, PITY_UR, TIMER_PACKS_PER_DAY } from './rules';

import type { PGlite } from '@electric-sql/pglite';

const ECON = '104-economy.sql';
const ECON_UNDO = '104-economy.rollback.sql';

describe('the 104 files are one DO block', () => {
  it.each([[ECON, 'c104'], [ECON_UNDO, 'c104r']])('%s', (file, tag) => {
    const sql = readFileSync(path.join(CARDS_SQL, file), 'utf8');
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).not.toMatch(/^set\s+(lock_timeout|client_min_messages|statement_timeout|search_path|role|session)\b/im);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(sql).toMatch(/^-- Undo: /m);
    expect(sql).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    expect(code).not.toMatch(/\b(award_xp|xp_total|streak|badge|random\(\)|setseed)\b/i);
  });
  it('104 does not need the catalog rebuild (103) or 102', () => {
    const code = readCardsSql(ECON).split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/\bpart\b|103|102/);
  });
});

// ---------- fixtures ----------

const T0 = '2026-11-12T10:00:00Z'; // Paris 11:00 on 12 November 2026 (UTC+1 in winter: Paris midnight is 23:00Z)
const NOHI = [1, 7, 9, 3, 2]; // C C C R U: no Gold, no Full Art
const HI = [1, 7, 9, 3, 5]; // the fifth is Gold (UR)
const FULL = [1, 7, 9, 3, 6]; // the fifth is Full Art (L)

async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:G1', 'group', 'Group One', null, 2015, 'g1'), ('group:G2', 'group', 'Group Two', null, 2016, 'g2'),
      ('idol:A1', 'idol', 'Idol A1', 'group:G1', 2015, 'a1'), ('idol:A2', 'idol', 'Idol A2', 'group:G1', 2015, 'a2'),
      ('idol:B1', 'idol', 'Idol B1', 'group:G2', 2016, 'b1'), ('event:e1', 'event', 'Event', null, 2018, 'z'),
      ('idol:Off', 'idol', 'Idol Off', 'group:G1', 2015, 'off');
    update public.cards_entities set active = false where id = 'idol:Off';
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs) values
      (1, 'BV1-0001', 'idol:A1', 'C', 'std', true), (2, 'BV1-0002', 'idol:A1', 'U', 'stage', true), (3, 'BV1-0003', 'idol:A1', 'R', 'holo', true),
      (4, 'BV1-0004', 'idol:A1', 'SR', 'era', true), (5, 'BV1-0005', 'idol:A1', 'UR', 'gold', true), (6, 'BV1-0006', 'idol:A1', 'L', 'full', true),
      (7, 'BV1-0007', 'group:G1', 'C', 'std', true), (8, 'BV1-0008', 'group:G1', 'U', 'stage', true), (9, 'BV1-0009', 'event:e1', 'C', 'std', true),
      (10, 'BV1-0010', 'idol:A2', 'C', 'std', true), (11, 'BV1-0011', 'idol:A2', 'U', 'stage', true),
      (12, 'BV1-0012', 'idol:B1', 'C', 'std', true), (13, 'BV1-0013', 'idol:B1', 'U', 'stage', true),
      (15, 'BV1-0015', 'idol:Off', 'U', 'stage', true), (16, 'BV1-0016', 'idol:A2', 'R', 'holo', false);
    insert into public.cards_entities (id, kind, name, sort_key) select 'event:w' || g, 'event', 'W' || g, 'w' || lpad(g::text, 3, '0') from generate_series(1, 60) g;
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition)
      select 100 + g, 'BV1-' || lpad((100 + g)::text, 4, '0'), 'event:w' || g, 'C', 'std' from generate_series(1, 60) g;
  `);
}

async function econDb(files: readonly string[] = [...SCHEMA_FILES, ECON]): Promise<PGlite> {
  const db = await freshCardsDb(files);
  await seed(db);
  return db;
}

async function newUser(db: PGlite): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users values ($1)', [id]);
  return id;
}

/** Opens a pack through the function; returns the error message or null. */
async function apply(db: PGlite, u: string, source: string, cards: number[], at: string, o: { timer?: number; focus?: string | null } = {}): Promise<string | null> {
  return failure(
    db,
    'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, $5::int, $6)',
    [u, source, cards, at, o.timer ?? 40, o.focus ?? null],
  );
}

/** Refills the stack so the next stock pack is not refused for an empty stack. */
const refill = (db: PGlite, u: string): Promise<unknown> => db.query('update public.cards_wallets set stock = 5 where user_id = $1', [u]);

/** n packs written straight into cards_packs, `gap` seconds apart from `from`, source cycling over `sources`. */
async function history(db: PGlite, u: string, n: number, cards: number[], from: string, sources: string[] = ['stock']): Promise<void> {
  await db.query(
    `insert into public.cards_packs (user_id, source, cards, opened_at)
     select $1::uuid, ($6::text[])[1 + (g % cardinality($6::text[]))], $2::int[], $3::timestamptz + (g * interval '1 second') from generate_series(1, $4::int) g where $5::int > 0`,
    [u, cards, from, n, 1, sources],
  );
}

const wallet = async (db: PGlite, u: string, now: string, timerCap = 40): Promise<Record<string, unknown>> =>
  one<Record<string, unknown>>(db, 'select public.cards_wallet($1::uuid, $2::timestamptz, 10, 3, $3::int)', [u, now, timerCap]);
const pity = (db: PGlite, u: string): Promise<number> => one<number>(db, 'select public.cards_pity_count($1::uuid)', [u]);

// ---------- B10 ----------

describe('B10, the Gold guarantee (PITY_UR = 30)', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('the constant of the rules is the 30th pack', () => {
    expect(PITY_UR).toBe(30);
  });

  it('the count is the packs in a row without a Gold or a Full Art card, any source; a new player has 0 and 30 packs to go', async () => {
    const u = await newUser(db);
    expect(await pity(db, u)).toBe(0);
    expect((await wallet(db, u, T0)).pity_left).toBe(PITY_UR);
    await history(db, u, 12, NOHI, '2026-11-12T01:00:00Z', ['stock', 'ad', 'shards', 'bonus']);
    expect(await pity(db, u)).toBe(12);
    expect((await wallet(db, u, T0)).pity_left).toBe(PITY_UR - 12);
  });

  it('the 30th pack: 29 packs in a row without Gold refuse a pack without one, then a pack with Gold is stored and the count restarts', async () => {
    const u = await newUser(db);
    await history(db, u, 28, NOHI, '2026-11-12T01:00:00Z', ['stock', 'ad', 'shards', 'bonus']);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:00:00Z')).toBeNull(); // the 29th pack without Gold
    expect(await pity(db, u)).toBe(29);
    expect((await wallet(db, u, T0)).pity_left).toBe(1);
    await refill(db, u);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:01:00Z')).toMatch(/^cards: pity\b/);
    expect(await one(db, 'select count(*)::int from public.cards_packs where user_id = $1', [u])).toBe(29);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T08:02:00Z')).toBeNull();
    expect(await pity(db, u)).toBe(0);
    expect((await wallet(db, u, T0)).pity_left).toBe(PITY_UR);
    await refill(db, u);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:03:00Z')).toBeNull(); // a normal pack again
  });

  it('every source is refused alike, and a refused ad pack does not spend its ticket', async () => {
    const u = await newUser(db);
    await history(db, u, 29, NOHI, '2026-11-12T01:00:00Z');
    await db.query('update public.cards_wallets set shards = 100 where user_id = $1', [u]).catch(() => undefined);
    await db.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 5, $2::timestamptz, '2026-11-12', 100) on conflict (user_id) do update set shards = 100", [u, T0]);
    expect(await apply(db, u, 'shards', NOHI, '2026-11-12T08:00:00Z')).toMatch(/^cards: pity\b/);
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(100);
    const t = await one<string>(db, "insert into public.cards_ad_tickets (user_id, issued_at) values ($1, '2026-11-12T07:00:00Z') returning id", [u]);
    expect(await failure(db, "select public.cards_apply_pack($1::uuid, 'ad', $2::int[], $3::uuid, '2026-11-12T08:00:00Z'::timestamptz)", [u, NOHI, t])).toMatch(/^cards: pity\b/);
    expect(await one(db, 'select used_at is null from public.cards_ad_tickets where id = $1', [t])).toBe(true);
    expect(await failure(db, "select public.cards_apply_pack($1::uuid, 'ad', $2::int[], $3::uuid, '2026-11-12T08:00:00Z'::timestamptz)", [u, HI, t])).toBeNull();
  });

  it('a pack with a Gold card among the first four also keeps the promise, and a Full Art card ends the count too', async () => {
    const u = await newUser(db);
    await history(db, u, 29, NOHI, '2026-11-12T01:00:00Z');
    expect(await apply(db, u, 'stock', [5, 7, 9, 3, 2], '2026-11-12T08:00:00Z')).toBeNull();
    const v = await newUser(db);
    await history(db, v, 29, NOHI, '2026-11-12T01:00:00Z');
    expect(await apply(db, v, 'stock', FULL, '2026-11-12T08:00:00Z')).toBeNull();
    expect(await pity(db, v)).toBe(0);
  });

  it('the count starts after the newest pack with Gold or Full Art, and reads at most 30 packs', async () => {
    const u = await newUser(db);
    await history(db, u, 10, NOHI, '2026-11-12T01:00:00Z');
    await history(db, u, 1, HI, '2026-11-12T02:00:00Z');
    await history(db, u, 5, NOHI, '2026-11-12T03:00:00Z');
    expect(await pity(db, u)).toBe(5);
    const v = await newUser(db);
    await history(db, v, 45, NOHI, '2026-11-12T01:00:00Z');
    expect(await pity(db, v)).toBe(30);
    expect((await wallet(db, v, T0)).pity_left).toBe(1);
  });

  it('no guarantee while the pool has no Gold card (none in packs, or only on an inactive entity)', async () => {
    const d = await econDb();
    await d.exec(`
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition) values (17, 'BV1-0017', 'idol:Off', 'UR', 'gold');
      update public.cards_catalog set in_packs = false where card_no = 5;
    `);
    const u = await newUser(d);
    expect(await one(d, 'select public.cards_pity_pool()')).toBe(false);
    await history(d, u, 40, NOHI, '2026-11-12T01:00:00Z');
    expect((await wallet(d, u, T0)).pity_left).toBeNull();
    expect(await apply(d, u, 'stock', NOHI, '2026-11-12T08:00:00Z', { timer: 100 })).toBeNull();
    await d.exec('update public.cards_catalog set in_packs = true where card_no = 5');
    expect(await one(d, 'select public.cards_pity_pool()')).toBe(true);
    await refill(d, u);
    expect(await apply(d, u, 'stock', NOHI, '2026-11-12T08:01:00Z', { timer: 100 })).toMatch(/^cards: pity\b/);
  });
});

// ---------- B12 ----------

describe('B12, at most 40 timer packs a Paris day', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('the default of the rules is 40', () => {
    expect(TIMER_PACKS_PER_DAY).toBe(40);
  });

  it('the 40th is allowed, the 41st is refused, and the wallet says how many are left', async () => {
    const u = await newUser(db);
    await history(db, u, 38, HI, '2026-11-12T05:00:00Z');
    expect((await wallet(db, u, T0)).timer_left).toBe(2);
    expect(await apply(db, u, 'stock', HI, T0)).toBeNull();
    const w = await wallet(db, u, T0);
    expect(w.timer_used).toBe(39);
    expect(w.timer_left).toBe(1);
    await refill(db, u);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T10:01:00Z')).toBeNull(); // the 40th
    expect((await wallet(db, u, '2026-11-12T10:02:00Z')).timer_left).toBe(0);
    await refill(db, u);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T10:02:00Z')).toMatch(/^cards: timer_cap\b/); // the 41st
    expect(await one(db, "select count(*)::int from public.cards_packs where user_id = $1 and source = 'stock'", [u])).toBe(40);
  });

  it('ads, bonus and shard packs are not counted, and do not need the timer', async () => {
    const u = await newUser(db);
    await history(db, u, 40, HI, '2026-11-12T05:00:00Z', ['ad', 'bonus', 'shards']);
    const w = await wallet(db, u, T0);
    expect(w.timer_used).toBe(0);
    expect(w.timer_left).toBe(40);
    expect(await apply(db, u, 'stock', HI, T0)).toBeNull();
    await db.query('update public.cards_wallets set shards = 50 where user_id = $1', [u]);
    const v = await newUser(db);
    await history(db, v, 40, HI, '2026-11-12T05:00:00Z');
    await db.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 0, $2::timestamptz, '2026-11-12', 50)", [v, T0]);
    expect(await apply(db, v, 'stock', HI, T0)).toMatch(/^cards: (timer_cap|empty)\b/);
    expect(await apply(db, v, 'shards', HI, T0)).toBeNull(); // the capped player still opens a shard pack
  });

  it('the Paris day boundary: 23:59:59 is the old day, 00:00 the new one (winter time: 23:00Z)', async () => {
    const u = await newUser(db);
    await history(db, u, 40, HI, '2026-11-12T22:00:00Z'); // Paris 23:00 to 23:01 on the 12th
    expect(await one(db, 'select public.cards_timer_used($1::uuid, $2::timestamptz)', [u, '2026-11-12T22:59:59Z'])).toBe(40);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T22:59:59Z')).toMatch(/^cards: timer_cap\b/);
    expect(await one(db, 'select public.cards_timer_used($1::uuid, $2::timestamptz)', [u, '2026-11-12T23:00:00Z'])).toBe(0);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T23:00:00Z')).toBeNull();
    expect((await wallet(db, u, '2026-11-12T23:00:01Z')).timer_left).toBe(39);
  });

  it('the Paris day boundary in summer time (UTC+2: midnight is 22:00Z)', async () => {
    const u = await newUser(db);
    await history(db, u, 40, HI, '2026-07-14T21:00:00Z'); // Paris 23:00 on the 14th
    expect(await apply(db, u, 'stock', HI, '2026-07-14T21:59:59Z')).toMatch(/^cards: timer_cap\b/);
    expect(await apply(db, u, 'stock', HI, '2026-07-14T22:00:00Z')).toBeNull();
  });

  it('the cap is a parameter (the server reads CARDS_TIMER_PER_DAY): 3 allows 3, a cap of 0 closes the timer', async () => {
    const u = await newUser(db);
    for (let i = 0; i < 3; i++) {
      expect(await apply(db, u, 'stock', HI, `2026-11-12T10:0${i}:00Z`, { timer: 3 })).toBeNull();
      await refill(db, u);
    }
    expect((await wallet(db, u, T0, 3)).timer_left).toBe(0);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T10:05:00Z', { timer: 3 })).toMatch(/^cards: timer_cap\b/);
    expect(await apply(db, u, 'stock', HI, '2026-11-12T10:06:00Z', { timer: 4 })).toBeNull();
    const v = await newUser(db);
    expect(await apply(db, v, 'stock', HI, T0, { timer: 0 })).toMatch(/^cards: timer_cap\b/);
    expect((await wallet(db, v, T0, 0)).timer_left).toBe(0);
  });
});

// ---------- C1 ----------

describe('C1, crafting', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const giveShards = (u: string, n: number): Promise<unknown> =>
    db.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 5, $2::timestamptz, '2026-11-12', $3) on conflict (user_id) do update set shards = $3", [u, T0, n]);

  it('the cost of each rarity is CRAFT_COST (Standard 10, Stage 20, Holo 50, Era 120, Gold 300, Full Art 800)', async () => {
    const u = await newUser(db);
    await giveShards(u, 5000);
    let left = 5000;
    for (const [card, rarity] of [[1, 'C'], [2, 'U'], [3, 'R'], [4, 'SR'], [5, 'UR'], [6, 'L']] as const) {
      const r = await one<{ card_no: number; rarity: string; cost: number; shards: number }>(db, 'select public.cards_craft($1::uuid, $2::int, $3::timestamptz)', [u, card, T0]);
      left -= CRAFT_COST[rarity];
      expect(r).toEqual({ card_no: card, rarity, cost: CRAFT_COST[rarity], shards: left });
    }
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(left);
    const owned = await rows<{ card_no: number; copies: number }>(db, 'select card_no, copies from public.cards_owned where user_id = $1 order by card_no', [u]);
    expect(owned).toEqual([1, 2, 3, 4, 5, 6].map((n) => ({ card_no: n, copies: 1 })));
    const ledger = await rows<{ card_no: number; rarity: string; cost: number }>(db, 'select card_no, rarity, cost from public.cards_crafts where user_id = $1 order by card_no', [u]);
    expect(ledger.map((x) => x.cost)).toEqual([10, 20, 50, 120, 300, 800]);
    expect(ledger.map((x) => x.rarity)).toEqual(['C', 'U', 'R', 'SR', 'UR', 'L']);
  });

  it('refuses a card the player owns, and spends nothing', async () => {
    const u = await newUser(db);
    await giveShards(u, 100);
    await db.query('select public.cards_craft($1::uuid, 1, $2::timestamptz)', [u, T0]);
    expect(await failure(db, 'select public.cards_craft($1::uuid, 1, $2::timestamptz)', [u, T0])).toMatch(/^cards: owned\b/);
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(90);
    expect(await one(db, 'select count(*)::int from public.cards_crafts where user_id = $1', [u])).toBe(1);
  });

  it('refuses when the shards are short (by one), and a player with no wallet', async () => {
    const u = await newUser(db);
    await giveShards(u, 19);
    expect(await failure(db, 'select public.cards_craft($1::uuid, 2, $2::timestamptz)', [u, T0])).toMatch(/^cards: shards\b/);
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(19);
    expect(await one(db, 'select count(*)::int from public.cards_owned where user_id = $1', [u])).toBe(0);
    await giveShards(u, 20);
    expect(await failure(db, 'select public.cards_craft($1::uuid, 2, $2::timestamptz)', [u, T0])).toBeNull();
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(0);
    const v = await newUser(db);
    expect(await failure(db, 'select public.cards_craft($1::uuid, 1, $2::timestamptz)', [v, T0])).toMatch(/^cards: shards\b/);
  });

  it('refuses a card that is not in packs, whose entity is inactive, or that does not exist', async () => {
    const u = await newUser(db);
    await giveShards(u, 5000);
    for (const card of [16, 15, 9999]) {
      expect(await failure(db, 'select public.cards_craft($1::uuid, $2::int, $3::timestamptz)', [u, card, T0])).toMatch(/^cards: card\b/);
    }
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(5000);
  });

  it('an Era or Full Art card can be crafted only once such a card is in packs', async () => {
    const d = await econDb();
    await d.exec('update public.cards_catalog set in_packs = false where rarity in (\'SR\', \'L\')');
    const u = await newUser(d);
    await d.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 5, $2::timestamptz, '2026-11-12', 5000)", [u, T0]);
    for (const card of [4, 6]) expect(await failure(d, 'select public.cards_craft($1::uuid, $2::int, $3::timestamptz)', [u, card, T0])).toMatch(/^cards: card\b/);
    await d.exec("update public.cards_catalog set in_packs = true where rarity in ('SR', 'L')");
    for (const card of [4, 6]) expect(await failure(d, 'select public.cards_craft($1::uuid, $2::int, $3::timestamptz)', [u, card, T0])).toBeNull();
    expect(await one(d, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(5000 - 120 - 800);
  });

  it('crafting takes the card off the wishlist, and the 50-shard pack is still there', async () => {
    const u = await newUser(db);
    await giveShards(u, 100);
    await db.query('select public.cards_wish($1::uuid, 2, true, $2::timestamptz)', [u, T0]);
    await db.query('select public.cards_craft($1::uuid, 2, $2::timestamptz)', [u, T0]);
    expect(await one(db, 'select count(*)::int from public.cards_wishlist where user_id = $1', [u])).toBe(0);
    expect(await apply(db, u, 'shards', NOHI, T0)).toBeNull();
    expect(await one(db, 'select shards from public.cards_wallets where user_id = $1', [u])).toBe(30);
  });
});

// ---------- C4 wishlist ----------

describe('C4, the wishlist', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('holds at most WISHLIST_MAX (50) cards, adding twice is harmless, removing is always allowed', async () => {
    expect(WISHLIST_MAX).toBe(50);
    const u = await newUser(db);
    for (let g = 1; g <= 50; g++) {
      const r = await one<{ on: boolean; count: number }>(db, 'select public.cards_wish($1::uuid, $2::int, true, $3::timestamptz)', [u, 100 + g, T0]);
      expect(r).toEqual({ on: true, count: g });
    }
    expect(await failure(db, 'select public.cards_wish($1::uuid, 151, true, $2::timestamptz)', [u, T0])).toMatch(/^cards: wish_limit\b/);
    expect(await one(db, 'select public.cards_wish($1::uuid, 101, true, $2::timestamptz)', [u, T0])).toEqual({ on: true, count: 50 });
    expect(await one(db, 'select public.cards_wish($1::uuid, 101, false, $2::timestamptz)', [u, T0])).toEqual({ on: false, count: 49 });
    expect(await one(db, 'select public.cards_wish($1::uuid, 151, true, $2::timestamptz)', [u, T0])).toEqual({ on: true, count: 50 });
    expect(await one(db, 'select public.cards_wish($1::uuid, 9999, false, $2::timestamptz)', [u, T0])).toEqual({ on: false, count: 50 });
  });

  it('refuses a card the player owns, a card that is not in packs, and keeps each player\'s list apart', async () => {
    const u = await newUser(db);
    const v = await newUser(db);
    await apply(db, u, 'stock', NOHI, T0);
    expect(await failure(db, 'select public.cards_wish($1::uuid, 1, true, $2::timestamptz)', [u, T0])).toMatch(/^cards: owned\b/);
    for (const card of [16, 15, 9999]) expect(await failure(db, 'select public.cards_wish($1::uuid, $2::int, true, $3::timestamptz)', [u, card, T0])).toMatch(/^cards: card\b/);
    await db.query('select public.cards_wish($1::uuid, 4, true, $2::timestamptz)', [u, T0]);
    expect(await one(db, 'select count(*)::int from public.cards_wishlist where user_id = $1', [v])).toBe(0);
  });

  it('a pack that gives a wished card takes it off the list', async () => {
    const u = await newUser(db);
    await db.query('select public.cards_wish($1::uuid, 4, true, $2::timestamptz)', [u, T0]);
    await db.query('select public.cards_wish($1::uuid, 8, true, $2::timestamptz)', [u, T0]);
    await apply(db, u, 'stock', [1, 7, 9, 8, 2], T0);
    expect(await rows(db, 'select card_no from public.cards_wishlist where user_id = $1', [u])).toEqual([{ card_no: 4 }]);
  });
});

// ---------- C4 focus ----------

describe('C4, the focus pack', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const focusOf = (u: string): Promise<unknown[]> => rows(db, 'select focus from public.cards_packs where user_id = $1 order by opened_at', [u]);

  it('cards 1 and 2 come from the group (its own cards and its idols\' cards), the focus is stored on the pack row', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], T0, { focus: 'group:G1' })).toBeNull();
    expect(await focusOf(u)).toEqual([{ focus: 'group:G1' }]);
    await refill(db, u);
    await apply(db, u, 'stock', NOHI, '2026-11-13T10:00:00Z'); // a plain pack has no focus
    expect(await focusOf(u)).toEqual([{ focus: 'group:G1' }, { focus: null }]);
    expect((await wallet(db, u, '2026-11-13T10:30:00Z')).focus_used).toBe(false);
  });

  it('a group card and an idol of the group both count (card 7 is the group\'s, card 10 is an idol of it)', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [7, 10, 9, 3, 2], T0, { focus: 'group:G1' })).toBeNull();
  });

  it('refuses a pack whose first card is outside the group while the group has a card of that rarity', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [9, 2, 9, 3, 5], T0, { focus: 'group:G1' })).toMatch(/^cards: pack\b/); // card 1 is an event Standard, G1 has Standard cards
    expect(await apply(db, u, 'stock', [1, 12, 9, 3, 5], T0, { focus: 'group:G1' })).toMatch(/^cards: pack\b/); // card 2 is another group's Stage
    expect(await one(db, 'select count(*)::int from public.cards_packs where user_id = $1', [u])).toBe(0);
  });

  it('falls back to the whole pool for a rarity the group has no card of (Group Two has no Holo and no Era)', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [3, 4, 9, 1, 5], T0, { focus: 'group:G2' })).toBeNull();
    const v = await newUser(db);
    expect(await apply(db, v, 'stock', [3, 1, 9, 1, 5], T0, { focus: 'group:G2' })).toMatch(/^cards: pack\b/); // card 2 is Standard, Group Two has one (12)
  });

  it('once a Paris day: the second is refused, the next Paris day allows another, the wallet says so', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], '2026-11-12T08:00:00Z', { focus: 'group:G1' })).toBeNull();
    expect((await wallet(db, u, T0)).focus_used).toBe(true);
    await refill(db, u);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], '2026-11-12T22:59:59Z', { focus: 'group:G1' })).toMatch(/^cards: focus_used\b/);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], '2026-11-12T23:00:00Z', { focus: 'group:G1' })).toBeNull();
    expect((await wallet(db, u, '2026-11-12T23:30:00Z')).focus_used).toBe(true);
    expect((await wallet(db, u, '2026-11-14T12:00:00Z')).focus_used).toBe(false);
  });

  it('a refused focus pack does not use up the day', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [9, 2, 9, 3, 5], T0, { focus: 'group:G1' })).toMatch(/^cards: pack\b/);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], T0, { focus: 'group:G1' })).toBeNull();
  });

  it('needs a group that exists and is active, and only the timer (stock) can be focused', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], T0, { focus: 'idol:A1' })).toMatch(/^cards: focus\b/);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], T0, { focus: 'group:nope' })).toMatch(/^cards: focus\b/);
    await db.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 5, $2::timestamptz, '2026-11-12', 100) on conflict (user_id) do update set shards = 100", [u, T0]);
    for (const source of ['shards', 'bonus']) expect(await apply(db, u, source, [1, 2, 9, 3, 5], T0, { focus: 'group:G1' })).toMatch(/^cards: focus\b/);
    await db.exec("update public.cards_entities set active = false where id = 'group:G2'");
    expect(await apply(db, u, 'stock', [3, 4, 9, 1, 5], T0, { focus: 'group:G2' })).toMatch(/^cards: focus\b/);
    await db.exec("update public.cards_entities set active = true where id = 'group:G2'");
  });

  it('a focus pack counts toward the timer cap', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [1, 2, 9, 3, 5], T0, { focus: 'group:G1', timer: 1 })).toBeNull();
    await refill(db, u);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T10:01:00Z', { timer: 1 })).toMatch(/^cards: timer_cap\b/);
  });
});

// ---------- the file itself ----------

describe('104 as a migration', () => {
  it('each name has exactly one function, no browser role can run them, the new tables are closed', async () => {
    const db = await econDb();
    const names = await rows<{ proname: string; n: number }>(db, "select proname, count(*)::int as n from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%' group by proname");
    for (const r of names) expect(r.n, r.proname).toBe(1);
    const asked = names.map((r) => r.proname);
    for (const f of ['cards_wallet', 'cards_apply_pack', 'cards_pity_count', 'cards_pity_pool', 'cards_timer_used', 'cards_focus_used', 'cards_craft', 'cards_wish']) expect(asked).toContain(f);
    expect(await one(db, "select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'")).toBe(false);
    expect(await one(db, "select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'")).toBe(true);
    expect(await one(db, "select count(*)::int from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist') and rowsecurity")).toBe(2);
    expect(await one(db, "select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_crafts', 'cards_wishlist') and grantee in ('anon', 'authenticated')")).toBe(0);
    expect(await one(db, "select count(*)::int from pg_policies where schemaname = 'public' and tablename like 'cards\\_%'")).toBe(0);
    expect(await one(db, "select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'cards_packs' and column_name = 'focus'")).toBe(1);
    expect(Number(await one(db, "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_timer_used', 'cards_focus_used', 'cards_craft', 'cards_wish')"))).toBe(6);
  });

  it('the Verify lines of the header hold on an empty wallet', async () => {
    const db = await econDb();
    expect(await one(db, "select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'timer_left'")).toBe('40');
    expect(await one(db, "select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'pity_left'")).toBe('30');
    expect(await one(db, "select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'stock'")).toBe('5');
  });

  it('a second run changes nothing (functions, tables, columns, indexes, grants)', async () => {
    const snap = (db: PGlite): Promise<string> =>
      one<string>(db, `select md5(concat_ws('|',
        (select string_agg(pg_get_functiondef(p.oid), '#' order by p.oid::regprocedure::text) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'),
        (select string_agg(table_name || '.' || column_name || ':' || data_type, ',' order by table_name, column_name) from information_schema.columns where table_schema = 'public' and table_name like 'cards\\_%'),
        (select string_agg(indexname, ',' order by indexname) from pg_indexes where schemaname = 'public' and tablename like 'cards\\_%'),
        (select string_agg(conname, ',' order by conname) from pg_constraint where connamespace = 'public'::regnamespace),
        (select string_agg(p.oid::regprocedure::text || has_function_privilege('service_role', p.oid, 'execute')::text, ',' order by p.oid::regprocedure::text) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%')))`);
    const db = await econDb();
    const before = await snap(db);
    await db.exec(readCardsSql(ECON));
    expect(await snap(db)).toBe(before);
  });

  it('an old pack still works exactly as before (same keys back, same ledger)', async () => {
    const db = await econDb();
    const u = await newUser(db);
    const out = await one<{ id: string; source: string; cards: Array<{ n: number; isNew: boolean }> }>(db, "select public.cards_apply_pack($1::uuid, 'stock', $2::int[], null, $3::timestamptz, 10, 3)", [u, NOHI, T0]);
    expect(out.source).toBe('stock');
    expect(out.cards.map((c) => c.n)).toEqual(NOHI);
    expect(await one(db, 'select stock from public.cards_wallets where user_id = $1', [u])).toBe(4);
    const w = await one<Record<string, unknown>>(db, "select public.cards_wallet($1::uuid, $2::timestamptz, 10, 3)", [u, T0]);
    expect(w.stock).toBe(4);
    expect(w.timer_left).toBe(39);
  });
});

describe('104 rollback', () => {
  const defs = (db: PGlite): Promise<Array<{ n: string; d: string }>> =>
    rows(db, "select p.oid::regprocedure::text as n, pg_get_functiondef(p.oid) as d from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_wallet', 'cards_apply_pack') order by 1");

  it('restores the functions of 002 exactly, drops what 104 added, and 002 behaves again', async () => {
    const reference = await freshCardsDb();
    const db = await econDb();
    await db.exec(readCardsSql(ECON_UNDO));
    expect(await defs(db)).toEqual(await defs(reference));
    expect(await one(db, "select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_timer_used', 'cards_focus_used', 'cards_craft', 'cards_wish')")).toBe(0);
    expect(await one(db, "select count(*)::int from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist')")).toBe(0);
    expect(await one(db, "select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'cards_packs' and column_name = 'focus'")).toBe(0);
    expect(await one(db, "select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'timer_left'")).toBeNull();
    const u = await newUser(db);
    // 002 has no cap and no guarantee: 45 packs of no Gold card in a row are all accepted.
    await history(db, u, 45, NOHI, '2026-11-12T01:00:00Z');
    expect(await failure(db, "select public.cards_apply_pack($1::uuid, 'stock', $2::int[], null, $3::timestamptz, 10, 3)", [u, NOHI, T0])).toBeNull();
    // and the 9-argument call is gone
    expect(await failure(db, "select public.cards_apply_pack($1::uuid, 'stock', $2::int[], null, $3::timestamptz, 10, 3, 40, null)", [u, NOHI, T0])).toMatch(/does not exist/);
    expect(await one(db, "select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'")).toBe(false);
    // a second run of the rollback changes nothing, and 104 can be applied again
    await db.exec(readCardsSql(ECON_UNDO));
    expect(await defs(db)).toEqual(await defs(reference));
    await db.exec(readCardsSql(ECON));
    expect((await defs(db)).map((x) => x.n)).toEqual(['cards_apply_pack(uuid,text,integer[],uuid,timestamp with time zone,integer,integer,integer,text)', 'cards_wallet(uuid,timestamp with time zone,integer,integer,integer)']);
  });

  it('is refused while a craft is recorded, and nothing is changed', async () => {
    const db = await econDb();
    const u = await newUser(db);
    await db.query("insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ($1, 5, $2::timestamptz, '2026-11-12', 100)", [u, T0]);
    await db.query('select public.cards_craft($1::uuid, 1, $2::timestamptz)', [u, T0]);
    expect(await failure(db, 'select 1')).toBeNull();
    let msg = '';
    try { await db.exec(readCardsSql(ECON_UNDO)); } catch (e) { msg = (e as Error).message; }
    expect(msg).toMatch(/refused, a craft is recorded/);
    expect(await one(db, "select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft'")).toBe(1);
    expect(await one(db, 'select count(*)::int from public.cards_crafts')).toBe(1);
  });
});
