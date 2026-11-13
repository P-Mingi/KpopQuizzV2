// KpopCards: shared fixtures of the SQL proofs (PGlite): the catalog of the tests, the users, and small wrappers around the functions of 105 to 112.
// Test code only.
import { randomUUID } from 'node:crypto';

import { SCHEMA_FILES, failure, freshCardsDb, one, readCardsSql, rows } from '../cards/sql-harness';

import type { PGlite } from '@electric-sql/pglite';

export { failure, one, rows };

/** The files in order, up to the core. 111 (group types) and 112 (social) are added by the tests that need them. */
export const CHAIN = ['104-economy.sql', '105-goals.sql', '107-prefs.sql', '110-core.sql'] as const;

const PART = `
  alter table public.cards_catalog add column part smallint not null default 0;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  alter table public.cards_catalog drop constraint cards_catalog_entity_rarity_key;
  alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
`;

/*
 * The catalog of the tests (card numbers):
 *   G1 girls 2015  group 1 C        A1: 2 C, 3 R, 4 UR, 5 L       A2: 6 C, 7 R
 *   G2 boys  2016  group pair 8/9 C, 10/11 U       B1: 12 C, 13 U, 14 UR
 *   G3 girls 2016  group 15 C       D1: 16 R
 *   G4 boys  2020  group 17 C       E1: 18 U, 19 R
 *   G5 (no card in packs) its idol C1: 24 C is a soloist     S1 (no group): 20 C, 21 U, 22 R, 23 UR
 *   event e1: 25 C      out of packs: 26 (UR of A2)     inactive idol Off: 27 C
 */
export async function seedCatalog(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:G1', 'group', 'Group One', null, 2015, 'g1'), ('group:G2', 'group', 'Group Two', null, 2016, 'g2'),
      ('group:G3', 'group', 'Group Three', null, 2016, 'g3'), ('group:G4', 'group', 'Group Four', null, 2020, 'g4'),
      ('group:G5', 'group', 'Group Five', null, 2021, 'g5'),
      ('idol:A1', 'idol', 'Idol A1', 'group:G1', 2015, 'a1'), ('idol:A2', 'idol', 'Idol A2', 'group:G1', 2015, 'a2'),
      ('idol:B1', 'idol', 'Idol B1', 'group:G2', 2016, 'b1'), ('idol:D1', 'idol', 'Idol D1', 'group:G3', 2016, 'd1'),
      ('idol:E1', 'idol', 'Idol E1', 'group:G4', 2020, 'e1'),
      ('idol:C1', 'idol', 'Idol C1', 'group:G5', 2021, 'c1'), ('idol:S1', 'idol', 'Idol S1', null, 2019, 's1'),
      ('idol:Off', 'idol', 'Idol Off', 'group:G1', 2015, 'off'), ('event:e1', 'event', 'Event', null, 2018, 'z');
    update public.cards_entities set active = false where id = 'idol:Off';
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs, part) values
      (1, 'BV1-0001', 'group:G1', 'C', 'std', true, 0),
      (2, 'BV1-0002', 'idol:A1', 'C', 'std', true, 0), (3, 'BV1-0003', 'idol:A1', 'R', 'holo', true, 0), (4, 'BV1-0004', 'idol:A1', 'UR', 'gold', true, 0),
      (5, 'BV1-0005', 'idol:A1', 'L', 'full', true, 0), (6, 'BV1-0006', 'idol:A2', 'C', 'std', true, 0), (7, 'BV1-0007', 'idol:A2', 'R', 'holo', true, 0),
      (8, 'BV1-0008', 'group:G2', 'C', 'std', true, 1), (9, 'BV1-0009', 'group:G2', 'C', 'std', true, 2),
      (10, 'BV1-0010', 'group:G2', 'U', 'stage', true, 1), (11, 'BV1-0011', 'group:G2', 'U', 'stage', true, 2),
      (12, 'BV1-0012', 'idol:B1', 'C', 'std', true, 0), (13, 'BV1-0013', 'idol:B1', 'U', 'stage', true, 0), (14, 'BV1-0014', 'idol:B1', 'UR', 'gold', true, 0),
      (15, 'BV1-0015', 'group:G3', 'C', 'std', true, 0), (16, 'BV1-0016', 'idol:D1', 'R', 'holo', true, 0),
      (17, 'BV1-0017', 'group:G4', 'C', 'std', true, 0), (18, 'BV1-0018', 'idol:E1', 'U', 'stage', true, 0), (19, 'BV1-0019', 'idol:E1', 'R', 'holo', true, 0),
      (20, 'BV1-0020', 'idol:S1', 'C', 'std', true, 0), (21, 'BV1-0021', 'idol:S1', 'U', 'stage', true, 0), (22, 'BV1-0022', 'idol:S1', 'R', 'holo', true, 0),
      (23, 'BV1-0023', 'idol:S1', 'UR', 'gold', true, 0), (24, 'BV1-0024', 'idol:C1', 'C', 'std', true, 0), (25, 'BV1-0025', 'event:e1', 'C', 'std', true, 0),
      (26, 'BV1-0026', 'idol:A2', 'UR', 'gold', false, 0), (27, 'BV1-0027', 'idol:Off', 'C', 'std', true, 0);
  `);
}

export async function seedGroupTypes(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.cards_group_types (entity_id, gender, source_a, source_b, checked_on) values
      ('group:G1', 'girl', 'a', 'b', '2026-11-13'), ('group:G2', 'boy', 'a', 'b', '2026-11-13'), ('group:G3', 'girl', 'a', 'b', '2026-11-13'),
      ('group:G4', 'boy', 'a', 'b', '2026-11-13'), ('group:G5', 'girl', 'a', 'b', '2026-11-13');
  `);
}

