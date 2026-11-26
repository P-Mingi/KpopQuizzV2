// Bunnyverse Cards lots 3 and 4 (lane ECON): the proofs of docs/pending-migrations/cards/104-economy.sql on PGlite: the Gold guarantee (A11),
// the missing half (A12), the timer cap (A13), crafting (A14), the wishlist and the focus pack (A17), the rewarded ad shards (B4), the moment
// (B3), the idempotence, the one-function-per-name rule and the rollback to 002.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { CARDS_SQL, SCHEMA_FILES, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';
import { WISHLIST_MAX } from './economy';
import { PITY_UR, TIMER_PACKS_PER_DAY, walletAt } from './rules';

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
    for (const k of ['What:', 'Why:', 'Rows:']) expect(sql).toContain(`-- ${k}`);
    expect(sql).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    expect(code).not.toMatch(/\b(award_xp|xp_total|streak|badge|random\(\)|setseed)\b/i);
  });
  it('104 does not depend on the content of 103', () => {
    const code = readCardsSql(ECON).split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/103/);
  });
});

// ---------- fixtures ----------

const T0 = '2026-11-12T10:00:00Z'; // Paris 11:00 on 12 November 2026 (UTC+1 in winter: Paris midnight is 23:00Z)
const NOHI = [1, 7, 9, 3, 2]; // C C C R U: no Gold, no Full Art
const HI = [1, 7, 9, 3, 5]; // the fifth is Gold (UR)
const FULL = [1, 7, 9, 3, 6]; // the fifth is Full Art (L)

/** The part column of 102 (the pair), added the way 102 does it. */
const PART = `
  alter table public.cards_catalog add column part smallint not null default 0;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  alter table public.cards_catalog drop constraint cards_catalog_entity_rarity_key;
  alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
`;

