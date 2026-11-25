// L39 (owner, 2026-11-24): the 8 agencies the Verse refresh of 2026-11-23 undid go back to their Wikipedia values, keyed by name and by the exact wrong
// value; a group holding anything else is left alone; the Wikipedia source row is kept or put back; the Kpopdle snapshot is refreshed; the log table is
// closed to the browser roles; a second run changes nothing; the rollback restores exactly the logged rows. On PGlite, with stand-in tables.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../docs/pending-migrations/multisite/launch');
const UP = readFileSync(path.join(DIR, 'L39-l1-kpopdle-agencies-again.sql'), 'utf8');
const DOWN = readFileSync(path.join(DIR, 'L39-l1-kpopdle-agencies-again.rollback.sql'), 'utf8');
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const BASE = `
create role anon nologin;
create role authenticated nologin;
create table public.groups (id bigint generated always as identity primary key, name text, site_id text, record_label text);
create table public.entity_sources (entity_type text, entity_id text, field text, source text, source_ref text, source_url text, fetched_at timestamptz,
  unique (entity_type, entity_id, field, source));
create table public.dle_entities (game_id text, entity_id text, name text, attrs jsonb);
create table public.refresh_calls (game text);
create function public.dle_refresh_entities(p text) returns void language sql as $$ insert into public.refresh_calls values (p) $$;
insert into public.groups (name, site_id, record_label) values
  ('BTS', 'kpop', 'Columbia Records'), ('TXT', 'kpop', 'Republic Records'), ('IVE', 'kpop', 'Columbia Records'), ('ATEEZ', 'kpop', 'RCA Records'),
  ('RIIZE', 'kpop', 'RCA Records'), ('NewJeans', 'kpop', 'Geffen Records'), ('aespa', 'kpop', 'Capitol Records'), ('FIFTY FIFTY', 'kpop', 'Some Other Label'),
  ('TWICE', 'kpop', 'JYP Entertainment'), ('BTS', 'anime', 'Columbia Records');
insert into public.entity_sources values ('group', '1', 'record_label', 'wikipedia', 'rev 1383773245', 'https://en.wikipedia.org/wiki/BTS', '2026-11-09');
insert into public.dle_entities values ('kpopdle-idol', '1', 'Jimin', '{}');
`;

async function db(): Promise<PGlite> {
  const pg = new PGlite();
  await pg.exec(BASE);
  return pg;
}
const labels = async (pg: PGlite) => Object.fromEntries((await pg.query<{ name: string; site_id: string; record_label: string }>(
  'select name, site_id, record_label from public.groups order by id')).rows.map((r) => [`${r.site_id}:${r.name}`, r.record_label]));

describe('L39: the agencies again', () => {
  it('has no long dash, one DO block, Verify lines and a WHERE on every update', () => {
    for (const f of [UP, DOWN]) {
      expect(DASH.test(f)).toBe(false);
      expect(f.match(/^do \$/gm)?.length).toBe(1);
      expect(f).not.toMatch(/temp(orary)? table/i);
      for (const u of f.match(/update public\.[a-z_]+[\s\S]*?;/g) ?? []) expect(u).toMatch(/\bwhere\b/);
    }
    expect(UP.match(/^-- Verify:/gm)?.length).toBeGreaterThanOrEqual(4);
  });

  it('corrects the 7 groups still on the wrong label, leaves FIFTY FIFTY (another value), TWICE and the anime row alone, and refreshes the game', async () => {
    const pg = await db();
    await pg.exec(UP);
    expect(await labels(pg)).toEqual({
      'kpop:BTS': 'BigHit Music', 'kpop:TXT': 'BigHit Music', 'kpop:IVE': 'Starship Entertainment', 'kpop:ATEEZ': 'KQ Entertainment',
      'kpop:RIIZE': 'SM Entertainment', 'kpop:NewJeans': 'ADOR', 'kpop:aespa': 'SM Entertainment', 'kpop:FIFTY FIFTY': 'Some Other Label',
      'kpop:TWICE': 'JYP Entertainment', 'anime:BTS': 'Columbia Records',
    });
    expect((await pg.query('select * from public.refresh_calls')).rows).toEqual([{ game: 'kpopdle-idol' }]);
    // One Wikipedia row per corrected group: BTS keeps its own, the 6 others get theirs back.
    const src = await pg.query<{ n: number }>("select count(*)::int as n from public.entity_sources where field = 'record_label' and source = 'wikipedia'");
    expect(src.rows[0]?.n).toBe(7);
    const bts = await pg.query<{ fetched_at: Date }>("select fetched_at from public.entity_sources where entity_id = '1'");
    expect(bts.rows.length).toBe(1);
    expect((await pg.query('select count(*)::int as n from public.o1_l39_agencies')).rows[0]).toEqual({ n: 7 });
  });

  it('a second run changes nothing; FIFTY FIFTY on Lapone is corrected', async () => {
    const pg = await db();
    await pg.exec("update public.groups set record_label = 'Lapone Entertainment' where name = 'FIFTY FIFTY'");
    await pg.exec(UP);
    const once = await labels(pg);
    expect(once['kpop:FIFTY FIFTY']).toBe('Attrakt');
    await pg.exec(UP);
    expect(await labels(pg)).toEqual(once);
    expect((await pg.query('select count(*)::int as n from public.o1_l39_agencies')).rows[0]).toEqual({ n: 8 });
  });

  it('the log table is closed to the browser roles', async () => {
    const pg = await db();
    await pg.exec(UP);
    const r = await pg.query<{ a: boolean; b: boolean }>("select has_table_privilege('anon', 'public.o1_l39_agencies', 'select') as a, has_table_privilege('authenticated', 'public.o1_l39_agencies', 'select') as b");
    expect(r.rows[0]).toEqual({ a: false, b: false });
  });

  it('the rollback puts back exactly the logged rows, leaves a later change alone and drops the log', async () => {
    const pg = await db();
    const before = await labels(pg);
    await pg.exec(UP);
    await pg.exec("update public.groups set record_label = 'Changed Later' where name = 'IVE'");
    await pg.exec(DOWN);
    expect(await labels(pg)).toEqual({ ...before, 'kpop:IVE': 'Changed Later' });
    expect((await pg.query("select to_regclass('public.o1_l39_agencies') as t")).rows[0]).toEqual({ t: null });
    await pg.exec(DOWN);
  });
});
