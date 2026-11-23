// KpopCards launch polish (LAUNCH-POLISH-2, 2026-11-23): proof of docs/pending-migrations/cards/125-cap-5.sql (the stack cap 7 to 5) on PGlite, on the
// state production will have (bundle 099 to 115, 116, 117, 118, then 120 and 121). The ten bodies are the older ones with the cap only; a player above
// 5 (6 or 7 packs) keeps his packs and a refill never lowers a stack; a second run changes nothing; the rollback gives the older bodies back byte for byte.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { KC } from '../kpopcards/contract';
import { walletNow } from '../kpopcards/model';
import { T0, newUser, openSql, setWallet, wallet } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, failure, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const UP = '125-cap-5.sql';
const DOWN = '125-cap-5.rollback.sql';
const NAMES = ['cards_roll', 'cards_wallet', 'cards_player', 'cards_open', 'cards_craft', 'cards_ad_grant', 'cards_ad_pack_grant', 'cards_recycle', 'cards_still_there', 'cards_claim'];
/** The file that holds the latest definition of each function before 125: 120 for the nine of the cap of 7, 121 for the ad pack grant. */
const FROM: Record<string, string> = Object.fromEntries(NAMES.map((n) => [n, n === 'cards_ad_pack_grant' ? '121-ad-packs.sql' : '120-cap-7.sql']));
const REPS: Array<[string, string]> = [
  ['p_cap integer default 7', 'p_cap integer default 5'], ['p_timer_cap, 7, w.seen_at', 'p_timer_cap, 5, w.seen_at'], ["'cap', 7,", "'cap', 5,"],
  ['v_stock >= 7 or', 'v_stock >= 5 or'], ['w.stock := 7;', 'w.stock := 5;'], ['values (p_user, 7, p_now', 'values (p_user, 5, p_now'], ['values (t.user_id, 7, p_now', 'values (t.user_id, 5, p_now'],
];
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
type Db = Awaited<ReturnType<typeof prodDb>>;
function statement(text: string, name: string): string {
  const start = `  create or replace function public.${name}(`;
  const a = text.indexOf(start);
  expect(a, name).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(start, a + 1), `${name} once`).toBe(-1);
  const close = text.indexOf('$f$;', text.indexOf('as $f$', a) + 6);
  return text.slice(a, close + 4);
}
const md5s = (db: Db): Promise<Record<string, string>> =>
  rows<{ proname: string; m: string }>(db, `select proname, md5(prosrc) as m from pg_proc where pronamespace = 'public'::regnamespace and proname in ('${NAMES.join("','")}')`)
    .then((r) => Object.fromEntries(r.map((x) => [x.proname, x.m])));
/** A plain pack of the catalog production will have: four Standard cards and a fifth that is not Standard (the rule of cards_open). */
async function plain(db: Db): Promise<{ c: number[] }> {
  const q = (r: string, n: number) => rows<{ card_no: number }>(db, `select c.card_no from cards_catalog c join cards_entities e on e.id = c.entity_id where c.in_packs and e.active and c.rarity = '${r}' and c.part = 0 and e.kind = 'idol' order by c.card_no limit ${n}`);
  const four = await q('C', 4);
  const fifth = await q('U', 1);
  expect(four).toHaveLength(4);
  expect(fifth).toHaveLength(1);
  return { c: [...four, ...fifth].map((x) => x.card_no) };
}
async function world(): Promise<Db> {
  const db = await prodDb();
  await run(db, build([]).sql);
  await run(db, rd('120-cap-7.sql'));
  await run(db, rd('121-ad-packs.sql'));
  return db;
}

