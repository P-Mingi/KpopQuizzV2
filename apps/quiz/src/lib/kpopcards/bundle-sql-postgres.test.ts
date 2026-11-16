// KpopCards, PR #231: the bundle on a REAL Postgres (a throwaway cluster started with initdb and pg_ctl from the machine's Postgres, as
// catalog-append-concurrency.test.ts does), in the state of 2026-11-14 (cards/bundle-fixture.ts), copied from a template database for
// each run. Checked:
//   - sent the way the Supabase SQL Editor sends a script, the WHOLE text as ONE simple query (psql -c with the full text): the server
//     logs one statement for it (log_statement=all), it commits, and its duration is measured on three fresh copies;
//   - ALL-verify inside read-only transactions (default_transaction_read_only=on): every row ok, TOUT_OK true;
//   - the owner's psql command (-f, ON_ERROR_STOP=1, the connection in SUPABASE_DB_URL, no password) gives the same database, the file
//     split by psql into its statements; with -1 added psql wraps it in a second transaction (warnings, same result);
//   - a second run is refused by the guard, nothing changed (pg_dump of the schemas and the rows the same);
//   - ALL-rollback gives back the schema dump of before byte for byte, and the rows but the new ids of the 101 photos.
// Skipped, loudly, when no Postgres binary is found.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

import { CARDS_DIR, OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';
import { ROW_SUMS_SQL, prodStateSql, rowSumOf } from '../cards/bundle-fixture';

const BIN = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/bin']
  .find((d) => ['initdb', 'pg_ctl', 'psql', 'pg_dump', 'createdb'].every((b) => existsSync(path.join(d, b))));
const BUNDLE = readCards(OUTPUTS.bundle);
const VERIFY = readCards(OUTPUTS.verify);
const ROLLBACK = readCards(OUTPUTS.rollback);
// psql -c takes the script as one argument: Linux caps one argument at 128 KiB, macOS takes the whole script
const ONE_ARG_OK = process.platform === 'darwin' || Buffer.byteLength(BUNDLE) < 131_072;

const run = BIN && ONE_ARG_OK ? describe : describe.skip;
if (!BIN) console.warn('BUNDLE POSTGRES TEST SKIPPED: no Postgres binary (initdb, pg_ctl, psql, pg_dump, createdb) found on this machine');
else if (!ONE_ARG_OK) console.warn('BUNDLE POSTGRES TEST SKIPPED: psql -c cannot take a script this long as one argument on this system');

let dir = '';
const PORT = 56000 + Math.floor(Math.random() * 3000);
const bin = (n: string): string => path.join(BIN!, n);
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PGTZ: 'UTC' };
const url = (db: string): string => `postgresql://postgres@/${db}?host=${encodeURIComponent(dir)}&port=${PORT}`;

