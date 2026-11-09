// L27 (lane daily): the reminder table and the rest-day columns, as ONE do block with no temp table, on PGlite: apply, Verify lines,
// a second run, rollback, Verify lines of the rollback.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { checkVerify } from './daily-bank/verify-lines';
import { freshDb, MIGRATIONS, one } from './dle/pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

const read = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const UP = read('L27-l1-daily-reminders.sql');
const DOWN = read('L27-l1-daily-reminders.rollback.sql');

let db: PGlite;
beforeAll(async () => {
  db = await freshDb([]);
  await db.exec('create table public.profiles (id uuid primary key); create table public.world_memberships (id uuid primary key);');
});

describe('L27 daily reminders SQL', () => {
  it('is one do block: no temp table, no bare statement outside it, lock_timeout set inside', () => {
    for (const sql of [UP, DOWN]) {
      const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
      expect(code.startsWith('do $op$')).toBe(true);
      expect(code.endsWith('end $op$;')).toBe(true);
      expect(code.match(/\bdo \$/g)).toHaveLength(1);
      expect(code).not.toMatch(/temp(orary)?\s+table/i);
      expect(code).toContain("set_config('lock_timeout', '5s', true)");
      expect(sql).not.toMatch(/[–—]/);
    }
  });

  it('apply: the Verify lines hold', async () => {
    await db.exec(UP);
    await checkVerify(db, UP, 'L27 up', 4);
    expect(await one(db, `select count(*)::int from pg_indexes where indexname = 'daily_reminders_due_idx'`)).toBe(1);
  });

  it('a second run changes nothing', async () => {
    await db.exec(UP);
    await checkVerify(db, UP, 'L27 up again', 4);
  });

  it('rollback: the Verify lines of the rollback hold, and it is idempotent', async () => {
    await db.exec(DOWN);
    await checkVerify(db, DOWN, 'L27 down', 2);
    await db.exec(DOWN);
    await checkVerify(db, DOWN, 'L27 down again', 2);
  });

  it('refuses to run when profiles is missing', async () => {
    const bare = await freshDb([]);
    await expect(bare.exec(UP)).rejects.toThrow(/L27: profiles and world_memberships must exist/);
  });
});
