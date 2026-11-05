// Daily games, the bank of 365 days (CR-019, second change in place; CR-027, third): the frame of 019 builds the bank for every pool size, with
// no random dead end, in blocks: every target once per block of N days (N = the targets) before any comes back, the last block with the
// 365 mod N targets that come once more, the gap G (dle_window) between two days of one target held across the blocks and the turn of the cycle.
// PGlite on the real 018, 019 and 020 (pglite-harness.ts).
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { bankBlocks, failure, freshDb, one, readMigration, rows, wantBlocks } from './pglite-harness';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 60_000 });

const EPOCH = '2026-11-01';
const at = (date: string, time = '12:00:00'): string => `${date}T${time}Z`;

/** A synthetic game of n targets (view dle_src_<id>), balance keys over `keys` groups. */
async function syntheticGame(db: PGlite, id: string, n: number, keys: number, noRepeat: number): Promise<void> {
  const view = `dle_src_${id.replace(/-/g, '_')}`;
  await db.exec(`
    create or replace view public.${view} as
      select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search,
        jsonb_build_object('n', jsonb_build_object('v', x)) as attrs, jsonb_build_object('initial', 'E') as hints,
        null::text as thumb_path, 'k' || (x % ${keys}) as balance_key, true as can_be_target
      from generate_series(1, ${n}) as x;
    insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after)
      values ('${id}', 'kpop', 'idol', '${view}', ${noRepeat}, 2, '{initial}', '{5}');
    insert into public.dle_attributes values ('${id}', 'n', 'number', 1, 2);
  `);
}

interface Stats { days: number; distinct: number; breaks: number; min: number; max: number; outside: number; turn: number }

/** What a bank must hold: 365 days, no target twice within `win` days around the cycle (`turn`: the shortest gap across the turn of the
 *  cycle, last day to first day again), counts that differ by 1 at most. */
async function stats(db: PGlite, game: string, win: number): Promise<Stats> {
  const [r] = await rows<Stats>(db, `
    select (select count(*)::int from public.dle_schedule where game_id = $1) as days,
      (select count(distinct bank_day)::int from public.dle_schedule where game_id = $1) as distinct,
      (select count(*)::int from public.dle_schedule a join public.dle_schedule b
        on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day < b.bank_day
        where a.game_id = $1 and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < $2) as breaks,
      (select min(c)::int from (select count(s.entity_id) as c from public.dle_entities e
        left join public.dle_schedule s on s.game_id = e.game_id and s.entity_id = e.entity_id
        where e.game_id = $1 and e.can_be_target and e.in_pool group by e.entity_id) t) as min,
      (select max(c)::int from (select count(s.entity_id) as c from public.dle_entities e
        left join public.dle_schedule s on s.game_id = e.game_id and s.entity_id = e.entity_id
        where e.game_id = $1 and e.can_be_target and e.in_pool group by e.entity_id) t) as max,
      (select count(*)::int from public.dle_schedule s left join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id
        where s.game_id = $1 and not coalesce(e.can_be_target and e.in_pool, false)) as outside,
      (select min(t)::int from (select 365 - max(bank_day) + min(bank_day) as t from public.dle_schedule where game_id = $1 group by entity_id) x) as turn`, [game, win]);
  return r!;
}

/** Pairs of targets whose order flips between block 1 and block 2 (share of all pairs: 0 the same order, 0.5 independent shuffles) and the
 *  targets that keep the same place in both, for a bank with at least two full blocks. */
async function shuffle(db: PGlite, game: string, n: number): Promise<{ flips: number; same: number }> {
  const [r] = await rows<{ flips: number; same: number }>(db, `
    with p as (select a.bank_day as pa, b.bank_day - $2 as pb from public.dle_schedule a join public.dle_schedule b
      on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day <= $2 and b.bank_day > $2 and b.bank_day <= 2 * $2 where a.game_id = $1)
    select (select count(*) from p x join p y on x.pa < y.pa and x.pb > y.pb)::float8 / ($2::float8 * ($2 - 1) / 2) as flips,
      (select count(*) from p where pa = pb)::float8 / $2 as same`, [game, n]);
  return r!;
}

const windowOf = (n: number, noRepeat: number): number => Math.max(1, Math.min(noRepeat, Math.floor(0.7 * n), Math.floor(365 / Math.ceil(365 / n))));

