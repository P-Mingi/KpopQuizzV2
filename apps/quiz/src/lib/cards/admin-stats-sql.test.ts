// KpopCards launch (2026-11-23): proof of docs/pending-migrations/cards/128-admin-stats.sql (cards_admin_stats, the figures behind the KpopCards tab of the
// admin) on PGlite, on the state production has (the bundle, 116 to 118, 120, 121, 125). Players with known packs, ads, cards, crafts and recycles: every
// figure, every filter, every sort, the whitelist, the privacy of the answer, the browser roles, the rollback and a second run.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { newUser } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, failure, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const UP = '128-admin-stats.sql';
const DOWN = '128-admin-stats.rollback.sql';
const FN = 'public.cards_admin_stats(text, text, text, integer, text, text, integer, integer)';
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
type Db = Awaited<ReturnType<typeof prodDb>>;

interface Row {
  username: string | null; first_seen: string; last_seen: string; last_pack: string | null; level: number; packs: number; packs_7d: number;
  src_stock: number; src_focus: number; src_daily: number; src_shards: number; src_bonus: number; src_ad: number; golden: number; guarantee: number;
  cards: number; cards_in_packs: number; pct: number; copies: number; dupes: number; shards: number; ads: number; crafted: number; recycled: number;
}
interface Answer {
  totals: { players: number; packs_total: number; packs_today: number; packs_7d: number; ads_total: number; ads_today: number; cards_in_packs: number; avg_pct: number };
  total: number; rows: Row[]; limit: number; offset: number; at: string;
}
interface Args { search?: string | null; window?: string; ads?: string; min?: number; sort?: string; dir?: string; limit?: number; offset?: number }
const stats = (db: Db, a: Args = {}): Promise<Answer> =>
  one<Answer>(db, `select public.cards_admin_stats($1, $2, $3, $4, $5, $6, $7, $8)`,
    [a.search ?? null, a.window ?? 'all', a.ads ?? 'any', a.min ?? 0, a.sort ?? 'packs', a.dir ?? 'desc', a.limit ?? 50, a.offset ?? 0]);
const names = (r: Answer): Array<string | null> => r.rows.map((x) => x.username);

async function before(): Promise<Db> {
  const db = await prodDb();
  await run(db, build([]).sql);
  for (const f of ['120-cap-7.sql', '121-ad-packs.sql', '125-cap-5.sql']) await run(db, rd(f));
  return db;
}

const pack = (u: string, source: string, ago: string, o: { focus?: string; golden?: boolean; guarantee?: boolean } = {}): string =>
  `insert into public.cards_packs (user_id, source, cards, opened_at, focus, golden, guarantee) values ('${u}', '${source}', array[1,2,3,4,5], now() - interval '${ago}',
   ${o.focus ? `'${o.focus}'` : 'null'}, ${o.golden ?? false}, ${o.guarantee ?? false});`;
const wal = (u: string, created: string, seen: string, shards: number): string =>
  `insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards, created_at, seen_at) values ('${u}', 5, now(), (now() at time zone 'Europe/Paris')::date, ${shards}, now() - interval '${created}', now() - interval '${seen}')
   on conflict (user_id) do update set shards = excluded.shards, created_at = excluded.created_at, seen_at = excluded.seen_at;`;
const ev = (u: string, tx: string, granted: boolean, ago: string): string =>
  `insert into public.cards_ad_events (transaction_id, ticket_id, user_id, paris_day, granted, reason, ad_unit, created_at)
   values ('${tx}', gen_random_uuid(), '${u}', (now() at time zone 'Europe/Paris')::date, ${granted}, ${granted ? 'null' : "'daily_cap'"}, 'u', now() - interval '${ago}');`;
const audit = (u: string, kind: string, detail: string, ago: string): string =>
  `insert into public.cards_audit (user_id, kind, detail, created_at) values ('${u}', '${kind}', '${detail}'::jsonb, now() - interval '${ago}');`;
const owned = (u: string, nos: number[], copies: number[]): string =>
  nos.map((n, i) => `insert into public.cards_owned (user_id, card_no, copies) values ('${u}', ${n}, ${copies[i]});`).join('\n');

