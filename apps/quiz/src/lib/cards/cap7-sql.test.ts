// KpopCards launch prep: proof of docs/pending-migrations/cards/120-cap-7.sql (the stack cap 10 to 7) on PGlite, on the state production will
// have (bundle 099 to 115, 116, 117, 118). The nine bodies are the old ones with the cap only; players above 7 keep their packs; a second run
// changes nothing; the rollback gives the old bodies back byte for byte.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { T0, newUser, openSql, setWallet, wallet } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const UP = '120-cap-7.sql';
const DOWN = '120-cap-7.rollback.sql';
const NAMES = ['cards_roll', 'cards_wallet', 'cards_player', 'cards_open', 'cards_craft', 'cards_ad_grant', 'cards_recycle', 'cards_still_there', 'cards_claim'];
/** The file that holds the latest definition of each function before 120. */
const FROM: Record<string, string> = {
  cards_roll: '110-core.sql', cards_wallet: '110-core.sql', cards_player: '110-core.sql', cards_open: '118-group-parts.sql', cards_craft: '118-group-parts.sql',
  cards_ad_grant: '110-core.sql', cards_recycle: '110-core.sql', cards_still_there: '110-core.sql', cards_claim: '105-goals.sql',
};
const REPS: Array<[string, string]> = [
  ['p_cap integer default 10', 'p_cap integer default 7'], ['p_timer_cap, 10, w.seen_at', 'p_timer_cap, 7, w.seen_at'], ["'cap', 10,", "'cap', 7,"],
  ['v_stock >= 10 or', 'v_stock >= 7 or'], ['w.stock := 10;', 'w.stock := 7;'], ['values (p_user, 10, p_now', 'values (p_user, 7, p_now'],
];
function statement(text: string, name: string): string {
  const start = `  create or replace function public.${name}(`;
  const a = text.indexOf(start);
  expect(a, name).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(start, a + 1), `${name} once`).toBe(-1);
  const close = text.indexOf('$f$;', text.indexOf('as $f$', a) + 6);
  return text.slice(a, close + 4);
}
const md5s = (db: Awaited<ReturnType<typeof prodDb>>): Promise<Record<string, string>> =>
  rows<{ proname: string; m: string }>(db, `select proname, md5(prosrc) as m from pg_proc where pronamespace = 'public'::regnamespace and proname in ('${NAMES.join("','")}')`)
    .then((r) => Object.fromEntries(r.map((x) => [x.proname, x.m])));
/** A plain pack of the catalog production will have: four Standard cards and a fifth that is not Standard (the rule of cards_open). */
async function plain(db: Awaited<ReturnType<typeof prodDb>>): Promise<{ c: number[] }> {
  const q = (r: string, n: number) => rows<{ card_no: number }>(db, `select c.card_no from cards_catalog c join cards_entities e on e.id = c.entity_id where c.in_packs and e.active and c.rarity = '${r}' and c.part = 0 and e.kind = 'idol' order by c.card_no limit ${n}`);
  const four = await q('C', 4);
  const fifth = await q('U', 1);
  expect(four).toHaveLength(4);
  expect(fifth).toHaveLength(1);
  return { c: [...four, ...fifth].map((x) => x.card_no) };
}
async function world() {
  const db = await prodDb();
  await run(db, build([]).sql);
  return db;
}

