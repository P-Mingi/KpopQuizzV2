// KpopCards launch polish 3 (2026-11-23): proof of docs/pending-migrations/cards/126-dup-bias.sql (fewer new cards: once a card's rarity is drawn, a chance
// KC.DUP_BIAS that it is a card of that rarity the player already owns) on PGlite, on the state production has (the bundle, 116 to 118, 120, 121, 125).
// The rarity odds are untouched, a guaranteed card is never biased, a focus pack and a pack of the day keep their pool, the missing part rule is kept,
// a second run changes nothing, 126 refuses without 125, and the rollback gives the body of 125 back byte for byte.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { KC } from '../kpopcards/contract';
import { openSql, own, setWallet, newUser, tryOpen } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CARDS_SQL, failure, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const UP = '126-dup-bias.sql';
const DOWN = '126-dup-bias.rollback.sql';
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const OPEN = 'public.cards_open(uuid, text, text, text, text, jsonb, timestamptz, integer, integer, integer)';
type Db = Awaited<ReturnType<typeof prodDb>>;

/** The statement of one function inside a file: from its create line to the closing $f$; of its first occurrence. */
function statement(text: string, name: string): string {
  const start = `  create or replace function public.${name}(`;
  const a = text.indexOf(start);
  expect(a, name).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(start, a + 1), `${name} once`).toBe(-1);
  const close = text.indexOf('$f$;', text.indexOf('as $f$', a) + 6);
  return text.slice(a, close + 4);
}
/** The one change 126 makes to the body of 125: these lines, before the select of the store loop. */
const INSERTED = `        -- lot LAUNCH-POLISH-3, fewer new cards: a card that is not the Gold guarantee nor the golden fifth card may become a card of the same rarity
        -- the player already owns (cards of this pack stored before count as owned)
        if not (v_k = 5 and (v_pity or v_golden)) then
          v_pick := public.cards_dup_pick(p_user, v_card, v_kind, v_group, case when p_source = 'focus' and v_k in (2, 4) then p_focus else null end);
          if v_pick <> v_card then
            v_card := v_pick;
            v_cards[v_k] := v_pick;
          end if;
        end if;
`;
const bodyMd5 = (db: Db, fn: string): Promise<string> => one<string>(db, `select md5(prosrc) from pg_proc where oid = '${fn}'::regprocedure`);

/** Production before 126: the bundle, 116, 117, 118 (no photo), 120, 121 and 125. */
async function before(): Promise<Db> {
  const db = await prodDb();
  await run(db, build([]).sql);
  for (const f of ['120-cap-7.sql', '121-ad-packs.sql', '125-cap-5.sql']) await run(db, rd(f));
  return db;
}
async function after(): Promise<Db> {
  const db = await before();
  await run(db, rd(UP));
  return db;
}
/** Pins the chance for a proof: 1 makes every non-exempt card go through the bias, 0 gives the draw of 125. The file's own function is put back by the caller. */
const setBias = (db: Db, v: number): Promise<unknown> =>
  db.exec(`create or replace function public.cards_dup_bias() returns numeric language sql immutable as $b$ select ${v}::numeric $b$`);

interface Cat { card_no: number; rarity: string; entity_id: string; group_id: string | null; part: number; kind: string }
const catalog = (db: Db): Promise<Cat[]> =>
  rows<Cat>(db, `select c.card_no, c.rarity, c.entity_id, e.group_id, c.part, e.kind from cards_catalog c join cards_entities e on e.id = c.entity_id where c.in_packs and e.active order by c.card_no`);

