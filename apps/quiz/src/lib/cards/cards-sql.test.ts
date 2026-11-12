// Bunnyverse Cards: the one-DO-block pin of the SQL files (same rule as lib/dle/editor-safe-sql.test.ts) and the pglite proofs of the
// wallet and the pack: the exact files 001, 002 and 003 are run, then cards_wallet and cards_apply_pack are driven with an injected p_now.
// The concurrent double spend needs two sessions and runs on a throwaway Postgres in cards-sql-concurrency.test.ts.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { BASE, BASE_NO_DLE, CARDS_SQL, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';
import { CAP, PERIOD_MS, SHARDS, nextParisMidnight, walletAt } from './rules';

import type { PGlite } from '@electric-sql/pglite';

const FILES: [file: string, tag: string][] = [
  ['001-schema.sql', 'c001'],
  ['001-schema.rollback.sql', 'c001r'],
  ['002-functions.sql', 'c002'],
  ['002-functions.rollback.sql', 'c002r'],
  ['003-rls.sql', 'c003'],
  ['003-rls.rollback.sql', 'c003r'],
];

describe('cards files the owner may run from the Supabase SQL Editor are one DO block', () => {
  it.each(FILES)('%s', (file, tag) => {
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
  });
  it('the SQL never recomputes XP, levels, streaks or badges and never draws', () => {
    for (const [file] of FILES) {
      const code = readCardsSql(file).split('\n').filter((l) => !l.startsWith('--')).join('\n');
      expect(code).not.toMatch(/\b(award_xp|xp_total|streak|badge|random\(\)|setseed)\b/i);
    }
  });
});

// ---------- fixtures ----------

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const T0 = Date.parse('2026-11-12T10:00:00Z'); // Paris 11:00 on 12 November 2026
const iso = (ms: number): string => new Date(ms).toISOString();

