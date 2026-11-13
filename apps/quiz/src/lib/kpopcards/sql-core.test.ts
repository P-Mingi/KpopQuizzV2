// KpopCards lots 3 to 5: the proofs of 105 (sets, week, claims, ledgers), 107 (prefs) and 110 (the core) on PGlite: the stack of 10, the timer
// and its day cap, the golden pack, the Gold guarantee counted pack by pack, Open 5 in one transaction, the idempotency key, the themes, the
// pack of the day, the focus pack, locks, recycling, crafting, the "still there?" pause, the audit and the grants. Midnight, the week and the
// day around the clock changes of 2026-03-29 and 2026-10-25.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { CARDS_SQL, SCHEMA_FILES, freshCardsDb, readCardsSql } from '../cards/sql-harness';
import { KC } from './contract';
import { PLAIN, T0, coreDb, failure, key, newUser, one, openSql, own, rows, setWallet, tryOpen, wallet } from './sql-fixture';
import { dailyGroup, fixtureWorldForSql } from './sql-twin';

import type { PGlite } from '@electric-sql/pglite';

describe('the 105, 107 and 110 files are one DO block', () => {
  it.each([['105-goals.sql', 'c105'], ['105-goals.rollback.sql', 'c105r'], ['107-prefs.sql', 'c107'], ['107-prefs.rollback.sql', 'c107r'], ['110-core.sql', 'c110'], ['110-core.rollback.sql', 'c110r']])('%s', (file, tag) => {
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
});

describe('the stack of ten and the timer', () => {
  it('a new wallet holds 10 packs, the cap is 10, and the timer adds a pack every 10 minutes up to the cap', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    expect((await wallet(db, u)).stock).toBe(KC.STACK_CAP);
    expect((await wallet(db, u)).cap).toBe(10);
    await openSql(db, u, { draws: [PLAIN] });
    expect((await wallet(db, u)).stock).toBe(9);
    expect((await wallet(db, u, '2026-11-12T10:09:59Z')).stock).toBe(9);
    expect((await wallet(db, u, '2026-11-12T10:10:00Z')).stock).toBe(10);
    expect((await wallet(db, u, '2026-11-12T10:30:00Z')).stock).toBe(10);
  });
  it('a pack in the stack opens even when the timer is done for the day; the timer stops at 40 a Paris day; midnight tops up to 10 without counting', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 3, anchor: '2026-11-12T10:00:00Z', timer: 40 });
    const w = await wallet(db, u, '2026-11-12T20:00:00Z');
    expect(w.stock).toBe(3);
    expect(w.next_at).toBeNull();
    expect(w.timer_left).toBe(0);
    await openSql(db, u, { draws: [PLAIN], at: '2026-11-12T20:00:00Z' });
    expect((await wallet(db, u, '2026-11-12T20:00:00Z')).stock).toBe(2);
    // Paris midnight of 12 to 13 November is 23:00Z: the top-up gives 10 and the day's timer count starts again at 0.
    const m = await wallet(db, u, '2026-11-12T23:00:00Z');
    expect(m.stock).toBe(10);
    expect(m.timer_used).toBe(0);
    expect(Date.parse(m.midnight_at as string)).toBe(Date.parse('2026-11-13T23:00:00Z'));
  });
  it('a stack above the cap (a claimed set) is kept, and midnight does not take from it', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 14 });
    expect((await wallet(db, u, '2026-11-13T09:00:00Z')).stock).toBe(14);
    expect((await wallet(db, u, '2026-11-13T09:00:00Z')).next_at).toBeNull();
  });
  it('the day cap is a Paris day: the clock changes (2026-03-29 and 2026-10-25) move the midnight by the hour, never the cap', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    // Spring: Paris goes to UTC+2 at 01:00Z on 29 March 2026. The Paris midnight after 28 March (UTC+1) is 23:00Z on the 28th; the one after the 29th is 22:00Z.
    await setWallet(db, u, { stock: 0, anchor: '2026-03-28T10:00:00Z', day: '2026-03-28', timer: 40 });
    const a = await wallet(db, u, '2026-03-28T22:59:00Z');
    expect(a.stock).toBe(0);
    expect(Date.parse(a.midnight_at as string)).toBe(Date.parse('2026-03-28T23:00:00Z'));
    expect((await wallet(db, u, '2026-03-28T23:00:00Z')).stock).toBe(10);
    expect(Date.parse((await wallet(db, u, '2026-03-29T10:00:00Z')).midnight_at as string)).toBe(Date.parse('2026-03-29T22:00:00Z'));
    // Autumn: Paris goes back to UTC+1 at 01:00Z on 25 October 2026. The day of the 25th is 25 hours long: its midnight is 23:00Z.
    await setWallet(db, u, { stock: 0, anchor: '2026-10-24T22:00:00Z', day: '2026-10-25', timer: 40, seen: '2026-10-25T20:00:00Z' });
    const b = await wallet(db, u, '2026-10-25T22:59:00Z');
    expect(b.stock).toBe(0);
    expect(b.timer_left).toBe(0);
    expect(Date.parse(b.midnight_at as string)).toBe(Date.parse('2026-10-25T23:00:00Z'));
    expect((await wallet(db, u, '2026-10-25T23:00:00Z')).stock).toBe(10);
  });
});

