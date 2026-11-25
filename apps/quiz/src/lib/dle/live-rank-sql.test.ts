// Lane DLE2-A (owner request of 2026-11-25): L40 puts the plays of the day (players_today) in dle_day and the order in which a play found the answer (solve_rank)
// in the play state. Proof on PGlite with the repo's dle harness: the rank order, a reload, the count, the Verify lines, the rollback, a second run that changes nothing.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { kpopdleDb, rpcAs } from './game-fixture';
import { MIGRATIONS, one, rows } from './pglite-harness';
import { readPool } from './read';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const UP = 'L40-l1-dle-live-count-and-rank.sql';
const DOWN = 'L40-l1-dle-live-count-and-rank.rollback.sql';
const read = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const TODAY = new Date().toISOString().slice(0, 10);
const EPOCH = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
const GAME = 'kpopdle-idol';
const tok = (n: number): string => `l40-token-${String(n).padStart(4, '0')}-abcdefgh`;

interface State { status: string; solve_rank?: number | null; players_today?: number; guesses: unknown[] }
interface Day { players_today?: number; stats: unknown; play: State | null }

let db: PGlite;
let target: string;
let wrong: string;
const day = async (n: number): Promise<Day> => (await rpcAs(db, 'dle_day', { p_game: GAME, p_token: tok(n) })).data as Day;
const guess = async (n: number, id: string): Promise<State> => {
  const r = await rpcAs(db, 'dle_guess', { p_game: GAME, p_date: TODAY, p_token: tok(n), p_entity: id });
  expect(r.error).toBeNull();
  return r.data as State;
};

/** The "-- Verify: <query>;   expect <value>" lines of a file header, run on the database. */
async function verify(file: string): Promise<void> {
  const lines = read(file).split('\n').filter((l) => l.startsWith('-- Verify:'));
  expect(lines.length).toBeGreaterThanOrEqual(3);
  for (const line of lines) {
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    expect(m, line).not.toBeNull();
    const r = await rows<Record<string, unknown>>(db, m![1]!.replace(/;$/, ''));
    expect(String(Object.values(r[0]!)[0]), m![1]).toBe(m![2]);
  }
}

beforeAll(async () => {
  db = await kpopdleDb(EPOCH);
  const pool = await readPool({ rpc: (fn, args) => rpcAs(db, fn, args) }, GAME);
  target = await one<string>(db, `select public.dle_target('${GAME}', $1::date)`, [TODAY]);
  wrong = pool!.entities.find((e) => e.id !== target)!.id;
});

describe('before L40: the pages keep working on the functions of 019', () => {
  it('dle_day has no players_today and a won play has no solve_rank', async () => {
    expect((await day(1)).players_today).toBeUndefined();
    const won = await guess(1, target);
    expect(won.status).toBe('won');
    expect(won.solve_rank).toBeUndefined();
  });
});