async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into auth.users values ('${U1}'), ('${U2}');
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:Q2', 'group', 'GRP', null, 2015, 'a'), ('idol:Q1', 'idol', 'Idol', 'group:Q2', 2015, 'a1'), ('event:e1', 'event', 'Ev', null, 2018, 'z'),
      ('idol:Q9', 'idol', 'Off', 'group:Q2', 2015, 'a9');
    update public.cards_entities set active = false where id = 'idol:Q9';
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition) values
      (1, 'BV1-0001', 'idol:Q1', 'C', 'std'), (2, 'BV1-0002', 'idol:Q1', 'U', 'stage'), (3, 'BV1-0003', 'idol:Q1', 'R', 'holo'),
      (4, 'BV1-0004', 'idol:Q1', 'SR', 'era'), (5, 'BV1-0005', 'idol:Q1', 'UR', 'gold'), (6, 'BV1-0006', 'idol:Q1', 'L', 'full'),
      (7, 'BV1-0007', 'group:Q2', 'C', 'std'), (8, 'BV1-0008', 'group:Q2', 'U', 'stage'), (9, 'BV1-0009', 'event:e1', 'C', 'std'),
      (10, 'BV1-0010', 'idol:Q9', 'U', 'stage');
  `);
}

const PACK = [1, 7, 9, 3, 2]; // five cards, the fifth is U
type W = {
  stock: number; anchor: string; paris_day: string; ads_today: number; bonus_today: number; shards: number;
  ads_left: number; bonus_left: number; next_at: string | null; midnight_at: string;
};
const wallet = (db: PGlite, u: string, now: number, ads = 10, bonus = 3) =>
  one<W>(db, 'select public.cards_wallet($1, $2::timestamptz, $3, $4)', [u, iso(now), ads, bonus]);
const open = (db: PGlite, u: string, source: string, cards: number[], now: number, ticket: string | null = null, ads = 10, bonus = 3) =>
  one<{ id: string; cards: { n: number; isNew: boolean }[] }>(
    db, 'select public.cards_apply_pack($1, $2, $3::int[], $4::uuid, $5::timestamptz, $6, $7)', [u, source, cards, ticket, iso(now), ads, bonus]);
const setWallet = (db: PGlite, u: string, w: { stock: number; anchor: number; day: string; ads?: number; bonus?: number; shards?: number }) =>
  db.query(
    `insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards)
     values ($1, $2, $3::timestamptz, $4::date, $5, $6, $7)
     on conflict (user_id) do update set stock = excluded.stock, anchor = excluded.anchor, paris_day = excluded.paris_day,
       ads_today = excluded.ads_today, bonus_today = excluded.bonus_today, shards = excluded.shards`,
    [u, w.stock, iso(w.anchor), w.day, w.ads ?? 0, w.bonus ?? 0, w.shards ?? 0]);

let db: PGlite;
beforeEach(async () => {
  db = await freshCardsDb();
  await seed(db);
});

describe('schema, RLS and grants', () => {
  it('9 tables, RLS on, no policy, no browser grant, the bucket', async () => {
    expect(await one(db, `select count(*)::int from information_schema.tables where table_schema='public' and table_name like 'cards\\_%'`)).toBe(9);
    expect(await one(db, `select count(*)::int from pg_tables where schemaname='public' and tablename like 'cards\\_%' and rowsecurity`)).toBe(9);
    expect(await one(db, `select count(*)::int from pg_indexes where schemaname='public' and tablename like 'cards\\_%'`)).toBe(24); // the Verify line of 001
    expect(await one(db, `select count(*)::int from pg_policies where schemaname='public' and tablename like 'cards\\_%'`)).toBe(0);
    expect(await one(db, `select count(*)::int from information_schema.role_table_grants where table_schema='public' and table_name like 'cards\\_%' and grantee in ('anon','authenticated')`)).toBe(0);
    expect(await rows(db, `select id, public, file_size_limit::int as lim from storage.buckets where id='cards'`)).toEqual([{ id: 'cards', public: true, lim: 1048576 }]);
  });
  it('10 functions, executable by service_role only', async () => {
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace='public'::regnamespace and proname like 'cards\\_%'`)).toBe(10);
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'cards\\_%'`)).toBe(false);
    expect(await one(db, `select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'cards\\_%'`)).toBe(true);
  });
  it('a second run of each file changes nothing, and the rollbacks undo in reverse', async () => {
    for (const f of ['001-schema.sql', '002-functions.sql', '003-rls.sql']) await db.exec(readCardsSql(f));
    expect(await one(db, `select count(*)::int from public.cards_catalog`)).toBe(10);
    await db.exec(readCardsSql('003-rls.rollback.sql'));
    expect(await one(db, `select count(*)::int from storage.buckets where id='cards'`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_tables where schemaname='public' and tablename like 'cards\\_%' and rowsecurity`)).toBe(0);
    await db.exec(readCardsSql('002-functions.rollback.sql'));
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace='public'::regnamespace and proname like 'cards\\_%'`)).toBe(0);
    // 001 rollback refuses while a collection exists, then drops everything once it is empty.
    await db.exec(readCardsSql('002-functions.sql'));
    await open(db, U1, 'stock', PACK, T0);
    expect(await failure(db, readCardsSql('001-schema.rollback.sql'))).toMatch(/owned card rows exist/);
    await db.exec(`delete from public.cards_owned; delete from public.cards_packs;`);
    await db.exec(readCardsSql('001-schema.rollback.sql'));
    expect(await one(db, `select count(*)::int from information_schema.tables where table_schema='public' and table_name like 'cards\\_%'`)).toBe(0);
  });
  it('the catalog checks: edition follows rarity, one card per entity and rarity', async () => {
    expect(await failure(db, `insert into public.cards_catalog values (20, 'BV1-0020', 'idol:Q1', 'C', 'gold', null, true)`)).toMatch(/edition_rarity/);
    expect(await failure(db, `insert into public.cards_catalog values (21, 'BV1-0021', 'idol:Q1', 'C', 'std', null, true)`)).toMatch(/entity_rarity/);
    expect(await failure(db, `insert into public.cards_catalog values (22, 'bad', 'idol:Q1', 'UR', 'gold', null, true)`)).toMatch(/num_check/);
  });
});

describe('review 1 finding 2: no table is open between 001 and 003', () => {
  it('under Supabase default grants, 001 alone leaves every cards table with RLS on and no browser grant', async () => {
    const d = await freshCardsDb(['001-schema.sql'], `${BASE}\nalter default privileges in schema public grant all on tables to anon, authenticated, service_role;`);
    expect(await one(d, `select count(*)::int from pg_tables where schemaname='public' and tablename like 'cards\\_%'`)).toBe(9);
    expect(await one(d, `select count(*)::int from pg_tables where schemaname='public' and tablename like 'cards\\_%' and not rowsecurity`)).toBe(0);
    expect(await one(d, `select count(*)::int from information_schema.role_table_grants where table_schema='public' and table_name like 'cards\\_%' and grantee in ('anon','authenticated','PUBLIC')`)).toBe(0);
    const asRole = async (role: string, sql: string): Promise<string | null> => {
      await d.exec(`set role ${role}`);
      try {
        return await failure(d, sql);
      } finally {
        await d.exec('reset role');
      }
    };
    for (const role of ['anon', 'authenticated']) {
      expect(await asRole(role, `select count(*) from public.cards_wallets`), role).toMatch(/permission denied/);
      expect(await asRole(role, `insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref) values (gen_random_uuid(), current_date, 'kpopdle', 'x')`), role).toMatch(/permission denied/);
    }
  });
});

describe('cards_photos columns of amendment 1', () => {
  it('source, file focal point, small_2x and the 50/30 default exist', async () => {
    await db.exec(`insert into public.cards_photos (id, entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at)
      values (1, 'idol:Q1', 1, 'commons', 'p', 'f', 'A', 'CC0', 'l', false, '2026-11-01')`);
    expect(await rows(db, `select focal_x, focal_y, file_focal_x, file_focal_y, small_2x, source_path, source_width from public.cards_photos`)).toEqual([
      { focal_x: 50, focal_y: 30, file_focal_x: null, file_focal_y: null, small_2x: false, source_path: null, source_width: null }]);
    expect(await failure(db, `update public.cards_photos set file_focal_x = 101`)).toMatch(/file_focal_x_check/);
    expect(await failure(db, `update public.cards_photos set source_width = 0`)).toMatch(/source_width_check/);
    await db.exec(`update public.cards_photos set focal_x = 10, focal_y = 90 where id = 1`);
    expect(await one(db, `select file_focal_x from public.cards_photos`)).toBeNull(); // moving the focal point clears nothing else
  });
});

describe('cards_wallet (read only)', () => {
  it('a player without a row sees a full stack and writes nothing', async () => {
    const w = await wallet(db, U1, T0);
    expect(w).toMatchObject({ stock: 5, ads_today: 0, bonus_today: 0, shards: 0, ads_left: 10, bonus_left: 0, next_at: null, paris_day: '2026-11-12' });
    expect(await one(db, `select count(*)::int from public.cards_wallets`)).toBe(0);
  });
  it('refills 1 pack per 10 minutes up to 5 and never writes', async () => {
    await setWallet(db, U1, { stock: 0, anchor: T0, day: '2026-11-12' });
    expect((await wallet(db, U1, T0 + PERIOD_MS - 1)).stock).toBe(0);
    const a = await wallet(db, U1, T0 + PERIOD_MS);
    expect(a.stock).toBe(1);
    expect(Date.parse(a.anchor)).toBe(T0 + PERIOD_MS);
    expect(Date.parse(a.next_at as string)).toBe(T0 + 2 * PERIOD_MS);
    const c = await wallet(db, U1, T0 + 3.5 * PERIOD_MS);
    expect(c.stock).toBe(3);
    expect(Date.parse(c.anchor)).toBe(T0 + 3 * PERIOD_MS);
    expect((await wallet(db, U1, T0 + 5 * PERIOD_MS)).stock).toBe(5);
    expect((await wallet(db, U1, T0 + 5 * PERIOD_MS)).next_at).toBeNull();
    expect((await wallet(db, U1, T0 + 80 * PERIOD_MS - 3600_000)).stock).toBe(5);
    expect(await one(db, `select stock::int from public.cards_wallets where user_id = '${U1}'`)).toBe(0);
  });
  it('a full stack keeps its anchor at now (the prototype sync)', async () => {
    await setWallet(db, U1, { stock: 5, anchor: T0 - 99 * PERIOD_MS, day: '2026-11-12' });
    expect(Date.parse((await wallet(db, U1, T0)).anchor)).toBe(T0);
  });
  it('midnight Paris tops up to 5 and resets ads_today and bonus_today', async () => {
    const mid = nextParisMidnight(T0);
    await setWallet(db, U1, { stock: 1, anchor: mid - 5 * 60_000, day: '2026-11-12', ads: 7, bonus: 2 });
    const before = await wallet(db, U1, mid - 1);
    expect(before).toMatchObject({ stock: 1, ads_today: 7, bonus_today: 2 });
    const after = await wallet(db, U1, mid);
    expect(after).toMatchObject({ stock: 5, ads_today: 0, bonus_today: 0, paris_day: '2026-11-13', ads_left: 10 });
    expect(Date.parse(after.midnight_at)).toBe(nextParisMidnight(mid));
  });
  it('the two clock changes of 2026 and of 2027: midnight lands on the right instant and the day resets', async () => {
    const cases = [
      ['2026-03-28T20:00:00Z', '2026-03-28', '2026-03-28T23:00:00.000Z'], // the eve of the spring change
      ['2026-03-29T12:00:00Z', '2026-03-29', '2026-03-29T22:00:00.000Z'], // 23 h day
      ['2026-10-24T20:00:00Z', '2026-10-24', '2026-10-24T22:00:00.000Z'],
      ['2026-10-25T12:00:00Z', '2026-10-25', '2026-10-25T23:00:00.000Z'], // 25 h day
      ['2027-03-27T20:00:00Z', '2027-03-27', '2027-03-27T23:00:00.000Z'],
      ['2027-03-28T12:00:00Z', '2027-03-28', '2027-03-28T22:00:00.000Z'], // 23 h day
      ['2027-10-30T20:00:00Z', '2027-10-30', '2027-10-30T22:00:00.000Z'],
      ['2027-10-31T12:00:00Z', '2027-10-31', '2027-10-31T23:00:00.000Z'], // 25 h day
    ] as const;
    for (const [start, day, midIso] of cases) {
      const s = Date.parse(start);
      await setWallet(db, U1, { stock: 0, anchor: s, day, ads: 4, bonus: 1 });
      const w = await wallet(db, U1, s);
      expect(w.paris_day).toBe(day);
      expect(iso(Date.parse(w.midnight_at))).toBe(midIso);
      expect(nextParisMidnight(s)).toBe(Date.parse(midIso));
      const mid = Date.parse(midIso);
      expect(await wallet(db, U1, mid - 1)).toMatchObject({ paris_day: day, ads_today: 4 });
      const after = await wallet(db, U1, mid);
      expect(after.paris_day).not.toBe(day);
      expect(after).toMatchObject({ stock: 5, ads_today: 0, bonus_today: 0 });
    }
  });
  it('is the exact twin of walletAt in lib/cards/rules.ts', async () => {
    const days = ['2026-03-28', '2026-03-29', '2026-10-24', '2026-10-25', '2026-11-12', '2027-03-27', '2027-10-30'];
    const offsets = [0, 1, PERIOD_MS - 1, PERIOD_MS, 3.7 * PERIOD_MS, 5 * PERIOD_MS, 9 * 3600_000, 23.9 * 3600_000, 26 * 3600_000, 49 * 3600_000];
    let n = 0;
    for (const day of days) {
      const base = Date.parse(`${day}T21:30:00Z`);
      for (const stock of [0, 1, 4, 5]) {
        for (const off of offsets) {
          const row = { stock, anchor: base - 7 * 60_000, parisDay: day, adsToday: 3, bonusToday: 2 };
          await setWallet(db, U1, { stock, anchor: row.anchor, day, ads: 3, bonus: 2 });
          const now = base + off;
          const sql = await wallet(db, U1, now);
          const ts = walletAt(row, now);
          expect([day, stock, off, sql.stock, Date.parse(sql.anchor), sql.paris_day, sql.ads_today, sql.bonus_today, sql.next_at && Date.parse(sql.next_at), Date.parse(sql.midnight_at)])
            .toEqual([day, stock, off, ts.stock, ts.anchor, ts.parisDay, ts.adsToday, ts.bonusToday, ts.nextAt, ts.midnightAt]);
          n++;
        }
      }
    }
    expect(n).toBe(280);
  });
});

describe('cards_apply_pack: the stack', () => {
  it('spends one pack, stores the cards and says which are new', async () => {
    const p = await open(db, U1, 'stock', [1, 1, 9, 3, 2], T0);
    expect(p.cards).toEqual([{ n: 1, isNew: true }, { n: 1, isNew: false }, { n: 9, isNew: true }, { n: 3, isNew: true }, { n: 2, isNew: true }]);
    expect(await rows(db, `select card_no, copies from public.cards_owned where user_id='${U1}' order by card_no`)).toEqual([
      { card_no: 1, copies: 2 }, { card_no: 2, copies: 1 }, { card_no: 3, copies: 1 }, { card_no: 9, copies: 1 }]);
    const w = await wallet(db, U1, T0);
    expect(w.stock).toBe(4);
    expect(Date.parse(w.anchor)).toBe(T0); // a full stack starts counting when a pack is spent
    expect(Date.parse(w.next_at as string)).toBe(T0 + PERIOD_MS);
    const again = await open(db, U1, 'stock', PACK, T0 + 1000);
    expect(again.cards.filter((c) => c.isNew).map((c) => c.n)).toEqual([7]);
    expect(await one(db, `select count(*)::int from public.cards_packs where user_id='${U1}'`)).toBe(2);
  });
  it('an empty stack refuses, a refill makes the next pack possible', async () => {
    await setWallet(db, U1, { stock: 1, anchor: T0, day: '2026-11-12' });
    await open(db, U1, 'stock', PACK, T0);
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'stock', '{1,7,9,3,2}', null, '${iso(T0 + PERIOD_MS - 1)}')`)).toMatch(/cards: empty/);
    await open(db, U1, 'stock', PACK, T0 + PERIOD_MS);
    expect(await one(db, `select count(*)::int from public.cards_packs`)).toBe(2);
  });
  it('a refused pack changes nothing (no wallet row, no cards)', async () => {
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'shards', '{1,7,9,3,2}', null, '${iso(T0)}')`)).toMatch(/cards: shards/);
    expect(await one(db, `select count(*)::int from public.cards_wallets`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.cards_owned`)).toBe(0);
  });
  it('checks the five cards: the fifth is never C, cards must exist, be in packs and active, and be five', async () => {
    const f = (cards: string) => failure(db, `select public.cards_apply_pack('${U1}', 'stock', '${cards}', null, '${iso(T0)}')`);
    expect(await f('{1,7,9,3,9}')).toMatch(/cards: pack/); // fifth is C
    expect(await f('{1,7,9,3,99}')).toMatch(/cards: pack/); // unknown
    expect(await f('{1,7,9,3,10}')).toMatch(/cards: pack/); // inactive entity
    expect(await f('{1,7,9,2}')).toMatch(/cards: pack/);
    expect(await f('{1,7,9,3,2,2}')).toMatch(/cards: pack/);
    await db.exec(`update public.cards_catalog set in_packs = false where card_no = 2`);
    expect(await f('{1,7,9,3,2}')).toMatch(/cards: pack/); // not in packs
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'gift', '{1,7,9,3,3}', null, '${iso(T0)}')`)).toMatch(/cards: source/);
    expect(await one(db, `select count(*)::int from public.cards_packs`)).toBe(0);
  });
});

describe('cards_apply_pack: shards', () => {
  it('50 shards open a pack at once and leave the stack alone', async () => {
    await setWallet(db, U1, { stock: 2, anchor: T0, day: '2026-11-12', shards: 49 });
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'shards', '{1,7,9,3,2}', null, '${iso(T0)}')`)).toMatch(/cards: shards/);
    await setWallet(db, U1, { stock: 2, anchor: T0, day: '2026-11-12', shards: 130 });
    await open(db, U1, 'shards', PACK, T0);
    const w = await wallet(db, U1, T0);
    expect(w).toMatchObject({ shards: 80, stock: 2 });
    expect(await one(db, `select source from public.cards_packs`)).toBe('shards');
  });
});

