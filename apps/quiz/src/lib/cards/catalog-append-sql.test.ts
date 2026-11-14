// KpopCards: pglite proof of docs/pending-migrations/cards/114-catalog-append.sql. The real schema files run, then 101 and a 103 built here
// from photos set by the test (some of them pending, so the owner's approval later is a plain status update), then packs are "opened" (a
// player owns cards) and the append runs: the preview writes nothing, the write adds the new editions and the new subjects after max(card_no)
// with the rules of cards_build_catalog(), no existing row changes, a second call adds nothing, a browser role cannot call it, the file shape
// (one DO block, Verify lines, no dash) and the rollback. The concurrency proof on a real Postgres is catalog-append-concurrency.test.ts.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { vi, beforeAll, describe, expect, it } from 'vitest';

import { APPROVE_ALL, AKMU_SECOND, PLAYER, catalogFiles } from './catalog-append-fixture';
import { failure, freshCardsDb, one, readCardsSql, rows, CARDS_SQL } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

async function setup(): Promise<PGlite> {
  const db = await freshCardsDb();
  for (const f of catalogFiles()) await db.exec(f);
  await db.exec(PLAYER);
  await db.exec(readCardsSql('114-catalog-append.sql'));
  return db;
}

type Card = { card_no: number; num: string; entity_id: string; rarity: string; part: number; photo_id: number; in_packs: boolean };
const catalog = (db: PGlite): Promise<Card[]> => rows<Card>(db, 'select card_no, num, entity_id, rarity, part, photo_id, in_packs from cards_catalog order by card_no');
const dump = (db: PGlite): Promise<string> => one<string>(db, `select (
  select coalesce(jsonb_agg(to_jsonb(c) order by card_no), '[]') from cards_catalog c)::text || (select coalesce(jsonb_agg(to_jsonb(o) order by user_id, card_no), '[]') from cards_owned o)::text ||
  (select coalesce(jsonb_agg(to_jsonb(k) order by id), '[]') from cards_packs k)::text || (select coalesce(jsonb_agg(to_jsonb(w)), '[]') from cards_wallets w)::text`);
type Answer = { dry_run: boolean; cards: number; subjects: number; new_subjects: number; extended_subjects: number; waiting: number; from_no: number | null; to_no: number | null; by_rarity: Record<string, number> };
const call = (db: PGlite, dry: boolean): Promise<Answer> => one<Answer>(db, `select public.cards_catalog_append(${dry})`);

