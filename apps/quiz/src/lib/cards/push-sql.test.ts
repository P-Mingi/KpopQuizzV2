// Bunnyverse Cards, lot 4: 108-push.sql on PGlite (the real files 001 to 003, then 108): the one-DO-block pin, RLS and grants, the upsert, and the
// pick-and-mark rules (full stack that became full, quiet hours, once a day, once a cycle, never twice).
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { CARDS_SQL, SCHEMA_FILES, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const E = (n: number): string => `https://fcm.googleapis.com/fcm/send/${n}`;
const iso = (ms: number): string => new Date(ms).toISOString();
const NOON = Date.parse('2026-11-13T11:00:00Z'); // Paris 12:00

describe('108 files are one DO block', () => {
  it.each([['108-push.sql', 'c108'], ['108-push.rollback.sql', 'c108r']])('%s', (file, tag) => {
    const sql = readFileSync(path.join(CARDS_SQL, file), 'utf8');
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(sql).toMatch(/^-- Undo: /m);
    expect(sql).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });
});

let db: PGlite;
const setWallet = (u: string, stock: number, anchor: number, day = '2026-11-13'): Promise<unknown> =>
  db.query(
    `insert into public.cards_wallets (user_id, stock, anchor, paris_day) values ($1, $2, $3::timestamptz, $4::date)
     on conflict (user_id) do update set stock = excluded.stock, anchor = excluded.anchor, paris_day = excluded.paris_day`,
    [u, stock, iso(anchor), day]);
const sub = (u: string, n: number, now: number): Promise<unknown> => db.query('select public.cards_push_upsert($1, $2, $3, $4, $5::timestamptz)', [u, E(n), 'p', 'a', iso(now)]);
const pick = (now: number, limit = 100): Promise<Array<{ id: string; user_id: string; endpoint: string }>> =>
  rows(db, 'select * from public.cards_push_pick($1::timestamptz, $2)', [iso(now), limit]);

beforeEach(async () => {
  db = await freshCardsDb([...SCHEMA_FILES, '108-push.sql']);
  await db.exec(`insert into auth.users values ('${U1}'), ('${U2}');`);
});

describe('the table', () => {
  it('RLS on, no policy, no browser grant on the table or the functions, the service role may run them', async () => {
    expect(await one(db, "select relrowsecurity from pg_class where oid = 'public.cards_push_subs'::regclass")).toBe(true);
    expect(Number(await one(db, "select count(*) from pg_policies where tablename = 'cards_push_subs'"))).toBe(0);
    expect(Number(await one(db, "select count(*) from information_schema.role_table_grants where table_name = 'cards_push_subs' and grantee in ('anon', 'authenticated')"))).toBe(0);
    expect(Number(await one(db, "select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_push\\_%'"))).toBe(5);
    expect(await one(db, "select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_push\\_%'")).toBe(false);
    expect(await one(db, "select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_push\\_%'")).toBe(true);
  });

  it('it is idempotent and the rollback removes everything and is idempotent too', async () => {
    await db.exec(readCardsSql('108-push.sql'));
    await sub(U1, 1, NOON);
    await db.exec(readCardsSql('108-push.sql'));
    expect(Number(await one(db, 'select count(*) from public.cards_push_subs'))).toBe(1);
    await db.exec(readCardsSql('108-push.rollback.sql'));
    await db.exec(readCardsSql('108-push.rollback.sql'));
    expect(Number(await one(db, "select count(*) from pg_proc where proname like 'cards\\_push\\_%'"))).toBe(0);
    expect(await one(db, "select to_regclass('public.cards_push_subs')")).toBeNull();
  });

  it('upsert: the endpoint is the key, a bad endpoint is refused, at most 5 a player, delete and drop', async () => {
    await sub(U1, 1, NOON);
    await sub(U1, 1, NOON + 1000);
    expect(Number(await one(db, 'select count(*) from public.cards_push_subs'))).toBe(1);
    expect(await failure(db, "select public.cards_push_upsert($1, 'http://x.example/a', null, null)", [U1])).toMatch(/cards: push_endpoint/);
    for (let n = 2; n <= 7; n++) await sub(U1, n, NOON + n * 1000);
    expect(Number(await one(db, 'select count(*) from public.cards_push_subs where user_id = $1', [U1]))).toBe(5);
    expect(await one(db, 'select count(*) = 0 from public.cards_push_subs where endpoint = $1', [E(1)])).toBe(true);
    expect(await one(db, 'select public.cards_push_delete($1, $2)', [U2, E(7)])).toBe(false); // not his
    expect(await one(db, 'select public.cards_push_delete($1, $2)', [U1, E(7)])).toBe(true);
    expect(await one(db, 'select public.cards_push_drop($1)', [E(6)])).toBe(true);
    expect(await one(db, 'select public.cards_push_drop($1)', [E(6)])).toBe(false);
  });
});

describe('cards_push_pick', () => {
  const SPENT = NOON - 3 * 3600 * 1000; // a pack was opened 3 hours ago: the stack refilled since (10 min a pack)

  it('a stack that became full is picked once and marked; a second run gets nothing', async () => {
    await setWallet(U1, 4, SPENT);
    await sub(U1, 1, SPENT); // subscribed while the stack was below 5
    const first = await pick(NOON);
    expect(first.map((r) => r.endpoint)).toEqual([E(1)]);
    expect(first[0]!.user_id).toBe(U1);
    expect(await pick(NOON)).toEqual([]);
    expect(await pick(NOON + 60_000)).toEqual([]);
    expect(String(await one(db, 'select last_sent_day::text from public.cards_push_subs'))).toMatch(/2026-11-13/);
  });

  it('not while the stack is still filling, and never for a player without a wallet row', async () => {
    await setWallet(U1, 2, NOON - 5 * 60_000); // 2 packs, 5 minutes ago: 2 now
    await sub(U1, 1, NOON - 600_000);
    await sub(U2, 2, NOON - 600_000); // no wallet row (never opened a pack)
    expect(await pick(NOON)).toEqual([]);
  });

  it('a stack that is full at subscription time is told nothing until a pack is opened (the anchor moves)', async () => {
    await setWallet(U1, 4, SPENT);
    await sub(U1, 1, NOON); // full at subscription: starts notified for this cycle
    expect(await pick(NOON)).toEqual([]);
    await setWallet(U1, 4, NOON + 1000); // a pack opened: new anchor
    expect((await pick(NOON + 3600_000)).length).toBe(1);
  });

  it('never between 22:00 and 08:00 Paris; the reminder goes at 08:00', async () => {
    const night = Date.parse('2026-11-13T22:30:00Z'); // 23:30 Paris
    await setWallet(U1, 4, night - 3 * 3600_000, '2026-11-13');
    await sub(U1, 1, night - 3 * 3600_000);
    expect(await pick(night)).toEqual([]);
    expect(await pick(Date.parse('2026-11-14T06:59:00Z'))).toEqual([]); // 07:59
    expect((await pick(Date.parse('2026-11-14T07:00:00Z'))).length).toBe(1); // 08:00
  });

  it('at most one a Paris day for a player, even with two browsers, and one the next day for a new cycle', async () => {
    await setWallet(U1, 4, SPENT);
    await sub(U1, 1, SPENT);
    await sub(U1, 2, SPENT);
    expect((await pick(NOON)).length).toBe(2); // both devices of the one notification
    await setWallet(U1, 3, NOON + 1000); // opens a pack, refills in 20 minutes
    expect(await pick(NOON + 3600_000)).toEqual([]); // told today already
    await setWallet(U1, 3, NOON + 2000);
    const tomorrow = Date.parse('2026-11-14T11:00:00Z');
    expect((await pick(tomorrow)).length).toBe(2);
  });

  it('a stack that stays full is told once, not every day', async () => {
    await setWallet(U1, 4, SPENT);
    await sub(U1, 1, SPENT);
    expect((await pick(NOON)).length).toBe(1);
    expect(await pick(Date.parse('2026-11-14T11:00:00Z'))).toEqual([]);
    expect(await pick(Date.parse('2026-11-15T11:00:00Z'))).toEqual([]);
  });

  it('the Paris midnight top-up counts as becoming full, told from 08:00', async () => {
    const lateEvening = Date.parse('2026-11-13T20:00:00Z'); // 21:00 Paris
    await setWallet(U1, 1, lateEvening, '2026-11-13'); // 1 pack, refill under way
    await sub(U1, 1, lateEvening - 1000);
    expect(await pick(Date.parse('2026-11-14T06:00:00Z'))).toEqual([]); // quiet
    expect((await pick(Date.parse('2026-11-14T07:30:00Z'))).length).toBe(1);
  });

  it('rows that failed 5 times in a row are left alone, a success resets the count, the batch limit holds', async () => {
    await setWallet(U1, 4, SPENT);
    await setWallet(U2, 4, SPENT);
    await sub(U1, 1, SPENT);
    await sub(U2, 2, SPENT);
    const id1 = String(await one(db, 'select id from public.cards_push_subs where endpoint = $1', [E(1)]));
    for (let i = 0; i < 5; i++) await db.query('select public.cards_push_result($1, false)', [id1]);
    expect((await pick(NOON, 1)).map((r) => r.endpoint)).toEqual([E(2)]);
    await db.query('select public.cards_push_result($1, true)', [id1]);
    expect(Number(await one(db, 'select failures from public.cards_push_subs where id = $1', [id1]))).toBe(0);
    expect((await pick(NOON, 1)).map((r) => r.endpoint)).toEqual([E(1)]);
  });
});
