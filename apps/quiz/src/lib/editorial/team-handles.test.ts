// Owner decision 2026-11-09 (audit 04 P0-2): the 9 Team accounts get new handles. The map, the redirect rule, L31 and its rollback on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MIGRATIONS } from '@/lib/dle/pglite-harness';

import { verifyDiffs, verifyLines } from './launch-verify';
import { AWARD_TEAM_HANDLE, TEAM_HANDLE_RENAMES, renamedTeamHandle } from './team-handles';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const launch = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const UP = 'L31-l1-team-handles.sql';
const DOWN = 'L31-l1-team-handles.rollback.sql';
const arrayOf = (sql: string, name: 'src' | 'dst'): string => new RegExp(`${name}\\s+text\\[\\] := array\\[([^\\]]*)\\]`).exec(sql)![1]!;
const names = (list: string): string[] => (list.match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1));

describe('the map', () => {
  it('9 pairs, valid usernames, no new handle equals an old one', () => {
    expect(TEAM_HANDLE_RENAMES).toHaveLength(9);
    const olds = TEAM_HANDLE_RENAMES.map(([o]) => o);
    const news = TEAM_HANDLE_RENAMES.map(([, n]) => n);
    expect(new Set(news).size).toBe(9);
    for (const n of news) { expect(n).toMatch(/^kpq_[a-z0-9_]{1,16}$/); expect(olds).not.toContain(n); }
    expect(renamedTeamHandle('NJeansStan')).toBe('kpq_4thgen');
    expect(renamedTeamHandle('kpq_bts')).toBeNull();
    expect(renamedTeamHandle('some_fan')).toBeNull();
    expect(AWARD_TEAM_HANDLE).toBe('kpq_history');
  });

  it('the SQL files carry exactly these pairs, and the rollback is the reverse', () => {
    const up = launch(UP);
    const down = launch(DOWN);
    const src = names(arrayOf(up, 'src'));
    const dst = names(arrayOf(up, 'dst'));
    expect(src.map((o, i) => [o, dst[i]])).toEqual(TEAM_HANDLE_RENAMES.map(([o, n]) => [o, n]));
    expect(arrayOf(down, 'src')).toBe(arrayOf(up, 'dst'));
    expect(arrayOf(down, 'dst')).toBe(arrayOf(up, 'src'));
  });

  it('the files are one do block, no temp table, no date guard', () => {
    for (const f of [UP, DOWN]) {
      const sql = launch(f).split('\n').filter((l) => !l.startsWith('--')).join('\n');
      expect((sql.match(/\bdo \$/gi) ?? []).length, f).toBe(1);
      expect(sql, f).not.toMatch(/temp(orary)? table|current_date|now\(\)/i);
    }
  });
});

describe('L31 on PGlite', () => {
  let db: PGlite;
  const snap = async (): Promise<string> => JSON.stringify((await db.query(
    `select p.id, p.username, p.display_name, p.xp, a.display_name edn from public.profiles p left join public.editorial_accounts a on a.user_id = p.id order by p.id`)).rows);
  const fails = async (sql: string): Promise<string | null> => { try { await db.exec(sql); return null; } catch (e) { return (e as Error).message; } };
  let before = '';

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create table public.profiles (id uuid primary key, username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'), display_name text, xp int not null default 0);
      create table public.editorial_accounts (user_id uuid primary key, display_name text, beat text, active boolean not null default true);
      insert into public.profiles (id, username, display_name, xp)
        select ('00000000-0000-0000-0000-00000000000' || n)::uuid, u, case when n % 2 = 0 then u else 'Display ' || n end, n * 100
          from unnest(array['soojinnie','joonified','pinkvelvet','caratland','skzrealm','njeansstan','kpophistory','twiceland','exoplanet99']) with ordinality t(u, n);
      insert into public.profiles (id, username, display_name) values ('00000000-0000-0000-0000-0000000000aa', 'real_fan', 'Real fan');
      insert into public.editorial_accounts select id, display_name, 'x', true from public.profiles where username <> 'real_fan';`);
    before = await snap();
  });

  it('applies: 9 handles renamed, the Verify lines hold, a display name that was the old handle follows, nothing else moves', async () => {
    await db.exec(launch(UP));
    expect(verifyLines(UP).length).toBe(3);
    expect(await verifyDiffs(db, UP)).toEqual([]);
    const rows = (await db.query<{ username: string; display_name: string; xp: number }>(`select username, display_name, xp from public.profiles order by id`)).rows;
    expect(rows.map((r) => r.username)).toEqual([...TEAM_HANDLE_RENAMES.map(([, n]) => n), 'real_fan']);
    expect(rows.map((r) => r.xp)).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900, 0]);
    expect(rows[1]!.display_name).toBe('kpq_bts');
    expect(rows[0]!.display_name).toBe('Display 1');
    expect(rows[9]).toMatchObject({ username: 'real_fan', display_name: 'Real fan' });
  });

  it('a second run changes nothing', async () => {
    const once = await snap();
    await db.exec(launch(UP));
    expect(await snap()).toBe(once);
    expect(await verifyDiffs(db, UP)).toEqual([]);
  });

  it('the rollback restores the exact rows, its Verify lines hold, and it runs twice', async () => {
    await db.exec(launch(DOWN));
    expect(verifyLines(DOWN).length).toBe(3);
    expect(await verifyDiffs(db, DOWN)).toEqual([]);
    expect(await snap()).toBe(before);
    await db.exec(launch(DOWN));
    expect(await snap()).toBe(before);
  });

  it('refuses and writes nothing when an old handle is not a Team account, a new handle is taken, or an account is missing', async () => {
    await db.exec(`delete from public.editorial_accounts where user_id = '00000000-0000-0000-0000-000000000003'`);
    expect(await fails(launch(UP))).toMatch(/not a Team/);
    expect(await snap()).not.toContain('kpq_');
    await db.exec(`insert into public.editorial_accounts values ('00000000-0000-0000-0000-000000000003', 'x', 'x', true)`);
    await db.exec(`update public.profiles set username = 'kpq_bts' where username = 'real_fan'`);
    expect(await fails(launch(UP))).toMatch(/unexpected state/);
    await db.exec(`update public.profiles set username = 'real_fan' where username = 'kpq_bts'`);
    await db.exec(`update public.profiles set username = 'zzz_gone' where username = 'twiceland'`);
    expect(await fails(launch(UP))).toMatch(/unexpected state/);
    expect((await db.query(`select count(*)::int n from public.profiles where username like 'kpq\\_%'`)).rows[0]).toEqual({ n: 0 });
  });
});
