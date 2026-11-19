// KpopCards launch prep: proof of docs/pending-migrations/cards/121-ad-packs.sql (cards_ad_pack_grant) on PGlite, on the state production will have
// (bundle 099 to 115, 116, 117, 118, then 120). One pack per ad event (the transaction id), the user taken from the ticket, the ticket spent once, the daily
// cap per user per Paris day, the stack not capped by the grant, a second run changes nothing, the rollback is refused while events exist.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { newUser, setWallet } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, failure, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const UP = '121-ad-packs.sql';
const DOWN = '121-ad-packs.rollback.sql';
const T0 = '2026-11-20T10:00:00Z'; // Paris 11:00

async function world() {
  const db = await prodDb();
  await run(db, build([]).sql);
  await run(db, rd('120-cap-7.sql'));
  await run(db, rd(UP));
  return db;
}
/** A ticket the way cards_issue_ticket makes one (a row of cards_ad_tickets), issued at `at`. */
async function ticket(db: Awaited<ReturnType<typeof prodDb>>, u: string, at = '2026-11-20T09:55:00Z'): Promise<string> {
  return one<string>(db, 'insert into cards_ad_tickets (user_id, issued_at) values ($1, $2) returning id', [u, at]);
}
const call = async (db: Awaited<ReturnType<typeof prodDb>>, t: string, tx: string, at = T0, cap = 3): Promise<Record<string, unknown>> =>
  JSON.parse(JSON.stringify(await one(db, 'select public.cards_ad_pack_grant($1::uuid, $2, $3, $4::timestamptz, $5, 40)', [t, tx, '/1234/rewarded-pack', at, cap])));
const stock = (db: Awaited<ReturnType<typeof prodDb>>, u: string): Promise<number> => one<number>(db, 'select stock from cards_wallets where user_id = $1', [u]);

describe('121-ad-packs.sql: the files', () => {
  it.each([[UP, 'c121'], [DOWN, 'c121r']])('%s is one DO block with its header and no dash', (file, tag) => {
    const sql = readFileSync(path.join(CARDS_SQL, file), 'utf8');
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: /m);
    for (const k of ['What:', 'Why:', 'Rows:']) expect(sql).toContain(`-- ${k}`);
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
  });
});

