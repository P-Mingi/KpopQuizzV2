// Bunnyverse Cards: the concurrent double spend of the last pack, on a throwaway local Postgres (apps/quiz/scripts/o1/contract/pg.ts:
// 127.0.0.1 only, deleted at exit). PGlite has one session, so two competing transactions need a real server. Skipped when the
// Postgres binaries are not installed. Nothing here touches a real database.
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PG_BIN, psqlCommand, psqlFile, startCluster, workDir } from '../../../scripts/o1/contract/pg';
import { BASE, CARDS_SQL, SCHEMA_FILES } from './sql-harness';

import type { Cluster } from '../../../scripts/o1/contract/pg';

const HAVE_PG = existsSync(join(PG_BIN, 'postgres'));
const U = '11111111-1111-1111-1111-111111111111';
const NOW = '2026-11-12T10:00:00Z';

function psqlAsync(port: number, db: string, sql: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn(join(PG_BIN, 'psql'), ['-X', '-q', '-A', '-t', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', db, '-c', sql], {
      env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

describe.skipIf(!HAVE_PG)('cards_apply_pack under concurrency (throwaway Postgres)', () => {
  let cluster: Cluster;
  beforeAll(async () => {
    cluster = await startCluster();
    cluster.createDb('cards');
    const work = workDir();
    const base = join(work, 'base.sql');
    writeFileSync(base, BASE.replace('create role anon nologin;', "do $r$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $r$;"));
    writeFileSync(
      join(work, 'seed.sql'),
      `insert into auth.users values ('${U}');
       insert into public.cards_entities (id, kind, name, sort_key) values ('idol:Q1', 'idol', 'Idol', 'a'), ('group:Q2', 'group', 'G', 'b');
       insert into public.cards_catalog (card_no, num, entity_id, rarity, edition) values
         (1, 'BV1-0001', 'idol:Q1', 'C', 'std'), (2, 'BV1-0002', 'idol:Q1', 'U', 'stage'), (7, 'BV1-0007', 'group:Q2', 'C', 'std');
       insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ('${U}', 1, '${NOW}', '2026-11-12', 50);`,
    );
    const conn = cluster.conn('cards');
    psqlFile(conn, base, 'base');
    for (const f of SCHEMA_FILES) psqlFile(conn, join(CARDS_SQL, f), f);
    psqlFile(conn, join(work, 'seed.sql'), 'seed');
  }, 120_000);
  afterAll(() => cluster?.stop());

  it('two sessions spend the last pack at once: one wins, the other is refused, the stack never goes below 0', async () => {
    const call = `select public.cards_apply_pack('${U}', 'stock', '{1,7,1,1,2}', null, '${NOW}')`;
    // Session A holds the wallet row lock for 1.5 s inside its transaction; session B starts 0.4 s later and must wait for it.
    const a = psqlAsync(cluster.port, 'cards', `begin; ${call}; select pg_sleep(1.5); commit;`);
    await new Promise((r) => setTimeout(r, 400));
    const b = psqlAsync(cluster.port, 'cards', call);
    const [ra, rb] = await Promise.all([a, b]);
    const results = [ra, rb];
    expect(results.filter((r) => r.code === 0)).toHaveLength(1);
    const lost = results.find((r) => r.code !== 0);
    expect(lost?.out).toMatch(/cards: empty/);
    expect(psqlCommand(cluster.conn('cards'), `select stock from public.cards_wallets where user_id = '${U}'`, 'stock').trim()).toBe('0');
    expect(psqlCommand(cluster.conn('cards'), 'select count(*) from public.cards_packs', 'packs').trim()).toBe('1');
    expect(psqlCommand(cluster.conn('cards'), `select sum(copies) from public.cards_owned where user_id = '${U}'`, 'copies').trim()).toBe('5');
  }, 60_000);

  it('two sessions spend 50 shards at once with 50 shards: one wins', async () => {
    const call = `select public.cards_apply_pack('${U}', 'shards', '{1,7,1,1,2}', null, '${NOW}')`;
    const a = psqlAsync(cluster.port, 'cards', `begin; ${call}; select pg_sleep(1.5); commit;`);
    await new Promise((r) => setTimeout(r, 400));
    const b = psqlAsync(cluster.port, 'cards', call);
    const [ra, rb] = await Promise.all([a, b]);
    expect([ra, rb].filter((r) => r.code === 0)).toHaveLength(1);
    expect([ra, rb].find((r) => r.code !== 0)?.out).toMatch(/cards: shards/);
    expect(psqlCommand(cluster.conn('cards'), `select shards from public.cards_wallets where user_id = '${U}'`, 'shards').trim()).toBe('0');
  }, 60_000);

  it('two sessions use one ad ticket at once: one wins, the replay is refused', async () => {
    const t = psqlCommand(cluster.conn('cards'), `select public.cards_issue_ticket('${U}', '${NOW}')`, 'ticket').trim();
    expect(t).toMatch(/^[0-9a-f-]{36}$/);
    const call = `select public.cards_apply_pack('${U}', 'ad', '{1,7,1,1,2}', '${t}', '${NOW}')`;
    const a = psqlAsync(cluster.port, 'cards', `begin; ${call}; select pg_sleep(1.5); commit;`);
    await new Promise((r) => setTimeout(r, 400));
    const b = psqlAsync(cluster.port, 'cards', call);
    const [ra, rb] = await Promise.all([a, b]);
    expect([ra, rb].filter((r) => r.code === 0)).toHaveLength(1);
    expect([ra, rb].find((r) => r.code !== 0)?.out).toMatch(/cards: ticket/);
  }, 60_000);
});