interface World { db: Db; alice: string; bob: string; carol: string; ghost: string; inPacks: number[]; hidden: number }
/** alice: 6 packs, 6 cards in the packs plus one out of them, 2 pack ads + 1 shard ad (+1 refused), 2 crafts, 7 recycled. bob: 2 packs, 12 cards. carol_x: no pack, 1 shard ad. ghost: no nickname. */
async function world(): Promise<World> {
  const db = await before();
  const inPacks = (await rows<{ card_no: number }>(db, `select card_no from public.cards_catalog where in_packs order by card_no limit 14`)).map((r) => r.card_no);
  const hidden = (await rows<{ card_no: number }>(db, `select card_no from public.cards_catalog where not in_packs order by card_no limit 1`))[0]?.card_no ?? 0;
  expect(inPacks).toHaveLength(14);
  const grp = await one<string>(db, `select id from public.cards_entities where kind = 'group' order by id limit 1`);
  const [alice, bob, carol, ghost] = [await newUser(db), await newUser(db), await newUser(db), await newUser(db)] as [string, string, string, string];
  await db.exec(`insert into public.profiles (id, username) values ('${alice}', 'Alice'), ('${bob}', 'bob'), ('${carol}', 'carol_x');`);
  await db.exec([
    wal(alice, '40 days', '1 hour', 12), wal(bob, '12 days', '5 days', 3), wal(carol, '30 days', '20 days', 0), wal(ghost, '60 days', '40 days', 7),
    pack(alice, 'stock', '10 minutes'), pack(alice, 'stock', '2 days'), pack(alice, 'stock', '10 days', { golden: true }), pack(alice, 'stock', '2 days', { focus: grp }),
    pack(alice, 'daily', '2 days'), pack(alice, 'stock', '11 days', { guarantee: true }),
    pack(bob, 'shards', '5 days'), pack(bob, 'bonus', '6 days'),
    pack(ghost, 'ad', '45 days'), pack(ghost, 'stock', '44 days'),
    owned(alice, [...inPacks.slice(0, 6), ...(hidden ? [hidden] : [])], [2, 1, 1, 3, 1, 1, ...(hidden ? [1] : [])]),
    owned(bob, inPacks.slice(0, 12), inPacks.slice(0, 12).map(() => 1)),
    ev(alice, 'tx-1', true, '1 hour'), ev(alice, 'tx-2', true, '3 days'), ev(alice, 'tx-3', false, '1 hour'),
    audit(alice, 'ad', '{"shards": 5}', '2 hours'), audit(carol, 'ad', '{"shards": 5}', '20 days'),
    audit(alice, 'recycle', '{"recycled": 4, "shards": 9}', '1 day'), audit(alice, 'recycle', '{"recycled": 3, "shards": 6}', '5 days'),
    `insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values ('${alice}', ${inPacks[7]}, 'C', 5, now()), ('${alice}', ${inPacks[8]}, 'U', 9, now());`,
  ].join('\n'));
  return { db, alice, bob, carol, ghost, inPacks, hidden };
}

