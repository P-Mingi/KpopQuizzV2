// Owner rule 2026-11-09: nothing waits for a date. L21 and L22 redraw, inside their one DO block, the coming days whose answer they
// remove (never today, never a served date), after saving the whole bank of the game; the rollback puts the exact calendar and the
// pool_hash back. The real chain on PGlite: 019, 023, 024, L04, L13, L15, L17, L18, then L21 and L22 and their rollbacks.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, failure, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L21 = 'L21-l1-series-games-corrections.sql';
const L21R = 'L21-l1-series-games-corrections.rollback.sql';
const L22 = 'L22-l1-otakudle-facts-corrections.sql';
const L22R = 'L22-l1-otakudle-facts-corrections.rollback.sql';
const OP = 'otakudle-one-piece';
const OT = 'otakudle';

type Bank = Record<number, string>;
const bank = async (db: PGlite, game: string): Promise<Bank> =>
  Object.fromEntries((await rows<{ bank_day: number; entity_id: string }>(db, `select bank_day::int, entity_id from public.dle_schedule where game_id = $1 order by 1`, [game])).map((r) => [r.bank_day, r.entity_id]));
const stamps = async (db: PGlite, game: string): Promise<string> => JSON.stringify(await rows(db, `select bank_day, entity_id, drawn_at from public.dle_schedule where game_id = $1 order by 1`, [game]));
const bankDay = (db: PGlite, game: string, k: number): Promise<number> =>
  one<number>(db, `select public.dle_bank_day(epoch, public.dle_utc_date(now()) + ${k})::int from public.dle_games where id = $1`, [game]);
const poolHash = (db: PGlite, game: string): Promise<string | null> => one<string | null>(db, `select pool_hash from public.dle_games where id = $1`, [game]);
const idOf = (db: PGlite, slug: string): Promise<string> => one<string>(db, `select c.id::text from public.characters c where c.slug = $1`, [slug]);
const valid = async (db: PGlite, game: string): Promise<Set<string>> =>
  new Set((await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = $1 and can_be_target and in_pool`, [game])).map((r) => r.entity_id));
const put = (db: PGlite, game: string, day: number, entity: string): Promise<unknown> =>
  db.exec(`update public.dle_schedule set entity_id = '${entity}' where game_id = '${game}' and bank_day = ${day}`);

interface World { db: PGlite; kyros: string; burgess: string; haise: string; day: { today: number; tomorrow: number; served: number; far: number }; before: Bank; beforeHash: string | null; beforeStamps: string }

/** The chain up to L18, the games live with a bank drawn from the pool as it stood; a removed answer put on today, tomorrow, a served date (+3) and far ahead. */
async function world(): Promise<World> {
  const db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql']) await db.exec(readLaunch(f));
  await liveGames(db, [OP, 'otakudle-dragon-ball', OT]);
  const kyros = await idOf(db, 'kyros');
  const burgess = await idOf(db, 'jesus-burgess');
  const haise = await idOf(db, 'haise-sasaki');
  const day = { today: await bankDay(db, OP, 0), tomorrow: await bankDay(db, OP, 1), served: await bankDay(db, OP, 3), far: await bankDay(db, OP, 200) };
  await put(db, OP, day.today, burgess);
  await put(db, OP, day.tomorrow, burgess);
  await put(db, OP, day.served, kyros);
  await put(db, OP, day.far, kyros);
  await db.exec(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('${OP}', public.dle_utc_date(now()) + 3, 14, '${kyros}')`);
  return { db, kyros, burgess, haise, day, before: await bank(db, OP), beforeHash: await poolHash(db, OP), beforeStamps: await stamps(db, OP) };
}

let w: World;
let applied: Bank;
let appliedStamps: string;

beforeAll(async () => {
  w = await world();
  await w.db.exec(readLaunch(L21));
  applied = await bank(w.db, OP);
  appliedStamps = await stamps(w.db, OP);
});