describe('125-cap-5.sql: the files', () => {
  it.each([[UP, 'c125'], [DOWN, 'c125r']])('%s is one DO block with its header and no dash', (file, tag) => {
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
    expect(sql).not.toMatch(DASH);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    // every UPDATE or DELETE statement inside the function bodies has its WHERE (safeupdate refuses one without it through the API)
    for (const st of code.split(';').map((x) => x.replace(/--.*$/gm, '').trim()).filter((x) => /^(update|delete)\b/i.test(x))) expect(st, st.slice(0, 60)).toMatch(/\bwhere\b/i);
  });
  it('every body is the latest older body (120, or 121 for the ad pack grant) with the cap changed and nothing else, and the rollback is the exact reverse', () => {
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
  it('no file between 120 and 125 redefines these functions, except 121 for the ad pack grant', () => {
    for (const f of ['121-ad-packs.sql', '122-pulls-feed.sql', '123-refill.sql', '124-photoless-owned.sql']) {
      for (const n of NAMES) {
        const defines = rd(f).includes(`create or replace function public.${n}(`);
        expect(defines, `${f} ${n}`).toBe(f === '121-ad-packs.sql' && n === 'cards_ad_pack_grant');
      }
    }
  });
});

describe('125-cap-5.sql: on the state production will have', () => {
  it('the wallet says 5 of 5, a new wallet starts at 5, the refill stops at 5, and a stack of 6 or 7 is kept and never lowered', async () => {
    const db = await world();
    const u = await newUser(db);
    expect((await wallet(db, u)).cap).toBe(7);
    expect(await run(db, rd(UP))).toEqual(['125-cap-5: the stack cap is now 5; players who hold more keep their packs']);
    expect(await one(db, `select (public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'cap'`)).toBe('5');
    expect(await wallet(db, u)).toMatchObject({ stock: 5, cap: 5, next_at: null });
    // the timer adds a pack every 10 minutes up to 5
    await openSql(db, u, { draws: [await plain(db)] });
    expect((await wallet(db, u)).stock).toBe(4);
    expect((await wallet(db, u, '2026-11-12T10:10:00Z')).stock).toBe(5);
    expect((await wallet(db, u, '2026-11-12T11:30:00Z')).stock).toBe(5);
    // a stack of 3 refills to 5 and stops there
    const low = await newUser(db);
    await setWallet(db, low, { stock: 3, anchor: '2026-11-12T10:00:00Z' });
    expect((await wallet(db, low, '2026-11-12T10:10:00Z')).stock).toBe(4);
    expect((await wallet(db, low, '2026-11-12T12:00:00Z')).stock).toBe(5);
    expect((await wallet(db, low, '2026-11-12T12:00:00Z')).next_at).toBeNull();
    // a player who held 7: the 7 are kept, nothing arrives, opening takes one away and the refill does not bring it back
    const v = await newUser(db);
    await setWallet(db, v, { stock: 7, anchor: '2026-11-12T08:00:00Z' });
    expect((await wallet(db, v, T0)).stock).toBe(7);
    expect((await wallet(db, v, T0)).next_at).toBeNull();
    await openSql(db, v, { draws: [await plain(db)] });
    expect((await wallet(db, v, T0)).stock).toBe(6);
    expect((await wallet(db, v, '2026-11-12T20:00:00Z')).stock).toBe(6);
    // a player who held 6 is kept at 6 too
    const six = await newUser(db);
    await setWallet(db, six, { stock: 6, anchor: '2026-11-12T08:00:00Z' });
    expect((await wallet(db, six, '2026-11-12T18:00:00Z')).stock).toBe(6);
    // the midnight top-up raises a stack under the cap to 5 and keeps one above it
    const lo = await newUser(db);
    const hi = await newUser(db);
    await setWallet(db, lo, { stock: 2, anchor: '2026-11-12T10:00:00Z', timer: 40 });
    await setWallet(db, hi, { stock: 7, anchor: '2026-11-12T10:00:00Z' });
    const next = '2026-11-13T09:00:00Z';
    expect((await wallet(db, lo, next)).stock).toBe(5);
    expect((await wallet(db, hi, next)).stock).toBe(7);
    // a player with no wallet row reads 5 from the lobby read, and the first open creates the row at 5 then takes one
    const n = await newUser(db);
    const player = await one<{ wallet: { stock: number } }>(db, 'select public.cards_player($1::uuid, $2::timestamptz)', [n, T0]);
    expect(player.wallet.stock).toBe(5);
    await openSql(db, n, { draws: [await plain(db)] });
    expect(await one(db, 'select stock from cards_wallets where user_id = $1', [n])).toBe(4);
  });
  it('a stock of 5 opens five packs at once (Open 5 takes the whole stack), and the TypeScript constant is the same 5', async () => {
    expect(KC.STACK_CAP).toBe(5);
    expect(KC.OPEN_MANY).toBe(KC.STACK_CAP);
    const db = await world();
    await run(db, rd(UP));
    const u = await newUser(db);
    expect((await wallet(db, u)).stock).toBe(KC.OPEN_MANY);
    const one5 = await plain(db);
    await openSql(db, u, { draws: [one5, one5, one5, one5, one5] });
    expect((await wallet(db, u)).stock).toBe(0);
    // the TypeScript view agrees with the database on a stack above the cap
    const ts = walletNow({ stock: 7, anchor: Date.parse('2026-11-12T08:00:00Z'), timerToday: 0, parisDay: '2026-11-12', adsToday: 0, lastSeen: Date.parse('2026-11-12T08:00:00Z') }, Date.parse('2026-11-12T10:00:00Z'));
    expect(ts.stock).toBe(7);
    expect(ts.nextAt).toBeNull();
  });
  it('the rewarded ad pack grant starts a new wallet at 5 and refills to 5 only; the grant itself is not capped', async () => {
    const db = await world();
    await run(db, rd(UP));
    const u = await newUser(db);
    const t = await one<string>(db, 'insert into cards_ad_tickets (user_id, issued_at) values ($1, $2) returning id', [u, '2026-11-20T09:55:00Z']);
    const r = JSON.parse(JSON.stringify(await one(db, `select public.cards_ad_pack_grant($1::uuid, 'tx-cap5', '/1234/rewarded-pack', '2026-11-20T10:00:00Z'::timestamptz, 3, 40)`, [t])));
    expect(r).toMatchObject({ granted: true, stock: 6 });
    expect(await one(db, 'select stock from cards_wallets where user_id = $1', [u])).toBe(6);
  });
  it('a second run changes nothing, a half applied state is refused, and the grants stay', async () => {
    const db = await world();
    const before = await md5s(db);
    await run(db, rd(UP));
    const after = await md5s(db);
    for (const n of NAMES.filter((x) => x !== 'cards_roll')) expect(after[n], n).not.toBe(before[n]); // cards_roll changes its default only, not its body
    expect(await one(db, `select pg_get_function_arguments('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer, integer, timestamptz)'::regprocedure) like '%p_cap integer DEFAULT 5%'`)).toBe(true);
    expect(await run(db, rd(UP))).toEqual(['125-cap-5: already applied, nothing changed']);
    expect(await md5s(db)).toEqual(after);
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('${NAMES.join("','")}')`)).toBe(false);
    expect(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('${NAMES.join("','")}')`)).toBe(10);
    // half applied: one function back at 7
    await db.exec(`do $x$ begin execute replace(pg_get_functiondef('public.cards_player(uuid, timestamptz, integer)'::regprocedure), 'w.stock := 5;', 'w.stock := 7;'); end $x$;`);
    await expect(db.exec(rd(UP))).rejects.toThrow(/not all at the cap of 7/);
  });
  it('refuses to run before 121 (the ad pack grant is missing) and leaves the nine functions alone', async () => {
    const db = await prodDb();
    await run(db, build([]).sql);
    await run(db, rd('120-cap-7.sql'));
    const before = await md5s(db);
    expect(await failure(db, rd(UP))).toMatch(/run 120 and 121 first \(cards_ad_pack_grant is missing\)/);
    expect(await md5s(db)).toEqual(before);
  });
  it('the rollback restores every body byte for byte, and a second rollback says so', async () => {
    const db = await world();
    const before = await md5s(db);
    await run(db, rd(UP));
    expect(await run(db, rd(DOWN))).toEqual(['125-cap-5.rollback: the stack cap is now 7; players who hold more keep their packs']);
    expect(await md5s(db)).toEqual(before);
    expect(await run(db, rd(DOWN))).toEqual(['125-cap-5.rollback: already applied, nothing changed']);
  });
});