describe('after L40', () => {
  let src019 = '';
  const snapshot = async (): Promise<string> => JSON.stringify({
    fns: await rows(db, `select proname, prosrc from pg_proc where proname in ('dle_day_at', 'dle_guess_at', 'dle_play_state') order by proname`),
    plays: await rows(db, 'select to_jsonb(p) as row from public.dle_plays p order by p.id'),
    stats: await rows(db, 'select game_id, play_date, plays, wins, give_ups, guess_hist from public.dle_daily_stats order by game_id, play_date'),
  });

  beforeAll(async () => {
    src019 = await one<string>(db, `select prosrc from pg_proc where proname = 'dle_day_at'`);
    await db.exec(read(UP));
  });

  it('the plays of the day are in dle_day whatever the floor of 100, while stats stays null', async () => {
    const d = await day(2);
    expect(d.players_today).toBe(1);
    expect(d.stats).toBeNull();
    expect(d.play).toBeNull();
  });

  it('the rank is the order in which plays found the answer: stable on reload, nothing for an open play or a give up', async () => {
    // play 1 won before L40: no rank, and it stays so; the ranks go on from the wins count (1), so the next to win is 2nd
    expect((await day(1)).play!.solve_rank).toBeNull();
    const a = await guess(2, wrong);
    expect(a.status).toBe('playing');
    expect(a.solve_rank).toBeNull();
    const b = await guess(3, target);
    expect(b.status).toBe('won');
    expect(b.solve_rank).toBe(2);
    const aWon = await guess(2, target);
    expect(aWon.solve_rank).toBe(3);
    expect(aWon.players_today).toBe(3);
    const c = await guess(4, wrong);
    expect(c.status).toBe('playing');
    const gaveUp = (await rpcAs(db, 'dle_give_up', { p_game: GAME, p_date: TODAY, p_token: tok(4) })).data as State;
    expect(gaveUp.status).toBe('given_up');
    expect(gaveUp.solve_rank).toBeNull();
    const d = await guess(5, target);
    expect(d.solve_rank).toBe(4);
    // reload: dle_day gives the same ranks; a finished play asked again changes nothing
    expect((await day(3)).play!.solve_rank).toBe(2);
    expect((await day(2)).play!.solve_rank).toBe(3);
    expect((await day(5)).play!.solve_rank).toBe(4);
    expect((await guess(3, wrong)).solve_rank).toBe(2);
    expect((await day(5)).players_today).toBe(5);
    expect(await rows(db, `select solve_rank from public.dle_plays where status = 'won' and solve_rank is not null order by solve_rank`)).toEqual([{ solve_rank: 2 }, { solve_rank: 3 }, { solve_rank: 4 }]);
    expect(await one<number>(db, `select wins from public.dle_daily_stats where game_id = '${GAME}' and play_date = $1::date`, [TODAY])).toBe(4);
  });

  it('the Verify lines of the header hold', async () => {
    await verify(UP);
  });

  it('a second run changes nothing', async () => {
    const first = await snapshot();
    await db.exec(read(UP));
    expect(await snapshot()).toBe(first);
  });

  it('the rollback puts the functions of 019 back, drops the column, keeps every play and count; its Verify lines hold; a second run changes nothing', async () => {
    const plays = await one<number>(db, 'select count(*)::int from public.dle_plays');
    await db.exec(read(DOWN));
    expect(await one<string>(db, `select prosrc from pg_proc where proname = 'dle_day_at'`)).toBe(src019);
    expect(await one<number>(db, 'select count(*)::int from public.dle_plays')).toBe(plays);
    expect(await one<number>(db, `select wins from public.dle_daily_stats where game_id = '${GAME}' and play_date = $1::date`, [TODAY])).toBe(4);
    await verify(DOWN);
    const d = await day(2);
    expect(d.players_today).toBeUndefined();
    expect(d.play!.solve_rank).toBeUndefined();
    const s = await snapshot();
    await db.exec(read(DOWN));
    expect(await snapshot()).toBe(s);
    // and the file can be applied again after the undo
    await db.exec(read(UP));
    expect((await day(2)).players_today).toBe(5);
  });
});

describe('the files', () => {
  it.each([[UP, 'o1l40'], [DOWN, 'o1l40r']])('%s is one DO block with no temp table, no bare UPDATE or DELETE and no dash', (file, tag) => {
    const sql = read(file);
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    for (const stmt of sql.split(';')) {
      const s = stmt.replace(/--.*$/gm, '');
      if (/\bupdate\s+public\./i.test(s) && /\bset\b/i.test(s)) expect(s, 'UPDATE with a WHERE').toMatch(/\bwhere\b/i);
      if (/\bdelete\s+from\b/i.test(s)) expect(s).toMatch(/\bwhere\b/i);
    }
    expect(sql).not.toMatch(/[–—…]/);
    for (const k of ['What', 'Why', 'Rows', 'WHEN']) expect(sql).toMatch(new RegExp(`^-- ${k}:`, 'm'));
    if (file === UP) expect(sql).toMatch(/^-- Undo:/m);
  });
});
