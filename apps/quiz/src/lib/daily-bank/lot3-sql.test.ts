// Bank lot 3 (owner GO 2026-11-09): the real files docs/pending-migrations/daily-bank-2026-12-lot3(.rollback).sql as ONE do block on PGlite:
// apply, the Verify lines of the header, a second run refused, the review placeholder rule, the exact rollback, a published row kept.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { freshDb, one, rows } from '../dle/pglite-harness';

import { buildLotSql } from './lot-sql';
import { checkVerify } from './verify-lines';

import type { LotQuiz } from './lot-sql';
import type { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(__dirname, '../../../../..');
// The patch under docs/o1/reports (docs/pending-migrations has no owner key): ORCH copies it over the file of main.
const DIR = path.join(ROOT, 'docs/o1/reports/L1/daily/lot3');
const UP = readFileSync(path.join(DIR, 'daily-bank-2026-12-lot3.sql'), 'utf8');
const DOWN = readFileSync(path.join(DIR, 'daily-bank-2026-12-lot3-rollback.sql'), 'utf8');

const TABLE = `create table public.quiz_bank (
  id uuid primary key default gen_random_uuid(), title text not null, description text, group_id integer, quiz_type text, difficulty text,
  category text, questions jsonb, scheduled_date date, status text, verified_at timestamptz, verification_notes text,
  published_quiz_id uuid, updated_at timestamptz default now());`;

let db: PGlite;
beforeEach(async () => {
  db = await freshDb([]);
  await db.exec(TABLE);
});

describe('daily bank lot 3 SQL', () => {
  it('the reviewed rows of main are unchanged, and once installed the file of main is this one', () => {
    const main = readFileSync(path.join(ROOT, 'docs/pending-migrations/daily-bank-2026-12-lot3.sql'), 'utf8');
    const values = (sql: string): string[] => sql.split('\n').filter((l) => l.startsWith("  ('"));
    expect(values(UP)).toEqual(values(main));
    if (main.includes('$lot$')) {
      expect(main).toBe(UP);
      expect(readFileSync(path.join(ROOT, 'docs/pending-migrations/daily-bank-2026-12-lot3-rollback.sql'), 'utf8')).toBe(DOWN);
    }
  });

  it('is one do block, no temp table, and keeps the content of the reviewed lot', () => {
    for (const sql of [UP, DOWN]) {
      const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
      expect(code.startsWith('do $lot$') && code.endsWith('end $lot$;')).toBe(true);
      expect(code.match(/\bdo \$/g)).toHaveLength(1);
      expect(code).not.toMatch(/temp(orary)?\s+table|\bcommit;/i);
      expect(sql).not.toMatch(/[–—]/);
    }
    expect(UP).toContain('checked by Louis Pecchia on 2026-10-25.');
    expect(UP).not.toContain('{REVIEWER}');
    expect(UP.match(/^  \('/gm)).toHaveLength(20);
  });

  it('apply: 20 rows, 2026-12-03 to 2026-12-22, all verified; the Verify lines hold', async () => {
    await db.exec(UP);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(20);
    await checkVerify(db, UP, 'lot3 up', 4);
  });

  it('a second run raises and changes nothing', async () => {
    await db.exec(UP);
    await expect(db.exec(UP)).rejects.toThrow(/two rows on one date|nothing applied/);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(20);
  });

  it('a row of the lot already on one of its dates stops the block', async () => {
    await db.exec(`insert into public.quiz_bank (title, scheduled_date, status) values ('Other', '2026-12-10', 'verified')`);
    await expect(db.exec(UP)).rejects.toThrow(/two rows on one date/);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(1);
  });

  it('rollback: exact, the Verify lines of the rollback hold, other rows and published rows stay', async () => {
    await db.exec(`insert into public.quiz_bank (title, scheduled_date, status) values ('Other', '2026-12-30', 'verified')`);
    await db.exec(UP);
    await db.exec(`update public.quiz_bank set status = 'published', published_quiz_id = gen_random_uuid() where scheduled_date = '2026-12-03'`);
    await db.exec(DOWN);
    expect((await rows<{ title: string }>(db, 'select title from public.quiz_bank order by title')).length).toBe(2);
    await db.exec(DOWN);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(2);
    // Nothing published: the rollback leaves the table as before.
    const clean = await freshDb([]);
    await clean.exec(TABLE);
    await clean.exec(UP);
    await clean.exec(DOWN);
    expect(await one(clean, 'select count(*)::int from public.quiz_bank')).toBe(0);
    await checkVerify(clean, DOWN, 'lot3 down');
  });

  it('with a site_id column, a row of another site stops the block', async () => {
    await db.exec(`alter table public.quiz_bank add column site_id text not null default 'anime'`);
    await expect(db.exec(UP)).rejects.toThrow(/not a kpop row/);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(0);
  });

  it('the review placeholder rule is kept by the generator: a draft refuses to apply', async () => {
    const q: LotQuiz = {
      scheduled_date: '2026-12-03', title: 'T', description: 'D', group_slug: null, category: 'knowledge', quiz_type: 'multiple_choice', difficulty: 'easy',
      questions: [{ question: 'Q?', options: ['A', 'B', 'C', 'D'], correct: 0, fun_fact: 'F', source: 'https://en.wikipedia.org/wiki/A' }],
    };
    const draft = buildLotSql('3', [q], new Map());
    await expect(db.exec(draft.sql)).rejects.toThrow(/review not recorded/);
    expect(await one(db, 'select count(*)::int from public.quiz_bank')).toBe(0);
    const ok = buildLotSql('3', [q], new Map(), 'Louis', '2026-11-09');
    await db.exec(ok.sql);
    await checkVerify(db, ok.sql, 'one-row lot', 4);
  });
});