describe('128-admin-stats.sql: the files', () => {
  it.each([[UP, 'c128'], [DOWN, 'c128r']])('%s is one DO block with its header and no dash', (file, tag) => {
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
    expect(sql).not.toMatch(/\bexecute\b\s+(format|'|\$)/i);
  });
  it('the function writes nothing: no UPDATE, DELETE, INSERT or TRUNCATE, and it asks for the service role only', () => {
    const code = readFileSync(path.join(CARDS_SQL, UP), 'utf8').split('\n').filter((l) => !l.startsWith('--')).join('\n');
    expect(code).not.toMatch(/\b(update|delete\s+from|insert\s+into|truncate)\b/i);
    expect(code).toContain('revoke all on function public.cards_admin_stats(text, text, text, integer, text, text, integer, integer) from public, anon, authenticated;');
    expect(code).toContain('to service_role;');
    expect(code).toContain('security definer set search_path = public');
    expect(code).toContain("notify pgrst, 'reload schema';");
  });
  it('the answer holds no e-mail, birth date, IP or account id', () => {
    const code = readFileSync(path.join(CARDS_SQL, UP), 'utf8').split('\n').filter((l) => !l.startsWith('--')).join('\n');
    const built = code.slice(code.indexOf("'rows'"));
    expect(built).not.toMatch(/email|birth|\bip\b|user_id/i);
  });
});

describe('128-admin-stats.sql: the figures', () => {
  it('counts every figure of every player', async () => {
    const { db, alice, bob, inPacks, hidden } = await world();
    await run(db, rd(UP));
    const r = await stats(db, { limit: 100, sort: 'packs' });
    const by = Object.fromEntries(r.rows.map((x) => [x.username ?? '(none)', x]));
    expect(Object.keys(by).sort()).toEqual(['(none)', 'Alice', 'bob', 'carol_x', 'fan1']);
    const inCat = await one<number>(db, `select count(*)::int from public.cards_catalog where in_packs`);
    const a = by['Alice']!;
    expect(a).toMatchObject({ packs: 6, packs_7d: 4, src_stock: 4, src_focus: 1, src_daily: 1, src_shards: 0, src_bonus: 0, src_ad: 0, golden: 1, guarantee: 1,
      cards: hidden ? 7 : 6, cards_in_packs: 6, copies: hidden ? 10 : 9, dupes: 3, shards: 12, ads: 3, crafted: 2, recycled: 7, level: 1 });
    expect(a.pct).toBe(Math.round((1000 * 6) / inCat) / 10);
    expect(new Date(a.last_pack!).getTime()).toBeGreaterThan(Date.now() - 20 * 60_000);
    const b = by['bob']!;
    expect(b).toMatchObject({ packs: 2, packs_7d: 2, src_shards: 1, src_bonus: 1, src_stock: 0, cards: 12, cards_in_packs: 12, copies: 12, dupes: 0, shards: 3, ads: 0, crafted: 0, recycled: 0, level: 2 });
    expect(by['carol_x']).toMatchObject({ packs: 0, last_pack: null, cards: 0, pct: 0, ads: 1, level: 1, shards: 0 });
    expect(by['(none)']).toMatchObject({ username: null, packs: 2, src_ad: 1, src_stock: 1, packs_7d: 0, shards: 7 });
    expect(by['fan1']).toMatchObject({ packs: 0, shards: 12, ads: 0 });
    // the totals
    expect(r.total).toBe(5);
    expect(r.totals).toEqual({ players: 5, packs_total: 10, packs_today: 1, packs_7d: 6, ads_total: 4, ads_today: 2, cards_in_packs: inCat,
      avg_pct: Math.round((10 * (100 * (6 + 12)) / inCat) / 5) / 10 });
    expect(r.totals.ads_total).toBe(2 + 1 + 1);
    void alice; void bob; void inPacks;
  });
  it('the totals do not move with the filters', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const all = await stats(db);
    const some = await stats(db, { search: 'zzz', min: 99, ads: 'yes', window: '24h' });
    expect(some.total).toBe(0);
    expect(some.rows).toEqual([]);
    expect(some.totals).toEqual(all.totals);
  });
});

describe('128-admin-stats.sql: filters, sort and pages', () => {
  it('searches a part of the nickname in any case, and a wildcard is only a character', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    expect(names(await stats(db, { search: 'ALI' }))).toEqual(['Alice']);
    expect(names(await stats(db, { search: ' bo ' }))).toEqual(['bob']);
    expect(names(await stats(db, { search: '_' }))).toEqual(['carol_x']);
    expect(names(await stats(db, { search: 'l_x' }))).toEqual(['carol_x']);
    expect((await stats(db, { search: '%' })).total).toBe(0);
    expect((await stats(db, { search: '\\' })).total).toBe(0);
    expect((await stats(db, { search: '' })).total).toBe(5);
    expect((await stats(db, { search: "x' or true --" })).total).toBe(0);
  });
  it('filters by the activity window (last seen)', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const set = async (w: string): Promise<string[]> => names(await stats(db, { window: w, sort: 'username', dir: 'asc' })).map((n) => n ?? '(none)').sort();
    expect(await set('all')).toEqual(['(none)', 'Alice', 'bob', 'carol_x', 'fan1']);
    expect(await set('24h')).toEqual(['Alice', 'fan1']);
    expect(await set('7d')).toEqual(['Alice', 'bob', 'fan1']);
    expect(await set('30d')).toEqual(['Alice', 'bob', 'carol_x', 'fan1']);
  });
  it('filters players who watched ads, and a minimum of packs', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    expect(names(await stats(db, { ads: 'yes', sort: 'ads', dir: 'desc' }))).toEqual(['Alice', 'carol_x']);
    expect((await stats(db, { ads: 'no' })).total).toBe(3);
    expect(names(await stats(db, { min: 3 }))).toEqual(['Alice']);
    expect((await stats(db, { min: 2 })).total).toBe(3);
    expect(names(await stats(db, { min: 2, ads: 'no', window: '7d' }))).toEqual(['bob']);
    expect((await stats(db, { min: -5 })).total).toBe(5);
  });
  it('sorts by every column of the list, both ways, the order of the other direction being the exact reverse of the figures', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const cols = ['username', 'first_seen', 'last_seen', 'last_pack', 'level', 'packs', 'packs_7d', 'src_stock', 'src_focus', 'src_daily', 'src_shards', 'src_bonus', 'src_ad',
      'golden', 'guarantee', 'cards', 'pct', 'copies', 'dupes', 'shards', 'ads', 'crafted', 'recycled'] as const;
    for (const c of cols) {
      for (const dir of ['asc', 'desc'] as const) {
        const r = await stats(db, { sort: c, dir });
        expect(r.rows, `${c} ${dir}`).toHaveLength(5);
        const key = (x: Row): number | string => {
          const v = x[c];
          if (c === 'username') return (v as string | null)?.toLowerCase() ?? '￿';
          if (v === null) return Number.POSITIVE_INFINITY; // nulls last
          return typeof v === 'string' ? Date.parse(v) : v;
        };
        const ks = r.rows.map(key);
        const nonNull = r.rows.filter((x) => x[c] !== null).map(key);
        const sorted = [...nonNull].sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
        expect(nonNull, `${c} ${dir}`).toEqual(dir === 'asc' ? sorted : sorted.reverse());
        if (c === 'last_pack' || c === 'username') expect(ks[ks.length - 1], `${c} ${dir} nulls last`).toBe(c === 'username' ? '￿' : Number.POSITIVE_INFINITY);
      }
    }
    expect(names(await stats(db, { sort: 'packs', dir: 'desc' })).slice(0, 2)).toEqual(['Alice', 'bob']);
    expect(names(await stats(db, { sort: 'packs', dir: 'asc' })).slice(-1)).toEqual(['Alice']);
    expect(names(await stats(db, { sort: 'username', dir: 'asc' }))).toEqual(['Alice', 'bob', 'carol_x', 'fan1', null]);
    expect(names(await stats(db, { sort: 'username', dir: 'desc' }))).toEqual(['fan1', 'carol_x', 'bob', 'Alice', null]);
    expect(names(await stats(db, { sort: 'level', dir: 'desc' }))[0]).toBe('bob');
  });
  it('paginates: a page, the next, the end, and the total stays the number that pass the filters', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const p1 = await stats(db, { sort: 'username', dir: 'asc', limit: 2, offset: 0 });
    const p2 = await stats(db, { sort: 'username', dir: 'asc', limit: 2, offset: 2 });
    const p3 = await stats(db, { sort: 'username', dir: 'asc', limit: 2, offset: 4 });
    const p4 = await stats(db, { sort: 'username', dir: 'asc', limit: 2, offset: 6 });
    expect([p1.total, p2.total, p3.total, p4.total]).toEqual([5, 5, 5, 5]);
    expect([...names(p1), ...names(p2), ...names(p3)]).toEqual(['Alice', 'bob', 'carol_x', 'fan1', null]);
    expect(p4.rows).toEqual([]);
    expect(p1).toMatchObject({ limit: 2, offset: 0 });
    // the limit is held between 1 and 200, the offset at 0 or more
    expect(await stats(db, { limit: 0 })).toMatchObject({ limit: 1 });
    expect(await stats(db, { limit: 9999 })).toMatchObject({ limit: 200 });
    expect(await stats(db, { offset: -3 })).toMatchObject({ offset: 0 });
  });
  it('ties come out in a stable order (the same answer twice)', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const a = names(await stats(db, { sort: 'src_ad', dir: 'asc' }));
    const b = names(await stats(db, { sort: 'src_ad', dir: 'asc' }));
    expect(a).toEqual(b);
  });
  it('refuses a sort, a direction, a window or an ads value outside the lists, before reading anything', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const call = (a: Args): Promise<string | null> =>
      failure(db, `select public.cards_admin_stats($1, $2, $3, $4, $5, $6, $7, $8)`, [a.search ?? null, a.window ?? 'all', a.ads ?? 'any', a.min ?? 0, a.sort ?? 'packs', a.dir ?? 'desc', a.limit ?? 50, a.offset ?? 0]);
    for (const sort of ['user_id', 'packs; drop table public.cards_owned', 'PACKS', 'packs desc', '', 'email', "packs' or '1'='1"]) expect(await call({ sort }), sort).toMatch(/cards_admin_stats: sort/);
    for (const dir of ['up', 'asc; select 1', 'descending']) expect(await call({ dir }), dir).toMatch(/cards_admin_stats: dir/);
    for (const window of ['1h', 'week', '']) expect(await call({ window }), window).toMatch(/cards_admin_stats: window/);
    for (const ads of ['maybe', 'true']) expect(await call({ ads }), ads).toMatch(/cards_admin_stats: ads/);
    expect(await one(db, `select count(*) from public.cards_owned`)).toBeGreaterThan(0);
    // the defaults and the capital letters of a direction are accepted
    expect(await one(db, `select public.cards_admin_stats() -> 'total'`)).toBe(5);
    expect(names(await stats(db, { sort: 'packs', dir: 'DESC' }))[0]).toBe('Alice');
  });
});