async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:G1', 'group', 'Group One', null, 2015, 'g1'), ('group:G2', 'group', 'Group Two', null, 2016, 'g2'),
      ('idol:A1', 'idol', 'Idol A1', 'group:G1', 2015, 'a1'), ('idol:A2', 'idol', 'Idol A2', 'group:G1', 2015, 'a2'),
      ('idol:B1', 'idol', 'Idol B1', 'group:G2', 2016, 'b1'), ('event:e1', 'event', 'Event', null, 2018, 'z'),
      ('idol:Off', 'idol', 'Idol Off', 'group:G1', 2015, 'off');
    update public.cards_entities set active = false where id = 'idol:Off';
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs, part) values
      (1, 'BV1-0001', 'idol:A1', 'C', 'std', true, 0), (2, 'BV1-0002', 'idol:A1', 'U', 'stage', true, 0), (3, 'BV1-0003', 'idol:A1', 'R', 'holo', true, 0),
      (4, 'BV1-0004', 'idol:A1', 'SR', 'era', true, 0), (5, 'BV1-0005', 'idol:A1', 'UR', 'gold', true, 0), (6, 'BV1-0006', 'idol:A1', 'L', 'full', true, 0),
      (7, 'BV1-0007', 'group:G1', 'C', 'std', true, 1), (8, 'BV1-0008', 'group:G1', 'C', 'std', true, 2),
      (9, 'BV1-0009', 'event:e1', 'C', 'std', true, 0),
      (10, 'BV1-0010', 'idol:A2', 'C', 'std', true, 0), (11, 'BV1-0011', 'idol:A2', 'U', 'stage', true, 0),
      (12, 'BV1-0012', 'idol:B1', 'C', 'std', true, 0), (13, 'BV1-0013', 'idol:B1', 'U', 'stage', true, 0),
      (15, 'BV1-0015', 'idol:Off', 'U', 'stage', true, 0), (16, 'BV1-0016', 'idol:A2', 'R', 'holo', false, 0),
      (17, 'BV1-0017', 'group:G1', 'U', 'stage', true, 1), (18, 'BV1-0018', 'group:G1', 'U', 'stage', true, 2);
    insert into public.cards_entities (id, kind, name, sort_key) select 'event:w' || g, 'event', 'W' || g, 'w' || lpad(g::text, 3, '0') from generate_series(1, 60) g;
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition)
      select 100 + g, 'BV1-' || lpad((100 + g)::text, 4, '0'), 'event:w' || g, 'C', 'std' from generate_series(1, 60) g;
  `);
}

async function econDb(withEcon = true): Promise<PGlite> {
  const db = await freshCardsDb(SCHEMA_FILES);
  await db.exec(PART);
  await seed(db);
  if (withEcon) await db.exec(readCardsSql(ECON));
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
async function open(db: PGlite, u: string, cards: number[], at: string, o: { timer?: number; focus?: string | null; source?: string } = {}): Promise<{ id: string; cards: Array<{ n: number; isNew: boolean; completesPair: boolean }>; new_count: number; pack_no: number }> {
  return one(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, $5::int, $6)', [u, o.source ?? 'stock', cards, at, o.timer ?? 40, o.focus ?? null]);
}

/** A wallet row set by hand (the stack, its anchor, the Paris day, the day's timer count, the shards). */
async function setWallet(db: PGlite, u: string, w: { stock: number; anchor: string; day: string; timer?: number; shards?: number; ads?: number }): Promise<void> {
  await db.query(
    `insert into public.cards_wallets (user_id, stock, anchor, paris_day, timer_today, shards, ads_today) values ($1, $2, $3::timestamptz, $4::date, $5, $6, $7)
     on conflict (user_id) do update set stock = $2, anchor = $3::timestamptz, paris_day = $4::date, timer_today = $5, shards = $6, ads_today = $7`,
    [u, w.stock, w.anchor, w.day, w.timer ?? 0, w.shards ?? 0, w.ads ?? 0],
  );
}
const refill = (db: PGlite, u: string): Promise<unknown> => db.query('update public.cards_wallets set stock = 5 where user_id = $1', [u]);

/** n packs written straight into cards_packs, one second apart from `from`, source cycling over `sources`. */
async function history(db: PGlite, u: string, n: number, cards: number[], from: string, sources: string[] = ['stock']): Promise<void> {
  await db.query(
    `insert into public.cards_packs (user_id, source, cards, opened_at)
     select $1::uuid, ($5::text[])[1 + (g % cardinality($5::text[]))], $2::int[], $3::timestamptz + (g * interval '1 second') from generate_series(1, $4::int) g`,
    [u, cards, from, n, sources],
  );
}

type W = Record<string, unknown>;
const wallet = async (db: PGlite, u: string, now: string, timerCap?: number): Promise<W> =>
  timerCap === undefined
    ? one<W>(db, 'select public.cards_wallet($1::uuid, $2::timestamptz, 10, 3)', [u, now])
    : one<W>(db, 'select public.cards_wallet($1::uuid, $2::timestamptz, 10, 3, $3::int)', [u, now, timerCap]);
const pity = (db: PGlite, u: string): Promise<number> => one<number>(db, 'select public.cards_pity_count($1::uuid)', [u]);
const owns = async (db: PGlite, u: string, n: number): Promise<boolean> => (await rows(db, 'select 1 from public.cards_owned where user_id = $1 and card_no = $2', [u, n])).length === 1;
const shardsOf = (db: PGlite, u: string): Promise<number> => one<number>(db, 'select shards from public.cards_wallets where user_id = $1', [u]);

// ---------- A11 ----------

describe('A11, the Gold guarantee (PITY_UR = 30)', () => {
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

  it('the 30th pack: after 29 packs without Gold the 5th card must be Gold; a Full Art or a Gold card elsewhere does not do', async () => {
    const u = await newUser(db);
    await history(db, u, 28, NOHI, '2026-11-12T01:00:00Z', ['stock', 'ad', 'shards', 'bonus']);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:00:00Z')).toBeNull(); // the 29th pack without Gold
    expect(await pity(db, u)).toBe(29);
    expect((await wallet(db, u, '2026-11-12T08:01:00Z')).pity_left).toBe(1);
    await refill(db, u);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:02:00Z')).toMatch(/cards: pity/);
    expect(await apply(db, u, 'stock', FULL, '2026-11-12T08:02:00Z')).toMatch(/cards: pity/); // a Full Art as the 5th card is not Gold
    expect(await apply(db, u, 'stock', [5, 7, 9, 3, 2], '2026-11-12T08:02:00Z')).toMatch(/cards: pity/); // Gold as the 1st card is not the 5th
    expect(await pity(db, u)).toBe(29); // nothing was stored
    expect(await apply(db, u, 'stock', HI, '2026-11-12T08:03:00Z')).toBeNull();
    expect(await pity(db, u)).toBe(0);
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T08:04:00Z')).toBeNull(); // the count starts again
  });

  it('a refused pack spends nothing (stock, timer count and ticket stay)', async () => {
    const u = await newUser(db);
    await history(db, u, 29, NOHI, '2026-11-12T01:00:00Z');
    await setWallet(db, u, { stock: 3, anchor: T0, day: '2026-11-12', timer: 7, shards: 60 });
    expect(await apply(db, u, 'shards', NOHI, T0)).toMatch(/cards: pity/);
    expect(await shardsOf(db, u)).toBe(60);
    expect(await apply(db, u, 'stock', NOHI, T0)).toMatch(/cards: pity/);
    const w = await wallet(db, u, T0);
    expect(w.stock).toBe(3);
    expect(w.timer_used).toBe(7);
  });

  it('a Full Art card resets the count like a Gold card, and the count reads the newest packs first', async () => {
    const u = await newUser(db);
    await history(db, u, 10, NOHI, '2026-11-12T01:00:00Z');
    await history(db, u, 1, FULL, '2026-11-12T02:00:00Z');
    await history(db, u, 4, NOHI, '2026-11-12T03:00:00Z');
    expect(await pity(db, u)).toBe(4);
  });

  it('the guarantee holds only while a Gold card is in packs', async () => {
    const d = await econDb();
    const u = await newUser(d);
    await history(d, u, 40, NOHI, '2026-11-12T01:00:00Z');
    expect(await d.query('update public.cards_catalog set in_packs = false where rarity = $1', ['UR'])).toBeTruthy();
    expect(await one(d, 'select public.cards_pity_pool()')).toBe(false);
    expect((await wallet(d, u, T0)).pity_left).toBeNull();
    expect(await apply(d, u, 'stock', NOHI, '2026-11-12T08:00:00Z')).toBeNull();
    await d.query('update public.cards_catalog set in_packs = true where rarity = $1', ['UR']);
    await d.query('update public.cards_entities set active = false where id = $1', ['idol:A1']);
    expect(await one(d, 'select public.cards_pity_pool()')).toBe(false); // the Gold card's entity is retired too
  });
});

// ---------- A12 ----------

describe('A12, the missing half (completesPair)', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const put = (u: string, n: number): Promise<unknown> => db.query('insert into public.cards_owned (user_id, card_no) values ($1, $2)', [u, n]);

  it('a new half whose other half is owned completes the pair; the owned half and a person card do not', async () => {
    const u = await newUser(db);
    await put(u, 7);
    const p = await open(db, u, [1, 8, 9, 3, 2], T0);
    expect(p.cards.map((c) => [c.n, c.isNew, c.completesPair])).toEqual([[1, true, false], [8, true, true], [9, true, false], [3, true, false], [2, true, false]]);
  });

  it('inside one pack: the second half completes the first', async () => {
    const u = await newUser(db);
    const p = await open(db, u, [7, 1, 8, 3, 2], T0);
    expect(p.cards.map((c) => c.completesPair)).toEqual([false, false, true, false, false]);
  });

  it('both halves owned: a repeat is not new and completes nothing', async () => {
    const u = await newUser(db);
    await put(u, 7); await put(u, 8);
    const p = await open(db, u, [7, 1, 8, 3, 2], T0);
    expect(p.cards[0]).toMatchObject({ n: 7, isNew: false, completesPair: false });
    expect(p.cards[2]).toMatchObject({ n: 8, isNew: false, completesPair: false });
  });

  it('a half of another edition does not complete this pair', async () => {
    const u = await newUser(db);
    await put(u, 17); // the Stage left half; 8 is the Standard right half
    const p = await open(db, u, [1, 8, 9, 3, 2], T0);
    expect(p.cards[1]).toMatchObject({ n: 8, isNew: true, completesPair: false });
  });
});

// ---------- A13 ----------

describe('A13, the timer cap', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('the constant and the default: 40 packs a Paris day', async () => {
    expect(TIMER_PACKS_PER_DAY).toBe(40);
    const u = await newUser(db);
    const w = await wallet(db, u, T0); // the SQL default of the cap
    expect(w).toMatchObject({ timer_cap: 40, timer_used: 0, timer_left: 40 });
  });

  it('the refills of the day are counted (the stack and the count come from the same refills)', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 1, anchor: '2026-11-12T09:00:00Z', day: '2026-11-12', timer: 14 });
    const w = await wallet(db, u, '2026-11-12T09:25:00Z', 40); // two full periods: stock 3, two refills
    expect(w).toMatchObject({ stock: 3, timer_used: 16, timer_left: 24, timer_cap: 40 });
  });

  it('a full stack adds nothing and counts nothing', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, anchor: '2026-11-12T08:00:00Z', day: '2026-11-12', timer: 6 });
    expect(await wallet(db, u, T0, 40)).toMatchObject({ stock: 5, timer_used: 6, next_at: null });
  });

  it('at the cap the stack stops adding until midnight: no next refill, and the packs in it still open', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, anchor: '2026-11-12T05:00:00Z', day: '2026-11-12', timer: 38 });
    const w = await wallet(db, u, '2026-11-12T09:00:00Z', 40); // 5 hours later: would be 5 packs, only 2 are left in the day
    expect(w).toMatchObject({ stock: 2, timer_used: 40, timer_left: 0, next_at: null });
    // the two packs open (no refusal at opening), then the stack stays empty
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T09:00:00Z')).toBeNull();
    expect(await apply(db, u, 'stock', [10, 12, 9, 13, 2], '2026-11-12T09:00:05Z')).toBeNull();
    expect(await apply(db, u, 'stock', [10, 12, 9, 13, 3], '2026-11-12T09:00:10Z')).toMatch(/cards: empty/);
    expect(await wallet(db, u, '2026-11-12T20:00:00Z', 40)).toMatchObject({ stock: 0, timer_used: 40, timer_left: 0, next_at: null });
  });

  it('a pack in the stack opens even when the day is at its cap', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 4, anchor: T0, day: '2026-11-12', timer: 40 });
    expect(await apply(db, u, 'stock', NOHI, T0)).toBeNull();
    expect(await wallet(db, u, T0)).toMatchObject({ stock: 3, timer_used: 40 });
  });

  it('the Paris midnight restarts the count and tops the stack up without counting it', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, anchor: '2026-11-12T22:00:00Z', day: '2026-11-12', timer: 40 });
    expect(await wallet(db, u, '2026-11-12T22:59:00Z', 40)).toMatchObject({ stock: 0, timer_used: 40, timer_left: 0 }); // 23:59 in Paris
    const w = await wallet(db, u, '2026-11-12T23:00:00Z', 40); // 00:00 on the 13th in Paris
    expect(w).toMatchObject({ stock: 5, timer_used: 0, timer_left: 40, paris_day: '2026-11-13' });
    // the first pack of the new day writes the reset
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T23:30:00Z')).toBeNull();
    expect(await one(db, 'select timer_today from public.cards_wallets where user_id = $1', [u])).toBe(0);
    expect(await one(db, 'select paris_day::text from public.cards_wallets where user_id = $1', [u])).toBe('2026-11-13');
  });

  it('a day with 40 refills is not 40 + the top-up: the top-up of the day before does not count', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 2, anchor: '2026-11-12T22:30:00Z', day: '2026-11-12', timer: 3 });
    // 23:35Z is Paris 00:35 of the 13th: top-up to 5 (not counted), the anchor is the instant of the top-up, no refill yet
    expect(await wallet(db, u, '2026-11-12T23:35:00Z', 40)).toMatchObject({ stock: 5, timer_used: 0 });
    expect(await apply(db, u, 'stock', NOHI, '2026-11-12T23:35:00Z')).toBeNull(); // stock 4, the anchor restarts now
    expect(await wallet(db, u, '2026-11-12T23:46:00Z', 40)).toMatchObject({ stock: 5, timer_used: 1 });
  });

  it('CARDS_TIMER_PER_DAY: the cap given by the server replaces 40 (a cap of 3, and a cap of 0 closes the timer)', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, anchor: '2026-11-12T05:00:00Z', day: '2026-11-12', timer: 0 });
    expect(await wallet(db, u, T0, 3)).toMatchObject({ stock: 3, timer_used: 3, timer_left: 0, timer_cap: 3 });
    expect(await wallet(db, u, T0, 0)).toMatchObject({ stock: 0, timer_used: 0, timer_left: 0, timer_cap: 0, next_at: null });
    expect(await wallet(db, u, T0, 500)).toMatchObject({ stock: 5, timer_used: 5, timer_left: 495 });
  });

  it('is the exact twin of walletAt in lib/cards/rules.ts, with the cap', async () => {
    const nows = ['2026-11-12T09:05:00Z', '2026-11-12T09:35:00Z', '2026-11-12T12:00:00Z', '2026-11-12T22:59:59Z', '2026-11-12T23:00:00Z', '2026-11-13T05:00:00Z'];
    for (const stock of [0, 2, 4, 5]) for (const timer of [0, 37, 40]) for (const cap of [3, 40]) for (const now of nows) {
      const anchor = '2026-11-12T09:00:00Z';
      const sql = await one<{ stock: number; anchor: string; timer_today: number; paris_day: string }>(db,
        `select public.cards_roll($1, $2::timestamptz, '2026-11-12'::date, 0, 0, $3::timestamptz, $4, $5)`, [stock, anchor, now, timer, cap]);
      const ts = walletAt({ stock, anchor: +new Date(anchor), parisDay: '2026-11-12', adsToday: 0, bonusToday: 0, timerToday: timer }, +new Date(now), cap);
      expect([sql.stock, new Date(sql.anchor).getTime(), sql.timer_today, sql.paris_day], `${stock} ${timer} ${cap} ${now}`).toEqual([ts.stock, ts.anchor, ts.timerToday, ts.parisDay]);
    }
  });

  it('a partial period is kept: a refill at the cap leaves the anchor where the last counted refill put it', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, anchor: '2026-11-12T09:00:00Z', day: '2026-11-12', timer: 39 });
    expect(await wallet(db, u, '2026-11-12T09:35:00Z', 40)).toMatchObject({ stock: 1, timer_used: 40, next_at: null });
    const roll = await one<W>(db, `select public.cards_roll(0, '2026-11-12T09:00:00Z'::timestamptz, '2026-11-12'::date, 0, 0, '2026-11-12T09:35:00Z'::timestamptz, 39, 40)`);
    expect(new Date(roll.anchor as string).toISOString()).toBe('2026-11-12T09:10:00.000Z');
  });
});

// ---------- A14 ----------

describe('A14, craft', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const craft = (u: string, n: number, at = T0): Promise<string | null> => failure(db, 'select public.cards_craft($1::uuid, $2, $3::timestamptz)', [u, n, at]);

  // Owner request of 2026-11-25: the TypeScript list (CRAFT_COST) is now 200 to 3200; these are the prices of the older body (104), which L41 replaces
  // (craft-cost-sql.test.ts proves the new body and that the SQL and CRAFT_COST agree once L41 is applied).
  it('the costs of the 104 body: Standard 10, Stage 20, Holo 50, Era 120, Gold 300; a Full Art has none', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, anchor: T0, day: '2026-11-12', shards: 1000 });
    const want: Array<[number, number]> = [[1, 10], [2, 20], [3, 50], [4, 120], [5, 300]];
    let left = 1000;
    for (const [n, cost] of want) {
      const r = await one<{ cost: number; shards: number }>(db, 'select public.cards_craft($1::uuid, $2, $3::timestamptz)', [u, n, T0]);
      left -= cost;
      expect(r).toMatchObject({ cost, shards: left });
      expect(await owns(db, u, n)).toBe(true);
    }
    expect(await shardsOf(db, u)).toBe(left);
    expect(await one(db, 'select count(*)::int from public.cards_crafts where user_id = $1', [u])).toBe(5);
  });

  it('a Full Art is refused in SQL even with plenty of shards', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, anchor: T0, day: '2026-11-12', shards: 5000 });
    expect(await craft(u, 6)).toMatch(/cards: no_craft/);
    expect(await owns(db, u, 6)).toBe(false);
    expect(await shardsOf(db, u)).toBe(5000);
  });

  it('refuses an owned card, a card out of the packs, a retired entity, an unknown card and short shards; nothing changes', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, anchor: T0, day: '2026-11-12', shards: 25 });
    expect(await craft(u, 3)).toMatch(/cards: shards/);
    expect(await craft(u, 1)).toBeNull();
    expect(await craft(u, 1)).toMatch(/cards: owned/);
    expect(await craft(u, 16)).toMatch(/cards: card/);
    expect(await craft(u, 15)).toMatch(/cards: card/);
    expect(await craft(u, 9999)).toMatch(/cards: card/);
    expect(await shardsOf(db, u)).toBe(15);
    const nobody = await newUser(db);
    expect(await craft(nobody, 1)).toMatch(/cards: shards/); // no wallet yet
  });

  it('is one transaction with the ledger, the moment columns and the wishlist: first_source craft, first_pack_no the packs so far', async () => {
    const u = await newUser(db);
    await open(db, u, NOHI, T0);
    await open(db, u, [10, 12, 9, 13, 11], '2026-11-12T10:01:00Z');
    await db.query('update public.cards_wallets set shards = 100 where user_id = $1', [u]);
    await db.query('insert into public.cards_wishlist (user_id, card_no) values ($1, 4)', [u]);
    await db.query('insert into public.cards_wishlist (user_id, card_no) values ($1, 13)', [u]);
    await db.query('update public.cards_wishlist set card_no = card_no where user_id = $1', [u]);
    expect(await craft(u, 13)).toMatch(/cards: owned/);
    await db.query('delete from public.cards_owned where user_id = $1 and card_no = 4', [u]);
    expect(await craft(u, 4, '2026-11-12T10:02:00Z')).toMatch(/cards: shards/);
    await db.query('update public.cards_wallets set shards = 130 where user_id = $1', [u]);
    expect(await craft(u, 4, '2026-11-12T10:02:00Z')).toBeNull();
    const o = (await rows<{ first_pack_no: number; first_source: string }>(db, 'select first_pack_no, first_source from public.cards_owned where user_id = $1 and card_no = 4', [u]))[0];
    expect(o).toEqual({ first_pack_no: 2, first_source: 'craft' });
    expect(await one(db, 'select count(*)::int from public.cards_wishlist where user_id = $1 and card_no = 4', [u])).toBe(0);
    const led = (await rows<{ card_no: number; rarity: string; cost: number }>(db, 'select card_no, rarity, cost from public.cards_crafts where user_id = $1', [u]))[0];
    expect(led).toEqual({ card_no: 4, rarity: 'SR', cost: 120 });
  });

  it('the ledger and the wishlist are closed to the browser roles', async () => {
    for (const t of ['cards_crafts', 'cards_wishlist']) {
      expect(await one(db, `select relrowsecurity from pg_class where relname = $1 and relnamespace = 'public'::regnamespace`, [t])).toBe(true);
      expect(await one(db, `select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = $1 and grantee in ('anon', 'authenticated', 'PUBLIC')`, [t])).toBe(0);
    }
  });
});

// ---------- A17 ----------

describe('A17, the wishlist', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const wish = (u: string, n: number, on: boolean): Promise<string | null> => failure(db, 'select public.cards_wish($1::uuid, $2, $3, $4::timestamptz)', [u, n, on, T0]);

  it('adds, removes, and is idempotent', async () => {
    const u = await newUser(db);
    expect(await one(db, 'select public.cards_wish($1::uuid, 3, true, $2::timestamptz)', [u, T0])).toEqual({ on: true, count: 1 });
    expect(await one(db, 'select public.cards_wish($1::uuid, 3, true, $2::timestamptz)', [u, T0])).toEqual({ on: true, count: 1 });
    expect(await one(db, 'select public.cards_wish($1::uuid, 3, false, $2::timestamptz)', [u, T0])).toEqual({ on: false, count: 0 });
    expect(await wish(u, 3, false)).toBeNull();
  });

  it('refuses an owned card, a card out of the packs, a retired entity', async () => {
    const u = await newUser(db);
    await db.query('insert into public.cards_owned (user_id, card_no) values ($1, 2)', [u]);
    expect(await wish(u, 2, true)).toMatch(/cards: owned/);
    expect(await wish(u, 16, true)).toMatch(/cards: card/);
    expect(await wish(u, 15, true)).toMatch(/cards: card/);
  });

  it(`holds at most ${WISHLIST_MAX} cards`, async () => {
    expect(WISHLIST_MAX).toBe(50);
    const u = await newUser(db);
    for (let g = 1; g <= 50; g++) expect(await wish(u, 100 + g, true)).toBeNull();
    expect(await wish(u, 111, true)).toBeNull(); // already there
    expect(await wish(u, 9, true)).toMatch(/cards: wish_limit/);
    expect(await wish(u, 101, false)).toBeNull();
    expect(await wish(u, 9, true)).toBeNull();
  });

  it('a card that comes in a pack leaves the wishlist', async () => {
    const u = await newUser(db);
    await wish(u, 3, true); await wish(u, 4, true);
    await open(db, u, NOHI, T0);
    expect((await rows<{ card_no: number }>(db, 'select card_no from public.cards_wishlist where user_id = $1', [u])).map((r) => r.card_no)).toEqual([4]);
  });
});

describe('A17, the focus pack', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  // positions 2 and 4 (index 1 and 3) of G1: cards 1 (A1) and 11 (A2); G2 is card 12 and 13
  const G1_OK = [12, 1, 9, 11, 3];

  it('cards 2 and 4 come from the group (its own cards and those of its idols), the others from anywhere', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', G1_OK, T0, { focus: 'group:G1' })).toBeNull();
    const f = await one(db, 'select focus from public.cards_packs where user_id = $1', [u]);
    expect(f).toBe('group:G1');
  });

  it('card 2 or card 4 from another group is refused when the group has a card of that rarity', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [1, 12, 9, 11, 3], T0, { focus: 'group:G1' })).toMatch(/cards: pack/); // card 2 is B1
    expect(await apply(db, u, 'stock', [12, 1, 9, 13, 3], T0, { focus: 'group:G1' })).toMatch(/cards: pack/); // card 4 is B1
    expect(await apply(db, u, 'stock', [1, 12, 9, 11, 3], T0)).toBeNull(); // the same cards without a focus are fine
  });

  it('cards 1, 3 and 5 are free: they may be of any group', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', [12, 1, 13, 11, 2], T0, { focus: 'group:G1' })).toBeNull();
  });

  it('a group with no card of the rolled edition falls back to the whole pool', async () => {
    const u = await newUser(db);
    // G2 has Standard and Stage cards only: card 4 is a Holo (card 3, A1 of G1) and passes; card 2 is G2's
    expect(await apply(db, u, 'stock', [1, 12, 9, 3, 2], T0, { focus: 'group:G2' })).toBeNull();
  });

  it('once a Paris day: a second focus pack is refused, the next Paris day allows one again; a plain pack is not limited', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'stock', G1_OK, '2026-11-12T08:00:00Z', { focus: 'group:G1' })).toBeNull();
    expect(await apply(db, u, 'stock', G1_OK, '2026-11-12T09:00:00Z', { focus: 'group:G1' })).toMatch(/cards: focus_used/);
    expect(await apply(db, u, 'stock', G1_OK, '2026-11-12T09:00:00Z')).toBeNull();
    expect((await wallet(db, u, '2026-11-12T09:30:00Z')).focus_used).toBe(true);
    expect(await apply(db, u, 'stock', G1_OK, '2026-11-12T22:59:00Z', { focus: 'group:G1' })).toMatch(/cards: focus_used/);
    expect((await wallet(db, u, '2026-11-12T23:01:00Z')).focus_used).toBe(false);
    await refill(db, u);
    expect(await apply(db, u, 'stock', G1_OK, '2026-11-12T23:01:00Z', { focus: 'group:G1' })).toBeNull();
  });

  it('is a pack of the stack: another source, a non-group, an unknown or a retired group is refused', async () => {
    const u = await newUser(db);
    await db.query('update public.cards_wallets set shards = 100 where user_id = $1', [u]).catch(() => undefined);
    expect(await apply(db, u, 'shards', G1_OK, T0, { focus: 'group:G1' })).toMatch(/cards: focus/);
    expect(await apply(db, u, 'stock', G1_OK, T0, { focus: 'idol:A1' })).toMatch(/cards: focus/);
    expect(await apply(db, u, 'stock', G1_OK, T0, { focus: 'group:nope' })).toMatch(/cards: focus/);
    await db.query(`update public.cards_entities set active = false where id = 'group:G2'`);
    expect(await apply(db, u, 'stock', G1_OK, T0, { focus: 'group:G2' })).toMatch(/cards: focus/);
    await db.query(`update public.cards_entities set active = true where id = 'group:G2'`);
  });

  it('a focus pack takes a pack of the stack', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { stock: 2, anchor: T0, day: '2026-11-12' });
    expect(await apply(db, u, 'stock', G1_OK, T0, { focus: 'group:G1' })).toBeNull();
    expect((await wallet(db, u, T0)).stock).toBe(1);
  });
});

// ---------- B4 ----------

describe('B4, the rewarded ad gives shards', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });
  const ticket = async (u: string, issued: string): Promise<string> => {
    const id = randomUUID();
    await db.query('insert into public.cards_ad_tickets (id, user_id, issued_at) values ($1, $2, $3::timestamptz)', [id, u, issued]);
    return id;
  };
  const grant = (u: string, t: string, at: string, o: { limit?: number; shards?: number } = {}): Promise<string | null> =>
    failure(db, 'select public.cards_ad_grant($1::uuid, $2::uuid, $3::timestamptz, $4, $5, 40)', [u, t, at, o.limit ?? 10, o.shards ?? 25]);

  it('a new ad pack is refused (the value stays allowed in the table for the history)', async () => {
    const u = await newUser(db);
    expect(await apply(db, u, 'ad', NOHI, T0)).toMatch(/cards: source/);
    await db.query(`insert into public.cards_packs (user_id, source, cards) values ($1, 'ad', $2::int[])`, [u, NOHI]); // an old ad pack is still a legal row
    expect(await one(db, 'select count(*)::int from public.cards_packs where user_id = $1', [u])).toBe(1);
  });

  it('gives 25 shards, counts the ad, spends the ticket once', async () => {
    const u = await newUser(db);
    const t = await ticket(u, '2026-11-12T09:59:00Z');
    expect(await one(db, 'select public.cards_ad_grant($1::uuid, $2::uuid, $3::timestamptz, 10, 25, 40)', [u, t, T0])).toEqual({ gained: 25, shards: 25, ads_today: 1 });
    expect(await grant(u, t, T0)).toMatch(/cards: ticket/); // replay
    expect(await shardsOf(db, u)).toBe(25);
    expect(await wallet(db, u, T0)).toMatchObject({ shards: 25, ads_today: 1, ads_left: 9 });
    expect(await one(db, 'select count(*)::int from public.cards_packs where user_id = $1', [u])).toBe(0); // no pack
  });

  it('CARDS_AD_SHARDS: the amount comes from the server (50)', async () => {
    const u = await newUser(db);
    const t = await ticket(u, '2026-11-12T09:59:00Z');
    expect(await grant(u, t, T0, { shards: 50 })).toBeNull();
    expect(await shardsOf(db, u)).toBe(50);
  });

  it('the ticket ages: under 10 s refused (and kept), 10 s accepted, 1 h accepted, over 1 h refused', async () => {
    const u = await newUser(db);
    const t = await ticket(u, '2026-11-12T09:59:55Z');
    expect(await grant(u, t, T0)).toMatch(/cards: ticket/); // 5 s old
    expect(await grant(u, t, '2026-11-12T10:00:04Z')).toMatch(/cards: ticket/); // 9 s
    expect(await grant(u, t, '2026-11-12T10:00:05Z')).toBeNull(); // 10 s: the refused tries did not spend it
    const t2 = await ticket(u, '2026-11-12T09:00:00Z');
    expect(await grant(u, t2, T0)).toBeNull(); // exactly 1 h
    const t3 = await ticket(u, '2026-11-12T08:59:59Z');
    expect(await grant(u, t3, T0)).toMatch(/cards: ticket/); // 1 h and 1 s
    expect(await shardsOf(db, u)).toBe(50);
  });

  it('a foreign or unknown ticket is refused', async () => {
    const u = await newUser(db);
    const other = await newUser(db);
    const t = await ticket(other, '2026-11-12T09:00:00Z');
    expect(await grant(u, t, T0)).toMatch(/cards: ticket/);
    expect(await grant(u, randomUUID(), T0)).toMatch(/cards: ticket/);
  });

  it('10 ads a Paris day, then ad_limit (and the limit is not spent by a refused ticket); the next Paris day starts again', async () => {
    const u = await newUser(db);
    for (let i = 0; i < 10; i++) expect(await grant(u, await ticket(u, '2026-11-12T09:30:00Z'), `2026-11-12T10:00:${String(i).padStart(2, '0')}Z`)).toBeNull();
    const t = await ticket(u, '2026-11-12T09:30:00Z');
    expect(await grant(u, t, '2026-11-12T10:05:00Z')).toMatch(/cards: ad_limit/);
    expect(await shardsOf(db, u)).toBe(250);
    expect(await wallet(db, u, '2026-11-12T10:05:00Z')).toMatchObject({ ads_left: 0 });
    const t2 = await ticket(u, '2026-11-12T23:00:00Z');
    expect(await grant(u, t2, '2026-11-12T23:30:00Z')).toBeNull(); // 00:30 in Paris on the 13th
    expect(await shardsOf(db, u)).toBe(275);
    expect(await wallet(db, u, '2026-11-12T23:30:00Z')).toMatchObject({ ads_today: 1 });
  });

  it('a ticket is still issued by 002 (cards_issue_ticket), up to the day\'s limit', async () => {
    const u = await newUser(db);
    const ids: Array<string | null> = [];
    for (let i = 0; i < 3; i++) ids.push(await one<string | null>(db, 'select public.cards_issue_ticket($1::uuid, $2::timestamptz, 2)', [u, T0]));
    expect(ids[0]).not.toBeNull(); expect(ids[1]).not.toBeNull(); expect(ids[2]).toBeNull();
  });
});

// ---------- B3 ----------

describe('B3, the moment', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('first_pack_no and first_source are written for new pulls only, never for a repeat', async () => {
    const u = await newUser(db);
    await open(db, u, [1, 7, 9, 3, 2], T0);
    await open(db, u, [1, 10, 9, 12, 2], '2026-11-12T10:01:00Z');
    const o = await rows<{ card_no: number; first_pack_no: number; first_source: string; copies: number }>(db, 'select card_no, first_pack_no, first_source, copies from public.cards_owned where user_id = $1 order by card_no', [u]);
    expect(o.map((r) => [r.card_no, r.first_pack_no, r.first_source, r.copies])).toEqual([
      [1, 1, 'pack', 2], [2, 1, 'pack', 2], [3, 1, 'pack', 1], [7, 1, 'pack', 1], [9, 1, 'pack', 2], [10, 2, 'pack', 1], [12, 2, 'pack', 1]]);
  });

  it('a card that was there before 104 stays null when it comes again (nothing is backfilled)', async () => {
    const u = await newUser(db);
    await db.query('insert into public.cards_owned (user_id, card_no) values ($1, 1)', [u]);
    expect(await one(db, 'select count(*)::int from public.cards_owned where user_id = $1 and (first_pack_no is not null or first_source is not null)', [u])).toBe(0);
    await open(db, u, NOHI, T0);
    const o = (await rows<{ first_pack_no: number | null; first_source: string | null; copies: number }>(db, 'select first_pack_no, first_source, copies from public.cards_owned where user_id = $1 and card_no = 1', [u]))[0];
    expect(o).toEqual({ first_pack_no: null, first_source: null, copies: 2 });
  });

  it('the demo source is allowed, an unknown one is not', async () => {
    const u = await newUser(db);
    expect(await failure(db, `insert into public.cards_owned (user_id, card_no, first_pack_no, first_source) values ($1, 1, 0, 'demo')`, [u])).toBeNull();
    expect(await failure(db, `insert into public.cards_owned (user_id, card_no, first_pack_no, first_source) values ($1, 2, 0, 'gift')`, [u])).toMatch(/first_source_check/);
  });

  it('new_count is the cards new to the player in the pack (a repeat inside the pack counts once)', async () => {
    const u = await newUser(db);
    const a = await open(db, u, [1, 1, 9, 3, 2], T0);
    expect(a.new_count).toBe(4);
    expect(a.pack_no).toBe(1);
    const b = await open(db, u, [1, 3, 10, 2, 2], '2026-11-12T10:01:00Z');
    expect(b.new_count).toBe(1);
    expect(b.pack_no).toBe(2);
    expect(await rows(db, 'select new_count from public.cards_packs where user_id = $1 order by opened_at', [u])).toEqual([{ new_count: 4 }, { new_count: 1 }]);
    await history(db, u, 1, NOHI, '2026-11-12T01:00:00Z'); // an older row written without new_count
    expect(await one(db, 'select count(*)::int from public.cards_packs where user_id = $1 and new_count is null', [u])).toBe(1);
  });

  it('cards_recent_packs gives the last 10 packs: opened_at, best rarity, source, new_count, newest first', async () => {
    const u = await newUser(db);
    await open(db, u, [1, 7, 9, 3, 2], '2026-11-12T08:00:00Z');
    await open(db, u, [1, 7, 9, 3, 4], '2026-11-12T08:10:00Z', { source: 'stock' });
    await history(db, u, 12, NOHI, '2026-11-12T01:00:00Z', ['shards']);
    const r = await one<Array<{ opened_at: string; best: string; source: string; new_count: number | null }>>(db, 'select public.cards_recent_packs($1::uuid)', [u]);
    expect(r).toHaveLength(10);
    expect(r[0]).toMatchObject({ best: 'SR', source: 'stock', new_count: 1 });
    expect(r[1]).toMatchObject({ best: 'R', source: 'stock', new_count: 5 });
    expect(r[2]).toMatchObject({ best: 'R', source: 'shards', new_count: null });
    expect(new Date(r[0]!.opened_at).getTime()).toBeGreaterThan(new Date(r[1]!.opened_at).getTime());
    const two = await one<unknown[]>(db, 'select public.cards_recent_packs($1::uuid, 2)', [u]);
    expect(two).toHaveLength(2);
    expect(await one(db, 'select public.cards_recent_packs($1::uuid)', [await newUser(db)])).toEqual([]);
  });
});

// ---------- structure, idempotence, rollback ----------

const objects = async (db: PGlite): Promise<unknown> => ({
  fn: await rows(db, `select proname, pg_get_function_identity_arguments(oid) as args from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%' order by 1, 2`),
  col: await rows(db, `select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name like 'cards\\_%' order by 1, 2`),
  con: await rows(db, `select conname from pg_constraint where connamespace = 'public'::regnamespace order by 1`),
  idx: await rows(db, `select indexname from pg_indexes where schemaname = 'public' order by 1`),
});