describe('114-catalog-append.sql: the catalog grows after the first pack', () => {
  let db: PGlite;
  beforeAll(async () => { db = await setup(); });

  it('starts from a catalog the 103 refuses to rebuild (a player holds cards)', async () => {
    expect(await failure(db, 'select cards_build_catalog()')).toMatch(/owns a card/);
    const eds = (await catalog(db)).filter((c) => c.entity_id === 'idol:iu').map((c) => c.rarity);
    expect(eds).toEqual(['C', 'U', 'R']);
  });

  it('adds 0 while no photo is new, the preview and the write alike', async () => {
    const before = await dump(db);
    expect(await call(db, true)).toMatchObject({ dry_run: true, cards: 0, subjects: 0, from_no: null, to_no: null });
    expect(await call(db, false)).toMatchObject({ dry_run: false, cards: 0, from_no: null });
    expect(await dump(db)).toBe(before);
  });

  it('the default is the preview: no argument writes nothing', async () => {
    await db.exec(APPROVE_ALL);
    const before = await dump(db);
    const a = await one<Answer>(db, 'select public.cards_catalog_append()');
    expect(a.dry_run).toBe(true);
    expect(await dump(db)).toBe(before);
  });

  let first: Answer;
  let max0: number;
  let before: string;
  let old: Card[];
  it('previews the new cards without writing', async () => {
    max0 = await one<number>(db, 'select max(card_no) from cards_catalog');
    before = await dump(db);
    old = await catalog(db);
    first = await call(db, true);
    // IU +SR +UR (2), Jennie new C U (2), BTOB +R pair (2): 6 cards, 3 subjects (2 extended, 1 new); AKMU waits with one photo
    expect(first).toMatchObject({ dry_run: true, cards: 6, subjects: 3, new_subjects: 1, extended_subjects: 2, waiting: 1, from_no: max0 + 1, to_no: max0 + 6 });
    expect(first.by_rarity).toEqual({ C: 1, U: 1, R: 2, SR: 1, UR: 1 });
    expect(await dump(db)).toBe(before);
  });

  it('writes the same cards after max(card_no): nothing existing moves, owned and packs untouched', async () => {
    const w = await call(db, false);
    expect(w).toMatchObject({ dry_run: false, cards: 6, from_no: max0 + 1, to_no: max0 + 6, subjects: 3 });
    const now = await catalog(db);
    expect(now.slice(0, old.length)).toEqual(old);
    expect(now.map((c) => c.card_no)).toEqual(Array.from({ length: max0 + 6 }, (_, i) => i + 1));
    const added = now.slice(old.length);
    expect(added.map((c) => `${c.entity_id}/${c.rarity}/${c.part}`).sort()).toEqual(
      ['group:btob/R/1', 'group:btob/R/2', 'idol:iu/SR/0', 'idol:iu/UR/0', 'idol:jennie/C/0', 'idol:jennie/U/0']);
    // a subject's editions come in ladder order
    const iu = added.filter((c) => c.entity_id === 'idol:iu');
    expect(iu.map((c) => c.card_no)).toEqual([iu[0]!.card_no, iu[0]!.card_no + 1]);
    // the pair is consecutive
    const r1 = added.find((c) => c.entity_id === 'group:btob' && c.part === 1)!;
    const r2 = added.find((c) => c.entity_id === 'group:btob' && c.part === 2)!;
    expect(r2.card_no).toBe(r1.card_no + 1);
    expect(r1.photo_id).toBe(r2.photo_id);
    // the owned cards, the packs and the wallet are byte for byte what they were
    const after = JSON.parse(await dump(db).then((d) => `[${d.replace(/\]\[/g, '],[')}]`)) as unknown[][];
    const was = JSON.parse(`[${before.replace(/\]\[/g, '],[')}]`) as unknown[][];
    expect(after.slice(1)).toEqual(was.slice(1));
    expect(await one(db, 'select count(*)::int from cards_owned')).toBe(2);
    expect(await one(db, 'select count(*)::int from cards_packs')).toBe(1);
  });

  it('opens one edition per photo, the next free ones from the bottom, never a photo twice', async () => {
    const eds = async (ent: string) => (await catalog(db)).filter((c) => c.entity_id === ent && c.part !== 2).map((c) => c.rarity);
    expect(await eds('idol:iu')).toEqual(['C', 'U', 'R', 'SR', 'UR']);
    expect(await eds('idol:jennie')).toEqual(['C', 'U']);
    expect(await eds('group:btob')).toEqual(['C', 'U', 'R']);
    expect(await one(db, `select count(*)::int from (select entity_id, photo_id from cards_catalog group by 1, 2 having count(distinct rarity) > 1) x`)).toBe(0);
    // the lock reasons follow: IU lacks only Full Art, Jennie everything above U
    expect(await one(db, `select lock_reasons::text from cards_entities where id = 'idol:iu'`)).toBe('{"L": "photo"}');
    expect(await one(db, `select active from cards_entities where id = 'idol:jennie'`)).toBe(true);
  });

  it('keeps a subject with one photo out of the catalog (and out of the packs)', async () => {
    expect(await one(db, `select count(*)::int from cards_catalog where entity_id = 'group:akmu'`)).toBe(0);
    expect(await one(db, `select count(*)::int from cards_catalog where in_packs and entity_id = 'group:akmu'`)).toBe(0);
  });

  it('a second call adds 0 and changes nothing', async () => {
    const d = await dump(db);
    expect(await call(db, false)).toMatchObject({ cards: 0, subjects: 0, from_no: null, to_no: null });
    expect(await dump(db)).toBe(d);
  });

  it('a later photo of AKMU brings it in (2 photos), numbered after the previous maximum', async () => {
    const m = await one<number>(db, 'select max(card_no) from cards_catalog');
    await db.exec(AKMU_SECOND);
    const a = await call(db, false);
    expect(a).toMatchObject({ cards: 4, subjects: 1, new_subjects: 1, from_no: m + 1, to_no: m + 4 });
    expect((await catalog(db)).slice(-4).map((c) => `${c.rarity}/${c.part}`)).toEqual(['C/1', 'C/2', 'U/1', 'U/2']);
  });

  it('a browser role cannot execute it, the service role can', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect(await one(db, `select has_function_privilege('${role}', 'public.cards_catalog_append(boolean)', 'execute')`)).toBe(false);
      await db.exec(`set role ${role}`);
      expect(await failure(db, 'select public.cards_catalog_append(true)')).toMatch(/permission denied/);
      await db.exec('reset role');
    }
    expect(await one(db, `select has_function_privilege('service_role', 'public.cards_catalog_append(boolean)', 'execute')`)).toBe(true);
    expect(await one(db, `select has_function_privilege('public', 'public.cards_catalog_append(boolean)', 'execute')`)).toBe(false);
  });

  it('refuses a null mode and leaves the policies as they were', async () => {
    expect(await failure(db, 'select public.cards_catalog_append(null)')).toMatch(/cards_catalog_append: null/);
    expect(await one(db, `select count(*)::int from pg_policies where tablename = 'cards_catalog'`)).toBe(0);
  });
});

describe('114-catalog-append.sql, the files', () => {
  const sql = readFileSync(path.join(CARDS_SQL, '114-catalog-append.sql'), 'utf8');
  const rb = readFileSync(path.join(CARDS_SQL, '114-catalog-append.rollback.sql'), 'utf8');
  it('are one DO block each, with Verify lines, Needs and Errors, and no dash', () => {
    for (const f of [sql, rb]) {
      expect(f.match(/^do \$/gm)?.length).toBe(1);
      expect(f).toMatch(/^-- Verify: /m);
      expect(f).not.toMatch(/[–—]/);
      expect(f).not.toMatch(/create (temp|temporary) table/i);
    }
    expect(sql).toMatch(/^-- Needs: /m);
    expect(sql).toMatch(/^-- Errors: /m);
    expect(sql).toMatch(/revoke all on function public\.cards_catalog_append\(boolean\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.cards_catalog_append\(boolean\) to service_role;/);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/(delete from|update|insert into|truncate)\s+public\.cards_(owned|packs|wallets|audit)/i);
  });
  it('apply twice and roll back to nothing, keeping the added cards', async () => {
    const db = await setup();
    await db.exec(readCardsSql('114-catalog-append.sql'));
    await db.exec(APPROVE_ALL);
    await call(db, false);
    const n = await one<number>(db, 'select count(*)::int from cards_catalog');
    await db.exec(rb);
    await db.exec(rb);
    expect(await one(db, `select count(*)::int from pg_proc where proname = 'cards_catalog_append'`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_proc where proname = 'cards_build_catalog'`)).toBe(1);
    expect(await one(db, 'select count(*)::int from cards_catalog')).toBe(n);
  });
});