describe('the bank of 365 days, every pool size', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
  });

  const build = async (id: string, n: number, seed: number, noRepeat: number): Promise<Stats & { win: number }> => {
    await db.exec(`delete from public.dle_schedule where game_id = '${id}'; update public.dle_games set epoch = null, active = false, pool_hash = null where id = '${id}'`);
    expect(await one(db, `select public.dle_activate('${id}', '${EPOCH}', ${seed})`)).toBe(365);
    const win = await one<number>(db, `select public.dle_window('${id}')`);
    expect(win).toBe(windowOf(n, noRepeat));
    return { ...(await stats(db, id, win)), win };
  };

  // 53, 61, 73 and 74 targets with the default window failed at random before; 112, 200, 214 and 750 are the other sizes the brief names.
  const SIZES = [...new Set([53, 61, 73, 74, 112, 200, 214, 750, ...Array.from({ length: 108 }, (_, i) => 30 + 9 * i)])].sort((a, b) => a - b);

  it(`${SIZES.length} sizes from 30 to 1000 targets, the default window of 120 days, three seeds: 365 days, window, balance`, async () => {
    for (const n of SIZES) {
      const id = `p${n}`;
      await syntheticGame(db, id, n, 27, 120);
      for (const seed of [0.11, 0.57, 0.93]) {
        const s = await build(id, n, seed, 120);
        const tag = `${n} targets, seed ${seed}`;
        expect(s.days, tag).toBe(365);
        expect(s.distinct, tag).toBe(365);
        expect(s.outside, tag).toBe(0);
        expect(s.breaks, tag).toBe(0);
        expect(s.max - s.min, tag).toBeLessThanOrEqual(1);
        // CR-027: every target before any returns (blocks of N days from day 1), at most ceil(365 / N) days a target, the gap across the turn.
        expect(await bankBlocks(db, id, n), tag).toEqual(wantBlocks(n));
        expect(s.max, tag).toBe(Math.ceil(365 / n));
        expect(s.turn, tag).toBeGreaterThanOrEqual(s.win);
      }
    }
  });

  it('the windows the series games used to need as a workaround, 30 and 14 days, hold from the minimum pools up', async () => {
    for (const noRepeat of [30, 14]) {
      for (const n of [30, 31, 40, 43, 53, 61, 73, 74, 117, 182]) {
        const id = `w${noRepeat}-${n}`;
        await syntheticGame(db, id, n, 27, noRepeat);
        const s = await build(id, n, 0.4, noRepeat);
        expect(s.days, id).toBe(365);
        expect(s.breaks, id).toBe(0);
        expect(s.max - s.min, id).toBeLessThanOrEqual(1);
        expect(await bankBlocks(db, id, n), id).toEqual(wantBlocks(n));
        expect(s.turn, id).toBeGreaterThanOrEqual(s.win);
      }
    }
  });

  it('a window larger than the cycle can hold is cut to the largest one that holds (floor(365 / ceil(365 / targets)))', async () => {
    // 182 targets: a target comes 3 times, so 3 gaps of 127 days (70 %) or 300 days do not fit in 365 days; 121 do.
    await syntheticGame(db, 'big', 182, 27, 300);
    const s = await build('big', 182, 0.3, 300);
    expect(s.win).toBe(121);
    expect(s.days).toBe(365);
    expect(s.breaks).toBe(0);
    expect(s.max - s.min).toBeLessThanOrEqual(1);
    expect(await bankBlocks(db, 'big', 182)).toEqual(wantBlocks(182));
    expect(s.turn).toBeGreaterThanOrEqual(121);
  });

  it('the blocks are not the same order every time: 0.15 to 0.35 of the pairs of targets flip between two blocks, few targets keep their place', async () => {
    // Measured on these 15 builds: 0.20 to 0.31 of the pairs flip, 0 to 5 % of the targets keep their place (30 targets: 17 %).
    for (const n of [48, 73, 112, 113, 150]) {
      const id = `q${n}`;
      await syntheticGame(db, id, n, 27, 120);
      for (const seed of [0.11, 0.57, 0.93]) {
        await build(id, n, seed, 120);
        const sh = await shuffle(db, id, n);
        expect(sh.flips, `${n} targets, seed ${seed}`).toBeGreaterThan(0.12);
        expect(sh.flips, `${n} targets, seed ${seed}`).toBeLessThan(0.4);
        expect(sh.same, `${n} targets, seed ${seed}`).toBeLessThan(0.25);
      }
    }
  });

  it('the same seed draws the same bank at the awkward sizes; another seed another one', async () => {
    for (const n of [53, 74]) {
      const id = `p${n}`;
      const bank = async (seed: number): Promise<string> => {
        await build(id, n, seed, 120);
        return one<string>(db, `select string_agg(entity_id, ',' order by bank_day) from public.dle_schedule where game_id = '${id}'`);
      };
      const a = await bank(0.25);
      expect(await bank(0.25)).toBe(a);
      expect(await bank(0.26)).not.toBe(a);
    }
  });

  it('a pool under min_pool is the one impossible input: dle_pool_too_small, no bank', async () => {
    await syntheticGame(db, 'tiny', 12, 27, 120);
    await db.exec(`update public.dle_games set min_pool = 30 where id = 'tiny'`);
    await expect(db.query(`select public.dle_activate('tiny', '${EPOCH}', 0.5)`)).rejects.toThrow(/dle_pool_too_small: 12 targets, 30 needed/);
    expect(await one(db, `select count(*)::int from public.dle_schedule where game_id = 'tiny'`)).toBe(0);
  });
});