export async function coreDb(files: readonly string[] = CHAIN): Promise<PGlite> {
  const db = await freshCardsDb(SCHEMA_FILES);
  await db.exec(PART);
  await seedCatalog(db);
  for (const f of files) await db.exec(readCardsSql(f));
  if (files.includes('110-core.sql')) await seedGroupTypes(db);
  return db;
}

export async function newUser(db: PGlite): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users values ($1)', [id]);
  return id;
}

export const T0 = '2026-11-12T10:00:00Z'; // Thursday, Paris 11:00 (UTC+1)
export const key = (): string => randomUUID();

export interface Draw { c: number[]; g?: number | null; u?: number | null }

export interface Opened {
  replayed: boolean;
  packs: Array<{ id: string; pack_no: number; source: string; theme: string | null; group: string | null; golden: boolean; guarantee: boolean; new_count: number;
    cards: Array<{ n: number; isNew: boolean; completesPair: boolean; golden: boolean; guarantee: boolean }> }>;
  finished: Array<{ id: string; name: string; packs: number }>;
  owned_before: number;
  owned_after: number;
}

export function openSql(db: PGlite, u: string, o: { key?: string; source?: string; theme?: string | null; focus?: string | null; draws: Draw[]; at?: string; timer?: number }): Promise<Opened> {
  return one<Opened>(db, 'select public.cards_open($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, 10, 3, $8::int)',
    [u, o.key ?? key(), o.source ?? 'stock', o.theme ?? null, o.focus ?? null, JSON.stringify(o.draws), o.at ?? T0, o.timer ?? 40]);
}
export function tryOpen(db: PGlite, u: string, o: { key?: string; source?: string; theme?: string | null; focus?: string | null; draws: Draw[]; at?: string; timer?: number }): Promise<string | null> {
  return failure(db, 'select public.cards_open($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, 10, 3, $8::int)',
    [u, o.key ?? key(), o.source ?? 'stock', o.theme ?? null, o.focus ?? null, JSON.stringify(o.draws), o.at ?? T0, o.timer ?? 40]);
}

/** A plain pack of the catalog: C C C R U-or-better... card 5 is never Standard. */
export const PLAIN: Draw = { c: [1, 2, 6, 3, 13] };

export async function setWallet(db: PGlite, u: string, w: { stock: number; anchor?: string; day?: string; timer?: number; shards?: number; seen?: string; opened?: number }): Promise<void> {
  const at = w.anchor ?? T0;
  await db.query(
    `insert into public.cards_wallets (user_id, stock, anchor, paris_day, timer_today, shards, seen_at, packs_opened)
     values ($1, $2, $3::timestamptz, coalesce($4::date, ($3::timestamptz at time zone 'Europe/Paris')::date), $5, $6, $7::timestamptz, $8)
     on conflict (user_id) do update set stock = excluded.stock, anchor = excluded.anchor, paris_day = excluded.paris_day,
       timer_today = excluded.timer_today, shards = excluded.shards, seen_at = excluded.seen_at, packs_opened = excluded.packs_opened`,
    [u, w.stock, at, w.day ?? null, w.timer ?? 0, w.shards ?? 0, w.seen ?? at, w.opened ?? 0]);
}

export const wallet = (db: PGlite, u: string, at: string = T0): Promise<Record<string, unknown>> =>
  one<Record<string, unknown>>(db, 'select public.cards_wallet($1::uuid, $2::timestamptz)', [u, at]);

export async function own(db: PGlite, u: string, nums: number[], at: string = T0, copies = 1): Promise<void> {
  await db.query('insert into public.cards_owned (user_id, card_no, copies, first_at, last_at) select $1::uuid, x, $4, $3::timestamptz, $3::timestamptz from unnest($2::int[]) x on conflict do nothing', [u, nums, at, copies]);
}