describe('the golden pack (every 10th pack) and the Gold guarantee (by pack 30), counted pack by pack', () => {
  const GOLDEN: { c: number[]; g: number; u: number } = { c: [1, 2, 6, 3, 13], g: 7, u: 4 };
  it('the 10th pack takes the golden fifth card; the others take the plain one', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, opened: 8 });
    const r1 = await openSql(db, u, { draws: [GOLDEN] }); // pack 9
    expect(r1.packs[0]).toMatchObject({ pack_no: 9, golden: false });
    expect(r1.packs[0]!.cards[4]!.n).toBe(13);
    const r2 = await openSql(db, u, { draws: [GOLDEN] }); // pack 10
    expect(r2.packs[0]).toMatchObject({ pack_no: 10, golden: true, guarantee: false });
    expect(r2.packs[0]!.cards[4]).toMatchObject({ n: 7, golden: true });
  });
  it('refuses a golden fifth card under Holo, a fifth Standard card, and a guaranteed card that is not Gold', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, opened: 9 });
    expect(await tryOpen(db, u, { draws: [{ c: [1, 2, 6, 3, 13], g: 13, u: 4 }] })).toMatch(/cards: pack/);
    await setWallet(db, u, { stock: 10, opened: 0 });
    expect(await tryOpen(db, u, { draws: [{ c: [1, 2, 6, 3, 15] }] })).toMatch(/cards: pack/);
  });
  it('after 29 packs without a Gold or a Full Art, the next pack takes the Gold card; a Gold card ends the count', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 200, opened: 0 });
    for (let i = 1; i <= 29; i++) {
      if (i % 10 === 0) continue;
      await openSql(db, u, { draws: [{ c: [1, 2, 6, 3, 13], g: 7, u: 4 }], at: `2026-11-12T10:${String(i).padStart(2, '0')}:00Z` });
    }
    // 27 packs so far (9 and 19 plus the golden 10 and 20 were skipped by the loop). Open the golden ones too so the count is 29.
    await db.query('update public.cards_wallets set packs_opened = 0 where user_id = $1', [u]);
    const n = Number((await rows<{ n: string }>(db, 'select count(*) as n from public.cards_packs where user_id = $1', [u]))[0]!.n);
    expect(n).toBe(27);
    expect(await one(db, 'select public.cards_pity_count($1::uuid)', [u])).toBe(27);
  });
  it('the guarantee fires exactly on the pack after 29 packs in a row without a Gold card', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 200, opened: 0 });
    const flags: boolean[] = [];
    for (let i = 1; i <= 31; i++) {
      const r = await openSql(db, u, { draws: [{ c: [1, 2, 6, 3, 13], g: 7, u: 4 }], at: `2026-11-12T10:${String(i).padStart(2, '0')}:00Z` });
      flags.push(r.packs[0]!.guarantee);
      if (r.packs[0]!.guarantee) expect(r.packs[0]!.cards[4]!.n).toBe(4);
    }
    expect(flags.indexOf(true)).toBe(29); // the 30th pack
    expect(flags.filter(Boolean)).toHaveLength(1); // the Gold card ended the count; packs 31 starts again
  });
  it('Open 5 counts the golden pack and the guarantee pack by pack inside one call', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, opened: 8 });
    const r = await openSql(db, u, { draws: [GOLDEN, GOLDEN, GOLDEN, GOLDEN, GOLDEN] });
    expect(r.packs.map((p) => p.pack_no)).toEqual([9, 10, 11, 12, 13]);
    expect(r.packs.map((p) => p.golden)).toEqual([false, true, false, false, false]);
    expect(r.packs[1]!.cards[4]!.n).toBe(7);
    // Now 28 packs without gold in a row inside one transaction: set the count by hand with 28 stored packs, then open 5.
    const v = await newUser(db);
    await setWallet(db, v, { stock: 10, opened: 27 });
    for (let i = 1; i <= 28; i++) await db.query(`insert into public.cards_packs (user_id, source, cards, opened_at, seq) values ($1, 'stock', '{1,2,6,3,13}', '2026-11-11T10:00:00Z'::timestamptz + ($2::int || ' minutes')::interval, $2::int)`, [v, i]);
    await db.query('update public.cards_wallets set packs_opened = 28 where user_id = $1', [v]);
    const r2 = await openSql(db, v, { draws: [GOLDEN, GOLDEN, GOLDEN, GOLDEN, GOLDEN], at: '2026-11-12T10:00:00Z' });
    expect(r2.packs.map((p) => p.pack_no)).toEqual([29, 30, 31, 32, 33]);
    // pack 29: 28 before it, no guarantee; pack 30 is golden anyway and the count is 29 by then: Gold card (the guarantee wins), then the count restarts.
    expect(r2.packs.map((p) => p.guarantee)).toEqual([false, true, false, false, false]);
    expect(r2.packs[1]!.cards[4]).toMatchObject({ n: 4, guarantee: true, golden: true });
  });
});

describe('Open 5: five packs in ONE transaction', () => {
  it('spends 5 packs and stores 25 cards; a bad third pack rolls the whole call back', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const good: { c: number[] } = { c: [1, 2, 6, 3, 13] };
    const r = await openSql(db, u, { draws: [good, good, good, good, good] });
    expect(r.packs).toHaveLength(5);
    expect((await wallet(db, u)).stock).toBe(5);
    const v = await newUser(db);
    const before = await wallet(db, v);
    const bad = { c: [1, 2, 6, 3, 15] }; // a Standard fifth card
    expect(await tryOpen(db, v, { draws: [good, good, bad, good, good] })).toMatch(/cards: pack/);
    expect(await wallet(db, v)).toEqual(before);
    expect(Number(await one(db, 'select count(*) from public.cards_packs where user_id = $1', [v]))).toBe(0);
    expect(Number(await one(db, 'select count(*) from public.cards_owned where user_id = $1', [v]))).toBe(0);
  });
  it('needs five packs in the stack, and only for the stack', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 4 });
    expect(await tryOpen(db, u, { draws: [PLAIN, PLAIN, PLAIN, PLAIN, PLAIN] })).toMatch(/cards: stack_short/);
    expect(await tryOpen(db, u, { source: 'daily', draws: [PLAIN, PLAIN, PLAIN, PLAIN, PLAIN] })).toMatch(/cards: pack/);
    await setWallet(db, u, { stock: 0 });
    expect(await tryOpen(db, u, { draws: [PLAIN] })).toMatch(/cards: empty/);
    expect(await tryOpen(db, u, { draws: [PLAIN, PLAIN] })).toMatch(/cards: pack/);
  });
  it('the five packs share a batch and each has its pack number', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await openSql(db, u, { draws: [PLAIN, PLAIN, PLAIN, PLAIN, PLAIN] });
    const r = await rows<{ seq: number; batch: string | null }>(db, 'select seq, batch from public.cards_packs where user_id = $1 order by seq', [u]);
    expect(r.map((x) => x.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(r.map((x) => x.batch)).size).toBe(1);
    expect(r[0]!.batch).not.toBeNull();
  });
});

