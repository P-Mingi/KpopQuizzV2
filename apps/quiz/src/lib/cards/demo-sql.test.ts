// Bunnyverse Cards, lot 3 point A18: 106-demo.sql on a throwaway Postgres (PGlite): the one-DO-block pin, RLS and grants, and the claim
// function: one claim per token, 1 a day per device hash, 3 a day per IP hash, the purge after 7 days, cards still in packs only,
// first_source when lane ECON's column exists. Test code only.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDS_SQL, failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const U3 = '33333333-3333-3333-3333-333333333333';
const U4 = '44444444-4444-4444-4444-444444444444';
const T0 = Date.parse('2026-11-13T10:00:00Z');
const iso = (ms: number): string => new Date(ms).toISOString();
const J = (n: number): string => `jti${String(n).padStart(20, '0')}`;
const H = (c: string): string => c.repeat(32);
const PACK = [1, 7, 9, 3, 2];

async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into auth.users values ('${U1}'), ('${U2}'), ('${U3}'), ('${U4}');
    insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key) values
      ('group:Q2', 'group', 'GRP', null, 2015, 'a'), ('idol:Q1', 'idol', 'Idol', 'group:Q2', 2015, 'a1'), ('event:e1', 'event', 'Ev', null, 2018, 'z');
    insert into public.cards_catalog (card_no, num, entity_id, rarity, edition) values
      (1, 'BV1-0001', 'idol:Q1', 'C', 'std'), (2, 'BV1-0002', 'idol:Q1', 'U', 'stage'), (3, 'BV1-0003', 'idol:Q1', 'R', 'holo'),
      (7, 'BV1-0007', 'group:Q2', 'C', 'std'), (9, 'BV1-0009', 'event:e1', 'C', 'std');
  `);
}
const claim = (db: PGlite, user: string, jti: string, device: string, ip: string, now: number = T0, cards: number[] = PACK) =>
  one<{ cards: { n: number; isNew: boolean }[] }>(db, 'select public.cards_demo_claim($1, $2, $3::int[], $4, $5, $6::timestamptz)', [user, jti, cards, device, ip, iso(now)]);

let db: PGlite;
beforeEach(async () => {
  db = await freshCardsDb();
  await seed(db);
  await db.exec(readCardsSql('106-demo.sql'));
});

describe('106-demo.sql', () => {
  for (const [file, tag] of [['106-demo.sql', 'c106'], ['106-demo.rollback.sql', 'c106r']] as const) {
    it(`${file} is one DO block with a Verify line and no dash`, () => {
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
  }
  it('has RLS on, no browser grant on the table, and only the service role may run the function', async () => {
    expect(await one(db, `select relrowsecurity from pg_class where oid = 'public.cards_demo_claims'::regclass`)).toBe(true);
    expect(await one(db, `select count(*)::int from information_schema.role_table_grants where table_schema='public' and table_name='cards_demo_claims' and grantee in ('anon','authenticated','PUBLIC')`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_policies where tablename='cards_demo_claims'`)).toBe(0);
    const f = 'public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz)';
    expect(await one(db, `select has_function_privilege('service_role', '${f}', 'execute')`)).toBe(true);
    expect(await one(db, `select has_function_privilege('anon', '${f}', 'execute') or has_function_privilege('authenticated', '${f}', 'execute')`)).toBe(false);
    expect(await one(db, `select prosecdef from pg_proc where proname = 'cards_demo_claim'`)).toBe(true);
  });
  it('is idempotent: a second run changes nothing, and the rollback removes it all', async () => {
    await claim(db, U1, J(1), H('a'), H('b'));
    await db.exec(readCardsSql('106-demo.sql'));
    expect(await one(db, `select count(*)::int from cards_demo_claims`)).toBe(1);
    await db.exec(readCardsSql('106-demo.rollback.sql'));
    await db.exec(readCardsSql('106-demo.rollback.sql'));
    expect(await one(db, `select count(*)::int from information_schema.tables where table_name='cards_demo_claims'`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_proc where proname='cards_demo_claim'`)).toBe(0);
    expect(await one(db, `select count(*)::int from cards_owned`)).toBe(5);
  });
});

describe('cards_demo_claim', () => {
  it('adds the five cards to the binder as new, touching no wallet, pack or shard', async () => {
    const r = await claim(db, U1, J(1), H('a'), H('b'));
    expect(r.cards).toEqual(PACK.map((n) => ({ n, isNew: true })));
    expect((await rows(db, `select card_no, copies from cards_owned where user_id = '${U1}' order by card_no`)).map((x) => [x.card_no, x.copies])).toEqual([[1, 1], [2, 1], [3, 1], [7, 1], [9, 1]]);
    expect(await one(db, `select count(*)::int from cards_wallets`)).toBe(0);
    expect(await one(db, `select count(*)::int from cards_packs`)).toBe(0);
  });
  it('a card the player already has gains a copy and is not new', async () => {
    await db.exec(`insert into cards_owned (user_id, card_no) values ('${U1}', 3)`);
    const r = await claim(db, U1, J(1), H('a'), H('b'));
    expect(r.cards.find((c) => c.n === 3)).toEqual({ n: 3, isNew: false });
    expect(await one(db, `select copies from cards_owned where user_id='${U1}' and card_no=3`)).toBe(2);
  });
  it('one claim per token, even from another account', async () => {
    await claim(db, U1, J(1), H('a'), H('b'));
    expect(await failure(db, `select public.cards_demo_claim('${U2}', '${J(1)}', '{1,7,9,3,2}'::int[], '${H('c')}', '${H('d')}', '${iso(T0)}')`)).toMatch(/cards: demo_used/);
    expect(await one(db, `select count(*)::int from cards_owned where user_id='${U2}'`)).toBe(0);
  });
  it('at most 1 a day per device hash, again the next Paris day', async () => {
    await claim(db, U1, J(1), H('a'), H('b'));
    expect(await failure(db, `select public.cards_demo_claim('${U2}', '${J(2)}', '{1,7,9,3,2}'::int[], '${H('a')}', '${H('c')}', '${iso(T0 + 3600_000)}')`)).toMatch(/cards: demo_device/);
    await claim(db, U2, J(2), H('a'), H('c'), T0 + 24 * 3600_000);
    expect(await one(db, `select count(*)::int from cards_owned where user_id='${U2}'`)).toBe(5);
  });
  it('at most 3 a day per IP hash', async () => {
    await claim(db, U1, J(1), H('a'), H('z'));
    await claim(db, U2, J(2), H('b'), H('z'));
    await claim(db, U3, J(3), H('c'), H('z'));
    expect(await failure(db, `select public.cards_demo_claim('${U4}', '${J(4)}', '{1,7,9,3,2}'::int[], '${H('d')}', '${H('z')}', '${iso(T0)}')`)).toMatch(/cards: demo_ip/);
    expect(await one(db, `select count(*)::int from cards_demo_claims`)).toBe(3);
  });
  it('a refused claim leaves nothing behind (no claim row, no card)', async () => {
    await claim(db, U1, J(1), H('a'), H('b'));
    await failure(db, `select public.cards_demo_claim('${U1}', '${J(2)}', '{1,7,9,3,2}'::int[], '${H('a')}', '${H('b')}', '${iso(T0)}')`);
    expect(await one(db, `select count(*)::int from cards_demo_claims`)).toBe(1);
    expect(await one(db, `select sum(copies)::int from cards_owned`)).toBe(5);
  });
  it('purges the rows older than 7 days on each call, so the IP hash is kept no longer', async () => {
    await claim(db, U1, J(1), H('a'), H('b'));
    await claim(db, U2, J(2), H('c'), H('d'), T0 + 6 * 24 * 3600_000);
    expect(await one(db, `select count(*)::int from cards_demo_claims`)).toBe(2);
    await claim(db, U3, J(3), H('e'), H('f'), T0 + 8 * 24 * 3600_000);
    expect((await rows(db, `select jti from cards_demo_claims order by jti`)).map((x) => x.jti)).toEqual([J(2), J(3)]);
  });
  it('adds only the cards still in packs, and refuses a pack with none', async () => {
    await db.exec(`update cards_catalog set in_packs = false where card_no in (1, 7)`);
    const r = await claim(db, U1, J(1), H('a'), H('b'));
    expect(r.cards.map((c) => c.n).sort((a, b) => a - b)).toEqual([2, 3, 9]);
    await db.exec(`update cards_catalog set in_packs = false`);
    expect(await failure(db, `select public.cards_demo_claim('${U2}', '${J(2)}', '{1,7,9,3,2}'::int[], '${H('c')}', '${H('d')}', '${iso(T0)}')`)).toMatch(/cards: pack/);
  });
  it('refuses a pack that is not five cards, a short token id and a missing user', async () => {
    for (const sql of [
      `select public.cards_demo_claim('${U1}', '${J(1)}', '{1,7,9,3}'::int[], '${H('a')}', '${H('b')}', '${iso(T0)}')`,
      `select public.cards_demo_claim('${U1}', 'short', '{1,7,9,3,2}'::int[], '${H('a')}', '${H('b')}', '${iso(T0)}')`,
      `select public.cards_demo_claim(null, '${J(1)}', '{1,7,9,3,2}'::int[], '${H('a')}', '${H('b')}', '${iso(T0)}')`,
    ]) expect(await failure(db, sql)).toMatch(/cards: /);
  });
  it('marks a new card first_source "demo" when lane ECON\'s column exists, and works without it', async () => {
    await db.exec(`alter table cards_owned add column first_source text check (first_source in ('stock', 'ad', 'shards', 'bonus', 'demo'))`);
    await db.exec(`insert into cards_owned (user_id, card_no, first_source) values ('${U1}', 3, 'stock')`);
    await claim(db, U1, J(1), H('a'), H('b'));
    expect((await rows(db, `select card_no, first_source from cards_owned where user_id='${U1}' order by card_no`)).map((x) => [x.card_no, x.first_source])).toEqual([[1, 'demo'], [2, 'demo'], [3, 'stock'], [7, 'demo'], [9, 'demo']]);
  });
  it('keeps going when the column\'s check does not know "demo"', async () => {
    await db.exec(`alter table cards_owned add column first_source text check (first_source in ('stock', 'ad', 'shards', 'bonus'))`);
    const r = await claim(db, U1, J(1), H('a'), H('b'));
    expect(r.cards).toHaveLength(5);
    expect(await one(db, `select count(*)::int from cards_owned where user_id='${U1}' and first_source is null`)).toBe(5);
  });
});