describe('126-dup-bias.sql: the files', () => {
  it.each([[UP, 'c126'], [DOWN, 'c126r']])('%s is one DO block with its header and no dash', (file, tag) => {
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
    for (const st of code.split(';').map((x) => x.replace(/--.*$/gm, '').trim()).filter((x) => /^(update|delete)\b/i.test(x))) expect(st, st.slice(0, 60)).toMatch(/\bwhere\b/i);
  });
  it('cards_open is the body of 125 with the one inserted step and nothing else; the rollback holds the body of 125 byte for byte', () => {
    const base = statement(rd('125-cap-5.sql'), 'cards_open');
    const up = statement(rd(UP), 'cards_open');
    expect(up.split(INSERTED).length).toBe(2);
    expect(up.replace(INSERTED, '')).toBe(base);
    expect(statement(rd(DOWN), 'cards_open')).toBe(base);
    // the step sits in the store loop, before the missing part rule
    expect(up.indexOf(INSERTED)).toBeGreaterThan(up.indexOf('-- The pack: swap a group half'));
    expect(up.indexOf(INSERTED)).toBeLessThan(up.indexOf('-- lot 7, the missing part rule'));
  });
  it('no file after 125 redefines cards_open, and the constant is written once, in cards_dup_bias', () => {
    const up = rd(UP);
    const code = up.split('\n').filter((l) => !l.startsWith('--')).join('\n');
    expect(code.split('0.35').length - 1).toBe(1);
    expect(statement(up, 'cards_dup_bias')).toContain('select 0.35::numeric');
    expect(up.split('0.35').length - 1).toBe(1);
    expect(rd(DOWN)).not.toContain('0.35');
    expect(statement(up, 'cards_dup_bias')).toContain('language sql immutable');
    expect(statement(up, 'cards_dup_pick')).toContain('security definer set search_path = public');
  });
  it('KC.DUP_BIAS is the number of the SQL constant', async () => {
    const n = /select ([0-9.]+)::numeric/.exec(statement(rd(UP), 'cards_dup_bias'))![1]!;
    expect(KC.DUP_BIAS).toBe(Number(n));
    const db = await after();
    expect(Number(await one(db, 'select public.cards_dup_bias()'))).toBe(KC.DUP_BIAS);
  });
});

describe('126-dup-bias.sql: apply, run twice, refuse, roll back', () => {
  it('applies on the state of 125, changes no row, keeps the grants, and a second run changes nothing', async () => {
    const db = await before();
    const rowsBefore = await one(db, `select (select count(*) from cards_owned) + (select count(*) from cards_packs) + (select count(*) from cards_wallets) + (select count(*) from cards_catalog)`);
    expect(await run(db, rd(UP))).toEqual(['126-dup-bias: cards_open now leans toward the cards a player already owns (the chance is cards_dup_bias)']);
    expect(await one(db, `select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_dup_bias', 'cards_dup_pick')`)).toBe(2);
    expect(await one(db, `select (public.cards_dup_bias() * 100)::int`)).toBe(35);
    expect(await one(db, `select position('cards_dup_pick' in prosrc) > 0 from pg_proc where oid = to_regprocedure('${OPEN.slice(7)}')`)).toBe(true);
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_dup_bias', 'cards_dup_pick', 'cards_open')`)).toBe(false);
    expect(await one(db, `select bool_and(has_function_privilege('service_role', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_dup_bias', 'cards_dup_pick', 'cards_open')`)).toBe(true);
    expect(await one(db, `select (select count(*) from cards_owned) + (select count(*) from cards_packs) + (select count(*) from cards_wallets) + (select count(*) from cards_catalog)`)).toBe(rowsBefore);
    const m = await bodyMd5(db, OPEN);
    expect(await run(db, rd(UP))).toEqual(['126-dup-bias: already applied, nothing changed']);
    expect(await bodyMd5(db, OPEN)).toBe(m);
  });
  it('refuses without 125 (the cap of 7) and on a mixed state, changing nothing', async () => {
    const db = await prodDb();
    await run(db, build([]).sql);
    for (const f of ['120-cap-7.sql', '121-ad-packs.sql']) await run(db, rd(f));
    const m = await bodyMd5(db, OPEN);
    expect(await failure(db, rd(UP))).toMatch(/run 125 first/);
    expect(await bodyMd5(db, OPEN)).toBe(m);
    expect(await one(db, `select count(*)::int from pg_proc where proname in ('cards_dup_bias', 'cards_dup_pick')`)).toBe(0);
    const mixed = await after();
    await mixed.exec('drop function public.cards_dup_pick(uuid, integer, text, text, text)');
    expect(await failure(mixed, rd(UP))).toMatch(/the state is mixed/);
    const mixed2 = await before();
    await mixed2.exec('create function public.cards_dup_bias() returns numeric language sql immutable as $b$ select 0.5::numeric $b$');
    expect(await failure(mixed2, rd(UP))).toMatch(/the state is mixed/);
    expect(await one(mixed2, `select position('cards_dup_pick' in prosrc) > 0 from pg_proc where oid = to_regprocedure('${OPEN.slice(7)}')`)).toBe(false);
  });
  it('the rollback restores the body of 125 exactly, drops the two functions, and a second run changes nothing', async () => {
    const db = await before();
    const m125 = await bodyMd5(db, OPEN);
    const src125 = await one<string>(db, `select prosrc from pg_proc where oid = '${OPEN}'::regprocedure`);
    await run(db, rd(UP));
    expect(await bodyMd5(db, OPEN)).not.toBe(m125);
    expect(await run(db, rd(DOWN))).toEqual(['126-dup-bias.rollback: cards_open is the body of 125 again']);
    expect(await one<string>(db, `select prosrc from pg_proc where oid = '${OPEN}'::regprocedure`)).toBe(src125);
    expect(await bodyMd5(db, OPEN)).toBe(m125);
    expect(await one(db, `select count(*)::int from pg_proc where proname in ('cards_dup_bias', 'cards_dup_pick')`)).toBe(0);
    expect(await run(db, rd(DOWN))).toEqual(['126-dup-bias.rollback: already rolled back, nothing changed']);
    // the grants of cards_open are still the browser-free ones, and 126 can be applied again
    expect(await one(db, `select bool_or(has_function_privilege('anon', '${OPEN}'::regprocedure, 'execute') or has_function_privilege('authenticated', '${OPEN}'::regprocedure, 'execute'))`)).toBe(false);
    await run(db, rd(UP));
    expect(await one(db, 'select (public.cards_dup_bias() * 100)::int')).toBe(35);
  });
});