type Out = { out: string; err: string; code: number; ms: number };
function exec(file: string, args: string[], extra: Record<string, string> = {}): Promise<Out> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    execFile(file, args, { env: { ...env, ...extra }, maxBuffer: 1 << 26 }, (e, out, err) => {
      resolve({ out: out.trim(), err: err.trim(), code: e ? ((e as { code?: number }).code ?? 1) : 0, ms: performance.now() - t0 });
    });
  });
}
/** The whole text as ONE query (psql -c), as the SQL Editor sends it. */
const psqlC = (db: string, sql: string, extra: Record<string, string> = {}): Promise<Out> =>
  exec(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', db, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], extra);
/** The owner's command, through a shell so it reads the URL from SUPABASE_DB_URL. */
const owner = (db: string, file: string, flags = '', app = 'owner'): Promise<Out> =>
  exec('/bin/sh', ['-c', `"${bin('psql')}" "$SUPABASE_DB_URL" -X ${flags}-v ON_ERROR_STOP=1 -f "${path.join(CARDS_DIR, file)}"`], { SUPABASE_DB_URL: url(db), PGAPPNAME: app });
let copies = 0;
function fresh(): string {
  const name = `kc${++copies}`;
  execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-T', 'kc0', name], { env });
  return name;
}
// the schemas the files touch; pg_dump 18 frames its output with a random restrict key line, left out
const dump = async (db: string): Promise<string> =>
  (await exec(bin('pg_dump'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '--schema-only', '-n', 'public', '-n', 'auth', '-n', 'storage', db])).out
    .split('\n').filter((l) => !/^\\(un)?restrict /.test(l)).join('\n');
async function rows(db: string): Promise<string[]> {
  const tables = (await psqlC(db, ROW_SUMS_SQL)).out.split('\n');
  const sums: string[] = [];
  for (const t of tables) sums.push((await psqlC(db, rowSumOf(t))).out);
  return sums;
}
/** How many statements the server logged for a session (log_statement=all, the application name in the line prefix). */
const logged = (app: string): number => readFileSync(path.join(dir, 'pg.log'), 'utf8').split('\n').filter((l) => l.startsWith(`[${app}] `) && l.includes('LOG:  statement: ')).length;
const BY_PAGE = `select md5(string_agg(x::text, E'\\n' order by x::text)) from (
  select to_jsonb(c) - 'photo_id' || jsonb_build_object('photo', p.source_page) as x from cards_catalog c join cards_photos p on p.id = c.photo_id
  union all select to_jsonb(p) - 'id' from cards_photos p) y`;
const READ_ONLY = { PGOPTIONS: '-c default_transaction_read_only=on' };

run('the bundle on a real Postgres', () => {
  let version = '';
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.homedir(), '.kc-pg-'));
    execFileSync(bin('initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '-A', 'trust', '-E', 'UTF8'], { env, stdio: 'ignore' });
    execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses= -c fsync=off -c log_statement=all -c log_line_prefix='[%a] '`,
      '-l', path.join(dir, 'pg.log'), '-w', 'start'], { env, stdio: 'ignore' });
    execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', 'kc0'], { env });
    for (const sql of prodStateSql()) {
      execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc0', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { env, input: sql, stdio: ['pipe', 'ignore', 'pipe'] });
    }
    version = execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc0', '-X', '-At', '-c', 'show server_version'], { env, encoding: 'utf8' }).trim();
  });
  afterAll(() => {
    if (!dir) return;
    try { execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop'], { env, stdio: 'ignore' }); } catch { /* already stopped */ }
    rmSync(dir, { recursive: true, force: true });
  });

  it('the template is the state of 2026-11-14: 92 cards of 23 subjects, no part column, no row of 099', async () => {
    expect((await psqlC('kc0', `select count(*) || ' ' || count(distinct entity_id) from cards_catalog`)).out).toBe('92 23');
    expect((await psqlC('kc0', `select count(*) from information_schema.columns where table_name = 'cards_catalog' and column_name = 'part'`)).out).toBe('0');
    expect((await psqlC('kc0', `select count(*) from idols where review_reason like '099%'`)).out).toBe('0');
  });

  it('sent whole as ONE query (psql -c), the bundle commits on three fresh copies; the server logs one statement each', async () => {
    const ms: number[] = [];
    for (let k = 1; k <= 3; k++) {
      const db = fresh();
      const r = await psqlC(db, BUNDLE, { PGAPPNAME: `bundle-c-${k}` });
      expect(r.err, `run ${k}`).not.toMatch(/ERROR/);
      expect(r.code, `run ${k}`).toBe(0);
      expect(logged(`bundle-c-${k}`)).toBe(1);
      expect((await psqlC(db, `select count(*) from information_schema.columns where table_name = 'cards_catalog' and column_name = 'part'`)).out).toBe('1');
      ms.push(Math.round(r.ms));
    }
    console.log(`bundle on Postgres ${version} (${os.cpus()[0]?.model ?? 'cpu'}): ${Buffer.byteLength(BUNDLE)} bytes, psql -c runs ${ms.join(' ms, ')} ms`);
  });

  it('ALL-verify, whole, in a read-only transaction: every row ok, TOUT_OK true; before the bundle TOUT_OK false', async () => {
    const before = await psqlC('kc0', VERIFY, READ_ONLY);
    expect(before.code).toBe(0);
    expect(before.out.split('\n')).toHaveLength(86);
    expect(before.out.split('\n').at(-1)).toBe('ALL-099-115.sql|TOUT_OK|true|false|f');
    const after = await psqlC('kc1', VERIFY, READ_ONLY);
    expect(after.code).toBe(0);
    const lines = after.out.split('\n');
    expect(lines).toHaveLength(86);
    expect(lines.filter((l) => !l.endsWith('|t'))).toEqual([]);
    expect(lines.at(-1)).toBe('ALL-099-115.sql|TOUT_OK|true|true|t');
    // the same statement is refused in a read-only transaction the moment it would write: the setting is on
    expect((await psqlC('kc1', 'create table public.ro_probe (x int)', READ_ONLY)).err).toMatch(/cannot execute CREATE TABLE in a read-only transaction/);
  });

  it('stays TOUT_OK through the owner\'s admin work before the first pack (a review that changes the live photos waits for the rebuild); a card owned or a pack opened makes it false', async () => {
    const db = 'kc2';
    const sql = async (q: string): Promise<string> => {
      const r = await psqlC(db, q);
      expect(r.code, r.err).toBe(0);
      return r.out;
    };
    // the rows of ALL-verify that are not ok, "file line N", read only
    const failing = async (): Promise<string[]> => {
      const r = await psqlC(db, VERIFY, READ_ONLY);
      expect(r.code, r.err).toBe(0);
      return r.out.split('\n').map((l) => l.split('|')).filter((c) => c.at(-1) === 'f' && c[1] !== 'TOUT_OK').map((c) => `${c[0]} ${c[1]!.split(':')[0]}`);
    };
    const CATALOG = ['102-catalog-rebuild.sql line 27', '103-catalog-photos.sql line 29', '103-catalog-photos.sql line 31', '114-catalog-append.sql line 26', '114-catalog-append.sql line 27'];
    expect(await failing()).toEqual([]);
    await sql(`update cards_photos set status = 'rejected' where id in (select id from cards_photos where status = 'pending' order by id limit 4)`);
    await sql(`update cards_photos set focal_x = 42, focal_y = 33 where id in (select id from cards_photos where status in ('auto', 'approved') order by id limit 3)`);
    expect(await failing()).toEqual([]);
    await sql(`update cards_photos set status = 'approved' where id in (select id from cards_photos where status = 'pending' order by id limit 20)`);
    let f = await failing();
    expect(f).toContain('103-catalog-photos.sql line 29');
    expect(f.filter((x) => !CATALOG.includes(x))).toEqual([]);
    await sql('select public.cards_build_catalog()');
    expect(await failing()).toEqual([]);
    await sql(`update cards_photos set status = 'rejected' where id in (select distinct p.id from cards_photos p join cards_catalog c on c.photo_id = p.id where p.status = 'auto' order by p.id limit 2)`);
    f = await failing();
    expect(f).toContain('103-catalog-photos.sql line 31');
    expect(f.filter((x) => !CATALOG.includes(x))).toEqual([]);
    await sql('select public.cards_build_catalog()');
    expect(await failing()).toEqual([]);
    const inPacks = async (): Promise<number> => Number(await sql('select count(*) from cards_catalog where in_packs'));
    const n0 = await inPacks();
    await sql(`update cards_photos set storage_path = 'cut-' || id, file_focal_x = focal_x, file_focal_y = focal_y
      where id in (select id from cards_photos where status in ('auto', 'approved') and storage_path is null order by id limit 30)`);
    expect(await inPacks()).toBeGreaterThan(n0);
    expect(await failing()).toEqual([]);
    await sql('select public.cards_build_catalog()');
    expect(await failing()).toEqual([]);
    expect((await psqlC(db, VERIFY, READ_ONLY)).out.split('\n').at(-1)).toBe('ALL-099-115.sql|TOUT_OK|true|true|t');
    const OWNED = ['102-catalog-rebuild.sql line 26', '103-catalog-photos.sql line 28'];
    const user = (await sql('select user_id from cards_wallets order by user_id limit 1'));
    await sql(`insert into cards_owned (user_id, card_no) values ('${user}', 1)`);
    expect(await failing()).toEqual(OWNED);
    await sql(`delete from cards_owned`);
    await sql(`insert into cards_packs (user_id, source, cards, seq) values ('${user}', 'stock', array[1, 2, 3, 4, 5], 1); update cards_wallets set packs_opened = packs_opened + 1 where user_id = '${user}'`);
    expect(await failing()).toEqual(OWNED);
    await sql(`delete from cards_packs; update cards_wallets set packs_opened = packs_opened - 1 where user_id = '${user}'`);
    expect(await failing()).toEqual([]);
  });

  it('the owner\'s psql command (-f, ON_ERROR_STOP=1, SUPABASE_DB_URL) gives the database of the one-query run; psql splits the file', async () => {
    const db = fresh();
    const r = await owner(db, OUTPUTS.bundle, '', 'owner-f');
    expect(r.code).toBe(0);
    expect(r.err).not.toMatch(/ERROR|WARNING/);
    // psql -f sends the statements one by one: begin, the guard, the 15 DO blocks, commit
    expect(logged('owner-f')).toBe(18);
    expect(await dump(db)).toBe(await dump('kc1'));
    expect((await psqlC(db, BY_PAGE)).out).toBe((await psqlC('kc1', BY_PAGE)).out);
  });

  it('with -1 added, psql opens its own transaction around the file: the file\'s begin and commit give warnings, the result is the same', async () => {
    const db = fresh();
    const r = await owner(db, OUTPUTS.bundle, '-1 ');
    expect(r.code).toBe(0);
    expect(r.err).toMatch(/WARNING: {2}there is already a transaction in progress/);
    expect(r.err).toMatch(/WARNING: {2}there is no transaction in progress/);
    expect(await dump(db)).toBe(await dump('kc1'));
  });

  it('a second run is refused by the guard, nothing changed', async () => {
    const d0 = await dump('kc1');
    const r0 = await rows('kc1');
    const r = await psqlC('kc1', BUNDLE);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/ALL-099-115: cards_catalog already has the column part \(102 is applied\), nothing changed/);
    expect(await dump('kc1')).toBe(d0);
    expect(await rows('kc1')).toEqual(r0);
  });

  it('ALL-rollback, whole as one query: the schema dump of before byte for byte, the rows but the new photo ids, TOUT_OK false', async () => {
    const r = await psqlC('kc1', ROLLBACK);
    expect(r.code).toBe(0);
    expect(await dump('kc1')).toBe(await dump('kc0'));
    const a = await rows('kc0');
    const b = await rows('kc1');
    expect(b.filter((x, i) => x !== a[i]).map((x) => x.split(' ')[0])).toEqual(['public.cards_catalog', 'public.cards_photos']);
    expect((await psqlC('kc1', BY_PAGE)).out).toBe((await psqlC('kc0', BY_PAGE)).out);
    const seq = `select string_agg(schemaname || '.' || sequencename || ' ' || coalesce(last_value::text, '-'), ',' order by schemaname, sequencename) from pg_sequences`;
    const s0 = (await psqlC('kc0', seq)).out.split(',');
    const s1 = (await psqlC('kc1', seq)).out.split(',');
    expect(s1.filter((x) => !s0.includes(x)).map((x) => x.split(' ')[0])).toEqual(['public.cards_photos_id_seq', 'public.idols_id_seq']);
    expect((await psqlC('kc1', VERIFY, READ_ONLY)).out.split('\n').at(-1)).toBe('ALL-099-115.sql|TOUT_OK|true|false|f');
  });
});
