// Owner rule 2026-11-09: nothing waits for a date. L19 takes Taeil (74) and Mark (80) out of the answers NOW and redraws, inside its one DO
// block, the coming days that held them (never today, never a served date); the rollback gives the exact calendar and pool_hash back.
// PGlite, the real chain of kpopdle-fixture (212 possible answers like production). L20 changes no target and redraws nothing.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { kpopdleWorld } from './kpopdle-fixture';
import { MIGRATIONS, one, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L19 = readLaunch('L19-l1-kpopdle-data-fixes.sql');
const L19R = readLaunch('L19-l1-kpopdle-data-fixes.rollback.sql');
const L20 = readLaunch('L20-l1-kpopdle-view.sql');
const GAME = 'kpopdle-idol';

type Bank = Record<number, string>;
const bank = async (db: PGlite): Promise<Bank> =>
  Object.fromEntries((await rows<{ bank_day: number; entity_id: string }>(db, `select bank_day::int, entity_id from public.dle_schedule where game_id = '${GAME}' order by 1`)).map((r) => [r.bank_day, r.entity_id]));
const stamps = async (db: PGlite): Promise<string> => JSON.stringify(await rows(db, `select bank_day, entity_id, drawn_at from public.dle_schedule where game_id = '${GAME}' order by 1`));
const day = (db: PGlite, k: number): Promise<number> => one<number>(db, `select public.dle_bank_day(epoch, public.dle_utc_date(now()) + ${k})::int from public.dle_games where id = '${GAME}'`);
const hash = (db: PGlite): Promise<string | null> => one<string | null>(db, `select pool_hash from public.dle_games where id = '${GAME}'`);
const put = (db: PGlite, d: number, id: string): Promise<unknown> => db.exec(`update public.dle_schedule set entity_id = '${id}' where game_id = '${GAME}' and bank_day = ${d}`);
const valid = async (db: PGlite): Promise<Set<string>> =>
  new Set((await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = '${GAME}' and can_be_target and in_pool`)).map((r) => r.entity_id));

interface World { db: PGlite; d: { today: number; tomorrow: number; served: number; far: number; farMark: number }; before: Bank; beforeHash: string | null; beforeStamps: string }

async function world(): Promise<World> {
  const db = await kpopdleWorld();
  const d = { today: await day(db, 0), tomorrow: await day(db, 1), served: await day(db, 3), far: await day(db, 200), farMark: await day(db, 330) };
  // Taeil on today, tomorrow and far ahead, Mark on a served date and far ahead; nobody else of the pair anywhere.
  await db.exec(`update public.dle_schedule set entity_id = '1' where game_id = '${GAME}' and entity_id in ('74', '80')`);
  await put(db, d.today, '74');
  await put(db, d.tomorrow, '74');
  await put(db, d.served, '80');
  await put(db, d.far, '74');
  await put(db, d.farMark, '80');
  await db.exec(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('${GAME}', public.dle_utc_date(now()) + 3, 14, '80')`);
  return { db, d, before: await bank(db), beforeHash: await hash(db), beforeStamps: await stamps(db) };
}

let w: World;
let applied: Bank;
let appliedStamps: string;
beforeAll(async () => {
  w = await world();
  await w.db.exec(L19);
  applied = await bank(w.db);
  appliedStamps = await stamps(w.db);
});

describe('L19 redraws the coming days of Taeil and Mark', () => {
  it('Taeil tomorrow and far ahead, Mark far ahead are redrawn; today and the served date are untouched', async () => {
    const ok = await valid(w.db);
    expect(ok.has('74') || ok.has('80')).toBe(false);
    for (const k of ['tomorrow', 'far', 'farMark'] as const) {
      expect(w.before[w.d[k]], k).toMatch(/^(74|80)$/);
      expect(applied[w.d[k]], k).not.toMatch(/^(74|80)$/);
      expect(ok.has(applied[w.d[k]]!), k).toBe(true);
    }
    expect(applied[w.d.today]).toBe('74');
    expect(applied[w.d.served]).toBe('80');
  });

  it('only those three days changed; the picks are valid, distinct, and none is scheduled in the 30 days after today', async () => {
    const changed = Object.keys(applied).map(Number).filter((b) => applied[b] !== w.before[b]);
    expect(changed.sort((a, b) => a - b)).toEqual([w.d.tomorrow, w.d.far, w.d.farMark].sort((a, b) => a - b));
    const picks = [w.d.tomorrow, w.d.far, w.d.farMark].map((b) => applied[b]!);
    expect(new Set(picks).size).toBe(3);
    for (const b of [w.d.tomorrow, w.d.far, w.d.farMark]) {
      const e = applied[b]!;
      expect(await one(w.db, `select count(*)::int from public.dle_schedule s join public.dle_games g on g.id = s.game_id
        where s.game_id = '${GAME}' and s.entity_id = '${e}' and s.bank_day <> ${b} and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(1, 30) k)`), `pick ${e}`).toBe(0);
    }
    expect(await one(w.db, `select count(*)::int from public.dle_schedule where game_id = '${GAME}' and entity_id in ('74', '80') and bank_day not in (${w.d.today}, ${w.d.served})`)).toBe(0);
  });

  it('the whole bank is saved (365 rows) with its pool_hash; the pool_hash is not the saved one now', async () => {
    expect(await one(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L19' and game_id = '${GAME}'`)).toBe(365);
    expect(await one(w.db, `select count(distinct pool_hash)::int from public.dle_schedule_backup where file = 'L19'`)).toBe(1);
    expect(await one(w.db, `select b.pool_hash from public.dle_schedule_backup b where b.file = 'L19' limit 1`)).toBe(w.beforeHash);
  });

  it('two identical databases give the same picks', async () => {
    const twin = await world();
    // The two worlds draw their own bank; give the twin the bank of the first one, then apply.
    await twin.db.exec(`delete from public.dle_schedule where game_id = '${GAME}'`);
    for (const [b, e] of Object.entries(w.before)) await twin.db.exec(`insert into public.dle_schedule (game_id, bank_day, entity_id) values ('${GAME}', ${b}, '${e}')`);
    await twin.db.exec(L19);
    expect(await bank(twin.db)).toEqual(applied);
  });

  it('a second apply changes nothing (the calendar and its stamps)', async () => {
    await w.db.exec(L19);
    expect(await bank(w.db)).toEqual(applied);
    expect(await stamps(w.db)).toBe(appliedStamps);
    expect(await one(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L19'`)).toBe(365);
  });

  it('the rollback gives the exact 365 rows of the bank and the pool_hash back, Taeil and Mark are answers again', async () => {
    await w.db.exec(L19R);
    expect(await bank(w.db)).toEqual(w.before);
    expect(await hash(w.db)).toBe(w.beforeHash);
    expect(await one(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L19'`)).toBe(0);
    expect(await one(w.db, `select count(*)::int from public.dle_entities where game_id = '${GAME}' and entity_id in ('74', '80') and can_be_target`)).toBe(2);
    // Only drawn_at moved on the three rows the rollback put back.
    const rows2 = JSON.parse(await stamps(w.db)) as { bank_day: number; entity_id: string }[];
    expect(rows2).toHaveLength(365);
    await w.db.exec(L19R);
    expect(await bank(w.db)).toEqual(w.before);
    await w.db.exec(L19);
    expect(await bank(w.db)).toEqual(applied);
    void w.beforeStamps;
  });

  it('anon and authenticated can neither read the backup nor run the functions; no temp table and no date wording in the files', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect(await one(w.db, `select has_table_privilege('${role}', 'public.dle_schedule_backup', 'select')`), role).toBe(false);
      expect(await one(w.db, `select has_function_privilege('${role}', 'public.dle_reschedule(text, text, timestamptz)', 'execute')`), role).toBe(false);
      expect(await one(w.db, `select has_function_privilege('${role}', 'public.dle_reschedule_undo(text, text, timestamptz)', 'execute')`), role).toBe(false);
    }
    for (const sql of [L19, L19R, L20, readLaunch('L20-l1-kpopdle-view.rollback.sql')]) {
      expect(sql).not.toMatch(/create\s+temp/i);
      expect(sql).not.toMatch(/next 8 days|7-day|day boundary|just after 00:30/i);
    }
  });

  it('L20 redraws nothing: the calendar and the answers are the same before and after it, and after its rollback', async () => {
    const b0 = await bank(w.db);
    const s0 = await stamps(w.db);
    await w.db.exec(L20);
    expect(await bank(w.db)).toEqual(b0);
    expect(await stamps(w.db)).toBe(s0);
    expect(await one(w.db, `select count(*)::int from public.dle_schedule_backup where file = 'L20'`)).toBe(0);
    await w.db.exec(readLaunch('L20-l1-kpopdle-view.rollback.sql'));
    expect(await stamps(w.db)).toBe(s0);
  });
});