describe('a rebuild keeps today and the 7 days after it', () => {
  const grow = (id: string, to: number): string => `create or replace view public.dle_src_${id} as
    select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search, jsonb_build_object('n', jsonb_build_object('v', x)) as attrs,
      jsonb_build_object('initial', 'E') as hints, null::text as thumb_path, 'k' || (x % 27) as balance_key, true as can_be_target
    from generate_series(1, ${to}) as x`;

  it.each([[53, 74], [74, 61], [61, 214], [112, 100], [200, 230]])('%i targets become %i: the 8 days stay, the window and the counts hold', async (from, to) => {
    const db = await freshDb();
    const id = `r${from}`;
    await syntheticGame(db, id, from, 27, 120);
    await db.query(`select public.dle_activate('${id}', '${EPOCH}', 0.7)`);
    const today = '2027-02-14';
    const kept = await rows<{ d: string; t: string }>(db, `select to_char(d, 'YYYY-MM-DD') as d, s.entity_id as t
      from generate_series('${today}'::date, '${today}'::date + 7, interval '1 day') d
      join public.dle_schedule s on s.game_id = '${id}' and s.bank_day = public.dle_bank_day('${EPOCH}', d::date) order by d`);
    expect(kept).toHaveLength(8);
    await db.exec(grow(id.replace(/-/g, '_'), to));
    const out = await one<{ game: string; pool: number; rebuilt_days: number }[]>(db, `select public.dle_daily_maintenance('${at(today, '00:05:00')}')`);
    expect(out).toEqual([{ game: id, pool: to, rebuilt_days: 357 }]);
    for (const k of kept) {
      expect(await one(db, `select entity_id from public.dle_schedule where game_id = '${id}' and bank_day = public.dle_bank_day('${EPOCH}', $1::date)`, [k.d]), k.d).toBe(k.t);
      expect(await one(db, `select public.dle_target('${id}', $1::date)`, [k.d]), k.d).toBe(k.t);
    }
    const win = await one<number>(db, `select public.dle_window('${id}')`);
    const s = await stats(db, id, win);
    expect(s.days).toBe(365);
    expect(s.breaks).toBe(0);
    // The 8 kept targets are members of the pool when it grows: the counts differ by 1 at most. When it shrinks, a kept target that
    // left the pool is the only way to a larger difference.
    const left = await one<number>(db, `select count(*)::int from public.dle_schedule where game_id = '${id}' and entity_id::int > ${to}`);
    if (left === 0) expect(s.max - s.min).toBeLessThanOrEqual(1);
    expect(s.max - s.min).toBeLessThanOrEqual(1 + left);
    // CR-027: the blocks start on today's bank day, the 8 kept days being the first 8 days of block 1. No target twice in a block, the blocks
    // have the sizes of N targets, and the gap holds across the turn of the cycle (a kept target that left the pool takes one day of its block
    // and displaces one pool target from it: that is the 1 + left above).
    const start = await one<number>(db, `select public.dle_bank_day('${EPOCH}', '${today}'::date)`);
    const bl = await bankBlocks(db, id, to, start);
    for (const [days, distinct] of bl) expect(distinct).toBe(days);
    expect(bl.map((b) => b[0])).toEqual(wantBlocks(to).map((b) => b[0]));
    expect(s.turn).toBeGreaterThanOrEqual(win);
  });
});

