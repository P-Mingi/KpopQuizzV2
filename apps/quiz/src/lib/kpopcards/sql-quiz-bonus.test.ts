// KpopCards: the proofs of 115 (the quiz of the day gives one pack, counted inside the bonus cap) on PGlite. The database decides: one row a Paris
// day for a signed-in player who finished the quiz that was the quiz of the day, never twice, never outside the cap shared with the Kpopdle wins.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 900_000, hookTimeout: 900_000 });

import { CARDS_SQL, readCardsSql } from '../cards/sql-harness';
import { PLAIN, T0, coreDb, failure, newUser, one, openSql, rows, tryOpen, wallet } from './sql-fixture';

import type { PGlite } from '@electric-sql/pglite';

async function quizDb(): Promise<PGlite> {
  const db = await coreDb();
  await db.exec(readCardsSql('115-quiz-of-day-bonus.sql'));
  return db;
}
// One database for the tests that only read and write rows of their own players (building one costs seconds; every test uses its own users and quizzes).
let shared: Promise<PGlite> | null = null;
const sharedDb = (): Promise<PGlite> => (shared ??= quizDb());

let seq = 0;
/** A published quiz that was the quiz of the day on `date` (null: an ordinary quiz). */
async function quiz(db: PGlite, date: string | null, o: { site?: string; status?: string } = {}): Promise<string> {
  const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  await db.query('insert into public.quizzes (id, site_id, status, is_quiz_of_the_day, quiz_of_the_day_date) values ($1, $2, $3, $4, $5)',
    [id, o.site ?? 'kpop', o.status ?? 'published', date !== null, date]);
  return id;
}
/** The play row record_play writes when a run is finished. */
const play = (db: PGlite, user: string | null, quizId: string, at: string, total = 10): Promise<unknown> =>
  db.query('insert into public.plays (quiz_id, player_id, total_questions, created_at) values ($1, $2, $3, $4::timestamptz)', [quizId, user, total, at]);
const record = (db: PGlite, u: string, at = T0): Promise<number> => one<number>(db, 'select public.cards_bonus_record($1::uuid, $2::timestamptz)', [u, at]);
const earned = (db: PGlite, u: string): Promise<Array<{ paris_day: string; source: string; play_ref: string }>> =>
  rows(db, 'select paris_day::text, source, play_ref from public.cards_bonus_earned where user_id = $1 order by id', [u]);
const win = (db: PGlite, u: string, playDate: string, finished: string): Promise<unknown> =>
  db.query(`insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ('kpopdle-idol', $1, $2, 'won', $3)`, [playDate, u, finished]);