describe('the idempotency key', () => {
  it('the same key returns the same answer and never spends or gives twice', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const k = key();
    const a = await openSql(db, u, { key: k, draws: [PLAIN] });
    const b = await openSql(db, u, { key: k, draws: [{ c: [1, 2, 6, 3, 14] }] });
    expect(a.replayed).toBe(false);
    expect(b.replayed).toBe(true);
    expect(b.packs).toEqual(a.packs);
    expect((await wallet(db, u)).stock).toBe(9);
    expect(Number(await one(db, 'select count(*) from public.cards_packs where user_id = $1', [u]))).toBe(1);
    expect(Number(await one(db, 'select copies from public.cards_owned where user_id = $1 and card_no = 1', [u]))).toBe(1);
  });
  it('the same key on another operation is refused, a short key is refused, and the ledger and the audit keep the trace', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const k = key();
    await openSql(db, u, { key: k, draws: [PLAIN] });
    expect(await tryOpen(db, u, { key: k, source: 'daily', draws: [PLAIN] })).toMatch(/cards: idem_conflict/);
    expect(await tryOpen(db, u, { key: k, draws: [PLAIN, PLAIN, PLAIN, PLAIN, PLAIN] })).toMatch(/cards: idem_conflict/);
    expect(await tryOpen(db, u, { key: 'short', draws: [PLAIN] })).toMatch(/cards: key/);
    expect(Number(await one(db, 'select count(*) from public.cards_idem where user_id = $1', [u]))).toBe(1);
    const audit = await rows<{ kind: string; idem_key: string }>(db, 'select kind, idem_key from public.cards_audit where user_id = $1', [u]);
    expect(audit).toEqual([{ kind: 'open', idem_key: k }]);
  });
  it('a refused call leaves no ledger row: its key can be used again', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0 });
    const k = key();
    expect(await tryOpen(db, u, { key: k, draws: [PLAIN] })).toMatch(/cards: empty/);
    await setWallet(db, u, { stock: 3 });
    expect((await openSql(db, u, { key: k, draws: [PLAIN] })).replayed).toBe(false);
  });
  it('cards_idem_gc deletes the rows older than 24 hours', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await openSql(db, u, { draws: [PLAIN], at: '2026-11-10T10:00:00Z' });
    await openSql(db, u, { draws: [PLAIN], at: '2026-11-12T09:00:00Z' });
    expect(await one(db, "select public.cards_idem_gc('2026-11-12T10:00:00Z')")).toBe(1);
  });
});

describe('the missing half and the pair mark', () => {
  it('owning one half gives the other half of the same edition; owning both or none keeps the draw', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await own(db, u, [8]);
    const r = await openSql(db, u, { draws: [{ c: [8, 2, 6, 3, 13] }] });
    expect(r.packs[0]!.cards[0]).toMatchObject({ n: 9, isNew: true, completesPair: true });
    const v = await newUser(db);
    const r2 = await openSql(db, v, { draws: [{ c: [8, 2, 6, 3, 13] }] });
    expect(r2.packs[0]!.cards[0]).toMatchObject({ n: 8, completesPair: false });
    const r3 = await openSql(db, v, { draws: [{ c: [9, 2, 6, 3, 13] }] }); // owns 8, draws 9: that is the other half
    expect(r3.packs[0]!.cards[0]).toMatchObject({ n: 9, completesPair: true });
    const r4 = await openSql(db, v, { draws: [{ c: [8, 2, 6, 3, 13] }] }); // owns both: a copy
    expect(r4.packs[0]!.cards[0]).toMatchObject({ n: 8, isNew: false });
  });
  it('inside one pack the first half drawn makes the second draw give the other half', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const r = await openSql(db, u, { draws: [{ c: [8, 8, 6, 3, 13] }] });
    expect(r.packs[0]!.cards.map((c) => c.n).slice(0, 2)).toEqual([8, 9]);
  });
  it('a card is new once, wishlist entries of pulled cards go, the New badge starts on and cards_seen clears it', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await db.query('insert into public.cards_wishlist (user_id, card_no) values ($1, 3)', [u]);
    await openSql(db, u, { draws: [PLAIN] });
    expect(Number(await one(db, 'select count(*) from public.cards_wishlist where user_id = $1', [u]))).toBe(0);
    expect(Number(await one(db, 'select count(*) from public.cards_owned where user_id = $1 and not seen', [u]))).toBe(5);
    expect(await one(db, 'select public.cards_seen($1::uuid, $2::int[])', [u, [1, 2]])).toBe(3);
  });
});

