// Bunnyverse Cards lot 2: pglite proof of docs/pending-migrations/cards/099-idols-members.sql (the members of the subjects that had no active
// idols row), then 102 on top of it. Checked: rows only for a group with no active member, the soloist in its own groups row, never a person
// already active in another group, nothing for a subject left out by the age rule, a second run adds nothing, the rollback removes only the
// rows 099 wrote; and 102 then puts in the subjects 099 completed.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { vi, describe, expect, it } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { freshCardsDb, one, readCardsSql, rows } from './sql-harness';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../docs/design/cards/data');
const AGE = JSON.parse(readFileSync(path.join(DATA, 'age-check.json'), 'utf8')) as { subjects: Array<{ slug: string; ok: boolean }> };
const SQL099 = readCardsSql('099-idols-members.sql');
const literal = JSON.parse(SQL099.slice(SQL099.indexOf('$members$[') + '$members$'.length, SQL099.indexOf(']$members$') + 1)) as Array<{
  slug: string; kind: 'idol' | 'group'; members: Array<{ name: string; qid: string; birth_date: string | null }>;
}>;

const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0, needs_review boolean not null default false,
  review_reason text, detached_at timestamptz, unique (group_id, name));
create function gid(s text) returns integer language sql as $$ select id from public.groups where slug = s $$;
insert into public.groups (name, slug, inception_date) values
  ('IU', 'iu', '2008-09-18'), ('PSY', 'psy', '2001-01-01'), ('Zico', 'zico', '2014-01-01'), ('Block B', 'block-b', '2011-04-15'),
  ('Apink', 'apink', '2011-04-19'), ('BTOB', 'btob', '2012-03-21'), ('NCT', 'nct', '2016-04-09'), ('WINNER', 'winner', '2014-08-17');
-- BTOB already has its members: 099 must leave it alone
insert into public.idols (group_id, name, birth_date, ord) values (gid('btob'), 'Eunkwang', '1990-11-22', 1);
-- Zico is already an active member of another group under the same name: 099 adds no second row for him
insert into public.idols (group_id, name, birth_date) values (gid('block-b'), 'Zico', '1992-09-14');
-- WINNER has only a former member: no active one, so 099 adds the current members
insert into public.idols (group_id, name, active, ord) values (gid('winner'), 'Nam Tae-hyun', false, 5);
`;

describe('099-idols-members.sql', () => {
  it('holds only subjects that pass the age rule, never one it leaves out', () => {
    const ok = new Set(AGE.subjects.filter((s) => s.ok).map((s) => s.slug));
    expect(literal.length).toBeGreaterThan(0);
    for (const s of literal) expect(ok.has(s.slug), s.slug).toBe(true);
    expect(literal.some((s) => s.slug === 'nct')).toBe(false);
  });

  it('writes a birth date for every person it adds (two agreeing sources), and no dash', () => {
    for (const s of literal) for (const m of s.members) expect(m.birth_date, `${s.slug} ${m.name}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SQL099).not.toMatch(/[–—]/);
  });

  it('adds members only where the group has no active one, the soloist in its own row, then nothing on a second run', async () => {
    const db = await freshCardsDb();
    await db.exec(FIXTURE);
    const notices: string[] = [];
    await db.exec(SQL099, { onNotice: (n) => notices.push(n.message ?? '') });
    const by = async (slug: string): Promise<string[]> =>
      (await rows<{ name: string }>(db, `select name from idols where group_id = gid($1) and active order by ord, name`, [slug])).map((r) => r.name);
    expect(await by('btob')).toEqual(['Eunkwang']);
    expect(notices).toContain('099-idols-members: btob skipped, the group has active members already');
    expect(await by('zico')).toEqual([]);
    expect(notices).toContain('099-idols-members: zico skipped, the person is an active member of another group already');
    expect(await by('iu')).toEqual(['IU']);
    expect((await by('apink')).length).toBe(literal.find((s) => s.slug === 'apink')!.members.length);
    expect((await by('winner')).length).toBe(literal.find((s) => s.slug === 'winner')!.members.length);
    expect(await one(db, `select count(*)::int from idols where group_id = gid('nct')`)).toBe(0);
    const added = await one<number>(db, `select count(*)::int from idols where review_reason = '099-idols-members'`);
    await db.exec(SQL099);
    expect(await one(db, `select count(*)::int from idols where review_reason = '099-idols-members'`)).toBe(added);
  });

  it('then lets 102 put in the subjects it completed', async () => {
    const db = await freshCardsDb();
    await db.exec(FIXTURE);
    await db.exec(SQL099);
    await db.exec(readCardsSql('102-catalog-rebuild.sql'));
    const ents = (await rows<{ entity_id: string }>(db, `select distinct entity_id from cards_catalog order by entity_id`)).map((r) => r.entity_id);
    expect(ents).toEqual(expect.arrayContaining(['idol:iu', 'idol:psy', 'group:apink', 'group:winner', 'group:btob']));
    expect(ents).not.toContain('group:nct');
    expect(await one(db, `select count(*)::int from cards_catalog where entity_id = 'group:apink'`)).toBe(8);
  });

  it('rolls back only the rows it wrote', async () => {
    const db = await freshCardsDb();
    await db.exec(FIXTURE);
    await db.exec(SQL099);
    await db.exec(readCardsSql('099-idols-members.rollback.sql'));
    expect(await one(db, `select count(*)::int from idols where review_reason = '099-idols-members'`)).toBe(0);
    expect(await one(db, `select count(*)::int from idols`)).toBe(3);
  });
});