describe('L21 redraws the coming days of the answers it removes', () => {
  it('a removed answer scheduled tomorrow and far ahead is redrawn on both days; today is untouched', async () => {
    const ok = await valid(w.db, OP);
    expect(ok.has(w.kyros) || ok.has(w.burgess)).toBe(false);
    expect(w.before[w.day.tomorrow]).toBe(w.burgess);
    expect(applied[w.day.tomorrow]).not.toBe(w.burgess);
    expect(ok.has(applied[w.day.tomorrow]!)).toBe(true);
    expect(w.before[w.day.far]).toBe(w.kyros);
    expect(applied[w.day.far]).not.toBe(w.kyros);
    expect(ok.has(applied[w.day.far]!)).toBe(true);
    expect(applied[w.day.today]).toBe(w.burgess);
  });

  it('a served date is untouched, even when it holds a removed answer', () => {
    expect(applied[w.day.served]).toBe(w.kyros);
  });

  it('only the days that held a removed answer changed, and no coming day holds an invalid target', async () => {
    const ok = await valid(w.db, OP);
    const keep = new Set([w.day.today, w.day.served]);
    for (let d = 1; d <= 365; d++) {
      if (keep.has(d)) expect(applied[d], `bank day ${d}`).toBe(w.before[d]);
      else if (ok.has(w.before[d]!)) expect(applied[d], `bank day ${d}`).toBe(w.before[d]);
      else expect(ok.has(applied[d]!), `bank day ${d}`).toBe(true);
    }
    expect(await one<number>(w.db, `select count(*)::int from public.dle_schedule s join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = $1 and not (e.can_be_target and e.in_pool) and s.bank_day not in ($2, $3)`, [OP, w.day.today, w.day.served])).toBe(0);
  });

  it('the picks are valid, distinct on the two days, and none is scheduled within 30 days after today (its own day apart)', async () => {
    const t = applied[w.day.tomorrow]!;
    const f = applied[w.day.far]!;
    expect(t).not.toBe(f);
    const inWindow = async (entity: string): Promise<number[]> =>
      (await rows<{ k: number }>(w.db, `select k::int from generate_series(1, 30) as k where exists (select 1 from public.dle_schedule s join public.dle_games g on g.id = s.game_id where s.game_id = $1 and s.entity_id = $2 and s.bank_day = public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k))`, [OP, entity])).map((r) => r.k);
    expect(await inWindow(t)).toEqual([1]);
    expect(await inWindow(f)).toEqual([]);
    const near = await rows<{ n: number }>(w.db, `select count(*)::int as n from generate_series(-30, 30) as j where j <> 0 and exists (select 1 from public.dle_schedule s join public.dle_games g on g.id = s.game_id where s.game_id = $1 and s.entity_id = $2 and s.bank_day = public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + 200 + j))`, [OP, f]);
    expect(near[0]!.n).toBe(0);
  });

  it('two identical databases give the same picks', async () => {
    const other = await world();
    await other.db.exec(readLaunch(L21));
    expect(await bank(other.db, OP)).toEqual(applied);
    expect(await bank(other.db, 'otakudle-dragon-ball')).toEqual(await bank(w.db, 'otakudle-dragon-ball'));
    await other.db.close();
  });

  it('a second apply changes nothing: not a day, not a stamp, not the saved bank', async () => {
    await w.db.exec(readLaunch(L21));
    expect(await stamps(w.db, OP)).toBe(appliedStamps);
    expect(await one<number>(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L21' and game_id = $1`, [OP])).toBe(365);
    const saved = await rows<{ bank_day: number; entity_id: string }>(w.db, `select bank_day::int, entity_id from public.dle_schedule_backup where file = 'L21' and game_id = $1`, [OP]);
    for (const r of saved) expect(r.entity_id, `bank day ${r.bank_day}`).toBe(w.before[r.bank_day]);
  });

  it('the rollback gives back the exact 365 rows and the pool_hash, even after the nightly maintenance rebuilt the bank', async () => {
    const maint = await one<unknown>(w.db, `select public.dle_daily_maintenance(now())`);
    expect(JSON.stringify(maint)).not.toMatch(/"error"/);
    expect(await poolHash(w.db, OP)).not.toBe(w.beforeHash);
    await w.db.exec(readLaunch(L21R));
    expect(await bank(w.db, OP)).toEqual(w.before);
    expect(await poolHash(w.db, OP)).toBe(w.beforeHash);
    expect(await one<number>(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L21'`)).toBe(0);
    expect((await valid(w.db, OP)).has(w.kyros)).toBe(true);
    // a second rollback changes nothing; the file applies again and redraws the same days
    await w.db.exec(readLaunch(L21R));
    expect(await bank(w.db, OP)).toEqual(w.before);
    await w.db.exec(readLaunch(L21));
    expect(await bank(w.db, OP)).toEqual(applied);
  });

  it('a file of a game that is not live yet leaves the pool to its own activation: nothing saved, nothing drawn', async () => {
    const db = await afterSessionG();
    await db.exec(readMigration('024-dle-series-games.sql'));
    await afterJ4(db);
    await db.exec(readMigration('024-dle-series-games.sql'));
    await applyLaunchFiles(db);
    for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql', L21]) await db.exec(readLaunch(f));
    expect(await one<number>(db, `select count(*)::int from public.dle_schedule_backup`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from public.dle_schedule`)).toBe(0);
    await db.close();
  });
});

describe('L22 does the same for Otakudle', () => {
  it('Haise Sasaki scheduled tomorrow and far ahead is redrawn, a second apply and the rollback hold', async () => {
    const db = w.db;
    await w.db.exec(readLaunch('L22-l1-otakudle-facts-corrections.rollback.sql'));
    const epoch = await one<string>(db, `select epoch::text from public.dle_games where id = '${OT}'`);
    expect(epoch).toBeTruthy();
    const days = { today: await bankDay(db, OT, 0), tomorrow: await bankDay(db, OT, 1), far: await bankDay(db, OT, 300) };
    await put(db, OT, days.today, w.haise);
    await put(db, OT, days.tomorrow, w.haise);
    await put(db, OT, days.far, w.haise);
    const before = await bank(db, OT);
    const hash = await poolHash(db, OT);
    await db.exec(readLaunch(L22));
    const after = await bank(db, OT);
    const ok = await valid(db, OT);
    expect(ok.has(w.haise)).toBe(false);
    expect(after[days.today]).toBe(w.haise);
    for (const d of [days.tomorrow, days.far]) expect(ok.has(after[d]!), `bank day ${d}`).toBe(true);
    // Hisoka (2011 row) is excluded by the curation: nothing scheduled holds it
    const hisoka = await idOf(db, 'hisoka-morrow');
    expect(Object.values(after).includes(hisoka)).toBe(false);
    expect(await one<number>(db, `select count(*)::int from public.dle_schedule_backup where file = 'L22'`)).toBe(365);
    const stamp = await stamps(db, OT);
    await db.exec(readLaunch(L22));
    expect(await stamps(db, OT)).toBe(stamp);
    await db.exec(readLaunch(L22R));
    expect(await bank(db, OT)).toEqual(before);
    expect(await poolHash(db, OT)).toBe(hash);
    expect(await one<number>(db, `select count(*)::int from public.dle_schedule_backup where file = 'L22'`)).toBe(0);
  });
});

describe('the backup and the two functions are closed to the browser roles', () => {
  it('anon and authenticated cannot read the backup nor execute dle_reschedule or dle_reschedule_undo', async () => {
    const db = w.db;
    for (const role of ['anon', 'authenticated']) {
      expect(await one(db, `select has_table_privilege('${role}', 'public.dle_schedule_backup', 'select')`), `${role} table`).toBe(false);
      for (const fn of ['dle_reschedule', 'dle_reschedule_undo']) {
        expect(await one(db, `select has_function_privilege('${role}', 'public.${fn}(text, text, timestamptz)', 'execute')`), `${role} ${fn}`).toBe(false);
      }
      expect(await failure(db, `set role ${role}; select * from public.dle_schedule_backup; reset role`)).toMatch(/permission denied/);
      await db.exec('reset role');
      expect(await failure(db, `set role ${role}; select public.dle_reschedule('x', '${OP}'); reset role`)).toMatch(/permission denied/);
      await db.exec('reset role');
    }
    expect(await one(db, `select relrowsecurity from pg_class where oid = 'public.dle_schedule_backup'::regclass`)).toBe(true);
    expect(await one(db, `select count(*)::int from pg_policies where tablename = 'dle_schedule_backup'`)).toBe(0);
  });
});