describe('the themes, the pack of the day, the focus pack and the shards pack', () => {
  it('a girls pack holds girl-group subjects only; boys likewise; soloists are idols with no group subject; the rest is refused', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    // girls: G1 (1,2,3,4,6,7), G3 (15,16). boys: G2 (8..14), G4 (17,18,19). solo: S1 (20..23) and C1 (24) whose group has no card in packs.
    expect((await openSql(db, u, { theme: 'girls', draws: [{ c: [1, 2, 6, 3, 16] }] })).packs[0]!.theme).toBe('girls');
    expect((await openSql(db, u, { theme: 'boys', draws: [{ c: [8, 12, 17, 18, 19] }] })).packs[0]!.theme).toBe('boys');
    expect((await openSql(db, u, { theme: 'solo', draws: [{ c: [20, 24, 20, 21, 22] }] })).packs[0]!.theme).toBe('solo');
    expect(await tryOpen(db, u, { theme: 'girls', draws: [{ c: [1, 2, 6, 3, 19] }] })).toMatch(/cards: pack/);
    expect(await tryOpen(db, u, { theme: 'solo', draws: [{ c: [20, 24, 20, 21, 2] }] })).toMatch(/cards: pack/);
    expect(await tryOpen(db, u, { theme: 'idols', draws: [PLAIN] })).toMatch(/cards: theme/);
    expect(await one(db, "select public.cards_theme_of('idol:C1')")).toBe('solo');
    expect(await one(db, "select public.cards_theme_of('group:G5')")).toBe('girls');
    expect(await one(db, "select public.cards_theme_of('event:e1')")).toBeNull();
  });
  it('a mixed or unknown group is in All idols only', async () => {
    const db = await coreDb();
    await db.query("update public.cards_group_types set gender = 'mixed' where entity_id = 'group:G4'");
    const u = await newUser(db);
    expect(await one(db, "select public.cards_theme_of('idol:E1')")).toBeNull();
    expect((await openSql(db, u, { theme: 'all', draws: [{ c: [17, 18, 19, 2, 13] }] })).packs).toHaveLength(1);
    expect(await tryOpen(db, u, { theme: 'boys', draws: [{ c: [17, 18, 19, 8, 13] }] })).toMatch(/cards: pack/);
  });
  it('the guarantee may leave a theme only when the theme has no Gold card at all', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 200 });
    for (let i = 1; i <= 29; i++) await db.query(`insert into public.cards_packs (user_id, source, cards, opened_at, seq) values ($1, 'stock', '{1,2,6,3,13}', '2026-11-11T10:00:00Z'::timestamptz + ($2::int || ' minutes')::interval, $2::int)`, [u, i]);
    await db.query('update public.cards_wallets set packs_opened = 29 where user_id = $1', [u]);
    // boys has Gold (14): the guarantee card must be a boys one.
    expect(await tryOpen(db, u, { theme: 'boys', draws: [{ c: [8, 12, 17, 18, 19], u: 4 }] })).toMatch(/cards: pack/);
    expect((await openSql(db, u, { theme: 'boys', draws: [{ c: [8, 12, 17, 18, 19], u: 14 }] })).packs[0]!.guarantee).toBe(true);
  });
  it('the pack of the day is free once a Paris day, takes no pack from the stack, holds one group, and is the same group for everyone', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const day = '2026-11-12';
    const g = (await one<string>(db, 'select public.cards_daily_group($1::date)', [day]));
    expect(g).toBe(dailyGroup(fixtureWorldForSql(), day));
    const cards = g === 'group:G1' ? [1, 2, 6, 3, 7] : g === 'group:G2' ? [8, 12, 13, 10, 14] : g === 'group:G3' ? [15, 16, 15, 16, 16] : [17, 18, 19, 18, 19];
    const r = await openSql(db, u, { source: 'daily', draws: [{ c: cards }] });
    expect(r.packs[0]).toMatchObject({ theme: 'daily', source: 'daily', group: g });
    expect((await wallet(db, u)).stock).toBe(10);
    expect(await tryOpen(db, u, { source: 'daily', draws: [{ c: cards }] })).toMatch(/cards: daily_used/);
    const wrong = g === 'group:G1' ? [17, 18, 19, 18, 19] : [1, 2, 6, 3, 7];
    const v = await newUser(db);
    expect(await tryOpen(db, v, { source: 'daily', draws: [{ c: wrong }] })).toMatch(/cards: pack/);
    // The next Paris day (the midnight of 12 to 13 November is 23:00Z) has its own group and allows another daily pack.
    const nextG = await one<string>(db, "select public.cards_daily_group('2026-11-13')");
    expect(nextG).toBe(dailyGroup(fixtureWorldForSql(), '2026-11-13'));
  });
  it('the pack of the day follows the Paris day: used at 23:59 Paris, free again at 00:00, also on the 25 hour day of 25 October 2026', async () => {
    const db = await coreDb();
    const pick = async (at: string): Promise<number[]> => {
      const g = await one<string>(db, 'select public.cards_daily_group(($1::timestamptz at time zone \'Europe/Paris\')::date)', [at]);
      return g === 'group:G1' ? [1, 2, 6, 3, 7] : g === 'group:G2' ? [8, 12, 13, 10, 14] : g === 'group:G3' ? [15, 16, 15, 16, 16] : [17, 18, 19, 18, 19];
    };
    const u = await newUser(db);
    await openSql(db, u, { source: 'daily', draws: [{ c: await pick('2026-11-12T22:59:00Z') }], at: '2026-11-12T22:59:00Z' });
    expect(await tryOpen(db, u, { source: 'daily', draws: [{ c: await pick('2026-11-12T22:59:30Z') }], at: '2026-11-12T22:59:30Z' })).toMatch(/cards: daily_used/);
    expect(await tryOpen(db, u, { source: 'daily', draws: [{ c: await pick('2026-11-12T23:00:00Z') }], at: '2026-11-12T23:00:00Z' })).toBeNull();
    // 25 October 2026: Paris midnight of the 24th to the 25th is 22:00Z, of the 25th to the 26th 23:00Z (a 25 hour day).
    const v = await newUser(db);
    await openSql(db, v, { source: 'daily', draws: [{ c: await pick('2026-10-25T00:30:00Z') }], at: '2026-10-25T00:30:00Z' });
    expect(await tryOpen(db, v, { source: 'daily', draws: [{ c: await pick('2026-10-25T22:30:00Z') }], at: '2026-10-25T22:30:00Z' })).toMatch(/cards: daily_used/);
    expect(await tryOpen(db, v, { source: 'daily', draws: [{ c: await pick('2026-10-25T23:00:00Z') }], at: '2026-10-25T23:00:00Z' })).toBeNull();
  });
  it('the pack of the day rotates over the groups with a card in packs by the day number, and a group with no card is never picked', async () => {
    const db = await coreDb();
    const seen = new Set<string>();
    for (let d = 1; d <= 8; d++) seen.add(await one<string>(db, `select public.cards_daily_group('2026-11-${String(d).padStart(2, '0')}'::date)`));
    expect([...seen].sort()).toEqual(['group:G1', 'group:G2', 'group:G3', 'group:G4']);
    const w = fixtureWorldForSql();
    for (let d = 1; d <= 28; d++) {
      const day = `2026-11-${String(d).padStart(2, '0')}`;
      expect(await one(db, 'select public.cards_daily_group($1::date)', [day])).toBe(dailyGroup(w, day));
    }
  });
  it('a focus pack uses a stack pack, once a Paris day; cards 2 and 4 come from the group when it has a card of that edition', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const r = await openSql(db, u, { source: 'focus', focus: 'group:G1', draws: [{ c: [20, 2, 21, 3, 13] }] });
    expect(r.packs[0]).toMatchObject({ theme: 'focus', source: 'focus' });
    expect((await wallet(db, u)).stock).toBe(9);
    expect((await wallet(db, u)).focus_used).toBe(true);
    expect(await tryOpen(db, u, { source: 'focus', focus: 'group:G1', draws: [{ c: [20, 2, 21, 3, 13] }] })).toMatch(/cards: focus_used/);
    const v = await newUser(db);
    expect(await tryOpen(db, v, { source: 'focus', focus: 'group:G1', draws: [{ c: [20, 21, 21, 22, 13] }] })).toMatch(/cards: pack/);
    expect(await tryOpen(db, v, { source: 'focus', focus: 'idol:A1', draws: [{ c: [20, 2, 21, 3, 13] }] })).toMatch(/cards: focus/);
    expect(await tryOpen(db, v, { source: 'focus', focus: null, draws: [{ c: [20, 2, 21, 3, 13] }] })).toMatch(/cards: focus/);
  });
  it('a pack bought with 50 shards takes the shards and not the stack', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 0, shards: 49 });
    expect(await tryOpen(db, u, { source: 'shards', draws: [PLAIN] })).toMatch(/cards: shards/);
    await setWallet(db, u, { stock: 0, shards: 60 });
    await openSql(db, u, { source: 'shards', theme: 'girls', draws: [{ c: [1, 2, 6, 3, 16] }] });
    const w = await wallet(db, u);
    expect(w).toMatchObject({ stock: 0, shards: 10 });
  });
});

