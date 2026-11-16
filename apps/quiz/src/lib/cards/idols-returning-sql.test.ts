// Bunnyverse Cards lot 3: pglite proof of 099b-idols-returning.sql (built here from made-up members, the real file is checked for shape):
// rows only for a group with no active member, every active row out of Kpopdle (needs_review), a second run adds nothing, the Kpopdle
// source count does not move, the rollback removes only this file's rows.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { buildReturningSql } from './idols-returning-sql';
import { CARDS_SQL } from './sql-harness';

vi.setConfig({ testTimeout: 120_000 });

const SQL = buildReturningSql([
  { slug: 'kara', members: [{ name: 'One', qid: 'Q1', ord: 1, birth_date: '1990-01-01' }, { name: 'Two', qid: 'Q2', ord: 2, birth_date: null }] },
  { slug: 'loona', members: [{ name: 'Three', qid: 'Q3', ord: 1, birth_date: '1999-01-01' }] },
  { slug: 'nogroup', members: [{ name: 'Four', qid: 'Q4', ord: 1, birth_date: '1995-01-01' }] },
], '2026-11-13');

const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique);
create table public.idols (id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0, needs_review boolean not null default false,
  review_reason text, unique (group_id, name));
create view public.dle_src_kpop_idol as select id::text as entity_id from public.idols where active and not needs_review;
insert into public.groups (name, slug) values ('KARA', 'kara'), ('LOONA', 'loona');
insert into public.idols (group_id, name, birth_date, active) values ((select id from public.groups where slug = 'loona'), 'Already', '1998-01-01', true);
`;

async function notices(db: PGlite, sql: string): Promise<string[]> {
  const out: string[] = [];
  await db.exec(sql, { onNotice: (n) => out.push(n.message ?? '') });
  return out;
}

describe('099b-idols-returning.sql', () => {
  it('adds the members of a group without active members, waiting out of Kpopdle; skips the rest; idempotent; rolls back its own rows only', async () => {
    const db = new PGlite();
    await db.exec(FIXTURE);
    const n = await notices(db, SQL.sql);
    expect(n).toContain('099b-idols-returning: kara added 2 rows');
    expect(n).toContain('099b-idols-returning: loona skipped, the group has active members already');
    expect(n).toContain('099b-idols-returning: nogroup skipped, no groups row');
    expect(n).toContain('099b-idols-returning: Kpopdle source 1 entities before and after (no row of this file enters Kpopdle)');
    const rows = (await db.query<{ name: string; needs_review: boolean; birth_date: string | null }>(
      `select name, needs_review, birth_date::text from public.idols where review_reason like '099b-idols-returning%' order by name`)).rows;
    expect(rows).toEqual([{ name: 'One', needs_review: true, birth_date: '1990-01-01' }, { name: 'Two', needs_review: true, birth_date: null }]);
    expect(await notices(db, SQL.sql)).toContain('099b-idols-returning: kara skipped, the group has active members already');
    await db.exec(SQL.rollback);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.idols`)).rows[0]!.n).toBe(1);
  });
  const file = path.join(CARDS_SQL, '099b-idols-returning.sql');
  it.skipIf(!existsSync(file))('the file in the repository is one DO block with Verify lines and no dash', () => {
    const sql = readFileSync(file, 'utf8');
    expect(sql.match(/^do \$/gm)?.length).toBe(1);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(sql).not.toMatch(/[\u2013\u2014]/);
    expect(existsSync(path.join(CARDS_SQL, '099b-idols-returning.rollback.sql'))).toBe(true);
  });
});