describe('cards_apply_pack: rewarded ads', () => {
  const ticket = (u: string, now: number, ads = 10) => one<string | null>(db, 'select public.cards_issue_ticket($1, $2::timestamptz, $3)', [u, iso(now), ads]);
  it('a ticket opens one pack, does not touch the stack, and a second use is refused', async () => {
    const t = (await ticket(U1, T0)) as string;
    expect(t).toMatch(/^[0-9a-f-]{36}$/);
    const p = await open(db, U1, 'ad', PACK, T0, t);
    expect(p.cards).toHaveLength(5);
    expect(await wallet(db, U1, T0)).toMatchObject({ stock: 5, ads_today: 1, ads_left: 9 });
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'ad', '{1,7,9,3,2}', '${t}', '${iso(T0 + 1)}')`)).toMatch(/cards: ticket/);
    expect(await one(db, `select count(*)::int from public.cards_packs`)).toBe(1);
  });
  it('a ticket of another user, an unknown ticket and no ticket are refused', async () => {
    const t = (await ticket(U1, T0)) as string;
    expect(await failure(db, `select public.cards_apply_pack('${U2}', 'ad', '{1,7,9,3,2}', '${t}', '${iso(T0)}')`)).toMatch(/cards: ticket/);
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'ad', '{1,7,9,3,2}', '99999999-9999-9999-9999-999999999999', '${iso(T0)}')`)).toMatch(/cards: ticket/);
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'ad', '{1,7,9,3,2}', null, '${iso(T0)}')`)).toMatch(/cards: ticket/);
    // the ticket is still good for its owner
    await open(db, U1, 'ad', PACK, T0, t);
  });
  it('the ad limit: 10 a day by default, no 11th ticket, and a new Paris day starts again', async () => {
    for (let i = 0; i < 10; i++) {
      const t = (await ticket(U1, T0 + i * 1000)) as string;
      await open(db, U1, 'ad', PACK, T0 + i * 1000, t);
    }
    expect(await ticket(U1, T0 + 20_000)).toBeNull();
    expect(await wallet(db, U1, T0 + 20_000)).toMatchObject({ ads_today: 10, ads_left: 0 });
    // a ticket issued earlier cannot beat the limit either
    const t = (await ticket(U2, T0)) as string;
    await setWallet(db, U2, { stock: 5, anchor: T0, day: '2026-11-12', ads: 10 });
    expect(await failure(db, `select public.cards_apply_pack('${U2}', 'ad', '{1,7,9,3,2}', '${t}', '${iso(T0)}')`)).toMatch(/cards: ad_limit/);
    const next = nextParisMidnight(T0) + 1000;
    expect(await ticket(U1, next)).not.toBeNull();
  });
  it('a custom limit (CARDS_ADS_PER_DAY) is honoured, unused tickets count against it, abandoned ones expire after an hour', async () => {
    expect(await ticket(U1, T0, 2)).not.toBeNull();
    expect(await ticket(U1, T0 + 1000, 2)).not.toBeNull();
    expect(await ticket(U1, T0 + 2000, 2)).toBeNull();
    expect(await ticket(U1, T0 + 3600_000 + 5000, 2)).not.toBeNull();
  });
});

describe('cards_apply_pack: bonus packs', () => {
  async function quizPlay(user: string, at: string, quiz: string, site = 'kpop') {
    await db.query(`insert into public.quizzes (id, site_id) values ($1, $2) on conflict (id) do nothing`, [quiz, site]);
    await db.query(`insert into public.plays (quiz_id, player_id, created_at) values ($1, $2, $3::timestamptz)`, [quiz, user, at]);
  }
  async function dle(user: string, game: string, status: string, finishedAt: string | null, playDate = '2026-11-12') {
    return one<number>(db, `insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ($1, $2::date, $3, $4, $5::timestamptz) returning id::int`,
      [game, playDate, user, status, finishedAt]);
  }
  const record = (u: string, now: number) => one<number>(db, 'select public.cards_bonus_record($1, $2::timestamptz)', [u, iso(now)]);
  const q = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
  it('nothing is granted without a play of the day', async () => {
    expect(await wallet(db, U1, T0)).toMatchObject({ bonus_left: 0 });
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'bonus', '{1,7,9,3,2}', null, '${iso(T0)}')`)).toMatch(/cards: bonus/);
  });
  it('review 1 finding 1: a play written straight into public.plays (anonymous insert, record_play with any player id) earns nothing', async () => {
    for (let i = 1; i <= 4; i++) await quizPlay(U1, '2026-11-12T08:00:00Z', q(i));
    expect((await wallet(db, U1, T0)).bonus_left).toBe(0);
    expect(await record(U1, T0)).toBe(0);
    expect((await wallet(db, U1, T0)).bonus_left).toBe(0);
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'bonus', '{1,7,9,3,2}', null, '${iso(T0)}')`)).toMatch(/cards: bonus/);
    // a Kpopdle win the database decided, and no record yet: still nothing (the server route records it)
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-12T09:30:00Z');
    expect((await wallet(db, U1, T0)).bonus_left).toBe(0);
  });
  it('cards_bonus_record keeps one row per won Kpopdle play of the Paris day, for that player only', async () => {
    const won = await dle(U1, 'kpopdle-idol', 'won', '2026-11-12T09:30:00Z');
    await dle(U1, 'otakudle-character', 'won', '2026-11-12T09:31:00Z'); // another game
    await dle(U1, 'kpopdle-idol', 'given_up', '2026-11-12T09:32:00Z', '2026-11-10'); // not a win
    await dle(U1, 'kpopdle-idol', 'playing', null, '2026-11-09'); // not finished
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-11T21:00:00Z', '2026-11-11'); // 22:00 Paris on the 11th: another day
    await dle(U2, 'kpopdle-idol', 'won', '2026-11-12T09:40:00Z'); // another player
    expect(await record(U1, T0)).toBe(1);
    expect(await record(U1, T0 + 1000)).toBe(1); // a second call adds nothing
    expect(await rows(db, `select user_id, paris_day::text, source, play_ref from public.cards_bonus_earned`)).toEqual([
      { user_id: U1, paris_day: '2026-11-12', source: 'kpopdle', play_ref: `dle_plays:${won}` }]);
    // a win that finished after p_now is not counted yet (U2 won at 09:40 UTC)
    expect(await record(U2, Date.parse('2026-11-12T09:39:00Z'))).toBe(0);
    expect(await record(U2, T0)).toBe(1);
    expect(await one(db, `select count(*)::int from public.cards_bonus_earned`)).toBe(2);
    expect(await failure(db, `select public.cards_bonus_record(null, '${iso(T0)}')`)).toMatch(/cards: user/);
  });
  it('the allowance is min(cap, bonus packs earned) minus the bonus packs opened', async () => {
    // three won plays (three play dates) that all finished on the Paris day of the 12th; the stand-in has no unique key, the real table does
    for (const [i, at] of ['2026-11-12T08:00:00Z', '2026-11-12T08:30:00Z', '2026-11-12T09:00:00Z'].entries()) await dle(U1, 'kpopdle-idol', 'won', at, `2026-11-${10 + i}`);
    await quizPlay(U1, '2026-11-12T09:40:00Z', q(3));
    expect(await record(U1, T0)).toBe(3);
    expect((await wallet(db, U1, T0)).bonus_left).toBe(3);
    expect((await wallet(db, U1, T0, 10, 2)).bonus_left).toBe(2);
    await open(db, U1, 'bonus', PACK, T0);
    expect(await wallet(db, U1, T0)).toMatchObject({ bonus_left: 2, bonus_today: 1, stock: 5 });
    await open(db, U1, 'bonus', PACK, T0 + 1);
    await open(db, U1, 'bonus', PACK, T0 + 2);
    expect(await failure(db, `select public.cards_apply_pack('${U1}', 'bonus', '{1,7,9,3,2}', null, '${iso(T0 + 3)}')`)).toMatch(/cards: bonus/);
    expect((await wallet(db, U1, T0 + 3)).bonus_left).toBe(0);
    expect((await wallet(db, U2, T0)).bonus_left).toBe(0);
  });
  it('a custom cap is honoured and the day is the Paris day (00:30 Paris is the 12th, 23:30 Paris of the 11th is not)', async () => {
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-11T23:30:00Z', '2026-11-11'); // 00:30 Paris on the 12th
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-11T22:30:00Z', '2026-11-10'); // 23:30 Paris on the 11th
    expect(await record(U1, T0)).toBe(1);
    expect(await record(U1, Date.parse('2026-11-11T22:45:00Z'))).toBe(1);
    expect((await wallet(db, U1, T0)).bonus_left).toBe(1);
    expect((await wallet(db, U1, Date.parse('2026-11-11T22:50:00Z'))).bonus_left).toBe(1);
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-12T09:58:00Z');
    expect(await record(U1, T0)).toBe(2);
    expect((await wallet(db, U1, T0, 10, 3)).bonus_left).toBe(2);
    expect((await wallet(db, U1, T0, 10, 1)).bonus_left).toBe(1);
    expect((await wallet(db, U1, T0, 10, 0)).bonus_left).toBe(0);
  });
  it('the bonus counter restarts at midnight Paris', async () => {
    await dle(U1, 'kpopdle-idol', 'won', '2026-11-12T01:00:00Z', '2026-11-11'); // yesterday's game, in its 3 hour grace, 02:00 Paris on the 12th
    await record(U1, T0);
    await open(db, U1, 'bonus', PACK, T0);
    const next = nextParisMidnight(T0) + 60_000; // 00:01 Paris on the 13th, still the 12th in UTC
    await dle(U1, 'kpopdle-idol', 'won', iso(next), '2026-11-12');
    expect(await wallet(db, U1, next)).toMatchObject({ bonus_today: 0, bonus_left: 0 });
    expect(await record(U1, next)).toBe(1);
    expect(await wallet(db, U1, next)).toMatchObject({ bonus_today: 0, bonus_left: 1 });
  });
  it('cards_bonus_earned holds no browser grant and no policy, and RLS is on', async () => {
    expect(await one(db, `select relrowsecurity from pg_class where oid = 'public.cards_bonus_earned'::regclass`)).toBe(true);
    expect(await one(db, `select count(*)::int from information_schema.role_table_grants where table_name = 'cards_bonus_earned' and grantee in ('anon', 'authenticated', 'PUBLIC')`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_policies where tablename = 'cards_bonus_earned'`)).toBe(0);
    expect(await one(db, `select has_function_privilege('authenticated', 'public.cards_bonus_record(uuid, timestamptz)', 'execute')`)).toBe(false);
  });
});