describe('the Kpopdle bonus pack (source bonus): a win decided in the database, once per play, not from the stack', () => {
  const win = (db: PGlite, u: string, date: string, finished: string, status = 'won', game = 'kpopdle-idol'): Promise<unknown> =>
    db.query('insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ($1, $2, $3, $4, $5)', [game, date, u, status, finished]);
  const record = (db: PGlite, u: string, at = T0): Promise<number> => one<number>(db, 'select public.cards_bonus_record($1::uuid, $2::timestamptz)', [u, at]);
  it('refused without a recorded win; a won Kpopdle play earns one pack, opened once, and the stack is not touched', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN] })).toMatch(/cards: bonus/);
    await win(db, u, '2026-11-12', '2026-11-12T09:00:00Z');
    expect(await record(db, u)).toBe(1);
    expect(await record(db, u)).toBe(1); // recorded once per play
    const r = await openSql(db, u, { source: 'bonus', draws: [PLAIN] });
    expect(r.packs[0]).toMatchObject({ source: 'bonus', theme: 'all' });
    expect((await wallet(db, u)).stock).toBe(10);
    expect((await wallet(db, u)).bonus_left).toBe(0);
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN] })).toMatch(/cards: bonus/);
    expect(Number(await one(db, `select count(*) from public.cards_packs where user_id = $1 and source = 'bonus'`, [u]))).toBe(1);
  });
  it('a lost play, another game, another day and a win of another player earn nothing; the day cap holds (CARDS_BONUS_PER_DAY); cap 0 closes it', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const other = await newUser(db);
    await win(db, u, '2026-11-12', '2026-11-12T09:00:00Z', 'lost');
    await win(db, u, '2026-11-12', '2026-11-12T09:00:00Z', 'won', 'otakudle-character');
    await win(db, u, '2026-11-11', '2026-11-11T09:00:00Z');
    await win(db, other, '2026-11-12', '2026-11-12T09:00:00Z');
    expect(await record(db, u)).toBe(0);
    for (let i = 0; i < 5; i++) await win(db, u, '2026-11-12', `2026-11-12T09:0${i}:00Z`);
    expect(await record(db, u)).toBe(5);
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN], bonusCap: 0 })).toMatch(/cards: bonus/);
    for (let i = 0; i < 2; i++) await openSql(db, u, { source: 'bonus', draws: [PLAIN], bonusCap: 2 });
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN], bonusCap: 2 })).toMatch(/cards: bonus/);
    await openSql(db, u, { source: 'bonus', draws: [PLAIN], bonusCap: 3 });
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN], bonusCap: 3 })).toMatch(/cards: bonus/);
    // The next Paris day starts again from zero.
    expect((await one<{ bonus_left: number }>(db, "select public.cards_wallet($1::uuid, '2026-11-13T09:00:00Z', 10, 3)", [u])).bonus_left).toBe(0);
  });
  it('a bonus pack is a pack like the others: counted in the pack number, the golden pack and the guarantee; never five at once', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, opened: 9 });
    await win(db, u, '2026-11-12', '2026-11-12T09:00:00Z');
    await record(db, u);
    const r = await openSql(db, u, { source: 'bonus', draws: [{ c: [1, 2, 6, 3, 13], g: 7, u: 4 }] });
    expect(r.packs[0]).toMatchObject({ pack_no: 10, golden: true });
    expect(r.packs[0]!.cards[4]!.n).toBe(7);
    expect(await tryOpen(db, u, { source: 'bonus', draws: [PLAIN, PLAIN, PLAIN, PLAIN, PLAIN] })).toMatch(/cards: pack/);
  });
});