describe('126-dup-bias.sql: the share of duplicates over 10,000 simulated draws', () => {
  it('with 10 percent of each rarity owned, the share of cards already owned is about 0.35 + 0.65 x 0.10, and every rarity is the drawn one', async () => {
    const db = await after();
    // 100 soloists, each with a Standard and a Stage card, none a part; the player owns every tenth soloist's cards (10 percent of each rarity)
    await db.exec(`
      insert into public.cards_entities (id, kind, name, group_id, debut_year, sort_key)
        select 'idol:zq' || lpad(i::text, 3, '0'), 'idol', 'Zq ' || i, null, 2019, 'zq' || lpad(i::text, 3, '0') from generate_series(0, 99) i;
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs, part)
        select 90000 + i, 'BV1-' || (90000 + i), 'idol:zq' || lpad(i::text, 3, '0'), 'C', 'std', true, 0 from generate_series(0, 99) i;
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, in_packs, part)
        select 91000 + i, 'BV1-' || (91000 + i), 'idol:zq' || lpad(i::text, 3, '0'), 'U', 'stage', true, 0 from generate_series(0, 99) i;`);
    const u = await newUser(db);
    await db.query(`insert into cards_owned (user_id, card_no, copies, first_at, last_at)
      select $1::uuid, b + i, 1, now(), now() from generate_series(0, 99, 10) i, (values (90000), (91000)) v(b)`, [u]);
    expect(await one(db, 'select count(*)::int from cards_owned where user_id = $1', [u])).toBe(20);
    await db.exec('select setseed(0.31)');
    const r = (await db.query<{ total: number; dup: number; moved: number; rar_bad: number; c_in: number; c_out: number; u_in: number; u_out: number; c_dup: number; u_dup: number; c_n: number; u_n: number }>(`
      with ins as (select case when random() < 0.5 then 90000 else 91000 end + floor(random() * 100)::int as c from generate_series(1, 10000)),
           outp as (select c, public.cards_dup_pick($1::uuid, c, 'all', null, null) as o from ins),
           j as (select x.c, x.o, ci.rarity as ri, co.rarity as ro, exists (select 1 from cards_owned w where w.user_id = $1::uuid and w.card_no = x.o) as dup
                   from outp x join cards_catalog ci on ci.card_no = x.c join cards_catalog co on co.card_no = x.o)
      select count(*)::int as total, count(*) filter (where dup)::int as dup, count(*) filter (where c <> o)::int as moved,
             count(*) filter (where ri <> ro)::int as rar_bad,
             count(*) filter (where ri = 'C')::int as c_in, count(*) filter (where ro = 'C')::int as c_out,
             count(*) filter (where ri = 'U')::int as u_in, count(*) filter (where ro = 'U')::int as u_out,
             count(*) filter (where ri = 'C' and dup)::int as c_dup, count(*) filter (where ri = 'U' and dup)::int as u_dup,
             count(*) filter (where ri = 'C')::int as c_n, count(*) filter (where ri = 'U')::int as u_n
        from j`, [u])).rows[0]!;
    expect(r.total).toBe(10000);
    const expected = KC.DUP_BIAS + (1 - KC.DUP_BIAS) * 0.1;
    expect(expected).toBeCloseTo(0.415, 10);
    expect(Math.abs(r.dup / r.total - expected)).toBeLessThan(0.02);
    expect(Math.abs(r.c_dup / r.c_n - expected)).toBeLessThan(0.03);
    expect(Math.abs(r.u_dup / r.u_n - expected)).toBeLessThan(0.03);
    // the rarity of every output is the rarity of its input, so the distribution of rarities is exactly the same
    expect(r.rar_bad).toBe(0);
    expect(r.c_out).toBe(r.c_in);
    expect(r.u_out).toBe(r.u_in);
    expect(r.moved).toBeGreaterThan(0);
    // a player who owns nothing gets the draw back every time
    const nobody = await newUser(db);
    expect(await one(db, `select count(*)::int from generate_series(1, 300) g where public.cards_dup_pick($1::uuid, 90005, 'all', null, null) <> 90005`, [nobody])).toBe(0);
  });
});