describe('128-admin-stats.sql: rights, rollback and a second run', () => {
  it('no browser role can execute it, the service role can', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('public', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_admin_stats'`)).toBe(false);
    expect(await one(db, `select has_function_privilege('service_role', '${FN}', 'execute')`)).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      const e = await failure(db, 'select public.cards_admin_stats()');
      await db.exec('reset role');
      expect(e, role).toMatch(/permission denied/);
    }
    await db.exec('set role service_role');
    const e = await failure(db, 'select public.cards_admin_stats()');
    await db.exec('reset role');
    expect(e).toBeNull();
  });
  it('changes no row anywhere, and a second run changes nothing', async () => {
    const { db } = await world();
    const counts = (): Promise<string> => one<string>(db, `select (select count(*) from cards_wallets)::text || ',' || (select count(*) from cards_packs) || ',' || (select count(*) from cards_owned) || ',' || (select count(*) from cards_audit) || ',' || (select count(*) from cards_ad_events) || ',' || (select count(*) from cards_crafts)`);
    const c0 = await counts();
    await run(db, rd(UP));
    const m1 = await one<string>(db, `select md5(prosrc) from pg_proc where oid = '${FN}'::regprocedure`);
    await stats(db);
    expect(await counts()).toBe(c0);
    await run(db, rd(UP));
    expect(await one<string>(db, `select md5(prosrc) from pg_proc where oid = '${FN}'::regprocedure`)).toBe(m1);
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_admin_stats'`)).toBe(1);
    expect(await counts()).toBe(c0);
  });
  it('stops without 121 (no ad events) and nothing changes', async () => {
    const db = await prodDb();
    await run(db, build([]).sql);
    await run(db, rd('120-cap-7.sql'));
    const e = await failure(db, rd(UP).replace('perform set_config', 'perform set_config'));
    expect(e).toMatch(/121-ad-packs/);
    expect(await one(db, `select count(*)::int from pg_proc where proname = 'cards_admin_stats'`)).toBe(0);
  });
  it('the rollback removes it, a second rollback says so, and the file applies again', async () => {
    const { db } = await world();
    await run(db, rd(UP));
    const notes = await run(db, rd(DOWN));
    expect(notes.join('\n')).toMatch(/is gone/);
    expect(await one(db, `select count(*)::int from pg_proc where proname = 'cards_admin_stats'`)).toBe(0);
    expect((await run(db, rd(DOWN))).join('\n')).toMatch(/already rolled back/);
    await run(db, rd(UP));
    expect((await stats(db)).total).toBe(5);
  });
});