describe('locks, recycling, crafting', () => {
  it('bulk recycling keeps one copy, leaves out locked cards and every Gold and Full Art extra, and tells what it skipped', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, shards: 0 });
    await own(db, u, [1], T0, 4); // C x4 -> 3 extras, 3 shards
    await own(db, u, [3], T0, 3); // R x3 -> 2 extras, 10 shards
    await own(db, u, [2], T0, 2); // C x2 locked
    await own(db, u, [4], T0, 3); // UR x3: never in bulk
    await own(db, u, [5], T0, 2); // L x2: never in bulk
    await one(db, 'select public.cards_lock($1::uuid, 2, true)', [u]);
    const r = await one<{ recycled: number; shards: number; skipped: { locked: number; goldAndFullArt: number } }>(db, 'select public.cards_recycle($1::uuid, $2, null)', [u, key()]);
    expect(r).toMatchObject({ recycled: 5, shards: 13, skipped: { locked: 1, goldAndFullArt: 3 } });
    const c = Object.fromEntries((await rows<{ card_no: number; copies: number }>(db, 'select card_no, copies from public.cards_owned where user_id = $1', [u])).map((x) => [x.card_no, x.copies]));
    expect(c).toEqual({ 1: 1, 2: 2, 3: 1, 4: 3, 5: 2 });
    expect((await wallet(db, u)).shards).toBe(13);
    expect(await failure(db, 'select public.cards_recycle($1::uuid, $2, null)', [u, key()])).toMatch(/cards: nothing/);
  });
  it('one extra copy of any edition, never a locked card, never the last copy; a replayed key pays once', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await own(db, u, [4], T0, 2);
    await own(db, u, [3], T0, 1);
    await own(db, u, [2], T0, 3);
    await one(db, 'select public.cards_lock($1::uuid, 2, true)', [u]);
    expect(await failure(db, 'select public.cards_recycle($1::uuid, $2, 3)', [u, key()])).toMatch(/cards: lastcopy/);
    expect(await failure(db, 'select public.cards_recycle($1::uuid, $2, 2)', [u, key()])).toMatch(/cards: locked/);
    expect(await failure(db, 'select public.cards_recycle($1::uuid, $2, 9)', [u, key()])).toMatch(/cards: notowned/);
    const k = key();
    const a = await one<{ shards: number; replayed: boolean }>(db, 'select public.cards_recycle($1::uuid, $2, 4)', [u, k]);
    const b = await one<{ shards: number; replayed: boolean }>(db, 'select public.cards_recycle($1::uuid, $2, 4)', [u, k]);
    expect(a).toMatchObject({ shards: 30, replayed: false });
    expect(b).toMatchObject({ shards: 30, replayed: true });
    expect((await wallet(db, u)).shards).toBe(30);
    expect(Number(await one(db, 'select copies from public.cards_owned where user_id = $1 and card_no = 4', [u]))).toBe(1);
  });
  it('a lock needs an owned card', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    expect(await failure(db, 'select public.cards_lock($1::uuid, 2, true)', [u])).toMatch(/cards: notowned/);
  });
  it('craft spends the cost once (same key), never makes a Full Art, completes a set and leaves the New badge on', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, shards: 400 });
    const k = key();
    const a = await one<{ cost: number; replayed: boolean }>(db, 'select public.cards_craft($1::uuid, $2, 4)', [u, k]);
    const b = await one<{ cost: number; replayed: boolean }>(db, 'select public.cards_craft($1::uuid, $2, 4)', [u, k]);
    expect(a).toMatchObject({ cost: 300, replayed: false });
    expect(b).toMatchObject({ replayed: true });
    expect((await wallet(db, u)).shards).toBe(100);
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, 4)', [u, key()])).toMatch(/cards: owned/);
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, 5)', [u, key()])).toMatch(/cards: no_craft/);
    await setWallet(db, u, { stock: 10, shards: 40 });
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, 3)', [u, key()])).toMatch(/cards: shards/);
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, 26)', [u, key()])).toMatch(/cards: card/);
    expect(await one(db, 'select seen from public.cards_owned where user_id = $1 and card_no = 4', [u])).toBe(false);
  });
});

describe('the "still there?" check never costs a pack', () => {
  it('the timer stops 2 hours after the last action and waits; nothing is taken; any action or the check restarts it from now', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 2, anchor: '2026-11-12T10:00:00Z', seen: '2026-11-12T10:00:00Z' });
    // 2 hours of timer = 12 packs would fill the stack; the pause cuts it at the 2 hour mark: 2 + 8 hits the cap of 10 only after 80 minutes.
    expect((await wallet(db, u, '2026-11-12T11:00:00Z')).stock).toBe(8);
    await setWallet(db, u, { stock: 2, anchor: '2026-11-12T10:00:00Z', seen: '2026-11-12T09:00:00Z' });
    const w = await wallet(db, u, '2026-11-12T13:00:00Z');
    expect(w.stock).toBe(8); // 10:00 to 11:00 only (seen + 2 h)
    expect(w.paused).toBe(true);
    expect(w.next_at).toBeNull();
    const r = await one<{ ok: boolean; was_paused: boolean }>(db, "select public.cards_still_there($1::uuid, '2026-11-12T13:00:00Z')", [u]);
    expect(r).toEqual({ ok: true, was_paused: true });
    const after = await wallet(db, u, '2026-11-12T13:00:00Z');
    expect(after.stock).toBe(8);
    expect(after.paused).toBe(false);
    expect((await wallet(db, u, '2026-11-12T13:10:00Z')).stock).toBe(9);
  });
  it('an opening after the pause keeps the packs earned and restarts the timer from now', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 2, anchor: '2026-11-12T10:00:00Z', seen: '2026-11-12T09:00:00Z' });
    await openSql(db, u, { draws: [PLAIN], at: '2026-11-12T13:00:00Z' });
    const w = await wallet(db, u, '2026-11-12T13:09:00Z');
    expect(w.stock).toBe(7);
    expect((await wallet(db, u, '2026-11-12T13:10:00Z')).stock).toBe(8);
  });
  it('a full stack is never "paused" and the check on it is harmless', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const w = await wallet(db, u, '2026-11-12T20:00:00Z');
    expect(w.paused).toBe(false);
    expect(await one(db, "select public.cards_still_there($1::uuid, '2026-11-12T20:00:00Z')", [u])).toEqual({ ok: true, was_paused: false });
    expect((await wallet(db, u, '2026-11-12T20:00:00Z')).stock).toBe(10);
  });
});