describe('cards_recycle and cards_favorite', () => {
  it('every copy above one becomes shards by rarity, all at once, one copy stays, a second run does nothing', async () => {
    await open(db, U1, 'stock', [1, 1, 1, 3, 2], T0);
    await open(db, U1, 'stock', [4, 4, 5, 6, 2], T0 + 1);
    // copies: 1x3, 2x2, 3x1, 4x2, 5x1, 6x1  -> extras: C 2, U 1, SR 1
    const r = await one<{ recycled: number; shards_gained: number; shards: number }>(db, `select public.cards_recycle('${U1}', '${iso(T0 + 2)}')`);
    expect(r).toEqual({ recycled: 4, shards_gained: 2 * SHARDS.C + 1 * SHARDS.U + 1 * SHARDS.SR, shards: 2 + 2 + 12 });
    expect(await rows(db, `select card_no, copies from public.cards_owned where user_id='${U1}' order by card_no`)).toEqual(
      [1, 2, 3, 4, 5, 6].map((card_no) => ({ card_no, copies: 1 })));
    expect((await wallet(db, U1, T0 + 2)).shards).toBe(16);
    expect(await one(db, `select public.cards_recycle('${U1}', '${iso(T0 + 3)}')`)).toEqual({ recycled: 0, shards_gained: 0, shards: 16 });
    expect(await one(db, `select public.cards_recycle('${U2}')`)).toEqual({ recycled: 0, shards_gained: 0, shards: 0 });
  });
  it('the SQL shard values equal SHARDS of rules.ts', async () => {
    const per: Record<string, number> = {};
    for (const [i, rar] of (['C', 'U', 'R', 'SR', 'UR', 'L'] as const).entries()) {
      await db.exec(`delete from public.cards_owned; delete from public.cards_wallets;`);
      await setWallet(db, U1, { stock: 5, anchor: T0, day: '2026-11-12' });
      await db.exec(`insert into public.cards_owned (user_id, card_no, copies) values ('${U1}', ${i + 1}, 2)`);
      per[rar] = (await one<{ shards_gained: number }>(db, `select public.cards_recycle('${U1}', '${iso(T0)}')`)).shards_gained;
    }
    expect(per).toEqual(SHARDS);
  });
  it('a favorite is per player and only on an owned card', async () => {
    await open(db, U1, 'stock', PACK, T0);
    expect(await one(db, `select public.cards_favorite('${U1}', 3, true)`)).toBe(true);
    expect(await one(db, `select public.cards_favorite('${U1}', 4, true)`)).toBe(false);
    expect(await one(db, `select public.cards_favorite('${U2}', 3, true)`)).toBe(false);
    expect(await one(db, `select favorite from public.cards_owned where user_id='${U1}' and card_no=3`)).toBe(true);
    expect(await one(db, `select public.cards_favorite('${U1}', 3, false)`)).toBe(true);
    expect(await one(db, `select favorite from public.cards_owned where user_id='${U1}' and card_no=3`)).toBe(false);
  });
  it('the recycle does not touch the stack, the ads or the bonus', async () => {
    await setWallet(db, U1, { stock: 2, anchor: T0, day: '2026-11-12', ads: 3, bonus: 1, shards: 5 });
    await db.exec(`insert into public.cards_owned (user_id, card_no, copies) values ('${U1}', 6, 4)`);
    await db.exec(`select public.cards_recycle('${U1}', '${iso(T0)}')`);
    expect(await rows(db, `select stock, ads_today, bonus_today, shards from public.cards_wallets`)).toEqual([{ stock: 2, ads_today: 3, bonus_today: 1, shards: 5 + 3 * SHARDS.L }]);
  });
});

