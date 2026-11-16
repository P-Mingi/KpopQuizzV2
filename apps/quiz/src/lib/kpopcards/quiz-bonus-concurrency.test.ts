// KpopCards: the quiz of the day's pack on a REAL Postgres (PGlite is a single connection and cannot show a race). A throwaway cluster is started with
// initdb and pg_ctl from the machine's Postgres, 001, 002 and 115 are applied with psql, and cards_bonus_record is fired from several psql processes at
// once for one account: one row a Paris day whatever the number of calls and of quizzes of the day finished in it. Skipped, loudly, without a Postgres binary.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 900_000, hookTimeout: 900_000 });

import { BASE, CARDS_SQL } from '../cards/sql-harness';

const BIN = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@14/bin', '/opt/homebrew/bin']
  .find((d) => existsSync(path.join(d, 'initdb')) && existsSync(path.join(d, 'pg_ctl')) && existsSync(path.join(d, 'psql')));

const run = BIN ? describe : describe.skip;
if (!BIN) console.warn('QUIZ BONUS CONCURRENCY TEST SKIPPED: no Postgres binary (initdb, pg_ctl, psql) found on this machine');

let dir = '';
const PORT = 59000 + Math.floor(Math.random() * 3000);
const bin = (n: string): string => path.join(BIN!, n);
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PATH: `${BIN ?? ''}:${process.env.PATH ?? ''}` };

function psql(sql: string): Promise<{ out: string; err: string; code: number }> {
  return new Promise((resolve) => {
    execFile(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env }, (e, out, err) => {
      resolve({ out: out.trim(), err: err.trim(), code: e ? ((e as { code?: number }).code ?? 1) : 0 });
    });
  });
}
const psqlSync = (args: string[], input?: string): string =>
  execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], { env, input, encoding: 'utf8' });

const uuid = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const NOW = '2026-11-12T12:00:00Z';
const record = (u: string): Promise<{ out: string; err: string; code: number }> => psql(`select public.cards_bonus_record('${u}', '${NOW}')`);

run('the quiz of the day pack in parallel on one account, on a real Postgres', () => {
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.homedir(), '.kc-pg-'));
    execFileSync(bin('initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '-A', 'trust', '-E', 'UTF8'], { env, stdio: 'ignore' });
    execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses= -c fsync=off -c max_connections=60`, '-l', path.join(dir, 'pg.log'), '-w', 'start'], { env, stdio: 'ignore' });
    execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', 'kc'], { env });
    psqlSync(['-d', 'kc'], BASE);
    for (const f of ['001-schema.sql', '002-functions.sql', '003-rls.sql', '115-quiz-of-day-bonus.sql']) psqlSync(['-d', 'kc'], readFileSync(path.join(CARDS_SQL, f), 'utf8'));
  });
  afterAll(() => {
    if (!dir) return;
    try { execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop'], { env, stdio: 'ignore' }); } catch { /* already stopped */ }
    rmSync(dir, { recursive: true, force: true });
  });

  it('12 calls at once with 3 different quizzes of the day finished in one Paris day: one row, the same count to all', async () => {
    const u = uuid(1);
    await psql(`insert into auth.users values ('${u}')`);
    // the quizzes of the UTC dates 11, 12 (and 13 would be tomorrow): 00:30 Paris on the 12th is still the quiz of the 11th
    await psql(`insert into public.quizzes (id, is_quiz_of_the_day, quiz_of_the_day_date) values ('${uuid(11)}', true, '2026-11-11'), ('${uuid(12)}', true, '2026-11-12'), ('${uuid(13)}', true, '2026-11-12')`);
    await psql(`insert into public.plays (quiz_id, player_id, created_at) values ('${uuid(11)}', '${u}', '2026-11-11T23:30:00Z'), ('${uuid(12)}', '${u}', '2026-11-12T08:00:00Z'), ('${uuid(13)}', '${u}', '2026-11-12T09:00:00Z')`);
    const rs = await Promise.all(Array.from({ length: 12 }, () => record(u)));
    // a parallel call may lose the race on the unique index: it must then be a plain unique violation never seen here, because on conflict do nothing absorbs it
    expect(rs.map((r) => r.code)).toEqual(Array(12).fill(0));
    expect(rs.map((r) => r.out)).toEqual(Array(12).fill('1'));
    expect((await psql(`select count(*) from public.cards_bonus_earned where user_id = '${u}'`)).out).toBe('1');
    expect((await psql(`select source from public.cards_bonus_earned where user_id = '${u}'`)).out).toBe('quiz_of_day');
  });

  it('parallel calls with Kpopdle wins and the quiz: 3 wins and the quiz are 4 rows, 3 openable (the cap does not move)', async () => {
    const u = uuid(2);
    await psql(`insert into auth.users values ('${u}')`);
    await psql(`insert into public.quizzes (id, is_quiz_of_the_day, quiz_of_the_day_date) values ('${uuid(21)}', true, '2026-11-12')`);
    await psql(`insert into public.plays (quiz_id, player_id, created_at) values ('${uuid(21)}', '${u}', '2026-11-12T08:00:00Z')`);
    for (let i = 0; i < 3; i++) await psql(`insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ('kpopdle-idol', '2026-11-1${i}', '${u}', 'won', '2026-11-12T0${6 + i}:00:00Z')`);
    const rs = await Promise.all(Array.from({ length: 10 }, () => record(u)));
    expect(rs.map((r) => r.code)).toEqual(Array(10).fill(0));
    expect((await psql(`select count(*) from public.cards_bonus_earned where user_id = '${u}'`)).out).toBe('4');
    expect((await psql(`select count(*) from public.cards_bonus_earned where user_id = '${u}' and source = 'quiz_of_day'`)).out).toBe('1');
    expect((await psql(`select (public.cards_wallet('${u}', '${NOW}', 10, 3)) ->> 'bonus_left'`)).out).toBe('3');
  });
});