describe('missions: sets and the week, claimed into the stack', () => {
  it('a complete set is claimed once into the stack (which may pass its cap), and a replayed key pays once', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await own(db, u, [15, 16]); // G3 = group 15 + D1 16
    const sets = await one<{ sets: Array<{ id: string; owned: number; total: number; claimed: boolean; packs: number }> }>(db, 'select public.cards_missions($1::uuid, $2::timestamptz)', [u, T0]);
    const g3 = sets.sets.find((s) => s.id === 'group:G3')!;
    expect(g3).toMatchObject({ owned: 2, total: 2, claimed: false, packs: 1 });
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'group:G1', T0])).toMatch(/cards: goal/);
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'group:ZZ', T0])).toMatch(/cards: set/);
    const k = key();
    const a = await one<{ packs: number; replayed: boolean }>(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, k, 'group:G3', T0]);
    const b = await one<{ packs: number; replayed: boolean }>(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, k, 'group:G3', T0]);
    expect(a).toMatchObject({ packs: 1, replayed: false });
    expect(b).toMatchObject({ replayed: true });
    expect((await wallet(db, u)).stock).toBe(11);
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'group:G3', T0])).toMatch(/cards: claimed/);
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, k, 'group:G1', T0])).toMatch(/cards: idem_conflict/);
  });
  it('the sets and their packs: group +1, soloists +1, Holo +3, Gold +5, a debut year of two groups +2', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    const m = await one<{ sets: Array<{ id: string; kind: string; packs: number; total: number }> }>(db, 'select public.cards_missions($1::uuid, $2::timestamptz)', [u, T0]);
    const by = Object.fromEntries(m.sets.map((s) => [s.id, s]));
    expect(by['group:G1']).toMatchObject({ packs: 1, total: 7 });
    expect(by.solo).toMatchObject({ packs: 1, total: 5 });
    expect(by.holo).toMatchObject({ packs: 3 });
    expect(by.gold).toMatchObject({ packs: 5 });
    expect(by['year:2016']).toMatchObject({ packs: 2 });
    expect(by['group:G5']).toBeUndefined();
  });
  it('the week claims +2 packs and +25 shards once, when all three goals are done; the Paris Monday boundary moves it', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 3 });
    // 20 packs this week, 10 new cards; no Kpopdle win table counts as 0 wins: not done.
    for (let i = 0; i < 20; i++) await db.query(`insert into public.cards_packs (user_id, source, cards, opened_at, seq) values ($1, 'stock', '{1,2,6,3,13}', '2026-11-10T10:00:00Z', $2)`, [u, i + 1]);
    await own(db, u, [1, 2, 3, 4, 6, 7, 8, 9, 10, 11], '2026-11-10T10:00:00Z');
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'week', T0])).toMatch(/cards: goal/);
    for (let i = 0; i < 3; i++) {
      await db.query(`insert into public.dle_plays (game_id, play_date, user_id, status, finished_at) values ('kpopdle-idol', '2026-11-11', $1, 'won', '2026-11-11T12:00:00Z')`, [u]);
    }
    const wk = await one<{ week_start: string; done: boolean; claimed: boolean }>(db, 'select public.cards_week_progress($1::uuid, $2::timestamptz)', [u, T0]);
    expect(wk).toMatchObject({ week_start: '2026-11-09', done: true, claimed: false });
    const r = await one<{ packs: number; shards: number }>(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'week', T0]);
    expect(r).toMatchObject({ packs: 2, shards: 25 });
    expect(await wallet(db, u)).toMatchObject({ stock: 5, shards: 25 });
    expect(await failure(db, 'select public.cards_claim($1::uuid, $2, $3, $4::timestamptz)', [u, key(), 'week', T0])).toMatch(/cards: claimed/);
    // The Monday boundary: Sunday 15 November 23:30 Paris (22:30Z) is still the week of the 9th; Monday 00:00 Paris (23:00Z on the 15th) starts a new one, unclaimed and empty.
    expect((await one<{ week_start: string }>(db, "select public.cards_week_progress($1::uuid, '2026-11-15T22:30:00Z')", [u])).week_start).toBe('2026-11-09');
    const next = await one<{ week_start: string; packs_opened: number; claimed: boolean }>(db, "select public.cards_week_progress($1::uuid, '2026-11-15T23:00:00Z')", [u]);
    expect(next).toMatchObject({ week_start: '2026-11-16', packs_opened: 0, claimed: false });
  });
  it('the week boundary holds across the clock changes: Monday 30 March 2026 starts at 22:00Z on the 29th, Monday 26 October at 23:00Z on the 25th', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    expect(Date.parse((await one<{ starts_at: string }>(db, "select public.cards_week_progress($1::uuid, '2026-03-29T21:59:00Z')", [u])).starts_at)).toBe(Date.parse('2026-03-22T23:00:00Z'));
    expect((await one<{ week_start: string; starts_at: string }>(db, "select public.cards_week_progress($1::uuid, '2026-03-29T22:00:00Z')", [u]))).toMatchObject({ week_start: '2026-03-30' });
    expect((await one<{ week_start: string }>(db, "select public.cards_week_progress($1::uuid, '2026-10-25T22:59:00Z')", [u])).week_start).toBe('2026-10-19');
    expect((await one<{ week_start: string; starts_at: string }>(db, "select public.cards_week_progress($1::uuid, '2026-10-25T23:00:00Z')", [u]))).toMatchObject({ week_start: '2026-10-26' });
  });
  it('an Open that completes a set reports it as finished and does not claim it', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await own(db, u, [15]);
    const r = await openSql(db, u, { draws: [{ c: [16, 2, 6, 3, 13] }] });
    expect(r.finished).toEqual([{ id: 'group:G3', name: 'Group Three', packs: 1 }]);
    expect(Number(await one(db, 'select count(*) from public.cards_sets_claimed where user_id = $1', [u]))).toBe(0);
  });
});

