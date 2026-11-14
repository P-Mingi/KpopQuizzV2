// KpopCards file 114 on a REAL Postgres (PGlite is one connection and cannot show a race): a throwaway cluster started with initdb and pg_ctl
// from the machine's Postgres (Homebrew), the real files applied with psql. The catalog is built, a player opens a pack, new photos are
// approved; then the preview, the append, and the proofs: every old card row and every owned / pack / wallet row byte for byte unchanged, the
// new numbers start at max + 1, pairs consecutive, a one photo subject stays out, a second call adds 0, a browser role cannot execute it, and
// appends fired in parallel never share a number. Skipped, loudly, when no Postgres binary is found.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

import { AKMU_SECOND, APPROVE_ALL, PLAYER, catalogFiles } from '../cards/catalog-append-fixture';
import { BASE, SCHEMA_FILES, readCardsSql } from '../cards/sql-harness';

const BIN = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@14/bin', '/opt/homebrew/bin']
  .find((d) => existsSync(path.join(d, 'initdb')) && existsSync(path.join(d, 'pg_ctl')) && existsSync(path.join(d, 'psql')));

const run = BIN ? describe : describe.skip;
if (!BIN) console.warn('CATALOG APPEND CONCURRENCY TEST SKIPPED: no Postgres binary (initdb, pg_ctl, psql) found on this machine');

let dir = '';
const PORT = 59000 + Math.floor(Math.random() * 3000);
const bin = (n: string): string => path.join(BIN!, n);
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PATH: `${BIN ?? ''}:${process.env.PATH ?? ''}` };