describe('115 is one DO block, with its rollback', () => {
  it.each([['115-quiz-of-day-bonus.sql', 'c115'], ['115-quiz-of-day-bonus.rollback.sql', 'c115r']])('%s', (file, tag) => {
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
  it('the header states the accepted risk of a score the browser reports', () => {
    const sql = readFileSync(path.join(CARDS_SQL, '115-quiz-of-day-bonus.sql'), 'utf8');
    expect(sql).toMatch(/ACCEPTED BY THE INTEGRATOR/);
    expect(sql).toMatch(/score the browser reports/);
  });
});

describe('115: the quiz of the day gives one pack a Paris day', () => {
  it('finishing the quiz of the day earns one row; it opens once as a bonus pack and leaves the stack alone', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const q = await quiz(db, '2026-11-12');
    expect(await record(db, u)).toBe(0);
    await play(db, u, q, '2026-11-12T09:00:00Z');
    expect(await record(db, u)).toBe(1);
    expect(await earned(db, u)).toEqual([{ paris_day: '2026-11-12', source: 'quiz_of_day', play_ref: `quiz_of_day:2026-11-12:${u}` }]);
    expect((await wallet(db, u)).bonus_left).toBe(1);
    const r = await openSql(db, u, { source: 'bonus', draws: [PLAIN] });
    expect(r.packs[0]).toMatchObject({ source: 'bonus', theme: 'all' });
    expect(await one(db, `select source from public.cards_packs where user_id = $1`, [u])).toBe('bonus');
    expect((await wallet(db, u)).stock).toBe(10);
    expect((await wallet(db, u)).bonus_left).toBe(0);
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN] })).toMatch(/cards: bonus/);
  });
  it('is idempotent: any number of calls and replays leave one row', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const q = await quiz(db, '2026-11-12');
    await play(db, u, q, '2026-11-12T08:00:00Z');
    await play(db, u, q, '2026-11-12T08:30:00Z');
    for (const at of [T0, '2026-11-12T10:00:01Z', '2026-11-12T20:00:00Z']) expect(await record(db, u, at)).toBe(1);
    await play(db, u, q, '2026-11-12T11:00:00Z'); // a replay of the same quiz
    expect(await record(db, u, '2026-11-12T12:00:00Z')).toBe(1);
    expect(Number(await one(db, `select count(*) from public.cards_bonus_earned where source = 'quiz_of_day' and user_id = $1`, [u]))).toBe(1);
    // the sync twin of the lobby read gives the same count and tells the quiz is one of them
    expect(await one(db, `select public.cards_bonus_sync($1::uuid, $2::timestamptz)`, [u, T0])).toEqual({ earned: 1, quiz: true });
    expect(Number(await one(db, `select count(*) from public.cards_bonus_earned where user_id = $1`, [u]))).toBe(1);
  });
  it('is one a Paris day even when two different quizzes of the day are finished in it (the UTC date lags Paris midnight)', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const a = await quiz(db, '2026-11-11'); // still the quiz of the day at 00:30 Paris on the 12th (23:30 UTC on the 11th)
    const b = await quiz(db, '2026-11-12');
    await play(db, u, a, '2026-11-11T23:30:00Z');
    await play(db, u, b, '2026-11-12T08:00:00Z');
    expect(await record(db, u)).toBe(1);
    expect(await earned(db, u)).toEqual([{ paris_day: '2026-11-12', source: 'quiz_of_day', play_ref: `quiz_of_day:2026-11-11:${u}` }]);
  });
  it('the next Paris day gives the next quiz of the day a pack, but never the same quiz twice', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const a = await quiz(db, '2026-11-12');
    const b = await quiz(db, '2026-11-13');
    await play(db, u, a, '2026-11-12T22:30:00Z'); // 23:30 Paris on the 12th
    expect(await record(db, u, '2026-11-12T22:45:00Z')).toBe(1);
    await play(db, u, a, '2026-11-12T23:30:00Z'); // 00:30 Paris on the 13th: the same quiz, replayed
    expect(await record(db, u, '2026-11-13T09:00:00Z')).toBe(0);
    await play(db, u, b, '2026-11-13T09:30:00Z');
    expect(await record(db, u, '2026-11-13T10:00:00Z')).toBe(1);
    expect((await earned(db, u)).map((r) => [r.paris_day, r.play_ref.slice(0, 23)])).toEqual([['2026-11-12', 'quiz_of_day:2026-11-12:'], ['2026-11-13', 'quiz_of_day:2026-11-13:']]);
  });
  it('the cap is shared with Kpopdle: 3 wins and the quiz are 4 earned and still 3 openable', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    for (const [i, at] of ['2026-11-12T08:00:00Z', '2026-11-12T08:30:00Z', '2026-11-12T09:00:00Z'].entries()) await win(db, u, `2026-11-${10 + i}`, at);
    const q = await quiz(db, '2026-11-12');
    await play(db, u, q, '2026-11-12T09:40:00Z');
    expect(await record(db, u)).toBe(4);
    expect(await one(db, `select count(*)::int from public.cards_bonus_earned where user_id = $1`, [u])).toBe(4);
    expect((await wallet(db, u)).bonus_left).toBe(3);
    for (let i = 0; i < 3; i++) await openSql(db, u, { source: 'bonus', draws: [PLAIN], at: `2026-11-12T10:0${i}:00Z` });
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN], at: '2026-11-12T10:05:00Z' })).toMatch(/cards: bonus/);
    expect(await one(db, `select count(*)::int from public.cards_packs where user_id = $1 and source = 'bonus'`, [u])).toBe(3);
    // the quiz alone with a cap of 0 opens nothing: the cap does not move
    const v = await newUser(db);
    await play(db, v, q, '2026-11-12T09:40:00Z');
    await record(db, v);
    expect(await tryOpen(db, v, { source: 'bonus', draws: [PLAIN], bonusCap: 0 })).toMatch(/cards: bonus/);
  });
  it('a guest, another player, an ordinary quiz, another day of the quiz, a hidden or foreign-site quiz and an empty play give nothing', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const other = await newUser(db);
    const qotd = await quiz(db, '2026-11-12');
    const ordinary = await quiz(db, null);
    const yesterdays = await quiz(db, '2026-11-11'); // a replay of an older quiz of the day
    const draft = await quiz(db, '2026-11-12', { status: 'draft' });
    const anime = await quiz(db, '2026-11-12', { site: 'anime' });
    await play(db, null, qotd, '2026-11-12T08:00:00Z'); // a guest: no player
    await play(db, other, qotd, '2026-11-12T08:00:00Z'); // another player
    await play(db, u, ordinary, '2026-11-12T08:00:00Z');
    await play(db, u, yesterdays, '2026-11-12T08:00:00Z');
    await play(db, u, draft, '2026-11-12T08:00:00Z');
    await play(db, u, anime, '2026-11-12T08:00:00Z');
    await play(db, u, qotd, '2026-11-12T08:00:00Z', 0);
    await play(db, u, qotd, '2026-11-12T10:30:00Z'); // finished after p_now
    await play(db, u, qotd, '2026-11-11T09:00:00Z'); // finished the day before
    expect(await record(db, u)).toBe(0);
    expect((await wallet(db, u)).bonus_left).toBe(0);
    expect(await failure(db, `select public.cards_bonus_record(null, '${T0}')`)).toMatch(/cards: user/);
    expect(await record(db, other)).toBe(1); // only the player who finished it
    expect(Number(await one(db, `select count(*) from public.cards_bonus_earned where user_id = any ($1::uuid[])`, [[u, other]]))).toBe(1);
    // the same play seen from p_now after it was finished counts for the right player only
    expect(await record(db, u, '2026-11-12T11:00:00Z')).toBe(1);
  });
  it('a play counts for the Paris day it was finished in, to the second, at midnight', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const q = await quiz(db, '2026-11-12');
    await play(db, u, q, '2026-11-12T22:59:59Z'); // 23:59:59 Paris on the 12th
    expect(await record(db, u, '2026-11-12T22:59:59Z')).toBe(1);
    expect((await earned(db, u))[0]!.paris_day).toBe('2026-11-12');
    const v = await newUser(db);
    await play(db, v, q, '2026-11-12T23:00:00Z'); // 00:00:00 Paris on the 13th
    expect(await record(db, v, '2026-11-12T22:59:59Z')).toBe(0);
    expect(await record(db, v, '2026-11-12T23:00:00Z')).toBe(1);
    expect((await earned(db, v))[0]!.paris_day).toBe('2026-11-13');
  });
  it('around the clock change of 2026-03-29 (the Paris day is 23 hours long)', async () => {
    const db = await sharedDb();
    const q28 = await quiz(db, '2026-03-28');
    const q29 = await quiz(db, '2026-03-29');
    const a = await newUser(db);
    await play(db, a, q28, '2026-03-28T22:59:59Z'); // 23:59:59 Paris on the 28th (UTC+1)
    expect(await record(db, a, '2026-03-28T23:00:00Z')).toBe(0); // p_now is already the 29th Paris: the play belongs to the 28th
    expect(await record(db, a, '2026-03-28T22:59:59Z')).toBe(1);
    expect((await earned(db, a))[0]!.paris_day).toBe('2026-03-28');
    const b = await newUser(db);
    await play(db, b, q28, '2026-03-28T23:00:00Z'); // 00:00 Paris on the 29th, quiz of the day of the 28th UTC
    expect(await record(db, b, '2026-03-29T10:00:00Z')).toBe(1);
    expect((await earned(db, b))[0]!.paris_day).toBe('2026-03-29');
    const c = await newUser(db);
    await play(db, c, q29, '2026-03-29T21:59:59Z'); // 23:59:59 Paris on the 29th (UTC+2)
    expect(await record(db, c, '2026-03-29T21:59:59Z')).toBe(1);
    expect((await earned(db, c))[0]!.paris_day).toBe('2026-03-29');
    const d = await newUser(db);
    await play(db, d, q29, '2026-03-29T22:00:00Z'); // 00:00 Paris on the 30th
    expect(await record(db, d, '2026-03-29T21:59:59Z')).toBe(0);
    expect(await record(db, d, '2026-03-29T22:00:00Z')).toBe(1);
    expect((await earned(db, d))[0]!.paris_day).toBe('2026-03-30');
  });
  it('around the clock change of 2026-10-25 (the Paris day is 25 hours long)', async () => {
    const db = await sharedDb();
    const q24 = await quiz(db, '2026-10-24');
    const q25 = await quiz(db, '2026-10-25');
    const a = await newUser(db);
    await play(db, a, q24, '2026-10-24T22:00:00Z'); // 00:00 Paris on the 25th (UTC+2)
    expect(await record(db, a, '2026-10-24T21:59:59Z')).toBe(0);
    expect(await record(db, a, '2026-10-24T22:00:00Z')).toBe(1);
    expect((await earned(db, a))[0]!.paris_day).toBe('2026-10-25');
    const b = await newUser(db);
    await play(db, b, q25, '2026-10-25T22:59:59Z'); // 23:59:59 Paris on the 25th (UTC+1, after the change)
    expect(await record(db, b, '2026-10-25T22:59:59Z')).toBe(1);
    expect((await earned(db, b))[0]!.paris_day).toBe('2026-10-25');
    const c = await newUser(db);
    await play(db, c, q25, '2026-10-25T23:00:00Z'); // 00:00 Paris on the 26th
    expect(await record(db, c, '2026-10-25T22:59:59Z')).toBe(0);
    expect(await record(db, c, '2026-10-25T23:00:00Z')).toBe(1);
    expect((await earned(db, c))[0]!.paris_day).toBe('2026-10-26');
    // the 25-hour day holds one row, whenever in it the plays were finished
    const d = await newUser(db);
    await play(db, d, q24, '2026-10-24T22:30:00Z');
    await play(db, d, q25, '2026-10-25T22:30:00Z');
    expect(await record(db, d, '2026-10-25T22:45:00Z')).toBe(1);
  });
});