describe('104 is additive, idempotent and closed', () => {
  let db: PGlite;
  beforeAll(async () => { db = await econDb(); });

  it('a second run changes nothing, and exactly one function of each replaced name exists', async () => {
    const before = await objects(db);
    await db.exec(readCardsSql(ECON));
    expect(await objects(db)).toEqual(before);
    for (const name of ['cards_roll', 'cards_wallet', 'cards_apply_pack']) {
      expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = $1`, [name])).toBe(1);
    }
  });

  it('the new objects: 7 functions, 5 columns, 2 tables with row level security and no browser grant', async () => {
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_pity_count', 'cards_pity_pool', 'cards_focus_used', 'cards_craft', 'cards_wish', 'cards_ad_grant', 'cards_recent_packs')`)).toBe(7);
    expect(await one(db, `select count(*)::int from information_schema.columns where table_schema = 'public' and ((table_name = 'cards_wallets' and column_name = 'timer_today') or (table_name = 'cards_packs' and column_name in ('focus', 'new_count')) or (table_name = 'cards_owned' and column_name in ('first_pack_no', 'first_source')))`)).toBe(5);
    expect(await one(db, `select count(*)::int from pg_tables where schemaname = 'public' and tablename in ('cards_crafts', 'cards_wishlist') and rowsecurity`)).toBe(2);
  });

  it('every cards function stays closed to anon and authenticated, open to service_role', async () => {
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'`)).toBe(false);
    expect(await one(db, `select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'`)).toBe(true);
  });

  it('an empty database: the Verify values of the header', async () => {
    const nobody = '00000000-0000-0000-0000-000000000000';
    const w = await wallet(db, nobody, '2026-11-12T10:00:00Z');
    expect(w.timer_left).toBe(40);
    expect(w.pity_left).toBe(30);
    expect(await one(db, 'select count(*)::int from public.cards_owned where first_pack_no is not null or first_source is not null')).toBeGreaterThanOrEqual(0);
  });

  it('refuses to run without the part column of 102', async () => {
    const d = await freshCardsDb(SCHEMA_FILES);
    await expect(d.exec(readCardsSql(ECON))).rejects.toThrow(/102-catalog-rebuild/);
  });

  it('refuses to run without 002', async () => {
    const d = await freshCardsDb(['001-schema.sql']);
    await expect(d.exec(readCardsSql(ECON))).rejects.toThrow(/002-functions/);
  });
});