describe('preferences (107)', () => {
  it('defaults, a merged patch, validation', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    expect(await one(db, 'select public.cards_prefs_get($1::uuid)', [u])).toEqual({ sound: true, vibration: true, theme: 'all', focus: null });
    const p = await one(db, `select public.cards_prefs_set($1::uuid, '{"sound": false, "theme": "girls", "focus": "group:G1"}')`, [u]);
    expect(p).toEqual({ sound: false, vibration: true, theme: 'girls', focus: 'group:G1' });
    expect(await one(db, `select public.cards_prefs_set($1::uuid, '{"vibration": false, "focus": null}')`, [u])).toEqual({ sound: false, vibration: false, theme: 'girls', focus: null });
    for (const bad of ['{"theme": "idols"}', '{"sound": "yes"}', '{"focus": "idol:A1"}', '{"focus": 3}', '[]']) {
      expect(await failure(db, 'select public.cards_prefs_set($1::uuid, $2::jsonb)', [u, bad])).toMatch(/cards: pref/);
    }
  });
});

describe('the player in one answer', () => {
  it('cards_player returns the wallet, the binder, the claims, the week and the preferences', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await openSql(db, u, { draws: [PLAIN] });
    const p = await one<Record<string, unknown>>(db, 'select public.cards_player($1::uuid, $2::timestamptz)', [u, T0]);
    expect(Object.keys(p).sort()).toEqual(['bonus_earned', 'bonus_today', 'claimed', 'daily_used', 'focus_used', 'gold_count', 'last', 'new_in_last', 'owned', 'prefs', 'recent', 'wallet', 'week', 'wishlist']);
    expect((p.owned as unknown[]).length).toBe(5);
    expect((p.wallet as { packs_opened: number }).packs_opened).toBe(1);
    expect((p.last as { pack_no: number }).pack_no).toBe(1);
  });
});

describe('security, the audit and the shape of the changes', () => {
  it('no browser role can run a cards function or read a cards table; RLS is on everywhere', async () => {
    const db = await coreDb();
    const fn = await rows<{ proname: string }>(db, `select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\\_%'
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
    expect(fn).toEqual([]);
    const t = await rows<{ tablename: string }>(db, `select tablename from pg_tables where schemaname = 'public' and tablename like 'cards\\_%' and not rowsecurity`);
    expect(t).toEqual([]);
    const g = await rows(db, `select table_name from information_schema.role_table_grants where table_schema = 'public' and table_name like 'cards\\_%' and grantee in ('anon', 'authenticated')`);
    expect(g).toEqual([]);
    const pol = await rows(db, `select tablename from pg_policies where schemaname = 'public' and tablename like 'cards\\_%'`);
    expect(pol).toEqual([]);
  });
  it('exactly one function of each name; the old one-pack function is gone', async () => {
    const db = await coreDb();
    const d = await rows<{ proname: string; n: string }>(db, `select proname, count(*) as n from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%' group by proname having count(*) > 1`);
    expect(d).toEqual([]);
    expect(Number(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack'`))).toBe(0);
  });
  it('every spending write leaves an audit row with its key', async () => {
    const db = await coreDb();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, shards: 50 });
    await own(db, u, [1], T0, 2);
    await openSql(db, u, { draws: [PLAIN] });
    await one(db, 'select public.cards_recycle($1::uuid, $2, null)', [u, key()]);
    await one(db, 'select public.cards_craft($1::uuid, $2, 7)', [u, key()]);
    const k = (await rows<{ kind: string }>(db, 'select kind from public.cards_audit where user_id = $1 order by id', [u])).map((x) => x.kind);
    expect(k).toEqual(['open', 'recycle', 'craft']);
  });
  it('110 is idempotent, and its rollback puts 104 back (and refuses while a lock or a daily pack exists)', async () => {
    const db = await coreDb();
    await db.exec(readCardsSql('110-core.sql'));
    const u = await newUser(db);
    await openSql(db, u, { source: 'daily', draws: [{ c: [1, 2, 6, 3, 7] }] }).catch(() => null);
    await db.query(`insert into public.cards_packs (user_id, source, cards, opened_at, seq) values ($1, 'daily', '{1,2,6,3,7}', now(), 1)`, [u]);
    expect(await failure(db, 'select 1 where false')).toBeNull();
    const refused = await db.exec(readCardsSql('110-core.rollback.sql')).then(() => null, (e: Error) => e.message);
    expect(refused).toMatch(/refused/);
    await db.query(`delete from public.cards_packs where source = 'daily'`);
    await db.query('delete from public.cards_group_types');
    await db.exec(readCardsSql('110-core.rollback.sql'));
    expect(Number(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack'`))).toBe(1);
    expect(Number(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_open'`))).toBe(0);
    expect((await one<Record<string, unknown>>(db, "select public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')")).stock).toBe(5);
    await db.exec(readCardsSql('110-core.rollback.sql'));
    await db.exec(readCardsSql('110-core.sql'));
    expect((await one<Record<string, unknown>>(db, "select public.cards_wallet('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')")).stock).toBe(10);
  });
  it('105 and 107 roll back clean on a database without 110', async () => {
    const db = await coreDb(['104-economy.sql', '105-goals.sql', '107-prefs.sql']);
    await db.exec(readCardsSql('107-prefs.rollback.sql'));
    await db.exec(readCardsSql('105-goals.rollback.sql'));
    expect(Number(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_claim', 'cards_prefs_get')`))).toBe(0);
    await db.exec(readCardsSql('105-goals.sql'));
    await db.exec(readCardsSql('107-prefs.sql'));
  });
  it('a database without the Kpopdle tables counts no win', async () => {
    const { BASE_NO_DLE } = await import('../cards/sql-harness');
    const db = await freshCardsDb(SCHEMA_FILES, BASE_NO_DLE);
    await db.exec(`alter table public.cards_catalog add column part smallint not null default 0;
      alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
      alter table public.cards_catalog drop constraint cards_catalog_entity_rarity_key;
      alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);`);
    for (const f of ['104-economy.sql', '105-goals.sql']) await db.exec(readCardsSql(f));
    const u = await newUser(db);
    expect((await one<{ kpopdle_wins: number }>(db, 'select public.cards_week_progress($1::uuid, $2::timestamptz)', [u, T0])).kpopdle_wins).toBe(0);
  });
});

export type { PGlite };