describe('D02-dev-rebuild-banks.sql (dev only, CR-027)', () => {
  const D02 = (): string => readMigration('dev/D02-dev-rebuild-banks.sql');
  const bank = (db: PGlite, id: string): Promise<string> => one<string>(db, `select string_agg(entity_id, ',' order by bank_day) from public.dle_schedule where game_id = '${id}'`);

  it('refuses above 200 profiles and a live hub or anime site; rebuilds a bank that is not in blocks from day 1; a second run changes nothing', async () => {
    const db = await freshDb();
    await db.exec(`create table public.profiles (id integer primary key); insert into public.profiles select x from generate_series(1, 50) x`);
    await syntheticGame(db, 'dev', 112, 27, 120);
    await syntheticGame(db, 'tiny', 20, 27, 120);
    await db.query(`select public.dle_activate('dev', '${EPOCH}', 0.4)`);
    await db.query(`select public.dle_activate('tiny', '${EPOCH}', 0.4)`);
    await db.exec(`update public.dle_games set min_pool = 60 where id = 'tiny'`);
    // A bank drawn the old way: the same days read from another start, so that the blocks do not start on day 1.
    await db.exec(`
      create temp table old_bank as select game_id, ((bank_day + 36) % 365) + 1 as bank_day, entity_id from public.dle_schedule where game_id = 'dev';
      delete from public.dle_schedule where game_id = 'dev';
      insert into public.dle_schedule (game_id, bank_day, entity_id) select * from old_bank;`);
    const rotated = await bank(db, 'dev');
    const tiny = await bank(db, 'tiny');
    expect(await bankBlocks(db, 'dev', 112)).not.toEqual(wantBlocks(112));
    const games = `select id, active, epoch from public.dle_games order by id`;
    const before = await rows(db, games);

    // The guards change nothing.
    await db.exec(`insert into public.profiles select x from generate_series(51, 201) x`);
    expect(await failure(db, D02())).toMatch(/more than 200 profiles/);
    await db.exec(`delete from public.profiles where id > 50; insert into public.sites (id, domain, brand, kind, status, sort) values ('hub', 'bunnyverse.org', 'Bunnyverse', 'hub', 'live', 3)`);
    expect(await failure(db, D02())).toMatch(/anime or hub site is live/);
    expect(await bank(db, 'dev')).toBe(rotated);
    await db.exec(`delete from public.sites where id = 'hub'`);

    // The engine of CR-019 (no marker): it stops and says what to run first.
    const fn = await one<string>(db, `select pg_get_functiondef('public.dle_build_bank(text, date, double precision)'::regprocedure)`);
    await db.exec(fn.replace('bank-blocks-v1', 'no-marker'));
    expect(await failure(db, D02())).toMatch(/run 019-dle-core.sql again first/);
    await db.exec(fn);

    expect(await failure(db, D02())).toBeNull();
    const once = await bank(db, 'dev');
    expect(once).not.toBe(rotated);
    expect(await bankBlocks(db, 'dev', 112)).toEqual(wantBlocks(112));
    expect(await one(db, `select count(*)::int from public.dle_schedule where game_id = 'dev'`)).toBe(365);
    expect(await one(db, `select public.dle_window('dev')`)).toBe(78);
    expect(await one(db, `select count(*)::int from public.dle_schedule a join public.dle_schedule b on a.game_id = b.game_id and a.entity_id = b.entity_id and a.bank_day < b.bank_day
      where a.game_id = 'dev' and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < 78`)).toBe(0);
    // A game under its minimum stays as it is, no game is switched on or off, no epoch moves.
    expect(await bank(db, 'tiny')).toBe(tiny);
    expect(await rows(db, games)).toEqual(before);
    // A second run changes nothing.
    expect(await failure(db, D02())).toBeNull();
    expect(await bank(db, 'dev')).toBe(once);
  });
});