describe('triggers', () => {
  it('a rejected or removed photo retires its cards from the packs', async () => {
    await db.exec(`insert into public.cards_photos (id, entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, status)
      values (1, 'idol:Q1', 1, 'commons', 'p', 'f', 'A', 'CC0', 'l', false, '2026-11-01', 'approved')`);
    await db.exec(`update public.cards_catalog set photo_id = 1 where card_no in (1, 2, 3)`);
    await db.exec(`update public.cards_photos set status = 'removed' where id = 1`);
    expect(await one(db, `select count(*)::int from public.cards_catalog where photo_id = 1 and in_packs`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.cards_catalog where in_packs`)).toBe(7); // cards 4 to 10 (card 10 is in packs but its idol is inactive)
  });
  it('one live photo per idol slot', async () => {
    const ins = (id: number, st: string) => `insert into public.cards_photos (id, entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, status)
      values (${id}, 'idol:Q1', 1, 'commons', 'p', 'f', 'A', 'CC0', 'l', false, '2026-11-01', '${st}')`;
    await db.exec(ins(1, 'approved'));
    await db.exec(ins(2, 'pending'));
    expect(await failure(db, ins(3, 'auto'))).toMatch(/live_slot/);
  });
  it('review 1 finding 8: a general report (no photo, no card) and a report on a removed photo are stored', async () => {
    await db.exec(`insert into public.cards_photos (id, entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, status)
      values (1, 'idol:Q1', 1, 'commons', 'p', 'f', 'A', 'CC0', 'l', false, '2026-11-01', 'removed')`);
    await db.exec(`insert into public.cards_reports (role, message) values ('other', 'general')`);
    await db.exec(`insert into public.cards_reports (photo_id, role, message) values (1, 'person', 'removed photo')`);
    expect(await rows(db, `select photo_id, card_no, status from public.cards_reports order by id`)).toEqual([
      { photo_id: null, card_no: null, status: 'open' }, { photo_id: 1, card_no: null, status: 'open' }]);
  });
  it('closing a report erases the contact', async () => {
    await db.exec(`insert into public.cards_reports (role, message, contact) values ('person', 'please remove', 'me@example.org')`);
    expect(await one(db, `select contact from public.cards_reports`)).toBe('me@example.org');
    await db.exec(`update public.cards_reports set status = 'closed'`);
    expect(await rows(db, `select contact, closed_at is not null as closed from public.cards_reports`)).toEqual([{ contact: null, closed: true }]);
  });
});

describe('constants shared with the TypeScript twin', () => {
  it('CAP and PERIOD match the SQL literals', () => {
    const sql = readCardsSql('002-functions.sql');
    expect(CAP).toBe(5);
    expect(PERIOD_MS).toBe(600_000);
    expect(sql).toMatch(/v_stock >= 5/);
    expect(sql).toMatch(/\/ 600\)/);
  });
});

describe('a database without the Kpopdle tables (019 not applied)', () => {
  it.each([[0], [3]])('the wallet and a stock pack work with the bonus cap %i', async (cap) => {
    const d = await freshCardsDb(undefined, BASE_NO_DLE);
    await seed(d);
    expect(await one(d, `select to_regclass('public.dle_plays') is null`)).toBe(true);
    expect(await wallet(d, U1, T0, 10, cap)).toMatchObject({ stock: 5, bonus_left: 0 });
    await open(d, U1, 'stock', PACK, T0, null, 10, cap);
    expect(await wallet(d, U1, T0, 10, cap)).toMatchObject({ stock: 4, bonus_today: 0 });
    // a quiz play never counts (review 1 finding 1), and without the Kpopdle tables nothing is recorded
    await d.query(`insert into public.quizzes (id, site_id) values ('00000000-0000-0000-0000-000000000001', 'kpop')`);
    await d.query(`insert into public.plays (quiz_id, player_id, created_at) values ('00000000-0000-0000-0000-000000000001', $1, $2::timestamptz)`, [U1, '2026-11-12T08:00:00Z']);
    expect(await one(d, `select public.cards_bonus_record($1, $2::timestamptz)`, [U1, iso(T0)])).toBe(0);
    expect((await wallet(d, U1, T0, 10, cap)).bonus_left).toBe(0);
  });
  it('with the bonus cap 0 the bonus function is never called, even without the play tables', async () => {
    const d = await freshCardsDb(undefined, BASE_NO_DLE.slice(0, BASE_NO_DLE.indexOf('create table public.quizzes')));
    await seed(d);
    expect(await wallet(d, U1, T0, 10, 0)).toMatchObject({ stock: 5, bonus_left: 0 });
    await open(d, U1, 'stock', PACK, T0, null, 10, 0);
    expect(await failure(d, `select public.cards_apply_pack('${U1}', 'bonus', '{1,7,9,3,2}', null, '${iso(T0)}', 10, 0)`)).toMatch(/cards: bonus/);
    expect(await wallet(d, U1, T0, 10, 3)).toMatchObject({ bonus_left: 0 });
  });
});

describe('the rollback of the bucket under Supabase storage.protect_delete', () => {
  it('003-rls.rollback refuses while the bucket holds files, then deletes the empty bucket row', async () => {
    await db.exec(`insert into storage.objects (bucket_id) values ('cards')`);
    expect(await failure(db, readCardsSql('003-rls.rollback.sql'))).toMatch(/holds 1 files.*empty it/);
    await db.exec(`set storage.allow_delete_query = 'true'; delete from storage.objects; reset storage.allow_delete_query;`);
    expect(await failure(db, readCardsSql('003-rls.rollback.sql'))).toBeNull();
    expect(await one(db, `select count(*)::int from storage.buckets where id='cards'`)).toBe(0);
    expect(await one(db, `select coalesce(current_setting('storage.allow_delete_query', true), '') <> 'true'`)).toBe(true);
  });
  it('the mocked trigger really refuses a plain delete (so the proof fails on a file that skips the setting)', async () => {
    expect(await failure(db, `delete from storage.buckets where id = 'cards'`)).toMatch(/Direct deletion from storage tables/);
  });
});