describe('cards_ad_pack_grant', () => {
  it('gives +1 pack to the owner of the ticket, once per transaction id, and the ticket is spent', async () => {
    const db = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 3, anchor: T0 });
    const t = await ticket(db, u);
    const r = await call(db, t, 'tx-1');
    expect(r).toMatchObject({ granted: true, replayed: false, user_id: u, stock: 4, ads_today: 1 });
    expect(await stock(db, u)).toBe(4);
    expect(await one(db, 'select used_at is not null from cards_ad_tickets where id = $1', [t])).toBe(true);
    // the network retries the same callback: the stored answer, nothing more
    expect(await call(db, t, 'tx-1')).toMatchObject({ granted: false, replayed: true, was_granted: true });
    expect(await stock(db, u)).toBe(4);
    // a second event on the same, spent ticket gives nothing (refused)
    expect(await failure(db, 'select public.cards_ad_pack_grant($1::uuid, $2, $3, $4::timestamptz, 3, 40)', [t, 'tx-2', 'u', T0])).toMatch(/cards: ticket/);
    expect(await stock(db, u)).toBe(4);
    expect(await one(db, 'select count(*) from cards_ad_events')).toBe(1);
  });
  it('the cap per user per Paris day: past it the event is recorded and gives nothing, and the next Paris day gives again', async () => {
    const db = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, anchor: '2026-11-20T09:00:00Z', timer: 40 });
    for (let i = 1; i <= 3; i++) expect(await call(db, await ticket(db, u), `tx-${i}`, T0, 3), `ad ${i}`).toMatchObject({ granted: true, ads_today: i });
    expect(await stock(db, u)).toBe(3);
    const t4 = await ticket(db, u);
    expect(await call(db, t4, 'tx-4', T0, 3)).toMatchObject({ granted: false, reason: 'daily_cap', ads_today: 3 });
    expect(await stock(db, u)).toBe(3);
    expect(await call(db, t4, 'tx-4', T0, 3)).toMatchObject({ granted: false, replayed: true, was_granted: false, reason: 'daily_cap' });
    // another user is not affected by this user's cap
    const v = await newUser(db);
    expect(await call(db, await ticket(db, v), 'tx-v1', T0, 3)).toMatchObject({ granted: true });
    // the next Paris day counts from zero (a ticket issued the day before is still inside its 2 hours at 00:30 Paris)
    const t5 = await ticket(db, u, '2026-11-20T23:30:00Z');
    expect(await call(db, t5, 'tx-5', '2026-11-20T23:50:00Z', 3)).toMatchObject({ granted: true, ads_today: 1 });
    // a cap of 0 or less gives nothing
    expect(await call(db, await ticket(db, u, '2026-11-20T23:40:00Z'), 'tx-6', '2026-11-20T23:55:00Z', 0)).toMatchObject({ granted: false, reason: 'daily_cap' });
  });
  it('refuses a ticket that does not exist, is too old, or is from the future, and a missing transaction id; nothing changes', async () => {
    const db = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 2, anchor: T0 });
    const q = 'select public.cards_ad_pack_grant($1::uuid, $2, $3, $4::timestamptz, 3, 40)';
    expect(await failure(db, q, ['00000000-0000-4000-8000-000000000999', 'tx', 'u', T0])).toMatch(/cards: ticket/);
    expect(await failure(db, q, [await ticket(db, u, '2026-11-20T06:00:00Z'), 'tx', 'u', T0])).toMatch(/cards: ticket/);
    expect(await failure(db, q, [await ticket(db, u, '2026-11-20T10:30:00Z'), 'tx', 'u', T0])).toMatch(/cards: ticket/);
    expect(await failure(db, q, [await ticket(db, u), '', 'u', T0])).toMatch(/cards: key/);
    expect(await stock(db, u)).toBe(2);
    expect(await one(db, 'select count(*) from cards_ad_events')).toBe(0);
  });
  it('the stack may pass 7 by the grant (like a claimed set), the timer never adds above 7, and a player with no wallet starts at 7', async () => {
    const db = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 7, anchor: T0 });
    expect(await call(db, await ticket(db, u), 'tx-a')).toMatchObject({ granted: true, stock: 8 });
    const n = await newUser(db);
    expect(await call(db, await ticket(db, n), 'tx-b')).toMatchObject({ granted: true, stock: 8 });
    expect(await one(db, 'select (public.cards_wallet($1::uuid, $2::timestamptz)) ->> $3', [n, T0, 'stock'])).toBe('8');
    expect(await one(db, 'select (public.cards_wallet($1::uuid, $2::timestamptz)) ->> $3', [n, '2026-11-20T12:00:00Z', 'stock'])).toBe('8');
  });
  it('the table and the function are closed to the browser roles', async () => {
    const db = await world();
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_ad_pack_grant'`)).toBe(false);
    expect(await one(db, `select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_ad_events' and grantee in ('anon', 'authenticated', 'PUBLIC')`)).toBe(0);
    expect(await one(db, `select rowsecurity from pg_tables where tablename = 'cards_ad_events'`)).toBe(true);
  });
  it('a second run changes nothing; it needs 120; the rollback is refused while events exist and works on an empty table', async () => {
    const db = await world();
    const u = await newUser(db);
    await call(db, await ticket(db, u), 'tx-z');
    await run(db, rd(UP)); // second run
    expect(await one(db, 'select count(*) from cards_ad_events')).toBe(1);
    expect(await failure(db, rd(DOWN))).toMatch(/holds rows, nothing changed/);
    expect(await one(db, 'select to_regclass($1) is not null', ['public.cards_ad_events'])).toBe(true);
    await db.exec('delete from cards_ad_events where true');
    await run(db, rd(DOWN));
    expect(await one(db, 'select to_regclass($1) is null', ['public.cards_ad_events'])).toBe(true);
    expect(await one(db, `select count(*) from pg_proc where proname = 'cards_ad_pack_grant'`)).toBe(0);
    await run(db, rd(DOWN)); // second rollback
    // without 120 the file refuses
    const before120 = await prodDb();
    await run(before120, build([]).sql);
    expect(await failure(before120, rd(UP))).toMatch(/run 120-cap-7.sql first/);
    expect(await rows(before120, `select 1 from pg_tables where tablename = 'cards_ad_events'`)).toEqual([]);
  });
});
