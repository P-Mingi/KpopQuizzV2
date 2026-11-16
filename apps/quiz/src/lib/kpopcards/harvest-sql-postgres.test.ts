// KpopCards lot 6: file 116 on a REAL Postgres (a throwaway cluster started with initdb and pg_ctl from the machine's Postgres, as
// bundle-sql-postgres.test.ts does). The real schema files and lot 3's fixture run, then 116 is sent whole as ONE simple query (psql -c, the
// way the Supabase SQL Editor sends it): it commits, the server logs one statement; every old photo and entity is byte for byte the same, public.idols
// too; a second run adds nothing; the catalog built again gives the expected cards (a member inside its group's section, the locked pockets
// without a card); the locks open on the right day; the rollback gives the old photos, entities and catalog back. Skipped, loudly, without Postgres.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

import { HARVEST_SQL, at, harvestBase } from '../cards/harvest-fixture';
import { BASE, SCHEMA_FILES, readCardsSql } from '../cards/sql-harness';

const BIN = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@14/bin', '/opt/homebrew/bin']
  .find((d) => ['initdb', 'pg_ctl', 'psql', 'createdb'].every((b) => existsSync(path.join(d, b))));
const run = BIN ? describe : describe.skip;
if (!BIN) console.warn('HARVEST SQL POSTGRES TEST SKIPPED: no Postgres binary (initdb, pg_ctl, psql, createdb) found on this machine');

let dir = '';
const PORT = 56500 + Math.floor(Math.random() * 3000);
const bin = (n: string): string => path.join(BIN!, n);
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PGTZ: 'UTC' };
type Out = { out: string; err: string; code: number };
function psql(db: string, sql: string, extra: Record<string, string> = {}): Promise<Out> {
  return new Promise((resolve) => {
    execFile(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', db, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env: { ...env, ...extra }, maxBuffer: 1 << 26 }, (e, out, err) => {
      resolve({ out: out.trim(), err: err.trim(), code: e ? ((e as { code?: number }).code ?? 1) : 0 });
    });
  });
}
const feed = (db: string, input: string): void => {
  execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', db, '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { env, input, stdio: ['pipe', 'ignore', 'pipe'] });
};
let copies = 0;
const fresh = (): string => {
  const name = `h${++copies}`;
  execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-T', 'h0', name], { env });
  return name;
};
const md5 = (db: string, from: string, strip = ''): Promise<string> =>
  psql(db, `select coalesce(md5(string_agg((to_jsonb(t)${strip})::text, E'\\n' order by to_jsonb(t)->>'id')), 'empty') from ${from} t`).then((r) => r.out);
const SQL = at(HARVEST_SQL.sql, '12:00');
const ORDER = `select string_agg(entity_id || ':' || rarity || ':' || part, ' ' order by card_no) from cards_catalog`;

