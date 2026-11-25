// KpopCards, owner request of 2026-11-25 ("make the craft way more expensive: 200 minimum for a basic card, and x2 for each rarer one"): proof of
// docs/pending-migrations/multisite/launch/L41-l1-cards-craft-cost.sql on PGlite, on the state production has (bundle 099 to 115, 116, 117, 118, 120, 121, 125).
// A Standard craft takes 200, a Gold craft 3200, a Full Art is refused, a craft made before keeps its recorded cost, the rollback gives the 125 body back
// byte for byte, a second run changes nothing, and the TypeScript price list (CRAFT_COST) is the one the SQL charges.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { newUser, setWallet, wallet } from '../kpopcards/sql-fixture';
import { build, prodDb, rd, run } from './parts-fixture';
import { CRAFT_COST } from './rules';
import { CARDS_SQL, failure, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const LAUNCH = path.join(CARDS_SQL, '../multisite/launch');
const rl = (f: string): string => readFileSync(path.join(LAUNCH, f), 'utf8');
const UP = 'L41-l1-cards-craft-cost.sql';
const DOWN = 'L41-l1-cards-craft-cost.rollback.sql';
const OLD = "v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 else 300 end;";
const NEW = "v_cost := case v_rarity when 'C' then 200 when 'U' then 400 when 'R' then 800 when 'SR' then 1600 else 3200 end;";
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const SIG = 'public.cards_craft(uuid, text, integer, timestamptz, integer)';
type Db = Awaited<ReturnType<typeof prodDb>>;

function statement(text: string): string {
  const start = '  create or replace function public.cards_craft(';
  const a = text.indexOf(start);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(text.indexOf(start, a + 1)).toBe(-1);
  const close = text.indexOf('$f$;', text.indexOf('as $f$', a) + 6);
  return text.slice(a, close + 4);
}
async function world(): Promise<Db> {
  const db = await prodDb();
  await run(db, build([]).sql);
  await run(db, rd('120-cap-7.sql'));
  await run(db, rd('121-ad-packs.sql'));
  await run(db, rd('125-cap-5.sql'));
  return db;
}
const md5 = (db: Db): Promise<string> => one<string>(db, `select md5(prosrc) from pg_proc where oid = '${SIG}'::regprocedure`);
/** The first card number of a rarity that a player can craft or be refused: a whole card (part 0) of an active subject in packs. */
async function cardOf(db: Db, rarity: string): Promise<number> {
  const r = await rows<{ card_no: number }>(db, `select c.card_no from cards_catalog c join cards_entities e on e.id = c.entity_id where c.in_packs and e.active and c.rarity = $1 and c.part = 0 order by c.card_no limit 1`, [rarity]);
  expect(r, rarity).toHaveLength(1);
  return r[0]!.card_no;
}
let k = 0;
const craft = (db: Db, u: string, n: number): Promise<{ cost: number; shards: number; rarity: string }> =>
  one(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [u, `craft-cost-${++k}-${n}`, n, '2026-11-25T10:00:00Z']);

describe('L41: the files', () => {
  it.each([[UP, 'o1l41'], [DOWN, 'o1l41r']])('%s is one DO block with its header and no dash', (file, tag) => {
    const sql = rl(file);
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: .*expect /m);
    for (const w of ['What:', 'Why:', 'Rows:']) expect(sql).toContain(`-- ${w}`);
    expect(sql).not.toMatch(DASH);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    for (const st of code.split(';').map((x) => x.replace(/--.*$/gm, '').trim()).filter((x) => /^(update|delete)\b/i.test(x))) expect(st, st.slice(0, 60)).toMatch(/\bwhere\b/i);
  });
  it('the header says that crafts already made keep their recorded cost and what a player sees before the file is applied', () => {
    const sql = rl(UP);
    expect(sql).toMatch(/Crafts already made keep the cost recorded/);
    expect(sql).toMatch(/Until this file is applied the pages show the new price while the database\s+--\s+still charges the old one/);
  });
  it('the body is the latest one (125-cap-5.sql) with the price line only, and the rollback is that body byte for byte', () => {
    const base = statement(rd('125-cap-5.sql'));
    expect(base).toContain(OLD);
    expect(statement(rl(UP))).toBe(base.replace(OLD, NEW));
    expect(statement(rl(DOWN))).toBe(base);
  });
  it('no file after 125 redefines cards_craft', () => {
    for (const f of ['126-dup-bias.sql', '127n-kpopcards-launch-notice.sql', '128-admin-stats.sql']) expect(rd(f), f).not.toContain('create or replace function public.cards_craft(');
  });
  it('the TypeScript price list is the one the SQL charges', () => {
    expect(CRAFT_COST).toEqual({ C: 200, U: 400, R: 800, SR: 1600, UR: 3200 });
    const m = /case v_rarity when 'C' then (\d+) when 'U' then (\d+) when 'R' then (\d+) when 'SR' then (\d+) else (\d+) end;/.exec(rl(UP));
    expect(m!.slice(1).map(Number)).toEqual([CRAFT_COST.C, CRAFT_COST.U, CRAFT_COST.R, CRAFT_COST.SR, CRAFT_COST.UR]);
  });
});

