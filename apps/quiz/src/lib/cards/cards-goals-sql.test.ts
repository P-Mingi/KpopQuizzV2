// Bunnyverse Cards lots 3 and 4 (lane GOALS): the proofs of docs/pending-migrations/cards/105-goals.sql on PGlite: every kind of set and its
// reward, the once rule, the reward packs opening through cards_apply_pack with 104's rules still holding, a craft that completes a set, the
// week (three counters, the Paris Monday boundary, the claim), a player who did nothing earning nothing, the idempotence and the rollback to 104.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { BASE_NO_DLE, CARDS_SQL, SCHEMA_FILES, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';
import { GOAL_REWARD_PACKS, WEEK_GOALS } from './goals';

import type { PGlite } from '@electric-sql/pglite';

const ECON = '104-economy.sql';
const GOALS = '105-goals.sql';
const GOALS_UNDO = '105-goals.rollback.sql';

describe('the 105 files are one DO block', () => {
  it.each([[GOALS, 'c105'], [GOALS_UNDO, 'c105r']])('%s', (file, tag) => {
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
  it('105 does not depend on the content of 103', () => {
    const code = readCardsSql(GOALS).split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/103/);
  });
  it('the SQL and goals.ts agree on the week and on the packs of each set', () => {
    const code = readCardsSql(GOALS);
    expect(code).toContain(`'goal_packs', ${WEEK_GOALS.packs}, 'goal_wins', ${WEEK_GOALS.wins}, 'goal_cards', ${WEEK_GOALS.cards}`);
    expect(code).toContain(`'reward_packs', ${WEEK_GOALS.rewardPacks}, 'reward_shards', ${WEEK_GOALS.rewardShards}`);
    expect(code).toContain(`select 'holo', 'holo', null, ${GOAL_REWARD_PACKS.holo}, l.card_no`);
    expect(code).toContain(`select 'gold', 'gold', null, ${GOAL_REWARD_PACKS.gold}, l.card_no`);
    expect(code).toContain(`select 'solo', 'solo', null, ${GOAL_REWARD_PACKS.solo}, l.card_no`);
    expect(code).toContain(`'year', g.debut_year::text, ${GOAL_REWARD_PACKS.year}, gm.card_no`);
    expect(code).toContain(`'group'::text as skind, gm.sname, ${GOAL_REWARD_PACKS.group} as spacks`);
  });
});

// ---------- fixtures ----------

const T0 = '2026-11-12T10:00:00Z'; // Thursday, Paris 11:00 (winter, UTC+1): the week of Monday 9 November 2026

/** The part column of 102 (the pair), added the way 102 does it. */
const PART = `
  alter table public.cards_catalog add column part smallint not null default 0;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  alter table public.cards_catalog drop constraint cards_catalog_entity_rarity_key;
  alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
`;

/*
 * The catalog of these tests (card numbers):
 *   group G1 (2015)  own 1 C      A1: 2 C, 3 R, 4 UR     A2: 5 C, 6 R            -> the set group:G1 = 1..6 (a card 18 is out of packs, 19 is of an inactive idol)
 *   group G2 (2016)  own 7 C      B1: 8 C, 9 UR                                   -> group:G2 = 7,8,9
 *   group G3 (2016)  own 10 C     D1: 11 R                                        -> group:G3 = 10,11
 *   group G4 (2020)  own 12 C                                                     -> group:G4 = 12
 *   group G5         no card in packs     C1 (idol of G5): 13 C                   -> a soloist: the group is not a subject
 *   no group         S1: 14 C, 15 R, 16 UR                                        -> solo = 13..16
 *   event e1: 17 C
 *   holo (R) = 3, 6, 11, 15      gold (UR) = 4, 9, 16      year:2016 = group:G2 + group:G3 = 7..11
 */
async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:G1', 'group', 'Group One', null, 2015, 'g1'), ('group:G2', 'group', 'Group Two', null, 2016, 'g2'),
      ('group:G3', 'group', 'Group Three', null, 2016, 'g3'), ('group:G4', 'group', 'Group Four', null, 2020, 'g4'),
      ('group:G5', 'group', 'Group Five', null, 2021, 'g5'),
      ('idol:A1', 'idol', 'Idol A1', 'group:G1', 2015, 'a1'), ('idol:A2', 'idol', 'Idol A2', 'group:G1', 2015, 'a2'),
      ('idol:B1', 'idol', 'Idol B1', 'group:G2', 2016, 'b1'), ('idol:D1', 'idol', 'Idol D1', 'group:G3', 2016, 'd1'),
      ('idol:C1', 'idol', 'Idol C1', 'group:G5', 2021, 'c1'), ('idol:S1', 'idol', 'Idol S1', null, 2019, 's1'),
      ('idol:Off', 'idol', 'Idol Off', 'group:G1', 2015, 'off'), ('event:e1', 'event', 'Event', null, 2018, 'z');
    update public.cards_entities set active = false where id = 'idol:Off';
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs) values
      (1, 'BV1-0001', 'group:G1', 'C', 'std', true), (2, 'BV1-0002', 'idol:A1', 'C', 'std', true), (3, 'BV1-0003', 'idol:A1', 'R', 'holo', true),
      (4, 'BV1-0004', 'idol:A1', 'UR', 'gold', true), (5, 'BV1-0005', 'idol:A2', 'C', 'std', true), (6, 'BV1-0006', 'idol:A2', 'R', 'holo', true),
      (7, 'BV1-0007', 'group:G2', 'C', 'std', true), (8, 'BV1-0008', 'idol:B1', 'C', 'std', true), (9, 'BV1-0009', 'idol:B1', 'UR', 'gold', true),
      (10, 'BV1-0010', 'group:G3', 'C', 'std', true), (11, 'BV1-0011', 'idol:D1', 'R', 'holo', true), (12, 'BV1-0012', 'group:G4', 'C', 'std', true),
      (13, 'BV1-0013', 'idol:C1', 'C', 'std', true), (14, 'BV1-0014', 'idol:S1', 'C', 'std', true), (15, 'BV1-0015', 'idol:S1', 'R', 'holo', true),
      (16, 'BV1-0016', 'idol:S1', 'UR', 'gold', true), (17, 'BV1-0017', 'event:e1', 'C', 'std', true),
      (18, 'BV1-0018', 'idol:A2', 'UR', 'gold', false), (19, 'BV1-0019', 'idol:Off', 'C', 'std', true);
    insert into public.cards_entities (id, kind, name, sort_key) select 'event:w' || g, 'event', 'W' || g, 'w' || lpad(g::text, 3, '0') from generate_series(1, 60) g;
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition)
      select 100 + g, 'BV1-' || lpad((100 + g)::text, 4, '0'), 'event:w' || g, 'C', 'std' from generate_series(1, 60) g;
  `);
}

async function goalsDb(files: readonly string[] = [ECON, GOALS], base?: string): Promise<PGlite> {
  const db = await freshCardsDb(SCHEMA_FILES, base);
  await db.exec(PART);
  await seed(db);
  for (const f of files) await db.exec(readCardsSql(f));
  return db;
}

async function newUser(db: PGlite): Promise<string> {
  const id = randomUUID();
  await db.query('insert into auth.users values ($1)', [id]);
  return id;
}

type Sets = Array<{ id: string; kind: string; name: string | null; packs: number; total: number; owned: number; claimed: boolean }>;
type Fin = Array<{ id: string; kind: string; name: string | null; packs: number }>;
type Opened = { id: string; cards: Array<{ n: number; isNew: boolean; completesPair: boolean }>; new_count: number; pack_no: number; finished: Fin };
type Goals = { reward_packs: number; week: Record<string, unknown>; sets: Sets; finished: Fin };

/** Cards straight into the binder (first_at as given), the way a pack leaves them. */
async function own(db: PGlite, u: string, nums: number[], at: string = T0): Promise<void> {
  await db.query('insert into public.cards_owned (user_id, card_no, first_at, last_at) select $1::uuid, x, $3::timestamptz, $3::timestamptz from unnest($2::int[]) x on conflict do nothing', [u, nums, at]);
}
const settle = (db: PGlite, u: string, cards: number[] | null = null, at: string = T0): Promise<Fin> =>
  one<Fin>(db, 'select public.cards_goals_settle($1::uuid, $2::timestamptz, $3::int[])', [u, at, cards]);
const sync = (db: PGlite, u: string, at: string = T0): Promise<Goals> => one<Goals>(db, 'select public.cards_goals_sync($1::uuid, $2::timestamptz)', [u, at]);
const waiting = async (db: PGlite, u: string): Promise<number> => (await rows<{ reward_packs: number }>(db, 'select reward_packs from public.cards_wallets where user_id = $1', [u]))[0]?.reward_packs ?? 0;
const ids = (f: Fin): string[] => f.map((x) => x.id).sort();

async function open(db: PGlite, u: string, source: string, cards: number[], at: string = T0): Promise<Opened> {
  return one<Opened>(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, 40, null)', [u, source, cards, at]);
}
const tryOpen = (db: PGlite, u: string, source: string, cards: number[], at: string = T0): Promise<string | null> =>
  failure(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, 40, null)', [u, source, cards, at]);
async function setWallet(db: PGlite, u: string, w: { reward?: number; shards?: number; stock?: number; at?: string }): Promise<void> {
  await db.query(
    `insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards, reward_packs) values ($1, $2, $3::timestamptz, ($3::timestamptz at time zone 'Europe/Paris')::date, $4, $5)
     on conflict (user_id) do update set stock = $2, shards = $4, reward_packs = $5`,
    [u, w.stock ?? 5, w.at ?? T0, w.shards ?? 0, w.reward ?? 0],
  );
}

// ---------- the sets ----------

describe('the sets and their reward packs', () => {
  let db: PGlite;
  beforeAll(async () => { db = await goalsDb(); });

  it('lists every set with the cards in packs today: groups, soloists, Holo, Gold and the debut year of two groups', async () => {
    const u = await newUser(db);
    const g = await sync(db, u);
    const by = Object.fromEntries(g.sets.map((s) => [s.id, s]));
    expect(g.sets.map((s) => s.id).sort()).toEqual(['gold', 'group:G1', 'group:G2', 'group:G3', 'group:G4', 'holo', 'solo', 'year:2016']);
    expect(by['group:G1']).toMatchObject({ kind: 'group', name: 'Group One', packs: 1, total: 6, owned: 0, claimed: false });
    expect(by['group:G2']).toMatchObject({ total: 3, packs: 1 });
    expect(by['group:G3']).toMatchObject({ total: 2 });
    expect(by['group:G4']).toMatchObject({ total: 1 });
    expect(by.solo).toMatchObject({ kind: 'solo', name: null, packs: 1, total: 4 });
    expect(by.holo).toMatchObject({ kind: 'holo', packs: 3, total: 4 });
    expect(by.gold).toMatchObject({ kind: 'gold', packs: 5, total: 3 });
    expect(by['year:2016']).toMatchObject({ kind: 'year', name: '2016', packs: 2, total: 5 });
  });

  it('a group with no card in packs is no group subject: its idol is a soloist, a year with one group is no set, a card out of packs or of an inactive idol is not counted', async () => {
    const g = await sync(db, await newUser(db));
    const ids2 = g.sets.map((s) => s.id);
    expect(ids2).not.toContain('group:G5');
    expect(ids2).not.toContain('year:2015');
    expect(ids2).not.toContain('year:2020');
    expect(g.sets.find((s) => s.id === 'group:G1')?.total).toBe(6); // 18 (not in packs) and 19 (inactive idol) are left out
    expect(g.sets.find((s) => s.id === 'solo')?.total).toBe(4); // C1's card 13 counts as a soloist card
  });

  it('a group set (+1): the group cards and the cards of its idols', async () => {
    const u = await newUser(db);
    await own(db, u, [1, 2, 3, 4, 5]);
    expect(await settle(db, u)).toEqual([]);
    await own(db, u, [6]);
    const fin = await settle(db, u);
    expect(fin).toEqual([{ id: 'group:G1', kind: 'group', name: 'Group One', packs: 1 }]);
    expect(await waiting(db, u)).toBe(1);
  });

  it('the soloists (+1): every idol card without a group subject', async () => {
    const u = await newUser(db);
    await own(db, u, [13, 14, 15]);
    expect(await settle(db, u)).toEqual([]);
    await own(db, u, [16]);
    expect(await settle(db, u)).toEqual([{ id: 'solo', kind: 'solo', name: null, packs: 1 }]);
    expect(await waiting(db, u)).toBe(1);
  });

  it('every Holo card (+3)', async () => {
    const u = await newUser(db);
    await own(db, u, [3, 6, 11]);
    expect(await settle(db, u)).toEqual([]);
    await own(db, u, [15]);
    expect(await settle(db, u)).toEqual([{ id: 'holo', kind: 'holo', name: null, packs: 3 }]);
    expect(await waiting(db, u)).toBe(3);
  });

  it('every Gold card (+5)', async () => {
    const u = await newUser(db);
    await own(db, u, [4, 9]);
    expect(await settle(db, u)).toEqual([]);
    await own(db, u, [16]);
    expect(await settle(db, u)).toEqual([{ id: 'gold', kind: 'gold', name: null, packs: 5 }]);
    expect(await waiting(db, u)).toBe(5);
  });

  it('a debut year with 2 or more group subjects (+2), on top of the two group sets', async () => {
    const u = await newUser(db);
    await own(db, u, [7, 8, 9, 10]);
    expect(ids(await settle(db, u))).toEqual(['group:G2']);
    await own(db, u, [11]);
    const fin = await settle(db, u);
    expect(ids(fin)).toEqual(['group:G3', 'year:2016']);
    expect(fin.find((f) => f.id === 'year:2016')).toEqual({ id: 'year:2016', kind: 'year', name: '2016', packs: 2 });
    expect(await waiting(db, u)).toBe(1 + 1 + 2);
  });

  it('the whole catalog: 4 groups + soloists + Holo + Gold + the year = 4 + 1 + 3 + 5 + 2 packs, once', async () => {
    const u = await newUser(db);
    await own(db, u, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    const fin = await settle(db, u);
    expect(ids(fin)).toEqual(['gold', 'group:G1', 'group:G2', 'group:G3', 'group:G4', 'holo', 'solo', 'year:2016']);
    expect(fin.reduce((a, f) => a + f.packs, 0)).toBe(15);
    expect(await waiting(db, u)).toBe(15);
    expect(await settle(db, u)).toEqual([]);
    expect(await waiting(db, u)).toBe(15);
    const g = await sync(db, u);
    expect(g.sets.every((s) => s.claimed && s.owned === s.total)).toBe(true);
    expect(g.finished).toEqual([]);
    expect(g.reward_packs).toBe(15);
  });

  it('a claimed set never pays twice: the catalog grows, a card leaves the binder, the player gets the cards again', async () => {
    const u = await newUser(db);
    await own(db, u, [12]);
    expect(ids(await settle(db, u))).toEqual(['group:G4']);
    await db.exec(`
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs) values (200, 'BV1-0200', 'group:G4', 'U', 'stage', true);
    `);
    // The set is now incomplete and still claimed; completing it again pays nothing.
    const mid = (await sync(db, u)).sets.find((s) => s.id === 'group:G4');
    expect(mid).toMatchObject({ total: 2, owned: 1, claimed: true });
    await own(db, u, [200]);
    expect(await settle(db, u)).toEqual([]);
    await db.query('delete from public.cards_owned where user_id = $1', [u]);
    await own(db, u, [12, 200]);
    expect(await settle(db, u)).toEqual([]);
    expect(await waiting(db, u)).toBe(1);
    expect(Number(await one(db, 'select count(*) from public.cards_sets_claimed where user_id = $1 and set_id = $2', [u, 'group:G4']))).toBe(1);
    await db.exec('delete from public.cards_catalog where card_no = 200');
  });

  it('a card that leaves the packs makes a set complete: it pays at the next settle, once', async () => {
    const u = await newUser(db);
    await own(db, u, [1, 2, 3, 4, 5]);
    expect(await settle(db, u)).toEqual([]);
    await db.exec('update public.cards_catalog set in_packs = false where card_no = 6');
    expect(ids(await settle(db, u))).toEqual(['group:G1']);
    await db.exec('update public.cards_catalog set in_packs = true where card_no = 6');
    expect(await settle(db, u)).toEqual([]);
    expect(await waiting(db, u)).toBe(1);
  });

  it('settle with a list of cards looks only at the sets that hold one of them, but counts every card of those sets', async () => {
    const u = await newUser(db);
    await own(db, u, [12, 13, 14, 15, 16]); // G4 complete and the soloists complete
    expect(ids(await settle(db, u, [12]))).toEqual(['group:G4']);
    expect(await waiting(db, u)).toBe(1);
    expect(ids(await settle(db, u, [14]))).toEqual(['solo']);
    expect(await waiting(db, u)).toBe(2);
  });

  it('two settles at once pay a set once (the primary key)', async () => {
    const u = await newUser(db);
    await own(db, u, [12]);
    const [a, b] = await Promise.all([settle(db, u), settle(db, u)]);
    expect(a.length + b.length).toBe(1);
    expect(await waiting(db, u)).toBe(1);
  });

  it('a player who did nothing earns nothing and gets no wallet row from reading Goals', async () => {
    const u = await newUser(db);
    const g = await sync(db, u);
    expect(g.reward_packs).toBe(0);
    expect(g.finished).toEqual([]);
    expect(g.week).toMatchObject({ packs_opened: 0, kpopdle_wins: 0, new_cards: 0, done: false, claimed: false });
    expect(Number(await one(db, 'select count(*) from public.cards_wallets where user_id = $1', [u]))).toBe(0);
    expect(Number(await one(db, 'select count(*) from public.cards_sets_claimed where user_id = $1', [u]))).toBe(0);
    expect(Number(await one(db, 'select count(*) from public.cards_week_claims where user_id = $1', [u]))).toBe(0);
  });
});

// ---------- the reward packs through cards_apply_pack ----------

describe('a pack that completes a set, and the reward packs', () => {
  let db: PGlite;
  beforeAll(async () => { db = await goalsDb(); });

  it('the pack answer lists the sets it finished, with the packs; the reward waits in the wallet', async () => {
    const u = await newUser(db);
    const p1 = await open(db, u, 'stock', [1, 2, 5, 3, 4]);
    expect(p1.finished).toEqual([]);
    expect(await waiting(db, u)).toBe(0);
    const p2 = await open(db, u, 'stock', [6, 7, 8, 10, 3]);
    expect(p2.finished).toEqual([{ id: 'group:G1', kind: 'group', name: 'Group One', packs: 1 }]);
    expect(await waiting(db, u)).toBe(1);
    // A pack of copies pays nothing more.
    const p3 = await open(db, u, 'stock', [1, 2, 5, 6, 3]);
    expect(p3.finished).toEqual([]);
    expect(await waiting(db, u)).toBe(1);
  });

  it('a reward pack opens as source reward: it spends one waiting pack, never the stack, and is stored like any pack', async () => {
    const u = await newUser(db);
    await open(db, u, 'stock', [1, 2, 5, 3, 4]);
    await open(db, u, 'stock', [6, 7, 8, 10, 3]); // +1 reward pack
    const stockBefore = Number(await one(db, 'select stock from public.cards_wallets where user_id = $1', [u]));
    const r = await open(db, u, 'reward', [9, 13, 17, 11, 15]);
    expect(r.cards.map((c) => c.n)).toEqual([9, 13, 17, 11, 15]);
    expect(r.cards.every((c) => c.isNew)).toBe(true);
    expect(r.new_count).toBe(5);
    expect(r.pack_no).toBe(3);
    // The pack spent the one waiting pack, then completed groups two and three (+2), every Holo card (+3) and the debut year (+2): 1 - 1 + 7.
    expect(ids(r.finished)).toEqual(['group:G2', 'group:G3', 'holo', 'year:2016']);
    expect(await waiting(db, u)).toBe(7);
    expect(Number(await one(db, 'select stock from public.cards_wallets where user_id = $1', [u]))).toBe(stockBefore);
    expect(await rows(db, "select source, new_count from public.cards_packs where user_id = $1 and source = 'reward'", [u])).toEqual([{ source: 'reward', new_count: 5 }]);
    // first_pack_no and first_source of 104 are filled for a reward pack too (the source column of the owned card says 'pack').
    expect(await rows(db, 'select first_pack_no, first_source from public.cards_owned where user_id = $1 and card_no = 9', [u])).toEqual([{ first_pack_no: 3, first_source: 'pack' }]);
  });

  it('a second reward pack is refused when none waits, and the refusal changes nothing', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { reward: 0 });
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 3, 4])).toMatch(/cards: reward/);
    expect(Number(await one(db, 'select count(*) from public.cards_packs where user_id = $1', [u]))).toBe(0);
    expect(Number(await one(db, 'select count(*) from public.cards_owned where user_id = $1', [u]))).toBe(0);
    await setWallet(db, u, { reward: 1 });
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 3, 4])).toBeNull();
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 3, 4])).toMatch(/cards: reward/);
  });

  it('a reward pack that completes a set pays again, and the waiting count adds up', async () => {
    const u = await newUser(db);
    await own(db, u, [1, 2, 3, 4, 5]);
    await setWallet(db, u, { reward: 2 });
    const r = await open(db, u, 'reward', [6, 12, 13, 14, 15]);
    expect(ids(r.finished)).toEqual(['group:G1', 'group:G4']);
    expect(await waiting(db, u)).toBe(2 - 1 + 2);
  });

  it('104 still holds on a reward pack: the 5th card is not Common, packable cards only', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { reward: 5 });
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 7, 8])).toMatch(/cards: pack/); // the 5th is a Common
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 18, 4])).toMatch(/cards: pack/); // a card out of packs
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 19, 4])).toMatch(/cards: pack/); // a card of an inactive idol
    expect(await waiting(db, u)).toBe(5);
  });

  it('104 still holds: the Gold guarantee applies to a reward pack (29 packs without Gold or Full Art, then the 5th must be Gold)', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { reward: 3 });
    await db.query(
      `insert into public.cards_packs (user_id, source, cards, opened_at) select $1::uuid, 'stock', '{1,7,9,3,2}'::int[], $2::timestamptz - (g * interval '1 minute') from generate_series(1, 29) g`,
      [u, T0],
    );
    // 9 is Gold in these tests: use packs with no UR in the history instead
    await db.query('delete from public.cards_packs where user_id = $1', [u]);
    await db.query(
      `insert into public.cards_packs (user_id, source, cards, opened_at) select $1::uuid, 'stock', '{1,7,10,3,2}'::int[], $2::timestamptz - (g * interval '1 minute') from generate_series(1, 29) g`,
      [u, T0],
    );
    expect(await tryOpen(db, u, 'reward', [1, 2, 5, 7, 3])).toMatch(/cards: pity/);
    expect(await waiting(db, u)).toBe(3);
    const ok = await open(db, u, 'reward', [1, 2, 5, 7, 4]);
    expect(ok.cards).toHaveLength(5);
    expect(await waiting(db, u)).toBe(2);
  });

  it('104 still holds: no focus on a reward pack, the missing half (completesPair), and the wishlist cleanup', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { reward: 3 });
    await db.query('alter table public.cards_catalog disable trigger all');
    await db.exec(`
      insert into public.cards_entities (id, kind, name, sort_key) values ('group:P', 'group', 'Pair Group', 'p');
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs, part) values
        (300, 'BV1-0300', 'group:P', 'U', 'stage', true, 1), (301, 'BV1-0301', 'group:P', 'U', 'stage', true, 2);
    `);
    await db.query('alter table public.cards_catalog enable trigger all');
    expect(await failure(db, "select public.cards_apply_pack($1::uuid, 'reward', '{1,2,5,3,4}'::int[], null, $2::timestamptz, 10, 3, 40, 'group:G1')", [u, T0])).toMatch(/cards: focus/);
    await db.query('insert into public.cards_wishlist (user_id, card_no) values ($1, 301)', [u]);
    const a = await open(db, u, 'reward', [1, 2, 5, 3, 300]);
    expect(a.cards.find((c) => c.n === 300)?.completesPair).toBe(false);
    const b = await open(db, u, 'reward', [6, 7, 8, 10, 301]);
    expect(b.cards.find((c) => c.n === 301)?.completesPair).toBe(true);
    expect(Number(await one(db, 'select count(*) from public.cards_wishlist where user_id = $1', [u]))).toBe(0);
    await db.exec('delete from public.cards_catalog where card_no in (300, 301); delete from public.cards_entities where id = \'group:P\'');
  });

  it('104 still holds: the stack is spent by a stock pack only, the timer refills are untouched by a reward pack', async () => {
    const u = await newUser(db);
    await setWallet(db, u, { reward: 1, stock: 2 });
    await open(db, u, 'reward', [1, 2, 5, 3, 4]);
    expect(await rows(db, 'select stock, timer_today from public.cards_wallets where user_id = $1', [u])).toEqual([{ stock: 2, timer_today: 0 }]);
    await open(db, u, 'stock', [6, 7, 8, 10, 3]);
    expect(Number(await one(db, 'select stock from public.cards_wallets where user_id = $1', [u]))).toBe(1);
  });

  it('a bad source is still refused; the ad pack stays closed', async () => {
    const u = await newUser(db);
    expect(await tryOpen(db, u, 'ad', [1, 2, 5, 3, 4])).toMatch(/cards: source/);
    expect(await tryOpen(db, u, 'gift', [1, 2, 5, 3, 4])).toMatch(/cards: source/);
  });
});

describe('a craft that completes a set', () => {
  it('says so and pays once (the card is the last one of group four)', async () => {
    const db = await goalsDb();
    const u = await newUser(db);
    await setWallet(db, u, { shards: 100 });
    await own(db, u, [1, 2, 3, 4, 5]);
    const r = await one<{ card_no: number; cost: number; shards: number; finished: Fin }>(db, 'select public.cards_craft($1::uuid, 6, $2::timestamptz)', [u, T0]);
    expect(r).toMatchObject({ card_no: 6, cost: 50, shards: 50, finished: [{ id: 'group:G1', kind: 'group', name: 'Group One', packs: 1 }] });
    expect(await waiting(db, u)).toBe(1);
    const again = await one<{ finished: Fin }>(db, 'select public.cards_craft($1::uuid, 12, $2::timestamptz)', [u, T0]);
    expect(ids(again.finished)).toEqual(['group:G4']);
    expect(await waiting(db, u)).toBe(2);
  });
  it('a craft that completes nothing returns an empty list', async () => {
    const db = await goalsDb();
    const u = await newUser(db);
    await setWallet(db, u, { shards: 100 });
    const r = await one<{ finished: Fin }>(db, 'select public.cards_craft($1::uuid, 1, $2::timestamptz)', [u, T0]);
    expect(r.finished).toEqual([]);
  });
});

// ---------- the week ----------

describe('the week (Paris Monday 00:00)', () => {
  let db: PGlite;
  beforeAll(async () => { db = await goalsDb(); });

  const week = async (u: string, at: string): Promise<Record<string, unknown>> => one<Record<string, unknown>>(db, 'select public.cards_week_progress($1::uuid, $2::timestamptz)', [u, at]);
  const packsAt = (u: string, at: string, n = 1): Promise<unknown> =>
    db.query(`insert into public.cards_packs (user_id, source, cards, opened_at) select $1::uuid, 'stock', '{1,2,5,7,3}'::int[], $2::timestamptz from generate_series(1, $3::int)`, [u, at, n]);
  const win = (u: string, at: string, o: { game?: string; status?: string; date?: string } = {}): Promise<unknown> =>
    db.query('insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ($1, $2::date, $3, $4, $5::timestamptz)',
      [o.game ?? 'kpopdle-idol', o.date ?? at.slice(0, 10), u, o.status ?? 'won', at]);

  it('the week runs from Monday 00:00 to the next Monday 00:00, Paris time, in winter', async () => {
    const u = await newUser(db);
    const w = await week(u, T0);
    expect(w.week_start).toBe('2026-11-09');
    expect(new Date(w.starts_at as string).toISOString()).toBe('2026-11-08T23:00:00.000Z');
    expect(new Date(w.ends_at as string).toISOString()).toBe('2026-11-15T23:00:00.000Z');
    expect(w).toMatchObject({ goal_packs: WEEK_GOALS.packs, goal_wins: WEEK_GOALS.wins, goal_cards: WEEK_GOALS.cards, reward_packs: WEEK_GOALS.rewardPacks, reward_shards: WEEK_GOALS.rewardShards });
  });

  it('the boundary: Sunday 23:59:59 Paris is the old week, Monday 00:00:00 Paris is the new one (winter and summer)', async () => {
    const u = await newUser(db);
    // Winter: Monday 9 November 00:00 Paris = Sunday 8 November 23:00Z.
    expect((await week(u, '2026-11-08T22:59:59Z')).week_start).toBe('2026-11-02');
    expect((await week(u, '2026-11-08T23:00:00Z')).week_start).toBe('2026-11-09');
    expect((await week(u, '2026-11-15T22:59:59Z')).week_start).toBe('2026-11-09');
    expect((await week(u, '2026-11-15T23:00:00Z')).week_start).toBe('2026-11-16');
    // Summer: Monday 6 July 00:00 Paris = Sunday 5 July 22:00Z.
    expect((await week(u, '2026-07-05T21:59:59Z')).week_start).toBe('2026-06-29');
    expect((await week(u, '2026-07-05T22:00:00Z')).week_start).toBe('2026-07-06');
    // The clock change of the last Sunday of October does not move the Monday.
    expect((await week(u, '2026-10-25T22:59:59Z')).week_start).toBe('2026-10-19');
    expect((await week(u, '2026-10-25T23:00:00Z')).week_start).toBe('2026-10-26');
    expect(new Date((await week(u, '2026-10-20T12:00:00Z')).ends_at as string).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect((await week(u, '2026-10-26T22:59:59Z')).week_start).toBe('2026-10-26');
    expect(new Date((await week(u, '2026-10-26T12:00:00Z')).starts_at as string).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(new Date((await week(u, '2026-10-26T12:00:00Z')).ends_at as string).toISOString()).toBe('2026-11-01T23:00:00.000Z');
  });

  it('packs opened: any source, only inside the week', async () => {
    const u = await newUser(db);
    await packsAt(u, '2026-11-08T22:59:59Z', 4); // Sunday 23:59:59 Paris: last week
    await packsAt(u, '2026-11-08T23:00:00Z', 3); // Monday 00:00:00 Paris: this week
    await packsAt(u, '2026-11-12T10:00:00Z', 2);
    await packsAt(u, '2026-11-15T22:59:59Z', 1); // the last second of the week
    await packsAt(u, '2026-11-15T23:00:00Z', 5); // next week
    expect((await week(u, T0)).packs_opened).toBe(6);
    expect((await week(u, '2026-11-16T10:00:00Z')).packs_opened).toBe(5);
    expect((await week(u, '2026-11-05T10:00:00Z')).packs_opened).toBe(4);
  });

  it('Kpopdle wins: won plays of the Kpopdle games, finished in the week, of this player only', async () => {
    const u = await newUser(db);
    const other = await newUser(db);
    await win(u, '2026-11-08T22:59:59Z', { date: '2026-11-08' }); // last week
    await win(u, '2026-11-08T23:30:00Z', { date: '2026-11-08' }); // Monday 00:30 Paris on a play dated the UTC Sunday
    await win(u, '2026-11-10T10:00:00Z');
    await win(u, '2026-11-10T11:00:00Z', { game: 'otakudle-character' }); // not a Kpopdle game
    await win(u, '2026-11-10T12:00:00Z', { status: 'lost' });
    await win(u, '2026-11-10T13:00:00Z', { status: 'playing' });
    await win(other, '2026-11-10T14:00:00Z');
    await win(u, '2026-11-15T23:00:00Z', { date: '2026-11-15' }); // next week
    await win(u, '2026-11-12T10:00:01Z'); // after "now": not counted yet
    expect((await week(u, T0)).kpopdle_wins).toBe(2);
    expect((await week(other, T0)).kpopdle_wins).toBe(1);
    expect((await week(u, '2026-11-16T10:00:00Z')).kpopdle_wins).toBe(1);
  });

  it('new cards: first copies in the week; a second copy or a first copy of last week does not count', async () => {
    const u = await newUser(db);
    await own(db, u, [1, 2], '2026-11-08T22:59:59Z');
    await own(db, u, [3, 4, 5], '2026-11-08T23:00:00Z');
    await own(db, u, [6], '2026-11-15T22:59:59Z');
    await own(db, u, [7], '2026-11-15T23:00:00Z');
    await db.query("update public.cards_owned set copies = 3, last_at = $2::timestamptz where user_id = $1 and card_no in (1, 2)", [u, T0]);
    expect((await week(u, T0)).new_cards).toBe(4);
  });

  it('a database without the daily games counts no win and does not fail', async () => {
    const d2 = await goalsDb([ECON, GOALS], BASE_NO_DLE);
    const u = await newUser(d2);
    const w = await one<Record<string, unknown>>(d2, 'select public.cards_week_progress($1::uuid, $2::timestamptz)', [u, T0]);
    expect(w.kpopdle_wins).toBe(0);
  });

  async function finishWeek(u: string, at: string): Promise<void> {
    await packsAt(u, at, 20);
    for (let i = 1; i <= 3; i++) await win(u, at.replace(/T\d\d/, `T0${i}`));
    await own(db, u, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], at);
  }

  it('the claim: refused while one counter is short, then +2 reward packs and +25 shards, once a week', async () => {
    const u = await newUser(db);
    const claim = (at: string): Promise<string | null> => failure(db, 'select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, at]);
    await packsAt(u, T0, 20);
    expect(await claim(T0)).toMatch(/cards: goal/);
    for (let i = 1; i <= 3; i++) await win(u, `2026-11-10T0${i}:00:00Z`);
    expect(await claim(T0)).toMatch(/cards: goal/); // 9 new cards would still be short
    await own(db, u, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(await claim(T0)).toMatch(/cards: goal/);
    expect((await week(u, T0)).done).toBe(false);
    await own(db, u, [10]);
    expect((await week(u, T0)).done).toBe(true);
    await setWallet(db, u, { shards: 7, reward: 1 });
    const r = await one<{ packs: number; shards: number; reward_packs: number; shards_total: number }>(db, 'select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, T0]);
    expect(r).toEqual({ packs: 2, shards: 25, reward_packs: 3, shards_total: 32 });
    expect(await rows(db, 'select reward_packs, shards from public.cards_wallets where user_id = $1', [u])).toEqual([{ reward_packs: 3, shards: 32 }]);
    expect(await claim('2026-11-14T10:00:00Z')).toMatch(/cards: claimed/);
    expect((await week(u, T0)).claimed).toBe(true);
    expect(await rows(db, 'select reward_packs, shards from public.cards_wallets where user_id = $1', [u])).toEqual([{ reward_packs: 3, shards: 32 }]);
    expect(Number(await one(db, 'select count(*) from public.cards_week_claims where user_id = $1', [u]))).toBe(1);
  });

  it('the next week is a clean start: no streak, a missed week costs nothing, the old claim does not carry over', async () => {
    const u = await newUser(db);
    // Week of 9 November: nothing done, nothing claimed. Week of 16 November: done and claimed with no claim behind it.
    await finishWeek(u, '2026-11-17T10:00:00Z');
    const w = await week(u, '2026-11-18T10:00:00Z');
    expect(w).toMatchObject({ week_start: '2026-11-16', done: true, claimed: false });
    const r = await one<{ packs: number }>(db, 'select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, '2026-11-18T10:00:00Z']);
    expect(r.packs).toBe(2);
    // The old week shows what it was, still unclaimed, and the new week starts again at zero.
    expect(await week(u, '2026-11-24T10:00:00Z')).toMatchObject({ week_start: '2026-11-23', packs_opened: 0, kpopdle_wins: 0, new_cards: 0, done: false, claimed: false });
  });

  it('a week claimed in one Paris week can be claimed again the next week when done again', async () => {
    const u = await newUser(db);
    await finishWeek(u, '2026-11-10T10:00:00Z');
    await db.query('select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, T0]);
    await packsAt(u, '2026-11-17T10:00:00Z', 20);
    for (let i = 1; i <= 3; i++) await win(u, `2026-11-17T0${i}:00:00Z`);
    await own(db, u, [11, 12, 13, 14, 15, 16, 17, 101, 102, 103], '2026-11-17T10:00:00Z');
    const r = await one<{ packs: number; shards: number }>(db, 'select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, '2026-11-18T10:00:00Z']);
    expect(r).toMatchObject({ packs: 2, shards: 25 });
    expect(await rows(db, 'select reward_packs, shards from public.cards_wallets where user_id = $1', [u])).toEqual([{ reward_packs: 4, shards: 50 }]);
  });

  it('the week reward packs open like any pack', async () => {
    const u = await newUser(db);
    await finishWeek(u, '2026-11-10T10:00:00Z');
    await db.query('select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, T0]);
    const sets = await sync(db, u);
    expect(sets.reward_packs).toBeGreaterThanOrEqual(2);
    const before = await waiting(db, u);
    await open(db, u, 'reward', [11, 12, 13, 14, 15]);
    // It completes group three (+1), group four (+1), the debut year (+2) and every Holo card (+3).
    expect(await waiting(db, u)).toBe(before - 1 + 7);
  });

  it('the week claim of a player with no wallet row creates it, and a refused claim leaves nothing behind', async () => {
    const u = await newUser(db);
    expect(await failure(db, 'select public.cards_week_claim($1::uuid, $2::timestamptz)', [u, T0])).toMatch(/cards: goal/);
    expect(Number(await one(db, 'select count(*) from public.cards_wallets where user_id = $1', [u]))).toBe(0);
  });
});

// ---------- the objects and the rollback ----------

describe('the objects of 105', () => {
  it('closed to the browser: row level security on, no browser grant on the tables, no browser execute on any cards function', async () => {
    const db = await goalsDb();
    expect(Number(await one(db, "select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims') and rowsecurity"))).toBe(2);
    expect(Number(await one(db, "select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_sets_claimed', 'cards_week_claims') and grantee in ('anon', 'authenticated')"))).toBe(0);
    expect(await one(db, "select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'")).toBe(false);
    expect(Number(await one(db, "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_goals_settle', 'cards_week_progress', 'cards_week_claim', 'cards_goals_sync')"))).toBe(5);
    expect(await rows(db, "select proname, count(*)::int as n from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_apply_pack', 'cards_craft', 'cards_wallet', 'cards_roll') group by proname order by proname"))
      .toEqual([{ proname: 'cards_apply_pack', n: 1 }, { proname: 'cards_craft', n: 1 }, { proname: 'cards_roll', n: 1 }, { proname: 'cards_wallet', n: 1 }]);
    // A browser role cannot call a Goals function.
    await db.exec('set role authenticated');
    expect(await failure(db, 'select public.cards_goals_sync($1::uuid)', ['00000000-0000-0000-0000-000000000000'])).toMatch(/permission denied/);
    expect(await failure(db, 'select * from public.cards_sets_claimed')).toMatch(/permission denied/);
    await db.exec('reset role');
  });

  it('is idempotent: a second run changes nothing', async () => {
    const db = await goalsDb();
    const u = await newUser(db);
    await own(db, u, [12]);
    await settle(db, u);
    await db.exec(readCardsSql(GOALS));
    expect(await waiting(db, u)).toBe(1);
    expect(Number(await one(db, "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%'"))).toBe(
      Number(await one(await goalsDb(), "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%'")),
    );
  });

  it('refuses to run before 104', async () => {
    const db = await goalsDb([]);
    await expect(db.exec(readCardsSql(GOALS))).rejects.toThrow(/run 104-economy.sql first/);
  });

  it('105 does not change a pack of 104: the same cards give the same answer without the new key mattering', async () => {
    const d104 = await goalsDb([ECON]);
    const d105 = await goalsDb();
    const a = await newUser(d104);
    const b = await newUser(d105);
    const x = await one<Opened>(d104, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, 40, null)', [a, 'stock', [1, 2, 5, 3, 4], T0]);
    const y = await open(d105, b, 'stock', [1, 2, 5, 3, 4]);
    expect({ cards: y.cards, new_count: y.new_count, pack_no: y.pack_no }).toEqual({ cards: x.cards, new_count: x.new_count, pack_no: x.pack_no });
  });
});

describe('105-goals.rollback.sql', () => {
  it('puts 104 back: the two functions, no table, no column, the old source list; a second run changes nothing', async () => {
    const db = await goalsDb();
    await db.exec(readCardsSql(GOALS_UNDO));
    await db.exec(readCardsSql(GOALS_UNDO));
    expect(Number(await one(db, "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_goals_settle', 'cards_week_progress', 'cards_week_claim', 'cards_goals_sync')"))).toBe(0);
    expect(await rows(db, "select proname, count(*)::int as n from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_apply_pack', 'cards_craft') group by proname order by proname"))
      .toEqual([{ proname: 'cards_apply_pack', n: 1 }, { proname: 'cards_craft', n: 1 }]);
    expect(Number(await one(db, "select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims')"))).toBe(0);
    expect(Number(await one(db, "select count(*) from information_schema.columns where table_name = 'cards_wallets' and column_name = 'reward_packs'"))).toBe(0);
    expect(await one(db, "select pg_get_constraintdef(oid) like '%reward%' from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass")).toBe(false);
    // 104 works again, and its pack answer has no 'finished'.
    const u = await newUser(db);
    const r = await one<Record<string, unknown>>(db, 'select public.cards_apply_pack($1::uuid, $2, $3::int[], null, $4::timestamptz, 10, 3, 40, null)', [u, 'stock', [1, 2, 5, 3, 4], T0]);
    expect(r).not.toHaveProperty('finished');
    expect(await tryOpen(db, u, 'reward', [6, 7, 8, 10, 3])).toMatch(/cards: source/);
    // And 105 applies again on top.
    await db.exec(readCardsSql(GOALS));
    expect(Number(await one(db, "select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims')"))).toBe(2);
  });

  it('is refused while a set is claimed, while a reward pack waits or while a reward pack is recorded', async () => {
    const db = await goalsDb();
    const u = await newUser(db);
    await own(db, u, [12]);
    await settle(db, u);
    await expect(db.exec(readCardsSql(GOALS_UNDO))).rejects.toThrow(/a set is claimed/);
    await db.exec('delete from public.cards_sets_claimed');
    await expect(db.exec(readCardsSql(GOALS_UNDO))).rejects.toThrow(/holds a reward pack/);
    await db.exec('update public.cards_wallets set reward_packs = 1');
    await open(db, u, 'reward', [1, 2, 5, 3, 4]);
    await expect(db.exec(readCardsSql(GOALS_UNDO))).rejects.toThrow(/source reward is recorded/);
    await db.exec("delete from public.cards_packs where source = 'reward'");
    await db.exec(readCardsSql(GOALS_UNDO));
  });

  it('is refused while a week is claimed', async () => {
    const db = await goalsDb();
    const u = await newUser(db);
    await db.query("insert into public.cards_week_claims (user_id, week_start, packs, shards) values ($1, '2026-11-09', 2, 25)", [u]);
    await expect(db.exec(readCardsSql(GOALS_UNDO))).rejects.toThrow(/a week is claimed/);
  });
});