describe('126-dup-bias.sql: through cards_open', () => {
  /** Plain idol cards by rarity (no part). */
  const idols = (cat: Cat[], r: string): number[] => cat.filter((c) => c.rarity === r && c.part === 0 && c.kind === 'idol').map((c) => c.card_no);
  const packs30 = (db: Db, u: string, n: number): Promise<unknown> =>
    db.query(`insert into cards_packs (user_id, source, cards, opened_at, seq) select $1::uuid, 'stock', array[$2::int, $2::int, $2::int, $2::int, $2::int], now() - interval '1 day', g from generate_series(1, $3::int) g`, [u, 0, n]);

  it('card 5 of a Gold guarantee pack is always the plan\'s u, and of a golden pack always the plan\'s g, whatever the player owns', async () => {
    const db = await after();
    await setBias(db, 1);
    const cat = await catalog(db);
    const C = idols(cat, 'C');
    const U = idols(cat, 'U');
    const R = idols(cat, 'R');
    const UR = idols(cat, 'UR');
    expect(C.length).toBeGreaterThanOrEqual(5);
    expect(UR.length).toBeGreaterThanOrEqual(2);
    expect(R.length).toBeGreaterThanOrEqual(2);
    const everything = cat.map((c) => c.card_no);
    for (let i = 0; i < 25; i++) {
      // guarantee: 30 packs with no Gold, the 31st (not golden). The player owns every card of the catalog but the plan's own Gold card.
      const u = await newUser(db);
      await setWallet(db, u, { stock: 5, opened: 30 });
      await packs30(db, u, 30);
      await own(db, u, everything.filter((n) => n !== UR[0]));
      const r = await openSql(db, u, { draws: [{ c: [C[0]!, C[1]!, C[2]!, C[3]!, U[0]!], g: R[0]!, u: UR[0]! }] });
      expect(r.packs[0]!.guarantee).toBe(true);
      expect(r.packs[0]!.golden).toBe(false);
      expect(r.packs[0]!.cards[4]!.n).toBe(UR[0]);
      // golden: pack 10 (opened 9), no guarantee. The player owns every card but the plan's golden card.
      const v = await newUser(db);
      await setWallet(db, v, { stock: 5, opened: 9 });
      await own(db, v, everything.filter((n) => n !== R[0]));
      const g = await openSql(db, v, { draws: [{ c: [C[0]!, C[1]!, C[2]!, C[3]!, U[0]!], g: R[0]!, u: UR[0]! }] });
      expect(g.packs[0]!.golden).toBe(true);
      expect(g.packs[0]!.guarantee).toBe(false);
      expect(g.packs[0]!.cards[4]!.n).toBe(R[0]);
      expect(g.packs[0]!.cards[4]!.isNew).toBe(true);
    }
  });

  it('the other cards do lean toward owned cards (the bias is on), and cards stored earlier in the same pack count as owned', async () => {
    const db = await after();
    await setBias(db, 1);
    const cat = await catalog(db);
    const C = idols(cat, 'C');
    const U = idols(cat, 'U');
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, opened: 0 });
    await own(db, u, [C[0]!]);
    // the plan has four different unowned C cards: with the bias at 1 the first becomes the owned C[0]; it then counts as owned for the next, which stays on it
    const r = await openSql(db, u, { draws: [{ c: [C[1]!, C[2]!, C[3]!, C[4]!, U[0]!] }] });
    expect(r.packs[0]!.cards.map((c) => c.n)).toEqual([C[0], C[0], C[0], C[0], U[0]]);
    expect(r.packs[0]!.cards.map((c) => c.isNew)).toEqual([false, false, false, false, true]);
    // with the bias at 0 the pack is the plan, the draw of 125
    await setBias(db, 0);
    const v = await newUser(db);
    await setWallet(db, v, { stock: 5, opened: 0 });
    await own(db, v, [C[0]!]);
    const g = await openSql(db, v, { draws: [{ c: [C[1]!, C[2]!, C[3]!, C[4]!, U[0]!] }] });
    expect(g.packs[0]!.cards.map((c) => c.n)).toEqual([C[1], C[2], C[3], C[4], U[0]]);
  });

  it('a focus pack keeps its group on cards 2 and 4, and a pack of the day stays in its group\'s pool', async () => {
    const db = await after();
    await setBias(db, 1);
    const cat = await catalog(db);
    const inG = (c: Cat, g: string): boolean => c.entity_id === g || c.group_id === g;
    const groups = [...new Set(cat.filter((c) => c.group_id).map((c) => c.group_id!))];
    // a group with a plain Standard idol card and another rarity of its own, and Standard cards outside it
    const focus = groups.find((g) => cat.some((c) => c.rarity === 'C' && c.part === 0 && c.kind === 'idol' && inG(c, g)) && cat.some((c) => c.rarity !== 'C' && c.part === 0 && inG(c, g)))!;
    expect(focus).toBeDefined();
    const inside = cat.filter((c) => c.rarity === 'C' && c.part === 0 && c.kind === 'idol' && inG(c, focus));
    const outside = cat.filter((c) => c.rarity === 'C' && c.part === 0 && c.kind === 'idol' && !inG(c, focus));
    const fifth = cat.find((c) => c.rarity !== 'C' && c.part === 0 && inG(c, focus))!;
    expect(outside.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 20; i++) {
      const u = await newUser(db);
      await setWallet(db, u, { stock: 5, opened: 0 });
      await own(db, u, outside.map((c) => c.card_no).concat(cat.filter((c) => c.rarity === fifth.rarity).map((c) => c.card_no)));
      const a = inside[0]!.card_no;
      const r = await openSql(db, u, { source: 'focus', focus, draws: [{ c: [outside[0]!.card_no, a, outside[1]!.card_no, a, fifth.card_no] }] });
      const got = r.packs[0]!.cards.map((c) => cat.find((x) => x.card_no === c.n)!);
      expect(inG(got[1]!, focus)).toBe(true);
      expect(inG(got[3]!, focus)).toBe(true);
    }
    // the pack of the day: a day whose group has a card that is not Standard; the player owns every card outside that group, so a pick outside would be possible
    const day = async (d: string): Promise<string | null> => one<string | null>(db, `select public.cards_daily_group($1::date)`, [d]);
    let found: { d: string; g: string } | null = null;
    for (let k = 0; k < 60 && !found; k++) {
      const d = new Date(Date.UTC(2026, 10, 12 + k)).toISOString().slice(0, 10);
      const gr = await day(d);
      if (gr && cat.some((c) => inG(c, gr) && c.rarity !== 'C')) found = { d, g: gr };
    }
    expect(found).not.toBeNull();
    const g = found!.g;
    const top = cat.find((c) => inG(c, g) && c.rarity !== 'C')!;
    const plan = [top.card_no, top.card_no, top.card_no, top.card_no, top.card_no];
    for (let i = 0; i < 20; i++) {
      const u = await newUser(db);
      await setWallet(db, u, { stock: 5, opened: 0, day: found!.d, anchor: `${found!.d}T10:00:00Z` });
      await own(db, u, cat.filter((c) => !inG(c, g)).map((c) => c.card_no));
      const r = await openSql(db, u, { source: 'daily', draws: [{ c: plan }], at: `${found!.d}T10:00:00Z` });
      for (const c of r.packs[0]!.cards) expect(inG(cat.find((x) => x.card_no === c.n)!, g), `card ${c.n}`).toBe(true);
      expect(r.packs[0]!.cards[0]!.isNew).toBe(true);
    }
    // the validation of the plan is unchanged: a card outside the pool of the day is refused
    expect(await tryOpen(db, await newUser(db), { source: 'daily', draws: [{ c: [outside[0]!.card_no, outside[0]!.card_no, outside[0]!.card_no, outside[0]!.card_no, top.card_no] }], at: `${found!.d}T10:00:00Z` })).toMatch(/cards: pack/);
  });

  it('the missing part rule is kept for an unbiased card, and a biased pick is never a part with a missing sibling', async () => {
    const db = await after();
    const cat = await catalog(db);
    const C = idols(cat, 'C');
    // two groups with a Stage photo in two parts
    const parts = new Map<string, number[]>();
    for (const c of cat.filter((x) => x.rarity === 'U' && x.part > 0)) parts.set(c.entity_id, [...(parts.get(c.entity_id) ?? []), c.card_no]);
    const pairs = [...parts.values()].filter((v) => v.length === 2);
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    const [p1, p2] = pairs[0]! as [number, number];
    const [q1] = pairs[1]! as [number, number];
    const U0 = idols(cat, 'U')[0]!;
    const plan = (five: number): { c: number[] } => ({ c: [C[0]!, C[1]!, C[2]!, C[3]!, five] });
    const fresh = async (own_: number[]): Promise<string> => { const u = await newUser(db); await setWallet(db, u, { stock: 5, opened: 0 }); await own(db, u, own_); return u; };

    // unbiased (chance 0): he owns part 1, the plan brings part 1, the database gives the missing part 2 (new)
    await setBias(db, 0);
    const a = await openSql(db, await fresh([p1]), { draws: [plan(p1)] });
    expect(a.packs[0]!.cards[4]).toMatchObject({ n: p2, isNew: true });
    // chance 1, he owns part 1 only: part 1 has a missing sibling, so it is no candidate; the plan's card stays and the rule gives part 2, as before
    await setBias(db, 1);
    const b = await openSql(db, await fresh([p1]), { draws: [plan(p1)] });
    expect(b.packs[0]!.cards[4]).toMatchObject({ n: p2, isNew: true });
    // chance 1, he owns part 1 and a plain Stage card: the pick is the plain card (never the part with a missing sibling), a real duplicate
    for (let i = 0; i < 20; i++) {
      const c = await openSql(db, await fresh([p1, U0]), { draws: [plan(q1)] });
      expect(c.packs[0]!.cards[4]).toMatchObject({ n: U0, isNew: false });
    }
    // chance 1, he owns both parts of a photo: they are real duplicates and can be picked
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const d = await openSql(db, await fresh([p1, p2]), { draws: [plan(q1)] });
      expect(d.packs[0]!.cards[4]!.isNew).toBe(false);
      seen.add(d.packs[0]!.cards[4]!.n);
    }
    expect([...seen].sort()).toEqual([p1, p2].sort());
  });

  it('the duplicates follow the existing circuit: the pack counts them as copies and the new count is the cards that are new', async () => {
    const db = await after();
    await setBias(db, 1);
    const cat = await catalog(db);
    const C = idols(cat, 'C');
    const U0 = idols(cat, 'U')[0]!;
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, opened: 0 });
    await own(db, u, [C[0]!], undefined, 1);
    const r = await openSql(db, u, { draws: [{ c: [C[1]!, C[2]!, C[3]!, C[4]!, U0] }] });
    expect(r.packs[0]!.new_count).toBe(1);
    expect(await one(db, 'select copies from cards_owned where user_id = $1 and card_no = $2', [u, C[0]])).toBe(5);
    expect(await one(db, 'select new_count from cards_packs where user_id = $1', [u])).toBe(1);
    expect(r.owned_after - r.owned_before).toBe(1);
  });
});