describe('120-cap-7.sql: the files', () => {
  it.each([[UP, 'c120'], [DOWN, 'c120r']])('%s is one DO block with its header and no dash', (file, tag) => {
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
  it('every body is the latest older body with the cap changed and nothing else, and the rollback is the exact reverse', () => {
    const up = rd(UP);
    const down = rd(DOWN);
    for (const n of NAMES) {
      const old = statement(rd(FROM[n]!), n);
      let expected = old;
      for (const [a, b] of REPS) expected = expected.split(a).join(b);
      expect(expected, n).not.toBe(old);
      expect(statement(up, n), n).toBe(expected);
      expect(statement(down, n), n).toBe(old);
    }
  });
  it('no file between the source and 120 redefines these functions (118 only for open and craft)', () => {
    const later = ['111', '112', '113', '114', '115', '116', '116c', '117', '118'];
    for (const n of NAMES) {
      const holders = later.filter((p) => {
        const f = readdirSync(CARDS_SQL).find((x) => x.startsWith(`${p}-`) && !x.includes('rollback'));
        return f !== undefined && rd(f).includes(`create or replace function public.${n}(`);
      });
      expect(holders.length === 0 || (holders.length === 1 && holders[0] === '118' && FROM[n] === '118-group-parts.sql'), n).toBe(true);
    }
  });
});

describe('120-cap-7.sql: on the state production will have', () => {
  it('the wallet says 7 of 7, a new wallet starts at 7, the refill stops at 7, and a stack of 8 to 10 is kept', async () => {
    const db = await world();
    const u = await newUser(db);
    expect((await wallet(db, u)).cap).toBe(10);
    expect(await run(db, rd(UP))).toEqual(['120-cap-7: the stack cap is now 7; players who hold more keep their packs']);
    expect(await one(db, `select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'cap'`)).toBe('7');
    expect(await wallet(db, u)).toMatchObject({ stock: 7, cap: 7, next_at: null });
    // the timer adds a pack every 10 minutes up to 7
    await openSql(db, u, { draws: [await plain(db)] });
    expect((await wallet(db, u)).stock).toBe(6);
    expect((await wallet(db, u, '2026-11-12T10:10:00Z')).stock).toBe(7);
    expect((await wallet(db, u, '2026-11-12T11:30:00Z')).stock).toBe(7);
    // a player who held 9: the 9 are kept, nothing arrives, opening takes one away
    const v = await newUser(db);
    await setWallet(db, v, { stock: 9, anchor: '2026-11-12T08:00:00Z' });
    expect((await wallet(db, v, T0)).stock).toBe(9);
    expect((await wallet(db, v, T0)).next_at).toBeNull();
    await openSql(db, v, { draws: [await plain(db)] });
    expect((await wallet(db, v, T0)).stock).toBe(8);
    // the midnight top-up raises a stack under the cap to 7 and keeps one above it
    const lo = await newUser(db);
    const hi = await newUser(db);
    await setWallet(db, lo, { stock: 2, anchor: '2026-11-12T10:00:00Z', timer: 40 });
    await setWallet(db, hi, { stock: 10, anchor: '2026-11-12T10:00:00Z' });
    const next = '2026-11-13T09:00:00Z';
    expect((await wallet(db, lo, next)).stock).toBe(7);
    expect((await wallet(db, hi, next)).stock).toBe(10);
    // a player with no wallet row reads 7 from the lobby read, and the first open creates the row at 7 then takes one
    const n = await newUser(db);
    const player = await one<{ wallet: { stock: number } }>(db, 'select public.cards_player($1::uuid, $2::timestamptz)', [n, T0]);
    expect(player.wallet.stock).toBe(7);
    await openSql(db, n, { draws: [await plain(db)] });
    expect(await one(db, 'select stock from cards_wallets where user_id = $1', [n])).toBe(6);
  });
  it('a second run changes nothing, a half applied state is refused, and the grants stay', async () => {
    const db = await world();
    const before = await md5s(db);
    await run(db, rd(UP));
    const after = await md5s(db);
    for (const n of NAMES.filter((x) => x !== 'cards_roll')) expect(after[n], n).not.toBe(before[n]); // cards_roll changes its default only, not its body
    expect(await one(db, `select pg_get_function_arguments('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'::regprocedure) like '%p_cap integer DEFAULT 7%'`)).toBe(true);
    expect(await run(db, rd(UP))).toEqual(['120-cap-7: already applied, nothing changed']);
    expect(await md5s(db)).toEqual(after);
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('${NAMES.join("','")}')`)).toBe(false);
    expect(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('${NAMES.join("','")}')`)).toBe(9);
    // half applied: one function back at 10
    await db.exec(`do $x$ begin execute replace(pg_get_functiondef('public.cards_player(uuid, timestamptz, integer)'::regprocedure), 'w.stock := 7;', 'w.stock := 10;'); end $x$;`);
    await expect(db.exec(rd(UP))).rejects.toThrow(/not all at the cap of 10/);
  });
  it('the rollback restores every body byte for byte, and a second rollback says so', async () => {
    const db = await world();
    const before = await md5s(db);
    await run(db, rd(UP));
    expect(await run(db, rd(DOWN))).toEqual(['120-cap-7.rollback: the stack cap is now 10; players who hold more keep their packs']);
    expect(await md5s(db)).toEqual(before);
    expect(await run(db, rd(DOWN))).toEqual(['120-cap-7.rollback: already applied, nothing changed']);
  });
});
