// KpopCards: the concurrency proof on a REAL Postgres (PGlite is a single connection and cannot show a race). A throwaway cluster is started with
// initdb and pg_ctl from the machine's Postgres (Homebrew 18 or 14), the real files are applied with psql, and openings are fired from several
// psql processes at once on ONE account. The test is skipped, loudly, when no Postgres binary is found.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

import { BASE, CARDS_SQL, SCHEMA_FILES } from '../cards/sql-harness';

const BIN = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@14/bin', '/opt/homebrew/bin']
  .find((d) => existsSync(path.join(d, 'initdb')) && existsSync(path.join(d, 'pg_ctl')) && existsSync(path.join(d, 'psql')));

const run = BIN ? describe : describe.skip;
if (!BIN) console.warn('CONCURRENCY TEST SKIPPED: no Postgres binary (initdb, pg_ctl, psql) found on this machine');

let dir = '';
const PORT = 56000 + Math.floor(Math.random() * 3000);
const bin = (n: string): string => path.join(BIN!, n);
const env = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PATH: `${BIN ?? ''}:${process.env.PATH ?? ''}` };

function psql(sql: string): Promise<{ out: string; err: string; code: number }> {
  return new Promise((resolve) => {
    execFile(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-d', 'kc', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env }, (e, out, err) => {
      resolve({ out: out.trim(), err: err.trim(), code: e ? ((e as { code?: number }).code ?? 1) : 0 });
    });
  });
}
const psqlSync = (args: string[], input?: string): string =>
  execFileSync(bin('psql'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], { env, input, encoding: 'utf8' });

const PART = `
  alter table public.cards_catalog add column part smallint not null default 0;
  alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  alter table public.cards_catalog drop constraint cards_catalog_entity_rarity_key;
  alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
`;

const uuid = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const DRAW = { c: [1, 2, 6, 3, 13], g: 7, u: 4 };
const open = (user: string, key: string, n: 1 | 5 = 1, at = '2026-11-12T10:00:00Z'): Promise<{ out: string; err: string; code: number }> =>
  psql(`select public.cards_open('${user}', '${key}', 'stock', 'all', null, '${JSON.stringify(Array(n).fill(DRAW))}'::jsonb, '${at}', 10, 3, 40)`);