describe('L41: on the state production has', () => {
  it('before: a Standard craft takes 10; after: a Standard craft takes 200, a Gold craft 3200, short of shards is refused, a Full Art is refused', async () => {
    const db = await world();
    const c = await cardOf(db, 'C');
    const ur = await cardOf(db, 'UR');
    const l = await cardOf(db, 'L');
    const before = await newUser(db);
    await setWallet(db, before, { stock: 5, shards: 1000 });
    expect(await craft(db, before, c)).toMatchObject({ rarity: 'C', cost: 10, shards: 990 });
    expect(await run(db, rl(UP))).toEqual(['L41: cards_craft now charges 200, 400, 800, 1600 and 3200 shards; crafts already made keep their recorded cost']);
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, shards: 5000 });
    expect(await craft(db, u, c)).toMatchObject({ rarity: 'C', cost: 200, shards: 4800 });
    expect(await craft(db, u, ur)).toMatchObject({ rarity: 'UR', cost: 3200, shards: 1600 });
    expect((await wallet(db, u)).shards).toBe(1600);
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [u, 'craft-cost-l-1', l, '2026-11-25T10:00:00Z'])).toMatch(/cards: no_craft/);
    const poor = await newUser(db);
    await setWallet(db, poor, { stock: 5, shards: 199 });
    expect(await failure(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [poor, 'craft-cost-poor-1', c, '2026-11-25T10:00:00Z'])).toMatch(/cards: shards/);
    expect((await wallet(db, poor)).shards).toBe(199);
    // the ledger: the craft made before keeps 10, the new ones 200 and 3200
    const led = await rows<{ cost: number }>(db, 'select cost from cards_crafts order by cost');
    expect(led.map((x) => x.cost)).toEqual([10, 200, 3200]);
  });
  it('the four crafts of the middle: Stage 400, Holo 800, Era 1600, when the catalog holds such a card', async () => {
    const db = await world();
    await run(db, rl(UP));
    const want: Record<string, number> = { U: 400, R: 800, SR: 1600 };
    for (const r of Object.keys(want)) {
      const have = await rows<{ card_no: number }>(db, `select c.card_no from cards_catalog c join cards_entities e on e.id = c.entity_id where c.in_packs and e.active and c.rarity = $1 and c.part = 0 limit 1`, [r]);
      if (have.length === 0) continue;
      const u = await newUser(db);
      await setWallet(db, u, { stock: 5, shards: 10000 });
      expect(await craft(db, u, have[0]!.card_no)).toMatchObject({ rarity: r, cost: want[r], shards: 10000 - want[r]! });
    }
  });
  it('a second run changes nothing, the grants stay, and a function that holds neither price list is refused', async () => {
    const db = await world();
    const before = await md5(db);
    await run(db, rl(UP));
    const after = await md5(db);
    expect(after).not.toBe(before);
    expect(await run(db, rl(UP))).toEqual(['L41: already applied, nothing changed']);
    expect(await md5(db)).toBe(after);
    expect(await one(db, `select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_craft'`)).toBe(false);
    expect(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft'`)).toBe(1);
    await db.exec(`do $x$ begin execute replace(pg_get_functiondef('${SIG}'::regprocedure), 'then 1600 else 3200', 'then 1 else 2'); end $x$;`);
    await expect(db.exec(rl(UP))).rejects.toThrow(/holds neither price list/);
  });
  it('refuses to run before 125 (cards_craft still at the cap of 7) and leaves the function alone', async () => {
    const db = await prodDb();
    await run(db, build([]).sql);
    await run(db, rd('120-cap-7.sql'));
    await run(db, rd('121-ad-packs.sql'));
    const before = await md5(db);
    expect(await failure(db, rl(UP))).toMatch(/run 125 first/);
    expect(await md5(db)).toBe(before);
  });
  it('the rollback restores the body byte for byte and the old prices; a second rollback says so; a craft made at the new price keeps its cost', async () => {
    const db = await world();
    const before = await md5(db);
    await run(db, rl(UP));
    const c = await cardOf(db, 'C');
    const u = await newUser(db);
    await setWallet(db, u, { stock: 5, shards: 1000 });
    expect(await craft(db, u, c)).toMatchObject({ cost: 200 });
    expect(await run(db, rl(DOWN))).toEqual(['L41 rollback: cards_craft charges 10, 20, 50, 120 and 300 shards again']);
    expect(await md5(db)).toBe(before);
    expect(await run(db, rl(DOWN))).toEqual(['L41 rollback: already applied, nothing changed']);
    const v = await newUser(db);
    await setWallet(db, v, { stock: 5, shards: 1000 });
    expect(await craft(db, v, c)).toMatchObject({ cost: 10, shards: 990 });
    expect((await rows<{ cost: number }>(db, 'select cost from cards_crafts where user_id = $1', [u]))[0]!.cost).toBe(200);
  });
});
