// KpopCards: the proofs of 111 (group types) and 112 (friends by one-time code, the ranking by completion, player pages) on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { CARDS_SQL, readCardsSql } from '../cards/sql-harness';
import { T0, coreDb, failure, key, newUser, one, own, rows } from './sql-fixture';

import type { PGlite } from '@electric-sql/pglite';

const PROFILES = `create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique not null);`;

async function socialDb(): Promise<PGlite> {
  const db = await coreDb();
  await db.exec(PROFILES);
  await db.exec(readCardsSql('112-social.sql'));
  return db;
}
async function player(db: PGlite, name: string): Promise<string> {
  const u = await newUser(db);
  await db.query('insert into public.profiles values ($1, $2)', [u, name]);
  return u;
}
const code = (db: PGlite, u: string, c: string, at = T0): Promise<{ code: string }> => one(db, 'select public.cards_friend_code_new($1::uuid, $2, $3::timestamptz)', [u, c, at]);
const redeem = (db: PGlite, u: string, c: string, at = T0, k = key()): Promise<{ ok: boolean; error?: string; nickname?: string; replayed?: boolean }> =>
  one(db, 'select public.cards_friend_redeem($1::uuid, $2, $3, $4::timestamptz)', [u, k, c, at]);

describe('the 111 and 112 files are one DO block', () => {
  it.each([['111-group-types.sql', 'c111'], ['111-group-types.rollback.sql', 'c111r'], ['112-social.sql', 'c112'], ['112-social.rollback.sql', 'c112r'], ['113-moment.sql', 'c113'], ['113-moment.rollback.sql', 'c113r']])('%s', (file, tag) => {
    const sql = readFileSync(path.join(CARDS_SQL, file), 'utf8');
    const outer = `$${tag}$`;
    const code2 = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code2.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code2.endsWith(`end ${outer};`)).toBe(true);
    expect(code2.split(outer).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(sql).toMatch(/^-- Undo: /m);
    for (const k of ['What:', 'Why:', 'Rows:']) expect(sql).toContain(`-- ${k}`);
    expect(sql).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    expect(code2).not.toMatch(/\b(award_xp|xp_total|streak|random\(\)|setseed)\b/i);
  });
});