describe('115: the table, the grants and the files', () => {
  it('the source check lists the new source and the index refuses a second row a Paris day, even under another key', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    const ins = (src: string, ref: string): Promise<string | null> =>
      failure(db, `insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref) values ($1, '2026-11-12', $2, $3)`, [u, src, ref]);
    expect(await ins('quiz_of_day', `a:${u}`)).toBeNull();
    expect(await ins('quiz_of_day', `b:${u}`)).toMatch(/cards_bonus_earned_quiz_day_key/);
    expect(await ins('kpopdle', `k1:${u}`)).toBeNull();
    expect(await ins('kpopdle', `k2:${u}`)).toBeNull(); // the Kpopdle rows are not limited by the index
    expect(await ins('other', `x:${u}`)).toMatch(/cards_bonus_earned_source_check/);
  });
  it('the functions are security definer with a fixed search_path, for service_role only', async () => {
    const db = await sharedDb();
    const r = await rows<{ proname: string; prosecdef: boolean; cfg: string[]; anon: boolean; authed: boolean; service: boolean }>(db,
      `select p.proname, p.prosecdef, p.proconfig as cfg, has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as authed, has_function_privilege('service_role', p.oid, 'execute') as service
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_bonus_record', 'cards_bonus_sync') order by 1`);
    expect(r).toEqual([
      { proname: 'cards_bonus_record', prosecdef: true, cfg: ['search_path=public'], anon: false, authed: false, service: true },
      { proname: 'cards_bonus_sync', prosecdef: true, cfg: ['search_path=public'], anon: false, authed: false, service: true }]);
  });
  it('the Verify lines of the file answer as written', async () => {
    const db = await sharedDb();
    const u = await newUser(db);
    expect(String(await one(db, `select pg_get_constraintdef(oid) from pg_constraint where conname = 'cards_bonus_earned_source_check' and conrelid = 'public.cards_bonus_earned'::regclass`)))
      .toMatch(/'quiz'.*'kpopdle'.*'quiz_of_day'/);
    expect(Number(await one(db, `select count(*) from pg_indexes where schemaname = 'public' and indexname = 'cards_bonus_earned_quiz_day_key'`))).toBe(1);
    expect(Number(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_bonus_record', 'cards_bonus_sync')`))).toBe(2);
    expect(await one(db, `select (public.cards_bonus_sync($1::uuid, '2026-11-12 10:00+00')) ->> 'quiz'`, [u])).toBe('false');
  });
  it('a second run changes nothing, and the rollback puts 002 back: the quiz earns nothing and its rows are gone', async () => {
    const db = await quizDb();
    const u = await newUser(db);
    const q = await quiz(db, '2026-11-12');
    await play(db, u, q, '2026-11-12T09:00:00Z');
    await win(db, u, '2026-11-12', '2026-11-12T09:30:00Z');
    expect(await record(db, u)).toBe(2);
    await db.exec(readCardsSql('115-quiz-of-day-bonus.sql'));
    expect(await record(db, u)).toBe(2);
    await db.exec(readCardsSql('115-quiz-of-day-bonus.rollback.sql'));
    await db.exec(readCardsSql('115-quiz-of-day-bonus.rollback.sql'));
    expect(await one(db, `select count(*)::int from public.cards_bonus_earned where user_id = $1`, [u])).toBe(1);
    expect(await record(db, u)).toBe(1);
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_bonus_sync'`)).toBe(0);
    expect(await failure(db, `insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref) values ($1, '2026-11-12', 'quiz_of_day', 'x')`, [u])).toMatch(/source_check/);
    await db.exec(readCardsSql('115-quiz-of-day-bonus.sql'));
    expect(await record(db, u)).toBe(2);
  });
  it('a database whose quizzes have no site_id column, or without the play tables, still records what it can', async () => {
    const db = await quizDb();
    const u = await newUser(db);
    const q = await quiz(db, '2026-11-12');
    await play(db, u, q, '2026-11-12T09:00:00Z');
    await db.exec('alter table public.quizzes drop column site_id');
    expect(await record(db, u)).toBe(1);
    const v = await newUser(db);
    await win(db, v, '2026-11-12', '2026-11-12T09:30:00Z');
    await db.exec('drop table public.plays');
    expect(await record(db, v)).toBe(1);
  });
});