describe('the rollback restores the behaviour of 002', () => {
  it('the 002 functions come back, the 104 objects go, and 104 runs again after it', async () => {
    const base = await freshCardsDb(SCHEMA_FILES);
    await base.exec(PART);
    const at002 = await objects(base);
    const db = await econDb();
    await db.exec(readCardsSql(ECON_UNDO));
    // the structure is the one of 002 (plus the part column the fixture added)
    expect((await objects(db) as { fn: unknown }).fn).toEqual((at002 as { fn: unknown }).fn);
    expect((await objects(db) as { idx: unknown }).idx).toEqual((at002 as { idx: unknown }).idx);
    expect((await objects(db) as { col: unknown }).col).toEqual((at002 as { col: unknown }).col);
    const u = await newUser(db);
    // 002 behaviour: no timer keys in the wallet, an ad pack opens, no Gold promise, a 5-argument-free call works
    const w = await one<W>(db, 'select public.cards_wallet($1::uuid, $2::timestamptz, 10, 3)', [u, T0]);
    expect(w).not.toHaveProperty('timer_left');
    expect(w).toHaveProperty('stock', 5);
    const t = randomUUID();
    await db.query('insert into public.cards_ad_tickets (id, user_id, issued_at) values ($1, $2, $3::timestamptz)', [t, u, '2026-11-12T09:59:00Z']);
    expect(await failure(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], $4::uuid, $5::timestamptz, 10, 3)', [u, 'ad', NOHI, t, T0])).toBeNull();
    await history(db, u, 35, NOHI, '2026-11-12T01:00:00Z');
    expect(await failure(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3)', [u, 'stock', NOHI, '2026-11-12T11:00:00Z'])).toBeNull();
    // a second rollback changes nothing, and 104 comes back
    await db.exec(readCardsSql(ECON_UNDO));
    await db.exec(readCardsSql(ECON));
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack'`)).toBe(1);
    expect((await wallet(db, u, T0)).timer_left).toBe(40);
  });

  it('is refused while a craft is recorded', async () => {
    const db = await econDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, anchor: T0, day: '2026-11-12', shards: 50 });
    await db.query('select public.cards_craft($1::uuid, 1, $2::timestamptz)', [u, T0]);
    await expect(db.exec(readCardsSql(ECON_UNDO))).rejects.toThrow(/a craft is recorded/);
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft'`)).toBe(1);
  });
});