run('116-photos-harvest.sql on a real Postgres', () => {
  let version = '';
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.homedir(), '.kc-pg-'));
    execFileSync(bin('initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '-A', 'trust', '-E', 'UTF8'], { env, stdio: 'ignore' });
    execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses= -c fsync=off -c log_statement=all -c log_line_prefix='[%a] '`,
      '-l', path.join(dir, 'pg.log'), '-w', 'start'], { env, stdio: 'ignore' });
    execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', 'h0'], { env });
    feed('h0', BASE);
    for (const f of SCHEMA_FILES) feed('h0', readCardsSql(f));
    for (const f of harvestBase()) feed('h0', f);
    version = execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'h0', '-X', '-At', '-c', 'show server_version'], { env, encoding: 'utf8' }).trim();
  });
  afterAll(() => {
    if (!dir) return;
    try { execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop'], { env, stdio: 'ignore' }); } catch { /* already stopped */ }
    rmSync(dir, { recursive: true, force: true });
  });

  it('sent whole as ONE query (psql -c) it commits, and the server logs one statement', async () => {
    const db = fresh();
    const r = await psql(db, SQL, { PGAPPNAME: 'harvest-one' });
    expect(r.err).not.toMatch(/ERROR/);
    expect(r.code).toBe(0);
    const logged = readFileSync(path.join(dir, 'pg.log'), 'utf8').split('\n').filter((l) => l.startsWith('[harvest-one] ') && l.includes('LOG:  statement: ')).length;
    expect(logged).toBe(1);
    expect(r.err).toMatch(/116-photos-harvest: 9 subjects, \d+ entities added/);
    console.log(`116 on Postgres ${version}: ${Buffer.byteLength(SQL)} bytes`);
  });

  it('the Verify lines hold, an old row is byte for byte the same, the old public.idols rows too, and a second run adds nothing', async () => {
    const db = fresh();
    const oldPhotos = await md5(db, 'cards_photos');
    const oldEnts = await md5(db, 'cards_entities');
    const oldIdols = await md5(db, 'public.idols');
    const maxPhoto = Number((await psql(db, 'select max(id) from cards_photos')).out);
    expect((await psql(db, SQL)).code).toBe(0);
    expect(await md5(db, `(select * from cards_photos where id <= ${maxPhoto})`)).toBe(oldPhotos);
    expect(await md5(db, `(select * from cards_entities where id not in (select ref from cards_harvest_log where kind = 'entity'))`, " - 'age_lock'")).toBe(oldEnts);
    // integrator, 2026-11-16 (listed): public.idols gains the logged rows only (was: the whole table unchanged)
    expect(await md5(db, `(select * from public.idols where id not in (select ref::integer from cards_harvest_log where kind = 'idol'))`)).toBe(oldIdols);
    expect((await psql(db, `select count(*) from public.idols where review_reason like '116-photos-harvest%' and not active and needs_review and birth_date is null`)).out).toBe('1');
    for (const line of HARVEST_SQL.sql.split('\n').filter((l) => l.startsWith('-- Verify:'))) {
      const q = /^-- Verify: (.*?);\s{3}/.exec(line)?.[1];
      expect(q, line).toBeTruthy();
      expect((await psql(db, q!, { PGOPTIONS: '-c default_transaction_read_only=on' })).code, line).toBe(0);
    }
    expect((await psql(db, 'select count(*) from cards_entities where age_lock')).out).toBe('2');
    const after = await md5(db, 'cards_photos');
    const r = await psql(db, SQL);
    expect(r.err).toMatch(/0 entities added \(0 of them group lines of a member\), 0 locked pockets, photos added 0 \(0 to review\)/);
    expect(await md5(db, 'cards_photos')).toBe(after);
  });

  it('gives the expected cards once the catalog is built, with a member inside its group section and no card for a locked pocket', async () => {
    const db = fresh();
    await psql(db, SQL);
    expect((await psql(db, 'select (public.cards_build_catalog())->>\'cards\'')).code).toBe(0);
    const order = (await psql(db, ORDER)).out;
    expect(order.startsWith('idol:jennie:C:0 idol:jennie:U:0 idol:jennie:R:0 idol:eunkwang-btob:C:0 idol:eunkwang-btob:U:0 group:btob:C:1 group:btob:C:2')).toBe(true);
    expect(order).toMatch(/idol:ada-trio:R:0$/);
    expect(order).not.toMatch(/cleo-trio|group:trio|bea-trio/);
  });

  it('opens the locks on the right day (a fixed clock), and keeps them from a browser role', async () => {
    const db = fresh();
    await psql(db, SQL);
    const q = (d: string) => psql(db, `select string_agg(entity_id || '=' || locked || '/' || coalesce(to_char(opens_month, 'YYYY-MM'), '-'), ' ' order by entity_id) from cards_age_locks('${d}'::date)`).then((r) => r.out);
    expect(await q('2028-03-14')).toBe('group:trio=true/2028-03 idol:cleo-trio=true/2028-03');
    expect(await q('2028-03-15')).toBe('group:trio=false/- idol:cleo-trio=false/-');
    expect((await psql(db, `set role anon; select * from cards_age_locks()`)).err).toMatch(/permission denied/);
  });

  it('the rollback gives the old photos, entities and catalog back; a player owning a card of these subjects refuses it', async () => {
    const db = fresh();
    const old = { photos: await md5(db, 'cards_photos'), ents: await md5(db, 'cards_entities'), idols: await md5(db, 'public.idols'), order: (await psql(db, ORDER)).out };
    await psql(db, SQL);
    await psql(db, 'select public.cards_build_catalog()');
    const r = await psql(db, HARVEST_SQL.rollback);
    expect(r.code, r.err).toBe(0);
    expect(await md5(db, 'cards_photos')).toBe(old.photos);
    expect(await md5(db, 'cards_entities')).toBe(old.ents);
    expect(await md5(db, 'public.idols')).toBe(old.idols);
    expect((await psql(db, ORDER)).out).toBe(old.order);
    const owned = fresh();
    await psql(owned, SQL);
    await psql(owned, 'select public.cards_build_catalog()');
    feed(owned, `insert into auth.users values ('00000000-0000-4000-8000-000000000001'); insert into cards_owned (user_id, card_no, copies) values ('00000000-0000-4000-8000-000000000001', 1, 1);`);
    expect((await psql(owned, HARVEST_SQL.rollback)).err).toMatch(/a player owns a card of these subjects/);
  });
});