function psql(sql: string): Promise<{ out: string; err: string; code: number }> {
  return new Promise((resolve) => {
    execFile(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env, maxBuffer: 1 << 24 }, (e, out, err) => {
      resolve({ out: out.trim(), err: err.trim(), code: e ? ((e as { code?: number }).code ?? 1) : 0 });
    });
  });
}
const psqlSync = (input: string): void => {
  execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { env, input, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
};

const SNAP = `select md5(coalesce((select string_agg(to_jsonb(c)::text, ',' order by card_no) from cards_catalog c where card_no <= %MAX%), '')) || '/' ||
  md5(coalesce((select string_agg(to_jsonb(o)::text, ',' order by user_id, card_no) from cards_owned o), '')) || '/' ||
  md5(coalesce((select string_agg(to_jsonb(k)::text, ',' order by id) from cards_packs k), '')) || '/' ||
  md5(coalesce((select string_agg(to_jsonb(w)::text, ',') from cards_wallets w), ''))`;
const snap = async (max: number): Promise<string> => (await psql(SNAP.replace('%MAX%', String(max)))).out;
type Answer = { dry_run: boolean; cards: number; subjects: number; from_no: number | null; to_no: number | null };
const ans = (r: { out: string }): Answer => JSON.parse(r.out) as Answer;

run('cards_catalog_append on a real Postgres', () => {
  beforeAll(() => {
    dir = mkdtempSync(path.join(os.homedir(), '.kc-pg-'));
    execFileSync(bin('initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '-A', 'trust', '-E', 'UTF8'], { env, stdio: 'ignore' });
    execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses= -c fsync=off -c max_connections=60`, '-l', path.join(dir, 'pg.log'), '-w', 'start'], { env, stdio: 'ignore' });
    execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', 'kc'], { env });
    psqlSync(BASE);
    for (const f of SCHEMA_FILES) psqlSync(readCardsSql(f));
    for (const f of catalogFiles()) psqlSync(f);
    psqlSync(PLAYER);
    psqlSync(readCardsSql('114-catalog-append.sql'));
  });
  afterAll(() => {
    if (!dir) return;
    try { execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop'], { env, stdio: 'ignore' }); } catch { /* already stopped */ }
    rmSync(dir, { recursive: true, force: true });
  });

  let max0 = 0;
  let before = '';

  it('the rebuild is refused (a player holds cards), the append has nothing to add before a new photo', async () => {
    expect((await psql('select cards_build_catalog()')).err).toMatch(/owns a card/);
    max0 = Number((await psql('select max(card_no) from cards_catalog')).out);
    expect(max0).toBeGreaterThan(0);
    expect(ans(await psql('select cards_catalog_append(false)'))).toMatchObject({ cards: 0, from_no: null });
  });

  it('after new approvals the preview counts the cards and writes nothing', async () => {
    psqlSync(APPROVE_ALL);
    before = await snap(max0);
    const p = ans(await psql('select cards_catalog_append(true)'));
    expect(p).toMatchObject({ dry_run: true, cards: 6, subjects: 3, from_no: max0 + 1, to_no: max0 + 6 });
    expect((await psql('select cards_catalog_append()')).out).toContain('"dry_run": true');
    expect(Number((await psql('select count(*) from cards_catalog')).out)).toBe(max0);
    expect(await snap(max0)).toBe(before);
  });

  it('4 appends at once: one adds the 6 cards, the others add 0, no number is given twice, nothing existing changes', async () => {
    const rs = await Promise.all(Array.from({ length: 4 }, () => psql('select cards_catalog_append(false)')));
    expect(rs.map((r) => r.code)).toEqual([0, 0, 0, 0]);
    const added = rs.map((r) => ans(r).cards).sort((a, b) => a - b);
    expect(added).toEqual([0, 0, 0, 6]);
    expect((await psql('select max(card_no) || \'/\' || count(*) || \'/\' || count(distinct card_no) || \'/\' || count(distinct num) from cards_catalog')).out).toBe(`${max0 + 6}/${max0 + 6}/${max0 + 6}/${max0 + 6}`);
    expect(await snap(max0)).toBe(before);
    expect((await psql('select count(*) from cards_owned')).out).toBe('2');
    expect((await psql('select count(*) from cards_packs')).out).toBe('1');
  });

  it('the new numbers start at max + 1, a pair is consecutive, a subject with one photo stays out of the packs', async () => {
    expect((await psql(`select min(card_no) from cards_catalog where card_no > ${max0}`)).out).toBe(String(max0 + 1));
    expect((await psql(`select count(*) from cards_catalog a join cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2
      where a.part = 1 and b.card_no <> a.card_no + 1`)).out).toBe('0');
    expect((await psql(`select count(*) from cards_catalog where entity_id = 'group:akmu'`)).out).toBe('0');
    expect((await psql(`select count(*) from (select entity_id, photo_id from cards_catalog group by 1, 2 having count(distinct rarity) > 1) x`)).out).toBe('0');
  });

  it('a second call adds 0', async () => {
    expect(ans(await psql('select cards_catalog_append(false)'))).toMatchObject({ cards: 0, subjects: 0 });
  });

  it('a later photo of AKMU, 5 appends at once: one adds its 4 cards after the previous maximum, once', async () => {
    const m = Number((await psql('select max(card_no) from cards_catalog')).out);
    psqlSync(AKMU_SECOND);
    const rs = await Promise.all(Array.from({ length: 5 }, () => psql('select cards_catalog_append(false)')));
    expect(rs.map((r) => r.code)).toEqual([0, 0, 0, 0, 0]);
    expect(rs.map((r) => ans(r).cards).sort((a, b) => a - b)).toEqual([0, 0, 0, 0, 4]);
    expect((await psql(`select string_agg(card_no::text || rarity || part, ',' order by card_no) from cards_catalog where card_no > ${m}`)).out).toBe(`${m + 1}C1,${m + 2}C2,${m + 3}U1,${m + 4}U2`);
    expect(await snap(max0)).toBe(before);
  });

  it('a browser role cannot execute it, the service role can', async () => {
    for (const role of ['anon', 'authenticated']) {
      const r = await psql(`set role ${role}; select cards_catalog_append(true)`);
      expect(r.code).not.toBe(0);
      expect(r.err).toMatch(/permission denied/);
    }
    expect((await psql('set role service_role; select cards_catalog_append(true) ->> \'dry_run\'')).out).toContain('true');
  });
});