describe('111: the group types, two sources each', () => {
  it('writes a row for each group that exists, none for the others, and a second run changes nothing', async () => {
    const db = await coreDb();
    await db.query("delete from public.cards_group_types");
    await db.exec(`insert into public.cards_entities (id, kind, name, sort_key) values ('group:apink', 'group', 'Apink', 'apink'), ('group:astro', 'group', 'ASTRO', 'astro'), ('group:akmu', 'group', 'AKMU', 'akmu'), ('group:day6', 'group', 'DAY6', 'day6');`);
    await db.exec(readCardsSql('111-group-types.sql'));
    const r = await rows<{ entity_id: string; gender: string }>(db, 'select entity_id, gender from public.cards_group_types order by entity_id');
    expect(r).toEqual([{ entity_id: 'group:akmu', gender: 'mixed' }, { entity_id: 'group:apink', gender: 'girl' }, { entity_id: 'group:astro', gender: 'boy' }]);
    await db.exec(readCardsSql('111-group-types.sql'));
    expect(Number(await one(db, 'select count(*) from public.cards_group_types'))).toBe(3);
    expect(Number(await one(db, "select count(*) from public.cards_group_types where source_a = source_b or length(source_a) < 20 or length(source_b) < 20"))).toBe(0);
    await db.exec(readCardsSql('111-group-types.rollback.sql'));
    expect(Number(await one(db, 'select count(*) from public.cards_group_types'))).toBe(0);
  });
  it('every row names two different sources and a type that is girl, boy or mixed (the file as shipped)', () => {
    const sql = readCardsSql('111-group-types.sql');
    const rowsIn = [...sql.matchAll(/\('group:([a-z0-9-]+)', '(girl|boy|mixed)', '([^']*(?:''[^']*)*)', '([^']*(?:''[^']*)*)'\)/g)];
    expect(rowsIn.length).toBeGreaterThanOrEqual(40);
    const slugs = rowsIn.map((m) => m[1]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const m of rowsIn) {
      expect(m[3]).toMatch(/^en\.wikipedia\.org short description/);
      expect(m[4]).toMatch(/^(Wikidata item Q\d+, instance of Q(641066|216337) \((girl group|boy band)\)|[a-z]{2}\.wikipedia\.org short description ")/);
      // The two sources agree with the type written.
      if (m[2] === 'girl') expect(m[3]! + m[4]!).toMatch(/girl group|걸|ガール/i);
      if (m[2] === 'boy') expect(m[3]! + m[4]!).toMatch(/boy (band|group)|보이|ボーイ/i);
    }
    expect(slugs).not.toContain('day6');
    expect(slugs).not.toContain('team');
  });
});

describe('112: friends by one-time code', () => {
  it('a code works once for one friend, makes both friends, and the wishlist is visible to friends only', async () => {
    const db = await socialDb();
    const a = await player(db, 'alice');
    const b = await player(db, 'bobby');
    const c = await player(db, 'carol');
    await code(db, a, 'ABCD2345');
    const bad = await redeem(db, b, 'ZZZZ2345');
    expect(bad).toEqual({ ok: false, error: 'code_invalid' });
    const ok = await redeem(db, b, 'abcd-2345');
    expect(ok).toMatchObject({ ok: true, nickname: 'alice', replayed: false });
    expect(await redeem(db, c, 'ABCD2345')).toEqual({ ok: false, error: 'code_used' });
    const fa = await one<{ friends: Array<{ nickname: string }> }>(db, 'select public.cards_friends($1::uuid)', [a]);
    const fb = await one<{ friends: Array<{ nickname: string }> }>(db, 'select public.cards_friends($1::uuid)', [b]);
    expect(fa.friends.map((f) => f.nickname)).toEqual(['bobby']);
    expect(fb.friends.map((f) => f.nickname)).toEqual(['alice']);
    await db.query('insert into public.cards_wishlist (user_id, card_no) values ($1, 3), ($1, 4)', [a]);
    const seenByFriend = await one<{ wishlist: number[] | null; friend: boolean }>(db, 'select public.cards_profile($1::uuid, $2)', [b, 'alice']);
    expect(seenByFriend).toMatchObject({ friend: true, wishlist: [3, 4] });
    const seenByOther = await one<{ wishlist: number[] | null; friend: boolean }>(db, 'select public.cards_profile($1::uuid, $2)', [c, 'alice']);
    expect(seenByOther).toMatchObject({ friend: false, wishlist: null });
    const mine = await one<{ wishlist: number[] | null; me: boolean }>(db, 'select public.cards_profile($1::uuid, $2)', [a, 'alice']);
    expect(mine).toMatchObject({ me: true, wishlist: [3, 4] });
    expect(await one(db, "select public.cards_profile($1::uuid, 'nobody')", [a])).toBeNull();
    expect(await one(db, 'select public.cards_friend_remove($1::uuid, $2)', [a, 'bobby'])).toBe(true);
    expect((await one<{ friends: unknown[] }>(db, 'select public.cards_friends($1::uuid)', [b])).friends).toEqual([]);
  });
  it('an expired code, your own code, an existing friend, a replayed key and a new code that replaces the old one', async () => {
    const db = await socialDb();
    const a = await player(db, 'alice');
    const b = await player(db, 'bobby');
    await code(db, a, 'AAAA1111', '2026-11-12T10:00:00Z');
    expect(await redeem(db, b, 'AAAA1111', '2026-11-13T10:00:01Z')).toEqual({ ok: false, error: 'code_expired' });
    expect(await redeem(db, a, 'AAAA1111', '2026-11-12T11:00:00Z')).toEqual({ ok: false, error: 'self' });
    await code(db, a, 'BBBB2222', '2026-11-12T12:00:00Z');
    expect(await redeem(db, b, 'AAAA1111', '2026-11-12T12:01:00Z')).toEqual({ ok: false, error: 'code_invalid' });
    const k = key();
    const first = await redeem(db, b, 'BBBB2222', '2026-11-12T12:02:00Z', k);
    const again = await redeem(db, b, 'BBBB2222', '2026-11-12T12:03:00Z', k);
    expect(first.ok).toBe(true);
    expect(again).toMatchObject({ ok: true, replayed: true });
    await code(db, a, 'CCCC3333', '2026-11-12T12:05:00Z');
    expect(await redeem(db, b, 'CCCC3333', '2026-11-12T12:06:00Z')).toEqual({ ok: false, error: 'already' });
    expect(Number(await one(db, 'select count(*) from public.cards_friends'))).toBe(2);
    expect(Number(await one(db, 'select count(*) from public.cards_friend_codes where user_id = $1 and used_at is null', [a]))).toBe(1);
  });
  it('wrong tries are counted: the 9th try in 10 minutes answers "rate", a good code included', async () => {
    const db = await socialDb();
    const a = await player(db, 'alice');
    const b = await player(db, 'bobby');
    await code(db, a, 'GJKM1234');
    for (let i = 0; i < 8; i++) expect(await redeem(db, b, `NOPE000${i}`)).toEqual({ ok: false, error: 'code_invalid' });
    expect(await redeem(db, b, 'GJKM1234')).toEqual({ ok: false, error: 'rate' });
    expect((await redeem(db, b, 'GJKM1234', '2026-11-12T10:11:00Z')).ok).toBe(true);
  });
  it('a player without a nickname cannot make or use a code; the friend limit is 100', async () => {
    const db = await socialDb();
    const nameless = await newUser(db);
    expect(await failure(db, 'select public.cards_friend_code_new($1::uuid, $2)', [nameless, 'ABCD1234'])).toMatch(/cards: nickname/);
    expect(await failure(db, 'select public.cards_friend_redeem($1::uuid, $2, $3)', [nameless, key(), 'ABCD1234'])).toMatch(/cards: nickname/);
    expect(await failure(db, 'select public.cards_friend_code_new($1::uuid, $2)', [await player(db, 'dora'), 'bad'])).toMatch(/cards: code/);
    const a = await player(db, 'alice');
    const b = await player(db, 'bobby');
    await db.query(`insert into auth.users select gen_random_uuid() from generate_series(1, 100)`);
    await db.query(`insert into public.cards_friends (user_id, friend_id) select $1::uuid, u.id from (select id from auth.users where id not in ($1::uuid, $2::uuid) limit 100) u`, [a, b]);
    await code(db, b, 'FKKM1234');
    expect(await redeem(db, a, 'FKKM1234')).toEqual({ ok: false, error: 'friend_limit' });
  });
});

describe('112: the ranking is by completion only', () => {
  it('orders by distinct cards owned, never by packs opened; friends scope is the friends and himself; all scope skips players with no card', async () => {
    const db = await socialDb();
    const a = await player(db, 'alice'); // 3 cards, 40 packs opened
    const b = await player(db, 'bobby'); // 6 cards, 2 packs opened
    const c = await player(db, 'carol'); // 6 cards too (ties by nickname)
    const d = await player(db, 'dave'); // no card
    await own(db, a, [1, 2, 3]);
    await own(db, b, [1, 2, 3, 4, 6, 7]);
    await own(db, c, [8, 9, 10, 11, 12, 13]);
    await db.query(`insert into public.cards_wallets (user_id, stock, anchor, paris_day, packs_opened) values ($1, 5, now(), current_date, 40), ($2, 5, now(), current_date, 2)`, [a, b]);
    const all = await one<Array<{ nickname: string; owned: number }>>(db, "select public.cards_ranking($1::uuid, 'all')", [a]);
    expect(all.map((r) => [r.nickname, r.owned])).toEqual([['bobby', 6], ['carol', 6], ['alice', 3]]);
    expect(all.map((r) => r.nickname)).not.toContain('dave');
    await code(db, a, 'AAAA1111');
    await redeem(db, c, 'AAAA1111');
    const fr = await one<Array<{ nickname: string; me: boolean; friend: boolean }>>(db, "select public.cards_ranking($1::uuid, 'friends')", [a]);
    expect(fr.map((r) => r.nickname)).toEqual(['carol', 'alice']);
    expect(fr.find((r) => r.me)?.nickname).toBe('alice');
    expect(fr.find((r) => r.friend)?.nickname).toBe('carol');
    expect(await failure(db, "select public.cards_ranking($1::uuid, 'packs')", [a])).toMatch(/cards: scope/);
    void d;
  });
  it('the player page: a showcase of starred cards first then the best, and the earned badges', async () => {
    const db = await socialDb();
    const a = await player(db, 'alice');
    await db.query(`insert into public.cards_wallets (user_id, stock, anchor, paris_day, created_at) values ($1, 5, now(), current_date, '2026-11-01T00:00:00Z')`, [a]);
    // Group Three complete (15, 16), First Gold (4), First Full Art (5); card 2 is starred.
    await own(db, a, [2, 3, 4, 5, 15, 16]);
    await db.query('update public.cards_owned set favorite = true where user_id = $1 and card_no = 2', [a]);
    const p = await one<{ showcase: number[]; badges: string[]; owned: number }>(db, "select public.cards_profile($1::uuid, 'alice')", [a]);
    expect(p.showcase).toEqual([2, 5, 4]);
    expect(p.badges).toEqual(['Founder', 'Group Three complete', 'First Gold', 'First Full Art']);
    expect(p.owned).toBe(6);
  });
});

describe('113: the moment of a card', () => {
  it('the photo event with its precision, the first copy (pack, craft), and the quiz slug of the idol else of its group', async () => {
    const db = await coreDb();
    await db.exec("create table public.groups (id serial primary key, slug text unique not null);");
    await db.exec(readCardsSql('113-moment.sql'));
    await db.exec(readCardsSql('113-moment.sql'));
    const u = await newUser(db);
    await db.query("insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, event_name, event_date, status) values ('idol:A1', 1, 'commons', 'p', 'f', 'a', 'CC BY 4.0', 'l', false, '2026-11-01', 'KCON, Los Angeles', '2019-08-17', 'approved')");
    await db.query("update public.cards_catalog set photo_id = (select id from public.cards_photos limit 1) where card_no = 2");
    await db.query("insert into public.groups (slug) values ('G1'), ('A1')");
    // Not owned: the event shows, "yours" is null.
    const m0 = await one<{ event: { name: string; date: string; precision: string }; yours: unknown; quiz_slug: string }>(db, 'select public.cards_moment($1::uuid, 2)', [u]);
    expect(m0.event).toEqual({ name: 'KCON, Los Angeles', date: '2019-08-17', precision: 'day' });
    expect(m0.yours).toBeNull();
    expect(m0.quiz_slug).toBe('A1');
    await db.query("update public.cards_photos set event_precision = 'month'");
    await db.query("insert into public.cards_owned (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source) values ($1, 2, 3, '2026-11-02T10:00:00Z', now(), 12, 'pack'), ($1, 3, 1, '2026-11-03T10:00:00Z', now(), null, 'craft')", [u]);
    const m1 = await one<{ event: { precision: string }; yours: { pack_no: number; how: string; copies: number } }>(db, 'select public.cards_moment($1::uuid, 2)', [u]);
    expect(m1.event.precision).toBe('month');
    expect(m1.yours).toMatchObject({ pack_no: 12, how: 'pack', copies: 3 });
    const m2 = await one<{ event: unknown; yours: { how: string }; quiz_slug: string }>(db, 'select public.cards_moment($1::uuid, 3)', [u]);
    expect(m2.event).toBeNull();
    expect(m2.yours.how).toBe('craft');
    expect(await failure(db, 'select public.cards_moment($1::uuid, 26)', [u])).toMatch(/cards: card/);
    // No quiz page for the idol or its group: the link is hidden.
    await db.query("delete from public.groups");
    expect((await one<{ quiz_slug: string | null }>(db, 'select public.cards_moment($1::uuid, 2)', [u])).quiz_slug).toBeNull();
    await db.exec(readCardsSql('113-moment.rollback.sql'));
    expect(Number(await one(db, "select count(*) from pg_proc where proname = 'cards_moment'"))).toBe(0);
  });
});