run('openings in parallel on one account, on a real Postgres', () => {
  beforeAll(async () => {
    dir = mkdtempSync(path.join(os.homedir(), '.kc-pg-'));
    execFileSync(bin('initdb'), ['-D', path.join(dir, 'data'), '-U', 'postgres', '-A', 'trust', '-E', 'UTF8'], { env, stdio: 'ignore' });
    execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-o', `-p ${PORT} -k ${dir} -c listen_addresses= -c fsync=off -c max_connections=60`, '-l', path.join(dir, 'pg.log'), '-w', 'start'], { env, stdio: 'ignore' });
    execFileSync(bin('createdb'), ['-h', dir, '-p', String(PORT), '-U', 'postgres', 'kc'], { env });
    const { seedCatalog, seedGroupTypes } = await import('./sql-fixture');
    void seedCatalog; void seedGroupTypes;
    psqlSync(['-d', 'kc'], BASE);
    for (const f of SCHEMA_FILES) psqlSync(['-d', 'kc'], readFileSync(path.join(CARDS_SQL, f), 'utf8'));
    psqlSync(['-d', 'kc'], PART);
    // The catalog of the tests: copy the INSERT statements from sql-fixture.ts, run as plain SQL.
    const src = readFileSync(path.join(__dirname, 'sql-fixture.ts'), 'utf8');
    const seed = /await db\.exec\(`\n(\s+insert into public\.cards_entities[\s\S]*?)\n  `\);/.exec(src)![1]!;
    psqlSync(['-d', 'kc'], seed);
    for (const f of ['104-economy.sql', '105-goals.sql', '107-prefs.sql', '110-core.sql']) psqlSync(['-d', 'kc'], readFileSync(path.join(CARDS_SQL, f), 'utf8'));
    psqlSync(['-d', 'kc'], `insert into public.cards_group_types (entity_id, gender, source_a, source_b, checked_on) values
      ('group:G1', 'girl', 'a', 'b', '2026-11-13'), ('group:G2', 'boy', 'a', 'b', '2026-11-13'), ('group:G3', 'girl', 'a', 'b', '2026-11-13'), ('group:G4', 'boy', 'a', 'b', '2026-11-13');`);
  });
  afterAll(() => {
    if (!dir) return;
    try { execFileSync(bin('pg_ctl'), ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop'], { env, stdio: 'ignore' }); } catch { /* already stopped */ }
    rmSync(dir, { recursive: true, force: true });
  });

  const user = async (i: number): Promise<string> => {
    const u = uuid(i);
    await psql(`insert into auth.users values ('${u}')`);
    return u;
  };

  it('10 openings in parallel on a stack of 10: the exact stack, one pack number each, no extra card', async () => {
    const u = await user(1);
    const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => open(u, `${uuid(100 + i)}`)));
    expect(rs.map((r) => r.code)).toEqual(Array(10).fill(0));
    const w = await psql(`select stock, packs_opened from public.cards_wallets where user_id = '${u}'`);
    expect(w.out).toBe('0|10');
    const seq = await psql(`select string_agg(seq::text, ',' order by seq) from public.cards_packs where user_id = '${u}'`);
    expect(seq.out).toBe('1,2,3,4,5,6,7,8,9,10');
    // 10 packs of 5 cards: 50 card copies, not one more; the golden pack is the 10th and the cards are what the draws say.
    const copies = await psql(`select sum(copies) from public.cards_owned where user_id = '${u}'`);
    expect(copies.out).toBe('50');
    const golden = await psql(`select string_agg(seq::text, ',' order by seq) from public.cards_packs where user_id = '${u}' and golden`);
    expect(golden.out).toBe('10');
    const fifth = await psql(`select cards[5] from public.cards_packs where user_id = '${u}' and seq = 10`);
    expect(fifth.out).toBe('7'); // the golden fifth card
    expect((await psql(`select count(*) from public.cards_audit where user_id = '${u}' and kind = 'open'`)).out).toBe('10');
  });

  it('14 openings on a stack of 10: exactly 10 succeed, 4 are refused "empty", the stack stops at 0', async () => {
    const u = await user(2);
    const rs = await Promise.all(Array.from({ length: 14 }, (_, i) => open(u, `${uuid(200 + i)}`)));
    expect(rs.filter((r) => r.code === 0)).toHaveLength(10);
    expect(rs.filter((r) => /cards: empty/.test(r.err))).toHaveLength(4);
    expect((await psql(`select stock from public.cards_wallets where user_id = '${u}'`)).out).toBe('0');
    expect((await psql(`select sum(copies) from public.cards_owned where user_id = '${u}'`)).out).toBe('50');
    expect((await psql(`select count(*) from public.cards_packs where user_id = '${u}'`)).out).toBe('10');
  });

  it('the same key fired 8 times at once gives one pack and the same answer to all', async () => {
    const u = await user(3);
    const k = uuid(300);
    const rs = await Promise.all(Array.from({ length: 8 }, () => open(u, k)));
    expect(rs.map((r) => r.code)).toEqual(Array(8).fill(0));
    const ids = new Set(rs.map((r) => (JSON.parse(r.out) as { packs: Array<{ id: string }> }).packs[0]!.id));
    expect(ids.size).toBe(1);
    expect(rs.filter((r) => (JSON.parse(r.out) as { replayed: boolean }).replayed)).toHaveLength(7);
    expect((await psql(`select stock from public.cards_wallets where user_id = '${u}'`)).out).toBe('9');
    expect((await psql(`select count(*) from public.cards_packs where user_id = '${u}'`)).out).toBe('1');
  });

  it('3 Open 5 in parallel on a stack of 10: 2 succeed and 1 is refused "stack_short"; pack numbers 1 to 10 once each', async () => {
    const u = await user(4);
    const rs = await Promise.all([0, 1, 2].map((i) => open(u, uuid(400 + i), 5)));
    expect(rs.filter((r) => r.code === 0)).toHaveLength(2);
    expect(rs.filter((r) => /cards: stack_short/.test(r.err))).toHaveLength(1);
    expect((await psql(`select string_agg(seq::text, ',' order by seq) from public.cards_packs where user_id = '${u}'`)).out).toBe('1,2,3,4,5,6,7,8,9,10');
    expect((await psql(`select count(distinct batch) from public.cards_packs where user_id = '${u}'`)).out).toBe('2');
  });

  it('parallel openings across the Gold guarantee: it fires once, on the 30th pack, whatever the order', async () => {
    const u = await user(5);
    await psql(`insert into public.cards_wallets (user_id, stock, anchor, paris_day) values ('${u}', 200, '2026-11-12T10:00:00Z', '2026-11-12')`);
    // 31 openings, 8 at a time.
    for (let wave = 0; wave < 4; wave++) {
      const n = wave < 3 ? 8 : 7;
      const rs = await Promise.all(Array.from({ length: n }, (_, i) => open(u, uuid(500 + wave * 10 + i))));
      expect(rs.map((r) => r.code)).toEqual(Array(n).fill(0));
    }
    const g = await psql(`select string_agg(seq::text, ',' order by seq) from public.cards_packs where user_id = '${u}' and guarantee`);
    expect(g.out).toBe('30');
    expect((await psql(`select cards[5] from public.cards_packs where user_id = '${u}' and seq = 30`)).out).toBe('4');
    expect((await psql(`select string_agg(seq::text, ',' order by seq) from public.cards_packs where user_id = '${u}' and golden`)).out).toBe('10,20,30');
  });

  it('two recycles with different keys at once never pay the same extra copy twice; a claim with two keys pays once', async () => {
    const u = await user(6);
    await psql(`insert into public.cards_wallets (user_id, stock, anchor, paris_day) values ('${u}', 10, '2026-11-12T10:00:00Z', '2026-11-12')`);
    await psql(`insert into public.cards_owned (user_id, card_no, copies) values ('${u}', 1, 4), ('${u}', 15, 1), ('${u}', 16, 1)`);
    const rec = (k: string): Promise<{ out: string; err: string; code: number }> => psql(`select public.cards_recycle('${u}', '${k}', null, '2026-11-12T10:00:00Z', 40)`);
    const rs = await Promise.all([rec(uuid(600)), rec(uuid(601)), rec(uuid(602))]);
    expect(rs.filter((r) => r.code === 0)).toHaveLength(1);
    expect((await psql(`select shards from public.cards_wallets where user_id = '${u}'`)).out).toBe('3');
    const cl = (k: string): Promise<{ out: string; err: string; code: number }> => psql(`select public.cards_claim('${u}', '${k}', 'group:G3', '2026-11-12T10:00:00Z', 40)`);
    const cs = await Promise.all([cl(uuid(610)), cl(uuid(611)), cl(uuid(612)), cl(uuid(613))]);
    expect(cs.filter((r) => r.code === 0)).toHaveLength(1);
    expect((await psql(`select stock from public.cards_wallets where user_id = '${u}'`)).out).toBe('11');
  });
});
