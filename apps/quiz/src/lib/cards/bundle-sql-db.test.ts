// KpopCards, PR #231: the proof of the bundle on a throwaway database (PGlite, Postgres 18 in WebAssembly) in the state the integrator read in
// production on 2026-11-14 (bundle-fixture.ts: 001 to 003 and 101 applied, 92 cards of 23 subjects, no part column, 0 row of 099).
// Every script runs the way the Supabase SQL Editor runs it: the WHOLE text in one exec, one simple query message, never split.
// Checked: ALL-verify answers TOUT_OK false before; the bundle passes and ALL-verify answers every row ok, inside a read-only transaction;
// a second run is refused by the guard with nothing changed; the guard's other refusals and its time window; a failure in the middle
// leaves the database as it was; the read-only preview of ALL-verify equals cards_catalog_append(true); ALL-rollback gives back the
// schema and the rows of before, but the new ids of the 101 photos.
import { performance } from 'node:perf_hooks';

import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { APPEND_PREVIEW } from '../../../scripts/cards/bundle-verify.mjs';
import { GUARD, OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { FINGERPRINT, ROW_SUMS_SQL, U1, prodStateSql, rowSumOf } from './bundle-fixture';

// measured on an Apple M1 Pro: about 8 s to build the state, 3 to 5 s for the bundle; the file runs in about 60 s, a loaded machine needs more
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const BUNDLE = readCards(OUTPUTS.bundle);
const VERIFY = readCards(OUTPUTS.verify);
const ROLLBACK = readCards(OUTPUTS.rollback);

async function prodDb(): Promise<PGlite> {
  const db = new PGlite();
  for (const s of prodStateSql()) await db.exec(s);
  return db;
}
const one = async <T>(db: PGlite, sql: string): Promise<T> => Object.values((await db.query<Record<string, T>>(sql)).rows[0] ?? {})[0] as T;
async function failure(db: PGlite, sql: string, notice?: (m: string) => void): Promise<string | null> {
  try {
    await db.exec(sql, notice ? { onNotice: (n) => notice(n.message ?? '') } : undefined);
    return null;
  } catch (e) {
    // the session is left in the aborted transaction of the script, as the SQL Editor's connection is: end it
    await db.exec('rollback');
    return (e as Error).message;
  }
}
type Row = { fichier: string; controle: string; attendu: string | null; obtenu: string | null; ok: boolean };
/** ALL-verify.sql, whole, inside a read-only transaction. */
async function verify(db: PGlite): Promise<Row[]> {
  await db.exec('begin read only');
  try {
    return (await db.query<Row>(VERIFY)).rows;
  } finally {
    await db.exec('commit');
  }
}
const SEQUENCES = `select coalesce(string_agg(schemaname || '.' || sequencename || ' ' || coalesce(last_value::text, '-'), E'\\n' order by schemaname, sequencename), '')
  from pg_sequences where schemaname in ('public', 'auth', 'storage')`;
/** The schema fingerprint and the checksum of every table's rows. */
async function state(db: PGlite): Promise<{ schema: string; rows: string[] }> {
  const tables = (await db.query<{ t: string }>(ROW_SUMS_SQL)).rows.map((r) => r.t);
  const rows: string[] = [];
  for (const t of tables) rows.push(await one<string>(db, rowSumOf(t)));
  return { schema: await one<string>(db, FINGERPRINT), rows };
}
const notOk = (rows: Row[]): string[] => rows.filter((r) => !r.ok).map((r) => `${r.fichier} ${r.controle}: attendu ${r.attendu} obtenu ${r.obtenu}`);

/** The rows of the catalog and the photos with the photo read through its source page instead of its id (an identity). */
const BY_PAGE = `select md5(string_agg(x::text, E'\\n' order by x::text)) from (
  select to_jsonb(c) - 'photo_id' || jsonb_build_object('photo', p.source_page) as x from cards_catalog c join cards_photos p on p.id = c.photo_id
  union all select to_jsonb(p) - 'id' from cards_photos p) y`;

describe('ALL-099-115.sql on the database of 2026-11-14', () => {
  let db: PGlite;
  let start: { schema: string; rows: string[] };
  let seq0 = '';
  let page0 = '';
  let counts0: number[] = [];
  let before: Row[];
  let bundleError: string | null = null;
  const notices: string[] = [];
  beforeAll(async () => {
    db = await prodDb();
    start = await state(db);
    seq0 = await one<string>(db, SEQUENCES);
    page0 = await one<string>(db, BY_PAGE);
    counts0 = [
      await one<number>(db, 'select count(*)::int from cards_catalog'),
      await one<number>(db, 'select count(distinct entity_id)::int from cards_catalog'),
      await one<number>(db, `select count(*)::int from information_schema.columns where table_name = 'cards_catalog' and column_name = 'part'`),
      await one<number>(db, `select count(*)::int from idols where review_reason like '099%'`),
    ];
    before = await verify(db);
    const t0 = performance.now();
    bundleError = await failure(db, BUNDLE, (n) => notices.push(n));
    console.log(`bundle on PGlite: ${Math.round(performance.now() - t0)} ms, ${Buffer.byteLength(BUNDLE)} bytes, ${bundleError ?? 'committed'}`);
  });

  it('starts from the state of 2026-11-14: 92 cards of 23 subjects, no part column, no row of 099', () => {
    expect(counts0).toEqual([92, 23, 0, 0]);
  });

  it('ALL-verify answers before the bundle, read only, with TOUT_OK false', () => {
    expect(before.length).toBe(86);
    expect(before.at(-1)).toMatchObject({ controle: 'TOUT_OK', ok: false });
  });

  it('the bundle as committed runs whole in one exec and commits', () => {
    expect(bundleError).toBeNull();
    expect(notices.some((n) => /^ALL-099-115: guard passed at \d\d:\d\d UTC/.test(n))).toBe(true);
  });

  it('every Verify line is ok after it, read only', async () => {
    const after = await verify(db);
    expect(notOk(after)).toEqual([]);
    expect(after.length).toBe(86);
    expect(after.at(-1)).toEqual({ fichier: 'ALL-099-115.sql', controle: 'TOUT_OK', attendu: 'true', obtenu: 'true', ok: true });
  });

  it('the expected values follow the notices of the files', async () => {
    const after = await verify(db);
    const row = (f: string, line: number): Row => after.find((r) => r.fichier === f && r.controle.startsWith(`line ${line}:`))!;
    const added = notices.map((n) => /^099-idols-members: (\d+) rows added in \d+ subjects$/.exec(n)?.[1]).find(Boolean);
    expect(added).toBeTruthy();
    expect(row('099-idols-members.sql', 22).attendu).toBe(added);
    const added099b = notices.filter((n) => /^099b-idols-returning: \S+ added \d+ rows$/.test(n)).reduce((s, n) => s + Number(/added (\d+) rows/.exec(n)![1]), 0);
    expect(row('099b-idols-returning.sql', 17).attendu).toBe(String(added099b));
    const people = /^102-catalog-rebuild: (\d+) people and (\d+) groups in/.exec(notices.find((n) => / people and \d+ groups in/.test(n)) ?? '');
    expect(people).toBeTruthy();
    const cards = notices.map((n) => /^103-catalog-photos: \d+ subjects in the packs, \d+ waiting for a second approved photo, (\d+) cards/.exec(n)?.[1]).find(Boolean);
    expect(row('103-catalog-photos.sql', 29).attendu).toBe(`1, ${cards}, ${cards}`);
    expect(row('114-catalog-append.sql', 27).attendu).toBe(`1, ${cards}, ${cards}`);
    const photos = notices.map((n) => /^103-catalog-photos: photos (\w+) (\d+)$/.exec(n)).filter(Boolean).map((m) => `${m![1]} ${m![2]}`).join(', ');
    expect(row('103-catalog-photos.sql', 34).attendu).toBe(photos);
    const waiting = notices.map((n) => /, (\d+) waiting for a second approved photo,/.exec(n)?.[1]).find(Boolean);
    expect(JSON.parse(row('114-catalog-append.sql', 26).attendu!)).toMatchObject({ cards: 0, waiting: Number(waiting) });
  });

  it('a second run is refused by the guard (102 is applied), nothing changed', async () => {
    const s = await state(db);
    expect(await failure(db, BUNDLE)).toMatch(/ALL-099-115: cards_catalog already has the column part \(102 is applied\), nothing changed/);
    expect(await state(db)).toEqual(s);
  });

  it('the read-only preview of ALL-verify gives what cards_catalog_append(true) answers, after the bundle and with photos to add', async () => {
    const call = async (): Promise<string> => one<string>(db, `select (public.cards_catalog_append(true) - 'by_rarity')::text`);
    const plain = async (): Promise<string> => one<string>(db, `select ${APPEND_PREVIEW}`);
    expect(await plain()).toBe(await call());
    expect(JSON.parse(await plain())).toMatchObject({ dry_run: true, cards: 0, subjects: 0 });
    // the owner approves what waits in "To review", a player holds cards: the append has cards to add (in a transaction undone after)
    await db.exec(`begin;
      insert into cards_owned (user_id, card_no) values ('${U1}', 1);
      update cards_photos set status = 'approved' where status = 'pending';`);
    try {
      const p = JSON.parse(await plain()) as { cards: number; new_subjects: number; extended_subjects: number; not_shown: number };
      expect(p.cards).toBeGreaterThan(0);
      expect(p.new_subjects).toBeGreaterThan(0);
      expect(p.extended_subjects).toBeGreaterThan(0);
      expect(p.not_shown).toBeGreaterThan(0);
      expect(await plain()).toBe(await call());
      // photos cut by the owner's script: shown, so not_shown moves, and both still agree
      await db.exec(`update cards_photos set storage_path = 'cut' where id in (select id from cards_photos where status = 'approved' and storage_path is null order by id limit 7)`);
      expect(await plain()).toBe(await call());
    } finally {
      await db.exec('rollback');
    }
  });

  it('ALL-rollback gives back the schema and the rows of before, but the new ids of the 101 photos; ALL-verify answers TOUT_OK false', async () => {
    expect(await failure(db, ROLLBACK)).toBeNull();
    const end = await state(db);
    expect(end.schema).toBe(start.schema);
    // the rows: every table the same, but the catalog and the photos, whose photo ids are new; read through the source page, they are the same
    const diff = end.rows.filter((r, i) => r !== start.rows[i]).map((r) => r.split(' ')[0]);
    expect(diff).toEqual(['public.cards_catalog', 'public.cards_photos']);
    expect(await one<string>(db, BY_PAGE)).toBe(page0);
    // the sequences that do not go back: the idols rows of 099 and 099b, the photos of 102, 103 and of 101 again
    const seq = (t: string): string[] => t.split('\n');
    const moved = seq(await one<string>(db, SEQUENCES)).filter((x) => !seq(seq0).includes(x)).map((x) => x.split(' ')[0]);
    expect(moved).toEqual(['public.cards_photos_id_seq', 'public.idols_id_seq']);
    const v = await verify(db);
    expect(v.at(-1)).toMatchObject({ controle: 'TOUT_OK', ok: false });
    expect(v.map((r) => r.ok)).toEqual(before.map((r) => r.ok));
  });
});

describe('the guard of ALL-099-115.sql, and all or nothing', () => {
  let db: PGlite;
  let s0: { schema: string; rows: string[] };
  beforeAll(async () => {
    db = await prodDb();
    s0 = await state(db);
  });
  const at = (ts: string): string => {
    expect(GUARD.split('now()').length).toBe(2);
    return GUARD.replace('now()', `timestamptz '${ts}'`);
  };

  it('refuses between 23:50 and 00:30 UTC and passes outside, on its text with now() replaced by a fixed time', async () => {
    for (const ts of ['2026-11-15 23:50:00+00', '2026-11-15 23:59:59+00', '2026-11-16 00:00:00+00', '2026-11-16 00:29:59+00', '2026-11-16 01:10:00+01']) {
      expect(await failure(db, `begin; ${at(ts)} commit;`), ts).toMatch(/ALL-099-115: refused between 23:50 and 00:30 UTC/);
    }
    for (const ts of ['2026-11-15 23:49:59+00', '2026-11-16 00:30:00+00', '2026-11-16 12:00:00+00', '2026-11-16 00:40:00+01']) {
      expect(await failure(db, `begin; ${at(ts)} commit;`), ts).toBeNull();
    }
  });

  it('refuses the whole bundle at 23:55 UTC with nothing changed', async () => {
    const late = BUNDLE.replace(GUARD, at('2026-11-15 23:55:00+00'));
    expect(late).not.toBe(BUNDLE);
    expect(await failure(db, late)).toMatch(/refused between 23:50 and 00:30 UTC \(it is 23:55 UTC now\), nothing changed/);
    expect(await state(db)).toEqual(s0);
  });

  it('refuses while a player owns a card or opened a pack, and on a database without the cards tables', async () => {
    await db.exec(`insert into cards_owned (user_id, card_no) values ('${U1}', 1)`);
    const s = await state(db);
    expect(await failure(db, BUNDLE)).toMatch(/ALL-099-115: a player owns a card \(cards_owned is not empty\), nothing changed/);
    expect(await state(db)).toEqual(s);
    await db.exec(`delete from cards_owned; insert into cards_packs (user_id, source, cards) values ('${U1}', 'stock', array[1, 2, 3, 4, 5])`);
    expect(await failure(db, BUNDLE)).toMatch(/ALL-099-115: a pack was opened \(cards_packs is not empty\), nothing changed/);
    await db.exec('delete from cards_packs');
    expect(await state(db)).toEqual(s0);
    const bare = new PGlite();
    expect(await failure(bare, BUNDLE)).toMatch(/ALL-099-115: public.cards_catalog is missing \(001 to 003 and 101 are not applied\), nothing changed/);
  });

  // An injected statement, in a test copy, after the files that change the most rows (099 to 103), then just before the commit.
  it.each([['-- ==== 5/15: 104-economy.sql (verbatim) ====', 'after 103'], ['\ncommit;\n', 'after 115']])('a failure %s (%s) leaves the database exactly as it was', async (mark, where) => {
    expect(BUNDLE.split(mark).length).toBe(2);
    const broken = BUNDLE.replace(mark, `\ndo $x$ begin raise exception 'injected failure ${where}'; end $x$;\n${mark}`);
    expect(await failure(db, broken)).toBe(`injected failure ${where}`);
    expect(await state(db)).toEqual(s0);
  });
});
