// Bunnyverse Cards: proof of 117-catalog-safeupdate.sql on PGlite, on the state production has (bundle-fixture.ts, the bundle 099 to 115).
// Checked: one DO block with its header, no dash; the new body is 103's with only "where true" on its DELETE (md5 before and after);
// the privileges stay; the rebuild gives the same catalog as before; a second run changes nothing; a body that is not 103's is refused;
// the rollback gives 103's body back; the committed files are what the generator writes from 103.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { prodStateSql } from './bundle-fixture';
import { at } from './harvest-fixture';
import { SAFEUPDATE_DAY, buildSafeupdate, catalogFunctionOf103 } from './safeupdate-sql';
import { CARDS_SQL } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const T103 = readFileSync(path.join(CARDS_SQL, '103-catalog-photos.sql'), 'utf8');
const S = buildSafeupdate(T103, SAFEUPDATE_DAY);
const SQL = at(S.sql, '12:00');
const one = async <T>(db: PGlite, q: string): Promise<T> => Object.values((await db.query<Record<string, T>>(q)).rows[0] ?? {})[0] as T;
const body = (db: PGlite) => one<string>(db, `select prosrc from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure`);
async function prod(): Promise<PGlite> {
  const db = new PGlite();
  for (const s of prodStateSql()) await db.exec(s);
  await db.exec(readCards(OUTPUTS.bundle));
  return db;
}

describe('117-catalog-safeupdate.sql', () => {
  it('is one DO block with its header, no dash, and the committed files are what the generator writes', () => {
    expect(S.sql.match(/^do \$c117\$$/gm)).toHaveLength(1);
    expect(S.rollback.match(/^do \$c117r\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'Why:', 'Scope:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(S.sql).toContain(`-- ${k}`);
    expect(S.sql + S.rollback).not.toMatch(/[\u2013\u2014]/);
    expect(readFileSync(path.join(CARDS_SQL, '117-catalog-safeupdate.sql'), 'utf8')).toBe(S.sql);
    expect(readFileSync(path.join(CARDS_SQL, '117-catalog-safeupdate.rollback.sql'), 'utf8')).toBe(S.rollback);
    // the only difference with 103's statement is the WHERE of the DELETE
    const { statement } = catalogFunctionOf103(T103);
    expect(S.sql).toContain(statement.replace('    delete from public.cards_catalog;', '    delete from public.cards_catalog where true;'));
  });

  it('changes the DELETE only, keeps the privileges, the rebuild gives the same catalog, and a second run changes nothing', async () => {
    const db = await prod();
    const old = await body(db);
    expect(await one(db, `select md5(prosrc) from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure`)).toBe(S.md5Old);
    await db.exec('select public.cards_build_catalog()');
    const catalog = (await db.query('select card_no, entity_id, rarity, edition, photo_id, part from public.cards_catalog order by card_no')).rows;
    const notices: string[] = [];
    await db.exec(SQL, { onNotice: (n) => notices.push(n.message ?? '') });
    expect(notices.join('\n')).toMatch(/deletes with WHERE true/);
    const now = await body(db);
    expect(now).toBe(old.replace('    delete from public.cards_catalog;', '    delete from public.cards_catalog where true;'));
    expect(await one(db, `select md5(prosrc) from pg_proc where oid = 'public.cards_build_catalog()'::regprocedure`)).toBe(S.md5New);
    // the Verify lines hold
    expect(await one(db, `select has_function_privilege('anon', 'public.cards_build_catalog()', 'execute') or has_function_privilege('authenticated', 'public.cards_build_catalog()', 'execute')`)).toBe(false);
    expect(await one(db, `select has_function_privilege('service_role', 'public.cards_build_catalog()', 'execute')`)).toBe(true);
    for (const line of S.sql.split('\n').filter((l) => l.startsWith('-- Verify:'))) {
      const m = /^-- Verify: (.*?);\s{3}expect (\S+)/.exec(line)!;
      const v = await one<unknown>(db, m[1]!);
      expect(String(v === true ? 't' : v === false ? 'f' : v), line).toBe(m[2]);
    }
    // the rebuild gives the same catalog as 103's body did
    await db.exec('select public.cards_build_catalog()');
    expect((await db.query('select card_no, entity_id, rarity, edition, photo_id, part from public.cards_catalog order by card_no')).rows).toEqual(catalog);
    const again: string[] = [];
    await db.exec(SQL, { onNotice: (n) => again.push(n.message ?? '') });
    expect(again.join('\n')).toMatch(/already applied, nothing changed/);
    expect(await body(db)).toBe(now);
    // the rollback gives 103's body back, and a second rollback changes nothing
    await db.exec(S.rollback);
    expect(await body(db)).toBe(old);
    await db.exec(S.rollback);
    expect(await body(db)).toBe(old);
  });

  it('refuses a body that is not 103\'s, between 23:50 and 00:30 UTC, and without the function, with nothing changed', async () => {
    const db = await prod();
    for (const t of ['23:50', '00:29']) {
      await expect(db.exec(at(S.sql, t))).rejects.toThrow(/refused between 23:50 and 00:30 UTC/);
      await db.exec('rollback');
    }
    await db.exec(`create or replace function public.cards_build_catalog() returns jsonb language sql as $$ select '{}'::jsonb $$`);
    await expect(db.exec(SQL)).rejects.toThrow(/is not the version of 103/);
    await db.exec('rollback');
    expect(await body(db)).toBe(" select '{}'::jsonb ");
    const bare = new PGlite();
    await expect(bare.exec(SQL)).rejects.toThrow(/cards_build_catalog\(\) is missing/);
  });
});
