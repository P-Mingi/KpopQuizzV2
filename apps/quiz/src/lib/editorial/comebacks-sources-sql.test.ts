// Audit 04 P0-4: L24-l1-comebacks-sources.sql and its rollback on PGlite, against the comebacks table of migration 121:
// columns added, existing rows untouched, a second run changes nothing, the checks hold, the rollback restores the exact shape.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MIGRATIONS } from '@/lib/dle/pglite-harness';

import { verifyDiffs, verifyLines } from './launch-verify';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const launch = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const TABLE = `
create table public.comebacks (
  id bigserial primary key, group_id integer, artist text not null, title text not null, release_date date not null,
  kind text not null default 'single' check (kind in ('single','ep','album','mv')), active boolean not null default true, created_at timestamptz not null default now());
insert into public.comebacks (artist, title, release_date, kind) values ('aespa', 'Rich Man', '2026-10-09', 'ep'), ('ATEEZ', 'x', '2026-11-12', 'album');`;
const cols = async (db: PGlite): Promise<string> => (await db.query<{ c: string }>(`select string_agg(column_name, ',' order by ordinal_position) c from information_schema.columns where table_name = 'comebacks'`)).rows[0]!.c;
const rowsText = async (db: PGlite): Promise<string> => JSON.stringify((await db.query(`select id, artist, title, release_date::text, kind, active from public.comebacks order by id`)).rows);

describe('L24 comebacks sources', () => {
  let db: PGlite;
  let before = '';
  let colsBefore = '';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(TABLE);
    before = await rowsText(db);
    colsBefore = await cols(db);
  });

  it('applies: four columns, no row touched, and a second run changes nothing', async () => {
    await db.exec(launch('L24-l1-comebacks-sources.sql'));
    expect(await cols(db)).toBe(`${colsBefore},source_url,source_type,verified_at,status`);
    expect(await rowsText(db)).toBe(before);
    expect((await db.query(`select count(*)::int n from public.comebacks where status is not null`)).rows[0]).toEqual({ n: 0 });
    expect(verifyLines('L24-l1-comebacks-sources.sql').length).toBeGreaterThanOrEqual(3);
    expect(await verifyDiffs(db, 'L24-l1-comebacks-sources.sql')).toEqual([]);
    await db.exec(launch('L24-l1-comebacks-sources.sql'));
    expect(await cols(db)).toBe(`${colsBefore},source_url,source_type,verified_at,status`);
    expect(await rowsText(db)).toBe(before);
  });

  it('the checks: an announced row needs its source; leads and http links are refused', async () => {
    const fails = async (sql: string): Promise<boolean> => { try { await db.exec(sql); return false; } catch { return true; } };
    expect(await fails(`update public.comebacks set status = 'announced' where id = 1`)).toBe(true);
    expect(await fails(`update public.comebacks set source_type = 'lead' where id = 1`)).toBe(true);
    expect(await fails(`update public.comebacks set source_url = 'http://example.com/a' where id = 1`)).toBe(true);
    expect(await fails(`update public.comebacks set status = 'announced', source_type = 'official', source_url = 'https://example.com/a', verified_at = now() where id = 1`)).toBe(false);
  });

  it('the rollback restores the exact shape and rows, and runs twice', async () => {
    await db.exec(`update public.comebacks set status = null, source_type = null, source_url = null, verified_at = null`);
    await db.exec(launch('L24-l1-comebacks-sources.rollback.sql'));
    expect(await cols(db)).toBe(colsBefore);
    expect(await rowsText(db)).toBe(before);
    expect(verifyLines('L24-l1-comebacks-sources.rollback.sql').length).toBeGreaterThanOrEqual(3);
    expect(await verifyDiffs(db, 'L24-l1-comebacks-sources.rollback.sql')).toEqual([]);
    await db.exec(launch('L24-l1-comebacks-sources.rollback.sql'));
    expect(await cols(db)).toBe(colsBefore);
    await db.exec(launch('L24-l1-comebacks-sources.sql'));
    expect(await cols(db)).toBe(`${colsBefore},source_url,source_type,verified_at,status`);
  });
});

describe('L24 file shape', () => {
  it('is one do block, no temp table, no date guard', () => {
    for (const f of ['L24-l1-comebacks-sources.sql', 'L24-l1-comebacks-sources.rollback.sql']) {
      const sql = launch(f).split('\n').filter((l) => !l.startsWith('--')).join('\n');
      expect((sql.match(/\bdo \$/gi) ?? []).length, f).toBe(1);
      expect(sql, f).not.toMatch(/temp(orary)? table/i);
      expect(sql, f).not.toMatch(/current_date|now\(\)/i);
    }
  });
});
